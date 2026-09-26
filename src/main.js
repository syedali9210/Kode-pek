import 'lenis/dist/lenis.css'
import './styles.css'
import * as THREE from 'three'
import { createStage } from './three/stage.js'
import { createBackdrop } from './three/backdrop.js'
import { createDevice } from './three/device.js'
import { createPoster } from './three/poster.js'
import { createCartridge, SLOT_SCALE } from './three/cartridge.js'
import { createScreen } from './three/screen.js'
import { createDirector, sectionAt, focusAt, ABOUT_SHOT } from './director.js'
import { createGame } from './game.js'
import { initCursor } from './cursor.js'
import { initScroll, rafScroll, measure, update as updateScroll, scroll, lock, scrollTo, worksY, elTop } from './scroll.js'
import { homeHTML, caseHTML } from './pages.js'
import { me, projects, homeCart as homeCartData } from './content.js'
import { audio, sfx, unlockAudio, setMuted, setMusic, updateBeat, getVolume, setVolume } from './audio.js'
import { updateTweens, tween, wait, clamp, reduced, touch, easeOut } from './util.js'

const $ = (s, r = document) => r.querySelector(s)
const clockFmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', timeZone: me.tz })
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
      await Promise.all(['800 100px "Unbounded"', '700 100px "Unbounded"', '300 100px "Unbounded"', '400 17px "Onest"', '600 17px "Onest"', '500 20px "Martian Mono"', '400 20px "Martian Mono"', '40px VT323'].map((f) => document.fonts.load(f)))
    })(),
    new Promise((r) => setTimeout(r, 5000)),
  ])
}

function setLoad(k) {
  $('.ld-bar i').style.transform = `scaleX(${k})`
  $('.ld-pct').textContent = `Loading ${String(Math.round(k * 100)).padStart(2, '0')}%`
}

// ---------------------------------------------------------------- lite mode (no WebGL)
// Hardware acceleration off, a blocklisted GPU, some VMs and remote desktops: no WebGL context at all.
// The site still opens: every page, route and DOM interaction works, a still of the console stands in
// for the 3D one, and these stand-ins absorb the calls meant for the 3D world.
const nothing = new Proxy(function () {}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' || typeof k === 'symbol' ? undefined : nothing),
  apply: () => nothing,
  set: () => true,
})
const liteDirector = (ctx) => {
  const none = () => {}
  let stop = -1
  return {
    // the 3D director reports case-study stops as it redraws the console screen; do the same for the HUD
    update() {
      if (ctx.route.name !== 'case' || scroll.stop === stop) return
      stop = scroll.stop
      const el = scroll.stops[stop]
      if (el) ctx.onStop(stop, el)
    },
    snap: () => (stop = -1),
    layout: none, resetCarts: none, setIntro: none, invalidateScreen: none, spin: none,
    homeSection: () => sectionAt(scroll.shot), focusIndex: () => focusAt(scroll.works),
    insert: async (slug, swap) => swap(), eject: async (swap) => swap(),
    aboutStart: ABOUT_SHOT, frame: {}, busy: false,
  }
}
const liteGame = { active: false, playing: false, state: 'off', open() {}, close() {}, start() {}, press: () => false, release() {}, key: () => false, steer() {}, update() {} }

function create3D() {
  try {
    // three.js needs WebGL2; probe quietly first so a machine without it doesn't get a wall of console errors
    const probe = document.createElement('canvas').getContext('webgl2')
    if (!probe) throw new Error('WebGL2 is not available')
    probe.getExtension('WEBGL_lose_context')?.loseContext()
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
    return { stage, backdrop, device, poster, screen, carts, homeCart, pickables }
  } catch (err) {
    console.warn('3D unavailable, opening the lite version:', err?.message || err)
    return null
  }
}

async function main() {
  setLoad(0.1)
  await fontsReady()
  setLoad(0.4)

  // ---------------------------------------------------------------- world
  const world = create3D()
  const lite = !world
  const { stage, backdrop, device, poster, screen, carts, homeCart, pickables } = world || { stage: nothing, backdrop: nothing, device: nothing, poster: nothing, screen: nothing, carts: new Map(), homeCart: nothing, pickables: [] }
  if (lite) {
    document.documentElement.classList.add('lite')
    const still = document.createElement('img')
    Object.assign(still, { className: 'still', src: '/console.webp', alt: '', decoding: 'async' })
    still.setAttribute('aria-hidden', 'true')
    $('#gl').after(still)
  }

  let started = false
  let lastSec = ''
  const ctx = { route: parseRoute(), project: null, pointer: { x: 0, y: 0 }, drag: { x: 0, y: 0 }, onStop }
  const director = lite ? liteDirector(ctx) : createDirector({ stage, device, poster, screen, carts, homeCart, ctx })
  const smileyPos = () => device.buttons.find((b) => b.action === 'smiley').g.getWorldPosition(new THREE.Vector3())
  const game = lite ? liteGame : createGame(device, {
    onStart: () => { if (!audio.muted) setMusic(true); device.drawSmiley('happy') },
    onOver: (score, best) => {
      setMusic(false)
      device.drawSmiley('smile')
      if (best && score > 0) { sfx.fanfare(); poster.pop(); poster.burst(smileyPos(), 160) } else sfx.powerOff()
    },
  })
  ctx.game = game
  function quitGame() {
    if (!game.active) return
    game.close()
    setMusic(false)
    device.drawSmiley(ctx.route.name === 'case' ? 'eject' : 'smile')
    director.invalidateScreen()
  }
  const cursor = initCursor()

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
    document.body.dataset.sec = route.name === 'case' ? 'case' : 'title'
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
  const ui = { channel: 0, focus: -1, entry: -2, stop: -1, complete: false }

  // Headlines rise in word by word: wrap each word of [data-split] in .w > span (keeping <em>/<br>),
  // then add .in once it's on screen, but never behind the loader.
  function splitWords(el) {
    let i = 0
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment()
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return
          if (/^\s+$/.test(part)) return frag.append(part)
          const w = document.createElement('span'); w.className = 'w'
          const inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++)
          w.append(inner); frag.append(w)
        })
        n.replaceWith(frag)
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n)
    })
    walk(el)
  }
  let revealIO = null
  const revealVisible = () => {
    $$('[data-split]').forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.92 && r.bottom > 0) el.classList.add('in') })
    $$('.bezel').forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.88 && r.bottom > 0) el.classList.add('on') })
  }

  function bindPage(route) {
    const on = (sel, ev, fn) => $$(sel).forEach((el) => { el.addEventListener(ev, fn); disposers.push(() => el.removeEventListener(ev, fn)) })
    $$('[data-split]').forEach(splitWords)
    revealIO = new IntersectionObserver((es) => es.forEach((x) => started && x.isIntersecting && x.target.classList.add('in')), { rootMargin: '0px 0px -8% 0px' })
    $$('[data-split]').forEach((el) => revealIO.observe(el))
    disposers.push(() => revealIO.disconnect())
    if (started) requestAnimationFrame(revealVisible)
    tickClock()
    if (route.name === 'home') {
      on('[data-insert]', 'click', (e) => { e.preventDefault(); insertCart(e.currentTarget.dataset.insert) })
      on('[data-sealed]', 'click', () => sealed())
      on('[data-scrollto]', 'click', (e) => { e.preventDefault(); scrollTo(elTop($(e.currentTarget.dataset.scrollto)), { duration: 1.6 }) })
    } else {
      on('[data-next]', 'click', (e) => { e.preventDefault(); swapCase(e.currentTarget.dataset.next) })
      on('[data-zoom]', 'click', (e) => openLightbox(e.currentTarget.dataset.zoom, e.currentTarget.querySelector('img')?.alt))
      // pull quotes light up word by word as they scroll through (driven in syncCase)
      $$('.pull p:not(.meta)').forEach((p) => {
        let i = +(p.parentNode.dataset.n || 0)
        const words = p.textContent.split(/(\s+)/)
        p.textContent = ''
        for (const w of words) {
          if (!w || /^\s+$/.test(w)) { p.append(w); continue }
          const span = document.createElement('span')
          span.className = 'pw'; span.style.setProperty('--i', i++); span.textContent = w
          p.append(span)
        }
        p.parentNode.dataset.n = i
      })
      const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && x.target.classList.add('seen')), { rootMargin: '0px 0px -25% 0px' })
      $$('.level, .stage, .case-hero').forEach((el) => io.observe(el))
      // every screenshot switches on like a CRT the first time it scrolls in
      const lit = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting && started) { x.target.classList.add('on'); lit.unobserve(x.target) } }), { rootMargin: '0px 0px -12% 0px' })
      $$('.bezel').forEach((el) => lit.observe(el))
      disposers.push(() => { io.disconnect(); lit.disconnect() })
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
    if (el.hasAttribute('data-complete') && !ui.complete) {
      ui.complete = true
      sfx.fanfare()
      device.hop(1)
      poster.burst(device.screen.getWorldPosition(new THREE.Vector3()), 180, 1.1)
    }
  }

  // ---------------------------------------------------------------- toast, lightbox, copy
  let toastT = 0
  function toast(msg, ms = 2200) {
    const t = $('.toast')
    t.textContent = msg
    t.classList.add('show')
    clearTimeout(toastT)
    toastT = setTimeout(() => t.classList.remove('show'), ms)
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
  let lastHit = null
  const visibleDeep = (o) => { for (let p = o.parent; p; p = p.parent) if (!p.visible) return false; return true }
  function pick(x, y) {
    if (lite) return null
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1)
    ray.setFromCamera(ndc, stage.camera)
    for (const h of ray.intersectObjects(pickables, false)) if (visibleDeep(h.object)) { lastHit = h; return h.object.userData.action || 'body' }
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
    if (s === 'title' && game.active) {
      const G = { btn0: '◀ Move', btn2: 'Move ▶', btn1: 'Pause', smiley: game.state === 'play' ? 'Pause' : 'Play', screen: 'Hold a side to move', clover: 'Quit game' }
      if (G[a]) return G[a]
    }
    const def = { btn0: 'CH · Blue', btn1: 'CH · Gold', btn2: 'CH · Red', smiley: s === 'title' ? 'Play Coffee Run' : audio.music ? 'Stop music' : 'Play music', screen: 'Static', knob: 'Volume' }
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
    // title screen: the smiley boots COFFEE RUN; while it runs the buttons steer
    if (s === 'title') {
      if (a === 'smiley' && !game.active) {
        if (!device.state.power) return sfx.tick()
        game.open(); game.start(); return
      }
      if (game.active) {
        if (a === 'clover') { quitGame(); sfx.powerOff(); return }
        if (a === 'screen') { game.steer(lastHit?.uv?.x ?? 0.5, true); return }
        if (game.press(a)) return
      }
    }
    // about (and shared toys)
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

  // ---------------------------------------------------------------- drag a cartridge into the console (mouse)
  // Press on the cartridge in focus and pull it toward the console: it follows the pointer on a plane facing
  // the camera, squares up to the slot when it's close, and dropping it there runs the insert sequence.
  const cartDrag = { c: null, on: false, near: false, nearK: 0, s0: 1, plane: new THREE.Plane(), hit: new THREE.Vector3(), off: new THREE.Vector3(), target: new THREE.Vector3() }
  const slotP = new THREE.Vector3(), slotQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), goal = new THREE.Vector3(), goalQ = new THREE.Quaternion()
  function cartDragStart(c, x, y) {
    Object.assign(cartDrag, { c, on: false, near: false, nearK: 0, s0: c.root.scale.x, x, y })
    stage.camera.getWorldDirection(tmpV)
    cartDrag.plane.setFromNormalAndCoplanarPoint(tmpV, c.root.position)
    if (rayPlane(x, y)) cartDrag.off.copy(c.root.position).sub(cartDrag.hit)
  }
  function rayPlane(x, y) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1)
    ray.setFromCamera(ndc, stage.camera)
    return ray.ray.intersectPlane(cartDrag.plane, cartDrag.hit)
  }
  function cartDragMove(x, y) {
    const d = cartDrag
    if (!d.on) {
      if (Math.hypot(x - d.x, y - d.y) < 6) return
      d.on = true; d.c.drag = true; ctx.lift = true
      document.body.classList.add('dragging')
      sfx.tick()
    }
    if (rayPlane(x, y)) d.target.copy(d.hit).add(d.off)
    device.slotAnchor.getWorldPosition(slotP)
    const a = tmpV.copy(d.target).project(stage.camera), ax = a.x, ay = a.y
    const b = slotP.project(stage.camera)
    const near = Math.hypot((ax - b.x) * innerWidth / 2, (ay - b.y) * innerHeight / 2) < Math.max(130, innerHeight * 0.2)
    if (near !== d.near) {
      d.near = near
      device.state.slotGlow = near ? 1 : 0
      if (near) { sfx.hover(4); device.hop(0.35); device.state.glitch = Math.max(device.state.glitch, 0.4) }
    }
  }
  function cartDragEnd() {
    const d = cartDrag, c = d.c
    cartDrag.c = null
    ctx.lift = false
    device.state.slotGlow = 0
    document.body.classList.remove('dragging')
    if (!c) return false
    if (!d.on) return false // a plain click: the caller inserts
    c.drag = false
    if (d.near) insertCart(c.project.slug)
    else sfx.whoosh()
    return true
  }
  function cartDragTick(dt) {
    const d = cartDrag
    if (!d.on || !d.c) return
    const r = d.c.root, rs = device.rig.scale.x
    // close to the slot it magnets on: shrinks to slot size, turns to match and parks just under the opening
    d.nearK += ((d.near ? 1 : 0) - d.nearK) * (1 - Math.exp(-dt * 10))
    device.slotAnchor.getWorldPosition(slotP); device.slotAnchor.getWorldQuaternion(slotQ)
    goal.set(0, -1, 0).applyQuaternion(slotQ).multiplyScalar(0.95 * rs).add(slotP)
    goal.lerpVectors(d.target, goal, d.nearK)
    r.position.lerp(goal, 1 - Math.exp(-dt * 16))
    goalQ.slerpQuaternions(stage.camera.quaternion, slotQ, d.nearK)
    r.quaternion.slerp(goalQ, 1 - Math.exp(-dt * 10))
    const sc = d.s0 * 0.88 + (SLOT_SCALE * rs - d.s0 * 0.88) * d.nearK // picked up it shrinks a touch, in the slot it matches
    r.scale.setScalar(r.scale.x + (sc - r.scale.x) * (1 - Math.exp(-dt * 12)))
  }

  // pointer: hover labels, clicks on the console, knob, drag-to-spin
  const drag = { vx: 0, vy: 0 }
  const shake = { flips: 0, dir: 0, t: 0, until: 0 }
  function dizzy() {
    shake.flips = 0
    if (performance.now() < shake.until) return
    shake.until = performance.now() + 1800
    device.drawSmiley('dizzy')
    device.state.glitch = 1
    device.shake(1)
    device.swing(2.2)
    device.setOsd('center', 'WHOA  WHOA', 1.4)
    sfx.boing()
    setTimeout(() => device.drawSmiley(ctx.route.name === 'case' ? 'eject' : audio.music ? 'happy' : 'smile'), 1800)
  }
  const P = { x: innerWidth / 2, y: innerHeight / 2, moved: true, target: null, hover: null, down: null, knob: null }
  const hideCursorTag = () => cursor.set('', false)
  addEventListener('pointermove', (e) => {
    P.x = e.clientX; P.y = e.clientY; P.target = e.target; P.moved = true
    ctx.pointer.x = (e.clientX / innerWidth) * 2 - 1
    ctx.pointer.y = -((e.clientY / innerHeight) * 2 - 1)
    if (cartDrag.c) { cartDragMove(e.clientX, e.clientY); return }
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
      // shake it (4 quick direction flips) and it gets dizzy
      const now = performance.now(), sg = Math.sign(dx)
      if (now - shake.t > 650) { shake.flips = 0; shake.t = now }
      if (Math.abs(dx) > 0.018 && sg !== shake.dir) { shake.dir = sg; if (++shake.flips >= 4) dizzy() }
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
    if (a.startsWith('cart:') && P.down.mouse) {
      const p = projects.find((x) => `cart:${x.slug}` === a)
      // the cartridge in focus can be dragged in; a plain click still inserts it on release
      if (!p.comingSoon && projects.indexOf(p) === director.focusIndex() && director.homeSection() === 'works') { cartDragStart(carts.get(p.slug), e.clientX, e.clientY); P.down.cart = true; return }
    }
    if (a.startsWith('btn') || a === 'smiley') device.press(a, true)
    const held = game.active && (a === 'btn0' || a === 'btn2' || a === 'screen') // steering is press-and-hold, even on touch
    if (P.down.mouse || held) { P.down.ran = true; run(a) }
  })
  const release = (e) => {
    const d = P.down
    if (d?.cart) { P.down = null; if (!cartDragEnd() && e?.type === 'pointerup') run(d.action); return }
    if (d?.action && !d.ran && e?.type === 'pointerup' && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12 && performance.now() - d.t < 600) run(d.action)
    if (d?.action) { device.press(d.action, false); game.release(d.action); if (d.action === 'screen') game.steer(0.5, false) }
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
    if (cartDrag.on) P.moved = true // keep the label live while the pointer rests mid-drag
    P.moved = false
    const overUI = blocked(P.target)
    const a = !overUI && started && !busy ? pick(P.x, P.y) : null
    if (a !== P.hover) {
      if (a?.startsWith('cart:')) sfx.hover(projects.findIndex((p) => `cart:${p.slug}` === a))
      P.hover = a
      device.state.hover = a
      carts.forEach((c) => (c.hoverT = a === `cart:${c.project.slug}` ? 1 : 0))
    }
    if (cartDrag.on) return cursor.set(cartDrag.near ? 'Release to insert' : 'Into the console', true, true)
    const label = busy ? '' : overUI ? P.domLabel : a === 'body' ? 'Drag' : a?.startsWith('cart:') && !a.endsWith('khaata') && labelFor(a).startsWith('Insert') ? 'Click or drag in' : labelFor(a)
    cursor.set(label, !overUI && !!a && a !== 'body')
  }

  // ---------------------------------------------------------------- keyboard
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return
    if (!started) {
      if (e.key === 'Enter' && !$('.ld-start').hidden) { e.preventDefault(); start(true) }
      return
    }
    if (e.key === 'm' || e.key === 'M') return toggleMute()
    konami(e.key)
    if (busy) return
    if (game.active) {
      if (e.key === 'Escape') return quitGame()
      if (!e.repeat && game.key(e, true)) return e.preventDefault()
      if (e.repeat && /^(arrow(left|right)|[ad ])$/i.test(e.key)) return e.preventDefault()
    }
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

  addEventListener('keyup', (e) => game.key(e, false))

  // ↑ ↑ ↓ ↓ ← → ← → B A
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
  let kk = 0
  function konami(key) {
    const k = key.length === 1 ? key.toLowerCase() : key
    kk = k === KONAMI[kk] ? kk + 1 : k === KONAMI[0] ? 1 : 0
    if (kk < KONAMI.length) return
    kk = 0
    director.spin()
    sfx.fanfare(); poster.pop(); poster.burst(smileyPos(), 220, 1.25)
    device.drawSmiley('happy'); setTimeout(() => device.drawSmiley(ctx.route.name === 'case' ? 'eject' : 'smile'), 2200)
    if (device.state.power) device.setOsd('center', '+30 LIVES', 2.2)
    toast('Cheat code accepted · +30 lives')
  }

  // ---------------------------------------------------------------- resize
  function onResize() {
    stage.resize()
    director.layout()
    backdrop.resize()
    measure()
  }
  // Debounced, and on touch devices a height-only change (URL bar sliding) is ignored: the canvas is
  // sized to the large viewport and the layout uses static svh/vh units, so there's nothing to redo.
  let lastW = innerWidth, lastH = innerHeight, rz = 0
  addEventListener('resize', () => {
    if (touch && innerWidth === lastW && Math.abs(innerHeight - lastH) < 160) return
    lastW = innerWidth; lastH = innerHeight
    clearTimeout(rz)
    rz = setTimeout(onResize, 120)
  })

  // ---------------------------------------------------------------- clock
  function tickClock() { const el = $('.local-time'); if (el) el.textContent = clockFmt.format(new Date()) }
  setInterval(tickClock, 30000)

  // ---------------------------------------------------------------- per-frame DOM sync (home)
  function syncHome() {
    const s = director.homeSection()
    if (s !== lastSec) {
      lastSec = s
      document.body.dataset.sec = s
      $$('[data-nav]').forEach((a) => a.classList.toggle('active', (a.dataset.nav === 'work' && s === 'works') || (a.dataset.nav === 'about' && s === 'about') || (a.dataset.nav === 'contact' && s === 'contact')))
    }
    const entry = Math.round(scroll.shot) - director.aboutStart
    if (entry !== ui.entry) {
      ui.entry = entry
      $$('.entry').forEach((el, i) => el.classList.toggle('active', i === entry))
    }
    const fi = director.focusIndex()
    if (fi !== ui.focus) {
      ui.focus = fi
      $$('.ci').forEach((el, i) => el.classList.toggle('active', i === fi))
    }
  }
  function syncCase() {
    for (const q of document.querySelectorAll('.pull')) {
      const r = q.getBoundingClientRect()
      if (r.bottom < 0 || r.top > innerHeight) continue
      const t = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3))
      q.style.setProperty('--r', (t * (+q.dataset.n + 2)).toFixed(2))
    }
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
  // cartridge labels redraw themselves when their cover lands, so the loader doesn't wait on images
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
    tween(reduced ? 0.01 : 1.5, (k) => { director.setIntro(k); introReveal = k })
    setTimeout(revealVisible, reduced ? 0 : 480) // headline rises as the loader collapses
    await wait(reduced ? 0 : 0.9)
    device.state.power = true
    sfx.powerOn()
    if (ctx.route.name === 'home' && director.homeSection() === 'title') device.setOsd('tl', `CH 01  ${CHANNELS[0].name}`, 2.8)
    setTimeout(() => (stage.perf.on = true), 2500) // start adapting once shaders are warm and the intro is done
    if (lite) setTimeout(() => toast('Lite mode · 3D is off in this browser', 6000), 1400)
  }

  if (import.meta.env.DEV) window.__app = { stage, director, device, game, carts, ctx }

  // ---------------------------------------------------------------- loop
  const timer = new THREE.Timer()
  let introReveal = 0
  let lastMs = 0
  let chromeAway = false
  const chrome = $('.chrome')
  const loop = lite ? (fn) => requestAnimationFrame(function f(ms) { fn(ms); requestAnimationFrame(f) }) : (fn) => stage.renderer.setAnimationLoop(fn)
  loop((ms) => {
    if (lastMs) stage.adapt(ms - lastMs)
    lastMs = ms
    timer.update(ms)
    const dt = Math.min(timer.getDelta(), 0.05)
    const t = timer.getElapsed()
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
    cartDragTick(dt)
    updateHover()
    if (game.active && (busy || ctx.route.name !== 'home' || director.homeSection() !== 'title')) quitGame()
    game.update(dt)
    director.update(dt, t)
    device.update(dt, t, { beat: audio.beat, music: audio.music })
    backdrop.update(dt, device.rig.position, easeOut(introReveal) * (ctx.route.name === 'case' ? 0.6 : 1))
    if (ctx.route.name === 'home') syncHome(); else syncCase()
    document.documentElement.classList.toggle('scrolled', scroll.y > 40)
    // reading a case study: the header slides away going down and comes back going up
    const away = ctx.route.name === 'case' && scroll.y > innerHeight * 0.7 && !busy && (scroll.vel > 1.5 ? true : scroll.vel < -1.5 ? false : chromeAway)
    if (away !== chromeAway) { chromeAway = away; chrome.classList.toggle('away', away) }
    device.renderScreen(stage.renderer, dt)
    stage.render()
  })
}

main()
