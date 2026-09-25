import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { extrude } from './device.js'
import { makeCanvas, canvasTex, loadImage, drawCover, drawContain, hexA } from '../util.js'

// Display size. Scaled by SLOT_SCALE when parked in the console.
export const CW = 1.3, CH = 1.5, CD = 0.2
export const SLOT_SCALE = 0.45

function cartShape() {
  const w = CW - 0.06, h = CH - 0.06, r = 0.07, n = 0.2
  const x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2
  const s = new THREE.Shape()
  s.moveTo(x0 + r, y0)
  s.lineTo(x1 - r, y0); s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x1, y1 - n) // the classic clipped corner
  s.lineTo(x1 - n, y1)
  s.lineTo(x0 + r, y1); s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x0, y0 + r); s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}
let shellGeo, ridgeGeo, pinGeo, stripGeo
function geos() {
  if (shellGeo) return
  shellGeo = extrude(cartShape(), CD - 0.06, 0.03, 3)
  shellGeo.translate(0, 0, -(CD - 0.06) / 2)
  ridgeGeo = new RoundedBoxGeometry(0.86, 0.026, 0.024, 2, 0.01)
  pinGeo = new THREE.BoxGeometry(0.032, 0.07, 0.012)
  stripGeo = new RoundedBoxGeometry(0.84, 0.1, 0.02, 2, 0.01)
}
const gold = new THREE.MeshStandardMaterial({ color: '#b98d36', metalness: 1, roughness: 0.58 })
const stripMat = new THREE.MeshStandardMaterial({ color: '#1b1418', roughness: 0.6 })

// ---- label art
const LW = 800, LH = 860
function drawLabel(c, p, idx, img) {
  const ink = p.ink || '#10191b'
  c.clearRect(0, 0, LW, LH)
  c.fillStyle = '#f7efe9'
  c.beginPath(); c.roundRect(0, 0, LW, LH, 34); c.fill()
  // top band
  c.fillStyle = ink
  c.beginPath(); c.roundRect(0, 0, LW, 104, [34, 34, 0, 0]); c.fill()
  c.fillStyle = '#f7efe9'
  c.font = '600 34px Oswald'; c.textBaseline = 'middle'; c.textAlign = 'left'
  if ('letterSpacing' in c) c.letterSpacing = '6px'
  c.fillText('PLAYER ONE ✦ CASE FILE', 36, 54)
  c.textAlign = 'right'
  c.fillText(idx != null ? `No.${String(idx + 1).padStart(2, '0')}` : 'HOME', LW - 36, 54)
  if ('letterSpacing' in c) c.letterSpacing = '0px'
  // art window
  const ax = 28, ay = 124, aw = LW - 56, ah = 430
  c.save()
  c.beginPath(); c.roundRect(ax, ay, aw, ah, 20); c.clip()
  const g = c.createLinearGradient(0, ay, 0, ay + ah)
  g.addColorStop(0, p.shell); g.addColorStop(1, ink)
  c.fillStyle = g; c.fillRect(ax, ay, aw, ah)
  if (img) {
    if (img.height > img.width * 1.2) {
      // phone screenshot: stand it in the window like a device
      c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 30
      drawContain(c, img, ax + aw * 0.28, ay + 24, aw * 0.44, ah - 48)
      c.restore()
    } else drawCover(c, img, ax, ay, aw, ah, 0.5, 0.15)
  }
  // halftone sheen
  const sh = c.createLinearGradient(ax, ay, ax + aw, ay + ah)
  sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, hexA(p.shell, 0.3))
  c.fillStyle = sh; c.fillRect(ax, ay, aw, ah)
  c.restore()
  // title
  c.fillStyle = ink
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'
  let fs = 132
  c.font = `${fs}px "Archivo Black"`
  const title = p.title.toUpperCase()
  while (c.measureText(title).width > LW - 72 && fs > 60) { fs -= 4; c.font = `${fs}px "Archivo Black"` }
  c.fillText(title, 34, 690)
  c.font = '600 34px Oswald'
  if ('letterSpacing' in c) c.letterSpacing = '4px'
  c.fillStyle = hexA(ink, 0.8)
  c.fillText((p.subtitle || '').toUpperCase(), 38, 742)
  if ('letterSpacing' in c) c.letterSpacing = '0px'
  // bottom row: tag chip + meta + rating badge
  c.font = '600 30px Oswald'
  const tag = (p.tag || '').toUpperCase()
  const tw = c.measureText(tag).width + 36
  c.fillStyle = p.shell
  c.beginPath(); c.roundRect(34, 772, tw, 52, 26); c.fill()
  c.fillStyle = '#fff'; c.textBaseline = 'middle'
  c.fillText(tag, 52, 799)
  c.fillStyle = hexA(ink, 0.75)
  c.fillText((p.meta || '').toUpperCase(), 34 + tw + 18, 799)
  // rating badge
  c.fillStyle = ink
  c.beginPath(); c.roundRect(LW - 118, 752, 84, 84, 12); c.fill()
  c.fillStyle = '#f7efe9'; c.textAlign = 'center'
  c.font = '52px "Archivo Black"'; c.fillText('PD', LW - 76, 790)
  c.font = '600 14px Oswald'; c.fillText('DESIGN', LW - 76, 822)
  if (p.comingSoon) {
    c.save()
    c.translate(LW / 2, 340); c.rotate(-0.32)
    c.fillStyle = '#ffe600'; c.fillRect(-520, -54, 1040, 108)
    c.fillStyle = '#10191b'; c.font = '62px "Archivo Black"'; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText('SEALED · COMING SOON', 0, 4)
    c.restore()
  }
}

export function createCartridge(p, idx = null) {
  geos()
  const root = new THREE.Group()
  const body = new THREE.Group() // hover/tilt offsets live here
  root.add(body)
  const shell = new THREE.MeshPhysicalMaterial({ color: p.shell, roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.28 })
  body.add(new THREE.Mesh(shellGeo, shell))

  const canvas = makeCanvas(LW, LH)
  drawLabel(canvas.getContext('2d'), p, idx, null)
  const tex = canvasTex(canvas)
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.0, (1.0 * LH) / LW), new THREE.MeshPhysicalMaterial({ map: tex, color: '#e4ddd8', roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3, transparent: true }))
  label.position.set(-0.03, 0.03, CD / 2 + 0.002)
  body.add(label)
  const src = p.cover || (p.slug === 'home' ? '/me/avatar.jpg' : null)
  if (src) loadImage(src).then((im) => { drawLabel(canvas.getContext('2d'), p, idx, im); tex.needsUpdate = true })

  // gold contacts along the top edge: the end that goes into the console
  const strip = new THREE.Mesh(stripGeo, stripMat)
  strip.position.set(-0.08, CH / 2 - 0.1, CD / 2 + 0.004)
  body.add(strip)
  for (let i = 0; i < 12; i++) {
    const pin = new THREE.Mesh(pinGeo, gold)
    pin.position.set(-0.45 + i * 0.067, CH / 2 - 0.1, CD / 2 + 0.013)
    body.add(pin)
  }
  // grip ridges along the bottom
  const ridgeMat = shell.clone(); ridgeMat.color = new THREE.Color(p.shell).multiplyScalar(0.8)
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(ridgeGeo, ridgeMat)
    r.position.set(0, -CH / 2 + 0.07 + i * 0.045, CD / 2 + 0.004)
    body.add(r)
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.action = `cart:${p.slug}` } })
  label.castShadow = false

  return {
    root, body, project: p, hover: 0,
    meshes: (() => { const a = []; root.traverse((o) => o.isMesh && a.push(o)); return a })(),
  }
}
