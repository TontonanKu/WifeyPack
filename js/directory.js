// ========================================================
// DIRECTORY MODULE (js/directory.js)
// Home Accounts Directory, Country Filters & Search
// ========================================================

function setCountryFilter(countryCode) {
  AppState.currentCountryFilter = countryCode;
  
  // Update button active styling
  ['all', 'CN', 'KR'].forEach(code => {
    const btn = document.getElementById(`country-filter-${code}`);
    if (btn) {
      if (code === countryCode) {
        btn.className = 'px-3.5 py-1.5 rounded-full text-xs font-black bg-magenta text-white brutal-border shadow-brutal-sm transition-all flex items-center gap-1.5 cursor-pointer';
      } else {
        btn.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-neutral-700 hover:text-magenta brutal-border transition-all flex items-center gap-1.5 cursor-pointer';
      }
    }
  });

  renderAccountsDirectory();
}

function handleAccountSearch(query) {
  AppState.accountSearchQuery = query;
  renderAccountsDirectory();
}

function renderAccountsDirectory() {
  const grid = document.getElementById('accounts-cards-grid');
  if (!grid) return;

  const totalPhotosCount = AppState.allPosts.reduce((sum, p) => sum + (p.photos ? p.photos.length : 1), 0);
  const totalAccountsEl = document.getElementById('home-total-accounts-count');
  if (totalAccountsEl) totalAccountsEl.textContent = AppState.accounts.length;
  const totalPostsEl = document.getElementById('home-total-posts-count');
  if (totalPostsEl) totalPostsEl.textContent = AppState.allPosts.length;
  const totalPhotosEl = document.getElementById('home-total-photos-count');
  if (totalPhotosEl) totalPhotosEl.textContent = totalPhotosCount;

  // Filter accounts by Country first
  let filteredAccounts = AppState.accounts;
  if (AppState.currentCountryFilter && AppState.currentCountryFilter !== 'all') {
    filteredAccounts = filteredAccounts.filter(acc => acc.country === AppState.currentCountryFilter);
  }

  // Filter accounts by Search Query (name, username, id, bio, or country name)
  if (AppState.accountSearchQuery && AppState.accountSearchQuery.trim() !== '') {
    const q = AppState.accountSearchQuery.toLowerCase().trim();
    filteredAccounts = filteredAccounts.filter(acc =>
      (acc.displayName && acc.displayName.toLowerCase().includes(q)) ||
      (acc.username && acc.username.toLowerCase().includes(q)) ||
      (acc.id && acc.id.toLowerCase().includes(q)) ||
      (acc.bio && acc.bio.toLowerCase().includes(q)) ||
      (acc.countryName && acc.countryName.toLowerCase().includes(q))
    );
  }

  // Toggle Empty Search State
  const emptySearchEl = document.getElementById('account-search-empty');
  if (emptySearchEl) {
    if (filteredAccounts.length === 0) {
      emptySearchEl.classList.remove('hidden');
    } else {
      emptySearchEl.classList.add('hidden');
    }
  }

  // Render Account Card for each verified account
  const cardsHtml = filteredAccounts.map(acc => {
    // Sort posts descending by timestamp so latest photos are picked first!
    const accPosts = AppState.allPosts
      .filter(p => p.accountId === acc.id)
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    const postCount = accPosts.length;
    const photoCount = accPosts.reduce((sum, p) => sum + (p.photos ? p.photos.length : 1), 0);

    // Get up to 4 preview photos from the newest posts
    const previewPhotos = [];
    for (const p of accPosts) {
      if (p.photos && Array.isArray(p.photos)) {
        for (const img of p.photos) {
          if (previewPhotos.length < 4) {
            previewPhotos.push(img);
          } else {
            break;
          }
        }
      }
      if (previewPhotos.length >= 4) break;
    }

    // Collect top 3 tags for aesthetic pills
    const tagFreq = {};
    for (const p of accPosts.slice(0, 40)) {
      for (const tg of (p.tags || [])) {
        const cleanTag = String(tg).replace(/\[话题\]#/g, '').trim();
        if (cleanTag && cleanTag !== '#Rednote' && cleanTag !== '#NoWatermark' && cleanTag.length <= 16) {
          tagFreq[cleanTag] = (tagFreq[cleanTag] || 0) + 1;
        }
      }
    }
    const popularTags = Object.keys(tagFreq).sort((a, b) => tagFreq[b] - tagFreq[a]).slice(0, 3);

    const countryName = acc.country === 'KR' ? 'KOREA' : 'CHINA';
    const flagSvg = typeof getCountryFlagSVG === 'function' ? getCountryFlagSVG(acc.country) : '';
    const countryPillClass = acc.country === 'KR' ? 'bg-sky-100 text-sky-900' : 'bg-rose-100 text-rose-900';
    const redIdText = acc.redId || acc.id;
    const ipLocationText = acc.ipLocation || 'China';
    const realFollowers = acc.followers || '70.1K';
    const realLikesSaves = acc.likesAndSaves || '916.3K';

    return `
      <div class="bg-white brutal-border-3 rounded-2xl shadow-brutal-lg overflow-hidden flex flex-col justify-between hover:shadow-brutal-xl hover:-translate-y-0.5 transition-all group">
        <div>
          <!-- Banner Header of Card with Country Flag, IP Location & Official Badge -->
          <div class="h-20 sm:h-24 bg-gradient-to-r from-magenta via-[#ff2a85] to-magenta-dark p-3 sm:p-3.5 flex items-start justify-between relative overflow-hidden brutal-border border-x-0 border-t-0">
            <div class="absolute inset-0 opacity-15" style="background-image: radial-gradient(#fff 1.5px, transparent 1.5px); background-size: 10px 10px;"></div>
            
            <div class="flex items-center gap-1.5 z-10 flex-wrap">
              <span class="${countryPillClass} brutal-border px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase shadow-brutal-sm flex items-center gap-1">
                ${flagSvg}
                <span>${countryName}</span>
              </span>
              <span class="bg-white text-neutral-900 brutal-border px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shadow-brutal-sm flex items-center gap-1">
                <span>📍 ${ipLocationText}</span>
              </span>
            </div>

            <span class="bg-brutal-yellow brutal-border px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shadow-brutal-sm z-10 flex-shrink-0">
              ${t('cardOfficial')}
            </span>
          </div>

          <!-- Avatar & Account Info -->
          <div class="px-4 sm:px-5 pt-0 pb-3 relative">
            <div class="flex items-end justify-between -mt-10 sm:-mt-11 mb-3 gap-2">
              <div class="relative flex-shrink-0">
                <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 brutal-border-3 shadow-brutal overflow-hidden group-hover:rotate-2 transition-transform">
                  <img src="${acc.avatar}" alt="${acc.displayName}" class="w-full h-full object-cover rounded-xl" decoding="async" onerror="this.src='photos/account_ziezie/avatar.jpg'">
                </div>
                <span class="absolute -bottom-1.5 -right-1.5 bg-magenta text-white p-1 rounded-lg brutal-border shadow-brutal-sm">
                  <i data-lucide="heart" class="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white"></i>
                </span>
              </div>

              <div class="text-right flex flex-col items-end gap-1 min-w-0">
                <span class="bg-neutral-900 text-white brutal-border px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black shadow-brutal-sm inline-flex items-center gap-1 truncate max-w-full">
                  <span class="truncate">ID: ${redIdText}</span>
                </span>
                <span class="bg-magenta-50 text-magenta brutal-border px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-[11px] font-black shadow-brutal-sm inline-flex items-center gap-1 truncate max-w-full">
                  <i data-lucide="clock" class="w-3 h-3 flex-shrink-0"></i>
                  <span class="truncate">${acc.lastUpdate || 'Terbaru'}</span>
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
              <h3 class="font-display font-black text-lg sm:text-2xl text-neutral-900 group-hover:text-magenta transition-colors truncate">
                ${acc.displayName}
              </h3>
              <i data-lucide="badge-check" class="w-4 h-4 sm:w-5 sm:h-5 text-magenta fill-white flex-shrink-0"></i>
            </div>
            
            <p class="text-xs font-extrabold text-magenta mb-1.5">${acc.username}</p>
            <p class="text-xs font-semibold text-neutral-700 line-clamp-2 min-h-[2.25rem] leading-relaxed mb-3">
              ${acc.bio.replace(/\n+/g, ' • ')}
            </p>

            <!-- Real Rednote Stats Grid (2x2 on small mobile, 4 cols on sm+) -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-3">
              <div class="bg-magenta-50/90 p-2 rounded-xl brutal-border text-center shadow-brutal-sm">
                <span class="block font-display font-black text-xs sm:text-sm text-magenta truncate">${realFollowers}</span>
                <span class="block text-[9px] font-black text-neutral-600 uppercase tracking-tight truncate">Followers</span>
              </div>
              <div class="bg-amber-50 p-2 rounded-xl brutal-border text-center shadow-brutal-sm">
                <span class="block font-display font-black text-xs sm:text-sm text-neutral-900 truncate">${realLikesSaves}</span>
                <span class="block text-[9px] font-black text-neutral-600 uppercase tracking-tight truncate">Likes & Save</span>
              </div>
              <div class="bg-neutral-50 p-2 rounded-xl brutal-border text-center shadow-brutal-sm">
                <span class="block font-display font-black text-xs sm:text-sm text-neutral-900 truncate">${postCount}</span>
                <span class="block text-[9px] font-black text-neutral-600 uppercase tracking-tight truncate">${t('cardPosts')}</span>
              </div>
              <div class="bg-brutal-yellow/60 p-2 rounded-xl brutal-border text-center shadow-brutal-sm">
                <span class="block font-display font-black text-xs sm:text-sm text-neutral-900 truncate">${photoCount}</span>
                <span class="block text-[9px] font-black text-neutral-800 uppercase tracking-tight truncate">Foto HD</span>
              </div>
            </div>

            ${popularTags.length > 0 ? `
              <div class="flex items-center gap-1 sm:gap-1.5 flex-wrap mb-3">
                ${popularTags.map(tg => `
                  <span class="bg-neutral-100 text-neutral-700 brutal-border px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold truncate max-w-[120px]">${tg}</span>
                `).join('')}
                <span class="bg-emerald-50 text-emerald-800 brutal-border px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black">✓ HD</span>
              </div>
            ` : ''}

            <!-- 4 Photos Preview Showcase Grid -->
            <div class="bg-neutral-50 p-2 sm:p-2.5 rounded-xl brutal-border mb-1">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[9px] sm:text-[10px] font-black text-neutral-600 uppercase tracking-wider flex items-center gap-1 truncate">
                  <i data-lucide="sparkles" class="w-3 h-3 text-magenta flex-shrink-0"></i>
                  <span class="truncate">${t('previewTitle')}</span>
                </span>
                <span class="text-[9px] sm:text-[10px] font-black text-magenta bg-magenta-50 px-1.5 py-0.5 rounded-md brutal-border flex-shrink-0">Rednote</span>
              </div>
              <div class="grid grid-cols-4 gap-1.5 sm:gap-2">
                ${previewPhotos.length > 0 ? previewPhotos.map(img => `
                  <div onclick="openAccountGallery('${acc.id}')" class="aspect-[4/5] rounded-lg brutal-border overflow-hidden bg-neutral-200 cursor-pointer group/img">
                    <img src="${img}" class="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200" loading="lazy" decoding="async" onerror="this.src='photos/account_ziezie/avatar.jpg'">
                  </div>
                `).join('') : `
                  <div class="col-span-4 text-center py-4 text-xs font-bold text-neutral-400">Belum ada foto</div>
                `}
              </div>
            </div>
          </div>
        </div>

        <!-- Open Account Gallery Button -->
        <div class="p-4 pt-1 flex items-center gap-2">
          <button onclick="openAccountGallery('${acc.id}')" class="brutal-btn flex-1 bg-neutral-900 hover:bg-magenta text-white py-2.5 sm:py-3 px-3 rounded-xl brutal-border font-display font-black text-xs sm:text-sm shadow-brutal flex items-center justify-center gap-1.5 transition-colors cursor-pointer truncate">
            <span class="truncate">${t('btnOpenGallery')} (${photoCount} Foto)</span>
            <i data-lucide="arrow-right" class="w-4 h-4 flex-shrink-0"></i>
          </button>
          <a href="${acc.rednoteUrl || '#'}" target="_blank" rel="noopener noreferrer" class="brutal-btn bg-white hover:bg-brutal-yellow text-neutral-900 p-2.5 sm:p-3 rounded-xl brutal-border shadow-brutal flex items-center justify-center transition-colors flex-shrink-0" title="Buka Profil Asli di Rednote">
            <i data-lucide="external-link" class="w-4 h-4 text-magenta"></i>
          </a>
        </div>
      </div>
    `;
  }).join('');

  grid.innerHTML = cardsHtml;
  if (window.lucide) lucide.createIcons({ root: grid });
}

function backToHomeDirectory(updateHash = true) {
  AppState.currentAccountId = null;
  AppState.currentAccount = null;
  AppState.currentFilter = 'all';

  if (typeof updateFilterBadgesUI === 'function') {
    updateFilterBadgesUI('all');
  }

  document.getElementById('view-home-directory').classList.remove('hidden');
  document.getElementById('view-account-gallery').classList.add('hidden');

  // Update Navbar & Mobile Nav pill styles
  if (typeof updateNavActiveState === 'function') {
    updateNavActiveState('home');
  }

  if (updateHash) window.location.hash = '#home';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  renderAccountsDirectory();
}
