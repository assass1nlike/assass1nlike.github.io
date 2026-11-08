// 合成波网格：峡谷地形上的霓虹网格高速掠过，地平线上是切条的落日
float H(vec2 xz){
  float v = smoothstep(1.2, 7., abs(xz.x));
  return v * v * (fbm(xz * .13) * 7. + .5) - .02;
}
vec3 scene(vec2 uv){
  vec3 ro = vec3(sin(uT * .3 + uVar) * .8, .55 + .15 * sin(uT * .7), uDist);
  uv *= rot(sin(uT * .45 + uVar) * .12 + uKick * .03 * sin(uT * 40.));
  vec3 rd = normalize(vec3(uv.x, uv.y + .06, 1.2 - .15 * uPulse));
  // 天空与太阳
  vec2 sp = uv - vec2(0., .13);
  float sr = length(sp);
  vec3 col = mix(uC3 * .35, vec3(0.), smoothstep(-.05, .5, uv.y));
  float stripe = sp.y > 0. ? 1. : step(.35 + sp.y * 2.5, fract(sp.y * 22. - uT * .6));
  col += mix(uC1, uC2, smoothstep(-.2, .25, sp.y)) * smoothstep(.27, .265, sr) * stripe * (.38 + .3 * uPulse);
  col += uC1 * exp(-sr * 5.) * .15 * (1. + uPulse);
  col += vec3(1.) * step(.997, h21(floor(uv * 300.))) * smoothstep(.05, .3, uv.y) * .8;
  // 地形
  float t = .1;
  bool hit = false;
  for (int i = 0; i < 140; i++){
    vec3 p = ro + rd * t;
    float h = p.y - H(p.xz);
    if (h < .002 * t){ hit = true; break; }
    t += max(.02, h * .45);
    if (t > 90.) break;
  }
  if (hit){
    vec3 p = ro + rd * t;
    vec2 g = p.xz * .8;
    vec2 gl = abs(fract(g) - .5) / max(fwidth(g), 1e-4);
    float line = 1. - min(min(gl.x, gl.y) / 1.5, 1.);
    float wave = exp(-abs(fract((p.z - uDist) * .04 - uBeat * .5) - .5) * 12.);
    vec3 lc = mix(uC2, uC1, smoothstep(0., 4., p.y));
    col = mix(col, uC3 * .05 + lc * line * (1.2 + 2.5 * wave * uInt + 1.5 * uKick), exp(-t * .035));
  }
  return col;
}
