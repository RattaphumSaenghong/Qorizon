const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

/** A Search Box autocomplete suggestion (names only — coordinates fetched via retrieve). */
export interface PlaceSuggestion {
  mapbox_id: string;
  name: string;
  place_formatted?: string;
  feature_type?: string;
}

/** RFC4122-ish v4 token to group a suggest→retrieve search into one billed session. */
export function newSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Search Box "suggest" — autocomplete results. `proximity` biases toward a location. */
export async function suggestPlaces(
  query: string,
  sessionToken: string,
  proximity?: [number, number],
): Promise<PlaceSuggestion[]> {
  if (!query.trim() || !MAPBOX_TOKEN) return [];
  const params = new URLSearchParams({
    q: query,
    access_token: MAPBOX_TOKEN,
    session_token: sessionToken,
    language: 'th',
    limit: '6',
    types: 'poi,place,locality,neighborhood,address,street',
  });
  if (proximity) params.set('proximity', `${proximity[0]},${proximity[1]}`);
  try {
    const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?${params.toString()}`);
    const json = await res.json();
    return (json.suggestions ?? []) as PlaceSuggestion[];
  } catch {
    return [];
  }
}

/** Search Box "retrieve" — resolves a picked suggestion to its coordinates. */
export async function retrievePlace(
  mapboxId: string,
  sessionToken: string,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!MAPBOX_TOKEN) return null;
  const params = new URLSearchParams({ access_token: MAPBOX_TOKEN, session_token: sessionToken });
  try {
    const res = await fetch(
      `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(mapboxId)}?${params.toString()}`,
    );
    const json = await res.json();
    const coords = json.features?.[0]?.geometry?.coordinates;
    if (!coords) return null;
    return { longitude: coords[0], latitude: coords[1] };
  } catch {
    return null;
  }
}
