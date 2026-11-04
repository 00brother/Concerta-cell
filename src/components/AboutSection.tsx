import React from 'react';
import { MapPin, Clock, Phone, MessageCircle, ShieldCheck, Wrench } from 'lucide-react';
import type { StoreSettings } from '../types/index.ts';

interface AboutSectionProps {
  settings: StoreSettings | null;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ settings }) => {
  const whatsapp = settings?.whatsapp || '(43) 99837-0350';
  const whatsappUrl = settings?.whatsappUrl || 'https://wa.me/5543998370350';
  const city = settings?.city || 'Arapongas — Paraná';

  return (
    <section id="sobre" className="py-20 bg-gradient-to-b from-[#0A0A0A] via-[#140203] to-[#0A0A0A] border-b border-[#262626]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Official Logo showcase on intense red card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md bg-gradient-to-b from-[#1a0507] to-[#0d0d0d] p-8 rounded-2xl border-2 border-red-700/60 shadow-2xl shadow-red-950/70 text-center">
              <div className="py-8 px-6 bg-black/70 rounded-xl border border-red-900/60 mb-6 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Conserta Cell - Acessórios e Manutenção de Celulares"
                  className="max-h-36 w-auto object-contain drop-shadow-[0_8px_20px_rgba(229,9,20,0.5)]"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 text-xs text-neutral-300">
                  <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{city}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-neutral-300">
                  <Phone className="w-4 h-4 text-red-500 shrink-0" />
                  <span>Atendimento & WhatsApp: {whatsapp}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-neutral-300">
                  <Wrench className="w-4 h-4 text-red-500 shrink-0" />
                  <span>Assistência Técnica e Acessórios para Celulares</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Official About Text and Schedules */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-red-500 bg-red-950/60 px-3 py-1 rounded-full border border-red-800/40">
              Sobre a Empresa
            </span>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              A SUA ASSISTÊNCIA TÉCNICA E LOJA DE ACESSÓRIOS EM ARAPONGAS.
            </h2>

            {/* Official Description verbatim */}
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
              "A <strong className="text-white font-semibold">Conserta Cell</strong> está em Arapongas para ajudar você com assistência técnica e acessórios para celulares. Nosso objetivo é oferecer um atendimento claro, prático e atencioso em cada contato."
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#141414] p-4 rounded-xl border border-[#262626]">
                <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                  <Clock className="w-4 h-4 text-red-500" />
                  <span>Horários de Atendimento</span>
                </div>
                <div className="space-y-1 text-xs text-neutral-300">
                  <p>• Segunda a sexta: <strong>08h30 às 19h</strong></p>
                  <p>• Sábado: <strong>08h30 às 17h</strong></p>
                  <p>• Domingo: <strong>fechado</strong></p>
                </div>
              </div>

              <div className="bg-[#141414] p-4 rounded-xl border border-[#262626]">
                <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                  <ShieldCheck className="w-4 h-4 text-red-500" />
                  <span>Garantia & Confiança</span>
                </div>
                <div className="space-y-1 text-xs text-neutral-300">
                  <p>• Testes rigorosos em cada reparo</p>
                  <p>• Peças com procedência e garantia</p>
                  <p>• Pagamento facilitado em até 21x</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
