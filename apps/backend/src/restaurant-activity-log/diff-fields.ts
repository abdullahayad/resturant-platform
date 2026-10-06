export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

// Shared by every "update" call site that logs to RestaurantActivityLog -
// compares a before/after snapshot field-by-field under a human label and
// only returns the ones that actually changed, so e.g. re-saving a profile
// with nothing different produces zero log entries instead of a no-op one.
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  labels: Partial<Record<keyof T, string>>,
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of Object.keys(labels) as (keyof T)[]) {
    if (before[key] !== after[key]) {
      changes.push({ field: labels[key]!, from: before[key], to: after[key] });
    }
  }
  return changes;
}

export function summarizeChanges(changes: FieldChange[]): string {
  return changes.map((c) => `${c.field}: ${formatValue(c.from)} → ${formatValue(c.to)}`).join('; ');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
