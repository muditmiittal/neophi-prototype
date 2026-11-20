// Talks to the optional local server (server/index.mjs). The API key never reaches the browser:
// the server reads GEMINI_API_KEY from its own environment.

import { guardAnalysis } from '../guard';
import type { AIProvider, AnalyseInput, MemoryAnalysis, RawAnalysis } from '../types';

/** The Vite dev server (5173) and the static preview (4173) talk to the server on 8787. When the Neophi server itself serves the site (port 8787 or a deployed URL) the API is on the same origin. */
const DEV_PORTS = ['5173', '4173'];
export const GEMINI_SERVER = typeof location === 'undefined' || DEV_PORTS.includes(location.port) ? 'http://localhost:8787' : '';

export interface ServerHealth {
  ok: boolean;
  gemini: boolean;
  analysisModel?: string;
  embeddingModel?: string;
}

export async function checkGeminiServer(timeoutMs = 1200): Promise<ServerHealth> {
  try {
    const res = await fetch(`${GEMINI_SERVER}/api/health`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { ok: false, gemini: false };
    return (await res.json()) as ServerHealth;
  } catch {
    return { ok: false, gemini: false };
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${GEMINI_SERVER}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`The Gemini server answered ${res.status}.`);
  return (await res.json()) as T;
}

export function createGeminiProvider(): AIProvider {
  return {
    name: 'gemini',
    async analyse(input: AnalyseInput): Promise<MemoryAnalysis> {
      const { raw, withMedia } = await post<{ raw: RawAnalysis; withMedia: boolean }>('/api/analyse', { input });
      // Same guard as the mock: the model's text never becomes the user's words.
      const evidenceInput = input.dmMid && input.sourceState === 'available' && !withMedia
        ? { ...input, sourceState: 'unsupported' as const }
        : input;
      return guardAnalysis(raw, evidenceInput, 'gemini');
    },
    async embed(text: string): Promise<number[]> {
      const { vector } = await post<{ vector: number[] }>('/api/embed', { text });
      return vector;
    },
  };
}
