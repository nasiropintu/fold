import { useEffect, useState } from 'react';
import { createPagePreviews, PagePreview } from '../lib/pdf';

export function usePdfPreview(file: File | null, enabled = true) {
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!file || !enabled) {
      setPages([]);
      setError('');
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setPages([]);
    setError('');
    createPagePreviews(file)
      .then((result) => { if (active) setPages(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not preview this PDF.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [file, enabled]);

  return { pages, loading, error };
}
