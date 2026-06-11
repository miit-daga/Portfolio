"use client"

import { useEffect, useState } from "react"

// WebGL nebula behind the hero: domain-warped fbm noise clouds in deep
// blue/teal/violet.
//
// IMPORTANT: no <canvas> element may enter the hero's DOM subtree. A live
// accelerated canvas forces Chromium into GPU render surfaces, which strips
// the gradient orbs' mix-blend-mode backdrop - they stop blending with the
// black background and flood the hero with opaque pastel. So the shader runs
// once on an OFFSCREEN canvas, two moments of cloud-time are snapshotted to
// data URLs, and plain divs carry them - drifting and crossfading via
// transform/opacity, which composite safely (the orbs animate the same way).
// If WebGL is unavailable the component renders nothing and the gradient
// orbs carry the hero alone.

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p = p * 2.03 + vec2(13.7, 9.2);
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 0.014;

  // Two rounds of domain warping give the clouds their billowed structure
  vec2 q = vec2(fbm(uv * 1.5 + t), fbm(uv * 1.5 - t * 0.6 + 5.2));
  vec2 r = vec2(fbm(uv * 1.8 + q * 1.3 + t * 0.4), fbm(uv * 1.8 + q * 1.3 + 9.1));
  float f = fbm(uv * 2.1 + r * 1.6);

  // Deep blue base -> teal mid, with violet pulled in by the warp field
  vec3 col = mix(vec3(0.04, 0.08, 0.16), vec3(0.07, 0.34, 0.33), smoothstep(0.25, 0.78, f));
  col = mix(col, vec3(0.24, 0.13, 0.42), q.x * 0.75);
  // Bright filaments where the cloud density peaks
  col += vec3(0.20, 0.52, 0.48) * pow(max(f - 0.58, 0.0) * 2.4, 2.0);

  // Fade toward the edges so the clouds never form a hard frame
  float mask = 1.0 - smoothstep(0.45, 1.05, length(uv));
  float alpha = smoothstep(0.20, 0.82, f) * mask * 0.75;

  gl_FragColor = vec4(col, alpha);
}`

// Renders the shader at two time offsets on an offscreen canvas and returns
// both snapshots, or null when WebGL is missing or anything goes sideways
const renderFrames = (): [string, string] | null => {
  try {
    const canvas = document.createElement("canvas")
    canvas.width = 960
    canvas.height = 540
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false, // straight alpha so toDataURL keeps the colours
      preserveDrawingBuffer: true, // required for toDataURL after draw
      antialias: false,
      depth: false,
      stencil: false,
    })
    if (!gl) return null

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)
      if (!sh) return null
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
      }
      return sh
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
    gl.useProgram(prog)

    // One oversized triangle covers the buffer without a second draw
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, "a_pos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(gl.getUniformLocation(prog, "u_res"), canvas.width, canvas.height)
    const uTime = gl.getUniformLocation(prog, "u_time")

    const snapshot = (time: number) => {
      gl.uniform1f(uTime, time)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      return canvas.toDataURL("image/png")
    }
    const frames: [string, string] = [snapshot(7.0), snapshot(33.0)]
    gl.getExtension("WEBGL_lose_context")?.loseContext()
    return frames
  } catch {
    return null
  }
}

export const HeroNebula = () => {
  const [frames, setFrames] = useState<[string, string] | null>(null)

  useEffect(() => {
    setFrames(renderFrames())
  }, [])

  if (!frames) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="nebula-layer absolute inset-0" style={{ backgroundImage: `url(${frames[0]})` }} />
      <div className="nebula-layer nebula-layer-b absolute inset-0" style={{ backgroundImage: `url(${frames[1]})` }} />
    </div>
  )
}
