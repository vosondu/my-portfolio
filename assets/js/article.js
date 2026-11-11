// Builds the "In this article" list in the sidebar from the article's h2s,
// and marks the section currently being read.
(function () {
	const body = document.querySelector('.article-body');
	const toc = document.querySelector('.article-toc');
	if (!body || !toc) return;

	const headings = Array.from(body.querySelectorAll('h2'));
	if (headings.length < 2) {
		const wrap = toc.closest('.article-toc-wrap');
		if (wrap) wrap.remove();
		return;
	}

	const slug = (text) => text.toLowerCase()
		.replace(/[’']/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

	const links = headings.map((h) => {
		if (!h.id) h.id = slug(h.textContent);
		const li = document.createElement('li');
		const a = document.createElement('a');
		a.href = '#' + h.id;
		a.textContent = h.textContent;
		a.addEventListener('click', (e) => {
			e.preventDefault();
			if (typeof lenis !== 'undefined') lenis.scrollTo(h, { offset: -120 });
			else h.scrollIntoView({ behavior: 'smooth' });
			history.replaceState(null, '', '#' + h.id);
		});
		li.appendChild(a);
		toc.appendChild(li);
		return a;
	});

	function update() {
		const line = window.innerHeight * 0.3;
		let current = 0;
		headings.forEach((h, i) => {
			if (h.getBoundingClientRect().top <= line) current = i;
		});
		links.forEach((a, i) => a.classList.toggle('is-current', i === current));
	}

	let ticking = false;
	window.addEventListener('scroll', () => {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(() => { update(); ticking = false; });
	}, { passive: true });
	update();
})();
