// 立方体城市：网格重复的随机旋转立方体，中间留出飞行通道；棱边霓虹，按拍随机点亮整块
vec2 path(float z){ return vec2(sin(z * .07) * 4., cos(z * .05) * 2.5); }
float box(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }

const float S = 3.;
vec3 cid, lq; float csz;
// 一套网格阵列：每格一个随机旋转的立方体（约 30% 的格子为空）
float cell(vec3 p, vec3 o, out vec3 id, out vec3 l, out float sz){
  id = floor((p + o) / S) + o * 7.3;
  vec3 q = mod(p + o, S) - S * .5;
  float h = h31(id);
  sz = .25 + .45 * h31(id + 7.1);
  q.xy *= rot(h * 6. + uT * .4 * (h - .5)); q.yz *= rot(h * 3.1 + uT * .2);
  l = q;
  return h < .3 ? 1e3 : box(q, vec3(sz)) - .02;
}
// 两套阵列错开半格叠加，填掉单套阵列在格子边界面上必然留下的空缝
float map(vec3 p){
  vec3 i1, l1, i2, l2; float s1, s2;
  float d1 = cell(p, vec3(0.), i1, l1, s1), d2 = cell(p, vec3(S * .5), i2, l2, s2);
  if (d1 < d2){ cid = i1; lq = l1; csz = s1; } else { cid = i2; lq = l2; csz = s2; }
  return max(min(d1, d2), 1.8 - length(p.xy - path(p.z)));
}

float litCell(vec3 c){ return step(.82, h31(c + floor(uBeat) * vec3(1.31, 2.17, .71))) * step(.3, h31(c)); }

vec3 scene(vec2 uv){
  float z0 = uDist;
  vec3 ro = vec3(path(z0), z0), ta = vec3(path(z0 + 4.), z0 + 4.);
  vec3 fw = normalize(ta - ro), rt = normalize(cross(vec3(0, 1, 0), fw)), up = cross(fw, rt);
  uv *= rot((path(z0 + 6.).x - path(z0).x) * .15 + sin(uT * .3 + uVar) * .25);
  vec3 rd = normalize(uv.x * rt + uv.y * up + (1. - .2 * uPulse) * fw);
  float t = .1, d;
  bool hit = false;
  vec3 glow = vec3(0.);
  for (int i = 0; i < 240; i++){
    vec3 p = ro + rd * t;
    d = map(p);
    glow += grad(h31(cid + 3.) * .6) * litCell(cid) * exp(-max(box(lq, vec3(csz)), 0.) * 5.) * .012 * (.3 + uPulse * 1.5) * uInt;
    if (d < .001 * t){ hit = true; break; }
    if (t > 60.) break;
    // 步长不超过沿光线走出当前格子的距离，避免跨格漏掉相邻立方体
    vec3 te = (step(0., rd) * S - mod(p, S)) / rd, tf = (step(0., rd) * S - mod(p + S * .5, S)) / rd;
    t += min(d, min(min(te.x, min(te.y, te.z)), min(tf.x, min(tf.y, tf.z))) + .01);
  }
  vec3 col = vec3(0.);
  if (hit){
    vec3 p = ro + rd * t;
    map(p);
    vec3 c = cid, l = lq; float sz = csz;
    vec3 a = sz - abs(l);
    float m1 = min(a.x, min(a.y, a.z)), m3 = max(a.x, max(a.y, a.z));
    float m2 = a.x + a.y + a.z - m1 - m3;
    float edge = smoothstep(.035, .0, m2);
    float h = h31(c + 3.);
    vec2 e = vec2(.002, 0.);
    vec3 n = normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
    float fr = pow(1. - max(dot(n, -rd), 0.), 4.);
    vec3 ec = grad(h * .6 + c.z * .02);
    col = uC3 * .02 + uC1 * fr * .25;
    col += ec * edge * (1.2 + 2.5 * uKick);
    col += ec * litCell(c) * (.4 + 2.5 * uPulse) * uInt;
    col *= exp(-t * .045);
  }
  col += glow;
  col += uC2 * .015 * exp(-t * .02);
  return col;
}
