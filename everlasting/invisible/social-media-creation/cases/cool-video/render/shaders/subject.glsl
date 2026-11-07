#version 300 es
precision highp float;
// 画面主体：铬合金人形 / 飞船。输出预乘颜色和覆盖度，按子帧叠加，最后盖在场景上。
uniform vec2 uRes, uJit, uUvOff;
uniform float uW;
uniform sampler2D uScene;
uniform float uT, uBeat, uPulse, uPulse8, uKick, uInt;
uniform vec3 uC1, uC2, uC3;
uniform float uType;                       // 1 人形，2 飞船
uniform vec3 uCamPos, uCamX, uCamY, uCamZ;
uniform float uFocal, uRoll;
uniform vec3 uPos, uAx, uAy, uAz;          // 主体局部坐标 → 世界：uPos + uScale * (x uAx + y uAy + z uAz)
uniform float uScale, uGround, uBoost, uRim, uEnv;
uniform vec3 uJ[16];                       // 人形关节（局部坐标）
out vec4 fragColor;

#define PI 3.14159265
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
vec3 grad(float x){ x = fract(x) * 3.; return x < 1. ? mix(uC1, uC2, x) : x < 2. ? mix(uC2, uC3, x - 1.) : mix(uC3, uC1, x - 2.); }
float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float cap(vec3 p, vec3 a, vec3 b, float ra, float rb, out float h){
  vec3 pa = p - a, ba = b - a; h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  return length(pa - ba * h) - mix(ra, rb, h);
}
float box(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float ellip(vec3 p, vec3 r){ float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.) / k1; }

// ---- 人形 ----
float mId, mH;   // 最近部件编号（0 躯干，1 头，2 四肢）与沿部件的位置
void limb(inout float d, vec3 p, int a, int b, float ra, float rb){
  float h, e = cap(p, uJ[a], uJ[b], ra, rb, h);
  if (e < d){ mId = 2.; mH = h; }
  d = smin(d, e, .025);
}
float human(vec3 p){
  float h;
  vec3 up = normalize(uJ[2] - uJ[0]);
  float d = cap(p, uJ[0], uJ[1], .12, .15, h);                       // 躯干
  d = smin(d, cap(p, uJ[4], uJ[7], .07, .07, h), .1);                 // 肩
  d = smin(d, cap(p, uJ[10], uJ[13], .1, .1, h), .08);                // 胯
  d = smin(d, cap(p, uJ[1], uJ[2], .06, .05, h), .05);                // 颈
  mId = 0.; mH = dot(p - uJ[0], up);
  float hd = length((p - uJ[3]) * vec3(1., .85, 1.)) - .11;          // 头
  if (hd < d){ mId = 1.; mH = 0.; }
  d = smin(d, hd, .03);
  limb(d, p, 4, 5, .06, .048); limb(d, p, 5, 6, .046, .036);
  limb(d, p, 7, 8, .06, .048); limb(d, p, 8, 9, .046, .036);
  limb(d, p, 10, 11, .085, .062); limb(d, p, 11, 12, .06, .042);
  limb(d, p, 13, 14, .085, .062); limb(d, p, 14, 15, .06, .042);
  return d;
}

// ---- 飞船（局部 z 朝前）----
float ship(vec3 p){
  mId = 0.;
  float d = ellip(p, vec3(.3, .15, 1.35));
  vec3 w = p; w.x = abs(w.x); w -= vec3(.55, -.03, -.35); w.xz *= rot(-.55);
  d = smin(d, box(w, vec3(.48, .02, .24)) - .01, .07);
  vec3 e = p; e.x = abs(e.x); e -= vec3(.32, 0., -.85);
  float eng = max(length(e.xy) - .1, abs(e.z) - .38);
  if (eng < d) mId = 1.;
  d = smin(d, eng, .05);
  vec3 f = p; f.x = abs(f.x); f -= vec3(.98, .1, -.62); f.xy *= rot(.45);
  d = min(d, box(f, vec3(.015, .14, .16)));
  float cp = ellip(p - vec3(0., .11, .3), vec3(.13, .09, .42));
  if (cp < d) mId = 2.;
  return min(d, cp);
}

float sdf(vec3 wp){
  vec3 q = wp - uPos;
  q = vec3(dot(q, uAx), dot(q, uAy), dot(q, uAz)) / uScale;
  return (uType < 1.5 ? human(q) : ship(q)) * uScale;
}
vec3 toLocal(vec3 wp){ vec3 q = wp - uPos; return vec3(dot(q, uAx), dot(q, uAy), dot(q, uAz)) / uScale; }

// 光线与线段最近距离；返回 (距离, 线段参数, 光线参数)
vec3 raySeg(vec3 ro, vec3 rd, vec3 a, vec3 b){
  vec3 ba = b - a, oa = ro - a;
  float bb = dot(ba, ba), rb = dot(rd, ba), ro_ = dot(rd, oa), bo = dot(ba, oa);
  float den = bb - rb * rb;
  float s = clamp((bo - rb * ro_) / max(den, 1e-6), 0., 1.);
  float t = max(dot(a + ba * s - ro, rd), 0.);
  return vec3(length(ro + rd * t - (a + ba * s)), s, t);
}

void main(){
  vec2 frag = gl_FragCoord.xy + uJit;
  vec2 uv = (frag - .5 * uRes) / uRes.y;
  vec2 suv = frag / uRes;
  uv = uv * rot(uRoll) + uUvOff;
  vec3 ro = uCamPos, rd = normalize(uv.x * uCamX + uv.y * uCamY + uFocal * uCamZ);
  vec3 center = uPos + (uType < 1.5 ? uAy * .9 : vec3(0.)) * uScale;
  float R = (uType < 1.5 ? 1.25 : 1.7) * uScale;
  vec3 oc = ro - center;
  float b = dot(oc, rd), c = dot(oc, oc) - R * R, disc = b * b - c;
  vec3 col = vec3(0.), glow = vec3(0.);
  float alpha = 0., tHit = 1e9;
  if (disc > 0.){
    float t = max(-b - sqrt(disc), 0.), t1 = -b + sqrt(disc);
    for (int i = 0; i < 90; i++){
      float d = sdf(ro + rd * t);
      if (d < .0004 * t){ tHit = t; break; }
      t += d;
      if (t > t1) break;
    }
  }
  if (tHit < 1e8){
    vec3 p = ro + rd * tHit;
    vec2 e = vec2(.0006 * tHit, 0.);
    vec3 n = normalize(vec3(sdf(p + e.xyy) - sdf(p - e.xyy), sdf(p + e.yxy) - sdf(p - e.yxy), sdf(p + e.yyx) - sdf(p - e.yyx)));
    sdf(p);
    float id = mId, hh = mH;
    vec3 q = toLocal(p);
    float ndv = max(dot(n, -rd), 0.);
    // 反射：按反射方向在场景画面里取样，再混一点配色渐变当天空
    vec3 r = reflect(rd, n);
    vec2 ruv = suv + vec2(dot(r, uCamX), dot(r, uCamY)) * .22;
    vec3 env = min(texture(uScene, clamp(ruv, .001, .999)).rgb, vec3(1.5)) * uEnv + grad(r.y * .3 + .5) * .1 * (.5 + .5 * r.y);
    float fres = .35 + .65 * pow(1. - ndv, 4.);
    vec3 L = normalize(-uCamX * .5 + uCamY * .9 - uCamZ * .35);
    float dif = max(dot(n, L), 0.), spec = pow(max(dot(reflect(-L, n), -rd), 0.), 60.);
    col = vec3(.008) + env * fres + vec3(.8) * dif * .1 * uEnv + vec3(1.) * spec * 1.2;
    col += uC2 * pow(1. - ndv, 4.) * uRim * (.25 + .35 * uPulse);
    float glowLine = 0.;
    if (uType < 1.5){
      // 霓虹接缝：四肢在关节附近一圈，躯干上两道横线；头部是发光面罩
      if (id > 1.5) glowLine = smoothstep(.06, .0, abs(hh - .88)) + smoothstep(.04, .0, abs(hh - .12)) * .6;
      else if (id < .5) glowLine = smoothstep(.46, .49, abs(fract(hh * 4.5) - .5));
      else {
        vec3 hp = q - uJ[3];
        vec3 fwd = normalize(cross(uJ[4] - uJ[7], uJ[2] - uJ[0]));
        float front = dot(normalize(hp), fwd);
        glowLine = smoothstep(.35, .6, front) * smoothstep(.045, .02, abs(dot(hp, normalize(uJ[2] - uJ[0])) - .005)) * 2.;
      }
      col += uC1 * glowLine * (1.2 + 2.5 * uPulse + 1.5 * uKick);
    } else {
      if (id > 1.5) col = col * .35 + uC1 * pow(1. - ndv, 2.) * .6;            // 座舱玻璃
      float stripe = smoothstep(.025, .0, abs(q.x)) * step(0., q.y) * step(-1., q.z) + smoothstep(.02, .0, abs(abs(q.x) - .2)) * step(.06, q.y) * step(-.9, q.z) * step(q.z, .6);
      float edge = smoothstep(.02, .0, abs(abs(q.x) - (.55 + (q.z + .35) * -.55)) - .0) * step(.2, abs(q.x)) * step(abs(q.y + .03), .03);
      col += uC1 * (stripe + edge) * (1.5 + 3. * uPulse);
      if (id > .5 && id < 1.5 && q.z < -1.18) col += mix(uC2, vec3(1.), .5) * 1.5 * uBoost;   // 尾喷口
    }
    alpha = 1.;
  }
  if (uType > 1.5){
    // 引擎尾焰：两条从喷口向后的光束
    for (int k = -1; k <= 1; k += 2){
      vec3 a = uPos + uScale * (float(k) * .32 * uAx - 1.24 * uAz);
      vec3 bb = a - uAz * uScale * (1.5 + 3. * uBoost);
      vec3 rs = raySeg(ro, rd, a, bb);
      if (rs.z < tHit){
        float w = uScale * (.03 + .06 * rs.y);
        float g = exp(-rs.x / w) * pow(1. - rs.y, 1.5);
        glow += (mix(uC2, vec3(1.), exp(-rs.x / (w * .3))) * g * 1.2 + uC2 * exp(-rs.x / (w * 4.)) * pow(1. - rs.y, 3.) * .2) * uBoost;
      }
    }
  }
  if (uGround > .5 && tHit > 1e8){
    // 脚下的接地光环，每个八分音符（落脚）亮一下
    float tg = (uPos.y - ro.y) / rd.y;
    if (tg > 0.){
      vec3 g = ro + rd * tg - uPos;
      float rr = length(g.xz) / uScale;
      glow += uC1 * (exp(-rr * 3.) * .25 + exp(-abs(rr - .5 - .4 * (1. - uPulse8)) * 25.) * uPulse8 * .8);
    }
  }
  fragColor = vec4((col * alpha + glow) * uW, alpha * uW);
}
