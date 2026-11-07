// 脉冲核心：陀螺面镂空的球壳、发光内核和三道光环；背景是放射光束和每拍一圈的冲击波
float sdTorus(vec3 p, vec2 t){ return length(vec2(length(p.xz) - t.x, p.y)) - t.y; }
float matId;
float R(){ return (1.15 + .14 * uPulse) * (1. - .55 * uImplode); }
float map(vec3 p){
  vec3 q = p;
  q.xz *= rot(uT * .7 + uVar); q.xy *= rot(uT * .45);
  float r = R();
  float sph = abs(length(q) - r) - .05;
  float gy = dot(sin(q * 5.5), cos(q.yzx * 5.5)) / 5.5;
  float shell = max(sph, abs(gy) - .045);
  float core = length(p) - .42 * r;
  float rings = 1e9;
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    vec3 w = p; w.yz *= rot(fi * 1.1 + uT * (.6 + fi * .35)); w.xy *= rot(fi * .8 + uT * .2);
    rings = min(rings, sdTorus(w, vec2((1.75 + fi * .38) * (1. - .4 * uImplode), .012)));
  }
  matId = shell < core ? (shell < rings ? 1. : 2.) : (core < rings ? 0. : 2.);
  return min(shell, min(core, rings));
}

vec3 scene(vec2 uv){
  float ang = uT * .3 + uVar;
  float dist = 4.6 - 1.4 * uImplode + .3 * sin(uT * .5);
  vec3 ro = vec3(sin(ang) * dist, .8 * sin(uT * .23), cos(ang) * dist);
  vec3 fw = normalize(-ro), rt = normalize(cross(vec3(0, 1, 0), fw)), up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.4 * fw);
  // 背景：放射光束 + 冲击波
  float r = length(uv), a = atan(uv.y, uv.x);
  vec3 col = vec3(0.);
  vec2 dir = vec2(cos(a), sin(a));
  float rays = pow(noise(dir * 6. + uT * .8) * noise(dir * 15. - uT * 1.3), 2.);
  col += grad(a / TAU + uT * .05) * rays * exp(-r * 1.6) * (.4 + 1.2 * uSub + uRise);
  float ph = fract(uBeat);
  for (int k = 0; k < 2; k++){
    float pk = ph + float(k);
    col += uC2 * exp(-abs(r - pk * .9) * 60.) * pow(1. - pk / 2., 3.) * (.2 + uSub) * uInt * 2.;
  }
  // 物体
  float t = 0., d, glow = 0.;
  for (int i = 0; i < 90; i++){
    vec3 p = ro + rd * t;
    d = map(p);
    glow += exp(-max(length(p) - .42 * R(), 0.) * 5.) * .008;
    if (d < .001 || t > 12.) break;
    t += d * .8;
  }
  if (t < 12.){
    vec3 p = ro + rd * t;
    map(p);
    float m = matId;
    vec2 e = vec2(.002, 0.);
    vec3 n = normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
    float fr = pow(1. - max(dot(n, -rd), 0.), 2.);
    if (m < .5) col = mix(uC1, vec3(1.), .3) * (1. + 2. * uPulse);
    else if (m < 1.5) col = grad(length(p) + dot(n, vec3(.3)) + uT * .1) * (.05 + 1.2 * fr) + uC1 * pow(max(dot(n, -normalize(p)), 0.), 3.) * .8;
    else col = uC2 * (1. + 2.5 * uPulse);
  }
  col += uC1 * glow * (.5 + 1.2 * uPulse + .8 * uImplode);
  return col;
}
