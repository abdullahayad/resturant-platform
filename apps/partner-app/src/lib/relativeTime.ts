// Small dependency-free "2h ago" / "3d ago" style formatter. Returns a key +
// count for the caller to run through i18next (so pluralization/Arabic
// forms come from the normal translation files, not hardcoded here) rather
// than a finished string - once something's a week or older, "N weeks ago"
// stops being more useful than just showing the actual date, so that's the
// fallback instead of continuing to count up.
export type RelativeTimeParts =
  | { key: 'justNow' }
  | { key: 'minutes' | 'hours' | 'days'; count: number }
  | { key: 'date'; value: string };

export function relativeTimeParts(iso: string): RelativeTimeParts {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));

  if (diffSec < 60) return { key: 'justNow' };
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return { key: 'minutes', count: diffMin };
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return { key: 'hours', count: diffHr };
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return { key: 'days', count: diffDay };
  return { key: 'date', value: new Date(iso).toLocaleDateString() };
}
