import * as THREE from 'three'
import { damp } from '../util.js'

// Full-screen near-black background with a soft warm light pool that follows the console.
export function createBackdrop(stage) {
  const mat = new THREE.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uGlow: { value: new THREE.Vector2(0.4, 0.5) }, uGlowAmt: { value: 1 }, uAspect: { value: 1 },
      cBase: { value: new THREE.Color('#0b0b0c') }, cGlow: { value: new THREE.Color('#231e1c') }, cEdge: { value: new THREE.Color('#050505') },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      uniform vec2 uGlow;
      uniform float uGlowAmt, uAspect;
      uniform vec3 cBase, cGlow, cEdge;
      void main(){
        vec2 k = vec2(uAspect, 1.0) / max(uAspect, 1.0);
        vec2 p = (vUv - uGlow) * k;
        vec3 col = mix(cBase, cGlow, exp(-dot(p, p) * 3.2) * uGlowAmt);
        vec2 v = (vUv - 0.5) * k;
        col = mix(col, cEdge, smoothstep(0.35, 0.95, length(v)) * 0.7);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
  quad.frustumCulled = false
  quad.renderOrder = -10
  stage.scene.add(quad)
  stage.noDepth.push(quad)

  const tmp = new THREE.Vector3()
  function resize() { mat.uniforms.uAspect.value = stage.size.aspect }
  function update(dt, target, amount = 1) {
    // light pool sits behind whatever the console is doing (projected rig position)
    tmp.copy(target).project(stage.camera)
    const g = mat.uniforms.uGlow.value
    g.x = damp(g.x, tmp.x * 0.5 + 0.5, 3, dt)
    g.y = damp(g.y, tmp.y * 0.5 + 0.5, 3, dt)
    mat.uniforms.uGlowAmt.value = damp(mat.uniforms.uGlowAmt.value, amount, 3, dt)
  }
  return { resize, update, quad }
}
