import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function BoxPanel({ box, onClose }) {
  return (
    <AnimatePresence>
      {box && (
        <motion.aside initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
          className="absolute top-4 right-4 bottom-4 w-64 rounded-2xl bg-card border shadow-xl p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Item</p>
          <h3 className="text-2xl mt-2">{box.label}</h3>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}