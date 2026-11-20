// Runs in the browser on an uploaded file: makes a small key frame and measures its colours.
// This is real measurement, not AI. The original file is never stored.

import type { BBox, LocalImageFacts } from '../ai/types';

const GRID_X = 4;
const GRID_Y = 5;

function colourName(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 510;
  const d = max - min;
  const s = d === 0 ? 0 : d / (255 - Math.abs(max + min - 255));
  if (l < 0.13) return 'black';
  if (s < 0.14) return l > 0.82 ? 'white' : 'grey';
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 14 || h >= 345) return l > 0.72 ? 'pink' : 'red';
  if (h < 40) return l < 0.42 ? 'brown' : 'orange';
  if (h < 68) return l < 0.35 ? 'brown' : 'yellow';
  if (h < 160) return 'green';
  if (h < 200) return 'teal';
  if (h < 255) return 'blue';
  if (h < 300) return 'purple';
  return 'pink';
}

export function measure(data: Uint8ClampedArray, w: number, h: number): LocalImageFacts['colours'] {
  const total = w * h;
  const counts = new Map<string, { n: number; cells: number[] }>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const name = colourName(data[i], data[i + 1], data[i + 2]);
      let c = counts.get(name);
      if (!c) counts.set(name, (c = { n: 0, cells: new Array(GRID_X * GRID_Y).fill(0) }));
      c.n++;
      c.cells[Math.min(GRID_Y - 1, Math.floor((y / h) * GRID_Y)) * GRID_X + Math.min(GRID_X - 1, Math.floor((x / w) * GRID_X))]++;
    }
  }
  const cellSize = total / (GRID_X * GRID_Y);
  return [...counts.entries()]
    .map(([name, c]) => {
      // The region is the box around the cells where this colour is densest.
      const peak = Math.max(...c.cells);
      const strong = c.cells.map((n, idx) => ({ n, idx })).filter((x) => x.n >= Math.max(peak * 0.6, cellSize * 0.12));
      const xs = strong.map((x) => x.idx % GRID_X);
      const ys = strong.map((x) => Math.floor(x.idx / GRID_X));
      const bbox: BBox = {
        x: (Math.min(...xs) / GRID_X) * 100,
        y: (Math.min(...ys) / GRID_Y) * 100,
        w: ((Math.max(...xs) - Math.min(...xs) + 1) / GRID_X) * 100,
        h: ((Math.max(...ys) - Math.min(...ys) + 1) / GRID_Y) * 100,
      };
      return { name, share: c.n / total, bbox };
    })
    .filter((c) => c.share >= 0.04)
    .sort((a, b) => b.share - a.share);
}

export interface PreparedUpload {
  thumb: string;
  mediaKind: 'image' | 'video';
  durationSec?: number;
  local: LocalImageFacts;
  fileName: string;
}

function draw(source: CanvasImageSource, sw: number, sh: number): { thumb: string; local: LocalImageFacts } {
  const scale = Math.min(1, 480 / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('This browser cannot read the picture.');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const small = document.createElement('canvas');
  small.width = 48;
  small.height = 60;
  const sctx = small.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(canvas, 0, 0, 48, 60);
  const colours = measure(sctx.getImageData(0, 0, 48, 60).data, 48, 60);
  return { thumb: canvas.toDataURL('image/jpeg', 0.72), local: { width: sw, height: sh, colours } };
}

export const MAX_UPLOAD_MB = 80;

export async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`That file is larger than ${MAX_UPLOAD_MB} MB. Try a shorter clip or a screenshot.`);
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.src = url;
      await img.decode().catch(() => {
        throw new Error('That image could not be opened. Try a JPG or PNG.');
      });
      return { ...draw(img, img.naturalWidth, img.naturalHeight), mediaKind: 'image', fileName: file.name };
    }
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = url;
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('That video could not be opened in this browser. Try an MP4, or upload a screenshot.'));
        setTimeout(() => reject(new Error('The video took too long to open. Try a shorter clip or a screenshot.')), 15_000);
      });
      const at = Math.min(Math.max(0.1, video.duration * 0.3), 5);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = at;
        setTimeout(resolve, 3000);
      });
      return { ...draw(video, video.videoWidth, video.videoHeight), mediaKind: 'video', durationSec: Number.isFinite(video.duration) ? video.duration : undefined, fileName: file.name };
    }
    throw new Error('Only images and videos can be uploaded.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
