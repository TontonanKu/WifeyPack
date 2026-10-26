// ========================================================
// MODALS, DONATION INVOICES & NOTIFICATIONS MODULE (js/modals.js)
// QRIS Donation, Hall of Fame, Official Thermal Receipt & Sharing
// ========================================================

// 1. Toast Notification Helper
let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toast-message');
  if (!toast || !text) return;
  text.textContent = message;

  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
  }, 3200);
}

// 2. Donate / QRIS / Hall of Fame / Official Invoice System
let donationsCache = [];

function formatRupiah(amount) {
  const n = Number(amount) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

function getTierBadgeStyle(tier = '') {
  if (tier.includes('SULTAN')) {
    return 'bg-brutal-yellow text-neutral-900';
  }
  if (tier.includes('VIP')) {
    return 'bg-magenta text-white';
  }
  if (tier.includes('GOLD')) {
    return 'bg-amber-100 text-amber-900';
  }
  return 'bg-emerald-100 text-emerald-900';
}

async function loadDonations() {
  try {
    const res = await fetch('/api/donations');
    if (res.ok) {
      donationsCache = await res.json();
    }
  } catch (e) {
    console.error('Failed to load donations:', e);
  }
  renderDonationsWall();
  renderHomeSupportersGrid();
}

function renderDonationsWall() {
  const listEl = document.getElementById('donations-wall-list') || document.getElementById('donate-wall-list');
  const countBadge = document.getElementById('wall-count-badge');
  if (countBadge) countBadge.textContent = donationsCache.length;
  if (!listEl) return;

  if (!donationsCache || donationsCache.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-8 bg-white rounded-2xl brutal-border p-4">
        <p class="text-xs font-bold text-neutral-500">Belum ada struk penghargaan donatur. Jadilah supporter pertama!</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = donationsCache.map((d, idx) => {
    const badgeCls = getTierBadgeStyle(d.tier || '');
    return `
      <div onclick="openInvoiceReceiptModal('${d.id}')" class="bg-white hover:bg-magenta-50/40 p-3.5 rounded-2xl brutal-border shadow-brutal-sm transition-all cursor-pointer group flex flex-col justify-between gap-2 text-left">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl ${idx === 0 ? 'bg-brutal-yellow text-neutral-900' : 'bg-magenta-100 text-magenta'} brutal-border flex items-center justify-center font-display font-black text-xs flex-shrink-0 shadow-brutal-sm">
              #${idx + 1}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <h4 class="font-display font-black text-sm text-neutral-900 group-hover:text-magenta transition-colors truncate">${d.donorName}</h4>
                <span class="${badgeCls} brutal-border px-2 py-0.5 rounded-full text-[9px] font-black uppercase shadow-brutal-sm">${d.tier || '🌟 SUPPORTER'}</span>
              </div>
              <p class="text-[10px] font-mono font-bold text-neutral-500 mt-0.5">${d.id} • ${d.date}</p>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="font-display font-black text-xs sm:text-sm text-magenta block">${d.amountFormatted || formatRupiah(d.amount)}</span>
            <span class="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300 inline-block mt-0.5">LIHAT STRUK ↗</span>
          </div>
        </div>
        ${d.message ? `
          <div class="bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 italic">
            "${d.message}"
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons({ root: listEl });
}

function renderHomeSupportersGrid() {
  const grid = document.getElementById('home-supporters-grid');
  if (!grid) return;

  if (!donationsCache || donationsCache.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-6 text-xs font-bold text-neutral-500">
        Belum ada struk penghargaan yang dipajang.
      </div>
    `;
    return;
  }

  grid.innerHTML = donationsCache.slice(0, 6).map((d, idx) => {
    const badgeCls = getTierBadgeStyle(d.tier || '');
    return `
      <div onclick="openInvoiceReceiptModal('${d.id}')" class="bg-white hover:-translate-y-0.5 p-3.5 rounded-2xl brutal-border shadow-brutal transition-all cursor-pointer group flex flex-col justify-between gap-2.5">
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="${badgeCls} brutal-border px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase shadow-brutal-sm">
              ${d.tier || '🌟 SUPPORTER'}
            </span>
            <span class="text-[10px] font-mono font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-300">
              #${idx + 1} • ${d.date}
            </span>
          </div>

          <div class="flex items-baseline justify-between gap-2">
            <h4 class="font-display font-black text-base text-neutral-900 group-hover:text-magenta transition-colors truncate">
              ${d.donorName}
            </h4>
            <span class="font-display font-black text-sm text-magenta flex-shrink-0">
              ${d.amountFormatted || formatRupiah(d.amount)}
            </span>
          </div>

          ${d.message ? `
            <p class="text-xs font-semibold text-neutral-600 italic mt-1.5 line-clamp-2 bg-neutral-50 p-2 rounded-xl border border-neutral-200">
              "${d.message}"
            </p>
          ` : ''}
        </div>

        <div class="pt-2 border-t border-dashed border-neutral-200 flex items-center justify-between text-[10px] font-black">
          <span class="font-mono text-neutral-500 truncate">${d.id}</span>
          <span class="text-magenta group-hover:underline flex items-center gap-1 flex-shrink-0">
            <i data-lucide="receipt" class="w-3 h-3"></i> Buka Struk Resmi
          </span>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons({ root: grid });
}

function openDonateModal(defaultTab = 'qris') {
  const modal = document.getElementById('modal-donate');
  if (modal) {
    if (typeof applyTranslations === 'function') applyTranslations();
    modal.classList.remove('hidden');
    switchDonateTab(defaultTab || 'qris');
    loadDonations();
    if (window.lucide) lucide.createIcons({ root: modal });
  }
}

function closeDonateModal() {
  const modal = document.getElementById('modal-donate');
  if (modal) modal.classList.add('hidden');
}

function handleDonateBackdropClick(e) {
  if (e.target.id === 'modal-donate') closeDonateModal();
}

function switchDonateTab(rawTab) {
  const tab = rawTab === 'wall' ? 'wall' : 'qris';
  const tabs = ['qris', 'wall'];

  const activeCls = 'flex-1 py-2 px-3 rounded-xl text-xs font-black bg-magenta text-white brutal-border shadow-brutal-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all';
  const inactiveCls = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-white text-neutral-800 hover:text-magenta brutal-border flex items-center justify-center gap-1.5 cursor-pointer transition-all';

  tabs.forEach(tName => {
    const btn = document.getElementById(`don-tab-btn-${tName}`);
    const panel = document.getElementById(`don-panel-${tName}`);
    if (btn) {
      btn.className = tName === tab ? activeCls : inactiveCls;
    }
    if (panel) {
      panel.classList.toggle('hidden', tName !== tab);
    }
  });

  if (tab === 'wall') {
    loadDonations();
  }
}

function openInvoiceReceiptModal(invoiceId) {
  const inv = donationsCache.find(d => d.id === invoiceId);
  if (!inv) return;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const formattedAmt = inv.amountFormatted || formatRupiah(inv.amount);
  setEl('receipt-inv-id', inv.id);
  setEl('receipt-barcode-id', `*${inv.id}*`);
  setEl('receipt-date', inv.date || 'Hari ini');
  setEl('receipt-donor-name', inv.donorName);
  setEl('receipt-muse', inv.favoriteMuse || '@ziezie & @hannayeah');
  setEl('receipt-method', inv.paymentMethod || 'QRIS Official');
  setEl('receipt-tier-badge', inv.tier || '🌟 SUPPORTER');
  setEl('receipt-amount-line', formattedAmt);
  setEl('receipt-amount', formattedAmt);
  setEl('receipt-message', `"${inv.message || 'Terima kasih untuk koleksi HD-nya! ❤️'}"`);

  const modal = document.getElementById('modal-invoice-receipt');
  if (modal) {
    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons({ root: modal });
  }
}

function closeInvoiceReceiptModal() {
  const modal = document.getElementById('modal-invoice-receipt');
  if (modal) modal.classList.add('hidden');
}

function copyNmid() {
  const nmid = 'ID1025393427014';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(nmid);
    showToast(`📋 NMID berhasil disalin: ${nmid}`);
  } else {
    showToast(`NMID: ${nmid}`);
  }
}

// 3. Sharing Handlers
function shareCurrentUrl() {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    showToast(t('toastCopied'));
  } else {
    prompt('Salin tautan ini:', url);
  }
}
window.shareWebsite = shareCurrentUrl;

function sharePost(postId) {
  const accId = AppState.currentAccountId || (AppState.allPosts.find(p => p.id === postId)?.accountId) || '';
  const postUrl = `${window.location.origin}${window.location.pathname}#account=${accId}&post=${postId}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(postUrl);
    showToast(t('toastCopied'));
  } else {
    prompt('Salin link foto:', postUrl);
  }
}

function copyTikTokLink() {
  const url = 'https://www.tiktok.com/@rektrwefcl8';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    showToast('Link TikTok @rektrwefcl8 berhasil disalin!');
  } else {
    prompt('Link TikTok:', url);
  }
}

function openTikTokPreviewModal() {
  window.open('https://www.tiktok.com/@rektrwefcl8', '_blank', 'noopener,noreferrer');
}

// Auto-load Hall of Fame on initial page boot
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadDonations, 350);
});
