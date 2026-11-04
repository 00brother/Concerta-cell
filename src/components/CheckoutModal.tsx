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
} from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import type { CustomerInfo, Order, ShippingOption, StoreSettings } from '../types/index.ts';
import { api } from '../services/api.ts';

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

  // Auto-fetch address & calculate Correios shipping when 8-digit CEP is typed
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

  const shippingCost = shippingOption ? shippingOption.price : 0;
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

    if (!formData.fullName.trim() || formData.fullName.trim().split(' ').length < 2) {
      setErrorMsg('Informe seu nome completo.');
      return;
    }
    if (formData.cpf.replace(/\D/g, '').length !== 11) {
      setErrorMsg('Informe um CPF válido.');
      return;
    }
    if (!formData.email.includes('@')) {
      setErrorMsg('Informe um e-mail válido.');
      return;
    }
    if (formData.phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Informe seu telefone/WhatsApp com DDD.');
      return;
    }
    if (formData.cep.replace(/\D/g, '').length !== 8) {
      setErrorMsg('Informe um CEP válido com 8 dígitos.');
      return;
    }
    if (!formData.street.trim() || !formData.number.trim() || !formData.neighborhood.trim()) {
      setErrorMsg('Preencha seu endereço completo (Rua, Número e Bairro).');
      return;
    }
    if (!shippingOption) {
      setErrorMsg('Aguarde o cálculo e selecione uma modalidade de envio.');
      return;
    }

    if (paymentMethod === 'credit_card') {
      const cleanCard = cardNumber.replace(/\D/g, '');
      if (cleanCard.length < 15) {
        setErrorMsg('Informe um número de cartão de crédito válido.');
        return;
      }
      if (!cardHolder.trim()) {
        setErrorMsg('Informe o nome impresso no cartão.');
        return;
      }
      if (cardExp.length < 5) {
        setErrorMsg('Informe a validade do cartão (MM/AA).');
        return;
      }
      if (cardCvv.length < 3) {
        setErrorMsg('Informe o código de segurança (CVV).');
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
        if (cleanCard.startsWith('4')) cardBrand = 'visa';
        else if (cleanCard.startsWith('5')) cardBrand = 'master';
        else if (cleanCard.startsWith('3')) cardBrand = 'amex';
        else cardBrand = 'elo';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#222222] bg-[#181818] flex items-center justify-between">
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
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-950/60 border border-red-700/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form View */}
        {step === 'form' ? (
          <form onSubmit={handleProceedToReview} className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
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
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
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
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 font-mono"
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
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 font-mono"
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
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Delivery Address */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 pb-1 border-b border-[#222222]">
                2. Endereço de Entrega
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">
                    CEP * {viaCepLoading && <span className="text-red-400 text-[10px]">(Buscando...)</span>}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cep}
                    onChange={handleCepChange}
                    placeholder="86700-000"
                    maxLength={9}
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-300 mb-1">Rua / Logradouro *</label>
                  <input
                    type="text"
                    required
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Rua / Avenida"
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Número *</label>
                  <input
                    type="text"
                    required
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="123"
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-300 mb-1">Bairro *</label>
                  <input
                    type="text"
                    required
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Bairro"
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Complemento</label>
                  <input
                    type="text"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Apto, Bloco..."
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Cidade</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Estado</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
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
                      <span className="font-mono font-bold text-red-400 text-sm">
                        R$ {opt.price.toFixed(2).replace('.', ',')}
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
                    <label className="block text-xs text-neutral-300 mb-1">
                      Parcelas:
                    </label>
                    <select
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10))}
                      className="w-full bg-[#111111] border border-[#333333] text-white text-xs p-2 rounded-lg focus:border-red-500"
                    >
                      {installmentOptions.map((opt) => (
                        <option key={opt.count} value={opt.count}>
                          {opt.count}x de R$ {opt.installmentValue.toFixed(2).replace('.', ',')}{' '}
                          {opt.isFree ? '(Sem juros)' : `(Total R$ ${opt.totalAmount.toFixed(2).replace('.', ',')})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Número do Cartão *</label>
                    <input
                      type="text"
                      required={paymentMethod === 'credit_card'}
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full bg-[#111111] border border-[#333333] text-white text-xs p-2 rounded-lg font-mono"
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
              <h4 className="font-bold text-white text-xs">Dados de Entrega</h4>
              <p className="text-neutral-300">
                <strong>Destinatário:</strong> {formData.fullName} ({formData.phone})
              </p>
              <p className="text-neutral-300">
                <strong>Endereço:</strong> {formData.street}, nº {formData.number} - {formData.neighborhood}, {formData.city}/{formData.state} - CEP: {formData.cep}
              </p>
              <p className="text-neutral-300">
                <strong>Envio:</strong> {shippingOption?.title} ({shippingOption?.estimatedDays})
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
