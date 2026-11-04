import type {
  Product,
  StoreSettings,
  ShippingOption,
  Order,
  OrderStatus,
  AuditLog,
} from '../types/index.ts';

const API_BASE = '/api';

export const api = {
  // Public Settings
  async getSettings(): Promise<StoreSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Falha ao carregar configurações da loja');
    return res.json();
  },

  // Public Products
  async getProducts(params?: {
    category?: string;
    search?: string;
    sort?: string;
    activeOnly?: boolean | string;
  }): Promise<Product[]> {
    const url = new URL(`${window.location.origin}${API_BASE}/products`);
    if (params?.category) url.searchParams.set('category', params.category);
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.sort) url.searchParams.set('sort', params.sort);
    if (params?.activeOnly !== undefined) url.searchParams.set('activeOnly', String(params.activeOnly));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Falha ao carregar produtos');
    return res.json();
  },

  async getProduct(id: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`);
    if (!res.ok) throw new Error('Produto não encontrado');
    return res.json();
  },

  // Shipping Calculation
  async calculateShipping(
    cep: string,
    items: { productId: string; quantity: number }[]
  ): Promise<{ isLocal: boolean; options: ShippingOption[]; note: string }> {
    const res = await fetch(`${API_BASE}/shipping/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cep, items }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao calcular frete');
    }
    return res.json();
  },

  // Orders
  async createOrder(payload: any): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao processar pedido');
    }
    return res.json();
  },

  async getOrder(id: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}`);
    if (!res.ok) throw new Error('Pedido não localizado');
    return res.json();
  },

  // Admin
  async adminLogin(username: string, password: string): Promise<{ token: string; user: any }> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Credenciais inválidas');
    }
    return res.json();
  },

  async getAdminSettings(token: string): Promise<StoreSettings> {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Não autorizado');
    return res.json();
  },

  async updateAdminSettings(settings: Partial<StoreSettings>, token: string): Promise<StoreSettings> {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Falha ao salvar configurações');
    return res.json();
  },

  async createAdminProduct(productData: any, token: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao cadastrar produto');
    }
    return res.json();
  },

  async updateAdminProduct(id: string, updates: any, token: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao atualizar produto');
    }
    return res.json();
  },

  async deleteAdminProduct(id: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Falha ao excluir produto');
  },

  async getAdminOrders(token: string, status?: string): Promise<Order[]> {
    const url = new URL(`${window.location.origin}${API_BASE}/admin/orders`);
    if (status) url.searchParams.set('status', status);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Falha ao carregar pedidos');
    return res.json();
  },

  async updateAdminOrderStatus(
    id: string,
    payload: { status: OrderStatus; note?: string; trackingCode?: string },
    token: string
  ): Promise<Order> {
    const res = await fetch(`${API_BASE}/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Falha ao atualizar status do pedido');
    return res.json();
  },

  async getAdminLogs(token: string): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE}/admin/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Falha ao carregar logs de auditoria');
    return res.json();
  },

  async adminLogout(token: string): Promise<void> {
    await fetch(`${API_BASE}/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async updateAdminCredentials(
    payload: { currentPassword: string; newUsername?: string; newPassword?: string },
    token: string
  ): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao atualizar credenciais');
    }
    return res.json();
  },
};
