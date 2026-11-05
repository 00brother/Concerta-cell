import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, MessageCircle, Package } from 'lucide-react';
import type { Order, StoreSettings } from '../types/index.ts';

interface OrderConfirmationModalProps {
  order: Order | null;
  settings: StoreSettings | null;
  onClose: () => void;
  onTrackOrder: (orderNumber: string) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  settings,
  onClose,
  onTrackOrder,
}) => {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const handleCopyPix = () => {
    if (order.pixCode) {
      navigator.clipboard.writeText(order.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Olá Conserta Cell! Acabei de fazer o pedido *${order.orderNumber}* no site (R$ ${order.total.toFixed(2).replace('.', ',')}) para entrega em ${order.customer.city}/${order.customer.state}. Segue o comprovante!`
  );
  const whatsappUrl = `https://wa.me/5543998370350?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-6 text-center bg-gradient-to-b from-red-950/60 to-[#141414] border-b border-[#222222]">
          <div className="w-12 h-12 bg-red-900/40 rounded-full border border-red-500/50 flex items-center justify-center mx-auto mb-2 text-red-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-red-400">
            Pedido Realizado com Sucesso
          </span>
          <h2 className="text-xl font-black text-white mt-0.5">
            PEDIDO #{order.orderNumber}
          </h2>
          <p className="text-xs text-amber-400 font-medium mt-1">
            Status: Aguardando Pagamento
          </p>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* PIX Box */}
          {order.paymentMethod === 'pix' && (
            <div className="bg-[#181818] p-4 rounded-xl border border-red-900/50 space-y-3 text-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Pague com PIX
              </span>

              {/* Show base64 QR code if returned by Mercado Pago */}
              {order.pixQrCodeBase64 && (
                <div className="w-36 h-36 mx-auto bg-white p-2 rounded-lg">
                  <img
                    src={`data:image/png;base64,${order.pixQrCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <p className="text-xs text-neutral-300">
                Copie o código abaixo e pague no app do seu banco:
              </p>

              {order.pixCode && (
                <div className="flex items-center gap-2 bg-[#101010] p-2 rounded-lg border border-[#333333]">
                  <input
                    type="text"
                    readOnly
                    value={order.pixCode}
                    className="flex-1 bg-transparent text-xs text-neutral-300 font-mono truncate focus:outline-none"
                  />
                  <button
                    onClick={handleCopyPix}
                    className="bg-[#E50914] hover:bg-[#c80812] text-white px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              )}

              <div className="text-[11px] text-neutral-400 text-left pt-1 space-y-0.5">
                <p>• Chave Pix: <strong>{settings?.payment.pixKey || '(43) 99837-0350'}</strong></p>
                <p>• Favorecido: <strong>{settings?.payment.pixRecipientName || settings?.companyName || 'Conserta Cell Arapongas'}</strong></p>
              </div>
            </div>
          )}

          {/* Credit Card details if paid with card */}
          {order.paymentMethod === 'credit_card' && order.installments && (
            <div className="bg-[#181818] p-3.5 rounded-xl border border-[#222222] text-xs space-y-1">
              <p className="font-bold text-white">Cartão de Crédito</p>
              <p className="text-neutral-300">
                {order.installments.count}x de R$ {order.installments.installmentValue.toFixed(2).replace('.', ',')}{' '}
                {order.installments.hasInterest ? '' : '(sem juros)'}
              </p>
              {order.cardLast4 && (
                <p className="text-neutral-400 text-[11px]">Final do cartão: •••• {order.cardLast4}</p>
              )}
            </div>
          )}

          {/* Delivery Details */}
          <div className="bg-[#181818] p-3.5 rounded-xl border border-[#222222] text-xs space-y-1">
            <p className="font-bold text-white">Envio: {order.shippingSelection.title}</p>
            <p className="text-neutral-300">
              {order.customer.street}, nº {order.customer.number} - {order.customer.neighborhood}, {order.customer.city}/{order.customer.state}
            </p>
            <p className="text-neutral-400 text-[11px]">Prazo: {order.shippingSelection.estimatedDays}</p>
          </div>

          {/* WhatsApp Link */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white py-3 rounded-xl font-bold text-xs transition-all shadow-md"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enviar Comprovante no WhatsApp</span>
          </a>

          {/* Track order */}
          <button
            onClick={() => {
              onClose();
              onTrackOrder(order.orderNumber);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
          >
            <Package className="w-4 h-4 text-red-400" />
            <span>Acompanhar Status do Pedido</span>
          </button>
        </div>
      </div>
    </div>
  );
};
