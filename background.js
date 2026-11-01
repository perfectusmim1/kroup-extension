// NOT: API anahtarı koda gömülmez. Her kullanıcı kendi anahtarını Ayarlar'dan girer.
const DEFAULT_API_KEY = "";
const DEFAULT_MODEL = "gemini-3.8-flash";
const LEGACY_MODEL = "gemini-3.6-flash";
function normalizeModelName(m) { return m === LEGACY_MODEL ? DEFAULT_MODEL : (m || DEFAULT_MODEL); }
const DEFAULT_USE_MULTI_KEYS = false;
const DEFAULT_GEMINI_API_KEYS = "";

// Bellek ici Gemini yanit onbellegi + ucus halindeki es istek birlestirme.
// Sayfa/X yorumu gibi ayni metnin defalarca cevrilmesini API'ye gitmeden cozer.
const GEM_MEM_CACHE = new Map();
const GEM_INFLIGHT = new Map();
const GEM_MEM_MAX = 300;
const GEM_MEM_TTL = 24 * 3600 * 1000;
function gemHash(s) {
  let h = 5381;
  s = String(s || "");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return s.length + ":" + (h >>> 0).toString(36);
}
function gemCached(key, fn) {
  const now = Date.now();
  const hit = GEM_MEM_CACHE.get(key);
  if (hit && now - hit.ts < GEM_MEM_TTL) {
    GEM_MEM_CACHE.delete(key);
    GEM_MEM_CACHE.set(key, hit);
    return Promise.resolve(hit.v);
  } else if (hit) {
    GEM_MEM_CACHE.delete(key);
  }
  const flying = GEM_INFLIGHT.get(key);
  if (flying) return flying;
  const p = fn().then(v => {
    GEM_INFLIGHT.delete(key);
    GEM_MEM_CACHE.set(key, { v, ts: Date.now() });
    if (GEM_MEM_CACHE.size > GEM_MEM_MAX) GEM_MEM_CACHE.delete(GEM_MEM_CACHE.keys().next().value);
    return v;
  }, e => { GEM_INFLIGHT.delete(key); throw e; });
  GEM_INFLIGHT.set(key, p);
  return p;
}

const LANG_LABELS = {
  auto: "Otomatik Algılanan",
  tr: "Türkçe",
  en: "İngilizce",
  de: "Almanca",
  fr: "Fransızca",
  es: "İspanyolca",
  it: "İtalyanca",
  pt: "Portekizce",
  ru: "Rusça",
  ar: "Arapça",
  zh: "Çince (Basit)",
  "zh-TW": "Çince (Geleneksel)",
  ja: "Japonca",
  ko: "Korece",
  hi: "Hintçe",
  id: "Endonezce",
  nl: "Hollandaca",
  pl: "Lehçe",
  sv: "İsveççe",
  no: "Norveççe",
  da: "Danca",
  fi: "Fince",
  el: "Yunanca",
  he: "İbranice",
  hu: "Macarca",
  cs: "Çekçe",
  sk: "Slovakça",
  sl: "Slovence",
  hr: "Hırvatça",
  sr: "Sırpça",
  bs: "Boşnakça",
  mk: "Makedonca",
  sq: "Arnavutça",
  bg: "Bulgarca",
  ro: "Romence",
  uk: "Ukraynaca",
  be: "Beyaz Rusça",
  et: "Estonca",
  lv: "Letonca",
  lt: "Litvanca",
  is: "İzlandaca",
  ga: "İrlandaca",
  cy: "Galce",
  ca: "Katalanca",
  eu: "Baskça",
  gl: "Galiçyaca",
  mt: "Maltaca",
  lb: "Lüksemburgca",
  fy: "Frizce",
  co: "Korsikaca",
  fa: "Farsça",
  ur: "Urduca",
  ps: "Peştuca",
  ku: "Kürtçe",
  sd: "Sindhi Dili",
  bn: "Bengalce",
  pa: "Pencapça",
  gu: "Güceratça",
  mr: "Marathice",
  ta: "Tamilce",
  te: "Teluguca",
  kn: "Kannadaca",
  ml: "Malayalamca",
  si: "Sinhala Dili",
  ne: "Nepalce",
  as: "Asamca",
  or: "Odiyaca",
  th: "Tayca",
  vi: "Vietnamca",
  km: "Kmerce",
  lo: "Laoca",
  my: "Birmanca",
  ms: "Malayca",
  tl: "Filipince (Tagalog)",
  ceb: "Sebuano Dili",
  jv: "Cava Dili",
  su: "Sundanca",
  sw: "Svahilice",
  am: "Amharca",
  ha: "Hausaca",
  yo: "Yorubaca",
  ig: "İgboca",
  zu: "Zuluca",
  xh: "Xhosaca",
  st: "Güney Sothoca",
  sn: "Şonaca",
  ny: "Nyanjaca",
  mg: "Malgaşça",
  so: "Somalice",
  af: "Afrikanca",
  az: "Azerbaycan Türkçesi",
  kk: "Kazakça",
  ky: "Kırgızca",
  uz: "Özbekçe",
  tk: "Türkmence",
  tt: "Tatarca",
  mn: "Moğolca",
  ka: "Gürcüce",
  hy: "Ermenice",
  yi: "Yidiş",
  ht: "Haiti Kreyolu",
  haw: "Hawaiice",
  mi: "Maori Dili",
  sm: "Samoaca",
  eo: "Esperanto",
  la: "Latince",
  hmn: "Hmong",
  tg: "Tacikçe",
  jw: "Cava Dili",
  jv: "Cava Dili"
};

// Setup declarativeNetRequest rules on startup/installation to bypass frame
// restrictions for Google search PiP (yalnizca Google alan adlarinda gecerli;
// tum sitelerde CSP kaldirma hem yavaslatir hem guvenlik riskidir)
chrome.runtime.onInstalled.addListener(() => {
  setupDeclarativeNetRequestRules();
  setupContextMenus();
  try { chrome.storage.local.remove(["dsToken", "dsChats", "dsActiveId", "dsLastResult", "dsVerifiedAt", "dsWasmBin", "dsWasmUrl"]); } catch (e) {}
});

chrome.runtime.onStartup.addListener(() => {
  setupDeclarativeNetRequestRules();
  setupContextMenus();
});

// Sağ tık menüsü (görsel çevir öğesi ayarlardan açılıp kapatılabilir)
function setupContextMenus() {
  if (!chrome.contextMenus) return;
  chrome.storage.local.get(["visualMenuEnabled"], (res) => {
    try {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: "gemini-translate-page",
          title: "Gemini ile Sayfayı Çevir",
          contexts: ["page"]
        });
        if (res.visualMenuEnabled) {
          chrome.contextMenus.create({
            id: "gemini-visual-translate",
            title: "Gemini ile Görsel Çevir (Alan Seç)",
            contexts: ["page"]
          });
        }
      });
    } catch (e) {
      console.error("Context menu kurulamadı:", e);
    }
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.visualMenuEnabled) setupContextMenus();
  if (changes.soundMutedHosts) mixerMutedHosts = changes.soundMutedHosts.newValue || {};
  // Model/anahtar degisince bellek onbellegindeki eski sonuclar gecersiz kalir
  if (changes.apiKey || changes.modelName || changes.thinkingLevel || changes.useMultiKeys || changes.geminiApiKeys) {
    GEM_MEM_CACHE.clear();
  }
});

if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((cmd) => {
    if (cmd !== "visual-translate") return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs && tabs[0];
      if (!t || t.id === undefined) return;
      chrome.tabs.sendMessage(t.id, { action: "visual-translate-start" }, () => {
        void chrome.runtime.lastError;
      });
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || tab.id === undefined) return;
  if (info.menuItemId === "gemini-visual-translate") {
    chrome.tabs.sendMessage(tab.id, { action: "visual-translate-start" }, () => {
      void chrome.runtime.lastError;
    });
    return;
  }
  chrome.storage.local.get(["pageTransTarget"], (res) => {
    const targetLang = res.pageTransTarget || "tr";
    chrome.tabs.sendMessage(tab.id, { action: "translate-page-start", targetLang }, () => {
      // chrome:// gibi content script çalışmayan sayfalarda sessizce geç
      void chrome.runtime.lastError;
    });
  });
});

// Run immediately as well in case service worker starts up
setupDeclarativeNetRequestRules();

async function setupDeclarativeNetRequestRules() {
  if (chrome.declarativeNetRequest) {
    const rules = [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "x-frame-options", operation: "remove" },
            { header: "content-security-policy", operation: "remove" },
            { header: "cross-origin-embedder-policy", operation: "remove" },
            { header: "cross-origin-resource-policy", operation: "remove" }
          ]
        },
        condition: {
          urlFilter: "google.",
          resourceTypes: ["sub_frame"]
        }
      },
      {
        id: 2,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "x-frame-options", operation: "remove" },
            { header: "content-security-policy", operation: "remove" },
            { header: "cross-origin-embedder-policy", operation: "remove" },
            { header: "cross-origin-embedder-policy-report-only", operation: "remove" },
            { header: "cross-origin-resource-policy", operation: "remove" }
          ]
        },
        condition: {
          urlFilter: "google.",
          resourceTypes: ["main_frame"]
        }
      }
    ];

    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1, 2, 3, 4],
        addRules: rules
      });
      console.log("DeclarativeNetRequest rules set successfully.");
    } catch (e) {
      console.error("Error setting DeclarativeNetRequest rules:", e);
    }
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return false;
  if (message.action === "translate") {
    gemCached("t:" + message.sourceLang + ":" + message.targetLang + ":" + gemHash(message.text),
      () => handleTranslation(message.text, message.sourceLang, message.targetLang))
      .then(result => sendResponse({ success: true, translation: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep the message channel open for async response
  } else if (message.action === "translate-batch") {
    gemCached("tb:" + message.targetLang + ":" + gemHash(JSON.stringify(message.texts)),
      () => handleBatchTranslation(message.texts, message.targetLang))
      .then(results => sendResponse({ success: true, translations: results }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep the message channel open
  } else if (message.action === "smart-reply") {
    handleSmartReply(message.thread, message.stance, message.targetLang)
      .then(reply => sendResponse({ success: true, reply }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (message.action === "open-search-tab") {
    const query = encodeURIComponent(message.query);
    chrome.tabs.create({ url: `https://www.google.com/search?q=${query}` });
    sendResponse({ success: true });
    return false;
  } else if (message.action === "open-search-tab-url") {
    try {
      const u = new URL(String(message.url || ""));
      if (u.protocol === "http:" || u.protocol === "https:") {
        chrome.tabs.create({ url: u.toString() });
      }
    } catch (e) { void e; }
    sendResponse({ success: true });
    return false;
  } else if (message.action === "visual-capture") {
    try {
      const winId = sender && sender.tab && sender.tab.windowId;
      const opts = { format: "png" };
      const done = (dataUrl) => {
        if (chrome.runtime.lastError) sendResponse({ success: false, error: chrome.runtime.lastError.message });
        else sendResponse({ success: true, dataUrl });
      };
      if (winId !== undefined) chrome.tabs.captureVisibleTab(winId, opts, done);
      else chrome.tabs.captureVisibleTab(opts, done);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  } else if (message.action === "visual-translate-image") {
    gemCached("vis:" + message.targetLang + ":" + gemHash(message.imageData),
      () => handleVisualTranslation(message.imageData, message.targetLang))
      .then((translation) => sendResponse({ success: true, translation }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (message.action === "shazam-recognize-uri") {
    handleShazamQuery(message.uri, message.samplems)
      .then((track) => sendResponse({ success: true, track }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (message.type === "YT_TRANSLATOR_FETCH_TEXT") {
    ytFetchText(message.url)
      .then((text) => sendResponse({ success: true, text }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  } else if (message.action === "mixer-get-state") {
    sendResponse({ success: true, gains: mixerGains, captured: Array.from(mixerCaptured) });
    return false;
  } else if (message.action === "mixer-set-volume") {
    const mTabId = message.tabId;
    const mVol = Math.max(0, Math.min(100, Math.round(message.volume)));
    (async () => {
      const tab = await chrome.tabs.get(mTabId).catch(() => null);
      if (!tab) throw Object.assign(new Error("Sekme bulunamadı."), { code: "unknown" });
      if (mixerTabUnsupported(tab.url)) {
        const e = new Error("Bu sayfa desteklenmez (tarayıcı ve mağaza sayfaları).");
        e.code = "unsupported";
        throw e;
      }
      if (mVol === 100) {
        try { await mixerSetElementVolume(mTabId, 100); } catch (e) { void e; }
        await mixerRelease(mTabId);
      } else {
        // 1) Oynatici elemanlarina dogrudan yaz: arka sekmede de calisir,
        // kayit simgesi cikarmaz, yetki istemez.
        try {
          await mixerSetElementVolume(mTabId, mVol);
          mixerGains[mTabId] = mVol;
          if (mixerCaptured.has(mTabId)) await mixerRelease(mTabId);
          mixerGains[mTabId] = mVol;
          sendResponse({ success: true, captured: false, mode: "element" });
          return;
        } catch (e) {
          if (e && e.code !== "no-receiver") throw e;
          // icerik betigi yok/yakalanamadi -> yakalama yoluna dus
        }
        mixerGains[mTabId] = mVol;
        await mixerEnsureCapture(mTabId);
        await mixerTellOffscreen({ action: "mixer-gain", tabId: mTabId, volume: mVol });
      }
      sendResponse({ success: true, captured: mixerCaptured.has(mTabId) });
    })().catch((e) => {
      mixerCaptured.delete(mTabId);
      const friendly = mixerFriendlyError(e);
      sendResponse({ success: false, error: friendly.error, code: friendly.code });
    });
    return true;
  } else if (message.action === "mixer-release") {
    mixerRelease(message.tabId).catch(() => {});
    sendResponse({ success: true });
    return false;
  } else if (message.action === "mixer-died") {
    if (message.tabId !== undefined) {
      mixerCaptured.delete(message.tabId);
      delete mixerGains[message.tabId];
    }
    sendResponse({ success: true });
    return false;
  } else if (message.type === "YT_TRANSLATOR_FETCH_JSON") {
    ytFetchJSON(message)
      .then((json) => sendResponse({ success: true, json }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  }
});

// ---- YouTube Translator defaults (runs alongside main defaults, overwrites nothing) ----
const YT_DEFAULT_SETTINGS = {
  enabled: true,
  targetLanguage: "tr",
  preferredSourceLanguage: "auto",
  isOverlayHiddenByUser: false,
  fontSize: 24,
  styleShadow: true,
  styleBox: false,
  styleOutline: false,
  subtitleBgOpacity: 75,
  subtitleBgColor: "#000000",
  subtitleFontColor: "#ffffff",
  subtitleFontWeight: "700",
  filterExtraExplanations: true,
  translationParts: 3,
  autoTranslate: true,
  autoSaveTranslation: true,
  ytCommentsEnabled: true
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(Object.keys(YT_DEFAULT_SETTINGS), (result) => {
    const defaults = {};
    Object.entries(YT_DEFAULT_SETTINGS).forEach(([key, value]) => {
      if (result[key] === undefined) defaults[key] = value;
    });
    if (Object.keys(defaults).length > 0) chrome.storage.local.set(defaults);
  });
});

async function ytFetchText(url) {
  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Invalid subtitle URL.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(parsedUrl.toString(), {
      credentials: "include",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Subtitle file could not be fetched. Status: ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function ytFetchJSON(message) {
  const parsedUrl = new URL(message.url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Invalid request URL.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000);
  try {
    const response = await fetch(parsedUrl.toString(), {
      method: message.method || "GET",
      headers: message.headers || {},
      body: message.body,
      signal: controller.signal
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

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

async function handleTranslation(text, sourceLang, targetLang) {
  // Load settings from local storage
  const settings = await new Promise((resolve) => {
    chrome.storage.local.get(["apiKey", "modelName", "thinkingLevel", "useMultiKeys", "geminiApiKeys"], (result) => {
      resolve({
        apiKey: result.apiKey || DEFAULT_API_KEY,
        modelName: normalizeModelName(result.modelName),
        thinkingLevel: result.thinkingLevel || "MINIMAL",
        useMultiKeys: result.useMultiKeys !== undefined ? !!result.useMultiKeys : DEFAULT_USE_MULTI_KEYS,
        geminiApiKeys: result.geminiApiKeys || DEFAULT_GEMINI_API_KEYS
      });
    });
  });

  const modelName = settings.modelName;

  let apiKeys = [];
  if (settings.useMultiKeys) {
    apiKeys = settings.geminiApiKeys.split("\n").map(k => k.trim()).filter(k => k !== "");
  } else {
    apiKeys = settings.apiKey && settings.apiKey.trim() ? [settings.apiKey.trim()] : [];
  }

  if (apiKeys.length === 0) {
    throw new Error("Lütfen ayarlardan bir API anahtarı tanımlayın.");
  }

  const srcLabel = LANG_LABELS[sourceLang] || "Otomatik Algılanan";
  const targetLabel = LANG_LABELS[targetLang] || "Türkçe";

  let systemPrompt = "";
  if (sourceLang === "auto") {
    systemPrompt = `Sen uzman ve son derece doğal bir çevirmensin. Gönderilen metnin dilini otomatik algıla ve ${targetLabel} diline çevir.

ÇEVİRİ İLKELERİ:
- Tıpkı o dili anadili olarak konuşan bir insanın günlük yaşamda (mesajlaşırken veya konuşurken) kullanacağı gibi doğal, rahat ve akıcı çevir.
- Yapay, kasıntı, aşırı resmi veya robotik bir dil KULLANMA.
- Doğallık katan genel ve yaygın kısaltmaları (örneğin İngilizceye çevirirken "idk", "gonna", "wanna", "btw" gibi) yeri geldiğinde rahatça kullan; fakat her kelimeyi zorla kısaltma ve yapay bir sokak ağzına dönüştürme.
- Orijinal cümlenin duygu, ima, bağlam ve ANLAMINI %100 koru. Anlamı asla bozma veya çarpıtma.
- Sadece çeviri sonucunu döndür. Ek açıklama, not, başlık, tırnak işareti veya giriş cümlesi ekleme.
- Emoji, hashtag, mention (@), URL, biçimlendirme işaretleri ve satır yapısını aynen koru.
- Sadece insan dilindeki metni çevir, geri kalan herşeyi olduğu gibi bırak.`;
  } else {
    systemPrompt = `Sen uzman ve son derece doğal bir çevirmensin. Metni ${srcLabel} dilinden ${targetLabel} diline çevir.

ÇEVİRİ İLKELERİ:
- Tıpkı o dili anadili olarak konuşan bir insanın günlük yaşamda (mesajlaşırken veya konuşurken) kullanacağı gibi doğal, rahat ve akıcı çevir.
- Yapay, kasıntı, aşırı resmi veya robotik bir dil KULLANMA.
- Doğallık katan genel ve yaygın kısaltmaları (örneğin İngilizceye çevirirken "idk", "gonna", "wanna", "btw" gibi) yeri geldiğinde rahatça kullan; fakat her kelimeyi zorla kısaltma ve yapay bir sokak ağzına dönüştürme.
- Orijinal cümlenin duygu, ima, bağlam ve ANLAMINI %100 koru. Anlamı asla bozma veya çarpıtma.
- Sadece çeviri sonucunu döndür. Ek açıklama, not, başlık, tırnak işareti veya giriş cümlesi ekleme.
- Emoji, hashtag, mention (@), URL, biçimlendirme işaretleri ve satır yapısını aynen koru.
- Sadece insan dilindeki metni çevir, geri kalan herşeyi olduğu gibi bırak.`;
  }

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: text
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        {
          text: systemPrompt
        }
      ]
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2000,
      thinkingConfig: {
        thinkingLevel: settings.thinkingLevel
      }
    }
  };

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
          throw new Error("Gemini API'den boş yanıt döndü.");
        }

        let finalText = candidateText.trim();
        finalText = finalText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        return finalText;
      } catch (error) {
        // thinking'li varyant 400 yediyse thinking'siz varyantı dene (lite uyumluluğu)
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

async function handleSmartReply(thread, stance, targetLang) {
  const cleanThread = String(thread || "").trim().slice(0, 8000);
  if (!cleanThread) throw new Error("Yanıt için tweet metni bulunamadı.");
  const cleanStance = String(stance || "").trim().slice(0, 2000);
  const settings = await new Promise((resolve) => {
    chrome.storage.local.get(["apiKey", "modelName", "thinkingLevel", "useMultiKeys", "geminiApiKeys"], (result) => {
      resolve({
        apiKey: result.apiKey || DEFAULT_API_KEY,
        modelName: normalizeModelName(result.modelName),
        thinkingLevel: result.thinkingLevel || "MINIMAL",
        useMultiKeys: result.useMultiKeys !== undefined ? !!result.useMultiKeys : DEFAULT_USE_MULTI_KEYS,
        geminiApiKeys: result.geminiApiKeys || DEFAULT_GEMINI_API_KEYS
      });
    });
  });
  let apiKeys = [];
  if (settings.useMultiKeys) {
    apiKeys = settings.geminiApiKeys.split("\n").map(k => k.trim()).filter(k => k !== "");
  } else {
    apiKeys = settings.apiKey && settings.apiKey.trim() ? [settings.apiKey.trim()] : [];
  }
  if (apiKeys.length === 0) throw new Error("Lütfen ayarlardan bir API anahtarı tanımlayın.");
  const targetLabel = LANG_LABELS[targetLang] || "Türkçe";
  const systemPrompt = `Sen X (Twitter) için yanıt taslağı yazan bir asistansın. Kullanıcı adına, hedef tweetin yazarına hitap eden bir yanıt yazarsın. Sana verilen sohbet zincirindeki en sondaki HEDEF TWEET'e verilecek yanıtı yaz. Dil: ${targetLabel}. Zincirdeki önceki tweetlerin bağlamını dikkate al. Asla kullanıcıya hitap etme, kullanıcının görüşünü değerlendirme, kullanıcıya katılıp katılmadığını söyleme; yanıt doğrudan hedef tweetin yazarına yazılmış olsun.` + (cleanStance ? ` Yanıt bu pozisyonu savunsun: "${cleanStance}".` : "") + ` Yanıt ikna edici olsun: pozisyonu gerekçeleriyle savun, karşı iddiadaki zayıf noktaya değin. Kısa kesip atma, nutuk da çekme; doğal X diliyle yaz. Sadece yanıt metnini döndür, açıklama, başlık, tırnak veya giriş cümlesi ekleme. Mention, hashtag ve emoji kullanımını hedef tweetin diline uygun tut.`;
  const userText = "SOHBET ZİNCİRİ (eskiden yeniye, sonuncu hedef):\n" + cleanThread + "\n\nHEDEF TWEET'in yazarına verilecek yanıtı, doğrudan X'e yapıştırılabilir şekilde yaz.";
  const requestBody = {
    contents: [{ parts: [{ text: userText }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
      thinkingConfig: { thinkingLevel: settings.thinkingLevel }
    }
  };
  let lastError = null;
  const bodies = geminiRequestVariants(requestBody);
  for (let i = 0; i < apiKeys.length; i++) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.modelName}:generateContent?key=${apiKeys[i]}`;
    let keyFailed = false;
    for (let v = 0; v < bodies.length; v++) {
      try {
        const data = await postGeminiBody(url, bodies[v]);
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) throw new Error("Gemini API'den boş yanıt döndü.");
        return candidateText.trim().replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      } catch (error) {
        if (v < bodies.length - 1 && geminiThinkingRejected(error)) continue;
        lastError = error;
        keyFailed = true;
        break;
      }
    }
    if (keyFailed) console.log("Anahtar " + (i + 1) + " hata aldı, sonraki deneniyor...");
  }
  if (lastError && (lastError.message === "Failed to fetch" || lastError.message.includes("Failed to fetch"))) {
    throw new Error("Failed to fetch. Bu hata genellikle modelin yoğun/overloaded olması (503 Service Unavailable), rate-limit aşımı veya geçersiz API anahtarı sebebiyle Google sunucularının bağlantıyı kesmesinden kaynaklanır. Lütfen API anahtarlarınızı kontrol edin veya Ayarlar'dan gemini-3.5-flash-lite modelini seçin.");
  }
  throw lastError || new Error("Tüm API anahtarları başarısız oldu.");
}

async function handleVisualTranslation(imageDataUrl, targetLang) {
  if (!imageDataUrl || !imageDataUrl.startsWith("data:image")) {
    throw new Error("Görüntü alınamadı.");
  }
  const settings = await new Promise((resolve) => {
    chrome.storage.local.get(["apiKey", "modelName", "thinkingLevel", "useMultiKeys", "geminiApiKeys"], (result) => {
      resolve({
        apiKey: result.apiKey || DEFAULT_API_KEY,
        modelName: normalizeModelName(result.modelName),
        thinkingLevel: result.thinkingLevel || "MINIMAL",
        useMultiKeys: result.useMultiKeys !== undefined ? !!result.useMultiKeys : DEFAULT_USE_MULTI_KEYS,
        geminiApiKeys: result.geminiApiKeys || DEFAULT_GEMINI_API_KEYS
      });
    });
  });
  let apiKeys = settings.useMultiKeys
    ? settings.geminiApiKeys.split("\n").map(k => k.trim()).filter(k => k !== "")
    : (settings.apiKey && settings.apiKey.trim() ? [settings.apiKey.trim()] : []);
  if (apiKeys.length === 0) throw new Error("Lütfen ayarlardan bir API anahtarı tanımlayın.");

  const targetLabel = LANG_LABELS[targetLang] || "Türkçe";
  const comma = imageDataUrl.indexOf(",");
  const mimeMatch = imageDataUrl.slice(0, comma).match(/data:(image\/\w+);base64/);
  const requestBody = {
    contents: [{ parts: [
      { text: `Bu ekran görüntüsündeki TÜM yazıları oku ve ${targetLabel} diline çevir. Sadece çeviri sonucunu döndür, açıklama ekleme. Satır yapısını koru. Okunabilir yazı yoksa sadece şunu yaz: "Yazı bulunamadı."` },
      { inline_data: { mime_type: (mimeMatch && mimeMatch[1]) || "image/png", data: imageDataUrl.slice(comma + 1) } }
    ] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2000, thinkingConfig: { thinkingLevel: settings.thinkingLevel } }
  };
  let lastError = null;
  const bodies = geminiRequestVariants(requestBody);
  for (let i = 0; i < apiKeys.length; i++) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.modelName}:generateContent?key=${apiKeys[i]}`;
    let keyFailed = false;
    for (let v = 0; v < bodies.length; v++) {
      try {
        const data = await postGeminiBody(url, bodies[v]);
        const t = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!t) throw new Error("Gemini API'den boş yanıt döndü.");
        return t.trim().replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      } catch (error) {
        if (v < bodies.length - 1 && geminiThinkingRejected(error)) continue;
        lastError = error; keyFailed = true; break;
      }
    }
    if (keyFailed) console.log("Anahtar " + (i + 1) + " hata aldı, sonraki deneniyor...");
  }
  throw lastError || new Error("Tüm API anahtarları başarısız oldu.");
}

// Shazam ile sekme sesini tanima (anahtarsiz, ucretsiz).
// Imza popup'ta uretilir (shazam-sig.js); buraya sadece kucuk imza metni gelir.
async function handleShazamQuery(uri, samplems) {
  if (!uri || !uri.startsWith("data:audio/vnd.shazam.sig;base64,")) {
    throw new Error("Ses imzası alınamadı.");
  }
  if (!samplems || samplems < 3000) {
    throw new Error("Kayıt çok kısa (en az 3 sn ses gerek).");
  }
  const uuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  }).toUpperCase();
  const url = `https://amp.shazam.com/discovery/v5/en/US/android/-/tag/${uuid()}/${uuid()}?sync=true&webv3=true&sampling=true&connected=&shazamapiversion=v3&sharehub=true&video=v3`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shazam-Platform": "IPHONE",
      "X-Shazam-AppVersion": "14.1.0",
      "Accept": "*/*",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    },
    body: JSON.stringify({
      timezone: "Europe/Istanbul",
      signature: { uri, samplems },
      timestamp: Date.now(),
      context: {},
      geolocation: {}
    })
  });
  if (!res.ok) throw new Error(`Shazam Hata: ${res.status}`);
  const data = await res.json();
  if (!data.matches || !data.matches.length || !data.track) {
    const n = (data.matches || []).length;
    throw new Error(`Eşleşme bulunamadı (aday: ${n}, parça bilgisi: ${data.track ? "var" : "yok"}, imza: ${uri.length} karakter, süre: ${(samplems / 1000).toFixed(1)} sn).`);
  }
  const songSec = (data.track.sections || []).find((s) => s.type === "SONG");
  const meta = (songSec && songSec.metadata) || [];
  const pick = (t) => { const m = meta.find((x) => x.title === t); return m ? m.text : ""; };
  return {
    title: data.track.title || "",
    artist: data.track.subtitle || "",
    album: pick("Album"),
    year: pick("Released"),
    cover: (data.track.images && data.track.images.coverart) || ""
  };
}

// ==========================================
// SES MİKSERİ (sekme bazında ses seviyesi)
// Yakalama + gain offscreen belgede tutulur, durum burada.
// ==========================================
const mixerGains = {}; // tabId -> 0..100
const mixerCaptured = new Set();
let mixerMutedHosts = {};
try { chrome.storage.local.get(["soundMutedHosts"], (res) => { mixerMutedHosts = (res && res.soundMutedHosts) || {}; }); } catch (e) { void e; }
function mixerHostOfUrl(url) {
  try {
    const h = new URL(url || "").hostname.toLowerCase().replace(/^www\./, "");
    return h || "";
  } catch (e) { return ""; }
}
function mixerAutoMute(tabId, url) {
  const h = mixerHostOfUrl(url);
  if (!h || !mixerMutedHosts[h]) return;
  chrome.tabs.get(tabId, (t) => {
    if (chrome.runtime.lastError || !t) return;
    if (t.mutedInfo && t.mutedInfo.muted) return;
    chrome.tabs.update(tabId, { muted: true }, () => { void chrome.runtime.lastError; });
  });
}
chrome.tabs.onCreated.addListener((tab) => {
  if (tab && tab.id !== undefined) mixerAutoMute(tab.id, tab.pendingUrl || tab.url);
});
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.url || info.status === "complete") mixerAutoMute(tabId, (tab && (tab.pendingUrl || tab.url)) || info.url);
});

async function mixerEnsureOffscreen() {
  if (!chrome.offscreen || !chrome.offscreen.createDocument) {
    throw new Error("Offscreen API yok. Eklentiyi yeniden yükleyip Chrome'u güncelle (109+).");
  }
  let exists = false;
  try { exists = await chrome.offscreen.hasDocument(); } catch (e) { exists = false; }
  if (exists) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Sekme ses seviyesi mikseri"
  });
}

function mixerTellOffscreen(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(Object.assign({ scope: "mixer-offscreen" }, msg), (res) => {
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      if (res && res.success) resolve(res);
      else reject(new Error(res && res.error ? res.error : "Offscreen hatası."));
    });
  });
}

function mixerCaptureError(e) {
  const m = (e && e.message) || "";
  const err = new Error(m || "Sekme yakalanamadı.");
  if (/not been invoked/i.test(m)) err.code = "need-grant";
  else if (/chrome pages|cannot be captured|invalid|secure/i.test(m)) err.code = "unsupported";
  else if (/active stream|already|in use/i.test(m)) err.code = "busy";
  else err.code = "unknown";
  return err;
}

function mixerFriendlyError(e) {
  if (!e) return { error: "Bilinmeyen hata.", code: "unknown" };
  if (e.code === "need-grant") return { error: "Bu sekmede yetki yok: sekmeye geçip eklenti simgesine bir kez tıkla, sonra tekrar dene.", code: e.code };
  if (e.code === "unsupported") return { error: "Bu sayfa desteklenmez (tarayıcı ve mağaza sayfaları).", code: e.code };
  if (e.code === "busy") return { error: "Sekme şu an başka işlemde (ör. Müzik Bul kaydı). Bitince tekrar dene.", code: e.code };
  return { error: e.message || "Ses ayarlanamadı.", code: "unknown" };
}

function mixerSetElementVolume(tabId, volume) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: "mixer-set-element-volume", volume }, (res) => {
      if (chrome.runtime.lastError) {
        const m = chrome.runtime.lastError.message || "";
        if (/Could not establish|receiving end|no receiving/i.test(m)) {
          const e = new Error("no-receiver");
          e.code = "no-receiver";
          reject(e);
        } else {
          reject(new Error(m));
        }
        return;
      }
      if (res && res.success) resolve();
      else reject(new Error((res && res.error) || "Element sesi ayarlanamadı."));
    });
  });
}

function mixerTabUnsupported(url) {
  if (!url) return false;
  if (/^(chrome|edge|about|chrome-extension|view-source|devtools|chrome-search):/i.test(url)) return true;
  try {
    const host = new URL(url).hostname || "";
    if (/(^|\.)chromewebstore\.google\.com$/i.test(host)) return true;
  } catch (e) { void e; }
  return false;
}

async function mixerEnsureCapture(tabId) {
  if (mixerCaptured.has(tabId)) return;
  await mixerEnsureOffscreen();
  let streamId = null;
  try {
    streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  } catch (e) {
    throw mixerCaptureError(e);
  }
  if (!streamId) throw mixerCaptureError(null);
  await mixerTellOffscreen({
    action: "mixer-ensure", tabId, streamId,
    volume: mixerGains[tabId] !== undefined ? mixerGains[tabId] : 100
  });
  mixerCaptured.add(tabId);
}

async function mixerRelease(tabId) {
  mixerCaptured.delete(tabId);
  delete mixerGains[tabId];
  try { await mixerTellOffscreen({ action: "mixer-release", tabId }); } catch (e) { void e; }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  mixerCaptured.delete(tabId);
  delete mixerGains[tabId];
  mixerTellOffscreen({ action: "mixer-release", tabId }).catch(() => {});
});

async function handleBatchTranslation(texts, targetLang) {
  // Load settings
  const settings = await new Promise((resolve) => {
    chrome.storage.local.get(["apiKey", "modelName", "thinkingLevel", "useMultiKeys", "geminiApiKeys"], (result) => {
      resolve({
        apiKey: result.apiKey || DEFAULT_API_KEY,
        modelName: normalizeModelName(result.modelName),
        thinkingLevel: result.thinkingLevel || "MINIMAL",
        useMultiKeys: result.useMultiKeys !== undefined ? !!result.useMultiKeys : DEFAULT_USE_MULTI_KEYS,
        geminiApiKeys: result.geminiApiKeys || DEFAULT_GEMINI_API_KEYS
      });
    });
  });

  const modelName = settings.modelName;

  let apiKeys = [];
  if (settings.useMultiKeys) {
    apiKeys = settings.geminiApiKeys.split("\n").map(k => k.trim()).filter(k => k !== "");
  } else {
    apiKeys = settings.apiKey && settings.apiKey.trim() ? [settings.apiKey.trim()] : [];
  }

  if (apiKeys.length === 0) {
    throw new Error("Lütfen ayarlardan bir API anahtarı tanımlayın.");
  }

  const targetLabel = LANG_LABELS[targetLang] || "Türkçe";

  const systemPrompt = `Sen uzman ve son derece doğal bir çevirmensin. Sana gönderilen metin dizisindeki (array) her bir metni ${targetLabel} diline çevir.

ÇEVİRİ İLKELERİ:
- Tıpkı o dili anadili olarak konuşan bir insanın günlük yaşamda kullanacağı gibi doğal, rahat ve akıcı çevir. Aşırı resmi veya robotik olma.
- Doğallık katan genel kısaltmaları (örneğin "idk", "gonna", "btw" vb.) yeri geldiğinde rahatça kullan, ancak her kelimeyi zorla kısaltma.
- Orijinal cümlenin anlamını, duygusunu ve bağlamını tamamen koru.
- Bu dizi aynı gönderinin biçimlendirme nedeniyle bölünmüş parçalarıdır. Her parçayı tek başına çevir, parçaları asla birleştirme, bölme, atlama veya sıralarını değiştirme.
- Girdi ${texts.length} elemanlıdır, çıktı da kesinlikle ${texts.length} elemanlı olmalıdır.
- Çeviri sonucunu kesinlikle orijinal sırasını bozmadan ve tamamen aynı sayıda eleman içeren geçerli bir JSON string dizisi formatında döndür.
- Çıktı sadece geçerli bir JSON dizisi olmalıdır: ["çeviri1", "çeviri2", ...]
- Dizi dışında kesinlikle hiçbir açıklama, not veya ek metin ekleme.
- Orijinal dizide boşluk veya boş değerler varsa onları boş olarak bırak.
- Emoji, hashtag, mention, URL'leri aynen koru.
- Sadece insan dilindeki metni çevir, geri kalan herşeyi olduğu gibi bırak.`;

  const prompt = `Aşağıdaki ${texts.length} metni ${targetLabel} diline çevir. Parça sayısı: ${texts.length}. Aynı sayıda çeviri döndür:\n\n${JSON.stringify(texts)}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        {
          text: systemPrompt
        }
      ]
    },
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      maxOutputTokens: 32768,
      thinkingConfig: {
        thinkingLevel: settings.thinkingLevel
      }
    }
  };

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
          throw new Error("Gemini API'den boş yanıt döndü.");
        }

        try {
          let jsonText = candidateText.trim();
          const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }

          const parsedTranslations = JSON.parse(jsonText);
          if (Array.isArray(parsedTranslations)) {
            if (parsedTranslations.length !== texts.length) {
              throw new Error(`Parça sayısı uyuşmadı: beklenen ${texts.length}, gelen ${parsedTranslations.length}.`);
            }
            return parsedTranslations.map(t => (typeof t === "string" ? t : String(t ?? "")));
          } else {
            throw new Error("API yanıtı bir dizi formatında değil.");
          }
        } catch (parseError) {
          console.error("JSON parse hatası: ", parseError, candidateText);
          throw new Error("Çeviri sonuçları JSON dizisi olarak çözümlenemedi.");
        }
      } catch (error) {
        // thinking'li varyant 400 yediyse thinking'siz varyantı dene (lite uyumluluğu)
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
