// Every sound is synthesized: no audio files.
let actx = null, master = null, musicBus = null, noiseBuf = null
let volume = 0.6
export const audio = { muted: false, music: false, beat: 0 }

function ac() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)()
    master = actx.createGain()
    master.gain.value = audio.muted ? 0 : volume
    master.connect(actx.destination)
    const lp = actx.createBiquadFilter()
    lp.type = 'lowpass'; lp.frequency.value = 5200
    musicBus = actx.createGain(); musicBus.gain.value = 0.8
    musicBus.connect(lp).connect(master)
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (actx.state === 'suspended') actx.resume()
  return actx
}
export const unlockAudio = () => ac()

export function setMuted(m) {
  audio.muted = m
  if (master) master.gain.setTargetAtTime(m ? 0 : volume, actx.currentTime, 0.03)
}
export function setVolume(v) {
  volume = Math.min(1, Math.max(0, v))
  if (master && !audio.muted) master.gain.setTargetAtTime(volume, actx.currentTime, 0.02)
}
export const getVolume = () => volume

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
function tone(f, t, dur, type = 'square', g = 0.1, dest = master, slide = 0) {
  const o = actx.createOscillator(), v = actx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur)
  v.gain.setValueAtTime(0.0001, t)
  v.gain.exponentialRampToValueAtTime(g, t + 0.006)
  v.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(v).connect(dest)
  o.start(t); o.stop(t + dur + 0.03)
}
function hiss(t, dur, g = 0.2, freq = 3000, type = 'highpass', dest = master) {
  const s = actx.createBufferSource(); s.buffer = noiseBuf
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq
  const v = actx.createGain()
  v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(f).connect(v).connect(dest)
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03)
}

// Skip sound work entirely until the visitor has interacted (autoplay policy) or while muted.
const go = (fn) => (...a) => { if (!actx || audio.muted) return; ac(); fn(actx.currentTime, ...a) }
export const sfx = {
  btn: go((t, i = 0) => { hiss(t, 0.03, 0.25, 4000); tone([523, 659, 784, 587][i % 4], t, 0.14, 'square', 0.08, master, 0.5); tone([1046, 1318, 1568, 1174][i % 4], t + 0.05, 0.1, 'square', 0.045) }),
  tick: go((t) => hiss(t, 0.015, 0.16, 6000)),
  hover: go((t, i = 0) => tone(mtof(72 + [0, 4, 7, 12, 16][i % 5]), t, 0.06, 'triangle', 0.05)),
  click: go((t) => { hiss(t, 0.025, 0.3, 2500, 'bandpass'); hiss(t + 0.07, 0.02, 0.22, 3500, 'bandpass') }),
  clunk: go((t) => { tone(110, t, 0.18, 'square', 0.22, master, 0.5); hiss(t, 0.06, 0.4, 900, 'bandpass'); hiss(t + 0.05, 0.03, 0.2, 3000, 'bandpass') }),
  whoosh: go((t) => { const s = actx.createBufferSource(); s.buffer = noiseBuf; const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.35); const v = actx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.25, t + 0.12); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); s.connect(f).connect(v).connect(master); s.start(t); s.stop(t + 0.45) }),
  powerOn: go((t) => { tone(90, t, 0.25, 'sine', 0.3, master, 0.4); hiss(t, 0.35, 0.1, 1800); tone(1400, t + 0.05, 0.35, 'sine', 0.025, master, 1.6) }),
  powerOff: go((t) => { tone(700, t, 0.3, 'sine', 0.13, master, 0.2); hiss(t, 0.12, 0.1, 2500) }),
  static: go((t) => hiss(t, 0.28, 0.2, 1200, 'bandpass')),
  boing: go((t) => tone(220, t, 0.35, 'sine', 0.16, master, 1.9)),
  denied: go((t) => { tone(196, t, 0.12, 'square', 0.08); tone(147, t + 0.12, 0.2, 'square', 0.08) }),
  arp: go((t, up = true) => (up ? [60, 64, 67, 72, 76] : [76, 72, 67, 64, 60]).forEach((m, i) => tone(mtof(m), t + i * 0.055, 0.12, 'square', 0.06))),
  boot: go((t) => [67, 72, 76, 79, 84].forEach((m, i) => tone(mtof(m), t + 0.1 + i * 0.07, i === 4 ? 0.5 : 0.12, 'square', 0.06))),
  level: go((t, n = 0) => { tone(mtof(76 + (n % 5) * 2), t, 0.07, 'square', 0.045); tone(mtof(83 + (n % 5) * 2), t + 0.06, 0.1, 'square', 0.04) }),
  fanfare: go((t) => [[72, 0], [72, 0.12], [72, 0.24], [79, 0.36], [76, 0.62], [79, 0.74], [84, 0.86]].forEach(([m, d], i) => tone(mtof(m), t + d, i === 6 ? 0.6 : 0.1, 'square', 0.07))),
  coin: go((t) => { tone(988, t, 0.08, 'square', 0.07); tone(1319, t + 0.08, 0.3, 'square', 0.07) }),
}

// ---- chiptune loop, scheduled ahead on the audio clock
const BPM = 116, STEP = 60 / BPM / 4
const CHORDS = [[65, 69, 72, 76], [67, 71, 74, 77], [64, 67, 71, 74], [69, 72, 76, 79]]
const BASS = [41, 43, 40, 45]
const LEAD = [72, 0, 76, 0, 77, 76, 72, 0, 74, 0, 77, 0, 79, 77, 74, 0, 71, 0, 74, 0, 76, 74, 71, 74, 72, 0, 0, 76, 0, 74, 72, 0]
let timer = 0, nextNote = 0, step = 0, lastKick = -10
const kicks = []
function playStep(s, t) {
  const bar = Math.floor(s / 16) % 4, i = s % 16, chord = CHORDS[bar]
  if (i % 4 === 0) { tone(150, t, 0.16, 'sine', 0.5, musicBus, 0.27); kicks.push(t) }
  if (i === 4 || i === 12) { hiss(t, 0.14, 0.26, 1800, 'bandpass', musicBus); tone(190, t, 0.08, 'triangle', 0.14, musicBus, 0.6) }
  if (i % 2 === 1) hiss(t, 0.035, 0.09, 7000, 'highpass', musicBus)
  if ([0, 3, 6, 8, 10, 14].includes(i)) tone(mtof(BASS[bar] + (i === 10 ? 7 : 0)), t, STEP * 1.5, 'triangle', 0.3, musicBus)
  tone(mtof(chord[[0, 1, 2, 3, 2, 1, 2, 3][i % 8]] + 12), t, STEP * 0.8, 'square', 0.022, musicBus)
  if (i % 2 === 0) { const n = LEAD[(bar * 8 + i / 2) % 32]; if (n) tone(mtof(n), t, STEP * 1.8, 'square', 0.045, musicBus) }
}
function scheduler() {
  while (nextNote < actx.currentTime + 0.12) { playStep(step, nextNote); nextNote += STEP; step = (step + 1) % 64 }
}
export function setMusic(on) {
  if (on === audio.music) return
  audio.music = on
  if (on) { ac(); nextNote = actx.currentTime + 0.05; step = 0; timer = setInterval(scheduler, 25); scheduler() }
  else { clearInterval(timer); kicks.length = 0 }
}
export function updateBeat() {
  if (!actx || !audio.music) { audio.beat *= 0.9; return }
  while (kicks.length && kicks[0] <= actx.currentTime) lastKick = kicks.shift()
  audio.beat = Math.exp(-(actx.currentTime - lastKick) * 7)
}
