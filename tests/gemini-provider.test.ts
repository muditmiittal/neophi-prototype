import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGeminiProvider } from '../src/ai/provider/gemini';
import type { AnalyseInput } from '../src/ai/types';

afterEach(() => vi.unstubAllGlobals());

describe('Gemini evidence for Instagram shares', () => {
  it.each([true, false])('uses the reported attachment state (%s) and preserves the note', async (withMedia) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      withMedia,
      raw: {
        observed_objects: [{ label: 'Dosa', evidence: 'frame-1' }],
        evidence: [{ id: 'frame-1', kind: 'frame', ref: 'frame at 1s' }],
      },
    })));
    const input: AnalyseInput = {
      dmMid: 'reel-message',
      caption: 'Dosa recipe',
      note: 'Maa ke liye  🥞',
      noteLanguage: 'hinglish',
      sourceState: 'available',
      mediaKind: 'video',
    };

    const result = await createGeminiProvider().analyse(input);

    expect(result.source_access_state).toBe(withMedia ? 'available' : 'unsupported');
    expect(result.observed_objects).toHaveLength(withMedia ? 1 : 0);
    expect(result.explicit_user_intent).toBe(input.note);
  });
});
