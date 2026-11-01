// Sekme sesini parca dusurmeden toplayan AudioWorklet (ayri ses threadi).
// ScriptProcessor'in aksine ana thread yogunlugundan etkilenmez.
class MusicCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunks = [];
    this.total = 0;
    this.port.onmessage = (e) => {
      if (e.data === "get") {
        const out = new Float32Array(this.total);
        let o = 0;
        for (const c of this.chunks) {
          out.set(c, o);
          o += c.length;
        }
        this.port.postMessage(out, [out.buffer]);
        this.chunks = [];
        this.total = 0;
      } else if (e.data === "reset") {
        this.chunks = [];
        this.total = 0;
      }
    };
  }

  process(inputs) {
    const ch = inputs[0];
    if (ch && ch.length > 0) {
      let mono;
      if (ch.length > 1) {
        mono = new Float32Array(ch[0].length);
        for (let i = 0; i < mono.length; i++) mono[i] = (ch[0][i] + ch[1][i]) / 2;
      } else {
        mono = ch[0].slice(0);
      }
      this.chunks.push(mono);
      this.total += mono.length;
    }
    return true;
  }
}

registerProcessor("music-capture", MusicCapture);
