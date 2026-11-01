// Ses mikseri ses grafigi: yakalanan her sekme -> gain -> hoparlor.
// Durum background'da (mixerGains), ses dugumleri burada.
const mixerGraphs = new Map(); // tabId -> { stream, ctx, gain, src }
let mixerSharedCtx = null;

function mixerAudioCtx() {
  if (!mixerSharedCtx || mixerSharedCtx.state === "closed") {
    mixerSharedCtx = new AudioContext();
  }
  if (mixerSharedCtx.state === "suspended") {
    mixerSharedCtx.resume().catch(() => {});
  }
  return mixerSharedCtx;
}

function mixerDrop(tabId) {
  const g = mixerGraphs.get(tabId);
  if (!g) return;
  mixerGraphs.delete(tabId);
  try { g.src.disconnect(); } catch (e) { void e; }
  try { g.gain.disconnect(); } catch (e) { void e; }
  try { g.stream.getTracks().forEach((t) => t.stop()); } catch (e) { void e; }
}

async function mixerEnsureGraph(tabId, streamId, volume) {
  if (mixerGraphs.has(tabId)) return;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
    video: false
  });
  const ctx = mixerAudioCtx();
  const src = ctx.createMediaStreamSource(stream);
  const gain = ctx.createGain();
  gain.gain.value = (volume !== undefined ? volume : 100) / 100;
  src.connect(gain);
  gain.connect(ctx.destination);
  const track = stream.getAudioTracks()[0];
  if (track) {
    track.onended = () => {
      mixerDrop(tabId);
      chrome.runtime.sendMessage({ action: "mixer-died", tabId }, () => {
        void chrome.runtime.lastError;
      });
    };
  }
  mixerGraphs.set(tabId, { stream, ctx, gain, src });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.scope !== "mixer-offscreen") return false;
  if (message.action === "mixer-ensure") {
    mixerEnsureGraph(message.tabId, message.streamId, message.volume)
      .then(() => sendResponse({ success: true }))
      .catch((e) => sendResponse({ success: false, error: (e && e.message) || String(e) }));
    return true;
  }
  if (message.action === "mixer-gain") {
    const g = mixerGraphs.get(message.tabId);
    if (!g) {
      sendResponse({ success: false, error: "Ses grafiği yok." });
      return false;
    }
    try {
      g.gain.gain.setTargetAtTime(Math.max(0, Math.min(100, message.volume)) / 100, g.ctx.currentTime, 0.05);
      sendResponse({ success: true });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return false;
  }
  if (message.action === "mixer-release") {
    mixerDrop(message.tabId);
    sendResponse({ success: true });
    return false;
  }
  return false;
});
