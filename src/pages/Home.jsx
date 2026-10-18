import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import YourRooms from '@/components/home/YourRooms';

export default function Home() {
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    const ev = await base44.entities.Event.create({ name: 'New room', photo_url: file_uri, status: 'draft', width_ft: 20, depth_ft: 16, ceiling_ft: 10 });
    navigate(`/studio?event=${ev.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="py-section max-w-3xl">
        <p className="text-sm uppercase tracking-[0.2em] text-primary mb-6">Room to ready</p>
        <h1 className="text-5xl md:text-7xl font-normal leading-[1.05]">Turn a photo into your event plan.</h1>
        <Button size="lg" className="rounded-full px-7 mt-10" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Plan a new room
        </Button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </motion.section>
      <YourRooms />
    </div>
  );
}