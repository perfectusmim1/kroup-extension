// YouTube module (integrated into Gemini Smart Toolkit). Isolated from content.js.
(function () {
if (window.__ytTranslatorIntegratedInjected) return;
window.__ytTranslatorIntegratedInjected = true;

// Global State
let extensionEnabled = true;
let targetLanguage = 'tr';
let preferredSourceLanguage = 'auto';
let isOverlayHiddenByUser = false;
let translationEngine = 'gemini';
let geminiApiKey = '';
let useMultiKeys = false;
let geminiApiKeys = '';
let geminiModel = 'gemini-3.8-flash';
let geminiThinkingLevel = 'MEDIUM';
let fontSize = 24;
let styleShadow = true;
let styleBox = false;
let styleOutline = false;
let subtitleBgOpacity = 75;
let subtitleBgColor = '#000000';
let subtitleFontColor = '#ffffff';
let subtitleFontWeight = '700';
let filterExtraExplanations = true;
let translationParts = 3;
let autoTranslate = true;
let autoSaveTranslation = true;
let ytCommentsEnabled = true;
let isCachedTranslation = false;
// API anahtarı genel Ayarlar sekmesinden gelir. Koda anahtar gömülmez.
const YT_FALLBACK_API_KEY = "";
function ytNormalizeModelName(m) { return m === 'gemini-3.6-flash' ? 'gemini-3.8-flash' : (m || 'gemini-3.8-flash'); }

let availableTracks = [];
let activeTrack = null;
let activeTrackIndex = -1;
let rawSubtitles = [];
let translatedSubtitles = [];
let activeVideo = null;
let currentVideoId = null;
let currentSubtitleIndex = -1;
let subtitleLoadToken = 0;
let controlsObserver = null;
let observedControlsPlayer = null;
let playerResizeObserver = null;
let tracksSignature = '';
let tracksLoaded = false;


// UI Elements
let subtitleOverlay = null;
let subtitleTextElement = null;
let floatPanel = null;
let floatTrigger = null;
let floatContent = null;
let sourceSelect = null;
let translateBtn = null;
let progressBlock = null;
let progressVal = null;
let progressFill = null;
let errorMsg = null;
let engineInfoText = null;
let targetLangText = null;
let statusTextElement = null;

// Language Names Mapping for Gemini Prompts
const LANG_MAP = {
  af: 'Afrikaans',
  sq: 'Albanian',
  am: 'Amharic',
  ar: 'Arabic',
  hy: 'Armenian',
  az: 'Azerbaijani',
  eu: 'Basque',
  be: 'Belarusian',
  bn: 'Bengali',
  bs: 'Bosnian',
  bg: 'Bulgarian',
  my: 'Burmese',
  ca: 'Catalan',
  ceb: 'Cebuano',
  zh: 'Chinese',
  hr: 'Croatian',
  cs: 'Czech',
  da: 'Danish',
  nl: 'Dutch',
  en: 'English',
  eo: 'Esperanto',
  et: 'Estonian',
  fi: 'Finnish',
  fr: 'French',
  gl: 'Galician',
  ka: 'Georgian',
  de: 'German',
  el: 'Greek',
  gu: 'Gujarati',
  ha: 'Hausa',
  he: 'Hebrew',
  hi: 'Hindi',
  hmn: 'Hmong',
  hu: 'Hungarian',
  is: 'Icelandic',
  ig: 'Igbo',
  id: 'Indonesian',
  ga: 'Irish',
  it: 'Italian',
  ja: 'Japanese',
  jw: 'Javanese',
  kn: 'Kannada',
  kk: 'Kazakh',
  km: 'Khmer',
  ko: 'Korean',
  lo: 'Lao',
  la: 'Latin',
  lv: 'Latvian',
  lt: 'Lithuanian',
  lb: 'Luxembourgish',
  mk: 'Macedonian',
  mg: 'Malagasy',
  ms: 'Malay',
  ml: 'Malayalam',
  mt: 'Maltese',
  mi: 'Maori',
  mr: 'Marathi',
  mn: 'Mongolian',
  ne: 'Nepali',
  no: 'Norwegian',
  fa: 'Persian',
  pl: 'Polish',
  pt: 'Portuguese',
  pa: 'Punjabi',
  ro: 'Romanian',
  ru: 'Russian',
  sm: 'Samoan',
  sr: 'Serbian',
  st: 'Sesotho',
  sn: 'Shona',
  sd: 'Sindhi',
  si: 'Sinhala',
  sk: 'Slovak',
  sl: 'Slovenian',
  so: 'Somali',
  es: 'Spanish',
  su: 'Sundanese',
  sw: 'Swahili',
  sv: 'Swedish',
  tl: 'Tagalog',
  tg: 'Tajik',
  ta: 'Tamil',
  te: 'Telugu',
  th: 'Thai',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  uz: 'Uzbek',
  vi: 'Vietnamese',
  cy: 'Welsh',
  xh: 'Xhosa',
  yi: 'Yiddish',
  yo: 'Yoruba',
  zu: 'Zulu'
};

// 1. Inject Styles
const styles = `
  /* Hide Native Captions */
  body.yt-translator-hide-native .ytp-caption-window-container {
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /* Netflix Subtitles Overlay Container */
  #netflix-subtitles-overlay {
    position: absolute;
    bottom: 12%;
    left: 50%;
    transform: translateX(-50%);
    width: 85%;
    z-index: 10;
    pointer-events: none;
    user-select: none;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    min-height: 44px;
    opacity: 1 !important;
    visibility: visible !important;
    transition: bottom 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .html5-video-player .ytp-chrome-bottom,
  .html5-video-player .ytp-gradient-bottom,
  .html5-video-player .ytp-chrome-top,
  .html5-video-player .ytp-gradient-top,
  .html5-video-player .ytp-tooltip,
  .html5-video-player .ytp-preview,
  .html5-video-player .ytp-endscreen-content,
  .html5-video-player .ytp-ce-element,
  .html5-video-player .ytp-cards-teaser {
    z-index: 25 !important;
  }

  /* Subtitle Text Styled like Netflix */
  .netflix-subtitle-text {
    color: #ffffff;
    font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    line-height: 1.35;
    margin: 0;
    padding: 0;
    text-align: center;
    display: inline-block;
    max-width: 100%;
    white-space: pre-wrap;
    opacity: 1 !important;
    visibility: visible !important;
    transition: font-size 0.15s ease;
  }

  .netflix-subtitle-text.style-shadow {
    text-shadow: 
      0px 0px 5px rgba(0,0,0,1), 
      0px 0px 10px rgba(0,0,0,0.9), 
      0px 2px 4px rgba(0,0,0,0.9),
      1px 1px 3px rgba(0,0,0,0.8),
      -1px -1px 3px rgba(0,0,0,0.8);
    letter-spacing: 0.3px;
  }

  .netflix-subtitle-text.style-box {
    padding: 6px 16px;
    border-radius: 4px;
  }

  .netflix-subtitle-text.style-outline {
    -webkit-text-stroke: 1.8px #000000;
    paint-order: stroke fill;
    letter-spacing: 0.5px;
  }

  .netflix-subtitle-text.style-outline:not(.style-shadow) {
    text-shadow:
      -1px -1px 0 #000, 1px -1px 0 #000,
      -1px 1px 0 #000, 1px 1px 0 #000,
      0px 0px 6px rgba(0,0,0,0.9),
      0px 2px 4px rgba(0,0,0,0.7);
  }

  .netflix-subtitle-text.yt-translator-live-fallback {
    background: transparent !important;
    padding: 0 !important;
    border-radius: 0 !important;
    color: #ffffff !important;
    font-weight: 800 !important;
    text-shadow:
      0 0 3px rgba(0, 0, 0, 1),
      0 0 6px rgba(0, 0, 0, 1),
      0 2px 4px rgba(0, 0, 0, 1),
      0 4px 10px rgba(0, 0, 0, 0.95) !important;
  }

  /* Floating Control Panel */
  #yt-translator-float-panel {
    position: absolute;
    bottom: 80px;
    right: 24px;
    z-index: 1000;
    font-family: 'Outfit', sans-serif;
    color: #f3f4f6;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    pointer-events: auto;
  }

  .panel-trigger {
    width: 42px;
    height: 42px;
    background: rgba(20, 20, 25, 0.75);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s, background 0.2s;
  }

  .panel-trigger:hover {
    transform: scale(1.08);
    background: rgba(229, 9, 20, 0.9);
    border-color: #E50914;
  }

  .panel-trigger svg {
    width: 22px;
    height: 22px;
    fill: #ffffff;
  }

  .panel-content {
    margin-top: 8px;
    width: 260px;
    background: rgba(20, 20, 25, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    gap: 10px;
    opacity: 0;
    transform: translateY(10px) scale(0.95);
    pointer-events: none;
    transition: opacity 0.2s, transform 0.2s;
    transform-origin: top right;
  }

  #yt-translator-float-panel:hover .panel-content,
  #yt-translator-float-panel.expanded .panel-content {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .panel-header {
    font-size: 13px;
    font-weight: 700;
    color: #E50914;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .panel-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    gap: 8px;
  }

  .panel-row label {
    color: #9ca3af;
    font-weight: 500;
  }

  .panel-row span {
    font-weight: 600;
  }

  .panel-row.status-row {
    align-items: flex-start;
  }

  #yt-translator-status {
    max-width: 154px;
    color: #d1d5db;
    font-size: 11px;
    line-height: 1.3;
    text-align: right;
    word-break: break-word;
  }

  .panel-select-wrapper {
    position: relative;
    flex: 1;
    max-width: 140px;
  }

  .panel-select {
    width: 100%;
    padding: 5px 24px 5px 8px;
    background: rgba(40, 40, 50, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: #ffffff;
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
    appearance: none;
  }

  .panel-select-wrapper::after {
    content: "";
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
    width: 5px;
    height: 5px;
    border-right: 1.5px solid #9ca3af;
    border-bottom: 1.5px solid #9ca3af;
    pointer-events: none;
  }

  .panel-btn {
    width: 100%;
    padding: 8px;
    background: #E50914;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(229, 9, 20, 0.3);
    transition: background 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .panel-btn:hover {
    background: #b81d24;
  }

  .panel-btn:active {
    transform: scale(0.97);
  }

  /* Progress Bar */
  .progress-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 4px;
  }

  .progress-text {
    font-size: 11px;
    color: #9ca3af;
    display: flex;
    justify-content: space-between;
  }

  .progress-bar-bg {
    width: 100%;
    height: 5px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  #yt-translator-progress-fill {
    width: 0%;
    height: 100%;
    background: #E50914;
    transition: width 0.3s ease;
    box-shadow: 0 0 6px rgba(229, 9, 20, 0.5);
  }

  /* Error Block */
  .error-msg {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11px;
    line-height: 1.3;
    font-weight: 500;
  }

  .hidden {
    display: none !important;
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

function loadSettings(callback) {
  if (!chrome.runtime || !chrome.runtime.id || !chrome.storage || !chrome.storage.local) {
    return;
  }
  chrome.storage.local.get([
    'enabled',
    'targetLanguage',
    'preferredSourceLanguage',
    'isOverlayHiddenByUser',
    'apiKey',
    'useMultiKeys',
    'geminiApiKeys',
    'geminiModel',
    'modelName',
    'geminiThinkingLevel',
    'thinkingLevel',
    'fontSize',
    'styleShadow',
    'styleBox',
    'styleOutline',
    'subtitleBgOpacity',
    'subtitleBgColor',
    'subtitleFontColor',
    'subtitleFontWeight',
'filterExtraExplanations',
    'translationParts',
    'autoTranslate',
    'autoSaveTranslation',
    'ytCommentsEnabled'
  ], (result) => {
    if (!chrome.runtime || !chrome.runtime.id) return;

    extensionEnabled = result.enabled !== false;
    targetLanguage = result.targetLanguage || 'tr';
    preferredSourceLanguage = result.preferredSourceLanguage || 'auto';
    isOverlayHiddenByUser = result.isOverlayHiddenByUser === true;
    translationEngine = 'gemini';
    // API anahtarı her zaman genel Ayarlar'dan gelir (tekli + çoklu mod dahil).
    geminiApiKey = result.apiKey || YT_FALLBACK_API_KEY;
    useMultiKeys = result.useMultiKeys === true;
    geminiApiKeys = result.geminiApiKeys || '';
    geminiModel = ytNormalizeModelName(result.geminiModel || result.modelName);
    geminiThinkingLevel = result.geminiThinkingLevel || result.thinkingLevel || 'MEDIUM';
    fontSize = result.fontSize || 24;
    styleShadow = result.styleShadow !== false;
    styleBox = result.styleBox === true;
    styleOutline = result.styleOutline === true;
    subtitleBgOpacity = result.subtitleBgOpacity !== undefined ? result.subtitleBgOpacity : 75;
    subtitleBgColor = result.subtitleBgColor || '#000000';
    subtitleFontColor = result.subtitleFontColor || '#ffffff';
    subtitleFontWeight = result.subtitleFontWeight || '700';
filterExtraExplanations = result.filterExtraExplanations !== false;
    translationParts = Math.min(6, Math.max(1, Number(result.translationParts) || 3));
    autoTranslate = result.autoTranslate !== false;
    autoSaveTranslation = result.autoSaveTranslation !== false;
    ytCommentsEnabled = result.ytCommentsEnabled !== false;

    if (callback) callback();
  });
}

// Listen for updates from Settings Popup
chrome.storage.onChanged.addListener((changes) => {
  if (!chrome.runtime || !chrome.runtime.id) return;

  if (changes.enabled) {
    extensionEnabled = changes.enabled.newValue;
    if (extensionEnabled) {
      scheduleInit(0);
    } else {
      subtitleLoadToken += 1;
      resetSubtitleState();
      if (floatPanel) floatPanel.classList.add('hidden');
    }
  }
  if (changes.targetLanguage) {
    targetLanguage = changes.targetLanguage.newValue;
    // Re-translate if language changes and autoTranslate is on OR translation exists
    if (activeTrack && (autoTranslate || translatedSubtitles.length > 0)) {
      loadAndTranslateSubtitles();
    }
  }
  if (changes.preferredSourceLanguage) {
    preferredSourceLanguage = changes.preferredSourceLanguage.newValue;
    if (availableTracks.length > 0) {
      selectTrackByPreference();
      if (autoTranslate || translatedSubtitles.length > 0) {
        loadAndTranslateSubtitles();
      } else {
        resetSubtitleState();
        setPanelStatus('Ready to Translate (Start Manually)');
        updatePanelUI();
      }
    }
  }
  if (changes.isOverlayHiddenByUser) {
    isOverlayHiddenByUser = changes.isOverlayHiddenByUser.newValue;
    const activeLine = document.querySelector('.yt-translator-active-line');
    if (activeLine) {
      activeLine.style.display = isOverlayHiddenByUser ? 'none' : 'block';
    }
    const btn = document.querySelector('.yt-translator-toggle-button');
    if (btn) {
      btn.title = isOverlayHiddenByUser ? 'Translation Subtitle (Off)' : 'Translation Subtitle (On)';
    }
    updateNativeCaptionVisibility();
  }
  if (changes.apiKey) geminiApiKey = changes.apiKey.newValue || YT_FALLBACK_API_KEY;
  if (changes.useMultiKeys) useMultiKeys = changes.useMultiKeys.newValue;
  if (changes.geminiApiKeys) geminiApiKeys = changes.geminiApiKeys.newValue;
  if (changes.geminiModel) geminiModel = ytNormalizeModelName(changes.geminiModel.newValue);
  if (changes.modelName && !changes.geminiModel) {
    chrome.storage.local.get(['geminiModel'], (r) => {
      geminiModel = ytNormalizeModelName((r && r.geminiModel) || changes.modelName.newValue || geminiModel);
    });
  }
  if (changes.geminiThinkingLevel) geminiThinkingLevel = changes.geminiThinkingLevel.newValue;
  if (changes.thinkingLevel && !changes.geminiThinkingLevel) {
    chrome.storage.local.get(['geminiThinkingLevel'], (r) => {
      geminiThinkingLevel = (r && r.geminiThinkingLevel) || (changes.thinkingLevel.newValue || geminiThinkingLevel);
    });
  }
  if (changes.ytCommentsEnabled) {
    ytCommentsEnabled = changes.ytCommentsEnabled.newValue !== false;
    if (ytCommentsEnabled) {
      ytCommentsScheduleScan(0);
    } else {
      ytCommentsTeardown();
    }
  }
  if (changes.autoTranslate) {
    autoTranslate = changes.autoTranslate.newValue;
  }
  if (changes.autoSaveTranslation) {
    autoSaveTranslation = changes.autoSaveTranslation.newValue;
  }
  
  if (changes.fontSize) {
    fontSize = changes.fontSize.newValue;
    const player = document.querySelector('.html5-video-player');
    if (player) {
      updateResponsiveFontSize(player.clientWidth);
    }
  }
  if (changes.styleShadow) {
    styleShadow = changes.styleShadow.newValue;
    updateSubtitleClasses();
  }
  if (changes.styleBox) {
    styleBox = changes.styleBox.newValue;
    updateSubtitleClasses();
    applyDynamicSubtitleStyles();
  }
  if (changes.styleOutline) {
    styleOutline = changes.styleOutline.newValue;
    updateSubtitleClasses();
  }
  if (changes.subtitleBgOpacity) {
    subtitleBgOpacity = changes.subtitleBgOpacity.newValue;
    applyDynamicSubtitleStyles();
  }
  if (changes.subtitleBgColor) {
    subtitleBgColor = changes.subtitleBgColor.newValue;
    applyDynamicSubtitleStyles();
  }
if (changes.filterExtraExplanations) {
    filterExtraExplanations = changes.filterExtraExplanations.newValue;
    if (activeTrack && (autoTranslate || translatedSubtitles.length > 0)) {
      loadAndTranslateSubtitles();
    }
  }
  if (changes.translationParts) {
    translationParts = Math.min(6, Math.max(1, Number(changes.translationParts.newValue) || 3));
    if (activeTrack && (autoTranslate || translatedSubtitles.length > 0)) {
      loadAndTranslateSubtitles();
    }
  }
  if (changes.subtitleFontColor) {
    subtitleFontColor = changes.subtitleFontColor.newValue;
    applyDynamicSubtitleStyles();
  }
  if (changes.subtitleFontWeight) {
    subtitleFontWeight = changes.subtitleFontWeight.newValue;
    applyDynamicSubtitleStyles();
  }

  updatePanelUI();
});

function onVideoLoadStart() {
  subtitleLoadToken += 1;
  resetSubtitleState();
  updatePanelUI();
}

function hexToRgba(hex, opacity) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

function updateSubtitleClasses() {
  if (!subtitleTextElement) return;
  subtitleTextElement.classList.toggle('style-shadow', styleShadow);
  subtitleTextElement.classList.toggle('style-box', styleBox);
  subtitleTextElement.classList.toggle('style-outline', styleOutline);
}

// Helper: Apply dynamic subtitle styles (color, weight, opacity)
function applyDynamicSubtitleStyles() {
  if (!subtitleTextElement) return;
  subtitleTextElement.style.color = subtitleFontColor;
  subtitleTextElement.style.fontWeight = subtitleFontWeight;
  if (styleBox) {
    subtitleTextElement.style.backgroundColor = hexToRgba(subtitleBgColor, subtitleBgOpacity);
  } else {
    subtitleTextElement.style.backgroundColor = '';
  }
}

// 3. Subtitle timing and rendering player
function initSubtitlePlayer() {
  // Find or create elements
  const player = document.querySelector('.html5-video-player');
  if (!player) return;

  // Load Google Fonts (Outfit) if not present
  if (!document.getElementById('yt-translator-fonts')) {
    const fontLink1 = document.createElement('link');
    fontLink1.rel = 'preconnect';
    fontLink1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(fontLink1);

    const fontLink2 = document.createElement('link');
    fontLink2.rel = 'preconnect';
    fontLink2.href = 'https://fonts.gstatic.com';
    fontLink2.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink2);

    const fontLink3 = document.createElement('link');
    fontLink3.id = 'yt-translator-fonts';
    fontLink3.rel = 'stylesheet';
    fontLink3.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(fontLink3);
  }

  // Render Subtitles Overlay
  if (!document.getElementById('netflix-subtitles-overlay')) {
    subtitleOverlay = document.createElement('div');
    subtitleOverlay.id = 'netflix-subtitles-overlay';
    
    subtitleTextElement = document.createElement('div');
    subtitleTextElement.className = 'netflix-subtitle-text';
    updateSubtitleClasses();
    subtitleTextElement.style.fontSize = `${fontSize}px`;
    applyDynamicSubtitleStyles();
    
    subtitleOverlay.appendChild(subtitleTextElement);
    player.appendChild(subtitleOverlay);
  } else {
    subtitleOverlay = document.getElementById('netflix-subtitles-overlay');
    subtitleTextElement = subtitleOverlay.querySelector('.netflix-subtitle-text');
    if (subtitleOverlay.parentElement !== player) {
      player.appendChild(subtitleOverlay);
    }
  }

  // Floating Controls Panel is disabled inside video. Managed via extension popup.
  floatPanel = null;

  // Hook Video Element
  const video = player.querySelector('video');
  if (video && activeVideo !== video) {
    if (activeVideo) {
      activeVideo.removeEventListener('timeupdate', onVideoTimeUpdate);
      activeVideo.removeEventListener('loadstart', onVideoLoadStart);
      activeVideo.removeEventListener('emptied', onVideoLoadStart);
    }
    activeVideo = video;
    activeVideo.addEventListener('timeupdate', onVideoTimeUpdate);
    activeVideo.addEventListener('loadstart', onVideoLoadStart);
    activeVideo.addEventListener('emptied', onVideoLoadStart);
  }

  // Adjust Subtitle Height on player controls hover (Observation)
  setupControlsObserver(player);

  // Setup ResizeObserver to scale font size responsively
  setupResizeObserver(player);

  // Update elements to match state
  updatePanelUI();

  // Inject custom show/hide toggle button in player controls
  injectToggleButton();
}

// Toggle layout height depending on control bar visibility
function setupControlsObserver(player) {
  if (observedControlsPlayer === player && controlsObserver) {
    return;
  }

  if (controlsObserver) {
    controlsObserver.disconnect();
  }

  observedControlsPlayer = player;
  controlsObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const isControlsVisible = !player.classList.contains('ytp-autohide');
        if (subtitleOverlay) {
          if (isControlsVisible) {
            // Push subtitle up above player controls
            subtitleOverlay.style.bottom = '15%';
          } else {
            // Return to standard netflix bottom position
            subtitleOverlay.style.bottom = '10%';
          }
        }
      }
    });
  });
  controlsObserver.observe(player, { attributes: true, attributeFilter: ['class'] });
}

function setupResizeObserver(player) {
  if (playerResizeObserver) {
    playerResizeObserver.disconnect();
  }

  playerResizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      const width = entry.contentRect.width;
      if (width > 0) {
        updateResponsiveFontSize(width);
      }
    }
  });

  playerResizeObserver.observe(player);
  updateResponsiveFontSize(player.clientWidth);
}

function checkTheaterMode() {
  const watchFlexy = document.querySelector('ytd-watch-flexy');
  const isTheaterAttr = watchFlexy ? watchFlexy.hasAttribute('theater') : false;
  
  const player = document.querySelector('.html5-video-player');
  const isTheaterClass = player ? (player.classList.contains('ytp-theater-mode') || player.classList.contains('yp-theater-mode')) : false;

  const isFullscreen = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
  return (isTheaterAttr || isTheaterClass) && !isFullscreen;
}

function updateResponsiveFontSize(playerWidth) {
  if (!subtitleTextElement) return;
  
  let baseSize = fontSize;
  if (checkTheaterMode()) {
    baseSize = Math.round(fontSize * 0.65); // 35% smaller
  }
  
  const scaledSize = Math.max(14, Math.round((baseSize / 850) * playerWidth));
  subtitleTextElement.style.fontSize = `${scaledSize}px`;
}


function setOverlayText(text) {
  const player = document.querySelector('.html5-video-player');
  if (!player) return;

  // Make sure elements exist and are attached
  if (!document.getElementById('netflix-subtitles-overlay') || !subtitleTextElement) {
    initSubtitlePlayer();
  }

  if (!subtitleTextElement) return;

  subtitleTextElement.textContent = text || '';
  subtitleOverlay = subtitleOverlay || document.getElementById('netflix-subtitles-overlay');

  if (subtitleOverlay) {
    if (subtitleOverlay.parentElement !== player) {
      player.appendChild(subtitleOverlay);
    }
    subtitleOverlay.style.display = (text && !isOverlayHiddenByUser) ? 'flex' : 'none';
    subtitleOverlay.style.opacity = '1';
    subtitleOverlay.style.visibility = 'visible';
  }

  if (text) {
    subtitleTextElement.style.opacity = '1';
    subtitleTextElement.style.visibility = 'visible';
  }
}



function escapeHTML(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

// Update floating panel items
function updatePanelUI() {
  if (availableTracks.length > 0) {
    const selectedIndex = activeTrackIndex >= 0 && activeTrackIndex < availableTracks.length
      ? activeTrackIndex
      : 0;
    activeTrackIndex = selectedIndex;
    activeTrack = availableTracks[selectedIndex];
  } else {
    if (currentStatusText === 'Preparing...' || !currentStatusText) {
      setPanelStatus(tracksLoaded ? 'Subtitles not found' : 'Searching subtitle sources');
    }
  }

  if (!floatPanel) return;

  // Language mapping
  const langName = LANG_MAP[targetLanguage] || targetLanguage.toUpperCase();
  if (targetLangText) targetLangText.textContent = langName;

  // Method Text
  if (engineInfoText) {
    engineInfoText.textContent = 'Gemini AI';
  }

  // Gemini action display
  const geminiBlock = document.getElementById('yt-translator-gemini-action-block');
  if (geminiBlock) {
    geminiBlock.classList.remove('hidden');
  }

  if (sourceSelect) {
    if (availableTracks.length === 0) {
      sourceSelect.innerHTML = `<option value="">${tracksLoaded ? 'No Subtitles' : 'Searching subtitles...'}</option>`;
      sourceSelect.value = "";
      if (!statusTextElement?.textContent || statusTextElement.textContent === 'Preparing...') {
        setPanelStatus(tracksLoaded ? 'Subtitles not found' : 'Searching subtitle sources');
      }
      return;
    }

    const selectedIndex = activeTrackIndex >= 0 && activeTrackIndex < availableTracks.length
      ? activeTrackIndex
      : 0;

    sourceSelect.innerHTML = availableTracks.map((track, idx) => {
      const label = track.name?.simpleText || track.languageCode || `Subtitle ${idx + 1}`;
      return `<option value="${idx}">${escapeHTML(label)}</option>`;
    }).join('');

    sourceSelect.value = String(selectedIndex);
    activeTrackIndex = selectedIndex;
    activeTrack = availableTracks[selectedIndex];
  }
}

// 5. Video Playback Subtitle Display
function onVideoTimeUpdate() {


  if (!extensionEnabled || !activeVideo || translatedSubtitles.length === 0) {
    if (subtitleTextElement) subtitleTextElement.textContent = "";
    updateNativeCaptionVisibility();
    return;
  }

const timeMs = activeVideo.currentTime * 1000;
  let match = null;

  if (currentSubtitleIndex >= 0) {
    const current = translatedSubtitles[currentSubtitleIndex];
    if (current && timeMs >= current.start && timeMs < current.start + current.duration) {
      match = current;
    }
  }

  if (!match) {
    // Altyazilar baslangica gore sirali. Uzun videolarda dogrusal tarama her
    // karede binlerce satiri gezer; ikili arama + kisa cakisma taramasi yeterli.
    // Cakisan satirlarda (otomatik altyazilarda yaygin) en son baslayani
    // tercih et ki eski metin yeni satirin ustunde takili kalmasin.
    const n = translatedSubtitles.length;
    let lo = 0, hi = n - 1, found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const sub = translatedSubtitles[mid];
      if (timeMs < sub.start) hi = mid - 1;
      else if (timeMs >= sub.start + sub.duration) lo = mid + 1;
      else { found = mid; break; }
    }
    let bestIndex = found;
    if (found >= 0) {
      for (let j = found + 1; j < n; j++) {
        const sub = translatedSubtitles[j];
        if (sub.start > timeMs) break;
        if (timeMs < sub.start + sub.duration && sub.start >= translatedSubtitles[bestIndex].start) bestIndex = j;
      }
    }
    currentSubtitleIndex = bestIndex;
    match = bestIndex >= 0 ? translatedSubtitles[bestIndex] : null;
  }

  if (match) {
    if (subtitleTextElement.textContent !== match.translatedText) {
      setOverlayText(match.translatedText);
    }
  } else {
    if (subtitleTextElement.textContent !== "") {
      setOverlayText("");
      updateNativeCaptionVisibility();
    }
  }
}

// Helper to construct a clean JSON3 subtitle URL
function getJSONSubtitleUrl(baseUrl) {
  if (!baseUrl) return '';
  const cleanBase = decodeHTMLEntities(String(baseUrl))
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/');
  try {
    const urlObj = new URL(cleanBase);
    urlObj.searchParams.set('fmt', 'json3');
    return urlObj.toString();
  } catch (e) {
    let url = cleanBase;
    if (url.includes('fmt=')) {
      url = url.replace(/fmt=[a-zA-Z0-9]+/g, 'fmt=json3');
    } else {
      url = url.includes('?') ? `${url}&fmt=json3` : `${url}?fmt=json3`;
    }
    return url;
  }
}

// Fallback XML subtitle parser mapping XML to standard JSON3 events format
function parseXMLSubtitles(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const textNodes = xmlDoc.getElementsByTagName('text');

  if (textNodes.length > 0) {
    const events = Array.from(textNodes).map((node) => {
      const start = parseFloat(node.getAttribute('start') || '0') * 1000;
      const duration = parseFloat(node.getAttribute('dur') || '0') * 1000;
      const text = decodeHTMLEntities(node.textContent || '');

      return {
        tStartMs: Math.round(start),
        dDurationMs: Math.round(duration),
        segs: [{ utf8: text }]
      };
    });

    return { events };
  }

  const paragraphNodes = xmlDoc.getElementsByTagName('p');
  const events = Array.from(paragraphNodes).map((node, index, nodes) => {
    const start = parseFloat(node.getAttribute('t') || '0');
    let duration = parseFloat(node.getAttribute('d') || '0');
    if (!duration && nodes[index + 1]) {
      const nextStart = parseFloat(nodes[index + 1].getAttribute('t') || '0');
      duration = Math.max(0, nextStart - start);
    }

    const text = decodeHTMLEntities(node.textContent || '').trim();

    return {
      tStartMs: Math.round(start),
      dDurationMs: Math.round(duration || 1500),
      segs: [{ utf8: text }]
    };
  });

  return { events };
}

// Safe HTML Entity decoder
function decodeHTMLEntities(text) {
  if (!text) return "";
  const entities = {
    'amp': '&',
    'lt': '<',
    'gt': '>',
    'quot': '"',
    'apos': "'",
    '#39': "'"
  };
  return text.replace(/&([^;]+);/g, (match, entity) => {
    if (entities[entity]) {
      return entities[entity];
    }
    if (entity.startsWith('#')) {
      const code = entity.startsWith('#x') 
        ? parseInt(entity.slice(2), 16) 
        : parseInt(entity.slice(1), 10);
      if (!isNaN(code)) {
        return String.fromCharCode(code);
      }
    }
    return match;
  });
}

function filterSubtitleExplanations(text) {
  if (!text) return "";
  // Remove any text in square brackets [like this] since they are always sound/music/action descriptions
  let cleaned = text.replace(/\[[^\]]+\]/g, '');

  // Now handle text in parentheses (like this)
  cleaned = cleaned.replace(/\([^)]+\)/g, (match) => {
    const content = match.slice(1, -1).trim().toLowerCase();
    
    // If the parenthesized text is the entire line (excluding whitespace), remove it
    if (text.trim() === match.trim()) {
      return "";
    }
    
    // Known action/sound words or stems
    const soundIndicators = [
      'music', 'laughter', 'applause', 'coughing', 'giggle', 'sigh', 
      'throat', 'chuckle', 'whisper', 'scream', 'gasp', 'snort', 'grunt',
      'müzik', 'alkış', 'gülüş', 'öksür', 'iç çek', 'fısıltı', 'çığlık',
      'nefes', 'gülümse', 'sessizlik', 'şarkı', 'esne', 'bağır', 'hıçkır',
      'melodi', 'sesler'
    ];
    
    if (soundIndicators.some(word => content.includes(word))) {
      return "";
    }
    
    return match;
  });

  return cleaned.replace(/\s+/g, ' ').trim();
}

// 6. Fetch Subtitle Track and run translation logic
let fetchRequestCounter = 0;
const pendingSubtitleFetches = new Map();

function fetchSubtitlesViaBackground(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'YT_TRANSLATOR_FETCH_TEXT', url }, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      if (response?.success) {
        const text = response.text || '';
        if (text.trim() !== '') {
          resolve(text);
        } else {
          reject(new Error('Altyazı endpointi boş döndü.'));
        }
      } else {
        reject(new Error(response?.error || 'Altyazi dosyasi alinamadi veya bos.'));
      }
    });
  });
}

function fetchSubtitlesViaInject(url) {
  return new Promise((resolve, reject) => {
    const requestId = `sub-${Date.now()}-${fetchRequestCounter += 1}`;
    const timeout = setTimeout(() => {
      pendingSubtitleFetches.delete(requestId);
      reject(new Error("Altyazi dosyasi indirilemedi (zaman asimi)."));
    }, 12000);

    pendingSubtitleFetches.set(requestId, { resolve, reject, timeout });
    window.postMessage({
      type: 'YT_TRANSLATOR_FETCH_SUBTITLES',
      requestId,
      url
    }, '*');
  });
}

async function fetchSubtitleText(url) {
  let backgroundError = null;

  try {
    const text = await fetchSubtitlesViaBackground(url);
    if (!text || text.trim() === '') throw new Error('Altyazı endpointi boş döndü.');
    return text;
  } catch (err) {
    backgroundError = err;
  }

  try {
    const text = await fetchSubtitlesViaInject(url);
    if (!text || text.trim() === '') throw new Error('Altyazı endpointi boş döndü.');
    return text;
  } catch (injectError) {
    const detail = injectError?.message || backgroundError?.message || 'Bilinmeyen hata.';
    throw new Error(`Altyazı dosyası alınamadı: ${detail}`);
  }
}

function fetchJSONViaBackground(url, options = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'YT_TRANSLATOR_FETCH_JSON',
      url,
      method: options.method,
      headers: options.headers,
      body: options.body
    }, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      if (response?.success) {
        resolve(response.json);
      } else {
        reject(new Error(response?.error || 'Istek basarisiz oldu.'));
      }
    });
  });
}

function parseSubtitleResponse(text) {
  if (!text || text.trim() === "") {
    throw new Error("Secilen altyazi kanali bos veya veri icermiyor.");
  }

  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    if (trimmed.startsWith('<')) {
      return parseXMLSubtitles(trimmed);
    }

    throw new Error("Altyazi formati cozulemedi.");
  }
}

function normalizeSubtitleEvents(data) {
  if (!data.events || data.events.length === 0) {
    throw new Error("Boş altyazı dosyası: bu kanal boş döndü. Kaynak olarak orijinal dili (örn. İngilizce) seçin.");
  }

  // Auto-generated (ASR) captions pack several timed segments into one event.
  // Each segment has its own tOffsetMs relative to the event start. Merging
  // them into a single line shown from the event start makes text appear too
  // early (the "shift" users see). Explode segments so every piece of text is
  // timed exactly like YouTube's own player, then re-group word fragments
  // into readable sentence-level cues (see merge below).
  const entries = [];
  let sawTimedSegs = false;
  data.events.forEach((e) => {
    const segs = e.segs || [];
    if (segs.length === 0) return;
    const eventStart = Number(e.tStartMs || 0);
    const eventEnd = eventStart + Math.max(0, Number(e.dDurationMs || 0));

    const hasTimedSegs = segs.some((s) => s.tOffsetMs !== undefined);
    if (hasTimedSegs) sawTimedSegs = true;

    if (!hasTimedSegs) {
      // Manual captions: one entry per event, full text.
      const text = segs.map((s) => s.utf8 || '').join('').trim();
      if (text) entries.push({ start: eventStart, eventEnd, text });
      return;
    }

    // Timed segments: each becomes its own entry. Untimed segments (rare)
    // join the following timed segment, or the previous one if trailing.
    let buffer = '';
    let lastEntry = null;
    segs.forEach((seg) => {
      const segText = seg.utf8 || '';
      if (seg.tOffsetMs !== undefined) {
        const start = eventStart + Number(seg.tOffsetMs);
        const text = (buffer + segText).trim();
        buffer = '';
        if (text) {
          lastEntry = { start, eventEnd, text };
          entries.push(lastEntry);
        }
      } else {
        buffer += segText;
      }
    });
    if (buffer.trim()) {
      if (lastEntry) {
        lastEntry.text += ' ' + buffer.trim();
      } else {
        entries.push({ start: eventStart, eventEnd, text: buffer.trim() });
      }
    }
  });

  if (entries.length === 0) {
    throw new Error("Altyazi satiri bulunamadi.");
  }

  entries.sort((a, b) => a.start - b.start);

  // Auto-generated captions arrive as word/word-fragment level timings.
  // Showing them 1:1 flashes a single word every second. Group them into
  // sentence-level cues so the overlay reads like a normal subtitle.
  // Manual captions are already sentence-level, leave them untouched.
  let timedEntries = entries;
  let isMerged = false;
  if (sawTimedSegs && ytLooksFragmented(entries)) {
    const merged = ytMergeWordFragments(entries);
    if (merged.length > 0) {
      timedEntries = merged;
      isMerged = true;
    }
  }

  // Derive durations from the next entry's start. This stays accurate even
  // when dDurationMs is missing/zero and prevents stale text overlapping
  // into the following line. Fall back to the containing event's end.
  // Merged sentence cues stay on screen longer to remain readable.
  const MIN_DURATION = isMerged ? 1400 : 400;
  const MAX_DURATION = isMerged ? 7000 : 5000;

  const subtitles = timedEntries.map((entry, idx) => {
    const nextStart = idx + 1 < timedEntries.length ? timedEntries[idx + 1].start : entry.eventEnd;
    let duration = Math.min(nextStart - entry.start, entry.eventEnd - entry.start);
    if (!isFinite(duration) || duration <= 0) duration = isMerged ? 2500 : 1500;
    duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, duration));
    return {
      id: idx,
      start: entry.start,
      duration,
      text: entry.text
    };
  });

  return subtitles;
}

function ytCountWords(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean).length;
}

function ytEndsSentence(s) {
  return /[.?!…]+["'”’)\]]?\s*$/.test(String(s || '').trim());
}

// Word-level ASR parçalarını cümle seviyesinde grupla. Karar metni,
// boşluk (sessizlik), cümle sonu noktası ve maksimum uzunluk/pencereye
// göre verilir; noktasız ASR metinlerinde bile ~12-18 kelimelik
// okunabilir bloklar üretilir.
function ytMergeWordFragments(entries) {
  const GAP_BREAK_MS = 900;
  const MAX_CHARS = 120;
  const MAX_WORDS = 18;
  const MAX_WINDOW_MS = 5000;
  const merged = [];
  let curText = '';
  let curStart = 0;
  let curEventEnd = 0;

  const flush = () => {
    if (curText) {
      merged.push({ start: curStart, eventEnd: curEventEnd, text: curText });
      curText = '';
    }
  };

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const piece = String(e.text || '').replace(/\s+/g, ' ').trim();
    if (!piece) continue;
    if (!curText) {
      curText = piece;
      curStart = e.start;
      curEventEnd = e.eventEnd;
    } else {
      curText = (curText + ' ' + piece).replace(/\s+/g, ' ').trim();
      if (e.eventEnd > curEventEnd) curEventEnd = e.eventEnd;
    }

    const next = entries[i + 1];
    const nextGap = next ? (next.start - e.start) : Infinity;
    const windowMs = e.start - curStart;
    const words = ytCountWords(curText);
    const endsSentence = ytEndsSentence(curText);
    const tooLong = curText.length >= MAX_CHARS || words >= MAX_WORDS || windowMs >= MAX_WINDOW_MS;
    const pauseBreak = nextGap >= GAP_BREAK_MS;

    if (tooLong) {
      flush();
    } else if (endsSentence && (words >= 4 || curText.length >= 20 || pauseBreak || !next)) {
      flush();
    } else if (pauseBreak && (words >= 6 || curText.length >= 35)) {
      flush();
    } else if (!next) {
      flush();
    }
  }
  if (curText) flush();
  // Kuyrukta tek başına kalan 1-3 kelimelik parçayı önceki cümleye kat.
  if (merged.length >= 2) {
    const last = merged[merged.length - 1];
    if (last.text.length < 30 && ytCountWords(last.text) < 4) {
      const prev = merged[merged.length - 2];
      prev.text = (prev.text + ' ' + last.text).replace(/\s+/g, ' ').trim();
      if (last.eventEnd > prev.eventEnd) prev.eventEnd = last.eventEnd;
      merged.pop();
    }
  }
  return merged.length ? merged : entries;
}

// Heuristic: entry başına düşen ortalama kelime/karakter çok düşükse
// bu liste kelime-parça seviyesindedir ve birleştirilmelidir.
function ytLooksFragmented(entries) {
  if (!entries || entries.length < 10) return false;
  const sample = entries.slice(0, Math.min(entries.length, 200));
  let chars = 0;
  let words = 0;
  sample.forEach((e) => {
    const t = String(e.text || '').trim();
    chars += t.length;
    words += ytCountWords(t);
  });
  const avgChars = chars / sample.length;
  const avgWords = words / sample.length;
  return avgChars < 28 || avgWords < 5;
}

// Eski önbellekler kelime seviyesinde kaydedilmiş olabilir. Yeniden
// çevirmeye gerek kalmadan aynı cümle gruplamasını çeviriye uygula.
function ytIsFragmentedCache(subs) {
  if (!subs || subs.length < 20) return false;
  const sample = subs.slice(0, Math.min(subs.length, 200));
  let chars = 0;
  let dur = 0;
  sample.forEach((s) => {
    chars += String(s.translatedText || s.text || '').length;
    dur += Number(s.duration || 0);
  });
  return (chars / sample.length) < 35 && (dur / sample.length) < 1100;
}

function ytMergeFragmentedCache(subs) {
  const asEntries = subs.map((s) => ({
    start: Number(s.start || 0),
    eventEnd: Number(s.start || 0) + Math.max(0, Number(s.duration || 0)),
    text: String(s.translatedText || s.text || ''),
    orig: s
  }));
  const groups = [];
  const GAP_BREAK_MS = 900;
  const MAX_CHARS = 120;
  const MAX_WORDS = 18;
  const MAX_WINDOW_MS = 5000;
  let cur = null; // { start, eventEnd, tParts:[], oParts:[] , lastRawStart }
  const flushCur = () => {
    if (cur && cur.tParts.length) groups.push(cur);
    cur = null;
  };
  for (let i = 0; i < asEntries.length; i++) {
    const e = asEntries[i];
    const tPiece = e.text.replace(/\s+/g, ' ').trim();
    if (!tPiece) continue;
    const oPiece = String(e.orig.text || '').replace(/\s+/g, ' ').trim();
    if (!cur) {
      cur = { start: e.start, eventEnd: e.eventEnd, tParts: [tPiece], oParts: oPiece ? [oPiece] : [], lastRawStart: e.start };
    } else {
      cur.tParts.push(tPiece);
      if (oPiece) cur.oParts.push(oPiece);
      if (e.eventEnd > cur.eventEnd) cur.eventEnd = e.eventEnd;
      cur.lastRawStart = e.start;
    }
    const joined = cur.tParts.join(' ');
    const words = ytCountWords(joined);
    const next = asEntries[i + 1];
    const nextGap = next ? (next.start - e.start) : Infinity;
    const windowMs = e.start - cur.start;
    const tooLong = joined.length >= MAX_CHARS || words >= MAX_WORDS || windowMs >= MAX_WINDOW_MS;
    if (tooLong) flushCur();
    else if (ytEndsSentence(joined) && (words >= 4 || joined.length >= 20 || nextGap >= GAP_BREAK_MS || !next)) flushCur();
    else if (nextGap >= GAP_BREAK_MS && (words >= 6 || joined.length >= 35)) flushCur();
    else if (!next) flushCur();
  }
  if (cur && cur.tParts.length) groups.push(cur);
  // Kuyrukta tek başına kalan 1-3 kelimelik parçayı önceki cümleye kat.
  if (groups.length >= 2) {
    const last = groups[groups.length - 1];
    if (last.tParts.join(' ').length < 30 && ytCountWords(last.tParts.join(' ')) < 4) {
      const prev = groups[groups.length - 2];
      prev.tParts.push(...last.tParts);
      prev.oParts.push(...last.oParts);
      if (last.eventEnd > prev.eventEnd) prev.eventEnd = last.eventEnd;
      groups.pop();
    }
  }
  if (!groups.length) return subs;
  return groups.map((g, idx) => {
    const nextStart = idx + 1 < groups.length ? groups[idx + 1].start : g.eventEnd;
    let duration = nextStart - g.start;
    if (!isFinite(duration) || duration <= 0) duration = 2500;
    duration = Math.min(7000, Math.max(1400, Math.min(duration, g.eventEnd - g.start || duration)));
    return {
      id: idx,
      start: g.start,
      duration,
      text: g.oParts.join(' ').replace(/\s+/g, ' ').trim(),
      translatedText: g.tParts.join(' ').replace(/\s+/g, ' ').trim()
    };
  });
}

let subtitleLoadRequestCounter = 0;
const pendingSubtitleLoadRequests = new Map();
let isSubtitleLoadRunning = false;

// Gercek olcumler: timedtext soguk istekte 20s, sonrakiler 120ms-3.3s.
// Onceki 6000ms esigi veriyi yolda atiyordu. Butce, inject tarafindaki
// en kotu senaryoyu kapsayacak sekilde secildi (capture beklemesi 3.5s +
// URL basina 12s timeout + birkac alternatif).
const SUBTITLE_LOAD_TIMEOUT_MS = 45000;
const SUBTITLE_LOAD_BUDGET_MS = 90000;

function loadSubtitleTrackViaInject(track, videoId) {
  return new Promise((resolve, reject) => {
    const requestId = `sub-load-${Date.now()}-${subtitleLoadRequestCounter += 1}`;
    const timeout = setTimeout(() => {
      pendingSubtitleLoadRequests.delete(requestId);
      reject(new Error("Altyazı dosyası alınamadı (zaman aşımı)."));
    }, SUBTITLE_LOAD_TIMEOUT_MS);

    pendingSubtitleLoadRequests.set(requestId, { resolve, reject, timeout });
    window.postMessage({
      type: 'YT_TRANSLATOR_LOAD_SUBTITLE',
      requestId,
      track,
      videoId
    }, '*');
  });
}

async function readSubtitleTrack(track) {
  if (!track?.baseUrl) {
    throw new Error("Altyazı indirme adresi bulunamadı.");
  }

  const videoId = currentVideoId || new URLSearchParams(window.location.search).get('v');
  if (!videoId) {
    throw new Error("Video ID bulunamadı.");
  }

  try {
    const text = await loadSubtitleTrackViaInject(track, videoId);
    if (!text || text.trim() === '') {
      throw new Error('Altyazı endpointi boş döndü.');
    }
    return normalizeSubtitleEvents(parseSubtitleResponse(text));
  } catch (err) {
    throw new Error(err.message);
  }
}

function resetSubtitleState() {
  rawSubtitles = [];
  translatedSubtitles = [];
  currentSubtitleIndex = -1;
  isCachedTranslation = false;
  setOverlayText('');
  updateNativeCaptionVisibility();
}

// ===== TRANSLATION CACHE SYSTEM =====

function getCacheKey(videoId, targetLang, sourceLang) {
  return `cache_${videoId}_${targetLang}_${(sourceLang || '').split('-')[0].toLowerCase()}`;
}

function getVideoTitle() {
  try {
    const titleEl = document.querySelector('yt-formatted-string.style-scope.ytd-watch-metadata') ||
                    document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
                    document.querySelector('#title h1 yt-formatted-string') ||
                    document.querySelector('h1.title');
    return titleEl ? titleEl.textContent.trim() : (document.title || '').replace(' - YouTube', '').trim();
  } catch (e) {
    return (document.title || '').replace(' - YouTube', '').trim();
  }
}

function loadCachedTranslation(videoId, targetLang, sourceLang) {
  return new Promise((resolve) => {
    if (!chrome.runtime || !chrome.runtime.id) { resolve(null); return; }
    const key = getCacheKey(videoId, targetLang, sourceLang);
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) { resolve(null); return; }
      const cached = result[key];
      if (cached && Array.isArray(cached.translatedSubtitles) && cached.translatedSubtitles.length > 0) {
        resolve(cached);
      } else {
        resolve(null);
      }
    });
  });
}

function saveCachedTranslation(videoId, targetLang, sourceLang, subtitles, videoTitle) {
  if (!chrome.runtime || !chrome.runtime.id) return;
  const key = getCacheKey(videoId, targetLang, sourceLang);
  const cacheData = {
    videoId,
    videoTitle: videoTitle || getVideoTitle(),
    targetLang,
    sourceTrackLang: (sourceLang || '').split('-')[0].toLowerCase(),
    savedAt: Date.now(),
    subtitleCount: subtitles.length,
    translatedSubtitles: subtitles
  };
  const jsonStr = JSON.stringify(cacheData);
  cacheData.sizeBytes = new Blob([jsonStr]).size;

  // Save cache data and update index (en fazla 60 video; en eskiler atilir)
  chrome.storage.local.get(['cacheIndex'], (result) => {
    if (chrome.runtime.lastError) return;
    const index = result.cacheIndex || {};
    index[key] = {
      videoId: cacheData.videoId,
      videoTitle: cacheData.videoTitle,
      targetLang: cacheData.targetLang,
      sourceTrackLang: cacheData.sourceTrackLang,
      savedAt: cacheData.savedAt,
      sizeBytes: cacheData.sizeBytes,
      subtitleCount: cacheData.subtitleCount
    };
    const ordered = Object.keys(index).sort((a, b) => (index[a].savedAt || 0) - (index[b].savedAt || 0));
    const evicted = [];
    while (ordered.length > 60) {
      const k = ordered.shift();
      delete index[k];
      evicted.push(k);
    }
    const saveObj = { cacheIndex: index };
    saveObj[key] = cacheData;
    chrome.storage.local.set(saveObj, () => {
      if (evicted.length) {
        try { chrome.storage.local.remove(evicted); } catch (_) {}
      }
    });
  });
}

// ===== END TRANSLATION CACHE SYSTEM =====

function updateNativeCaptionVisibility() {
  if (!document.body) return;
  const shouldHideNative = extensionEnabled && (translatedSubtitles.length > 0) && !isOverlayHiddenByUser;
  document.body.classList.toggle('yt-translator-hide-native', shouldHideNative);

  if (subtitleOverlay) {
    const hasText = subtitleTextElement && subtitleTextElement.textContent !== "";
    subtitleOverlay.style.display = (hasText && !isOverlayHiddenByUser) ? 'flex' : 'none';
  }
}

function injectToggleButton() {
  const rightControls = document.querySelector('.ytp-right-controls');
  if (!rightControls) return;

  if (document.querySelector('.ytp-translator-toggle-button')) {
    const activeLine = document.querySelector('.yt-translator-active-line');
    if (activeLine) {
      activeLine.style.display = isOverlayHiddenByUser ? 'none' : 'block';
    }
    return;
  }

  const btn = document.createElement('button');
  btn.className = 'ytp-button ytp-translator-toggle-button';
  btn.style.display = 'inline-flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.style.verticalAlign = 'middle';
  btn.title = isOverlayHiddenByUser ? 'Translation Subtitle (Off)' : 'Translation Subtitle (On)';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 36 36');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M18.87,19.07 L16.33,16.56 L16.36,16.53 C18.1,14.59 19.34,12.36 20.07,10 L23,10 L23,8 L16,8 L16,6 L14,6 L14,8 L7,8 L7,9.99 L18.17,9.99 C17.5,11.92 16.44,13.75 15,15.35 C14.07,14.32 13.3,13.19 12.69,12 L10.69,12 C11.42,13.63 12.42,15.17 13.67,16.56 L8.58,21.58 L10,23 L15,18 L18.11,21.11 L18.87,19.07 Z M24.5,14 L22.5,14 L18,26 L20,26 L21.12,23 L25.87,23 L27,26 L29,26 L24.5,14 Z M21.88,21 L23.5,16.67 L25.12,21 L21.88,21 Z');
  path.setAttribute('fill', '#ffffff');
  svg.appendChild(path);

  const activeLine = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  activeLine.className = 'yt-translator-active-line';
  activeLine.setAttribute('x', '10');
  activeLine.setAttribute('y', '27');
  activeLine.setAttribute('width', '16');
  activeLine.setAttribute('height', '3');
  activeLine.setAttribute('fill', '#E50914');
  activeLine.style.display = isOverlayHiddenByUser ? 'none' : 'block';
  svg.appendChild(activeLine);

  btn.appendChild(svg);

  const settingsBtn = rightControls.querySelector('.ytp-settings-button');
  if (settingsBtn && settingsBtn.parentElement) {
    settingsBtn.parentElement.insertBefore(btn, settingsBtn);
  } else {
    rightControls.appendChild(btn);
  }

  btn.addEventListener('click', () => {
    isOverlayHiddenByUser = !isOverlayHiddenByUser;
    chrome.storage.local.set({ isOverlayHiddenByUser });
    
    activeLine.style.display = isOverlayHiddenByUser ? 'none' : 'block';
    btn.title = isOverlayHiddenByUser ? 'Translation Subtitle (Off)' : 'Translation Subtitle (On)';
    updateNativeCaptionVisibility();
  });
}

function selectTrackByPreference() {
  if (availableTracks.length === 0) {
    activeTrack = null;
    activeTrackIndex = -1;
    return;
  }

  if (preferredSourceLanguage && preferredSourceLanguage !== 'auto') {
    const prefClean = preferredSourceLanguage.toLowerCase();
    const foundIndex = availableTracks.findIndex(t => {
      const trackLangClean = (t.languageCode || '').split('-')[0].toLowerCase();
      return trackLangClean === prefClean;
    });

    if (foundIndex !== -1) {
      activeTrackIndex = foundIndex;
      activeTrack = availableTracks[foundIndex];
      return;
    }
  }

  // Otomatik modda YouTube'un otomatik çevirdiği sentetik kanalları
  // (tlang=...) en sona at: bunlar boş dönmeye meyillidir, kaynak
  // olarak her zaman orijinal kanal tercih edilir.
  const isAutoTranslated = (t) => !!t?.isAutoTranslated || /[?&]tlang=/.test(t?.baseUrl || '');
  const origIndex = availableTracks.findIndex(t => !isAutoTranslated(t));
  activeTrackIndex = origIndex !== -1 ? origIndex : 0;
  activeTrack = availableTracks[activeTrackIndex];
}

async function loadAndTranslateSubtitles(skipCache = false) {
  if (!activeTrack && availableTracks.length > 0) {
    selectTrackByPreference();
  }

  if (!activeTrack) return;

  isSubtitleLoadRunning = true;
  try {
    await ytRunSubtitleLoad(skipCache);
  } finally {
    isSubtitleLoadRunning = false;
  }
}

async function ytRunSubtitleLoad(skipCache) {
  const loadToken = ++subtitleLoadToken;
  showError(null);
  showProgress(true, "Altyazi aliniyor...");
  resetSubtitleState();
  setPanelStatus('Track URL alindi, altyazi indiriliyor');

  const tracksToTry = [
    activeTrack,
    ...availableTracks.filter((track) => track !== activeTrack)
  ];
  let lastError = null;
  const deadline = Date.now() + SUBTITLE_LOAD_BUDGET_MS;

  for (let i = 0; i < tracksToTry.length; i += 1) {
    const track = tracksToTry[i];
    if (Date.now() > deadline) {
      lastError = new Error("Altyazı indirme süresi aşıldı.");
      break;
    }
    // N kanal denenirken ekran "indiriliyor"de asili kalmasin.
    if (tracksToTry.length > 1) {
      const langLabel = track.languageCode || '?';
      setPanelStatus(`Altyazi indiriliyor (${i + 1}/${tracksToTry.length}: ${langLabel})`);
    }

    try {
      const subtitles = await readSubtitleTrack(track);
      if (loadToken !== subtitleLoadToken) return;

      rawSubtitles = subtitles;
      activeTrack = track;
      activeTrackIndex = Math.max(availableTracks.indexOf(track), 0);
      updatePanelUI();
      setPanelStatus(`${rawSubtitles.length} lines found`);

      const targetLangClean = (targetLanguage || '').split('-')[0].toLowerCase();
      const trackLangClean = (track.languageCode || '').split('-')[0].toLowerCase();

      if (targetLangClean === trackLangClean) {
        translatedSubtitles = [];
        currentSubtitleIndex = -1;
        isCachedTranslation = false;
        updateNativeCaptionVisibility();
        if (subtitleTextElement) subtitleTextElement.textContent = "";
        showProgress(false);
        setPanelStatus('Using original subtitles (Same language)');
        return;
      }

      // Check cache before calling AI (skip if manual re-translate)
      const cachedData = skipCache ? null : await loadCachedTranslation(currentVideoId, targetLanguage, track.languageCode);
      if (loadToken !== subtitleLoadToken) return;
      if (cachedData) {
        let cachedSubs = cachedData.translatedSubtitles;
        // Eski kelime-seviyesi önbellekleri cümle seviyesine yükselt.
        try {
          if (ytIsFragmentedCache(cachedSubs)) {
            const mergedCache = ytMergeFragmentedCache(cachedSubs);
            if (mergedCache && mergedCache.length) {
              cachedSubs = mergedCache;
              // Birleştirilmiş hali geri yaz ki bir dahaki sefere hazır gelsin.
              try {
                if (autoSaveTranslation && currentVideoId && track) {
                  saveCachedTranslation(currentVideoId, targetLanguage, track.languageCode, cachedSubs, getVideoTitle());
                }
              } catch (_) {}
            }
          }
        } catch (_) {}
        translatedSubtitles = cachedSubs;
        currentSubtitleIndex = -1;
        isCachedTranslation = true;
        updateNativeCaptionVisibility();
        onVideoTimeUpdate();
        showProgress(false);
        setPanelStatus(`Loaded from cache (${translatedSubtitles.length} lines)`);
        return;
      }

      const hasApiKey = (useMultiKeys && geminiApiKeys && geminiApiKeys.trim() !== '') || (!useMultiKeys && geminiApiKey && geminiApiKey.trim() !== '');
      if (hasApiKey) {
        await translateWithGemini(loadToken);
      } else {
        showProgress(false);
        setPanelStatus('Gemini API Key missing');
        showError("Please enter a valid Gemini API Key by clicking the extension icon.");
      }
      return;
    } catch (err) {
      lastError = err;
    }
  }

  if (loadToken !== subtitleLoadToken) return;
  resetSubtitleState();
  showProgress(false);
  setPanelStatus('Subtitle reading error');
  showError(lastError ? lastError.message : "Subtitles could not be loaded.");
}

function formatMsToTime(ms) {
  const totalSeconds = ms / 1000;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = (totalSeconds % 60).toFixed(2);
  
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${secs.padStart(5, '0')}`;
}

function splitSubtitlesIntoParts(subtitles, partCount) {
  if (partCount <= 1 || subtitles.length <= partCount) {
    return [subtitles];
  }
  const parts = [];
  const baseSize = Math.floor(subtitles.length / partCount);
  const remainder = subtitles.length % partCount;
  let startIdx = 0;
  for (let i = 0; i < partCount; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    parts.push(subtitles.slice(startIdx, startIdx + size));
    startIdx += size;
  }
  return parts.filter(p => p.length > 0);
}

// Orijinal-dil sızıntısı onarımı: modelin atladığı ya da hedef dile
// çevirmeden aynen geri verdiği satırları yakalayıp katı prompt ile
// tek seferlik bir onarım geçişinde tekrar çevirir.
function ytIsUntranslatedCopy(orig, trans) {
  const o = String(orig || '').trim();
  const t = String(trans || '').trim();
  if (!o || !t) return false;
  if (t.toLowerCase() !== o.toLowerCase()) return false;
  // Gerçek kelime içeren birebir kopyalar onarılmalı; sayı/sembol/
  // emoji gibi şeyler ile kısa ünlemler olduğu gibi bırakılır.
  return /[A-Za-zÇĞİÖŞÜçğıöşü]{3,}/.test(o);
}

async function ytGeminiJsonArray(loadToken, modelName, keysToTry, promptText) {
  const baseBody = {
    contents: [
      {
        parts: [
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      thinkingConfig: {
        thinkingLevel: geminiThinkingLevel
      },
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "INTEGER" },
            text: { type: "STRING" }
          },
          required: ["id", "text"]
        }
      },
      maxOutputTokens: 65536
    }
  };
  const bodies = [baseBody];
  const plainBody = JSON.parse(JSON.stringify(baseBody));
  delete plainBody.generationConfig.thinkingConfig;
  bodies.push(plainBody);

  const ytThinkingRejected = (msg) => {
    const m = msg || '';
    return m.includes('400') || /thinking/i.test(m);
  };

  let lastErr = null;
  for (let i = 0; i < keysToTry.length; i++) {
    if (loadToken !== subtitleLoadToken) throw new Error('cancelled');
    let keyFailed = false;
    for (let v = 0; v < bodies.length; v++) {
      try {
        const apiResponse = await fetchJSONViaBackground(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${keysToTry[i]}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodies[v])
        });

        if (loadToken !== subtitleLoadToken) throw new Error('cancelled');
        const part = apiResponse.candidates?.[0]?.content?.parts?.find(p => !p.thought);
        const rawText = part?.text;
        if (!rawText) throw new Error('Gemini AI returned empty response.');

        let arr;
        try {
          arr = JSON.parse(rawText.trim());
        } catch (_) {
          const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          arr = JSON.parse(cleaned);
        }
        if (!Array.isArray(arr)) throw new Error('API response format is not a valid array.');
        return arr;
      } catch (err) {
        if (err && err.message === 'cancelled') throw err;
        if (v < bodies.length - 1 && ytThinkingRejected(err.message)) {
          console.log('[YT Translator] thinking reddedildi, thinking olmadan tekrar deneniyor.');
          continue;
        }
        lastErr = err;
        keyFailed = true;
        break;
      }
    }
    void keyFailed;
  }
  throw lastErr || new Error('Tüm API anahtarları başarısız oldu.');
}

async function ytRepairUntranslatedLines(loadToken, entries, modelName, keysToTry, targetLangName) {
  const pending = entries.filter(e => e._repair);
  if (pending.length === 0) return;
  setPanelStatus(`Verifying ${pending.length} lines...`);

  const CHUNK = 150;
  for (let s = 0; s < pending.length; s += CHUNK) {
    if (loadToken !== subtitleLoadToken) return;
    const slice = pending.slice(s, s + CHUNK);
    const strictPrompt = `You are a subtitle translator. Translate EVERY line below into ${targetLangName}.\n\nSTRICT RULES:\n- Translate each "text" into natural, fluent ${targetLangName}. Do NOT summarize and do NOT skip lines.\n- NEVER copy the input text unchanged, UNLESS it is ONLY a proper noun, number, URL, emoji, hashtag or speaker label. Everything else MUST be translated.\n- Return ONLY a JSON array with the SAME "id" values: [{"id": 0, "text": "..."}]. Keep the item count EXACTLY ${slice.length}.\n\n${JSON.stringify(slice.map(e => ({ id: e.id, text: e.text })))}`;
    try {
      const arr = await ytGeminiJsonArray(loadToken, modelName, keysToTry, strictPrompt);
      if (loadToken !== subtitleLoadToken) return;
      const fixMap = new Map();
      arr.forEach(obj => {
        if (!obj) return;
        const idNum = typeof obj.id === 'number' ? obj.id : parseInt(obj.id, 10);
        if (!isNaN(idNum) && typeof obj.text === 'string') fixMap.set(idNum, obj.text);
      });
      slice.forEach(e => {
        if (fixMap.has(e.id)) {
          const fixed = String(fixMap.get(e.id)).trim();
          if (fixed !== '') e.translatedText = fixed;
          else if (e._wasMissing) e.translatedText = '';
        } else if (e._wasMissing) {
          e.translatedText = '';
        }
      });
      translatedSubtitles = [...entries].sort((a, b) => a.start - b.start || a.id - b.id);
      onVideoTimeUpdate();
      setPanelStatus(`Verified ${Math.min(s + CHUNK, pending.length)}/${pending.length} lines`);
    } catch (err) {
      if (err && err.message === 'cancelled') return;
      // Onarım isteği başarısızsa: eksikler boş kalır (sızıntı yok),
      // aynen-kopyalar korunur (çoğu özel isimdir).
      slice.forEach(e => {
        if (e._wasMissing) e.translatedText = '';
      });
    }
  }
}

// 8. Gemini AI Context-Aware Chunk Translator
async function translateWithGemini(loadToken) {
  showError(null);
  
  const keysToTry = [];
  if (useMultiKeys && geminiApiKeys) {
    const splitKeys = geminiApiKeys.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    keysToTry.push(...splitKeys);
  }
  if (keysToTry.length === 0 && geminiApiKey && geminiApiKey.trim() !== '') {
    keysToTry.push(geminiApiKey.trim());
  }

  if (keysToTry.length === 0) {
    showError("Please enter a valid Gemini API Key by clicking the extension icon.");
    setPanelStatus('Gemini API Key missing');
    return;
  }
  
  const modelName = ytNormalizeModelName(geminiModel);
  const targetLangName = LANG_MAP[targetLanguage] || targetLanguage.toUpperCase();
  let partCount = Math.min(6, Math.max(1, translationParts));
  // Otomatik altyazılar binlerce minik segmente patlayabilir; parça başına
  // çok satır düşmesi modelin satır atlamasına yol açar. Parça başına
  // ~350 satırı geçmeyecek şekilde parça sayısını otomatik artır.
  const YT_MAX_LINES_PER_PART = 350;
  if (rawSubtitles.length > partCount * YT_MAX_LINES_PER_PART) {
    partCount = Math.min(6, Math.ceil(rawSubtitles.length / YT_MAX_LINES_PER_PART));
  }
  const parts = splitSubtitlesIntoParts(rawSubtitles, partCount);
  updateProgress(0);
  setPanelStatus(`Starting Gemini translation (${modelName}) · ${parts.length} part${parts.length > 1 ? 's' : ''}`);
  showProgress(true, `Translating with ${modelName} (Part 1/${parts.length})...`);

  let lastError = null;
  let results = [];
  
  for (let p = 0; p < parts.length; p++) {
    const partSubtitles = parts[p];
    if (loadToken !== subtitleLoadToken) return;

    let promptInstructions = `Translate these subtitle lines into ${targetLangName}. Return ONLY the JSON array. Each object must have "id" (unchanged) and "text" (translated). Use timing context for natural translation. Return EVERY item with its original "id" — never skip, merge, split or reorder lines, even if a line looks trivial.`;

    if (filterExtraExplanations) {
      promptInstructions += `\n\nIMPORTANT: Do not translate, and completely remove/ignore any parenthetical descriptions of sounds, actions, music, or background noise, such as descriptions in parentheses (e.g., "(Laughter)", "(Everyone starts laughing)", "(Coughing)") or square brackets (e.g., "[Music]", "[Applause]"). Only translate the actual spoken dialogue.
However, DO NOT remove parenthesized text if it denotes a speaker's name associated with actual spoken dialogue (for example, in "(Gwang su) Evet.", "(Gwang su): Evet." or "(Gwang su) Yes.", keep the speaker name and dialogue). If a line consists only of action/sound descriptions (e.g. "(Laughter)"), return an empty string for the "text" property.`;
    }

    const prompt = `${promptInstructions}

This is part ${p + 1} of ${parts.length} of the full subtitle list.

${JSON.stringify(partSubtitles.map(b => ({
  id: b.id,
  start: formatMsToTime(b.start),
  duration: `${(b.duration / 1000).toFixed(1)}s`,
  text: b.text
})))}`;

    // Her key için önce thinking'li, thinking reddedilirse (400) thinking'siz dene
    const ytBaseBody = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        thinkingConfig: {
          thinkingLevel: geminiThinkingLevel
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "INTEGER" },
              text: { type: "STRING" }
            },
            required: ["id", "text"]
          }
        },
        maxOutputTokens: 65536
      }
    };
    const ytPlainBody = JSON.parse(JSON.stringify(ytBaseBody));
    delete ytPlainBody.generationConfig.thinkingConfig;
    const ytAttempts = [];
    keysToTry.forEach(k => {
      ytAttempts.push({ key: k, thinking: true });
      ytAttempts.push({ key: k, thinking: false });
    });

    let partDone = false;

    for (let a = 0; a < ytAttempts.length; a++) {
      const currentKey = ytAttempts[a].key;
      const useThinking = ytAttempts[a].thinking;
      const keyIdx = keysToTry.indexOf(currentKey);
      const keyDisplay = keysToTry.length > 1 ? ` (Key ${keyIdx + 1}/${keysToTry.length})` : '';
      if (loadToken !== subtitleLoadToken) return;
      setPanelStatus(`Translating part ${p + 1}/${parts.length}${keyDisplay}...`);
      showProgress(true, `Translating with ${modelName} (Part ${p + 1}/${parts.length})${keyDisplay}...`);

      try {
        const apiResponse = await fetchJSONViaBackground(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${currentKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(useThinking ? ytBaseBody : ytPlainBody)
        });

        if (loadToken !== subtitleLoadToken) return;
        const part = apiResponse.candidates?.[0]?.content?.parts?.find(p => !p.thought);
        const rawText = part?.text;
        
        if (!rawText) {
          const blockReason = apiResponse.candidates?.[0]?.finishReason;
          if (blockReason === 'SAFETY') {
            throw new Error(`Blocked by safety filter. Subtitle content rejected.`);
          }
          throw new Error(`Gemini AI returned empty response.`);
        }
        
        let translatedObjects = [];
        try {
          translatedObjects = JSON.parse(rawText.trim());
        } catch (parseErr) {
          const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          try {
            translatedObjects = JSON.parse(cleaned);
          } catch (e) {
            throw new Error(`API response could not be parsed as JSON.`);
          }
        }
        
        if (loadToken !== subtitleLoadToken) return;
        if (!Array.isArray(translatedObjects)) {
          throw new Error(`API response format is not a valid array.`);
        }
        
        const translationMap = new Map();
        translatedObjects.forEach(obj => {
          if (!obj) return;
          const idNum = typeof obj.id === 'number' ? obj.id : parseInt(obj.id, 10);
          if (!isNaN(idNum) && typeof obj.text === 'string') {
            translationMap.set(idNum, obj.text);
          }
        });

        partSubtitles.forEach((sub) => {
          // SIZINTI FİX: modelin atladığı id'lerde artık orijinal metne
          // sessizce düşme yok. Eksik satır boş bırakılır ve aşağıdaki
          // onarım geçişinde katı prompt ile tekrar çevrilir.
          const has = translationMap.has(sub.id);
          const t = has ? translationMap.get(sub.id) : '';
          const entry = {
            ...sub,
            translatedText: t
          };
          entry._wasMissing = !has;
          entry._repair = !has || ytIsUntranslatedCopy(sub.text, t);
          results.push(entry);
        });
        
        if (loadToken !== subtitleLoadToken) return;
        translatedSubtitles = [...results].sort((a, b) => a.start - b.start || a.id - b.id);
        currentSubtitleIndex = -1;
        isCachedTranslation = false;
        updateNativeCaptionVisibility();
        onVideoTimeUpdate();
        updateProgress(Math.floor(((p + 1) / parts.length) * 100));
        setPanelStatus(`Part ${p + 1}/${parts.length} translated (${translatedSubtitles.length} lines)`);
        partDone = true;
        break;
      } catch (fetchErr) {
        if (loadToken !== subtitleLoadToken) return;
        const rawMsg = fetchErr.message || '';
        const nextIsPlainFallback = useThinking && a + 1 < ytAttempts.length && ytAttempts[a + 1].key === currentKey && !ytAttempts[a + 1].thinking;
        if (nextIsPlainFallback && (rawMsg.includes('400') || /thinking/i.test(rawMsg))) {
          console.log(`[YT Translator] Part ${p + 1} thinking reddedildi, thinking olmadan tekrar deneniyor.`);
          setPanelStatus(`Model thinking desteklemiyor, sade modda tekrar deneniyor...`);
          continue;
        }
        if (nextIsPlainFallback) a++; // key hatasında thinking'siz kopyayı atla, direkt sonraki key
        let errMsg = rawMsg;
        if (errMsg.includes('400')) {
          errMsg = `API request invalid. Model name or settings might be incorrect. (${modelName})`;
        } else if (errMsg.includes('401') || errMsg.includes('403')) {
          errMsg = 'API key invalid or unauthorized. Please check the API key.';
        } else if (errMsg.includes('429')) {
          errMsg = 'Rate limit exceeded.';
        } else if (errMsg.includes('500') || errMsg.includes('503')) {
          errMsg = 'Gemini API server error.';
        }
        
        console.log(`[YT Translator] Part ${p + 1} Key ${keyIdx + 1} skipped: ${errMsg}`);
        lastError = new Error(errMsg);

        if (keyIdx < keysToTry.length - 1) {
          setPanelStatus(`Part ${p + 1}: Key ${keyIdx + 1} encountered error, trying next...`);
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    }

    if (!partDone) {
      if (loadToken !== subtitleLoadToken) return;
      showError(lastError ? `Part ${p + 1}/${parts.length} failed: ${lastError.message}` : `Part ${p + 1}/${parts.length} translation failed.`);
      showProgress(false);
      setPanelStatus(`Gemini translation error (Part ${p + 1}/${parts.length})`);
      return;
    }
  }

  if (loadToken !== subtitleLoadToken) return;
  // ONARIM GEÇİŞİ: eksik ya da çevrilmeden aynen kopyalanmış satırları
  // katı prompt ile tekrar çevir; orijinal dilin aralara karışmasını engelle.
  await ytRepairUntranslatedLines(loadToken, results, modelName, keysToTry, targetLangName);
  if (loadToken !== subtitleLoadToken) return;
  results.forEach((e) => { delete e._wasMissing; delete e._repair; });
  translatedSubtitles = [...results].sort((a, b) => a.start - b.start || a.id - b.id);
  currentSubtitleIndex = -1;
  isCachedTranslation = false;
  updateNativeCaptionVisibility();
  onVideoTimeUpdate();
  showProgress(false);
  setPanelStatus(`Ready: ${translatedSubtitles.length} lines translated (${modelName})`);
  
  // Auto-save to cache
  if (autoSaveTranslation && currentVideoId && activeTrack) {
    saveCachedTranslation(currentVideoId, targetLanguage, activeTrack.languageCode, translatedSubtitles, getVideoTitle());
  }
}

let currentStatusText = 'Preparing...';
let currentProgressPercent = 0;
let isProgressShowing = false;
let currentProgressText = '';
let currentErrorText = '';

function setPanelStatus(text) {
  currentStatusText = text;
  if (statusTextElement) {
    statusTextElement.textContent = text;
  }
}

// Helper: Show/Hide Progress block
function showProgress(show, text = "Translating...") {
  isProgressShowing = show;
  currentProgressText = text;
  if (!progressBlock) return;
  
  if (show) {
    progressBlock.classList.remove('hidden');
    progressBlock.querySelector('.progress-text span').textContent = text;
  } else {
    progressBlock.classList.add('hidden');
  }
}

// Helper: Update Progress values
function updateProgress(percent) {
  currentProgressPercent = percent;
  if (progressVal && progressFill) {
    progressVal.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
  }
}

// Helper: Show/Hide errors
function showError(msg) {
  currentErrorText = msg || '';
  if (!errorMsg) return;
  
  if (msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
  } else {
    errorMsg.classList.add('hidden');
  }
}

// 9. Initializer & Page state handlers
let initTimer = null;
let lastTrackRequestAt = 0;

function scheduleInit(delay = 0) {
  if (initTimer) {
    clearTimeout(initTimer);
  }

  initTimer = setTimeout(() => {
    initTimer = null;
    init();
  }, delay);
}

function requestCaptionTracks(force = false) {
  const now = Date.now();
  if (!force && now - lastTrackRequestAt < 3000) return;
  lastTrackRequestAt = now;
  window.postMessage({ type: 'YT_TRANSLATOR_REQUEST_TRACKS' }, '*');
}

function init() {
  // Prevent calling chrome APIs if extension context is invalidated
  if (!chrome.runtime || !chrome.runtime.id) {
    return;
  }

  if (!extensionEnabled) {
    setOverlayText('');
    if (floatPanel) floatPanel.classList.add('hidden');
    return;
  }

  if (window.location.pathname === '/watch') {
    initSubtitlePlayer();
    if (floatPanel) floatPanel.classList.remove('hidden');

    const videoId = new URLSearchParams(window.location.search).get('v');
    if (videoId && videoId !== currentVideoId) {
      currentVideoId = videoId;
      availableTracks = [];
      activeTrack = null;
      activeTrackIndex = -1;
      tracksSignature = '';
      tracksLoaded = false;
      lastTrackRequestAt = 0;
      subtitleLoadToken += 1;
      resetSubtitleState();
      updatePanelUI();
      requestCaptionTracks(true);
    } else if (videoId && availableTracks.length === 0) {
      requestCaptionTracks(false);
    }
  } else {
    setOverlayText('');
    if (floatPanel) floatPanel.classList.add('hidden');
  }
}

// Listen to tracks messages from inject.js
window.addEventListener('message', (event) => {
  if (!chrome.runtime || !chrome.runtime.id) return;
  
  if (event.data && event.data.type === 'YT_TRANSLATOR_LOAD_SUBTITLE_RESPONSE') {
    const { requestId, success, text, error } = event.data;
    const pending = pendingSubtitleLoadRequests.get(requestId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    pendingSubtitleLoadRequests.delete(requestId);

    if (success) {
      pending.resolve(text || '');
    } else {
      pending.reject(new Error(error || "Altyazı yüklenemedi."));
    }
  }
  
  if (event.data && event.data.type === 'YT_TRANSLATOR_FETCH_SUBTITLES_RESPONSE') {
    const { requestId, success, text, error } = event.data;
    const pending = pendingSubtitleFetches.get(requestId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    pendingSubtitleFetches.delete(requestId);

    if (success) {
      pending.resolve(text || '');
    } else {
      pending.reject(new Error(error || "Subtitle file could not be downloaded."));
    }
  }
  
  if (event.data && event.data.type === 'YT_TRANSLATOR_CAPTION_TRACKS') {
    const { tracks, videoId } = event.data;
    if (videoId === currentVideoId) {
      const nextTracks = (tracks || []).slice().sort((a, b) => {
        const at = (a?.isAutoTranslated || /[?&]tlang=/.test(a?.baseUrl || '')) ? 1 : 0;
        const bt = (b?.isAutoTranslated || /[?&]tlang=/.test(b?.baseUrl || '')) ? 1 : 0;
        return at - bt;
      });
      // baseUrl imzaya girmiyor: timedtext URL'lerindeki ei/expire/ip
      // parametreleri her /youtubei/v1/player yanitinda degisiyor. Onceden
      // imzada yer aldigindan her yenilenmede "yeni kanal listesi" sanilip
      // tum indirme yeniden baslatiliyordu ve ekran saatlerce
      // "altyazi indiriliyor"de asili kaliyordu.
      const nextSignature = nextTracks
        .map(t => `${t.languageCode || ''}:${t.kind || ''}:${t.name?.simpleText || ''}`)
        .join('|');
      const shouldReload = nextSignature !== tracksSignature || !activeTrack;

      tracksSignature = nextSignature;
      availableTracks = nextTracks;
      tracksLoaded = true;
      updatePanelUI();

      // Suren bir indirme varken otomatik yeniden baslatma: her kanal
      // listesi mesaji butceyi sifirlardi.
      if (availableTracks.length > 0 && shouldReload && !isSubtitleLoadRunning) {
        selectTrackByPreference();
        showError(null);
        if (autoTranslate) {
          loadAndTranslateSubtitles();
        } else {
          setPanelStatus('Ready to Translate (Start Manually)');
          updatePanelUI();
        }
      } else if (availableTracks.length === 0) {
        activeTrack = null;
        activeTrackIndex = -1;
        rawSubtitles = [];
        translatedSubtitles = [];
        currentSubtitleIndex = -1;
        setOverlayText('');
        setPanelStatus('No subtitles found in this video.');
      }
    }
  }
});

// Popup Communication Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!extensionEnabled) return false;

  if (message.type === 'GET_TRANSLATION_STATE') {
    sendResponse({
      availableTracks: availableTracks.map((t, idx) => {
        let label = t.name?.simpleText || t.languageCode || `Subtitle ${idx + 1}`;
        if ((t.isAutoTranslated || /[?&]tlang=/.test(t.baseUrl || '')) && !/otomatik çeviri/i.test(label)) {
          label += ' (otomatik çeviri)';
        }
        return { index: idx, label };
      }),
      activeTrackIndex: activeTrackIndex,
      translationEngine: translationEngine,
      statusText: currentStatusText,
      progressPercent: currentProgressPercent,
      isProgressShowing: isProgressShowing,
      progressText: currentProgressText,
      errorText: currentErrorText,
      hasTranslation: translatedSubtitles.length > 0,
      isCached: isCachedTranslation
    });
    return true;
  }

  if (message.type === 'SET_SOURCE_TRACK') {
    const idx = Number(message.index);
    if (!isNaN(idx) && idx >= 0 && idx < availableTracks.length) {
      activeTrackIndex = idx;
      activeTrack = availableTracks[idx];
      if (autoTranslate || translatedSubtitles.length > 0) {
        loadAndTranslateSubtitles();
      } else {
        resetSubtitleState();
        setPanelStatus('Ready to Translate (Start Manually)');
        updatePanelUI();
      }
    } else {
      activeTrack = null;
      activeTrackIndex = -1;
      resetSubtitleState();
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'START_TRANSLATION') {
    loadAndTranslateSubtitles(true);
    sendResponse({ success: true });
    return true;
  }

  return false;
});

window.addEventListener('yt-navigate-finish', () => { scheduleInit(250); ytCommentsScheduleScan(400); }, true);
window.addEventListener('yt-page-data-updated', () => { scheduleInit(250); ytCommentsScheduleScan(400); }, true);
window.addEventListener('popstate', () => { scheduleInit(250); ytCommentsScheduleScan(400); }, true);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { scheduleInit(0); ytCommentsScheduleScan(200); }
});

loadSettings(() => {
  init();
  setTimeout(() => scheduleInit(0), 750);
  ytCommentsBoot();
});

// ============================================================
// YOUTUBE COMMENTS TRANSLATE (ek özellik: hedef dil = targetLanguage)
// Her yoruma "Çevir" butonu enjekte eder; Gemini ile çevirir,
// orijinali koruyup tek tıkla geri dönmeye izin verir.
// ============================================================
let ytCommentsObserver = null;
let ytCommentsScanTimer = null;
const YT_COMMENT_CSS_ID = 'yt-translator-comments-style';

function ytCommentsEnsureStyle() {
  if (document.getElementById(YT_COMMENT_CSS_ID)) return;
  const st = document.createElement('style');
  st.id = YT_COMMENT_CSS_ID;
  st.textContent = `
    /* Yazar isminin yanındaki belli belirsiz metin butonu (YouTube temasına uyar) */
    .yt-translator-comment-btn {
      background: none; border: none; padding: 0; margin: 0 0 0 8px;
      color: var(--yt-spec-text-secondary, #606060);
      font-family: "Roboto", "Arial", sans-serif;
      font-size: 12px; font-size: 1.2rem; font-weight: 400;
      letter-spacing: 0; text-transform: none;
      cursor: pointer; display: inline-block;
      line-height: inherit; vertical-align: baseline;
    }
    .yt-translator-comment-btn:hover { color: var(--yt-spec-text-primary, inherit); text-decoration: underline; }
    .yt-translator-comment-btn:disabled { opacity: .6; cursor: default; text-decoration: none; }
    .yt-translator-comment-box {
      margin: 6px 0 2px 0; padding: 8px 10px; border-radius: 8px;
      background: var(--yt-spec-badge-chip-background, rgba(0,0,0,.05));
      color: var(--yt-spec-text-primary, inherit);
      font-size: 14px; line-height: 1.45;
      white-space: pre-wrap; word-break: break-word;
    }
    .yt-translator-comment-err { color: var(--yt-spec-text-danger, #c00); font-size: 12px; margin-top: 4px; }
  `;
  document.head.appendChild(st);
}

function ytCommentsSendTranslate(text) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({
        action: 'translate',
        text: text,
        sourceLang: 'auto',
        targetLang: targetLanguage || 'tr'
      }, (response) => {
        const err = chrome.runtime && chrome.runtime.lastError;
        if (err) { reject(new Error(err.message)); return; }
        if (response && response.success) resolve(response.translation);
        else reject(new Error((response && response.error) || 'Çeviri başarısız oldu.'));
      });
    } catch (e) {
      reject(e);
    }
  });
}

function ytCommentsFindThreads() {
  return Array.from(document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-renderer'));
}

function ytCommentsGetTextElement(scope) {
  return scope.querySelector('#content-text, yt-formatted-string#content-text, #content #content-text');
}

function ytCommentsGetRenderer(scope) {
  if (!scope) return null;
  const tn = scope.tagName || '';
  // Yeni YouTube DOM'u ytd-comment-view-model kullanır; eskisi ytd-comment-renderer.
  if (tn === 'YTD-COMMENT-RENDERER' || tn === 'YTD-COMMENT-VIEW-MODEL') return scope;
  return scope.querySelector('ytd-comment-renderer, ytd-comment-view-model');
}

// "Yanıtla" butonunu bul: önce id ile, olmazsa metinden. Her seviyede arar.
// (YouTube id/class'ları deneysel olarak değiştirebiliyor; metin araması garantili yedek.)
function ytCommentsFindReplyButton(rootEl) {
  if (!rootEl || !rootEl.querySelector) return null;
  const byId = rootEl.querySelector('#reply-button');
  if (byId) return byId;
  let list = [];
  try {
    list = rootEl.querySelectorAll('button, ytd-button-renderer, [role="button"], yt-button-shape');
  } catch (e) { return null; }
  for (const c of list) {
    if (c.closest && c.closest('.yt-translator-comment-box')) continue;
    if (c.classList && c.classList.contains('yt-translator-comment-btn')) continue;
    const t = (((c.innerText !== undefined && c.innerText !== '' ? c.innerText : c.textContent)) || '').trim().toLowerCase();
    if (t === 'yanıtla' || t === 'yanitla' || t === 'reply') {
      return (c.closest && c.closest('ytd-button-renderer')) || c;
    }
  }
  return null;
}

// Buton konumu: "Yanıtla" butonunun hemen arkası (aynı aksiyon satırı).
// Renderer çözümü ne olursa olsun scope'un TAMAMINDA arar; bulamazsa
// yazar satırına, o da yoksa diğer yedeklere düşer.
function ytCommentsGetButtonSpot(scope) {
  if (!scope || !scope.querySelector) return null;
  const renderer = ytCommentsGetRenderer(scope) || scope;
  const roots = renderer === scope ? [scope] : [renderer, scope];

  let replyBtn = null;
  for (const r of roots) {
    replyBtn = ytCommentsFindReplyButton(r);
    if (replyBtn) break;
  }
  if (replyBtn && replyBtn.parentElement) {
    return { parent: replyBtn.parentElement, after: replyBtn, replyStyle: true, replyBtn };
  }
  for (const r of roots) {
    const timeEl = r.querySelector('.published-time-text, #published-time-text');
    if (timeEl && timeEl.parentElement) return { parent: timeEl.parentElement, after: timeEl };
    const authorEl = r.querySelector('#author-text');
    if (authorEl && authorEl.parentElement) return { parent: authorEl.parentElement, after: authorEl };
    const ha = r.querySelector('#header-author') || r.querySelector('#header');
    if (ha) return { parent: ha, after: null };
  }
  return null;
}

// Butonu Yanıtla ile aynı arayüze büründür (rengi gri tutulur).
// YouTube class'ları değişse bile o anki hesaplanmış stil kopyalanır.
function ytCommentsSyncButtonStyle(btn, spot) {
  if (!btn) return;
  if (spot && spot.replyStyle && spot.replyBtn) {
    try {
      const rb = spot.replyBtn;
      const replyInner = (rb.matches && rb.matches('button')) ? rb : (rb.querySelector('button') || rb);
      const cs = getComputedStyle(replyInner);
      btn.style.fontFamily = cs.fontFamily;
      btn.style.fontSize = cs.fontSize;
      btn.style.fontWeight = cs.fontWeight;
      btn.style.letterSpacing = cs.letterSpacing;
      btn.style.lineHeight = cs.lineHeight;
      btn.style.padding = cs.padding;
      btn.style.margin = '0 0 0 8px';
      btn.style.border = 'none';
      btn.style.borderRadius = cs.borderRadius;
      btn.style.background = 'transparent';
      btn.style.cursor = 'pointer';
      btn.style.textTransform = cs.textTransform;
      return;
    } catch (e) {}
  }
  btn.removeAttribute('style');
}

// Butonu hedef konuma koyar (gerekirse taşır). Konursa true döner.
function ytCommentsPlaceButton(scope, btn) {
  if (!btn) return false;
  const spot = ytCommentsGetButtonSpot(scope);
  if (!spot || !spot.parent || !spot.parent.isConnected) return false;
  if (btn.parentElement === spot.parent &&
      (!spot.after || spot.after.nextSibling === btn)) {
    ytCommentsSyncButtonStyle(btn, spot);
    return true;
  }
  if (spot.after && spot.after.parentElement === spot.parent) {
    spot.parent.insertBefore(btn, spot.after.nextSibling);
  } else {
    spot.parent.appendChild(btn);
  }
  ytCommentsSyncButtonStyle(btn, spot);
  return true;
}

// Metin altına düşmüş başıboş buton kopyalarını temizler.
function ytCommentsClearStrayButtons(scope, keepBtn) {
  const textEl = ytCommentsGetTextElement(scope);
  const textParent = textEl && textEl.parentElement;
  if (!textParent) return;
  textParent.querySelectorAll(':scope > .yt-translator-comment-btn').forEach(b => {
    if (b !== keepBtn) b.remove();
  });
}

function ytCommentsInjectIntoScope(scope) {
  if (!scope) return;
  // Takip edilen buton bağlıysa: konumunu düzelt, bitir.
  const prevBtn = scope.__ytTranslatorCommentBtn;
  if (prevBtn && prevBtn.isConnected) {
    ytCommentsPlaceButton(scope, prevBtn);
    ytCommentsClearStrayButtons(scope, prevBtn);
    return;
  }
  const textEl = ytCommentsGetTextElement(scope);
  if (!textEl) return;
  const raw = (textEl.innerText || textEl.textContent || '').trim();
  if (!raw || raw.length < 2) return;
  const textParent = textEl.parentElement;
  if (!textParent) return;

  // Bayraksız kalmış mevcut butonu sahiplen (çift enjeksiyonu engeller).
  const spot0 = ytCommentsGetButtonSpot(scope);
  let existing = null;
  if (spot0 && spot0.parent) {
    existing = spot0.parent.querySelector(':scope > .yt-translator-comment-btn');
  }
  if (!existing) {
    existing = textParent.querySelector(':scope > .yt-translator-comment-btn');
  }
  if (existing) {
    scope.__ytTranslatorCommentBtn = existing;
    ytCommentsPlaceButton(scope, existing);
    ytCommentsClearStrayButtons(scope, existing);
    return;
  }

  ytCommentsEnsureStyle();

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'yt-translator-comment-btn';
  btn.textContent = 'Çevir';
  btn.title = 'Yorumu hedef dile çevir';

  const box = document.createElement('div');
  box.className = 'yt-translator-comment-box';
  box.style.display = 'none';

  const err = document.createElement('div');
  err.className = 'yt-translator-comment-err';
  err.style.display = 'none';

  let showingTranslation = false;
  let cachedTranslation = '';
  let cachedForLang = '';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.disabled) return;
    err.style.display = 'none';

    if (showingTranslation) {
      box.style.display = 'none';
      showingTranslation = false;
      btn.textContent = cachedTranslation ? 'Çeviriyi Göster' : 'Çevir';
      return;
    }
    if (cachedTranslation && cachedForLang === (targetLanguage || 'tr')) {
      box.style.display = 'block';
      showingTranslation = true;
      btn.textContent = 'Orijinali Göster';
      return;
    }

    const original = (textEl.innerText || textEl.textContent || '').trim();
    if (!original) return;
    btn.disabled = true;
    btn.textContent = 'Çevriliyor...';
    try {
      const translated = await ytCommentsSendTranslate(original);
      cachedTranslation = (translated || '').trim();
      cachedForLang = targetLanguage || 'tr';
      if (!cachedTranslation) throw new Error('Boş çeviri döndü.');
      // Orijinal yorum YouTube'un kendi çevirisiyle değişmiş olabilir; yine de sonucu göster.
      box.textContent = cachedTranslation;
      box.style.display = 'block';
      showingTranslation = true;
      btn.textContent = 'Orijinali Göster';
    } catch (ex) {
      err.textContent = 'Çeviri hatası: ' + (ex && ex.message ? ex.message : 'bilinmeyen hata');
      err.style.display = 'block';
      btn.textContent = 'Tekrar Dene';
    } finally {
      btn.disabled = false;
      if (!showingTranslation && btn.textContent === 'Çevriliyor...') btn.textContent = 'Çevir';
    }
  });

  // Çeviri sonucu her zaman yorum metninin altında gösterilir.
  textParent.appendChild(box);
  textParent.appendChild(err);
  // Buton: Yanıtla'nın sağı; aksiyon satırı bulunamazsa yedek metin altı.
  if (!ytCommentsPlaceButton(scope, btn)) {
    if (!window.__ytTranslatorSpotWarned) {
      window.__ytTranslatorSpotWarned = true;
      console.warn('[GeminiToolkit] Yorum aksiyon satırı bulunamadı, yedek konum kullanıldı.');
    }
    textParent.insertBefore(btn, box);
  }
  ytCommentsClearStrayButtons(scope, btn);
  scope.__ytTranslatorCommentBtn = btn;
}

function ytCommentsScan() {
  if (!extensionEnabled || !ytCommentsEnabled) return;
  // Sadece watch sayfalarında çalış (yorumlar orada).
  if (window.location.pathname !== '/watch') return;
  ytCommentsFindThreads().forEach(ytCommentsInjectIntoScope);
}

function ytCommentsScheduleScan(delay) {
  if (!extensionEnabled || !ytCommentsEnabled) return;
  if (ytCommentsScanTimer) clearTimeout(ytCommentsScanTimer);
  ytCommentsScanTimer = setTimeout(() => {
    ytCommentsScanTimer = null;
    try { ytCommentsScan(); } catch (e) {}
  }, typeof delay === 'number' ? delay : 350);
}

function ytCommentsTeardown() {
  if (ytCommentsScanTimer) { clearTimeout(ytCommentsScanTimer); ytCommentsScanTimer = null; }
  document.querySelectorAll('.yt-translator-comment-btn, .yt-translator-comment-box, .yt-translator-comment-err').forEach(el => el.remove());
  document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-renderer').forEach(el => {
    delete el.__ytTranslatorCommentBtn;
    delete el.__ytTranslatorCommentDone;
  });
}

function ytCommentsBoot() {
  if (!extensionEnabled || !ytCommentsEnabled) return;
  if (window.location.pathname !== '/watch') return;
  ytCommentsEnsureStyle();
  ytCommentsScheduleScan(600);
  if (!ytCommentsObserver) {
    ytCommentsObserver = new MutationObserver(() => ytCommentsScheduleScan(350));
    const startObserving = () => {
      const root = document.querySelector('ytd-comments#comments, #comments, ytd-watch-flexy');
      if (root) {
        try { ytCommentsObserver.observe(root, { childList: true, subtree: true }); } catch (e) {}
      } else {
        try { ytCommentsObserver.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
      }
    };
    if (document.body) startObserving();
    else document.addEventListener('DOMContentLoaded', startObserving, { once: true });
  }
}

})();

