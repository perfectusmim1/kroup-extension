// CONSTANTS & DEFAULT CONFIG
// NOT: API anahtarı koda gömülmez. Her kullanıcı kendi anahtarını Ayarlar'dan girer.
const DEFAULT_API_KEY = "";
const DEFAULT_MODEL = "gemini-3.8-flash";
const LEGACY_MODEL = "gemini-3.6-flash";
function normalizeModelName(m) { return m === LEGACY_MODEL ? DEFAULT_MODEL : (m || DEFAULT_MODEL); }

// LANGUAGE CATALOG
const LANGUAGES = [
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


const LANG_NAME_BY_CODE = Object.fromEntries(LANGUAGES.map(l => [l.code, l.name]));

const AUTO_LANG_OPTION = { code: "auto", name: "Dili Algıla (Otomatik)", flag: null };

function buildFlagNode(flag) {
  if (flag) {
    const img = document.createElement("img");
    img.className = "flag-img";
    img.src = `https://flagcdn.com/w20/${flag}.png`;
    img.srcset = `https://flagcdn.com/w40/${flag}.png 2x`;
    img.alt = "";
    img.draggable = false;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => {
      const globe = document.createElement("span");
      globe.className = "flag-globe";
      globe.textContent = "🌐";
      img.replaceWith(globe);
    }, { once: true });
    return img;
  }
  const globe = document.createElement("span");
  globe.className = "flag-globe";
  globe.textContent = "🌐";
  return globe;
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

function buildLangOptionElement(lang) {
  const div = document.createElement("div");
  div.className = "custom-option";
  div.setAttribute("data-value", lang.code);
  div.appendChild(buildFlagNode(lang.flag));
  const text = document.createElement("span");
  text.className = "option-label";
  text.textContent = lang.name;
  div.appendChild(text);
  return div;
}

// Dil listeleri agir (~117 secenek + bayrak gorseli); popup acilisinda degil,
// ilgili dropdown ilk kez acilirken kurulur.
const LANG_SELECT_IDS = {
  "trans-source": 1, "trans-target": 1, "page-trans-target": 1, "reply-lang": 1,
  "settings-x-target-lang": 1, "settings-inline-target-lang": 1,
  "yt-target-lang": 1, "yt-preferred-source": 1
};
const LANG_AUTO_IDS = { "trans-source": 1, "yt-preferred-source": 1 };

function ensureLangOptions(inputId) {
  if (!LANG_SELECT_IDS[inputId]) return;
  const hiddenInput = document.getElementById(inputId);
  const container = hiddenInput?.closest(".custom-select")?.querySelector(".custom-select-options");
  if (!container || container.dataset.langBuilt) return;
  container.dataset.langBuilt = "1";
  if (LANG_AUTO_IDS[inputId]) container.appendChild(buildLangOptionElement(AUTO_LANG_OPTION));
  LANGUAGES.forEach(lang => container.appendChild(buildLangOptionElement(lang)));
  syncCustomSelectActive(hiddenInput.closest(".custom-select"));
}

function syncCustomSelectActive(select) {
  const hiddenInput = select?.querySelector("input[type='hidden']");
  if (!hiddenInput) return;
  select.querySelectorAll(".custom-option").forEach(opt => {
    opt.classList.toggle("active", opt.getAttribute("data-value") === hiddenInput.value);
  });
}

// THEME CONTROLLER (Ayarlar > Tema; seçenekler: light / dark)
const THEMES = ["light", "dark"];
function normalizeTheme(t) { return THEMES.includes(t) ? t : "light"; }
function applyTheme(name) {
  const theme = normalizeTheme(name);
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem("popupTheme", theme); } catch (e) {}
  chrome.storage.local.set({ popupTheme: theme });
}

// TAB METADATA
const TAB_INFO = {
  corrector: { title: "Yazım Düzeltici" },
  summarizer: { title: "Özetleyici" },
  reply: { title: "Akıllı Yanıt" },
  translator: { title: "Dil Çevirmeni" },
  youtube: { title: "YouTube" },
  authenticator: { title: "Doğrulayıcı" },
  music: { title: "Müzik Bul" },
  sound: { title: "Ses Mikseri" },
  settings: { title: "Ayarlar" }
};

// THEME RESTORE (runs immediately, before DOMContentLoaded)
(function restoreThemeImmediately() {
  try {
    const cached = localStorage.getItem("popupTheme");
    if (cached === "dark" || cached === "light") {
      document.documentElement.setAttribute("data-theme", cached);
    }
  } catch (e) {}

  try {
    chrome.storage.local.get(["popupTheme"], (res) => {
      const theme = normalizeTheme(res.popupTheme);
      document.documentElement.setAttribute("data-theme", theme);
      try { localStorage.setItem("popupTheme", theme); } catch (e) {}
    });
  } catch (e) {}
})();

// INITIALIZATION (acilis hizi: yalnizca hafif baglamalar burada;
// agir paneller ilk kez acildiklarinda ensurePanelInit ile kurulur)
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Custom Selects (dil listeleri ilk acilista kurulur)
  initCustomSelects();

  // Load settings & active states
  const settings = await getSettings();
  initSettingsUI(settings);
  restoreActiveTab();
  restoreSidebarState();

  // Restore Translator Languages
  const transSourceInput = document.getElementById("trans-source");
  const transTargetInput = document.getElementById("trans-target");
  if (transSourceInput) {
    transSourceInput.value = settings.transSource;
    updateCustomSelectUI("trans-source");
    transSourceInput.addEventListener("change", (e) => {
      chrome.storage.local.set({ transSource: e.target.value });
    });
  }
  if (transTargetInput) {
    transTargetInput.value = settings.transTarget;
    updateCustomSelectUI("trans-target");
    transTargetInput.addEventListener("change", (e) => {
      chrome.storage.local.set({ transTarget: e.target.value });
    });
  }

  // Restore Page Translator Target Language (sağ tık menüsü de bunu kullanır)
  const pageTransTargetInput = document.getElementById("page-trans-target");
  if (pageTransTargetInput) {
    chrome.storage.local.get(["pageTransTarget"], (res) => {
      if (res.pageTransTarget) {
        pageTransTargetInput.value = res.pageTransTarget;
        updateCustomSelectUI("page-trans-target");
      }
    });
    pageTransTargetInput.addEventListener("change", (e) => {
      chrome.storage.local.set({ pageTransTarget: e.target.value });
    });
  }

  // Bind Sidebar Events
  document.getElementById("sidebar-toggle").addEventListener("click", toggleSidebar);

  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      switchTab(item.getAttribute("data-tab"));
    });
  });

  // Bind Character Counters
  setupCharCounters();

  // Bind Clear Button Handlers
  setupClearHandlers();

  // Bind Copy Handlers
  setupCopyHandlers();

  // Bind Features Action Handlers
  setupFeatureActions();

  // Bind Settings Form Actions
  setupSettingsActions();

  // Bind Backup Actions
  setupBackupActions();
});

// Agir paneller tembel kurulur: sekmeye ilk giriste bir kez calisir
const PANEL_INITTED = {};
function ensurePanelInit(tabId) {
  if (PANEL_INITTED[tabId]) {
    if (tabId === "sound" && typeof renderSoundList === "function") renderSoundList();
    return;
  }
  PANEL_INITTED[tabId] = true;
  if (tabId === "translator") setupPageTranslatorActions();
  else if (tabId === "youtube") setupYouTubePanel();
  else if (tabId === "authenticator") setupAuthenticator();
  else if (tabId === "music") setupMusicPanel();
  else if (tabId === "sound") {
    setupSoundPanel();
    if (typeof renderSoundList === "function") renderSoundList();
  }
}

// STORAGE UTILITIES
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiKey", "modelName", "popupTheme", "selectionTranslationEnabled", "selectionSearchEnabled", "visualMenuEnabled", "searchMode", "selectionTranslateMode", "inlineTargetLang", "xTranslationEnabled", "xAutoTranslateEnabled", "xCacheEnabled", "xTargetLang", "piDisablerEnabled", "thinkingLevel", "geminiSpeedupEnabled", "geminiHideNotebooksEnabled", "geminiHideUpgradeEnabled", "useMultiKeys", "geminiApiKeys", "transSource", "transTarget"], (result) => {
      resolve({
        apiKey: result.apiKey || DEFAULT_API_KEY,
        modelName: normalizeModelName(result.modelName),
        popupTheme: normalizeTheme(result.popupTheme),
        selectionTranslationEnabled: result.selectionTranslationEnabled !== false,
        selectionSearchEnabled: result.selectionSearchEnabled !== false,
        visualMenuEnabled: !!result.visualMenuEnabled,
        searchMode: result.searchMode || "tab",
        selectionTranslateMode: result.selectionTranslateMode || "bubble",
        inlineTargetLang: result.inlineTargetLang || "tr",
        xTranslationEnabled: result.xTranslationEnabled !== false,
        xAutoTranslateEnabled: !!result.xAutoTranslateEnabled,
        xCacheEnabled: result.xCacheEnabled !== false,
        xTargetLang: result.xTargetLang || "tr",
        piDisablerEnabled: result.piDisablerEnabled !== false,
        thinkingLevel: result.thinkingLevel || "MINIMAL",
        geminiSpeedupEnabled: result.geminiSpeedupEnabled !== false,
        geminiHideNotebooksEnabled: result.geminiHideNotebooksEnabled !== false,
        geminiHideUpgradeEnabled: result.geminiHideUpgradeEnabled !== false,
        useMultiKeys: !!result.useMultiKeys,
        geminiApiKeys: result.geminiApiKeys || "",
        transSource: result.transSource || "auto",
        transTarget: result.transTarget || "tr"
      });
    });
  });
}

function saveSettings(patch) {
  return new Promise((resolve) => {
    chrome.storage.local.set(patch, () => {
      resolve();
    });
  });
}

// SIDEBAR COLLAPSE/EXPAND LOGIC
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("collapsed");
  const isCollapsed = sidebar.classList.contains("collapsed");
  chrome.storage.local.set({ sidebarCollapsed: isCollapsed });
}

async function restoreSidebarState() {
  chrome.storage.local.get("sidebarCollapsed", (result) => {
    const sidebar = document.getElementById("sidebar");
    if (result.sidebarCollapsed) {
      sidebar.classList.add("collapsed");
    } else {
      sidebar.classList.remove("collapsed");
    }
  });
}

// TAB ROUTING LOGIC
function switchTab(tabId) {
  // Update nav buttons active classes
  document.querySelectorAll(".nav-item").forEach(item => {
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update visible panels
  document.querySelectorAll(".panel").forEach(panel => {
    if (panel.id === `panel-${tabId}`) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });

  // Update header content
  const tabMeta = TAB_INFO[tabId];
  if (tabMeta) {
    const titleEl = document.getElementById("active-tab-title");
    titleEl.style.opacity = 0;
    setTimeout(() => {
      titleEl.textContent = tabMeta.title;
      titleEl.style.opacity = 1;
    }, 120);
  }

  // Save current active tab
  chrome.storage.local.set({ activeTab: tabId });

  // Sekmeye girince paneli tembel kur (ilk acilista agir isler calisir)
  ensurePanelInit(tabId);
}

async function restoreActiveTab() {
  chrome.storage.local.get("activeTab", (result) => {
    let tab = result.activeTab || "corrector";
    // Kaldirilan sekmeye kayitli kalmissa varsayilana dus
    if (!document.querySelector(`.nav-item[data-tab="${tab}"]`)) tab = "corrector";
    switchTab(tab);
  });
}

// COUNTERS & INPUTS
function setupCharCounters() {
  const countPairs = [
    { inputId: "corrector-input", counterId: "corrector-counter" },
    { inputId: "summarizer-input", counterId: "summarizer-counter" },
    { inputId: "reply-input", counterId: "reply-counter" },
    { inputId: "reply-stance-input", counterId: "reply-stance-counter" },
    { inputId: "translator-input", counterId: "translator-counter" }
  ];

  countPairs.forEach(pair => {
    const input = document.getElementById(pair.inputId);
    const counter = document.getElementById(pair.counterId);
    if (input && counter) {
      const updateCounter = () => {
        counter.textContent = input.value.length;
      };
      input.addEventListener("input", updateCounter);
      updateCounter(); // init
    }
  });
}

function setupClearHandlers() {
  const clears = [
    { btnId: "corrector-clear", inputId: "corrector-input", cardId: "corrector-result-card", counterId: "corrector-counter" },
    { btnId: "summarizer-clear", inputId: "summarizer-input", cardId: "summarizer-result-card", counterId: "summarizer-counter" },
    { btnId: "reply-clear", inputId: "reply-input", cardId: "reply-result-card", counterId: "reply-counter", extraInputId: "reply-stance-input", extraCounterId: "reply-stance-counter" },
    { btnId: "translator-clear", inputId: "translator-input", cardId: "translator-result-card", counterId: "translator-counter" }
  ];

  clears.forEach(item => {
    const btn = document.getElementById(item.btnId);
    const input = document.getElementById(item.inputId);
    const card = document.getElementById(item.cardId);
    const counter = document.getElementById(item.counterId);

    if (btn && input) {
      btn.addEventListener("click", () => {
        input.value = "";
        if (counter) counter.textContent = "0";
        if (item.extraInputId) {
          const extra = document.getElementById(item.extraInputId);
          if (extra) extra.value = "";
          const extraCounter = item.extraCounterId ? document.getElementById(item.extraCounterId) : null;
          if (extraCounter) extraCounter.textContent = "0";
        }
        if (card) card.hidden = true;
        input.focus();
      });
    }
  });
}

// COPY CLIPBOARD IMPLEMENTATION
function copyToClipboard(text) {
  // Primary: use textarea + execCommand (most reliable in extension popups)
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (success) return Promise.resolve();
  } catch (e) {
    document.body.removeChild(textarea);
  }
  // Fallback: try navigator.clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("Kopyalama başarısız oldu."));
}

function setupCopyHandlers() {
  const copies = [
    { btnId: "corrector-copy", textId: "corrector-output" },
    { btnId: "summarizer-copy", textId: "summarizer-output" },
    { btnId: "reply-copy", textId: "reply-output" },
    { btnId: "translator-copy", textId: "translator-output" }
  ];

  copies.forEach(item => {
    const btn = document.getElementById(item.btnId);
    if (btn) {
      btn.addEventListener("click", () => {
        const textContent = document.getElementById(item.textId).innerText;
        if (!textContent) return;

        copyToClipboard(textContent).then(() => {
          // Swap button UI state
          const originalHTML = btn.innerHTML;
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="copy-icon">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span style="color: #10b981;">Kopyalandı!</span>
          `;

          setTimeout(() => {
            btn.innerHTML = originalHTML;
          }, 1500);
        }).catch(err => {
          console.error("Clipboard copy failed:", err);
        });
      });
    }
  });
}

// GEMINI API UTILITIES
// Lite modeller thinkingConfig'i 400 ile reddedebilir; o durumda aynı key
// üzerinden thinking'siz varyantla bir kez daha dene.
function geminiRequestVariants(requestBody) {
  const variants = [requestBody];
  if (requestBody.generationConfig && requestBody.generationConfig.thinkingConfig) {
    const plain = JSON.parse(JSON.stringify(requestBody));
    delete plain.generationConfig.thinkingConfig;
    variants.push(plain);
  }
  return variants;
}

function geminiThinkingRejected(error) {
  if (!error) return false;
  if (error.status === 400) return true;
  return /thinking/i.test(error.message || "");
}

async function postGeminiBody(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const err = new Error(errData.error?.message || `HTTP Hata: ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

async function callGeminiAPI(prompt, systemInstruction = null) {
  const settings = await getSettings();
  const modelName = settings.modelName;
  const thinkingLevel = settings.thinkingLevel || "MINIMAL";

  let apiKeys = [];
  if (settings.useMultiKeys) {
    apiKeys = settings.geminiApiKeys.split("\n").map(k => k.trim()).filter(k => k !== "");
  } else {
    apiKeys = settings.apiKey && settings.apiKey.trim() ? [settings.apiKey.trim()] : [];
  }

  if (apiKeys.length === 0) {
    throw new Error("Lütfen ayarlardan bir API anahtarı tanımlayın.");
  }

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ]
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [
        {
          text: systemInstruction
        }
      ]
    };
  }

  // Adjust temperature for more precise grammar corrections/translations
  requestBody.generationConfig = {
    temperature: 0.2,
    maxOutputTokens: 32768
  };

  if (thinkingLevel !== "NONE") {
    requestBody.generationConfig.thinkingConfig = {
      thinkingLevel: thinkingLevel
    };
  }

  let lastError = null;
  const bodies = geminiRequestVariants(requestBody);
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    let keyFailed = false;
    for (let v = 0; v < bodies.length; v++) {
      try {
        const data = await postGeminiBody(url, bodies[v]);
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidateText) {
          throw new Error("Yapay zekadan boş bir yanıt döndü.");
        }

        return candidateText.trim();
      } catch (error) {
        if (v < bodies.length - 1 && geminiThinkingRejected(error)) {
          console.log("Model thinking desteklemiyor, thinking olmadan tekrar deneniyor...");
          continue;
        }
        lastError = error;
        keyFailed = true;
        break;
      }
    }
    if (keyFailed) {
      console.log("Anahtar " + (i + 1) + " hata aldı, sonraki deneniyor...");
    }
  }

  if (lastError && (lastError.message === "Failed to fetch" || lastError.message.includes("Failed to fetch"))) {
    throw new Error("Failed to fetch. Bu hata genellikle modelin yoğun/overloaded olması (503 Service Unavailable), rate-limit aşımı veya geçersiz API anahtarı sebebiyle Google sunucularının bağlantıyı kesmesinden kaynaklanır. Lütfen API anahtarlarınızı kontrol edin veya Ayarlar'dan gemini-3.5-flash-lite modelini seçin.");
  }

  throw lastError || new Error("Tüm API anahtarları başarısız oldu.");
}

// SKELETON LOADER CONTROLS
function showSkeletonLoader(cardId, outputId, btnId) {
  const card = document.getElementById(cardId);
  const output = document.getElementById(outputId);
  const btn = document.getElementById(btnId);
  const spinner = btn.querySelector(".loader-spinner");

  // Show card & render shimmer lines
  card.hidden = false;
  output.innerHTML = `
    <div class="shimmer-text">
      <div class="shimmer-line w-90"></div>
      <div class="shimmer-line w-80"></div>
      <div class="shimmer-line w-70"></div>
    </div>
  `;

  // Disable action button & show spinner
  btn.disabled = true;
  if (spinner) spinner.hidden = false;
}

function hideSkeletonLoader(btnId) {
  const btn = document.getElementById(btnId);
  const spinner = btn.querySelector(".loader-spinner");

  btn.disabled = false;
  if (spinner) spinner.hidden = true;
}

function displayError(outputId, errorMsg) {
  const output = document.getElementById(outputId);
  output.innerHTML = `
    <div style="color: #dc2626; font-weight: 500; display: flex; align-items: center; gap: 8px;">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      Bir Hata Oluştu:
    </div>
    <div style="opacity: 0.75; font-size: 12px; margin-top: 4px;">${errorMsg}</div>
  `;
}

// FEATURE HANDLERS
function setupFeatureActions() {

  // 1. Yazım Düzeltici (TDK Corrector)
  const correctorBtn = document.getElementById("corrector-btn");
  correctorBtn.addEventListener("click", async () => {
    const input = document.getElementById("corrector-input").value.trim();
    if (!input) return;

    showSkeletonLoader("corrector-result-card", "corrector-output", "corrector-btn");

    const systemPrompt = "Sen hızlı bir Türkçe dil editörüsün. Metni TDK kurallarına göre düzelt. Özgün anlamı koru. Noktalı virgül (;) kullanma, gerekirse cümleleri nokta ile böl. Sadece düzeltilen metnin kendisini ver, açıklama/not ekleme.";

    try {
      const result = await callGeminiAPI(input, systemPrompt);
      document.getElementById("corrector-output").textContent = result;
    } catch (err) {
      displayError("corrector-output", err.message);
    } finally {
      hideSkeletonLoader("corrector-btn");
    }
  });

  // 2. Özetleyici
  const summarizerBtn = document.getElementById("summarizer-btn");
  summarizerBtn.addEventListener("click", async () => {
    const input = document.getElementById("summarizer-input").value.trim();
    if (!input) return;

    showSkeletonLoader("summarizer-result-card", "summarizer-output", "summarizer-btn");

    const length = document.getElementById("summarizer-length").value;
    const format = document.getElementById("summarizer-format").value;

    let lengthInstruction = "orta uzunlukta (yaklaşık 2-3 paragraf)";
    if (length === "short") lengthInstruction = "kısa ve öz (tek paragraf)";
    if (length === "long") lengthInstruction = "detaylı ve kapsamlı bir analiz sunarak";

    let formatInstruction = "maddeler halinde (bullet points)";
    if (format === "paragraph") formatInstruction = "düz metin paragrafları şeklinde";

    const systemPrompt = `Metni anlamını koruyarak özetle. Uzunluk: ${lengthInstruction}. Format: ${formatInstruction}. Sadece özet metnini döndür. Giriş, başlık veya açıklama/not ekleme.`;

    try {
      const result = await callGeminiAPI(input, systemPrompt);
      document.getElementById("summarizer-output").textContent = result;
    } catch (err) {
      displayError("summarizer-output", err.message);
    } finally {
      hideSkeletonLoader("summarizer-btn");
    }
  });

  // 3. Akıllı Yanıt (Smart Reply)
  const replyBtn = document.getElementById("reply-btn");
  replyBtn.addEventListener("click", async () => {
    const input = document.getElementById("reply-input").value.trim();
    if (!input) return;

    showSkeletonLoader("reply-result-card", "reply-output", "reply-btn");

    const tone = document.getElementById("reply-tone").value;
    const lang = document.getElementById("reply-lang").value;
    const stanceEl = document.getElementById("reply-stance-input");
    const stance = stanceEl ? stanceEl.value.trim() : "";

    let toneText = "resmi, nazik ve profesyonel";
    if (tone === "casual") toneText = "samimi, arkadaşça ve içten";
    if (tone === "persuasive") toneText = "ikna edici, etkileyici ve iddialı";
    if (tone === "polite-short") toneText = "kibar, kısa, net ve öz";

    const langText = LANG_NAME_BY_CODE[lang] || "Türkçe";

    let systemPrompt = `İletiye uygun bir yanıt taslağı oluştur. Dil: ${langText}. Ton: ${toneText}. Asla kullanıcıya hitap etme, kullanıcının görüşünü değerlendirme; yanıt doğrudan karşı tarafa yazılmış olsun. Sadece yanıt metnini döndür. Giriş veya not ekleme.`;
    if (stance) {
      systemPrompt += ` Yanıt bu pozisyonu savunsun: "${stance}".`;
    }

    try {
      const result = await callGeminiAPI(input, systemPrompt);
      document.getElementById("reply-output").textContent = result;
    } catch (err) {
      displayError("reply-output", err.message);
    } finally {
      hideSkeletonLoader("reply-btn");
    }
  });

  // 4. Dil Çevirmeni (Translator)
  const translatorBtn = document.getElementById("translator-btn");
  translatorBtn.addEventListener("click", async () => {
    const input = document.getElementById("translator-input").value.trim();
    if (!input) return;

    showSkeletonLoader("translator-result-card", "translator-output", "translator-btn");

    const src = document.getElementById("trans-source").value;
    const target = document.getElementById("trans-target").value;

    const srcLabel = src === "auto" ? "Otomatik Algılanan" : (LANG_NAME_BY_CODE[src] || src);
    const targetLabel = LANG_NAME_BY_CODE[target] || target;

    const systemPrompt = `Sen uzman ve son derece doğal bir çevirmensin. Metni ${srcLabel} dilinden ${targetLabel} diline çevir.
ÇEVİRİ İLKELERİ:
- Tıpkı o dili anadili olarak konuşan bir insanın günlük yaşamda (mesajlaşırken veya konuşurken) kullanacağı gibi son derece doğal, rahat ve akıcı çevir.
- Yapay, kasıntı, aşırı resmi veya robotik bir dil KULLANMA.
- Doğallık katan genel kısaltmaları (örneğin "idk", "gonna", "wanna", "btw" vb.) yeri geldiğinde doğal bir şekilde rahatça kullan; fakat her kelimeyi zorla kısaltma.
- Orijinal cümlenin duygu, ima, bağlam ve ANLAMINI %100 koru.
- Sadece çeviri sonucunu döndür. Ek bilgi, açıklama, başlık veya not ekleme.`;

    try {
      const result = await callGeminiAPI(input, systemPrompt);
      document.getElementById("translator-output").textContent = result;
    } catch (err) {
      displayError("translator-output", err.message);
    } finally {
      hideSkeletonLoader("translator-btn");
    }
  });

  // Swap language button logic
  const swapBtn = document.getElementById("trans-swap");
  swapBtn.addEventListener("click", () => {
    const srcInput = document.getElementById("trans-source");
    const targetInput = document.getElementById("trans-target");

    const srcVal = srcInput.value;
    const targetVal = targetInput.value;

    // We can only swap if the source language is not 'auto'
    if (srcVal !== "auto") {
      srcInput.value = targetVal;
      targetInput.value = srcVal;
    } else {
      // If auto is selected as source, swap auto to target language and make source target language
      srcInput.value = targetVal;
      targetInput.value = "en"; // default fallback for target
    }

    // Synchronize UI triggers
    updateCustomSelectUI("trans-source");
    updateCustomSelectUI("trans-target");

    // Save values to local storage
    chrome.storage.local.set({
      transSource: srcInput.value,
      transTarget: targetInput.value
    });
  });
}

// AYARLAR (SETTINGS) HANDLERS
function initSettingsUI(settings) {
  document.getElementById("settings-api-key").value = settings.apiKey;
  const themeInput = document.getElementById("settings-theme");
  if (themeInput) {
    themeInput.value = normalizeTheme(settings.popupTheme);
    updateCustomSelectUI("settings-theme");
  }
  document.getElementById("settings-model-name").value = settings.modelName;
  updateCustomSelectUI("settings-model-name");
  
  const thinkingLevelInput = document.getElementById("settings-thinking-level");
  if (thinkingLevelInput) {
    thinkingLevelInput.value = settings.thinkingLevel || "MINIMAL";
    updateCustomSelectUI("settings-thinking-level");
  }

  document.getElementById("settings-selection-translate").checked = settings.selectionTranslationEnabled;
  document.getElementById("settings-selection-search").checked = settings.selectionSearchEnabled;
  document.getElementById("settings-visual-menu").checked = !!settings.visualMenuEnabled;
  const visualShortcutDesc = document.getElementById("visual-shortcut-desc");
  if (visualShortcutDesc) {
    // Chrome, komut kisayollarinin ayarlardan degistirilmesine izin vermez;
    // sadece mevcut degeri gosterip yonlendiriyoruz.
    try {
      chrome.commands.getAll((cmds) => {
        const c = (cmds || []).find((x) => x.name === "visual-translate");
        visualShortcutDesc.textContent = "Mevcut: " + ((c && c.shortcut) ? c.shortcut : "atanmamış");
      });
    } catch (e) {
      visualShortcutDesc.textContent = "Mevcut kısayol okunamadı.";
    }
  }
  const visualShortcutBtn = document.getElementById("visual-shortcut-btn");
  if (visualShortcutBtn) {
    visualShortcutBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" }, () => {
        void chrome.runtime.lastError;
      });
    });
  }
  document.getElementById("settings-search-mode").value = settings.searchMode;
  updateCustomSelectUI("settings-search-mode");
  document.getElementById("settings-select-translate-mode").value = settings.selectionTranslateMode;
  updateCustomSelectUI("settings-select-translate-mode");

  const inlineLangGroup = document.getElementById("inline-target-lang-group");
  const inlineLangInput = document.getElementById("settings-inline-target-lang");
  inlineLangInput.value = settings.inlineTargetLang || "tr";
  updateCustomSelectUI("settings-inline-target-lang");
  inlineLangGroup.hidden = settings.selectionTranslateMode !== "inline";
  document.getElementById("settings-select-translate-mode").addEventListener("change", (e) => {
    inlineLangGroup.hidden = e.target.value !== "inline";
  });

  document.getElementById("settings-x-translate").checked = settings.xTranslationEnabled;
  document.getElementById("settings-x-auto-translate").checked = settings.xAutoTranslateEnabled;
  document.getElementById("settings-x-cache").checked = settings.xCacheEnabled;
  
  const xTargetLangInput = document.getElementById("settings-x-target-lang");
  if (xTargetLangInput) {
    xTargetLangInput.value = settings.xTargetLang || "tr";
    updateCustomSelectUI("settings-x-target-lang");
  }

  document.getElementById("settings-pi-disabler").checked = settings.piDisablerEnabled;
  document.getElementById("settings-gemini-speedup").checked = settings.geminiSpeedupEnabled;
  document.getElementById("settings-gemini-hide-notebooks").checked = settings.geminiHideNotebooksEnabled;
  document.getElementById("settings-gemini-hide-upgrade").checked = settings.geminiHideUpgradeEnabled;

  // Set multi-key settings
  const useMultiKeysInput = document.getElementById("settings-use-multi-keys");
  const multiKeyTextarea = document.getElementById("settings-multi-api-keys");
  
  useMultiKeysInput.checked = settings.useMultiKeys;
  multiKeyTextarea.value = settings.geminiApiKeys;

  const toggleMultiKeysView = (useMulti) => {
    const singleContainer = document.getElementById("single-key-container");
    const multiContainer = document.getElementById("multi-key-container");
    if (useMulti) {
      singleContainer.hidden = true;
      multiContainer.hidden = false;
    } else {
      singleContainer.hidden = false;
      multiContainer.hidden = true;
    }
  };

  useMultiKeysInput.addEventListener("change", (e) => {
    toggleMultiKeysView(e.target.checked);
  });

  // Run immediately to set initial visibility
  toggleMultiKeysView(settings.useMultiKeys);

  // Key counter function
  const updateKeysCount = () => {
    const text = multiKeyTextarea.value;
    const keys = text.split("\n").map(k => k.trim()).filter(k => k !== "");
    document.getElementById("multi-keys-count-label").textContent = `${keys.length} anahtar`;
  };
  multiKeyTextarea.addEventListener("input", updateKeysCount);
  updateKeysCount();

  // Toggle API key visibility
  const toggleBtn = document.getElementById("toggle-api-key-vis");
  const apiKeyInput = document.getElementById("settings-api-key");

  toggleBtn.addEventListener("click", () => {
    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
    } else {
      apiKeyInput.type = "password";
      toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    }
  });

  // Toggle multi API keys visibility
  const toggleMultiKeyBtn = document.getElementById("toggle-multi-key-vis");
  toggleMultiKeyBtn.addEventListener("click", () => {
    if (multiKeyTextarea.style.webkitTextSecurity === "none") {
      multiKeyTextarea.style.webkitTextSecurity = "disc";
      toggleMultiKeyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    } else {
      multiKeyTextarea.style.webkitTextSecurity = "none";
      toggleMultiKeyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
    }
  });
}

function setupBackupActions() {
  const exportBtn = document.getElementById("settings-backup-export");
  const importBtn = document.getElementById("settings-backup-import");
  const fileInput = document.getElementById("settings-backup-file");
  const statusBox = document.getElementById("settings-status");
  if (!exportBtn || !importBtn || !fileInput) return;
  const showStatus = (msg, ok) => {
    if (!statusBox) return;
    statusBox.textContent = msg;
    statusBox.className = "settings-status-box " + (ok ? "status-success" : "status-info");
    statusBox.hidden = false;
    setTimeout(() => { statusBox.hidden = true; }, 3000);
  };
  exportBtn.addEventListener("click", () => {
    chrome.storage.local.get(null, (data) => {
      const payload = { app: "gemini-smart-toolkit", version: 1, exportedAt: new Date().toISOString(), data: data || {} };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const stamp = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      a.href = url;
      a.download = "gemini-toolkit-yedek-" + stamp + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      showStatus("Yedek dosyası indirildi.", true);
    });
  });
  importBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const f = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const data = parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data) ? parsed.data : parsed)
          : null;
        if (!data || Object.keys(data).length === 0) throw new Error("empty");
        chrome.storage.local.set(data, () => {
          showStatus("Yedek yüklendi, yenileniyor...", true);
          setTimeout(() => location.reload(), 600);
        });
      } catch (e) {
        showStatus("Geçersiz yedek dosyası.", false);
      }
    };
    reader.readAsText(f);
  });
}

function setupSettingsActions() {
  const saveBtn = document.getElementById("settings-save");
  const resetBtn = document.getElementById("settings-reset");
  const statusBox = document.getElementById("settings-status");

  saveBtn.addEventListener("click", async () => {
    // Anında geri bildirim: kayıt bitmeden çubuğu hemen gizle
    try { lastSavedSnapshot = captureSnapshot(); } catch (e) {}
    const floatingBarEarly = document.getElementById("settings-floating-bar");
    if (floatingBarEarly) floatingBarEarly.hidden = true;

    const key = document.getElementById("settings-api-key").value.trim();
    const useMultiKeys = document.getElementById("settings-use-multi-keys").checked;
    const geminiApiKeys = document.getElementById("settings-multi-api-keys").value;
    const model = document.getElementById("settings-model-name").value.trim();
    const theme = normalizeTheme(document.getElementById("settings-theme").value);
    const thinkingLevel = document.getElementById("settings-thinking-level").value;
    const selectionTranslationEnabled = document.getElementById("settings-selection-translate").checked;
    const selectionSearchEnabled = document.getElementById("settings-selection-search").checked;
    const visualMenuEnabled = document.getElementById("settings-visual-menu").checked;
    const searchMode = document.getElementById("settings-search-mode").value;
    const selectionTranslateMode = document.getElementById("settings-select-translate-mode").value;
    const inlineTargetLang = document.getElementById("settings-inline-target-lang").value;
    const xTranslationEnabled = document.getElementById("settings-x-translate").checked;
    const xAutoTranslateEnabled = document.getElementById("settings-x-auto-translate").checked;
    const xCacheEnabled = document.getElementById("settings-x-cache").checked;
    const xTargetLang = document.getElementById("settings-x-target-lang").value;
    const piDisablerEnabled = document.getElementById("settings-pi-disabler").checked;
    const geminiSpeedupEnabled = document.getElementById("settings-gemini-speedup").checked;
    const geminiHideNotebooksEnabled = document.getElementById("settings-gemini-hide-notebooks").checked;
    const geminiHideUpgradeEnabled = document.getElementById("settings-gemini-hide-upgrade").checked;

    if (!model) {
      alert("Lütfen model alanını boş bırakmayınız.");
      return;
    }

    if (useMultiKeys) {
      const keysList = geminiApiKeys.split("\n").map(k => k.trim()).filter(k => k !== "");
      if (keysList.length === 0) {
        alert("Lütfen en az bir adet API anahtarı giriniz.");
        return;
      }
    } else {
      if (!key) {
        alert("Lütfen API anahtarı alanını boş bırakmayınız.");
        return;
      }
    }

    await saveSettings({
      apiKey: key,
      modelName: model,
      popupTheme: theme,
      selectionTranslationEnabled,
      selectionSearchEnabled,
      visualMenuEnabled,
      searchMode,
      selectionTranslateMode,
      inlineTargetLang,
      xTranslationEnabled,
      xAutoTranslateEnabled,
      xCacheEnabled,
      xTargetLang,
      piDisablerEnabled,
      thinkingLevel,
      geminiSpeedupEnabled,
      geminiHideNotebooksEnabled,
      geminiHideUpgradeEnabled,
      useMultiKeys,
      geminiApiKeys
    });

    applyTheme(theme);

    // Show success badge
    statusBox.textContent = "Ayarlar başarıyla kaydedildi.";
    statusBox.className = "settings-status-box status-success";
    statusBox.hidden = false;

    setTimeout(() => {
      statusBox.hidden = true;
    }, 2500);
  });

  resetBtn.addEventListener("click", async () => {
    document.getElementById("settings-api-key").value = DEFAULT_API_KEY;
    document.getElementById("settings-use-multi-keys").checked = false;
    document.getElementById("settings-multi-api-keys").value = "";
    document.getElementById("settings-model-name").value = DEFAULT_MODEL;
    updateCustomSelectUI("settings-model-name");
    document.getElementById("settings-theme").value = "light";
    updateCustomSelectUI("settings-theme");
    applyTheme("light");
    
    const thinkingLevelInput = document.getElementById("settings-thinking-level");
    if (thinkingLevelInput) {
      thinkingLevelInput.value = "MINIMAL";
      updateCustomSelectUI("settings-thinking-level");
    }

    document.getElementById("settings-selection-translate").checked = true;
    document.getElementById("settings-selection-search").checked = true;
    document.getElementById("settings-visual-menu").checked = false;
    document.getElementById("settings-search-mode").value = "tab";
    updateCustomSelectUI("settings-search-mode");
    document.getElementById("settings-select-translate-mode").value = "bubble";
    updateCustomSelectUI("settings-select-translate-mode");
    document.getElementById("inline-target-lang-group").hidden = true;
    const inlineLangInput = document.getElementById("settings-inline-target-lang");
    if (inlineLangInput) {
      inlineLangInput.value = "tr";
      updateCustomSelectUI("settings-inline-target-lang");
    }
    document.getElementById("settings-x-translate").checked = true;
    document.getElementById("settings-x-auto-translate").checked = false;
    document.getElementById("settings-x-cache").checked = true;
    const xTargetLangInput = document.getElementById("settings-x-target-lang");
    if (xTargetLangInput) {
      xTargetLangInput.value = "tr";
      updateCustomSelectUI("settings-x-target-lang");
    }
    document.getElementById("settings-pi-disabler").checked = true;
    document.getElementById("settings-gemini-speedup").checked = true;
    document.getElementById("settings-gemini-hide-notebooks").checked = true;
    document.getElementById("settings-gemini-hide-upgrade").checked = true;

    // Trigger UI toggle immediately
    document.getElementById("single-key-container").hidden = false;
    document.getElementById("multi-key-container").hidden = true;
    document.getElementById("multi-keys-count-label").textContent = "0 anahtar";

    await saveSettings({
      apiKey: DEFAULT_API_KEY,
      modelName: DEFAULT_MODEL,
      popupTheme: "light",
      selectionTranslationEnabled: true,
      selectionSearchEnabled: true,
      visualMenuEnabled: false,
      searchMode: "tab",
      selectionTranslateMode: "bubble",
      inlineTargetLang: "tr",
      xTranslationEnabled: true,
      xAutoTranslateEnabled: false,
      xCacheEnabled: true,
      xTargetLang: "tr",
      piDisablerEnabled: true,
      thinkingLevel: "MINIMAL",
      geminiSpeedupEnabled: true,
      geminiHideNotebooksEnabled: true,
      geminiHideUpgradeEnabled: true,
      useMultiKeys: false,
      geminiApiKeys: ""
    });

    statusBox.textContent = "Varsayılan ayarlara dönüldü.";
    statusBox.className = "settings-status-box status-info";
    statusBox.hidden = false;

    setTimeout(() => {
      statusBox.hidden = true;
    }, 2500);
  });

  const cacheClearBtn = document.getElementById("settings-x-cache-clear");
  if (cacheClearBtn) {
    cacheClearBtn.addEventListener("click", () => {
      chrome.storage.local.remove("xTranslationPersistentCache", () => {
        statusBox.textContent = "X çeviri önbelleği temizlendi.";
        statusBox.className = "settings-status-box status-info";
        statusBox.hidden = false;

        setTimeout(() => {
          statusBox.hidden = true;
        }, 2500);
      });
    });
  }

  // Yüzen kaydet çubuğu – dirty takibi
  const floatingBar = document.getElementById("settings-floating-bar");
  const cancelBtn = document.getElementById("settings-cancel");
  let lastSavedSnapshot = null;
  function captureSnapshot() {
    try {
      return JSON.stringify({
        apiKey: document.getElementById("settings-api-key").value.trim(),
        useMultiKeys: document.getElementById("settings-use-multi-keys").checked,
        geminiApiKeys: document.getElementById("settings-multi-api-keys").value,
        modelName: document.getElementById("settings-model-name").value,
        popupTheme: document.getElementById("settings-theme").value,
        thinkingLevel: document.getElementById("settings-thinking-level").value,
        selectionTranslationEnabled: document.getElementById("settings-selection-translate").checked,
        selectionSearchEnabled: document.getElementById("settings-selection-search").checked,
        visualMenuEnabled: document.getElementById("settings-visual-menu").checked,
        searchMode: document.getElementById("settings-search-mode").value,
        selectionTranslateMode: document.getElementById("settings-select-translate-mode").value,
        inlineTargetLang: document.getElementById("settings-inline-target-lang").value,
        xTranslationEnabled: document.getElementById("settings-x-translate").checked,
        xAutoTranslateEnabled: document.getElementById("settings-x-auto-translate").checked,
        xCacheEnabled: document.getElementById("settings-x-cache").checked,
        xTargetLang: document.getElementById("settings-x-target-lang").value,
        piDisablerEnabled: document.getElementById("settings-pi-disabler").checked,
        geminiSpeedupEnabled: document.getElementById("settings-gemini-speedup").checked,
        geminiHideNotebooksEnabled: document.getElementById("settings-gemini-hide-notebooks").checked,
        geminiHideUpgradeEnabled: document.getElementById("settings-gemini-hide-upgrade").checked,
      });
    } catch (e) { return ""; }
  }
  function updateFloatingBar() {
    if (!floatingBar) return;
    const current = captureSnapshot();
    const isDirty = lastSavedSnapshot !== null && current !== lastSavedSnapshot;
    floatingBar.hidden = !isDirty;
  }
  setTimeout(() => {
    lastSavedSnapshot = captureSnapshot();
    updateFloatingBar();
  }, 350);
  const settingsPanelEl = document.getElementById("panel-settings");
  if (settingsPanelEl) {
    settingsPanelEl.addEventListener("change", updateFloatingBar);
    settingsPanelEl.addEventListener("input", updateFloatingBar);
    settingsPanelEl.addEventListener("click", () => setTimeout(updateFloatingBar, 80));
    // custom-select hidden input'ları bubbles: false ile dispatch ettiği için doğrudan dinle
    settingsPanelEl.querySelectorAll("input[type='hidden']").forEach(inp => {
      inp.addEventListener("change", updateFloatingBar);
    });
  }
  // Kaydet/Varsayılana Dön sonrası snapshot yenile
  saveBtn.addEventListener("click", () => {
    setTimeout(() => {
      lastSavedSnapshot = captureSnapshot();
      updateFloatingBar();
    }, 500);
  });
  resetBtn.addEventListener("click", () => {
    setTimeout(() => {
      lastSavedSnapshot = captureSnapshot();
      updateFloatingBar();
    }, 500);
  });
  if (cancelBtn) {
    cancelBtn.addEventListener("click", async () => {
      const settings = await getSettings();
      initSettingsUI(settings);
      applyTheme(settings.popupTheme);
      setTimeout(() => {
        lastSavedSnapshot = captureSnapshot();
        updateFloatingBar();
        statusBox.textContent = "Değişiklikler iptal edildi.";
        statusBox.className = "settings-status-box status-info";
        statusBox.hidden = false;
        setTimeout(() => statusBox.hidden = true, 2000);
      }, 100);
    });
  }
}

// CUSTOM DROPDOWNS CONTROLLER (secenek tiklamalari delegation ile;
// dil listeleri ilk acilista kurulur, her acilista yeniden kurulmaz)
function placeSelect(select) {
  const trigger = select.querySelector(".custom-select-trigger");
  const optionsContainer = select.querySelector(".custom-select-options");
  if (!trigger || !optionsContainer) return;
  const panel = select.closest(".panel");
  const limit = panel ? panel.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
  const r = trigger.getBoundingClientRect();
  const need = Math.min(optionsContainer.scrollHeight || 220, 220);
  const below = limit.bottom - r.bottom - 6;
  const above = r.top - limit.top - 6;
  select.classList.toggle("dropup", below < need && above > below);
}

function initCustomSelects() {
  const customSelects = document.querySelectorAll(".custom-select:not([data-id='yt-popup-source'])");

  customSelects.forEach(select => {
    const trigger = select.querySelector(".custom-select-trigger");
    const optionsContainer = select.querySelector(".custom-select-options");
    const hiddenInput = select.querySelector("input[type='hidden']");

    // Toggle dropdown
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();

      // Close other open custom selects
      document.querySelectorAll(".custom-select").forEach(otherSelect => {
        if (otherSelect !== select) {
          otherSelect.classList.remove("open");
        }
      });

      if (!select.classList.contains("open") && hiddenInput) {
        ensureLangOptions(hiddenInput.id);
        syncCustomSelectActive(select);
        placeSelect(select);
      }
      select.classList.toggle("open");
    });

    // Option Click (delegated: dinamik kurulan dil seceneklerini de yakalar)
    if (!optionsContainer.dataset.delegated) {
      optionsContainer.dataset.delegated = "1";
      optionsContainer.addEventListener("click", (e) => {
        const option = e.target.closest(".custom-option");
        if (!option || !optionsContainer.contains(option)) return;
        e.stopPropagation();

        const val = option.getAttribute("data-value");
        const optionHTML = option.innerHTML;

        hiddenInput.value = val;
        const triggerText = select.querySelector(".custom-select-trigger span");
        if (triggerText) {
          triggerText.innerHTML = optionHTML;
          wireFlagFallbacks(triggerText);
        }

        // Manage active option classes
        optionsContainer.querySelectorAll(".custom-option").forEach(opt => opt.classList.remove("active"));
        option.classList.add("active");

        select.classList.remove("open");

        // Dispatch event in case someone listens
        hiddenInput.dispatchEvent(new Event("change"));
      });
    }
  });

  // Click outside to close dropdowns
  document.addEventListener("click", () => {
    document.querySelectorAll(".custom-select").forEach(select => {
      select.classList.remove("open");
    });
  });
}

function updateCustomSelectUI(inputId) {
  const hiddenInput = document.getElementById(inputId);
  if (!hiddenInput) return;

  const select = hiddenInput.closest(".custom-select");
  if (!select) return;

  const value = hiddenInput.value;
  const option = select.querySelector(`.custom-option[data-value='${value}']`);

  if (option) {
    const triggerText = select.querySelector(".custom-select-trigger span");
    triggerText.innerHTML = option.innerHTML;
    wireFlagFallbacks(triggerText);

    select.querySelectorAll(".custom-option").forEach(opt => {
      if (opt === option) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });
    return;
  }

  // Dil listesi henuz kurulmadiysa etiketi katalogdan ciz (liste ilk acilista kurulur)
  if (LANG_SELECT_IDS[inputId]) {
    const triggerText = select.querySelector(".custom-select-trigger span");
    if (triggerText) {
      const lang = LANGUAGES.find(l => l.code === value) || (value === "auto" ? AUTO_LANG_OPTION : null);
      triggerText.innerHTML = "";
      triggerText.appendChild(buildFlagNode(lang ? lang.flag : null));
      const label = document.createElement("span");
      label.className = "option-label";
      label.textContent = lang ? lang.name : (value || "");
      triggerText.appendChild(label);
    }
  }
}

// PAGE TRANSLATOR INTERACTIONS
async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ? tab.id : null;
}

function setupPageTranslatorActions() {
  const translateBtn = document.getElementById("page-translate-btn");
  const restoreBtn = document.getElementById("page-restore-btn");
  const progressSection = document.getElementById("page-progress-section");
  const progressPercent = document.getElementById("page-progress-percent");
  const progressFill = document.getElementById("page-progress-fill");

  if (!translateBtn || !restoreBtn) return;

  // Query page translation status when the settings panel loads
  queryTranslationStatus();

  async function queryTranslationStatus() {
    const tabId = await getActiveTabId();
    if (!tabId) return;

    chrome.tabs.sendMessage(tabId, { action: "query-page-translation-status" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // Content script is not ready or tab is not supportable (like chrome:// URLs)
        return;
      }

      if (response.isPageTranslating) {
        // Restore progress UI state
        progressPercent.textContent = `${response.percent}%`;
        progressFill.style.width = `${response.percent}%`;
        progressSection.hidden = false;

        translateBtn.disabled = true;
        translateBtn.querySelector(".loader-spinner").hidden = false;
        restoreBtn.disabled = true;

        const langSelect = document.getElementById("page-trans-target");
        if (langSelect) {
          langSelect.value = response.targetLang;
          updateCustomSelectUI("page-trans-target");
        }
      } else if (response.hasPageBeenTranslated) {
        // Restore translation success state
        progressPercent.textContent = "Tamamlandı!";
        progressFill.style.width = "100%";
        progressSection.hidden = false;

        translateBtn.disabled = false;
        translateBtn.querySelector(".loader-spinner").hidden = true;
        restoreBtn.disabled = false;

        const langSelect = document.getElementById("page-trans-target");
        if (langSelect) {
          langSelect.value = response.targetLang;
          updateCustomSelectUI("page-trans-target");
        }
      }
    });
  }

  translateBtn.addEventListener("click", async () => {
    const tabId = await getActiveTabId();
    if (!tabId) {
      alert("Aktif sekme bulunamadı.");
      return;
    }

    const targetLang = document.getElementById("page-trans-target").value;

    // Reset progress UI
    progressPercent.textContent = "0%";
    progressFill.style.width = "0%";
    progressSection.hidden = false;

    // Show loading state
    translateBtn.disabled = true;
    translateBtn.querySelector(".loader-spinner").hidden = false;

    // Send translation start command to content.js
    chrome.tabs.sendMessage(tabId, { action: "translate-page-start", targetLang });
  });

  restoreBtn.addEventListener("click", async () => {
    const tabId = await getActiveTabId();
    if (!tabId) return;

    // Send restore command
    chrome.tabs.sendMessage(tabId, { action: "translate-page-restore" });
    restoreBtn.disabled = true;
    
    // Hide progress bar
    progressSection.hidden = true;
  });

  // Listen for progress updates from content.js
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "translation-page-progress") {
      const percent = message.percent;
      progressPercent.textContent = `${percent}%`;
      progressFill.style.width = `${percent}%`;
    } else if (message.action === "translation-page-success") {
      progressPercent.textContent = "Tamamlandı!";
      progressFill.style.width = "100%";

      // Reset button states
      translateBtn.disabled = false;
      translateBtn.querySelector(".loader-spinner").hidden = true;
      restoreBtn.disabled = false;
    } else if (message.action === "translation-page-error") {
      alert("Sayfa çevrilirken bir hata oluştu:\n" + message.error);
      
      // Reset button states
      translateBtn.disabled = false;
      translateBtn.querySelector(".loader-spinner").hidden = true;
      progressSection.hidden = true;
    }
  });
}

// ============================================================
// YOUTUBE PANEL (youtubetranslator eklentisinden eksiksiz port +
// ekstra yorum çevirisi ayarı. API anahtarları fallback ile
// genel ayarları da kullanır; altyazı önbelleği ortaktır.)
// ============================================================
let ytActiveTabId = null;
let ytCurrentFontColor = "#ffffff";
let ytCurrentBgColor = "#000000";
let ytPollTimer = null;
let ytLastSavedSnapshot = null;
let ytCacheShowAll = false;

const YT_LANG_SHORT_NAMES = {
  af: "AF", sq: "SQ", am: "AM", ar: "AR", hy: "HY",
  az: "AZ", eu: "EU", be: "BE", bn: "BN", bs: "BS",
  bg: "BG", my: "MY", ca: "CA", ceb: "CEB", zh: "ZH",
  hr: "HR", cs: "CS", da: "DA", nl: "NL", en: "EN",
  eo: "EO", et: "ET", fi: "FI", fr: "FR", gl: "GL",
  ka: "KA", de: "DE", el: "EL", gu: "GU", ha: "HA",
  he: "HE", hi: "HI", hmn: "HMN", hu: "HU", is: "IS",
  ig: "IG", id: "ID", ga: "GA", it: "IT", ja: "JA",
  jw: "JW", jv: "JV", kn: "KN", kk: "KK", km: "KM", ko: "KO",
  lo: "LO", la: "LA", lv: "LV", lt: "LT", lb: "LB",
  mk: "MK", mg: "MG", ms: "MS", ml: "ML", mt: "MT",
  mi: "MI", mr: "MR", mn: "MN", ne: "NE", no: "NO",
  fa: "FA", pl: "PL", pt: "PT", pa: "PA", ro: "RO",
  ru: "RU", sm: "SM", sr: "SR", st: "ST", sn: "SN",
  sd: "SD", si: "SI", sk: "SK", sl: "SL", so: "SO",
  es: "ES", su: "SU", sw: "SW", sv: "SV", tl: "TL",
  tg: "TG", ta: "TA", te: "TE", th: "TH", tr: "TR",
  uk: "UK", ur: "UR", uz: "UZ", vi: "VI", cy: "CY",
  xh: "XH", yi: "YI", yo: "YO", zu: "ZU"
};

function getYTSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      "enabled", "targetLanguage", "preferredSourceLanguage",
      "geminiModel", "geminiThinkingLevel",
      "fontSize", "styleShadow", "styleBox", "styleOutline",
      "subtitleBgOpacity", "subtitleBgColor", "subtitleFontColor", "subtitleFontWeight",
      "filterExtraExplanations", "translationParts",
      "autoTranslate", "autoSaveTranslation", "ytCommentsEnabled"
    ], (r) => {
      resolve({
        enabled: r.enabled !== false,
        targetLanguage: r.targetLanguage || "tr",
        preferredSourceLanguage: r.preferredSourceLanguage || "auto",
        geminiModel: normalizeModelName(r.geminiModel),
        geminiThinkingLevel: r.geminiThinkingLevel || "MEDIUM",
        fontSize: r.fontSize || 24,
        styleShadow: r.styleShadow !== false,
        styleBox: r.styleBox === true,
        styleOutline: r.styleOutline === true,
        subtitleBgOpacity: r.subtitleBgOpacity !== undefined ? r.subtitleBgOpacity : 75,
        subtitleBgColor: r.subtitleBgColor || "#000000",
        subtitleFontColor: r.subtitleFontColor || "#ffffff",
        subtitleFontWeight: r.subtitleFontWeight || "700",
        filterExtraExplanations: r.filterExtraExplanations !== false,
        translationParts: Math.min(6, Math.max(1, Number(r.translationParts) || 3)),
        autoTranslate: r.autoTranslate !== false,
        autoSaveTranslation: r.autoSaveTranslation !== false,
        ytCommentsEnabled: r.ytCommentsEnabled !== false
      });
    });
  });
}

function ytHexToRgba(hex, opacity) {
  hex = String(hex || "#000000").replace("#", "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

function ytEscapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function ytFormatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function ytFormatDate(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${mins}`;
}

function ytUpdatePreview() {
  const sizeEl = document.getElementById("yt-font-size");
  const weightEl = document.getElementById("yt-font-weight");
  const opacityEl = document.getElementById("yt-bg-opacity");
  const preview = document.getElementById("yt-preview-subtitle");
  if (!sizeEl || !preview) return;

  const size = sizeEl.value;
  const weight = weightEl ? weightEl.value : "700";
  const opacity = opacityEl ? opacityEl.value : 75;
  const shadowOn = document.getElementById("yt-style-shadow")?.checked !== false;
  const boxOn = document.getElementById("yt-style-box")?.checked === true;
  const outlineOn = document.getElementById("yt-style-outline")?.checked === true;

  preview.className = "yt-preview-subtitle";
  preview.classList.toggle("yt-style-shadow", shadowOn);
  preview.classList.toggle("yt-style-box", boxOn);
  preview.classList.toggle("yt-style-outline", outlineOn);
  preview.style.fontSize = `${Math.min(parseInt(size, 10) || 24, 22)}px`;
  preview.style.fontWeight = weight;
  preview.style.color = ytCurrentFontColor;

  const sizeVal = document.getElementById("yt-font-size-val");
  if (sizeVal) sizeVal.textContent = `${size}px`;
  const opVal = document.getElementById("yt-bg-opacity-val");
  if (opVal) opVal.textContent = `${opacity}%`;

  const opacityRow = document.getElementById("yt-opacity-row");
  const bgColorRow = document.getElementById("yt-bgcolor-row");
  if (boxOn) {
    preview.style.backgroundColor = ytHexToRgba(ytCurrentBgColor, opacity);
    if (opacityRow) opacityRow.style.display = "";
    if (bgColorRow) bgColorRow.style.display = "";
  } else {
    preview.style.backgroundColor = "";
    if (opacityRow) opacityRow.style.display = "none";
    if (bgColorRow) bgColorRow.style.display = "none";
  }
}

function ytCaptureSnapshot() {
  try {
    return JSON.stringify({
      enabled: document.getElementById("yt-enabled")?.checked,
      targetLanguage: document.getElementById("yt-target-lang")?.value,
      preferredSourceLanguage: document.getElementById("yt-preferred-source")?.value,
      geminiModel: document.getElementById("yt-gemini-model")?.value,
      geminiThinkingLevel: document.getElementById("yt-thinking-level")?.value,
      fontSize: document.getElementById("yt-font-size")?.value,
      styleShadow: document.getElementById("yt-style-shadow")?.checked,
      styleBox: document.getElementById("yt-style-box")?.checked,
      styleOutline: document.getElementById("yt-style-outline")?.checked,
      subtitleBgOpacity: document.getElementById("yt-bg-opacity")?.value,
      subtitleBgColor: ytCurrentBgColor,
      subtitleFontColor: ytCurrentFontColor,
      subtitleFontWeight: document.getElementById("yt-font-weight")?.value,
      filterExtraExplanations: document.getElementById("yt-filter-extra")?.checked,
      translationParts: document.getElementById("yt-trans-parts")?.value,
      autoTranslate: document.getElementById("yt-auto-translate")?.checked,
      autoSaveTranslation: document.getElementById("yt-auto-save")?.checked,
      ytCommentsEnabled: document.getElementById("yt-comments-enabled")?.checked
    });
  } catch (e) { return ""; }
}

function ytUpdateFloatingBar() {
  const bar = document.getElementById("yt-floating-bar");
  if (!bar) return;
  const current = ytCaptureSnapshot();
  bar.hidden = !(ytLastSavedSnapshot !== null && current !== ytLastSavedSnapshot);
}

function ytUpdateBadge(enabled) {
  const badge = document.getElementById("yt-status-badge");
  if (!badge) return;
  badge.textContent = enabled ? "Açık" : "Kapalı";
}

function ytApplySettingsToUI(s) {
  document.getElementById("yt-enabled").checked = s.enabled;
  ytUpdateBadge(s.enabled);
  document.getElementById("yt-target-lang").value = s.targetLanguage;
  updateCustomSelectUI("yt-target-lang");
  document.getElementById("yt-preferred-source").value = s.preferredSourceLanguage;
  updateCustomSelectUI("yt-preferred-source");

  document.getElementById("yt-gemini-model").value = s.geminiModel;
  updateCustomSelectUI("yt-gemini-model");
  document.getElementById("yt-thinking-level").value = s.geminiThinkingLevel;
  updateCustomSelectUI("yt-thinking-level");
  document.getElementById("yt-trans-parts").value = String(s.translationParts);
  updateCustomSelectUI("yt-trans-parts");

  document.getElementById("yt-filter-extra").checked = s.filterExtraExplanations;
  document.getElementById("yt-auto-translate").checked = s.autoTranslate;
  document.getElementById("yt-auto-save").checked = s.autoSaveTranslation;
  document.getElementById("yt-comments-enabled").checked = s.ytCommentsEnabled;

  document.getElementById("yt-font-size").value = s.fontSize;
  document.getElementById("yt-style-shadow").checked = s.styleShadow;
  document.getElementById("yt-style-box").checked = s.styleBox;
  document.getElementById("yt-style-outline").checked = s.styleOutline;
  document.getElementById("yt-bg-opacity").value = s.subtitleBgOpacity;
  document.getElementById("yt-font-weight").value = s.subtitleFontWeight;
  updateCustomSelectUI("yt-font-weight");

  ytCurrentBgColor = s.subtitleBgColor;
  ytCurrentFontColor = s.subtitleFontColor;
  document.querySelectorAll("#yt-bgcolor-presets .yt-color-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.color === ytCurrentBgColor);
  });
  document.querySelectorAll("#yt-fontcolor-presets .yt-color-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.color === ytCurrentFontColor);
  });
  ytUpdatePreview();
}

function ytRenderSourceTracks(tracks, activeIdx) {
  const optionsEl = document.getElementById("yt-popup-source-options");
  const hiddenEl = document.getElementById("yt-popup-source");
  const triggerSpan = document.querySelector(".custom-select[data-id='yt-popup-source'] .custom-select-trigger span");
  if (!optionsEl || !hiddenEl) return;

  if (!tracks || tracks.length === 0) {
    optionsEl.innerHTML = "";
    const opt = document.createElement("div");
    opt.className = "custom-option active";
    opt.setAttribute("data-value", "");
    opt.textContent = "Altyazı yok / Aranıyor...";
    optionsEl.appendChild(opt);
    hiddenEl.value = "";
    if (triggerSpan) triggerSpan.textContent = "Altyazı yok / Aranıyor...";
    return;
  }

  const sig = tracks.map(t => `${t.index}:${t.label}`).join("|");
  if (optionsEl.dataset.signature !== sig) {
    optionsEl.dataset.signature = sig;
    optionsEl.innerHTML = "";
    tracks.forEach(t => {
      const opt = document.createElement("div");
      opt.className = "custom-option";
      opt.setAttribute("data-value", String(t.index));
      opt.textContent = t.label;
      optionsEl.appendChild(opt);
    });
  }
  const val = String(activeIdx >= 0 ? activeIdx : 0);
  hiddenEl.value = val;
  optionsEl.querySelectorAll(".custom-option").forEach(o => {
    o.classList.toggle("active", o.getAttribute("data-value") === val);
  });
  const active = optionsEl.querySelector(`.custom-option[data-value='${val}']`);
  if (triggerSpan) triggerSpan.textContent = active ? active.textContent : tracks[0].label;
}

function ytShowNoVideo() {
  document.getElementById("yt-no-video")?.removeAttribute("hidden");
  const vc = document.getElementById("yt-video-controls");
  if (vc) vc.hidden = true;
}

function ytShowVideoControls(state) {
  const noVideo = document.getElementById("yt-no-video");
  const vc = document.getElementById("yt-video-controls");
  if (noVideo) noVideo.hidden = true;
  if (vc) vc.hidden = false;

  document.getElementById("yt-popup-status").textContent = state.statusText || "Hazırlanıyor...";
  ytRenderSourceTracks(state.availableTracks || [], state.activeTrackIndex);

  const progressBlock = document.getElementById("yt-popup-progress-block");
  if (state.isProgressShowing) {
    progressBlock.hidden = false;
    document.getElementById("yt-popup-progress-val").textContent = `${state.progressPercent}%`;
    document.getElementById("yt-popup-progress-fill").style.width = `${state.progressPercent}%`;
  } else {
    progressBlock.hidden = true;
  }

  const errBlock = document.getElementById("yt-popup-error");
  if (state.errorText) {
    errBlock.textContent = state.errorText;
    errBlock.hidden = false;
  } else {
    errBlock.hidden = true;
  }

  const manualBtn = document.getElementById("yt-manual-translate");
  const label = manualBtn?.querySelector("span");
  if (manualBtn && label) {
    if (!state.availableTracks || state.availableTracks.length === 0) {
      manualBtn.disabled = true;
      label.textContent = "Altyazı Yok";
    } else if (state.isProgressShowing) {
      manualBtn.disabled = true;
      label.textContent = "Çevriliyor...";
    } else if (state.hasTranslation && state.isCached) {
      manualBtn.disabled = false;
      label.textContent = "Yeniden Çevir (Önbellekten)";
    } else if (state.hasTranslation) {
      manualBtn.disabled = false;
      label.textContent = "Yeniden Çevir";
    } else {
      manualBtn.disabled = false;
      label.textContent = "Çeviriyi Başlat";
    }
  }
}

function ytSyncActiveVideoState() {
  if (!chrome.tabs || !chrome.tabs.query) return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (tab && tab.url && tab.url.includes("youtube.com/watch")) {
      ytActiveTabId = tab.id;
      chrome.tabs.sendMessage(tab.id, { type: "GET_TRANSLATION_STATE" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          ytShowNoVideo();
          return;
        }
        ytShowVideoControls(response);
      });
    } else {
      ytActiveTabId = null;
      ytShowNoVideo();
    }
  });
}

function ytLoadCacheStats() {
  ytCacheShowAll = false;
  chrome.storage.local.get(["cacheIndex"], (result) => {
    const index = result.cacheIndex || {};
    const entries = Object.entries(index);
    const count = entries.length;
    const totalBytes = entries.reduce((sum, [, v]) => sum + (v.sizeBytes || 0), 0);
    const statsEl = document.getElementById("yt-cache-stats");
    if (statsEl) {
      statsEl.textContent = count === 0 ? "Önbellek boş" : `${count} çeviri · ${ytFormatBytes(totalBytes)}`;
    }
    const clearBtn = document.getElementById("yt-cache-clear-all");
    if (clearBtn) clearBtn.disabled = count === 0;
    ytRenderCacheList(index);
  });
}

function ytRenderCacheList(index) {
  const listEl = document.getElementById("yt-cache-list");
  const emptyEl = document.getElementById("yt-cache-empty");
  if (!listEl || !emptyEl) return;
  const entries = Object.entries(index);

  // Eski boş mesaj dışındaki öğeleri temizle
  listEl.querySelectorAll(".yt-cache-item").forEach(el => el.remove());

  if (entries.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";
  entries.sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0));

  // Cok sayida kayitta liste ilk acilista takilmasin: ilk 50, gerisi tikla-goster
  const shown = ytCacheShowAll ? entries : entries.slice(0, 50);

  shown.forEach(([key, entry]) => {
    const title = entry.videoTitle || entry.videoId || "Bilinmeyen Video";
    const langLabel = `${(entry.sourceTrackLang || "?").toUpperCase()} → ${(YT_LANG_SHORT_NAMES[entry.targetLang] || entry.targetLang || "?").toUpperCase()}`;
    const size = ytFormatBytes(entry.sizeBytes || 0);
    const date = ytFormatDate(entry.savedAt);
    const lineCount = entry.subtitleCount || "?";

    const item = document.createElement("div");
    item.className = "yt-cache-item";
    const info = document.createElement("div");
    info.className = "yt-cache-item-info";
    const titleEl = document.createElement("div");
    titleEl.className = "yt-cache-item-title";
    titleEl.title = title;
    titleEl.textContent = title;
    const meta = document.createElement("div");
    meta.className = "yt-cache-item-meta";
    meta.textContent = `${langLabel} · ${lineCount} satır · ${size} · ${date}`;
    info.appendChild(titleEl);
    info.appendChild(meta);

    const del = document.createElement("button");
    del.className = "yt-cache-item-delete";
    del.title = "Bu çeviriyi sil";
    del.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.storage.local.get(["cacheIndex"], (res) => {
        const idx = res.cacheIndex || {};
        delete idx[key];
        chrome.storage.local.remove([key], () => {
          chrome.storage.local.set({ cacheIndex: idx }, () => ytLoadCacheStats());
        });
      });
    });

    item.appendChild(info);
    item.appendChild(del);
    listEl.appendChild(item);
  });

  if (!ytCacheShowAll && entries.length > shown.length) {
    const more = document.createElement("button");
    more.className = "btn btn-secondary btn-small";
    more.style.marginTop = "6px";
    more.textContent = `Tümünü Göster (${entries.length - shown.length} tane daha)`;
    more.addEventListener("click", () => {
      ytCacheShowAll = true;
      chrome.storage.local.get(["cacheIndex"], (res) => ytRenderCacheList(res.cacheIndex || {}));
    });
    listEl.appendChild(more);
  }
}

function setupYouTubePanel() {
  const panel = document.getElementById("panel-youtube");
  if (!panel) return;

  // --- Kaynak altyazı select: dinamik seçenekler için temsilci (delegation) ---
  const ytSourceSelect = panel.querySelector(".custom-select[data-id='yt-popup-source']");
  const ytSourceTrigger = ytSourceSelect?.querySelector(".custom-select-trigger");
  const ytSourceOptions = document.getElementById("yt-popup-source-options");
  const ytSourceHidden = document.getElementById("yt-popup-source");
  if (ytSourceSelect && ytSourceTrigger && ytSourceOptions && ytSourceHidden) {
    ytSourceTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".custom-select").forEach(s => {
        if (s !== ytSourceSelect) s.classList.remove("open");
      });
      if (!ytSourceSelect.classList.contains("open")) placeSelect(ytSourceSelect);
      ytSourceSelect.classList.toggle("open");
    });
    ytSourceOptions.addEventListener("click", (e) => {
      const opt = e.target.closest(".custom-option");
      if (!opt) return;
      e.stopPropagation();
      const val = opt.getAttribute("data-value");
      ytSourceHidden.value = val;
      const span = ytSourceTrigger.querySelector("span");
      if (span) span.textContent = opt.textContent;
      ytSourceOptions.querySelectorAll(".custom-option").forEach(o => o.classList.remove("active"));
      opt.classList.add("active");
      ytSourceSelect.classList.remove("open");
      ytSourceHidden.dispatchEvent(new Event("change"));
    });
    ytSourceHidden.addEventListener("change", () => {
      if (ytActiveTabId !== null && ytSourceHidden.value !== "") {
        chrome.tabs.sendMessage(ytActiveTabId, { type: "SET_SOURCE_TRACK", index: ytSourceHidden.value });
      }
    });
  }

  // --- İlk değerleri doldur ---
  getYTSettings().then((s) => {
    ytApplySettingsToUI(s);
    ytLastSavedSnapshot = ytCaptureSnapshot();
    ytUpdateFloatingBar();
    ytLoadCacheStats();
    ytSyncActiveVideoState();
    if (!ytPollTimer) ytPollTimer = setInterval(() => {
    if (document.getElementById("panel-youtube")?.classList.contains("active")) ytSyncActiveVideoState();
  }, 2000);
  });

  // --- Anlık önizleme (kaydetmeden) ---
  ["yt-font-size", "yt-bg-opacity"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      ytUpdatePreview();
      ytUpdateFloatingBar();
    });
  });
  ["yt-style-shadow", "yt-style-box", "yt-style-outline"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      ytUpdatePreview();
      ytUpdateFloatingBar();
    });
  });
  document.getElementById("yt-font-weight")?.addEventListener("change", () => {
    ytUpdatePreview();
    ytUpdateFloatingBar();
  });
  document.querySelectorAll("#yt-fontcolor-presets .yt-color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      ytCurrentFontColor = btn.dataset.color;
      document.querySelectorAll("#yt-fontcolor-presets .yt-color-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      ytUpdatePreview();
      ytUpdateFloatingBar();
    });
  });
  document.querySelectorAll("#yt-bgcolor-presets .yt-color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      ytCurrentBgColor = btn.dataset.color;
      document.querySelectorAll("#yt-bgcolor-presets .yt-color-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      ytUpdatePreview();
      ytUpdateFloatingBar();
    });
  });

  // --- Dirty takibi (tüm panel) ---
  panel.addEventListener("input", () => setTimeout(ytUpdateFloatingBar, 30));
  panel.addEventListener("change", () => setTimeout(ytUpdateFloatingBar, 30));
  panel.addEventListener("click", () => setTimeout(ytUpdateFloatingBar, 80));
  panel.querySelectorAll("input[type='hidden']").forEach(inp => {
    inp.addEventListener("change", ytUpdateFloatingBar);
  });

  // --- Kaydet / İptal ---
  document.getElementById("yt-save")?.addEventListener("click", async () => {
    // Anında geri bildirim: kayıt bitmeden çubuğu hemen gizle
    try { ytLastSavedSnapshot = ytCaptureSnapshot(); } catch (e) {}
    const ytBarEarly = document.getElementById("yt-floating-bar");
    if (ytBarEarly) ytBarEarly.hidden = true;

    const parts = parseInt(document.getElementById("yt-trans-parts")?.value, 10) || 3;
    const payload = {
      enabled: document.getElementById("yt-enabled").checked,
      targetLanguage: document.getElementById("yt-target-lang").value || "tr",
      preferredSourceLanguage: document.getElementById("yt-preferred-source").value || "auto",
      geminiModel: normalizeModelName(document.getElementById("yt-gemini-model").value),
      geminiThinkingLevel: document.getElementById("yt-thinking-level").value || "MEDIUM",
      fontSize: parseInt(document.getElementById("yt-font-size").value, 10) || 24,
      styleShadow: document.getElementById("yt-style-shadow").checked,
      styleBox: document.getElementById("yt-style-box").checked,
      styleOutline: document.getElementById("yt-style-outline").checked,
      subtitleBgOpacity: parseInt(document.getElementById("yt-bg-opacity").value, 10) || 0,
      subtitleBgColor: ytCurrentBgColor,
      subtitleFontColor: ytCurrentFontColor,
      subtitleFontWeight: document.getElementById("yt-font-weight").value || "700",
      filterExtraExplanations: document.getElementById("yt-filter-extra").checked,
      translationParts: Math.min(6, Math.max(1, parts)),
      autoTranslate: document.getElementById("yt-auto-translate").checked,
      autoSaveTranslation: document.getElementById("yt-auto-save").checked,
      ytCommentsEnabled: document.getElementById("yt-comments-enabled").checked
    };
    await saveSettings(payload);
    ytUpdateBadge(payload.enabled);
    ytLastSavedSnapshot = ytCaptureSnapshot();
    ytUpdateFloatingBar();
    const statusBox = document.getElementById("yt-settings-status");
    if (statusBox) {
      statusBox.textContent = "YouTube ayarları kaydedildi.";
      statusBox.className = "settings-status-box status-success";
      statusBox.hidden = false;
      setTimeout(() => { statusBox.hidden = true; }, 2500);
    }
  });

  document.getElementById("yt-cancel")?.addEventListener("click", async () => {
    const s = await getYTSettings();
    ytApplySettingsToUI(s);
    setTimeout(() => {
      ytLastSavedSnapshot = ytCaptureSnapshot();
      ytUpdateFloatingBar();
      const statusBox = document.getElementById("yt-settings-status");
      if (statusBox) {
        statusBox.textContent = "Değişiklikler iptal edildi.";
        statusBox.className = "settings-status-box status-info";
        statusBox.hidden = false;
        setTimeout(() => { statusBox.hidden = true; }, 2000);
      }
    }, 100);
  });

  // --- Aktif video: manuel çeviri ---
  document.getElementById("yt-manual-translate")?.addEventListener("click", () => {
    if (ytActiveTabId !== null) {
      chrome.tabs.sendMessage(ytActiveTabId, { type: "START_TRANSLATION" });
    }
  });

  // --- Önbellek: tümünü temizle + onay ---
  document.getElementById("yt-cache-clear-all")?.addEventListener("click", () => {
    document.getElementById("yt-cache-confirm").hidden = false;
  });
  document.getElementById("yt-cache-confirm-cancel")?.addEventListener("click", () => {
    document.getElementById("yt-cache-confirm").hidden = true;
  });
  document.getElementById("yt-cache-confirm-ok")?.addEventListener("click", () => {
    document.getElementById("yt-cache-confirm").hidden = true;
    chrome.storage.local.get(["cacheIndex"], (result) => {
      const index = result.cacheIndex || {};
      const keysToRemove = Object.keys(index);
      keysToRemove.push("cacheIndex");
      chrome.storage.local.remove(keysToRemove, () => ytLoadCacheStats());
    });
  });

  // Depolama dışarıdan değişirse rozet + önbellek istatistiğini tazele
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled && document.getElementById("yt-enabled")) {
      const v = changes.enabled.newValue !== false;
      if (document.getElementById("yt-enabled").checked !== v) {
        document.getElementById("yt-enabled").checked = v;
        ytUpdateBadge(v);
      }
    }
    if (changes.cacheIndex) ytLoadCacheStats();
  });
}

// ============================================================
// AUTHENTICATOR (TOTP, RFC 6238 - tamamen yerel, sunucusuz)
// ============================================================
function totpBase32Decode(s) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  s = s.trim().replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  let bits = 0, val = 0;
  const out = [];
  for (const ch of s) {
    const i = A.indexOf(ch);
    if (i < 0) throw new Error("Gecersiz gizli anahtar.");
    val = (val << 5) | i;
    bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

async function totpCode(secret, nowMs) {
  const key = await crypto.subtle.importKey("raw", totpBase32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const c = Math.floor(nowMs / 30000);
  const msg = new Uint8Array(8);
  let t = c;
  for (let i = 7; i >= 0; i--) { msg[i] = t & 255; t = Math.floor(t / 256); }
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, "0");
}

function totpParseOtpauth(uri) {
  const u = new URL(uri.trim());
  if (u.protocol !== "otpauth:" || u.hostname.indexOf("totp") !== 0) throw new Error("Desteklenmeyen URI.");
  const secret = u.searchParams.get("secret");
  if (!secret) throw new Error("URI icinde secret yok.");
  const issuer = u.searchParams.get("issuer") || "";
  let label = decodeURIComponent(u.pathname.replace(/^\//, ""));
  // Etiket genelde "site:hesap" formatindadir; tekrari bastan temizle.
  if (issuer && label.toLowerCase().indexOf(issuer.toLowerCase() + ":") === 0) {
    label = label.slice(issuer.length + 1);
  }
  label = label.trim() || "Hesap";
  totpBase32Decode(secret);
  return { id: "totp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), label, issuer, secret: secret.replace(/[\s-]/g, "") };
}

// Kayitlihesaplarda da tekrar olusmus olabilir; gosterimde her kosulda tekle.
function totpDisplayName(a) {
  const issuer = (a.issuer || "").trim();
  let label = (a.label || "").trim();
  if (issuer && label.toLowerCase().indexOf(issuer.toLowerCase() + ":") === 0) {
    label = label.slice(issuer.length + 1).trim();
  }
  if (!label) return issuer || "Hesap";
  return issuer ? issuer + " - " + label : label;
}

function setupAuthenticator() {
  const listEl = document.getElementById("totp-list");
  const timerEl = document.getElementById("totp-timer");
  const labelEl = document.getElementById("totp-label");
  const secretEl = document.getElementById("totp-secret");
  if (!listEl) return;
  let accounts = [];
  let lastStep = -1;

  const save = () => chrome.storage.local.set({ totpAccounts: accounts });
  const load = () => chrome.storage.local.get(["totpAccounts"], (res) => {
    accounts = Array.isArray(res.totpAccounts) ? res.totpAccounts : [];
    render(true);
  });

  function render(force) {
    if (!accounts.length) {
      listEl.innerHTML = '<div class="yt-cache-empty">Henuz hesap yok.</div>';
      return;
    }
    if (listEl.querySelector(".yt-cache-empty") || force || listEl.children.length !== accounts.length) {
      listEl.innerHTML = "";
      accounts.forEach((a) => {
        const row = document.createElement("div");
        row.className = "yt-cache-item";
        row.dataset.id = a.id;
        row.innerHTML = '<div class="yt-cache-item-info"><span class="yt-cache-item-title"></span><span class="totp-code" title="Kopyala">......</span></div><button class="yt-cache-item-delete" title="Sil"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>';
        row.querySelector(".yt-cache-item-title").textContent = totpDisplayName(a);
        // Satirin tamamına tiklaninca kodu kopyala (sil düğmesi hariç)
        row.addEventListener("click", (e) => {
          if (e.target.closest(".yt-cache-item-delete")) return;
          const codeEl = row.querySelector(".totp-code");
          const code = codeEl.dataset.code;
          if (!code || code.indexOf(".") !== -1) return;
          copyToClipboard(code).then(() => {
            codeEl.dataset.orig = codeEl.textContent;
            codeEl.textContent = "Kopyalandi!";
            setTimeout(() => { codeEl.textContent = codeEl.dataset.orig || code; }, 1200);
          });
        });
        row.querySelector(".yt-cache-item-delete").addEventListener("click", (e) => {
          e.stopPropagation();
          if (!confirm("Bu hesap silinsin mi?")) return;
          accounts = accounts.filter((x) => x.id !== a.id);
          save();
          render(true);
        });
        listEl.appendChild(row);
      });
    }
    tick();
  }

  async function tick() {
    const now = Date.now();
    const step = Math.floor(now / 30000);
    if (timerEl) timerEl.textContent = String(30 - Math.floor(now / 1000) % 30);
    if (step === lastStep) return;
    lastStep = step;
    for (const row of listEl.querySelectorAll(".yt-cache-item")) {
      const a = accounts.find((x) => x.id === row.dataset.id);
      const codeEl = row.querySelector(".totp-code");
      if (!a || !codeEl) continue;
      try {
        const code = await totpCode(a.secret, now);
        codeEl.dataset.code = code;
        if (codeEl.textContent !== "Kopyalandi!") codeEl.textContent = code.slice(0, 3) + " " + code.slice(3);
      } catch (e) {
        codeEl.textContent = "Hata";
      }
    }
  }

  document.getElementById("totp-add-btn").addEventListener("click", () => {
    const raw = secretEl.value.trim();
    if (!raw) { alert("Gizli anahtar gir."); return; }
    try {
      let acc;
      if (raw.toLowerCase().indexOf("otpauth://") === 0) {
        acc = totpParseOtpauth(raw);
      } else {
        totpBase32Decode(raw);
        acc = { id: "totp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), label: labelEl.value.trim() || "Hesap", issuer: "", secret: raw.replace(/[\s-]/g, "") };
      }
      accounts.unshift(acc);
      save();
      labelEl.value = "";
      secretEl.value = "";
      render(true);
    } catch (e) {
      alert("Eklenemedi: " + e.message);
    }
  });

  document.getElementById("totp-import-btn").addEventListener("click", () => document.getElementById("totp-file-input").click());
  document.getElementById("totp-file-input").addEventListener("change", (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const text = String(r.result || "");
        let items = [];
        try {
          const j = JSON.parse(text);
          items = Array.isArray(j) ? j : (j.accounts || []);
        } catch (err) {
          void err;
          items = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
        }
        let added = 0;
        for (const it of items) {
          try {
            if (typeof it === "string" && it.toLowerCase().indexOf("otpauth://") === 0) { accounts.unshift(totpParseOtpauth(it)); added++; }
            else if (typeof it === "string") { totpBase32Decode(it); accounts.unshift({ id: "totp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), label: "Hesap", issuer: "", secret: it.replace(/[\s-]/g, "") }); added++; }
            else if (it && it.secret) { totpBase32Decode(it.secret); accounts.unshift({ id: "totp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), label: String(it.label || it.name || "Hesap"), issuer: String(it.issuer || ""), secret: String(it.secret).replace(/[\s-]/g, "") }); added++; }
          } catch (err) { void err; }
        }
        if (!added) { alert("Dosyada gecerli hesap bulunamadi."); return; }
        save();
        render(true);
        alert(added + " hesap ice aktarildi.");
      } catch (err) {
        alert("Dosya okunamadi: " + err.message);
      }
    };
    r.readAsText(f);
  });

  document.getElementById("totp-export-btn").addEventListener("click", () => {
    if (!accounts.length) { alert("Yedeklenecek hesap yok."); return; }
    const blob = new Blob([JSON.stringify(accounts.map((a) => ({ label: a.label, issuer: a.issuer, secret: a.secret })), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const stamp = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    a.href = url;
    a.download = "authenticator-backup-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  load();
  setInterval(tick, 1000);
}

// ============================================================
// MUZIK BUL (sekme sesi -> Shazam, anahtarsiz)
// Bulana kadar dinler (6 sn'de bir son 12 sn'yi sorgular), 60 sn'de birakir.
// ============================================================
function openMusicCapture() {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.capture({ audio: true, video: false }, async (stream) => {
      if (!stream) {
        reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : "Sekme sesi alınamadı. (chrome:// sayfalarında çalışmaz)"));
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      try { await ctx.resume(); } catch (e) { void e; }
      // AudioWorklet: ana threadden bagimsiz, parca dusurmez.
      try {
        await ctx.audioWorklet.addModule(chrome.runtime.getURL("music-worklet.js"));
      } catch (e) {
        try { stream.getTracks().forEach((t) => t.stop()); } catch (err) { void err; }
        try { ctx.close(); } catch (err) { void err; }
        reject(new Error("Ses motoru başlatılamadı: " + e.message));
        return;
      }
      const src = ctx.createMediaStreamSource(stream);
      // Dinleme <audio> elemanıyla geri çalınır: tabCapture yakalayınca
      // sekmenin kendi çıkışı kesilir, sesi uzantının geri vermesi gerekir.
      // WebAudio hattı (src->destination) işlemeden geçirip kaliteyi düşürür,
      // o yüzden duyulan yol element olur; analiz dalı (src->node) sessizdir.
      const node = new AudioWorkletNode(ctx, "music-capture", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2 });
      const zero = ctx.createGain();
      zero.gain.value = 0;
      node.connect(zero);
      zero.connect(ctx.destination);
      src.connect(node);
      const audio = new Audio();
      audio.srcObject = stream;
      audio.volume = 1;
      try { await audio.play(); }
      catch (e) { try { src.connect(ctx.destination); } catch (err) { void err; } }
      const cleanup = () => {
        try { audio.pause(); } catch (e) { void e; }
        try { audio.srcObject = null; } catch (e) { void e; }
        try { src.disconnect(); } catch (e) { void e; }
        try { node.disconnect(); } catch (e) { void e; }
        try { zero.disconnect(); } catch (e) { void e; }
        try { stream.getTracks().forEach((t) => t.stop()); } catch (e) { void e; }
        try { ctx.close(); } catch (e) { void e; }
      };
      resolve({ ctx, node, cleanup });
    });
  });
}

function drainWorklet(node) {
  return new Promise((resolve) => {
    node.port.onmessage = (e) => resolve(e.data);
    node.port.postMessage("get");
  });
}

// Ham mono (ctx ornekleme hizinda) -> 16kHz int16 + istatistik
function resampleTo16k(mono, rate) {
  const got = mono.length;
  const step = Math.max(1, Math.floor(got / 4000));
  let sum = 0, cnt = 0, peak = 0;
  for (let i = 0; i < got; i += step) { sum += mono[i] * mono[i]; cnt++; const a = Math.abs(mono[i]); if (a > peak) peak = a; }
  const rms = Math.sqrt(sum / Math.max(1, cnt));
  const outLen = Math.floor((got / rate) * 16000);
  const i16 = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = (i * rate) / 16000;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, got - 1);
    const f = pos - i0;
    const s = Math.max(-1, Math.min(1, mono[i0] * (1 - f) + mono[i1] * f));
    i16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return { i16, rms: Math.round(rms * 1000) / 1000, peak: Math.round(peak * 1000) / 1000, seconds: Math.round((got / rate) * 10) / 10 };
}

// Teshis: son muzik kaydi (hata durumunda WAV indirilir)
let lastMusicCapture = null;

function downloadLastMusicWav() {
  if (!lastMusicCapture) return;
  const i16 = lastMusicCapture.samples;
  const buf = new ArrayBuffer(44 + i16.length * 2);
  const v = new DataView(buf);
  const wstr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  wstr(0, "RIFF"); v.setUint32(4, 36 + i16.length * 2, true); wstr(8, "WAVE");
  wstr(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, 16000, true); v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); wstr(36, "data");
  v.setUint32(40, i16.length * 2, true);
  for (let i = 0; i < i16.length; i++) v.setInt16(44 + i * 2, i16[i], true);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  a.download = "muzik-bul-kayit.wav";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function setupMusicPanel() {
  const btn = document.getElementById("music-find-btn");
  if (!btn) return;
  const spinner = btn.querySelector(".loader-spinner");
  const progSec = document.getElementById("music-progress-section");
  const progLabel = document.getElementById("music-progress-label");
  const progPct = document.getElementById("music-progress-percent");
  const progFill = document.getElementById("music-progress-fill");
  const card = document.getElementById("music-result-card");
  const out = document.getElementById("music-output");

  let musicListening = false;
  let musicStopReq = false;

  btn.addEventListener("click", async () => {
    // Dinlerken basilirsa durdur
    if (musicListening) {
      musicStopReq = true;
      return;
    }
    musicListening = true;
    musicStopReq = false;
    const labelSpan = btn.querySelector("span");
    const origLabel = labelSpan ? labelSpan.textContent : "";
    if (labelSpan) labelSpan.textContent = "Durdur";
    if (spinner) spinner.hidden = false;
    if (card) card.hidden = true;
    if (progSec) progSec.hidden = false;
    if (progLabel) progLabel.textContent = "Dinleniyor... (bulunca durur)";
    const setPct = (p) => {
      const v = Math.round(p * 100) + "%";
      if (progPct) progPct.textContent = v;
      if (progFill) progFill.style.width = v;
    };
    setPct(0);
    // 6 sn'de bir biriken sesin son 12 sn'sini sorgula, 60 sn'de birak
    const TIMEOUT = 60, POLL = 3, STEP = 6, WIN = 12;
    const t0 = Date.now();
    const elapsed = () => (Date.now() - t0) / 1000;
    let cap = null;
    let acc = new Float32Array(0);
    let lastAttemptAt = 0;
    let track = null;
    try {
      cap = await openMusicCapture();
      const rate = cap.ctx.sampleRate;
      while (!musicStopReq && elapsed() < TIMEOUT) {
        await new Promise((r) => setTimeout(r, POLL * 1000));
        if (musicStopReq) break;
        try {
          const chunk = await drainWorklet(cap.node);
          if (chunk && chunk.length) {
            const merged = new Float32Array(acc.length + chunk.length);
            merged.set(acc, 0);
            merged.set(chunk, acc.length);
            acc = merged.length > rate * 70 ? merged.slice(merged.length - rate * 70) : merged;
          }
        } catch (e) { void e; }
        setPct(Math.min(elapsed() / TIMEOUT, 1));
        if (progLabel) progLabel.textContent = `Dinleniyor... (${Math.floor(elapsed())} sn)`;
        if (elapsed() - lastAttemptAt >= STEP && acc.length >= rate * 3) {
          lastAttemptAt = elapsed();
          const winLen = Math.min(acc.length, rate * WIN);
          const R = resampleTo16k(acc.slice(acc.length - winLen), rate);
          lastMusicCapture = { samples: R.i16, seconds: R.seconds, rms: R.rms, peak: R.peak };
          if (R.rms < 0.005) continue; // sessiz pencereyi sorgulama
          if (progLabel) progLabel.textContent = "Tanınıyor...";
          try {
            if (typeof shazamSignatureUri !== "function") throw new Error("İmza modülü yüklenemedi.");
            const sig = shazamSignatureUri(R.i16);
            if (!sig) throw new Error("Ses imzası üretilemedi.");
            track = await new Promise((resolve, reject) => {
              chrome.runtime.sendMessage({ action: "shazam-recognize-uri", uri: sig.uri, samplems: sig.samplems }, (res) => {
                if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
                if (res && res.success) resolve(res.track);
                else reject(new Error(res && res.error ? res.error : "Bilinmeyen hata."));
              });
            });
            break;
          } catch (e) {
            if (e && /^Eşleşme bulunamadı/.test(e.message)) continue; // dinlemeye devam
            throw e;
          }
        }
      }
      if (cap) { try { cap.cleanup(); } catch (e) { void e; } cap = null; }
      if (track) {
        const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const spotifyUrl = "https://open.spotify.com/search/" + encodeURIComponent([track.title, track.artist].filter(Boolean).join(" "));
        out.innerHTML = (track.cover ? `<img src="${esc(track.cover)}" alt="" style="width:72px;height:72px;border-radius:8px;object-fit:cover;flex-shrink:0;">` : "")
          + `<div style="flex:1;min-width:0;"><div style="font-weight:700;">${esc(track.title) || "Bilinmiyor"}</div>`
          + `<div style="opacity:.75;">${esc(track.artist)}</div>`
          + (track.album ? `<div style="opacity:.6;font-size:12px;">${esc(track.album)}${track.year ? " (" + esc(track.year) + ")" : ""}</div>` : "")
          + `</div>`;
        out.style.display = "flex";
        out.style.gap = "10px";
        out.style.alignItems = "center";
        out.style.position = "relative";
        out.style.paddingBottom = "30px";
        const spBtn = document.createElement("button");
        spBtn.title = "Spotify'da Aç";
        spBtn.setAttribute("aria-label", "Spotify'da Aç");
        spBtn.style.cssText = "position:absolute;right:8px;bottom:6px;background:transparent;border:none;cursor:pointer;padding:4px;border-radius:50%;line-height:0;";
        spBtn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.36.719 1.02.42 1.56-.299.421-1.02.599-1.56.3z"/></svg>`;
        spBtn.addEventListener("click", () => { chrome.tabs.create({ url: spotifyUrl }); });
        out.appendChild(spBtn);
        card.hidden = false;
        if (progSec) progSec.hidden = true;
      } else if (musicStopReq) {
        out.style.display = "";
        out.style.position = "";
        out.style.paddingBottom = "";
        out.textContent = "Durduruldu.";
        if (card) card.hidden = false;
        if (progSec) progSec.hidden = true;
      } else {
        throw new Error("60 sn dinlendi, bulunamadı.");
      }
    } catch (e) {
      const outEl = document.getElementById("music-output");
      outEl.style.display = "";
      outEl.style.position = "";
      outEl.style.paddingBottom = "";
      displayError("music-output", e.message);
      // Teshis bilgisi + kayit indirme: sorunun kayitta mi eslesmede mi oldugunu ayirir
      if (outEl && lastMusicCapture) {
        const info = document.createElement("div");
        info.style.cssText = "margin-top:8px;font-size:11px;opacity:.7;";
        info.textContent = `Kayıt: ${lastMusicCapture.seconds} sn, seviye RMS ${lastMusicCapture.rms}, tepe ${lastMusicCapture.peak}`;
        outEl.appendChild(info);
        const dl = document.createElement("button");
        dl.className = "btn btn-secondary btn-small";
        dl.style.marginTop = "8px";
        dl.textContent = "Kaydı İndir (WAV)";
        dl.addEventListener("click", downloadLastMusicWav);
        outEl.appendChild(dl);
      }
      if (card) card.hidden = false;
      if (progSec) progSec.hidden = true;
    } finally {
      if (cap) { try { cap.cleanup(); } catch (e) { void e; } }
      musicListening = false;
      musicStopReq = false;
      if (labelSpan) labelSpan.textContent = origLabel;
      if (spinner) spinner.hidden = true;
    }
  });
}

// ============================================================
// SES MIKSERI (sekme listesi + yuzde + mute)
// Seviye degisimi background/offscreen hattiyla uygulanir.
// ============================================================
function setupSoundPanel() {
  try { chrome.storage.local.get(["soundCollapsed"], (res) => { soundCollapsed = (res && res.soundCollapsed) || {}; }); } catch (e) { void e; }
  try { chrome.storage.local.get(["soundMutedHosts"], (res) => { soundMutedHosts = (res && res.soundMutedHosts) || {}; }); } catch (e) { void e; }
}

let soundCollapsed = {};
let soundMutedHosts = {};

function soundHostOf(tab) {
  try {
    const h = new URL(tab.url || "").hostname.toLowerCase().replace(/^www\./, "");
    return h || "diğer";
  } catch (e) { return "diğer"; }
}

function soundShowError(msg) {
  const el = document.getElementById("sound-error");
  if (!el) return;
  if (!msg) { el.hidden = true; return; }
  el.textContent = msg;
  el.hidden = false;
}

function renderSoundList() {
  const listEl = document.getElementById("sound-list");
  if (!listEl) return;
  soundShowError(null);
  Promise.all([
    chrome.tabs.query({}),
    new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "mixer-get-state" }, (res) => {
        resolve(res && res.success ? res : { gains: {}, captured: [] });
      });
    }),
    new Promise((resolve) => {
      try { chrome.storage.local.get(["soundCollapsed", "soundMutedHosts"], (res) => { soundCollapsed = (res && res.soundCollapsed) || soundCollapsed || {}; soundMutedHosts = (res && res.soundMutedHosts) || soundMutedHosts || {}; resolve(); }); }
      catch (e) { resolve(); }
    })
  ]).then(([tabs, state]) => {
    const gains = state.gains || {};
    const captured = new Set(state.captured || []);
    listEl.innerHTML = "";
    if (!tabs.length) {
      listEl.innerHTML = '<div class="yt-cache-empty">Açık sekme yok.</div>';
      return;
    }
    const groups = new Map(); // host -> [{ tab, row }]
    tabs
      .slice()
      .sort((a, b) => ((b.audible ? 1 : 0) - (a.audible ? 1 : 0)) || (a.windowId - b.windowId) || (a.index - b.index))
      .forEach((tab) => {
        const row = document.createElement("div");
        row.className = "yt-cache-item";
        row.style.gap = "8px";

        const fav = document.createElement("span");
        fav.className = "sound-fav";
        if (tab.favIconUrl) {
          const img = document.createElement("img");
          img.src = tab.favIconUrl;
          img.alt = "";
          img.draggable = false;
          img.addEventListener("error", () => {
            fav.textContent = (tab.title || "?").trim().charAt(0).toUpperCase() || "?";
          }, { once: true });
          fav.appendChild(img);
        } else {
          fav.textContent = (tab.title || "?").trim().charAt(0).toUpperCase() || "?";
        }
        row.appendChild(fav);

        const info = document.createElement("div");
        info.className = "yt-cache-item-info";
        const title = document.createElement("span");
        title.className = "yt-cache-item-title sound-title";
        title.textContent = tab.title || "Sekme";
        title.title = (tab.title || "") + " — sekmeye gitmek için tıkla";
        title.addEventListener("click", () => {
          chrome.windows.update(tab.windowId, { focused: true }, () => { void chrome.runtime.lastError; });
          chrome.tabs.update(tab.id, { active: true }, () => { void chrome.runtime.lastError; });
        });
        info.appendChild(title);

        const sub = document.createElement("span");
        sub.className = "yt-cache-item-meta";
        const dot = document.createElement("span");
        dot.className = "sound-dot" + (tab.audible ? " on" : "");
        sub.appendChild(dot);
        const subText = document.createElement("span");
        subText.textContent = tab.audible ? "ses çalıyor" : (captured.has(tab.id) ? "mikserde" : "sessiz");
        sub.appendChild(subText);
        info.appendChild(sub);

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0";
        slider.max = "100";
        slider.value = String(gains[tab.id] !== undefined ? gains[tab.id] : 100);
        slider.className = "yt-range sound-slider";
        slider.title = "Ses seviyesi (%)";
        // Tarayıcı/mağaza sayfaları yakalanamaz: en baştan kilitle.
        const soundUnsupported = (tab.url && (/^(chrome|edge|about|chrome-extension|view-source|devtools|chrome-search):/i.test(tab.url)
          || /(^|\.)chromewebstore\.google\.com$/i.test(new URL(tab.url).hostname || ""))) || false;
        if (soundUnsupported) {
          slider.disabled = true;
          slider.title = "Bu sayfa türü desteklenmez";
          if (subText) subText.textContent = "desteklenmez";
        }
        info.appendChild(slider);
        row.appendChild(info);

        const pct = document.createElement("span");
        pct.className = "sound-pct";
        pct.textContent = slider.value + "%";
        row.appendChild(pct);

        const muteBtn = document.createElement("button");
        muteBtn.className = "yt-cache-item-delete";
        muteBtn.title = tab.mutedInfo && tab.mutedInfo.muted ? "Sesi aç" : "Sessize al";
        const paintMute = (muted) => {
          muteBtn.innerHTML = muted
            ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
            : '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
          muteBtn.classList.toggle("muted", !!muted);
          muteBtn.title = muted ? "Sesi aç" : "Sessize al";
        };
        paintMute(tab.mutedInfo && tab.mutedInfo.muted);
        muteBtn.addEventListener("click", () => {
          chrome.tabs.get(tab.id, (fresh) => {
            if (chrome.runtime.lastError || !fresh) return;
            const next = !(fresh.mutedInfo && fresh.mutedInfo.muted);
            chrome.tabs.update(tab.id, { muted: next }, (updated) => {
              if (chrome.runtime.lastError || !updated) return;
              paintMute(updated.mutedInfo && updated.mutedInfo.muted);
            });
          });
        });
        row.appendChild(muteBtn);

        let deb = null;
        let busy = false;
        slider.addEventListener("input", () => {
          pct.textContent = slider.value + "%";
          if (deb) clearTimeout(deb);
          deb = setTimeout(() => {
            if (busy) return;
            busy = true;
            slider.disabled = true;
            chrome.runtime.sendMessage({ action: "mixer-set-volume", tabId: tab.id, volume: Number(slider.value) }, (res) => {
              busy = false;
              slider.disabled = false;
              if (chrome.runtime.lastError || !res || !res.success) {
                slider.value = "100";
                pct.textContent = "100%";
                const code = res && res.code;
                const msg = (res && res.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message) || "bilinmiyor";
                // Chrome kurali: sekmeye gecip simgeye bir kez tiklanmamis.
                // Tarif satirda kalici dursun, kullanici okuyup uygulasin.
                if (code === "need-grant" && subText) {
                  subText.textContent = "yetki gerek: sekmeye geçip simgeye bir kez tıkla";
                }
                soundShowError("Ses ayarlanamadı: " + msg);
              } else if (subText) {
                subText.textContent = Number(slider.value) === 100
                  ? (tab.audible ? "ses çalıyor" : "sessiz")
                  : "mikserde";
              }
            });
          }, 250);
        });

        const host = soundHostOf(tab);
        if (!groups.has(host)) groups.set(host, []);
        groups.get(host).push({ tab, row });
      });
    renderSoundGroups(listEl, groups);
  }).catch(() => {
    listEl.innerHTML = '<div class="yt-cache-empty">Liste alınamadı.</div>';
  });
}

// Ayni sitenin sekmelerini grup basligi altinda toplar (tek sekme duz satir kalir).
function renderSoundGroups(listEl, groups) {
  const SPK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
  const SPKX = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
  const entries = Array.from(groups.entries()).sort((a, b) => {
    const aud = (items) => items.filter((x) => x.tab.audible).length;
    return (aud(b[1]) - aud(a[1])) || (b[1].length - a[1].length) || (a[0] < b[0] ? -1 : 1);
  });
  entries.forEach(([host, items]) => {
    if (items.length < 2) { listEl.appendChild(items[0].row); return; }
    const playing = items.filter((x) => x.tab.audible).length;
    const head = document.createElement("div");
    head.className = "yt-cache-item sound-group-head";
    const chev = document.createElement("button");
    chev.className = "sound-collapse-btn";
    head.appendChild(chev);
    const fav = document.createElement("span");
    fav.className = "sound-fav";
    const firstFav = items[0].tab.favIconUrl;
    if (firstFav) {
      const img = document.createElement("img");
      img.src = firstFav;
      img.alt = "";
      img.draggable = false;
      img.addEventListener("error", () => { fav.textContent = host.charAt(0).toUpperCase(); }, { once: true });
      fav.appendChild(img);
    } else {
      fav.textContent = host.charAt(0).toUpperCase();
    }
    head.appendChild(fav);
    const info = document.createElement("div");
    info.className = "yt-cache-item-info";
    const t = document.createElement("span");
    t.className = "yt-cache-item-title";
    t.textContent = `${host} (${items.length})`;
    info.appendChild(t);
    const m = document.createElement("span");
    m.className = "yt-cache-item-meta";
    m.textContent = playing ? `${playing} sekmede ses çalıyor` : `${items.length} sekme`;
    info.appendChild(m);
    head.appendChild(info);
    const gMute = document.createElement("button");
    gMute.className = "yt-cache-item-delete";
    const paintGroup = () => {
      const allMuted = items.every((x) => x.tab.mutedInfo && x.tab.mutedInfo.muted);
      gMute.innerHTML = allMuted ? SPKX : SPK;
      gMute.classList.toggle("muted", allMuted);
      gMute.title = allMuted ? "Grubun sesini aç" : "Grubu sustur";
    };
    paintGroup();
    gMute.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = !items.every((x) => x.tab.mutedInfo && x.tab.mutedInfo.muted);
      if (next) soundMutedHosts[host] = true; else delete soundMutedHosts[host];
      try { chrome.storage.local.set({ soundMutedHosts }); } catch (err) { void err; }
      Promise.all(items.map((x) => new Promise((res) => {
        chrome.tabs.update(x.tab.id, { muted: next }, () => res());
      }))).then(() => renderSoundList());
    });
    head.appendChild(gMute);
    const kids = document.createElement("div");
    kids.className = "sound-group-children";
    items.forEach((x) => kids.appendChild(x.row));
    const syncChev = () => {
      chev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
      chev.classList.toggle("collapsed", !!kids.hidden);
      chev.title = kids.hidden ? "Grubu göster" : "Grubu gizle";
    };
    kids.hidden = !!soundCollapsed[host];
    syncChev();
    const toggle = () => {
      kids.hidden = !kids.hidden;
      if (kids.hidden) soundCollapsed[host] = true; else delete soundCollapsed[host];
      try { chrome.storage.local.set({ soundCollapsed }); } catch (e) { void e; }
      syncChev();
    };
    chev.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
    head.addEventListener("click", toggle);
    listEl.appendChild(head);
    listEl.appendChild(kids);
  });
}
