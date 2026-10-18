import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useAuraState } from '@/lib/auraStore';

export default function PhotoUpload({ hasPhoto, onUploaded }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const { photoGlow } = useAuraState();
  const glow = photoGlow && !busy;
  const pick = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    await onUploaded(file_uri);
    setBusy(false); e.target.value = '';
  };
  return (
    <div className="space-y-3">
      {glow && <p className="text-2xl font-heading text-primary">Tap here to upload a photo of your room</p>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
      <Button variant={glow ? 'default' : 'outline'} size={glow ? 'lg' : 'sm'} className={`rounded-full ${glow ? 'ring-4 ring-primary/40 shadow-[0_0_28px_hsl(var(--primary))] animate-pulse' : ''}`} disabled={busy} onClick={() => input.current.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}{hasPhoto ? 'Change photo' : 'Upload photo'}
      </Button>
    </div>
  );
}