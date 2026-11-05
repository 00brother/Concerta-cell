import React from 'react';
import { MapPin, Phone, Clock, MessageCircle, ShieldCheck, Lock, Package } from 'lucide-react';
import type { StoreSettings } from '../types/index.ts';

interface FooterProps {
  settings: StoreSettings | null;
  onOpenAdmin: () => void;
  onOpenTracking: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onOpenAdmin,
  onOpenTracking,
  onNavigateSection,
}) => {
  const whatsapp = settings?.whatsapp || '(43) 99837-0350';
  const whatsappUrl = settings?.whatsappUrl || 'https://wa.me/5543998370350';
  const city = settings?.city || 'Arapongas — Paraná';

  return (
    <footer id="contato" className="bg-[#050505] border-t border-[#222222] text-neutral-300">
      {/* Upper Footer: Logo & Key Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand info - 4 cols */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-black/50 inline-block p-2 rounded-xl border border-red-950/60">
              <img
                src="./logo.png"
                alt="Conserta Cell"
                className="h-14 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Assistência técnica especializada e comércio de acessórios de alta qualidade para celulares em Arapongas/PR e envio seguro para todo o Brasil.
            </p>
          </div>

          {/* Contact & Hours - 3 cols */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-500">
              Atendimento & Contato
            </h4>
            <div className="space-y-2 text-xs">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{city}</span>
              </p>
              <p className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Telefone: {whatsapp}</span>
              </p>
              <p className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>
                  Seg à Sex: 08h30 às 19h<br />
                  Sábado: 08h30 às 17h<br />
                  Domingo: fechado
                </span>
              </p>
            </div>
          </div>

          {/* Fast Navigation - 2 cols */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-500">
              Navegação
            </h4>
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => onNavigateSection('inicio')}
                className="block text-left hover:text-white transition-colors"
              >
                Início
              </button>
              <button
                onClick={() => onNavigateSection('catalogo')}
                className="block text-left hover:text-white transition-colors"
              >
                Catálogo
              </button>
              <button
                onClick={() => onNavigateSection('beneficios')}
                className="block text-left hover:text-white transition-colors"
              >
                Entrega
              </button>
              <button
                onClick={() => onNavigateSection('sobre')}
                className="block text-left hover:text-white transition-colors"
              >
                Sobre a Empresa
              </button>
              <button
                onClick={onOpenTracking}
                className="block text-left text-red-400 hover:text-red-300 font-medium cursor-pointer"
              >
                Rastrear Pedido
              </button>
              <button
                onClick={onOpenAdmin}
                className="block text-left text-neutral-400 hover:text-white transition-colors cursor-pointer pt-1"
              >
                Painel do Lojista
              </button>
            </div>
          </div>

          {/* Payments & Security - 3 cols */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-500">
              Pagamento & Segurança
            </h4>
            <p className="text-xs text-neutral-400">
              Aceitamos pagamentos via PIX instantâneo e cartões de crédito em até 3x sem juros ou até 21x.
            </p>

            <div className="p-3 bg-[#111111] rounded-xl border border-[#222222] space-y-1.5 text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Checkout 100% Seguro</span>
              </div>
              <p>Validação server-side contra manipulação de preços e proteção de dados.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar with Safe Clearance for Floating Button */}
      <div className="border-t border-[#1a1a1a] bg-[#000000] py-5 px-4 sm:px-6 pb-24 sm:pb-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400 sm:pr-56">
          <p>© {new Date().getFullYear()} Conserta Cell · Arapongas/PR. Todos os direitos reservados.</p>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={onOpenTracking}
              className="hover:text-white transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-neutral-900 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-neutral-400" />
              <span>Rastreamento</span>
            </button>
            <span className="text-neutral-600">·</span>
            <button
              onClick={onOpenAdmin}
              className="hover:text-red-400 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-neutral-900 cursor-pointer"
            >
              <Lock className="w-3 h-3 text-red-500" />
              <span>Painel do Lojista</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
