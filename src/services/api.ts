import type {
  Product,
  StoreSettings,
  ShippingOption,
  Order,
  OrderStatus,
  AuditLog,
} from '../types/index.ts';
import { cloudDb } from './firebase.ts';
import {
  validateCPF,
  validateFullName,
  validateEmail,
  validatePhone,
} from '../utils/validation.ts';
import { generatePixBrCode, generatePixQrCodeDataUrl } from '../utils/pix.ts';

const API_BASE = '/api';

// Default initial settings for Conserta Cell (Arapongas/PR)
const DEFAULT_CLIENT_SETTINGS: StoreSettings = {
  companyName: 'Conserta Cell',
  city: 'Arapongas — Paraná',
  state: 'PR',
  phone: '(43) 99837-0350',
  whatsapp: '(43) 99837-0350',
  whatsappUrl: 'https://wa.me/5543998370350',
  address: 'Arapongas, PR',
  hours: {
    weekday: 'Segunda a sexta: 08h30 às 19h',
    saturday: 'Sábado: 08h30 às 17h',
    sunday: 'Domingo: fechado',
  },
  aboutText:
    'A Conserta Cell está em Arapongas para ajudar você com assistência técnica e acessórios para celulares. Nosso objetivo é oferecer um atendimento claro, prático e atencioso em cada contato.',
  pickup: {
    enabled: true,
    estimatedTime: 'Pronto em até 2 horas úteis',
    instructions: 'Retirada gratuita na loja física em Arapongas/PR.',
    address: 'Arapongas, PR',
  },
  localDelivery: {
    enabled: true,
    fee: 10.0,
    estimatedTime: 'Mesmo dia (pedidos confirmados até 16h) ou 1 dia útil',
    cepStart: '86700000',
    cepEnd: '86719999',
  },
  correios: {
    enabled: true,
    originCep: '86700000',
    apiConfigured: false,
    apiKey: '',
    contractCode: '',
    fallbackNote:
      'Cálculo baseado na tabela de CEPs dos Correios (PAC e SEDEX). Conecte suas credenciais da API dos Correios ou Melhor Envio no painel.',
  },
  payment: {
    provider: 'mercadopago',
    isConfigured: false,
    publicKey: '',
    accessToken: '',
    webhookSecret: '',
    maxInstallments: 21,
    maxInterestFree: 3,
    interestRateMonthly: 1.99,
    pixKey: '43998370350',
    pixKeyType: 'phone',
    pixRecipientName: 'Conserta Cell Arapongas',
  },
};

// Local storage backup cache
class LocalCacheDatabase {
  private getStorageKey(key: string) {
    return `consertacell_${key}`;
  }

  public getSettings(): StoreSettings {
    try {
      const raw = localStorage.getItem(this.getStorageKey('settings'));
      if (raw) return { ...DEFAULT_CLIENT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // Ignore
    }
    return DEFAULT_CLIENT_SETTINGS;
  }

  public saveSettings(settings: StoreSettings) {
    try {
      localStorage.setItem(this.getStorageKey('settings'), JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }

  public getProducts(): Product[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey('products'));
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
    return [];
  }

  public saveProducts(products: Product[]) {
    try {
      localStorage.setItem(this.getStorageKey('products'), JSON.stringify(products));
    } catch {
      // Ignore
    }
  }
}

const localCache = new LocalCacheDatabase();

// -------------------------------------------------------------
// Unified API Layer connected to Google Cloud Firestore
// -------------------------------------------------------------
export const api = {
  // Public Settings
  async getSettings(): Promise<StoreSettings> {
    try {
      const cloudSettings = await cloudDb.getSettings();
      if (cloudSettings) {
        localCache.saveSettings(cloudSettings);
        return cloudSettings;
      }
    } catch (err) {
      console.warn('[API] Erro ao ler settings da nuvem, usando cache:', err);
    }
    return localCache.getSettings();
  },

  // Public Products (Synced across all devices via Cloud Firestore)
  async getProducts(params?: {
    category?: string;
    search?: string;
    sort?: string;
    activeOnly?: boolean | string;
  }): Promise<Product[]> {
    let list: Product[] = [];
    const isActiveOnly = params?.activeOnly !== false && params?.activeOnly !== 'false';

    try {
      list = await cloudDb.getProducts(isActiveOnly);
      localCache.saveProducts(list);
    } catch (err) {
      console.warn('[API] Falha de conexão com a nuvem, carregando cache local:', err);
      list = localCache.getProducts();
      if (isActiveOnly) {
        list = list.filter((p) => p.active);
      }
    }

    // Apply client filters if requested
    if (params?.category && params.category !== 'todos') {
      list = list.filter((p) => p.category.toLowerCase() === params.category?.toLowerCase());
    }
    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (params?.sort === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (params?.sort === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    }
    return list;
  },

  async getProduct(id: string): Promise<Product> {
    try {
      const prod = await cloudDb.getProduct(id);
      if (prod) return prod;
    } catch {
      // Check cache
    }
    const cached = localCache.getProducts().find((p) => p.id === id);
    if (cached) return cached;
    throw new Error('Produto não encontrado');
  },

  // Shipping Calculation
  async calculateShipping(
    cep: string,
    items: { productId: string; quantity: number }[]
  ): Promise<{ isLocal: boolean; options: ShippingOption[]; note: string }> {
    const cleanCep = String(cep).replace(/\D/g, '');
    const settings = await this.getSettings();
    const options: ShippingOption[] = [];

    // 1. Sempre disponibiliza a opção de Retirar no Local (Grátis - Arapongas/PR)
    options.push({
      id: 'pickup',
      title: 'Retirar no Local — Balcão Conserta Cell',
      price: 0,
      estimatedDays: 'Pronto em até 2 horas úteis',
      description: 'Retirada gratuita na loja física em Arapongas/PR. Avisaremos assim que estiver separado.',
      isLocal: true,
    });

    const cepNum = parseInt(cleanCep, 10);
    const startNum = parseInt(settings.localDelivery.cepStart.replace(/\D/g, ''), 10);
    const endNum = parseInt(settings.localDelivery.cepEnd.replace(/\D/g, ''), 10);
    const isArapongas = cleanCep.length === 8 && cepNum >= startNum && cepNum <= endNum;

    if (isArapongas) {
      if (settings.localDelivery.enabled) {
        options.push({
          id: 'local',
          title: 'Entrega Local — Arapongas/PR',
          price: Number(settings.localDelivery.fee.toFixed(2)),
          estimatedDays: settings.localDelivery.estimatedTime,
          description: 'Entrega rápida na sua residência ou empresa em Arapongas.',
          isLocal: true,
        });
      }
    } else {
      if (settings.correios.enabled && cleanCep.length === 8) {
        let totalWeight = 0;
        let totalVolumeCm3 = 0;

        const allProds = await this.getProducts({ activeOnly: false });
        for (const it of items) {
          const prod = allProds.find((p) => p.id === it.productId);
          const qty = Math.max(1, Number(it.quantity) || 1);
          totalWeight += (prod?.weightKg || 0.25) * qty;
          totalVolumeCm3 += (prod?.widthCm || 15) * (prod?.heightCm || 4) * (prod?.lengthCm || 20) * qty;
        }

        if (totalWeight <= 0) totalWeight = 0.3;
        const billedWeight = Math.max(totalWeight, totalVolumeCm3 / 6000);
        const statePrefix = parseInt(cleanCep.substring(0, 2), 10);

        let pacBase = 18.5;
        let sedexBase = 26.9;
        let pacDays = '2 a 4 dias úteis';
        let sedexDays = '1 dia útil';

        if (statePrefix < 80 || statePrefix > 87) {
          pacBase = 24.5;
          sedexBase = 39.9;
          pacDays = '4 a 6 dias úteis';
          sedexDays = '2 a 3 dias úteis';
        }

        if (billedWeight > 1) {
          const extra = Math.ceil(billedWeight - 1);
          pacBase += extra * 4.8;
          sedexBase += extra * 8.5;
        }

        options.push({
          id: 'correios_pac',
          title: 'Correios — PAC',
          price: Number(pacBase.toFixed(2)),
          estimatedDays: pacDays,
          description: 'Envio econômico oficial com rastreamento.',
          isLocal: false,
        });

        options.push({
          id: 'correios_sedex',
          title: 'Correios — SEDEX',
          price: Number(sedexBase.toFixed(2)),
          estimatedDays: sedexDays,
          description: 'Envio expresso prioritário com entrega rápida.',
          isLocal: false,
        });
      }
    }

    return {
      isLocal: isArapongas,
      options,
      note: isArapongas
        ? 'Endereço em Arapongas/PR com entrega local ou retirada na loja.'
        : 'Cálculo de frete Correios baseado em peso e dimensões reais.',
    };
  },

  // Orders (Synced in Cloud Firestore)
  async createOrder(payload: any): Promise<Order> {
    const customer = payload?.customer;
    if (!customer) {
      throw new Error('Dados do cliente não fornecidos.');
    }
    const nameCheck = validateFullName(customer.fullName || '');
    if (!nameCheck.valid) {
      throw new Error(nameCheck.error || 'Nome completo inválido.');
    }
    if (!validateCPF(customer.cpf || '')) {
      throw new Error('CPF inválido. Verifique os números informados.');
    }
    if (!validateEmail(customer.email || '')) {
      throw new Error('E-mail do cliente inválido.');
    }
    const phoneCheck = validatePhone(customer.phone || '');
    if (!phoneCheck.valid) {
      throw new Error(phoneCheck.error || 'Telefone/WhatsApp inválido.');
    }

    const existingOrders = await cloudDb.getOrders();
    const count = existingOrders.length + 1001;
    const orderNumber = `CC-${count}`;
    const now = new Date().toISOString();
    // Expiration: Exactly 30 minutes from creation
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const items = payload.items || [];
    let subtotal = 0;
    const allProds = await this.getProducts({ activeOnly: false });

    const verifiedItems = items.map((it: any) => {
      const prod = allProds.find((p) => p.id === it.productId);
      const price = prod?.promotionalPrice || prod?.price || it.price || 0;
      const qty = it.quantity || 1;
      subtotal += price * qty;
      return {
        productId: it.productId,
        productName: prod?.name || it.productName || 'Produto',
        price,
        quantity: qty,
        image: prod?.images?.[0] || './logo.png',
      };
    });

    const isPickup = payload.shippingSelection?.id === 'pickup' || payload.shippingOptionId === 'pickup';
    const shippingOption: ShippingOption = isPickup
      ? {
          id: 'pickup',
          title: 'Retirar no Local — Balcão Conserta Cell',
          price: 0,
          estimatedDays: 'Pronto em até 2 horas úteis',
          isLocal: true,
          description: 'Retirada gratuita na loja física em Arapongas/PR.',
        }
      : payload.shippingSelection || {
          id: 'local',
          title: 'Entrega Local',
          price: 10,
          estimatedDays: '1 dia útil',
          isLocal: true,
          description: 'Entrega local em Arapongas',
        };

    const total = Number((subtotal + shippingOption.price).toFixed(2));
    const settings = await this.getSettings();

    // Generate real Central Bank of Brazil compliant PIX BR Code & high-res QR code
    let pixCode: string | undefined = undefined;
    let pixQrCodeBase64: string | undefined = undefined;

    if (payload.paymentMethod === 'pix' || !payload.paymentMethod) {
      const pixKey = settings.payment.pixKey || '43998370350';
      const cleanKey = pixKey.trim();
      pixCode = generatePixBrCode({
        key: cleanKey,
        recipientName: settings.payment.pixRecipientName || settings.companyName || 'CONSERTA CELL',
        city: 'ARAPONGAS',
        amount: total,
        txId: `CC${orderNumber.replace(/\D/g, '')}`,
        description: `Pedido ${orderNumber}`,
      });

      try {
        pixQrCodeBase64 = await generatePixQrCodeDataUrl(pixCode);
      } catch (err) {
        console.warn('[Pix] Falha ao gerar QR Code local:', err);
      }
    }

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderNumber,
      customer: payload.customer,
      items: verifiedItems,
      subtotal: Number(subtotal.toFixed(2)),
      shippingCost: shippingOption.price,
      shippingSelection: shippingOption,
      total,
      paymentMethod: payload.paymentMethod || 'pix',
      installments: payload.installments,
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          timestamp: now,
          note: 'Pedido registrado com sucesso no sistema. Aguardando pagamento em até 30 minutos.',
        },
      ],
      pixCode,
      pixQrCodeBase64,
      cardBrand: payload.cardBrand,
      cardLast4: payload.cardLast4,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Cloud Firestore
    await cloudDb.createOrder(newOrder);

    // Decrement stock in Cloud Firestore
    for (const it of verifiedItems) {
      const prod = allProds.find((p) => p.id === it.productId);
      if (prod) {
        const newStock = Math.max(0, prod.stock - it.quantity);
        await cloudDb.saveProduct({ stock: newStock }, prod.id);
      }
    }

    return newOrder;
  },

  async getOrder(idOrNumber: string): Promise<Order> {
    const order = await cloudDb.getOrder(idOrNumber);
    if (order) return order;
    throw new Error('Pedido não localizado no sistema.');
  },

  // Admin Authentication (Validated against Cloud Firestore)
  async adminLogin(username: string, password: string): Promise<{ token: string; user: any }> {
    const creds = await cloudDb.getAdminCreds();

    if (username.trim() === creds.username && password === creds.passwordHash) {
      const token = `token_cloud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await cloudDb.addLog('ADMIN_LOGIN', `Login administrativo efetuado por ${username}`);
      return {
        token,
        user: { username: creds.username, name: 'Administrador Conserta Cell' },
      };
    }

    throw new Error('Credenciais inválidas. Verifique o usuário e senha informados.');
  },

  async getAdminSettings(_token: string): Promise<StoreSettings> {
    return this.getSettings();
  },

  async updateAdminSettings(settings: Partial<StoreSettings>, _token: string): Promise<StoreSettings> {
    const current = await this.getSettings();
    const updated: StoreSettings = {
      ...current,
      ...settings,
      localDelivery: { ...current.localDelivery, ...(settings.localDelivery || {}) },
      correios: { ...current.correios, ...(settings.correios || {}) },
      payment: { ...current.payment, ...(settings.payment || {}) },
    };

    await cloudDb.saveSettings(updated);
    localCache.saveSettings(updated);
    return updated;
  },

  // Admin Products (Creates and updates in Cloud Firestore)
  async createAdminProduct(productData: any, _token: string): Promise<Product> {
    const created = await cloudDb.saveProduct(productData);
    return created;
  },

  async updateAdminProduct(id: string, updates: any, _token: string): Promise<Product> {
    const updated = await cloudDb.saveProduct(updates, id);
    return updated;
  },

  async deleteAdminProduct(id: string, _token: string): Promise<void> {
    await cloudDb.deleteProduct(id);
  },

  async getAdminOrders(_token: string, status?: string): Promise<Order[]> {
    return cloudDb.getOrders(status);
  },

  async updateAdminOrderStatus(
    id: string,
    payload: { status: OrderStatus; note?: string; trackingCode?: string },
    _token: string
  ): Promise<Order> {
    const updated = await cloudDb.updateOrderStatus(
      id,
      payload.status,
      payload.note,
      payload.trackingCode
    );
    if (updated) return updated;
    throw new Error('Pedido não encontrado');
  },

  async getAdminLogs(_token: string): Promise<AuditLog[]> {
    return cloudDb.getLogs();
  },

  async adminLogout(_token: string): Promise<void> {
    // Session invalidated on client
  },

  async updateAdminCredentials(
    payload: { currentPassword: string; newUsername?: string; newPassword?: string },
    _token: string
  ): Promise<{ message: string }> {
    const creds = await cloudDb.getAdminCreds();

    if (payload.currentPassword !== creds.passwordHash) {
      throw new Error('A senha atual informada está incorreta.');
    }

    if (payload.newPassword) {
      if (payload.newPassword.length < 8) {
        throw new Error('A nova senha deve ter no mínimo 8 caracteres.');
      }
    }

    if (payload.newUsername && payload.newUsername.trim()) {
      if (payload.newUsername.trim().length < 4) {
        throw new Error('O nome de usuário deve conter no mínimo 4 caracteres.');
      }
    }

    const targetUser = payload.newUsername?.trim() || creds.username;
    const targetPass = payload.newPassword || creds.passwordHash;

    await cloudDb.saveAdminCreds(targetUser, targetPass);
    return { message: 'Credenciais de acesso atualizadas com sucesso na nuvem. Faça login novamente.' };
  },
};
