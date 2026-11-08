// 分形飞越：沿 z 重复的 KIFS 折叠结构，中间挖出飞行通道；边缘辉光 + 轨道陷阱着色
float trap;
float de(vec3 p){
  vec3 q = p;
  q.z = mod(q.z, 8.) - 4.;
  float a1 = .6 + .15 * sin(uVar * 2.1) + .04 * uPulse, a2 = .35 + .2 * cos(uVar * 1.3);
  vec3 off = vec3(2.4, 1.6 + .3 * sin(uVar), 2.);
  float s = 1.;
  trap = 1e9;
  for (int i = 0; i < 5; i++){
    q = abs(q) - off;
    q.xy *= rot(a1); q.yz *= rot(a2);
    q *= 1.7; s *= 1.7;
    trap = min(trap, abs(q.y + .3) / s);
  }
  float d = (length(max(abs(q) - vec3(2.2, .7, 2.2), 0.)) - .1) / s;
  // 飞行通道
  vec2 c = p.xy - vec2(sin(p.z * .13) * 1.2, cos(p.z * .1) * .9);
  return max(d, 1.1 - length(c));
}

vec3 scene(vec2 uv){
  float z0 = uDist;
  vec3 ro = vec3(sin(z0 * .13) * 1.2, cos(z0 * .1) * .9, z0);
  float z1 = z0 + 3.;
  vec3 ta = vec3(sin(z1 * .13) * 1.2, cos(z1 * .1) * .9, z1);
  vec3 fw = normalize(ta - ro), rt = normalize(cross(vec3(0, 1, 0), fw)), up = cross(fw, rt);
  uv *= rot(uT * .15 * sin(uVar * 3.1 + 1.) + sin(uT * .5) * .2);
  vec3 rd = normalize(uv.x * rt + uv.y * up + (.9 - .2 * uPulse) * fw);
  float t = .05, d = 0., glow = 0.;
  int steps = 0;
  for (int i = 0; i < 110; i++){
    d = de(ro + rd * t);
    glow += exp(-d * 60.) * .012;
    if (d < .0006 * t || t > 30.) break;
    t += d * .9;
    steps = i;
  }
  vec3 col = vec3(0.);
  if (t < 30.){
    vec3 p = ro + rd * t;
    vec2 e = vec2(.0015 * t, 0.);
    vec3 n = normalize(vec3(de(p + e.xyy) - de(p - e.xyy), de(p + e.yxy) - de(p - e.yxy), de(p + e.yyx) - de(p - e.yyx)));
    float tr = trap;
    de(p); tr = trap;
    float ao = 1. - float(steps) / 110.;
    vec3 base = grad(tr * 1.5 + p.z * .02 + n.y * .2);
    float dif = max(dot(n, normalize(vec3(.5, .8, -.4))), 0.);
    float rim = pow(1. - max(dot(n, -rd), 0.), 3.);
    col = base * (.03 + .35 * dif) * ao * ao + uC2 * rim * .5 * ao;
    // 结构上的发光纹：随拍点从近往远传
    float band = exp(-abs(fract(p.z * .25 - uBeat * .5) - .5) * 30.);
    col += uC1 * smoothstep(.012, .0, tr) * (1.2 + 5. * band * uInt);
    col *= exp(-t * .12);
  }
  col += grad(uT * .05) * glow * (.35 + .9 * uPulse);
  return col;
}
