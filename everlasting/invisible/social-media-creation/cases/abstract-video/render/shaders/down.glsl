#version 300 es
precision highp float;
// 辉光下采样（13 点滤波）。第一级只保留超过阈值的亮部
uniform sampler2D uSrc;
uniform vec2 uTexel, uDst;
uniform float uFirst, uThr;
out vec4 fragColor;
vec3 S(vec2 uv){ return texture(uSrc, uv).rgb; }
void main(){
  vec2 uv = gl_FragCoord.xy / uDst;
  vec2 d = uTexel;
  vec3 c = S(uv) * .125;
  c += (S(uv + d * vec2(-1, -1)) + S(uv + d * vec2(1, -1)) + S(uv + d * vec2(-1, 1)) + S(uv + d * vec2(1, 1))) * .125;
  c += (S(uv + d * vec2(-2, -2)) + S(uv + d * vec2(2, -2)) + S(uv + d * vec2(-2, 2)) + S(uv + d * vec2(2, 2))) * .03125;
  c += (S(uv + d * vec2(-2, 0)) + S(uv + d * vec2(2, 0)) + S(uv + d * vec2(0, -2)) + S(uv + d * vec2(0, 2))) * .0625;
  if (uFirst > .5) {
    float l = max(c.r, max(c.g, c.b));
    c *= smoothstep(uThr, uThr + 1., l) / max(l, 1e-4) * l;
  }
  fragColor = vec4(c, 1.);
}
