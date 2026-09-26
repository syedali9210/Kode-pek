import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { setMaxAniso } from '../util.js'

export const FOV = 30

const coarse = matchMedia('(pointer: coarse)').matches
const maxDpr = Math.min(devicePixelRatio || 1, 2)
// quality ladder: pixel ratios to step down through when frames run long (phones start at <= 1.5)
const TIERS = [...new Set([maxDpr, Math.min(maxDpr, 1.5), Math.min(maxDpr, 1.25), 1])]

// One direct pass: no post-processing chain, no shadow maps. On an integrated GPU the composer alone
// (MSAA float target + bloom + output + grain) cost ~20ms a frame; the scene itself is ~5ms.
// Contact shadows are baked into the console's textures, tone mapping happens inside each material
// and the vignette lives in the backdrop shader.
export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: false, powerPreference: 'high-performance' })
  let tier = coarse ? Math.max(0, TIERS.findIndex((d) => d <= 1.5)) : 0
  renderer.setPixelRatio(TIERS[tier])
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.debug.checkShaderErrors = import.meta.env.DEV // the status checks stall compiles; only worth it while developing
  setMaxAniso(renderer.capabilities.getMaxAnisotropy())

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.42
  pmrem.dispose()

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100)
  camera.position.set(0, 0.12, 7)

  scene.add(new THREE.HemisphereLight('#cfeee8', '#2a1e1c', 0.34))
  const key = new THREE.DirectionalLight('#fff3ea', 1.7)
  key.position.set(4.5, 4, 5.5)
  const rim = new THREE.DirectionalLight('#bfe4ff', 0.35)
  rim.position.set(-1.5, 5, -3)
  // a soft fill from behind so the sticker-covered back isn't a black hole
  const back = new THREE.DirectionalLight('#ffe9df', 0.7)
  back.position.set(-3, 2.5, -6)
  scene.add(key, key.target, rim, back)

  // Sized to the *large* viewport (100lvh, see #gl in CSS) so a phone's URL bar showing/hiding
  // never forces the drawing buffer to be reallocated mid-scroll.
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100lvh;visibility:hidden;pointer-events:none'
  document.body.appendChild(probe)
  const size = { w: 1, h: 1, aspect: 1 }
  function resize() {
    size.w = innerWidth; size.h = Math.max(innerHeight, probe.offsetHeight); size.aspect = size.w / size.h
    camera.aspect = size.aspect
    camera.updateProjectionMatrix()
    renderer.setSize(size.w, size.h, false)
  }

  const render = () => renderer.render(scene, camera)

  // Adaptive resolution: step the pixel ratio down after ~1.5s of sub-45fps frames, back up after 8s of
  // smooth ones. Two drops and it stays put, so a borderline GPU doesn't oscillate.
  const perf = { on: false, ema: 16.7, slow: 0, fast: 0, hold: 0, drops: 0 }
  function setTier(i) {
    tier = i
    renderer.setPixelRatio(TIERS[i])
    renderer.setSize(size.w, size.h, false)
    perf.slow = perf.fast = 0
    perf.hold = 2
  }
  function adapt(ms) {
    if (!perf.on || ms > 100 || document.hidden) return // tab switches and one-off hitches don't count
    perf.ema += (ms - perf.ema) * 0.05
    if (perf.hold > 0) { perf.hold -= ms / 1000; return }
    if (perf.ema > 22) { perf.slow += ms; perf.fast = 0 } else if (perf.ema < 17.5) { perf.fast += ms; perf.slow = 0 } else perf.slow = perf.fast = 0
    if (perf.slow > 1500 && tier < TIERS.length - 1) { perf.drops++; setTier(tier + 1) }
    else if (perf.fast > 8000 && tier > 0 && perf.drops < 2) setTier(tier - 1)
  }

  return { renderer, scene, camera, key, size, resize, render, adapt, perf, dpr: () => TIERS[tier] }
}
