const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
let convertHeic = null;
try { convertHeic = require('heic-convert'); } catch (e) {}

const PORT = 3000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Data Helpers
function readJsonFile(filename, defaultValue = []) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading ${filename}:`, e.message);
  }
  return defaultValue;
}

function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Server-Side Component Template Engine (Full-stack SSR Component Compiler)
function renderPage(templateName = 'index.html') {
  const tplPath = path.join(PUBLIC_DIR, templateName);
  let content = fs.readFileSync(tplPath, 'utf8');
  
  // Recursively or iteratively resolve <!-- @include "components/..." -->
  content = content.replace(/<!--\s*@include\s+["'](.+?)["']\s*-->/g, (match, compPath) => {
    const fullPath = path.join(PUBLIC_DIR, compPath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
    console.warn(`[Template Warning] Component file not found: ${compPath}`);
    return `<!-- Component not found: ${compPath} -->`;
  });

  return content;
}

// Helper: Resolve account folder name dynamically from accountId
function getAccountFolder(accountId) {
  if (accountId === '599dbde850c4b46a94cf7756') return 'account_hannayeah';
  if (accountId === '420458971') return 'account_ziezie';
  if (accountId === 'for_everyoung10') return 'account_for_everyoung10';
  const accounts = readJsonFile('accounts.json', []);
  const acc = accounts.find(a => a.id === accountId);
  if (acc && acc.username) {
    return 'account_' + acc.username.replace(/^@/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  return 'account_' + String(accountId || 'custom').replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Helper: Collect MD5 hashes of all existing photos in an account folder to prevent duplicate photos
function getAccountPhotoHashes(accountFolder) {
  const hashes = new Set();
  const baseDir = path.join(PUBLIC_DIR, 'photos', accountFolder);
  if (!fs.existsSync(baseDir)) return hashes;

  function scanDir(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          scanDir(full);
        } else if (entry.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(entry.name) && entry.name !== 'avatar.jpg') {
          try {
            const buf = fs.readFileSync(full);
            hashes.add(crypto.createHash('md5').update(buf).digest('hex'));
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  scanDir(baseDir);
  return hashes;
}

// Helper: Check if a post ID or URL is already in posts.json
function findExistingPostByUrlOrId(rawUrlOrId) {
  if (!rawUrlOrId) return null;
  const posts = readJsonFile('posts.json', []);
  const str = String(rawUrlOrId).trim();

  // Check Rednote 24-hex ID
  const rnMatch = str.match(/item\/([a-f0-9]{24})/i) || str.match(/explore\/([a-f0-9]{24})/i) || str.match(/^([a-f0-9]{24})$/i);
  if (rnMatch) {
    const noteId = rnMatch[1];
    const found = posts.find(p => p.id === 'post_rednote_' + noteId || (p.id && p.id.includes(noteId)));
    if (found) return found;
  }

  // Check Instagram shortcode
  const igMatch = str.match(/instagram\.com\/(?:[^\/]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (igMatch) {
    const sc = igMatch[1];
    const found = posts.find(p => p.id === 'post_ig_' + sc || (p.id && p.id === sc));
    if (found) return found;
  }

  return posts.find(p => p.id === str) || null;
}

// Helper: Fetch HTML using curl.exe (bypasses TLS fingerprint blocking on Rednote/IG) with Node fetch fallback
async function fetchHtmlContent(targetUrl, customUA = null) {
  const ua = customUA || 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  try {
    const out = execFileSync('curl.exe', [
      '-s',
      '-L',
      '--max-time', '20',
      '-A', ua,
      targetUrl
    ], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    if (out && out.length > 100) return out;
  } catch (e) {}

  const res = await fetch(targetUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  return await res.text();
}

// Helper: Download binary image file via curl.exe or fetch (with HEIC to JPEG conversion support)
async function downloadImageToFile(imgUrl, destPath, referer = '') {
  try {
    const args = [
      '-s',
      '-L',
      '--max-time', '25',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      imgUrl,
      '-o', destPath
    ];
    if (referer) {
      args.splice(4, 0, '-e', referer);
    }
    execFileSync('curl.exe', args);
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      const buf = fs.readFileSync(destPath);
      const isHeic = buf.slice(4, 12).toString('ascii').toLowerCase().includes('heic');
      if (isHeic && typeof convertHeic === 'function') {
        try {
          const convertedBuf = await convertHeic({ buffer: buf, format: 'JPEG', quality: 0.98 });
          fs.writeFileSync(destPath, Buffer.from(convertedBuf));
        } catch (e) {}
      }
      return true;
    }
  } catch (e) {}

  try {
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    if (referer) headers['Referer'] = referer;
    const imgRes = await fetch(imgUrl, { headers });
    if (imgRes.ok) {
      let buf = Buffer.from(await imgRes.arrayBuffer());
      if (buf.length > 1000) {
        const isHeic = buf.slice(4, 12).toString('ascii').toLowerCase().includes('heic');
        if (isHeic && typeof convertHeic === 'function') {
          try {
            const convertedBuf = await convertHeic({ buffer: buf, format: 'JPEG', quality: 0.98 });
            buf = Buffer.from(convertedBuf);
          } catch (e) {}
        }
        fs.writeFileSync(destPath, buf);
        return true;
      }
    }
  } catch (e) {}
  return false;
}

// 1. Rednote Scraper with NO WATERMARK (无水印原图) logic
async function extractRednoteData(rawInput, targetAccountId = null, customCaption = '', customCategory = '') {
  // Extract first http/https URL if user pasted full Rednote share text
  const urlMatch = String(rawInput).match(/https?:\/\/[^\s"'<>]+/i);
  const targetUrl = urlMatch ? urlMatch[0] : String(rawInput).trim();

  const noteIdMatch = targetUrl.match(/item\/([a-f0-9]{24})/i) || targetUrl.match(/explore\/([a-f0-9]{24})/i) || targetUrl.match(/profile\/[^\/]+\/([a-f0-9]{24})/i);
  const targetNoteId = noteIdMatch ? noteIdMatch[1] : null;
  const tokenMatch = targetUrl.match(/[?&]xsec_token=([^&#\s]+)/i);
  const rawToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : '';

  const candidateUrls = [targetUrl];
  if (targetNoteId && rawToken) {
    candidateUrls.push(`https://www.xiaohongshu.com/discovery/item/${targetNoteId}?source=webshare&xhsshare=pc_web&xsec_token=${encodeURIComponent(rawToken)}&xsec_source=pc_share`);
    candidateUrls.push(`https://www.xiaohongshu.com/explore/${targetNoteId}?xsec_token=${encodeURIComponent(rawToken)}&xsec_source=pc_user`);
  }

  function findNoteInState(state, targetId) {
    if (!state || typeof state !== 'object') return null;
    const map = state.note?.noteDetailMap || {};
    if (targetId && map[targetId]?.note && Array.isArray(map[targetId].note.imageList) && map[targetId].note.imageList.length > 0) {
      return map[targetId].note;
    }
    for (const k of Object.keys(map)) {
      if (map[k]?.note && Array.isArray(map[k].note.imageList) && map[k].note.imageList.length > 0) {
        return map[k].note;
      }
    }
    if (state.noteData?.data?.noteData && Array.isArray(state.noteData.data.noteData.imageList) && state.noteData.data.noteData.imageList.length > 0) {
      return state.noteData.data.noteData;
    }
    function walk(obj, depth = 0) {
      if (!obj || typeof obj !== 'object' || depth > 8) return null;
      if (Array.isArray(obj.imageList) && obj.imageList.length > 0) {
        if (!targetId || obj.noteId === targetId || obj.id === targetId || obj._id === targetId) return obj;
      }
      for (const key of Object.keys(obj)) {
        const found = walk(obj[key], depth + 1);
        if (found) return found;
      }
      return null;
    }
    return walk(state, 0);
  }

  let note = null;
  for (const tryUrl of candidateUrls) {
    const text = await fetchHtmlContent(tryUrl);
    if (text.includes('你访问的页面不见了')) {
      throw new Error('Postingan Rednote ini telah dihapus oleh pemiliknya atau bersifat privat.');
    }
    const match = text.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\})<\/script>/s);
    if (match) {
      try {
        const clean = match[1].trim().replace(/undefined/g, 'null');
        const state = JSON.parse(clean);
        note = findNoteInState(state, targetNoteId);
        if (note) break;
      } catch (e) {}
    }
  }

  if (!note) {
    throw new Error('Postingan tidak ditemukan di dalam response Rednote (pastikan menyalin link lengkap beserta xsec_token).');
  }

  const noteId = note.noteId || note.id || targetNoteId || 'note_' + Date.now();
  const accounts = readJsonFile('accounts.json', []);
  const matchedAccount = accounts.find(a => a.id === targetAccountId) || accounts[0];
  const resolvedAccountId = matchedAccount ? matchedAccount.id : (targetAccountId || '420458971');
  const accountFolder = getAccountFolder(resolvedAccountId);

  const dir = path.join(PUBLIC_DIR, 'photos', accountFolder, 'note_' + noteId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const localPhotos = [];
  const imageList = note.imageList || [];
  for (let i = 0; i < imageList.length; i++) {
    const imgObj = imageList[i];
    const fileId = imgObj.fileId || (typeof imgObj === 'string' ? imgObj.match(/[a-z0-9]{32}/)?.[0] : null);
    const noWmUrl = fileId ? `https://sns-img-qc.xhscdn.com/${fileId}` : (imgObj.urlDefault || (typeof imgObj === 'string' ? imgObj : imgObj.url));

    const filename = `photo_${i + 1}.jpg`;
    const dest = path.join(dir, filename);
    let ok = await downloadImageToFile(noWmUrl, dest, 'https://www.xiaohongshu.com/');
    if (!ok && imgObj.urlDefault) {
      ok = await downloadImageToFile(imgObj.urlDefault, dest, 'https://www.xiaohongshu.com/');
    }
    if (!ok && imgObj.url) {
      ok = await downloadImageToFile(imgObj.url, dest, 'https://www.xiaohongshu.com/');
    }

    if (ok) {
      localPhotos.push(`photos/${accountFolder}/note_${noteId}/${filename}`);
    }
  }

  if (localPhotos.length === 0) {
    throw new Error('Tidak ada foto yang berhasil diunduh dari postingan Rednote ini.');
  }

  const authorName = note.user?.nickName || note.user?.nickname || note.user?.name || (matchedAccount ? matchedAccount.displayName : 'Rednote Muse');
  const postDate = note.time ? new Date(Number(note.time)).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const realLikes = parseInt(String(note.interactInfo?.likedCount || '0').replace(/[^\d]/g, ''), 10) || 0;
  const realComments = parseInt(String(note.interactInfo?.commentCount || '0').replace(/[^\d]/g, ''), 10) || 0;
  const realCollected = parseInt(String(note.interactInfo?.collectedCount || '0').replace(/[^\d]/g, ''), 10) || 0;

  return {
    id: 'post_rednote_' + noteId,
    accountId: resolvedAccountId,
    username: matchedAccount ? matchedAccount.username : ('@' + authorName.replace(/\s+/g, '')),
    authorName: authorName,
    userAvatar: matchedAccount ? matchedAccount.avatar : 'photos/account_ziezie/avatar.jpg',
    timestamp: note.time ? Number(note.time) : Date.now(),
    updatedAt: postDate,
    updatedExact: postDate,
    category: customCategory || (note.tagList && note.tagList[0]?.name) || 'Rednote Aesthetic',
    caption: customCaption || ((note.title ? note.title + ' — ' : '') + (note.desc || '')).trim() || 'Koleksi Photopack HD Tanpa Watermark ✨',
    tags: (note.tagList || []).map(t => '#' + (t.name || t)).concat(['#Rednote', '#NoWatermark']),
    photos: localPhotos,
    likes: realLikes,
    collectedCount: realCollected,
    realStats: true,
    isLiked: false,
    isBookmarked: false,
    commentsCount: realComments
  };
}

// 2. Instagram Post Scraper (Supports /p/SHORTCODE & /reel/SHORTCODE via Embed + OpenGraph Fallback)
async function extractInstagramData(rawInput, targetAccountId = null, customCaption = '', customCategory = '') {
  const urlMatch = String(rawInput).match(/https?:\/\/[^\s"'<>]+/i);
  const targetUrl = urlMatch ? urlMatch[0] : String(rawInput).trim();

  const scMatch = targetUrl.match(/instagram\.com\/(?:[^\/]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (!scMatch) {
    throw new Error('Format link Instagram tidak dikenali. Gunakan link postingan seperti https://www.instagram.com/p/SHORTCODE/');
  }
  const shortcode = scMatch[1];

  let imageUrls = [];
  let extractedCaption = '';

  // Layer 1: Instagram Public Embed Endpoint (/p/SHORTCODE/embed/captioned/)
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const embedHtml = await fetchHtmlContent(embedUrl, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    // Check contextJSON inside embed script
    const ctxMatch = embedHtml.match(/contextJSON"\s*:\s*"(\{.+?\})"/);
    if (ctxMatch) {
      try {
        const unescaped = JSON.parse(`"${ctxMatch[1]}"`);
        const ctxData = JSON.parse(unescaped);
        const media = ctxData?.gql_data?.shortcode_media || ctxData?.shortcode_media;
        if (media) {
          if (media.edge_sidecar_to_children?.edges?.length > 0) {
            media.edge_sidecar_to_children.edges.forEach(edge => {
              if (edge.node?.display_url) imageUrls.push(edge.node.display_url);
            });
          } else if (media.display_url) {
            imageUrls.push(media.display_url);
          }
          const capEdges = media.edge_media_to_caption?.edges;
          if (capEdges && capEdges[0]?.node?.text) {
            extractedCaption = capEdges[0].node.text;
          }
        }
      } catch (e) {}
    }

    // Fallback: parse EmbeddedMediaImage from embed HTML
    if (imageUrls.length === 0) {
      const imgRegex = /class="EmbeddedMediaImage"[^>]+src="([^"]+)"/gi;
      let m;
      while ((m = imgRegex.exec(embedHtml)) !== null) {
        const decodedUrl = m[1].replace(/&amp;/g, '&');
        if (!imageUrls.includes(decodedUrl)) imageUrls.push(decodedUrl);
      }
      const capMatch = embedHtml.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/i);
      if (capMatch && !extractedCaption) {
        extractedCaption = capMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  } catch (e) {}

  // Layer 2: ddinstagram / OpenGraph fallback for multi-image carousels
  if (imageUrls.length === 0) {
    try {
      const ddHtml = await fetchHtmlContent(`https://www.ddinstagram.com/p/${shortcode}/`, 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)');
      const ogImgRegex = /property="og:image"\s+content="([^"]+)"/gi;
      let m;
      while ((m = ogImgRegex.exec(ddHtml)) !== null) {
        let u = m[1].replace(/&amp;/g, '&');
        if (u.startsWith('/')) u = 'https://www.ddinstagram.com' + u;
        if (!imageUrls.includes(u)) imageUrls.push(u);
      }
      const descMatch = ddHtml.match(/property="og:description"\s+content="([^"]+)"/i);
      if (descMatch && !extractedCaption) {
        extractedCaption = descMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      }
    } catch (e) {}
  }

  // Layer 3: Direct Instagram Page OpenGraph image fallback
  if (imageUrls.length === 0) {
    try {
      const pageHtml = await fetchHtmlContent(`https://www.instagram.com/p/${shortcode}/`);
      const ogMatch = pageHtml.match(/property="og:image"\s+content="([^"]+)"/i);
      if (ogMatch) {
        imageUrls.push(ogMatch[1].replace(/&amp;/g, '&'));
      }
      const descMatch = pageHtml.match(/property="og:description"\s+content="([^"]+)"/i);
      if (descMatch && !extractedCaption) {
        extractedCaption = descMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      }
    } catch (e) {}
  }

  if (imageUrls.length === 0) {
    throw new Error('Instagram membatasi akses otomatis ke postingan ini. Silakan gunakan tab "Link Foto / Upload File" untuk menyimpan foto secara langsung.');
  }

  const accounts = readJsonFile('accounts.json', []);
  const matchedAccount = accounts.find(a => a.id === targetAccountId) || accounts.find(a => a.platform === 'instagram') || accounts[0];
  const resolvedAccountId = matchedAccount ? matchedAccount.id : (targetAccountId || 'for_everyoung10');
  const accountFolder = getAccountFolder(resolvedAccountId);
  const folderName = 'ig_' + shortcode;
  const dir = path.join(PUBLIC_DIR, 'photos', accountFolder, folderName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const localPhotos = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const filename = `photo_${i + 1}.jpg`;
    const dest = path.join(dir, filename);
    const ok = await downloadImageToFile(imageUrls[i], dest, 'https://www.instagram.com/');
    if (ok) {
      localPhotos.push(`photos/${accountFolder}/${folderName}/${filename}`);
    }
  }

  if (localPhotos.length === 0) {
    throw new Error('Gagal mengunduh file gambar dari CDN Instagram.');
  }

  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const finalCaption = customCaption || extractedCaption || `Instagram Official Photopack (${shortcode}) ✨`;
  const extractedTags = (finalCaption.match(/#[\w\u00C0-\uFFFF]+/g) || []).slice(0, 5);
  if (!extractedTags.includes('#Instagram')) extractedTags.push('#Instagram');
  if (!extractedTags.includes('#HDPhotopack')) extractedTags.push('#HDPhotopack');

  return {
    id: 'post_ig_' + shortcode,
    accountId: resolvedAccountId,
    username: matchedAccount ? matchedAccount.username : '@for_everyoung10',
    authorName: matchedAccount ? matchedAccount.displayName : 'Instagram Muse',
    userAvatar: matchedAccount ? matchedAccount.avatar : 'photos/account_for_everyoung10/avatar.jpg',
    timestamp: Date.now(),
    updatedAt: todayStr,
    updatedExact: todayStr,
    category: customCategory || 'Instagram Official',
    caption: finalCaption,
    tags: extractedTags,
    photos: localPhotos,
    likes: Math.floor(Math.random() * 5000) + 2500,
    isLiked: false,
    isBookmarked: false,
    commentsCount: Math.floor(Math.random() * 120) + 30
  };
}

// 3. Direct Image URLs or Base64 Local Upload Importer (100% Guaranteed Fan Collector Backup)
async function importDirectPhotos({ accountId, imageUrls = [], base64Files = [], caption = '', category = '', tags = [] }) {
  const accounts = readJsonFile('accounts.json', []);
  const matchedAccount = accounts.find(a => a.id === accountId) || accounts[0];
  const resolvedAccountId = matchedAccount ? matchedAccount.id : (accountId || '420458971');
  const accountFolder = getAccountFolder(resolvedAccountId);
  const albumId = 'pack_' + Date.now();
  const dir = path.join(PUBLIC_DIR, 'photos', accountFolder, albumId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const localPhotos = [];
  let photoIdx = 1;

  // Save uploaded base64 files from user's device
  if (Array.isArray(base64Files)) {
    for (const item of base64Files) {
      const dataStr = typeof item === 'string' ? item : item.data;
      if (!dataStr) continue;
      const base64Clean = dataStr.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(base64Clean, 'base64');
      if (buf.length > 500) {
        const filename = `photo_${photoIdx++}.jpg`;
        fs.writeFileSync(path.join(dir, filename), buf);
        localPhotos.push(`photos/${accountFolder}/${albumId}/${filename}`);
      }
    }
  }

  // Download direct image URLs
  if (Array.isArray(imageUrls)) {
    for (const rawUrl of imageUrls) {
      const cleanUrl = String(rawUrl || '').trim();
      if (!cleanUrl.startsWith('http')) continue;
      const filename = `photo_${photoIdx++}.jpg`;
      const dest = path.join(dir, filename);
      const ok = await downloadImageToFile(cleanUrl, dest);
      if (ok) {
        localPhotos.push(`photos/${accountFolder}/${albumId}/${filename}`);
      }
    }
  }

  if (localPhotos.length === 0) {
    throw new Error('Tidak ada foto valid yang berhasil disimpan. Pastikan file foto atau URL gambar langsung dapat diakses.');
  }

  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const parsedTags = Array.isArray(tags) && tags.length > 0
    ? tags.map(t => t.startsWith('#') ? t : '#' + t)
    : ['#Photopack', '#FanCollection', '#NoWatermark'];

  return {
    id: 'post_' + albumId,
    accountId: resolvedAccountId,
    username: matchedAccount ? matchedAccount.username : '@ziezie',
    authorName: matchedAccount ? matchedAccount.displayName : 'Photopack Muse',
    userAvatar: matchedAccount ? matchedAccount.avatar : 'photos/account_ziezie/avatar.jpg',
    timestamp: Date.now(),
    updatedAt: todayStr,
    updatedExact: todayStr,
    category: category || 'Fan Collection',
    caption: caption || 'Koleksi Photopack Pilihan ✨',
    tags: parsedTags,
    photos: localPhotos,
    likes: Math.floor(Math.random() * 2000) + 1000,
    isLiked: false,
    isBookmarked: false,
    commentsCount: Math.floor(Math.random() * 60) + 15
  };
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API: GET /api/accounts ---
  if (reqUrl.pathname === '/api/accounts' && req.method === 'GET') {
    const accounts = readJsonFile('accounts.json', []);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(accounts));
    return;
  }

  // --- API: GET /api/posts ---
  if (reqUrl.pathname === '/api/posts' && req.method === 'GET') {
    let posts = readJsonFile('posts.json', []);
    const accountId = reqUrl.searchParams.get('accountId');
    if (accountId && accountId !== 'all') {
      posts = posts.filter(p => p.accountId === accountId);
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(posts));
    return;
  }

  // --- API: GET /api/collected-ids (Daftar ID Postingan yang Sudah Ada agar Tidak Duplikat) ---
  if (reqUrl.pathname === '/api/collected-ids' && req.method === 'GET') {
    const posts = readJsonFile('posts.json', []);
    const accounts = readJsonFile('accounts.json', []);
    const postIds = [];
    const noteIds = [];
    const igShortcodes = [];

    for (const p of posts) {
      if (!p.id) continue;
      postIds.push(p.id);
      if (p.id.startsWith('post_rednote_')) {
        noteIds.push(p.id.replace('post_rednote_', ''));
      } else if (p.id.startsWith('post_ig_')) {
        igShortcodes.push(p.id.replace('post_ig_', ''));
      }
      const hexMatch = p.id.match(/[a-f0-9]{24}/i);
      if (hexMatch && !noteIds.includes(hexMatch[0])) {
        noteIds.push(hexMatch[0]);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ postIds, noteIds, igShortcodes, accounts }));
    return;
  }

  // --- API: POST /api/import-from-browser (Menerima Ekstraksi Langsung dari Tab Browser User) ---
  if (reqUrl.pathname === '/api/import-from-browser' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { platform, externalId, accountId, imageUrls = [], caption = '', category = '', tags = [], timestamp } = payload;

        // 1. Check post-level duplicate first
        if (externalId) {
          const existing = findExistingPostByUrlOrId(externalId);
          if (existing) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: true,
              skipped: true,
              reason: 'Postingan ini sudah ada di koleksi (dilewati otomatis).',
              post: existing
            }));
            return;
          }
        }

        if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Tidak ada URL foto yang ditemukan pada postingan ini.' }));
          return;
        }

        const accounts = readJsonFile('accounts.json', []);
        const matchedAccount = accounts.find(a => a.id === accountId) || accounts[0];
        const resolvedAccountId = matchedAccount ? matchedAccount.id : (accountId || '420458971');
        const accountFolder = getAccountFolder(resolvedAccountId);
        const existingHashes = getAccountPhotoHashes(accountFolder);

        const cleanExtId = String(externalId || ('auto_' + Date.now())).replace(/[^a-zA-Z0-9_-]/g, '');
        const subFolder = (platform === 'instagram' ? 'ig_' : 'note_') + cleanExtId;
        const dir = path.join(PUBLIC_DIR, 'photos', accountFolder, subFolder);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const localPhotos = [];
        let skippedDuplicates = 0;

        for (let i = 0; i < imageUrls.length; i++) {
          let origUrl = String(imageUrls[i] || '').trim();
          if (!origUrl) continue;
          if (origUrl.startsWith('//')) origUrl = 'https:' + origUrl;
          if (origUrl.startsWith('http://')) origUrl = origUrl.replace('http://', 'https://');

          let noWmUrl = origUrl;
          // If Rednote CDN URL has watermarks/params, extract raw fileId after timestamp/hash prefix
          if (platform === 'rednote' && /xhscdn\.com/i.test(origUrl) && !origUrl.startsWith('https://sns-img-qc.xhscdn.com/')) {
            try {
              const uObj = new URL(origUrl);
              let p = uObj.pathname.replace(/^\/+/, '');
              p = p.replace(/^\d{10,14}\/[a-f0-9]{32}\//i, '');
              p = p.split('!')[0].split('?')[0];
              if (p && !p.includes('avatar')) {
                noWmUrl = `https://sns-img-qc.xhscdn.com/${p}`;
              }
            } catch (e) {}
          }

          const tempDest = path.join(dir, `temp_${i + 1}.jpg`);
          const referer = platform === 'instagram' ? 'https://www.instagram.com/' : 'https://www.xiaohongshu.com/';
          let ok = await downloadImageToFile(noWmUrl, tempDest, referer);
          if (!ok && noWmUrl !== origUrl) {
            ok = await downloadImageToFile(origUrl, tempDest, referer);
          }
          if (ok && fs.existsSync(tempDest)) {
            const buf = fs.readFileSync(tempDest);
            const md5 = crypto.createHash('md5').update(buf).digest('hex');
            if (existingHashes.has(md5)) {
              fs.unlinkSync(tempDest);
              skippedDuplicates++;
              continue;
            }
            existingHashes.add(md5);
            const finalFilename = `photo_${localPhotos.length + 1}.jpg`;
            const finalDest = path.join(dir, finalFilename);
            fs.renameSync(tempDest, finalDest);
            localPhotos.push(`photos/${accountFolder}/${subFolder}/${finalFilename}`);
          }
        }

        if (localPhotos.length === 0) {
          try { fs.rmdirSync(dir); } catch (e) {}
          if (skippedDuplicates > 0) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: true,
              skipped: true,
              reason: `Semua foto (${skippedDuplicates} foto) sudah ada di dalam galeri (duplikat dilewati).`
            }));
            return;
          }
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Gagal mengunduh gambar dari URL postingan tersebut.' }));
          return;
        }

        const fallbackHexTs = (platform === 'rednote' && /^[56][0-9a-f]{23}$/i.test(cleanExtId))
          ? parseInt(cleanExtId.slice(0, 8), 16) * 1000
          : Date.now();
        const postTime = timestamp ? Number(timestamp) : fallbackHexTs;
        const postDate = new Date(postTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const postId = (platform === 'instagram' ? 'post_ig_' : 'post_rednote_') + cleanExtId;

        const newPost = {
          id: postId,
          accountId: resolvedAccountId,
          username: matchedAccount ? matchedAccount.username : '@ziezie',
          authorName: matchedAccount ? matchedAccount.displayName.replace(/\s*❤️$/, '') : 'Muse',
          userAvatar: matchedAccount ? matchedAccount.avatar : 'photos/account_ziezie/avatar.jpg',
          timestamp: postTime,
          updatedAt: postDate,
          updatedExact: postDate,
          category: category || (platform === 'instagram' ? 'Instagram Official' : 'Rednote Aesthetic'),
          caption: caption || 'Koleksi Photopack HD Tanpa Watermark ✨',
          tags: Array.isArray(tags) && tags.length > 0 ? tags : (platform === 'instagram' ? ['#Instagram', '#HDPhotopack'] : ['#Rednote', '#NoWatermark']),
          photos: localPhotos,
          likes: Math.floor(Math.random() * 2500) + 1200,
          isLiked: false,
          isBookmarked: false,
          commentsCount: Math.floor(Math.random() * 80) + 20
        };

        let posts = readJsonFile('posts.json', []);
        posts = posts.filter(p => p.id !== newPost.id);
        posts.unshift(newPost);
        writeJsonFile('posts.json', posts);

        if (matchedAccount) {
          matchedAccount.lastUpdate = postDate;
          writeJsonFile('accounts.json', accounts);
        }

        console.log(`✅ [import-from-browser] Saved ${postId} (${localPhotos.length} photos) for ${matchedAccount ? matchedAccount.username : resolvedAccountId}`);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, skipped: false, post: newPost, skippedDuplicates }));
      } catch (err) {
        console.error('Error import-from-browser:', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: POST /api/import-rednote & /api/import-post (Unified Multi-Platform Collector) ---
  if ((reqUrl.pathname === '/api/import-rednote' || reqUrl.pathname === '/api/import-post') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { url, accountId, mode, imageUrls, base64Files, caption, category, tags } = payload;

        // Prevent duplicate post before fetching if URL matches an existing noteId or Instagram shortcode
        if (url && mode !== 'direct') {
          const existing = findExistingPostByUrlOrId(url);
          if (existing) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: true,
              skipped: true,
              reason: 'Postingan ini sudah pernah diambil sebelumnya (dilewati agar tidak duplikat).',
              post: existing
            }));
            return;
          }
        }

        let postData = null;

        if (mode === 'direct' || (Array.isArray(base64Files) && base64Files.length > 0) || (Array.isArray(imageUrls) && imageUrls.length > 0)) {
          postData = await importDirectPhotos({ accountId, imageUrls, base64Files, caption, category, tags });
        } else {
          if (!url) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'URL postingan Rednote atau Instagram wajib diisi!' }));
            return;
          }

          const rawStr = String(url).trim();
          const isInstagram = /instagram\.com|instagr\.am/i.test(rawStr) || mode === 'instagram';
          const isRednote = /xiaohongshu\.com|xhslink\.com|rednote\.com/i.test(rawStr) || mode === 'rednote';

          if (isInstagram) {
            console.log('Mengimpor koleksi dari Instagram:', rawStr);
            postData = await extractInstagramData(rawStr, accountId, caption, category);
          } else if (isRednote) {
            console.log('Mengimpor koleksi dari Rednote (No Watermark):', rawStr);
            postData = await extractRednoteData(rawStr, accountId, caption, category);
          } else if (/\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(rawStr)) {
            postData = await importDirectPhotos({ accountId, imageUrls: [rawStr], caption, category, tags });
          } else {
            // Default try Rednote first
            postData = await extractRednoteData(rawStr, accountId, caption, category);
          }
        }

        // Deduplicate downloaded photos against existing MD5 hashes in other posts of the same account
        const accountFolder = getAccountFolder(postData.accountId);
        const allPosts = readJsonFile('posts.json', []);
        const otherPosts = allPosts.filter(p => p.accountId === postData.accountId && p.id !== postData.id);
        const existingHashes = new Set();
        for (const op of otherPosts) {
          for (const relPath of (op.photos || [])) {
            const absPath = path.join(PUBLIC_DIR, relPath);
            if (fs.existsSync(absPath)) {
              try {
                existingHashes.add(crypto.createHash('md5').update(fs.readFileSync(absPath)).digest('hex'));
              } catch (e) {}
            }
          }
        }

        const uniquePhotos = [];
        for (const relPath of (postData.photos || [])) {
          const absPath = path.join(PUBLIC_DIR, relPath);
          if (fs.existsSync(absPath)) {
            const md5 = crypto.createHash('md5').update(fs.readFileSync(absPath)).digest('hex');
            if (existingHashes.has(md5)) {
              try { fs.unlinkSync(absPath); } catch (e) {}
              continue;
            }
            existingHashes.add(md5);
            uniquePhotos.push(relPath);
          }
        }

        if (uniquePhotos.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            skipped: true,
            reason: 'Seluruh foto dalam postingan ini sudah ada di galeri (dilewati otomatis agar bebas duplikat).',
            post: postData
          }));
          return;
        }
        postData.photos = uniquePhotos;

        // Save to posts.json (prevent duplicate post ID)
        let posts = readJsonFile('posts.json', []);
        posts = posts.filter(p => p.id !== postData.id);
        posts.unshift(postData);
        writeJsonFile('posts.json', posts);

        // Update account lastUpdate timestamp
        const accounts = readJsonFile('accounts.json', []);
        const targetAcc = accounts.find(a => a.id === postData.accountId);
        if (targetAcc) {
          targetAcc.lastUpdate = 'Baru saja';
          writeJsonFile('accounts.json', accounts);
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, skipped: false, post: postData }));
      } catch (err) {
        console.error('Error import koleksi:', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message || 'Gagal memproses tautan koleksi' }));
      }
    });
    return;
  }

  // --- API: GET /api/donations (Daftar Papan Penghargaan & Struk Donatur) ---
  if (reqUrl.pathname === '/api/donations' && req.method === 'GET') {
    const donations = readJsonFile('donations.json', []);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(donations));
    return;
  }

  // --- API: POST /api/donations (Cetak Struk / Invoice Donasi & Masuk Papan Penghargaan) ---
  if (reqUrl.pathname === '/api/donations' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { donorName, amount, favoriteMuse, message, paymentMethod } = JSON.parse(body || '{}');
        const cleanName = String(donorName || '').trim();
        const numAmount = Math.max(1000, parseInt(String(amount || '10000').replace(/[^\d]/g, ''), 10) || 10000);

        if (!cleanName) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Nama Donatur / Supporter wajib diisi untuk dicetak di struk!' }));
          return;
        }

        let tier = '☕ SWEET SUPPORTER';
        let tierColor = 'bg-rose-100 text-rose-900';
        if (numAmount >= 100000) {
          tier = '👑 SULTAN TIER';
          tierColor = 'bg-brutal-yellow text-neutral-900';
        } else if (numAmount >= 50000) {
          tier = '💎 VIP SUPPORTER';
          tierColor = 'bg-magenta text-white';
        } else if (numAmount >= 25000) {
          tier = '🌟 GOLD FAN';
          tierColor = 'bg-amber-100 text-amber-900';
        }

        const today = new Date();
        const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const invCode = `INV-WIFEY-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

        const newDonation = {
          id: invCode,
          donorName: cleanName.slice(0, 40),
          amount: numAmount,
          amountFormatted: 'Rp ' + numAmount.toLocaleString('id-ID'),
          tier,
          tierColor,
          favoriteMuse: String(favoriteMuse || '@ziezie & @hannayeah').trim(),
          message: String(message || 'Terus semangat update koleksi foto HD tanpa watermark! 💖').trim().slice(0, 140),
          paymentMethod: String(paymentMethod || 'QRIS Standar Nasional').trim(),
          date: dateStr,
          verified: true
        };

        const donations = readJsonFile('donations.json', []);
        donations.unshift(newDonation);
        writeJsonFile('donations.json', donations);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, donation: newDonation }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: GET /api/requests (Daftar Semua Request Akun) ---
  if (reqUrl.pathname === '/api/requests' && req.method === 'GET') {
    const requests = readJsonFile('requests.json', []);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(requests));
    return;
  }

  // --- API: POST /api/requests (Pengunjung Mengajukan Request Akun Baru atau Laporan Masalah) ---
  if (reqUrl.pathname === '/api/requests' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { type, accountName, accountId, accountLink, notes } = JSON.parse(body || '{}');
        const itemType = type === 'report' ? 'report' : 'request';

        if (!accountName || !accountId) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: itemType === 'report' ? 'Topik Laporan dan Akun terkait wajib diisi!' : 'Nama Akun dan ID/Username wajib diisi!' }));
          return;
        }

        const requests = readJsonFile('requests.json', []);
        const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const newReq = {
          id: (itemType === 'report' ? 'rep_' : 'req_') + Date.now(),
          type: itemType, // 'request' | 'report'
          accountName: accountName.trim(),
          accountId: accountId.trim(),
          accountLink: (accountLink || '').trim(),
          notes: (notes || '').trim(),
          status: 'pending', // pending | in_progress | completed | rejected
          adminNote: itemType === 'report' ? 'Laporan diterima, sedang ditindaklanjuti admin.' : 'Menunggu antrean kurasi admin.',
          createdAt: todayStr,
          updatedAt: todayStr
        };

        requests.unshift(newReq);
        writeJsonFile('requests.json', requests);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, request: newReq }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve Modular Index HTML with SSR Component Assembly
  if (reqUrl.pathname === '/' || reqUrl.pathname === '/index.html') {
    try {
      const renderedHtml = renderPage('index.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderedHtml);
      return;
    } catch (err) {
      console.error('Error rendering template:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error: ' + err.message);
      return;
    }
  }

  // Serve static files
  let filePath = path.join(PUBLIC_DIR, decodeURIComponent(reqUrl.pathname));
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': contentType };
    if (/\.(jpg|jpeg|png|webp|svg|ico)$/i.test(ext)) {
      headers['Cache-Control'] = 'public, max-age=604800, immutable';
    }
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Server Photopack aktif di http://localhost:${PORT}`);
});
