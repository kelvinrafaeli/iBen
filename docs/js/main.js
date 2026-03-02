// ═══════════════════════════════════════════════
// iBEN Robot Documentation — Main JS
// ═══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // ── Mobile Menu Toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !menuToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ── Active Sidebar Link Highlight
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ── Full-Text Search Functionality
  const searchInput = document.querySelector('.header__search input');
  const searchOverlay = document.querySelector('.search-results');
  const searchPanel = document.querySelector('.search-results__panel');

  const pages = [
    { url: 'index.html', label: 'Início' },
    { url: 'robot-x300b.html', label: 'Robô X300B' },
    { url: 'ims-platform.html', label: 'Plataforma iMS' },
    { url: 'maintenance.html', label: 'Manutenção' },
    { url: 'installation.html', label: 'Instalação' },
  ];

  let searchIndex = null; // lazy-loaded

  // Build a search index by fetching all pages and extracting sections
  async function buildSearchIndex() {
    if (searchIndex) return searchIndex;
    searchIndex = [];
    const fetches = pages.map(async (pg) => {
      try {
        const resp = await fetch(pg.url);
        if (!resp.ok) return;
        const html = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const main = doc.querySelector('.content') || doc.querySelector('main') || doc.body;
        // Walk through all elements that have an id — these are our sections
        const sections = main.querySelectorAll('[id]');
        if (sections.length === 0) {
          // Fallback: index the whole page as one entry
          const text = main.textContent.replace(/\s+/g, ' ').trim();
          searchIndex.push({ page: pg.url, pageLabel: pg.label, section: '', title: pg.label, text });
          return;
        }
        sections.forEach((el) => {
          // Gather text from this element until the next sibling with an id
          let text = '';
          let node = el;
          while (node) {
            text += ' ' + node.textContent;
            node = node.nextElementSibling;
            if (node && node.id) break;
          }
          text = text.replace(/\s+/g, ' ').trim();
          // Determine a nice title from the heading inside or near the element
          const heading = el.tagName.match(/^H[1-6]$/i)
            ? el
            : el.querySelector('h1,h2,h3,h4,h5,h6');
          const title = heading
            ? heading.textContent.trim()
            : el.querySelector('strong,b')?.textContent.trim() || el.textContent.substring(0, 80).trim();
          searchIndex.push({
            page: pg.url,
            pageLabel: pg.label,
            section: el.id,
            title,
            text: text.substring(0, 2000), // cap per section
          });
        });
      } catch (_) { /* skip on error */ }
    });
    await Promise.all(fetches);
    return searchIndex;
  }

  // Highlight matching words in a snippet
  function highlightSnippet(text, query, maxLen = 120) {
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query);
    if (idx === -1) return text.substring(0, maxLen) + (text.length > maxLen ? '…' : '');
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + query.length + 80);
    let snippet = (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');
    // Bold the match
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    snippet = snippet.replace(re, '<mark>$1</mark>');
    return snippet;
  }

  let searchTimeout = null;

  if (searchInput) {
    searchInput.addEventListener('focus', () => { buildSearchIndex(); }); // pre-load on focus

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query.length < 2) {
        if (searchOverlay) searchOverlay.classList.remove('active');
        return;
      }
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        await buildSearchIndex();
        const results = searchIndex
          .filter(item =>
            item.title.toLowerCase().includes(query) ||
            item.text.toLowerCase().includes(query)
          )
          .slice(0, 15); // limit results

        if (results.length > 0 && searchOverlay && searchPanel) {
          searchPanel.innerHTML = results.map(r => `
            <div class="search-results__item">
              <a href="${r.page}${r.section ? '#' + r.section : ''}">
                <span class="search-results__badge">${r.pageLabel}</span>
                <strong>${r.title}</strong>
                <p>${highlightSnippet(r.text, query)}</p>
              </a>
            </div>
          `).join('');
          searchOverlay.classList.add('active');
        } else if (searchOverlay && searchPanel) {
          searchPanel.innerHTML = '<div class="search-results__item"><p style="padding:1rem;color:var(--muted);">Nenhum resultado encontrado.</p></div>';
          searchOverlay.classList.add('active');
        }
      }, 200); // debounce 200ms
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchOverlay) {
        searchOverlay.classList.remove('active');
        searchInput.value = '';
      }
    });
  }

  if (searchOverlay) {
    searchOverlay.addEventListener('click', (e) => {
      if (e.target === searchOverlay) {
        searchOverlay.classList.remove('active');
        if (searchInput) searchInput.value = '';
      }
    });
  }

  // ── Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Scroll spy for sidebar sublinks
  const sublinks = document.querySelectorAll('.sidebar__sublinks a');
  if (sublinks.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          sublinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-100px 0px -60% 0px' });

    sublinks.forEach(link => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) observer.observe(target);
    });
  }
});
