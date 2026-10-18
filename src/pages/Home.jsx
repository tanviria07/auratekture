import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { SAVED_ROOMS } from '@/lib/savedRooms';

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
        <div className="flex flex-wrap gap-3 mt-10">
          <Button size="lg" className="rounded-full px-7" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Plan a new room
          </Button>
          <Button size="lg" variant="outline" className="rounded-full px-7" onClick={() => document.getElementById('saved')?.scrollIntoView({ behavior: 'smooth' })}>
            Try a saved room
          </Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>
      </motion.section>
      <section id="saved" className="pb-section grid md:grid-cols-2 gap-6">
        {SAVED_ROOMS.map((r) => (
          <Link key={r.key} to={`/studio?room=${r.key}`} className="group rounded-2xl border bg-card p-8 hover:border-primary/40 hover:shadow-lg transition-all">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{r.room_purpose}</p>
            <h3 className="text-2xl mt-3">{r.name}</h3>
            <p className="text-muted-foreground mt-1">{r.venue_name}</p>
            <span className="inline-flex items-center gap-2 mt-8 text-primary text-sm">Open in Studio <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
          </Link>
        ))}
      </section>
    </div>
  );
}