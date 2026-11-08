#version 300 es
precision highp float;
// 最终合成：震屏与冲击缩放、径向模糊、色差、故障切块、辉光、闪白/反色、色调映射、暗角、颗粒
uniform sampler2D uSrc, uBloom;
uniform vec2 uRes, uShake;
uniform float uT, uZoom, uRoll, uAberr, uGlitch, uGlitchSeed, uFlash, uInvert, uFade, uBloomAmt, uExposure, uGrain, uVignette, uRadial, uSat, uScan;
uniform vec3 uFlashCol;
out vec4 fragColor;
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
vec3 samp(vec2 uv){ return texture(uSrc, uv).rgb + texture(uBloom, uv).rgb * uBloomAmt; }
void main(){
  vec2 uv0 = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = (uv0 - .5) * vec2(asp, 1.);
  float c = cos(uRoll), s = sin(uRoll);
  p = mat2(c, s, -s, c) * p / uZoom + uShake;
  // 故障：随机横条整体错位
  float gl = 0.;
  if (uGlitch > 0.) {
    float row = floor(uv0.y * mix(8., 40., h11(uGlitchSeed)));
    float r = h11(row * 13.1 + uGlitchSeed * 71.);
    if (r < uGlitch * .6) { gl = (h11(row + uGlitchSeed) - .5); p.x += gl * .25 * uGlitch; }
  }
  vec2 uv = p / vec2(asp, 1.) + .5;
  vec2 dir = (uv - .5);
  float ab = uAberr * (.4 + length(dir) * 1.6) + abs(gl) * uGlitch * .03;
  vec3 col;
  if (uRadial > 0.) {
    col = vec3(0.);
    for (int i = 0; i < 12; i++) {
      float k = 1. - uRadial * float(i) / 12. * .25;
      vec2 q = .5 + dir * k;
      col += vec3(samp(q + dir * ab).r, samp(q).g, samp(q - dir * ab).b);
    }
    col /= 12.;
  } else {
    col = vec3(samp(uv + dir * ab).r, samp(uv).g, samp(uv - dir * ab).b);
  }
  col *= uExposure;
  col = aces(col);
  float l = dot(col, vec3(.299, .587, .114));
  col = max(mix(vec3(l), col, uSat), 0.);
  col = mix(col, vec3(1.) - col, uInvert);
  col += uFlashCol * uFlash;
  col *= mix(1., smoothstep(1.25, .25, length((uv0 - .5) * vec2(asp, 1.) * 1.1)), uVignette);
  col *= 1. - uScan * .5 * (.5 + .5 * sin(gl_FragCoord.y * 3.14159));
  col += (h21(gl_FragCoord.xy + fract(uT * 61.) * 917.) - .5) * uGrain;
  col *= uFade;
  fragColor = vec4(pow(clamp(col, 0., 1.), vec3(1. / 2.2)), 1.);
}
