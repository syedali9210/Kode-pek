import * as THREE from 'three'
import { makeCanvas, rand, clamp } from './util.js'
import { sfx } from './audio.js'

// COFFEE RUN — a tiny catch game that runs on the console's screen.
// Catch coffee beans with the cup, dodge the bugs. Three lives, best score kept in localStorage.
const GW = 240, GH = 168 // screen aspect (1.43); drawn with nearest filtering so it reads as pixel art
const BEST = 'player-one:coffee-run'
const readBest = () => { try { return +localStorage.getItem(BEST) || 0 } catch { return 0 } }
const writeBest = (n) => { try { localStorage.setItem(BEST, String(n)) } catch {} }

export function createGame(device, { onStart, onOver } = {}) {
  const canvas = makeCanvas(GW, GH)
  const c = canvas.getContext('2d')
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false

  const g = { active: false, state: 'title', score: 0, best: readBest(), lives: 3, x: GW / 2, items: [], spawn: 0, t: 0, left: false, right: false, paused: false, hurt: 0, newBest: false }

  function open() {
    g.active = true
    g.state = 'title'
    device.setScreenTexture(tex)
    device.state.contentTarget = 1
    device.screenMat.uniforms.uGain.value = 0.45
    device.clearOsd('bottom'); device.clearOsd('tl'); device.clearOsd('center')
    draw(0)
  }
  function close() {
    if (!g.active) return
    g.active = false
    g.left = g.right = false
    device.setScreenTexture(null)
  }
  function start() {
    Object.assign(g, { state: 'play', score: 0, lives: 3, x: GW / 2, items: [], spawn: 0.5, t: 0, paused: false, hurt: 0, newBest: false })
    device.state.glitch = 0.8
    sfx.boot()
    onStart?.()
  }

  // console buttons: blue/red steer while held, yellow pauses, smiley starts/restarts
  function press(action) {
    if (!g.active) return false
    if (action === 'btn0') g.left = true
    else if (action === 'btn2') g.right = true
    else if (action === 'btn1') { if (g.state === 'play') { g.paused = !g.paused; sfx.tick() } }
    else if (action === 'smiley') { g.state === 'play' && !g.paused ? (g.paused = true) : g.state === 'play' ? (g.paused = false) : start() }
    else return false
    return true
  }
  function release(action) {
    if (action === 'btn0') g.left = false
    if (action === 'btn2') g.right = false
  }
  function key(e, down) {
    if (!g.active) return false
    const k = e.key.toLowerCase()
    if (k === 'arrowleft' || k === 'a') g.left = down
    else if (k === 'arrowright' || k === 'd') g.right = down
    else if ((k === 'enter' || k === ' ') && down) press('smiley')
    else if (k === 'p' && down) press('btn1')
    else return false
    return true
  }
  // tap/click on the screen: left or right half steers (held until release)
  function steer(u, down) {
    if (!g.active) return
    if (g.state !== 'play') { if (down) start(); return }
    g.left = down && u < 0.5
    g.right = down && u >= 0.5
  }

  function update(dt) {
    if (!g.active) return
    g.t += dt
    g.hurt = Math.max(0, g.hurt - dt * 2.5)
    if (g.state === 'play' && !g.paused) {
      g.x = clamp(g.x + ((g.right ? 1 : 0) - (g.left ? 1 : 0)) * 130 * dt, 12, GW - 12)
      g.spawn -= dt
      if (g.spawn <= 0) {
        const bugChance = Math.min(0.38, 0.14 + g.score * 0.012)
        g.items.push({ x: 10 + rand() * (GW - 20), y: -6, vy: 42 + g.score * 2.2 + rand() * 16, bug: rand() < bugChance, w: rand() * 6 })
        g.spawn = Math.max(0.26, 0.8 - g.score * 0.018)
      }
      for (let i = g.items.length - 1; i >= 0; i--) {
        const it = g.items[i]
        it.y += it.vy * dt
        if (it.y > GH - 24 && it.y < GH - 8 && Math.abs(it.x - g.x) < 12) {
          g.items.splice(i, 1)
          if (it.bug) {
            g.lives--
            g.hurt = 1
            sfx.denied()
            device.shake(0.6)
            if (g.lives <= 0) gameOver()
          } else {
            g.score++
            sfx.hover(g.score)
            if (g.score % 10 === 0) { sfx.coin(); device.hop(0.5) }
          }
        } else if (it.y > GH + 8) g.items.splice(i, 1)
      }
    }
    draw(g.t)
  }
  function gameOver() {
    g.state = 'over'
    g.newBest = g.score > g.best
    if (g.newBest) { g.best = g.score; writeBest(g.best) }
    onOver?.(g.score, g.newBest)
  }

  // ---- drawing
  const text = (s, x, y, size, color, align = 'left') => {
    c.font = `${size}px VT323`; c.textAlign = align; c.textBaseline = 'alphabetic'
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillText(s, x + 1, y + 1)
    c.fillStyle = color; c.fillText(s, x, y)
  }
  function cup(x) {
    const y = GH - 20
    c.fillStyle = '#f3ece8'; c.fillRect(x - 8, y, 16, 12) // cup
    c.fillStyle = '#c7998d'; c.fillRect(x - 8, y + 4, 16, 3) // sleeve
    c.fillStyle = '#ffffff'; c.fillRect(x - 9, y - 2, 18, 3) // lid
    c.fillStyle = '#ffe600'; c.fillRect(x + 3, y - 9, 2, 8) // straw
  }
  function bean(x, y) {
    c.fillStyle = '#6b3e22'; c.fillRect(x - 3, y - 2, 6, 5)
    c.fillStyle = '#9a5c34'; c.fillRect(x - 2, y - 2, 2, 2)
    c.fillStyle = '#3b2213'; c.fillRect(x, y - 1, 1, 3)
  }
  function bug(x, y, t) {
    c.fillStyle = '#ff4a3a'; c.fillRect(x - 3, y - 3, 7, 6)
    c.fillStyle = '#2b0d0a'; c.fillRect(x - 3, y - 3, 7, 2)
    const f = Math.floor(t * 10) % 2
    c.fillStyle = '#ff9a8a'
    c.fillRect(x - 5, y - 1 + f, 2, 1); c.fillRect(x + 4, y - f, 2, 1); c.fillRect(x - 5, y + 2 - f, 2, 1); c.fillRect(x + 4, y + 2 + f, 2, 1)
  }
  function draw(t) {
    c.fillStyle = '#04120a'; c.fillRect(0, 0, GW, GH)
    c.fillStyle = 'rgba(207,255,216,.05)'
    for (let x = 0; x < GW; x += 12) c.fillRect(x, 0, 1, GH)
    c.fillStyle = '#1d3b28'; c.fillRect(0, GH - 7, GW, 7) // floor
    if (g.state === 'title') {
      text('COFFEE RUN', GW / 2, 64, 34, '#ffe600', 'center')
      text('catch beans · dodge bugs', GW / 2, 86, 14, '#cfffd8', 'center')
      if (t % 1 < 0.65) text('PUSH SMILEY TO START', GW / 2, 118, 14, '#f3ece8', 'center')
      cup(GW / 2)
    } else {
      for (const it of g.items) it.bug ? bug(it.x, it.y, t) : bean(it.x, it.y)
      cup(g.x)
      text(`SCORE ${g.score}`, 6, 14, 14, '#cfffd8')
      text(`HI ${g.best}`, GW - 6, 14, 14, '#cfffd8', 'right')
      text('♥'.repeat(Math.max(0, g.lives)) + '·'.repeat(3 - Math.max(0, g.lives)), GW / 2, 14, 14, '#ff6a5a', 'center')
      if (g.paused) text('PAUSED', GW / 2, 82, 30, '#ffe600', 'center')
      if (g.state === 'over') {
        c.fillStyle = 'rgba(4,18,10,.75)'; c.fillRect(0, 36, GW, 96)
        text('GAME OVER', GW / 2, 72, 32, '#ff6a5a', 'center')
        text(g.newBest ? `NEW HIGH SCORE ${g.score}!` : `SCORE ${g.score} · HI ${g.best}`, GW / 2, 94, 15, g.newBest ? '#ffe600' : '#cfffd8', 'center')
        if (t % 1 < 0.65) text('SMILEY TO PLAY AGAIN', GW / 2, 118, 14, '#f3ece8', 'center')
      }
    }
    if (g.hurt > 0) { c.fillStyle = `rgba(255,60,40,${g.hurt * 0.35})`; c.fillRect(0, 0, GW, GH) }
    tex.needsUpdate = true
  }

  return {
    open, close, start, press, release, key, steer, update,
    get active() { return g.active },
    get playing() { return g.active && g.state === 'play' && !g.paused },
    get state() { return g.active ? g.state : 'off' },
  }
}
