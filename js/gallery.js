// ========================================================
// GALLERY MODULE (js/gallery.js)
// Account Profile Header, Post Cards, Carousel, Lightbox & Interactions
// ========================================================

async function openAccountGallery(accId, updateHash = true, keepFilter = false) {
  AppState.currentAccountId = accId;
  AppState.currentAccount = AppState.accounts.find(a => a.id === accId) || AppState.accounts[0];

  if (!keepFilter) {
    AppState.currentFilter = 'all';
    updateFilterBadgesUI('all');
  }

  document.getElementById('view-home-directory').classList.add('hidden');
  document.getElementById('view-account-gallery').classList.remove('hidden');

  // Update Navbar & Mobile Nav styles
  updateNavActiveState(AppState.currentFilter === 'favorites' ? 'favorites' : 'gallery');
  const navLabel = document.getElementById('nav-gallery-label');
  if (navLabel) navLabel.textContent = AppState.currentAccount.displayName;

  if (updateHash) window.location.hash = `#account=${accId}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  renderProfileUI();
  await loadAccountPosts();
  setGridColumns(AppState.currentGridCols);
}

function openCurrentAccountGallery() {
  AppState.currentFilter = 'all';
  updateFilterBadgesUI('all');
  if (AppState.currentAccountId) {
    openAccountGallery(AppState.currentAccountId, true, false);
  } else if (AppState.accounts.length > 0) {
    openAccountGallery(AppState.accounts[0].id, true, false);
  }
}

async function loadAccountPosts() {
  if (AppState.allPosts && AppState.allPosts.length > 0) {
    AppState.posts = AppState.allPosts.filter(p => p.accountId === AppState.currentAccountId);
  } else {
    try {
      const url = `/api/posts?accountId=${encodeURIComponent(AppState.currentAccountId)}`;
      const res = await fetch(url);
      if (res.ok) {
        AppState.posts = await res.json();
      }
    } catch (e) {
      AppState.posts = [];
    }
  }

  // Sync persistent local likes & bookmarks
  AppState.posts.forEach(p => {
    if (AppState.likedPosts && AppState.likedPosts[p.id] !== undefined) {
      if (AppState.likedPosts[p.id] && !p.isLiked) p.likes = (p.likes || 0) + 1;
      p.isLiked = !!AppState.likedPosts[p.id];
    }
    if (AppState.bookmarkedPosts && AppState.bookmarkedPosts[p.id] !== undefined) {
      p.isBookmarked = !!AppState.bookmarkedPosts[p.id];
    }
  });

  updateStats();
  renderPosts();
}

function renderProfileUI() {
  const acc = AppState.currentAccount;
  if (!acc) return;

  const displayNameEl = document.getElementById('profile-display-name');
  if (displayNameEl) {
    displayNameEl.textContent = acc.displayName;
  }

  const countryBadgeEl = document.getElementById('profile-country-badge');
  if (countryBadgeEl) {
    const isKr = acc.country === 'KR';
    const flagSvg = typeof getCountryFlagSVG === 'function' ? getCountryFlagSVG(acc.country) : '';
    countryBadgeEl.innerHTML = `${flagSvg} <span>${isKr ? 'KOREA' : 'CHINA'}</span>`;
    countryBadgeEl.className = `brutal-border px-2.5 py-0.5 rounded-full text-xs font-black shadow-brutal-sm inline-flex items-center gap-1.5 flex-shrink-0 ${isKr ? 'bg-sky-100 text-sky-900' : 'bg-rose-100 text-rose-900'}`;
  }

  const usernameEl = document.getElementById('profile-username');
  if (usernameEl) usernameEl.textContent = acc.username;

  const ipBadgeEl = document.getElementById('profile-ip-badge');
  if (ipBadgeEl) {
    ipBadgeEl.textContent = `📍 ${acc.ipLocation || 'China'}`;
  }

  const redIdBadgeEl = document.getElementById('profile-redid-badge');
  if (redIdBadgeEl) {
    redIdBadgeEl.textContent = `ID: ${acc.redId || acc.id}`;
  }

  const realFollowersEl = document.getElementById('stat-real-followers');
  if (realFollowersEl) {
    realFollowersEl.textContent = acc.followers || '70.1K';
  }

  const realLikesSavesEl = document.getElementById('stat-real-likes-saves');
  if (realLikesSavesEl) {
    realLikesSavesEl.textContent = acc.likesAndSaves || '916.3K';
  }

  const bioEl = document.getElementById('profile-bio');
  if (bioEl) bioEl.textContent = acc.bio;

  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) {
    avatarEl.src = acc.avatar;
    avatarEl.onerror = () => { avatarEl.src = 'photos/account_ziezie/avatar.jpg'; };
  }

  const lastUpdateEl = document.getElementById('global-last-update-text');
  if (lastUpdateEl) lastUpdateEl.textContent = acc.lastUpdate || 'Terbaru';

  // Dynamic Vault Badge in the Banner Header (Foto 3 Style)
  const vaultBadge = document.getElementById('profile-banner-vault-badge');
  if (vaultBadge) {
    if (acc.platform === 'instagram') {
      vaultBadge.textContent = '★ OFFICIAL INSTAGRAM ARCHIVE';
    } else {
      vaultBadge.textContent = '★ OFFICIAL REDNOTE VAULT';
    }
  }

  // Platform External Link (Instagram vs Rednote)
  const platformLink = document.getElementById('btn-rednote-link');
  const platformLabel = document.getElementById('btn-rednote-link-label');
  if (platformLink && platformLabel) {
    if (acc.platform === 'instagram') {
      platformLink.href = acc.profileUrl || `https://www.instagram.com/${acc.username.replace('@', '')}/`;
      platformLabel.textContent = t('visitInstagramBtn');
    } else {
      platformLink.href = acc.rednoteUrl || 'https://www.rednote.com';
      platformLabel.textContent = t('visitRednoteBtn');
    }
  }

  updateFollowButtonUI();
  updateStats();
  if (window.lucide) lucide.createIcons();
}

function formatStatCount(num) {
  const n = Number(num) || 0;
  if (n >= 1000000) {
    return (n / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return String(n);
}

function updateStats() {
  const postsCountEl = document.getElementById('stat-total-posts');
  if (postsCountEl) postsCountEl.textContent = AppState.posts.length;

  const totalPhotos = AppState.posts.reduce((sum, p) => sum + (p.photos ? p.photos.length : 1), 0);
  const photosCountEl = document.getElementById('stat-total-photos');
  if (photosCountEl) photosCountEl.textContent = totalPhotos;

  const totalLikes = AppState.posts.reduce((sum, p) => sum + (Number(p.likes) || 0), 0);
  const totalSaves = AppState.posts.reduce((sum, p) => sum + (Number(p.collectedCount) || 0), 0);
  const totalLikesAndSaves = totalLikes + totalSaves;

  const likesCountEl = document.getElementById('stat-total-likes');
  if (likesCountEl) {
    likesCountEl.textContent = formatStatCount(totalLikes);
  }

  const realLikesSavesEl = document.getElementById('stat-real-likes-saves');
  if (realLikesSavesEl) {
    realLikesSavesEl.textContent = AppState.currentAccount?.likesAndSaves || formatStatCount(totalLikesAndSaves);
  }
}

// Follow Button Logic
function updateFollowButtonUI() {
  if (!AppState.currentAccount) return;
  const isFollowed = !!AppState.followStates[AppState.currentAccount.id];
  const btn = document.getElementById('btn-follow-account');
  const label = document.getElementById('btn-follow-label');
  if (!btn || !label) return;

  if (isFollowed) {
    btn.className = 'brutal-btn justify-center whitespace-nowrap bg-white hover:bg-neutral-50 text-magenta px-2.5 sm:px-4 py-2 rounded-xl brutal-border font-black text-[11px] sm:text-xs shadow-brutal flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer truncate';
    label.textContent = t('followingBtn');
  } else {
    btn.className = 'brutal-btn justify-center whitespace-nowrap bg-magenta hover:bg-magenta-600 text-white px-2.5 sm:px-4 py-2 rounded-xl brutal-border font-black text-[11px] sm:text-xs shadow-brutal flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer truncate';
    label.textContent = t('followBtn');
  }
}

function toggleFollowAccount() {
  if (!AppState.currentAccount) return;
  const isFollowed = !AppState.followStates[AppState.currentAccount.id];
  AppState.followStates[AppState.currentAccount.id] = isFollowed;
  localStorage.setItem('wifey_follows', JSON.stringify(AppState.followStates));
  updateFollowButtonUI();

  if (isFollowed) {
    try {
      if (window.confetti) {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#e6007e', '#ff007f', '#fff066', '#ffffff']
        });
      }
    } catch(e) {}
    showToast(t('toastFollowed'));
  } else {
    showToast(t('toastUnfollowed'));
  }
}

function shareProfile() {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    showToast(t('toastCopied'));
  } else {
    prompt('Salin link profil:', url);
  }
}

// ========================================================
// POSTS RENDERING, PROGRESSIVE BATCHING & CAROUSEL
// ========================================================
const POSTS_PER_PAGE = 12;

function getFilteredAndSortedPosts() {
  const filtered = AppState.posts.filter(post => {
    if (AppState.currentFilter === 'multi' && (!post.photos || post.photos.length <= 1)) return false;
    if (AppState.currentFilter === 'single' && (post.photos && post.photos.length > 1)) return false;
    if (AppState.currentFilter === 'favorites' && !post.isBookmarked) return false;

    if (AppState.searchQuery && AppState.searchQuery.trim() !== '') {
      const q = AppState.searchQuery.toLowerCase();
      const matchCaption = post.caption?.toLowerCase().includes(q);
      const matchUsername = post.username?.toLowerCase().includes(q);
      const matchTags = post.tags && post.tags.some(t => t.toLowerCase().includes(q));
      const matchCategory = post.category && post.category.toLowerCase().includes(q);
      if (!matchCaption && !matchUsername && !matchTags && !matchCategory) return false;
    }

    return true;
  });

  // Chronological sorting (Newest vs Oldest)
  filtered.sort((a, b) => {
    const tA = Number(a.timestamp || (a.id ? parseInt(a.id.match(/6[0-9a-f]{7}/)?.[0] || '0', 16) * 1000 : 0));
    const tB = Number(b.timestamp || (b.id ? parseInt(b.id.match(/6[0-9a-f]{7}/)?.[0] || '0', 16) * 1000 : 0));
    return AppState.currentSortOrder === 'newest' ? (tB - tA) : (tA - tB);
  });

  return filtered;
}

function renderPosts(resetPage = true) {
  const container = document.getElementById('posts-container');
  const emptyState = document.getElementById('empty-state');
  const paginationControls = document.getElementById('pagination-controls');
  if (!container) return;

  if (resetPage) {
    AppState.currentPage = 1;
  }

  const filtered = getFilteredAndSortedPosts();

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (paginationControls) paginationControls.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  const visibleCount = AppState.currentPage * POSTS_PER_PAGE;
  const visiblePosts = filtered.slice(0, visibleCount);

  container.innerHTML = visiblePosts.map(post => createPostCardHtml(post)).join('');

  visiblePosts.forEach(post => {
    const count = post.photos ? post.photos.length : 1;
    if (!AppState.carouselStates[post.id]) AppState.carouselStates[post.id] = 0;
    if (count > 1) attachSwipeGesture(post.id, count);
  });

  if (window.lucide) lucide.createIcons({ root: container });
  updatePaginationUI(visiblePosts.length, filtered.length);
}

function loadMorePosts() {
  const filtered = getFilteredAndSortedPosts();
  const currentTotalVisible = AppState.currentPage * POSTS_PER_PAGE;
  if (currentTotalVisible >= filtered.length) return;

  const nextBatch = filtered.slice(currentTotalVisible, currentTotalVisible + POSTS_PER_PAGE);
  AppState.currentPage++;

  const container = document.getElementById('posts-container');
  if (!container || nextBatch.length === 0) return;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = nextBatch.map(post => createPostCardHtml(post)).join('');

  const newCards = Array.from(tempDiv.children);
  newCards.forEach(card => container.appendChild(card));

  nextBatch.forEach(post => {
    const count = post.photos ? post.photos.length : 1;
    if (!AppState.carouselStates[post.id]) AppState.carouselStates[post.id] = 0;
    if (count > 1) attachSwipeGesture(post.id, count);
  });

  newCards.forEach(card => {
    if (window.lucide) lucide.createIcons({ root: card });
  });

  updatePaginationUI(AppState.currentPage * POSTS_PER_PAGE, filtered.length);
}

function updatePaginationUI(shownCount, totalCount) {
  const paginationControls = document.getElementById('pagination-controls');
  const counterStatus = document.getElementById('posts-counter-status');
  const btnLoadMore = document.getElementById('btn-load-more');
  const loadMoreText = document.getElementById('load-more-text');

  if (!paginationControls) return;

  if (totalCount <= POSTS_PER_PAGE) {
    paginationControls.classList.add('hidden');
    return;
  }

  paginationControls.classList.remove('hidden');

  const actualShown = Math.min(shownCount, totalCount);
  if (counterStatus) {
    const template = typeof t === 'function' ? t('showingCount') : 'Menampilkan {shown} dari {total} postingan';
    counterStatus.textContent = (template || 'Menampilkan {shown} dari {total} postingan')
      .replace('{shown}', actualShown)
      .replace('{total}', totalCount);
  }

  if (loadMoreText) {
    loadMoreText.textContent = typeof t === 'function' ? t('btnLoadMore') : 'Muat Lebih Banyak Foto ✨';
  }

  if (btnLoadMore) {
    if (actualShown >= totalCount) {
      btnLoadMore.classList.add('hidden');
    } else {
      btnLoadMore.classList.remove('hidden');
    }
  }

  setupInfiniteScroll();
}

let infiniteScrollObserver = null;
function setupInfiniteScroll() {
  if (infiniteScrollObserver) {
    infiniteScrollObserver.disconnect();
  }

  const btnLoadMore = document.getElementById('btn-load-more');
  if (!btnLoadMore || btnLoadMore.classList.contains('hidden')) return;

  if ('IntersectionObserver' in window) {
    infiniteScrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const filtered = getFilteredAndSortedPosts();
          const currentTotalVisible = AppState.currentPage * POSTS_PER_PAGE;
          if (currentTotalVisible < filtered.length) {
            loadMorePosts();
          }
        }
      });
    }, {
      rootMargin: '250px 0px',
      threshold: 0.1
    });

    infiniteScrollObserver.observe(btnLoadMore);
  }
}

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function createPostCardHtml(post) {
  const photos = post.photos || [];
  const hasMultiplePhotos = photos.length > 1;
  const currentIndex = AppState.carouselStates[post.id] || 0;

  let dotsHtml = '';
  if (hasMultiplePhotos) {
    // Hide dots on narrow mobile if > 7 photos so they never overflow 2-col card; counter badge is always visible
    const hideMobileClass = photos.length > 7 ? 'hidden sm:flex' : 'flex';
    dotsHtml = `
      <div class="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 ${hideMobileClass} items-center gap-1 sm:gap-1.5 bg-neutral-900/80 px-2 py-1 rounded-full brutal-border max-w-[90%] overflow-hidden">
        ${photos.map((_, i) => `
          <span id="dot-${post.id}-${i}" class="transition-all duration-200 rounded-full flex-shrink-0 ${i === currentIndex ? 'w-3.5 h-1.5 sm:w-4 sm:h-2 bg-magenta' : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/75'}"></span>
        `).join('')}
      </div>
    `;
  }

  let arrowButtonsHtml = '';
  if (hasMultiplePhotos) {
    arrowButtonsHtml = `
      <button onclick="navigateCarousel('${post.id}', -1, event)" id="prev-btn-${post.id}" class="carousel-nav-btn absolute left-1 sm:left-2.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/95 hover:bg-magenta hover:text-white brutal-border shadow-brutal-sm flex items-center justify-center transition-colors ${currentIndex === 0 ? 'opacity-35 cursor-not-allowed' : 'opacity-90 hover:opacity-100'}">
        <i data-lucide="chevron-left" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
      </button>
      <button onclick="navigateCarousel('${post.id}', 1, event)" id="next-btn-${post.id}" class="carousel-nav-btn absolute right-1 sm:right-2.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/95 hover:bg-magenta hover:text-white brutal-border shadow-brutal-sm flex items-center justify-center transition-colors ${currentIndex === photos.length - 1 ? 'opacity-35 cursor-not-allowed' : 'opacity-90 hover:opacity-100'}">
        <i data-lucide="chevron-right" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
      </button>
    `;
  }

  let counterBadgeHtml = '';
  if (hasMultiplePhotos) {
    counterBadgeHtml = `
      <div class="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 bg-neutral-900/90 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full brutal-border text-[9px] sm:text-[11px] font-black shadow-brutal-sm flex items-center gap-1">
        <i data-lucide="layers" class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-magenta"></i>
        <span id="counter-${post.id}">${currentIndex + 1}/${photos.length}</span>
      </div>
    `;
  }

  return `
    <article class="post-card-item bg-white brutal-border-3 rounded-2xl shadow-brutal overflow-hidden flex flex-col h-full">
      <div>
        <!-- Post Header -->
        <div class="p-2 sm:p-3.5 flex items-center justify-between gap-1 border-b-2 border-neutral-900 bg-neutral-50">
          <div class="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
            <div class="w-6 h-6 sm:w-9 sm:h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-magenta to-yellow-400 brutal-border flex-shrink-0">
              <img src="${post.userAvatar || AppState.currentAccount?.avatar}" alt="Avatar" class="w-full h-full object-cover rounded-full" loading="lazy" decoding="async" onerror="this.src='photos/account_ziezie/avatar.jpg'">
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 leading-none">
                <span class="font-display font-extrabold text-[11px] sm:text-xs md:text-sm text-neutral-900 truncate">${post.username}</span>
                <i data-lucide="badge-check" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-magenta fill-white flex-shrink-0"></i>
                ${post.category ? `<span class="bg-magenta-100 text-magenta px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-black uppercase brutal-border truncate hidden xl:inline">${post.category}</span>` : ''}
              </div>
              <div class="flex items-center gap-1 text-[9px] sm:text-[11px] text-neutral-600 mt-0.5 sm:mt-1 font-semibold truncate">
                <i data-lucide="clock" class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-magenta flex-shrink-0"></i>
                <span class="truncate">${post.updatedAt}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1 flex-shrink-0">
            <button onclick="downloadSinglePost('${post.id}')" class="p-1 sm:p-1.5 hover:bg-magenta-100 rounded-lg brutal-border text-neutral-800 transition-colors cursor-pointer" title="${t('downloadTitle')}">
              <i data-lucide="download" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
            </button>
            <button onclick="sharePost('${post.id}')" class="hidden sm:inline-flex p-1 sm:p-1.5 hover:bg-neutral-100 rounded-lg brutal-border text-neutral-800 transition-colors cursor-pointer" title="${t('navShare')}">
              <i data-lucide="share-2" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-magenta"></i>
            </button>
          </div>
        </div>

        <!-- Carousel Media (Lazy loads slides > 1 on demand for 60fps smooth scrolling!) -->
        <div id="carousel-wrapper-${post.id}" class="relative w-full aspect-[4/5] sm:aspect-square bg-neutral-900 overflow-hidden select-none cursor-pointer" ondblclick="triggerDoubleTapLike('${post.id}', event)">
          <div id="track-${post.id}" class="carousel-track w-full h-full" style="transform: translateX(-${currentIndex * 100}%);">
            ${photos.map((imgSrc, imgIdx) => {
              const shouldLoadNow = imgIdx === currentIndex;
              return `
              <div class="w-full h-full flex-shrink-0 relative overflow-hidden bg-neutral-900 flex items-center justify-center" onclick="openLightbox('${post.id}', ${imgIdx})">
                <img id="slide-img-${post.id}-${imgIdx}" src="${shouldLoadNow ? imgSrc : TRANSPARENT_PIXEL}" data-src="${imgSrc}" data-loaded="${shouldLoadNow ? '1' : '0'}" alt="Photopack Image ${imgIdx + 1}" class="w-full h-full object-cover pointer-events-none" loading="lazy" decoding="async" onerror="this.src='photos/account_ziezie/avatar.jpg'">
              </div>
            `;
            }).join('')}
          </div>

          <div id="heart-burst-${post.id}" class="absolute inset-0 flex items-center justify-center pointer-events-none z-30 opacity-0 scale-0">
            <i data-lucide="heart" class="w-16 h-16 sm:w-20 sm:h-20 text-white fill-magenta drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"></i>
          </div>

          ${counterBadgeHtml}
          ${arrowButtonsHtml}
          ${dotsHtml}

          ${!hasMultiplePhotos ? `
            <div class="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 bg-white/95 text-neutral-900 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full brutal-border text-[8px] sm:text-[9px] font-black shadow-brutal-sm flex items-center gap-1">
              <i data-lucide="image" class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-magenta"></i>
              <span>${t('singleShotBadge')}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Post Body (Compact & Clean on Mobile 2-Column) -->
      <div class="p-2 sm:p-3.5 flex-1 flex flex-col justify-between space-y-1.5 sm:space-y-2.5">
        <div class="space-y-1.5 sm:space-y-2">
          <!-- Action Buttons -->
          <div class="flex items-center justify-between gap-1">
            <div class="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-wrap">
              <button id="like-btn-${post.id}" onclick="toggleLike('${post.id}')" class="brutal-btn py-1 px-1.5 sm:p-1.5 sm:px-2.5 rounded-lg sm:rounded-xl brutal-border ${post.isLiked ? 'bg-magenta text-white' : 'bg-white hover:bg-neutral-50 text-neutral-900'} shadow-brutal-sm flex items-center gap-1 font-bold text-[10px] sm:text-xs cursor-pointer">
                <i data-lucide="heart" class="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 ${post.isLiked ? 'fill-white text-white' : 'text-magenta'}"></i>
                <span id="like-count-${post.id}">${post.likes || 0}</span>
              </button>
              <button onclick="openCommentToast('${post.id}')" class="brutal-btn py-1 px-1.5 sm:p-1.5 sm:px-2.5 rounded-lg sm:rounded-xl brutal-border bg-white hover:bg-neutral-50 text-neutral-900 shadow-brutal-sm flex items-center gap-1 font-bold text-[10px] sm:text-xs cursor-pointer" title="Komentar Rednote">
                <i data-lucide="message-circle" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-700 flex-shrink-0"></i>
                <span>${post.commentsCount || 0}</span>
              </button>
              ${post.collectedCount ? `
              <span class="py-1 px-1.5 sm:p-1.5 sm:px-2 rounded-lg sm:rounded-xl brutal-border bg-amber-50 text-neutral-900 shadow-brutal-sm hidden sm:flex items-center gap-1 font-bold text-[10px] sm:text-xs" title="Jumlah Disimpan / Favorit di Rednote">
                <i data-lucide="star" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-400"></i>
                <span>${post.collectedCount}</span>
              </span>
              ` : ''}
            </div>
            <button id="bookmark-btn-${post.id}" onclick="toggleBookmark('${post.id}')" class="brutal-btn py-1 px-1.5 sm:p-1.5 sm:px-2 rounded-lg sm:rounded-xl brutal-border ${post.isBookmarked ? 'bg-brutal-yellow text-neutral-900' : 'bg-white hover:bg-neutral-50 text-neutral-900'} shadow-brutal-sm cursor-pointer flex-shrink-0" title="Simpan">
              <i data-lucide="bookmark" class="w-3 h-3 sm:w-3.5 sm:h-3.5 ${post.isBookmarked ? 'fill-neutral-900' : 'text-neutral-700'}"></i>
            </button>
          </div>

          <!-- Caption -->
          <div class="text-[10px] sm:text-xs text-neutral-800 leading-snug line-clamp-2 sm:line-clamp-3 hover:line-clamp-none transition-all cursor-pointer break-words" title="Klik untuk baca selengkapnya">
            <span class="font-display font-extrabold text-neutral-900 mr-1">${post.username}</span>
            <span>${post.caption}</span>
          </div>

          ${post.tags && post.tags.length > 0 ? `
            <div class="hidden sm:flex items-center gap-1 flex-wrap pt-0.5">
              ${post.tags.slice(0, 3).map(t => `<span class="text-magenta font-bold text-[10px] sm:text-[11px] hover:underline cursor-pointer">${t.replace(/\[话题\]#/g, '')}</span>`).join(' ')}
            </div>
          ` : ''}
        </div>

        <!-- Footer Meta (Date & Photos count / Download All Trigger) -->
        <div class="pt-1.5 sm:pt-2 text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between border-t border-neutral-100 mt-auto gap-1">
          <span class="truncate">${post.updatedExact || post.updatedAt}</span>
          ${photos.length > 1 ? `
            <button onclick="downloadAllPostPhotos('${post.id}')" class="text-magenta hover:bg-magenta hover:text-white px-1.5 py-0.5 rounded-md transition-colors font-black flex-shrink-0 flex items-center gap-1 cursor-pointer" title="Klik untuk unduh semua ${photos.length} slide sekaligus!">
              <i data-lucide="folder-down" class="w-2.5 h-2.5 sm:w-3 sm:h-3"></i>
              <span>${photos.length} ${t('cardPhotosCount')}</span>
            </button>
          ` : `
            <span class="text-magenta font-black flex-shrink-0">${photos.length} ${t('cardPhotosCount')}</span>
          `}
        </div>
      </div>
    </article>
  `;
}

function ensureSlideImageLoaded(postId, idx) {
  const img = document.getElementById(`slide-img-${postId}-${idx}`);
  if (img && img.dataset.loaded !== '1' && img.dataset.src) {
    img.src = img.dataset.src;
    img.dataset.loaded = '1';
  }
}

// Carousel Navigation
function navigateCarousel(postId, direction, e) {
  if (e) e.stopPropagation();
  const post = AppState.posts.find(p => p.id === postId);
  if (!post || !post.photos || post.photos.length <= 1) return;

  const total = post.photos.length;
  let curr = AppState.carouselStates[postId] || 0;
  let next = curr + direction;

  if (next < 0) next = 0;
  if (next >= total) next = total - 1;

  AppState.carouselStates[postId] = next;
  updateCarouselDOM(postId, next, total);
}

function updateCarouselDOM(postId, index, total) {
  ensureSlideImageLoaded(postId, index);
  if (index + 1 < total) ensureSlideImageLoaded(postId, index + 1);
  if (index - 1 >= 0) ensureSlideImageLoaded(postId, index - 1);

  const track = document.getElementById(`track-${postId}`);
  if (track) track.style.transform = `translateX(-${index * 100}%)`;

  const counter = document.getElementById(`counter-${postId}`);
  if (counter) counter.textContent = `${index + 1}/${total}`;

  for (let i = 0; i < total; i++) {
    const dot = document.getElementById(`dot-${postId}-${i}`);
    if (dot) {
      dot.className = i === index 
        ? 'transition-all duration-200 rounded-full flex-shrink-0 w-3.5 h-1.5 sm:w-4 sm:h-2 bg-magenta' 
        : 'transition-all duration-200 rounded-full flex-shrink-0 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/75';
    }
  }

  const prevBtn = document.getElementById(`prev-btn-${postId}`);
  const nextBtn = document.getElementById(`next-btn-${postId}`);
  if (prevBtn) {
    prevBtn.className = `carousel-nav-btn absolute left-1 sm:left-2.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/95 hover:bg-magenta hover:text-white brutal-border shadow-brutal-sm flex items-center justify-center transition-colors ${index === 0 ? 'opacity-35 cursor-not-allowed' : 'opacity-90 hover:opacity-100'}`;
  }
  if (nextBtn) {
    nextBtn.className = `carousel-nav-btn absolute right-1 sm:right-2.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/95 hover:bg-magenta hover:text-white brutal-border shadow-brutal-sm flex items-center justify-center transition-colors ${index === total - 1 ? 'opacity-35 cursor-not-allowed' : 'opacity-90 hover:opacity-100'}`;
  }
}

function attachSwipeGesture(postId, totalPhotos) {
  const wrapper = document.getElementById(`carousel-wrapper-${postId}`);
  if (!wrapper || totalPhotos <= 1) return;
  if (wrapper._swipeAttached) return;
  wrapper._swipeAttached = true;

  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let lastTapTime = 0;
  const minSwipeDistance = 35;

  wrapper.addEventListener('mouseenter', () => {
    const curr = AppState.carouselStates[postId] || 0;
    if (curr + 1 < totalPhotos) ensureSlideImageLoaded(postId, curr + 1);
  }, { passive: true, once: true });

  wrapper.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const curr = AppState.carouselStates[postId] || 0;
    if (curr + 1 < totalPhotos) ensureSlideImageLoaded(postId, curr + 1);
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  wrapper.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const diffX = Math.abs(e.touches[0].clientX - startX);
    const diffY = Math.abs(e.touches[0].clientY - startY);
    if (diffX > 8 || diffY > 8) {
      wrapper.dataset.justSwiped = 'true';
    }
  }, { passive: true });

  wrapper.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = startX - endX;
    const diffY = Math.abs(startY - endY);

    if (Math.abs(diffX) > minSwipeDistance && diffY < 60) {
      navigateCarousel(postId, diffX > 0 ? 1 : -1);
      wrapper.dataset.justSwiped = 'true';
      clearTimeout(wrapper._swipeTimer);
      wrapper._swipeTimer = setTimeout(() => {
        wrapper.dataset.justSwiped = 'false';
      }, 500);
    } else {
      // Check for double tap on touch screens
      if (Math.abs(diffX) < 15 && diffY < 15) {
        const now = Date.now();
        if (now - lastTapTime < 320) {
          triggerDoubleTapLike(postId, e);
          lastTapTime = 0;
        } else {
          lastTapTime = now;
        }
      }
      setTimeout(() => {
        wrapper.dataset.justSwiped = 'false';
      }, 300);
    }
  }, { passive: true });

  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.closest('.carousel-nav-btn')) return;
    startX = e.clientX;
    startY = e.clientY;
    isDragging = true;
  });

  wrapper.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    if (Math.abs(e.clientX - startX) > 8) {
      wrapper.dataset.justSwiped = 'true';
    }
  });

  const finishMouseDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diffX = startX - e.clientX;
    if (Math.abs(diffX) > minSwipeDistance) {
      navigateCarousel(postId, diffX > 0 ? 1 : -1);
      wrapper.dataset.justSwiped = 'true';
      clearTimeout(wrapper._swipeTimer);
      wrapper._swipeTimer = setTimeout(() => {
        wrapper.dataset.justSwiped = 'false';
      }, 500);
    } else {
      setTimeout(() => {
        wrapper.dataset.justSwiped = 'false';
      }, 300);
    }
  };

  wrapper.addEventListener('mouseup', finishMouseDrag);
  wrapper.addEventListener('mouseleave', () => { isDragging = false; });
}

// ========================================================
// SORT ORDER, COLUMN SWITCHER & FILTERS
// ========================================================
function setSortOrder(order) {
  AppState.currentSortOrder = order;
  const btnNewest = document.getElementById('btn-sort-newest');
  const btnOldest = document.getElementById('btn-sort-oldest');

  if (order === 'newest') {
    if (btnNewest) btnNewest.className = 'px-2.5 py-1 rounded-lg font-black text-xs transition-all bg-magenta text-white brutal-border shadow-brutal-sm cursor-pointer';
    if (btnOldest) btnOldest.className = 'px-2.5 py-1 rounded-lg font-bold text-xs transition-all text-neutral-700 hover:text-black cursor-pointer';
    showToast(t('orderNewestToast'));
  } else {
    if (btnOldest) btnOldest.className = 'px-2.5 py-1 rounded-lg font-black text-xs transition-all bg-magenta text-white brutal-border shadow-brutal-sm cursor-pointer';
    if (btnNewest) btnNewest.className = 'px-2.5 py-1 rounded-lg font-bold text-xs transition-all text-neutral-700 hover:text-black cursor-pointer';
    showToast(t('orderOldestToast'));
  }
  renderPosts();
}

function setGridColumns(cols) {
  AppState.currentGridCols = cols;
  try { localStorage.setItem('wifey_cols', cols); } catch (e) {}

  const container = document.getElementById('posts-container');
  const btn1 = document.getElementById('btn-col-1');
  const btn2 = document.getElementById('btn-col-2');
  const btn3 = document.getElementById('btn-col-3');
  if (!container) return;

  const activeBtnClass = 'px-2 sm:px-2.5 py-1 rounded-lg font-black text-xs transition-all bg-magenta text-white brutal-border shadow-brutal-sm cursor-pointer';
  const inactiveBtnClass = 'px-2 sm:px-2.5 py-1 rounded-lg font-bold text-xs transition-all text-neutral-700 hover:text-black cursor-pointer';

  if (btn1) btn1.className = cols === 1 ? activeBtnClass : inactiveBtnClass;
  if (btn2) btn2.className = cols === 2 ? activeBtnClass : inactiveBtnClass;
  if (btn3) btn3.className = cols === 3 ? (activeBtnClass + ' hidden md:inline-block') : (inactiveBtnClass + ' hidden md:inline-block');

  if (cols === 1) {
    container.className = 'grid grid-cols-1 max-w-xl mx-auto gap-4 sm:gap-6';
  } else if (cols === 2) {
    container.className = 'grid grid-cols-2 md:grid-cols-2 gap-2.5 sm:gap-6';
  } else {
    container.className = 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6';
  }
}

function updateNavActiveState(activeTab) {
  const btnHome = document.getElementById('nav-btn-home');
  const btnGal = document.getElementById('nav-btn-gallery');
  const btnFav = document.getElementById('nav-btn-favorites');
  const mHome = document.getElementById('mobile-nav-home');
  const mGal = document.getElementById('mobile-nav-gallery');
  const mFav = document.getElementById('mobile-nav-favorites');

  const deskActive = 'px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm bg-magenta text-white brutal-border shadow-brutal-sm transition-all flex items-center gap-1.5 cursor-pointer';
  const deskInactive = 'px-3.5 py-1.5 rounded-full font-bold text-xs sm:text-sm text-neutral-700 hover:text-magenta transition-colors flex items-center gap-1.5 cursor-pointer';

  const mobActive = 'flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors font-black text-[10px] bg-magenta text-white shadow-brutal-sm brutal-border cursor-pointer truncate';
  const mobInactive = 'flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors font-bold text-[10px] text-neutral-700 hover:text-magenta cursor-pointer truncate';

  if (activeTab === 'home') {
    if (btnHome) btnHome.className = deskActive;
    if (btnGal) btnGal.className = deskInactive;
    if (btnFav) btnFav.className = deskInactive;
    if (mHome) mHome.className = mobActive;
    if (mGal) mGal.className = mobInactive;
    if (mFav) mFav.className = mobInactive;
  } else if (activeTab === 'gallery') {
    if (btnHome) btnHome.className = deskInactive;
    if (btnGal) btnGal.className = deskActive;
    if (btnFav) btnFav.className = deskInactive;
    if (mHome) mHome.className = mobInactive;
    if (mGal) mGal.className = mobActive;
    if (mFav) mFav.className = mobInactive;
  } else if (activeTab === 'favorites') {
    if (btnHome) btnHome.className = deskInactive;
    if (btnGal) btnGal.className = deskInactive;
    if (btnFav) btnFav.className = deskActive;
    if (mHome) mHome.className = mobInactive;
    if (mGal) mGal.className = mobInactive;
    if (mFav) mFav.className = mobActive;
  }
}

function updateFilterBadgesUI(type) {
  ['all', 'multi', 'single', 'favorites'].forEach(key => {
    const el = document.getElementById(`filter-btn-${key}`);
    if (!el) return;
    if (key === type) {
      el.className = 'filter-badge px-3.5 py-1.5 rounded-xl brutal-border text-xs font-black bg-magenta text-white shadow-brutal-sm transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer flex-shrink-0';
    } else {
      el.className = 'filter-badge px-3.5 py-1.5 rounded-xl brutal-border text-xs font-bold bg-white text-neutral-800 hover:bg-magenta-50 shadow-brutal-sm transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer flex-shrink-0';
    }
  });
}

function setFilter(type) {
  AppState.currentFilter = type;
  updateFilterBadgesUI(type);
  updateNavActiveState(type === 'favorites' ? 'favorites' : 'gallery');
  renderPosts();
}

async function filterByFavorites() {
  AppState.currentFilter = 'favorites';
  updateFilterBadgesUI('favorites');
  if (!AppState.currentAccountId) {
    const firstId = AppState.accounts[0]?.id;
    if (firstId) {
      await openAccountGallery(firstId, true, true);
    }
  } else {
    document.getElementById('view-home-directory').classList.add('hidden');
    document.getElementById('view-account-gallery').classList.remove('hidden');
    renderPosts();
  }
  updateNavActiveState('favorites');
}

function handleSearch(query) {
  AppState.searchQuery = query;
  renderPosts();
}

// ========================================================
// INTERACTIONS (LIKE, DOUBLE-TAP, BOOKMARK, LIGHTBOX)
// ========================================================
function triggerHeartBurstAnimation(postId) {
  const heartContainer = document.getElementById(`heart-burst-${postId}`);
  if (heartContainer) {
    heartContainer.classList.remove('opacity-0', 'scale-0', 'heart-burst');
    // Force reflow agar animasi bisa berulang jika di-klik berkali-kali
    void heartContainer.offsetWidth;
    heartContainer.classList.add('heart-burst');
    setTimeout(() => {
      heartContainer.classList.remove('heart-burst');
      heartContainer.classList.add('opacity-0', 'scale-0');
    }, 850);
  }

  try {
    if (window.confetti) {
      confetti({
        particleCount: 22,
        spread: 55,
        origin: { y: 0.65 },
        colors: ['#e6007e', '#ff007f', '#ffffff']
      });
    }
  } catch (err) {}
}

function updatePostLikeDOM(postId) {
  const post = AppState.posts.find(p => p.id === postId);
  if (!post) return;

  const btn = document.getElementById(`like-btn-${postId}`);
  const countEl = document.getElementById(`like-count-${postId}`);
  if (countEl) countEl.textContent = post.likes || 0;

  if (btn) {
    if (post.isLiked) {
      btn.className = 'brutal-btn p-1 sm:p-1.5 px-1.5 sm:px-2.5 rounded-xl brutal-border bg-magenta text-white shadow-brutal-sm flex items-center gap-1 font-bold text-[10px] sm:text-xs cursor-pointer';
      btn.innerHTML = `<i data-lucide="heart" class="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white text-white"></i><span id="like-count-${postId}">${post.likes || 0}</span>`;
    } else {
      btn.className = 'brutal-btn p-1 sm:p-1.5 px-1.5 sm:px-2.5 rounded-xl brutal-border bg-white hover:bg-neutral-50 text-neutral-900 shadow-brutal-sm flex items-center gap-1 font-bold text-[10px] sm:text-xs cursor-pointer';
      btn.innerHTML = `<i data-lucide="heart" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-magenta"></i><span id="like-count-${postId}">${post.likes || 0}</span>`;
    }
    if (window.lucide) lucide.createIcons({ root: btn });
  }

  updateStats();
}

function toggleLike(postId) {
  const post = AppState.posts.find(p => p.id === postId);
  if (!post) return;
  post.isLiked = !post.isLiked;
  post.likes = post.isLiked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 1) - 1);

  if (!AppState.likedPosts) AppState.likedPosts = {};
  AppState.likedPosts[postId] = post.isLiked;
  try { localStorage.setItem('wifey_likes', JSON.stringify(AppState.likedPosts)); } catch (e) {}

  if (AppState.currentFilter === 'favorites') {
    renderPosts(false);
  } else {
    updatePostLikeDOM(postId);
  }

  if (post.isLiked) {
    triggerHeartBurstAnimation(postId);
    showToast(t('toastLiked'));
  }
}

function triggerDoubleTapLike(postId, e) {
  const wrapper = document.getElementById(`carousel-wrapper-${postId}`);
  // Jika baru saja terjadi gesture swipe/drag, batalkan double tap like
  if (wrapper && wrapper.dataset.justSwiped === 'true') {
    return;
  }

  const post = AppState.posts.find(p => p.id === postId);
  if (!post) return;

  if (!post.isLiked) {
    post.isLiked = true;
    post.likes = (post.likes || 0) + 1;
    if (!AppState.likedPosts) AppState.likedPosts = {};
    AppState.likedPosts[postId] = true;
    try { localStorage.setItem('wifey_likes', JSON.stringify(AppState.likedPosts)); } catch (e) {}

    if (AppState.currentFilter === 'favorites') {
      renderPosts(false);
    } else {
      updatePostLikeDOM(postId);
    }
    showToast(t('toastLiked'));
  }

  triggerHeartBurstAnimation(postId);
}

function toggleBookmark(postId) {
  const post = AppState.posts.find(p => p.id === postId);
  if (!post) return;
  post.isBookmarked = !post.isBookmarked;

  if (!AppState.bookmarkedPosts) AppState.bookmarkedPosts = {};
  AppState.bookmarkedPosts[postId] = post.isBookmarked;
  try { localStorage.setItem('wifey_bookmarks', JSON.stringify(AppState.bookmarkedPosts)); } catch (e) {}

  if (AppState.currentFilter === 'favorites') {
    renderPosts(false);
  } else {
    const btn = document.getElementById(`bookmark-btn-${postId}`);
    if (btn) {
      if (post.isBookmarked) {
        btn.className = 'brutal-btn p-1 sm:p-1.5 px-1.5 sm:px-2 rounded-xl brutal-border bg-brutal-yellow text-neutral-900 shadow-brutal-sm cursor-pointer';
        btn.innerHTML = `<i data-lucide="bookmark" class="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-neutral-900"></i>`;
      } else {
        btn.className = 'brutal-btn p-1 sm:p-1.5 px-1.5 sm:px-2 rounded-xl brutal-border bg-white hover:bg-neutral-50 text-neutral-900 shadow-brutal-sm cursor-pointer';
        btn.innerHTML = `<i data-lucide="bookmark" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-700"></i>`;
      }
      if (window.lucide) lucide.createIcons({ root: btn });
    }
  }

  showToast(post.isBookmarked ? t('toastBookmarked') : t('toastUnbookmarked'));
}

function openCommentToast() {
  showToast(t('commentPrompt'));
}

function downloadSinglePost(postId) {
  const post = AppState.posts.find(p => p.id === postId);
  if (!post || !post.photos || post.photos.length === 0) return;
  const curr = AppState.carouselStates[postId] || 0;
  const photoUrl = post.photos[curr];

  const a = document.createElement('a');
  a.href = photoUrl;
  a.download = `photopack-${postId}-${curr + 1}.jpg`;
  a.click();
  showToast(t('downloadingToast'));
}

async function downloadAllPostPhotos(postId) {
  const post = AppState.posts.find(p => p.id === postId) || AppState.allPosts.find(p => p.id === postId);
  if (!post || !post.photos || post.photos.length === 0) return;

  const total = post.photos.length;
  showToast(`📦 Mengunduh seluruh ${total} foto HD dari postingan ini...`);

  const allBtnText = document.getElementById('lightbox-download-all-text');
  const origBtnLabel = allBtnText ? allBtnText.textContent : '';

  for (let i = 0; i < total; i++) {
    const photoUrl = post.photos[i];
    if (allBtnText && AppState.activeLightboxPostId === postId) {
      allBtnText.textContent = `Mengunduh (${i + 1}/${total})...`;
    }
    const a = document.createElement('a');
    a.href = photoUrl;
    a.download = `wifey-photopack-${post.username.replace('@', '')}-${postId}-slide-${i + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (i < total - 1) {
      await new Promise(r => setTimeout(r, 280));
    }
  }

  if (allBtnText && AppState.activeLightboxPostId === postId) {
    allBtnText.textContent = `✅ Terunduh (${total} Foto)!`;
    setTimeout(() => {
      if (allBtnText) allBtnText.textContent = origBtnLabel || `Unduh Semua (${total} Foto)`;
    }, 2200);
  }
  showToast(`🎉 Berhasil mengunduh seluruh ${total} foto HD!`);
}

function downloadAllSlidesFromLightbox() {
  if (!AppState.activeLightboxPostId) return;
  downloadAllPostPhotos(AppState.activeLightboxPostId);
}

// Studio Lightbox Modal
let lightboxTouchStartX = 0;
let lightboxTouchStartY = 0;

function setupLightboxTouch() {
  const modal = document.getElementById('modal-lightbox');
  if (!modal || modal._touchAttached) return;
  modal._touchAttached = true;

  modal.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      lightboxTouchStartX = e.touches[0].clientX;
      lightboxTouchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  modal.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = lightboxTouchStartX - endX;
      const diffY = Math.abs(lightboxTouchStartY - endY);
      if (Math.abs(diffX) > 40 && diffY < 75) {
        navigateLightbox(diffX > 0 ? 1 : -1);
      }
    }
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('modal-lightbox');
    if (!lb || lb.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') navigateLightbox(1);
    else if (e.key === 'ArrowLeft') navigateLightbox(-1);
    else if (e.key === 'Escape') closeLightbox();
  });
}

function openLightbox(postId, photoIndex) {
  const wrapper = document.getElementById(`carousel-wrapper-${postId}`);
  if (wrapper && wrapper.dataset.justSwiped === 'true') {
    return;
  }
  const post = AppState.posts.find(p => p.id === postId) || AppState.allPosts.find(p => p.id === postId);
  if (!post || !post.photos) return;
  AppState.activeLightboxPostId = postId;
  AppState.activeLightboxIndex = photoIndex;
  document.getElementById('modal-lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setupLightboxTouch();
  updateLightboxContent();
}

function selectLightboxSlide(index) {
  const post = AppState.posts.find(p => p.id === AppState.activeLightboxPostId) || AppState.allPosts.find(p => p.id === AppState.activeLightboxPostId);
  if (!post || !post.photos || index < 0 || index >= post.photos.length) return;
  AppState.activeLightboxIndex = index;
  updateLightboxContent();
}

function updateLightboxContent() {
  const post = AppState.posts.find(p => p.id === AppState.activeLightboxPostId) || AppState.allPosts.find(p => p.id === AppState.activeLightboxPostId);
  if (!post) return;

  const total = post.photos.length;
  const activeIdx = AppState.activeLightboxIndex || 0;
  const currentPhotoUrl = post.photos[activeIdx];

  const img = document.getElementById('lightbox-img');
  const ambientBg = document.getElementById('lightbox-ambient-bg');
  const counter = document.getElementById('lightbox-counter');
  const downloadLink = document.getElementById('lightbox-download-link');
  const downloadAllBtn = document.getElementById('lightbox-download-all-btn');
  const downloadAllText = document.getElementById('lightbox-download-all-text');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  const authorAvatar = document.getElementById('lightbox-author-avatar');
  const authorName = document.getElementById('lightbox-author-name');
  const postDate = document.getElementById('lightbox-post-date');
  const captionText = document.getElementById('lightbox-caption-text');
  const thumbsStrip = document.getElementById('lightbox-thumbs');

  if (img) img.src = currentPhotoUrl;
  if (ambientBg) ambientBg.src = currentPhotoUrl;
  if (counter) counter.textContent = `${activeIdx + 1} / ${total}`;
  if (downloadLink) {
    downloadLink.href = currentPhotoUrl;
    downloadLink.download = `wifey-photopack-${post.username.replace('@', '')}-${post.id}-slide-${activeIdx + 1}.jpg`;
  }

  if (authorAvatar) authorAvatar.src = post.userAvatar || AppState.currentAccount?.avatar || 'photos/account_ziezie/avatar.jpg';
  if (authorName) authorName.textContent = post.username || '@ziezie';
  if (postDate) postDate.textContent = `${post.updatedExact || post.updatedAt || ''} • ❤️ ${post.likes || 0}`;
  if (captionText) captionText.textContent = post.caption || '';

  if (downloadAllBtn && downloadAllText) {
    if (total > 1) {
      downloadAllBtn.classList.remove('hidden');
      downloadAllText.textContent = `Unduh Semua (${total} Foto)`;
    } else {
      downloadAllBtn.classList.add('hidden');
    }
  }

  if (thumbsStrip) {
    if (total > 1) {
      thumbsStrip.classList.remove('hidden');
      thumbsStrip.innerHTML = post.photos.map((src, idx) => `
        <button onclick="selectLightboxSlide(${idx})" class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden flex-shrink-0 transition-all cursor-pointer ${idx === activeIdx ? 'ring-2 ring-brutal-yellow scale-105 opacity-100 brutal-border' : 'opacity-50 hover:opacity-90 border border-white/30'}">
          <img src="${src}" class="w-full h-full object-cover" loading="lazy" decoding="async">
        </button>
      `).join('');
    } else {
      thumbsStrip.classList.add('hidden');
      thumbsStrip.innerHTML = '';
    }
  }

  if (total <= 1) {
    if (prevBtn) prevBtn.classList.add('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');
  } else {
    if (prevBtn) prevBtn.classList.remove('hidden');
    if (nextBtn) nextBtn.classList.remove('hidden');
  }

  if (window.lucide) {
    const lb = document.getElementById('modal-lightbox');
    if (lb) lucide.createIcons({ root: lb });
  }
}

function navigateLightbox(dir) {
  const post = AppState.posts.find(p => p.id === AppState.activeLightboxPostId) || AppState.allPosts.find(p => p.id === AppState.activeLightboxPostId);
  if (!post || post.photos.length <= 1) return;

  let next = AppState.activeLightboxIndex + dir;
  if (next < 0) next = post.photos.length - 1;
  if (next >= post.photos.length) next = 0;

  AppState.activeLightboxIndex = next;
  updateLightboxContent();
}

function closeLightbox() {
  document.getElementById('modal-lightbox').classList.add('hidden');
  document.body.style.overflow = '';
}

function handleLightboxBackdropClick(e) {
  if (e.target.id === 'modal-lightbox') closeLightbox();
}
