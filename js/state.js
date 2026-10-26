// ========================================================
// STATE MANAGEMENT MODULE (js/state.js)
// Centralized reactive state for Photopack Gallery
// ========================================================

const AppState = {
  // Data Store
  accounts: [],
  allPosts: [],
  currentAccount: null,
  currentAccountId: null, // null means Home Directory is active

  // Directory Filters
  currentCountryFilter: 'all', // 'all', 'CN', 'KR'
  accountSearchQuery: '',

  // Gallery Filters & View
  posts: [], // Posts for currently opened account
  currentFilter: 'all', // 'all', 'multi', 'single', 'favorites'
  searchQuery: '',
  currentGridCols: Number(localStorage.getItem('wifey_cols')) || 2,
  currentSortOrder: 'newest', // 'newest' or 'oldest'

  // Internationalization: 'id' | 'en' | 'zh'
  currentLang: localStorage.getItem('wifey_lang') || 'id',

  // Persistent User Data
  followStates: JSON.parse(localStorage.getItem('wifey_follows') || '{}'),
  likedPosts: JSON.parse(localStorage.getItem('wifey_likes') || '{}'),
  bookmarkedPosts: JSON.parse(localStorage.getItem('wifey_bookmarks') || '{}'),

  // Carousel & Lightbox tracking
  carouselStates: {},
  activeLightboxPostId: null,
  activeLightboxIndex: 0,

  // Admin upload buffer
  tempUploadPhotos: []
};

// Global accessor for convenience across modules
window.AppState = AppState;

// High-fidelity SVG Country Flags (bypasses Windows emoji limitation)
function getCountryFlagSVG(code) {
  if (code === 'KR') {
    return `<span class="w-4 h-3 inline-block rounded-[2px] overflow-hidden border border-neutral-300 shadow-2xs flex-shrink-0 align-middle">
      <svg class="w-full h-full block" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#cd2e3a" d="M320 120a120 120 0 0 1 0 240 60 60 0 0 1 0-120 60 60 0 0 0 0-120z"/><path fill="#0047a0" d="M320 360a120 120 0 0 1 0-240 60 60 0 0 1 0 120 60 60 0 0 0 0 120z"/><circle cx="320" cy="180" r="60" fill="#cd2e3a"/><circle cx="320" cy="300" r="60" fill="#0047a0"/><g stroke="#000" stroke-width="12" stroke-linecap="round"><path d="M160 120l40 40M175 105l40 40M145 135l40 40M440 320l40 40M455 305l40 40M425 335l40 40M160 360l40-40M175 375l40-40M145 345l40-40M440 160l40-40M455 175l40-40M425 145l40-40"/></g></svg>
    </span>`;
  }
  // Default to CN (China)
  return `<span class="w-4 h-3 inline-block rounded-[2px] overflow-hidden border border-neutral-300 shadow-2xs flex-shrink-0 align-middle">
    <svg class="w-full h-full block" viewBox="0 0 640 480"><path fill="#de2910" d="M0 0h640v480H0z"/><polygon fill="#ffde00" points="120,48 132,84 170,84 140,106 152,142 120,120 88,142 100,106 70,84 108,84"/><polygon fill="#ffde00" points="192,60 198,78 216,78 201,89 207,107 192,96 177,107 183,89 168,78 186,78"/><polygon fill="#ffde00" points="228,96 234,114 252,114 237,125 243,143 228,132 213,143 219,125 204,114 222,114"/><polygon fill="#ffde00" points="228,144 234,162 252,162 237,173 243,191 228,180 213,191 219,173 204,162 222,162"/><polygon fill="#ffde00" points="192,180 198,198 216,198 201,209 207,227 192,216 177,227 183,209 168,198 186,198"/></svg>
  </span>`;
}
window.getCountryFlagSVG = getCountryFlagSVG;
