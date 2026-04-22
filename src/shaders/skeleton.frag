#include "./common/noise.glsl"

varying vec2 vUv;

uniform float u_time;
uniform float u_breath;
uniform float u_escalation;
uniform vec3  u_color_a;
uniform vec3  u_color_b;
uniform vec3  u_accent;
uniform float u_noise_scale;
uniform float u_noise_amp;
uniform float u_distortion;
uniform float u_palette_shift;
uniform float u_grain;
uniform vec2  u_resolution;

void main() {
  vec2 p = vUv - 0.5;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);

  float breath = 0.5 + 0.5 * sin(u_breath * 6.2831853);
  float n = snoise3(vec3(p * u_noise_scale, u_time * 0.15));
  float field = n * u_noise_amp;

  vec2 warp = vec2(
    snoise2(p * u_noise_scale * 1.3 + u_time * 0.08),
    snoise2(p * u_noise_scale * 1.1 - u_time * 0.07)
  ) * u_distortion;

  float radial = length(p + warp) * (1.0 + 0.15 * u_escalation);
  float mask = smoothstep(0.9, 0.1, radial);

  float mix_t = clamp(0.5 + 0.5 * field + u_palette_shift, 0.0, 1.0);
  vec3 base = mix(u_color_a, u_color_b, mix_t);
  vec3 col = mix(base, u_accent, mask * (0.25 + 0.55 * breath));

  float grain = (snoise2(p * 420.0 + u_time * 10.0) * 0.5 + 0.5) * u_grain;
  col += vec3(grain) * 0.08;

  col = mix(col, col * col, u_escalation * 0.3);

  gl_FragColor = vec4(col, 1.0);
}
