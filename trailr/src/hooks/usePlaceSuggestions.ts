import { useEffect, useRef, useState } from 'react';
import { suggestPlaces, retrievePlace, newSessionToken, type PlaceSuggestion } from '../lib/places';

/**
 * Mapbox place autocomplete for search. Client-side (no API), so it lives here
 * rather than in @trailr/db. Caller passes an already-debounced query.
 */
export function usePlaceSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const session = useRef(newSessionToken());

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    suggestPlaces(q, session.current).then((res) => {
      if (!cancelled) {
        setSuggestions(res);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  /** Resolve a picked suggestion to coords, then start a fresh billing session. */
  const resolve = async (s: PlaceSuggestion) => {
    const coord = await retrievePlace(s.mapbox_id, session.current);
    session.current = newSessionToken();
    return coord;
  };

  return { suggestions, loading, resolve };
}
