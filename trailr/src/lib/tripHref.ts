/** Returns the canonical in-app route for a trip based on its stage. */
export function tripHref(trip: { id: string; stage?: string | null }): string {
  if (trip.stage === 'album') return `/album/${trip.id}`;
  if (trip.stage === 'living') return `/journal/${trip.id}`;
  return `/builder/${trip.id}`;
}
