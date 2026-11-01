/* Shazam ses imza ureteci (tarayici + service worker uyumlu, bagimsiz).
 * asivery/node-shazam-api (GPL-2.0) projesinden prudent port;
 * pencere/FFT/sabitler ShazamIO referansiyla ve gercek sarkiyla dogrulandi.
 * Girdi: 16kHz mono int16 ornekler. Cikti: { uri, samplems } */
(function (root) {
  "use strict";

  var FB = { _0_250: -1, _250_520: 0, _520_1450: 1, _1450_3500: 2, _3500_5500: 3 };
  var FB_NAME = { "-1": "_0_250", 0: "_250_520", 1: "_520_1450", 2: "_1450_3500", 3: "_3500_5500" };
  var SR_ID = { _8000: 1, _11025: 2, _16000: 3, _32000: 4, _44100: 5, _48000: 6 };
  var URI_PREFIX = "data:audio/vnd.shazam.sig;base64,";

  function crc32(bytes) {
    var table = [], c, n, k;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    var crc = 0 ^ -1;
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 255];
    return (crc ^ -1) >>> 0;
  }

  function w32le(e) { return [e & 255, (e >> 8) & 255, (e >> 16) & 255, (e >> 24) & 255]; }
  function wi32le(e) {
    var v = new DataView(new ArrayBuffer(4)); v.setInt32(0, e, true);
    var u = new Uint8Array(v.buffer); return [u[0], u[1], u[2], u[3]];
  }
  function wi16le(e) {
    var v = new DataView(new ArrayBuffer(2)); v.setInt16(0, e, true);
    var u = new Uint8Array(v.buffer); return [u[0], u[1]];
  }
  function b64encode(bytes) {
    var s = "";
    var CH = 8192;
    for (var i = 0; i < bytes.length; i += CH) {
      s += String.fromCharCode.apply(null, bytes.slice(i, i + CH));
    }
    if (typeof btoa !== "undefined") return btoa(s);
    return Buffer.from(s, "binary").toString("base64");
  }

  function FrequencyPeak(fftPassNumber, peakMagnitude, correctedPeakFrequencyBin, sampleRateHz) {
    this.fftPassNumber = fftPassNumber;
    this.peakMagnitude = peakMagnitude;
    this.correctedPeakFrequencyBin = correctedPeakFrequencyBin;
    this.sampleRateHz = sampleRateHz;
  }

  function DecodedMessage() {
    this.sampleRateHz = 0;
    this.numberSamples = 0;
    this.frequencyBandToSoundPeaks = {};
  }
  DecodedMessage.prototype.encodeToBinary = function () {
    var header = {
      magic1: 0xcafe2580,
      magic2: 0x94119c00,
      shiftedSampleRateId: SR_ID["_" + this.sampleRateHz] << 27,
      fixedValue: (15 << 19) + 0x40000,
      numberSamplesPlusDividedSampleRate: Math.round(this.numberSamples + this.sampleRateHz * 0.24),
      crc32: -1,
      sizeMinusHeader: -1
    };
    var contents = [];
    var self = this;
    Object.keys(this.frequencyBandToSoundPeaks)
      .map(function (name) { return [FB[name], self.frequencyBandToSoundPeaks[name]]; })
      .sort(function (a, b) { return a[0] - b[0]; })
      .forEach(function (pair) {
        var band = pair[0], peaks = pair[1];
        var pb = [], fftPassNumber = 0;
        peaks.forEach(function (p) {
          if (p.fftPassNumber - fftPassNumber >= 255) {
            pb.push(255);
            pb.push.apply(pb, wi32le(p.fftPassNumber));
            fftPassNumber = p.fftPassNumber;
          }
          pb.push(p.fftPassNumber - fftPassNumber);
          pb.push.apply(pb, wi16le(p.peakMagnitude - 1));
          pb.push.apply(pb, wi16le(p.correctedPeakFrequencyBin - 1));
          fftPassNumber = p.fftPassNumber;
        });
        contents.push.apply(contents, wi32le(0x60030040 + band));
        contents.push.apply(contents, wi32le(pb.length));
        contents.push.apply(contents, pb);
        var pad = 4 - (pb.length % 4);
        if (pad < 4) for (var i = 0; i < pad; i++) contents.push(0);
      });

    function writeHeader(h) {
      var b = [];
      function w(e) { b.push.apply(b, w32le(e)); }
      w(h.magic1); w(h.crc32); w(h.sizeMinusHeader); w(h.magic2);
      w(0); w(0); w(0); w(h.shiftedSampleRateId); w(0); w(0);
      w(h.numberSamplesPlusDividedSampleRate); w(h.fixedValue);
      return b;
    }
    header.sizeMinusHeader = contents.length + 8;
    var buf = writeHeader(header);
    buf.push.apply(buf, wi32le(0x40000000));
    buf.push.apply(buf, wi32le(contents.length + 8));
    buf.push.apply(buf, contents);
    header.crc32 = crc32(buf.slice(8));
    var nh = writeHeader(header);
    buf.splice.apply(buf, [0, nh.length].concat(nh));
    return buf;
  };
  DecodedMessage.prototype.encodeToUri = function () {
    return URI_PREFIX + b64encode(this.encodeToBinary());
  };

  // Yinelemeli radix-2 FFT (fft.js ve saf DFT ile dogrulandi)
  function fftInPlace(re, im) {
    var n = re.length, i, j, k, len;
    for (i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        var t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (len = 2; len <= n; len <<= 1) {
      var ang = (-2 * Math.PI) / len;
      var cwr = Math.cos(ang), cwi = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        var wr = 1, wi = 0;
        for (k = 0; k < len / 2; k++) {
          var ur = re[i + k], ui = im[i + k];
          var vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
          var vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
          var nwr = wr * cwr - wi * cwi;
          wi = wr * cwi + wi * cwr; wr = nwr;
        }
      }
    }
  }

  // np.hanning(2050)[1:-1] ile ayni degerler
  var HANN = new Float64Array(2048);
  for (var hi = 0; hi < 2048; hi++) HANN[hi] = 0.5 * (1 - Math.cos((2 * Math.PI * (hi + 1)) / 2049));

  function RingBuffer(size, fill) {
    this.list = new Array(size);
    for (var i = 0; i < size; i++) this.list[i] = typeof fill === "function" ? fill() : fill;
    this.position = 0;
    this.bufferSize = size;
  }
  function pyMod(a, b) { return ((a % b) + b) % b; }

  function SignatureGenerator() {
    this.initFields();
  }
  SignatureGenerator.prototype.initFields = function () {
    function zeros1025() { return new Float32Array(1025); }
    this.ringBufferOfSamples = new RingBuffer(2048, 0);
    this.fftOutputs = new RingBuffer(256, zeros1025);
    this.spreadFFTsOutput = new RingBuffer(256, zeros1025);
    this.nextSignature = new DecodedMessage();
    this.nextSignature.sampleRateHz = 16000;
    this.nextSignature.numberSamples = 0;
    this.nextSignature.frequencyBandToSoundPeaks = {};
    this.numSpreadDone = 0;
  };
  SignatureGenerator.prototype.getSignature = function (samples) {
    var sliceLength = Math.min(12 * 16000, samples.length);
    if (samples.length > 12 * 16000) {
      var mid = Math.floor(samples.length / 2);
      samples = samples.slice(mid - 6 * 16000, mid + 6 * 16000);
    }
    samples = samples.slice(0, sliceLength);
    this.nextSignature.numberSamples += samples.length;
    for (var i = 0; i < samples.length; i += 128) {
      this.doFFT(samples.slice(i, i + 128));
      this.doPeakSpreading();
      this.numSpreadDone++;
      if (this.numSpreadDone >= 46) this.doPeakRecognition();
    }
    var out = this.nextSignature;
    this.initFields();
    return out;
  };
  SignatureGenerator.prototype.doFFT = function (batch) {
    var rb = this.ringBufferOfSamples;
    for (var i = 0; i < batch.length; i++) {
      rb.list[(rb.position + i) % 2048] = batch[i];
    }
    rb.position = (rb.position + batch.length) % 2048;
    var excerpt = new Array(2048);
    for (var k = 0; k < 2048; k++) excerpt[k] = rb.list[(rb.position + k) % 2048] * HANN[k];
    var re = excerpt.slice(), im = new Array(2048).fill(0);
    fftInPlace(re, im);
    var results = this.fftOutputs.list[pyMod(this.fftOutputs.position++, this.fftOutputs.bufferSize)];
    for (var b = 0; b <= 1024; b++) {
      var e = (re[b] * re[b] + im[b] * im[b]) / (1 << 17);
      results[b] = Math.max(1e-10, e);
    }
  };
  SignatureGenerator.prototype.doPeakSpreading = function () {
    var origin = this.fftOutputs.list[pyMod(this.fftOutputs.position - 1, this.fftOutputs.bufferSize)];
    var spread = this.spreadFFTsOutput.list[pyMod(this.spreadFFTsOutput.position, this.spreadFFTsOutput.bufferSize)];
    spread.set(origin);
    for (var p = 0; p <= 1022; p++) {
      var m = spread[p];
      if (spread[p + 1] > m) m = spread[p + 1];
      if (spread[p + 2] > m) m = spread[p + 2];
      spread[p] = m;
    }
    for (var q = 0; q <= 1024; q++) {
      var offs = [-1, -3, -6];
      for (var o = 0; o < 3; o++) {
        var f = this.spreadFFTsOutput.list[pyMod(this.spreadFFTsOutput.position + offs[o], this.spreadFFTsOutput.bufferSize)];
        if (f[q] < spread[q]) f[q] = spread[q];
      }
    }
    this.spreadFFTsOutput.position++;
  };
  SignatureGenerator.prototype.doPeakRecognition = function () {
    var fftMinus46 = this.fftOutputs.list[pyMod(this.fftOutputs.position - 46, this.fftOutputs.bufferSize)];
    var fftMinus49 = this.spreadFFTsOutput.list[pyMod(this.spreadFFTsOutput.position - 49, this.spreadFFTsOutput.bufferSize)];
    for (var bin = 10; bin <= 1014; bin++) {
      if (!(fftMinus46[bin] >= 1 / 64 && fftMinus46[bin] >= fftMinus49[bin - 1])) continue;
      var maxN = 0;
      var no = [-10, -7, -4, -3, 1, 2, 5, 8];
      for (var a = 0; a < no.length; a++) {
        var c = fftMinus49[bin + no[a]];
        if (c > maxN) maxN = c;
      }
      if (!(fftMinus46[bin] > maxN)) continue;
      var maxO = maxN;
      var oo = [-53, -45, 165, 172, 179, 186, 193, 200, 214, 221, 228, 235, 242, 249];
      for (var z = 0; z < oo.length; z++) {
        var c2 = this.spreadFFTsOutput.list[pyMod(this.spreadFFTsOutput.position + oo[z], this.spreadFFTsOutput.bufferSize)][bin - 1];
        if (c2 > maxO) maxO = c2;
      }
      if (!(fftMinus46[bin] > maxO)) continue;
      var fftNumber = this.numSpreadDone - 46;
      var mag = Math.log(Math.max(1 / 64, fftMinus46[bin])) * 1477.3 + 6144;
      var magB = Math.log(Math.max(1 / 64, fftMinus46[bin - 1])) * 1477.3 + 6144;
      var magA = Math.log(Math.max(1 / 64, fftMinus46[bin + 1])) * 1477.3 + 6144;
      var v1 = mag * 2 - magB - magA;
      var v2 = ((magA - magB) * 32) / v1;
      var corrBin = ((bin * 64 + v2) & 0xffff) >>> 0;
      var freqHz = corrBin * (16000 / 2 / 1024 / 64);
      var band;
      if (freqHz < 250) continue;
      else if (freqHz < 520) band = 0;
      else if (freqHz < 1450) band = 1;
      else if (freqHz < 3500) band = 2;
      else if (freqHz <= 5500) band = 3;
      else continue;
      var name = FB_NAME[band];
      if (!this.nextSignature.frequencyBandToSoundPeaks[name]) this.nextSignature.frequencyBandToSoundPeaks[name] = [];
      this.nextSignature.frequencyBandToSoundPeaks[name].push(
        new FrequencyPeak(fftNumber, (Math.round(mag) & 0xffff) >>> 0, corrBin, 16000)
      );
    }
  };

  function shazamSignatureUri(int16Samples) {
    var gen = new SignatureGenerator();
    var sig = gen.getSignature(Array.prototype.slice.call(int16Samples));
    if (!sig) return null;
    return { uri: sig.encodeToUri(), samplems: Math.round((sig.numberSamples / sig.sampleRateHz) * 1000) };
  }

  root.shazamSignatureUri = shazamSignatureUri;
  if (typeof module !== "undefined" && module.exports) module.exports = { shazamSignatureUri: shazamSignatureUri };
})(typeof globalThis !== "undefined" ? globalThis : this);
