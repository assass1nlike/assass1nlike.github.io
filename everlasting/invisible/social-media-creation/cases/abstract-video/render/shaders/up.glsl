#version 300 es
precision highp float;
// 辉光上采样（3x3 帐篷滤波），以加法混合叠到上一级
uniform sampler2D uSrc;
uniform vec2 uTexel, uDst;
out vec4 fragColor;
void main(){
  vec2 uv = gl_FragCoord.xy / uDst;
  vec2 d = uTexel;
  vec3 c = texture(uSrc, uv).rgb * 4.;
  c += (texture(uSrc, uv + vec2(d.x, 0)).rgb + texture(uSrc, uv - vec2(d.x, 0)).rgb + texture(uSrc, uv + vec2(0, d.y)).rgb + texture(uSrc, uv - vec2(0, d.y)).rgb) * 2.;
  c += texture(uSrc, uv + d).rgb + texture(uSrc, uv - d).rgb + texture(uSrc, uv + vec2(d.x, -d.y)).rgb + texture(uSrc, uv + vec2(-d.x, d.y)).rgb;
  fragColor = vec4(c / 16., 1.);
}
