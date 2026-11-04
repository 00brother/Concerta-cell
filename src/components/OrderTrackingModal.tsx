import React, { useState, useEffect } from 'react';
import { X, Search, Package, CheckCircle2, Clock, Truck, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import type { Order, OrderStatus } from '../types/index.ts';
import { api } from '../services/api.ts';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderNumber?: string;
}

const STATUS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'Aguardando Pagamento' },
  { key: 'approved', label: 'Pagamento Aprovado' },
  { key: 'preparing', label: 'Em Preparação' },
  { key: 'shipped', label: 'Enviado' },
  { key: 'out_for_delivery', label: 'Saiu para Entrega' },
  { key: 'delivered', label: 'Entregue' },
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrderNumber,
}) => {
  const [query, setQuery] = useState(initialOrderNumber || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialOrderNumber) {
      setQuery(initialOrderNumber);
      handleSearch(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const handleSearch = async (codeToSearch?: string) => {
    const code = (codeToSearch || query).trim();
    if (!code) {
      setErrorMsg('Informe o número do pedido (ex: CC-1001).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setOrder(null);
    try {
      const data = await api.getOrder(code);
      setOrder(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Pedido não localizado. Verifique o número digitado.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Determine current step index
  const currentStepIndex = order
    ? STATUS_STEPS.findIndex((s) => s.key === order.status)
    : -1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#262626] bg-[#181818] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-white">Rastreamento de Pedido</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Search bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Digite o número do pedido (ex: CC-1001)"
              className="flex-1 bg-[#101010] border border-[#333333] text-white text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#E50914] hover:bg-[#c80812] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-red-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Consultar</span>
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-800/70 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Order Details Result */}
          {order && (
            <div className="space-y-5 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                <div>
                  <span className="text-[11px] text-neutral-400">Número do Pedido</span>
                  <h3 className="text-base font-extrabold text-white font-mono">{order.orderNumber}</h3>
                  <p className="text-[11px] text-neutral-400">
                    Realizado em: {new Date(order.createdAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[11px] text-neutral-400">Total do Pedido</span>
                  <p className="text-base font-extrabold text-red-400 font-mono">
                    R$ {order.total.toFixed(2).replace('.', ',')}
                  </p>
                  <span className="text-[10px] text-neutral-400">
                    {order.paymentMethod === 'pix' ? 'Pagamento via PIX' : 'Cartão de Crédito'}
                  </span>
                </div>
              </div>

              {/* Status Timeline */}
              {order.status === 'cancelled' ? (
                <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-center space-y-1">
                  <p className="font-bold text-red-400 text-sm">Pedido Cancelado</p>
                  <p className="text-xs text-neutral-300">Este pedido foi cancelado pelo cliente ou pelo lojista.</p>
                </div>
              ) : (
                <div className="p-4 bg-[#181818] rounded-xl border border-[#262626] space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Status da Entrega
                  </h4>

                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-[#2e2e2e]">
                    {STATUS_STEPS.map((stepItem, idx) => {
                      const isCompleted = idx <= currentStepIndex;
                      const isCurrent = idx === currentStepIndex;

                      return (
                        <div key={stepItem.key} className="relative flex items-center gap-3 pl-1">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition-colors ${
                              isCompleted
                                ? 'bg-red-600 text-white shadow-sm shadow-red-900/60'
                                : 'bg-[#262626] text-neutral-500'
                            }`}
                          >
                            {isCompleted ? '✓' : idx + 1}
                          </div>

                          <div className="flex-1 flex justify-between items-center text-xs">
                            <span
                              className={`font-semibold ${
                                isCurrent
                                  ? 'text-red-400 font-bold'
                                  : isCompleted
                                  ? 'text-white'
                                  : 'text-neutral-500'
                              }`}
                            >
                              {stepItem.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] bg-red-950/80 text-red-300 px-2 py-0.5 rounded border border-red-800/50">
                                Atual
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Correios Tracking Code if available */}
              {order.trackingCode && (
                <div className="p-3.5 bg-neutral-900 rounded-xl border border-red-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-neutral-400">Código de Rastreio dos Correios:</span>
                    <p className="text-sm font-bold text-white font-mono">{order.trackingCode}</p>
                  </div>
                  <a
                    href={`https://rastreamento.correios.com.br/app/index.php?codigo=${order.trackingCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-[#E50914] hover:bg-[#c80812] text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    <span>Rastrear</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Delivery Address & Items */}
              <div className="bg-[#181818] p-4 rounded-xl border border-[#262626] text-xs space-y-2">
                <h4 className="font-bold text-white">Endereço de Entrega</h4>
                <p className="text-neutral-300">
                  {order.customer.street}, nº {order.customer.number}{' '}
                  {order.customer.complement ? `(${order.customer.complement})` : ''} - {order.customer.neighborhood}, {order.customer.city}/{order.customer.state}
                </p>
                <p className="text-neutral-400">
                  Modalidade: <strong className="text-neutral-200">{order.shippingSelection.title}</strong> ({order.shippingSelection.estimatedDays})
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
