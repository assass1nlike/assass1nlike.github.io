// 液态等值线：多层域扭曲噪声当作高度场，画出流动的等高线和金属高光
vec3 scene(vec2 uv){
  vec2 p = rot(uVar * 1.3) * uv * .9;
  float t = uDist * .8;
  vec2 w1 = vec2(fbm(p * 1.3 + vec2(0., t * .3)), fbm(p * 1.3 + vec2(5.2, -t * .25)));
  vec2 w2 = vec2(fbm(p + 3. * w1 + vec2(1.7, 9.2) + t * .15), fbm(p + 3. * w1 + vec2(8.3, 2.8)));
  float f = fbm(p + (3.5 + 1.5 * uKick) * w2);
  vec3 n = normalize(vec3(-vec2(dFdx(f), dFdy(f)) * 160., 1.));
  vec3 L = normalize(vec3(.4 * sin(uT * .5), .5, .8));
  float spec = pow(max(dot(reflect(-L, n), vec3(0, 0, 1)), 0.), 30.);
  float iso = fract(f * 7. - uT * .5);
  float line = exp(-abs(iso - .5) * 70.);
  float fat = exp(-abs(fract(f * 2.75 - uBeat * .25) - .5) * 14.);
  vec3 col = grad(f * 1.3 + length(w2) * .6 + uSnare * .3) * (.01 + .12 * f * f * f);
  col += grad(f + .35) * line * (.8 + 2.5 * uPulse * uInt);
  col += uC1 * fat * (.3 + 2. * uPulse) * uInt;
  col += mix(uC3, vec3(1.), .5) * spec * .5;
  return col;
}
