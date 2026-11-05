import crypto from 'node:crypto';
import type { CustomerInfo, InstallmentPlan } from '../src/types/index.ts';

export interface AsaasConfig {
  apiKey?: string;
  environment?: 'sandbox' | 'production';
  webhookAccessToken?: string;
}

export interface AsaasPixResult {
  paymentId: string;
  customerId: string;
  status: string;
  pixCode: string;
  pixQrCodeBase64: string;
  invoiceUrl?: string;
  expirationDate?: string;
}

export interface AsaasCardResult {
  paymentId: string;
  customerId: string;
  status: string;
  cardBrand: string;
  cardLast4: string;
  invoiceUrl?: string;
}

export class AsaasService {
  private getEffectiveConfig(customConfig?: AsaasConfig): {
    apiKey: string;
    environment: 'sandbox' | 'production';
    baseUrl: string;
    webhookToken: string;
  } {
    const apiKey = (
      process.env.ASAAS_API_KEY ||
      customConfig?.apiKey ||
      ''
    ).trim();

    const envFromConfig = customConfig?.environment || process.env.ASAAS_ENVIRONMENT;
    // Auto-detect production vs sandbox or use setting
    const environment: 'sandbox' | 'production' =
      envFromConfig === 'production' ? 'production' : 'sandbox';

    const baseUrl =
      environment === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/api/v3';

    const webhookToken = (
      process.env.ASAAS_WEBHOOK_TOKEN ||
      customConfig?.webhookAccessToken ||
      ''
    ).trim();

    return { apiKey, environment, baseUrl, webhookToken };
  }

  public isConfigured(customConfig?: AsaasConfig): boolean {
    const { apiKey } = this.getEffectiveConfig(customConfig);
    return Boolean(apiKey && apiKey.length > 10);
  }

  public getEnvironment(customConfig?: AsaasConfig): 'sandbox' | 'production' {
    return this.getEffectiveConfig(customConfig).environment;
  }

  public maskApiKey(apiKey?: string): string {
    const key = apiKey || process.env.ASAAS_API_KEY || '';
    if (!key || key.length < 8) return '';
    const prefix = key.substring(0, 6);
    const suffix = key.substring(key.length - 4);
    return `${prefix}••••••••${suffix}`;
  }

  public verifyWebhookToken(
    providedHeaderToken?: string,
    customConfig?: AsaasConfig
  ): boolean {
    const { webhookToken } = this.getEffectiveConfig(customConfig);
    // If no webhook token is configured yet, accept notifications in setup mode with warning
    if (!webhookToken) {
      return true;
    }
    if (!providedHeaderToken) {
      return false;
    }
    try {
      return (
        providedHeaderToken.trim() === webhookToken ||
        crypto.timingSafeEqual(
          Buffer.from(providedHeaderToken.trim()),
          Buffer.from(webhookToken)
        )
      );
    } catch {
      return providedHeaderToken.trim() === webhookToken;
    }
  }

  /**
   * Find existing Asaas customer by CPF or create a new one
   */
  public async findOrCreateCustomer(
    customer: CustomerInfo,
    customConfig?: AsaasConfig
  ): Promise<string> {
    const { apiKey, baseUrl } = this.getEffectiveConfig(customConfig);
    if (!apiKey) {
      throw new Error(
        'Chave de API do Asaas não configurada no servidor (ASAAS_API_KEY).'
      );
    }

    const cleanCpf = customer.cpf.replace(/\D/g, '');
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const cleanCep = (customer.cep || '86700000').replace(/\D/g, '');

    // 1. Check if customer already exists by CPF
    try {
      const searchRes = await fetch(
        `${baseUrl}/customers?cpfCnpj=${cleanCpf}`,
        {
          headers: {
            access_token: apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (
          Array.isArray(searchData.data) &&
          searchData.data.length > 0 &&
          searchData.data[0].id
        ) {
          return searchData.data[0].id;
        }
      }
    } catch (err) {
      console.warn('[Asaas] Falha ao consultar cliente por CPF, tentando criação:', err);
    }

    // 2. Create customer if not found
    const payload = {
      name: customer.fullName.trim(),
      cpfCnpj: cleanCpf,
      email: customer.email.trim(),
      phone: cleanPhone,
      mobilePhone: cleanPhone,
      postalCode: cleanCep,
      address: customer.street || 'Arapongas',
      addressNumber: customer.number || 'SN',
      complement: customer.complement || '',
      province: customer.neighborhood || 'Centro',
      externalReference: cleanCpf,
      notificationDisabled: false,
    };

    const createRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      const errMessage =
        errData?.errors?.[0]?.description ||
        `Falha ao cadastrar cliente no Asaas (HTTP ${createRes.status})`;
      throw new Error(errMessage);
    }

    const newCustomer = await createRes.json();
    return newCustomer.id;
  }

  /**
   * Create official PIX charge with Asaas and retrieve real QR Code and Copia e Cola
   */
  public async createPixCharge(params: {
    customer: CustomerInfo;
    amount: number;
    orderNumber: string;
    customConfig?: AsaasConfig;
  }): Promise<AsaasPixResult> {
    const { apiKey, baseUrl } = this.getEffectiveConfig(params.customConfig);
    if (!apiKey) {
      throw new Error(
        'Chave de API do Asaas não configurada no servidor (ASAAS_API_KEY).'
      );
    }

    const customerId = await this.findOrCreateCustomer(
      params.customer,
      params.customConfig
    );

    // Due date: Today (YYYY-MM-DD)
    const dueDate = new Date().toISOString().split('T')[0];

    const paymentPayload = {
      customer: customerId,
      billingType: 'PIX',
      value: Number(params.amount.toFixed(2)),
      dueDate,
      description: `Pedido ${params.orderNumber} - Conserta Cell Arapongas`,
      externalReference: params.orderNumber,
    };

    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    });

    if (!paymentRes.ok) {
      const errData = await paymentRes.json().catch(() => ({}));
      const errMsg =
        errData?.errors?.[0]?.description ||
        `Erro ao gerar cobrança PIX no Asaas (HTTP ${paymentRes.status})`;
      throw new Error(errMsg);
    }

    const paymentData = await paymentRes.json();
    const paymentId = paymentData.id;

    // Immediately fetch real PIX QR Code & Copia e Cola payload
    const qrRes = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!qrRes.ok) {
      throw new Error(
        'Cobrança PIX gerada no Asaas, mas houve falha ao obter o QR Code oficial.'
      );
    }

    const qrData = await qrRes.json();
    let qrImageBase64 = qrData.encodedImage || '';
    if (qrImageBase64 && !qrImageBase64.startsWith('data:image')) {
      qrImageBase64 = `data:image/png;base64,${qrImageBase64}`;
    }

    return {
      paymentId,
      customerId,
      status: paymentData.status || 'PENDING',
      pixCode: qrData.payload || '',
      pixQrCodeBase64: qrImageBase64,
      invoiceUrl: paymentData.invoiceUrl,
      expirationDate: qrData.expirationDate,
    };
  }

  /**
   * Process Credit Card payment securely through Asaas
   * NEVER saves card number or CCV
   */
  public async createCreditCardCharge(params: {
    customer: CustomerInfo;
    orderNumber: string;
    totalAmount: number;
    installments?: InstallmentPlan;
    creditCard: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
    customConfig?: AsaasConfig;
  }): Promise<AsaasCardResult> {
    const { apiKey, baseUrl } = this.getEffectiveConfig(params.customConfig);
    if (!apiKey) {
      throw new Error(
        'Chave de API do Asaas não configurada no servidor (ASAAS_API_KEY).'
      );
    }

    const customerId = await this.findOrCreateCustomer(
      params.customer,
      params.customConfig
    );

    const cleanCardNumber = params.creditCard.number.replace(/\D/g, '');
    const cardLast4 = cleanCardNumber.slice(-4);
    const dueDate = new Date().toISOString().split('T')[0];

    // Format expiry year to 4 digits if 2 digits provided (e.g. 28 -> 2028)
    let year = params.creditCard.expiryYear.trim();
    if (year.length === 2) {
      year = `20${year}`;
    }

    const installmentCount = params.installments?.count || 1;
    const finalAmount =
      params.installments?.totalAmount || params.totalAmount;

    const payload: Record<string, any> = {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: Number(finalAmount.toFixed(2)),
      dueDate,
      description: `Pedido ${params.orderNumber} - Conserta Cell Arapongas`,
      externalReference: params.orderNumber,
      creditCard: {
        holderName: params.creditCard.holderName.trim().toUpperCase(),
        number: cleanCardNumber,
        expiryMonth: params.creditCard.expiryMonth.padStart(2, '0'),
        expiryYear: year,
        ccv: params.creditCard.ccv.trim(),
      },
      creditCardHolderInfo: {
        name: params.creditCard.holderName.trim().toUpperCase(),
        email: params.customer.email.trim(),
        cpfCnpj: params.customer.cpf.replace(/\D/g, ''),
        postalCode: (params.customer.cep || '86700000').replace(/\D/g, ''),
        addressNumber: params.customer.number || 'SN',
        addressComplement: params.customer.complement || '',
        phone: params.customer.phone.replace(/\D/g, ''),
        mobilePhone: params.customer.phone.replace(/\D/g, ''),
      },
    };

    if (installmentCount > 1) {
      payload.installmentCount = installmentCount;
      payload.installmentValue = Number(
        (finalAmount / installmentCount).toFixed(2)
      );
    }

    const response = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // CRITICAL SECURITY: Immediately wipe card payload from local variables
    delete payload.creditCard;

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg =
        errData?.errors?.[0]?.description ||
        `Pagamento com cartão recusado pelo Asaas (HTTP ${response.status})`;
      throw new Error(errMsg);
    }

    const data = await response.json();

    return {
      paymentId: data.id,
      customerId,
      status: data.status, // CONFIRMED, RECEIVED, etc.
      cardBrand: data.creditCard?.creditCardBrand || 'Cartão',
      cardLast4: data.creditCard?.creditCardNumber || cardLast4,
      invoiceUrl: data.invoiceUrl,
    };
  }

  /**
   * Check status of a payment directly with Asaas
   */
  public async getPaymentStatus(
    paymentId: string,
    customConfig?: AsaasConfig
  ): Promise<{ id: string; status: string; value: number; dateCreated: string }> {
    const { apiKey, baseUrl } = this.getEffectiveConfig(customConfig);
    if (!apiKey) {
      throw new Error('Chave de API do Asaas não configurada.');
    }

    const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(
        `Cobrança ${paymentId} não localizada no Asaas (HTTP ${res.status})`
      );
    }

    const data = await res.json();
    return {
      id: data.id,
      status: data.status,
      value: data.value,
      dateCreated: data.dateCreated,
    };
  }

  /**
   * Installments calculation helper shared between frontend and backend
   */
  public calculateInstallmentPlan(
    total: number,
    installmentsCount: number,
    maxInterestFree = 3,
    maxInstallments = 21,
    monthlyRatePercent = 1.99
  ): InstallmentPlan {
    const count = Math.min(
      maxInstallments,
      Math.max(1, installmentsCount || 1)
    );
    const hasInterest = count > maxInterestFree;
    const rate = monthlyRatePercent / 100;

    let totalAmount = total;
    if (hasInterest) {
      totalAmount = total * Math.pow(1 + rate, count);
    }

    const installmentValue = Number((totalAmount / count).toFixed(2));

    return {
      count,
      installmentValue,
      totalAmount: Number(totalAmount.toFixed(2)),
      hasInterest,
      interestRate: hasInterest ? monthlyRatePercent : 0,
    };
  }
}

export const asaasService = new AsaasService();
