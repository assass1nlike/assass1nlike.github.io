// 万花筒：极坐标折叠成 N 个镜像扇区，再做 Kali 式迭代，叠加锐利的霓虹轮廓
vec3 scene(vec2 uv){
  float N = 5. + mod(uVar * 3., 7.);
  uv *= rot(uT * .25 * (mod(uVar, 2.) * 2. - 1.) + uKick * .08);
  float zoom = 1.4 + .4 * sin(uDist * .7) - .25 * uPulse;
  float r = length(uv), a = atan(uv.y, uv.x);
  float seg = PI / N;
  a = mod(a, 2. * seg); a = abs(a - seg);
  vec2 p = vec2(cos(a), sin(a)) * r * zoom;
  p += vec2(.3 * sin(uDist * .23), .2 * cos(uDist * .31));
  vec3 col = vec3(0.);
  float acc = 0.;
  vec2 k = vec2(.78 + .08 * sin(uDist * .4 + uVar), .62 + .06 * cos(uDist * .3));
  for (int i = 0; i < 9; i++){
    p = abs(p) / dot(p, p) - k;
    float fi = float(i);
    float l = length(p);
    float line = exp(-abs(l - 1.) * (14. + fi * 4.));
    col += grad(fi * .09 + uT * .04 + r * .3) * line * (.25 + .12 * fi);
    acc += exp(-l * 3.);
  }
  col *= .55 + 1.1 * uPulse * uInt + .3 * uMid;
  col += uC3 * acc * .02;
  col *= smoothstep(1.4, .1, r) + .15;
  return col;
}
