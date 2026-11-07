#version 300 es
precision highp float;
// 两个场景之间的转场。uKind 0：交叉溶解；1：横向切条；2：从中心向外的圆形擦除
uniform sampler2D uA, uB;
uniform vec2 uRes;
uniform float uMix, uKind, uT;
out vec4 fragColor;
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 a = texture(uA, uv).rgb, b = texture(uB, uv).rgb;
  float m = uMix;
  if (uKind > 1.5) {
    float r = length((uv - .5) * vec2(uRes.x / uRes.y, 1.));
    m = smoothstep(r - .03, r + .03, uMix * 1.1);
  } else if (uKind > .5) {
    float row = floor(uv.y * 24.);
    m = step(h11(row + 7.) * .8, uMix * 1.25 - .1);
  }
  fragColor = vec4(mix(a, b, m), 1.);
}
