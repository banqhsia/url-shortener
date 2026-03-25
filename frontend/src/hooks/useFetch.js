import { useState, useEffect, useCallback } from 'react';
import client from '../api/client.js';

/**
 * Fetches a URL and returns { data, error, loading, refetch }.
 * Re-fetches whenever url or params content changes.
 * Optionally polls on an interval (ms).
 */
export function useFetch(url, { params, interval, errorMessage } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Stringify params so useCallback only re-runs when content changes, not reference
  const paramsKey = JSON.stringify(params);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    try {
      const { data: result } = await client.get(url, params ? { params } : undefined);
      setData(result);
      setError('');
    } catch {
      setError(errorMessage || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [url, paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    if (interval) {
      const timer = setInterval(load, interval);
      return () => clearInterval(timer);
    }
  }, [load, interval]);

  return { data, error, loading, refetch: load };
}
