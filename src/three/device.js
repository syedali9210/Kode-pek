import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'
import { TAU, rand, makeCanvas, canvasTex, damp, clamp, loadImage, drawCover } from '../util.js'
import { stickers as STICKERS } from '../content.js'

export const W = 2.0, H = 2.56, D = 0.8, FZ = D / 2
export const SCREEN_ASPECT = 1.43

// ---------------------------------------------------------------- geometry helpers
function rr(path, w, h, r, cx = 0, cy = 0) {
  const x = cx - w / 2, y = cy - h / 2
  path.moveTo(x + r, y)
  path.lineTo(x + w - r, y); path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  path.lineTo(x + w, y + h - r); path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  path.lineTo(x + r, y + h); path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  path.lineTo(x, y + r); path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return path
}
export { rr }
export function extrude(shape, depth, bevel, segs = 4, crease = 0.7) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 24 })
  return toCreasedNormals(g, crease)
}
const V2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y))
function cloverShape(d, r) {
  const s = new THREE.Shape()
  const tp = (d + Math.sqrt(2 * r * r - d * d)) / 2
  const phi = Math.atan2(tp, tp - d)
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2
    s.absarc(d * Math.cos(a), d * Math.sin(a), r, a - phi, a + phi, false)
  }
  return s
}

// ---------------------------------------------------------------- screen shader
const screenFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime, uGlitch, uOff, uBeat, uSheen, uContentMix, uGain;
  uniform vec2 uSize;
  uniform vec3 uDark, uMid, uHigh;
  uniform sampler2D uLogo, uOsd, uContent;
  #define ASPECT 1.43

  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
  float leaves(vec2 p, float t){
    vec2 i = floor(p), f = fract(p); float best = 9.0, id = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
      vec2 g = vec2(float(x), float(y));
      vec2 h = vec2(hash(i + g), hash(i + g + 19.7));
      vec2 o = 0.5 + 0.38 * sin(t * 0.5 + 6.2831 * h);
      vec2 r = g + o - f; float d = dot(r, r);
      if (d < best){ best = d; id = h.x; }
    }
    return id * smoothstep(0.62, 0.05, sqrt(best));
  }
  float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  float inBox(vec2 u){ return step(0.0, u.x) * step(u.x, 1.0) * step(0.0, u.y) * step(u.y, 1.0); }

  // procedural green-lit venue: foliage canopy, tendrils, fairy lights, bokeh, a crowd
  float sceneLum(vec2 uv, float t){
    vec2 p = vec2(uv.x * ASPECT, uv.y);
    vec2 ps = p + vec2(0.012 * sin(t * 0.7 + p.y * 4.0), 0.0);
    float L = 0.03 + 0.1 * smoothstep(0.1, 1.0, uv.y) + 0.5 * smoothstep(0.3, 0.75, fbm(p * 1.6 + vec2(0.0, t * 0.02)));
    float edge = 0.52 + 0.22 * fbm(vec2(p.x * 2.6, 3.1));
    float canopy = smoothstep(edge - 0.12, edge + 0.1, uv.y);
    float lv = leaves(ps * 11.0, t) * 0.75 + leaves(ps * 23.0 + 7.0, t * 1.3) * 0.55 + leaves(ps * 45.0 + 3.0, t) * 0.3;
    float dap = fbm(ps * 4.0 + vec2(t * 0.05, 0.0));
    L = mix(L, 0.02 + lv * (0.25 + 0.9 * dap), canopy * 0.9);
    float tn = noise(vec2(ps.x * 38.0, uv.y * 1.3 + 4.0));
    float tendril = smoothstep(0.72, 0.9, tn) * smoothstep(edge - 0.32, edge, uv.y) * (1.0 - canopy);
    L += tendril * (0.2 + 0.5 * leaves(ps * vec2(40.0, 60.0), t));
    vec2 sg = (uv - vec2(0.84, 0.58)) * vec2(1.3, 0.85);
    L += 0.95 * exp(-dot(sg, sg) * 11.0) * (0.75 + 0.25 * fbm(p * 8.0));
    {
      float y0 = 0.9;
      float wire = y0 - 0.09 * sin(3.14159 * uv.x);
      L += 0.06 * smoothstep(0.003, 0.0, abs(uv.y - wire));
      float sx = uv.x * 9.0;
      float bx = (floor(sx) + 0.5) / 9.0;
      float by = y0 - 0.09 * sin(3.14159 * bx) - 0.015;
      float d = length(vec2((uv.x - bx) * ASPECT, uv.y - by));
      float tw = 0.55 + 0.45 * sin(t * 2.2 + floor(sx) * 2.1);
      L += (smoothstep(0.012, 0.005, d) * 1.8 + exp(-d * d * 700.0) * 0.5) * tw;
    }
    for (int k = 0; k < 10; k++){
      float fk = float(k);
      vec2 c = vec2(hash(vec2(fk, 1.7)), 0.3 + 0.7 * hash(vec2(fk, 2.9)));
      c += 0.02 * vec2(sin(t * 0.37 + fk * 1.1), cos(t * 0.29 + fk * 1.7));
      float r = 0.015 + 0.03 * hash(vec2(fk, 3.3));
      float d = length((uv - c) * vec2(ASPECT, 1.0));
      float disc = smoothstep(r, r - 0.008, d);
      float tw = 0.3 + 0.25 * sin(t * 1.3 + fk * 2.3);
      L += disc * tw * (0.45 + 0.5 * smoothstep(r - 0.012, r, d));
    }
    float crowd = 0.0;
    for (int k = 0; k < 11; k++){
      float fk = float(k);
      float cx = (fk + 0.1 + 0.6 * hash(vec2(fk, 5.0))) / 10.6;
      float bob = 0.006 * sin(t * 1.9 + fk * 2.4) + uBeat * 0.022 * (0.5 + hash(vec2(fk, 6.0)));
      float hy = 0.19 + 0.07 * hash(vec2(fk, 9.0)) + bob;
      vec2 hp = vec2((uv.x - cx) * ASPECT, uv.y - hy);
      float head = smoothstep(0.043, 0.036, length(hp * vec2(1.0, 0.88)));
      vec2 bp = vec2((uv.x - cx) * ASPECT * 0.82, uv.y - hy + 0.135);
      float body = smoothstep(0.105, 0.097, length(bp));
      crowd = max(crowd, max(head, body));
    }
    L = mix(L, 0.012, crowd * 0.94);
    L += 0.18 * smoothstep(0.09, 0.0, uv.y) * noise(vec2(uv.x * 18.0, t * 0.5));
    return L;
  }
  vec3 grade(float L){
    vec3 c = mix(uDark, uMid, smoothstep(0.02, 0.55, L));
    c = mix(c, uHigh, smoothstep(0.55, 1.15, L));
    return c * (1.0 + max(L - 0.9, 0.0) * 1.8);
  }
  vec3 image(vec2 uv, float t){
    float gl = uGlitch;
    float tq = floor(t * 24.0);
    float band = floor(uv.y * 34.0);
    float jump = step(0.55, hash(vec2(band, tq)));
    uv.x += (hash(vec2(band * 1.3, tq + 1.0)) - 0.5) * 0.16 * gl * jump;
    uv.y += gl * 0.03 * sin(tq);
    vec3 col = vec3(0.0);
    if (uContentMix < 0.999) {
      col = grade(sceneLum(uv, t));
      vec2 lc = uv - vec2(0.47, 0.58 + 0.008 * sin(t * 1.7) + uBeat * 0.012);
      lc /= (1.0 + uBeat * 0.05);
      vec2 luv = lc / vec2(0.8, 0.8 * ASPECT / 1.6) + 0.5;
      float ca = 0.004 + 0.03 * gl;
      float la = texture2D(uLogo, luv).a * inBox(luv);
      float lr = texture2D(uLogo, luv + vec2(ca, 0.0)).a * inBox(luv);
      float lb = texture2D(uLogo, luv - vec2(ca, 0.0)).a * inBox(luv);
      vec2 suv = luv + vec2(-0.01, 0.022);
      float sh = texture2D(uLogo, suv).a * inBox(suv);
      col *= 1.0 - sh * 0.6;
      col = mix(col, vec3(1.3), la);
      col.r += lr * 0.4 * (1.0 - la); col.b += lb * 0.4 * (1.0 - la);
    }
    if (uContentMix > 0.001) {
      float ca = 0.0012 + 0.02 * gl;
      vec3 cc = vec3(texture2D(uContent, uv + vec2(ca, 0.0)).r, texture2D(uContent, uv).g, texture2D(uContent, uv - vec2(ca, 0.0)).b);
      float lum = dot(cc, vec3(0.3, 0.59, 0.11));
      cc *= 1.0 + uGain * lum * lum;
      col = mix(col, cc, uContentMix);
    }
    vec4 o = texture2D(uOsd, uv) * inBox(uv);
    col = mix(col, o.rgb * 1.5, o.a);
    float sl = 0.5 + 0.5 * sin(uv.y * 6.2831 * 105.0);
    col *= 0.76 + 0.24 * sl;
    col *= 1.0 + 0.07 * smoothstep(0.12, 0.0, abs(fract(uv.y * 0.6 - t * 0.13) - 0.5));
    col *= 0.975 + 0.025 * sin(t * 50.0);
    float n = hash(uv * vec2(913.0, 571.0) + fract(t * 7.13) * 91.0);
    col += (n - 0.5) * 0.04;
    col = mix(col, vec3(n) * 1.1, gl * 0.55);
    vec2 v = uv - 0.5; col *= 1.0 - dot(v, v) * 1.0;
    return max(col, 0.0);
  }
  void main(){
    vec2 P = (vUv - 0.5) * uSize;
    vec2 hb = uSize * 0.5 - 0.06;
    float d = sdRR(P, hb, 0.06);
    vec2 uv = P / (hb * 2.0) + 0.5;
    vec2 cc = uv - 0.5; uv = 0.5 + cc * (1.0 + 0.1 * dot(cc, cc));
    float sy = mix(1.0, 0.006, smoothstep(0.0, 0.55, uOff));
    float sx = mix(1.0, 0.0, smoothstep(0.55, 1.0, uOff));
    vec2 q = (uv - 0.5) / vec2(max(sx, 1e-3), sy) + 0.5;
    float vis = inBox(q) * step(0.001, sx);
    vec3 col = image(q, uTime) * vis;
    col = mix(col, vec3(1.6, 1.7, 1.6) * vis, smoothstep(0.25, 0.6, uOff));
    vec2 dp = (uv - 0.5) * vec2(ASPECT, 1.0);
    col += vec3(1.5) * exp(-dot(dp, dp) * 900.0) * smoothstep(0.55, 0.8, uOff) * (1.0 - smoothstep(0.85, 1.0, uOff));
    float inside = smoothstep(0.004, -0.002, d);
    col = mix(vec3(0.01, 0.01, 0.012), col, inside);
    col *= mix(1.0, 0.4 + 0.6 * smoothstep(0.0, 0.07, -d), inside);
    float g = vUv.x * 0.7 + vUv.y + uSheen;
    float sheen = smoothstep(0.95, 1.02, g) * smoothstep(1.35, 1.05, g);
    col += vec3(0.06) * sheen + vec3(0.025) * smoothstep(0.4, 1.0, vUv.y);
    gl_FragColor = vec4(col, 1.0);
  }`

// ---------------------------------------------------------------- sticker art (die-cut, drawn on canvas)
function dieCut(c, draw, pad = 18) {
  // white die-cut border = the shape stroked fat in white, with a soft drop shadow
  c.save()
  c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 14; c.shadowOffsetY = 5
  c.fillStyle = '#fbfaf6'; c.strokeStyle = '#fbfaf6'; c.lineWidth = pad * 2; c.lineJoin = 'round'
  draw(true)
  c.restore()
  draw(false)
}
function stickerCanvas(s, img) {
  const hRatio = s.kind === 'photo' ? 1.28 : s.kind === 'engg' ? 0.5 : s.kind === 'barcode' ? 0.34 : s.kind === 'pen' ? 0.62 : 1
  const Wc = 512, Hc = Math.round(512 * hRatio)
  const cv = makeCanvas(Wc, Hc), c = cv.getContext('2d')
  const m = 26 // margin for the die-cut border + shadow
  const box = (fill, r) => (isBase) => {
    c.beginPath(); c.roundRect(m, m, Wc - 2 * m, Hc - 2 * m, r)
    if (isBase) { c.fill(); c.stroke() } else { c.fillStyle = fill; c.fill() }
  }
  if (s.kind === 'photo') {
    dieCut(c, (base) => {
      c.beginPath(); c.roundRect(m, m, Wc - 2 * m, Hc - 2 * m, 18)
      if (base) { c.fill(); c.stroke(); return }
      c.fillStyle = '#fbfaf6'; c.fill()
      const px = m + 22, py = m + 22, pw = Wc - 2 * m - 44, ph = Hc - 2 * m - 120
      c.save(); c.beginPath(); c.roundRect(px, py, pw, ph, 10); c.clip()
      if (img) drawCover(c, img, px, py, pw, ph, 0.5, 0.3)
      else { c.fillStyle = '#2a3a3c'; c.fillRect(px, py, pw, ph) }
      c.restore()
      c.fillStyle = '#10191b'; c.font = '52px "Archivo Black"'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText(s.caption, Wc / 2, Hc - m - 50, pw)
    })
  } else if (s.kind === 'moon') {
    dieCut(c, (base) => {
      c.beginPath(); c.arc(Wc / 2, Hc / 2, Wc / 2 - m, 0, TAU)
      if (base) { c.fill(); c.stroke(); return }
      c.fillStyle = '#16204a'; c.fill()
      for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(255,255,255,${0.4 + rand() * 0.6})`; c.beginPath(); c.arc(100 + rand() * 320, 90 + rand() * 330, 2 + rand() * 4, 0, TAU); c.fill() }
      c.fillStyle = '#ffe600'
      c.beginPath(); c.arc(215, 200, 95, 0, TAU); c.fill()
      c.fillStyle = '#16204a'; c.beginPath(); c.arc(260, 170, 88, 0, TAU); c.fill()
      c.fillStyle = '#ffe600'; c.font = '118px "Archivo Black"'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText('2AM', Wc / 2, 372)
    })
  } else if (s.kind === 'engg') {
    dieCut(c, (base) => {
      box('#2f62e6', 40)(base)
      if (base) return
      c.fillStyle = '#fff'; c.font = '70px "Archivo Black"'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText('ENGG → UX', Wc / 2, Hc / 2 - 14, Wc - 2 * m - 40)
      c.font = '500 26px Oswald'; c.fillStyle = '#cfe0ff'
      c.fillText('BUILT DIFFERENT SINCE 2ND YEAR', Wc / 2, Hc / 2 + 48)
    })
  } else if (s.kind === 'basenine') {
    dieCut(c, (base) => {
      box('#050505', 36)(base)
      if (base) return
      if (img) c.drawImage(img, 60, 70, Wc - 120, Wc - 170)
      c.fillStyle = '#ffe600'; c.fillRect(m, Hc - m - 110, Wc - 2 * m, 72)
      c.fillStyle = '#050505'; c.font = '600 34px Oswald'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText('PRODUCT DESIGNER · 2026', Wc / 2, Hc - m - 74)
    })
  } else if (s.kind === 'pen') {
    dieCut(c, (base) => {
      box('#ffe600', 60)(base)
      if (base) return
      c.save(); c.translate(120, Hc / 2); c.rotate(-0.7)
      c.fillStyle = '#f5664a'; c.fillRect(-70, -16, 110, 32)
      c.fillStyle = '#f4d3a0'; c.beginPath(); c.moveTo(40, -16); c.lineTo(78, 0); c.lineTo(40, 16); c.fill()
      c.fillStyle = '#10191b'; c.beginPath(); c.moveTo(66, -5); c.lineTo(78, 0); c.lineTo(66, 5); c.fill()
      c.fillStyle = '#ffb3c6'; c.fillRect(-88, -16, 18, 32)
      c.restore()
      c.fillStyle = '#10191b'; c.font = '54px "Archivo Black"'; c.textAlign = 'left'; c.textBaseline = 'middle'
      c.fillText('PEN &', 200, Hc / 2 - 34); c.fillText('PAPER', 200, Hc / 2 + 30)
    })
  } else if (s.kind === 'burst') {
    dieCut(c, (base) => {
      c.beginPath()
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * TAU, r = i % 2 ? 150 : 222
        c.lineTo(Wc / 2 + Math.cos(a) * r, Hc / 2 + Math.sin(a) * r)
      }
      c.closePath()
      if (base) { c.fill(); c.stroke(); return }
      c.fillStyle = '#f53d18'; c.fill()
      c.fillStyle = '#fff'; c.font = '96px "Archivo Black"'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText('NEW!', Wc / 2, Hc / 2 + 6)
    })
  } else if (s.kind === 'barcode') {
    dieCut(c, (base) => {
      box('#fbfaf6', 12)(base)
      if (base) return
      c.fillStyle = '#10191b'
      let x = m + 26
      while (x < Wc - m - 150) { const w = rand() < 0.35 ? 7 : 3; c.fillRect(x, m + 18, w, Hc - 2 * m - 36); x += w + 4 + rand() * 4 }
      c.font = '600 26px Oswald'; c.textAlign = 'left'; c.textBaseline = 'middle'
      c.fillText('SA-2026', Wc - m - 138, Hc / 2 - 16); c.fillText('PLAYER 1', Wc - m - 138, Hc / 2 + 18)
    }, 12)
  }
  return cv
}

// ---------------------------------------------------------------- the device
export function createDevice() {
  const M = {
    body: new THREE.MeshPhysicalMaterial({ color: '#f5ddd5', roughness: 0.42, metalness: 0.08, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#f1eff4', metalness: 1, roughness: 0.18 }),
    lilac: new THREE.MeshStandardMaterial({ color: '#bdb6dc', metalness: 0.85, roughness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: '#150f10', roughness: 0.75 }),
    gun: new THREE.MeshPhysicalMaterial({ color: '#3b2f2d', metalness: 0.75, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    white: new THREE.MeshPhysicalMaterial({ color: '#e9ebef', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    clover: new THREE.MeshPhysicalMaterial({ color: '#cfe7f7', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    tagFace: new THREE.MeshPhysicalMaterial({ color: '#f4e79c', roughness: 0.45, clearcoat: 0.3 }),
    tagSide: new THREE.MeshPhysicalMaterial({ color: '#f5c01e', roughness: 0.4, clearcoat: 0.3 }),
    card: new THREE.MeshPhysicalMaterial({ color: '#7b7ef0', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.55 }),
    redLed: new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff2a1a', emissiveIntensity: 1.5, roughness: 0.3 }),
    magLed: new THREE.MeshStandardMaterial({ color: '#c0287e', emissive: '#e0208c', emissiveIntensity: 1.2, roughness: 0.3 }),
    slot: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.6, roughness: 0.25 }),
  }

  const rig = new THREE.Group() // moved around by the director
  const device = new THREE.Group() // local effects: hop, shake, intro scale
  rig.add(device)
  const pickables = []
  const tagAction = (obj, action) => { obj.traverse((o) => { if (o.isMesh) { o.userData.action = action; pickables.push(o) } }); return obj }

  // shell
  {
    const s = rr(new THREE.Shape(), W - 0.08, H - 0.08, 0.12)
    s.holes.push(rr(new THREE.Path(), 1.76, 1.28, 0.14, 0, 0.5))
    const plate = new THREE.Mesh(extrude(s, 0.1, 0.04), M.body)
    plate.position.z = FZ - 0.14
    const b = rr(new THREE.Shape(), W - 0.104, H - 0.104, 0.11)
    const back = new THREE.Mesh(extrude(b, D - 0.24, 0.04), M.body)
    back.position.z = -FZ + 0.04
    device.add(plate, back)
    tagAction(plate, 'body'); tagAction(back, 'body')
  }

  // screen: procedural scene + logo + content canvas + OSD
  const logoCanvas = makeCanvas(1024, 640)
  {
    const c = logoCanvas.getContext('2d')
    c.translate(512, 330); c.rotate(-0.075)
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = 11; c.lineJoin = 'round'
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'
    c.font = '250px Pacifico'
    for (const [t, x, y] of [['Syed', -60, -24], ['Ali', 120, 200]]) { c.strokeText(t, x, y); c.fillText(t, x, y) }
  }
  const content = makeCanvas(1024, 716)
  const contentTex = canvasTex(content)
  const osdCanvas = makeCanvas(512, 358)
  const osdTex = canvasTex(osdCanvas)
  const screenMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uGlitch: { value: 0 }, uOff: { value: 1 }, uBeat: { value: 0 }, uSheen: { value: 0 }, uContentMix: { value: 0 }, uGain: { value: 0.9 },
      uSize: { value: new THREE.Vector2(1.74, 1.26) },
      uDark: { value: new THREE.Color('#010c04') }, uMid: { value: new THREE.Color('#10d23c') }, uHigh: { value: new THREE.Color('#dcffd4') },
      uLogo: { value: canvasTex(logoCanvas) }, uOsd: { value: osdTex }, uContent: { value: contentTex },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: screenFrag,
  })
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.74, 1.26), screenMat)
  screen.position.set(0, 0.5, FZ - 0.055)
  device.add(tagAction(screen, 'screen'))

  // light slot
  {
    const slot = new THREE.Mesh(extrude(rr(new THREE.Shape(), 0.34, 0.062, 0.031), 0.004, 0.006, 3), M.slot)
    slot.position.set(0, -0.19, FZ - 0.004)
    device.add(slot)
  }

  // screws (front + back)
  function screw(x, y, z, flip = false) {
    const g = new THREE.Group()
    const washer = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.008, 12, 40), M.chrome)
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.03, 0.014, 32), M.chrome)
    head.rotation.x = Math.PI / 2
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.007, 0.01), M.dark)
    const s2 = s1.clone(); s2.rotation.z = Math.PI / 2
    s1.position.z = s2.position.z = 0.005
    g.add(washer, head, s1, s2)
    g.position.set(x, y, z)
    g.rotation.set(0, flip ? Math.PI : 0, rand() * TAU)
    device.add(g)
  }
  for (const [x, y] of [[-0.88, 1.17], [0.88, 1.17], [-0.88, -1.17], [0.88, -1.17]]) { screw(x, y, FZ + 0.002); screw(x, y, -FZ - 0.002, true) }

  // arcade buttons
  const buttons = []
  function arcade(color, x, y, action) {
    const base = new THREE.Color(color)
    const mat = new THREE.MeshPhysicalMaterial({ color: base, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 })
    const rimMat = mat.clone(); rimMat.color = base.clone().multiplyScalar(0.6)
    const R = 0.118
    const g = new THREE.Group()
    g.position.set(x, y, FZ)
    g.rotation.x = Math.PI / 2
    const ring = new THREE.Mesh(new THREE.LatheGeometry(V2([[R * 1.34, 0], [R * 1.34, 0.02], [R * 1.28, 0.045], [R * 1.12, 0.05], [R * 1.03, 0.038], [R * 1.03, 0]]), 64), rimMat)
    const capG = new THREE.Group()
    capG.add(new THREE.Mesh(new THREE.LatheGeometry(V2([[R, 0], [R, 0.07], [R * 0.95, 0.088], [R * 0.84, 0.092], [R * 0.72, 0.084], [R * 0.35, 0.08], [0, 0.08]]), 64), mat))
    g.add(ring, capG)
    device.add(g)
    tagAction(g, action)
    buttons.push({ g, cap: capG, press: 0, target: 0, hover: 0, depth: 0.03, action, base: 0 })
  }
  arcade('#2f62e6', -0.52, -0.64, 'btn0')
  arcade('#f5b523', -0.19, -0.64, 'btn1')
  arcade('#ec3f26', 0.14, -0.64, 'btn2')

  // big smiley button
  const smileyCanvas = makeCanvas(512, 512)
  const smileyTex = canvasTex(smileyCanvas)
  function drawSmiley(face = 'smile') {
    const c = smileyCanvas.getContext('2d'), S = 512
    c.clearRect(0, 0, S, S)
    c.fillStyle = '#f2b52c'; c.fillRect(0, 0, S, S)
    const g = c.createRadialGradient(S * 0.38, S * 0.32, 10, S / 2, S / 2, S * 0.56)
    g.addColorStop(0, 'rgba(255,240,170,.6)'); g.addColorStop(1, 'rgba(190,110,0,.25)')
    c.fillStyle = g; c.fillRect(0, 0, S, S)
    c.strokeStyle = '#2b1a0a'; c.fillStyle = '#2b1a0a'; c.lineCap = 'round'; c.lineWidth = 11
    c.beginPath(); c.arc(S / 2, S / 2, S * 0.39, 0, TAU); c.stroke()
    c.lineWidth = 17
    c.beginPath()
    if (face === 'happy') {
      c.arc(S * 0.4, S * 0.46, S * 0.05, Math.PI * 1.15, Math.PI * 1.85)
      c.moveTo(S * 0.6 + S * 0.05 * Math.cos(Math.PI * 1.15), S * 0.46 + S * 0.05 * Math.sin(Math.PI * 1.15))
      c.arc(S * 0.6, S * 0.46, S * 0.05, Math.PI * 1.15, Math.PI * 1.85)
    } else if (face === 'eject') {
      c.stroke(); c.beginPath()
      c.moveTo(S * 0.5, S * 0.3); c.lineTo(S * 0.66, S * 0.5); c.lineTo(S * 0.34, S * 0.5); c.closePath(); c.fill()
      c.fillRect(S * 0.34, S * 0.56, S * 0.32, S * 0.07)
    } else {
      c.moveTo(S * 0.41, S * 0.38); c.lineTo(S * 0.41, S * 0.46)
      c.moveTo(S * 0.59, S * 0.38); c.lineTo(S * 0.59, S * 0.46)
    }
    c.stroke()
    if (face !== 'eject') { c.beginPath(); c.arc(S / 2, S * 0.5, S * (face === 'happy' ? 0.17 : 0.15), 0.18 * Math.PI, 0.82 * Math.PI); c.stroke() }
    smileyTex.needsUpdate = true
  }
  drawSmiley()
  {
    const g = new THREE.Group()
    g.position.set(0.7, -0.72, FZ)
    g.rotation.x = Math.PI / 2
    const h = 0.2
    const housing = new THREE.Mesh(new THREE.LatheGeometry(V2([[0.255, 0], [0.255, h - 0.02], [0.245, h], [0.215, h], [0.215, h - 0.01]]), 72), M.gun)
    const capG = new THREE.Group()
    capG.position.y = h
    const ring = new THREE.Mesh(new THREE.LatheGeometry(V2([[0.24, 0], [0.24, 0.03], [0.228, 0.048], [0.2, 0.05], [0.186, 0.035], [0.186, 0]]), 72), M.white)
    const yellow = new THREE.MeshPhysicalMaterial({ color: '#f2b52c', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 })
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.186, 0.186, 0.03, 64), yellow)
    cap.position.y = 0.015
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.186, 64), new THREE.MeshPhysicalMaterial({ map: smileyTex, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 }))
    face.rotation.x = -Math.PI / 2
    face.position.y = 0.0305
    capG.add(ring, cap, face)
    g.add(housing, capG)
    device.add(g)
    tagAction(g, 'smiley')
    buttons.push({ g, cap: capG, press: 0, target: 0, hover: 0, depth: 0.05, action: 'smiley', base: h })
  }

  // clover
  const clover = new THREE.Group()
  clover.add(new THREE.Mesh(extrude(cloverShape(0.052, 0.045), 0.022, 0.01, 3), M.clover))
  clover.position.set(0.7, -0.27, FZ)
  clover.rotation.z = Math.PI / 4
  device.add(tagAction(clover, 'clover'))

  // printed date: today's, in the poster's format
  {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const mon = now.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    const wk = now.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()
    const c = makeCanvas(1024, 160), x = c.getContext('2d')
    x.fillStyle = '#b3877d'; x.font = '400 150px Oswald'; x.textAlign = 'center'; x.textBaseline = 'middle'
    if ('letterSpacing' in x) x.letterSpacing = '4px'
    x.fillText(`${day} ${mon} // ${wk}`, 512, 86)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.156), new THREE.MeshStandardMaterial({ map: canvasTex(c), transparent: true, roughness: 0.6, depthWrite: false }))
    m.position.set(-0.17, -0.96, FZ + 0.001)
    device.add(m)
  }

  // left side: led pill, vents, knob, magenta leds
  const side = new THREE.Group()
  side.position.set(-0.99, 0, -0.08)
  side.rotation.y = -Math.PI / 2
  device.add(side)
  let knob
  {
    const cap = rr(new THREE.Shape(), 0.1, 0.25, 0.05)
    cap.holes.push(rr(new THREE.Path(), 0.07, 0.22, 0.035))
    const frame = new THREE.Mesh(extrude(cap, 0.006, 0.006, 2), M.lilac)
    frame.position.set(0.02, 0.95, 0)
    const well = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.2), M.dark)
    well.position.set(0.02, 0.95, 0.002)
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 16), M.redLed)
    led.scale.z = 0.4
    led.position.set(0.02, 1.02, 0.006)
    side.add(frame, well, led)
    const vent = new RoundedBoxGeometry(0.32, 0.03, 0.012, 2, 0.006)
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Mesh(vent, M.dark)
      v.position.set(0, 0.42 - i * 0.066, 0.001)
      side.add(v)
    }
    const kg = new THREE.CylinderGeometry(0.105, 0.105, 0.12, 144, 1)
    const p = kg.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i)
      if (Math.hypot(x, z) > 0.1) {
        const k = 1 + 0.035 * (0.5 + 0.5 * Math.cos(Math.atan2(z, x) * 36))
        p.setX(i, x * k); p.setZ(i, z * k)
      }
    }
    kg.computeVertexNormals()
    knob = new THREE.Mesh(kg, M.chrome)
    knob.rotation.x = Math.PI / 2
    const knobG = new THREE.Group()
    knobG.position.set(-0.01, -0.36, 0.06)
    const knobHit = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8)) // fatter hit target; raycaster ignores `visible`
    knobHit.visible = false
    knobG.add(knob, knobHit)
    side.add(tagAction(knobG, 'knob'))
    const pill = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.2, 0.014, 3, 0.02), M.magLed)
    pill.position.set(0, -0.74, 0.002)
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.026, 20, 14), M.magLed)
    dot.scale.z = 0.45
    dot.position.set(0, -0.97, 0.002)
    side.add(pill, dot)
  }

  // memory card on the right side
  const card = new THREE.Group()
  {
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.56, 0.07, 3, 0.022), M.card)
    const c = makeCanvas(256, 512), x = c.getContext('2d')
    x.fillStyle = '#f3eef6'; x.beginPath(); x.roundRect(8, 8, 240, 496, 26); x.fill()
    x.save(); x.translate(128, 256); x.rotate(-Math.PI / 2)
    x.fillStyle = '#3d3a8a'; x.textAlign = 'center'; x.textBaseline = 'middle'
    x.font = '800 44px Archivo'; x.fillText('SYED ALI', 0, -46)
    x.font = '500 30px Oswald'; x.fillText('MEMORY CARD · 26', 0, 4)
    x.fillStyle = '#1b1a3d'
    for (let i = 0; i < 38; i++) { const w = rand() < 0.4 ? 5 : 2.5; x.fillRect(-190 + i * 10, 40, w, 42) }
    x.restore()
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.44), new THREE.MeshStandardMaterial({ map: canvasTex(c), roughness: 0.55, transparent: true }))
    label.position.set(0.13, 0, 0.0362)
    card.add(body, label)
    card.position.set(0.99 + 0.12, 0.72, FZ - 0.22)
    device.add(tagAction(card, 'card'))
  }
  const cardBaseX = card.position.x

  // cartridge slot (the cartridge module parks carts here) + usb plug/cable + jack
  const slotAnchor = new THREE.Object3D()
  slotAnchor.position.set(-0.38, -1.34, -0.08)
  device.add(slotAnchor)
  {
    const plug = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.16, 0.11, 3, 0.035), M.rubber)
    plug.position.set(0.2, -1.34, -0.08)
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.2, -1.4, -0.08), new THREE.Vector3(0.22, -1.7, -0.05),
      new THREE.Vector3(0.4, -2.1, 0.15), new THREE.Vector3(0.75, -2.6, 0.35),
    ]), 48, 0.03, 12), M.rubber)
    const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 24), M.dark)
    jack.position.set(0.72, -1.281, -0.08)
    const jr = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.008, 10, 32), M.chrome)
    jr.rotation.x = Math.PI / 2; jr.position.copy(jack.position)
    device.add(plug, cable, jack, jr)
  }

  // tag + keyring (wobble with motion)
  const tagPivot = new THREE.Group()
  {
    const s = rr(new THREE.Shape(), 0.62, 0.72, 0.17)
    const hole = new THREE.Path(); hole.absarc(0, 0.21, 0.05, 0, TAU, true)
    s.holes.push(hole)
    const tag = new THREE.Mesh(extrude(s, 0.035, 0.02, 3), [M.tagFace, M.tagSide])
    tag.position.set(0, 0.24, -0.0275)
    tagPivot.add(tag)
    tagPivot.position.set(-0.22, 1.2, -0.14)
    tagPivot.rotation.z = -0.2
    device.add(tagAction(tagPivot, 'tag'))
  }
  const ringPivot = new THREE.Group()
  {
    const pts = []
    for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (i * TAU) / 3; pts.push(new THREE.Vector3(Math.cos(a) * 0.08, Math.sin(a) * 0.08 + 0.06, 0)) }
    ringPivot.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.2), 60, 0.013, 10, true), M.chrome))
    ringPivot.position.set(0.3, 1.25, -0.05)
    ringPivot.rotation.set(0.3, -0.4, -0.35)
    device.add(tagAction(ringPivot, 'tag'))
  }

  // stickers on the back
  const stickerMeshes = []
  STICKERS.forEach((s, i) => {
    const cv = stickerCanvas(s, null)
    const tex = canvasTex(cv)
    const w = s.w, h = (s.w * cv.height) / cv.width
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.02, roughness: 0.42, polygonOffset: true, polygonOffsetFactor: -2 - i * 0.2, depthWrite: false })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
    const g = new THREE.Group()
    g.position.set(-s.u, s.v, -FZ - 0.002 - i * 0.0004)
    g.rotation.set(0, Math.PI, s.rot)
    g.add(mesh)
    mesh.renderOrder = i
    mesh.userData.action = `sticker:${s.id}`
    pickables.push(mesh)
    device.add(g)
    const entry = { s, group: g, mesh, pop: 0, active: 0 }
    stickerMeshes.push(entry)
    const src = s.kind === 'basenine' ? '/me/basenine.jpeg' : s.src
    if (src) loadImage(src).then((im) => { const c2 = stickerCanvas(s, im); tex.image = c2; tex.needsUpdate = true })
  })
  const stickerWorld = (id, out = new THREE.Vector3()) => {
    const e = stickerMeshes.find((x) => x.s.id === id)
    return e.group.getWorldPosition(out)
  }

  device.traverse((o) => { if (o.isMesh && o !== screen && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true } })

  // ---------------------------------------------------------------- OSD (small overlay text on the screen)
  const osd = { lines: {}, sig: '' }
  const osdCtx = osdCanvas.getContext('2d')
  function setOsd(key, text, seconds = 0) { osd.lines[key] = { text, until: seconds ? performance.now() / 1000 + seconds : Infinity } }
  function clearOsd(key) { delete osd.lines[key] }
  function drawOsd(t) {
    const now = performance.now() / 1000
    const vis = {}
    for (const [k, l] of Object.entries(osd.lines)) {
      if (now > l.until) { delete osd.lines[k]; continue }
      if (l.text.startsWith('~') && t % 1 > 0.62) continue // "~text" blinks
      vis[k] = l.text.replace(/^~/, '')
    }
    const sig = JSON.stringify(vis)
    if (sig === osd.sig) return
    osd.sig = sig
    const c = osdCtx
    c.clearRect(0, 0, 512, 358)
    c.font = '34px VT323'; c.textBaseline = 'top'
    const txt = (s, x, y, align = 'left') => {
      c.textAlign = align
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillText(s, x + 2, y + 2)
      c.fillStyle = '#ecffec'; c.fillText(s, x, y)
    }
    if (vis.tl) txt(vis.tl, 26, 20)
    if (vis.tr) txt(vis.tr, 486, 20, 'right')
    if (vis.center) txt(vis.center, 256, 160, 'center')
    if (vis.bottom) txt(vis.bottom, 256, 300, 'center')
    if (vis.vol) {
      const v = +vis.vol
      txt('VOL', 70, 296)
      for (let i = 0; i < 12; i++) {
        c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(132 + i * 25 + 2, 302, 17, 24)
        c.fillStyle = i < v ? '#ecffec' : 'rgba(236,255,236,.25)'; c.fillRect(132 + i * 25, 300, 17, 24)
      }
    }
    osdTex.needsUpdate = true
  }

  // ---------------------------------------------------------------- state + per-frame update
  const state = {
    power: false, powerAnim: 1, glitch: 0, contentMix: 0, contentTarget: 0,
    palette: [new THREE.Color('#010c04'), new THREE.Color('#10d23c'), new THREE.Color('#dcffd4')],
    cardOut: 0, cardTarget: 0, cloverSpin: 0, knob: 0.6, hover: null,
    hop: 0, hopV: 0, shake: 0,
  }
  const tagSwing = { a: 0, v: 0 }, ringSwing = { a: 0, v: 0 }
  let prevRot = new THREE.Vector3(), prevAngVel = new THREE.Vector3()
  const tmpV = new THREE.Vector3()

  function setPalette(p) { state.palette = [new THREE.Color(p.dark), new THREE.Color(p.mid), new THREE.Color(p.high)] }
  function press(action, down = true) { const b = buttons.find((x) => x.action === action); if (b) b.target = down ? 1 : 0 }
  function tap(action) { press(action, true); setTimeout(() => press(action, false), 130) }
  function swing(k = 1) { tagSwing.v += (rand() > 0.5 ? 1 : -1) * 7 * k; ringSwing.v += 9 * k }
  function hop(k = 1) { state.hopV += 2.2 * k }
  function shake(k = 1) { state.shake = Math.max(state.shake, k) }

  function update(dt, t, { beat = 0, music = false }) {
    // wobbly attachments react to rig angular acceleration
    const rot = tmpV.set(rig.rotation.x, rig.rotation.y, rig.rotation.z)
    const angVel = rot.clone().sub(prevRot).divideScalar(Math.max(dt, 1e-3))
    const kick = angVel.clone().sub(prevAngVel)
    prevRot = rot.clone(); prevAngVel = angVel
    kick.clampScalar(-3, 3)
    tagSwing.v += (-tagSwing.a * 70 - tagSwing.v * 3.2) * dt - kick.y * 0.35 - kick.z * 0.6
    tagSwing.a += tagSwing.v * dt
    ringSwing.v += (-ringSwing.a * 45 - ringSwing.v * 2.2) * dt - kick.y * 0.6 + kick.x * 0.4
    ringSwing.a += ringSwing.v * dt
    tagPivot.rotation.z = -0.2 + clamp(tagSwing.a, -0.6, 0.6)
    ringPivot.rotation.x = 0.3 + clamp(ringSwing.a, -1, 1)

    // hop (spring) + shake
    state.hopV += (-state.hop * 60 - state.hopV * 7) * dt
    state.hop += state.hopV * dt
    state.shake = Math.max(0, state.shake - dt * 3)
    const sh = state.shake * state.shake
    device.position.set(Math.sin(t * 73) * 0.03 * sh, state.hop * 0.25 + Math.sin(t * 61) * 0.02 * sh, 0)
    device.rotation.set(-state.hop * 0.15, 0, Math.sin(t * 57) * 0.04 * sh)

    for (const b of buttons) {
      b.press = damp(b.press, b.target, b.target ? 40 : 18, dt)
      b.hover = damp(b.hover, state.hover === b.action ? 1 : 0, 12, dt)
      b.cap.position.y = b.base - b.press * b.depth + b.hover * 0.006
    }
    clover.rotation.z = damp(clover.rotation.z, Math.PI / 4 + state.cloverSpin, 10, dt)
    clover.position.z = FZ + (state.hover === 'clover' ? 0.008 : 0)
    knob.rotation.y = -state.knob * TAU * 0.8
    state.cardOut = damp(state.cardOut, state.cardTarget, 9, dt)
    card.position.x = cardBaseX + state.cardOut * 0.22 + (state.hover === 'card' ? 0.015 : 0)

    for (const e of stickerMeshes) {
      e.pop = damp(e.pop, e.active ? 1 : 0, 6, dt)
      e.mesh.scale.setScalar(1 + e.pop * 0.06 + (state.hover === `sticker:${e.s.id}` ? 0.03 : 0))
      e.mesh.position.z = e.pop * 0.012
    }

    // screen
    const on = state.power
    state.powerAnim = on ? Math.max(0, state.powerAnim - dt * 2.4) : Math.min(1, state.powerAnim + dt * 2.2)
    state.glitch = Math.max(0, state.glitch - dt * 2.8)
    state.contentMix = damp(state.contentMix, state.contentTarget, 10, dt)
    const u = screenMat.uniforms
    const k = 1 - Math.exp(-dt * 6)
    u.uDark.value.lerp(state.palette[0], k); u.uMid.value.lerp(state.palette[1], k); u.uHigh.value.lerp(state.palette[2], k)
    u.uTime.value = t
    u.uGlitch.value = state.glitch
    u.uOff.value = state.powerAnim
    u.uBeat.value = beat
    u.uContentMix.value = state.contentMix
    u.uSheen.value = rig.rotation.y * 0.7 + rig.rotation.x * 0.5
    drawOsd(t)

    const lit = 1 - state.powerAnim
    M.slot.emissiveIntensity = (0.35 + beat * 1.6) * lit + 0.02
    M.redLed.emissiveIntensity = 0.3 + 3 * Math.pow(Math.max(0, Math.sin(t * 2.2)), 16) * lit
    M.magLed.emissiveIntensity = (music ? 0.4 + beat * 3.5 : 0.5 + 0.45 * Math.sin(t * 1.4)) * lit + 0.05
  }

  return {
    rig, device, screen, screenMat, pickables, buttons, clover, card, knob, slotAnchor, stickers: stickerMeshes, stickerWorld,
    content, contentTex, state, setPalette, press, tap, swing, hop, shake, drawSmiley, setOsd, clearOsd, update,
  }
}
