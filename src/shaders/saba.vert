varying vec2 vUv;
varying float vBreath;

uniform float u_breath;

void main() {
  vUv = uv;
  vBreath = 0.5 + 0.5 * sin(u_breath * 6.2831853);
  vec3 p = position;
  p.xy *= 1.0 + vBreath * 0.003;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
