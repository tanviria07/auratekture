import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function ImageQuality() {
  const qc = useQueryClient();
  const { data: setting } = useQuery({
    queryKey: ['image-quality'],
    queryFn: () => base44.entities.AppSetting.filter({ key: 'image_quality' }, { limit: 1 }).then((r) => r.items[0] || null),
  });
  const value = setting?.value || 'fast';
  const pick = async (v) => {
    if (setting) await base44.entities.AppSetting.update(setting.id, { value: v });
    else await base44.entities.AppSetting.create({ key: 'image_quality', value: v });
    qc.invalidateQueries({ queryKey: ['image-quality'] });
  };
  return (
    <section className="rounded-2xl border bg-card p-8 space-y-4">
      <h2 className="text-xl">Image quality</h2>
      <div className="flex gap-2">
        <Button className="rounded-full" variant={value === 'fast' ? 'default' : 'outline'} onClick={() => pick('fast')}>Fast (1K)</Button>
        <Button className="rounded-full" variant={value === 'hd' ? 'default' : 'outline'} onClick={() => pick('hd')}>HD (2K)</Button>
      </div>
    </section>
  );
}