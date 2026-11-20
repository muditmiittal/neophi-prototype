import {
  DataTexture,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  type Texture,
} from "three";
import type { Card } from "./cards";
import type { Plan } from "./layout";
import type { Face } from "./media";
import type { SpiralSettings } from "./settings";
import { cardFragment, cardVertex } from "./shaders";

// The only file that draws with three.js: one camera, and one textured square per card. The
// camera sits so that one unit is one pixel on the plane of the screen.

type Look = SpiralSettings["look"];
type Sprite = Mesh<PlaneGeometry, ShaderMaterial>;

const MAX_PIXEL_RATIO = 2;
const HELD_ORDER = 1e6;
const ORDER_BASE = 1e5;

/** "#rrggbb" as three 0..1 numbers, left in the colour space the page is written in. */
function rgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return new Vector3(
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  );
}

function paperTexture(colour: Vector3) {
  const pixel = new Uint8Array([
    colour.x * 255,
    colour.y * 255,
    colour.z * 255,
    255,
  ]);
  const texture = new DataTexture(pixel, 1, 1);
  texture.needsUpdate = true;
  return texture;
}

function createRenderer() {
  try {
    return new WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null; // no WebGL here: the caller keeps the plain page
  }
}

/** Scale and offset that make a picture of `pictureAspect` cover a card of `cardAspect`. */
function cover(crop: Vector4, cardAspect: number, pictureAspect: number) {
  if (cardAspect > pictureAspect) {
    const share = pictureAspect / cardAspect;
    return crop.set(1, share, 0, (1 - share) / 2);
  }
  const share = cardAspect / pictureAspect;
  return crop.set(share, 1, (1 - share) / 2, 0);
}

export class Stage {
  readonly canvas: HTMLCanvasElement;
  readonly pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 1, 1, 20000);
  private readonly square = new PlaneGeometry(1, 1);
  private readonly paper: Vector3;
  private readonly line: Vector3;
  private readonly blank: Texture;
  private sprites: Sprite[] = [];

  private constructor(
    private readonly renderer: WebGLRenderer,
    private readonly look: Look,
  ) {
    this.paper = rgb(look.paper);
    this.line = rgb(look.line);
    this.blank = paperTexture(this.paper);
    this.canvas = renderer.domElement;
    renderer.setPixelRatio(this.pixelRatio);
    renderer.setClearColor(0x000000, 0);
  }

  /** A stage, or null where the browser cannot give a WebGL context. */
  static create(look: Look) {
    const renderer = createRenderer();
    return renderer ? new Stage(renderer, look) : null;
  }

  resize(plan: Plan, fovDeg: number) {
    this.renderer.setSize(plan.width, plan.height);
    this.camera.fov = fovDeg;
    this.camera.aspect = plan.width / plan.height;
    this.camera.position.set(0, 0, plan.camera);
    this.camera.updateProjectionMatrix();
  }

  private addSprite() {
    const material = new ShaderMaterial({
      vertexShader: cardVertex,
      fragmentShader: cardFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uMap: { value: this.blank },
        uCrop: { value: new Vector4(1, 1, 0, 0) },
        uSize: { value: new Vector2(1, 1) },
        uSoften: { value: 0 },
        uWash: { value: 1 },
        uAlpha: { value: 0 },
        uRound: { value: 0 },
        uFrame: { value: this.look.frame },
        uPaper: { value: this.paper },
        uLine: { value: this.line },
      },
    });
    const sprite: Sprite = new Mesh(this.square, material);
    sprite.frustumCulled = false;
    sprite.visible = false;
    this.scene.add(sprite);
    this.sprites.push(sprite);
  }

  private dropSprite() {
    const sprite = this.sprites.pop();
    if (!sprite) return;
    this.scene.remove(sprite);
    sprite.material.dispose();
  }

  /** Makes exactly `count` squares available. */
  setCount(count: number) {
    while (this.sprites.length < count) this.addSprite();
    while (this.sprites.length > count) this.dropSprite();
  }

  hide(index: number) {
    const sprite = this.sprites[index];
    if (sprite) sprite.visible = false;
  }

  /** Draws card `index` as posed; without a loaded face it is a plain paper card. */
  show(index: number, card: Card, face: Face | null) {
    const sprite = this.sprites[index];
    if (!sprite) return;
    const uniforms = sprite.material.uniforms;
    sprite.visible = true;
    sprite.position.set(card.x, card.y, card.z);
    sprite.scale.set(card.w, card.h, 1);
    sprite.renderOrder = card.held
      ? HELD_ORDER
      : Math.round(ORDER_BASE + card.z);
    uniforms["uMap"]!.value = face ? face.texture : this.blank;
    cover(uniforms["uCrop"]!.value, card.w / card.h, face ? face.aspect : 1);
    uniforms["uSize"]!.value.set(card.w * card.scale, card.h * card.scale);
    uniforms["uSoften"]!.value = card.soften;
    uniforms["uWash"]!.value = face ? card.wash : 1;
    uniforms["uAlpha"]!.value = card.alpha;
    uniforms["uRound"]!.value = card.round;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.setCount(0);
    this.square.dispose();
    this.blank.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
