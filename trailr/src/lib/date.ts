/** Format a Date as a local `YYYY-MM-DD` string. */
export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today as a local `YYYY-MM-DD` string. */
export function todayYMD(): string {
  return toYMD(new Date());
}
