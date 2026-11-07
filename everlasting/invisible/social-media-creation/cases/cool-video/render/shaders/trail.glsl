#version 300 es
precision highp float;
// 拖尾：上一帧缩放、旋转、衰减后与当前帧取较亮者
uniform sampler2D uCur, uPrev;
uniform vec2 uRes;
uniform float uAmt, uZoom, uRot;
out vec4 fragColor;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 cur = texture(uCur, uv).rgb;
  vec2 p = (uv - .5) * vec2(uRes.x / uRes.y, 1.);
  float c = cos(uRot), s = sin(uRot);
  p = mat2(c, s, -s, c) * p / uZoom;
  vec2 q = p / vec2(uRes.x / uRes.y, 1.) + .5;
  vec3 prev = texture(uPrev, q).rgb * uAmt;
  fragColor = vec4(max(cur, prev), 1.);
}
