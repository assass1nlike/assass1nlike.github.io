// 霓虹隧道：沿弯曲路径的多边形隧道，墙面有棱线、面板灯和高速流光；每拍一圈光环向前推进
vec2 path(float z){ return vec2(sin(z * .11) * 3. + sin(z * .047 + 1.) * 2., cos(z * .09) * 2. + sin(z * .031) * 1.5); }
float N(){ return 4. + 2. * mod(uVar, 3.); }

float tunnel(vec3 p, out float ang, out float aa){
  vec2 q = p.xy - path(p.z);
  float seg = TAU / N();
  ang = atan(q.y, q.x) + p.z * .03 * sin(uVar * 1.7);
  aa = mod(ang + seg * .5, seg) - seg * .5;
  return 2.2 - length(q) * cos(aa);
}

vec3 scene(vec2 uv){
  float z0 = uDist;
  vec3 ro = vec3(path(z0), z0), ta = vec3(path(z0 + 5.), z0 + 5.);
  vec3 fw = normalize(ta - ro), rt = normalize(cross(vec3(0, 1, 0), fw)), up = cross(fw, rt);
  uv *= rot(sin(uT * .35) * .35 + (path(z0 + 8.).x - path(z0).x) * .12);
  vec3 rd = normalize(uv.x * rt + uv.y * up + (1. - .25 * uPulse) * fw);
  float t = .1, ang, aa, d;
  vec3 glow = vec3(0.);
  float seg = TAU / N();
  for (int i = 0; i < 100; i++){
    vec3 p = ro + rd * t;
    d = tunnel(p, ang, aa);
    // 光环：每 5 个单位一圈，一拍点亮一圈并向前传
    float ri = floor(p.z / 5.);
    float wave = exp(-4. * fract(ri * .25 - uBeat));
    float rz = abs(mod(p.z, 5.) - 2.5);
    glow += grad(ri * .13) * exp(-length(vec2(d, rz)) * 6.) * (.04 + .5 * wave * (.3 + uInt)) * .9;
    if (d < .002 * t || t > 70.) break;
    t += d * .85;
  }
  vec3 p = ro + rd * t;
  // 墙面发光
  float cell = floor((ang + PI) / seg);
  float zc = floor(p.z / 1.5);
  float edge = smoothstep(.04, .0, seg * .5 - abs(aa));                       // 多边形棱线
  float grid = smoothstep(.44, .49, abs(fract(p.z / 1.5) - .5)) * .6;         // 横向分格线
  float lit = step(.88, h21(vec2(cell, zc))) * (.4 + .6 * sin(uT * 4. + zc));  // 常亮面板
  float beatLit = step(.8, h31(vec3(cell, zc, floor(uBeat * 2.)))) * uPulse8 * uInt * 2.;
  float lane = abs(aa / seg * 2.);                                            // 面内横向位置
  float dash = smoothstep(.6, 1., fract(p.z * .08 - uT * (1.5 + uSpeed * .6) + h11(cell * 3.))) * smoothstep(.06, .0, abs(lane - .5));
  vec3 base = grad(cell / N() * .5 + zc * .01 + uT * .03);
  vec3 col = uC3 * .015;
  col += uC1 * edge * (1.2 + 2. * uKick);
  col += base * grid * (.2 + .8 * uPulse);
  col += base * (lit * .3 + beatLit) * smoothstep(.45, .3, abs(lane - .5));
  col += uC2 * dash * 3. * (.4 + uInt);
  col *= exp(-t * .035);
  col += glow;
  col += uC2 * exp(-t * .02) * .02 * uSub;
  return col;
}
