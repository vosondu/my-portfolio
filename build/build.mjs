// Builds victorosondu.com from the content files the editor saves.
//
//   content/case-studies/*.yml  -> /<slug>            (case study pages)
//   content/articles/*.yml      -> /writing/<slug>    (articles)
//   content/home.yml            -> homepage project grid (order and pairs)
//   content/writing.yml         -> order of the Writing list
//
// Everything else in the repo (about, contact, css, images...) is copied as is.
// Output goes to dist/, which Vercel publishes.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import yaml from 'js-yaml';
import * as cheerio from 'cheerio';
import sizeOf from 'image-size';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://www.victorosondu.com';
const SKIP = new Set(['dist', 'content', 'build', 'tools', 'node_modules', '.git', '.github', '.pages.yml',
	'package.json', 'package-lock.json', 'README.md', 'vercel.json', '.gitignore', '.vercel']);
const problems = [];

// ---------- helpers ----------
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const loadYaml = (p) => yaml.load(read(p)) || {};
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escAttr = (s = '') => esc(s).replace(/'/g, '&#x27;');
const url = (p) => encodeURI(p.startsWith('/') ? p : '/' + p);
const slugOf = (p) => path.basename(String(p), path.extname(String(p)));
const fmt = (n) => String(Number(n.toFixed(4)));
const fill = (tpl, vars) => tpl.replace(/%%(\w+)%%/g, (_, k) => (k in vars ? vars[k] : `%%${k}%%`));

function fileFor(webPath) {
	const p = path.join(ROOT, decodeURI(String(webPath)).replace(/^\/+/, ''));
	if (!fs.existsSync(p)) { problems.push(`Missing file: ${webPath}`); return null; }
	return p;
}

// MP4/MOV: read the video track's display size from the tkhd box.
function videoSize(file) {
	const buf = fs.readFileSync(file);
	const containers = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts']);
	let found = null;
	(function walk(start, end) {
		let i = start;
		while (i + 8 <= end && !found) {
			let size = buf.readUInt32BE(i);
			const type = buf.toString('latin1', i + 4, i + 8);
			let header = 8;
			if (size === 1) { size = Number(buf.readBigUInt64BE(i + 8)); header = 16; }
			if (size === 0) size = end - i;
			if (size < header) return;
			if (type === 'tkhd') {
				const v = buf[i + header];
				const body = i + header;
				const matrixAt = body + (v === 1 ? 52 : 40);
				const w = buf.readUInt32BE(i + size - 8) / 65536;
				const h = buf.readUInt32BE(i + size - 4) / 65536;
				const b = buf.readInt32BE(matrixAt + 4);
				if (w > 0 && h > 0) found = b !== 0 ? [h, w] : [w, h];
			} else if (containers.has(type)) {
				walk(i + header, i + size);
			}
			i += size;
		}
	})(0, buf.length);
	return found;
}

const ratioCache = new Map();
function ratioOf(item) {
	if (item.shape) return Number(item.shape);
	if (item.background === 'light' || item.background === 'dark') return 1.6;
	const key = item.video || item.image;
	if (!key) return 1;
	if (ratioCache.has(key)) return ratioCache.get(key);
	let r = 1;
	const f = fileFor(key);
	if (f) {
		try {
			if (item.video) {
				const s = videoSize(f);
				if (s) r = s[0] / s[1];
				else if (item.image && fileFor(item.image)) { const d = sizeOf(fileFor(item.image)); r = d.width / d.height; }
			} else {
				const d = sizeOf(f);
				const swap = d.orientation && d.orientation >= 5;
				r = swap ? d.height / d.width : d.width / d.height;
			}
		} catch (e) { problems.push(`Couldn't read size of ${key}: ${e.message}`); }
	}
	r = Number(r.toFixed(4));
	ratioCache.set(key, r);
	return r;
}

// ---------- content ----------
function loadCollection(dir) {
	const full = path.join(ROOT, 'content', dir);
	if (!fs.existsSync(full)) return [];
	return fs.readdirSync(full).filter((f) => /\.ya?ml$/.test(f)).sort().map((f) => {
		const data = loadYaml(`content/${dir}/${f}`);
		data.slug = slugOf(f);
		data.file = `content/${dir}/${f}`;
		return data;
	});
}

const cases = loadCollection('case-studies');
const articles = loadCollection('articles');
const caseBySlug = new Map(cases.map((c) => [c.slug, c]));
const articleBySlug = new Map(articles.map((a) => [a.slug, a]));
const home = loadYaml('content/home.yml');
const writing = loadYaml('content/writing.yml');

// Homepage rows. Case studies not in the list are added at the end, one per row.
const rows = [];
const onHome = new Set();
for (const row of home.projects || []) {
	const take = (ref) => {
		const c = ref && caseBySlug.get(slugOf(ref));
		if (!c) { if (ref) problems.push(`Homepage lists a case study that doesn't exist: ${ref}`); return null; }
		if (c.hidden || onHome.has(c.slug)) return null;
		onHome.add(c.slug);
		return c;
	};
	if (row.type === 'pair') {
		const a = take(row.narrow), b = take(row.wide);
		if (a && b) rows.push([a, b]); else if (a || b) rows.push([a || b]);
	} else {
		const c = take(row.project);
		if (c) rows.push([c]);
	}
}
for (const c of cases) if (!c.hidden && !onHome.has(c.slug)) { rows.push([c]); onHome.add(c.slug); }
const homeOrder = rows.flat();

// Writing list. Articles not in the list go on top, newest first.
const listed = (writing.articles || []).map((r) => articleBySlug.get(slugOf(r))).filter((a) => a && !a.hidden);
const unlisted = articles.filter((a) => !a.hidden && !listed.includes(a)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
const writingOrder = [...unlisted, ...listed];

// ---------- copy static site ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const entry of fs.readdirSync(ROOT)) {
	if (SKIP.has(entry)) continue;
	fs.cpSync(path.join(ROOT, entry), path.join(DIST, entry), { recursive: true });
}
const write = (rel, html) => {
	const out = path.join(DIST, rel);
	fs.mkdirSync(path.dirname(out), { recursive: true });
	fs.writeFileSync(out, html);
};

// ---------- link preview images ----------
fs.mkdirSync(path.join(DIST, 'images/og'), { recursive: true });
async function ogImage(name, src) {
	const f = src && fileFor(src);
	if (!f) return null;
	const version = crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 8);
	const out = path.join(DIST, 'images/og', `${name}.jpg`);
	let q = 85;
	do {
		await sharp(f).flatten({ background: '#121211' }).resize(1200, 627, { fit: 'cover', position: 'centre' })
			.jpeg({ quality: q, progressive: true, mozjpeg: true }).toFile(out);
		q -= 7;
	} while (fs.statSync(out).size > 290_000 && q > 50);
	return `${SITE}/images/og/${name}.jpg?v=${version}`;
}
const ogTags = (img) => img
	? `\t<meta property="og:image" content="${img}" />\n\t<meta property="og:image:type" content="image/jpeg" />\n\t<meta property="og:image:width" content="1200" />\n\t<meta property="og:image:height" content="627" />\n`
	: `\t<meta property="og:image" content="${SITE}/images/og/default.png" />\n\t<meta property="og:image:type" content="image/png" />\n\t<meta property="og:image:width" content="1200" />\n\t<meta property="og:image:height" content="1200" />\n`;

// ---------- rich text ----------
function richText(html, { article = false } = {}) {
	const $ = cheerio.load(html || '', null, false);
	$('a').each((_, a) => {
		const el = $(a);
		if (!el.attr('class')) el.attr('class', 'text-link');
		const href = el.attr('href') || '';
		if (/^https?:\/\//.test(href) && !href.startsWith(SITE) && !href.startsWith('https://victorosondu.com')) {
			el.attr('target', '_blank');
			el.attr('rel', 'noopener');
		}
	});
	if (article) $('ul, ol').each((_, l) => { if (!$(l).attr('class')) $(l).attr('class', 'article-list'); });
	else $('blockquote').each((_, q) => {
		const inner = $(q).find('p').length ? $(q).find('p').map((_, p) => $(p).html()).get() : [$(q).html()];
		$(q).replaceWith(inner.map((h) => `<p class="white">${h}</p>`).join('\n'));
	});
	$('p').each((_, p) => { if (!$(p).text().trim() && !$(p).find('img').length) $(p).remove(); });
	return $.html().trim();
}

// ---------- case studies ----------
function mediaEl(item, { hero = false, first = false } = {}) {
	const ar = fmt(ratioOf(item));
	const alt = escAttr(item.alt || '');
	if (item.video) {
		const poster = item.image ? ` poster="${url(item.image)}"` : '';
		const label = item.alt ? ` aria-label="${alt}"` : '';
		const mode = item.playback === 'autoplay'
			? 'autoplay muted loop playsinline'
			: 'controls muted loop playsinline preload="metadata"';
		return `<video ${mode}${poster} style="--ar: ${ar};"${label}><source src="${url(item.video)}" type="video/mp4" /></video>`;
	}
	if (!item.image) return '';
	const load = hero ? (first ? ' fetchpriority="high"' : '') : ' loading="lazy"';
	if (item.background === 'light' || item.background === 'dark') {
		return `<div class="logo-cell ${item.background}" style="--ar: ${ar};"><img src="${url(item.image)}" alt="${alt}"${load} /></div>`;
	}
	const pri = hero && first ? ' fetchpriority="high"' : '';
	return hero
		? `<img${pri} src="${url(item.image)}" alt="${alt}" style="--ar: ${ar};" />`
		: `<img src="${url(item.image)}" alt="${alt}" style="--ar: ${ar};" loading="lazy" />`;
}

function mediaBlock(items, { cls = 'cs-media', hero = false, layout, caption, anchor } = {}) {
	items = (items || []).filter((i) => i && (i.image || i.video));
	if (!items.length) return '';
	const id = anchor ? ` id="${escAttr(anchor)}"` : '';
	const cap = caption ? `\n\t\t\t<p class="muted" style="margin-top: 1.25rem;">${esc(caption)}</p>` : '';
	const els = items.map((it, i) => mediaEl(it, { hero, first: i === 0 }));
	if (items.length === 1 && layout !== 'split') {
		return `\t\t<div class="${cls} cs-one"${id}>\n\t\t\t${els[0]}${cap}\n\t\t</div>`;
	}
	if (layout === 'split') {
		return `\t\t<div class="${cls}"${id}>\n\t\t\t<div class="cs-split">\n\t\t\t\t${els.join('\n\t\t\t\t')}\n\t\t\t</div>${cap}\n\t\t</div>`;
	}
	const rowAr = fmt(items.reduce((s, it) => s + ratioOf(it), 0));
	return `\t\t<div class="${cls}"${id}>\n\t\t\t<div class="cs-row" style="--row-ar: ${rowAr}; --n: ${items.length};">\n\t\t\t\t${els.join('\n\t\t\t\t')}\n\t\t\t</div>${cap}\n\t\t</div>`;
}

function textColourFor(hex) {
	const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255)
		.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
	const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
	return L < 0.27 ? '#fafaf8' : '#111110';
}

function section(block) {
	switch (block.type) {
		case 'text':
			return `\t\t<section class="cs-text">\n\t\t\t<div class="prose">\n\t\t\t\t${richText(block.body)}\n\t\t\t</div>\n\t\t</section>`;
		case 'media':
			return mediaBlock(block.items, { layout: block.layout, caption: block.caption, anchor: block.anchor });
		case 'colours': {
			const sw = (block.colours || []).filter((c) => /^#?[0-9a-f]{6}$/i.test(c.hex || '')).map((c) => {
				const hex = (c.hex.startsWith('#') ? c.hex : '#' + c.hex);
				const text = c.text === 'light' ? '#fafaf8' : c.text === 'dark' ? '#111110' : textColourFor(hex);
				return `\t\t\t\t<div class="swatch" tabindex="0" style="background:${hex.toLowerCase()};"><span class="swatch-label" style="color:${text};">${esc(c.name)} · ${hex.toUpperCase()}</span></div>`;
			});
			return `\t\t<div class="cs-media">\n\t\t\t<div class="swatches" aria-label="${escAttr(block.label || 'Colour palette')}">\n${sw.join('\n')}\n\t\t\t</div>\n\t\t</div>`;
		}
		case 'quote':
			return `\t\t<section class="cs-quote">\n\t\t\t<blockquote>\n\t\t\t\t<p>${esc(block.quote)}</p>\n\t\t\t\t<footer>${esc(block.author)}</footer>\n\t\t\t</blockquote>\n\t\t</section>`;
		default:
			problems.push(`Unknown section type: ${block.type}`);
			return '';
	}
}

const caseTpl = read('build/templates/case-study.html');
const cardName = (c) => (c.card && c.card.name) || c.title;

async function buildCase(c) {
	const idx = homeOrder.indexOf(c);
	const next = homeOrder.length > 1 ? homeOrder[(idx + 1) % homeOrder.length] : null;
	const parts = [
		`\t<main>\n\t\t<section class="page-intro">\n\t\t\t<h1 class="white">${esc(c.title)}</h1>\n\t\t\t<p class="muted">${esc(c.subtitle || '')}</p>\n\t\t</section>\n`,
		mediaBlock(c.hero, { cls: 'cs-hero', hero: true }) + '\n',
	];
	if (c.details && c.details.length) {
		parts.push(`\t\t<section class="cs-meta" aria-label="Project details">\n${c.details.map((d) => `\t\t\t<div><p class="muted">${esc(d.label)}</p><p>${esc(d.value)}</p></div>`).join('\n')}\n\t\t</section>\n`);
	}
	for (const b of c.sections || []) { const h = section(b); if (h) parts.push(h); }
	parts.push(`\n\t\t<nav class="cs-next" aria-label="More work">\n\t\t\t<a href="/#work">All work</a>${next && next !== c ? `\n\t\t\t<a href="/${next.slug}"><span class="next-label">Next project</span>${esc(cardName(next))}</a>` : ''}\n\t\t</nav>\n\n\t</main>`);
	const og = await ogImage(c.slug, (c.card && c.card.image) || (c.hero && c.hero[0] && c.hero[0].image));
	const seo = c.seo || {};
	const html = fill(caseTpl, {
		TITLE: escAttr(`${seo.title || c.title} | Victor Osondu`),
		DESCRIPTION: escAttr(seo.description || c.subtitle || ''),
		URL: `${SITE}/${c.slug}`,
		ROBOTS: c.hidden ? '\n\t<meta name="robots" content="noindex" />' : '',
		OG: ogTags(og) + `\t<meta name="twitter:card" content="summary_large_image" />\n`,
		MAIN: parts.join('\n'),
	});
	write(`${c.slug}.html`, html);
}

// ---------- articles ----------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const isoDate = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d || '').slice(0, 10));
const longDate = (d) => { const [y, m, day] = isoDate(d).split('-').map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };
const shortDate = (d) => { const [y, m, day] = isoDate(d).split('-').map(Number); return `${day} ${MONTHS[m - 1].slice(0, 3)} ${y}`; };

function articleBlock(b) {
	switch (b.type) {
		case 'text': return richText(b.body, { article: true });
		case 'note': {
			const inner = richText(b.body, { article: true }).replace(/^<p>|<\/p>$/g, '');
			return `<p class="article-note">${inner}</p>`;
		}
		case 'table': {
			const cols = b.columns || [];
			const head = cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('');
			const body = (b.rows || []).map((r) => {
				const cells = (r.cells || []).map((v, i) => {
					const label = escAttr(cols[i] || '');
					const content = richText(String(v ?? ''), { article: true }).replace(/^<p>([\s\S]*)<\/p>$/, '$1');
					return i === 0 ? `<th scope="row" data-label="${label}">${content}</th>` : `<td data-label="${label}">${content}</td>`;
				}).join('');
				return `<tr>${cells}</tr>`;
			}).join('');
			return `<div class="article-table"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
		}
		default: problems.push(`Unknown article block: ${b.type}`); return '';
	}
}

const articleTpl = read('build/templates/article.html');
async function buildArticle(a) {
	const seo = a.seo || {};
	const headline = seo.title || a.title;
	const description = seo.description || a.summary || '';
	const pageUrl = `${SITE}/writing/${a.slug}`;
	const og = a.image ? await ogImage(`writing-${a.slug}`, a.image) : null;
	const ogImg = og || `${SITE}/images/og/default.png`;
	const body = (a.body || []).map(articleBlock).join('\n');
	const main = `\t<main>
		<article>
			<header class="page-intro article-intro">
				<p class="muted"><a href="/writing" class="article-back">Writing</a></p>
				<h1 class="white">${esc(a.title)}</h1>
				<p class="muted"><time datetime="${isoDate(a.date)}">${longDate(a.date)}</time> · Victor Osondu</p>
			</header>

			<div class="section">
				<div class="article-layout">
				<div class="article-body">
${body}
				</div>
				<aside class="article-aside" aria-label="About this article">
					<div class="article-aside-block">
						<p class="article-aside-label">About the author</p>
						<p>Victor Osondu is an independent brand identity designer in Lagos, Nigeria. He builds research-led identities for businesses, from discovery to launch.</p>
						<p><a href="/about" class="text-link">More about Victor</a></p>
					</div>
					<nav class="article-aside-block article-toc-wrap" aria-label="In this article">
						<p class="article-aside-label">In this article</p>
						<ol class="article-toc"></ol>
					</nav>
				</aside>
				</div>
			</div>
		</article>

		<section class="section">
			<p><a href="/writing" class="text-link">More writing</a> · <a href="/packages" class="text-link">See packages</a></p>
		</section>
	</main>`;
	const ld = {
		'@context': 'https://schema.org', '@type': 'Article', headline, description,
		datePublished: isoDate(a.date), dateModified: isoDate(a.updated || a.date), image: ogImg.replace(/\?v=.*$/, ''),
		mainEntityOfPage: pageUrl,
		author: { '@type': 'Person', name: 'Victor Osondu', url: `${SITE}/about` },
		publisher: { '@type': 'Person', name: 'Victor Osondu', url: `${SITE}/` },
	};
	const html = fill(articleTpl, {
		TITLE: escAttr(`${headline} | Victor Osondu`),
		OGTITLE: escAttr(headline),
		DESCRIPTION: escAttr(description),
		URL: pageUrl,
		ROBOTS: a.hidden ? '\n\t<meta name="robots" content="noindex" />' : '',
		OGIMAGE: ogTags(og),
		DATE: isoDate(a.date),
		TWITTER: og ? 'summary_large_image' : 'summary',
		JSONLD: `\t<script type="application/ld+json">\n\t${JSON.stringify(ld, null, '\t').replace(/\n/g, '\n\t')}\n\t</script>\n`,
		MAIN: main,
	});
	write(`writing/${a.slug}.html`, html);
}

// ---------- homepage and writing list ----------
function card(c, first) {
	const img = c.card && c.card.image ? c.card : (c.hero && c.hero[0]) || {};
	const load = first ? ' fetchpriority="high"' : ' loading="lazy"';
	return `<a class="project-card" href="/${c.slug}">
	<div class="project-img">
		<img src="${url(img.image || '')}" alt="${escAttr(img.alt || c.title)}"${load} />
	</div>
	<div class="project-caption">
		<p class="name">${esc(cardName(c))}</p>
		<p class="tags">${esc((c.card && c.card.tags) || c.subtitle || '')}</p>
	</div>
</a>`;
}

function replaceBetween(html, name, inner) {
	const re = new RegExp(`(<!-- cms:${name} -->)[\\s\\S]*?(<!-- /cms:${name} -->)`);
	if (!re.test(html)) throw new Error(`Marker cms:${name} not found`);
	return html.replace(re, `$1\n${inner}\n$2`);
}

let first = true;
const grid = rows.map((r) => {
	if (r.length === 2) {
		const h = `<div class="project-pair">\n${r.map((c) => card(c, false)).join('\n')}\n</div>`;
		first = false;
		return h;
	}
	const h = card(r[0], first);
	first = false;
	return h;
}).join('\n');
write('index.html', replaceBetween(read('index.html'), 'projects', grid));

const list = writingOrder.map((a) => `<li class="writing-item">
	<a href="/writing/${a.slug}" class="writing-link">
		<time class="writing-date muted" datetime="${isoDate(a.date)}">${shortDate(a.date)}</time>
		<span class="writing-title white">${esc(a.title)}</span>
		<span class="writing-desc">${esc(a.summary || '')}</span>
	</a>
</li>`).join('\n');
write('writing.html', replaceBetween(read('writing.html'), 'articles', list));

// ---------- pages ----------
for (const c of cases) await buildCase(c);
for (const a of articles) await buildArticle(a);

// ---------- sitemap ----------
function lastChanged(file) {
	try {
		const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim();
		if (d) return d;
	} catch { /* not a git checkout */ }
	return new Date().toISOString().slice(0, 10);
}
const staticPages = loadYaml('build/static-pages.yml').pages || [];
const entries = [
	...staticPages.map((p) => [p.path, isoDate(p.lastmod)]),
	...homeOrder.map((c) => [`/${c.slug}`, lastChanged(c.file)]),
	...writingOrder.map((a) => [`/writing/${a.slug}`, isoDate(a.updated || a.date)]),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(([p, d]) => `  <url>\n    <loc>${SITE}${p}</loc>\n    <lastmod>${d}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;
write('sitemap.xml', sitemap);

// Copy the generated preview images back next to the default one for local checks.
console.log(`Built ${cases.length} case studies, ${articles.length} articles.`);
if (problems.length) {
	console.warn('\nThings to check:\n- ' + [...new Set(problems)].join('\n- '));
}
