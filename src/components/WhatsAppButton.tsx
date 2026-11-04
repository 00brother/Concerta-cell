import React from 'react';
import { MessageCircle } from 'lucide-react';
import type { StoreSettings } from '../types/index.ts';

interface WhatsAppButtonProps {
  settings: StoreSettings | null;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ settings }) => {
  const whatsappUrl = settings?.whatsappUrl || 'https://wa.me/5543998370350';

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Atendimento via WhatsApp Conserta Cell"
      className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-xl shadow-emerald-950/50 transition-all duration-200"
    >
      <MessageCircle className="w-6 h-6 fill-white text-[#25D366]" />
      <span className="hidden sm:inline font-bold text-xs tracking-wide">
        WhatsApp Conserta Cell
      </span>
    </a>
  );
};
