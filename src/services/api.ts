import type {
  Product,
  StoreSettings,
  ShippingOption,
  Order,
  OrderStatus,
  AuditLog,
} from '../types/index.ts';

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

// Safe HTTP Fetcher that handles HTML 404s gracefully (such as on GitHub Pages)
async function safeFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; isStaticOrHtml: boolean; rawText?: string }> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    const isHtml =
      contentType.includes('text/html') ||
      text.trim().startsWith('<!DOCTYPE') ||
      text.trim().startsWith('<html') ||
      text.includes('The page could not be found');

    if (isHtml || res.status === 404) {
      return { ok: false, status: res.status, isStaticOrHtml: true, rawText: text };
    }

    try {
      const data = JSON.parse(text) as T;
      return { ok: res.ok, status: res.status, data, isStaticOrHtml: false, rawText: text };
    } catch {
      return { ok: false, status: res.status, isStaticOrHtml: true, rawText: text };
    }
  } catch (err: any) {
    // Network failure (offline or cross-origin blocked)
    return { ok: false, status: 0, isStaticOrHtml: true, rawText: err?.message };
  }
}

// Client Storage Database (Ensures 100% functionality on GitHub Pages & Static Hosts)
class ClientDatabase {
  private getStorageKey(key: string) {
    return `consertacell_${key}`;
  }

  // Settings
  public getSettings(): StoreSettings {
    try {
      const raw = localStorage.getItem(this.getStorageKey('settings'));
      if (raw) {
        return { ...DEFAULT_CLIENT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('[ClientDB] Erro ao ler configurações locais:', e);
    }
    return DEFAULT_CLIENT_SETTINGS;
  }

  public saveSettings(partial: Partial<StoreSettings>): StoreSettings {
    const current = this.getSettings();
    const updated: StoreSettings = {
      ...current,
      ...partial,
      localDelivery: { ...current.localDelivery, ...(partial.localDelivery || {}) },
      correios: { ...current.correios, ...(partial.correios || {}) },
      payment: { ...current.payment, ...(partial.payment || {}) },
    };
    try {
      localStorage.setItem(this.getStorageKey('settings'), JSON.stringify(updated));
      this.addLog('SETTINGS_UPDATE', 'Configurações atualizadas no armazenamento do navegador.');
    } catch (e) {
      console.warn('[ClientDB] Erro ao salvar configurações:', e);
    }
    return updated;
  }

  // Products
  public getProducts(activeOnly = true): Product[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey('products'));
      if (raw) {
        const list: Product[] = JSON.parse(raw);
        return activeOnly ? list.filter((p) => p.active) : list;
      }
    } catch (e) {
      console.warn('[ClientDB] Erro ao ler produtos locais:', e);
    }
    return [];
  }

  public getProductById(id: string): Product | undefined {
    return this.getProducts(false).find((p) => p.id === id);
  }

  public saveProduct(productData: any, id?: string): Product {
    const list = this.getProducts(false);
    const now = new Date().toISOString();

    if (id) {
      const index = list.findIndex((p) => p.id === id);
      if (index !== -1) {
        const updated: Product = {
          ...list[index],
          ...productData,
          id,
          updatedAt: now,
        };
        list[index] = updated;
        localStorage.setItem(this.getStorageKey('products'), JSON.stringify(list));
        this.addLog('PRODUCT_UPDATE', `Produto atualizado: "${updated.name}"`);
        return updated;
      }
    }

    const newProd: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: productData.name,
      slug: productData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      description: productData.description || '',
      category: productData.category || 'Geral',
      price: Number(productData.price) || 0,
      promotionalPrice: productData.promotionalPrice ? Number(productData.promotionalPrice) : undefined,
      stock: Number(productData.stock) || 0,
      images: Array.isArray(productData.images) && productData.images.length > 0 ? productData.images : ['./logo.png'],
      active: productData.active !== undefined ? Boolean(productData.active) : true,
      featured: Boolean(productData.featured),
      weightKg: Number(productData.weightKg) || 0.25,
      widthCm: Number(productData.widthCm) || 15,
      heightCm: Number(productData.heightCm) || 4,
      lengthCm: Number(productData.lengthCm) || 20,
      createdAt: now,
      updatedAt: now,
    };

    list.unshift(newProd);
    localStorage.setItem(this.getStorageKey('products'), JSON.stringify(list));
    this.addLog('PRODUCT_CREATE', `Produto criado: "${newProd.name}"`);
    return newProd;
  }

  public deleteProduct(id: string): boolean {
    const list = this.getProducts(false);
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length !== list.length) {
      localStorage.setItem(this.getStorageKey('products'), JSON.stringify(filtered));
      this.addLog('PRODUCT_DELETE', `Produto excluído (ID: ${id})`);
      return true;
    }
    return false;
  }

  // Shipping Calculation
  public calculateShipping(
    cep: string,
    items: { productId: string; quantity: number }[]
  ): { isLocal: boolean; options: ShippingOption[]; note: string } {
    const cleanCep = String(cep).replace(/\D/g, '');
    const settings = this.getSettings();
    const options: ShippingOption[] = [];

    const cepNum = parseInt(cleanCep, 10);
    const startNum = parseInt(settings.localDelivery.cepStart.replace(/\D/g, ''), 10);
    const endNum = parseInt(settings.localDelivery.cepEnd.replace(/\D/g, ''), 10);
    const isArapongas = cepNum >= startNum && cepNum <= endNum;

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
      if (settings.correios.enabled) {
        let totalWeight = 0;
        let totalVolumeCm3 = 0;

        for (const it of items) {
          const prod = this.getProductById(it.productId);
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
        ? 'Endereço em Arapongas/PR com entrega local.'
        : 'Cálculo de frete Correios baseado em peso e dimensões reais.',
    };
  }

  // Orders
  public getOrders(): Order[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey('orders'));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[ClientDB] Erro ao ler pedidos:', e);
    }
    return [];
  }

  public getOrderById(id: string): Order | undefined {
    return this.getOrders().find((o) => o.id === id || o.orderNumber === id);
  }

  public createOrder(payload: any): Order {
    const list = this.getOrders();
    const count = list.length + 1001;
    const orderNumber = `CC-${count}`;
    const now = new Date().toISOString();

    const items = payload.items || [];
    let subtotal = 0;
    const verifiedItems = items.map((it: any) => {
      const prod = this.getProductById(it.productId);
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

    const shippingOption = payload.shippingSelection || {
      id: 'local',
      title: 'Entrega Local',
      price: 10,
      estimatedDays: '1 dia útil',
      isLocal: true,
      description: 'Entrega local em Arapongas',
    };

    const total = Number((subtotal + shippingOption.price).toFixed(2));
    const settings = this.getSettings();
    const pixKey = settings.payment.pixKey || '43998370350';
    const cleanKey = pixKey.replace(/\D/g, '');

    const pixCode = `00020126360014BR.GOV.BCB.PIX0114+55${cleanKey}520400005303986540${total.toFixed(2).length < 10 ? '0' : ''}${total.toFixed(2)}5802BR5913CONSERTA CELL6009ARAPONGAS62070503***6304CC${orderNumber.slice(-4)}`;

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
          note: 'Pedido registrado com sucesso no sistema.',
        },
      ],
      pixCode: payload.paymentMethod === 'pix' ? pixCode : undefined,
      cardBrand: payload.cardBrand,
      cardLast4: payload.cardLast4,
      createdAt: now,
      updatedAt: now,
    };

    list.unshift(newOrder);
    localStorage.setItem(this.getStorageKey('orders'), JSON.stringify(list));
    this.addLog('ORDER_CREATE', `Novo pedido ${orderNumber} registrado no valor de R$ ${total.toFixed(2)}`);
    return newOrder;
  }

  public updateOrderStatus(
    id: string,
    status: OrderStatus,
    note?: string,
    trackingCode?: string
  ): Order | null {
    const list = this.getOrders();
    const order = list.find((o) => o.id === id || o.orderNumber === id);
    if (!order) return null;

    const now = new Date().toISOString();
    order.status = status;
    order.updatedAt = now;
    if (trackingCode !== undefined) {
      order.trackingCode = trackingCode;
    }
    order.statusHistory.push({
      status,
      timestamp: now,
      note: note || `Status atualizado para ${status}`,
    });

    localStorage.setItem(this.getStorageKey('orders'), JSON.stringify(list));
    this.addLog('ORDER_STATUS_UPDATE', `Pedido ${order.orderNumber} atualizado para status "${status}"`);
    return order;
  }

  // Admin Credentials & Auth
  public getAdminCreds(): { username: string; passwordHash: string } {
    try {
      const raw = localStorage.getItem(this.getStorageKey('admin_creds'));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[ClientDB] Erro ao ler credenciais de admin:', e);
    }
    // Default admin: admin / admin123
    return {
      username: 'admin',
      passwordHash: 'admin123',
    };
  }

  public authenticateAdmin(username: string, password: string): { token: string; user: any } {
    const creds = this.getAdminCreds();
    if (username.trim() === creds.username && password === creds.passwordHash) {
      const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      this.addLog('ADMIN_LOGIN', `Login administrativo efetuado por ${username}`);
      return {
        token,
        user: { username: creds.username, name: 'Administrador Conserta Cell' },
      };
    }
    throw new Error('Credenciais inválidas. Verifique o usuário e senha informados.');
  }

  public updateAdminCredentials(
    currentPass: string,
    newUsername?: string,
    newPass?: string
  ): { message: string } {
    const creds = this.getAdminCreds();
    if (currentPass !== creds.passwordHash) {
      throw new Error('A senha atual informada está incorreta.');
    }
    if (newPass) {
      if (newPass.length < 8) {
        throw new Error('A nova senha deve ter no mínimo 8 caracteres.');
      }
      creds.passwordHash = newPass;
    }
    if (newUsername && newUsername.trim()) {
      if (newUsername.trim().length < 4) {
        throw new Error('O nome de usuário deve conter no mínimo 4 caracteres.');
      }
      creds.username = newUsername.trim();
    }
    localStorage.setItem(this.getStorageKey('admin_creds'), JSON.stringify(creds));
    this.addLog('ADMIN_CREDENTIALS_CHANGED', 'Credenciais administrativas atualizadas com sucesso.');
    return { message: 'Credenciais de acesso atualizadas com sucesso. Faça login novamente.' };
  }

  // Audit Logs
  public addLog(action: string, details: string) {
    try {
      const raw = localStorage.getItem(this.getStorageKey('logs'));
      const list: AuditLog[] = raw ? JSON.parse(raw) : [];
      list.unshift({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        action,
        details,
        ip: '127.0.0.1 (Navegador)',
      });
      if (list.length > 200) list.pop();
      localStorage.setItem(this.getStorageKey('logs'), JSON.stringify(list));
    } catch {
      // Ignore log storage errors
    }
  }

  public getLogs(): AuditLog[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey('logs'));
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
    return [
      {
        id: 'init_log',
        timestamp: new Date().toISOString(),
        action: 'SYSTEM_READY',
        details: 'Armazenamento Conserta Cell pronto e ativo.',
      },
    ];
  }
}

export const clientDB = new ClientDatabase();

// -------------------------------------------------------------
// Unified API layer (Express API with Automatic ClientDB Fallback)
// -------------------------------------------------------------
export const api = {
  // Public Settings
  async getSettings(): Promise<StoreSettings> {
    const res = await safeFetchJson<StoreSettings>(`${API_BASE}/settings`);
    if (res.ok && res.data) {
      return res.data;
    }
    // Fallback to local storage (GitHub Pages or offline)
    return clientDB.getSettings();
  },

  // Public Products
  async getProducts(params?: {
    category?: string;
    search?: string;
    sort?: string;
    activeOnly?: boolean | string;
  }): Promise<Product[]> {
    try {
      const url = new URL(`${window.location.origin}${API_BASE}/products`);
      if (params?.category) url.searchParams.set('category', params.category);
      if (params?.search) url.searchParams.set('search', params.search);
      if (params?.sort) url.searchParams.set('sort', params.sort);
      if (params?.activeOnly !== undefined) url.searchParams.set('activeOnly', String(params.activeOnly));

      const res = await safeFetchJson<Product[]>(url.toString());
      if (res.ok && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    // Local fallback
    let list = clientDB.getProducts(params?.activeOnly !== false && params?.activeOnly !== 'false');
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
    const res = await safeFetchJson<Product>(`${API_BASE}/products/${id}`);
    if (res.ok && res.data) {
      return res.data;
    }
    const local = clientDB.getProductById(id);
    if (local) return local;
    throw new Error('Produto não encontrado');
  },

  // Shipping Calculation
  async calculateShipping(
    cep: string,
    items: { productId: string; quantity: number }[]
  ): Promise<{ isLocal: boolean; options: ShippingOption[]; note: string }> {
    const res = await safeFetchJson<{ isLocal: boolean; options: ShippingOption[]; note: string }>(
      `${API_BASE}/shipping/calculate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cep, items }),
      }
    );

    if (res.ok && res.data) {
      return res.data;
    }

    if (res.isStaticOrHtml) {
      // Static host fallback (GitHub Pages)
      return clientDB.calculateShipping(cep, items);
    }

    const err = res.data as any;
    throw new Error(err?.error || 'Erro ao calcular frete');
  },

  // Orders
  async createOrder(payload: any): Promise<Order> {
    const res = await safeFetchJson<Order>(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok && res.data) {
      return res.data;
    }

    if (res.isStaticOrHtml) {
      return clientDB.createOrder(payload);
    }

    const err = res.data as any;
    throw new Error(err?.error || 'Falha ao processar pedido');
  },

  async getOrder(id: string): Promise<Order> {
    const res = await safeFetchJson<Order>(`${API_BASE}/orders/${id}`);
    if (res.ok && res.data) {
      return res.data;
    }
    const local = clientDB.getOrderById(id);
    if (local) return local;
    throw new Error('Pedido não localizado no sistema.');
  },

  // Admin Authentication
  async adminLogin(username: string, password: string): Promise<{ token: string; user: any }> {
    const res = await safeFetchJson<{ token: string; user: any }>(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok && res.data?.token) {
      return res.data;
    }

    // If server returned a business error (e.g. 401 with JSON { error: '...' })
    if (!res.isStaticOrHtml && res.data) {
      const err = res.data as any;
      throw new Error(err.error || 'Credenciais inválidas');
    }

    // Static host or GitHub Pages fallback (res.isStaticOrHtml)
    return clientDB.authenticateAdmin(username, password);
  },

  async getAdminSettings(token: string): Promise<StoreSettings> {
    const res = await safeFetchJson<StoreSettings>(`${API_BASE}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok && res.data) {
      return res.data;
    }
    return clientDB.getSettings();
  },

  async updateAdminSettings(settings: Partial<StoreSettings>, token: string): Promise<StoreSettings> {
    const res = await safeFetchJson<StoreSettings>(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
    if (res.ok && res.data) {
      return res.data;
    }
    return clientDB.saveSettings(settings);
  },

  async createAdminProduct(productData: any, token: string): Promise<Product> {
    const res = await safeFetchJson<Product>(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });
    if (res.ok && res.data) {
      return res.data;
    }
    return clientDB.saveProduct(productData);
  },

  async updateAdminProduct(id: string, updates: any, token: string): Promise<Product> {
    const res = await safeFetchJson<Product>(`${API_BASE}/admin/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    if (res.ok && res.data) {
      return res.data;
    }
    return clientDB.saveProduct(updates, id);
  },

  async deleteAdminProduct(id: string, token: string): Promise<void> {
    const res = await safeFetchJson<void>(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      return;
    }
    clientDB.deleteProduct(id);
  },

  async getAdminOrders(token: string, status?: string): Promise<Order[]> {
    try {
      const url = new URL(`${window.location.origin}${API_BASE}/admin/orders`);
      if (status) url.searchParams.set('status', status);
      const res = await safeFetchJson<Order[]>(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const list = clientDB.getOrders();
    if (status && status !== 'todos') {
      return list.filter((o) => o.status === status);
    }
    return list;
  },

  async updateAdminOrderStatus(
    id: string,
    payload: { status: OrderStatus; note?: string; trackingCode?: string },
    token: string
  ): Promise<Order> {
    const res = await safeFetchJson<Order>(`${API_BASE}/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok && res.data) {
      return res.data;
    }
    const updated = clientDB.updateOrderStatus(id, payload.status, payload.note, payload.trackingCode);
    if (updated) return updated;
    throw new Error('Pedido não encontrado');
  },

  async getAdminLogs(token: string): Promise<AuditLog[]> {
    const res = await safeFetchJson<AuditLog[]>(`${API_BASE}/admin/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok && Array.isArray(res.data)) {
      return res.data;
    }
    return clientDB.getLogs();
  },

  async adminLogout(token: string): Promise<void> {
    try {
      await safeFetchJson(`${API_BASE}/admin/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Silent on logout
    }
  },

  async updateAdminCredentials(
    payload: { currentPassword: string; newUsername?: string; newPassword?: string },
    token: string
  ): Promise<{ message: string }> {
    const res = await safeFetchJson<{ message: string }>(`${API_BASE}/admin/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok && res.data) {
      return res.data;
    }

    if (!res.isStaticOrHtml && res.data) {
      const err = res.data as any;
      throw new Error(err.error || 'Falha ao atualizar credenciais');
    }

    return clientDB.updateAdminCredentials(
      payload.currentPassword,
      payload.newUsername,
      payload.newPassword
    );
  },
};
