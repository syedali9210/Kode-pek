import 'lenis/dist/lenis.css'
import './styles.css'
import * as THREE from 'three'
import { createStage } from './three/stage.js'
import { createBackdrop } from './three/backdrop.js'
import { createDevice } from './three/device.js'
import { createPoster } from './three/poster.js'
import { createCartridge, SLOT_SCALE } from './three/cartridge.js'
import { createScreen } from './three/screen.js'
import { createDirector } from './director.js'
import { initScroll, rafScroll, measure, update as updateScroll, scroll, lock, scrollTo, worksY, elTop } from './scroll.js'
import { homeHTML, caseHTML } from './pages.js'
import { me, projects, homeCart as homeCartData } from './content.js'
import { audio, sfx, unlockAudio, setMuted, setMusic, updateBeat, getVolume, setVolume } from './audio.js'
import { updateTweens, tween, wait, clamp, reduced, touch, easeOut, loadImage } from './util.js'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]

const CHANNELS = [
  { name: 'GREEN ROOM', dark: '#010c04', mid: '#10d23c', high: '#dcffd4' },
  { name: 'BLUE HOUR', dark: '#01040f', mid: '#2f6bff', high: '#dbe9ff' },
  { name: 'GOLDEN HOUR', dark: '#0e0600', mid: '#ffb21c', high: '#fff5d4' },
  { name: 'RED ROOM', dark: '#100105', mid: '#ff3548', high: '#ffe1dd' },
]

async function fontsReady() {
  const gf = $('#gf')
  await Promise.race([
    (async () => {
      if (!gf.sheet) await new Promise((r) => gf.addEventListener('load', r, { once: true }))
      await Promise.all(['250px Pacifico', '400 120px Oswald', '600 34px Oswald', '200px "Archivo Black"', '800 120px Archivo', '400 18px Archivo', '40px VT323'].map((f) => document.fonts.load(f)))
    })(),
    new Promise((r) => setTimeout(r, 5000)),
  ])
}

function setLoad(k) {
  $('.ld-bar i').style.transform = `scaleX(${k})`
  $('.ld-pct').textContent = `Loading ${String(Math.round(k * 100)).padStart(2, '0')}%`
}

async function main() {
  setLoad(0.1)
  await fontsReady()
  setLoad(0.4)

  // ---------------------------------------------------------------- world
  const stage = createStage($('#gl'))
  stage.resize()
  const backdrop = createBackdrop(stage)
  const device = createDevice()
  stage.scene.add(device.rig)
  const poster = createPoster(stage, 'SYED ALI  •  PRODUCT DESIGNER  •  BENGALURU, IN  •  ')
  const screen = createScreen(device)
  const carts = new Map(projects.map((p, i) => [p.slug, createCartridge(p, i)]))
  carts.forEach((c) => { stage.scene.add(c.root); c.root.visible = false })
  const homeCart = createCartridge(homeCartData)
  device.slotAnchor.add(homeCart.root)
  homeCart.root.scale.setScalar(SLOT_SCALE)
  homeCart.inSlot = true
  const pickables = [...device.pickables, ...[...carts.values()].flatMap((c) => c.meshes)]

  let started = false
  let lastSec = ''
  const ctx = { route: parseRoute(), project: null, pointer: { x: 0, y: 0 }, drag: { x: 0, y: 0 }, onStop }
  const director = createDirector({ stage, device, poster, screen, carts, homeCart, ctx })

  // ---------------------------------------------------------------- routing
  function parseRoute() {
    const m = location.pathname.match(/^\/work\/([\w-]+)\/?$/)
    const p = m && projects.find((x) => x.slug === m[1] && !x.comingSoon)
    return p ? { name: 'case', slug: p.slug } : { name: 'home' }
  }
  let disposers = []
  function render(route) {
    disposers.forEach((d) => d()); disposers = []
    ctx.route = route
    ctx.project = route.name === 'case' ? projects.find((p) => p.slug === route.slug) : null
    $('#app').innerHTML = route.name === 'case' ? caseHTML(ctx.project) : homeHTML()
    document.body.dataset.route = route.name
    document.title = route.name === 'case' ? `${ctx.project.title} — ${me.name} · Case study` : `${me.name} — ${me.role} · Player One`
    $('.hud').hidden = route.name !== 'case'
    director.resetCarts(route)
    device.drawSmiley(route.name === 'case' ? 'eject' : audio.music ? 'happy' : 'smile')
    if (route.name === 'case') device.setPalette(ctx.project.palette)
    else device.setPalette(CHANNELS[ui.channel])
    device.clearOsd('tl'); device.clearOsd('tr')
    ui.focus = -1; ui.entry = -2; ui.stop = -1; ui.complete = false; lastSec = ''
    bindPage(route)
    window.scrollTo(0, 0)
    scrollTo(0, { immediate: true })
    measure()
  }

  // ---------------------------------------------------------------- CRT cover transition (DOM overlay)
  const crt = $('.crt')
  function crtIn(color = '#ecffec') {
    crt.getAnimations().forEach((a) => a.cancel())
    crt.style.setProperty('--flash', color)
    return crt.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' }).finished
  }
  function crtOut() {
    const a = crt.animate(
      [
        { opacity: 1, transform: 'scale(1, 1)' },
        { opacity: 1, transform: 'scale(1, .006)', offset: 0.5 },
        { opacity: 0, transform: 'scale(0, .006)' },
      ],
      { duration: 560, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'forwards' },
    )
    return a.finished.then(() => crt.getAnimations().forEach((x) => x.cancel()))
  }

  let busy = false
  async function insertCart(slug) {
    const p = projects.find((x) => x.slug === slug)
    if (busy || !p) return
    if (p.comingSoon) return sealed()
    busy = true
    lock(true)
    hideCursorTag()
    const i = projects.indexOf(p)
    if (director.focusIndex() !== i) { scrollTo(worksY(i, projects.length), { duration: 0.6 }); await wait(0.65) }
    document.body.classList.add('inserting')
    await director.insert(slug, async () => {
      await crtIn(p.shell)
      history.pushState({}, '', `/work/${slug}`)
      render({ name: 'case', slug })
      updateScroll()
      director.snap()
      document.body.classList.remove('inserting')
      crtOut()
    })
    lock(false)
    busy = false
  }

  async function eject(hash = '#work') {
    if (busy) return
    busy = true
    lock(true)
    hideCursorTag()
    const from = ctx.project
    await director.eject(async () => {
      await crtIn('#0b0b0c')
      history.pushState({}, '', '/' + hash)
      render({ name: 'home' })
      landOn(hash, from)
      director.snap()
      crtOut()
    })
    lock(false)
    busy = false
  }

  async function swapCase(slug) {
    if (busy) return
    busy = true
    lock(true)
    const p = projects.find((x) => x.slug === slug)
    sfx.whoosh()
    await director.eject(async () => {
      await crtIn(p.shell)
      history.pushState({}, '', `/work/${slug}`)
      render({ name: 'case', slug })
      updateScroll()
      director.snap()
      sfx.boot()
      device.shake(0.8)
      crtOut()
    })
    lock(false)
    busy = false
  }

  // scroll the fresh home page to a section (or a specific cartridge in the works track)
  function landOn(hash, project) {
    measure()
    let y = 0
    if (hash === '#work' && project) y = worksY(projects.indexOf(project), projects.length)
    else if (hash === '#work') y = elTop($('.works'))
    else if (hash) { const el = $(hash); if (el) y = elTop(el) }
    window.scrollTo(0, y)
    scrollTo(y, { immediate: true })
    updateScroll()
  }

  addEventListener('popstate', async () => {
    const route = parseRoute()
    if (busy) return
    busy = true
    await crtIn(route.name === 'case' ? projects.find((p) => p.slug === route.slug).shell : '#0b0b0c')
    const from = ctx.project
    render(route)
    if (route.name === 'home') landOn(location.hash || (from ? '#work' : ''), from)
    director.snap()
    crtOut()
    busy = false
  })

  // ---------------------------------------------------------------- page bindings
  const ui = { channel: 0, focus: -1, entry: -2, stop: -1, complete: false, flip: 0 }
  function bindPage(route) {
    const on = (sel, ev, fn) => $$(sel).forEach((el) => { el.addEventListener(ev, fn); disposers.push(() => el.removeEventListener(ev, fn)) })
    if (route.name === 'home') {
      const word = $('.flip-word')
      const iv = setInterval(() => {
        ui.flip = (ui.flip + 1) % me.flips.length
        word.classList.add('out')
        setTimeout(() => { word.textContent = me.flips[ui.flip]; word.classList.remove('out') }, 220)
      }, 2600)
      disposers.push(() => clearInterval(iv))
      on('[data-insert]', 'click', (e) => { e.preventDefault(); insertCart(e.currentTarget.dataset.insert) })
      on('[data-sealed]', 'click', () => sealed())
      on('[data-goto]', 'click', (e) => { sfx.tick(); scrollTo(worksY(+e.currentTarget.dataset.goto, projects.length), { duration: 0.9 }) })
      on('.start', 'click', (e) => { e.preventDefault(); sfx.coin(); scrollTo(elTop($('#about')), { duration: 1.4 }) })
      on('[data-scrollto]', 'click', (e) => { e.preventDefault(); scrollTo(elTop($(e.currentTarget.dataset.scrollto)), { duration: 1.6 }) })
    } else {
      on('[data-next]', 'click', (e) => { e.preventDefault(); swapCase(e.currentTarget.dataset.next) })
      on('[data-zoom]', 'click', (e) => openLightbox(e.currentTarget.dataset.zoom, e.currentTarget.querySelector('img')?.alt))
      const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && x.target.classList.add('seen')), { rootMargin: '0px 0px -25% 0px' })
      $$('.level, .stage, .case-hero').forEach((el) => io.observe(el))
      disposers.push(() => io.disconnect())
    }
    on('#app [data-eject]', 'click', (e) => { e.preventDefault(); eject('#work') })
    on('[data-copy]', 'click', (e) => copy(e.currentTarget.dataset.copy))
  }
  // chrome, bound once
  $('[data-home]').addEventListener('click', (e) => { e.preventDefault(); ctx.route.name === 'case' ? eject('') : scrollTo(0, { duration: 1.2 }) })
  $$('[data-nav]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault()
    const hash = '#' + a.dataset.nav
    if (ctx.route.name === 'case') return eject(hash)
    const el = hash === '#work' ? $('.works') : $(hash)
    if (el) scrollTo(elTop(el), { duration: 1.4 })
  }))
  $('.hud [data-eject]').addEventListener('click', (e) => { e.preventDefault(); eject('#work') })
  $$('.hud [data-lvl]').forEach((b) => b.addEventListener('click', () => gotoStop(+b.dataset.lvl)))
  const soundBtn = $('.sound')
  soundBtn.addEventListener('click', () => toggleMute())
  function toggleMute(force) {
    const m = force ?? !audio.muted
    unlockAudio()
    setMuted(m)
    soundBtn.setAttribute('aria-pressed', String(!m))
    soundBtn.querySelector('.sound-label').textContent = m ? 'Sound off' : 'Sound on'
    document.body.classList.toggle('muted', m)
    if (!m) sfx.coin()
  }

  function gotoStop(dir, immediate = false) {
    const stops = scroll.stops
    if (!stops.length) return
    const i = clamp(scroll.stop + dir, 0, stops.length - 1)
    sfx.btn(dir > 0 ? 2 : 0)
    scrollTo(Math.max(0, elTop(stops[i]) - innerHeight * 0.18), immediate ? { immediate: true } : { duration: 0.9 })
  }

  function onStop(i, el) {
    const n = +el.dataset.n || 0
    $('.hud-n').textContent = el.dataset.stage ? `STAGE ${el.dataset.stage}` : n ? `LVL ${String(n).padStart(2, '0')}` : 'START'
    $('.hud-name').textContent = el.dataset.name
    $('.sec-label').textContent = `${ctx.project.title} · ${el.dataset.name}`
    if (el.hasAttribute('data-complete') && !ui.complete) {
      ui.complete = true
      sfx.fanfare()
      device.hop(1)
      poster.burst(device.screen.getWorldPosition(new THREE.Vector3()), 180, 1.1)
    }
  }

  // ---------------------------------------------------------------- toast, lightbox, copy
  let toastT = 0
  function toast(msg) {
    const t = $('.toast')
    t.textContent = msg
    t.classList.add('show')
    clearTimeout(toastT)
    toastT = setTimeout(() => t.classList.remove('show'), 2200)
  }
  function sealed() {
    sfx.denied()
    const c = carts.get('khaata')
    device.shake(0.5)
    if (c) tween(0.5, (k) => (c.body.rotation.z = Math.sin(k * Math.PI * 6) * 0.08 * (1 - k)))
    toast('Khaata is still sealed · coming soon')
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Copied · ' + text) } catch { toast(text) }
    sfx.coin()
    device.setOsd('center', 'EMAIL COPIED', 1.6)
  }
  const lb = $('.lightbox')
  function openLightbox(src, alt = '') {
    lb.querySelector('img').src = src
    lb.querySelector('img').alt = alt
    lb.showModal()
    sfx.click()
  }
  lb.addEventListener('click', () => lb.close())

  // ---------------------------------------------------------------- 3D picking + console actions
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
  const visibleDeep = (o) => { for (let p = o.parent; p; p = p.parent) if (!p.visible) return false; return true }
  function pick(x, y) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1)
    ray.setFromCamera(ndc, stage.camera)
    for (const h of ray.intersectObjects(pickables, false)) if (visibleDeep(h.object)) return h.object.userData.action || 'body'
    return null
  }
  const blocked = (el) => !!el?.closest?.('a, button, input, textarea, select, label, dialog, .chrome, .hud, .loader, [data-no3d]')

  function sec() { return ctx.route.name === 'case' ? 'case' : director.homeSection() }
  function labelFor(a) {
    if (!a || a === 'body') return ''
    const s = sec()
    if (a.startsWith('cart:')) {
      const p = projects.find((x) => `cart:${x.slug}` === a)
      if (p.comingSoon) return 'Sealed'
      return projects.indexOf(p) === director.focusIndex() ? `Insert ${p.title}` : p.title
    }
    if (a.startsWith('sticker:')) return 'Read sticker'
    const L = {
      case: { btn0: '◀ Prev level', btn1: '▲ Top', btn2: 'Next level ▶', smiley: '⏏ Eject', screen: 'Next level', knob: 'Turn to scrub' },
      works: { btn0: '◀ Prev cart', btn1: 'Insert', btn2: 'Next cart ▶', smiley: 'Insert', screen: 'Insert' },
      contact: { btn0: 'Copy email', btn1: 'LinkedIn ↗', btn2: 'GitHub ↗', smiley: 'Say hi', screen: 'Say hi' },
    }
    const def = { btn0: 'CH · Blue', btn1: 'CH · Gold', btn2: 'CH · Red', smiley: audio.music ? 'Stop music' : 'Play music', screen: 'Static', knob: 'Volume' }
    const shared = { clover: 'Power', card: 'Memory card', tag: 'Boing', knob: 'Volume' }
    return L[s]?.[a] || def[a] || shared[a] || ''
  }

  function run(a) {
    const s = sec()
    unlockAudio()
    if (a.startsWith('cart:')) {
      const p = projects.find((x) => `cart:${x.slug}` === a)
      const i = projects.indexOf(p)
      if (p.comingSoon) return sealed()
      if (i === director.focusIndex()) return insertCart(p.slug)
      sfx.tick()
      return scrollTo(worksY(i, projects.length), { duration: 0.8 })
    }
    if (a.startsWith('sticker:')) {
      const el = $(`[data-sticker="${a.slice(8)}"]`)
      sfx.click()
      if (el) scrollTo(elTop(el) + el.offsetHeight / 2 - innerHeight / 2, { duration: 1 })
      return
    }
    if (a.startsWith('btn') || a === 'smiley') device.tap(a)
    if (s === 'case') {
      if (a === 'btn0') return gotoStop(-1)
      if (a === 'btn2' || a === 'screen') return gotoStop(1)
      if (a === 'btn1') { sfx.btn(1); return scrollTo(0, { duration: 1.2 }) }
      if (a === 'smiley') return eject('#work')
    }
    if (s === 'works') {
      const fi = director.focusIndex()
      if (a === 'btn0' || a === 'btn2') { sfx.btn(a === 'btn0' ? 0 : 2); return scrollTo(worksY(clamp(fi + (a === 'btn0' ? -1 : 1), 0, projects.length - 1), projects.length), { duration: 0.8 }) }
      if (a === 'btn1' || a === 'smiley' || a === 'screen') return insertCart(projects[fi].slug)
    }
    if (s === 'contact') {
      if (a === 'btn0') { sfx.btn(0); return copy(me.email) }
      if (a === 'btn1' || a === 'btn2') { sfx.btn(+a[3]); return window.open(me.links[+a[3] - 1].href, '_blank', 'noopener') }
      if (a === 'smiley' || a === 'screen') { sfx.arp(true); poster.pop(); location.href = `mailto:${me.email}`; return }
    }
    // title / about (and shared toys)
    if (a.startsWith('btn')) {
      const i = +a[3]
      sfx.btn(i)
      if (device.state.power) {
        ui.channel = ui.channel === i + 1 ? 0 : i + 1
        device.setPalette(CHANNELS[ui.channel])
        device.state.glitch = 1
        device.setOsd('tl', `CH 0${ui.channel + 1}  ${CHANNELS[ui.channel].name}`, 2.6)
      }
    } else if (a === 'smiley') {
      if (!device.state.power) return sfx.tick()
      if (audio.muted) toggleMute(false)
      setMusic(!audio.music)
      sfx.arp(audio.music)
      device.drawSmiley(audio.music ? 'happy' : 'smile')
      device.setOsd('tr', audio.music ? '~► PLAY' : '■ STOP', audio.music ? 0 : 1.5)
      if (!audio.music) device.clearOsd('tr')
      poster.pop()
      if (audio.music) poster.burst(device.buttons.find((b) => b.action === 'smiley').g.getWorldPosition(new THREE.Vector3()))
    } else if (a === 'clover') {
      device.state.power = !device.state.power
      device.state.cloverSpin += Math.PI / 2
      if (device.state.power) sfx.powerOn()
      else { sfx.powerOff(); setMusic(false); device.drawSmiley(ctx.route.name === 'case' ? 'eject' : 'smile') }
    } else if (a === 'card') {
      device.state.cardTarget = device.state.cardTarget ? 0 : 1
      sfx.click()
      if (device.state.power) { device.state.glitch = 0.8; device.setOsd('center', device.state.cardTarget ? 'NO CARD' : 'CARD OK ✓', 1.8) }
    } else if (a === 'tag') {
      device.swing(1); sfx.boing()
    } else if (a === 'screen') {
      if (device.state.power) { device.state.glitch = 1; sfx.static() }
    }
  }

  // pointer: hover labels, clicks on the console, knob, drag-to-spin
  const drag = { vx: 0, vy: 0 }
  const P = { x: innerWidth / 2, y: innerHeight / 2, moved: true, target: null, hover: null, down: null, knob: null }
  const tag = $('.cursor-tag')
  const hideCursorTag = () => tag.classList.remove('show')
  addEventListener('pointermove', (e) => {
    P.x = e.clientX; P.y = e.clientY; P.target = e.target; P.moved = true
    ctx.pointer.x = (e.clientX / innerWidth) * 2 - 1
    ctx.pointer.y = -((e.clientY / innerHeight) * 2 - 1)
    if (P.knob) {
      const dy = P.knob.y - e.clientY
      P.knob.y = e.clientY
      if (ctx.route.name === 'case') { scrollTo(window.scrollY - dy * 7, { immediate: true }); device.state.knob += dy / 300 }
      else { setVolume(getVolume() + dy / 220); device.state.knob = getVolume(); device.setOsd('vol', String(Math.round(getVolume() * 12)), 1.4); sfx.tick() }
      return
    }
    if (P.down?.drag) {
      const dx = (e.clientX - P.down.x) * 0.007, dy = (e.clientY - P.down.y) * 0.007
      ctx.drag.x = clamp(ctx.drag.x + dx, -1.3, 1.3)
      ctx.drag.y = clamp(ctx.drag.y + dy, -0.9, 0.9)
      P.down.vx = dx / Math.max(0.008, (performance.now() - P.down.t) / 1000); P.down.vy = dy / Math.max(0.008, (performance.now() - P.down.t) / 1000)
      Object.assign(P.down, { x: e.clientX, y: e.clientY, t: performance.now() })
    }
  }, { passive: true })
  addEventListener('pointerdown', (e) => {
    if (blocked(e.target) || busy || !started) return
    const a = pick(e.clientX, e.clientY)
    if (!a) return
    if (a === 'knob') { P.knob = { y: e.clientY }; unlockAudio(); e.preventDefault(); return }
    if (a === 'body') {
      if (e.pointerType === 'mouse') { P.down = { drag: true, x: e.clientX, y: e.clientY, t: performance.now(), vx: 0, vy: 0 }; document.body.classList.add('dragging') }
      return
    }
    // mouse: fire on press (arcade feel). touch/pen: wait for a clean tap so scrolling over a cartridge never inserts it.
    P.down = { action: a, x: e.clientX, y: e.clientY, t: performance.now(), mouse: e.pointerType === 'mouse' }
    if (a.startsWith('btn') || a === 'smiley') device.press(a, true)
    if (P.down.mouse) run(a)
  })
  const release = (e) => {
    const d = P.down
    if (d?.action && !d.mouse && e?.type === 'pointerup' && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12 && performance.now() - d.t < 600) run(d.action)
    if (d?.action) device.press(d.action, false)
    if (P.down?.drag) { drag.vx = P.down.vx || 0; drag.vy = P.down.vy || 0; document.body.classList.remove('dragging') }
    P.down = null; P.knob = null
  }
  addEventListener('pointerup', release)
  addEventListener('pointercancel', release)
  addEventListener('wheel', (e) => {
    if (!started || pick(e.clientX, e.clientY) !== 'knob' || ctx.route.name === 'case') return
    setVolume(getVolume() - e.deltaY * 0.0012); device.state.knob = getVolume()
    device.setOsd('vol', String(Math.round(getVolume() * 12)), 1.4)
  }, { passive: true })
  // DOM elements can ask for a cursor label too
  addEventListener('pointerover', (e) => { P.domLabel = e.target.closest?.('[data-cursor]')?.dataset.cursor || '' })

  function updateHover() {
    if (!P.moved || touch) return
    P.moved = false
    const overUI = blocked(P.target)
    const a = !overUI && started && !busy ? pick(P.x, P.y) : null
    if (a !== P.hover) {
      if (a?.startsWith('cart:')) sfx.hover(projects.findIndex((p) => `cart:${p.slug}` === a))
      P.hover = a
      device.state.hover = a
      carts.forEach((c) => (c.hoverT = a === `cart:${c.project.slug}` ? 1 : 0))
    }
    const label = overUI ? P.domLabel : labelFor(a)
    document.body.style.cursor = !overUI && a ? (a === 'body' ? 'grab' : a === 'knob' ? 'ns-resize' : 'pointer') : ''
    tag.textContent = label
    tag.classList.toggle('show', !!label && !busy)
    tag.style.transform = `translate3d(${P.x + 16}px, ${P.y + 18}px, 0)`
  }

  // ---------------------------------------------------------------- keyboard
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return
    if (!started) {
      if (e.key === 'Enter' && !$('.ld-start').hidden) { e.preventDefault(); start(true) }
      return
    }
    if (e.key === 'm' || e.key === 'M') return toggleMute()
    if (busy) return
    if (ctx.route.name === 'case') {
      if (e.key === 'ArrowRight') { e.preventDefault(); gotoStop(1, true) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); gotoStop(-1, true) }
      else if (e.key === 'Escape' && !lb.open) eject('#work')
    } else if (director.homeSection() === 'works') {
      const fi = director.focusIndex()
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        scrollTo(worksY(clamp(fi + (e.key === 'ArrowRight' ? 1 : -1), 0, projects.length - 1), projects.length), { immediate: true })
      } else if (e.key === 'Enter' && !e.target.closest?.('a, button')) insertCart(projects[fi].slug)
    }
  })

  // ---------------------------------------------------------------- resize
  function onResize() {
    stage.resize()
    director.layout()
    backdrop.resize()
    measure()
  }
  addEventListener('resize', onResize)

  // ---------------------------------------------------------------- clock
  const clockFmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', timeZone: me.tz })
  const tickClock = () => ($('.clock').textContent = `BLR ${clockFmt.format(new Date())} · 12.97°N 77.59°E`)
  tickClock(); setInterval(tickClock, 15000)

  // ---------------------------------------------------------------- per-frame DOM sync (home)
  const secNames = { title: 'Title screen', about: 'Player one', works: 'Select cartridge', contact: 'Continue?' }
  function syncHome() {
    const s = director.homeSection()
    if (s !== lastSec) {
      lastSec = s
      $('.sec-label').textContent = secNames[s]
      $$('[data-nav]').forEach((a) => a.classList.toggle('active', (a.dataset.nav === 'work' && s === 'works') || (a.dataset.nav === 'about' && s === 'about') || (a.dataset.nav === 'contact' && s === 'contact')))
    }
    const entry = Math.round(scroll.shot) - 1
    if (entry !== ui.entry) {
      ui.entry = entry
      $$('.entry').forEach((el, i) => el.classList.toggle('active', i === entry))
    }
    const fi = director.focusIndex()
    if (fi !== ui.focus) {
      ui.focus = fi
      $$('.ci').forEach((el, i) => el.classList.toggle('active', i === fi))
      $$('.cart-dots button').forEach((el, i) => el.classList.toggle('active', i === fi))
    }
    if (!ui.bar?.isConnected) ui.bar = $('.works .bar i')
    if (ui.bar) ui.bar.style.transform = `scaleX(${scroll.works})`
  }
  const hudBar = $('.hud-bar i')
  function syncCase() {
    const bar = hudBar
    const max = document.documentElement.scrollHeight - innerHeight
    if (bar) bar.style.transform = `scaleX(${max > 0 ? scroll.y / max : 0})`
  }

  // ---------------------------------------------------------------- boot
  render(ctx.route)
  director.layout()
  if (ctx.route.name === 'home' && location.hash) landOn(location.hash)
  initScroll()
  measure()
  updateScroll()
  director.setIntro(0)
  director.snap()
  stage.renderer.compile(stage.scene, stage.camera)
  setLoad(0.7)
  await Promise.race([Promise.all(projects.map((p) => loadImage(p.cover))), wait(4)])
  setLoad(1)

  const ldStart = $('.ld-start')
  ldStart.hidden = false
  $('[data-start="sound"]').focus({ preventScroll: true })
  $$('[data-start]').forEach((b) => b.addEventListener('click', () => start(b.dataset.start === 'sound')))
  lock(true)

  async function start(withSound) {
    if (started) return
    started = true
    unlockAudio()
    toggleMute(!withSound)
    const ld = $('#loader')
    ld.animate(
      [{ transform: 'scale(1,1)', opacity: 1 }, { transform: 'scale(1,.004)', opacity: 1, offset: 0.55 }, { transform: 'scale(0,.004)', opacity: 0 }],
      { duration: reduced ? 1 : 620, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'forwards' },
    ).finished.then(() => ld.remove())
    sfx.powerOff()
    lock(false)
    tween(reduced ? 0.01 : 1.5, (k) => { director.setIntro(k); introReveal = k }).then(() => {
      if (ctx.route.name === 'home') setTimeout(() => $('.corner-r')?.classList.add('show'), 200)
    })
    await wait(reduced ? 0 : 0.9)
    device.state.power = true
    sfx.powerOn()
    if (ctx.route.name === 'home' && director.homeSection() === 'title') device.setOsd('tl', `CH 01  ${CHANNELS[0].name}`, 2.8)
  }

  // ---------------------------------------------------------------- loop
  const clock = new THREE.Clock()
  let introReveal = 0
  stage.renderer.setAnimationLoop((ms) => {
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime
    rafScroll(ms)
    updateScroll()
    updateTweens(dt)
    updateBeat()
    // fling: drag springs back with the release velocity
    if (!P.down?.drag) {
      drag.vx += (-ctx.drag.x * 30 - drag.vx * 6.5) * dt; ctx.drag.x += drag.vx * dt
      drag.vy += (-ctx.drag.y * 30 - drag.vy * 6.5) * dt; ctx.drag.y += drag.vy * dt
    }
    carts.forEach((c) => (c.hover = c.hover + ((c.hoverT || 0) - c.hover) * (1 - Math.exp(-dt * 12))))
    updateHover()
    director.update(dt, t)
    device.update(dt, t, { beat: audio.beat, music: audio.music })
    backdrop.update(dt, device.rig.position, easeOut(introReveal) * (ctx.route.name === 'case' ? 0.6 : 1))
    if (ctx.route.name === 'home') syncHome(); else syncCase()
    document.documentElement.classList.toggle('scrolled', scroll.y > 40)
    stage.render(dt, t)
  })
}

main()
