import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  ShieldCheck,
  ArrowRight,
  Truck,
  CreditCard,
  QrCode,
  AlertCircle,
  Loader2,
  Lock,
  Store,
} from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import type { CustomerInfo, Order, ShippingOption, StoreSettings } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  validateCPF,
  validateFullName,
  validateEmail,
  validatePhone,
  validateLuhn,
  validateCardExpiry,
} from '../utils/validation.ts';

interface CheckoutModalProps {
  settings: StoreSettings | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  settings,
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const { cart, subtotal, shippingOption, setShippingOption, shippingCep, clearCart } = useCart();

  const [step, setStep] = useState<'form' | 'review'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [viaCepLoading, setViaCepLoading] = useState(false);

  // Customer & Address Form
  const [formData, setFormData] = useState<CustomerInfo>({
    fullName: '',
    cpf: '',
    email: '',
    phone: '',
    cep: shippingCep || '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'Arapongas',
    state: 'PR',
  });

  // Shipping
  const [availableShipping, setAvailableShipping] = useState<ShippingOption[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [installmentsCount, setInstallmentsCount] = useState(1);

  // Credit Card fields (for tokenization - never stored raw)
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Auto-fetch address & calculate shipping when 8-digit CEP is typed or on modal open
  useEffect(() => {
    const cleanCep = formData.cep.replace(/\D/g, '') || '86700000';
    fetchShippingOptions(cleanCep);
  }, []);

  useEffect(() => {
    const cleanCep = formData.cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      lookupCep(cleanCep);
      fetchShippingOptions(cleanCep);
    }
  }, [formData.cep]);

  const lookupCep = async (cleanCep: string) => {
    setViaCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch {
      // Fallback to manual address input
    } finally {
      setViaCepLoading(false);
    }
  };

  const fetchShippingOptions = async (cleanCep: string) => {
    setShippingLoading(true);
    try {
      const itemsPayload = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));
      const res = await api.calculateShipping(cleanCep, itemsPayload);
      setAvailableShipping(res.options);
      if (res.options.length > 0) {
        // Auto select current or first available
        const exists = res.options.find((o) => o.id === shippingOption?.id);
        setShippingOption(exists || res.options[0]);
      }
    } catch (e) {
      console.error('Falha ao calcular frete:', e);
    } finally {
      setShippingLoading(false);
    }
  };

  // Mask helpers
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.substring(0, 11);
    val = val
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setFormData((prev) => ({ ...prev, cpf: val }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.substring(0, 11);
    val = val
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2');
    setFormData((prev) => ({ ...prev, phone: val }));
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.substring(0, 8);
    val = val.replace(/(\d{5})(\d)/, '$1-$2');
    setFormData((prev) => ({ ...prev, cep: val }));
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 16) val = val.substring(0, 16);
    val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(val);
  };

  const handleCardExpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.substring(0, 4);
    if (val.length >= 2) val = `${val.substring(0, 2)}/${val.substring(2)}`;
    setCardExp(val);
  };

  const detectBrand = (num: string): string => {
    const clean = num.replace(/\D/g, '');
    if (/^4/.test(clean)) return 'Visa';
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'Mastercard';
    if (/^(4011|438935|504175|451416|636297|5067|4576|6504|6509|5090)/.test(clean)) return 'Elo';
    if (/^(606282|3841)/.test(clean)) return 'Hipercard';
    if (/^3[47]/.test(clean)) return 'Amex';
    return '';
  };

  const detectedBrand = detectBrand(cardNumber);
  const shippingCost = shippingOption?.price || 0;
  const isPickup = shippingOption?.id === 'pickup';
  const grandTotal = subtotal + shippingCost;

  // Installment calculations: up to 3x sem juros, up to 21x with monthly rate
  const maxInterestFree = settings?.payment.maxInterestFree || 3;
  const maxInstallments = settings?.payment.maxInstallments || 21;
  const monthlyRate = (settings?.payment.interestRateMonthly || 1.99) / 100;

  const installmentOptions = Array.from({ length: maxInstallments }, (_, idx) => {
    const count = idx + 1;
    const isFree = count <= maxInterestFree;
    let totalWithInterest = grandTotal;
    if (!isFree) {
      totalWithInterest = grandTotal * Math.pow(1 + monthlyRate, count);
    }
    const val = totalWithInterest / count;
    return {
      count,
      isFree,
      installmentValue: val,
      totalAmount: totalWithInterest,
    };
  });

  const selectedPlan =
    installmentOptions.find((p) => p.count === installmentsCount) || installmentOptions[0];

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Validação de Nome Completo
    const nameCheck = validateFullName(formData.fullName);
    if (!nameCheck.valid) {
      setErrorMsg(nameCheck.error || 'Informe seu nome e sobrenome completos.');
      return;
    }

    // 2. Validação Oficial de CPF (Módulo 11 com 2 dígitos verificadores)
    if (!validateCPF(formData.cpf)) {
      setErrorMsg('CPF inválido. Por favor, informe um CPF real com dígitos verificadores válidos.');
      return;
    }

    // 3. Validação de E-mail
    if (!validateEmail(formData.email)) {
      setErrorMsg('E-mail inválido. Por favor, informe um e-mail válido (exemplo: seunome@gmail.com).');
      return;
    }

    // 4. Validação de Telefone / WhatsApp com DDD real do Brasil
    const phoneCheck = validatePhone(formData.phone);
    if (!phoneCheck.valid) {
      setErrorMsg(phoneCheck.error || 'Telefone/WhatsApp inválido. Informe o DDD e o número completo.');
      return;
    }

    if (!shippingOption) {
      setErrorMsg('Selecione uma modalidade de envio ou retirada.');
      return;
    }

    const isPickup = shippingOption?.id === 'pickup';

    if (isPickup) {
      // If customer chooses to pick up at the shop in Arapongas
      if (!formData.street.trim()) formData.street = 'Retirada no Balcão Conserta Cell';
      if (!formData.number.trim()) formData.number = 'Loja Física';
      if (!formData.neighborhood.trim()) formData.neighborhood = 'Centro';
      if (!formData.cep.trim()) formData.cep = '86700-000';
    } else {
      // 5. Validação de CEP para entrega
      const cleanCep = formData.cep.replace(/\D/g, '');
      if (cleanCep.length !== 8 || /^(\d)\1{7}$/.test(cleanCep)) {
        setErrorMsg('Informe um CEP válido com 8 dígitos numéricos para cálculo e entrega.');
        return;
      }

      // 6. Validação de Endereço Completo para entrega
      if (!formData.street.trim() || formData.street.trim().length < 3) {
        setErrorMsg('Informe o nome da sua rua ou avenida.');
        return;
      }
      if (!formData.number.trim()) {
        setErrorMsg('Informe o número do endereço (ou digite S/N se não houver número).');
        return;
      }
      if (!formData.neighborhood.trim() || formData.neighborhood.trim().length < 2) {
        setErrorMsg('Informe o bairro de entrega.');
        return;
      }
      if (!formData.city.trim() || !formData.state.trim()) {
        setErrorMsg('Cidade e Estado de entrega incompletos.');
        return;
      }
    }

    // 7. Validação de Cartão de Crédito (se selecionado)
    if (paymentMethod === 'credit_card') {
      const cleanCard = cardNumber.replace(/\D/g, '');
      if (!validateLuhn(cleanCard)) {
        setErrorMsg('Número de cartão de crédito inválido. Verifique os números digitados.');
        return;
      }
      const holderCheck = validateFullName(cardHolder);
      if (!holderCheck.valid) {
        setErrorMsg('Informe o nome completo impresso no cartão de crédito.');
        return;
      }
      const expCheck = validateCardExpiry(cardExp);
      if (!expCheck.valid) {
        setErrorMsg(expCheck.error || 'Data de validade do cartão inválida.');
        return;
      }
      if (cardCvv.length < 3 || cardCvv.length > 4) {
        setErrorMsg('Informe o código de segurança (CVV) com 3 ou 4 dígitos.');
        return;
      }
    }

    setStep('review');
  };

  const handleFinalizeOrder = async () => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      // Safe card tokenization simulation / client token
      let cardToken = undefined;
      let cardLast4 = undefined;
      let cardBrand = 'visa';

      if (paymentMethod === 'credit_card') {
        const cleanCard = cardNumber.replace(/\D/g, '');
        cardLast4 = cleanCard.substring(cleanCard.length - 4);
        cardBrand = detectedBrand ? detectedBrand.toLowerCase() : 'master';

        // Generate secure client-side token reference (never sending raw card to database)
        cardToken = `tok_${crypto.randomUUID().replace(/-/g, '')}`;
      }

      const payload = {
        customer: formData,
        items: cart.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          price:
            i.product.promotionalPrice && i.product.promotionalPrice > 0
              ? i.product.promotionalPrice
              : i.product.price,
          quantity: i.quantity,
        })),
        shippingOptionId: shippingOption?.id,
        paymentMethod,
        installmentsCount: paymentMethod === 'credit_card' ? installmentsCount : 1,
        cardToken,
        cardLast4,
        cardBrand,
      };

      const order = await api.createOrder(payload);
      clearCart();
      onOrderSuccess(order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao concluir pedido. Tente novamente.');
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 sm:backdrop-blur-md overflow-hidden">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] max-w-xl bg-[#141414] border-0 sm:border border-[#262626] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#222222] bg-[#181818] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-500" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              {step === 'form' ? 'Finalizar Pedido — Conserta Cell' : 'Confirmar Pedido'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-950/60 border border-red-700/80 rounded-xl text-red-200 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form View */}
        {step === 'form' ? (
          <form onSubmit={handleProceedToReview} className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto overscroll-contain">
            {/* 1. Customer Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 pb-1 border-b border-[#222222]">
                1. Seus Dados
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-300 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Nome e Sobrenome"
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">CPF *</label>
                  <input
                    type="text"
                    required
                    value={formData.cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(43) 90000-0000"
                    maxLength={15}
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-300 mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seuemail@exemplo.com"
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Delivery Address or In-Store Pickup */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#222222]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-500">
                  2. {isPickup ? 'Local de Retirada' : 'Endereço de Entrega'}
                </h3>
                {isPickup && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    <span>Retirada no Balcão · Frete Grátis</span>
                  </span>
                )}
              </div>

              {isPickup ? (
                <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Store className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-white text-xs sm:text-sm">
                        Balcão da Loja Física Conserta Cell
                      </p>
                      <p className="text-neutral-300">
                        {settings?.address || 'Rua das Pombas, 456 - Centro, Arapongas/PR'}
                      </p>
                      <p className="text-emerald-400 font-semibold text-[11px]">
                        ✓ Pronto para retirada em até 2 horas úteis após a confirmação.
                      </p>
                      <p className="text-neutral-400 text-[10px] leading-relaxed">
                        Não é necessário preencher endereço residencial. Ao comparecer na loja, basta apresentar seu documento com foto ou o número do pedido gerado.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">
                      CEP * {viaCepLoading && <span className="text-red-400 text-[10px]">(Buscando...)</span>}
                    </label>
                    <input
                      type="text"
                      required={!isPickup}
                      value={formData.cep}
                      onChange={handleCepChange}
                      placeholder="86700-000"
                      maxLength={9}
                      className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs text-neutral-300 mb-1">Rua / Logradouro *</label>
                    <input
                      type="text"
                      required={!isPickup}
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="Rua / Avenida"
                      className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Número *</label>
                    <input
                      type="text"
                      required={!isPickup}
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="123"
                      className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs text-neutral-300 mb-1">Bairro *</label>
                    <input
                      type="text"
                      required={!isPickup}
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      placeholder="Bairro"
                      className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      placeholder="Apto, Bloco..."
                      className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Cidade *</label>
                    <input
                      type="text"
                      required={!isPickup}
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Estado *</label>
                    <input
                      type="text"
                      required={!isPickup}
                      maxLength={2}
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Automatic Shipping Options (Arapongas or Correios PAC / SEDEX) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 pb-1 border-b border-[#222222]">
                3. Modalidade de Envio
              </h3>
              {shippingLoading ? (
                <div className="p-3 bg-[#181818] rounded-xl text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                  Calculando opções de frete dos Correios...
                </div>
              ) : availableShipping.length === 0 ? (
                <p className="text-xs text-neutral-400">
                  Preencha o CEP acima para calcular o frete dos produtos.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableShipping.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        shippingOption?.id === opt.id
                          ? 'bg-red-950/40 border-red-500 text-white'
                          : 'bg-[#181818] border-[#2a2a2a] text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping_modal"
                          checked={shippingOption?.id === opt.id}
                          onChange={() => setShippingOption(opt)}
                          className="accent-red-600 w-4 h-4"
                        />
                        <div>
                          <p className="font-bold text-white text-xs sm:text-sm">{opt.title}</p>
                          <p className="text-emerald-400 text-[11px] font-medium">Prazo: {opt.estimatedDays}</p>
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-sm ${opt.price === 0 ? 'text-emerald-400 font-extrabold' : 'text-red-400'}`}>
                        {opt.price === 0 ? 'GRÁTIS' : `R$ ${opt.price.toFixed(2).replace('.', ',')}`}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Payment Method: PIX or Credit Card */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 pb-1 border-b border-[#222222]">
                4. Forma de Pagamento
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'bg-red-950/40 border-red-500 text-white'
                      : 'bg-[#181818] border-[#2a2a2a] text-neutral-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-5 h-5 mb-1 text-emerald-400" />
                  <span>PIX Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'credit_card'
                      ? 'bg-red-950/40 border-red-500 text-white'
                      : 'bg-[#181818] border-[#2a2a2a] text-neutral-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mb-1 text-red-400" />
                  <span>Cartão de Crédito</span>
                </button>
              </div>

              {/* Secure Credit Card Form & Installment selector */}
              {paymentMethod === 'credit_card' && (
                <div className="p-3.5 bg-[#181818] rounded-xl border border-[#2a2a2a] space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-neutral-300 font-medium">Parcelamento no Cartão:</label>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded">
                        Até 3x Sem Juros · Até 21x
                      </span>
                    </div>
                    <select
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10))}
                      className="w-full bg-[#111111] border border-[#333333] text-white text-xs p-2.5 rounded-lg focus:border-red-500 cursor-pointer"
                    >
                      {installmentOptions.map((opt) => (
                        <option key={opt.count} value={opt.count}>
                          {opt.count}x de R$ {opt.installmentValue.toFixed(2).replace('.', ',')}{' '}
                          {opt.isFree ? '— SEM JUROS' : `— Total R$ ${opt.totalAmount.toFixed(2).replace('.', ',')} (com juros)`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-neutral-300 font-medium">Número do Cartão *</label>
                      {detectedBrand && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-950/80 border border-red-800/60 px-2 py-0.5 rounded uppercase">
                          {detectedBrand}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required={paymentMethod === 'credit_card'}
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full bg-[#111111] border border-[#333333] text-white text-xs p-2.5 rounded-lg font-mono focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Nome impresso no Cartão *</label>
                    <input
                      type="text"
                      required={paymentMethod === 'credit_card'}
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      placeholder="NOME COMO NO CARTAO"
                      className="w-full bg-[#111111] border border-[#333333] text-white text-xs p-2 rounded-lg uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-300 mb-1">Validade *</label>
                      <input
                        type="text"
                        required={paymentMethod === 'credit_card'}
                        value={cardExp}
                        onChange={handleCardExpChange}
                        placeholder="MM/AA"
                        maxLength={5}
                        className="w-full bg-[#111111] border border-[#333333] text-white text-xs p-2 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-300 mb-1">CVV *</label>
                      <input
                        type="password"
                        required={paymentMethod === 'credit_card'}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className="w-full bg-[#111111] border border-[#333333] text-white text-xs p-2 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dados protegidos por tokenização segura.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Button */}
            <div className="pt-2 border-t border-[#222222]">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#E50914] hover:bg-[#c80812] text-white py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-red-950/60 cursor-pointer"
              >
                <span>Revisar e Pagar (R$ {grandTotal.toFixed(2).replace('.', ',')})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* Review Step */
          <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="bg-[#181818] p-3.5 rounded-xl border border-[#222222] text-xs space-y-1.5">
              <h4 className="font-bold text-white text-xs">
                {shippingOption?.id === 'pickup' ? 'Dados da Retirada' : 'Dados de Entrega'}
              </h4>
              <p className="text-neutral-300">
                <strong>Cliente:</strong> {formData.fullName} ({formData.phone})
              </p>
              {shippingOption?.id === 'pickup' ? (
                <p className="text-emerald-400 font-semibold">
                  <strong>Local:</strong> Balcão da Loja Física Conserta Cell — Arapongas/PR (Frete Grátis)
                </p>
              ) : (
                <p className="text-neutral-300">
                  <strong>Endereço:</strong> {formData.street}, nº {formData.number} - {formData.neighborhood}, {formData.city}/{formData.state} - CEP: {formData.cep}
                </p>
              )}
              <p className="text-neutral-300">
                <strong>Modalidade:</strong> {shippingOption?.title} ({shippingOption?.estimatedDays})
              </p>
            </div>

            <div className="bg-[#181818] p-3.5 rounded-xl border border-[#222222] text-xs space-y-1.5">
              <h4 className="font-bold text-white text-xs">Resumo de Valores</h4>
              <div className="flex justify-between text-neutral-300">
                <span>Produtos ({cart.length} itens)</span>
                <span className="font-mono text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Frete ({shippingOption?.title})</span>
                <span className="font-mono text-white">R$ {shippingCost.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-neutral-800">
                <span>Total a Pagar</span>
                <span className="font-mono text-red-500">
                  {paymentMethod === 'credit_card'
                    ? `R$ ${selectedPlan.totalAmount.toFixed(2).replace('.', ',')}`
                    : `R$ ${grandTotal.toFixed(2).replace('.', ',')}`}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {paymentMethod === 'pix'
                  ? 'Pagamento via PIX instantâneo'
                  : `Cartão de crédito em ${selectedPlan.count}x de R$ ${selectedPlan.installmentValue.toFixed(2).replace('.', ',')} ${selectedPlan.isFree ? '(sem juros)' : ''}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('form')}
                disabled={submitting}
                className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleFinalizeOrder}
                disabled={submitting}
                className="flex items-center justify-center gap-1.5 bg-[#E50914] hover:bg-[#c80812] text-white py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Concluindo...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirmar Pedido</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
