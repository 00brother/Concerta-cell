import React from 'react';
import { ShoppingBag, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Product } from '../types/index.ts';
import { useCart } from '../context/CartContext.tsx';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { addToCart } = useCart();

  const isAvailable = product.stock > 0 && product.active;
  const currentPrice =
    product.promotionalPrice && product.promotionalPrice > 0
      ? product.promotionalPrice
      : product.price;

  const installment3x = (currentPrice / 3).toFixed(2).replace('.', ',');

  return (
    <div className="bg-[#141414] rounded-xl border border-[#262626] hover:border-red-600/70 transition-all duration-200 overflow-hidden flex flex-col group hover:shadow-lg hover:shadow-red-950/20">
      {/* Product Image slot */}
      <div
        onClick={() => onSelect(product)}
        className="relative aspect-[4/3] bg-[#1a1a1a] overflow-hidden cursor-pointer flex items-center justify-center p-4 border-b border-[#222222]"
      >
        {product.images && product.images.length > 0 && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = './logo.png';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-neutral-500 p-4 text-center">
            <img src="./logo.png" alt="Conserta Cell" className="h-10 opacity-40 mb-2 object-contain" />
            <span className="text-xs">Foto sob consulta</span>
          </div>
        )}

        {/* Stock / Availability Indicator */}
        <div className="absolute top-2.5 right-2.5">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1 bg-black/80 text-emerald-400 text-[11px] font-medium px-2 py-0.5 rounded border border-emerald-900/60 backdrop-blur-xs">
              <CheckCircle2 className="w-3 h-3" />
              {product.stock} em estoque
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-black/80 text-red-400 text-[11px] font-medium px-2 py-0.5 rounded border border-red-900/60 backdrop-blur-xs">
              <AlertCircle className="w-3 h-3" />
              Esgotado
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 block mb-1">
            {product.category || 'Acessórios'}
          </span>

          <h3
            onClick={() => onSelect(product)}
            className="text-sm sm:text-base font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2 cursor-pointer"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* Pricing & Installments */}
        <div className="pt-2 border-t border-[#222222]">
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-extrabold text-white font-mono tabular-nums">
              R$ {currentPrice.toFixed(2).replace('.', ',')}
            </span>
            {product.promotionalPrice && product.promotionalPrice < product.price && (
              <span className="text-xs text-neutral-500 line-through font-mono tabular-nums">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>

          <p className="text-[11px] text-neutral-400 mt-0.5">
            ou <strong className="text-neutral-200">3x de R$ {installment3x}</strong> sem juros
          </p>
          <p className="text-[10px] text-neutral-500">
            ou em até 21x no cartão de crédito
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onSelect(product)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#222222] hover:bg-[#2c2c2c] text-white text-xs font-semibold transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Detalhes
          </button>

          <button
            disabled={!isAvailable}
            onClick={() => addToCart(product, 1)}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              isAvailable
                ? 'bg-[#E50914] hover:bg-[#c80812] active:scale-98 text-white shadow-sm shadow-red-950/40 cursor-pointer'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
};
