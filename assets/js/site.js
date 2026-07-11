(function () {
  const cards = document.querySelectorAll('.project-card');
  if (cards.length && 'IntersectionObserver' in window) {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const rootMargin = mediaQuery.matches ? '0px 0px -50% 0px' : '0px 0px -60% 0px';

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;

        if (entry.isIntersecting) {
          el.classList.add('in-view');
          el.classList.remove('out-view');
        } else if (entry.intersectionRatio <= 0.1) {
          el.classList.remove('in-view');
          el.classList.add('out-view');
        }
      });
    }, {
      root: null,
      rootMargin,
      threshold: [0, 0.1]
    });

    cards.forEach((card) => observer.observe(card));
  }
})();

(function () {
  const testimonialTrack = document.querySelector('.testimonials-grid');
  const testimonialNavButtons = document.querySelectorAll('.testimonial-nav');

  if (!testimonialTrack || !testimonialNavButtons.length) return;

  const card = testimonialTrack.querySelector('.testimonial-card');
  if (!card) return;

  const trackStyle = getComputedStyle(testimonialTrack);
  const gap = parseFloat(trackStyle.columnGap || trackStyle.gap || '16');
  const cardWidth = card.getBoundingClientRect().width + gap;

  testimonialNavButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const direction = button.dataset.direction === 'next' ? 1 : -1;
      testimonialTrack.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
    });
  });
})();
