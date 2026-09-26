// Burger menu: opens a fullscreen panel, closes on link click or Escape.
(function () {
	const toggle = document.querySelector('.menu-toggle');
	const menu = document.getElementById('site-menu');
	if (!toggle || !menu) return;

	const root = document.documentElement;

	function setOpen(open) {
		toggle.setAttribute('aria-expanded', String(open));
		toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
		menu.classList.toggle('is-open', open);
		menu.setAttribute('aria-hidden', String(!open));
		root.classList.toggle('menu-open', open);

		if (typeof lenis !== 'undefined') {
			open ? lenis.stop() : lenis.start();
		}

		if (open) {
			const first = menu.querySelector('a');
			if (first) setTimeout(() => first.focus({ preventScroll: true }), 300);
		}
	}

	toggle.addEventListener('click', () => {
		setOpen(toggle.getAttribute('aria-expanded') !== 'true');
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && menu.classList.contains('is-open')) {
			setOpen(false);
			toggle.focus();
		}
	});

	menu.querySelectorAll('a').forEach((link) => {
		link.addEventListener('click', () => setOpen(false));
	});

	// Highlight the page you're on
	const path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
	menu.querySelectorAll('a[data-path]').forEach((link) => {
		if (link.dataset.path === path) link.setAttribute('aria-current', 'page');
	});
})();

// Local preview (VS Code Live Server, localhost): clean links like /process need
// Vercel to resolve them, so point them at the .html files instead.
(function () {
	const host = window.location.hostname;
	if (host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.local')) return;
	document.querySelectorAll('a[href^="/"]').forEach((link) => {
		const href = link.getAttribute('href');
		const m = href.match(/^\/([a-z0-9-]+)([?#].*)?$/i);
		if (m) link.setAttribute('href', '/' + m[1] + '.html' + (m[2] || ''));
	});
})();
