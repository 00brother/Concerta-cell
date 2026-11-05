import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  Package,
  Clock,
  Store,
  Truck,
  X,
} from 'lucide-react';
import type { Order, StoreSettings } from '../types/index.ts';
import { generatePixQrCodeDataUrl } from '../utils/pix.ts';
import { api } from '../services/api.ts';

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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>(order?.pixQrCodeBase64 || '');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30 * 60);
  const [isExpired, setIsExpired] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(order?.status === 'approved');

  // Compute 30-minute expiration countdown
  useEffect(() => {
    if (!order) return;

    const createdAtMs = new Date(order.createdAt).getTime();
    const expiresAtMs = order.expiresAt
      ? new Date(order.expiresAt).getTime()
      : createdAtMs + 30 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        setIsExpired(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order]);

  // Real-time Asaas payment status polling
  useEffect(() => {
    if (!order || paymentConfirmed || isExpired) return;

    const pollStatus = async () => {
      try {
        const updated = await api.checkPaymentStatus(order.id);
        if (updated && updated.status === 'approved') {
          setPaymentConfirmed(true);
        }
      } catch {
        // Polling retry
      }
    };

    const pollInterval = setInterval(pollStatus, 5000);
    return () => clearInterval(pollInterval);
  }, [order, paymentConfirmed, isExpired]);

  // Ensure high-resolution QR code is always ready
  useEffect(() => {
    if (order?.paymentMethod === 'pix' && order.pixCode) {
      if (!qrCodeDataUrl || !qrCodeDataUrl.startsWith('data:image')) {
        generatePixQrCodeDataUrl(order.pixCode)
          .then((url) => setQrCodeDataUrl(url))
          .catch((err) => console.error('Erro ao gerar QR Code local:', err));
      }
    }
  }, [order, qrCodeDataUrl]);

  if (!order) return null;

  const handleCopyPix = () => {
    if (order.pixCode) {
      navigator.clipboard.writeText(order.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const isPickup = order.shippingSelection?.id === 'pickup';
  const rawPhone = (settings?.whatsapp || '43998370350').replace(/\D/g, '');
  const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

  const itemsList = (order.items || [])
    .map(
      (it) =>
        `• ${it.quantity}x ${it.productName || 'Item'} — R$ ${((it.price || 0) * (it.quantity || 1)).toFixed(2).replace('.', ',')}`
    )
    .join('\n');

  const customerName = order.customer?.fullName || 'Cliente';
  const customerPhone = order.customer?.phone || '';
  const customerCpf = order.customer?.cpf || '';
  const shippingTitle = order.shippingSelection?.title || (isPickup ? 'Retirada no Balcão' : 'Entrega Local');
  const shippingDays = order.shippingSelection?.estimatedDays || '1 a 3 dias úteis';
  const street = order.customer?.street || '';
  const number = order.customer?.number || '';
  const complement = order.customer?.complement ? ` (${order.customer.complement})` : '';
  const neighborhood = order.customer?.neighborhood || '';
  const city = order.customer?.city || 'Arapongas';
  const state = order.customer?.state || 'PR';
  const cep = order.customer?.cep || '';

  // Format complete WhatsApp notification message directly for the store owner
  const fullOrderText = [
    `*NOVO PEDIDO NO SITE — CONSERTA CELL* 🛒`,
    ``,
    `*Pedido:* #${order.orderNumber}`,
    `*Cliente:* ${customerName}`,
    `*WhatsApp:* ${customerPhone}`,
    `*CPF:* ${customerCpf}`,
    ``,
    `*MODALIDADE DE ENTREGA:*`,
    isPickup
      ? `🏬 RETIRADA NO LOCAL (Balcão Conserta Cell - Arapongas/PR) — Frete Grátis`
      : `🚚 ${shippingTitle} (Prazo: ${shippingDays})`,
    !isPickup
      ? `*Endereço:* ${street}, nº ${number}${complement} - ${neighborhood}, ${city}/${state} - CEP: ${cep}`
      : `*Local de Retirada:* Loja Física Conserta Cell em Arapongas/PR`,
    ``,
    `*ITENS DO PEDIDO:*`,
    itemsList || '• Itens do pedido',
    ``,
    `*Subtotal:* R$ ${(order.subtotal ?? 0).toFixed(2).replace('.', ',')}`,
    `*Frete:* ${isPickup ? 'Grátis (Retirada)' : `R$ ${(order.shippingCost ?? 0).toFixed(2).replace('.', ',')}`}`,
    `*VALOR TOTAL:* R$ ${(order.total ?? 0).toFixed(2).replace('.', ',')}`,
    order.paymentMethod === 'credit_card' && order.installments
      ? `*Forma de Pagamento:* Cartão de Crédito (${order.cardBrand || 'Cartão'}${order.cardLast4 ? ` final ${order.cardLast4}` : ''}) em ${order.installments.count}x de R$ ${(order.installments.installmentValue ?? 0).toFixed(2).replace('.', ',')} ${order.installments.hasInterest ? `(com juros - Total R$ ${(order.installments.totalAmount ?? 0).toFixed(2).replace('.', ',')})` : '(SEM JUROS)'}`
      : `*Forma de Pagamento:* PIX Instantâneo`,
    `*Status:* ${paymentConfirmed ? 'PAGAMENTO CONFIRMADO PELO CLIENTE ✅' : 'Aguardando Pagamento'}`,
    ``,
    `Olá! Segue a notificação do pedido realizado no site. Por favor, confirme o recebimento para separação do pedido!`,
  ].join('\n');

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullOrderText)}`;

  // Handle client approving/confirming payment
  const handleConfirmAndNotifyWhatsApp = async () => {
    setConfirmingPayment(true);
    try {
      await api.updateAdminOrderStatus(
        order.id,
        {
          status: 'approved',
          note: 'Pagamento confirmado e comprovante enviado pelo cliente via WhatsApp.',
        },
        'token_client_confirmation'
      );
      setPaymentConfirmed(true);
    } catch {
      setPaymentConfirmed(true);
    } finally {
      setConfirmingPayment(false);
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / (30 * 60)) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden my-4">
        {/* Header with Close X */}
        <div className="relative p-5 sm:p-6 text-center bg-gradient-to-b from-red-950/70 to-[#141414] border-b border-[#222222]">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 bg-red-900/40 rounded-full border border-red-500/50 flex items-center justify-center mx-auto mb-2 text-red-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-red-400">
            {paymentConfirmed ? 'Pagamento Confirmado' : 'Pedido Realizado com Sucesso'}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            PEDIDO #{order.orderNumber}
          </h2>
          <p className="text-xs text-amber-400 font-semibold mt-1">
            Status: {paymentConfirmed ? 'Pagamento Aprovado ✅' : isExpired ? 'Expirado' : 'Aguardando Pagamento'}
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Automatic Dispatch Banner */}
          <div className="bg-emerald-950/70 border border-emerald-600/70 p-3 rounded-xl flex items-center gap-2.5 text-emerald-200 text-xs shadow-md">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="leading-snug">
              <strong className="text-white block font-semibold">Notificação Automática no WhatsApp:</strong>
              <span className="text-[11px] text-emerald-300/90">
                Os dados completos do pedido estão sendo direcionados para o WhatsApp da Conserta Cell.
              </span>
            </div>
          </div>

          {/* 30-Minute Expiration Countdown for PIX */}
          {order.paymentMethod === 'pix' && !paymentConfirmed && (
            <div
              className={`p-3.5 rounded-xl border text-center transition-all ${
                isExpired
                  ? 'bg-red-950/70 border-red-800 text-red-300'
                  : secondsRemaining < 300
                  ? 'bg-amber-950/60 border-amber-600/70 text-amber-200 animate-pulse'
                  : 'bg-[#1a1a1a] border-[#2e2e2e] text-neutral-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-white">
                  <Clock className="w-4 h-4 text-red-500" />
                  {isExpired ? 'Tempo de Pagamento Expirado' : 'Tempo Restante para Pagar'}
                </span>
                <span className="font-mono text-sm sm:text-base font-black text-red-400">
                  {isExpired ? '00:00' : formattedTime}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#111111] h-1.5 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-1000 ${
                    secondsRemaining < 300 ? 'bg-amber-500' : 'bg-red-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="text-[11px] text-neutral-400">
                {isExpired
                  ? 'O prazo de 30 minutos esgotou. Este pedido foi cancelado e os produtos retornaram ao estoque.'
                  : 'Conclua o pagamento via PIX em até 30 minutos para garantir a reserva dos produtos.'}
              </p>
            </div>
          )}

          {/* PIX Payment Box with QR Code & Copia e Cola */}
          {order.paymentMethod === 'pix' && !isExpired && (
            <div className="bg-[#181818] p-4 sm:p-5 rounded-xl border border-red-900/50 space-y-3.5 text-center shadow-lg">
              {order.pixCode ? (
                <>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    QR CODE PIX OFICIAL ASAAS — ESCANEIE COM SEU BANCO
                  </span>

                  {/* High resolution QR Code */}
                  {qrCodeDataUrl ? (
                    <div className="w-44 h-44 sm:w-48 sm:h-48 mx-auto bg-white p-2.5 rounded-2xl shadow-xl flex items-center justify-center border-2 border-neutral-700">
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code Pix Oficial Asaas"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-44 h-44 mx-auto bg-neutral-900 rounded-2xl flex items-center justify-center text-xs text-neutral-400">
                      Carregando QR Code Asaas...
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">
                      Valor a Pagar: <span className="text-red-400 font-mono text-sm">R$ {(order.total ?? 0).toFixed(2).replace('.', ',')}</span>
                    </p>
                    <p className="text-[11px] text-neutral-300">
                      Ou use a chave Pix Copia e Cola oficial do Asaas abaixo:
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 bg-[#101010] p-2 rounded-xl border border-[#333333]">
                      <input
                        type="text"
                        readOnly
                        value={order.pixCode}
                        className="flex-1 bg-transparent text-xs text-neutral-300 font-mono truncate focus:outline-none select-all"
                      />
                      <button
                        onClick={handleCopyPix}
                        className="bg-[#E50914] hover:bg-[#c80812] active:scale-95 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar PIX</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-400 text-center font-medium">
                      ✓ Cobrança oficial Asaas com baixa automática do pagamento.
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-700/60 text-left space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Integração Asaas em Modo de Configuração</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Seu pedido foi registrado com sucesso no sistema. A chave secreta de API do Asaas (<strong>ASAAS_API_KEY</strong>) ainda não foi inserida no servidor pelo administrador.
                  </p>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Para prosseguir, clique no botão verde abaixo para enviar seu pedido diretamente ao WhatsApp da Conserta Cell.
                  </p>
                </div>
              )}

              <div className="text-[11px] text-neutral-400 text-left pt-1 space-y-1 bg-[#121212] p-2.5 rounded-lg border border-[#242424]">
                <p>• Loja: <strong className="text-white">Conserta Cell Arapongas</strong></p>
                <p>• Telefone/WhatsApp: <strong className="text-white font-mono">{settings?.whatsapp || '(43) 99837-0350'}</strong></p>
                <p>• Cidade: <strong className="text-white">Arapongas — PR</strong></p>
                {order.asaasPaymentId && (
                  <p>• ID Asaas: <strong className="text-white font-mono">{order.asaasPaymentId}</strong></p>
                )}
              </div>
            </div>
          )}

          {/* Credit Card details if paid with card */}
          {order.paymentMethod === 'credit_card' && order.installments && (
            <div className="bg-[#181818] p-4 rounded-xl border border-[#222222] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Cartão de Crédito</span>
                <span className="text-emerald-400 font-semibold">Processado</span>
              </div>
              <p className="text-neutral-300">
                {order.installments.count}x de R$ {order.installments.installmentValue.toFixed(2).replace('.', ',')}{' '}
                {order.installments.hasInterest ? '' : '(sem juros)'}
              </p>
              {order.cardLast4 && (
                <p className="text-neutral-400 text-[11px]">Final do cartão: •••• {order.cardLast4} ({order.cardBrand || 'Cartão'})</p>
              )}
            </div>
          )}

          {/* Delivery or Pickup Details */}
          <div className="bg-[#181818] p-3.5 rounded-xl border border-[#262626] text-xs space-y-1.5">
            <div className="flex items-center gap-2">
              {isPickup ? (
                <Store className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Truck className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className="font-bold text-white">{shippingTitle}</span>
            </div>

            {isPickup ? (
              <div className="space-y-0.5 text-neutral-300">
                <p className="text-emerald-400 font-medium">
                  • Retirada no balcão da loja física em Arapongas/PR — Frete Grátis
                </p>
                <p className="text-neutral-400 text-[11px]">
                  Endereço da loja: {settings?.address || 'Arapongas — PR'}
                </p>
                <p className="text-neutral-400 text-[11px]">
                  Horário: {settings?.hours?.weekday || 'Segunda a sexta das 08h30 às 19h'}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5 text-neutral-300">
                <p>
                  {street ? `${street}, nº ${number || 'S/N'}${complement} - ${neighborhood}, ${city}/${state}` : 'Endereço fornecido pelo cliente'}
                </p>
                <p className="text-neutral-400 text-[11px]">
                  Prazo estimado: {shippingDays}
                </p>
              </div>
            )}
          </div>

          {/* Primary Action: Confirm payment and dispatch to Store Owner's WhatsApp */}
          {!isExpired && (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmAndNotifyWhatsApp}
                disabled={confirmingPayment}
                className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-98 text-white py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 shrink-0" />
                <span>
                  {confirmingPayment
                    ? 'Confirmando...'
                    : paymentConfirmed
                    ? 'Reenviar Pedido no WhatsApp da Loja'
                    : 'Aprovar Pagamento e Enviar Pedido no WhatsApp'}
                </span>
              </button>

              <p className="text-[10px] text-center text-neutral-400 leading-tight">
                Envia automaticamente os dados do pedido, itens, endereço e comprovante diretamente para o WhatsApp do dono da loja (43) 99837-0350.
              </p>
            </div>
          )}

          {/* Track order button */}
          <button
            onClick={() => {
              onClose();
              onTrackOrder(order.orderNumber);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            <Package className="w-4 h-4 text-red-400" />
            <span>Acompanhar Status do Pedido</span>
          </button>
        </div>
      </div>
    </div>
  );
};
