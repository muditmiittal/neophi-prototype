/** Shared source text is not a user's note. Keep it in source metadata. */
export function sharedUrl(params: URLSearchParams): string {
  for (const value of [params.get('url'), params.get('text'), params.get('title')]) {
    const candidate = value?.match(/https?:\/\/[^\s<>"\u0964]+/i)?.[0]?.replace(/[.,!?;:)'\]}]+$/, '');
    if (candidate) {
      try { const url = new URL(candidate); if (url.hostname) return candidate; } catch { /* try next field */ }
    }
  }
  return '';
}
