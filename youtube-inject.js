// Runs in the page world so YouTube player internals are readable.
(function() {
  if (window.__YT_SUB_TRANSLATOR_INJECTED__) return;
  window.__YT_SUB_TRANSLATOR_INJECTED__ = true;

  // Olculebilir gercek degerler: soguk istek 20s, sonrakiler 120ms-3.3s.
  // Sabit 6s'lik bir esik veriyi yolda atmak demekti; bu yuzden asagidaki
  // butce kullanilir ve fetch'ler AbortSignal ile sinirlanir (soket takilip
  // sonsuza kadar beklemesin).
  const SUBTITLE_URL_TIMEOUT_MS = 12000;
  const CAPTURE_WAIT_MS = 3500;

  // Intercept InnerTube Player requests to extract caption tracks
  try {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      const url = args[0];
      const urlString = typeof url === 'string' ? url : (url instanceof Request ? url.url : '');
      
      if (urlString && urlString.includes('/youtubei/v1/player')) {
        try {
          const clone = response.clone();
          clone.json().then(data => {
            const videoId = data?.videoDetails?.videoId;
            const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (videoId && Array.isArray(tracks) && tracks.length > 0) {
              window.__YT_TRANSLATOR_CAPTURED_TRACKS__ = window.__YT_TRANSLATOR_CAPTURED_TRACKS__ || {};
              window.__YT_TRANSLATOR_CAPTURED_TRACKS__[videoId] = tracks;
              window.postMessage({
                type: "YT_TRANSLATOR_CAPTION_TRACKS",
                tracks,
                videoId
              }, "*");
            }
          }).catch(() => {});
        } catch (e) {}
      }

      if (urlString && urlString.includes('/api/timedtext')) {
        try {
          const urlObj = new URL(urlString, window.location.origin);
          const v = urlObj.searchParams.get('v') || getVideoId();
          const lang = urlObj.searchParams.get('lang');
          const kind = urlObj.searchParams.get('kind') || '';
          if (lang) {
            const clone = response.clone();
            clone.text().then(text => {
              if (text && text.trim() !== '') {
                const key = `${v}|${lang}|${kind}`;
                window.__YT_TRANSLATOR_CAPTURED_TEXTS__ = window.__YT_TRANSLATOR_CAPTURED_TEXTS__ || new Map();
                window.__YT_TRANSLATOR_CAPTURED_TEXTS__.set(key, text);
                window.postMessage({
                  type: "YT_TRANSLATOR_SUBTITLE_CAPTURED",
                  key,
                  text
                }, "*");
              }
            }).catch(() => {});
          }
        } catch (e) {}
      }
      return response;
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._url = url;
      return originalOpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('load', function() {
        if (this._url && this._url.includes('/youtubei/v1/player')) {
          try {
            const data = JSON.parse(this.responseText);
            const videoId = data?.videoDetails?.videoId;
            const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (videoId && Array.isArray(tracks) && tracks.length > 0) {
              window.__YT_TRANSLATOR_CAPTURED_TRACKS__ = window.__YT_TRANSLATOR_CAPTURED_TRACKS__ || {};
              window.__YT_TRANSLATOR_CAPTURED_TRACKS__[videoId] = tracks;
              window.postMessage({
                type: "YT_TRANSLATOR_CAPTION_TRACKS",
                tracks,
                videoId
              }, "*");
            }
          } catch (e) {}
        }

        if (this._url && this._url.includes('/api/timedtext')) {
          try {
            const urlObj = new URL(this._url, window.location.origin);
            const v = urlObj.searchParams.get('v') || getVideoId();
            const lang = urlObj.searchParams.get('lang');
            const kind = urlObj.searchParams.get('kind') || '';
            const text = this.responseText;
            if (text && text.trim() !== '' && lang) {
              const key = `${v}|${lang}|${kind}`;
              window.__YT_TRANSLATOR_CAPTURED_TEXTS__ = window.__YT_TRANSLATOR_CAPTURED_TEXTS__ || new Map();
              window.__YT_TRANSLATOR_CAPTURED_TEXTS__.set(key, text);
              window.postMessage({
                type: "YT_TRANSLATOR_SUBTITLE_CAPTURED",
                key,
                text
              }, "*");
            }
          } catch (e) {}
        }
      });
      return originalSend.apply(this, args);
    };
  } catch (err) {
    console.error("Network interception hook error:", err);
  }

  let extractionRunId = 0;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function decodeHtmlEntities(value) {
    if (!value) return "";
    const entities = {
      'amp': '&',
      'lt': '<',
      'gt': '>',
      'quot': '"',
      'apos': "'",
      '#39': "'"
    };
    return value.replace(/&([^;]+);/g, (match, entity) => {
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

  function cleanUrl(url) {
    if (!url) return "";
    return decodeHtmlEntities(String(url))
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/");
  }

  function getVideoId() {
    const urlVideoId = new URLSearchParams(window.location.search).get("v");
    if (urlVideoId) return urlVideoId;

    return window.ytInitialPlayerResponse?.videoDetails?.videoId || "";
  }

  function getYtcfgValue(key) {
    if (window.ytcfg && typeof window.ytcfg.get === "function") {
      return window.ytcfg.get(key);
    }

    return window.ytcfg?.data_?.[key];
  }

  function getNameText(name) {
    if (!name) return "";
    if (typeof name === "string") return name;
    if (name.simpleText) return name.simpleText;
    if (Array.isArray(name.runs)) return name.runs.map((run) => run.text || "").join("");
    return "";
  }

  function normalizeTrack(track) {
    const baseUrl = cleanUrl(track.baseUrl || track.url || "");
    const languageCode = track.languageCode || track.langCode || track.lang || "";
    const sourceClient = track.sourceClient || track.__ytTranslatorSourceClient || "";
    const displayName =
      getNameText(track.name) ||
      getNameText(track.displayName) ||
      track.languageName ||
      track.label ||
      languageCode ||
      "Subtitle";

    return {
      baseUrl,
      languageCode,
      name: { simpleText: displayName },
      vssId: track.vssId || track.vss_id || `.${languageCode}`,
      kind: track.kind,
      isTranslatable: track.isTranslatable !== false,
      // YouTube'un otomatik çevirdiği sentetik kanallar (tlang=...). Bunlar
      // sunucudan çoğunlukla boş döner; kaynak olarak orijinal tercih edilir.
      isAutoTranslated: /[?&]tlang=/.test(baseUrl),
      sourceClient
    };
  }

  function hasPoTokenExperiment(baseUrl) {
    return /[?&]exp=[^&]*(?:xpe|xpv)/.test(baseUrl || "");
  }

  function trackPriority(track) {
    if (track.isAutoTranslated) return 10;
    if (track.sourceClient === "ANDROID_VR") return 0;
    if (track.sourceClient === "IOS") return 1;
    if (track.sourceClient === "ANDROID") return 2;
    if (hasPoTokenExperiment(track.baseUrl)) return 3;
    if (track.sourceClient === "WEB") return 4;
    return 5;
  }

  // Ayni dil icin birden fazla InnerTube client'i (WEB/IOS/ANDROID) farkli
  // baseUrl'ler dondurur. YouTube'un WEB client'i PO-token deneyi olan
  // (exp=xpe) bir URL verir ve o URL 200 donup BOS govde ile yanitlar.
  // Ayni dilin IOS/ANDROID URL'leri ise dolu yanit verir. Bu yuzden her dil
  // icin tek URL atmak yerine oncelikli (birincil) URL + alternativler
  // saklanir; indirme sirasinda bos/hatali olan biri atlanip siradaki
  // denenir.
  function trackIdentity(track) {
    const lang = track.languageCode || "";
    const kind = track.kind || "";
    // vssId bilerek haric: ASR kanallari client'lar arasinda ".en" ve
    // "a.en" olarak gelir; ayni kanal iki farkli grupa bolunmemeli.
    return lang || kind ? `${lang}|${kind}` : `name:${track.name?.simpleText || ""}`;
  }

  function dedupeTracks(tracks) {
    const groups = new Map();
    const seenUrls = new Set();

    const candidates = [];
    (tracks || []).forEach((track) => {
      if (!track) return;
      candidates.push(track);
      // Onceki turdan saklanan normalize edilmis kanallar alternativleri
      // de beraberinde tasir; onlari da aday havuzuna geri koy.
      if (Array.isArray(track.altUrls)) {
        track.altUrls.forEach((url) => {
          if (url) candidates.push({ ...track, baseUrl: url, altUrls: undefined });
        });
      }
    });

    candidates
      .map(normalizeTrack)
      .sort((a, b) => trackPriority(a) - trackPriority(b))
      .forEach((track) => {
        if (!track.baseUrl) return;
        const key = trackIdentity(track);
        const urlKey = `${key}||${track.baseUrl}`;
        if (seenUrls.has(urlKey)) return;
        seenUrls.add(urlKey);

        const group = groups.get(key);
        if (!group) {
          groups.set(key, { primary: track, altUrls: [] });
          return;
        }
        group.altUrls.push(track.baseUrl);
      });

    return [...groups.values()].map((group) => {
      group.primary.altUrls = group.altUrls;
      return group.primary;
    });
  }

  function findTrackObjects(value, depth = 0, seen = new Set()) {
    if (!value || depth > 5) return [];

    if (Array.isArray(value)) {
      return value.flatMap((item) => findTrackObjects(item, depth + 1, seen));
    }

    if (typeof value !== "object") return [];
    if (seen.has(value)) return [];
    seen.add(value);

    const found = [];
    if ((value.baseUrl || value.url) && (value.languageCode || value.langCode || value.lang || value.vssId || value.name || value.displayName)) {
      found.push(value);
    }

    const likelyKeys = [
      "captions",
      "playerCaptionsTracklistRenderer",
      "captionTracks",
      "captionTrack",
      "track",
      "tracklist",
      "trackList",
      "tracks",
      "selectedTrack",
      "displayedTrack"
    ];

    for (const key of likelyKeys) {
      if (value[key]) {
        found.push(...findTrackObjects(value[key], depth + 1, seen));
      }
    }

    return found;
  }

  function responseMatchesVideo(response, videoId) {
    const responseVideoId = response?.videoDetails?.videoId;
    return !responseVideoId || responseVideoId === videoId;
  }

  function getCaptionTracksFromResponse(response, videoId) {
    if (!response || !responseMatchesVideo(response, videoId)) return [];
    const tracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    return Array.isArray(tracks) ? tracks : [];
  }

  function extractJsonObjectAfter(text, marker) {
    const markerIndex = text.indexOf(marker);
    if (markerIndex === -1) return null;

    const start = text.indexOf("{", markerIndex + marker.length);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let quote = "";
    let escaped = false;

    for (let i = start; i < text.length; i += 1) {
      const char = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          inString = false;
          quote = "";
        }
        continue;
      }

      if (char === '"' || char === "'") {
        inString = true;
        quote = char;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }

    return null;
  }

  function getTracksFromScriptTags(videoId) {
    const scripts = Array.from(document.scripts || []);

    for (const script of scripts) {
      const text = script.textContent || "";
      if (!text.includes("captionTracks")) continue;

      const jsonText =
        extractJsonObjectAfter(text, "ytInitialPlayerResponse") ||
        extractJsonObjectAfter(text, "raw_player_response");

      if (!jsonText) continue;

      try {
        const response = JSON.parse(jsonText);
        const tracks = getCaptionTracksFromResponse(response, videoId);
        if (tracks.length > 0) return dedupeTracks(tracks);
      } catch (_) {
        // Continue scanning other script tags.
      }
    }

    return [];
  }

  function getTracksFromInitialResponse(videoId) {
    const candidates = [];

    if (window.ytInitialPlayerResponse) {
      candidates.push(window.ytInitialPlayerResponse);
    }

    const args = window.ytplayer?.config?.args;
    if (args?.raw_player_response) {
      candidates.push(args.raw_player_response);
    }

    if (typeof args?.player_response === "string") {
      try {
        candidates.push(JSON.parse(args.player_response));
      } catch (_) {
        // Ignore stale or malformed player_response snapshots.
      }
    }

    return dedupeTracks(candidates.flatMap((response) => getCaptionTracksFromResponse(response, videoId)));
  }

  function getTracksFromPlayer() {
    try {
      const player = document.getElementById("movie_player") || document.querySelector(".html5-video-player");
      if (!player || typeof player.getOption !== "function") return [];

      const candidates = [
        player.getOption("captions", "tracklist"),
        player.getOption("captions", "track"),
        player.getOption("captions", "selectedTrack"),
        player.getOption("captions")
      ];

      if (typeof player.getPlayerResponse === "function") {
        candidates.push(player.getPlayerResponse());
      }

      return dedupeTracks(candidates.flatMap((candidate) => findTrackObjects(candidate)));
    } catch (_) {
      return [];
    }
  }

  function getInnertubeClientProfiles() {
    const apiKey = getYtcfgValue("INNERTUBE_API_KEY");
    if (!apiKey) return [];

    const webContext = getYtcfgValue("INNERTUBE_CONTEXT") || {
      client: {
        clientName: "WEB",
        clientVersion: getYtcfgValue("INNERTUBE_CLIENT_VERSION") || "2.20260114.08.00"
      }
    };

    return [
      {
        sourceClient: "ANDROID_VR",
        credentials: "omit",
        context: {
          client: {
            clientName: "ANDROID_VR",
            clientVersion: "1.65.10",
            deviceMake: "Oculus",
            deviceModel: "Quest 3",
            androidSdkVersion: 32,
            userAgent: "com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
            osName: "Android",
            osVersion: "12L"
          }
        },
        apiKey
      },
      {
        sourceClient: "IOS",
        credentials: "omit",
        context: {
          client: {
            clientName: "IOS",
            clientVersion: "21.02.3",
            deviceMake: "Apple",
            deviceModel: "iPhone16,2",
            userAgent: "com.google.ios.youtube/21.02.3 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
            osName: "iPhone",
            osVersion: "18.3.2.22D82"
          }
        },
        apiKey
      },
      {
        sourceClient: "ANDROID",
        credentials: "omit",
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "21.02.35",
            androidSdkVersion: 30,
            userAgent: "com.google.android.youtube/21.02.35 (Linux; U; Android 11) gzip",
            osName: "Android",
            osVersion: "11"
          }
        },
        apiKey
      },
      {
        sourceClient: "WEB",
        credentials: "same-origin",
        context: webContext,
        apiKey
      }
    ];
  }

  async function getTracksFromInnertube(videoId) {
    if (!videoId) return [];

    const profiles = getInnertubeClientProfiles();

    // Profilleri sirayla degil paralel sorgula: toplam bekleme en yavas
    // profile iner, sonuc sirasi dedupe icindeki oncelik kuraliyladir.
    const fetchProfile = async (profile) => {
      const body = {
        context: profile.context,
        videoId,
        contentCheckOk: true,
        racyCheckOk: true
      };

      try {
        const response = await fetch(`/youtubei/v1/player?key=${encodeURIComponent(profile.apiKey)}&prettyPrint=false`, {
          method: "POST",
          credentials: profile.credentials,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) return [];
        const data = await response.json();
        return getCaptionTracksFromResponse(data, videoId)
          .map((track) => ({ ...track, sourceClient: profile.sourceClient }));
      } catch (_) {
        return [];
      }
    };

    const settled = await Promise.all(profiles.map(fetchProfile));
    return dedupeTracks(settled.flat());
  }

  async function collectCaptionTracks(videoId) {
    const capturedTracks = window.__YT_TRANSLATOR_CAPTURED_TRACKS__?.[videoId] || [];

    const innertubeTracks = await getTracksFromInnertube(videoId);
    const responseTracks = getTracksFromInitialResponse(videoId);
    const playerTracks = getTracksFromPlayer();
    const scriptTracks = getTracksFromScriptTags(videoId);

    const allTracks = dedupeTracks([
      ...responseTracks,
      ...capturedTracks,
      ...innertubeTracks,
      ...playerTracks,
      ...scriptTracks
    ]);

    if (allTracks.length > 0) {
      window.__YT_TRANSLATOR_CAPTURED_TRACKS__ = window.__YT_TRANSLATOR_CAPTURED_TRACKS__ || {};
      window.__YT_TRANSLATOR_CAPTURED_TRACKS__[videoId] = allTracks;
    }

    return allTracks;
  }

  async function extractAndSendCaptionTracks(maxAttempts = 6) {
    const runId = ++extractionRunId;
    const videoId = getVideoId();
    if (!videoId) return;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) {
        await sleep(Math.min(500 * attempt, 1500));
      }

      if (runId !== extractionRunId || getVideoId() !== videoId) {
        return;
      }

      const tracks = await collectCaptionTracks(videoId);
      if (tracks.length > 0) {
        window.postMessage({
          type: "YT_TRANSLATOR_CAPTION_TRACKS",
          tracks,
          videoId
        }, "*");
        return;
      }
    }

    window.postMessage({
      type: "YT_TRANSLATOR_CAPTION_TRACKS",
      tracks: [],
      videoId
    }, "*");
  }

  window.addEventListener("yt-navigate-finish", () => {
    setTimeout(() => extractAndSendCaptionTracks(6), 250);
  });

  window.addEventListener("message", async (event) => {
    if (!event.data) return;

    if (event.data.type === "YT_TRANSLATOR_REQUEST_TRACKS") {
      extractAndSendCaptionTracks(6);
      return;
    }

    if (event.data.type === "YT_TRANSLATOR_LOAD_SUBTITLE") {
      const { track, videoId, requestId } = event.data;
      const lang = track.languageCode;
      const kind = track.kind || '';
      const key = `${videoId}|${lang}|${kind}`;

      window.__YT_TRANSLATOR_CAPTURED_TEXTS__ = window.__YT_TRANSLATOR_CAPTURED_TEXTS__ || new Map();
      const existingText = window.__YT_TRANSLATOR_CAPTURED_TEXTS__.get(key);

      if (existingText) {
        window.postMessage({
          type: "YT_TRANSLATOR_LOAD_SUBTITLE_RESPONSE",
          requestId,
          success: true,
          text: existingText
        }, "*");
        return;
      }

      let settled = false;
      const respond = (success, payload) => {
        if (settled) return;
        settled = true;
        window.postMessage({
          type: "YT_TRANSLATOR_LOAD_SUBTITLE_RESPONSE",
          requestId,
          success,
          ...(payload || {})
        }, "*");
      };

      // Sirayla denenecek URL'ler: oncelikli URL once, sonra ayni dilin
      // diger client URL'leri. YouTube'un WEB client'i PO-token'li
      // (exp=xpe) bir URL donup 200 + bos govde ile yanitlayabiliyor;
      // bos veya hatali yanitta bir sonrakine gecmek zorunlu.
      const urls = [track.baseUrl, ...(Array.isArray(track.altUrls) ? track.altUrls : [])].filter(Boolean);

      const fetchTrackText = async () => {
        let lastError = null;
        for (const url of urls) {
          if (settled) return;
          try {
            const response = await fetch(url, {
              credentials: "include",
              signal: AbortSignal.timeout(SUBTITLE_URL_TIMEOUT_MS)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            if (text && text.trim() !== '') {
              window.__YT_TRANSLATOR_CAPTURED_TEXTS__.set(key, text);
              respond(true, { text });
              return;
            }
            lastError = new Error("Empty response");
          } catch (err) {
            lastError = err;
          }
        }
        respond(false, {
          error: lastError
            ? lastError.message
            : "Subtitle file could not be retrieved: Empty response."
        });
      };

      try {
        const player = document.getElementById("movie_player") || document.querySelector(".html5-video-player");
        if (player && typeof player.setOption === "function") {
          const captureHandler = (e) => {
            if (settled) return;
            if (e.data && e.data.type === "YT_TRANSLATOR_SUBTITLE_CAPTURED" && e.data.key === key) {
              window.removeEventListener("message", captureHandler);
              respond(true, { text: e.data.text });
            }
          };

          window.addEventListener("message", captureHandler);

          // Player altyaziyi yukleyip interceptor'a dusurse en hizli yol
          // budur. Olmazsa onceki URL'ye dogrudan fetch ile dusulur.
          setTimeout(() => {
            if (settled) return;
            window.removeEventListener("message", captureHandler);
            fetchTrackText();
          }, CAPTURE_WAIT_MS);

          player.setOption('captions', 'track', {
            languageCode: lang,
            vss_id: track.vssId
          });
          return;
        }

        throw new Error("Player captions API not available.");
      } catch (_) {
        fetchTrackText();
      }
      return;
    }

    if (event.data.type === "YT_TRANSLATOR_FETCH_SUBTITLES") {
      const { url, requestId } = event.data;

      try {
        const response = await fetch(url, {
          credentials: "include",
          signal: AbortSignal.timeout(SUBTITLE_URL_TIMEOUT_MS)
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        window.postMessage({
          type: "YT_TRANSLATOR_FETCH_SUBTITLES_RESPONSE",
          requestId,
          success: true,
          text: await response.text()
        }, "*");
      } catch (error) {
        window.postMessage({
          type: "YT_TRANSLATOR_FETCH_SUBTITLES_RESPONSE",
          requestId,
          success: false,
          error: error.message
        }, "*");
      }
    }
  });

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(() => extractAndSendCaptionTracks(6), 250);
  } else {
    window.addEventListener("DOMContentLoaded", () => setTimeout(() => extractAndSendCaptionTracks(6), 250));
  }
})();
