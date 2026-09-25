import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { setMaxAniso } from '../util.js'

export const FOV = 30

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  setMaxAniso(renderer.capabilities.getMaxAnisotropy())

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.5

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100)
  camera.position.set(0, 0.12, 7)

  scene.add(new THREE.HemisphereLight('#cfeee8', '#2a1e1c', 0.3))
  const key = new THREE.DirectionalLight('#fff3ea', 1.9)
  key.position.set(4.5, 4, 5.5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 24 })
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.012
  const rim = new THREE.DirectionalLight('#bfe4ff', 0.55)
  rim.position.set(-1.5, 5, -3)
  // a soft fill from behind so the sticker-covered back isn't a black hole
  const back = new THREE.DirectionalLight('#ffe9df', 0.85)
  back.position.set(-3, 2.5, -6)
  scene.add(key, key.target, rim, back)

  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
  const composer = new EffectComposer(renderer, rt)
  composer.addPass(new RenderPass(scene, camera))
  const bokeh = new BokehPass(scene, camera, { focus: 7, aperture: 0, maxblur: 0.009 })
  bokeh.enabled = false
  composer.addPass(bokeh)
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.4, 1.6)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())
  const grain = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        float n = h(vUv * vec2(1731.0, 977.0) + fract(uTime) * 113.0);
        c.rgb += (n - 0.5) * 0.045;
        vec2 d = vUv - 0.5; c.rgb *= 1.0 - dot(d, d) * 0.5;
        gl_FragColor = c;
      }`,
  })
  composer.addPass(grain)

  // Objects that must not write into the DoF depth pass (full-screen background etc.)
  const noDepth = []
  const bokehRender = bokeh.render.bind(bokeh)
  bokeh.render = (...a) => {
    const vis = noDepth.map((o) => o.visible)
    noDepth.forEach((o) => (o.visible = false))
    bokehRender(...a)
    noDepth.forEach((o, i) => (o.visible = vis[i]))
  }

  const size = { w: 1, h: 1, aspect: 1 }
  function resize() {
    size.w = innerWidth; size.h = innerHeight; size.aspect = size.w / size.h
    camera.aspect = size.aspect
    camera.updateProjectionMatrix()
    renderer.setSize(size.w, size.h, false)
    composer.setPixelRatio(renderer.getPixelRatio())
    composer.setSize(size.w, size.h)
  }

  function setDof(amount, focus) {
    const on = amount > 0.02
    bokeh.enabled = on
    if (!on) return
    bokeh.uniforms.focus.value = focus
    bokeh.uniforms.aperture.value = 0.022 * amount
    bokeh.uniforms.maxblur.value = 0.014 * amount
  }

  function render(dt, t) {
    grain.uniforms.uTime.value = t
    composer.render(dt)
  }

  return { renderer, scene, camera, key, composer, bloom, size, resize, render, setDof, noDepth }
}
