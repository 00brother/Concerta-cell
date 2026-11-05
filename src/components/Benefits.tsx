import React from 'react';
import { Truck, MapPin, CreditCard } from 'lucide-react';
import type { StoreSettings } from '../types/index.ts';

interface BenefitsProps {
  settings: StoreSettings | null;
}

export const Benefits: React.FC<BenefitsProps> = ({ settings }) => {
  const localFee = settings?.localDelivery.fee || 10.0;

  return (
    <section id="beneficios" className="py-12 bg-[#0E0E0E] border-b border-[#222222]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1: Entrega Local Arapongas */}
          <div className="bg-[#141414] p-5 rounded-xl border border-[#242424] flex items-start gap-3.5">
            <div className="w-10 h-10 bg-red-950/80 rounded-lg flex items-center justify-center text-red-500 shrink-0 border border-red-800/40">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                Entrega ou Retirada em Arapongas
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Retire grátis na loja física ou receba com agilidade por R$ {localFee.toFixed(2).replace('.', ',')}.
              </p>
            </div>
          </div>

          {/* 2: Envio Correios */}
          <div className="bg-[#141414] p-5 rounded-xl border border-[#242424] flex items-start gap-3.5">
            <div className="w-10 h-10 bg-red-950/80 rounded-lg flex items-center justify-center text-red-500 shrink-0 border border-red-800/40">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                Envio Seguro Correios
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Opções PAC e SEDEX para todo o Brasil com código de rastreamento.
              </p>
            </div>
          </div>

          {/* 3: Parcelamento */}
          <div className="bg-[#141414] p-5 rounded-xl border border-[#242424] flex items-start gap-3.5">
            <div className="w-10 h-10 bg-red-950/80 rounded-lg flex items-center justify-center text-red-500 shrink-0 border border-red-800/40">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                Até 3x Sem Juros / até 21x
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                PIX instantâneo ou cartão de crédito com condições facilitadas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
