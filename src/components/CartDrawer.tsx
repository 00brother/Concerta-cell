import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import type { ShippingOption, StoreSettings } from '../types/index.ts';
import { api } from '../services/api.ts';

interface CartDrawerProps {
  settings: StoreSettings | null;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  settings,
  onProceedToCheckout,
}) => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    shippingOption,
    setShippingOption,
    shippingCep,
    setShippingCep,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const [cepInput, setCepInput] = useState(shippingCep || '');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingError, setShippingError] = useState('');
  const [shippingNote, setShippingNote] = useState('');

  // Auto-calculate shipping if CEP was already saved
  useEffect(() => {
    if (shippingCep && cart.length > 0 && shippingOptions.length === 0) {
      calculateShipping(shippingCep);
    }
  }, [cart, shippingCep]);

  const calculateShipping = async (cepToCalc: string) => {
    const clean = cepToCalc.replace(/\D/g, '');
    if (clean.length !== 8) {
      setShippingError('Informe um CEP válido com 8 números');
      return;
    }

    setShippingLoading(true);
    setShippingError('');
    try {
      const itemsPayload = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));
      const res = await api.calculateShipping(clean, itemsPayload);
      setShippingOptions(res.options);
      setShippingNote(res.note);
      setShippingCep(clean);

      // Auto-select first option if none selected
      if (res.options.length > 0 && !shippingOption) {
        setShippingOption(res.options[0]);
      }
    } catch (err: any) {
      setShippingError(err.message || 'Erro ao calcular frete');
    } finally {
      setShippingLoading(false);
    }
  };

  const handleCepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculateShipping(cepInput);
  };

  const shippingCost = shippingOption ? shippingOption.price : 0;
  const grandTotal = subtotal + shippingCost;

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-md bg-[#121212] border-l border-[#262626] h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#262626] flex items-center justify-between bg-[#161616]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-white">Seu Carrinho</h2>
            <span className="text-xs bg-red-950/80 text-red-400 px-2 py-0.5 rounded-full border border-red-800/50">
              {cart.reduce((a, b) => a + b.quantity, 0)} itens
            </span>
          </div>

          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 bg-[#1f1f1f] rounded-full flex items-center justify-center text-neutral-500">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Seu carrinho está vazio</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                  Navegue pelo catálogo da Conserta Cell para adicionar acessórios e componentes ao seu pedido.
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="px-5 py-2.5 bg-[#E50914] hover:bg-[#c80812] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-950/40"
              >
                Ver Produtos
              </button>
            </div>
          ) : (
            <>
              {cart.map((item) => {
                const price =
                  item.product.promotionalPrice && item.product.promotionalPrice > 0
                    ? item.product.promotionalPrice
                    : item.product.price;
                const itemTotal = price * item.quantity;

                return (
                  <div
                    key={item.product.id}
                    className="flex gap-3 p-3 bg-[#181818] rounded-xl border border-[#2a2a2a]"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 bg-[#111111] rounded-lg border border-[#222222] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src={item.product.images[0] || './logo.png'}
                        alt={item.product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = './logo.png';
                        }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-white line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-neutral-500 hover:text-red-400 transition-colors p-0.5"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] text-neutral-400">
                        R$ {price.toFixed(2).replace('.', ',')} un.
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        {/* Stepper */}
                        <div className="flex items-center border border-[#333333] rounded bg-[#111111]">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="px-2 py-0.5 text-xs text-neutral-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-semibold text-white font-mono">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="px-2 py-0.5 text-xs text-neutral-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-xs font-bold text-white font-mono">
                          R$ {itemTotal.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Shipping Calculator inside Cart */}
              <div className="p-3 bg-[#181818] rounded-xl border border-[#2a2a2a] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200">
                  <Truck className="w-4 h-4 text-red-500" />
                  <span>Calcular Entrega (CEP)</span>
                </div>

                <form onSubmit={handleCepSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={cepInput}
                    onChange={(e) => setCepInput(e.target.value)}
                    placeholder="CEP de entrega (ex: 86700-000)"
                    maxLength={9}
                    className="flex-1 bg-[#101010] border border-[#333333] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    disabled={shippingLoading}
                    className="bg-[#2e2e2e] hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    {shippingLoading ? '...' : 'Calcular'}
                  </button>
                </form>

                {shippingError && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {shippingError}
                  </p>
                )}

                {shippingOptions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {shippingOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          shippingOption?.id === opt.id
                            ? 'bg-red-950/30 border-red-600 text-white'
                            : 'bg-[#121212] border-[#292929] text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shipping_cart"
                            checked={shippingOption?.id === opt.id}
                            onChange={() => setShippingOption(opt)}
                            className="accent-red-600"
                          />
                          <div>
                            <p className="font-semibold">{opt.title}</p>
                            <p className="text-[10px] text-neutral-400">Prazo: {opt.estimatedDays}</p>
                          </div>
                        </div>
                        <span className={`font-mono font-bold ${opt.price === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {opt.price === 0 ? 'GRÁTIS' : `R$ ${opt.price.toFixed(2).replace('.', ',')}`}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer with Totals & Checkout */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-[#262626] bg-[#161616] space-y-3">
            <div className="space-y-1.5 text-xs text-neutral-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-white">
                  R$ {subtotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Frete</span>
                {shippingOption ? (
                  <span className={`font-mono font-semibold ${shippingOption.price === 0 ? 'text-emerald-400' : 'text-white'}`}>
                    {shippingOption.price === 0 ? 'GRÁTIS' : `R$ ${shippingOption.price.toFixed(2).replace('.', ',')}`}
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-400">Calcular acima</span>
                )}
              </div>

              <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-[#262626]">
                <span>Total</span>
                <span className="font-mono text-red-500">
                  R$ {grandTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <p className="text-[10px] text-neutral-400 text-right">
                ou até 3x de R$ {(grandTotal / 3).toFixed(2).replace('.', ',')} sem juros
              </p>
            </div>

            <button
              onClick={() => {
                setIsCartOpen(false);
                onProceedToCheckout();
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#E50914] hover:bg-[#c80812] active:scale-98 text-white py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-950/60 cursor-pointer"
            >
              <span>Finalizar Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
