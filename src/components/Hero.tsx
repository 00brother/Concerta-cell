import React from 'react';
import { ArrowRight, Package, Truck, ShieldCheck, CreditCard } from 'lucide-react';
import type { StoreSettings } from '../types/index.ts';

interface HeroProps {
  settings: StoreSettings | null;
  onExploreClick: () => void;
  onTrackingClick?: () => void;
  onAboutClick?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  settings,
  onExploreClick,
  onTrackingClick,
}) => {
  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center overflow-hidden bg-[#0A0A0A] pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6">
      {/* Layered atmospheric lighting inspired by reference */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-center red radial halo */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[min(900px,100vw)] h-[450px] bg-gradient-to-b from-[#E50914]/25 via-[#990000]/15 to-transparent blur-[120px] rounded-full" />
        
        {/* Bottom deep ruby glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[min(800px,95vw)] h-[320px] bg-red-950/30 blur-[130px] rounded-full" />

        {/* Subtle high-tech carbon dot grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:28px_28px] opacity-20" />

        {/* Bottom gradient fade transition into content sections */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#0A0A0A]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center w-full">
        {/* Official Giant Brand Logo — Central Focal Anchor */}
        <div className="relative flex justify-center w-full">
          <img
            src="/logo.png"
            alt="Conserta Cell Arapongas"
            className="w-[min(540px,84vw)] max-h-[170px] sm:max-h-[220px] h-auto object-contain filter drop-shadow-[0_26px_55px_rgba(0,0,0,0.9)] drop-shadow-[0_0_45px_rgba(229,9,20,0.32)] animate-logo-in select-none"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Refined Eyebrow with Flanking Precision Hairlines */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 my-6 sm:my-8 text-[11px] sm:text-xs tracking-[0.32em] sm:tracking-[0.42em] uppercase text-red-300 font-semibold animate-fade-up [animation-delay:200ms] text-balance">
          <span className="w-8 sm:w-16 h-[1px] bg-gradient-to-r from-transparent via-red-600/70 to-red-500 shrink-0" />
          <span>Arapongas / PR · Assistência Técnica & Acessórios</span>
          <span className="w-8 sm:w-16 h-[1px] bg-gradient-to-l from-transparent via-red-600/70 to-red-500 shrink-0" />
        </div>

        {/* Subtitle Prose */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-neutral-300 font-normal leading-relaxed text-balance animate-fade-up [animation-delay:350ms]">
          Acessórios originais, películas, baterias, capas e reparo especializado. Entrega expressa na sua porta em Arapongas e envio pelos Correios para todo o Brasil.
        </p>

        {/* Dual Actions with Hover Elevation */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8 sm:mt-10 animate-fade-up [animation-delay:500ms]">
          <button
            onClick={onExploreClick}
            className="inline-flex items-center justify-center gap-2.5 bg-[#E50914] hover:bg-[#c80812] active:scale-98 text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-red-950/60 hover:-translate-y-0.5 cursor-pointer"
          >
            <span>Ver Produtos</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onTrackingClick && (
            <button
              onClick={onTrackingClick}
              className="inline-flex items-center justify-center gap-2.5 bg-neutral-900/60 hover:bg-neutral-850 active:scale-98 text-neutral-200 hover:text-white px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-xs sm:text-sm uppercase tracking-[0.2em] border border-neutral-700/80 hover:border-red-500/80 transition-all hover:-translate-y-0.5 cursor-pointer backdrop-blur-sm"
            >
              <Package className="w-4 h-4 text-red-500" />
              <span>Rastrear Pedido</span>
            </button>
          )}
        </div>

        {/* 3 Trust Markers Strip */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-12 sm:mt-16 pt-8 border-t border-neutral-800/80 text-xs text-neutral-300 animate-fade-up [animation-delay:650ms]">
          <div className="flex items-center justify-center gap-2">
            <Truck className="w-4 h-4 text-red-500 shrink-0" />
            <span>Entrega rápida em Arapongas</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-500 shrink-0" />
            <span>Envio oficial Correios</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4 text-red-500 shrink-0" />
            <span>Até 3x sem juros (ou até 21x)</span>
          </div>
        </div>

        {/* Animated Scroll Cue */}
        <button
          onClick={onExploreClick}
          aria-label="Rolar para o catálogo"
          className="mt-10 sm:mt-14 flex flex-col items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-neutral-400 hover:text-red-400 transition-colors cursor-pointer select-none group"
        >
          <span className="font-medium group-hover:text-red-400 transition-colors">Explore</span>
          <i className="block w-[1.5px] h-10 sm:h-12 bg-gradient-to-b from-red-600 via-red-500 to-transparent animate-cue" />
        </button>
      </div>
    </section>
  );
};
