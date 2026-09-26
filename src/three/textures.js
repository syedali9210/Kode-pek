import * as THREE from 'three'
import { makeCanvas, rand } from '../util.js'

// Procedural surface detail, generated once at boot on small canvases.

// one shared grain for every plastic part (clones share the upload, each keeps its own repeat)
let shared
export function grain(repeat = 1.2) {
  shared ??= microNormal()
  const t = shared.clone()
  t.repeat.set(repeat, repeat)
  return t
}

// Moulded-plastic micro texture ("EDM" spark-eroded finish): a tileable field of tiny craters and
// grain, turned into a normal map. It's what makes plastic read as matte instead of glossy.
export function microNormal({ size = 256, craters = 2600, rMin = 0.6, rMax = 2.4, grain = 0.35 } = {}) {
  const h = new Float32Array(size * size)
  const at = (x, y) => ((y + size) % size) * size + ((x + size) % size)
  for (let i = 0; i < h.length; i++) h[i] = (rand() - 0.5) * grain
  for (let k = 0; k < craters; k++) {
    const cx = rand() * size, cy = rand() * size, r = rMin + rand() * (rMax - rMin), d = 0.6 + rand() * 0.8
    const R = Math.ceil(r + 1)
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const q = Math.hypot(x - (cx % 1), y - (cy % 1)) / r
      if (q < 1) h[at(Math.floor(cx) + x, Math.floor(cy) + y)] -= d * (1 - q * q)
    }
  }
  const c = makeCanvas(size, size), ctx = c.getContext('2d'), img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = h[at(x + 1, y)] - h[at(x - 1, y)], dy = h[at(x, y + 1)] - h[at(x, y - 1)]
    const nx = -dx, ny = dy, nz = 2.2, l = Math.hypot(nx, ny, nz), i = (y * size + x) * 4
    img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.NoColorSpace
  t.anisotropy = 4
  return t
}

// A colour map for an extruded part whose UVs are its local x/y in device units (ExtrudeGeometry caps do
// that), so prints and baked contact shadows can be drawn in the same units the geometry is built in.
// `draw(ctx, u)` gets a context already transformed to device units (y up, origin at the centre).
export function printMap(w, h, base, draw, pxPerUnit = 512) {
  const c = makeCanvas(Math.round(w * pxPerUnit), Math.round(h * pxPerUnit)), ctx = c.getContext('2d')
  ctx.fillStyle = base; ctx.fillRect(0, 0, c.width, c.height)
  ctx.save()
  ctx.translate(c.width / 2, c.height / 2); ctx.scale(pxPerUnit, -pxPerUnit)
  draw(ctx, 1 / pxPerUnit)
  ctx.restore()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  // uv (= local x/y) → 0..1 across the canvas
  t.repeat.set(1 / w, 1 / h)
  t.offset.set(0.5, 0.5)
  return t
}

// paper tooth for printed labels: faint fibres and specks over whatever was drawn
export function paper(ctx, w, h, n = 1400) {
  ctx.save()
  for (let i = 0; i < n; i++) {
    const x = rand() * w, y = rand() * h, a = rand() * Math.PI, l = 2 + rand() * 7
    ctx.strokeStyle = rand() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(60,40,30,.05)'
    ctx.lineWidth = 0.6 + rand() * 0.8
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke()
  }
  ctx.restore()
}

// soft contact shadow ring around a round part sitting on the surface (drawn in device units)
export function aoRing(ctx, x, y, r, spread, alpha = 0.3, tint = '70,38,30') {
  const g = ctx.createRadialGradient(x, y, r * 0.96, x, y, r + spread)
  g.addColorStop(0, `rgba(${tint},${alpha})`)
  g.addColorStop(0.35, `rgba(${tint},${alpha * 0.45})`)
  g.addColorStop(1, `rgba(${tint},0)`)
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r + spread, 0, Math.PI * 2); ctx.fill()
}

// text in device units: canvas fonts don't like sub-pixel sizes, so draw at 100px and scale down
export function unitText(ctx, text, x, y, size, font, { align = 'left', color = '#000', spacing = 0, baseline = 'alphabetic' } = {}) {
  ctx.save()
  ctx.translate(x, y); ctx.scale(size / 100, -size / 100)
  ctx.font = font.replace('{s}', '100px')
  ctx.textAlign = align; ctx.textBaseline = baseline
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`
  ctx.fillStyle = color
  ctx.fillText(text, 0, 0)
  ctx.restore()
}
