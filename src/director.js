import * as THREE from 'three'
import { FOV } from './three/stage.js'
import { FZ } from './three/device.js'
import { SLOT_SCALE } from './three/cartridge.js'
import { scroll } from './scroll.js'
import { clamp, damp, lerp, smooth, easeOut, easeIn, easeInOut, easeOutBack, tween, wait, reduced } from './util.js'
import { audio, sfx } from './audio.js'
import { projects, stickers } from './content.js'

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
export const STACKED = matchMedia('(max-width: 820px), (max-aspect-ratio: 21/20)')
const REST = V(-0.16, 0.5, 0.1)
const ABOUT_ROT = V(0.06, Math.PI - 0.42, -0.05)
const STAR_OFF = V(0.42, 1.12, -0.9), BADGE_OFF = V(-0.5, -1.05, -0.55)

function pose(o = {}) {
  return { cam: V(), look: V(), rigPos: V(), rigRot: REST.clone(), scale: 1, poster: 0, dof: 0, focus: V(), ...o }
}
function lerpPose(out, a, b, f) {
  out.cam.lerpVectors(a.cam, b.cam, f); out.look.lerpVectors(a.look, b.look, f)
  out.rigPos.lerpVectors(a.rigPos, b.rigPos, f); out.rigRot.lerpVectors(a.rigRot, b.rigRot, f)
  out.focus.lerpVectors(a.focus, b.focus, f)
  out.scale = lerp(a.scale, b.scale, f); out.poster = lerp(a.poster, b.poster, f); out.dof = lerp(a.dof, b.dof, f)
  return out
}
function copyPose(out, a) { return lerpPose(out, a, a, 0) }

export function createDirector({ stage, device, poster, screen, carts, homeCart, ctx }) {
  const { camera } = stage
  const rig = device.rig
  const entries = stickers.filter((s) => s.entry)
  const N = projects.length
  let shots = [], casePose = pose(), frontPose = pose(), zoomPose = pose(), catchPose = pose()
  const cur = pose(), target = pose()
  const F = { dist: 7, hh: 2, hw: 2, wide: true }
  let seq = null // an active sequence overrides the scroll-driven pose
  const tilt = { x: 0, y: 0 }

  // ---------------------------------------------------------------- layout: build every shot for this viewport
  function layout() {
    const a = stage.size.aspect, t = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    F.dist = Math.max(4.0 / (2 * t), 3.45 / (2 * t * a))
    F.hh = F.dist * t; F.hw = F.hh * a
    F.wide = !STACKED.matches // same query as the CSS stacked layout, so 3D framing and DOM switch together
    const eye = V(0, 0.12, F.dist), at = V(0, 0.12, 0)
    // landscape: nudge the console left so the tagline gets the empty bottom-right corner, like the poster's haze
    // wide: console holds the left half, the headline gets the right column. narrower wide screens shrink it to fit.
    const hero = pose({
      cam: eye.clone(), look: at.clone(), poster: 1,
      // stacked: console fits the top ~55% of the screen (tag to cartridge is ~3.5 units tall), copy below
      rigPos: V(F.wide ? -F.hw * 0.33 : 0, !F.wide ? F.hh * 0.42 : 0, 0),
      scale: F.wide ? Math.min(1, Math.max(0.74, a / 1.7)) : Math.min(0.92, (1.1 * F.hh) / 3.5),
    })

    // one close-up per sticker: pose the rig, read the sticker's world spot, park the camera in front of it
    const saved = { p: rig.position.clone(), r: rig.rotation.clone(), s: rig.scale.x }
    rig.position.set(0, 0, 0); rig.rotation.set(ABOUT_ROT.x, ABOUT_ROT.y, ABOUT_ROT.z); rig.scale.setScalar(1)
    rig.updateMatrixWorld(true)
    const q = new THREE.Quaternion().setFromEuler(rig.rotation)
    const n = V(0, 0, -1).applyQuaternion(q)
    const up = V(0, 1, 0)
    const right = n.clone().negate().cross(up).normalize()
    const center = device.device.getWorldPosition(V())
    const about = entries.map((s) => {
      const p = device.stickerWorld(s.id)
      if (F.wide) {
        // oblique close-up: the camera sits off to one side so the flat back recedes and DoF melts everything but this sticker
        const d = 3.2, th = 0.5
        const c = p.clone().addScaledVector(n, d * Math.cos(th)).addScaledVector(right, -d * Math.sin(th)).addScaledVector(up, 0.18)
        return pose({ cam: c, look: p.clone().addScaledVector(right, 0.85), rigRot: ABOUT_ROT.clone(), dof: 1, focus: p })
      }
      // narrow: the whole back sits in the top ~60% (copy lives below), panning a little toward each sticker
      const d = Math.max(8.2, 1.15 / (t * a))
      const hd = d * t
      const aim = center.clone().lerp(p, 0.35).addScaledVector(up, -0.42 * hd)
      const c = aim.clone().addScaledVector(n, d).addScaledVector(right, -0.9).addScaledVector(up, 0.3)
      return pose({ cam: c, look: aim, rigRot: ABOUT_ROT.clone(), dof: 0.6, focus: p })
    })
    rig.position.copy(saved.p); rig.rotation.copy(saved.r); rig.scale.setScalar(saved.s)

    const works = pose({
      cam: eye.clone(), look: at.clone(),
      rigPos: F.wide ? V(F.hw * 0.66, -F.hh * 0.42, -0.2) : V(F.hw * 1.8, -F.hh * 0.45, 0), // phones: parked off-screen right
      rigRot: V(-0.08, F.wide ? -0.5 : -0.4, 0.04),
      scale: F.wide ? 0.64 : 0.52,
    })
    const contact = pose({
      cam: eye.clone(), look: at.clone(), poster: 1,
      rigPos: F.wide ? V(F.hw * 0.4, 0.05, 0) : V(0, F.hh * 0.28, 0),
      rigRot: V(-0.12, 0.42, 0.08),
      scale: F.wide ? 0.95 : 0.72,
    })
    shots = [hero, ...about, works, works, contact]
    // where the console waits to catch a flying cartridge
    catchPose = F.wide ? works : pose({ cam: eye.clone(), look: at.clone(), rigPos: V(0, -F.hh * 0.28, 0), rigRot: V(-0.05, -0.2, 0.02), scale: 0.62 })

    casePose = pose({
      cam: eye.clone(), look: at.clone(), poster: !F.wide ? 0 : 1,
      // desktop: lifted so the cartridge + ring clear the HUD mini-console docked bottom-left
      rigPos: !F.wide ? V(0, F.hh * 0.48, 0) : V(-F.hw * 0.52, 0.2, 0),
      rigRot: V(-0.1, 0.42, 0.05),
      scale: !F.wide ? 0.56 : Math.min(0.84, F.hw * 0.26),
    })
    // insert sequence poses: square up to camera, then dive into the screen
    const sc = V(0, 0.5, FZ - 0.055)
    const fd = Math.max(3.4 / (2 * t), 2.4 / (2 * t * a))
    frontPose = pose({ cam: V(0, 0.3, fd), look: V(0, 0.3, 0), rigRot: V(0, 0, 0) })
    const zd = Math.min(0.56 / t, 0.8 / (t * a)) * 0.92
    zoomPose = pose({ cam: sc.clone().add(V(0, 0, zd)), look: sc.clone(), rigRot: V(0, 0, 0) })
  }

  // ---------------------------------------------------------------- which part of the home page we're in
  function homeSection() {
    const s = Math.round(scroll.shot)
    return s === 0 ? 'title' : s <= entries.length ? 'about' : s <= entries.length + 2 ? 'works' : 'contact'
  }
  const focusIndex = () => Math.round(scroll.works * (N - 1))

  // ---------------------------------------------------------------- screen direction
  const scr = { key: '', countdown: 9, next: 0, channel: 0 }
  function directScreen(t) {
    const route = ctx.route
    if (seq?.screen) return // the sequence owns the screen
    let key = ''
    if (route.name === 'home') {
      const sec = homeSection()
      if (sec === 'works') key = `works:${focusIndex()}`
      else if (sec === 'contact') key = 'contact'
      else key = sec
    } else key = `case:${route.slug}:${scroll.stop}`
    if (key !== scr.key) {
      const prev = scr.key
      scr.key = key
      device.clearOsd('bottom'); device.clearOsd('center')
      if (key === 'title' || key === 'about') {
        device.state.contentTarget = 0
        if (key === 'title') device.setOsd('bottom', '~PRESS START')
      } else if (key.startsWith('works')) {
        const i = focusIndex()
        screen.select(projects[i], i, N)
        device.state.contentTarget = 1
        device.setPalette(projects[i].palette)
        if (prev.startsWith('works')) sfx.tick()
      } else if (key === 'contact') {
        scr.countdown = 9; scr.next = t + 1
        screen.cont(9)
        device.state.contentTarget = 1
      } else if (key.startsWith('case')) {
        const el = scroll.stops[scroll.stop]
        const p = ctx.project
        if (el && p) {
          const lv = {
            n: +el.dataset.n || 0, name: el.dataset.name || '', stage: el.dataset.stage,
            img: el.dataset.img || null, i: scroll.stop, total: scroll.stops.length,
            kicker: el.dataset.n > 0 && !el.dataset.stage ? `LEVEL ${el.dataset.n} OF ${scroll.stops[scroll.stops.length - 1].dataset.n - 1}` : '',
          }
          if (el.hasAttribute('data-scores')) screen.scores(p, lv)
          else if (el.hasAttribute('data-complete')) screen.complete(p)
          else screen.level(p, lv)
          device.state.contentTarget = 1
          if (prev.startsWith('case')) { sfx.level(scroll.stop); device.hop(0.35) }
          ctx.onStop?.(scroll.stop, el)
        }
      }
    }
    if (key === 'contact' && t > scr.next) {
      scr.countdown--
      if (scr.countdown < -1) scr.countdown = 9
      if (scr.countdown >= -1) {
        screen.cont(scr.countdown)
        if (scr.countdown >= 0) sfx.tick()
      }
      scr.next = t + (scr.countdown === -1 ? 4 : 1)
    }
  }

  // ---------------------------------------------------------------- cartridge carousel (home works)
  const tmpP = V(), tmpE = new THREE.Euler(), tmpQ = new THREE.Quaternion()
  function directCarts(dt, t) {
    const home = ctx.route.name === 'home'
    const s = scroll.shot
    const fw = scroll.works * (N - 1)
    const e = clamp((s - (entries.length + 0.2)) / 0.8)
    const x = clamp((s - (entries.length + 2.05)) / 0.6)
    const X0 = F.wide ? -F.hw * 0.02 : 0, Y0 = F.wide ? 0.2 : F.hh * 0.28
    const SP = F.wide ? 1.95 : 2.4, S = F.wide ? 1 : 0.92
    projects.forEach((p, i) => {
      const c = carts.get(p.slug)
      if (c.inSlot || c.busy) return
      const on = home && e > 0.001 && x < 0.999
      c.root.visible = on
      if (!on) return
      const d = i - fw, w = Math.max(0, 1 - Math.abs(d))
      const hov = c.hover
      // queue: upcoming carts climb up-right and back (above the console); played ones slide off left
      const ahead = Math.max(0, d), behind = Math.min(0, d)
      tmpP.set(
        X0 + ahead * SP * 0.78 + behind * SP * 2.3 + (1 - easeOut(e)) * F.hw * 2.4 - easeIn(x) * F.hw * 2.6,
        Y0 + ahead * (F.wide ? 0.62 : 0.5) + behind * 0.15 + w * 0.1 + Math.sin(t * 1.2 + i) * 0.04 * (reduced ? 0 : 1) + hov * 0.12,
        -ahead * 1.5 + behind * 0.6 + w * 0.3,
      )
      if (c.snap) { c.root.position.copy(tmpP); c.snap = false } else c.root.position.lerp(tmpP, 1 - Math.exp(-dt * 9))
      tmpE.set(-0.06 - hov * 0.1 - tilt.y * 0.2 * w, -d * 0.45 + Math.sin(t * 0.7 + i) * 0.12 * w + tilt.x * 0.3 * w, d * 0.05)
      tmpQ.setFromEuler(tmpE)
      c.root.quaternion.slerp(tmpQ, 1 - Math.exp(-dt * 8))
      const sc = S * (0.78 + 0.22 * w) * (1 + hov * 0.04) * Math.max(0.5, 1 + behind * 0.2)
      c.root.scale.setScalar(damp(c.root.scale.x, sc, 8, dt))
    })
  }

  // ---------------------------------------------------------------- per frame
  let introK = 1
  const setIntro = (k) => (introK = k)
  const tmpC = V(), tmpB = V()
  function update(dt, t) {
    const route = ctx.route
    tilt.x = damp(tilt.x, ctx.pointer.x, 3.5, dt)
    tilt.y = damp(tilt.y, ctx.pointer.y, 3.5, dt)

    if (seq) copyPose(target, seq.pose)
    else if (route.name === 'case') copyPose(target, casePose)
    else {
      const s = scroll.shot, i = Math.min(Math.floor(s), shots.length - 2), f = smooth(clamp(s - i))
      lerpPose(target, shots[i], shots[i + 1], f)
    }
    const k = 1 - Math.exp(-dt * (seq?.k || 3.2))
    cur.cam.lerp(target.cam, k); cur.look.lerp(target.look, k)
    cur.rigPos.lerp(target.rigPos, k); cur.rigRot.lerp(target.rigRot, k)
    cur.focus.lerp(target.focus, k)
    cur.scale = lerp(cur.scale, target.scale, k); cur.poster = lerp(cur.poster, target.poster, k); cur.dof = lerp(cur.dof, target.dof, k)

    // intro: rise, spin and pop into place
    const ik = easeOut(introK)
    const fl = reduced || seq ? 0 : 1
    const close = cur.dof // stickers close-up: calm everything down
    const pt = (1 - close * 0.8) * (seq ? 0 : 1)
    rig.position.copy(cur.rigPos)
    rig.position.y += Math.sin(t * 1.1) * 0.045 * fl * (1 - close * 0.7) + audio.beat * 0.02 + (1 - ik) * -0.7
    if (route.name === 'case' && !F.wide) rig.position.y += (scroll.y / innerHeight) * F.hh * 2
    rig.rotation.set(
      cur.rigRot.x - tilt.y * 0.16 * pt + ctx.drag.y + Math.sin(t * 0.8) * 0.025 * fl,
      cur.rigRot.y + tilt.x * 0.26 * pt + ctx.drag.x + Math.sin(t * 0.55) * 0.04 * fl * (1 - close) + (1 - ik) * -1.4,
      cur.rigRot.z + Math.sin(t * 0.7 + 1) * 0.015 * fl,
    )
    rig.scale.setScalar(cur.scale * (0.72 + 0.28 * easeOutBack(introK, 1.4)))

    camera.position.copy(cur.cam)
    camera.position.x += tilt.x * 0.18 * pt
    camera.position.y += tilt.y * 0.1 * pt
    camera.lookAt(cur.look)
    stage.setDof(cur.dof, camera.position.distanceTo(cur.focus))

    stage.key.target.position.copy(rig.position)
    stage.key.position.copy(rig.position).add(tmpC.set(4.5, 4, 5.5))

    // stickers pop when their entry is active
    const active = route.name === 'home' ? Math.round(scroll.shot) - 1 : -1
    device.stickers.forEach((e) => (e.active = e.s.entry && entries.indexOf(e.s) === active))

    const anchor = tmpC.copy(cur.rigPos)
    if (route.name === 'case' && !F.wide) anchor.y += (scroll.y / innerHeight) * F.hh * 2
    poster.update(dt, t, {
      amount: cur.poster * ik,
      beat: audio.beat, music: audio.music,
      starPos: tmpP.copy(STAR_OFF).multiplyScalar(rig.scale.x).add(anchor),
      badgePos: tmpB.copy(BADGE_OFF).multiplyScalar(rig.scale.x).add(anchor),
      scale: rig.scale.x,
    })

    directCarts(dt, t)
    if (!seq) directScreen(t)
    seq?.tick?.(dt, t)
  }

  function snap() {
    if (ctx.route.name === 'case') copyPose(cur, casePose)
    else {
      const s = scroll.shot, i = Math.min(Math.floor(s), shots.length - 2)
      lerpPose(cur, shots[i], shots[i + 1], smooth(clamp(s - i)))
    }
    scr.key = ''
  }

  // ---------------------------------------------------------------- sequences
  const sp = V(), sq = new THREE.Quaternion(), down = V()
  const slotWorld = () => {
    rig.updateMatrixWorld(true)
    device.slotAnchor.getWorldPosition(sp)
    device.slotAnchor.getWorldQuaternion(sq)
    down.set(0, -1, 0).applyQuaternion(sq)
  }

  function dropCart(c, toCamera = false) {
    c.busy = true
    stage.scene.attach(c.root)
    const p0 = c.root.position.clone()
    slotWorld()
    const dir = down.clone()
    const spin = (Math.random() - 0.5) * 2
    return tween(toCamera ? 0.75 : 0.6, (k) => {
      c.root.position.copy(p0).addScaledVector(dir, easeIn(k) * (toCamera ? 1.2 : 2.2))
      if (toCamera) c.root.position.add(tmpC.set(-k * k * 2.5, k * k * 1.2, k * k * 2))
      c.root.rotation.z += spin * 0.05
      c.root.rotation.x += 0.03
    }).then(() => { c.root.visible = false; c.busy = false })
  }

  async function insert(slug, swap) {
    const c = carts.get(slug), p = c.project
    c.busy = true
    const hc = homeCart
    sfx.whoosh()
    seq = { pose: catchPose, k: F.wide ? 3.2 : 5, screen: true }
    if (!F.wide) await wait(0.45)
    dropCart(hc)
    // flight: arc from the shelf to just under the slot, turning to match the console
    stage.scene.attach(c.root)
    const p0 = c.root.position.clone(), q0 = c.root.quaternion.clone(), s0 = c.root.scale.x
    const pre = V(), ctrl = V(), pos = V()
    await tween(0.85, (k) => {
      slotWorld()
      const rs = rig.scale.x
      pre.copy(sp).addScaledVector(down, 0.95 * rs)
      ctrl.lerpVectors(p0, pre, 0.5).add(tmpC.set(0, 1.1, 0.9))
      pos.copy(p0).multiplyScalar((1 - k) * (1 - k)).addScaledVector(ctrl, 2 * k * (1 - k)).addScaledVector(pre, k * k)
      c.root.position.copy(pos)
      c.root.quaternion.slerpQuaternions(q0, sq, easeOut(k))
      c.root.scale.setScalar(lerp(s0, SLOT_SCALE * rs, easeInOut(k)))
    }, easeInOut)
    await tween(0.18, (k) => {
      slotWorld()
      pos.copy(sp).addScaledVector(down, 0.95 * rig.scale.x * (1 - k))
      c.root.position.copy(pos); c.root.quaternion.copy(sq)
    }, easeIn)
    device.slotAnchor.attach(c.root)
    c.root.position.set(0, 0, 0); c.root.quaternion.identity(); c.root.scale.setScalar(SLOT_SCALE)
    c.inSlot = true; c.busy = false
    sfx.clunk(); device.shake(1); device.hop(-0.7); device.swing(1.2)
    // boot + square up
    device.state.power = true
    device.setPalette(p.palette)
    device.state.contentTarget = 1
    seq = { pose: frontPose, k: 3.4, screen: true }
    await wait(0.25)
    sfx.boot()
    let last = -1
    await tween(1.05, (k) => { const q = Math.round(k * 30); if (q !== last) { last = q; screen.boot(p, k) } })
    seq = { pose: zoomPose, k: 3.6, screen: true }
    await wait(0.6)
    await swap()
    seq = null
  }

  async function eject(swap) {
    const c = [...carts.values()].find((x) => x.inSlot)
    seq = { pose: copyPose(pose(), cur), k: 3, screen: true }
    sfx.click()
    device.hop(0.6)
    if (c) { c.inSlot = false; sfx.whoosh(); await Promise.race([dropCart(c, true), wait(0.35)]) }
    await swap()
    seq = null
  }

  // put carts back where they belong after a route swap
  function resetCarts(route) {
    projects.forEach((p) => {
      const c = carts.get(p.slug)
      const inSlot = route.name === 'case' && route.slug === p.slug
      c.busy = false
      if (inSlot) {
        device.slotAnchor.attach(c.root)
        c.root.position.set(0, 0, 0); c.root.quaternion.identity(); c.root.scale.setScalar(SLOT_SCALE)
        c.root.rotation.set(0, 0, 0)
        c.root.visible = true; c.inSlot = true
      } else {
        stage.scene.attach(c.root)
        c.inSlot = false; c.snap = true; c.root.rotation.set(0, 0, 0)
      }
    })
    const home = route.name === 'home'
    homeCart.busy = false
    device.slotAnchor.attach(homeCart.root)
    homeCart.root.position.set(0, 0, 0); homeCart.root.rotation.set(0, 0, 0); homeCart.root.scale.setScalar(SLOT_SCALE)
    homeCart.root.visible = home
    homeCart.inSlot = home
  }

  return { layout, update, snap, insert, eject, resetCarts, homeSection, focusIndex, setIntro, frame: F, get busy() { return !!seq } }
}
