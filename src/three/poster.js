import * as THREE from 'three'
import { TAU, rand, makeCanvas, canvasTex } from '../util.js'

// Flat poster graphics that live behind the console: yellow starburst + orange text ring. Plus confetti.
export function createPoster(stage, ringText) {
  const star = new THREE.Group()
  {
    const s = new THREE.Shape()
    const n = 13, outer = 0.95, inner = 0.48
    for (let i = 0; i < n * 2; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / n + (rand() - 0.5) * 0.12
      const r = i % 2 ? inner * (0.9 + rand() * 0.2) : outer * (0.78 + rand() * 0.34)
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    const mat = new THREE.MeshBasicMaterial({ color: '#ffe600', transparent: true })
    star.add(new THREE.Mesh(new THREE.ShapeGeometry(s), mat))
    star.userData.mat = mat
  }
  const canvas = makeCanvas(2048, 2048)
  {
    const c = canvas.getContext('2d')
    c.translate(1024, 1024)
    c.beginPath(); c.arc(0, 0, 1020, 0, TAU); c.arc(0, 0, 812, 0, TAU, true)
    c.fillStyle = '#f53d18'; c.fill()
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.font = '800 128px Archivo'
    const R = 916
    const widths = [...ringText].map((ch) => c.measureText(ch).width)
    const extra = (TAU * R - widths.reduce((a, b) => a + b, 0)) / ringText.length
    let a = 0
    ;[...ringText].forEach((ch, i) => {
      const w = widths[i] + extra
      a += w / 2 / R
      c.save(); c.rotate(a); c.translate(0, -R); c.fillText(ch, 0, 4); c.restore()
      a += w / 2 / R
    })
  }
  const badgeMat = new THREE.MeshBasicMaterial({ map: canvasTex(canvas), transparent: true, depthWrite: false })
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(2.048, 2.048), badgeMat)
  badge.rotation.z = 3.4
  stage.scene.add(star, badge)
  stage.noDepth.push(star, badge)

  // confetti
  const COUNT = 240
  const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.045, 0.075), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, metalness: 0.1 }), COUNT)
  confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  confetti.frustumCulled = false
  const pal = ['#ffe600', '#ff4a1c', '#3b6cff', '#ff7ab8', '#ffffff', '#1fd14a', '#bfe0ff', '#f5b523', '#8f6cf2'].map((c) => new THREE.Color(c))
  const parts = Array.from({ length: COUNT }, (_, i) => {
    confetti.setColorAt(i, pal[i % pal.length])
    return { p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0 }
  })
  stage.scene.add(confetti)
  stage.noDepth.push(confetti)
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _zero = new THREE.Vector3()
  function burst(origin, n = 140, power = 1) {
    let spawned = 0
    for (const p of parts) {
      if (p.life > 0 || spawned >= n) continue
      spawned++
      p.p.copy(origin)
      const a = rand() * TAU, up = 0.4 + rand() * 0.9
      p.v.set(Math.cos(a) * (1 + rand() * 2.2), 2.2 + up * 3.2, 1.2 + rand() * 2.6).multiplyScalar(power)
      p.r.set(rand() * TAU, rand() * TAU, rand() * TAU)
      p.w.set((rand() - 0.5) * 16, (rand() - 0.5) * 16, (rand() - 0.5) * 16)
      p.life = 2.6 + rand() * 1.2
    }
  }
  function updateConfetti(dt, t) {
    parts.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt
        p.v.y -= 6.5 * dt
        p.v.multiplyScalar(Math.pow(0.35, dt))
        p.v.x += Math.sin(t * 6 + i) * 1.2 * dt
        p.p.addScaledVector(p.v, dt)
        p.r.x += p.w.x * dt; p.r.y += p.w.y * dt; p.r.z += p.w.z * dt
        _s.setScalar(Math.min(1, p.life * 2))
        _m.compose(p.p, _q.setFromEuler(p.r), _s)
      } else _m.compose(_zero, _q.identity(), _s.setScalar(0))
      confetti.setMatrixAt(i, _m)
    })
    confetti.instanceMatrix.needsUpdate = true
  }

  // amount: 0 hidden .. 1 shown. Scales from 0.9 with opacity, never from nothing.
  let shown = 0, pop = 0
  function update(dt, t, { amount, beat = 0, music = false, starPos, badgePos, scale = 1 }) {
    shown += (amount - shown) * (1 - Math.exp(-dt * 5))
    pop = Math.max(0, pop - dt * 2.5)
    const p = Math.sin(pop * Math.PI)
    star.visible = badge.visible = shown > 0.01
    star.userData.mat.opacity = shown
    badgeMat.opacity = shown
    star.position.copy(starPos)
    badge.position.copy(badgePos)
    star.scale.setScalar(scale * (0.9 + 0.1 * shown) * (1 + 0.025 * Math.sin(t * 2.1) + beat * 0.1 + p * 0.25))
    star.rotation.z += dt * (0.06 + (music ? 0.25 : 0) + p * 2)
    badge.scale.setScalar(scale * (0.92 + 0.08 * shown))
    badge.rotation.z -= dt * (0.12 + (music ? 0.35 : 0))
    updateConfetti(dt, t)
  }
  return { star, badge, burst, update, pop: () => (pop = 1) }
}
