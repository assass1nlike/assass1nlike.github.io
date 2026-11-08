// 超空间星流：极坐标下每个扇区放一颗星，按深度投影成径向拉丝；中心辉光和星云
vec3 scene(vec2 uv){
  float r = length(uv), a = atan(uv.y, uv.x);
  vec3 col = vec3(0.);
  float streak = .015 + uSpeed * .22;   // 拉丝对应的深度跨度
  for (int L = 0; L < 3; L++){
    float fl = float(L);
    float n = 60. + fl * 50.;
    float ac = (a / TAU + .5) * n, id = floor(ac), fa = fract(ac) - .5;
    for (int k = 0; k < 2; k++){
      float sid = id + float(k) * 1000. + fl * 97.;
      float off = (h11(sid * 1.7) - .5) * .7;
      float z = fract(h11(sid * 3.1) - uDist * .02 * (.6 + h11(sid * 5.3)));
      float Z = .2 + 30. * z;
      float R0 = .5 + 2.5 * h11(sid * 7.9);
      float rs = R0 / Z, rt = R0 / (Z + streak);
      float arc = (fa - off) * TAU / n * r;
      float w = min(.0035, .0007 + .0012 / Z);
      float along = smoothstep(rt - .002, rt + (rs - rt) * .3, r) * smoothstep(rs + .004, rs, r);
      float br = along * smoothstep(w, 0., abs(arc)) * smoothstep(1., .6, z) * (.6 / Z + .05);
      col += br * mix(vec3(1.), grad(h11(sid * 2.3)), .55) * 1.5;
    }
  }
  // 星云：沿视线方向流动的噪声
  float dep = .4 / (r + .08) + uDist * .015;
  vec2 q = vec2(cos(a), sin(a)) * 1.6 + vec2(dep, -dep * .7);
  float neb = fbm(q * 2.) * fbm(q * 1.3 + 4.);
  float nebAmt = .12 + .3 * step(.5, mod(uVar, 2.));
  col += grad(neb * .8 + uT * .02) * pow(neb, 2.) * nebAmt * smoothstep(.0, .5, r) * (.6 + uMid);
  // 中心光源
  col += uC1 * (.004 / (r * r + .004)) * (.25 + .8 * uPulse + .6 * uRise);
  col += vec3(1.) * exp(-r * 30.) * (.5 + uPulse);
  return col * (.5 + .7 * uInt);
}
