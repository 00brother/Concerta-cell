import React, { useState } from 'react';
import { X, ShoppingBag, Truck, ShieldCheck, MessageCircle, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Product, ShippingOption, StoreSettings } from '../types/index.ts';
import { useCart } from '../context/CartContext.tsx';
import { api } from '../services/api.ts';

interface ProductModalProps {
  product: Product | null;
  settings: StoreSettings | null;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  settings,
  onClose,
}) => {
  const { addToCart } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cepInput, setCepInput] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingResult, setShippingResult] = useState<{
    isLocal: boolean;
    options: ShippingOption[];
    note: string;
  } | null>(null);
  const [shippingError, setShippingError] = useState('');
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);

  if (!product) return null;

  const currentPrice =
    product.promotionalPrice && product.promotionalPrice > 0
      ? product.promotionalPrice
      : product.price;

  const isAvailable = product.stock > 0 && product.active;
  const maxInterestFree = settings?.payment.maxInterestFree || 3;
  const maxInstallments = settings?.payment.maxInstallments || 21;
  const interestRate = (settings?.payment.interestRateMonthly || 1.99) / 100;

  // Generate installment table for modal
  const installmentRows = Array.from({ length: maxInstallments }, (_, i) => {
    const count = i + 1;
    const isFree = count <= maxInterestFree;
    let total = currentPrice;
    if (!isFree) {
      total = currentPrice * Math.pow(1 + interestRate, count);
    }
    const val = total / count;
    return {
      count,
      isFree,
      val: val.toFixed(2).replace('.', ','),
      total: total.toFixed(2).replace('.', ','),
    };
  });

  const handleCalculateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    setShippingError('');
    setShippingResult(null);

    const cleanCep = cepInput.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setShippingError('Digite um CEP válido com 8 números.');
      return;
    }

    setShippingLoading(true);
    try {
      const res = await api.calculateShipping(cleanCep, [
        { productId: product.id, quantity },
      ]);
      setShippingResult(res);
    } catch (err: any) {
      setShippingError(err.message || 'Erro ao calcular frete');
    } finally {
      setShippingLoading(false);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    onClose();
  };

  const productImages =
    product.images && product.images.length > 0 ? product.images : ['/logo.png'];

  const whatsappMessage = encodeURIComponent(
    `Olá Conserta Cell! Gostaria de mais informações sobre o produto: "${product.name}" (R$ ${currentPrice.toFixed(2).replace('.', ',')}).`
  );
  const whatsappUrl = `https://wa.me/5543998370350?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-neutral-400 hover:text-white bg-black/60 hover:bg-black rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8">
          {/* Gallery - Left 6 cols */}
          <div className="md:col-span-6 flex flex-col space-y-4">
            <div className="aspect-square bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 flex items-center justify-center overflow-hidden">
              <img
                src={productImages[selectedImageIndex] || '/logo.png'}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>

            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-16 rounded-lg border-2 p-1 bg-[#1a1a1a] shrink-0 transition-colors ${
                      selectedImageIndex === idx ? 'border-red-600' : 'border-[#333333]'
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details - Right 6 cols */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-red-500">
                {product.category || 'Acessório'}
              </span>

              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 mb-2 leading-snug">
                {product.name}
              </h2>

              {/* Stock Status */}
              <div className="flex items-center gap-2 mb-4 text-xs">
                {isAvailable ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Estoque disponível: {product.stock} unidades
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-4 h-4" />
                    Produto temporariamente indisponível
                  </span>
                )}
              </div>

              {/* Pricing */}
              <div className="bg-[#1c1c1c] p-4 rounded-xl border border-[#2a2a2a] mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                    R$ {currentPrice.toFixed(2).replace('.', ',')}
                  </span>
                  {product.promotionalPrice && product.promotionalPrice < product.price && (
                    <span className="text-sm text-neutral-500 line-through font-mono tabular-nums">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-300 mt-1">
                  ou até <strong className="text-white">3x de R$ {(currentPrice / 3).toFixed(2).replace('.', ',')}</strong> sem juros
                </p>

                <button
                  type="button"
                  onClick={() => setShowInstallmentsModal(true)}
                  className="text-xs text-red-400 hover:text-red-300 underline mt-2 block"
                >
                  Ver tabela completa de parcelamento (até 21x)
                </button>
              </div>

              {/* Description */}
              {product.description && (
                <div className="space-y-1 mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Descrição do Produto
                  </h4>
                  <p className="text-xs sm:text-sm text-neutral-300 whitespace-pre-line leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Dimensions / Weight for Correios if available */}
              <div className="text-[11px] text-neutral-400 space-y-0.5">
                <p>Peso estimado de envio: {product.weightKg || 0.3} kg</p>
              </div>
            </div>

            {/* Purchase Form */}
            <div className="space-y-4 pt-3 border-t border-[#262626]">
              {/* Quantity selector */}
              {isAvailable && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-300 font-medium">Quantidade:</span>
                  <div className="flex items-center border border-[#333333] rounded-lg bg-[#181818]">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 text-sm text-neutral-300 hover:text-white"
                    >
                      -
                    </button>
                    <span className="px-3 py-1.5 text-sm font-semibold text-white font-mono">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      className="px-3 py-1.5 text-sm text-neutral-300 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {/* Purchase Button */}
              <div>
                <button
                  disabled={!isAvailable}
                  onClick={handleAddToCart}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                    isAvailable
                      ? 'bg-[#E50914] hover:bg-[#c80812] active:scale-98 text-white shadow-lg shadow-red-950/50 cursor-pointer'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isAvailable ? 'Adicionar ao Carrinho' : 'Produto Esgotado'}</span>
                </button>
              </div>

              {/* Shipping Simulator */}
              <div className="bg-[#171717] p-3.5 rounded-xl border border-[#2a2a2a] space-y-2 mt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <Truck className="w-4 h-4 text-red-500" />
                  <span>Simular Frete e Prazo de Entrega:</span>
                </div>

                <form onSubmit={handleCalculateShipping} className="flex gap-2">
                  <input
                    type="text"
                    value={cepInput}
                    onChange={(e) => setCepInput(e.target.value)}
                    placeholder="Digite seu CEP (ex: 86700-000)"
                    maxLength={9}
                    className="flex-1 bg-[#101010] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    disabled={shippingLoading}
                    className="bg-[#2a2a2a] hover:bg-neutral-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {shippingLoading ? 'Calculando...' : 'Calcular'}
                  </button>
                </form>

                {shippingError && (
                  <p className="text-[11px] text-red-400">{shippingError}</p>
                )}

                {shippingResult && (
                  <div className="pt-2 border-t border-[#262626] space-y-2">
                    <p className="text-[11px] text-neutral-400">{shippingResult.note}</p>
                    {shippingResult.options.map((opt) => (
                      <div
                        key={opt.id}
                        className="flex items-center justify-between text-xs p-2 rounded bg-black/40 border border-neutral-800"
                      >
                        <div>
                          <p className="font-semibold text-white">{opt.title}</p>
                          <p className="text-[11px] text-neutral-400">Prazo: {opt.estimatedDays}</p>
                        </div>
                        <span className="font-mono font-bold text-red-400">
                          R$ {opt.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Installments Table Modal */}
      {showInstallmentsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#141414] border border-[#333333] p-6 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-4">
              <h3 className="font-bold text-white text-base">
                Opções de Parcelamento — Cartão de Crédito
              </h3>
              <button
                onClick={() => setShowInstallmentsModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-3">
              Valor do produto: <strong>R$ {currentPrice.toFixed(2).replace('.', ',')}</strong>. Parcelamento em até 3x sem juros ou até 21x conforme o gateway e operadora do cartão.
            </p>

            <div className="overflow-y-auto flex-1 pr-1 space-y-1.5">
              {installmentRows.map((row) => (
                <div
                  key={row.count}
                  className={`flex items-center justify-between text-xs p-2.5 rounded-lg border ${
                    row.isFree
                      ? 'bg-red-950/20 border-red-900/50 text-white'
                      : 'bg-[#181818] border-[#262626] text-neutral-300'
                  }`}
                >
                  <span className="font-medium">
                    {row.count}x de <strong>R$ {row.val}</strong>
                  </span>
                  <div className="text-right">
                    {row.isFree ? (
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                        Sem juros
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400">
                        Total: R$ {row.total}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#262626] mt-3 text-right">
              <button
                onClick={() => setShowInstallmentsModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
