import { Texture, VideoTexture } from "three";

// Turns cards into textures, lazily: nothing is fetched until a card first appears on the
// spiral. A video shows its poster until it has a frame, and plays only while the engine asks.

export type SpiralCard = {
  id: string;
  label: string;
  kind: "image" | "video";
  /** Same-origin URL (or a data: URL) of the picture or the video. */
  src: string;
  /** Which section of the page the card belongs to; the spiral favours the section in view. */
  section?: string;
  /** Still shown for a video before it plays. */
  poster?: string;
};

export type Face = { texture: Texture; aspect: number };

export type MediaItem = {
  card: SpiralCard;
  begun: boolean;
  still: Face | null;
  moving: Face | null;
  video: HTMLVideoElement | null;
};

const FALLBACK_ASPECT = 4 / 3;

export const createMedia = (cards: readonly SpiralCard[]): MediaItem[] =>
  cards.map((card) => ({
    card,
    begun: false,
    still: null,
    moving: null,
    video: null,
  }));

function loadStill(item: MediaItem, src: string) {
  const image = new Image();
  image.decoding = "async";
  image.addEventListener(
    "load",
    () => {
      const texture = new Texture(image);
      texture.needsUpdate = true;
      const aspect = image.naturalWidth / image.naturalHeight;
      item.still = { texture, aspect: aspect || FALLBACK_ASPECT };
    },
    { once: true },
  );
  image.src = src;
}

function prepareVideo(item: MediaItem) {
  const video = document.createElement("video");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  video.setAttribute("muted", "");
  video.addEventListener(
    "loadeddata",
    () => {
      const aspect = video.videoWidth / video.videoHeight;
      item.moving = {
        texture: new VideoTexture(video),
        aspect: aspect || FALLBACK_ASPECT,
      };
    },
    { once: true },
  );
  video.src = item.card.src;
  item.video = video;
}

/** Starts loading an item the first time a card shows it. */
export function beginMedia(item: MediaItem) {
  if (item.begun) return;
  item.begun = true;
  if (item.card.kind === "image") return loadStill(item, item.card.src);
  if (item.card.poster) loadStill(item, item.card.poster);
  prepareVideo(item);
}

/** What a card shows right now: the playing video, else the still, else nothing yet. */
export function faceOf(item: MediaItem): Face | null {
  const playing = item.video ? !item.video.paused : false;
  return playing && item.moving ? item.moving : item.still;
}

function setPlaying(video: HTMLVideoElement, wanted: boolean) {
  if (wanted === !video.paused) return;
  if (wanted) video.play().catch(() => undefined);
  else video.pause();
}

/** Plays the videos in `wanted`, pauses every other one. */
export function syncVideos(
  items: readonly MediaItem[],
  wanted: ReadonlySet<MediaItem>,
) {
  for (const item of items)
    if (item.video) setPlaying(item.video, wanted.has(item));
}

export function disposeMedia(items: readonly MediaItem[]) {
  for (const item of items) {
    item.still?.texture.dispose();
    item.moving?.texture.dispose();
    if (!item.video) continue;
    item.video.pause();
    item.video.removeAttribute("src");
    item.video.load();
  }
}
