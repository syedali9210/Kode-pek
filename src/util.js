import * as THREE from 'three'

export const TAU = Math.PI * 2
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const seg = (t, a, b) => clamp((t - a) / (b - a))
export const smooth = (x) => x * x * (3 - 2 * x)
export const easeOut = (x) => 1 - Math.pow(1 - x, 3)
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
export const easeIn = (x) => x * x * x
export const easeOutBack = (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt))
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
export const touch = matchMedia('(hover: none)').matches

let seed = 11
export const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647

// ---- tweens run on the main render loop so everything shares one clock
const tweens = new Set()
export function tween(duration, onUpdate, ease = (x) => x) {
  return new Promise((resolve) => {
    if (duration <= 0) { onUpdate(1, 1); resolve(); return }
    tweens.add({ t: 0, duration, onUpdate, ease, resolve })
  })
}
export const wait = (s) => tween(s, () => {})
export function updateTweens(dt) {
  for (const tw of tweens) {
    tw.t = Math.min(tw.duration, tw.t + dt)
    const k = tw.t / tw.duration
    tw.onUpdate(tw.ease(k), k)
    if (k >= 1) { tweens.delete(tw); tw.resolve() }
  }
}

// ---- images (shared by cartridge labels, screen cards, stickers)
const images = new Map()
export function loadImage(src) {
  if (!images.has(src)) {
    images.set(src, new Promise((resolve) => {
      const im = new Image()
      im.decoding = 'async'
      im.onload = () => resolve(im)
      im.onerror = () => resolve(null)
      im.src = src
    }))
  }
  return images.get(src)
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}
let maxAniso = 8
export const setMaxAniso = (n) => (maxAniso = n)
export function canvasTex(canvas, srgb = true) {
  const t = new THREE.CanvasTexture(canvas)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = maxAniso
  return t
}

// draw an image cover-fitted into a rect
export function drawCover(ctx, im, x, y, w, h, ax = 0.5, ay = 0.35) {
  const s = Math.max(w / im.width, h / im.height)
  const sw = w / s, sh = h / s
  ctx.drawImage(im, (im.width - sw) * ax, (im.height - sh) * ay, sw, sh, x, y, w, h)
}
export function drawContain(ctx, im, x, y, w, h) {
  const s = Math.min(w / im.width, h / im.height)
  const dw = im.width * s, dh = im.height * s
  ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

export function wrapLines(ctx, text, maxW) {
  const words = text.split(' '), lines = []
  let line = ''
  for (const w of words) {
    const t = line ? line + ' ' + w : w
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w } else line = t
  }
  if (line) lines.push(line)
  return lines
}

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
