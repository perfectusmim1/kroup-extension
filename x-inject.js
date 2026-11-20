// X (Twitter) Video Altyazi Yakalayici (MAIN world, document_start)
(function () {
  if (window.__geminiXVideoInjected) return;
  window.__geminiXVideoInjected = true;

  const videoCache = (window.__geminiXVideoMetaCache = window.__geminiXVideoMetaCache || new Map());
  const MAX_CACHE = 80;

  function cacheSet(key, val) {
    if (!key || !val) return;
    if (videoCache.has(key)) videoCache.delete(key);
    videoCache.set(key, val);
    if (videoCache.size > MAX_CACHE) {
      videoCache.delete(videoCache.keys().next().value);
    }
  }

  function extractMediaId(url) {
    const m = /\/(?:amplify_video|ext_tw_video|dm_video)\/(\d+)\//.exec(String(url || ""));
    return m ? m[1] : "";
  }

  function notifyCaptured(info) {
    try {
      window.postMessage({ type: "GEMINI_X_VIDEO_CAPTURED", info }, "*");
    } catch (e) { void e; }
  }

  function recordMediaUrl(url) {
    const s = String(url || "");
    if (!s || !s.includes("video.twimg.com")) return;
    const mediaId = extractMediaId(s);
    if (!mediaId) return;
    const prev = videoCache.get(mediaId) || { mediaId };
    if (/\.m3u8(?:\?|$)/i.test(s) && !/\/(?:avc1|mp4a|av01|vp09)\//i.test(s)) {
      if (/\/pl\/s\d+\//i.test(s)) {
        prev.subPlaylistUrl = s;
      } else {
        prev.m3u8Url = s;
      }
      cacheSet(mediaId, prev);
      notifyCaptured(prev);
    } else if (/\.vtt(?:\?|$)/i.test(s)) {
      prev.vttUrl = s;
      cacheSet(mediaId, prev);
      notifyCaptured(prev);
    } else if (/\.mp4(?:\?|$)/i.test(s)) {
      if (!prev.mp4Url) {
        prev.mp4Url = s;
        cacheSet(mediaId, prev);
      }
    }
  }

  // Deep scan TweetDetail / TweetResultByRestId responses for video variants
  function scanGraphqlMedia(obj, depth) {
    if (!obj || typeof obj !== "object" || depth > 14) return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) scanGraphqlMedia(obj[i], depth + 1);
      return;
    }
    if (obj.video_info && Array.isArray(obj.video_info.variants)) {
      const m3u8 = obj.video_info.variants.find((v) => v && v.src || (v && v.url && /\.m3u8/i.test(v.url)));
      const m3u8Url = m3u8 ? (m3u8.src || m3u8.url) : "";
      const mp4s = obj.video_info.variants
        .filter((v) => v && /\.mp4/i.test(v.url || v.src || ""))
        .sort((a, b) => (a.bitrate || 9e9) - (b.bitrate || 9e9));
      const lowMp4 = mp4s[0] ? (mp4s[0].url || mp4s[0].src) : "";
      const id = extractMediaId(m3u8Url || lowMp4) || String(obj.id_str || "");
      if (id && (m3u8Url || lowMp4)) {
        const entry = Object.assign(videoCache.get(id) || {}, {
          mediaId: id,
          m3u8Url: m3u8Url || (videoCache.get(id)?.m3u8Url || ""),
          mp4Url: lowMp4 || (videoCache.get(id)?.mp4Url || ""),
          durationMs: obj.video_info.duration_millis || 0
        });
        cacheSet(id, entry);
        notifyCaptured(entry);
      }
    }
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k === "legacy" || k === "extended_entities" || k === "media" || k === "result" ||
          k === "tweet" || k === "tweetResult" || k === "data" || k === "threaded_conversation_with_injections_v2" ||
          k === "instructions" || k === "entries" || k === "content" || k === "itemContent" ||
          k === "tweet_results" || k === "items" || k === "item") {
        scanGraphqlMedia(obj[k], depth + 1);
      }
    }
  }

  // fetch interceptor
  try {
    const origFetch = window.fetch;
    if (typeof origFetch === "function") {
      window.fetch = function (input, init) {
        try {
          const reqUrl = typeof input === "string" ? input : (input && input.url) || "";
          if (reqUrl.includes("video.twimg.com")) recordMediaUrl(reqUrl);
          const p = origFetch.apply(this, arguments);
          if (/\/i\/api\/graphql\/.*(?:Tweet|Timeline|Home|UserTweets|Search)/i.test(reqUrl)) {
            p.then((res) => {
              try {
                if (res && res.ok) res.clone().json().then((j) => scanGraphqlMedia(j, 0)).catch(() => {});
              } catch (e) { void e; }
            }).catch(() => {});
          }
          return p;
        } catch (e) {
          return origFetch.apply(this, arguments);
        }
      };
    }
  } catch (e) { void e; }

  // XMLHttpRequest interceptor (video.js / hls.js XHR istekleri)
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      try {
        if (typeof url === "string" && url.includes("video.twimg.com")) {
          recordMediaUrl(url);
        }
      } catch (e) { void e; }
      return origOpen.apply(this, arguments);
    };
  } catch (e) { void e; }

  function pickVariantsInfo(variants, fallbackMediaId) {
    if (!Array.isArray(variants) || variants.length === 0) return null;
    let m3u8Url = "";
    const mp4s = [];
    for (const v of variants) {
      if (!v) continue;
      const src = v.src || v.url || "";
      if (!src) continue;
      if (v.type === "application/x-mpegURL" || /\.m3u8(?:\?|$)/i.test(src)) {
        if (!m3u8Url) m3u8Url = src;
      } else if (v.type === "video/mp4" || /\.mp4(?:\?|$)/i.test(src)) {
        mp4s.push({ bitrate: Number(v.bitrate) || 9e9, src });
      }
    }
    mp4s.sort((a, b) => a.bitrate - b.bitrate);
    const lowMp4 = mp4s[0] ? mp4s[0].src : "";
    const mediaId = extractMediaId(m3u8Url || lowMp4) || fallbackMediaId || "";
    return { mediaId, m3u8Url, mp4Url: lowMp4 };
  }

  function inspectReactVideoProps(videoEl) {
    const vc = videoEl.closest('[data-testid="videoComponent"]') || videoEl.closest('[data-testid="videoPlayer"]') || videoEl.parentElement;
    const posterMediaId = extractMediaId(videoEl.getAttribute("poster") || "");
    const out = {
      mediaId: posterMediaId,
      tweetId: "",
      m3u8Url: "",
      mp4Url: "",
      durationMs: 0,
      language: ""
    };

    if (vc) {
      const fk = Object.keys(vc).find((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
      let cur = fk ? vc[fk] : null;
      for (let i = 0; i < 22 && cur; i++) {
        const p = cur.memoizedProps || cur.pendingProps;
        if (p && typeof p === "object") {
          if (Array.isArray(p.variants)) {
            const vInfo = pickVariantsInfo(p.variants, out.mediaId);
            if (vInfo) {
              if (!out.mediaId && vInfo.mediaId) out.mediaId = vInfo.mediaId;
              if (!out.m3u8Url && vInfo.m3u8Url) out.m3u8Url = vInfo.m3u8Url;
              if (!out.mp4Url && vInfo.mp4Url) out.mp4Url = vInfo.mp4Url;
            }
          }
          if (!out.tweetId && p.videoId && typeof p.videoId === "object" && p.videoId.id) {
            out.tweetId = String(p.videoId.id);
          }
          if (!out.durationMs && p.durationMs) out.durationMs = Number(p.durationMs) || 0;
          if (!out.language && typeof p.language === "string") out.language = p.language;
          if (p.source && typeof p.source === "object" && Array.isArray(p.source.variants)) {
            const vInfo = pickVariantsInfo(p.source.variants, out.mediaId);
            if (vInfo) {
              if (!out.mediaId && vInfo.mediaId) out.mediaId = vInfo.mediaId;
              if (!out.m3u8Url && vInfo.m3u8Url) out.m3u8Url = vInfo.m3u8Url;
              if (!out.mp4Url && vInfo.mp4Url) out.mp4Url = vInfo.mp4Url;
            }
          }
          if (out.m3u8Url && out.tweetId) break;
        }
        cur = cur.return;
      }
    }

    // Cache'ten eksik kalan bilgi varsa birlestir
    const cached = out.mediaId ? videoCache.get(out.mediaId) : null;
    if (cached) {
      if (!out.m3u8Url && cached.m3u8Url) out.m3u8Url = cached.m3u8Url;
      if (!out.mp4Url && cached.mp4Url) out.mp4Url = cached.mp4Url;
      if (!out.durationMs && cached.durationMs) out.durationMs = cached.durationMs;
      if (cached.subPlaylistUrl) out.subPlaylistUrl = cached.subPlaylistUrl;
      if (cached.vttUrl) out.vttUrl = cached.vttUrl;
    }
    return out;
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type !== "GEMINI_X_VIDEO_QUERY") return;
    const { reqId, token } = event.data;
    try {
      const el = document.querySelector(`video[data-gemini-xv-token="${CSS.escape(String(token))}"]`);
      if (!el) {
        window.postMessage({ type: "GEMINI_X_VIDEO_INFO", reqId, info: null }, "*");
        return;
      }
      const info = inspectReactVideoProps(el);
      window.postMessage({ type: "GEMINI_X_VIDEO_INFO", reqId, info }, "*");
    } catch (e) {
      window.postMessage({ type: "GEMINI_X_VIDEO_INFO", reqId, info: null, error: e.message }, "*");
    }
  });
})();
