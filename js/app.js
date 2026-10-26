// ========================================================
// APPLICATION ENTRY POINT (js/app.js)
// Bootstrap, API fetching, URL hash routing & keyboard shortcuts
// ========================================================

window.addEventListener('DOMContentLoaded', async () => {
  // If static server used and components were not pre-rendered by Node.js SSR
  if (document.body && document.body.innerHTML.includes('@include')) {
    await resolveClientComponents();
  }

  await loadAccounts();
  await loadAllPosts();
  if (typeof loadDonations === 'function') await loadDonations();
  setupGlobalEventListeners();

  // Apply saved language & translations
  setLanguage(AppState.currentLang, false);

  // Check URL hash routing (#account=... or #home)
  handleUrlRouting();
  window.addEventListener('hashchange', handleUrlRouting);

  if (window.lucide) lucide.createIcons();
});

// Fallback component loader for static file servers
async function resolveClientComponents() {
  const compMap = [
    { tag: '<!-- @include "components/navbar.html" -->', file: 'components/navbar.html' },
    { tag: '<!-- @include "components/home-directory.html" -->', file: 'components/home-directory.html' },
    { tag: '<!-- @include "components/gallery-view.html" -->', file: 'components/gallery-view.html' },
    { tag: '<!-- @include "components/footer.html" -->', file: 'components/footer.html' },
    { tag: '<!-- @include "components/modals.html" -->', file: 'components/modals.html' },
    { tag: '<!-- @include "components/mobile-nav.html" -->', file: 'components/mobile-nav.html' }
  ];

  for (const comp of compMap) {
    try {
      const res = await fetch(comp.file);
      if (res.ok) {
        const html = await res.text();
        const placeholder = document.createComment(` @include "${comp.file}" `);
        // Find comment node or replace in innerHTML
        const iterator = document.createNodeIterator(document.body, NodeFilter.SHOW_COMMENT);
        let node;
        while ((node = iterator.nextNode())) {
          if (node.nodeValue && node.nodeValue.includes(comp.file)) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            while (wrapper.firstChild) {
              node.parentNode.insertBefore(wrapper.firstChild, node);
            }
            node.remove();
            break;
          }
        }
      }
    } catch (e) {
      console.warn('Fallback component load failed for ' + comp.file, e);
    }
  }
}

async function loadAccounts() {
  try {
    let res = await fetch('/api/accounts');
    if (!res.ok) res = await fetch('data/accounts.json');
    if (res.ok) {
      AppState.accounts = await res.json();
    }
  } catch (e) {
    try {
      const res2 = await fetch('data/accounts.json');
      if (res2.ok) AppState.accounts = await res2.json();
    } catch (e2) {}
  }

  if (!AppState.accounts || AppState.accounts.length === 0) {
    AppState.accounts = [
      {
        id: '420458971',
        username: '@ziezie',
        displayName: '芝士小年糕吗 ❤️',
        bio: '🌸 CAA研究生在读 (China Academy of Art) • 📍 浙江 (Zhejiang) • 谢谢喜欢🦌 • 💌 zsxng0821@qq.com',
        avatar: 'photos/account_ziezie/avatar.jpg',
        lastUpdate: 'Terbaru',
        verified: true,
        followers: '70.1K',
        likesAndSaves: '916.3K',
        country: 'CN',
        countryName: 'China',
        countryFlag: '🇨🇳',
        platform: 'rednote',
        rednoteUrl: 'https://www.xiaohongshu.com/user/profile/5a2ff139e8ac2b1372c1733b'
      },
      {
        id: '599dbde850c4b46a94cf7756',
        username: '@hannayeah',
        displayName: '蒋婉鸿耶 🌸',
        bio: '🎓 CAA研 / 身高168 / 干敏皮 • 📍 浙江 (Zhejiang) • 谢谢喜欢 祝大家天天开心！ • 💌 hannayeah@qq.com',
        avatar: 'photos/account_hannayeah/avatar.jpg',
        lastUpdate: 'Terbaru',
        verified: true,
        followers: '130.1K',
        likesAndSaves: '1.2M',
        following: '173',
        redId: 'hannayeah',
        ipLocation: '浙江 (Zhejiang)',
        country: 'CN',
        countryName: 'China',
        countryFlag: '🇨🇳',
        platform: 'rednote',
        rednoteUrl: 'https://www.xiaohongshu.com/user/profile/599dbde850c4b46a94cf7756'
      }
    ];
  }
}

async function loadAllPosts() {
  try {
    let res = await fetch('/api/posts');
    if (!res.ok) res = await fetch('data/posts.json');
    if (res.ok) {
      AppState.allPosts = await res.json();
    }
  } catch (e) {
    try {
      const res2 = await fetch('data/posts.json');
      if (res2.ok) AppState.allPosts = await res2.json();
    } catch (e2) {
      AppState.allPosts = [];
    }
  }

  renderAccountsDirectory();
}

async function handleUrlRouting() {
  const hash = window.location.hash;
  if (hash.startsWith('#account=')) {
    const params = new URLSearchParams(hash.slice(1));
    const accId = params.get('account');
    const postId = params.get('post');
    if (accId) {
      await openAccountGallery(accId, false);
      if (postId) {
        openLightbox(postId, 0);
      }
    } else {
      backToHomeDirectory(false);
    }
  } else {
    backToHomeDirectory(false);
  }
}

function setupGlobalEventListeners() {
  window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('modal-lightbox');
    if (modal && !modal.classList.contains('hidden')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    }

    const donateModal = document.getElementById('modal-donate');
    if (donateModal && !donateModal.classList.contains('hidden')) {
      if (e.key === 'Escape') closeDonateModal();
    }

    const reqModal = document.getElementById('modal-requests');
    if (reqModal && !reqModal.classList.contains('hidden')) {
      if (e.key === 'Escape' && window.RequestsModule) RequestsModule.closeModal();
    }
  });
}
