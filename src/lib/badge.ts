// Single source of truth for suppressing non-informative enum/select badge
// values across profile pages, talent cards, and JSON-LD. A field renders only
// when its value is present AND not a catch-all sentinel that tells a viewer
// nothing. Values are matched case-sensitively against their exact stored form
// (per the badge audit at HEAD 79da0b3). 'custom' (agent provider) is KEPT — a
// deliberate selection, not a catch-all.
const NON_INFORMATIVE = new Set(['Other', 'Both', 'Open to all', 'Prefer not to say', 'open', 'other'])

// Returns the value to display, or null if it's empty or a non-informative sentinel.
export function informative(value: string | null | undefined): string | null {
  if (!value) return null
  return NON_INFORMATIVE.has(value.trim()) ? null : value
}
