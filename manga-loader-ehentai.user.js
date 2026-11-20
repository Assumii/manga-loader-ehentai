// ==UserScript==
// @name         Manga Loader (E-Hentai / ExHentai 复活版)
// @namespace    https://github.com/Assumii/manga-loader-ehentai
// @version      2.1.0
// @description  基于经典 Manga Loader 重构并深度适配 E-Hentai / ExHentai：瀑布流连续阅读、滑动窗口预加载(40P初始/剩10P续20P)、随滚动显隐顶栏、真 nl 换源重试、509 配额检测、缩放与适应模式、自定义快捷键与多套 CSS 配置
// @author       Assumii (refactored from fuzetsu/manga-loader)
// @homepageURL  https://github.com/Assumii/manga-loader-ehentai
// @supportURL   https://github.com/Assumii/manga-loader-ehentai/issues
// @downloadURL  https://raw.githubusercontent.com/Assumii/manga-loader-ehentai/main/manga-loader-ehentai.user.js
// @updateURL    https://raw.githubusercontent.com/Assumii/manga-loader-ehentai/main/manga-loader-ehentai.user.js
// @copyright    2016+, fuzetsu; 2026+, Assumii
// @noframes
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @match        *://e-hentai.org/s/*/*
// @match        *://exhentai.org/s/*/*
// @match        *://e-hentai.org/g/*/*
// @match        *://exhentai.org/g/*/*
// ==/UserScript==

(function () {
  'use strict';

  var W = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
  var SCRIPT_NAME = 'Manga Loader EH';

  // =========================================================================
  // 内联 SVG 图标（彻底替代已失效的 FontAwesome 4.3 CDN）
  // =========================================================================
  var ICONS = {
    info: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>',
    stats: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.06 7.06 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54a7.06 7.06 0 0 0-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58a7.43 7.43 0 0 0-.05.94 7.43 7.43 0 0 0 .05.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32a.49.49 0 0 0 .59.22l2.39-.96a7.06 7.06 0 0 0 1.62.94l.36 2.54a.48.48 0 0 0 .48.41h3.84a.48.48 0 0 0 .48-.41l.36-2.54a7.06 7.06 0 0 0 1.62-.94l2.39.96a.49.49 0 0 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6a5.9 5.9 0 0 1 4.22 1.78L13 11h7V4z"/></svg>',
    fit: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M4 5h6v2H6v4H4V5zm16 0v6h-2V7h-4V5h6zM4 19v-6h2v4h4v2H4zm16 0h-6v-2h4v-4h2v6z"/></svg>',
    top: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>',
    gallery: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 5h6v6H3V5zm0 8h6v6H3v-6zm8-8h10v2H11V5zm0 4h10v2H11V9zm0 4h10v2H11v-2zm0 4h10v2H11v-2z"/></svg>'
  };

  // =========================================================================
  // 存储与通用工具函数
  // =========================================================================
  function log(msg, type) {
    type = type || 'log';
    try {
      console[type]('%c[' + SCRIPT_NAME + ']', 'font-weight:bold;color:#4caf50;', msg);
    } catch (e) {}
  }

  function storeGet(key, fallback) {
    var raw;
    try {
      if (typeof GM_getValue !== 'undefined') {
        raw = GM_getValue(key);
      } else {
        raw = localStorage.getItem(key);
      }
    } catch (e) {
      return fallback;
    }
    if (raw === undefined || raw === null) return fallback;
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return raw;
    }
  }

  function storeSet(key, value) {
    var serialized = JSON.stringify(value);
    try {
      if (typeof GM_setValue !== 'undefined') {
        GM_setValue(key, serialized);
      } else {
        localStorage.setItem(key, serialized);
      }
    } catch (e) {}
  }

  function storeDel(key) {
    try {
      if (typeof GM_deleteValue !== 'undefined') {
        GM_deleteValue(key);
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {}
  }

  function getEl(q, c) {
    return (c || document).querySelector(q);
  }

  function getEls(q, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(q));
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function throttle(fn, limit) {
    var lastCall = 0;
    var timer = null;
    return function () {
      var now = Date.now();
      var ctx = this;
      var args = arguments;
      var remaining = limit - (now - lastCall);
      if (remaining <= 0) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        lastCall = now;
        fn.apply(ctx, args);
      } else if (!timer) {
        timer = setTimeout(function () {
          lastCall = Date.now();
          timer = null;
          fn.apply(ctx, args);
        }, remaining);
      }
    };
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stripQueryAndHash(url) {
    if (!url) return '';
    try {
      var u = new URL(url, location.href);
      return u.origin + u.pathname;
    } catch (e) {
      return url.split('#')[0].split('?')[0];
    }
  }

  function extractGidFromUrl(url) {
    var m = String(url || '').match(/\/(?:g|s\/[0-9a-f]+)\/(\d+)/i);
    return m ? m[1] : '';
  }

  function is509Image(src) {
    return !!src && /\/509s?\.gif(\?|$)/i.test(src);
  }

  function buildNlUrl(basePageUrl, nlHistory) {
    var clean = stripQueryAndHash(basePageUrl);
    if (!nlHistory || !nlHistory.length) return clean;
    var query = nlHistory.map(function (tok) {
      return 'nl=' + encodeURIComponent(tok);
    }).join('&');
    return clean + '?' + query;
  }

  function keyCodeToLabel(code) {
    var map = {
      8: 'Backspace', 9: 'Tab', 13: 'Enter', 27: 'Esc', 32: 'Space',
      33: 'PgUp', 34: 'PgDn', 35: 'End', 36: 'Home',
      37: '←', 38: '↑', 39: '→', 40: '↓',
      48: '0', 49: '1', 50: '2', 51: '3', 52: '4',
      53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
      61: '+', 107: 'Num+', 109: 'Num-', 173: '-', 187: '+/=', 189: '-'
    };
    if (map[code]) return map[code];
    if (code >= 65 && code <= 90) return String.fromCharCode(code);
    if (code >= 112 && code <= 123) return 'F' + (code - 111);
    return 'Key(' + code + ')';
  }

  // =========================================================================
  // 默认配置与读写
  // =========================================================================
  var DEFAULT_KEYS = {
    EXIT: 88,          // X
    GALLERY: 71,       // G
    SCROLL_UP: 87,     // W
    SCROLL_DOWN: 83,   // S
    PREV_PAGE: 37,     // ←
    NEXT_PAGE: 39,     // →
    ZOOM_IN: typeof InstallTrigger !== 'undefined' ? 61 : 187,   // +
    ZOOM_OUT: typeof InstallTrigger !== 'undefined' ? 173 : 189, // -
    RESET_ZOOM: 48,    // 0
    RELOAD_CUR: 82     // R
  };

  var KEY_LABELS = {
    EXIT: '退出瀑布流 (回到当前页)',
    GALLERY: '返回画廊详情页',
    SCROLL_UP: '向上滚动',
    SCROLL_DOWN: '向下滚动',
    PREV_PAGE: '跳到上一页',
    NEXT_PAGE: '跳到下一页',
    ZOOM_IN: '放大图片',
    ZOOM_OUT: '缩小图片',
    RESET_ZOOM: '重置缩放',
    RELOAD_CUR: '换源刷新当前页'
  };

  function getSettings() {
    var savedKeys = storeGet('ml-eh-keys', {});
    var keys = Object.assign({}, DEFAULT_KEYS);
    Object.keys(DEFAULT_KEYS).forEach(function (k) {
      if (typeof savedKeys[k] === 'number' && !isNaN(savedKeys[k])) {
        keys[k] = savedKeys[k];
      }
    });

    var initLoadRaw = storeGet('ml-eh-init-load', 40);
    var initialLoadNum = String(initLoadRaw).toLowerCase() === 'all' ? 'all' : (parseInt(initLoadRaw, 10) || 40);
    if (initialLoadNum !== 'all' && initialLoadNum < 1) initialLoadNum = 40;

    var batchLoadNum = parseInt(storeGet('ml-eh-batch-load', 20), 10);
    if (isNaN(batchLoadNum) || batchLoadNum < 1) batchLoadNum = 20;

    var preloadTriggerRemaining = parseInt(storeGet('ml-eh-trigger-rem', 10), 10);
    if (isNaN(preloadTriggerRemaining) || preloadTriggerRemaining < 0) preloadTriggerRemaining = 10;

    var delayMs = parseInt(storeGet('ml-eh-delay', 300), 10);
    if (isNaN(delayMs) || delayMs < 50) delayMs = 300;

    var gapPx = parseInt(storeGet('ml-eh-gap', 8), 10);
    if (isNaN(gapPx) || gapPx < 0) gapPx = 8;

    return {
      autoload: !!storeGet('ml-eh-autoload', false),
      initialLoadNum: initialLoadNum,
      batchLoadNum: batchLoadNum,
      preloadTriggerRemaining: preloadTriggerRemaining,
      delayMs: delayMs,
      fitMode: storeGet('ml-eh-fitmode', 'default'), // default | width | height | original
      gapPx: gapPx,
      showMeta: storeGet('ml-eh-showmeta', true) !== false,
      autoNlRetry: storeGet('ml-eh-autonl', true) !== false,
      maxNlRetry: 2,
      keys: keys
    };
  }

  function getCssProfiles() {
    var profiles = storeGet('ml-eh-css-profiles', null);
    if (!Array.isArray(profiles) || profiles.length === 0) {
      profiles = [
        { name: 'Default', css: '' },
        { name: '纯黑无缝条漫', css: 'body { background: #000 !important; }\n.ml-page-wrap { margin-bottom: 0 !important; }\n.ml-page-bar { display: none !important; }\n.ml-images img { width: 100%; max-width: 960px; }' }
      ];
      storeSet('ml-eh-css-profiles', profiles);
    }
    return profiles;
  }

  function getCurrentCssProfileName() {
    return storeGet('ml-eh-css-current', 'Default') || 'Default';
  }

  // =========================================================================
  // E-Hentai / ExHentai 页面 DOM 解析器
  // =========================================================================
  function parseNlToken(doc, rawHtml) {
    var loadfail = doc.querySelector('#loadfail');
    var onclick = loadfail ? loadfail.getAttribute('onclick') : '';
    var m = onclick && onclick.match(/nl\(\s*['"]([^'"]+)['"]\s*\)/);
    if (m) return m[1];

    var img = doc.querySelector('#img');
    var onerror = img ? img.getAttribute('onerror') : '';
    m = onerror && onerror.match(/nl\(\s*['"]([^'"]+)['"]\s*\)/);
    if (m) return m[1];

    if (rawHtml) {
      m = rawHtml.match(/nl\(\s*['"]([^'"]+)['"]\s*\)/);
      if (m) return m[1];
    }
    return null;
  }

  function detectBlockReason(doc, rawHtml) {
    var text = ((doc.body && doc.body.textContent) || rawHtml || '').trim();
    if (/temporarily banned|excessive/i.test(text)) {
      return 'E-Hentai 返回限流/临时封禁提示，已自动停止加载以保护账号与 IP：' + text.slice(0, 180);
    }
    if (/your ip address has been/i.test(text)) {
      return 'E-Hentai 返回 IP 访问限制提示，已自动停止加载：' + text.slice(0, 180);
    }
    if (/sad panda|gallery not available/i.test(text)) {
      return '当前画廊不可访问或需要重新登录。';
    }
    return null;
  }

  function parsePageDoc(doc, pageUrl, rawHtml) {
    var cleanPageUrl = stripQueryAndHash(pageUrl);
    var imgEl = doc.querySelector('#img');
    var imgSrc = imgEl ? imgEl.getAttribute('src') : null;

    if (!imgSrc) {
      var reason = detectBlockReason(doc, rawHtml);
      return {
        ok: false,
        blocked: !!reason,
        error: reason || '未能在页面中解析到图片节点 (#img)'
      };
    }

    // 页码解析：优先 #i2 .sn > div > span，其次 URL 末尾 -(\d+)
    var curPage = null;
    var numPages = null;
    var pageSpans = doc.querySelectorAll('#i2 .sn > div > span, div.sn > div > span');
    if (pageSpans.length >= 2) {
      curPage = parseInt(pageSpans[0].textContent, 10);
      numPages = parseInt(pageSpans[1].textContent, 10);
    }
    if (!curPage || isNaN(curPage)) {
      var urlMatch = cleanPageUrl.match(/-(\d+)$/);
      curPage = urlMatch ? parseInt(urlMatch[1], 10) : 1;
    }
    if (isNaN(numPages)) numPages = null;

    // 下一页链接
    var nextAnchor = doc.querySelector('#next') || doc.querySelector('#i3 > a');
    var nextHref = nextAnchor ? nextAnchor.getAttribute('href') : null;
    var nextUrl = null;
    if (nextHref) {
      try {
        nextUrl = stripQueryAndHash(new URL(nextHref, cleanPageUrl).href);
      } catch (e) {
        nextUrl = null;
      }
    }
    // 到达最后一页判断：页码相等或 nextUrl 指向本页自身
    if ((numPages && curPage >= numPages) || (nextUrl && nextUrl === cleanPageUrl)) {
      nextUrl = null;
    }

    // 首页链接与画廊链接
    var firstAnchor = doc.querySelector('#i2 .sn > a:first-child, div.sn > a:first-child');
    var firstUrl = null;
    if (firstAnchor && firstAnchor.getAttribute('href')) {
      try {
        firstUrl = stripQueryAndHash(new URL(firstAnchor.getAttribute('href'), cleanPageUrl).href);
      } catch (e) {}
    }

    var galleryAnchor = doc.querySelector('#i5 .sb a, #i5 a[href*="/g/"]');
    var galleryUrl = null;
    if (galleryAnchor && galleryAnchor.getAttribute('href')) {
      try {
        galleryUrl = new URL(galleryAnchor.getAttribute('href'), cleanPageUrl).href;
      } catch (e) {}
    }

    // 文件名与分辨率元信息
    var metaText = '';
    var i2Divs = doc.querySelectorAll('#i2 > div');
    for (var i = 0; i < i2Divs.length; i++) {
      if (!i2Divs[i].classList.contains('sn')) {
        metaText = i2Divs[i].textContent.trim();
        break;
      }
    }

    // 原图链接（如果页面存在）
    var origAnchor = doc.querySelector('#i6 a[href*="/fullimg/"], #i7 a[href*="/fullimg/"]');
    var origUrl = origAnchor ? origAnchor.getAttribute('href') : null;
    if (origUrl) {
      try {
        origUrl = new URL(origUrl, cleanPageUrl).href;
      } catch (e) {}
    }

    // 原始宽高提示
    var widthHint = 0;
    var heightHint = 0;
    var imgStyle = imgEl.getAttribute('style') || '';
    var wm = imgStyle.match(/width\s*:\s*(\d+)px/i);
    var hm = imgStyle.match(/height\s*:\s*(\d+)px/i);
    if (wm) widthHint = parseInt(wm[1], 10);
    if (hm) heightHint = parseInt(hm[1], 10);

    var titleEl = doc.querySelector('#i1 h1');
    var title = (titleEl && titleEl.textContent.trim()) || doc.title || 'E-Hentai';

    return {
      ok: true,
      pageUrl: cleanPageUrl,
      imgSrc: imgSrc,
      is509: is509Image(imgSrc),
      nlToken: parseNlToken(doc, rawHtml),
      curPage: curPage,
      numPages: numPages,
      nextUrl: nextUrl,
      firstUrl: firstUrl,
      galleryUrl: galleryUrl,
      metaText: metaText,
      origUrl: origUrl,
      widthHint: widthHint,
      heightHint: heightHint,
      title: title
    };
  }

  function fetchAndParsePage(url, maxRetries) {
    maxRetries = typeof maxRetries === 'number' ? maxRetries : 3;
    var attempt = 0;

    function doFetch() {
      attempt += 1;
      return fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store'
      }).then(function (resp) {
        if ((resp.status === 503 || resp.status === 429 || resp.status === 502 || resp.status === 504) && attempt <= maxRetries) {
          var backoff = attempt * 1500;
          log('HTTP ' + resp.status + '，' + backoff + 'ms 后重试 (' + attempt + '/' + maxRetries + '): ' + url, 'warn');
          return sleep(backoff).then(doFetch);
        }
        if (!resp.ok) {
          return { ok: false, blocked: false, error: 'HTTP ' + resp.status + ' 请求失败' };
        }
        return resp.text().then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          return parsePageDoc(doc, url, html);
        });
      }).catch(function (err) {
        if (attempt <= maxRetries) {
          return sleep(attempt * 1200).then(doFetch);
        }
        return { ok: false, blocked: false, error: '网络错误: ' + (err && err.message ? err.message : String(err)) };
      });
    }

    return doFetch();
  }

  // =========================================================================
  // 样式管理器
  // =========================================================================
  var styleMap = {};
  function setStyle(id, cssText) {
    if (!styleMap[id] || !document.head.contains(styleMap[id])) {
      var el = document.createElement('style');
      el.dataset.name = 'ml-eh-style-' + id;
      document.head.appendChild(el);
      styleMap[id] = el;
    }
    styleMap[id].textContent = cssText || '';
  }

  // =========================================================================
  // 画廊详情页 (/g/...)：注入「瀑布流连续阅读」快捷入口
  // =========================================================================
  function initGalleryPage() {
    var firstThumb = getEl('#gdt a[href*="/s/"]');
    if (!firstThumb) return;

    var firstPageUrl = firstThumb.href;
    var gid = extractGidFromUrl(location.href) || extractGidFromUrl(firstPageUrl);
    var isFirstListPage = !/[?&]p=[1-9]/.test(location.search);
    var labelText = isFirstListPage ? '瀑布流连续阅读 (Manga Loader)' : '从本页首图开始瀑布流阅读';

    function launchWaterfall(e) {
      if (e) e.preventDefault();
      storeSet('ml-eh-once-autoload', { gid: gid, expire: Date.now() + 30000 });
      location.href = firstPageUrl;
    }

    // 1. 注入到画廊右侧操作栏 #gd5
    var gd5 = getEl('#gd5');
    if (gd5 && !getEl('#ml-eh-gd5-link')) {
      var p = document.createElement('p');
      p.className = 'g2';
      p.id = 'ml-eh-gd5-link';
      var existIcon = getEl('img', gd5);
      var iconHtml = existIcon && existIcon.src
        ? '<img src="' + escapeHtml(existIcon.src) + '" alt="" /> '
        : '';
      p.innerHTML = iconHtml + '<a href="' + escapeHtml(firstPageUrl) + '" style="font-weight:bold;color:#ff9800;">' + escapeHtml(labelText) + '</a>';
      p.querySelector('a').addEventListener('click', launchWaterfall);
      gd5.insertBefore(p, gd5.firstChild);
    }

    // 2. 右下角轻量悬浮按钮 + Ctrl+, 快捷键
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = isFirstListPage ? '瀑布流阅读' : '从本页开始瀑布流';
    btn.title = '使用 Manga Loader 连续瀑布流阅读本画廊 (Ctrl + ,)';
    btn.setAttribute('style', [
      'position:fixed', 'bottom:16px', 'right:16px', 'z-index:999999',
      'background:#232733', 'color:#f5f5f5', 'border:1px solid #4c566a',
      'border-radius:8px', 'padding:8px 14px', 'font:600 13px/1.2 system-ui,-apple-system,sans-serif',
      'cursor:pointer', 'box-shadow:0 4px 14px rgba(0,0,0,0.45)', 'transition:background .15s,transform .15s'
    ].join(';'));
    btn.addEventListener('mouseenter', function () { btn.style.background = '#2e3446'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = '#232733'; });
    btn.addEventListener('click', launchWaterfall);
    document.body.appendChild(btn);

    window.addEventListener('keydown', function (e) {
      if (e.ctrlKey && !e.altKey && !e.shiftKey && e.keyCode === 188) {
        e.preventDefault();
        launchWaterfall();
      }
    });
  }

  // =========================================================================
  // 瀑布流阅读器核心 (/s/...)
  // =========================================================================
  function cleanOriginalSiteHandlers() {
    try { W.onresize = null; } catch (e) {}
    try { W.onpopstate = null; } catch (e) {}
    try { W.document.onkeydown = null; } catch (e) {}
    try { W.document.onkeyup = null; } catch (e) {}
    try { window.onresize = null; } catch (e) {}
    try { window.onpopstate = null; } catch (e) {}
    try { document.onkeydown = null; } catch (e) {}
    try { document.onkeyup = null; } catch (e) {}
  }

  function getReaderMainCss(settings) {
    return [
      '*, *::before, *::after { box-sizing: border-box; }',
      'html, body { margin: 0; padding: 0; background: #0f1014 !important; color: #e5e7eb; font: 13px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; text-align: center; }',
      'a { color: #93c5fd; }',

      '.ml-nav-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; background: #161820; border-bottom: 1px solid #262936; }',
      '.ml-nav-bar.ml-nav-top { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background: rgba(22, 24, 32, 0.92); backdrop-filter: blur(10px); box-shadow: 0 4px 18px rgba(0, 0, 0, 0.42); transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease; will-change: transform; }',
      '.ml-nav-bar.ml-nav-top.ml-nav-hidden { transform: translateY(-100%); opacity: 0; pointer-events: none; }',
      '.ml-nav-spacer { width: 100%; height: 74px; pointer-events: none; }',
      '.ml-nav-bar.ml-nav-bottom { border-bottom: none; border-top: 1px solid #262936; margin-top: 16px; padding-bottom: 52px; }',
      '.ml-title { width: 100%; max-width: 1100px; margin: 0 auto 2px; font-size: 13.5px; font-weight: 600; color: #f3f4f6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.ml-nav-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 6px; background: #262a38; color: #f3f4f6; text-decoration: none; border: 1px solid #373d52; cursor: pointer; font-size: 12px; transition: background .15s, border-color .15s; }',
      '.ml-nav-btn:hover { background: #33394d; border-color: #525b78; }',
      '.ml-nav-btn.ml-primary { background: #2563eb; border-color: #3b82f6; color: #fff; }',
      '.ml-nav-btn.ml-primary:hover { background: #1d4ed8; }',

      '.ml-images { padding: 10px 8px 4px; width: 100%; }',
      '.ml-page-wrap { position: relative; margin: 0 auto ' + settings.gapPx + 'px; display: flex; flex-direction: column; align-items: center; }',
      '.ml-img-stage { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 120px; }',
      '.ml-images img.ml-page-img { display: block; margin: 0 auto; max-width: 100%; height: auto; user-select: none; -webkit-user-drag: none; background: #181a22; }',
      '.ml-images.ml-reload-mode img.ml-page-img { cursor: crosshair !important; outline: 2px dashed rgba(251, 191, 36, 0.55); outline-offset: -2px; }',

      '.ml-status-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: min(520px, 92vw); min-height: 140px; padding: 20px; margin: 8px auto; border-radius: 10px; background: #181a24; border: 1px solid #2d3242; color: #cbd5e1; }',
      '.ml-status-card.ml-error { border-color: #7f1d1d; background: #211519; color: #fecaca; }',
      '.ml-status-card.ml-warn { border-color: #854d0e; background: #231d13; color: #fde68a; }',
      '.ml-spinner { width: 22px; height: 22px; border: 2.5px solid rgba(255,255,255,0.2); border-top-color: #60a5fa; border-radius: 50%; animation: ml-spin .8s linear infinite; }',
      '@keyframes ml-spin { to { transform: rotate(360deg); } }',

      '.ml-page-bar { display: inline-flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; margin-top: 4px; padding: 2px 10px; border-radius: 999px; background: rgba(28, 31, 42, 0.9); border: 1px solid #2e3345; color: #9ca3af; font-size: 11px; }',
      '.ml-page-bar a { color: #cbd5e1; text-decoration: none; }',
      '.ml-page-bar a:hover { color: #60a5fa; text-decoration: underline; }',
      '.ml-page-bar-btn { display: inline-flex; align-items: center; gap: 3px; background: none; border: none; padding: 0 2px; color: #9ca3af; cursor: pointer; font-size: 11px; }',
      '.ml-page-bar-btn:hover { color: #fbbf24; }',
      '.ml-hide-meta .ml-page-bar { display: none !important; }',

      '.ml-loader-footer { margin: 16px auto 8px; padding: 14px 16px; max-width: 680px; border-radius: 10px; background: #161820; border: 1px solid #262936; color: #cbd5e1; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; }',

      '.ml-box { position: fixed; background: rgba(20, 22, 30, 0.94); color: #f3f4f6; border: 1px solid #303548; backdrop-filter: blur(8px); box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5); z-index: 10000; }',
      '.ml-stats { bottom: 0; right: 0; border-top-left-radius: 8px; border-right: none; border-bottom: none; padding: 6px 10px; display: inline-flex; align-items: center; gap: 8px; opacity: 0.55; transition: opacity .2s; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }',
      '.ml-stats:hover, .ml-stats.ml-active { opacity: 1; }',
      '.ml-stats-collapse { color: #fb923c; cursor: pointer; font-weight: 700; user-select: none; padding: 0 2px; }',
      '.ml-stats-content { display: inline-flex; align-items: center; gap: 6px; }',
      '.ml-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 5px; border: none; background: transparent; color: #d1d5db; cursor: pointer; padding: 0; transition: background .15s, color .15s; }',
      '.ml-icon-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }',
      '.ml-icon-btn.ml-on { background: #d97706; color: #fff; }',

      '.ml-floating-msg { bottom: 42px; right: 8px; border-radius: 10px; padding: 14px 16px; text-align: left; max-width: min(740px, 95vw); max-height: 82vh; overflow: auto; white-space: normal; font-size: 12.5px; line-height: 1.55; }',
      '.ml-floating-msg h3 { margin: 0 0 10px; font-size: 14px; color: #fff; border-bottom: 1px solid #2e3345; padding-bottom: 6px; }',
      '.ml-settings-grid { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(240px, 1fr); gap: 16px; }',
      '@media (max-width: 680px) { .ml-settings-grid { grid-template-columns: 1fr; } }',
      '.ml-field { margin-bottom: 10px; }',
      '.ml-field label { display: block; color: #cbd5e1; margin-bottom: 4px; font-size: 12px; }',
      '.ml-field input[type="text"], .ml-field input[type="number"], .ml-field select, .ml-field textarea { background: #0f1117; color: #f3f4f6; border: 1px solid #373d52; border-radius: 5px; padding: 5px 8px; font-size: 12px; }',
      '.ml-field textarea { width: 100%; height: 210px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; resize: vertical; }',
      '.ml-key-table { width: 100%; border-collapse: collapse; font-size: 12px; }',
      '.ml-key-table td { padding: 3px 4px; border-bottom: 1px solid #232736; }',
      '.ml-key-table input { width: 78px; text-align: center; cursor: pointer; }',
      '.ml-toast { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); background: rgba(17, 24, 39, 0.92); color: #f9fafb; border: 1px solid #374151; padding: 6px 14px; border-radius: 999px; font-size: 12px; z-index: 10001; pointer-events: none; opacity: 0; transition: opacity .2s; }',
      '.ml-toast.ml-show { opacity: 1; }'
    ].join('\n');
  }

  function getFitModeCss(mode) {
    if (mode === 'width') {
      return '.ml-images img.ml-page-img { width: 100% !important; max-width: 100% !important; max-height: none !important; height: auto !important; }';
    }
    if (mode === 'height') {
      return '.ml-images img.ml-page-img { width: auto !important; max-width: 100% !important; max-height: calc(100vh - 34px) !important; height: auto !important; }';
    }
    if (mode === 'original') {
      return '.ml-images img.ml-page-img { width: auto !important; max-width: none !important; max-height: none !important; height: auto !important; }';
    }
    // default: 不放大超过原图，也不超出屏幕宽度
    return '.ml-images img.ml-page-img { width: auto; max-width: 100%; height: auto; }';
  }

  var FIT_MODE_ORDER = ['default', 'width', 'height', 'original'];
  var FIT_MODE_NAMES = {
    default: '智能适配',
    width: '适应宽度',
    height: '适应屏高',
    original: '原始尺寸'
  };

  function startReader(initialData) {
    var settings = getSettings();
    cleanOriginalSiteHandlers();

    var baseTitle = initialData.title || document.title || 'E-Hentai';
    var startPageNum = initialData.curPage || 1;
    var totalPages = initialData.numPages || null;
    var galleryUrl = initialData.galleryUrl;
    var firstPageUrl = initialData.firstUrl;

    // 清理原页面 DOM（彻底脱离原站样式与广告脚本）
    document.head.innerHTML = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
    document.title = '[' + startPageNum + (totalPages ? '/' + totalPages : '') + '] ' + baseTitle;
    document.body.className = settings.showMeta ? '' : 'ml-hide-meta';
    document.body.removeAttribute('style');

    var navTopHtml = [
      '<div class="ml-nav-bar ml-nav-top" id="ml-nav-top">',
      '  <div class="ml-title" title="' + escapeHtml(baseTitle) + '">' + escapeHtml(baseTitle) + '</div>',
      galleryUrl ? '  <a class="ml-nav-btn ml-btn-gallery" href="' + escapeHtml(galleryUrl) + '">' + ICONS.gallery + ' 返回画廊</a>' : '',
      (startPageNum > 1 && firstPageUrl) ? '  <a class="ml-nav-btn ml-btn-from-first" href="' + escapeHtml(firstPageUrl) + '">从第 1 页开始瀑布流</a>' : '',
      '  <a class="ml-nav-btn ml-btn-exit" href="' + escapeHtml(initialData.pageUrl) + '">退出到当前页 (X)</a>',
      '  <button type="button" class="ml-nav-btn ml-btn-fit-top">显示模式：' + FIT_MODE_NAMES[settings.fitMode] + '</button>',
      '</div>',
      '<div class="ml-nav-spacer" id="ml-nav-spacer"></div>'
    ].join('\n');

    var navBottomHtml = [
      '<div class="ml-loader-footer" id="ml-loader-footer"></div>',
      '<div class="ml-nav-bar ml-nav-bottom">',
      galleryUrl ? '  <a class="ml-nav-btn ml-btn-gallery" href="' + escapeHtml(galleryUrl) + '">' + ICONS.gallery + ' 返回画廊</a>' : '',
      '  <a class="ml-nav-btn ml-btn-exit" href="' + escapeHtml(initialData.pageUrl) + '">退出到当前页 (X)</a>',
      '  <button type="button" class="ml-nav-btn ml-btn-top">回到顶部</button>',
      '</div>'
    ].join('\n');

    var statsHtml = [
      '<div class="ml-toast" id="ml-toast"></div>',
      '<div class="ml-box ml-floating-msg" id="ml-floating-msg" style="display:none;"></div>',
      '<div class="ml-box ml-stats" id="ml-stats">',
      '  <span class="ml-stats-collapse" id="ml-stats-collapse" title="折叠/展开状态栏">&gt;&gt;</span>',
      '  <span class="ml-stats-content" id="ml-stats-content">',
      '    <span id="ml-stats-pages">准备中...</span>',
      '    <button type="button" class="ml-icon-btn" id="ml-btn-top" title="回到顶部">' + ICONS.top + '</button>',
      '    <button type="button" class="ml-icon-btn" id="ml-btn-fit" title="切换显示模式（智能/适宽/适高/原图）">' + ICONS.fit + '</button>',
      '    <button type="button" class="ml-icon-btn" id="ml-btn-reload" title="手动换源刷新：点击后再点任意图片即可用 nl 更换节点重载">' + ICONS.refresh + '</button>',
      '    <button type="button" class="ml-icon-btn" id="ml-btn-stats" title="查看加载统计">' + ICONS.stats + '</button>',
      '    <button type="button" class="ml-icon-btn" id="ml-btn-settings" title="设置与自定义 CSS">' + ICONS.settings + '</button>',
      '    <button type="button" class="ml-icon-btn" id="ml-btn-info" title="快捷键与使用帮助">' + ICONS.info + '</button>',
      '  </span>',
      '</div>'
    ].join('\n');

    document.body.innerHTML = navTopHtml + '<div class="ml-images" id="ml-images"></div>' + navBottomHtml + statsHtml;

    // 注入基础样式、适配模式样式和用户自定义 CSS
    setStyle('main', getReaderMainCss(settings));
    setStyle('fit', getFitModeCss(settings.fitMode));

    function applyUserCss() {
      var profiles = getCssProfiles();
      var curName = getCurrentCssProfileName();
      var found = profiles.filter(function (p) { return p.name === curName; })[0] || profiles[0];
      setStyle('user', found ? found.css : '');
    }
    applyUserCss();

    // DOM 引用
    var UI = {
      navTop: getEl('#ml-nav-top'),
      navSpacer: getEl('#ml-nav-spacer'),
      images: getEl('#ml-images'),
      footer: getEl('#ml-loader-footer'),
      floatingMsg: getEl('#ml-floating-msg'),
      toast: getEl('#ml-toast'),
      statsBox: getEl('#ml-stats'),
      statsPages: getEl('#ml-stats-pages'),
      statsContent: getEl('#ml-stats-content'),
      statsCollapse: getEl('#ml-stats-collapse'),
      btnTop: getEl('#ml-btn-top'),
      btnFit: getEl('#ml-btn-fit'),
      btnFitTop: getEl('.ml-btn-fit-top'),
      btnReload: getEl('#ml-btn-reload'),
      btnStats: getEl('#ml-btn-stats'),
      btnSettings: getEl('#ml-btn-settings'),
      btnInfo: getEl('#ml-btn-info'),
      exitLinks: getEls('.ml-btn-exit'),
      galleryLinks: getEls('.ml-btn-gallery')
    };

    // 动态同步顶部占位高度，保证最顶端时不遮挡第一张图
    function syncNavSpacerHeight() {
      if (UI.navTop && UI.navSpacer) {
        UI.navSpacer.style.height = UI.navTop.offsetHeight + 'px';
      }
    }
    syncNavSpacerHeight();

    // 状态追踪
    var state = {
      items: [],          // 每个页面对象 { pageNum, pageUrl, imgSrc, nlToken, nlHistory, nlRetries, origUrl, metaText, loaded, failed, wrap, imgEl, stageEl }
      parsedCount: 0,
      loadedCount: 0,
      failedCount: 0,
      targetParsedCount: settings.initialLoadNum === 'all' ? Infinity : settings.initialLoadNum,
      currentViewPage: startPageNum,
      currentViewIndex: 0,
      pendingNextUrl: null,
      isFetching: false,
      pausedByBatch: false,
      pausedByLimit: false,
      pauseReason: '',
      finished: false,
      reloadMode: false,
      activePanel: null,  // 'stats' | 'settings' | 'info' | null
      customZoomPct: null,
      suppressHeaderUntil: 0,
      gid: extractGidFromUrl(initialData.pageUrl)
    };

    // Toast 提示
    var toastTimer = null;
    function showToast(text, duration) {
      clearTimeout(toastTimer);
      UI.toast.textContent = text;
      UI.toast.classList.add('ml-show');
      toastTimer = setTimeout(function () {
        UI.toast.classList.remove('ml-show');
      }, duration || 1600);
    }

    function closePanel() {
      state.activePanel = null;
      UI.floatingMsg.style.display = 'none';
      UI.floatingMsg.innerHTML = '';
      UI.statsBox.classList.remove('ml-active');
    }

    function openPanel(name, html) {
      if (state.activePanel === name) {
        closePanel();
        return;
      }
      state.activePanel = name;
      UI.floatingMsg.innerHTML = html;
      UI.floatingMsg.style.display = 'block';
      UI.statsBox.classList.add('ml-active');
    }

    function updateStatsDisplay() {
      var rangeTotal = totalPages ? (totalPages - startPageNum + 1) : null;
      var statusStr = 'P.' + state.currentViewPage;
      if (totalPages) statusStr += '/' + totalPages;
      statusStr += ' | 已载 ' + state.loadedCount + '/' + state.parsedCount;
      if (state.failedCount > 0) statusStr += ' (错' + state.failedCount + ')';
      UI.statsPages.textContent = statusStr;

      document.title = '[' + state.currentViewPage + (totalPages ? '/' + totalPages : '') + '] ' + baseTitle;

      if (state.activePanel === 'stats') {
        renderStatsPanel(rangeTotal);
      }
      renderFooter();
    }

    function getRemainingParsed() {
      return Math.max(0, state.parsedCount - (state.currentViewIndex + 1));
    }

    function renderStatsPanel(rangeTotal) {
      var loadingCount = Math.max(0, state.parsedCount - state.loadedCount - state.failedCount);
      var targetLabel = state.targetParsedCount === Infinity ? '全部' : (state.targetParsedCount + ' 页');
      var remaining = getRemainingParsed();
      UI.floatingMsg.innerHTML = [
        '<h3>加载统计</h3>',
        '<div>当前阅读页：<strong>第 ' + state.currentViewPage + ' 页</strong>' + (totalPages ? ' / 共 ' + totalPages + ' 页' : '') + '</div>',
        '<div>本次起始页：第 ' + startPageNum + ' 页' + (rangeTotal ? '（本次需载 ' + rangeTotal + ' 页）' : '') + '</div>',
        '<div>已解析 / 本轮目标：' + state.parsedCount + ' / ' + targetLabel + '（前方剩余缓冲 ' + remaining + ' 页）</div>',
        '<div>图片已加载：' + state.loadedCount + ' 张 | 加载中：' + loadingCount + ' 张 | 失败：' + state.failedCount + ' 张</div>',
        '<div>预加载策略：初始 ' + settings.initialLoadNum + 'P，剩余 ≤ ' + settings.preloadTriggerRemaining + 'P 时续载 ' + settings.batchLoadNum + 'P</div>',
        '<div>请求节流间隔：' + settings.delayMs + ' ms / 页</div>',
        '<div>队列状态：' + (state.finished ? '已全部解析完成' : state.pausedByLimit ? '已因风控/509暂停' : state.pausedByBatch ? '本轮预加载完成，等待阅读至剩余 ≤ ' + settings.preloadTriggerRemaining + 'P 时续载' : state.isFetching ? '正在预加载下一页...' : '运行中') + '</div>'
      ].join('');
    }

    function renderFooter() {
      if (state.finished) {
        UI.footer.innerHTML = '<span>已到达本画廊最后一页（共解析 ' + state.parsedCount + ' 页，成功加载 ' + state.loadedCount + ' 张）。</span>';
        return;
      }
      if (state.pausedByLimit) {
        UI.footer.innerHTML = [
          '<span style="color:#fde68a;">' + escapeHtml(state.pauseReason || '预加载已暂停') + '</span>',
          '<button type="button" class="ml-nav-btn ml-primary" id="ml-resume-limit">手动尝试继续加载</button>'
        ].join(' ');
        var btnL = getEl('#ml-resume-limit', UI.footer);
        if (btnL) {
          btnL.onclick = function () {
            state.pausedByLimit = false;
            state.pauseReason = '';
            if (state.targetParsedCount !== Infinity && state.parsedCount >= state.targetParsedCount) {
              state.targetParsedCount = state.parsedCount + settings.batchLoadNum;
            }
            scheduleNextFetch();
          };
        }
        return;
      }
      if (state.pausedByBatch && state.pendingNextUrl) {
        var remaining = getRemainingParsed();
        UI.footer.innerHTML = [
          '<span>已预加载 ' + state.parsedCount + ' 页（前方还剩 ' + remaining + ' 页，剩余 ≤ ' + settings.preloadTriggerRemaining + ' 页时自动续载 ' + settings.batchLoadNum + ' 页），也可手动：</span>',
          '<button type="button" class="ml-nav-btn ml-primary" id="ml-load-more">立即续载 ' + settings.batchLoadNum + ' 页</button>',
          '<button type="button" class="ml-nav-btn" id="ml-load-all">加载剩余全部</button>'
        ].join(' ');
        var btnMore = getEl('#ml-load-more', UI.footer);
        var btnAll = getEl('#ml-load-all', UI.footer);
        if (btnMore) {
          btnMore.onclick = function () {
            resumeBatch(false);
          };
        }
        if (btnAll) {
          btnAll.onclick = function () {
            resumeBatch(true);
          };
        }
        return;
      }
      var targetHint = state.targetParsedCount === Infinity
        ? (totalPages ? ' / 本次共 ' + (totalPages - startPageNum + 1) + ' 页' : '')
        : ' / 本轮目标 ' + (totalPages ? Math.min(state.targetParsedCount, totalPages - startPageNum + 1) : state.targetParsedCount) + ' 页';
      UI.footer.innerHTML = '<div class="ml-spinner"></div><span>正在后台预加载...（已解析 ' + state.parsedCount + targetHint + '）</span>';
    }

    // -----------------------------------------------------------------------
    // 当前屏幕可见图片定位 & 退出链接动态同步
    // -----------------------------------------------------------------------
    function getCurrentVisibleInfo() {
      if (!state.items.length) return null;
      var threshold = Math.min(220, window.innerHeight * 0.3);
      for (var i = 0; i < state.items.length; i++) {
        var rect = state.items[i].wrap.getBoundingClientRect();
        if (rect.bottom > threshold) {
          return { item: state.items[i], index: i };
        }
      }
      var lastIdx = state.items.length - 1;
      return { item: state.items[lastIdx], index: lastIdx };
    }

    function getCurrentVisibleItem() {
      var info = getCurrentVisibleInfo();
      return info ? info.item : null;
    }

    function syncCurrentViewPage() {
      var info = getCurrentVisibleInfo();
      if (!info) return;
      var changed = info.item.pageNum !== state.currentViewPage || info.index !== state.currentViewIndex;
      if (changed) {
        state.currentViewPage = info.item.pageNum;
        state.currentViewIndex = info.index;
        UI.exitLinks.forEach(function (a) {
          a.href = info.item.pageUrl;
        });
        updateStatsDisplay();
      }
      checkAutoResumeScroll();
    }

    // -----------------------------------------------------------------------
    // 单页渲染与真正的 nl 换源重载
    // -----------------------------------------------------------------------
    function reloadItemWithNl(item, isAuto) {
      if (item.reloading) return;
      item.reloading = true;

      // 如果之前已经标记 loaded 或 failed，先还原计数
      if (item.loaded) {
        item.loaded = false;
        state.loadedCount = Math.max(0, state.loadedCount - 1);
      }
      if (item.failed) {
        item.failed = false;
        state.failedCount = Math.max(0, state.failedCount - 1);
      }
      updateStatsDisplay();

      // 组织链式 nl 参数
      if (item.nlToken && item.nlHistory.indexOf(item.nlToken) === -1) {
        item.nlHistory.push(item.nlToken);
      }

      var statusText = isAuto
        ? '第 ' + item.pageNum + ' 页加载失败，正在自动换源重试 (' + item.nlRetries + '/' + settings.maxNlRetry + ')...'
        : '第 ' + item.pageNum + ' 页正在请求 E-Hentai 切换新的 H@H 节点...';

      showItemPlaceholder(item, 'loading', statusText);

      // 如果有 nl 参数，向 E-Hentai 请求新的页面 HTML 获取新节点图片地址
      if (item.nlHistory.length > 0) {
        var nlUrl = buildNlUrl(item.pageUrl, item.nlHistory);
        log('换源重载 P.' + item.pageNum + ' -> ' + nlUrl);
        fetchAndParsePage(nlUrl, 2).then(function (parsed) {
          item.reloading = false;
          if (!parsed.ok) {
            markItemFailed(item, parsed.error || '换源请求失败');
            return;
          }
          if (parsed.is509) {
            trigger509Pause(item);
            return;
          }
          item.imgSrc = parsed.imgSrc;
          if (parsed.nlToken) item.nlToken = parsed.nlToken;
          if (parsed.origUrl) item.origUrl = parsed.origUrl;
          mountImageElement(item, item.imgSrc);
        });
      } else {
        // 兜底：无 nl token 时直接刷新图片
        item.reloading = false;
        var sep = item.imgSrc.indexOf('?') !== -1 ? '&' : '?';
        mountImageElement(item, item.imgSrc + sep + '_mlr=' + Date.now());
      }
    }

    function trigger509Pause(item) {
      state.pausedByLimit = true;
      state.pauseReason = '检测到 E-Hentai 图片浏览配额已耗尽 (509.gif)，已自动暂停预加载。';
      markItemFailed(item, '图片配额已耗尽 (509.gif)，请等待配额恢复或检查账号/IP 限额。', true);
      showToast('检测到 509 配额耗尽，已暂停预加载', 3500);
      updateStatsDisplay();
    }

    function showItemPlaceholder(item, type, message) {
      var cls = 'ml-status-card' + (type === 'error' ? ' ml-error' : type === 'warn' ? ' ml-warn' : '');
      var html = '';
      if (type === 'loading') {
        html = '<div class="ml-spinner"></div><div>' + escapeHtml(message) + '</div>';
      } else {
        html = [
          '<div><strong>第 ' + item.pageNum + ' 页</strong>：' + escapeHtml(message) + '</div>',
          '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">',
          '  <button type="button" class="ml-nav-btn ml-primary ml-retry-btn">换源重新加载 (nl)</button>',
          '  <a class="ml-nav-btn" href="' + escapeHtml(item.pageUrl) + '" target="_blank" rel="noopener">新标签打开原页</a>',
          '</div>'
        ].join('');
      }
      item.stageEl.innerHTML = '<div class="' + cls + '">' + html + '</div>';
      item.imgEl = null;
      var retryBtn = getEl('.ml-retry-btn', item.stageEl);
      if (retryBtn) {
        retryBtn.onclick = function () {
          item.nlRetries = 0;
          reloadItemWithNl(item, false);
        };
      }
    }

    function markItemFailed(item, reason, isWarn) {
      if (!item.failed) {
        item.failed = true;
        state.failedCount += 1;
      }
      showItemPlaceholder(item, isWarn ? 'warn' : 'error', reason || '图片加载失败');
      updateStatsDisplay();
    }

    function mountImageElement(item, src) {
      var img = new Image();
      img.className = 'ml-page-img';
      img.id = 'ml-pageid-' + item.pageNum;
      img.decoding = 'async';
      img.alt = 'Page ' + item.pageNum;

      var loadedHandled = false;

      // 先保留加载中提示，同时预挂载 img（先隐藏避免空白闪烁）
      showItemPlaceholder(item, 'loading', '第 ' + item.pageNum + ' 页 加载中...');
      img.style.display = 'none';
      item.stageEl.appendChild(img);
      item.imgEl = img;

      img.onload = function () {
        if (loadedHandled) return;
        loadedHandled = true;

        // 某些节点可能把 509.gif 通过重定向返回，检查 naturalWidth/Height 或 src
        if (is509Image(img.currentSrc || img.src)) {
          trigger509Pause(item);
          return;
        }

        // 移除加载卡片，显示图片
        var card = getEl('.ml-status-card', item.stageEl);
        if (card) card.remove();
        img.style.display = 'block';

        if (!item.loaded) {
          item.loaded = true;
          state.loadedCount += 1;
        }
        updateStatsDisplay();

        // 若加载完后文档仍很短且处于批次等待状态，自动补检测一次滚动触发
        checkAutoResumeScroll();
      };

      img.onerror = function () {
        if (loadedHandled) return;
        loadedHandled = true;
        log('图片加载失败 P.' + item.pageNum + ': ' + src, 'warn');

        if (settings.autoNlRetry && item.nlToken && item.nlRetries < settings.maxNlRetry) {
          item.nlRetries += 1;
          var waitMs = item.nlRetries * 900;
          showItemPlaceholder(item, 'loading', '第 ' + item.pageNum + ' 页节点连接失败，' + (waitMs / 1000).toFixed(1) + '秒后自动换源重试 (' + item.nlRetries + '/' + settings.maxNlRetry + ')...');
          setTimeout(function () {
            reloadItemWithNl(item, true);
          }, waitMs);
        } else {
          markItemFailed(item, '图片加载失败（可能 H@H 节点超时或网络波动）');
        }
      };

      img.src = src;
    }

    function appendPageItem(pageData) {
      var item = {
        pageNum: pageData.curPage,
        pageUrl: pageData.pageUrl,
        imgSrc: pageData.imgSrc,
        nlToken: pageData.nlToken,
        nlHistory: [],
        nlRetries: 0,
        origUrl: pageData.origUrl,
        metaText: pageData.metaText,
        loaded: false,
        failed: false,
        reloading: false,
        wrap: null,
        stageEl: null,
        imgEl: null
      };

      var wrap = document.createElement('div');
      wrap.className = 'ml-page-wrap';
      wrap.dataset.page = String(item.pageNum);

      var stageEl = document.createElement('div');
      stageEl.className = 'ml-img-stage';

      var bar = document.createElement('div');
      bar.className = 'ml-page-bar';
      var barParts = [
        '<a href="' + escapeHtml(item.pageUrl) + '" target="_blank" rel="noopener" title="新标签打开此单页"><strong>P.' + item.pageNum + (totalPages ? ' / ' + totalPages : '') + '</strong></a>'
      ];
      if (item.metaText) {
        barParts.push('<span>' + escapeHtml(item.metaText) + '</span>');
      }
      if (item.origUrl) {
        barParts.push('<a href="' + escapeHtml(item.origUrl) + '" target="_blank" rel="noopener" title="查看/下载原图（注意会消耗配额）">原图</a>');
      }
      barParts.push('<button type="button" class="ml-page-bar-btn ml-single-reload" title="通过 E-Hentai nl 参数更换 H@H 节点重新加载本页">' + ICONS.refresh + ' 换源</button>');
      bar.innerHTML = barParts.join(' <span style="opacity:.4">·</span> ');

      getEl('.ml-single-reload', bar).addEventListener('click', function () {
        item.nlRetries = 0;
        reloadItemWithNl(item, false);
      });

      wrap.appendChild(stageEl);
      wrap.appendChild(bar);
      UI.images.appendChild(wrap);

      item.wrap = wrap;
      item.stageEl = stageEl;
      state.items.push(item);
      state.parsedCount += 1;

      if (pageData.is509) {
        trigger509Pause(item);
      } else {
        mountImageElement(item, pageData.imgSrc);
      }
      updateStatsDisplay();
    }

    // -----------------------------------------------------------------------
    // 滑动窗口串行节流预加载队列（默认：初始 40P，剩余 ≤ 10P 时续载 20P）
    // -----------------------------------------------------------------------
    function shouldTriggerNextBatch() {
      if (state.targetParsedCount === Infinity) return true;
      var remaining = getRemainingParsed();
      if (remaining <= settings.preloadTriggerRemaining) {
        return true;
      }
      // 极端矮图兜底：如果已经滚动到距底部不足 1.5 屏也自动续载，避免卡住
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      var docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      if (docHeight > window.innerHeight * 1.2 && (docHeight - (scrollTop + window.innerHeight)) < window.innerHeight * 1.5) {
        return true;
      }
      return false;
    }

    function advancePreloadTarget() {
      var minNeeded = (state.currentViewIndex + 1) + settings.preloadTriggerRemaining + settings.batchLoadNum;
      var nextTarget = Math.max(state.parsedCount + settings.batchLoadNum, minNeeded);
      state.targetParsedCount = nextTarget;
      state.pausedByBatch = false;
      log('当前看到第 ' + state.currentViewPage + ' 页（剩余缓冲 ' + getRemainingParsed() + ' 页），触发续载至本次第 ' + nextTarget + ' 页');
    }

    function scheduleNextFetch() {
      if (state.finished || state.pausedByLimit || state.isFetching) return;
      if (!state.pendingNextUrl) {
        state.finished = true;
        updateStatsDisplay();
        return;
      }
      if (state.targetParsedCount !== Infinity && state.parsedCount >= state.targetParsedCount) {
        if (shouldTriggerNextBatch()) {
          advancePreloadTarget();
        } else {
          state.pausedByBatch = true;
          updateStatsDisplay();
          return;
        }
      }

      state.isFetching = true;
      state.pausedByBatch = false;
      updateStatsDisplay();

      var urlToFetch = state.pendingNextUrl;
      sleep(settings.delayMs).then(function () {
        if (state.pausedByLimit) {
          state.isFetching = false;
          updateStatsDisplay();
          return;
        }
        return fetchAndParsePage(urlToFetch, 3).then(function (parsed) {
          state.isFetching = false;
          if (!parsed.ok) {
            if (parsed.blocked) {
              state.pausedByLimit = true;
              state.pauseReason = parsed.error;
              showToast('检测到站点限流提示，已暂停加载', 4000);
            } else {
              state.pausedByLimit = true;
              state.pauseReason = '解析下一页失败：' + parsed.error;
            }
            updateStatsDisplay();
            return;
          }

          if (parsed.numPages && !totalPages) {
            totalPages = parsed.numPages;
          }

          // 防御死循环：确保不会重复添加相同页码
          var alreadyAdded = state.items.some(function (it) {
            return it.pageNum === parsed.curPage;
          });
          if (alreadyAdded) {
            state.pendingNextUrl = null;
            state.finished = true;
            updateStatsDisplay();
            return;
          }

          state.pendingNextUrl = parsed.nextUrl;
          appendPageItem(parsed);

          if (!state.pendingNextUrl) {
            state.finished = true;
            updateStatsDisplay();
            return;
          }

          if (!state.pausedByLimit) {
            scheduleNextFetch();
          }
        });
      });
    }

    function resumeBatch(loadAllRemaining) {
      if (state.finished || state.pausedByLimit) return;
      if (loadAllRemaining) {
        state.targetParsedCount = Infinity;
        showToast('已切换为加载本次剩余全部页面');
      } else {
        state.targetParsedCount = Math.max(state.targetParsedCount, state.parsedCount) + settings.batchLoadNum;
      }
      state.pausedByBatch = false;
      scheduleNextFetch();
    }

    function checkAutoResumeScroll() {
      if (!state.pausedByBatch || state.isFetching || state.finished || state.pausedByLimit || !state.pendingNextUrl) return;
      if (shouldTriggerNextBatch()) {
        advancePreloadTarget();
        scheduleNextFetch();
      }
    }

    // -----------------------------------------------------------------------
    // 缩放与显示模式（保持视觉锚点不跳动）
    // -----------------------------------------------------------------------
    function withScrollAnchor(mutator) {
      var cur = getCurrentVisibleItem();
      var anchorOffsetRatio = 0;
      if (cur) {
        var rect = cur.wrap.getBoundingClientRect();
        if (rect.height > 0) {
          anchorOffsetRatio = -rect.top / rect.height;
        }
      }
      state.suppressHeaderUntil = Date.now() + 350;
      mutator();
      if (cur) {
        requestAnimationFrame(function () {
          var newRect = cur.wrap.getBoundingClientRect();
          var targetY = (window.pageYOffset || document.documentElement.scrollTop) + newRect.top + anchorOffsetRatio * newRect.height;
          state.suppressHeaderUntil = Date.now() + 300;
          window.scrollTo(0, Math.max(0, targetY));
        });
      }
    }

    function applyFitMode(mode, silent) {
      settings.fitMode = mode;
      state.customZoomPct = null;
      storeSet('ml-eh-fitmode', mode);
      withScrollAnchor(function () {
        setStyle('zoom', '');
        setStyle('fit', getFitModeCss(mode));
      });
      if (UI.btnFitTop) {
        UI.btnFitTop.textContent = '显示模式：' + FIT_MODE_NAMES[mode];
      }
      if (!silent) {
        showToast('显示模式：' + FIT_MODE_NAMES[mode]);
      }
    }

    function cycleFitMode() {
      var idx = FIT_MODE_ORDER.indexOf(settings.fitMode);
      var nextMode = FIT_MODE_ORDER[(idx + 1) % FIT_MODE_ORDER.length];
      applyFitMode(nextMode, false);
    }

    function changeZoom(action) {
      var cur = getCurrentVisibleItem();
      if (action === '=') {
        state.customZoomPct = null;
        withScrollAnchor(function () {
          setStyle('zoom', '');
        });
        showToast('已重置缩放（' + FIT_MODE_NAMES[settings.fitMode] + '）');
        return;
      }

      if (state.customZoomPct === null) {
        if (cur && cur.imgEl && cur.imgEl.clientWidth > 0) {
          state.customZoomPct = Math.round((cur.imgEl.clientWidth / window.innerWidth) * 100);
        } else {
          state.customZoomPct = 80;
        }
      }
      state.customZoomPct += action === '+' ? 8 : -8;
      state.customZoomPct = Math.max(15, Math.min(100, state.customZoomPct));

      withScrollAnchor(function () {
        setStyle('zoom', '.ml-images img.ml-page-img { width: ' + state.customZoomPct + '% !important; max-width: ' + state.customZoomPct + '% !important; max-height: none !important; height: auto !important; }');
      });
      showToast('缩放比例：' + state.customZoomPct + '%');
    }

    function jumpToAdjacentPage(delta) {
      var cur = getCurrentVisibleItem();
      if (!cur) return;
      var idx = state.items.indexOf(cur);
      var target = state.items[idx + delta];
      if (target) {
        target.wrap.scrollIntoView({ behavior: 'auto', block: 'start' });
        syncCurrentViewPage();
      } else {
        showToast(delta > 0 ? '已是当前已加载的最后一页' : '已是第一页');
      }
    }

    // -----------------------------------------------------------------------
    // 手动点击换源模式
    // -----------------------------------------------------------------------
    function setReloadMode(enable) {
      state.reloadMode = !!enable;
      UI.images.classList.toggle('ml-reload-mode', state.reloadMode);
      UI.btnReload.classList.toggle('ml-on', state.reloadMode);
      if (state.reloadMode) {
        showToast('换源模式已开启：左键点击任意图片更换 H@H 节点，点空白处退出', 3000);
      }
    }

    UI.images.addEventListener('click', function (e) {
      if (!state.reloadMode) return;
      var img = e.target.closest ? e.target.closest('img.ml-page-img') : null;
      setReloadMode(false);
      if (!img) {
        showToast('已取消手动换源');
        return;
      }
      var wrap = img.closest('.ml-page-wrap');
      var pageNum = wrap ? parseInt(wrap.dataset.page, 10) : NaN;
      var item = state.items.filter(function (it) { return it.pageNum === pageNum; })[0];
      if (item) {
        item.nlRetries = 0;
        showToast('正在为第 ' + item.pageNum + ' 页切换新节点...');
        reloadItemWithNl(item, false);
      }
    });

    // -----------------------------------------------------------------------
    // 面板：设置面板（完整保留自定义 CSS Profiles + 快捷键 + 预加载参数）
    // -----------------------------------------------------------------------
    function openSettingsPanel() {
      var profiles = getCssProfiles().slice();
      var curProfName = getCurrentCssProfileName();
      var currentProf = profiles.filter(function (p) { return p.name === curProfName; })[0] || profiles[0];

      var keyRows = Object.keys(DEFAULT_KEYS).map(function (action) {
        var code = settings.keys[action];
        return '<tr><td>' + escapeHtml(KEY_LABELS[action] || action) + '</td>' +
          '<td><input type="text" readonly data-key-action="' + action + '" data-keycode="' + code + '" value="' + escapeHtml(keyCodeToLabel(code)) + '" title="点击后直接按下目标快捷键"></td></tr>';
      }).join('');

      var fitOptions = FIT_MODE_ORDER.map(function (m) {
        return '<option value="' + m + '"' + (settings.fitMode === m ? ' selected' : '') + '>' + FIT_MODE_NAMES[m] + '</option>';
      }).join('');

      var html = [
        '<h3>Manga Loader (E-Hentai) 设置</h3>',
        '<div class="ml-settings-grid">',
        '  <div>',
        '    <div class="ml-field">',
        '      <label>自定义 CSS 配置方案 (Profiles)</label>',
        '      <div style="display:flex;gap:6px;margin-bottom:6px;">',
        '        <select id="ml-set-css-profile" style="flex:1;">',
        profiles.map(function (p) {
          return '<option value="' + escapeHtml(p.name) + '"' + (p.name === currentProf.name ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>';
        }).join(''),
        '          <option value="__NEW__">+ 新建配置方案...</option>',
        '        </select>',
        '        <button type="button" class="ml-nav-btn" id="ml-set-css-del" title="删除当前方案">删除</button>',
        '      </div>',
        '      <textarea id="ml-set-css-text" placeholder="/* 在这里编写自定义 CSS，例如更改背景色、图片最大宽度等 */">' + escapeHtml(currentProf.css) + '</textarea>',
        '    </div>',
        '    <div class="ml-field">',
        '      <label><input type="checkbox" id="ml-set-autoload"' + (settings.autoload ? ' checked' : '') + '> 打开单页图 (/s/) 时自动进入瀑布流</label>',
        '      <label><input type="checkbox" id="ml-set-showmeta"' + (settings.showMeta ? ' checked' : '') + '> 显示每张图下方的页码/原图/换源条</label>',
        '      <label><input type="checkbox" id="ml-set-autonl"' + (settings.autoNlRetry ? ' checked' : '') + '> 图片失败时自动调用 nl 换源重试 (最多 2 次)</label>',
        '    </div>',
        '  </div>',
        '  <div>',
        '    <div class="ml-field">',
        '      <label>滑动窗口预加载策略（首次 / 每次续载 / 剩余触发）</label>',
        '      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">',
        '        <span>首次 <input type="text" id="ml-set-initload" value="' + escapeHtml(settings.initialLoadNum) + '" title="首次进入瀑布流预加载页数，填 all 表示一次全部加载" style="width:58px;"> 页</span>',
        '        <span>续载 <input type="number" id="ml-set-batchload" min="1" max="500" value="' + settings.batchLoadNum + '" title="触发续载时每次追加预加载的页数" style="width:58px;"> 页</span>',
        '        <span>剩 <input type="number" id="ml-set-triggerrem" min="0" max="200" value="' + settings.preloadTriggerRemaining + '" title="当前阅读位置前方剩余未看页数不超过此值时触发续载" style="width:54px;"> 页触发</span>',
        '      </div>',
        '    </div>',
        '    <div class="ml-field">',
        '      <label>每页请求间隔 (ms，默认 300，调大更防限流)</label>',
        '      <input type="number" id="ml-set-delay" min="50" max="5000" step="50" value="' + settings.delayMs + '" style="width:100px;">',
        '    </div>',
        '    <div class="ml-field" style="display:flex;gap:12px;">',
        '      <div>',
        '        <label>默认显示模式</label>',
        '        <select id="ml-set-fitmode">' + fitOptions + '</select>',
        '      </div>',
        '      <div>',
        '        <label>图片间距 (px)</label>',
        '        <input type="number" id="ml-set-gap" min="0" max="60" value="' + settings.gapPx + '" style="width:70px;">',
        '      </div>',
        '    </div>',
        '    <div class="ml-field">',
        '      <label>快捷键（点击输入框后按键盘录入）</label>',
        '      <table class="ml-key-table" id="ml-set-keys">' + keyRows + '</table>',
        '    </div>',
        '  </div>',
        '</div>',
        '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;border-top:1px solid #2e3345;padding-top:10px;">',
        '  <button type="button" class="ml-nav-btn ml-primary" id="ml-set-save">保存并应用</button>',
        '  <button type="button" class="ml-nav-btn" id="ml-set-reset-keys">恢复默认快捷键</button>',
        '  <button type="button" class="ml-nav-btn" id="ml-set-close">关闭</button>',
        '  <span id="ml-set-flash" style="color:#4ade80;font-weight:600;"></span>',
        '</div>'
      ].join('\n');

      openPanel('settings', html);
      if (state.activePanel !== 'settings') return;

      var selProf = getEl('#ml-set-css-profile', UI.floatingMsg);
      var txtCss = getEl('#ml-set-css-text', UI.floatingMsg);
      var btnDelProf = getEl('#ml-set-css-del', UI.floatingMsg);

      function getProfObj(name) {
        return profiles.filter(function (p) { return p.name === name; })[0];
      }

      var editingName = currentProf.name;

      selProf.addEventListener('change', function () {
        var prev = getProfObj(editingName);
        if (prev) prev.css = txtCss.value;

        if (selProf.value === '__NEW__') {
          var newName = prompt('请输入新的 CSS 配置方案名称：');
          newName = newName ? newName.trim() : '';
          if (!newName || newName === '__NEW__' || getProfObj(newName)) {
            selProf.value = editingName;
            if (newName) alert('名称无效或已存在。');
            return;
          }
          profiles.push({ name: newName, css: '' });
          var opt = document.createElement('option');
          opt.value = newName;
          opt.textContent = newName;
          selProf.insertBefore(opt, selProf.lastElementChild);
          selProf.value = newName;
          editingName = newName;
          txtCss.value = '';
          setStyle('user', '');
          return;
        }

        editingName = selProf.value;
        var next = getProfObj(editingName);
        txtCss.value = next ? next.css : '';
        setStyle('user', txtCss.value);
      });

      btnDelProf.addEventListener('click', function () {
        if (editingName === 'Default') {
          alert('Default 默认方案不可删除。');
          return;
        }
        if (!confirm('确定要删除配置方案 "' + editingName + '" 吗？')) return;
        profiles = profiles.filter(function (p) { return p.name !== editingName; });
        for (var oi = selProf.options.length - 1; oi >= 0; oi--) {
          if (selProf.options[oi].value === editingName) {
            selProf.remove(oi);
            break;
          }
        }
        editingName = 'Default';
        selProf.value = 'Default';
        var def = getProfObj('Default');
        txtCss.value = def ? def.css : '';
        setStyle('user', txtCss.value);
      });

      // 快捷键录入
      getEl('#ml-set-keys', UI.floatingMsg).addEventListener('keydown', function (e) {
        if (e.target.nodeName !== 'INPUT') return;
        e.preventDefault();
        e.stopPropagation();
        var code = e.which || e.keyCode;
        if (code === 16 || code === 17 || code === 18 || code === 91) return; // 忽略纯修饰键
        e.target.dataset.keycode = String(code);
        e.target.value = keyCodeToLabel(code);
      });

      getEl('#ml-set-reset-keys', UI.floatingMsg).addEventListener('click', function () {
        getEls('#ml-set-keys input', UI.floatingMsg).forEach(function (inp) {
          var act = inp.dataset.keyAction;
          var code = DEFAULT_KEYS[act];
          inp.dataset.keycode = String(code);
          inp.value = keyCodeToLabel(code);
        });
      });

      getEl('#ml-set-save', UI.floatingMsg).addEventListener('click', function () {
        // 保存 CSS Profiles
        var curObj = getProfObj(editingName);
        if (curObj) curObj.css = txtCss.value.trim();
        storeSet('ml-eh-css-profiles', profiles);
        storeSet('ml-eh-css-current', editingName);
        setStyle('user', curObj ? curObj.css : '');

        // 保存常规项
        var newAutoload = getEl('#ml-set-autoload', UI.floatingMsg).checked;
        var newShowMeta = getEl('#ml-set-showmeta', UI.floatingMsg).checked;
        var newAutoNl = getEl('#ml-set-autonl', UI.floatingMsg).checked;
        var rawInitLoad = getEl('#ml-set-initload', UI.floatingMsg).value.trim();
        var newInitLoad = rawInitLoad.toLowerCase() === 'all' ? 'all' : Math.max(1, parseInt(rawInitLoad, 10) || 40);
        var newBatchLoad = Math.max(1, parseInt(getEl('#ml-set-batchload', UI.floatingMsg).value, 10) || 20);
        var newTriggerRem = Math.max(0, parseInt(getEl('#ml-set-triggerrem', UI.floatingMsg).value, 10));
        if (isNaN(newTriggerRem)) newTriggerRem = 10;
        var newDelay = Math.max(50, Math.min(5000, parseInt(getEl('#ml-set-delay', UI.floatingMsg).value, 10) || 300));
        var newFit = getEl('#ml-set-fitmode', UI.floatingMsg).value;
        var newGap = Math.max(0, Math.min(60, parseInt(getEl('#ml-set-gap', UI.floatingMsg).value, 10) || 0));

        var newKeys = {};
        getEls('#ml-set-keys input', UI.floatingMsg).forEach(function (inp) {
          newKeys[inp.dataset.keyAction] = parseInt(inp.dataset.keycode, 10) || DEFAULT_KEYS[inp.dataset.keyAction];
        });

        storeSet('ml-eh-autoload', newAutoload);
        storeSet('ml-eh-showmeta', newShowMeta);
        storeSet('ml-eh-autonl', newAutoNl);
        storeSet('ml-eh-init-load', newInitLoad);
        storeSet('ml-eh-batch-load', newBatchLoad);
        storeSet('ml-eh-trigger-rem', newTriggerRem);
        storeSet('ml-eh-delay', newDelay);
        storeSet('ml-eh-fitmode', newFit);
        storeSet('ml-eh-gap', newGap);
        storeSet('ml-eh-keys', newKeys);

        // 实时应用到当前阅读器
        settings.autoload = newAutoload;
        settings.showMeta = newShowMeta;
        settings.autoNlRetry = newAutoNl;
        settings.initialLoadNum = newInitLoad;
        settings.batchLoadNum = newBatchLoad;
        settings.preloadTriggerRemaining = newTriggerRem;
        settings.delayMs = newDelay;
        settings.gapPx = newGap;
        settings.keys = newKeys;

        document.body.classList.toggle('ml-hide-meta', !newShowMeta);
        setStyle('main', getReaderMainCss(settings));
        syncNavSpacerHeight();
        applyFitMode(newFit, true);

        var flash = getEl('#ml-set-flash', UI.floatingMsg);
        flash.textContent = '已保存并生效！';
        setTimeout(function () { if (flash) flash.textContent = ''; }, 1500);

        if (newInitLoad === 'all') {
          state.targetParsedCount = Infinity;
          if (state.pausedByBatch) {
            state.pausedByBatch = false;
            scheduleNextFetch();
          }
        } else {
          if (state.targetParsedCount !== Infinity && newInitLoad > state.targetParsedCount) {
            state.targetParsedCount = newInitLoad;
            if (state.pausedByBatch) {
              state.pausedByBatch = false;
              scheduleNextFetch();
            }
          } else {
            checkAutoResumeScroll();
          }
        }
        updateStatsDisplay();
      });

      getEl('#ml-set-close', UI.floatingMsg).addEventListener('click', closePanel);
    }

    function openInfoPanel() {
      var k = settings.keys;
      var html = [
        '<h3>Manga Loader (E-Hentai / ExHentai 复活版) 帮助</h3>',
        '<div>• 本脚本基于经典 Manga Loader 重构，针对 E-Hentai / ExHentai 做了全量适配与现代化修复。</div>',
        '<div>• 支持 <strong>真 nl 换源重载</strong>：遇到卡图或 H@H 节点失败，自动/手动换源都会向站点请求全新节点地址。</div>',
        '<div>• 内置 <strong>节流间隔</strong> 与 <strong>509 配额耗尽检测</strong>，避免误伤账号或触发临时 IP 限制。</div>',
        '<div style="margin-top:8px;"><strong>当前快捷键：</strong></div>',
        '<div style="font-family:monospace;margin-top:4px;line-height:1.7;">',
        '  ' + escapeHtml(keyCodeToLabel(k.SCROLL_UP)) + ' / ' + escapeHtml(keyCodeToLabel(k.SCROLL_DOWN)) + ' — 向上 / 向下滚动<br>',
        '  ' + escapeHtml(keyCodeToLabel(k.PREV_PAGE)) + ' / ' + escapeHtml(keyCodeToLabel(k.NEXT_PAGE)) + ' — 跳到上一页 / 下一页<br>',
        '  ' + escapeHtml(keyCodeToLabel(k.ZOOM_IN)) + ' / ' + escapeHtml(keyCodeToLabel(k.ZOOM_OUT)) + ' / ' + escapeHtml(keyCodeToLabel(k.RESET_ZOOM)) + ' — 放大 / 缩小 / 重置缩放<br>',
        '  ' + escapeHtml(keyCodeToLabel(k.RELOAD_CUR)) + ' — 换源刷新当前屏幕正在看的这一页<br>',
        '  ' + escapeHtml(keyCodeToLabel(k.EXIT)) + ' — 退出瀑布流（返回当前正在看的单页）<br>',
        '  ' + escapeHtml(keyCodeToLabel(k.GALLERY)) + ' — 返回画廊详情页',
        '</div>',
        '<div style="margin-top:8px;opacity:.75;">再次点击信息图标或按 Esc 关闭此窗口。</div>'
      ].join('');
      openPanel('info', html);
    }

    // -----------------------------------------------------------------------
    // 按钮与事件绑定
    // -----------------------------------------------------------------------
    UI.exitLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        // 写入短暂的一次性跳过标记，防止开启 Auto-load 时点退出又立刻被拉回瀑布流
        storeSet('ml-eh-skip-autoload', { gid: state.gid, expire: Date.now() + 15000 });
        storeDel('ml-eh-once-autoload');
        if (a.href === location.href) {
          e.preventDefault();
          location.reload();
        }
      });
    });

    var btnFromFirst = getEl('.ml-btn-from-first');
    if (btnFromFirst) {
      btnFromFirst.addEventListener('click', function () {
        storeSet('ml-eh-once-autoload', { gid: state.gid, expire: Date.now() + 30000 });
      });
    }

    var scrollToTop = function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    UI.btnTop.addEventListener('click', scrollToTop);
    getEls('.ml-btn-top').forEach(function (b) { b.addEventListener('click', scrollToTop); });

    UI.btnFit.addEventListener('click', cycleFitMode);
    if (UI.btnFitTop) UI.btnFitTop.addEventListener('click', cycleFitMode);

    UI.btnReload.addEventListener('click', function () {
      setReloadMode(!state.reloadMode);
    });

    UI.btnStats.addEventListener('click', function () {
      openPanel('stats', '');
      if (state.activePanel === 'stats') {
        updateStatsDisplay();
      }
    });
    UI.btnSettings.addEventListener('click', openSettingsPanel);
    UI.btnInfo.addEventListener('click', openInfoPanel);

    // 折叠右下角状态栏
    function applyCollapsedState(collapsed) {
      UI.statsContent.style.display = collapsed ? 'none' : 'inline-flex';
      UI.statsCollapse.textContent = collapsed ? '<<' : '>>';
      if (collapsed) closePanel();
    }
    UI.statsCollapse.addEventListener('click', function () {
      var next = UI.statsCollapse.textContent === '>>';
      storeSet('ml-eh-stats-collapsed', next);
      applyCollapsedState(next);
    });
    if (storeGet('ml-eh-stats-collapsed', false)) {
      applyCollapsedState(true);
    }

    // 顶部栏随滚动方向智能显隐（下滑自动向上隐藏，上滑自动向下滑出）
    var isHeaderHidden = false;
    var isHeaderHovered = false;
    var lastScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var lastScrollDir = 0;
    var scrollAcc = 0;
    var headerRafScheduled = false;

    function setHeaderHidden(hidden) {
      if (!UI.navTop || isHeaderHidden === hidden) return;
      if (hidden && isHeaderHovered) return;
      isHeaderHidden = hidden;
      UI.navTop.classList.toggle('ml-nav-hidden', hidden);
    }

    if (UI.navTop) {
      UI.navTop.addEventListener('mouseenter', function () {
        isHeaderHovered = true;
      });
      UI.navTop.addEventListener('mouseleave', function () {
        isHeaderHovered = false;
      });
    }

    function updateHeaderByScroll() {
      headerRafScheduled = false;
      var curY = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);
      if (Date.now() < state.suppressHeaderUntil) {
        lastScrollY = curY;
        scrollAcc = 0;
        return;
      }

      var navH = (UI.navTop && UI.navTop.offsetHeight) || 70;
      if (curY <= 40) {
        setHeaderHidden(false);
        lastScrollY = curY;
        scrollAcc = 0;
        lastScrollDir = 0;
        return;
      }

      var delta = curY - lastScrollY;
      lastScrollY = curY;
      if (delta === 0) return;

      var dir = delta > 0 ? 1 : -1;
      if (dir !== lastScrollDir) {
        lastScrollDir = dir;
        scrollAcc = 0;
      }
      scrollAcc += Math.abs(delta);

      if (dir > 0 && curY > navH && scrollAcc >= 18) {
        setHeaderHidden(true);
        scrollAcc = 0;
      } else if (dir < 0 && scrollAcc >= 10) {
        setHeaderHidden(false);
        scrollAcc = 0;
      }
    }

    window.addEventListener('scroll', function () {
      if (!headerRafScheduled) {
        headerRafScheduled = true;
        requestAnimationFrame(updateHeaderByScroll);
      }
    }, { passive: true });

    // 额外监听鼠标滚轮方向，即便在页面底部/顶部边缘也能灵敏呼出或收起顶部栏
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) return;
      if (e.target && UI.floatingMsg && UI.floatingMsg.contains(e.target)) return;
      if (Date.now() < state.suppressHeaderUntil) return;
      var curY = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || 0);
      var navH = (UI.navTop && UI.navTop.offsetHeight) || 70;
      if (e.deltaY < -8) {
        setHeaderHidden(false);
      } else if (e.deltaY > 12 && curY > navH) {
        setHeaderHidden(true);
      }
    }, { passive: true });

    // 滚动监听：同步当前页码 + 滑动窗口预加载检测
    var onScrollOrResize = throttle(function () {
      syncCurrentViewPage();
      checkAutoResumeScroll();
    }, 120);
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', throttle(function () {
      syncNavSpacerHeight();
      syncCurrentViewPage();
      checkAutoResumeScroll();
    }, 120), { passive: true });

    // 键盘快捷键监听（捕获阶段，忽略输入框与修饰键组合）
    window.addEventListener('keydown', function (evt) {
      var active = document.activeElement;
      if (active && (active.nodeName === 'INPUT' || active.nodeName === 'TEXTAREA' || active.nodeName === 'SELECT' || active.isContentEditable)) {
        if ((evt.which || evt.keyCode) === 27) closePanel();
        return;
      }
      if (evt.ctrlKey || evt.altKey || evt.metaKey) return;

      var code = evt.which || evt.keyCode;
      if (code === 27) {
        if (state.reloadMode) setReloadMode(false);
        if (state.activePanel) closePanel();
        return;
      }

      var k = settings.keys;
      var matched = true;

      if (code === k.EXIT) {
        syncCurrentViewPage();
        if (UI.exitLinks[0]) UI.exitLinks[0].click();
      } else if (code === k.GALLERY) {
        if (UI.galleryLinks[0]) UI.galleryLinks[0].click();
      } else if (code === k.SCROLL_UP) {
        window.scrollBy(0, -Math.max(80, Math.round(window.innerHeight * 0.14)));
      } else if (code === k.SCROLL_DOWN) {
        window.scrollBy(0, Math.max(80, Math.round(window.innerHeight * 0.14)));
      } else if (code === k.PREV_PAGE) {
        jumpToAdjacentPage(-1);
      } else if (code === k.NEXT_PAGE) {
        jumpToAdjacentPage(1);
      } else if (code === k.ZOOM_IN || code === 107) {
        changeZoom('+');
      } else if (code === k.ZOOM_OUT || code === 109) {
        changeZoom('-');
      } else if (code === k.RESET_ZOOM || code === 96) {
        changeZoom('=');
      } else if (code === k.RELOAD_CUR) {
        var cur = getCurrentVisibleItem();
        if (cur) {
          cur.nlRetries = 0;
          showToast('正在换源刷新第 ' + cur.pageNum + ' 页...');
          reloadItemWithNl(cur, false);
        }
      } else {
        matched = false;
      }

      if (matched) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    }, true);

    // 注册油猴菜单命令
    if (typeof GM_registerMenuCommand !== 'undefined') {
      GM_registerMenuCommand('打开 Manga Loader 设置', openSettingsPanel);
    }

    // -----------------------------------------------------------------------
    // 放入首张图片并启动队列
    // -----------------------------------------------------------------------
    state.pendingNextUrl = initialData.nextUrl;
    appendPageItem(initialData);

    if (!state.pendingNextUrl) {
      state.finished = true;
      updateStatsDisplay();
    } else if (!state.pausedByLimit) {
      scheduleNextFetch();
    }
  }

  // =========================================================================
  // 单页图页面 (/s/...) 初始化入口
  // =========================================================================
  function initReaderPage() {
    var initialData = parsePageDoc(document, location.href, document.documentElement.innerHTML);
    if (!initialData.ok) {
      log('当前页面未解析到有效图片，跳过初始化: ' + initialData.error, 'warn');
      return;
    }

    var gid = extractGidFromUrl(location.href);
    var settings = getSettings();

    // 检查是否从画廊按钮跳转而来（一次性自动启动）
    var once = storeGet('ml-eh-once-autoload', null);
    var shouldOnceAutoload = !!(once && once.expire > Date.now() && (!once.gid || once.gid === gid));
    if (once) storeDel('ml-eh-once-autoload');

    // 检查是否刚点过退出按钮（一次性跳过全局自动启动）
    var skip = storeGet('ml-eh-skip-autoload', null);
    var shouldSkipAutoload = !!(skip && skip.expire > Date.now() && (!skip.gid || skip.gid === gid));
    if (skip) storeDel('ml-eh-skip-autoload');

    var started = false;
    var launchBtn = null;

    function triggerStart() {
      if (started) return;
      // 实时重新解析当前 DOM 与 URL，兼容 E-Hentai 原站 pushState 翻页后再手动启动瀑布流
      var latestData = parsePageDoc(document, location.href, document.documentElement.innerHTML);
      var dataToUse = latestData.ok ? latestData : initialData;
      started = true;
      if (launchBtn && launchBtn.parentNode) launchBtn.remove();
      startReader(dataToUse);
    }

    if (shouldOnceAutoload || (settings.autoload && !shouldSkipAutoload)) {
      log('自动进入瀑布流阅读模式...');
      triggerStart();
      return;
    }

    // 在右下角添加「瀑布流阅读 (Load Manga)」启动按钮
    launchBtn = document.createElement('button');
    launchBtn.type = 'button';
    launchBtn.textContent = '瀑布流阅读 (Load Manga)';
    launchBtn.title = '点击或按 Ctrl + , 启动连续瀑布流阅读';
    launchBtn.setAttribute('style', [
      'position:fixed', 'bottom:16px', 'right:16px', 'z-index:9999999',
      'background:#232733', 'color:#f5f5f5', 'border:1px solid #4c566a',
      'border-radius:8px', 'padding:8px 14px', 'font:600 13px/1.2 system-ui,-apple-system,sans-serif',
      'cursor:pointer', 'box-shadow:0 4px 14px rgba(0,0,0,0.45)', 'transition:background .15s'
    ].join(';'));
    launchBtn.addEventListener('mouseenter', function () { launchBtn.style.background = '#2e3446'; });
    launchBtn.addEventListener('mouseleave', function () { launchBtn.style.background = '#232733'; });
    launchBtn.addEventListener('click', triggerStart);
    document.body.appendChild(launchBtn);

    // 保留经典的 Ctrl + , 启动快捷键
    var onHotkey = function (e) {
      if (e.ctrlKey && !e.altKey && !e.shiftKey && e.keyCode === 188) {
        e.preventDefault();
        window.removeEventListener('keydown', onHotkey);
        triggerStart();
      }
    };
    window.addEventListener('keydown', onHotkey);

    if (typeof GM_registerMenuCommand !== 'undefined') {
      GM_registerMenuCommand('启动瀑布流阅读 (Ctrl + ,)', triggerStart);
      GM_registerMenuCommand('切换单页自动进入瀑布流（当前：' + (settings.autoload ? '开' : '关') + '）', function () {
        storeSet('ml-eh-autoload', !settings.autoload);
        alert('已' + (!settings.autoload ? '开启' : '关闭') + '自动进入瀑布流，刷新页面后生效。');
      });
    }
  }

  // =========================================================================
  // 路由分发
  // =========================================================================
  var pathname = location.pathname;
  if (/^\/s\/[^/]+\/\d+-\d+/.test(pathname)) {
    initReaderPage();
  } else if (/^\/g\/\d+\/[0-9a-f]+/i.test(pathname)) {
    initGalleryPage();
  }
})();
