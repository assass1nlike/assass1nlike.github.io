#version 300 es
precision highp float;
// 所有场景共用的 uniform 与工具函数。场景只需定义 vec3 scene(vec2 uv)，uv 以画面中心为原点、高度为 1。
uniform vec2 uRes, uJit;
uniform float uW;
uniform float uT;      // 镜头内时间（秒），定格时会被量化
uniform float uBeat;   // 全曲拍数
uniform float uDist;   // 累计前进距离，速度随音乐起伏
uniform float uSpeed;  // 当前速度
uniform float uPulse, uKick, uSnare, uHat, uPulse8;
uniform float uSub, uBass, uLow, uMid, uHigh, uRms;
uniform float uInt;    // 段落强度 0..1
uniform float uRise;   // 铺垫进度 0..1
uniform float uVar;    // 镜头变体编号
uniform float uImplode; // 坍缩进度（drop 前一小节）
uniform vec3 uC1, uC2, uC3;
out vec4 fragColor;

#define PI 3.14159265
#define TAU 6.2831853

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float h31(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * noise(p); p = rot(.6) * p * 2.03 + 11.7; a *= .5; } return s; }

// 三色循环渐变
vec3 grad(float x){
  x = fract(x) * 3.;
  return x < 1. ? mix(uC1, uC2, x) : x < 2. ? mix(uC2, uC3, x - 1.) : mix(uC3, uC1, x - 2.);
}
