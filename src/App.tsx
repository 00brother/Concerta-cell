import React, { useState, useEffect } from 'react';
import {
  Header,
} from './components/Header.tsx';
import { Hero } from './components/Hero.tsx';
import { Benefits } from './components/Benefits.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductModal } from './components/ProductModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { OrderConfirmationModal } from './components/OrderConfirmationModal.tsx';
import { OrderTrackingModal } from './components/OrderTrackingModal.tsx';
import { AboutSection } from './components/AboutSection.tsx';
import { Footer } from './components/Footer.tsx';
import { WhatsAppButton } from './components/WhatsAppButton.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { CartProvider } from './context/CartContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { api } from './services/api.ts';
import type { Product, StoreSettings, Order } from './types/index.ts';
import { Search, SlidersHorizontal, Plus, MessageCircle, AlertCircle, ShoppingBag, Sparkles } from 'lucide-react';

const CATEGORIES = [
  'Todos',
  'Capinhas & Películas',
  'Carregadores & Cabos',
  'Fones & Áudio',
  'Suportes & Acessórios',
  'Telas & Peças',
  'Baterias',
];

export function AppContent() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [settingsData, productsData] = await Promise.all([
        api.getSettings(),
        api.getProducts(),
      ]);
      setSettings(settingsData);
      setProducts(productsData);
    } catch (e) {
      console.error('Erro ao carregar dados iniciais:', e);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleRefreshProducts = async () => {
    try {
      const list = await api.getProducts();
      setProducts(list);
      const settingsData = await api.getSettings();
      setSettings(settingsData);
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter & Sort Products
  const filteredProducts = products.filter((p) => {
    if (!p.active) return false;
    const matchesCat =
      selectedCategory === 'Todos' ||
      p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      searchTerm.trim() === '' ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (sortOption === 'price-asc') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortOption === 'price-desc') {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else {
    filteredProducts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  const featuredProducts = products.filter((p) => p.featured && p.active);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Header */}
      <Header
        settings={settings}
        onOpenTracking={() => {
          setTrackingNumber('');
          setTrackingOpen(true);
        }}
        onNavigateSection={scrollToSection}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <div id="inicio">
          <Hero
            settings={settings}
            onExploreClick={() => scrollToSection('catalogo')}
            onTrackingClick={() => {
              setTrackingNumber('');
              setTrackingOpen(true);
            }}
            onAboutClick={() => scrollToSection('sobre')}
          />
        </div>

        {/* Benefits Section */}
        <Benefits settings={settings} />

        {/* Featured Products Section (Strictly only when featured products exist) */}
        {featuredProducts.length > 0 && (
          <section className="py-14 bg-[#0d0d0d] border-b border-[#262626]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                    Seleção Especial
                  </span>
                  <h2 className="text-xl sm:text-3xl font-extrabold text-white mt-0.5">
                    PRODUTOS EM DESTAQUE
                  </h2>
                </div>
                <button
                  onClick={() => scrollToSection('catalogo')}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold underline decoration-dotted"
                >
                  Ver todos os {products.length} produtos
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onSelect={(p) => setSelectedProduct(p)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Main Catalog Section */}
        <section id="catalogo" className="py-16 bg-[#0A0A0A] border-b border-[#262626]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* Catalog Title */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                  Loja Virtual Oficial
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white mt-1">
                  CATÁLOGO DE ACESSÓRIOS & PEÇAS
                </h2>
                <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                  Produtos originais e selecionados com garantia e entrega rápida em Arapongas e todo o Brasil.
                </p>
              </div>

              {/* Sort by price / newest */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="text-xs text-neutral-400 whitespace-nowrap">Ordenar por:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="bg-[#161616] border border-[#333333] text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-red-500 font-medium cursor-pointer"
                >
                  <option value="newest">Mais Recentes</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                </select>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#E50914] text-white shadow-md shadow-red-950/50'
                      : 'bg-[#141414] text-neutral-400 hover:text-white hover:bg-[#202020] border border-[#262626]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog Grid or Empty State */}
            {productsLoading ? (
              <div className="py-20 text-center text-xs text-neutral-400">
                Carregando catálogo de produtos da Conserta Cell...
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onSelect={(p) => setSelectedProduct(p)}
                  />
                ))}
              </div>
            ) : (
              /* Honest, High-Quality Empty State */
              <div className="bg-[#141414] border-2 border-dashed border-[#2a2a2a] rounded-2xl p-8 sm:p-14 text-center max-w-2xl mx-auto space-y-4">
                <div className="w-16 h-16 bg-red-950/40 rounded-2xl border border-red-600/50 flex items-center justify-center text-red-500 mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {searchTerm
                      ? `Nenhum produto encontrado para "${searchTerm}"`
                      : 'Catálogo online em atualização'}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
                    {searchTerm
                      ? 'Tente buscar por outro termo ou selecione uma categoria acima.'
                      : 'Nossa loja física em Arapongas está abastecida com capas, películas, carregadores e peças. Fale diretamente conosco para consultar modelos disponíveis.'}
                  </p>
                </div>

                <div className="pt-2 flex justify-center">
                  <a
                    href="https://wa.me/5543998370350?text=Olá!%20Gostaria%20de%20consultar%20um%20acessório%20ou%20peça%20na%20Conserta%20Cell."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-6 py-3 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-950/40"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Consultar Peça no WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* About Section */}
        <AboutSection settings={settings} />
      </main>

      {/* Footer */}
      <Footer
        settings={settings}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenTracking={() => {
          setTrackingNumber('');
          setTrackingOpen(true);
        }}
        onNavigateSection={scrollToSection}
      />

      {/* Floating WhatsApp Button */}
      <WhatsAppButton settings={settings} />

      {/* Cart Drawer */}
      <CartDrawer
        settings={settings}
        onProceedToCheckout={() => setCheckoutOpen(true)}
      />

      {/* Product Detail Modal */}
      <ProductModal
        product={selectedProduct}
        settings={settings}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        settings={settings}
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onOrderSuccess={(order) => {
          setCheckoutOpen(false);
          setConfirmedOrder(order);
        }}
      />

      {/* Order Confirmation Modal */}
      <OrderConfirmationModal
        order={confirmedOrder}
        settings={settings}
        onClose={() => setConfirmedOrder(null)}
        onTrackOrder={(ordNum) => {
          setConfirmedOrder(null);
          setTrackingNumber(ordNum);
          setTrackingOpen(true);
        }}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={trackingOpen}
        initialOrderNumber={trackingNumber}
        onClose={() => setTrackingOpen(false)}
      />

      {/* Administrative Panel */}
      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        onStoreUpdated={handleRefreshProducts}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </ErrorBoundary>
  );
}
