import { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function RoomPhoto({ uri }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (!uri) return setSrc('');
    if (uri.startsWith('http')) return setSrc(uri);
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 }).then((r) => setSrc(r.signed_url));
  }, [uri]);

  if (!src) {
    return (
      <div className="aspect-[4/3] rounded-2xl bg-muted flex flex-col items-center justify-center text-muted-foreground gap-2">
        <ImageIcon className="w-8 h-8" /><span className="text-sm">Saved room — no photo yet</span>
      </div>
    );
  }
  return <img src={src} alt="Room" className="aspect-[4/3] w-full object-cover rounded-2xl" />;
}