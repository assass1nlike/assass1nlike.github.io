#version 300 es
precision highp float;
// 主体盖到场景上：主体是预乘颜色 + 覆盖度
uniform sampler2D uScene, uSubj;
uniform vec2 uRes;
out vec4 fragColor;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 s = texture(uSubj, uv);
  fragColor = vec4(texture(uScene, uv).rgb * (1. - clamp(s.a, 0., 1.)) + s.rgb, 1.);
}
