// ===== Global flags =====
window.__userMuted = false;          // true only when user toggles mute
window.__modalPausedTheme = false;   // internal: modal paused bgm
window.__modalUserMutedAtOpen = false;
window.__floaterEnabled = true;      // floating image on/off

// ===== VOLUME CONSTANTS (single source of truth) =====
const THEME_BASE_VOL = 0.05;  // background music target volume
const VIDEO_BASE_VOL = 0.10;  // modal video volume

// expose theme target volume for inline UI scripts
window.__THEME_TARGET_VOL = THEME_BASE_VOL;

// ===== Set initial theme volume (no autoplay here) =====
document.addEventListener('DOMContentLoaded', () => {
  const theme = document.getElementById('themeAudio');
  if (theme) theme.volume = THEME_BASE_VOL;
});

// ===== AGE GATE + INTRO FLOW =====
(function initAgeGateAndIntro() {
  const addBodyClass = (c) => document.body.classList.add(c);
  const removeBodyClass = (c) => document.body.classList.remove(c);
  addBodyClass('gate-active');

  const ageGate  = document.getElementById('ageGate');
  const ageBtn   = document.getElementById('ageContinue');
  const overlay  = document.getElementById('introOverlay');
  const video    = document.getElementById('introVideo');
  const theme    = document.getElementById('themeAudio');
  if (!ageGate || !ageBtn || !overlay || !video) return;

  let fadeTimer = null;
  let hideTimer = null;
  let confirmed = false;
  let started   = false;

  function cleanup() {
    if (fadeTimer) clearTimeout(fadeTimer);
    if (hideTimer) clearTimeout(hideTimer);
    try { video.pause(); } catch {}
    overlay.classList.add('fade-out');
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('fade-out');
    }, 1000);

    // Reveal navbar and map smoothly
    const navbar = document.getElementById('navbar');
    const mapEl  = document.getElementById('map');
    if (navbar) {
      navbar.style.opacity = '0';
      navbar.style.transition = 'opacity 1.5s ease';
      requestAnimationFrame(() => (navbar.style.opacity = '1'));
    }
    if (mapEl) {
      mapEl.style.opacity = '0';
      mapEl.style.transition = 'opacity 1.5s ease';
      requestAnimationFrame(() => (mapEl.style.opacity = '1'));
    }

    // Ensure Leaflet map sizes correctly after overlay
    const fixSize = () => {
      if (window.map && typeof window.map.invalidateSize === 'function') {
        window.map.invalidateSize();
      } else {
        setTimeout(fixSize, 50);
      }
    };
    fixSize();

    overlay.removeEventListener('click', cleanup);
    removeBodyClass('intro-active');
  }

  function startTimers() {
    if (started) return;
    started = true;
    const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 10;
    const FADE_AT = Math.max(0, Math.min(8, dur - 2));
    const HIDE_AT = Math.min(10, dur);
    fadeTimer = setTimeout(() => overlay.classList.add('fade-out'), FADE_AT * 1000);
    hideTimer = setTimeout(cleanup, HIDE_AT * 1000);
  }

  async function showIntroAndPlay() {
    overlay.classList.remove('hidden');
    document.body.classList.add('intro-active');

    if (theme) {
      try { theme.play(); } catch {}
      theme.muted = false;
      theme.volume = THEME_BASE_VOL;
      window.__userMuted = false;
    }

    try {
      video.currentTime = 0;
      video.volume = 0.4;
      await video.play();
    } catch {
      video.muted = true;
      try { await video.play(); } catch {}
    }

    overlay.addEventListener('click', cleanup, { once: true });

    const markStarted = () => { if (!started) startTimers(); };
    const onTimeUpdate = () => {
      if (video.currentTime > 0.2) {
        markStarted();
        video.removeEventListener('timeupdate', onTimeUpdate);
      }
    };
    const onPlaying = () => {
      markStarted();
      video.removeEventListener('playing', onPlaying);
    };
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      try { video.requestVideoFrameCallback(() => markStarted()); } catch {}
    }
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('ended', cleanup, { once: true });
    video.addEventListener('error', cleanup, { once: true });

    // Safety: if intro never starts, skip after 6s
    setTimeout(() => { if (!started) cleanup(); }, 6000);
  }

  const proceed = () => {
    if (confirmed) return;
    confirmed = true;

    if (theme) {
      theme.muted = false;
      theme.volume = THEME_BASE_VOL;
      window.__userMuted = false;
      try { theme.play(); } catch {}
    }

    document.body.classList.remove('gate-active');
    ageGate.style.display = 'none';
    showIntroAndPlay();
  };

  ageBtn.addEventListener('click', proceed);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      proceed();
    }
  });
})();

// ===================== CONFIG =====================
const CITY_CODE_URL = './data/city_code.json';
const CITY_FILES_DIR = './data/datas';

// ===================== VIDEO MAP =====================
const VIDEO_MAP = {
  // Hengshui
  'hengshui': 'videos/hengshui.mp4',
  '衡水': 'videos/hengshui.mp4',
  '衡水市': 'videos/hengshui.mp4',

  'dongbei': 'videos/dongbei.mp4',
  '东北': 'videos/dongbei.mp4',
  'xinjiang': 'videos/xinjiang.mp4',
  '新疆': 'videos/xinjiang.mp4',
  'beijing': 'videos/beijing.mp4',
  '北京': 'videos/beijing.mp4',
  'shanghai': 'videos/shanghai.mp4',

  // Wuhan
  'wuhan': 'videos/wuhan.mp4',
  '武汉': 'videos/wuhan.mp4',
  '武汉市': 'videos/wuhan.mp4',

  '上海': 'videos/shanghai.mp4',
  'chongqing': 'videos/chongqing.mp4',
  '重庆': 'videos/chongqing.mp4',
  'hainan': 'videos/hainan.mp4',
  '海南': 'videos/hainan.mp4',
  'shandong': 'videos/shandong.mp4',
  '山东': 'videos/shandong.mp4',
  'shanxi': 'videos/shanxi.mp4',
  '山西': 'videos/shanxi.mp4',
  'yunnan': 'videos/yunnan.mp4',
  '云南': 'videos/yunnan.mp4',
  'chengdu': 'videos/chengdu.mp4',
  '成都': 'videos/chengdu.mp4',
  '四川': 'videos/chengdu.mp4',
  'guangzhou': 'videos/guangzhou.mp4',
  '广州': 'videos/guangzhou.mp4',
  '广东': 'videos/guangzhou.mp4',

  'germany': 'videos/german.mp4',
  'deutschland': 'videos/german.mp4',
  '德国': 'videos/german.mp4',

  'america': 'videos/america.mp4',
  '美国': 'videos/america.mp4',
};

// ===================== NAME ALIASES =====================
const NAME_ALIASES = {
  // Hengshui
  '衡水': 'hengshui',
  '衡水市': 'hengshui',
  'Hengshui': 'hengshui',

  // Wuhan
  'Chengdu': 'chengdu',
  '武汉': 'wuhan',
  '武汉市': 'wuhan',
  'Wuhan': 'wuhan',

  '东北': 'dongbei',
  '德国': 'germany',
  'deutschland': 'germany',
  '美国': 'america',

  '北京': 'beijing',
  '北京市': 'beijing',
  '上海': 'shanghai',
  '上海市': 'shanghai',
  '重庆': 'chongqing',
  '重庆市': 'chongqing',
  '山东': 'shandong',
  '山东省': 'shandong',
  '山西': 'shanxi',
  '山西省': 'shanxi',
  '云南': 'yunnan',
  '云南省': 'yunnan',
  '海南': 'hainan',
  '海南省': 'hainan',
  '新疆': 'xinjiang',
  '新疆维吾尔自治区': 'xinjiang',
  '成都': 'chengdu',
  '成都市': 'chengdu',
  '四川': 'chengdu',
  '四川省': 'chengdu',
  '广州': 'guangzhou',
  '广州市': 'guangzhou',
  '广东': 'guangzhou',
};

// Quick CN name lookup for canonical keys (used for bilingual labels)
const EN_ZH = {
  hengshui:'衡水',
  wuhan:'武汉',
  beijing:'北京',
  shanghai:'上海',
  chongqing:'重庆',
  hainan:'海南',
  shandong:'山东',
  shanxi:'山西',
  yunnan:'云南',
  chengdu:'成都',
  guangzhou:'广州',
  dongbei:'东北',
  germany:'德国',
  america:'美国',
  xinjiang:'新疆',
};

// ===================== CREDIT MAP (with views) =====================
const DEFAULT_THUMBNAIL = 'https://www.bilibili.com/video/BV1HgnpzqE9B/?spm_id_from=333.788.recommend_more_video.5&trackid=web_related_0.router-related-2206419-fjhdv.1761061468478.533';

const VIDEO_CREDIT_MAP = {
  wuhan:    { link: 'https://www.bilibili.com/video/BV19fxKz4EkM/?spm_id_from=333.337.search-card.all.click', views:  5600,    views_str: '5.6K',  title: 'Wuhan',    thumbnail: DEFAULT_THUMBNAIL },
  shandong: { link: 'https://www.bilibili.com/video/BV1L3H3zcEnm/?spm_id_from=333.337.search-card.all.click', views: 9240000,  views_str: '9.24M', title: 'Shandong', thumbnail: DEFAULT_THUMBNAIL },
  shanghai: { link: 'https://www.bilibili.com/video/BV1gCn4zhEVi/?spm_id_from=333.337.search-card.all.click', views: 5540000,  views_str: '5.54M', title: 'Shanghai', thumbnail: DEFAULT_THUMBNAIL },
  dongbei:  { link: 'https://www.bilibili.com/video/BV1Jvndz8ECg/?spm_id_from=333.788.recommend_more_video.2&trackid=web_related_0.router-related-2206419-2kqqq.1761059416041.455', views: 19000, views_str: '19K', title: 'Dongbei', thumbnail: DEFAULT_THUMBNAIL },
  shanxi:   { link: 'https://www.bilibili.com/video/BV1NjHAzREbL?spm_id_from=333.788.recommend_more_video.-1', views: 70000,    views_str: '70K',  title: 'Shanxi',   thumbnail: DEFAULT_THUMBNAIL },
  xinjiang: { link: 'https://www.bilibili.com/video/BV1eFxEzxEHh/?spm_id_from=333.788.player.player_end_recommend_autoplay',   views: 45000,    views_str: '45K',  title: 'Xinjiang', thumbnail: DEFAULT_THUMBNAIL },
  yunnan:   { link: 'https://www.bilibili.com/video/BV1WmxgzHENV?spm_id_from=333.788.recommend_more_video.0',                  views: 84000,    views_str: '84K',  title: 'Yunnan',   thumbnail: DEFAULT_THUMBNAIL },
  chengdu:  { link: 'https://www.bilibili.com/video/BV1UK4uzWE8b',                  views: 6420000, views_str: '6.40M',  title: 'Chengdu',  thumbnail: DEFAULT_THUMBNAIL },
  hainan:   { link: 'https://www.bilibili.com/video/BV17Z4NzAEvr/?spm_id_from=333.788.recommend_more_video.0&trackid=web_related_0.router-related-2206419-xc9bj.1761060390499.481', views: 47000, views_str: '47K', title: 'Hainan', thumbnail: DEFAULT_THUMBNAIL },
  beijing:  { link: 'https://www.bilibili.com/video/BV1JtxDz4EKT/',                                                             views: 6610000,  views_str: '6.61M', title: 'Beijing',  thumbnail: DEFAULT_THUMBNAIL },
  chongqing:{ link: 'https://www.bilibili.com/video/BV1iQx4zXE2A/?spm_id_from=333.337.search-card.all.click',                  views: 68000,    views_str: '68K',  title: 'Chongqing',thumbnail: DEFAULT_THUMBNAIL },
  guangzhou:{ link: 'https://www.bilibili.com/video/BV1q1x1zzEkD/?spm_id_from=333.337.search-card.all.click',                  views: 36000,    views_str: '36K',  title: 'Guangzhou',thumbnail: DEFAULT_THUMBNAIL },
  hengshui: { link: 'https://www.bilibili.com/video/BV1kQxdzLEBu/?spm_id_from=333.337.search-card.all.click',                  views: 1970000,  views_str: '1.97M',title: 'HengShui', thumbnail: DEFAULT_THUMBNAIL },
  germany:  { link: 'https://www.bilibili.com/video/BV1CWHxzEE9q/?spm_id_from=333.337.search-card.all.click',                  views: 1850000,  views_str: '1.85M',title: 'Germany',  thumbnail: DEFAULT_THUMBNAIL },
  america:  { link: 'https://www.bilibili.com/video/BV1dXnqzPEhi/?spm_id_from=333.337.search-card.all.click',                  views: null,     views_str: null,   title: 'America',  thumbnail: DEFAULT_THUMBNAIL },
  tianjin:  { link: 'https://www.bilibili.com/video/BV1BLHPz5EPY?spm_id_from=333.788.recommend_more_video.2',                  views: 1830000,  views_str: '1.83M',title: 'Tianjin',  thumbnail: DEFAULT_THUMBNAIL },
  chengdu_cosplay: { link: 'https://www.bilibili.com/video/BV1UK4uzWE8b/?spm_id_from=333.788.recommend_more_video.6&trackid=web_related_0.router-related-2206419-r6wc2.1761059954359.304', views: null, views_str: null, title: 'Chengdu Cosplay', thumbnail: DEFAULT_THUMBNAIL },
  adolf_hitler:    { link: 'https://www.bilibili.com/video/BV1wW4izoE3n/?spm_id_from=333.788.recommend_more_video.0&trackid=web_related_0.router-related-2206419-76tx6.1761060522930.670', views: null, views_str: null, title: 'Adolf Hitler (clip)', thumbnail: DEFAULT_THUMBNAIL },
};

// ===================== THEME STYLES =====================
const YELLOW = '#ffd60a';
const BASE_LINE = '#262626';
const BASE_PROV_STYLE = { color: BASE_LINE, weight: 1, opacity: 0.9, fillColor: '#000', fillOpacity: 0 };
const PROV_HAS_VIDEO_STYLE = { color: YELLOW, weight: 2, opacity: 1, fillColor: YELLOW, fillOpacity: 0.45 };

// ===================== ICON FACTORY =====================
const M_ICON = (size, key) => {
  const meta = key ? VIDEO_CREDIT_MAP[key] : null;
  const premium = meta?.views && meta.views >= 1_000_000;
  const iconUrl = premium ? './images/m_premium_circle.png' : './images/m.png';
  return L.icon({ iconUrl, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
};

// ===================== HELPERS =====================
const zhTrimAdminSuffix = s => String(s||'').replace(/(特别行政区|自治区|自治州|地区|市辖区|盟|州|省|市|区)$/u,'').trim();

function lookupVideoByNameOrCode(name, code) {
  const cand = [];
  if (code) cand.push(String(code).replace(/\D/g,''));
  if (name) {
    const raw  = String(name).trim();
    const trim = zhTrimAdminSuffix(raw);
    cand.push(raw, trim);
  }
  for (const k of cand) {
    const norm = NAME_ALIASES[k] || k;
    if (VIDEO_MAP[norm]) return { src: VIDEO_MAP[norm], label: norm };
  }
  return null;
}

function dissolveFeatures(fs){
  if(!fs?.length) return null;
  let m=fs[0];
  for(let i=1;i<fs.length;i++) try{ m=turf.union(m,fs[i])||m; }catch{}
  return {type:'FeatureCollection', features:[m]};
}

function featureCenter(f){
  try{
    const c=turf.centerOfMass(f);
    return L.latLng(c.geometry.coordinates[1], c.geometry.coordinates[0]);
  }catch{ return null; }
}

function lookupCredit(label) {
  if (!label) return null;
  const raw = String(label).trim();
  const trimmed = zhTrimAdminSuffix(raw);
  const key = NAME_ALIASES[trimmed] || NAME_ALIASES[raw] || trimmed.toLowerCase();
  return VIDEO_CREDIT_MAP[key] || null;
}

// Capitalize helper
const cap = s => (s && s.length) ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// === NEW: bilingual label helper (always "中文 English") ===
function bilingualLabel(key, rawName) {
  const cnCandidate = zhTrimAdminSuffix(rawName || EN_ZH[key] || '');
  const enCandidate = VIDEO_CREDIT_MAP[key]?.title || cap(String(key));
  if (cnCandidate && enCandidate) return `${cnCandidate} ${enCandidate}`;
  return cnCandidate || enCandidate || String(key);
}

// ===================== MODAL (respect user mute + hide toggles) =====================
const modal = {
  open(src, label) {
    if (!this.root) this.init();

    const credit = lookupCredit(label);
    this.title.textContent = credit?.title || label || 'Playing...';
    this.source.src = src;
    this.video.load();

    // Remember user mute state at open
    window.__modalUserMutedAtOpen = !!window.__userMuted;

    // Pause background music during modal
    const theme = document.getElementById('themeAudio');
    if (theme) {
      window.__modalPausedTheme = !theme.paused;
      try { theme.pause(); } catch {}
    }

    // Hide toggles while modal is open
    document.body.classList.add('video-open');

    // Credit link
    if (credit) {
      this.creditText.innerHTML =
        `<a href="${credit.link}" target="_blank" rel="noopener noreferrer">
           View on Bilibili${credit.views_str ? ` — ${credit.views_str}` : ''}
         </a>`;
      this.credit.classList.add('show');
    } else {
      this.credit.style.display = 'none';
      this.credit.classList.remove('show');
    }

    // Play video
    this.root.classList.remove('hidden');
    this.video.volume = VIDEO_BASE_VOL;
    this.video.play().catch(() => {
      this.video.muted = true;
      this.video.play().catch(() => {});
    });
  },

  close() {
    this.video.pause();
    this.source.src = '';
    this.root.classList.add('hidden');

    // Show toggles again
    document.body.classList.remove('video-open');

    // Resume theme only if user wasn't muted
    const theme = document.getElementById('themeAudio');
    if (theme) {
      if (!window.__modalUserMutedAtOpen && !window.__userMuted) {
        try { theme.play(); } catch {}
        theme.muted = false;
        const targetVol = THEME_BASE_VOL;
        theme.volume = 0;
        const fadeIn = setInterval(() => {
          if (theme.volume < targetVol) theme.volume = Math.min(targetVol, theme.volume + 0.005);
          else clearInterval(fadeIn);
        }, 100);
      } else {
        try { theme.pause(); } catch {}
      }
    }

    window.__modalPausedTheme = false;
    window.__modalUserMutedAtOpen = false;
  },

  init() {
    this.root   = document.getElementById('videoModal');
    this.video  = document.getElementById('modalVideo');
    this.source = document.getElementById('modalSource');
    this.title  = document.getElementById('modalTitle');
    this.credit = document.getElementById('modalCredit');
    this.creditText = document.getElementById('creditText');

    document.getElementById('modalBackdrop').onclick = () => this.close();
    document.getElementById('modalClose').onclick    = () => this.close();
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.root.classList.contains('hidden')) this.close();
    });
  }
};

const playVideo = (src,label) => modal.open(src,label);

// ===================== MAP =====================
const map = L.map('map', {
  minZoom: 3,
  maxZoom: 12,
  maxBounds: [[80, -180], [-60, 180]],
  maxBoundsViscosity: 1.0,
  zoomControl: false
}).setView([35,103],4);
window.map = map;

map.createPane('base-provs');
map.getPane('base-provs').style.zIndex = '300';
map.createPane('video-provs');
map.getPane('video-provs').style.zIndex = '500';

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

const provinces = L.layerGroup().addTo(map);
const markers   = L.layerGroup().addTo(map);
const provinceOutlineByCode = new Map();
const placedKeys = new Set();

setTimeout(()=> map.invalidateSize(), 0);
window.addEventListener('resize', ()=> map.invalidateSize());

fetch(CITY_CODE_URL)
  .then(r=>r.json())
  .then(async json=>{
    for (const p of json.areas || []) {
      const name = p.name;
      const code = String(p.code);

      const res = await fetch(`${CITY_FILES_DIR}/${code}.json`).catch(()=>null);
      if (!res || !res.ok) continue;

      const fc = await res.json();
      const prov = dissolveFeatures(fc.features);
      if (!prov) continue;

      provinceOutlineByCode.set(code, prov);

      const vidInfo  = lookupVideoByNameOrCode(name, code);
      const hasVideo = !!vidInfo;

      const layer = L.geoJSON(prov, {
        style: () => hasVideo ? PROV_HAS_VIDEO_STYLE : BASE_PROV_STYLE,
        pane: hasVideo ? 'video-provs' : 'base-provs'
      })
      .on('click', ()=> hasVideo && playVideo(vidInfo.src, vidInfo.label))
      .addTo(provinces);

      if (hasVideo && layer && layer.eachLayer) {
        layer.eachLayer(l => l.bringToFront && l.bringToFront());
      }

      if (hasVideo) {
        const c = featureCenter(prov.features[0]);
        if (c) {
          const key = vidInfo.label; // canonical key like 'wuhan'
          const label = bilingualLabel(key, name);
          const m = L.marker(c, { icon: M_ICON(28, key), title: label });
          m._mmKey = key; // ✅ tag the marker with its key for later lookup
          m.addTo(markers)
            .bindTooltip(label, { permanent: false, direction: 'top', offset: [0, -10], className: 'video-label' })
            .on('click', ()=> playVideo(vidInfo.src, key));
          placedKeys.add(key);
        }
      }
    }

    // === EXTRA REGIONS ===
    drawDongbei();
    addGermany();
    addAmerica();
    highlightHengshui();
    highlightWuhan();

  });

// ===================== 东北 (Liaoning+Jilin+Heilongjiang) =====================
function drawDongbei(){
  const codes=['210000','220000','230000'];
  const fs=codes.map(c=>provinceOutlineByCode.get(c)).filter(Boolean).flatMap(fc=>fc.features);
  if(!fs.length) return;
  const merged=dissolveFeatures(fs);

  L.geoJSON(merged,{style:{color:YELLOW,weight:2,opacity:1,fillColor:YELLOW,fillOpacity:0.45}, pane:'video-provs'}).addTo(provinces);

  const c=featureCenter(merged.features[0]);
  if(c){
    const key='dongbei';
    const label=bilingualLabel(key, EN_ZH[key]);
    L.marker(c,{icon:M_ICON(30,key),title:label})
      .addTo(markers)
      .bindTooltip(label,{permanent:false,direction:'top',offset:[0,-10],className:'video-label'})
      .on('click',()=>playVideo('videos/dongbei.mp4',key));
    placedKeys.add(key);
  }
}

// ===================== GERMANY =====================
function addGermany(){
  fetch('./data/datas/deutschland.json').then(r=>r.json()).then(fc=>{
    L.geoJSON(fc,{style:{color:YELLOW,weight:2,fillColor:YELLOW,fillOpacity:0.45}, pane:'video-provs'}).addTo(provinces);
    const c=featureCenter(fc.features[0]);
    if(c){
      const key='germany';
      const label=bilingualLabel(key, EN_ZH[key]);
      L.marker(c,{icon:M_ICON(30,key),title:label})
        .addTo(markers)
        .bindTooltip(label,{permanent:false,direction:'top',offset:[0,-10],className:'video-label'})
        .on('click',()=>playVideo('videos/german.mp4',key));
      placedKeys.add(key);
    }
  });
}

// ===================== AMERICA (mainland) =====================
function isMainlandUS(feature){
  try{
    const [lng,lat]=turf.centerOfMass(feature).geometry.coordinates;
    return(lng>-125&&lng<-66&&lat>24&&lat<50);
  }catch{ return false; }
}
function largestPolygonFeature(geojson){
  const g=geojson.type==='Feature'?geojson.geometry:
          geojson.type==='FeatureCollection'?geojson.features[0].geometry:geojson;
  if(!g||(g.type!=='Polygon'&&g.type!=='MultiPolygon'))return null;
  const polys=[];
  if(g.type==='Polygon'){polys.push(turf.feature(g));}
  else{for(const coords of g.coordinates){polys.push(turf.polygon(coords));}}
  let best=null,bestArea=-1;
  for(const f of polys){const a=turf.area(f);if(a>bestArea){bestArea=a;best=f;}}
  return best;
}
function addAmerica(){
  fetch('./data/datas/america.json')
    .then(r=>r.json())
    .then(fc=>{
      const all=(fc&&fc.features)?fc.features:[];
      if(!all.length)return;

      const mainland=all.filter(isMainlandUS);
      const candidates=mainland.length?mainland:all;
      const dissolved=dissolveFeatures(candidates);
      const mainPoly=largestPolygonFeature(dissolved);
      if(!mainPoly)return;

      L.geoJSON(mainPoly,{style:{color:YELLOW,weight:2,fillColor:YELLOW,fillOpacity:0.45}, pane:'video-provs'}).addTo(provinces);

      const center=featureCenter(mainPoly)||L.latLng(37.1,-95.7);
      const key='america';
      const label=bilingualLabel(key, EN_ZH[key]);
      L.marker(center,{icon:M_ICON(30,key),title:label})
        .addTo(markers)
        .bindTooltip(label,{permanent:false,direction:'top',offset:[0,-10],className:'video-label'})
        .on('click',()=>playVideo('videos/america.mp4',key));
      placedKeys.add(key);
    })
    .catch(err=>console.error('Failed to load america.json',err));
}

// ===================== FALLBACK / DRAW UTILS =====================
function findSubFeatureByName(parentFC, names) {
  if (!parentFC?.features?.length) return null;

  const nameSet = new Set(
    names.flatMap(n => {
      const raw = String(n).trim();
      const trimmed = zhTrimAdminSuffix(raw);
      const alias = NAME_ALIASES[trimmed] || NAME_ALIASES[raw] || trimmed;
      return [raw, trimmed, alias, alias.toLowerCase()];
    })
  );

  const keys = ['name','NAME','Name','NAME_1','full_name','fullname','中文名','CNNAME'];
  for (const f of parentFC.features) {
    const props = f.properties || {};
    for (const k of keys) {
      const val = props[k];
      if (!val) continue;
      const s = String(val).trim();
      const trim = zhTrimAdminSuffix(s);
      const alias = NAME_ALIASES[trim] || NAME_ALIASES[s] || trim;
      if (nameSet.has(s) || nameSet.has(trim) || nameSet.has(alias) || nameSet.has(alias.toLowerCase())) {
        return { type: 'FeatureCollection', features: [f] };
      }
    }
  }
  return null;
}

function drawHighlighted(fc) {
  const layer = L.geoJSON(fc, { style: PROV_HAS_VIDEO_STYLE, pane:'video-provs' }).addTo(provinces);
  if (layer && layer.eachLayer) {
    layer.eachLayer(l => l.bringToFront && l.bringToFront());
  }
  return layer;
}

function ensureVideoMarker(key, lat, lng, labelOverride) {
  if (placedKeys.has(key)) return;
  const vid = VIDEO_MAP[key];
  if (!vid) return;

  // Try to get CN from override (strip admin suffix), else from EN_ZH
  let cn = '';
  if (labelOverride) {
    const beforeSpace = String(labelOverride).split(/\s+/)[0];
    cn = zhTrimAdminSuffix(beforeSpace);
  }
  const label = bilingualLabel(key, cn || EN_ZH[key] || labelOverride);

  L.marker([lat, lng], { icon: M_ICON(28, key), title: label })
    .addTo(markers)
    .bindTooltip(label, { permanent: false, direction: 'top', offset: [0, -10], className: 'video-label' })
    .on('click', () => playVideo(vid, key));
  placedKeys.add(key);
}

// ===================== HENGSHUI =====================
function highlightHengshui() {
  const code = '131100';
  const key  = 'hengshui';
  const labelCN = EN_ZH[key]; // '衡水'

  const cached = provinceOutlineByCode.get(code);
  if (cached?.features?.length) {
    drawHengshuiFromFC(cached, bilingualLabel(key, labelCN));
    return;
  }

  fetch(`${CITY_FILES_DIR}/${code}.json`)
    .then(r => (r.ok ? r.json() : null))
    .then(fc => {
      if (fc?.features?.length) {
        const prov = dissolveFeatures(fc.features) || fc;
        drawHengshuiFromFC(prov, bilingualLabel(key, labelCN));
        return;
      }
      return fetch(`${CITY_FILES_DIR}/130000.json`)
        .then(r => (r.ok ? r.json() : null))
        .then(hb => {
          const sub = findSubFeatureByName(hb, ['衡水市', '衡水', 'Hengshui']);
          if (sub?.features?.length) {
            drawHengshuiFromFC(sub, bilingualLabel(key, labelCN));
            return;
          }
          ensureVideoMarker(key, 37.738, 115.670, labelCN);
        });
    })
    .catch(() => {
      ensureVideoMarker(key, 37.738, 115.670, labelCN);
    });
}

function drawHengshuiFromFC(fc, label) {
  drawHighlighted(fc);
  const c = featureCenter(fc.features[0]);
  if (c && !placedKeys.has('hengshui')) {
    L.marker(c, { icon: M_ICON(30, 'hengshui'), title: label })
      .addTo(markers)
      .bindTooltip(label, { permanent: false, direction: 'top', offset: [0, -10], className: 'video-label' })
      .on('click', () => playVideo('videos/hengshui.mp4', 'hengshui'));
    placedKeys.add('hengshui');
  }
}

// ===================== WUHAN =====================
function highlightWuhan() {
  const code = '420100';
  const key  = 'wuhan';
  const labelCN = EN_ZH[key]; // '武汉'

  const cached = provinceOutlineByCode.get(code);
  if (cached?.features?.length) {
    drawWuhanFromFC(cached, bilingualLabel(key, labelCN));
    return;
  }

  fetch(`${CITY_FILES_DIR}/${code}.json`)
    .then(r => (r.ok ? r.json() : null))
    .then(fc => {
      if (fc?.features?.length) {
        const prov = dissolveFeatures(fc.features) || fc;
        drawWuhanFromFC(prov, bilingualLabel(key, labelCN));
        return;
      }
      return fetch(`${CITY_FILES_DIR}/420000.json`)
        .then(r => (r.ok ? r.json() : null))
        .then(hubei => {
          const sub = findSubFeatureByName(hubei, ['武汉市', '武汉', 'Wuhan']);
          if (sub?.features?.length) {
            drawWuhanFromFC(sub, bilingualLabel(key, labelCN));
            return;
          }
          ensureVideoMarker(key, 30.5928, 114.3055, labelCN);
        });
    })
    .catch(() => {
      ensureVideoMarker(key, 30.5928, 114.3055, labelCN);
    });
}

function drawWuhanFromFC(fc, label) {
  drawHighlighted(fc);
  const c = featureCenter(fc.features[0]);
  if (c && !placedKeys.has('wuhan')) {
    L.marker(c, { icon: M_ICON(30, 'wuhan'), title: label })
      .addTo(markers)
      .bindTooltip(label, { permanent: false, direction: 'top', offset: [0, -10], className: 'video-label' })
      .on('click', () => playVideo('videos/wuhan.mp4', 'wuhan'));
    placedKeys.add('wuhan');
  }
}

// ===== FLOAT TOGGLE =====
(function initFloatToggle() {
  const btn = document.getElementById('floatToggle');
  const floater = document.getElementById('floater1');
  if (!btn || !floater) return;

  const ICON_ON  = btn.querySelector('.icon-on');
  const ICON_OFF = btn.querySelector('.icon-off');

  function updateIconAndVisibility() {
    const on = window.__floaterEnabled === true;
    ICON_ON.style.display  = on ? 'block' : 'none';
    ICON_OFF.style.display = on ? 'none'  : 'block';
    floater.style.display  = on ? 'block' : 'none';
    btn.setAttribute('aria-pressed', String(on));
  }

  btn.addEventListener('click', () => {
    window.__floaterEnabled = !window.__floaterEnabled;
    updateIconAndVisibility();
  });

  updateIconAndVisibility();
})();

// ===== FLOATING IMAGE (repels, swaps) =====
(function initFloater() {
  const el = document.getElementById('floater1');
  if (!el) return;

  const FLOAT_IMAGES = [
    './floatingphotos/cockcropped.png',
    './floatingphotos/beanscropped.png',
    './floatingphotos/buttplugcropped.png',
    './floatingphotos/duriancropped.png',
    './floatingphotos/effieltower.png',
    './floatingphotos/gaokaocropped.png'
  ];

  const rand = (n) => Math.floor(Math.random() * n);
  const pickRandom = (arr) => arr[rand(arr.length)];
  const pickDifferent = (arr, current) => {
    if (arr.length < 2) return current;
    let next;
    do { next = pickRandom(arr); } while (next === current);
    return next;
  };

  let currentSrc = pickRandom(FLOAT_IMAGES);
  el.src = currentSrc;

  function randomStart() {
    return {
      x: Math.random() * (window.innerWidth  - el.clientWidth  - 20),
      y: Math.random() * (window.innerHeight - el.clientHeight - 20)
    };
  }
  let { x, y } = randomStart();

  const BASE_SPEED = 140;
  const MAX_SPEED  = 260;
  const MIN_SPEED  = 80;
  let angle = Math.random() * Math.PI * 2;
  let vx = Math.cos(angle) * BASE_SPEED;
  let vy = Math.sin(angle) * BASE_SPEED;

  let mx = null, my = null;
  const REPEL_RADIUS  = 140;
  const REPEL_IMPULSE = 1200;

  let last = performance.now();

  function bounds() {
    return {
      w: window.innerWidth,
      h: window.innerHeight,
      ew: el.clientWidth,
      eh: el.clientHeight
    };
  }

  function isFrozen() {
    return document.body.classList.contains('video-open');
  }

  function clampToViewport() {
    const { w, h, ew, eh } = bounds();
    x = Math.max(0, Math.min(x, w - ew));
    y = Math.max(0, Math.min(y, h - eh));
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  window.addEventListener('resize', clampToViewport);

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });

  el.addEventListener('click', () => {
    const next = pickDifferent(FLOAT_IMAGES, currentSrc);
    currentSrc = next;
    el.src = currentSrc;
  });
  el.style.display = (window.__floaterEnabled === true) ? 'block' : 'none';

  function tick(now) {
    const dt = Math.min(0.050, (now - last) / 1000);
    last = now;
    if (window.__floaterEnabled !== true) {
      if (el.style.display !== 'none') el.style.display = 'none';
      requestAnimationFrame(tick);
      return;
    } else if (el.style.display !== 'block') {
      el.style.display = 'block';
    }

    if (!isFrozen()) {
      const { w, h, ew, eh } = bounds();

      if (mx !== null && my !== null) {
        const cx = x + ew / 2;
        const cy = y + eh / 2;
        const dx = cx - mx;
        const dy = cy - my;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < REPEL_RADIUS) {
          const ux = dx / dist, uy = dy / dist;
          const strength = 1 - dist / REPEL_RADIUS;
          vx += ux * REPEL_IMPULSE * strength * dt;
          vy += uy * REPEL_IMPULSE * strength * dt;
        }
      }

      x += vx * dt;
      y += vy * dt;

      if (x <= 0)            { x = 0;         vx = Math.abs(vx); }
      if (x >= w - ew)       { x = w - ew;    vx = -Math.abs(vx); }
      if (y <= 0)            { y = 0;         vy = Math.abs(vy); }
      if (y >= h - eh)       { y = h - eh;    vy = -Math.abs(vy); }

      const speed = Math.hypot(vx, vy);
      if (speed > MAX_SPEED) {
        const s = MAX_SPEED / speed; vx *= s; vy *= s;
      } else if (speed < MIN_SPEED) {
        const s = (speed === 0 ? 1 : MIN_SPEED / speed); vx *= s; vy *= s;
      }

      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    requestAnimationFrame(tick);
  }

  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  requestAnimationFrame(tick);
})();

// ===== PAGED SNAP (center-anchor + threshold) =====
(function initPagedSnap() {
  // Pages in vertical order (include the map as page 0)
  const pageEls = [
    document.getElementById('mapPanel'),
    document.getElementById('about'),
    document.getElementById('roadmap'),
    document.getElementById('howtobuy'),
    document.getElementById('contact'),
  ].filter(Boolean);

  if (!pageEls.length) return;

  // Compute the scrollTop that centers an element in the viewport
  function targetYFor(el) {
    const rectTop = el.getBoundingClientRect().top + window.scrollY;
    const vh = window.innerHeight;
    const h  = el.offsetHeight;
    // center so the element’s midpoint aligns with viewport midpoint
    const y  = rectTop - Math.max(0, (vh - h) / 2);
    return Math.max(0, Math.round(y));
  }

  // Recompute targets on resize / content shifts
  let targets = [];
  function recomputeTargets() { targets = pageEls.map(targetYFor); }
  recomputeTargets();
  window.addEventListener('load', recomputeTargets);
  window.addEventListener('resize', () => { 
    // debounce a tad for layout reflow
    clearTimeout(recomputeTargets._t);
    recomputeTargets._t = setTimeout(recomputeTargets, 60);
  });

  // Find nearest page index to a given scrollY
  function nearestIndex(y) {
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < targets.length; i++) {
      const d = Math.abs(y - targets[i]);
      if (d < bestDist) { best = i; bestDist = d; }
    }
    return best;
  }

  // Smooth scroll helper with reentrancy guard
  let animating = false;
  function scrollToIndex(i) {
    i = Math.max(0, Math.min(i, targets.length - 1));
    animating = true;
    window.scrollTo({ top: targets[i], behavior: 'smooth' });
    // unlock after scrolling settles
    const start = performance.now();
    const settleCheck = () => {
      // If near target or enough time passed, release the lock
      const near = Math.abs(window.scrollY - targets[i]) < 2;
      if (near || performance.now() - start > 900) {
        animating = false;
        currentIndex = i;
      } else {
        requestAnimationFrame(settleCheck);
      }
    };
    requestAnimationFrame(settleCheck);
  }

  // Track which page we're on (by nearest center)
  let currentIndex = nearestIndex(window.scrollY);

  // Update currentIndex on scroll (but don’t trigger snaps here)
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (animating) return;
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(() => {
        currentIndex = nearestIndex(window.scrollY);
        scrollTicking = false;
      });
    }
  }, { passive: true });

  // Wheel/touch handling with threshold + release snap
  const THRESH_VH = 0.22;               // how “big” a scroll must be to move pages (~22% of viewport)
  const RELEASE_MS = 140;               // considered “release” if no wheel for this long
  const MIN_DELTA_TO_MOVE = () => window.innerHeight * THRESH_VH;

  let wheelAccum = 0;
  let lastWheelTs = 0;
  let releaseTimer = null;

  function onReleaseDecision() {
    if (animating) return;

    const abs = Math.abs(wheelAccum);
    const wantNext = wheelAccum > 0;
    const wantPrev = wheelAccum < 0;
    const threshold = MIN_DELTA_TO_MOVE();

    if (abs >= threshold) {
      // big scroll → advance one page in the scroll direction
      const nextIdx = wantNext ? currentIndex + 1 : currentIndex - 1;
      scrollToIndex(nextIdx);
    } else {
      // small scroll → snap back to current page center
      scrollToIndex(currentIndex);
    }
    wheelAccum = 0;
  }

  function scheduleReleaseDecision() {
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      // treat as release if no wheel for RELEASE_MS
      if (performance.now() - lastWheelTs >= RELEASE_MS) {
        onReleaseDecision();
      }
    }, RELEASE_MS + 10);
  }

  // Wheel (mouse/trackpad)
  window.addEventListener('wheel', (e) => {
    if (animating) { e.preventDefault(); return; }
    // don’t interfere while the video modal is open or age/intro overlays are active
    if (document.body.classList.contains('video-open') ||
        document.body.classList.contains('gate-active') ||
        document.body.classList.contains('intro-active')) {
      return;
    }

    wheelAccum += e.deltaY;
    lastWheelTs = performance.now();

    // If you already exceeded threshold mid-gesture, commit immediately
    if (Math.abs(wheelAccum) >= MIN_DELTA_TO_MOVE()) {
      onReleaseDecision();
    } else {
      scheduleReleaseDecision();
    }
  }, { passive: true });

  // Touch (mobile) – handle swipe distance
  let touchStartY = null;
  window.addEventListener('touchstart', (e) => {
    if (animating) return;
    if (e.touches && e.touches.length) {
      touchStartY = e.touches[0].clientY;
      wheelAccum = 0;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (animating || touchStartY == null) return;
    const y = e.touches[0].clientY;
    // invert so dragging up (swipe up) → positive (like wheel down)
    wheelAccum = touchStartY - y;
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (animating) return;
    onReleaseDecision();
    touchStartY = null;
  });

  // Keyboard helpers (PageUp/PageDown/Home/End/Space)
  window.addEventListener('keydown', (e) => {
    if (animating) return;
    if (document.body.classList.contains('video-open')) return;

    let handled = true;
    if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
      scrollToIndex(currentIndex + 1);
    } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
      scrollToIndex(currentIndex - 1);
    } else if (e.key === 'Home') {
      scrollToIndex(0);
    } else if (e.key === 'End') {
      scrollToIndex(targets.length - 1);
    } else {
      handled = false;
    }
    if (handled) e.preventDefault();
  });

  // Make navbar anchors snap to the centered target instead of default browser anchor position
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      recomputeTargets(); // in case layout changed
      const idx = pageEls.indexOf(el);
      if (idx >= 0) scrollToIndex(idx);
    });
  });

  // On load, if there’s a hash, center it; otherwise snap to nearest
  window.addEventListener('load', () => {
    const id = (location.hash || '').replace('#','');
    if (id) {
      const i = pageEls.findIndex(el => el.id === id);
      if (i >= 0) scrollToIndex(i);
    } else {
      scrollToIndex(nearestIndex(window.scrollY));
    }
  });
})();

// ===== About Timeline (click to reveal, no borders) =====
function initSliderTimeline() {
  const root = document.getElementById('aboutTimeline');
  if (!root) return;

  const cards  = Array.from(root.querySelectorAll('.rt-card'));
  const slider = root.querySelector('#tlSlider');
  const rangeWrap = root.querySelector('.rt-range-wrap');
  const trackFill = rangeWrap ? rangeWrap.querySelector('.rt-fill') : null;

  const labels = ['Nov 2010', 'Mar 2024', 'Aug 2025', 'Oct 2025'];
  // Build marks so they align with the slider's real 0%..100% endpoints
  const marksWrap = root.querySelector('.rt-marks');
  if (marksWrap) {
    marksWrap.innerHTML = '';
    labels.forEach((txt, i) => {
      const span = document.createElement('span');
      span.className = 'rt-mark' + (i === 0 ? ' edge-start' : (i === labels.length - 1 ? ' edge-end' : ''));
      span.textContent = txt;
      const pct = (i / (labels.length - 1)) * 100;   // 0, 33.333..., 66.666..., 100
      span.style.left = pct + '%';
      marksWrap.appendChild(span);
    });
  }

  // Fix the slider near the bottom of the window (not touching)
  const sliderEl = root.querySelector('.rt-slider');
  if (sliderEl) {
    sliderEl.style.position = 'fixed';
    sliderEl.style.left = '50%';
    sliderEl.style.bottom = '32px';     // adjust gap from window edge here
    sliderEl.style.transform = 'translateX(-50%)';
    sliderEl.style.zIndex = '999';
    sliderEl.style.width = 'min(1400px, 96vw)'; // longer slider
    sliderEl.style.pointerEvents = 'auto';
  }

  // === Align cards so their titles sit right below the "Lore" H1 ===
  function setCardsTop() {
    const about = document.getElementById('about');
    const h1 = about ? about.querySelector('h1') : null;
    if (!h1) { root.style.setProperty('--cardsTop', '110px'); return; }

    // Compute: distance from #aboutTimeline top to H1 bottom + a gap (e.g., 12px)
    const timelineTop = root.getBoundingClientRect().top + window.scrollY;
    const h1Bottom = h1.getBoundingClientRect().bottom + window.scrollY;
    const gap = 12; // pixels below the Lore title
    const topPx = Math.max(40, Math.round(h1Bottom - timelineTop + gap));
    root.style.setProperty('--cardsTop', topPx + 'px');
  }

  // Recompute on load & resize (layout-safe)
  window.addEventListener('load', setCardsTop);
  window.addEventListener('resize', () => { setTimeout(setCardsTop, 60); });
  // Initial compute
  setCardsTop();

  // === Accessibility label ===
  function setAria(now) {
    if (!slider) return;
    slider.setAttribute('aria-valuenow', String(now));
    const i = Math.floor(now);
    const frac = now - i;
    let txt = labels[Math.min(Math.max(0, Math.round(now)), labels.length - 1)] || '';
    if (frac > 0.33 && frac < 0.66 && i < labels.length - 1) {
      txt = `${labels[i]} … ${labels[i + 1]}`;
    }
    slider.setAttribute('aria-valuetext', txt);
  }

  // === Animate glowing fill width ===
  function setFillWidth(val) {
    if (!trackFill) return;
    const pct = Math.max(0, Math.min(1, val / (cards.length - 1))) * 100;
    trackFill.style.setProperty('--v', pct.toFixed(2) + '%');
  }

  // === Show relevant card(s) ===
  function showForValue(v) {
    cards.forEach(c => c.classList.remove('is-open', 'dim'));

    const i = Math.floor(v);
    const frac = v - i;

    const open = (idx, dim = false) => {
      const c = cards[idx];
      if (!c) return;
      c.classList.add('is-open');
      if (dim) c.classList.add('dim');
    };

    // One card when near a milestone; two dimmed when between
    if (frac <= 0.33 || i === cards.length - 1) {
      open(Math.min(i, cards.length - 1), false);
    } else if (frac >= 0.66) {
      open(Math.min(i + 1, cards.length - 1), false);
    } else {
      open(i, true);
      if (i + 1 < cards.length) open(i + 1, true);
    }

    setAria(v);
    setFillWidth(v);
  }

  if (slider) {
    slider.addEventListener('input', (e) => {
      const v = Math.max(0, Math.min(cards.length - 1, parseFloat(e.target.value) || 0));
      showForValue(v);
    });

    // Initial render
    const v0 = parseFloat(slider.value) || 0;
    showForValue(v0);
  }
}

document.addEventListener('DOMContentLoaded', initSliderTimeline);


document.addEventListener('DOMContentLoaded', initSliderTimeline);

// ===================== I18N: EN <-> ZH Toggle =====================
(function initI18N() {
  const BTN = document.getElementById('langToggle');
  const ICON = document.getElementById('langIcon');
  if (!BTN || !ICON) return;

  // Utility to mark elements once with original text so we can restore on toggle
  function storeOriginal(el, prop = 'textContent') {
    if (!el) return;
    if (el.dataset.i18nOrig == null) el.dataset.i18nOrig = (el[prop] ?? '').trim();
  }
  function restoreOriginal(el, prop = 'textContent') {
    if (!el) return;
    if (el.dataset.i18nOrig != null) el[prop] = el.dataset.i18nOrig;
  }

  // Map of elements to translate. Each entry: [selector, property, zhText]
  // NOTE: We store originals on first run; when switching back to EN we restore.
  const targets = [
    // Navbar
    ['.nav-links a[href="#about"]', 'textContent', '传说'],
    ['.nav-links a[href="#roadmap"]', 'textContent', '路线图'],
    ['.nav-links a[href="#howtobuy"]', 'textContent', '联系我们'],
    ['.nav-links .nav-disabled:nth-of-type(1)', 'textContent', '画廊（敬请期待）'],
    ['.nav-links .nav-disabled:nth-of-type(2)', 'textContent', '头像生成器（敬请期待）'],
    ['.nav-links .nav-disabled:nth-of-type(3)', 'textContent', '肛塞寻宝（敬请期待）'],

    // Contract label
    ['.contract-address .ca-label', 'textContent', '合约：'],

    // Map legend
    ['#mapLegend .legend-item:nth-child(1) span', 'textContent', '100万+ 次观看'],
    ['#mapLegend .legend-item:nth-child(2) span', 'textContent', '少于 100万 次观看'],

    // Sections titles
    ['#about h1', 'textContent', '传说'],
    ['#roadmap h1', 'textContent', '路线图'],
    ['#howtobuy h1', 'textContent', '联系我们'],

    // About timeline slider marks (bottom labels)
    ['#aboutTimeline .rt-marks span:nth-child(1)', 'textContent', '2010年11月'],
    ['#aboutTimeline .rt-marks span:nth-child(2)', 'textContent', '2024年3月'],
    ['#aboutTimeline .rt-marks span:nth-child(3)', 'textContent', '2025年8月'],
    ['#aboutTimeline .rt-marks span:nth-child(4)', 'textContent', '2025年10月'],

    // About timeline cards (titles + bodies)
    ['#card-t1 h3', 'textContent', '超前的英雄'],
    ['#card-t1 p', 'textContent', '大都会超人（Metroman）由布拉德·皮特配音，是《超级大坏蛋》与《超级大坏蛋2》中的英雄，也是梦工厂最具代表性的角色之一。2010年11月上映的首部电影全球票房超过3.61亿美元，在Z世代童年记忆中留下深刻印记。超人的设定与张力远超时代，为随后十年的动画超级英雄定下了新标杆。'],

    ['#card-t2 h3', 'textContent', '烂到极致便是神'],
    ['#card-t2 p', 'textContent', '14年后，《超级大坏蛋2》（2024）以6%的烂番茄新低“出圈”，并非靠口碑而是靠梗文化复活。它“烂”得超越批评，成为网络恶搞的神作：二创与迷因层出不穷，观众在吐槽中狂欢，把影院失利变成了互联网的狂欢祭。'],

    ['#card-t3 h3', 'textContent', '从扑街到爆红——英语圈的病毒式传播'],
    ['#card-t3 p', 'textContent', '最初只有几秒的“超人舞”，在英语互联网迅速走红。剪辑与鬼畜洗版YouTube与TikTok，夸张其“神级律动”与“稳如泰山”气场。很快，它从玩笑变成线下潮流，派对与漫展纷纷复刻动作。相关视频累计播放已超千万，Metroman不只是梗，而是“超级梗”。'],

    ['#card-t4 h3', 'textContent', '中国接力'],
    ['#card-t4 p', 'textContent', '10月，一段“超人劈公交”的中文配音在社媒炸裂，引发全国范围的省份方言二创风潮，只有本地人才真正懂梗。无数视频破圈、甚至激发了Cosplay复刻。此刻，Metroman正处于迷因巅峰，开始“国家级”接管。'],

    // Roadmap phase labels and text (shortened to keep it readable)
    ['#roadmap .phase-card[data-phase="1"] .phase-label', 'textContent', '阶段一：社区建设'],
    ['#roadmap .phase-card[data-phase="1"] p', 'textContent', '万物起于人。通过透明、信任与梗文化，连接中英双语社群，用创意与幽默搭桥，汇聚早期信徒，打牢社交土壤。'],

    ['#roadmap .phase-card[data-phase="2"] .phase-label', 'textContent', '阶段二：持续打磨'],
    ['#roadmap .phase-card[data-phase="2"] p', 'textContent', '强化代币实用性、升级网站、上线互动小游戏（BNB奖励）。从“梗”成长为可持续的生态，让玩家、持有者与粉丝持续参与。'],

    ['#roadmap .phase-card[data-phase="3"] .phase-label', 'textContent', '阶段三：营销与扩张'],
    ['#roadmap .phase-card[data-phase="3"] p', 'textContent', '通过联动、病毒传播与配音合作，铺满整张“Metroman地图”。把他从加密圈带向更广阔的互联网文化。'],

    ['#roadmap .phase-card[data-phase="4"] .phase-label', 'textContent', '阶段四：全球统治'],
    ['#roadmap .phase-card[data-phase="4"] p', 'textContent', '传奇升空，BNB随风而来。Metroman渗透梗、音乐、服饰与数字艺术，成为“用幽默连接世界”的象征。'],

    // Contact section
    ['#howtobuy .x-link', 'aria-label', '前往 Metroman 的 X 页面'],

    // Modal
    ['#modalTitle', 'textContent', '播放中…'],
    ['#modalCredit #creditText', 'textContent', '在哔哩哔哩观看'],

    // Age gate
    ['#ageDesc', 'textContent', '本网站包含可能涉及毒品、性行为、性侵犯、兽交、恐同、种族歧视或性别歧视等内容。'],
    ['.age-danger', 'textContent', '这不是一个适合儿童的网站。'],
    ['.age-instruction', 'textContent', '按下 Enter 或点击确认您已年满18岁。'],
    ['#ageContinue', 'textContent', '我已年满18岁'],
    ['.age-hint', 'textContent', '按回车键 ↵'],

    // Toggle ARIA labels
    ['#floatToggle', 'title', '切换漂浮物'],
    ['#musicToggle', 'title', '切换背景音乐'],
    ['#langToggle', 'title', '切换语言'],
  ];

  // Translate attribute helper
  function setProp(el, prop, value) {
    if (!el) return;
    if (prop === 'textContent') el.textContent = value;
    else el.setAttribute(prop, value);
  }

  function applyZH() {
    targets.forEach(([sel, prop, zh]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      // Store original before overwriting
      if (prop === 'textContent') storeOriginal(el, 'textContent'); else storeOriginal(el, 'data-'+prop);
      setProp(el, prop, zh);
    });

    // Update slider ARIA text to Chinese
    const slider = document.getElementById('tlSlider');
    if (slider) {
      slider.setAttribute('aria-valuetext', '2010年11月');
    }

    // Legend icon alts (optional)
    const premiumAlt = document.querySelector('.map-legend .legend-item:nth-child(1) img');
    const normalAlt  = document.querySelector('.map-legend .legend-item:nth-child(2) img');
    if (premiumAlt) premiumAlt.alt = '高级 M（100万+ 次观看）';
    if (normalAlt)  normalAlt.alt  = '普通 M（少于 100万 次观看）';

    // Button face: show “EN” when Chinese is active
    const ICON = document.getElementById('langIcon');
    if (ICON) ICON.textContent = 'EN';
    BTN.setAttribute('aria-label', '切换为英文');
    document.documentElement.setAttribute('lang', 'zh-CN');
  }

  function applyEN() {
    targets.forEach(([sel, prop]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      restoreOriginal(el, prop === 'textContent' ? 'textContent' : ('data-'+prop));
      if (prop !== 'textContent' && el.dataset.i18nOrig != null) {
        // restore attribute
        el.setAttribute(prop, el.dataset.i18nOrig);
      }
    });

    // Slider ARIA text back to original (best effort)
    const slider = document.getElementById('tlSlider');
    if (slider) {
      slider.setAttribute('aria-valuetext', 'Nov 2010');
    }

    // Legend alts best effort
    const premiumAlt = document.querySelector('.map-legend .legend-item:nth-child(1) img');
    const normalAlt  = document.querySelector('.map-legend .legend-item:nth-child(2) img');
    if (premiumAlt && premiumAlt.dataset.i18nOrig) premiumAlt.alt = premiumAlt.dataset.i18nOrig;
    if (normalAlt  && normalAlt.dataset.i18nOrig)  normalAlt.alt  = normalAlt.dataset.i18nOrig;

    // Button face: show “中” when English is active
    const ICON = document.getElementById('langIcon');
    if (ICON) ICON.textContent = '中';
    BTN.setAttribute('aria-label', 'Switch to Chinese');
    document.documentElement.setAttribute('lang', 'en');
    // Explicit EN fallbacks for Phase labels (prevents empty text on toggle back)
const EN_PHASE_LABELS = [
    ['#roadmap .phase-card[data-phase="1"] .phase-label', 'Phase 1 – Community Building:'],
    ['#roadmap .phase-card[data-phase="2"] .phase-label', 'Phase 2 – Continual Development:'],
    ['#roadmap .phase-card[data-phase="3"] .phase-label', 'Phase 3 – Marketing & Expansion:'],
    ['#roadmap .phase-card[data-phase="4"] .phase-label', 'Phase 4 – Global Domination:'],
];

  }

  function setLang(lang) {
    if (lang === 'zh') applyZH(); else applyEN();
    localStorage.setItem('metroman_lang', lang);
  }

  // Initialize, honoring saved preference
  const saved = localStorage.getItem('metroman_lang');
  if (saved === 'zh') setLang('zh'); else setLang('en');

  BTN.addEventListener('click', () => {
    const current = localStorage.getItem('metroman_lang') || 'en';
    setLang(current === 'zh' ? 'en' : 'zh');
  });
})();