// A user can belong to multiple companies. Stored as a JSON array string in the
// (legacy-named) `company` DB column — see User.companies @map("company").
export const COMPANIES = ['PEI', 'PM', 'PKS']

// Tolerant read: JSON array → array; legacy single value ("PM") → ["PM"]; null → [].
export function parseCompanies(raw) {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.filter(c => COMPANIES.includes(c)) : (COMPANIES.includes(raw) ? [raw] : [])
  } catch {
    return COMPANIES.includes(raw) ? [raw] : []
  }
}

// Store deduped array as JSON, or null when empty.
export function serializeCompanies(arr) {
  const clean = [...new Set((arr || []).filter(c => COMPANIES.includes(c)))]
  return clean.length ? JSON.stringify(clean) : null
}
