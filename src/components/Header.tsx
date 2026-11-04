import React, { useState } from 'react';
import { ShoppingBag, Search, MapPin, X, Package, Menu, Phone } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import type { StoreSettings } from '../types/index.ts';

interface HeaderProps {
  settings: StoreSettings | null;
  onOpenTracking: () => void;
  onNavigateSection: (sectionId: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenTracking,
  onNavigateSection,
  searchTerm,
  setSearchTerm,
}) => {
  const { totalItems, setIsCartOpen } = useCart();
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    onNavigateSection(sectionId);
  };

  return (
    <>
      {/* Discreet Announcement Bar */}
      <div className="bg-[#800000] text-white text-[11px] py-1.5 px-4 font-medium border-b border-red-900/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-red-300 shrink-0" />
            <span className="truncate">
              Arapongas — PR · Loja Oficial Conserta Cell
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="tel:43998370350"
              className="hidden sm:flex items-center gap-1 text-neutral-200 hover:text-white transition-colors"
            >
              <Phone className="w-3 h-3 text-red-300" />
              <span>(43) 99837-0350</span>
            </a>

            <button
              onClick={onOpenTracking}
              className="flex items-center gap-1.5 text-neutral-200 hover:text-white transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-red-300" />
              <span className="font-semibold">Rastrear Pedido</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Glass Navbar */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#222222]/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-6">
          {/* Brand Wordmark / Mini Logo */}
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('inicio');
            }}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <img
              src="/logo.png"
              alt="Conserta Cell"
              className="h-9 sm:h-11 w-auto object-contain transition-transform group-hover:scale-102"
              referrerPolicy="no-referrer"
            />
          </a>

          {/* Navigation Links with Refined Underline Effect */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-300">
            <button
              onClick={() => handleNavClick('inicio')}
              className="relative py-1 hover:text-white transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-[1.5px] after:bg-[#E50914] after:transition-all after:duration-300 cursor-pointer"
            >
              Início
            </button>
            <button
              onClick={() => handleNavClick('catalogo')}
              className="relative py-1 hover:text-white transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-[1.5px] after:bg-[#E50914] after:transition-all after:duration-300 cursor-pointer"
            >
              Produtos
            </button>
            <button
              onClick={() => handleNavClick('sobre')}
              className="relative py-1 hover:text-white transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-[1.5px] after:bg-[#E50914] after:transition-all after:duration-300 cursor-pointer"
            >
              A Loja
            </button>
            <button
              onClick={() => handleNavClick('contato')}
              className="relative py-1 hover:text-white transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-[1.5px] after:bg-[#E50914] after:transition-all after:duration-300 cursor-pointer"
            >
              Contato
            </button>
          </nav>

          {/* Right Area: Search, Cart & Mobile Burger */}
          <div className="flex items-center gap-3 shrink-0">
            {showSearchInput ? (
              <div className="flex items-center bg-[#161616] border border-red-700/60 rounded-xl px-3 py-1.5 shadow-inner">
                <Search className="w-3.5 h-3.5 text-neutral-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none w-32 sm:w-48"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearchInput(false);
                    setSearchTerm('');
                  }}
                  className="text-neutral-400 hover:text-white p-0.5 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowSearchInput(true);
                  onNavigateSection('catalogo');
                }}
                className="p-2 text-neutral-300 hover:text-white hover:bg-[#1a1a1a] rounded-xl transition-colors cursor-pointer"
                title="Buscar produtos"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 bg-[#E50914] hover:bg-[#c80812] active:scale-98 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs uppercase tracking-[0.15em] transition-all shadow-lg shadow-red-950/50 cursor-pointer hover:-translate-y-0.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Carrinho</span>
              {totalItems > 0 && (
                <span className="bg-black text-white text-[11px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile Burger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-300 hover:text-white hover:bg-[#1a1a1a] rounded-xl transition-colors cursor-pointer"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0F0F0F] border-b border-[#262626] px-6 py-6 space-y-4 animate-fade-up">
            <nav className="flex flex-col space-y-3 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-200">
              <button
                onClick={() => handleNavClick('inicio')}
                className="text-left py-2 hover:text-red-500 transition-colors border-b border-neutral-900"
              >
                Início
              </button>
              <button
                onClick={() => handleNavClick('catalogo')}
                className="text-left py-2 hover:text-red-500 transition-colors border-b border-neutral-900"
              >
                Produtos
              </button>
              <button
                onClick={() => handleNavClick('sobre')}
                className="text-left py-2 hover:text-red-500 transition-colors border-b border-neutral-900"
              >
                A Loja
              </button>
              <button
                onClick={() => handleNavClick('contato')}
                className="text-left py-2 hover:text-red-500 transition-colors"
              >
                Contato
              </button>
            </nav>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenTracking();
                }}
                className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white py-1"
              >
                <Package className="w-4 h-4 text-red-500" />
                <span>Rastrear Pedido</span>
              </button>

              <a
                href="https://wa.me/5543998370350"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-red-400 font-semibold"
              >
                WhatsApp Oficial
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
