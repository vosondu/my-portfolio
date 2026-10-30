// Case study lightbox: click an image to view it full screen.
// Arrow keys, on-screen arrows or swipe move through the page's images; Escape, X or the backdrop closes it.
(function () {
	const images = Array.prototype.slice.call(document.querySelectorAll('.cs-hero img, .cs-media img'));
	if (!images.length) return;

	const box = document.createElement('div');
	box.className = 'lightbox';
	box.setAttribute('role', 'dialog');
	box.setAttribute('aria-modal', 'true');
	box.setAttribute('aria-label', 'Image viewer');
	box.hidden = true;
	box.innerHTML =
		'<button type="button" class="lb-close" aria-label="Close">' +
		'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
		'<button type="button" class="lb-nav lb-prev" aria-label="Previous image">' +
		'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
		'<figure class="lb-stage"><img alt="" /></figure>' +
		'<button type="button" class="lb-nav lb-next" aria-label="Next image">' +
		'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
		'<p class="lb-count" aria-live="polite"></p>';
	document.body.appendChild(box);

	const img = box.querySelector('.lb-stage img');
	const count = box.querySelector('.lb-count');
	const prevBtn = box.querySelector('.lb-prev');
	const nextBtn = box.querySelector('.lb-next');
	const closeBtn = box.querySelector('.lb-close');
	let index = 0;
	let lastFocus = null;

	if (images.length < 2) {
		prevBtn.hidden = true;
		nextBtn.hidden = true;
	}

	function show(i) {
		index = (i + images.length) % images.length;
		const src = images[index];
		img.classList.remove('is-ready');
		// Wait two frames so the fade-in always plays, even for images the browser already has
		const reveal = function () {
			requestAnimationFrame(function () {
				requestAnimationFrame(function () { img.classList.add('is-ready'); });
			});
		};
		img.onload = reveal;
		img.src = src.currentSrc || src.src;
		img.alt = src.alt || '';
		if (img.complete) reveal();
		count.textContent = images.length > 1 ? (index + 1) + ' / ' + images.length : '';
	}

	function browse(step) {
		box.classList.add('is-browsing');
		show(index + step);
	}

	function open(i) {
		lastFocus = document.activeElement;
		box.classList.remove('is-browsing');
		show(i);
		box.hidden = false;
		requestAnimationFrame(function () { box.classList.add('is-open'); });
		document.documentElement.classList.add('lightbox-open');
		if (typeof lenis !== 'undefined') lenis.stop();
		closeBtn.focus({ preventScroll: true });
	}

	function close() {
		box.classList.remove('is-open');
		document.documentElement.classList.remove('lightbox-open');
		if (typeof lenis !== 'undefined') lenis.start();
		setTimeout(function () { box.hidden = true; img.removeAttribute('src'); }, 600);
		if (lastFocus) lastFocus.focus({ preventScroll: true });
	}

	images.forEach(function (el, i) {
		el.classList.add('lb-trigger');
		el.setAttribute('tabindex', '0');
		el.setAttribute('role', 'button');
		el.setAttribute('aria-label', 'View larger: ' + (el.alt || 'image'));
		el.addEventListener('click', function () { open(i); });
		el.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
		});
	});

	closeBtn.addEventListener('click', close);
	prevBtn.addEventListener('click', function (e) { e.stopPropagation(); browse(-1); });
	nextBtn.addEventListener('click', function (e) { e.stopPropagation(); browse(1); });
	box.addEventListener('click', function (e) {
		if (e.target === box || e.target.classList.contains('lb-stage')) close();
	});

	document.addEventListener('keydown', function (e) {
		if (box.hidden) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowLeft') browse(-1);
		else if (e.key === 'ArrowRight') browse(1);
		else if (e.key === 'Tab') {
			// keep keyboard focus inside the viewer
			const focusables = Array.prototype.filter.call(box.querySelectorAll('button'), function (b) { return !b.hidden; });
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
			else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
		}
	});

	// Swipe on touch screens
	let startX = 0;
	let startY = 0;
	box.addEventListener('touchstart', function (e) {
		startX = e.touches[0].clientX;
		startY = e.touches[0].clientY;
	}, { passive: true });
	box.addEventListener('touchend', function (e) {
		const dx = e.changedTouches[0].clientX - startX;
		const dy = e.changedTouches[0].clientY - startY;
		if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) browse(dx < 0 ? 1 : -1);
		else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
	}, { passive: true });
})();
