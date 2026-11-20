import type { AIProvider } from '../types';
import { createGeminiProvider } from './gemini';
import { createMockProvider } from './mock';

export { checkGeminiServer, GEMINI_SERVER } from './gemini';
export type { ServerHealth } from './gemini';

const mock = createMockProvider();
const gemini = createGeminiProvider();

/** One interface, two providers. Mock unless the user switched Gemini on and the local server is running. */
export function getProvider(name: 'mock' | 'gemini'): AIProvider {
  return name === 'gemini' ? gemini : mock;
}
