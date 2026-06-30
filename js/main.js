/* ============================================
   Lumi Marketing — Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initMobileNav();
  initNavScroll();
});

/* ─── Scroll Animations (IntersectionObserver) ─ */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-up');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
}

/* ─── Mobile Navigation Toggle ───────────────── */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('active');
    toggle.classList.toggle('active');
  });

  // Close menu when clicking a link
  links.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      links.classList.remove('active');
      toggle.classList.remove('active');
    });
  });
}

/* ─── Nav background on scroll ───────────────── */
function initNavScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (window.scrollY > 20) {
          nav.classList.add('scrolled');
        } else {
          nav.classList.remove('scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  });
}

/* ─── News loader (voor nieuws/index.html) ───── */
async function loadNieuws() {
  const grid = document.getElementById('news-grid');
  if (!grid) return;

  try {
    const response = await fetch('../content/nieuws/berichten.json');
    const berichten = await response.json();

    // Sort by date, newest first
    berichten.sort((a, b) => new Date(b.datum) - new Date(a.datum));

    grid.innerHTML = berichten
      .map(
        (b) => `
        <a href="${b.slug}.html" class="news-card fade-up">
          <img
            class="news-card-image"
            src="${b.foto}"
            alt="${b.titel}"
            onerror="this.style.display='none'"
          />
          <div class="news-card-body">
            <p class="news-card-date">${formatDate(b.datum)}</p>
            <h3>${b.titel}</h3>
            <p>${b.intro}</p>
          </div>
        </a>
      `
      )
      .join('');

    // Re-init scroll animations for dynamically added elements
    initScrollAnimations();
  } catch (err) {
    grid.innerHTML =
      '<p class="caption" style="text-align:center;grid-column:1/-1;">Nog geen nieuwsberichten beschikbaar.</p>';
  }
}

function formatDate(dateStr) {
  const months = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december',
  ];
  const d = new Date(dateStr);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
