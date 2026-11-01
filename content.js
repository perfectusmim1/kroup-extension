(function () {
  // Prevent duplicate injection
  if (window.__geminiTranslatorInjected) return;
  window.__geminiTranslatorInjected = true;

  // PiP Google penceresinin ICI: content.js tum cercevelere enjekte oldugu icin
  // bu dal iframe'in icinde calisir.
  // 1) Sonuc linklerini yeni sekmeye kir: siteler iframe'i engelledigi icin
  //    ayni pencerede acmak "icerik engellendi" veriyordu.
  // 2) O anki adresi ust cerceveye bildir: pop-out kaldigin yeri acsin.
  if (window.self !== window.top
      && /(^|\.)google\./.test(window.location.hostname)
      && window.location.pathname.indexOf("/search") === 0) {
    const pipRetarget = () => {
      document.querySelectorAll("a h3").forEach((h) => {
        const a = h.closest("a");
        if (a && a.target !== "_blank") {
          a.target = "_blank";
          a.rel = "noopener";
        }
      });
    };
    pipRetarget();
    if (document.documentElement) {
      new MutationObserver(pipRetarget).observe(document.documentElement, { childList: true, subtree: true });
    }
    let lastUrl = "";
    const report = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        try { window.parent.postMessage({ __geminiPip: true, url: lastUrl }, "*"); } catch (e) { void e; }
      }
    };
    ["pushState", "replaceState"].forEach((fn) => {
      try {
        const orig = history[fn];
        history[fn] = function () { const r = orig.apply(this, arguments); report(); return r; };
      } catch (e) { void e; }
    });
    window.addEventListener("popstate", report);
    window.addEventListener("hashchange", report);
    report();
    setInterval(report, 10000);
    return;
  }

  // Helper to handle Extension context invalidated error safely
  function safeSendMessage(message, callback) {
    try {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
        throw new Error("Extension context invalidated.");
      }
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("safeSendMessage: connection error:", chrome.runtime.lastError.message);
          if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        if (callback) callback(response);
      });
    } catch (e) {
      console.error("safeSendMessage error caught:", e);
      if (e.message.includes("Extension context invalidated")) {
        console.warn("Eklenti güncellendiği için sayfanın yenilenmesi gerekiyor.");
        if (message && (message.action === "translate" || message.action === "open-search-tab")) {
          alert("Eklenti güncellendi veya yeniden yüklendi. Lütfen bu sayfayı yenileyip tekrar deneyin.");
        }
      }
      if (callback) callback({ success: false, error: e.message });
    }
  }

  let selectionTranslationEnabled = true;
  let selectionSearchEnabled = true;
  let searchMode = "tab";
  let selectionTranslateMode = "bubble";
  let inlineTargetLang = "tr";
  let xTranslationEnabled = true;
  let xAutoTranslateEnabled = false;
  let xCacheEnabled = true;
  let xTargetLang = "tr";
  let xUiTheme = "light";
  let piDisablerEnabled = true;
  let geminiSpeedupEnabled = true;
  let geminiHideNotebooksEnabled = true;
  let geminiHideUpgradeEnabled = true;
  let savedTranslatorTargetLang = "tr";
  const isX = window.location.hostname.includes("x.com") || window.location.hostname.includes("twitter.com");
  const isGemini = window.location.hostname.includes("gemini.google.com");

  // Load settings from local storage
  chrome.storage.local.get(["selectionTranslationEnabled", "selectionSearchEnabled", "searchMode", "selectionTranslateMode", "inlineTargetLang", "xTranslationEnabled", "xAutoTranslateEnabled", "xCacheEnabled", "xTargetLang", "piDisablerEnabled", "geminiSpeedupEnabled", "geminiHideNotebooksEnabled", "geminiHideUpgradeEnabled", "translatorTargetLang", "popupTheme"], (result) => {
    selectionTranslationEnabled = result.selectionTranslationEnabled !== false;
    selectionSearchEnabled = result.selectionSearchEnabled !== false;
    searchMode = result.searchMode || "tab";
    selectionTranslateMode = result.selectionTranslateMode || "bubble";
    inlineTargetLang = result.inlineTargetLang || "tr";
    xTranslationEnabled = result.xTranslationEnabled !== false;
    xAutoTranslateEnabled = !!result.xAutoTranslateEnabled;
    xCacheEnabled = result.xCacheEnabled !== false;
    xTargetLang = result.xTargetLang || "tr";
    piDisablerEnabled = result.piDisablerEnabled !== false;
    geminiSpeedupEnabled = result.geminiSpeedupEnabled !== false;
    geminiHideNotebooksEnabled = result.geminiHideNotebooksEnabled !== false;
    geminiHideUpgradeEnabled = result.geminiHideUpgradeEnabled !== false;
    savedTranslatorTargetLang = result.translatorTargetLang || "tr";
    xUiTheme = result.popupTheme === "dark" ? "dark" : (result.popupTheme === "light" ? "light" : (detectXDark() ? "dark" : "light"));

    if (root) {
      root.setAttribute("data-theme", result.popupTheme === "dark" ? "dark" : "light");
    }

    if (targetSelect) {
      setSelectValue(targetSelect, savedTranslatorTargetLang);
    }

    if (isX && xTranslationEnabled) {
      loadPersistentXCache(() => {
        initXTranslation();
      });
    }

    if (isGemini) {
      initGeminiOptimizations();
      if (piDisablerEnabled || geminiHideNotebooksEnabled || geminiHideUpgradeEnabled) {
        initGeminiObserver();
      }
    }
  });

  // Listen for settings toggles changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.selectionTranslationEnabled) {
      selectionTranslationEnabled = changes.selectionTranslationEnabled.newValue !== false;
      if (!selectionTranslationEnabled && !selectionSearchEnabled) {
        hideWidget();
      }
    }
    if (changes.selectionSearchEnabled) {
      selectionSearchEnabled = changes.selectionSearchEnabled.newValue !== false;
      if (!selectionTranslationEnabled && !selectionSearchEnabled) {
        hideWidget();
      }
    }
    if (changes.xTranslationEnabled || changes.xAutoTranslateEnabled || changes.xTargetLang) {
      chrome.storage.local.get(["xTranslationEnabled", "xAutoTranslateEnabled", "xCacheEnabled", "xTargetLang"], (res) => {
        xTranslationEnabled = res.xTranslationEnabled !== false;
        xAutoTranslateEnabled = !!res.xAutoTranslateEnabled;
        xCacheEnabled = res.xCacheEnabled !== false;
        xTargetLang = res.xTargetLang || "tr";
        if (isX) {
          stopXTranslation();
          if (xTranslationEnabled) {
            loadPersistentXCache(() => {
              initXTranslation();
            });
          }
        }
      });
    }
    if (changes.popupTheme) {
      const t = changes.popupTheme.newValue;
      xUiTheme = t === "dark" ? "dark" : "light";
      if (root) root.setAttribute("data-theme", xUiTheme);
    }
    if (changes.searchMode) {
      searchMode = changes.searchMode.newValue || "tab";
    }
    if (changes.selectionTranslateMode) {
      selectionTranslateMode = changes.selectionTranslateMode.newValue || "bubble";
    }
    if (changes.inlineTargetLang) {
      inlineTargetLang = changes.inlineTargetLang.newValue || "tr";
    }
    if (changes.xCacheEnabled) {
      xCacheEnabled = changes.xCacheEnabled.newValue !== false;
    }
    if (changes.xTranslationPersistentCache) {
      syncMemoryCacheFromStorage(changes.xTranslationPersistentCache.newValue);
    }
    if (changes.piDisablerEnabled) {
      piDisablerEnabled = changes.piDisablerEnabled.newValue !== false;
      if (isGemini) {
        if (piDisablerEnabled) {
          initGeminiObserver();
        } else {
          stopGeminiObserver();
        }
      }
    }
    if (changes.geminiSpeedupEnabled) {
      geminiSpeedupEnabled = changes.geminiSpeedupEnabled.newValue !== false;
      if (isGemini) {
        initGeminiOptimizations();
        if (!geminiSpeedupEnabled) {
          restoreChatItems();
          stopGeminiObserver();
        } else {
          initGeminiObserver();
        }
      }
    }
    if (changes.geminiHideNotebooksEnabled) {
      geminiHideNotebooksEnabled = changes.geminiHideNotebooksEnabled.newValue !== false;
      if (isGemini) {
        initGeminiOptimizations();
        if (geminiHideNotebooksEnabled) {
          initGeminiObserver();
        } else {
          stopGeminiObserver();
          // Restore Notebooks UI dynamically if toggle is turned off
          const elements = document.querySelectorAll('h2, h3, div, span');
          for (const el of elements) {
            const text = el.textContent.trim();
            if (el.childNodes.length === 1 && (text === 'Notebooks' || text === 'Notebooklar')) {
              el.style.display = '';
              let sibling = el.nextElementSibling;
              while (sibling) {
                const sibText = sibling.textContent.trim().toLowerCase();
                if (sibText === 'recents' || sibText === 'recent' || sibText === 'son yazışmalar' || sibText === 'geçmiş' || sibling.querySelector('[href*="/app/"]')) {
                  break;
                }
                sibling.style.display = '';
                sibling = sibling.nextElementSibling;
              }
            }
          }
        }
      }
    }
    if (changes.geminiHideUpgradeEnabled) {
      geminiHideUpgradeEnabled = changes.geminiHideUpgradeEnabled.newValue !== false;
      if (isGemini) {
        initGeminiOptimizations();
        if (geminiHideUpgradeEnabled) {
          initGeminiObserver();
        } else {
          stopGeminiObserver();
          // Restore Upgrade button UI dynamically if toggle is turned off
          const links = document.querySelectorAll('a, button');
          for (const el of links) {
            const text = el.textContent.trim().toLowerCase();
            if (text.includes('upgrade') || text.includes('yükselt') || text.includes('try gemini advanced') || text.includes("gemini advanced'i deneyin")) {
              const parent = el.closest('div, li, mat-button, [class*="upgrade"]') || el;
              parent.style.display = '';
            }
          }
        }
      }
    }
  });

  // CSS and HTML inside Shadow DOM for style isolation
  const SHADOW_STYLES = `
    :host {
      --bg-primary: #ffffff;
      --bg-secondary: #f9f9f9;
      --bg-tertiary: #ececec;
      --bg-hover: rgba(0, 0, 0, 0.045);
      --bg-active: #ececec;
      --card-bg: rgba(255, 255, 255, 0.96);

      --text-primary: #0d0d0d;
      --text-secondary: #5d5d5d;
      --text-tertiary: #909090;

      --border-color: #e6e6e6;
      --border-strong: #d5d5d5;
      --focus-ring: rgba(13, 13, 13, 0.08);

      --accent-cyan: #06b6d4;
      --gradient-accent: linear-gradient(135deg, #06b6d4 0%, #3b82f6 55%, #8b5cf6 100%);

      --success-text: #059669;
      --error-text: #dc2626;
      --error-bg: rgba(220, 38, 38, 0.07);

      --shimmer-a: #ececec;
      --shimmer-b: #f7f7f7;

      --scrollbar-thumb: #d5d5d5;
      --backdrop-tint: rgba(0, 0, 0, 0.32);

      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;

      --shadow-lg: 0 24px 48px -16px rgba(0, 0, 0, 0.22), 0 2px 10px rgba(0, 0, 0, 0.07);
      --shadow-sm: 0 8px 24px -8px rgba(0, 0, 0, 0.2), 0 1px 4px rgba(0, 0, 0, 0.08);

      --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
      --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
      --t-fast: 140ms cubic-bezier(0.16, 1, 0.3, 1);
      --t-smooth: 220ms cubic-bezier(0.16, 1, 0.3, 1);

      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      pointer-events: auto;
      user-select: none;
    }

    :host([data-theme="dark"]) {
      --bg-primary: #212121;
      --bg-secondary: #171717;
      --bg-tertiary: #2f2f2f;
      --bg-hover: rgba(255, 255, 255, 0.06);
      --bg-active: #383838;
      --card-bg: rgba(28, 28, 28, 0.97);

      --text-primary: #ececec;
      --text-secondary: #b4b4b4;
      --text-tertiary: #828282;

      --border-color: rgba(255, 255, 255, 0.09);
      --border-strong: rgba(255, 255, 255, 0.18);
      --focus-ring: rgba(255, 255, 255, 0.09);

      --success-text: #4ade80;
      --error-text: #f87171;
      --error-bg: rgba(248, 113, 113, 0.1);

      --shimmer-a: #242424;
      --shimmer-b: #333333;

      --scrollbar-thumb: rgba(255, 255, 255, 0.18);
      --backdrop-tint: rgba(0, 0, 0, 0.55);

      --shadow-lg: 0 28px 56px -16px rgba(0, 0, 0, 0.75), 0 2px 12px rgba(0, 0, 0, 0.5);
      --shadow-sm: 0 10px 28px -8px rgba(0, 0, 0, 0.65), 0 1px 5px rgba(0, 0, 0, 0.45);
    }

    /* Floating action bar container */
    #gemini-floating-bar {
      position: absolute;
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      border-radius: 999px;
      z-index: 2147483647;
      transform: scale(0.72);
      opacity: 0;
      /* Hidden bar must NEVER swallow clicks meant for the page (sidebar toggles etc.) */
      pointer-events: none;
      transition: transform 240ms var(--ease-spring), opacity 150ms ease, background-color 220ms ease, border-color var(--t-fast), box-shadow var(--t-fast);
    }

    #gemini-floating-bar.visible {
      transform: scale(1);
      opacity: 1;
      pointer-events: auto;
    }

    #gemini-floating-bar:hover {
      border-color: var(--border-strong);
      box-shadow: var(--shadow-lg);
    }

    .floating-bar-btn {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: transparent;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-secondary);
      transition: background-color var(--t-fast), color var(--t-fast), transform var(--t-fast);
    }

    .floating-bar-btn:hover {
      background-color: var(--bg-hover);
      color: var(--text-primary);
    }

    .floating-bar-btn:active {
      transform: scale(0.88);
    }

    .floating-bar-btn.btn-translate svg {
      width: 18px;
      height: 18px;
      transition: transform 260ms var(--ease-spring);
    }

    .btn-translate:hover svg {
      transform: rotate(90deg) scale(1.08);
    }

    .floating-bar-btn.btn-search svg {
      width: 18px;
      height: 18px;
      transition: transform 240ms var(--ease-spring);
    }

    .btn-search:hover svg {
      transform: scale(1.1);
    }

    /* In-page Translation Card */
    #gemini-translation-card {
      position: absolute;
      width: 362px;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      z-index: 2147483646;
      transform: scale(0.94) translateY(8px);
      opacity: 0;
      pointer-events: none;
      transition: transform 220ms var(--ease-out), opacity 160ms ease, background-color 220ms ease;
      overflow: hidden;
    }

    #gemini-translation-card.visible {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    /* Card Header */
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 9px 10px;
      border-bottom: 1px solid var(--border-color);
      background: transparent;
    }

    .lang-selector-container {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-grow: 1;
      min-width: 0;
    }

    /* CUSTOM SELECT COMPONENTS */
    .custom-select {
      position: relative;
      flex-grow: 1;
      min-width: 0;
      max-width: 122px;
    }

    .custom-select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 9px;
      border-radius: var(--radius-sm);
      outline: none;
      cursor: pointer;
      text-align: left;
      height: 30px;
      box-sizing: border-box;
      transition: border-color var(--t-fast), box-shadow var(--t-fast), background-color var(--t-fast);
    }

    .custom-select-trigger span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 4px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .custom-select-trigger:hover {
      border-color: var(--border-strong);
    }

    .custom-select-trigger:focus,
    .custom-select.open .custom-select-trigger {
      border-color: var(--text-primary);
      box-shadow: 0 0 0 3px var(--focus-ring);
    }

    .custom-select-trigger svg {
      width: 12px;
      height: 12px;
      color: var(--text-tertiary);
      transition: transform 180ms var(--ease-out), color var(--t-fast);
      flex-shrink: 0;
    }

    .custom-select.open .custom-select-trigger svg {
      transform: rotate(180deg);
      color: var(--text-primary);
    }

    .custom-select-options {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      right: 0;
      max-width: 180px;
      background-color: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      max-height: 216px;
      overflow-y: auto;
      opacity: 0;
      transform: translateY(-5px) scale(0.97);
      transform-origin: top center;
      pointer-events: none;
      transition: opacity 140ms var(--ease-out), transform 160ms var(--ease-out);
    }

    .custom-select.open .custom-select-options {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .custom-select-options::-webkit-scrollbar {
      width: 4px;
    }

    .custom-select-options::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border-radius: 4px;
    }

    .custom-option {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 6px 10px;
      font-size: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: background-color 110ms ease, color 110ms ease;
      text-align: left;
    }

    .custom-option:hover {
      background-color: var(--bg-hover);
      color: var(--text-primary);
    }

    .custom-option.active {
      background-color: var(--bg-active);
      color: var(--text-primary);
      font-weight: 600;
    }

    .flag-img {
      width: 16px;
      height: 11.5px;
      border-radius: 2px;
      object-fit: cover;
      flex-shrink: 0;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
    }

    :host([data-theme="dark"]) .flag-img {
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14);
    }

    .flag-globe {
      width: 16px;
      font-size: 11px;
      line-height: 1;
      text-align: center;
      flex-shrink: 0;
    }

    .option-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .custom-select-trigger .flag-img {
      width: 15px;
      height: 11px;
    }

    .custom-select-trigger .flag-globe {
      width: 15px;
      font-size: 10px;
    }

    .btn-icon {
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 50%;
      transition: all var(--t-fast);
    }

    .btn-icon:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .btn-icon:active {
      transform: scale(0.88);
    }

    .btn-swap {
      flex-shrink: 0;
    }

    .btn-swap:hover {
      transform: rotate(180deg);
    }

    .btn-close:hover {
      color: var(--error-text);
      background-color: var(--error-bg);
    }

    /* Card Body */
    .card-body {
      padding: 13px;
      display: flex;
      flex-direction: column;
      gap: 11px;
      max-height: 320px;
      overflow-y: auto;
    }

    .card-body::-webkit-scrollbar {
      width: 5px;
    }

    .card-body::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border-radius: 4px;
    }

    .text-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
    }

    .text-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .text-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: var(--text-tertiary);
    }

    .source-label {
      color: var(--text-tertiary);
    }

    .target-label {
      color: var(--text-primary);
    }

    .text-content {
      font-size: 13.5px;
      line-height: 1.62;
      color: var(--text-primary);
      white-space: pre-wrap;
      user-select: text;
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
      padding: 11px 12px;
      border: 1px solid var(--border-color);
      transition: background-color 220ms ease;
    }

    .source-content {
      color: var(--text-secondary);
      font-size: 12.5px;
      max-height: 84px;
      overflow-y: auto;
    }

    .source-content::-webkit-scrollbar,
    .text-content::-webkit-scrollbar {
      width: 4px;
    }

    .source-content::-webkit-scrollbar-thumb,
    .text-content::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border-radius: 4px;
    }

    .divider {
      height: 1px;
      background: var(--border-color);
      margin: 2px 0;
    }

    /* Shimmer Loader animation */
    .shimmer-container {
      display: flex;
      flex-direction: column;
      gap: 9px;
      padding: 13px;
      border-radius: var(--radius-md);
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
    }

    .shimmer-container[hidden] {
      display: none !important;
    }

    .shimmer-line {
      height: 12px;
      border-radius: 6px;
      background: linear-gradient(90deg, var(--shimmer-a) 25%, var(--shimmer-b) 50%, var(--shimmer-a) 75%);
      background-size: 200% 100%;
      animation: loadingShimmer 1.15s infinite linear;
    }

    .shimmer-line.w-90 { width: 90%; }
    .shimmer-line.w-80 { width: 80%; }
    .shimmer-line.w-60 { width: 60%; }

    /* Card Footer */
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 13px;
      border-top: 1px solid var(--border-color);
      background: transparent;
      font-size: 11px;
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .footer-logo {
      width: 14px;
      height: 14px;
    }

    .footer-brand {
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.2px;
    }

    .footer-brand span {
      background: var(--gradient-accent);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-action-text {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 999px;
      transition: all var(--t-fast);
      font-family: inherit;
    }

    .btn-action-text:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .btn-action-text:active {
      transform: scale(0.95);
    }

    .btn-action-text.success {
      color: var(--success-text);
    }

    /* Error Message styling */
    .error-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 11px 12px;
      color: var(--error-text);
      font-size: 12px;
      background: var(--error-bg);
      border-radius: var(--radius-md);
    }

    .error-title {
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .error-desc {
      color: var(--text-secondary);
    }

    /* Search Backdrop */
    #gemini-search-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--backdrop-tint);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 2147483640;
      opacity: 0;
      pointer-events: none;
      transition: opacity 220ms var(--ease-out);
    }

    #gemini-search-backdrop.visible {
      opacity: 1;
      pointer-events: auto;
    }

    /* Search Window Card */
    #gemini-search-window {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -46%) scale(0.96);
      width: min(850px, 90vw);
      height: min(650px, 80vh);
      min-width: 380px;
      min-height: 280px;
      max-width: 96vw;
      max-height: 92vh;
      resize: both;
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      z-index: 2147483641;
      opacity: 0;
      pointer-events: none;
      transition: transform 260ms var(--ease-out), opacity 190ms ease;
      overflow: hidden;
    }

    #gemini-search-window.visible {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
      pointer-events: auto;
    }

    .search-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 11px 16px;
      border-bottom: 1px solid var(--border-color);
      background: transparent;
    }

    .search-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-header-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .search-logo {
      width: 16px;
      height: 16px;
      color: var(--text-secondary);
    }

    .search-title-label {
      font-weight: 600;
      font-size: 13.5px;
      color: var(--text-primary);
      letter-spacing: -0.2px;
    }

    .search-body {
      flex-grow: 1;
      position: relative;
      background: #ffffff;
      display: flex;
    }

    :host([data-theme="dark"]) .search-body {
      background: #131313;
    }

    #gemini-search-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #ffffff;
    }

    /* Keyframes */
    @keyframes loadingShimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
`;

  const LANGUAGE_LIST = [
  { code: "tr", name: "Türkçe", flag: "tr" },
  { code: "en", name: "İngilizce", flag: "gb" },
  { code: "de", name: "Almanca", flag: "de" },
  { code: "fr", name: "Fransızca", flag: "fr" },
  { code: "es", name: "İspanyolca", flag: "es" },
  { code: "it", name: "İtalyanca", flag: "it" },
  { code: "pt", name: "Portekizce", flag: "pt" },
  { code: "ru", name: "Rusça", flag: "ru" },
  { code: "ar", name: "Arapça", flag: "sa" },
  { code: "zh", name: "Çince (Basit)", flag: "cn" },
  { code: "zh-TW", name: "Çince (Geleneksel)", flag: "tw" },
  { code: "ja", name: "Japonca", flag: "jp" },
  { code: "ko", name: "Korece", flag: "kr" },
  { code: "hi", name: "Hintçe", flag: "in" },
  { code: "id", name: "Endonezce", flag: "id" },
  { code: "nl", name: "Hollandaca", flag: "nl" },
  { code: "pl", name: "Lehçe", flag: "pl" },
  { code: "sv", name: "İsveççe", flag: "se" },
  { code: "no", name: "Norveççe", flag: "no" },
  { code: "da", name: "Danca", flag: "dk" },
  { code: "fi", name: "Fince", flag: "fi" },
  { code: "el", name: "Yunanca", flag: "gr" },
  { code: "he", name: "İbranice", flag: "il" },
  { code: "hu", name: "Macarca", flag: "hu" },
  { code: "cs", name: "Çekçe", flag: "cz" },
  { code: "sk", name: "Slovakça", flag: "sk" },
  { code: "sl", name: "Slovence", flag: "si" },
  { code: "hr", name: "Hırvatça", flag: "hr" },
  { code: "sr", name: "Sırpça", flag: "rs" },
  { code: "bs", name: "Boşnakça", flag: "ba" },
  { code: "mk", name: "Makedonca", flag: "mk" },
  { code: "sq", name: "Arnavutça", flag: "al" },
  { code: "bg", name: "Bulgarca", flag: "bg" },
  { code: "ro", name: "Romence", flag: "ro" },
  { code: "uk", name: "Ukraynaca", flag: "ua" },
  { code: "be", name: "Beyaz Rusça", flag: "by" },
  { code: "et", name: "Estonca", flag: "ee" },
  { code: "lv", name: "Letonca", flag: "lv" },
  { code: "lt", name: "Litvanca", flag: "lt" },
  { code: "is", name: "İzlandaca", flag: "is" },
  { code: "ga", name: "İrlandaca", flag: "ie" },
  { code: "cy", name: "Galce", flag: "gb-wls" },
  { code: "ca", name: "Katalanca", flag: null },
  { code: "eu", name: "Baskça", flag: null },
  { code: "gl", name: "Galiçyaca", flag: null },
  { code: "mt", name: "Maltaca", flag: "mt" },
  { code: "lb", name: "Lüksemburgca", flag: "lu" },
  { code: "fy", name: "Frizce", flag: null },
  { code: "co", name: "Korsikaca", flag: null },
  { code: "fa", name: "Farsça", flag: "ir" },
  { code: "ur", name: "Urduca", flag: "pk" },
  { code: "ps", name: "Peştuca", flag: "af" },
  { code: "ku", name: "Kürtçe", flag: null },
  { code: "sd", name: "Sindhi Dili", flag: "pk" },
  { code: "bn", name: "Bengalce", flag: "bd" },
  { code: "pa", name: "Pencapça", flag: "in" },
  { code: "gu", name: "Güceratça", flag: "in" },
  { code: "mr", name: "Marathice", flag: "in" },
  { code: "ta", name: "Tamilce", flag: "in" },
  { code: "te", name: "Teluguca", flag: "in" },
  { code: "kn", name: "Kannadaca", flag: "in" },
  { code: "ml", name: "Malayalamca", flag: "in" },
  { code: "si", name: "Sinhala Dili", flag: "lk" },
  { code: "ne", name: "Nepalce", flag: "np" },
  { code: "as", name: "Asamca", flag: "in" },
  { code: "or", name: "Odiyaca", flag: "in" },
  { code: "th", name: "Tayca", flag: "th" },
  { code: "vi", name: "Vietnamca", flag: "vn" },
  { code: "km", name: "Kmerce", flag: "kh" },
  { code: "lo", name: "Laoca", flag: "la" },
  { code: "my", name: "Birmanca", flag: "mm" },
  { code: "ms", name: "Malayca", flag: "my" },
  { code: "tl", name: "Filipince (Tagalog)", flag: "ph" },
  { code: "ceb", name: "Sebuano Dili", flag: "ph" },
  { code: "jv", name: "Cava Dili", flag: "id" },
  { code: "su", name: "Sundanca", flag: "id" },
  { code: "sw", name: "Svahilice", flag: "ke" },
  { code: "am", name: "Amharca", flag: "et" },
  { code: "ha", name: "Hausaca", flag: "ng" },
  { code: "yo", name: "Yorubaca", flag: "ng" },
  { code: "ig", name: "İgboca", flag: "ng" },
  { code: "zu", name: "Zuluca", flag: "za" },
  { code: "xh", name: "Xhosaca", flag: "za" },
  { code: "st", name: "Güney Sothoca", flag: "ls" },
  { code: "sn", name: "Şonaca", flag: "zw" },
  { code: "ny", name: "Nyanjaca", flag: "mw" },
  { code: "mg", name: "Malgaşça", flag: "mg" },
  { code: "so", name: "Somalice", flag: "so" },
  { code: "af", name: "Afrikanca", flag: "za" },
  { code: "az", name: "Azerbaycan Türkçesi", flag: "az" },
  { code: "kk", name: "Kazakça", flag: "kz" },
  { code: "ky", name: "Kırgızca", flag: "kg" },
  { code: "uz", name: "Özbekçe", flag: "uz" },
  { code: "tk", name: "Türkmence", flag: "tm" },
  { code: "tt", name: "Tatarca", flag: null },
  { code: "mn", name: "Moğolca", flag: "mn" },
  { code: "ka", name: "Gürcüce", flag: "ge" },
  { code: "hy", name: "Ermenice", flag: "am" },
  { code: "yi", name: "Yidiş", flag: null },
  { code: "ht", name: "Haiti Kreyolu", flag: "ht" },
  { code: "haw", name: "Hawaiice", flag: "us" },
  { code: "mi", name: "Maori Dili", flag: "nz" },
  { code: "sm", name: "Samoaca", flag: "ws" },
  { code: "eo", name: "Esperanto", flag: null },
  { code: "la", name: "Latince", flag: null },
  { code: "hmn", name: "Hmong", flag: null },
  { code: "tg", name: "Tacikçe", flag: "tj" },
  { code: "jw", name: "Cava Dili", flag: "id" }
];


  function buildLangFlagHtml(flag) {
    if (flag) {
      return `<img class="flag-img" loading="lazy" decoding="async" src="https://flagcdn.com/w20/${flag}.png" srcset="https://flagcdn.com/w40/${flag}.png 2x" alt="" draggable="false">`;
    }
    return `<span class="flag-globe">🌐</span>`;
  }

  function buildLangOptionsHtml(includeAuto) {
    let html = "";
    if (includeAuto) {
      html += `<div class="custom-option" data-value="auto">${buildLangFlagHtml(null)}<span class="option-label">Dili Algıla</span></div>`;
    }
    LANGUAGE_LIST.forEach(lang => {
      html += `<div class="custom-option" data-value="${lang.code}">${buildLangFlagHtml(lang.flag)}<span class="option-label">${lang.name}</span></div>`;
    });
    return html;
  }

  function wireFlagFallbacks(scopeEl) {
    if (!scopeEl) return;
    scopeEl.querySelectorAll("img.flag-img").forEach(img => {
      img.addEventListener("error", () => {
        const globe = document.createElement("span");
        globe.className = "flag-globe";
        globe.textContent = "🌐";
        img.replaceWith(globe);
      }, { once: true });
    });
  }

  // Dil secenekleri agir (~117 bayrak gorseli); sayfa acilisinda degil,
  // dropdown ilk kez acilirken kurulur.
  function ensureContentLangOptions(selectEl) {
    if (!selectEl) return;
    const box = selectEl.querySelector(".custom-select-options");
    if (!box || box.dataset.langBuilt) return;
    box.dataset.langBuilt = "1";
    box.innerHTML = buildLangOptionsHtml(box.dataset.langOpts === "auto");
    wireFlagFallbacks(box);
    const input = selectEl.querySelector("input[type='hidden']");
    if (input) {
      const cur = box.querySelector(`.custom-option[data-value='${input.value}']`);
      if (cur) cur.classList.add("active");
    }
  }

  // HTML Structure inside Shadow DOM
  const SHADOW_HTML = `
    <div id="gemini-floating-bar">
      <button id="gemini-floating-btn" class="floating-bar-btn btn-translate" title="Gemini ile Çevir">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" fill="url(#overlay-logo-grad)" stroke="none"/>
          <defs>
            <linearGradient id="overlay-logo-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#06b6d4" />
              <stop offset="50%" stop-color="#3b82f6" />
              <stop offset="100%" stop-color="#6366f1" />
            </linearGradient>
          </defs>
        </svg>
      </button>
      <button id="gemini-search-btn" class="floating-bar-btn btn-search" title="Google'da Ara">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="fill: none; stroke: var(--text-secondary);">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    </div>

    <!-- Beautiful Google Search Window Backdrop -->
    <div id="gemini-search-backdrop"></div>

    <!-- Beautiful Google Search Window Card -->
    <div id="gemini-search-window">
      <div class="search-header">
        <div class="search-header-left">
          <svg class="search-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span class="search-title-label">Google Arama</span>
        </div>
        <div class="search-header-actions">
          <button id="gemini-search-reload-btn" class="btn-icon" title="Yenile">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </button>
          <button id="gemini-search-popout-btn" class="btn-icon" title="Yeni Sekmede Aç">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>
          <button id="gemini-search-close-btn" class="btn-icon btn-close" title="Kapat">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="search-body">
        <iframe id="gemini-search-iframe" src="about:blank" referrerpolicy="no-referrer"></iframe>
      </div>
    </div>

    <div id="gemini-translation-card">
      <div class="card-header">
        <div class="lang-selector-container">
          
          <!-- Beautiful Custom Select for Source -->
          <div class="custom-select select-lang" id="gemini-source-select-container">
            <button type="button" class="custom-select-trigger">
              <span>Dili Algıla</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="custom-select-options" data-lang-opts="auto"></div>
            <input type="hidden" id="gemini-source-lang" value="auto">
          </div>

          <button id="gemini-swap-btn" class="btn-icon btn-swap" title="Dilleri Değiştir">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
          </button>
          
          <!-- Beautiful Custom Select for Target -->
          <div class="custom-select select-lang" id="gemini-target-select-container">
            <button type="button" class="custom-select-trigger">
              <span>Türkçe</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="custom-select-options" data-lang-opts="plain"></div>
            <input type="hidden" id="gemini-target-lang" value="tr">
          </div>

        </div>
        <button id="gemini-close-btn" class="btn-icon btn-close" title="Kapat">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="card-body">
        <!-- Source Text -->
        <div class="text-container">
          <div class="text-title-row">
            <span class="text-label source-label">Seçili Metin</span>
            <button id="gemini-speech-source" class="btn-icon" title="Sesli Oku">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            </button>
          </div>
          <div id="gemini-source-content" class="text-content source-content"></div>
        </div>

        <div class="divider"></div>

        <!-- Target (Translation) Text / Loader -->
        <div class="text-container">
          <div class="text-title-row">
            <span class="text-label target-label">Yapay Zeka Çevirisi</span>
            <button id="gemini-speech-target" class="btn-icon" title="Sesli Oku">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            </button>
          </div>
          
          <!-- Shimmer skeleton loader -->
          <div id="gemini-loader" class="shimmer-container" hidden>
            <div class="shimmer-line w-90"></div>
            <div class="shimmer-line w-80"></div>
            <div class="shimmer-line w-60"></div>
          </div>

          <!-- Translation result -->
          <div id="gemini-target-content" class="text-content"></div>
        </div>
      </div>

      <div class="card-footer">
        <div class="footer-left">
          <svg class="footer-logo" viewBox="0 0 24 24">
            <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z"/>
          </svg>
          <span class="footer-brand">Gemini <span>Toolkit</span></span>
        </div>
        <div class="footer-actions">
          <button id="gemini-copy-btn" class="btn-action-text">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Kopyala</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Create widget host element in host page DOM
  const root = document.createElement("div");
  root.id = "gemini-translator-root";
  root.style.cssText = "position: absolute; top: 0; left: 0; z-index: 2147483647; width: 0; height: 0; pointer-events: none;";
  
  // Attach Shadow DOM for encapsulation
  const shadow = root.attachShadow({ mode: "open" });

  // Inject Styles and HTML
  const styleEl = document.createElement("style");
  styleEl.textContent = SHADOW_STYLES;
  shadow.appendChild(styleEl);

  const container = document.createElement("div");
  container.innerHTML = SHADOW_HTML;
  shadow.appendChild(container);
  wireFlagFallbacks(container);

  // Inline translation wait-cursor style (page level)
  if (!document.getElementById("gemini-inline-style")) {
    const inlineStyle = document.createElement("style");
    inlineStyle.id = "gemini-inline-style";
    inlineStyle.textContent = ".gemini-inline-translating, .gemini-inline-translating * { cursor: wait !important; }";
    document.head.appendChild(inlineStyle);
  }

  document.body.appendChild(root);

  // Skip sidebar assistant initialization (feature removed)

  // Core UI Element references
  const floatingBar = shadow.getElementById("gemini-floating-bar");
  const btn = shadow.getElementById("gemini-floating-btn");
  const searchBtn = shadow.getElementById("gemini-search-btn");
  const card = shadow.getElementById("gemini-translation-card");
  
  // Google Search Window References
  const searchWindow = shadow.getElementById("gemini-search-window");
  const searchBackdrop = shadow.getElementById("gemini-search-backdrop");
  const searchCloseBtn = shadow.getElementById("gemini-search-close-btn");
  const searchReloadBtn = shadow.getElementById("gemini-search-reload-btn");
  const searchPopoutBtn = shadow.getElementById("gemini-search-popout-btn");
  const searchIframe = shadow.getElementById("gemini-search-iframe");
  
  // Custom Select Wrapper References
  const sourceSelect = shadow.getElementById("gemini-source-select-container");
  const targetSelect = shadow.getElementById("gemini-target-select-container");
  
  // Hidden inputs containing values
  const sourceInput = shadow.getElementById("gemini-source-lang");
  const targetInput = shadow.getElementById("gemini-target-lang");

  const swapBtn = shadow.getElementById("gemini-swap-btn");
  const closeBtn = shadow.getElementById("gemini-close-btn");
  const sourceContent = shadow.getElementById("gemini-source-content");
  const targetContent = shadow.getElementById("gemini-target-content");
  const loader = shadow.getElementById("gemini-loader");
  const copyBtn = shadow.getElementById("gemini-copy-btn");
  const speechSource = shadow.getElementById("gemini-speech-source");
  const speechTarget = shadow.getElementById("gemini-speech-target");

  // State Management
  let selectedText = "";
  let btnX = 0;
  let btnY = 0;
  let currentUtterance = null;

  // Programmatic Value Setter for Custom Dropdowns
  function setSelectValue(selectEl, value) {
    const input = selectEl.querySelector("input[type='hidden']");
    const triggerSpan = selectEl.querySelector(".custom-select-trigger span");
    if (!input || !triggerSpan) return;
    input.value = value;
    const option = selectEl.querySelector(`.custom-option[data-value='${value}']`);

    if (input && option && triggerSpan) {
      triggerSpan.innerHTML = option.innerHTML;
      wireFlagFallbacks(triggerSpan);

      // Manage active option classes
      selectEl.querySelectorAll(".custom-option").forEach(opt => opt.classList.remove("active"));
      option.classList.add("active");
      return;
    }

    // Liste henuz kurulmadiysa etiketi katalogdan ciz (kurulum ilk acilista)
    const lang = LANGUAGE_LIST.find(l => l.code === value);
    const name = value === "auto" ? "Dili Algıla" : (lang ? lang.name : value);
    triggerSpan.innerHTML = `${buildLangFlagHtml(lang ? lang.flag : null)}<span class="option-label">${name}</span>`;
    wireFlagFallbacks(triggerSpan);
  }

  // Initialize custom dropdown triggers and click listeners
  function initCustomSelect(selectEl) {
    const trigger = selectEl.querySelector(".custom-select-trigger");
    const box = selectEl.querySelector(".custom-select-options");

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      
      // Close other open select
      const otherSelect = selectEl === sourceSelect ? targetSelect : sourceSelect;
      otherSelect.classList.remove("open");

      if (!selectEl.classList.contains("open")) ensureContentLangOptions(selectEl);
      selectEl.classList.toggle("open");
    });

    // Delegated: lazy kurulan secenekleri de yakalar
    box.addEventListener("click", (e) => {
      const option = e.target.closest(".custom-option");
      if (!option || !box.contains(option)) return;
      e.stopPropagation();
      
      const val = option.getAttribute("data-value");
      setSelectValue(selectEl, val);
      selectEl.classList.remove("open");
      
      if (selectEl === targetSelect) {
        savedTranslatorTargetLang = val;
        chrome.storage.local.set({ translatorTargetLang: val });
      }
      
      // Re-translate immediately
      performTranslation();
    });
  }

  // Initialize Custom Selects
  initCustomSelect(sourceSelect);
  initCustomSelect(targetSelect);

  // Close dropdowns on card clicks that are not on dropdowns
  shadow.addEventListener("click", () => {
    sourceSelect.classList.remove("open");
    targetSelect.classList.remove("open");
  });

  // Auto-language defaults logic based on selections
  function smartDefaultLanguages(text) {
    // Basic regex checks for Turkish chars
    const hasTrChars = /[ıİğĞüÜşŞöÖçÇ]/.test(text);
    if (hasTrChars) {
      setSelectValue(sourceSelect, "tr");
      if (savedTranslatorTargetLang === "tr") {
        setSelectValue(targetSelect, "en");
      } else {
        setSelectValue(targetSelect, savedTranslatorTargetLang);
      }
    } else {
      setSelectValue(sourceSelect, "auto");
      setSelectValue(targetSelect, savedTranslatorTargetLang);
    }
  }
  // Position and display floating bar
  function showFloatingButton(x, y) {
    btnX = x;
    btnY = y;
    
    // Check which buttons are enabled and show them
    const showTrans = selectionTranslationEnabled;
    const showSearch = selectionSearchEnabled;

    if (!showTrans && !showSearch) {
      hideWidget();
      return;
    }

    // Toggle button visibilities inside the bar
    btn.style.display = showTrans ? "flex" : "none";
    searchBtn.style.display = showSearch ? "flex" : "none";

    // Add scroll offsets to position absolutely in the document
    const pageX = x + window.scrollX;
    const pageY = y + window.scrollY;

    // Small offset so it doesn't overlap exactly with the cursor
    floatingBar.style.left = `${pageX + 10}px`;
    floatingBar.style.top = `${pageY + 10}px`;
    
    floatingBar.classList.add("visible");
    card.classList.remove("visible"); // make sure card is hidden when bar pops
  }

  // Position and display translation card
  function showTranslationCard() {
    floatingBar.classList.remove("visible");

    // Position the card near the button click coordinates
    let cardLeft = btnX + window.scrollX;
    
    // Avoid card overflow on screen boundaries (Horizontal)
    const cardWidth = 360;
    if (btnX + cardWidth > window.innerWidth) {
      cardLeft = window.innerWidth - cardWidth - 20 + window.scrollX;
    }
    if (cardLeft < 10) cardLeft = 10;

    // Avoid card overflow on screen boundaries (Vertical)
    const cardHeight = 400; // safe estimate of translation card height
    let cardTop = btnY + window.scrollY + 20;

    if (btnY + cardHeight + 20 > window.innerHeight) {
      // Position above the mouse if it overflows the bottom
      cardTop = btnY + window.scrollY - cardHeight - 15;
      
      // Ensure it doesn't overflow the top of the viewport
      if (cardTop < window.scrollY + 10) {
        cardTop = window.scrollY + 10;
      }
    }

    card.style.left = `${cardLeft}px`;
    card.style.top = `${cardTop}px`;

    sourceContent.textContent = selectedText;
    targetContent.textContent = "";
    loader.hidden = false;
    
    card.classList.add("visible");
    
    // Trigger the translation API
    performTranslation();
  }

  function hideWidget() {
    floatingBar.classList.remove("visible");
    card.classList.remove("visible");
    sourceSelect.classList.remove("open");
    targetSelect.classList.remove("open");
    stopSpeech();
  }

  // Show Search Window
  function showSearchWindow() {
    if (searchMode === "pip") {
      openPipSearch();
    } else {
      floatingBar.classList.remove("visible");
      // Open search query in a new browser tab via background script
      safeSendMessage({ action: "open-search-tab", query: selectedText });
    }
  }

  // In-page (PiP) Google search with real browser session (cookies) via iframe
  let pipResizeTimer = null;
  let pipResizeObserver = null;
  let lastPipQuery = "";
  let pipCurrentUrl = "";

  // PiP iframe'inden gelen adres bildirimleri (kaldigin yer pop-out icin)
  window.addEventListener("message", (e) => {
    if (e && e.data && e.data.__geminiPip === true
        && typeof e.data.url === "string" && /^https?:\/\//.test(e.data.url)) {
      pipCurrentUrl = e.data.url;
    }
  });

  function buildPipSearchUrl(query) {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  function openPipSearch() {
    floatingBar.classList.remove("visible");
    searchBackdrop.classList.add("visible");
    searchWindow.classList.add("visible");

    chrome.storage.local.get(["searchPipW", "searchPipH"], (res) => {
      if (res.searchPipW && res.searchPipH) {
        searchWindow.style.width = res.searchPipW + "px";
        searchWindow.style.height = res.searchPipH + "px";
      }
    });

    if (!pipResizeObserver) {
      pipResizeObserver = new ResizeObserver(() => {
        if (pipResizeTimer) clearTimeout(pipResizeTimer);
        pipResizeTimer = setTimeout(() => {
          chrome.storage.local.set({
            searchPipW: Math.round(searchWindow.offsetWidth),
            searchPipH: Math.round(searchWindow.offsetHeight)
          });
        }, 500);
      });
      pipResizeObserver.observe(searchWindow);
    }

    lastPipQuery = selectedText;
    pipCurrentUrl = buildPipSearchUrl(lastPipQuery);
    // Always start from a fresh frame so stale/AFK sessions never break the search
    searchIframe.src = "about:blank";
    setTimeout(() => {
      searchIframe.src = buildPipSearchUrl(lastPipQuery);
    }, 80);
  }

  function reloadPipSearch() {
    if (!lastPipQuery) return;
    searchIframe.src = "about:blank";
    setTimeout(() => {
      searchIframe.src = buildPipSearchUrl(lastPipQuery);
    }, 80);
  }

  // Translate the selected text directly in the page, preserving fonts/emojis/styles
  function inlineTranslateSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    floatingBar.classList.remove("visible");

    const applyCursor = () => document.documentElement.classList.add("gemini-inline-translating");
    const clearCursor = () => document.documentElement.classList.remove("gemini-inline-translating");

    if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
      const node = range.startContainer;
      const start = Math.min(range.startOffset, range.endOffset);
      const end = Math.max(range.startOffset, range.endOffset);
      const original = node.textContent;
      const part = original.slice(start, end);
      if (!part.trim()) return;

      applyCursor();
      safeSendMessage({ action: "translate", text: part, sourceLang: "auto", targetLang: inlineTargetLang }, (response) => {
        clearCursor();
        if (response && response.success) {
          node.textContent = original.slice(0, start) + response.translation + original.slice(end);
          selection.removeAllRanges();
        }
      });
      return;
    }

    const nodes = [];
    const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.textContent && n.textContent.trim() && range.intersectsNode(n)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    if (nodes.length === 0) return;

    const originals = nodes.map(nd => nd.textContent);
    applyCursor();
    safeSendMessage({ action: "translate-batch", texts: originals, targetLang: inlineTargetLang }, (response) => {
      clearCursor();
      if (response && response.success && Array.isArray(response.translations)) {
        nodes.forEach((nd, i) => {
          if (response.translations[i]) nd.textContent = response.translations[i];
        });
        selection.removeAllRanges();
      }
    });
  }

  function hideSearchWindow() {
    searchBackdrop.classList.remove("visible");
    searchWindow.classList.remove("visible");
    searchIframe.src = "about:blank"; // clear iframe src to stop page processes
  }
  // Speech Synthesizer wrapper
  function stopSpeech() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function speakText(text, langCode) {
    stopSpeech();
    
    if (!window.speechSynthesis || !text) return;

    // Map extension short codes to speech locales
    const localeRefinements = {
      ar: "ar-SA",
      ceb: "fil-PH",
      cy: "cy-GB",
      en: "en-US",
      fil: "fil-PH",
      ga: "ga-IE",
      ha: "ha-NG",
      haw: "haw-US",
      he: "he-IL",
      ig: "ig-NG",
      iw: "he-IL",
      jv: "jv-ID",
      km: "km-KH",
      ku: "tr-TR",
      lo: "lo-LA",
      ms: "ms-MY",
      no: "nb-NO",
      ny: "ny-MW",
      pt: "pt-BR",
      sd: "sd-PK",
      st: "st-ZA",
      sv: "sv-SE",
      sw: "sw-KE",
      ta: "ta-IN",
      tl: "fil-PH",
      tt: "tt-RU",
      yo: "yo-NG",
      zh: "zh-CN",
      "zh-TW": "zh-TW"
    };

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = localeRefinements[langCode] || langCode;
    utterance.rate = 1.0;
    
    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // Handle Gemini Translation over extension messaging channel
  function performTranslation() {
    loader.hidden = false;
    targetContent.textContent = "";
    
    const sourceLang = sourceInput.value;
    const targetLang = targetInput.value;

    safeSendMessage(
      {
        action: "translate",
        text: selectedText,
        sourceLang: sourceLang,
        targetLang: targetLang
      },
      (response) => {
        loader.hidden = true;

        if (chrome.runtime.lastError) {
          showError("Bağlantı Hatası", "Uzantı arka plan servis çalıştırıcısı ile bağlantı kurulamadı. Lütfen uzantıyı yenileyin.");
          return;
        }

        if (response && response.success) {
          targetContent.textContent = response.translation;
        } else {
          const errMsg = response ? response.error : "Bilinmeyen bir hata oluştu.";
          showError("Çeviri Hatası", errMsg);
        }
      }
    );
  }

  function showError(title, desc) {
    targetContent.innerHTML = 
      '<div class="error-container">' +
        '<div class="error-title">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">' +
            '<circle cx="12" cy="12" r="10"></circle>' +
            '<line x1="12" y1="8" x2="12" y2="12"></line>' +
            '<line x1="12" y1="16" x2="12.01" y2="16"></line>' +
          '</svg>' +
          title +
        '</div>' +
        '<div class="error-desc">' + desc + '</div>' +
      '</div>';
  }

  // LISTENERS

  // Text selection detection
  let geminiMouseGesture = { x: 0, y: 0, selection: "", hasSelection: false };

  // Interactive controls must never be hijacked by the floating widget.
  // Sites like Gemini/ChatGPT keep a stale text selection alive when their
  // sidebar toggle / buttons are clicked, which used to pop the bar right on
  // top of the control and swallow the click.
  const INTERACTIVE_SELECTOR = [
    "button", "a", "input", "textarea", "select", "option", "label", "summary",
    '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]',
    '[role="menuitemcheckbox"]', '[role="menuitemradio"]', '[role="option"]',
    '[role="checkbox"]', '[role="radio"]', '[role="switch"]',
    '[aria-haspopup]', '[contenteditable="true"]', '[contenteditable=""]',
    "[onclick]"
  ].join(",");

  function isInteractiveTarget(node) {
    let el = node;
    if (el && el.nodeType === Node.TEXT_NODE) el = el.parentElement;
    if (!el || el.nodeType !== Node.ELEMENT_NODE || !el.closest) return false;
    return !!el.closest(INTERACTIVE_SELECTOR);
  }

  document.addEventListener("mousedown", (e) => {
    const path = e.composedPath();
    if (path.includes(root)) return;
    const sel = window.getSelection();
    const selText = sel ? sel.toString() : "";
    geminiMouseGesture = {
      x: e.clientX,
      y: e.clientY,
      selection: selText,
      hasSelection: selText.trim().length > 1
    };
  }, true);

  document.addEventListener("mouseup", (e) => {
    if (!selectionTranslationEnabled && !selectionSearchEnabled) return;
    // Ignore mouseup clicks that happen inside our Shadow DOM
    const path = e.composedPath();
    if (path.includes(root)) return;

    const dragged = Math.hypot(e.clientX - geminiMouseGesture.x, e.clientY - geminiMouseGesture.y) >= 5;

    // A plain click on an interactive control (sidebar toggle, button, link...)
    // belongs to the page - never pop the widget on top of it, even if a stale
    // text selection is still alive on the page.
    if (!dragged && isInteractiveTarget(e.target)) {
      hideWidget();
      return;
    }

    // Small delay to let the browser finalize the selection bounds
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text.length > 1) {
        const selectionChanged = text !== geminiMouseGesture.selection.trim();
        const isFreshSelection = dragged || selectionChanged || !geminiMouseGesture.hasSelection;

        // Only react to genuine selection gestures (drag / double-click / triple-click).
        // Plain clicks on elements that keep a stale selection (e.g. the Gemini logo)
        // must NOT re-open the widget.
        if (!isFreshSelection) {
          hideWidget();
          return;
        }

        selectedText = text;
        smartDefaultLanguages(text);
        
        // Show button at mouse coordinates
        showFloatingButton(e.clientX, e.clientY);
      } else {
        // If selection is cleared and we click outside, hide
        // But only if we didn't click the button or card itself
        if (!path.includes(root)) {
          hideWidget();
        }
      }
    }, 20);
  });

  // Floating Translate button trigger
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (selectionTranslateMode === "inline") {
      inlineTranslateSelection();
    } else {
      showTranslationCard();
    }
  });

  // Floating Search button trigger
  searchBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showSearchWindow();
  });

  // Google Search Close Button
  searchCloseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    hideSearchWindow();
  });

  // Google Search Reload Button
  searchReloadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    reloadPipSearch();
  });

  // Google Search Pop-out Button (iframe'de kaldigin yeri yeni sekmede ac)
  searchPopoutBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const url = pipCurrentUrl || buildPipSearchUrl(lastPipQuery || selectedText);
    safeSendMessage({ action: "open-search-tab-url", url });
    hideSearchWindow();
  });

  // Google Search Backdrop Click
  searchBackdrop.addEventListener("click", (e) => {
    e.stopPropagation();
    hideSearchWindow();
  });

  // Swap Languages logic
  swapBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const src = sourceInput.value;
    const target = targetInput.value;

    if (src !== "auto") {
      setSelectValue(sourceSelect, target);
      setSelectValue(targetSelect, src);
      savedTranslatorTargetLang = src;
      chrome.storage.local.set({ translatorTargetLang: src });
      performTranslation();
    } else {
      // If auto-detect, set source to current target and default target to tr/en fallback
      setSelectValue(sourceSelect, target);
      const fallbackTarget = target === "tr" ? "en" : "tr";
      setSelectValue(targetSelect, fallbackTarget);
      savedTranslatorTargetLang = fallbackTarget;
      chrome.storage.local.set({ translatorTargetLang: fallbackTarget });
      performTranslation();
    }
  });

  // Close widget
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    hideWidget();
  });

  // Text-To-Speech triggers
  speechSource.addEventListener("click", (e) => {
    e.stopPropagation();
    // If source selection is 'auto', read using detected language rules or target fallback
    const srcLang = sourceInput.value === "auto" ? "en" : sourceInput.value;
    speakText(selectedText, srcLang);
  });

  speechTarget.addEventListener("click", (e) => {
    e.stopPropagation();
    speakText(targetContent.textContent, targetInput.value);
  });

  // Clipboard copy implementation with visual feedback
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const textToCopy = targetContent.textContent;
    if (!textToCopy) return;

    // Use textarea + execCommand as primary (more reliable in extension contexts)
    let copied = false;
    const textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      copied = document.execCommand("copy");
    } catch (ex) {
      copied = false;
    }
    document.body.removeChild(textarea);

    const doCopyFeedback = () => {
      const originalHTML = copyBtn.innerHTML;
      
      copyBtn.classList.add("success");
      copyBtn.innerHTML = 
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="20 6 9 17 4 12"></polyline>' +
        '</svg>' +
        '<span>Kopyalandı!</span>';

      setTimeout(() => {
        copyBtn.classList.remove("success");
        copyBtn.innerHTML = originalHTML;
      }, 1500);
    };

    if (copied) {
      doCopyFeedback();
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        doCopyFeedback();
      }).catch(err => {
        console.error("Metin kopyalanamadı: ", err);
      });
    }
  });

  // Close on clicks outside the widget container (capture phase so sites that
  // stopPropagation on their own buttons cannot keep our widget alive on top)
  document.addEventListener("mousedown", (e) => {
    const path = e.composedPath();
    if (!path.includes(root)) {
      hideWidget();
    }
  }, true);

  // Close on Escape key press
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideWidget();
      hideSearchWindow();
    }
  });

  // ==========================================
  // WHOLE PAGE TRANSLATION & RESTORATION LOGIC
  // ==========================================
  let isPageTranslating = false;
  let currentTranslationPercent = 0;
  let hasPageBeenTranslated = false;
  let lastTargetLang = "tr";

  // Sekme mikseri: oynatici elemanlarinin sesini dogrudan kis (yakalama
  // gerekmez, arka sekmede de calisir, kayit simgesi cikarmaz).
  let mixerElementVolume = null;
  let mixerElementObserver = null;
  function mixerApplyElementVolume(vol) {
    mixerElementVolume = vol;
    const v = Math.max(0, Math.min(100, vol)) / 100;
    document.querySelectorAll("audio, video").forEach((el) => {
      try { el.volume = v; } catch (e) { void e; }
    });
    if (!mixerElementObserver) {
      mixerElementObserver = new MutationObserver((muts) => {
        if (mixerElementVolume === null || mixerElementVolume === 100) return;
        const vv = mixerElementVolume / 100;
        for (const m of muts) {
          for (const n of m.addedNodes) {
            if (!n || n.nodeType !== 1) continue;
            if (n.tagName === "AUDIO" || n.tagName === "VIDEO") {
              try { n.volume = vv; } catch (e) { void e; }
            } else if (n.querySelectorAll) {
              n.querySelectorAll("audio, video").forEach((el) => {
                try { el.volume = vv; } catch (e) { void e; }
              });
            }
          }
        }
      });
      mixerElementObserver.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }
  }

  // Listen for messages from popup.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "mixer-set-element-volume") {
      try {
        mixerApplyElementVolume(message.volume);
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
      return false;
    }
    if (message.action === "translate-page-start") {
      translateWholePage(message.targetLang);
    } else if (message.action === "visual-translate-start") {
      startVisualTranslate();
    } else if (message.action === "translate-page-restore") {
      restoreWholePageOriginals();
    } else if (message.action === "query-page-translation-status") {
      sendResponse({
        isPageTranslating: isPageTranslating,
        percent: currentTranslationPercent,
        hasPageBeenTranslated: hasPageBeenTranslated,
        targetLang: lastTargetLang
      });
    }
  });

  // Recursively collect text nodes that should be translated
  function collectTextNodes() {
    const textNodes = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          const tagName = parent.tagName.toLowerCase();
          const rejectTags = ['script', 'style', 'code', 'pre', 'noscript', 'textarea', 'input', 'select'];
          
          if (rejectTags.includes(tagName) || parent.closest('#gemini-translator-root')) {
            return NodeFilter.FILTER_REJECT;
          }

          const text = node.textContent.trim();
          if (text.length <= 1) {
            return NodeFilter.FILTER_REJECT;
          }

          // Avoid translating numeric values or pure punctuation/symbols
          if (/^[0-9\s\p{P}]+$/u.test(text)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    return textNodes;
  }

  // Restore page to its original state
  function restoreWholePageOriginals() {
    const textNodes = collectTextNodes();
    textNodes.forEach(node => {
      if (node.__originalText !== undefined) {
        node.textContent = node.__originalText;
      }
    });
    hasPageBeenTranslated = false;
    currentTranslationPercent = 0;
  }

  // Perform recursive batch page translation using Gemini batch API
  async function translateWholePage(targetLang) {
    if (isPageTranslating) return;
    isPageTranslating = true;
    currentTranslationPercent = 0;
    lastTargetLang = targetLang;
    hasPageBeenTranslated = false;

    try {
      const textNodes = collectTextNodes();
      const totalNodes = textNodes.length;

      if (totalNodes === 0) {
        hasPageBeenTranslated = true;
        safeSendMessage({ action: "translation-page-success" });
        isPageTranslating = false;
        return;
      }

      // Store original text values
      textNodes.forEach(node => {
        if (node.__originalText === undefined) {
          node.__originalText = node.textContent;
        }
      });

      const BATCH_SIZE = 250; // Increased to 250 to translate the page in a single request and avoid rate limits (20 RPM)
      let completedCount = 0;

      for (let i = 0; i < totalNodes; i += BATCH_SIZE) {
        const batch = textNodes.slice(i, i + BATCH_SIZE);
        const textsToTranslate = batch.map(node => node.__originalText.trim());

        // Perform translation via background service worker
        const result = await new Promise((resolve, reject) => {
          safeSendMessage(
            {
              action: "translate-batch",
              texts: textsToTranslate,
              targetLang: targetLang
            },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              if (response && response.success) {
                resolve(response.translations);
              } else {
                reject(new Error(response ? response.error : "Batch translation failed."));
              }
            }
          );
        });

        // Apply translations back to DOM, preserving leading and trailing spacing
        batch.forEach((node, idx) => {
          const original = node.__originalText;
          const translated = result[idx];
          
          if (translated) {
            const leadingSpaces = original.match(/^\s*/)[0];
            const trailingSpaces = original.match(/\s*$/)[0];
            node.textContent = leadingSpaces + translated + trailingSpaces;
          }
        });

        completedCount += batch.length;
        currentTranslationPercent = Math.round((completedCount / totalNodes) * 100);
        
        // Report progress back to popup
        safeSendMessage({ action: "translation-page-progress", percent: currentTranslationPercent });
      }

      hasPageBeenTranslated = true;
      safeSendMessage({ action: "translation-page-success" });

    } catch (error) {
      console.error("Page translation error: ", error);
      safeSendMessage({ action: "translation-page-error", error: error.message });
    } finally {
      isPageTranslating = false;
    }
  }

  // ==========================================
  // X (TWITTER) AI-TRANSLATION OVERLAYS
  // ==========================================
  let xObserver = null;
  // Scroll-stability guards: our own DOM writes must never fight X's
  // virtual-list / scroll-restoration (tweet -> back stays in place).
  let xIsInjecting = false;
  let xSuspendUntil = 0;
  let xCacheObserver = null;
  const xPendingCacheApply = new Map(); // tweetEl -> { btn, statusId }

  function isOwnXMutationNode(n) {
    return !!(n && n.nodeType === Node.ELEMENT_NODE &&
      n.matches(".gemini-x-wrapper,.gemini-x-translate-btn,.gemini-x-reply-btn,.gemini-x-sep,.gemini-x-result-card,.gemini-x-loader,.gemini-x-reply-overlay,.gemini-x-reply-dialog"));
  }

  function isTweetNearViewport(el, marginPx) {
    if (!el || !el.isConnected) return false;
    try {
      const r = el.getBoundingClientRect();
      const m = marginPx == null ? 900 : marginPx;
      return r.bottom > -m && r.top < (window.innerHeight + m);
    } catch (e) { return true; }
  }

  function applyCachedWhenVisible(tweetElement, buttonElement, statusId) {
    // During SPA scroll-restoration never touch text heights immediately,
    // even for on-screen tweets: defer until restoration settles.
    const suspended = Date.now() < xSuspendUntil;
    if (!suspended && isTweetNearViewport(tweetElement, 600)) {
      applyCachedTranslation(tweetElement, statusId, buttonElement);
      return;
    }
    // Defer off-screen height changes until the tweet is actually visible.
    // Applying cached translations to tweets above the viewport is what
    // shifts content and breaks X's scroll restoration.
    xPendingCacheApply.set(tweetElement, { btn: buttonElement, statusId });
    if (!xCacheObserver) {
      xCacheObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const t = entry.target;
          const p = xPendingCacheApply.get(t);
          if (p && t.isConnected) {
            xPendingCacheApply.delete(t);
            try {
              // DOM node may have been recycled for another tweet while waiting
              const cur = t.querySelector('a[href*="/status/"]');
              const curId = cur ? normalizeStatusId(cur.getAttribute("href")) : null;
              if (curId === p.statusId) applyCachedTranslation(t, p.statusId, p.btn);
            } catch (e) {}
          } else {
            xPendingCacheApply.delete(t);
          }
          xCacheObserver.unobserve(t);
        });
      }, { rootMargin: "600px 0px" });
    }
    try { xCacheObserver.observe(tweetElement); } catch (e) {}
  }

  function suspendXForNavigation(ms) {
    xSuspendUntil = Date.now() + (ms || 900);
  }

  // Translation cache: statusId -> { translatedNodes: [{original, translated}], fullTranslatedHTML, originalHTML }
  const xTranslationCache = new Map();

  const X_CACHE_STORAGE_KEY = "xTranslationPersistentCache";
  const X_CACHE_MAX_ENTRIES = 250;
  let xCachePersistTimer = null;
  let xCacheLoadedForLang = null;

  function cacheKey(statusId) {
    return `${statusId}|${xTargetLang}`;
  }

  function loadPersistentXCache(done) {
    if (!isX) {
      if (done) done();
      return;
    }
    try {
      chrome.storage.local.get([X_CACHE_STORAGE_KEY], (res) => {
        const store = res[X_CACHE_STORAGE_KEY] || {};
        syncMemoryCacheFromStorage(store);
        if (done) done();
      });
    } catch (e) {
      if (done) done();
    }
  }

  function syncMemoryCacheFromStorage(store) {
    if (!store) {
      xTranslationCache.clear();
      return;
    }
    xTranslationCache.clear();
    Object.keys(store).forEach(key => {
      const entry = store[key];
      if (entry && entry.n && Array.isArray(entry.n) && key.endsWith("|" + xTargetLang)) {
        xTranslationCache.set(key, { translatedNodes: entry.n, ts: entry.ts || 0 });
      }
    });
    if (isX && xTranslationEnabled) {
      injectXTranslateButtons();
    }
  }

  function persistXCache() {
    if (!xCacheEnabled) return;
    if (xCachePersistTimer) clearTimeout(xCachePersistTimer);
    xCachePersistTimer = setTimeout(() => {
      xCachePersistTimer = null;
      try {
        chrome.storage.local.get([X_CACHE_STORAGE_KEY], (res) => {
          const store = res[X_CACHE_STORAGE_KEY] || {};
          xTranslationCache.forEach((value, key) => {
            if (value && value.translatedNodes) {
              store[key] = { n: value.translatedNodes, ts: Date.now() };
            }
          });
          const keys = Object.keys(store);
          if (keys.length > X_CACHE_MAX_ENTRIES) {
            keys.sort((a, b) => (store[a].ts || 0) - (store[b].ts || 0));
            keys.slice(0, keys.length - X_CACHE_MAX_ENTRIES).forEach(k => delete store[k]);
          }
          chrome.storage.local.set({ [X_CACHE_STORAGE_KEY]: store });
        });
      } catch (e) {}
    }, 1200);
  }

  function setXTranslationCache(statusId, payload) {
    xTranslationCache.set(cacheKey(statusId), payload);
    persistXCache();
  }

  function getXTranslationCache(statusId) {
    return xTranslationCache.get(cacheKey(statusId));
  }

  function hasXTranslationCache(statusId) {
    return xTranslationCache.has(cacheKey(statusId));
  }

  // Helper to normalize X status URLs to avoid cache misses
  function normalizeStatusId(href) {
    if (!href) return null;
    const match = href.match(/(\/[^\/]+\/status\/\d+)/);
    return match ? match[1] : href.split('?')[0];
  }

  function initXTranslation() {
    if (!xTranslationEnabled || !isX) return;

    // Inject custom CSS directly to X head
    if (!document.getElementById("gemini-x-injected-styles")) {
      const style = document.createElement("style");
      style.id = "gemini-x-injected-styles";
      style.textContent = `
        .gemini-x-translate-btn {
          background: none;
          border: none;
          /* Büyük tıklama alanı ama aynı görsel boyut: padding'i negatif
             margin ile dengeliyoruz, düzen kayması olmaz. */
          padding: 8px 10px;
          margin: -8px -10px -8px 2px;
          color: #06b6d4;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          margin-left: 2px;
        }
        .gemini-x-translate-btn:hover {
          text-decoration: underline;
          opacity: 0.85;
        }
        .gemini-x-reply-btn {
          background: none;
          border: none;
          padding: 8px 10px;
          margin: -8px -10px -8px 0;
          color: #8b5cf6;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .gemini-x-reply-btn:hover {
          text-decoration: underline;
          opacity: 0.85;
        }
        .gemini-x-reply-btn-header {
          margin: -4px -6px -4px 1px;
          padding: 4px 6px;
          font-size: 12.5px;
          flex-shrink: 0;
        }
        .gemini-x-sep-header {
          margin-left: 5px;
          flex-shrink: 0;
        }
        .gemini-x-sep {
          color: rgba(127, 127, 127, 0.5);
          font-size: 13px;
          user-select: none;
        }
        .gemini-x-reply-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .gemini-x-reply-overlay[data-theme="dark"] {
          background: rgba(0, 0, 0, 0.6);
        }
        .gemini-x-reply-dialog {
          width: min(480px, 94vw);
          max-height: 88vh;
          overflow-y: auto;
          box-sizing: border-box;
          margin: 0;
          background: #ffffff;
          color: #0d0d0d;
          border: 1px solid #e6e6e6;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 24px 48px -16px rgba(0, 0, 0, 0.22), 0 2px 10px rgba(0, 0, 0, 0.07);
          color-scheme: light;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-dialog {
          background: #212121;
          color: #ececec;
          border: 1px solid rgba(255, 255, 255, 0.09);
          box-shadow: 0 28px 56px -16px rgba(0, 0, 0, 0.75), 0 2px 12px rgba(0, 0, 0, 0.5);
          color-scheme: dark;
        }
        .gemini-x-reply-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 0 10px 0;
        }
        .gemini-x-reply-title {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.2px;
        }
        .gemini-x-reply-title svg {
          flex-shrink: 0;
        }
        .gemini-x-reply-close {
          margin: 0;
          border: none;
          background: rgba(0, 0, 0, 0.045);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          color: #5d5d5d;
          font-family: inherit;
        }
        .gemini-x-reply-close:hover {
          background: rgba(0, 0, 0, 0.09);
          color: #0d0d0d;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-close {
          background: rgba(255, 255, 255, 0.06);
          color: #b4b4b4;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-close:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ececec;
        }
        .gemini-x-reply-target {
          margin: 0 0 12px 0;
          font-size: 12.5px;
          line-height: 1.6;
          color: #5d5d5d;
          background: #f9f9f9;
          border: 1px solid #e6e6e6;
          border-radius: 8px;
          padding: 10px 12px;
          max-height: 110px;
          overflow-y: auto;
          white-space: pre-wrap;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-target {
          color: #b4b4b4;
          background: #171717;
          border: 1px solid rgba(255, 255, 255, 0.09);
        }
        .gemini-x-reply-label {
          margin: 0 0 6px 0;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #909090;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-label {
          color: #828282;
        }
        .gemini-x-reply-ta {
          width: 100%;
          box-sizing: border-box;
          margin: 0;
          min-height: 72px;
          resize: vertical;
          background: #ffffff;
          border: 1px solid #e6e6e6;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13.5px;
          line-height: 1.6;
          font-family: inherit;
          outline: none;
          color: #0d0d0d;
        }
        .gemini-x-reply-ta::placeholder {
          color: #909090;
        }
        .gemini-x-reply-ta:focus {
          border-color: #0d0d0d;
          box-shadow: 0 0 0 3px rgba(13, 13, 13, 0.08);
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-ta {
          background: #262626;
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: #ececec;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-ta::placeholder {
          color: #828282;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-ta:focus {
          border-color: #ececec;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.09);
        }
        .gemini-x-reply-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 12px;
        }
        .gemini-x-reply-cancel {
          margin: 0;
          border: 1px solid #e6e6e6;
          background: transparent;
          color: #5d5d5d;
          border-radius: 999px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
        }
        .gemini-x-reply-cancel:hover {
          background: rgba(0, 0, 0, 0.045);
          color: #0d0d0d;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-cancel {
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #b4b4b4;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-cancel:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ececec;
        }
        .gemini-x-reply-gen {
          margin: 0;
          border: none;
          background: #0d0d0d;
          color: #ffffff;
          border-radius: 999px;
          padding: 7px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        }
        .gemini-x-reply-gen:hover:not(:disabled) {
          background: #2f2f2f;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-gen {
          background: #f3f3f3;
          color: #0d0d0d;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-gen:hover:not(:disabled) {
          background: #ffffff;
        }
        .gemini-x-reply-gen:disabled {
          opacity: 0.45;
          cursor: wait;
        }
        .gemini-x-reply-copy {
          margin: 0;
          border: 1px solid #e6e6e6;
          background: transparent;
          color: #5d5d5d;
          border-radius: 999px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
        }
        .gemini-x-reply-copy:hover {
          background: rgba(0, 0, 0, 0.045);
          color: #0d0d0d;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-copy {
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #b4b4b4;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-copy:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ececec;
        }
        .gemini-x-reply-result {
          margin: 10px 0 0 0;
          font-size: 13.5px;
          line-height: 1.6;
          color: #0d0d0d;
          background: #f9f9f9;
          border: 1px solid #e6e6e6;
          border-radius: 8px;
          padding: 10px 12px;
          white-space: pre-wrap;
          user-select: text;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-result {
          color: #ececec;
          background: #171717;
          border: 1px solid rgba(255, 255, 255, 0.09);
        }
        .gemini-x-reply-err {
          margin: 10px 0 0 0;
          font-size: 12.5px;
          color: #dc2626;
          display: none;
        }
        .gemini-x-reply-overlay[data-theme="dark"] .gemini-x-reply-err {
          color: #f87171;
        }
        .gemini-x-result-card {
          margin-top: 8px;
          background: rgba(127, 127, 127, 0.07);
          border: 1px solid rgba(127, 127, 127, 0.22);
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 14px;
          line-height: 1.5;
          color: inherit;
          animation: geminiSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1) both;
          user-select: text;
        }
        @keyframes geminiSlideDown {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .gemini-x-loader {
          display: inline-block;
          width: 10px;
          height: 10px;
          border: 2px solid rgba(6, 182, 212, 0.3);
          border-radius: 50%;
          border-top-color: #06b6d4;
          animation: geminiSpin 0.6s linear infinite;
          margin-right: 4px;
        }
        @keyframes geminiSpin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Run once initially
    injectXTranslateButtons();

    // Global "Show more" click delegation: after X expands the truncated text,
    // seamlessly re-apply / re-translate the now-visible full content.
    if (!window.__geminiShowMoreListener) {
      window.__geminiShowMoreListener = true;
      document.addEventListener("click", (e) => {
        if (!xTranslationEnabled || !isX) return;
        const target = e.target;
        if (!target || !target.closest) return;

        const showMoreEl = target.closest('[data-testid="tweet-text-show-more-link"]') ||
          (target.closest("a, span, button") && /daha fazla göster|show more/i.test((target.closest("a, span, button").textContent || "").trim().slice(0, 30)) ? target.closest("a, span, button") : null);
        if (!showMoreEl) return;

        const tweet = showMoreEl.closest('article[data-testid="tweet"]');
        if (!tweet) return;

        setTimeout(() => {
          const statusLink = tweet.querySelector('a[href*="/status/"]');
          if (!statusLink) return;
          const statusId = normalizeStatusId(statusLink.getAttribute("href"));
          if (!hasXTranslationCache(statusId)) return;

          const wrapper = tweet.querySelector(`.gemini-x-wrapper[data-status-id="${CSS.escape(statusId)}"]`);
          const geminiBtn = wrapper ? wrapper.querySelector(".gemini-x-translate-btn") : null;
          const textEl = tweet.querySelector('div[data-testid="tweetText"]');
          if (!textEl) return;

          if (geminiBtn) {
            delete textEl.__geminiCacheApplied;
            textEl.__originalHTML = textEl.__originalHTML || textEl.innerHTML;
            applyCachedTranslation(tweet, statusId, geminiBtn);
          } else {
            injectXTranslateButtons();
          }
        }, 350);
      }, true);
    }

    // Pause height-changing work while X restores scroll after SPA navigation
    // (tweet detail -> back). Button injection itself is zero-height and stays
    // instant; only cached-text application defers (see applyCachedWhenVisible).
    if (!window.__geminiXNavHook) {
      window.__geminiXNavHook = true;
      ["pushState", "replaceState"].forEach((fn) => {
        try {
          const orig = history[fn];
          history[fn] = function () { const r = orig.apply(this, arguments); suspendXForNavigation(600); return r; };
        } catch (e) { void e; }
      });
      window.addEventListener("popstate", () => suspendXForNavigation(600), true);
    }

    // Tweet'ler ekrana çizilmeden ÖNCE butonları ekle: MutationObserver
    // geriçağrıları boyamadan önce çalışan bir mikrogörevdir, senkron yazarsak
    // butonlar tweet ile aynı karede belirir. setTimeout ile ertelenirse tweet
    // önce butonsuz çizilir, bir kare sonra büyür -> yüklenirken sürekli
    // aşağı kayma hissi. O yüzden burada zamanlayıcı YOK.
    if (!xObserver) {
      xObserver = new MutationObserver((mutations) => {
        if (xIsInjecting) return;
        // Ignore mutations caused by our own buttons/wrappers/text swaps,
        // otherwise every injection schedules another injection (feedback loop
        // -> constant layout thrash -> continuous scroll jitter).
        const useful = [];
        for (const m of mutations) {
          if (m.type !== "childList") continue;
          // Our wrapper internal moves (wrapping the native button) target
          // the wrapper itself -> ignore, otherwise every injection
          // re-triggers another injection (async observer sees our write
          // after xIsInjecting was already cleared).
          if (m.target && m.target.closest && m.target.closest(".gemini-x-wrapper")) continue;
          let hasOwn = false, hasForeign = false;
          const checkNode = (n) => {
            if (!n || n.nodeType !== Node.ELEMENT_NODE) return;
            if (isOwnXMutationNode(n)) hasOwn = true;
            else hasForeign = true;
          };
          m.addedNodes.forEach(checkNode);
          m.removedNodes.forEach(checkNode);
          if (!hasForeign) continue; // only our own nodes changed
          useful.push(m);
        }
        if (useful.length === 0) return;

        // Check if any mutation affects tweetText elements ("Show more" click detection)
        let hasTweetTextChange = false;
        for (const mutation of useful) {
          if (mutation.type === 'childList') {
            const target = mutation.target;
            // Detect changes within tweetText containers or their parents
            if (target.matches && (target.matches('div[data-testid="tweetText"]') || target.querySelector && target.querySelector('div[data-testid="tweetText"]'))) {
              // Our own wrapper sits next to tweetText inside the same parent;
              // the parent trivially "contains tweetText" even when only our
              // button was added -> verify a real tweetText node changed.
              let realChange = false;
              mutation.addedNodes.forEach((n) => {
                if (n.nodeType !== Node.ELEMENT_NODE) return;
                if (n.matches && (n.matches('div[data-testid="tweetText"]') || n.querySelector('div[data-testid="tweetText"]'))) realChange = true;
              });
              mutation.removedNodes.forEach((n) => {
                if (n.nodeType !== Node.ELEMENT_NODE) return;
                if (n.matches && (n.matches('div[data-testid="tweetText"]') || n.querySelector('div[data-testid="tweetText"]'))) realChange = true;
              });
              if (realChange || (target.matches && target.matches('div[data-testid="tweetText"]'))) {
                hasTweetTextChange = true;
                break;
              }
              continue;
            }
            // Also check added nodes for tweetText
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.matches && node.matches('div[data-testid="tweetText"]')) {
                  hasTweetTextChange = true;
                  break;
                }
                if (node.querySelector && node.querySelector('div[data-testid="tweetText"]') && !isOwnXMutationNode(node)) {
                  // An added article containing tweetText counts; a bare
                  // wrapper containing no tweetText does not (filtered above).
                  if (node.matches('article[data-testid="tweet"]') || node.querySelector('article[data-testid="tweet"]')) {
                    hasTweetTextChange = true;
                    break;
                  }
                }
              }
            }
            if (hasTweetTextChange) break;
          }
        }

        if (hasTweetTextChange) {
          // Immediate re-check for tweetText changes ("Show more", navigation)
          // Reset __geminiCacheApplied flags on affected tweets so cache can re-apply
          const allTweets = document.querySelectorAll('article[data-testid="tweet"]');
          allTweets.forEach(tweet => {
            const textEl = tweet.querySelector('div[data-testid="tweetText"]');
            if (textEl && textEl.__geminiCacheApplied) {
              // Check if the text content has changed from what we applied
              // If so, the DOM was rebuilt and we need to re-apply
              const statusLink = tweet.querySelector('a[href*="/status/"]');
              if (statusLink) {
                const sid = normalizeStatusId(statusLink.getAttribute("href"));
                if (hasXTranslationCache(sid)) {
                  const cached = getXTranslationCache(sid);
                  const currentText = collectTweetTextNodes(textEl).map(n => n.textContent).join("");
                  const cachedOriginal = cached.translatedNodes.map(c => c.original).join("");
                  const cachedTranslated = cached.translatedNodes.map(c => c.translated).join("");
                  
                  // If current text matches original (not translated), DOM was rebuilt
                  if (currentText.trim() !== cachedTranslated.trim()) {
                    delete textEl.__geminiCacheApplied;
                  }
                }
              }
            }
          });
        }

        // Sadece gerçekten değişen tweet'leri tara ve HEMEN (senkron) işle:
        // aynı karede boyanırlar, sonradan itme olmaz. Tam tarama yalnızca
        // devasa toplu eklemelerde yapılır.
        let needFullScan = false;
        let sawTweetContent = false;
        const candidates = [];
        for (const m of useful) {
          const t = m.target && m.target.closest ? m.target.closest('article[data-testid="tweet"]') : null;
          if (t) { candidates.push(t); sawTweetContent = true; }
          m.addedNodes.forEach((n) => {
            if (!n || n.nodeType !== Node.ELEMENT_NODE) return;
            if (n.matches && n.matches('article[data-testid="tweet"]')) { candidates.push(n); sawTweetContent = true; }
            if (n.querySelectorAll) {
              const found = n.querySelectorAll('article[data-testid="tweet"]');
              if (found.length) sawTweetContent = true;
              if (found.length <= 12) found.forEach(a => candidates.push(a));
              else needFullScan = true;
            }
          });
        }

        // Tweet ile alakasız mutasyonlarda (trendler, sayaçlar) hiç çalışma:
        // hem CPU hem de gereksiz dokunuş sıfır.
        if (!sawTweetContent && !needFullScan) return;

        if (needFullScan || candidates.length === 0) {
          injectXTranslateButtons();
        } else {
          injectXTranslateButtons(candidates);
        }
      });
      xObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  let xIntersectionObserver = null;
  const tweetTimers = new Map();

  const isDifferentLang = (langA, langB) => {
    if (!langA || !langB) return false;
    const baseA = langA.split("-")[0].toLowerCase();
    const baseB = langB.split("-")[0].toLowerCase();
    return baseA !== baseB;
  };

  function stopXTranslation() {
    if (xObserver) {
      xObserver.disconnect();
      xObserver = null;
    }

    if (xIntersectionObserver) {
      xIntersectionObserver.disconnect();
      xIntersectionObserver = null;
    }

    if (xCacheObserver) {
      xCacheObserver.disconnect();
      xCacheObserver = null;
    }
    xPendingCacheApply.clear();

    tweetTimers.forEach((timer) => clearTimeout(timer));
    tweetTimers.clear();
    
    // Sarmalayıcıları kaldır (safeRemove: X'e ait düğüm iade edilir, silinmez)
    document.querySelectorAll(".gemini-x-wrapper").forEach(wrapper => {
      safeRemoveXWrapper(wrapper);
    });

    document.querySelectorAll(".gemini-x-translate-btn, .gemini-x-reply-btn, .gemini-x-sep, .gemini-x-result-card, .gemini-x-reply-overlay").forEach(el => el.remove());
    document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
      delete tweet.dataset.geminiInjected;
      delete tweet.dataset.geminiStatusId;
      delete tweet.dataset.geminiSkipped;
      delete tweet.dataset.geminiNativeHidden;
      delete tweet.__geminiBtn;
      // Gizlediğimiz native (Grok) çevir butonlarını geri aç
      try {
        const nb = findNativeTranslateButton(tweet);
        if (nb && nb.style.display === "none") nb.style.display = "";
      } catch (e) {}
      const textEl = tweet.querySelector('div[data-testid="tweetText"]');
      if (textEl) {
        delete textEl.__geminiCacheApplied;
      }
    });
    // Clear the translation cache when stopping
    xTranslationCache.clear();
  }

  function findNativeTranslateButton(tweetElement) {
    const matchPhrases = [
      "translate post",
      "translate tweet",
      "translate translation",
      "show translation",
      "show original",
      "view original",
      "çeviriyi göster",
      "çeviriyi goster",
      "gönderiyi çevir",
      "gonderiyi cevir",
      "gönderiyi göster",
      "orijinali göster",
      "orijinali goster"
    ];
    const querySelectors = ['span', 'button', '[role="button"]'];
    for (const sel of querySelectors) {
      const elements = tweetElement.querySelectorAll(sel);
      for (const el of elements) {
        if (el.closest(".gemini-x-wrapper")) continue;
        const text = (el.textContent || "").trim().toLowerCase();
        if (!text || text.length > 40) continue;
        if (matchPhrases.some(phrase => text === phrase || text.startsWith(phrase))) {
          return el;
        }
      }
    }
    return null;
  }

  function observeTweetForAutoTranslate(tweetElement, buttonElement) {
    if (!xIntersectionObserver) {
      xIntersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const tweet = entry.target;
          const btn = tweet.__geminiBtn;
          if (!btn) return;
          
          if (entry.isIntersecting) {
            // Start a timer to translate if it remains visible for 250ms
            if (!tweetTimers.has(tweet)) {
              const timer = setTimeout(() => {
                if (btn.dataset.translated !== "true" && !btn.disabled) {
                  handleXTranslateClick(tweet, btn);
                }
                xIntersectionObserver.unobserve(tweet);
                tweetTimers.delete(tweet);
              }, 250);
              tweetTimers.set(tweet, timer);
            }
          } else {
            // Cancel timer if leaves viewport
            if (tweetTimers.has(tweet)) {
              clearTimeout(tweetTimers.get(tweet));
              tweetTimers.delete(tweet);
            }
          }
        });
      }, { threshold: 0.1 });
    }
    
    tweetElement.__geminiBtn = buttonElement;
    xIntersectionObserver.observe(tweetElement);
  }

  // Re-apply a cached translation to a tweet's tweetText element
  function applyCachedTranslation(tweetElement, statusId, geminiBtn) {
    const cached = getXTranslationCache(statusId);
    if (!cached) return false;

    const textEl = tweetElement.querySelector('div[data-testid="tweetText"]');
    if (!textEl) return false;

    // CRITICAL: never start/stack work while a translation is already
    // running on this element - prevents mutation-triggered request storms
    if (textEl.__geminiRetranslating) return true;

    // Save current (possibly new/expanded) original HTML before applying cache
    if (!textEl.__originalHTML) {
      textEl.__originalHTML = textEl.innerHTML;
    }

    // Re-apply translations by matching text nodes
    const currentTextNodes = collectTweetTextNodes(textEl);
    if (currentTextNodes.length === 0) return false;

    const cachedNodes = cached.translatedNodes;

    // Check if the translation is ALREADY applied to the DOM
    const currentFullText = currentTextNodes.map(n => n.textContent).join("");
    const cachedTranslatedFullText = cachedNodes.map(c => c.translated).join("");
    const originalFullText = cachedNodes.map(c => c.original).join("");

    if (currentFullText.trim() === cachedTranslatedFullText.trim()) {
      // Already translated, just set button states and cache flag
      geminiBtn.dataset.translated = "true";
      const btnSpan = geminiBtn.querySelector("span");
      if (btnSpan) btnSpan.textContent = "Orijinali Göster (Gemini)";
      textEl.__geminiCacheApplied = true;
      return true;
    }

    // Only auto-retranslate when the current text is a genuine EXPANSION of the
    // cached original (e.g. "Show more" revealed the rest of the SAME tweet).
    // Foreign content (Grok/X translations, partial renders) must be left alone.
    const clean = (s) => s.replace(/[….]+$/, "").trim();
    const currClean = clean(currentFullText);
    const origClean = clean(originalFullText);
    const isExpansion = currClean !== origClean &&
      currClean.length > origClean.length &&
      currClean.includes(origClean.slice(0, Math.min(origClean.length, 80)));

    if (currClean !== origClean && currClean !== clean(cachedTranslatedFullText)) {
      if (isExpansion) {
        // Debounced: wait for X to finish rendering the expanded content,
        // then seamlessly re-translate the new content once.
        if (textEl.__geminiRetranslateTimer) clearTimeout(textEl.__geminiRetranslateTimer);
        textEl.__geminiRetranslateTimer = setTimeout(() => {
          delete textEl.__geminiRetranslateTimer;
          retranslateExpanded(tweetElement, geminiBtn, statusId);
        }, 450);
        return true;
      }
      // Foreign content (e.g. Grok replaced the text) -> leave DOM untouched and
      // signal the caller that nothing was applied (fresh translation may proceed)
      geminiBtn.dataset.translated = "false";
      return false;
    }

    if (cachedNodes.length === 1) {
      const firstOriginal = currentTextNodes[0].textContent;
      const firstLeading = firstOriginal.match(/^\s*/)[0];
      const firstTrailing = firstOriginal.match(/\s*$/)[0];
      currentTextNodes[0].textContent = firstLeading + cachedNodes[0].translated.trim() + firstTrailing;
      for (let i = 1; i < currentTextNodes.length; i++) {
        currentTextNodes[i].textContent = "";
      }
    } else if (cachedNodes.length === currentTextNodes.length) {
      for (let i = 0; i < currentTextNodes.length; i++) {
        const original = currentTextNodes[i].textContent;
        const leadingSpaces = original.match(/^\s*/)[0];
        const trailingSpaces = original.match(/\s*$/)[0];
        currentTextNodes[i].textContent = leadingSpaces + cachedNodes[i].translated.trim() + trailingSpaces;
      }
    } else {
      const fullTranslated = cachedNodes.map(c => c.translated).join("");
      const firstOriginal = currentTextNodes[0].textContent;
      const firstLeading = firstOriginal.match(/^\s*/)[0];
      const firstTrailing = firstOriginal.match(/\s*$/)[0];
      currentTextNodes[0].textContent = firstLeading + fullTranslated.trim() + firstTrailing;
      for (let i = 1; i < currentTextNodes.length; i++) {
        currentTextNodes[i].textContent = "";
      }
    }

    // Update button state
    geminiBtn.dataset.translated = "true";
    const btnSpan = geminiBtn.querySelector("span");
    if (btnSpan) btnSpan.textContent = "Orijinali Göster (Gemini)";

    textEl.__geminiCacheApplied = true;

    return true;
  }

  // Re-translate when text has expanded (e.g. "Show more" was clicked)
  function retranslateExpanded(tweetElement, buttonElement, statusId) {
    const textEl = tweetElement.querySelector('div[data-testid="tweetText"]');
    if (!textEl) return;
    if (textEl.__geminiRetranslating) return;

    const textNodes = collectTweetTextNodes(textEl);
    if (textNodes.length === 0) return;

    const textsToTranslate = textNodes.map(n => n.textContent);
    const fullText = textsToTranslate.join("");
    if (!fullText.trim()) return;

    // Mark in-flight so observer-driven re-injections cannot stack more requests
    textEl.__geminiRetranslating = true;

    // Show loading
    const btnSpan = buttonElement.querySelector("span");
    if (btnSpan) btnSpan.innerHTML = '<span class="gemini-x-loader"></span>Çeviriliyor...';
    buttonElement.disabled = true;

    // Save the new expanded original HTML + pristine original texts
    // BEFORE applying any placeholder translations
    textEl.__originalHTML = textEl.innerHTML;
    const pristineOriginals = textNodes.map(n => n.textContent);

    // Immediately apply existing translations as placeholders to prevent flashing original text
    const cached = getXTranslationCache(statusId);
    if (cached && cached.translatedNodes) {
      const applyCount = Math.min(textNodes.length, cached.translatedNodes.length);
      for (let i = 0; i < applyCount; i++) {
        const originalText = pristineOriginals[i];
        const cachedOrigClean = cached.translatedNodes[i].original.replace(/[….]+$/, '').trim();
        const cachedTransClean = cached.translatedNodes[i].translated.replace(/[….]+$/, '').trim();
        
        if (cachedOrigClean && originalText.includes(cachedOrigClean)) {
           textNodes[i].textContent = originalText.replace(cachedOrigClean, cachedTransClean);
        } else if (i === 0 && textNodes.length > 1) {
           // Fallback for the first node to at least keep the start of the tweet translated
           textNodes[i].textContent = cachedTransClean;
        }
      }
    }

    const translateAndApply = (translations) => {
      buttonElement.disabled = false;
      delete textEl.__geminiRetranslating;
      if (!Array.isArray(translations) || translations.length !== textNodes.length) {
        const joined = Array.isArray(translations) ? translations.join("") : "";
        const useFull = joined.trim().length > 0 ? joined : pristineOriginals.join("");
        setXTranslationCache(statusId, {
          translatedNodes: [{ original: pristineOriginals.join(""), translated: useFull }],
          originalHTML: textEl.__originalHTML
        });
        const firstOriginal = textNodes[0].textContent;
        const firstLeading = firstOriginal.match(/^\s*/)[0];
        const firstTrailing = firstOriginal.match(/\s*$/)[0];
        textNodes[0].textContent = firstLeading + useFull.trim() + firstTrailing;
        for (let i = 1; i < textNodes.length; i++) {
          textNodes[i].textContent = "";
        }
      } else {
        const newCachedNodes = pristineOriginals.map((originalText, idx) => ({
          original: originalText,
          translated: translations[idx] || originalText
        }));
        setXTranslationCache(statusId, {
          translatedNodes: newCachedNodes,
          originalHTML: textEl.__originalHTML
        });
        textNodes.forEach((node, idx) => {
          if (translations[idx]) {
            const original = node.textContent;
            const leadingSpaces = original.match(/^\s*/)[0];
            const trailingSpaces = original.match(/\s*$/)[0];
            node.textContent = leadingSpaces + translations[idx].trim() + trailingSpaces;
          }
        });
      }
      buttonElement.dataset.translated = "true";
      if (btnSpan) btnSpan.textContent = "Orijinali Göster (Gemini)";
      textEl.__geminiCacheApplied = true;
    };

    if (textNodes.length === 1) {
      safeSendMessage({
        action: "translate",
        text: fullText.trim(),
        sourceLang: "auto",
        targetLang: xTargetLang
      }, (response) => {
        if (response && response.success) {
          translateAndApply([response.translation]);
        } else {
          buttonElement.disabled = false;
          buttonElement.dataset.translated = "false";
          delete textEl.__geminiRetranslating;
          if (btnSpan) btnSpan.textContent = "Gemini ile Çevir";
          textEl.innerHTML = textEl.__originalHTML;
        }
      });
    } else {
      safeSendMessage({
        action: "translate-batch",
        texts: textsToTranslate,
        targetLang: xTargetLang
      }, (response) => {
        if (response && response.success && Array.isArray(response.translations) && response.translations.length === textNodes.length) {
          translateAndApply(response.translations);
        } else {
          textEl.__geminiRetranslating = true;
          safeSendMessage({
            action: "translate",
            text: fullText.trim(),
            sourceLang: "auto",
            targetLang: xTargetLang
          }, (singleResponse) => {
            if (singleResponse && singleResponse.success) {
              translateAndApply([singleResponse.translation]);
            } else {
              buttonElement.disabled = false;
              buttonElement.dataset.translated = "false";
              delete textEl.__geminiRetranslating;
              if (btnSpan) btnSpan.textContent = "Gemini ile Çevir";
              textEl.innerHTML = textEl.__originalHTML;
            }
          });
        }
      });
    }
  }

  // X'in düğümünü ASLA yerinden oynatma/silme: React, yönettiği bir düğüm
  // kaybolur veya ebeveyni değişirse bir sonraki güncellemede tüm alt ağacı
  // sökebiliyor (boş sayfa / en alta atlama). Bu yardımcı, sarmalayıcıyı
  // kaldırırken içindeki yabancı (X'e ait) düğümleri önce yerine iade eder.
  function safeRemoveXWrapper(wrapper) {
    if (!wrapper || !wrapper.parentNode) { try { wrapper.remove(); } catch (e) {} return; }
    try {
      Array.from(wrapper.children).forEach(child => {
        const isOurs = child.matches && (child.matches(".gemini-x-translate-btn,.gemini-x-reply-btn,.gemini-x-sep") || child.querySelector(".gemini-x-translate-btn,.gemini-x-reply-btn,.gemini-x-sep"));
        if (!isOurs) {
          try { wrapper.parentNode.insertBefore(child, wrapper); } catch (e) {}
        }
      });
    } catch (e) {}
    try { wrapper.remove(); } catch (e) {}
  }

  function buildGeminiXButton() {
    const geminiBtn = document.createElement("button");
    geminiBtn.type = "button";
    geminiBtn.className = "gemini-x-translate-btn";
    geminiBtn.style.cssText = "overflow-anchor: none;";
    geminiBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align: middle; fill: #06b6d4; margin-right: 2px; display: inline-block;">
        <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z"/>
      </svg>
      <span style="vertical-align: middle;">Gemini ile Çevir</span>
    `;
    return geminiBtn;
  }

  function buildGeminiXReplyButton() {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "gemini-x-reply-btn";
    b.style.cssText = "overflow-anchor: none;";
    b.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; display: inline-block;">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span style="vertical-align: middle;">Akıllı Yanıt</span>
    `;
    return b;
  }

  function buildGeminiXSep() {
    const s = document.createElement("span");
    s.className = "gemini-x-sep";
    s.textContent = "·";
    return s;
  }

  function ensureHeaderReplyButton(tweet, statusId) {
    let cur = null;
    try {
      cur = tweet.querySelector('.gemini-x-reply-btn-header[data-status-id="' + CSS.escape(statusId) + '"]');
    } catch (e) { cur = null; }
    if (cur && cur.isConnected) return true;
    let timeLink = null;
    try {
      const times = tweet.querySelectorAll('a[href*="/status/"] time');
      for (const t of times) {
        if (t.closest && t.closest('article[data-testid="tweet"]') === tweet) {
          timeLink = t.closest("a");
          break;
        }
      }
    } catch (e) { timeLink = null; }
    if (!timeLink || !timeLink.parentNode) return false;
    const sep = buildGeminiXSep();
    sep.classList.add("gemini-x-sep-header");
    sep.dataset.statusId = statusId;
    const rb = buildGeminiXReplyButton();
    rb.classList.add("gemini-x-reply-btn-header");
    rb.dataset.statusId = statusId;
    rb.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openXReplyModal(tweet, rb);
    });
    try {
      timeLink.after(sep, rb);
    } catch (e) { return false; }
    return true;
  }

  function detectXDark() {
    try {
      const bg = getComputedStyle(document.body).backgroundColor || "";
      const m = bg.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
      if (!m) return false;
      const lum = (0.2126 * (+m[1]) + 0.7152 * (+m[2]) + 0.0722 * (+m[3])) / 255;
      return lum < 0.5;
    } catch (e) { return false; }
  }

  function getXArticleAuthor(article) {
    try {
      const box = article.querySelector('div[data-testid="User-Name"]');
      if (!box) return "";
      const m = (box.textContent || "").match(/@[\w_]+/);
      if (m) return m[0];
      return (box.textContent || "").trim().split("\n")[0].slice(0, 60);
    } catch (e) { return ""; }
  }

  function getXArticleText(article) {
    try {
      const t = article.querySelector('div[data-testid="tweetText"]');
      return t ? ((t.innerText || "").trim()) : "";
    } catch (e) { return ""; }
  }

  function collectXThread(clickedTweet) {
    const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]')).filter(a => a.isConnected);
    const idx = articles.indexOf(clickedTweet);
    const list = idx >= 0 ? articles.slice(Math.max(0, idx - 15), idx + 1) : [clickedTweet];
    const lines = [];
    let total = 0;
    list.forEach((a, i) => {
      const text = getXArticleText(a).slice(0, 1000);
      if (!text) return;
      const author = getXArticleAuthor(a);
      const head = (i === list.length - 1) ? "HEDEF TWEET" : ("TWEET " + (i + 1));
      const line = head + (author ? " (" + author + ")" : "") + ": " + text;
      if (total + line.length > 8000) return;
      total += line.length;
      lines.push(line);
    });
    return lines.join("\n\n");
  }

  function closeXReplyModal() {
    try {
      document.querySelectorAll(".gemini-x-reply-overlay").forEach(el => el.remove());
      if (window.__geminiXReplyEsc) {
        document.removeEventListener("keydown", window.__geminiXReplyEsc, true);
        window.__geminiXReplyEsc = null;
      }
    } catch (e) {}
  }

  function copyXReplyText(text, btn) {
    const done = () => {
      if (!btn) return;
      const old = btn.textContent;
      btn.textContent = "Kopyalandı!";
      setTimeout(() => { btn.textContent = old; }, 1500);
    };
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
        done();
      } catch (e) {}
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
      fallback();
    }
  }

  function openXReplyModal(tweet, btn) {
    if (!xTranslationEnabled || !isX) return;
    closeXReplyModal();
    const thread = collectXThread(tweet);
    if (!thread) return;
    const target = getXArticleText(tweet).slice(0, 500);
    const overlay = document.createElement("div");
    overlay.className = "gemini-x-reply-overlay";
    overlay.dataset.theme = xUiTheme;
    overlay.innerHTML = `
      <div class="gemini-x-reply-dialog">
        <div class="gemini-x-reply-head">
          <div class="gemini-x-reply-title">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" fill="#8b5cf6" stroke="none"/>
            </svg>
            <span>Akıllı Yanıt</span>
          </div>
          <button class="gemini-x-reply-close" type="button">✕</button>
        </div>
        <div class="gemini-x-reply-target"></div>
        <div class="gemini-x-reply-label">Görüşün (opsiyonel)</div>
        <textarea class="gemini-x-reply-ta" placeholder="Neyi haklı buluyorsun, neyi savunmak istiyorsun?"></textarea>
        <div class="gemini-x-reply-err"></div>
        <div class="gemini-x-reply-result" style="display:none;"></div>
        <div class="gemini-x-reply-actions">
          <button class="gemini-x-reply-copy" type="button" style="display:none;">Kopyala</button>
          <button class="gemini-x-reply-cancel" type="button">Vazgeç</button>
          <button class="gemini-x-reply-gen" type="button">Yanıt Oluştur</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const dialog = overlay.querySelector(".gemini-x-reply-dialog");
    dialog.querySelector(".gemini-x-reply-target").textContent = target;
    const ta = dialog.querySelector(".gemini-x-reply-ta");
    const err = dialog.querySelector(".gemini-x-reply-err");
    const result = dialog.querySelector(".gemini-x-reply-result");
    const genBtn = dialog.querySelector(".gemini-x-reply-gen");
    const cancelBtn = dialog.querySelector(".gemini-x-reply-cancel");
    const copyBtn = dialog.querySelector(".gemini-x-reply-copy");
    const closeBtn = dialog.querySelector(".gemini-x-reply-close");
    const close = () => closeXReplyModal();
    closeBtn.onclick = (e) => { e.stopPropagation(); close(); };
    cancelBtn.onclick = (e) => { e.stopPropagation(); close(); };
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
    window.__geminiXReplyEsc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", window.__geminiXReplyEsc, true);
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      copyXReplyText(result.textContent || "", copyBtn);
    };
    genBtn.onclick = (e) => {
      e.stopPropagation();
      const stance = (ta.value || "").trim();
      genBtn.disabled = true;
      genBtn.textContent = "Oluşturuluyor...";
      err.style.display = "none";
      safeSendMessage({ action: "smart-reply", thread: thread, stance: stance, targetLang: xTargetLang }, (res) => {
        genBtn.disabled = false;
        genBtn.textContent = "Yanıt Oluştur";
        if (res && res.success) {
          result.style.display = "block";
          result.textContent = res.reply;
          copyBtn.style.display = "inline-block";
        } else {
          err.style.display = "block";
          err.textContent = "Hata: " + ((res && res.error) || "bilinmiyor");
        }
      });
    };
    setTimeout(() => { try { ta.focus(); } catch (e) {} }, 50);
  }

  function injectXTranslateButtons(onlyTweets) {
    if (!xTranslationEnabled || !isX) return;
    if (xIsInjecting) return;
    // NOTE: no suspend gate here on purpose. Butonlar tweet'lerle aynı karede
    // boyandığı için (senkron enjeksiyon) sonradan itme yapmaz; geciktirmek
    // tam tersine kaymaya yol açıyordu. Yalnızca metin-yüksekliği değişimleri
    // ertelenir (applyCachedWhenVisible).

    xIsInjecting = true;
    try {
    // NOTE: no manual scroll compensation here. The browser's native scroll
    // anchoring already keeps the viewport stable when heights change above
    // it; adding our own scrollBy on top double-compensated and drifted the
    // page downward batch after batch until it pinned to the bottom.
    const tweets = (Array.isArray(onlyTweets) && onlyTweets.length)
      ? onlyTweets.filter(t => t && t.isConnected)
      : document.querySelectorAll('article[data-testid="tweet"]');
    tweets.forEach(tweet => {
      // Find status link for unique identifier to handle virtual scroll recycling
      const statusLink = tweet.querySelector('a[href*="/status/"]');
      if (!statusLink) return;
      const statusId = normalizeStatusId(statusLink.getAttribute("href"));

      // Cleanup recycled wrappers/cards if this DOM node is reused for a different tweet
      // (safeRemove: X'e ait düğüm varsa önce yerine iade edilir, asla silinmez)
      tweet.querySelectorAll(".gemini-x-wrapper").forEach(wrapper => {
        if (wrapper.dataset.statusId !== statusId) {
          safeRemoveXWrapper(wrapper);
        }
      });
      tweet.querySelectorAll(".gemini-x-result-card").forEach(card => {
        if (card.dataset.statusId !== statusId) {
          card.remove();
        }
      });
      tweet.querySelectorAll(".gemini-x-reply-btn-header, .gemini-x-sep-header").forEach(el => {
        if (el.dataset.statusId !== statusId) {
          try { el.remove(); } catch (e) {}
        }
      });

      // Check if wrapper already exists for this statusId
      const existingWrapper = tweet.querySelector(`.gemini-x-wrapper[data-status-id="${CSS.escape(statusId)}"]`);
      if (existingWrapper) {
        if (ensureHeaderReplyButton(tweet, statusId)) {
          existingWrapper.querySelectorAll(".gemini-x-reply-btn:not(.gemini-x-reply-btn-header)").forEach(b => {
            try { b.remove(); } catch (e) {}
          });
          const hasTrans = !!existingWrapper.querySelector(".gemini-x-translate-btn");
          existingWrapper.querySelectorAll(".gemini-x-sep:not(.gemini-x-sep-header)").forEach(s => {
            if (!hasTrans) { try { s.remove(); } catch (e) {} }
          });
          if (!hasTrans && !existingWrapper.querySelector(".gemini-x-reply-btn")) {
            try { existingWrapper.remove(); } catch (e) {}
          }
        }
        // X alt ağacı yeniden çizip gizlediğimiz native butonu geri getirmiş
        // olabilir -> kopya çıkmasın diye tekrar gizle (tweet başına 1 kez).
        if (tweet.dataset.geminiNativeHidden !== statusId) {
          try {
            const renative = findNativeTranslateButton(tweet);
            if (renative) {
              renative.style.display = "none";
              tweet.dataset.geminiNativeHidden = statusId;
            } else {
              tweet.dataset.geminiNativeHidden = statusId;
            }
          } catch (e) {}
        }
        // Wrapper exists - but check if a cached translation needs to be re-applied
        // (this handles "Show more" which rebuilds tweetText DOM but keeps the wrapper)
        const geminiBtn = existingWrapper.querySelector(".gemini-x-translate-btn");
        if (geminiBtn && hasXTranslationCache(statusId)) {
          const textEl = tweet.querySelector('div[data-testid="tweetText"]');
          if (textEl && !textEl.__geminiCacheApplied) {
            // Respect an explicit "show original" restore by the user, but auto-apply
            // on fresh buttons or when a translation is expected to be visible.
            // Never touch off-screen tweets: height changes above the viewport
            // are what yank the page during scroll / back-navigation.
            if (geminiBtn.dataset.translated !== "false") {
              if (!textEl.__originalHTML) textEl.__originalHTML = textEl.innerHTML;
              applyCachedWhenVisible(tweet, geminiBtn, statusId);
            }
          }
        }
        return;
      }
      const nativeBtn = findNativeTranslateButton(tweet);
      if (nativeBtn) {
        tweet.dataset.geminiStatusId = statusId;

        // Create an inline-flex wrapper for our button. It takes the native
        // row's place (native is hidden below), so the row keeps its height:
        // single line in, single line out -> zero per-tweet growth, zero shift.
        // overflow-anchor:none keeps the browser from picking our button as
        // the scroll anchor.
        const wrapper = document.createElement("div");
        wrapper.className = "gemini-x-wrapper";
        wrapper.dataset.statusId = statusId;
        wrapper.style.cssText = "display: inline-flex; align-items: center; flex-wrap: nowrap; vertical-align: middle; overflow-anchor: none;";

        const geminiBtn = buildGeminiXButton();
        wrapper.appendChild(geminiBtn);
        try {
          nativeBtn.style.display = "none";
          tweet.dataset.geminiNativeHidden = statusId;
          const nativeParent = nativeBtn.parentNode;
          if (nativeParent) nativeParent.insertBefore(wrapper, nativeBtn.nextSibling);
          else textElFallbackAppend();
        } catch (e) { textElFallbackAppend(); }

        function textElFallbackAppend() {
          const textEl = tweet.querySelector('div[data-testid="tweetText"]');
          if (textEl && textEl.parentNode) textEl.parentNode.insertBefore(wrapper, textEl.nextSibling);
        }

        geminiBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleXTranslateClick(tweet, geminiBtn);
        });
        if (!ensureHeaderReplyButton(tweet, statusId)) {
          const replyBtn = buildGeminiXReplyButton();
          replyBtn.dataset.statusId = statusId;
          wrapper.appendChild(buildGeminiXSep());
          wrapper.appendChild(replyBtn);
          replyBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openXReplyModal(tweet, replyBtn);
          });
        }

        // Check if we have a cached translation for this tweet and auto-apply it
        // (deferred when off-screen so back-navigation restoration stays put)
        if (hasXTranslationCache(statusId)) {
          applyCachedWhenVisible(tweet, geminiBtn, statusId);
        } else if (xAutoTranslateEnabled) {
          // Auto-translate if enabled and language differs
          const textEl = tweet.querySelector('div[data-testid="tweetText"]');
          if (textEl) {
            const tweetLang = textEl.getAttribute("lang");
            if (tweetLang && isDifferentLang(tweetLang, xTargetLang)) {
              observeTweetForAutoTranslate(tweet, geminiBtn);
            }
          }
        }
      } else {
        const textEl = tweet.querySelector('div[data-testid="tweetText"]');
        if (textEl) {
          const tweetLang = textEl.getAttribute("lang");
          if (!tweetLang) {
            return;
          }
          const hasCached = hasXTranslationCache(statusId);
          const needTranslate = hasCached || isDifferentLang(tweetLang, xTargetLang);
          tweet.dataset.geminiStatusId = statusId;
          const headerOk = ensureHeaderReplyButton(tweet, statusId);
          if (needTranslate) {
            const geminiBtn = buildGeminiXButton();
            const wrapper = document.createElement("div");
            wrapper.className = "gemini-x-wrapper standalone";
            wrapper.dataset.statusId = statusId;
            wrapper.style.cssText = "display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; vertical-align: middle; width: 100%; overflow-anchor: none;";
            wrapper.appendChild(geminiBtn);
            if (!headerOk) {
              const replyBtn = buildGeminiXReplyButton();
              replyBtn.dataset.statusId = statusId;
              wrapper.appendChild(buildGeminiXSep());
              wrapper.appendChild(replyBtn);
              replyBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                openXReplyModal(tweet, replyBtn);
              });
            }
            textEl.parentNode.insertBefore(wrapper, textEl);
            geminiBtn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              handleXTranslateClick(tweet, geminiBtn);
            });
            if (hasCached) {
              applyCachedWhenVisible(tweet, geminiBtn, statusId);
            } else if (xAutoTranslateEnabled && isDifferentLang(tweetLang, xTargetLang)) {
              observeTweetForAutoTranslate(tweet, geminiBtn);
            }
          } else if (!headerOk) {
            const replyBtn = buildGeminiXReplyButton();
            replyBtn.dataset.statusId = statusId;
            const wrapper = document.createElement("div");
            wrapper.className = "gemini-x-wrapper standalone";
            wrapper.dataset.statusId = statusId;
            wrapper.style.cssText = "display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; vertical-align: middle; width: 100%; overflow-anchor: none;";
            wrapper.appendChild(replyBtn);
            textEl.parentNode.insertBefore(wrapper, textEl);
            replyBtn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              openXReplyModal(tweet, replyBtn);
            });
          }
        }
      }
    });
    } finally {
      xIsInjecting = false;
    }
  }

  // Collect translatable text nodes from a tweet element, skipping emojis/images/links
  function collectTweetTextNodes(el) {
    const textNodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        // Skip script/style
        if (tag === "script" || tag === "style") return NodeFilter.FILTER_REJECT;
        // Skip the "Show more" / "Daha fazla göster" link itself
        if (parent.closest && parent.closest('[data-testid="tweet-text-show-more-link"]')) return NodeFilter.FILTER_REJECT;
        // Only include nodes with actual translatable text
        const text = node.textContent;
        if (!text || text.trim().length === 0) return NodeFilter.FILTER_REJECT;
        // Skip if purely an emoji unicode sequence, hashtag symbol, or @mention handle
        if (/^[@#]\S+$/.test(text.trim())) return NodeFilter.FILTER_REJECT;
        // Skip pure whitespace/punctuation only nodes
        if (/^[\s\p{P}\p{S}]*$/u.test(text.trim()) && text.trim().length <= 2) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    return textNodes;
  }

  function handleXTranslateClick(tweetElement, buttonElement) {
    const textEl = tweetElement.querySelector('div[data-testid="tweetText"]');
    if (!textEl) return;

    // Ignore clicks while any translation is already running on this tweet
    if (buttonElement.disabled) return;
    if (textEl.__geminiRetranslating) return;

    // Find statusId for cache key
    const statusLink = tweetElement.querySelector('a[href*="/status/"]');
    const statusId = statusLink ? normalizeStatusId(statusLink.getAttribute("href")) : null;

    // Check if we are in restore/toggle mode
    if (buttonElement.dataset.translated === "true") {
      if (textEl.__originalHTML) {
        textEl.innerHTML = textEl.__originalHTML;
        // Reset the cache-applied flag so re-toggling works
        delete textEl.__geminiCacheApplied;
      }
      buttonElement.dataset.translated = "false";
      buttonElement.querySelector("span").textContent = "Gemini ile Çevir";
      return;
    }

    // Check if we have a cached translation for this tweet
    if (statusId && hasXTranslationCache(statusId)) {
      // Save original HTML before applying cache
      if (!textEl.__originalHTML) {
        textEl.__originalHTML = textEl.innerHTML;
      }
      const applied = applyCachedTranslation(tweetElement, statusId, buttonElement);
      // If the DOM holds foreign content (e.g. Grok's translation), fall through
      // and translate the currently visible text fresh
      if (applied) return;
    }

    // Collect only the text nodes - emojis (<img>), links (<a>), bold (<strong>) etc. stay untouched
    const textNodes = collectTweetTextNodes(textEl);
    if (textNodes.length === 0) return;

    // Build a simple text to translate: join all text node contents with a separator
    // so the AI can translate them as a whole coherent sentence
    const textsToTranslate = textNodes.map(n => n.textContent);
    const fullText = textsToTranslate.join("");

    if (!fullText.trim()) return;

    // Show loading spinner
    const btnSpan = buttonElement.querySelector("span");
    const originalTextSpan = btnSpan.textContent;
    btnSpan.innerHTML = '<span class="gemini-x-loader"></span>Çeviriliyor...';
    buttonElement.disabled = true;

    // Save original HTML structure before any modification
    if (!textEl.__originalHTML) {
      textEl.__originalHTML = textEl.innerHTML;
    }

    // Mark in-flight to block observer-driven parallel translations
    textEl.__geminiRetranslating = true;

    // If there's only one text node, use simple translation
    if (textNodes.length === 1) {
      safeSendMessage({
        action: "translate",
        text: fullText.trim(),
        sourceLang: "auto",
        targetLang: xTargetLang
      }, (response) => {
        buttonElement.disabled = false;
        delete textEl.__geminiRetranslating;

        if (response && response.success) {
          // Preserve leading/trailing whitespace from the original node
          const original = textNodes[0].textContent;
          const leadingSpaces = original.match(/^\s*/)[0];
          const trailingSpaces = original.match(/\s*$/)[0];
          textNodes[0].textContent = leadingSpaces + response.translation.trim() + trailingSpaces;

          buttonElement.dataset.translated = "true";
          btnSpan.textContent = "Orijinali Göster (Gemini)";

          // Cache the translation
          if (statusId) {
            setXTranslationCache(statusId, {
              translatedNodes: [{ original: original, translated: response.translation }],
              originalHTML: textEl.__originalHTML
            });
          }
          textEl.__geminiCacheApplied = true;
        } else {
          btnSpan.textContent = "Hata oluştu";
          setTimeout(() => {
            btnSpan.textContent = originalTextSpan;
          }, 3000);
          const errorMsg = response ? response.error : "Bilinmeyen bir hata oluştu.";
          console.error("Çeviri hatası: " + errorMsg);
        }
      });
    } else {
      safeSendMessage({
        action: "translate-batch",
        texts: textsToTranslate,
        targetLang: xTargetLang
      }, (response) => {
        const translations = response && response.success && Array.isArray(response.translations) ? response.translations : null;
        if (translations && translations.length === textNodes.length) {
          buttonElement.disabled = false;
          delete textEl.__geminiRetranslating;
          const cachedNodes = [];
          textNodes.forEach((node, idx) => {
            const t = translations[idx];
            const fallback = node.textContent;
            const useText = (typeof t === "string" && t.trim().length > 0) ? t : fallback;
            const original = node.textContent;
            const leadingSpaces = original.match(/^\s*/)[0];
            const trailingSpaces = original.match(/\s*$/)[0];
            cachedNodes.push({ original: original, translated: useText });
            node.textContent = leadingSpaces + useText.trim() + trailingSpaces;
          });
          buttonElement.dataset.translated = "true";
          btnSpan.textContent = "Orijinali Göster (Gemini)";
          if (statusId) {
            setXTranslationCache(statusId, {
              translatedNodes: cachedNodes,
              originalHTML: textEl.__originalHTML
            });
          }
          textEl.__geminiCacheApplied = true;
          return;
        }
        safeSendMessage({
          action: "translate",
          text: fullText.trim(),
          sourceLang: "auto",
          targetLang: xTargetLang
        }, (singleResponse) => {
          buttonElement.disabled = false;
          delete textEl.__geminiRetranslating;
          if (singleResponse && singleResponse.success) {
            const firstOriginal = textNodes[0].textContent;
            const firstLeading = firstOriginal.match(/^\s*/)[0];
            const firstTrailing = firstOriginal.match(/\s*$/)[0];
            textNodes[0].textContent = firstLeading + singleResponse.translation.trim() + firstTrailing;
            for (let i = 1; i < textNodes.length; i++) {
              textNodes[i].textContent = "";
            }
            buttonElement.dataset.translated = "true";
            btnSpan.textContent = "Orijinali Göster (Gemini)";
            if (statusId) {
              setXTranslationCache(statusId, {
                translatedNodes: [{ original: fullText, translated: singleResponse.translation }],
                originalHTML: textEl.__originalHTML
              });
            }
            textEl.__geminiCacheApplied = true;
          } else {
            btnSpan.textContent = "Hata oluştu";
            setTimeout(() => {
              btnSpan.textContent = originalTextSpan;
            }, 3000);
            const errorMsg = (singleResponse || response) ? ((singleResponse && singleResponse.error) || (response && response.error)) : "Bilinmeyen bir hata oluştu.";
            console.error("Çeviri hatası: " + errorMsg);
          }
        });
      });
    }
  }

  // ==========================================
  // PERSONAL INTELLIGENCE AUTO-DISABLER (gemini.google.com)
  // ==========================================
  function tryDisablePI() {
    // Look for the Personal Intelligence toggle - it's a Material Design toggle/switch
    // The toggle is inside a menu that contains "Personal Intelligence" text
    const allButtons = document.querySelectorAll('button, [role="switch"], [role="menuitemcheckbox"], mat-slide-toggle, [aria-label*="Personal Intelligence"]');
    
    for (const el of allButtons) {
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const ariaChecked = el.getAttribute('aria-checked');
      
      if (ariaLabel.includes('personal intelligence')) {
        if (ariaChecked === 'true') {
          el.click();
          console.log('[Gemini Toolkit] Personal Intelligence toggle disabled automatically.');
          return true;
        }
        return false; // already off
      }
    }

    // Alternative approach: search by text content near toggle elements
    const allElements = document.querySelectorAll('span, div, label');
    for (const el of allElements) {
      if (el.textContent.trim() === 'Personal Intelligence') {
        // Find the closest toggle/switch element
        const parent = el.closest('[role="menuitem"], [role="option"], .mdc-switch, [class*="toggle"], [class*="switch"]') 
          || el.parentElement?.parentElement;
        if (parent) {
          const toggle = parent.querySelector('[role="switch"], [role="menuitemcheckbox"], button[aria-checked], input[type="checkbox"], .mdc-switch');
          if (toggle) {
            const isChecked = toggle.getAttribute('aria-checked') === 'true' 
              || toggle.checked === true 
              || toggle.classList.contains('mdc-switch--checked')
              || toggle.classList.contains('mdc-switch--selected');
            if (isChecked) {
              toggle.click();
              console.log('[Gemini Toolkit] Personal Intelligence toggle disabled via text match.');
              return true;
            }
            return false; // already off
          }
        }
      }
    }
    return false; // not found
  }

  // ==========================================
  // GEMINI SITE SPEEDUP AND CUSTOMIZATION
  // ==========================================
  let geminiCustomStyleEl = null;
  let geminiDOMObserver = null;

  function initGeminiOptimizations() {
    if (!isGemini) return;

    // Inject customization styles if not already injected
    if (!geminiCustomStyleEl) {
      geminiCustomStyleEl = document.createElement("style");
      geminiCustomStyleEl.id = "gemini-toolkit-custom-styles";
      geminiCustomStyleEl.textContent = `
        /* Gemini Speedup styles - disables heavy transitions/animations on layout */
        body.gemini-speedup *,
        body.gemini-speedup *::before,
        body.gemini-speedup *::after {
          transition: none !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          animation-duration: 0s !important;
          animation-delay: 0s !important;
        }

        /* Eliminate expensive real-time background blurring and layer thrashing */
        body.gemini-speedup,
        body.gemini-speedup * {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          will-change: auto !important;
        }

        /* Modern CSS rendering optimizations for recent chat history list elements */
        body.gemini-speedup a[href*="/app/"],
        body.gemini-speedup a[href*="/chat/"] {
          content-visibility: auto !important;
          contain-intrinsic-size: 0 44px !important;
          contain: layout paint style !important;
        }

        /* Gemini Hide Notebooks styles */
        body.gemini-hide-notebooks a[href*="/notebooks"],
        body.gemini-hide-notebooks a[href*="/notebook/"],
        body.gemini-hide-notebooks a[aria-label*="notebook"],
        body.gemini-hide-notebooks a[aria-label*="Notebook"],
        body.gemini-hide-notebooks button[aria-label*="notebook"],
        body.gemini-hide-notebooks button[aria-label*="Notebook"],
        body.gemini-hide-notebooks [class*="notebook-list"],
        body.gemini-hide-notebooks [class*="notebooks-list"] {
          display: none !important;
        }

        /* Gemini Hide Upgrade Button styles */
        body.gemini-hide-upgrade a[href*="/upgrade"],
        body.gemini-hide-upgrade a[href*="upgrade"],
        body.gemini-hide-upgrade button[aria-label*="upgrade"],
        body.gemini-hide-upgrade button[aria-label*="Upgrade"],
        body.gemini-hide-upgrade [aria-label*="upgrade" i],
        body.gemini-hide-upgrade [aria-label*="yükselt" i] {
          display: none !important;
        }
      `;
      document.head.appendChild(geminiCustomStyleEl);
    }

    // Toggle classes on document.body dynamically
    if (geminiSpeedupEnabled) {
      document.body.classList.add("gemini-speedup");
    } else {
      document.body.classList.remove("gemini-speedup");
    }

    if (geminiHideNotebooksEnabled) {
      document.body.classList.add("gemini-hide-notebooks");
    } else {
      document.body.classList.remove("gemini-hide-notebooks");
    }

    if (geminiHideUpgradeEnabled) {
      document.body.classList.add("gemini-hide-upgrade");
    } else {
      document.body.classList.remove("gemini-hide-upgrade");
    }

    // Run active DOM-cleaning immediately
    cleanGeminiDOM();
  }

  // Active JS-based DOM cleaner for Notebooks, Upgrade button, and massive Chat lists
  function cleanGeminiDOM() {
    if (!isGemini) return;

    // 1. Hide Notebooks section header and siblings
    if (geminiHideNotebooksEnabled) {
      const elements = document.querySelectorAll('h2, h3, div, span');
      for (const el of elements) {
        const text = el.textContent.trim();
        if (el.childNodes.length === 1 && (text === 'Notebooks' || text === 'Notebooklar')) {
          el.style.display = 'none';
          
          let sibling = el.nextElementSibling;
          while (sibling) {
            const sibText = sibling.textContent.trim().toLowerCase();
            if (sibText === 'recents' || sibText === 'recent' || sibText === 'son yazışmalar' || sibText === 'geçmiş' || sibling.querySelector('[href*="/app/"]')) {
              break;
            }
            sibling.style.display = 'none';
            sibling = sibling.nextElementSibling;
          }
        }
      }
    }

    // 2. Hide Upgrade buttons and their parent containers
    if (geminiHideUpgradeEnabled) {
      const links = document.querySelectorAll('a, button');
      for (const el of links) {
        const text = el.textContent.trim().toLowerCase();
        if (text.includes('upgrade') || text.includes('yükselt') || text.includes('try gemini advanced') || text.includes("gemini advanced'i deneyin")) {
          const parent = el.closest('div, li, mat-button, [class*="upgrade"]') || el;
          parent.style.display = 'none';
        }
      }
    }

    // 3. Limit dynamic sidebar recent chat items (to completely resolve rendering lag of 500+ chats)
    if (geminiSpeedupEnabled) {
      limitChatItems();
    }
  }

  // Hide recent chats after the 20th item to prevent sidebar rendering and layout thrashing
  function limitChatItems() {
    if (!isGemini || !geminiSpeedupEnabled) return;
    
    const chatLinks = document.querySelectorAll('a[href*="/app/"], a[href*="/chat/"]');
    if (chatLinks.length > 20) {
      for (let i = 20; i < chatLinks.length; i++) {
        const link = chatLinks[i];
        
        // Find the safe item wrapper that contains only this link
        let wrapper = link;
        let parent = link.parentElement;
        const currentHref = link.getAttribute('href');
        
        while (parent) {
          const otherLinks = parent.querySelectorAll('a[href*="/app/"], a[href*="/chat/"]');
          let hasOthers = false;
          for (const other of otherLinks) {
            if (other.getAttribute('href') !== currentHref) {
              hasOthers = true;
              break;
            }
          }
          if (hasOthers) break;
          
          wrapper = parent;
          parent = parent.parentElement;
          if (parent && (parent.tagName === 'NAV' || parent.tagName === 'UL' || parent.tagName === 'OL' || parent.id === 'sidebar')) {
            break;
          }
        }
        
        wrapper.style.display = 'none';
      }
    }
  }

  // Restore all chat items to normal visibility if Speedup is disabled
  function restoreChatItems() {
    if (!isGemini) return;
    const chatLinks = document.querySelectorAll('a[href*="/app/"], a[href*="/chat/"]');
    chatLinks.forEach(link => {
      // Find the safe item wrapper that contains only this link
      let wrapper = link;
      let parent = link.parentElement;
      const currentHref = link.getAttribute('href');
      
      while (parent) {
        const otherLinks = parent.querySelectorAll('a[href*="/app/"], a[href*="/chat/"]');
        let hasOthers = false;
        for (const other of otherLinks) {
          if (other.getAttribute('href') !== currentHref) {
            hasOthers = true;
            break;
          }
        }
        if (hasOthers) break;
        
        wrapper = parent;
        parent = parent.parentElement;
        if (parent && (parent.tagName === 'NAV' || parent.tagName === 'UL' || parent.tagName === 'OL' || parent.id === 'sidebar')) {
          break;
        }
      }
      
      wrapper.style.display = '';
    });
  }

  // Unified high-performance observer for dynamic changes
  function initGeminiObserver() {
    if (!isGemini) return;
    if (geminiDOMObserver) return; // already running

    function processGeminiDOM() {
      if (piDisablerEnabled) {
        tryDisablePI();
      }
      if (geminiHideNotebooksEnabled || geminiHideUpgradeEnabled) {
        cleanGeminiDOM();
      }
      if (geminiSpeedupEnabled) {
        limitChatItems();
      }
    }

    // Run once immediately
    processGeminiDOM();

    // Hizli art arda mutasyonlari (sohbet akisi) tek geciste birlestir:
    // her tus vurusunda tam DOM taramasi yapma
    let geminiDOMQueued = false;
    geminiDOMObserver = new MutationObserver(() => {
      if (geminiDOMQueued) return;
      geminiDOMQueued = true;
      setTimeout(() => {
        geminiDOMQueued = false;
        processGeminiDOM();
      }, 300);
    });
    geminiDOMObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stopGeminiObserver() {
    // Only stop if none of the features are active
    if (!piDisablerEnabled && !geminiHideNotebooksEnabled && !geminiHideUpgradeEnabled && !geminiSpeedupEnabled) {
      if (geminiDOMObserver) {
        geminiDOMObserver.disconnect();
        geminiDOMObserver = null;
      }
    }
  }

  // ==========================================
  // GÖRSEL ÇEVİRİ (alan seç → Gemini vision çevir → overlay, kapatınca gider)
  // ==========================================
  let visualActive = false;
  function startVisualTranslate() {
    if (visualActive) return;
    visualActive = true;
    hideWidget();
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483645;background:rgba(0,0,0,.35);cursor:crosshair;user-select:none;";
    const sel = document.createElement("div");
    sel.style.cssText = "position:fixed;display:none;border:2px solid #06b6d4;background:rgba(6,182,212,.15);z-index:2147483646;pointer-events:none;";
    const hint = document.createElement("div");
    hint.textContent = "Çevrilecek alanı seç (ESC: iptal)";
    hint.style.cssText = "position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#111;color:#fff;font:13px sans-serif;padding:8px 14px;border-radius:8px;z-index:2147483646;pointer-events:none;";
    overlay.appendChild(sel);
    document.body.appendChild(overlay);
    document.body.appendChild(hint);
    let x0 = 0, y0 = 0, x1 = 0, y1 = 0, dragging = false;

    const cleanup = () => { overlay.remove(); hint.remove(); box?.remove(); visualActive = false; document.removeEventListener("keydown", onKey, true); };
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;display:none;z-index:2147483646;max-width:min(420px,90vw);max-height:60vh;overflow:auto;background:#fff;color:#111;font:14px/1.6 sans-serif;padding:14px 16px;border-radius:12px;box-shadow:0 24px 48px rgba(0,0,0,.3);white-space:pre-wrap;";
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.title = "Kapat";
    closeBtn.style.cssText = "position:sticky;float:right;top:0;border:none;background:#eee;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:13px;";
    closeBtn.onclick = (e) => { e.stopPropagation(); cleanup(); };
    box.appendChild(closeBtn);
    const body = document.createElement("div");
    box.appendChild(body);
    document.body.appendChild(box);

    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); cleanup(); }
    }
    document.addEventListener("keydown", onKey, true);

    overlay.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      dragging = true;
      x0 = x1 = e.clientX; y0 = y1 = e.clientY;
      Object.assign(sel.style, { display: "block", left: x0 + "px", top: y0 + "px", width: "0px", height: "0px" });
    });
    overlay.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      x1 = e.clientX; y1 = e.clientY;
      Object.assign(sel.style, {
        left: Math.min(x0, x1) + "px", top: Math.min(y0, y1) + "px",
        width: Math.abs(x1 - x0) + "px", height: Math.abs(y1 - y0) + "px"
      });
    });
    overlay.addEventListener("mouseup", (e) => {
      if (!dragging) return;
      dragging = false;
      const rect = { left: Math.min(x0, e.clientX), top: Math.min(y0, e.clientY), w: Math.abs(e.clientX - x0), h: Math.abs(e.clientY - y0) };
      if (rect.w < 8 || rect.h < 8) { cleanup(); return; }
      overlay.style.cursor = "wait";
      hint.textContent = "Çevriliyor...";
      // Seçim kutusunu sonuç kutusuna dönüştür
      overlay.style.background = "rgba(0,0,0,.15)";
      sel.style.display = "none";
      Object.assign(box.style, { display: "block", left: Math.min(rect.left, innerWidth - 440) + "px", top: Math.min(rect.top + rect.h + 8, innerHeight - 200) + "px" });
      body.textContent = "Çevriliyor...";
      const targetLang = (targetInput && targetInput.value) || savedTranslatorTargetLang || "tr";
      safeSendMessage({ action: "visual-capture" }, (cap) => {
        if (!cap || !cap.success) { body.textContent = "Ekran görüntüsü alınamadı: " + ((cap && cap.error) || "bilinmiyor"); return; }
        const img = new Image();
        img.onload = () => {
          try {
            const s = img.naturalWidth / window.innerWidth;
            const c = document.createElement("canvas");
            c.width = Math.round(rect.w * s); c.height = Math.round(rect.h * s);
            c.getContext("2d").drawImage(img, Math.round(rect.left * s), Math.round(rect.top * s), c.width, c.height, 0, 0, c.width, c.height);
            safeSendMessage({ action: "visual-translate-image", imageData: c.toDataURL("image/png"), targetLang }, (res) => {
              overlay.style.cursor = "crosshair";
              hint.textContent = "Çevrilecek alanı seç (ESC: iptal)";
              if (res && res.success) { body.textContent = res.translation; }
              else { body.textContent = "Çeviri hatası: " + ((res && res.error) || "bilinmiyor"); }
            });
          } catch (err) { body.textContent = "Kırpma hatası: " + err.message; }
        };
        img.onerror = () => { body.textContent = "Görüntü işlenemedi."; };
        img.src = cap.dataUrl;
      });
      // Overlay'e tıklayınca kapat (kapatınca çeviri gider, saklanmaz)
      overlay.addEventListener("mousedown", () => cleanup(), { once: true });
    }, { once: false });
  }

})();
