import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function PhotoUpload({ hasPhoto, onUploaded }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    await onUploaded(file_uri);
    setBusy(false); e.target.value = '';
  };
  return (
    <>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
      <Button variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => input.current.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}{hasPhoto ? 'Change photo' : 'Upload photo'}
      </Button>
    </>
  );
}