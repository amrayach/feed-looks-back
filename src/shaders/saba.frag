#include "./common/noise.glsl"

varying vec2 vUv;
varying float vBreath;

uniform float u_time;
uniform float u_escalation;
uniform vec3  u_color_a;
uniform vec3  u_color_b;
uniform vec3  u_accent;
uniform float u_noise_scale;
uniform float u_noise_amp;
uniform float u_grain;
uniform vec2  u_resolution;

// Saba — sage + lavender wellness palette, slow diaphragmatic breath.
// Per brief section 04: contemplative, soft-edged, trust-signal-adjacent.
// Distinct from skeleton: vertical haze gradient + layered low-freq noise,
// no hard distortion vortex. Deliberately calmer than any skeleton variant.

void main() {
  vec2 p = vUv - 0.5;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);

  float low  = snoise2(p * u_noise_scale + vec2(0.0, u_time * 0.04));
  float mid  = snoise2(p * u_noise_scale * 2.1 - vec2(u_time * 0.03, 0.0));
  float haze = 0.55 + 0.25 * low + 0.15 * mid;

  float verticalGrad = smoothstep(-0.6, 0.7, -p.y + low * 0.25);
  vec3  palette = mix(u_color_a, u_color_b, clamp(verticalGrad + u_noise_amp * 0.15, 0.0, 1.0));

  float halo = exp(-6.0 * dot(p, p)) * (0.45 + 0.4 * vBreath);
  vec3  col  = mix(palette, u_accent, halo * 0.5);

  col *= 0.85 + 0.15 * haze;

  float grain = (snoise2(p * 320.0 + u_time * 6.0) * 0.5 + 0.5) * u_grain;
  col += vec3(grain) * 0.04;

  col = mix(col, col * vec3(0.95, 1.0, 1.02), u_escalation * 0.2);

  gl_FragColor = vec4(col, 1.0);
}
