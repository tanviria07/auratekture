import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Turns a stored file reference into a displayable URL.
export function useSignedUrl(uri) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (!uri) return setSrc('');
    if (uri.startsWith('http')) return setSrc(uri);
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 }).then((r) => setSrc(r.signed_url));
  }, [uri]);
  return src;
}