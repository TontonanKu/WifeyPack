// ========================================================
// REQUESTS & ADMIN MODULE (js/requests.js)
// Handles: Community Account Requests, Live Progress Tracker,
// and Owner Admin Dashboard Authentication
// ========================================================

const RequestsModule = {
  activeTab: 'list', // 'list' | 'submit' | 'report'
  filterCategory: 'all', // 'all' | 'request' | 'report'
  requests: [],

  init() {
    // Read-only public mode (no admin login from web UI)
    localStorage.removeItem('wifey_admin_token');
    if (window.AppState) AppState.isAdmin = false;
  },

  async openModal(tab = 'list') {
    this.activeTab = tab;
    const modal = document.getElementById('modal-requests');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    this.switchTab(tab);
    if (typeof applyTranslations === 'function') applyTranslations();
    await this.fetchRequests();
    if (window.lucide) lucide.createIcons();
  },

  closeModal() {
    const modal = document.getElementById('modal-requests');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  },

  switchTab(tab) {
    this.activeTab = tab;
    const tabBtnList = document.getElementById('req-tab-btn-list');
    const tabBtnSubmit = document.getElementById('req-tab-btn-submit');
    const tabBtnReport = document.getElementById('req-tab-btn-report');
    const panelList = document.getElementById('req-panel-list');
    const panelSubmit = document.getElementById('req-panel-submit');
    const panelReport = document.getElementById('req-panel-report');

    // Reset all tabs to inactive styling
    if (tabBtnList) tabBtnList.className = 'px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-neutral-700 hover:text-magenta transition-all flex items-center gap-1.5 cursor-pointer';
    if (tabBtnSubmit) tabBtnSubmit.className = 'px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-neutral-700 hover:text-magenta transition-all flex items-center gap-1.5 cursor-pointer';
    if (tabBtnReport) tabBtnReport.className = 'px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-neutral-700 hover:text-rose-600 transition-all flex items-center gap-1.5 cursor-pointer';

    if (panelList) panelList.classList.add('hidden');
    if (panelSubmit) panelSubmit.classList.add('hidden');
    if (panelReport) panelReport.classList.add('hidden');

    if (tab === 'list') {
      if (tabBtnList) tabBtnList.className = 'px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black bg-magenta text-white brutal-border shadow-brutal-sm transition-all flex items-center gap-1.5 cursor-pointer';
      if (panelList) panelList.classList.remove('hidden');
    } else if (tab === 'submit') {
      if (tabBtnSubmit) tabBtnSubmit.className = 'px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black bg-magenta text-white brutal-border shadow-brutal-sm transition-all flex items-center gap-1.5 cursor-pointer';
      if (panelSubmit) panelSubmit.classList.remove('hidden');
    } else if (tab === 'report') {
      if (tabBtnReport) tabBtnReport.className = 'px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black bg-rose-600 text-white brutal-border shadow-brutal-sm transition-all flex items-center gap-1.5 cursor-pointer';
      if (panelReport) panelReport.classList.remove('hidden');
    }

    if (window.lucide) lucide.createIcons();
  },

  setFilterCategory(cat) {
    this.filterCategory = cat;

    // Update active filter pill style
    const pills = [
      { id: 'filter-cat-all', key: 'all', activeClass: 'bg-neutral-900 text-white' },
      { id: 'filter-cat-request', key: 'request', activeClass: 'bg-magenta text-white' },
      { id: 'filter-cat-report', key: 'report', activeClass: 'bg-rose-600 text-white' }
    ];

    pills.forEach(p => {
      const el = document.getElementById(p.id);
      if (!el) return;
      if (p.key === cat) {
        el.className = `px-2.5 py-1 rounded-lg text-xs font-black ${p.activeClass} brutal-border shadow-brutal-sm cursor-pointer`;
      } else {
        el.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-neutral-700 hover:text-neutral-900 brutal-border cursor-pointer';
      }
    });

    this.renderRequestsList();
  },

  async fetchRequests() {
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        this.requests = await res.json();
        this.renderRequestsList();
      }
    } catch (e) {
      console.error('Error fetching requests:', e);
    }
  },

  renderRequestsList() {
    const container = document.getElementById('requests-list-container');
    const countBadge = document.getElementById('req-total-count-badge');
    const countAllEl = document.getElementById('cat-count-all');
    const countReqEl = document.getElementById('cat-count-request');
    const countRepEl = document.getElementById('cat-count-report');

    const totalCount = this.requests.length;
    const reqCount = this.requests.filter(r => r.type !== 'report').length;
    const repCount = this.requests.filter(r => r.type === 'report').length;

    if (countBadge) countBadge.textContent = totalCount;
    if (countAllEl) countAllEl.textContent = totalCount;
    if (countReqEl) countReqEl.textContent = reqCount;
    if (countRepEl) countRepEl.textContent = repCount;

    if (!container) return;

    // Filter items based on active category
    const filteredRequests = this.requests.filter(item => {
      if (this.filterCategory === 'request') return item.type !== 'report';
      if (this.filterCategory === 'report') return item.type === 'report';
      return true;
    });

    if (filteredRequests.length === 0) {
      const emptyLabel = this.filterCategory === 'report' ? t('reqEmptyRep') : (this.filterCategory === 'request' ? t('reqEmptyReq') : t('reqEmptyAll'));
      container.innerHTML = `
        <div class="p-8 text-center bg-neutral-50 rounded-2xl brutal-border text-neutral-600">
          <i data-lucide="inbox" class="w-12 h-12 mx-auto text-neutral-400 mb-2"></i>
          <p class="font-bold text-sm">${emptyLabel}</p>
          <div class="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <button onclick="RequestsModule.switchTab('submit')" class="px-4 py-2 bg-magenta text-white font-black rounded-xl brutal-border shadow-brutal text-xs flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
              <span>+ ${t('reqTabSubmit')}</span>
            </button>
            <button onclick="RequestsModule.switchTab('report')" class="px-4 py-2 bg-rose-600 text-white font-black rounded-xl brutal-border shadow-brutal text-xs flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
              <span>+ ${t('reqTabReport')}</span>
            </button>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const statusBadge = (status) => {
      switch (status) {
        case 'completed':
          return `<span class="bg-emerald-100 text-emerald-800 brutal-border px-2.5 py-0.5 rounded-full text-xs font-black shadow-brutal-sm flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> ${t('reqStatusCompleted')}</span>`;
        case 'in_progress':
          return `<span class="bg-sky-100 text-sky-800 brutal-border px-2.5 py-0.5 rounded-full text-xs font-black shadow-brutal-sm flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span> ${t('reqStatusInProgress')}</span>`;
        case 'rejected':
          return `<span class="bg-rose-100 text-rose-800 brutal-border px-2.5 py-0.5 rounded-full text-xs font-black shadow-brutal-sm flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500"></span> ${t('reqStatusRejected')}</span>`;
        default:
          return `<span class="bg-amber-100 text-amber-800 brutal-border px-2.5 py-0.5 rounded-full text-xs font-black shadow-brutal-sm flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> ${t('reqStatusPending')}</span>`;
      }
    };

    container.innerHTML = filteredRequests.map(req => {
      const isReport = req.type === 'report';
      const categoryBadge = isReport
        ? `<span class="bg-rose-100 text-rose-800 border-2 border-rose-900 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-brutal-sm flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3 text-rose-600"></i> ${t('reqBadgeReport')}</span>`
        : `<span class="bg-magenta-100 text-magenta-900 border-2 border-purple-900 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-brutal-sm flex items-center gap-1"><i data-lucide="sparkles" class="w-3 h-3 text-magenta"></i> ${t('reqBadgeRequest')}</span>`;

      return `
        <div class="bg-white brutal-border rounded-2xl p-4 sm:p-5 shadow-brutal transition-all hover:shadow-brutal-md flex flex-col justify-between gap-3">
          <div>
            <!-- Category & Status Badge Row -->
            <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
              ${categoryBadge}
              <div>${statusBadge(req.status)}</div>
            </div>

            <!-- Header Card: Title / Account -->
            <div class="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-display font-black text-base sm:text-lg text-neutral-900 tracking-tight">${req.accountName}</h3>
                  <span class="${isReport ? 'bg-neutral-100 text-neutral-800' : 'bg-magenta-50 text-magenta'} px-2 py-0.5 rounded-lg text-xs font-extrabold brutal-border">${req.accountId}</span>
                </div>
                <div class="text-[11px] text-neutral-500 font-semibold mt-1 flex items-center gap-2">
                  <span>${t('reqSubmittedDate')} ${req.createdAt}</span>
                  ${req.accountLink ? `
                    <span>•</span>
                    <a href="${req.accountLink}" target="_blank" rel="noopener noreferrer" class="text-magenta hover:underline font-bold flex items-center gap-0.5 max-w-[200px] truncate" title="Buka tautan terkait">
                      <span>${isReport ? t('reqViewReportLink') : t('reqViewProfile')}</span>
                      <i data-lucide="external-link" class="w-3 h-3 flex-shrink-0"></i>
                    </a>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- Notes / Command / Deskripsi User -->
            ${req.notes ? `
              <div class="mt-3 ${isReport ? 'bg-rose-50/60 border border-rose-200' : 'bg-neutral-50'} p-2.5 rounded-xl brutal-border text-xs text-neutral-800 font-medium">
                <span class="font-bold text-neutral-500 block text-[10px] uppercase tracking-wider mb-0.5">${isReport ? t('reqLabelNotesRep') : t('reqLabelNotesReq')}</span>
                <p class="whitespace-pre-line">"${req.notes}"</p>
              </div>
            ` : ''}

            <!-- Admin Progress Note (jika ada update dari admin) -->
            ${req.adminNote ? `
              <div class="mt-2.5 bg-yellow-50 border-2 border-yellow-300 p-2.5 rounded-xl text-xs text-yellow-900 font-bold flex items-start gap-2 shadow-brutal-sm">
                <i data-lucide="info" class="w-4 h-4 text-magenta flex-shrink-0 mt-0.5"></i>
                <div>
                  <span class="text-[10px] font-black uppercase tracking-wider block text-magenta">${t('reqLabelAdminProgress')}</span>
                  <span>${req.adminNote}</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  async submitRequest(event) {
    event.preventDefault();
    const name = document.getElementById('req-input-name').value.trim();
    const id = document.getElementById('req-input-id').value.trim();
    const link = document.getElementById('req-input-link').value.trim();
    const notes = document.getElementById('req-input-notes').value.trim();

    if (!name || !id) {
      showToast('⚠️ Nama Akun dan ID/Username wajib diisi!');
      return;
    }

    try {
      const btn = document.getElementById('req-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Mengirim...';

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'request',
          accountName: name,
          accountId: id,
          accountLink: link,
          notes: notes
        })
      });

      const data = await res.json();
      btn.disabled = false;
      btn.textContent = 'Kirim Permintaan';

      if (data.success) {
        document.getElementById('form-submit-request').reset();
        try {
          if (window.confetti) {
            confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
          }
        } catch(e) {}
        showToast('🎉 Request akun berhasil dikirim! Menunggu kurasi owner.');
        
        await this.fetchRequests();
        this.switchTab('list');
      } else {
        showToast('❌ Gagal: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (e) {
      console.error(e);
      showToast('❌ Gagal terhubung ke server');
    }
  },

  async submitReport(event) {
    event.preventDefault();
    const title = document.getElementById('rep-input-title').value.trim();
    const account = document.getElementById('rep-input-account').value.trim();
    const link = document.getElementById('rep-input-link').value.trim();
    const desc = document.getElementById('rep-input-desc').value.trim();

    if (!title || !account || !desc) {
      showToast('⚠️ Topik, Akun terkait, dan Detail kendala wajib diisi!');
      return;
    }

    try {
      const btn = document.getElementById('rep-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Mengirim...';

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'report',
          accountName: title,
          accountId: account,
          accountLink: link,
          notes: desc
        })
      });

      const data = await res.json();
      btn.disabled = false;
      btn.textContent = 'Kirim Laporan Masalah';

      if (data.success) {
        document.getElementById('form-submit-report').reset();
        showToast('🚨 Laporan berhasil dikirim! Owner akan segera memeriksa.');
        
        await this.fetchRequests();
        this.switchTab('list');
      } else {
        showToast('❌ Gagal: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (e) {
      console.error(e);
      showToast('❌ Gagal terhubung ke server');
    }
  },

  updateAdminHeaderUI() {}
};

window.RequestsModule = RequestsModule;
document.addEventListener('DOMContentLoaded', () => {
  RequestsModule.init();
});
