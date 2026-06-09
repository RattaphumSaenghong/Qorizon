/** Timestamp column → ISO 8601 string (or null). */
export function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

/** Date-only column → 'YYYY-MM-DD' (or null). */
export function dateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}
