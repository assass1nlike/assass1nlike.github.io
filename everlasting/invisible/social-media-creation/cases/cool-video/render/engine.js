// WebGL2 渲染管线：场景 → 拖尾反馈 → 辉光 → 合成（色差、故障、震屏、闪白、色调映射）。
// window.SHADERS（各 glsl 源码）由驱动脚本注入；时间轴见 timeline.js。
const W = 1920, H = 1080;
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false });
if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float render targets');

const VERT = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2. - 1., 0., 1.); }`;

function compile(name, src) {
  const mk = (type, s) => {
    const sh = gl.createShader(type); gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`${name}: ${gl.getShaderInfoLog(sh)}`);
    return sh;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, src));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`${name}: ${gl.getProgramInfoLog(p)}`);
  p.loc = {};
  return p;
}

function setU(p, name, v) {
  if (!(name in p.loc)) p.loc[name] = gl.getUniformLocation(p, name);
  const l = p.loc[name]; if (l === null) return;
  if (typeof v === 'number') gl.uniform1f(l, v);
  else if (v.length === 2) gl.uniform2fv(l, v);
  else if (v.length === 3) gl.uniform3fv(l, v);
  else gl.uniform4fv(l, v);
}

function fbo(w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { fb, tex, w, h };
}

const SCENE_NAMES = Object.keys(SHADERS).filter(k => k.startsWith('scene_')).map(k => k.slice(6));
const PROG = {};
for (const s of SCENE_NAMES) PROG[s] = compile(s, SHADERS.common + '\n' + SHADERS['scene_' + s] + '\nvoid main(){ fragColor = vec4(scene((gl_FragCoord.xy + uJit - .5 * uRes) / uRes.y) * uW, 1.); }');
for (const s of ['mix', 'trail', 'down', 'up', 'final']) PROG[s] = compile(s, SHADERS[s]);

const sceneA = fbo(W, H), sceneB = fbo(W, H), sceneM = fbo(W, H);
const trail = [fbo(W, H), fbo(W, H)];
const mips = []; for (let i = 1, w = W / 2, h = H / 2; i <= 6; i++, w = Math.ceil(w / 2), h = Math.ceil(h / 2)) mips.push(fbo(Math.ceil(w), Math.ceil(h)));
let ping = 0;

function draw(prog, target, texs = {}, uni = {}) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
  gl.viewport(0, 0, target ? target.w : W, target ? target.h : H);
  gl.useProgram(prog);
  let unit = 0;
  for (const [name, tex] of Object.entries(texs)) {
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    if (!(name in prog.loc)) prog.loc[name] = gl.getUniformLocation(prog, name);
    gl.uniform1i(prog.loc[name], unit++);
  }
  setU(prog, "uDst", target ? [target.w, target.h] : [W, H]);
  for (const [k, v] of Object.entries(uni)) setU(prog, k, v);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// 场景：在快门时间内取 n 个子帧（带亚像素抖动）叠加，得到运动模糊和抗锯齿
const SHUTTER = 0.5 / 60;
function renderScene(shot, t, target, nSub) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  const prog = PROG[shot.scene];
  for (let i = 0; i < nSub; i++) {
    const ts = t - SHUTTER * (nSub > 1 ? i / (nSub - 1) : 0);
    const u = sceneUniforms(shot, ts);
    u.uRes = [W, H];
    u.uJit = nSub > 1 ? [((i * 0.618) % 1) - 0.5, ((i * 0.382 + 0.25) % 1) - 0.5] : [0, 0];
    u.uW = 1 / nSub;
    draw(prog, target, {}, u);
  }
  gl.disable(gl.BLEND);
}

function renderFrame(t, nSub = 1) {
  const st = frameState(t);
  renderScene(st.shot, t, sceneA, nSub);
  let src = sceneA.tex;
  if (st.next) {
    renderScene(st.next, t, sceneB, nSub);
    draw(PROG.mix, sceneM, { uA: sceneA.tex, uB: sceneB.tex }, { uRes: [W, H], uMix: st.mix, uKind: st.mixKind, uT: t });
    src = sceneM.tex;
  }
  const cur = trail[ping], prev = trail[1 - ping];
  draw(PROG.trail, cur, { uCur: src, uPrev: prev.tex }, { uRes: [W, H], uAmt: st.post.trail, uZoom: st.post.trailZoom, uRot: st.post.trailRot });
  ping = 1 - ping;
  // 辉光：逐级下采样后逐级上采样累加
  let s = cur;
  for (let i = 0; i < mips.length; i++) { draw(PROG.down, mips[i], { uSrc: s.tex }, { uTexel: [1 / s.w, 1 / s.h], uFirst: i === 0 ? 1 : 0, uThr: st.post.bloomThr }); s = mips[i]; }
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  for (let i = mips.length - 1; i > 0; i--) draw(PROG.up, mips[i - 1], { uSrc: mips[i].tex }, { uTexel: [1 / mips[i].w, 1 / mips[i].h] });
  gl.disable(gl.BLEND);
  draw(PROG.final, null, { uSrc: cur.tex, uBloom: mips[0].tex }, Object.assign({ uRes: [W, H], uT: t }, st.postU));
}

function resetTrail() {
  for (const f of trail) { gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
}
