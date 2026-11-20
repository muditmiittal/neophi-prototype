// Card shaders. A card is a unit square scaled to its size in pixels. It is born as a soft,
// paper-coloured disc and settles into a sharp, round-cornered picture with a hairline frame.

export const cardVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const cardFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec4 uCrop;     // xy: scale, zw: offset, so the picture covers the card
  uniform vec2 uSize;     // card size on screen, in pixels
  uniform float uSoften;  // softness, as a share of the card height
  uniform float uWash;    // 0 shows the picture, 1 shows plain paper
  uniform float uAlpha;
  uniform float uRound;   // corner radius on screen, in pixels
  uniform float uFrame;   // hairline strength
  uniform vec3 uPaper;
  uniform vec3 uLine;
  varying vec2 vUv;

  const int TAPS = 8;
  const float GOLDEN_ANGLE = 2.39996;

  vec3 picture(vec2 uv) {
    return texture2D(uMap, uCrop.zw + clamp(uv, 0.0, 1.0) * uCrop.xy).rgb;
  }

  // Samples on a sunflower pattern, so the softness has no visible direction.
  vec3 softened(vec2 uv) {
    vec2 reach = vec2(uSize.y / uSize.x, 1.0) * uSoften;
    vec3 sum = picture(uv);
    for (int i = 1; i <= TAPS; i++) {
      float n = float(i);
      float turn = n * GOLDEN_ANGLE;
      sum += picture(uv + vec2(cos(turn), sin(turn)) * sqrt(n / float(TAPS)) * reach);
    }
    return sum / float(TAPS + 1);
  }

  // Distance to the edge of a rounded rectangle: negative inside.
  float edge(vec2 point, vec2 extent, float radius) {
    vec2 corner = abs(point) - extent + radius;
    return length(max(corner, 0.0)) + min(max(corner.x, corner.y), 0.0) - radius;
  }

  void main() {
    vec3 colour = uSoften > 0.001 ? softened(vUv) : picture(vUv);
    colour = mix(colour, uPaper, uWash);

    vec2 extent = uSize * 0.5;
    float radius = min(uRound, min(extent.x, extent.y));
    float toEdge = edge((vUv - 0.5) * uSize, extent, radius);
    float inside = 1.0 - smoothstep(-1.0, 0.0, toEdge);
    float hairline = (1.0 - smoothstep(0.0, 1.5, abs(toEdge + 1.0))) * uFrame;

    gl_FragColor = vec4(mix(colour, uLine, hairline), inside * uAlpha);
  }
`;
