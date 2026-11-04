import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Product, StoreSettings, Order, AuditLog, OrderStatus } from '../src/types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'consertacell_db.json');

export interface DatabaseSchema {
  settings: StoreSettings;
  products: Product[];
  orders: Order[];
  auditLogs: AuditLog[];
  admin: {
    username: string;
    passwordHash: string;
    salt: string;
    name: string;
  };
}

// Password hashing helpers
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, generatedSalt, 64).toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
}

const defaultAdminCreds = hashPassword('admin123');

const DEFAULT_SETTINGS: StoreSettings = {
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

const DEFAULT_DB: DatabaseSchema = {
  settings: DEFAULT_SETTINGS,
  products: [], // Strictly empty as requested: do not invent fake products!
  orders: [],
  auditLogs: [
    {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: 'SYSTEM_INIT',
      details: 'Base de dados inicializada para Conserta Cell.',
    },
  ],
  admin: {
    username: 'admin',
    passwordHash: defaultAdminCreds.hash,
    salt: defaultAdminCreds.salt,
    name: 'Administrador Conserta Cell',
  },
};

class DatabaseManager {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;
  private activeTokens: Map<string, { username: string; expiresAt: number }> = new Map();

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure defaults merge cleanly if schema was extended
        return {
          ...DEFAULT_DB,
          ...parsed,
          settings: { ...DEFAULT_DB.settings, ...(parsed.settings || {}) },
          products: parsed.products || [],
          orders: parsed.orders || [],
          auditLogs: parsed.auditLogs || [],
        };
      }
    } catch (err) {
      console.error('[DB] Erro ao carregar base de dados. Recriando estrutura padrão:', err);
    }

    this.persistSync(DEFAULT_DB);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  private persistSync(payload: DatabaseSchema) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public save() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      try {
        this.persistSync(this.data);
      } catch (err) {
        console.error('[DB] Falha ao persistir dados:', err);
      }
    }, 100);
  }

  // Settings
  public getSettings(): StoreSettings {
    return this.data.settings;
  }

  public getPublicSettings(): Omit<StoreSettings, 'payment' | 'correios'> & {
    payment: {
      provider: string;
      isConfigured: boolean;
      publicKey?: string;
      maxInstallments: number;
      maxInterestFree: number;
      pixKey?: string;
      pixKeyType?: string;
      pixRecipientName?: string;
    };
    correios: {
      enabled: boolean;
      originCep: string;
      apiConfigured: boolean;
      fallbackNote: string;
    };
  } {
    const { payment, correios, ...rest } = this.data.settings;
    return {
      ...rest,
      payment: {
        provider: payment.provider,
        isConfigured: payment.isConfigured,
        publicKey: payment.publicKey || '',
        maxInstallments: payment.maxInstallments,
        maxInterestFree: payment.maxInterestFree,
        pixKey: payment.pixKey,
        pixKeyType: payment.pixKeyType,
        pixRecipientName: payment.pixRecipientName,
      },
      correios: {
        enabled: correios.enabled,
        originCep: correios.originCep,
        apiConfigured: correios.apiConfigured,
        fallbackNote: correios.fallbackNote,
      },
    };
  }

  public updateSettings(partial: Partial<StoreSettings>, user: string) {
    this.data.settings = {
      ...this.data.settings,
      ...partial,
      localDelivery: {
        ...this.data.settings.localDelivery,
        ...(partial.localDelivery || {}),
      },
      correios: {
        ...this.data.settings.correios,
        ...(partial.correios || {}),
      },
      payment: {
        ...this.data.settings.payment,
        ...(partial.payment || {}),
      },
    };
    this.logAction('SETTINGS_UPDATE', `Configurações atualizadas por ${user}`);
    this.save();
    return this.data.settings;
  }

  // Products
  public getProducts(activeOnly = true): Product[] {
    if (activeOnly) {
      return this.data.products.filter((p) => p.active);
    }
    return [...this.data.products];
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public createProduct(item: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, user: string): Product {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.data.products.unshift(newProduct);
    this.logAction('PRODUCT_CREATE', `Produto criado: "${newProduct.name}" (R$ ${newProduct.price}) por ${user}`);
    this.save();
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>, user: string): Product | null {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const old = this.data.products[idx];
    const updated: Product = {
      ...old,
      ...updates,
      id: old.id,
      createdAt: old.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.data.products[idx] = updated;
    this.logAction('PRODUCT_UPDATE', `Produto atualizado: "${updated.name}" por ${user}`);
    this.save();
    return updated;
  }

  public deleteProduct(id: string, user: string): boolean {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const deleted = this.data.products.splice(idx, 1)[0];
    this.logAction('PRODUCT_DELETE', `Produto excluído: "${deleted.name}" por ${user}`);
    this.save();
    return true;
  }

  // Orders
  public getOrders(): Order[] {
    return [...this.data.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id || o.orderNumber === id);
  }

  public createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'statusHistory'>): Order {
    const count = this.data.orders.length + 1001;
    const orderNumber = `CC-${count}`;
    const now = new Date().toISOString();
    const newOrder: Order = {
      ...orderData,
      id: crypto.randomUUID(),
      orderNumber,
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: orderData.status,
          timestamp: now,
          note: 'Pedido registrado com sucesso no sistema.',
        },
      ],
    };

    // Decrement stock for purchased products
    for (const item of newOrder.items) {
      const prod = this.data.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.updatedAt = now;
      }
    }

    this.data.orders.unshift(newOrder);
    this.logAction('ORDER_CREATE', `Novo pedido ${orderNumber} recebido - Total: R$ ${newOrder.total.toFixed(2)}`);
    this.save();
    return newOrder;
  }

  public updateOrderStatus(id: string, status: OrderStatus, note?: string, trackingCode?: string, user?: string): Order | null {
    const order = this.data.orders.find((o) => o.id === id || o.orderNumber === id);
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
      note: note || `Status alterado para ${status}${user ? ` por ${user}` : ''}`,
    });

    this.logAction(
      'ORDER_STATUS_UPDATE',
      `Pedido ${order.orderNumber} teve status atualizado para ${status} por ${user || 'Sistema'}`
    );
    this.save();
    return order;
  }

  private failedAttempts: Map<string, { count: number; lockedUntil: number }> = new Map();

  // Admin Auth & Sessions with Anti-Brute-Force Protection
  public authenticateAdmin(username: string, password: string, ip = '127.0.0.1'): {
    token?: string;
    user?: { username: string; name: string };
    error?: string;
    locked?: boolean;
    remainingAttempts?: number;
  } {
    const now = Date.now();
    const attemptRecord = this.failedAttempts.get(ip) || { count: 0, lockedUntil: 0 };

    // Check if IP is currently locked out
    if (attemptRecord.lockedUntil > now) {
      const remainingSeconds = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
      this.logAction('SECURITY_ALERT', `Tentativa de login bloqueada por taxa de falhas (IP: ${ip})`, ip);
      return {
        error: `Acesso temporariamente bloqueado por excesso de tentativas incorretas. Tente novamente em ${remainingSeconds} segundos.`,
        locked: true,
      };
    }

    // Verify username and password
    const usernameMatches = username === this.data.admin.username;
    const isPasswordValid = usernameMatches
      ? verifyPassword(password, this.data.admin.passwordHash, this.data.admin.salt)
      : false;

    if (!isPasswordValid) {
      attemptRecord.count += 1;
      const MAX_ATTEMPTS = 5;

      if (attemptRecord.count >= MAX_ATTEMPTS) {
        attemptRecord.lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
        this.failedAttempts.set(ip, attemptRecord);
        this.logAction('SECURITY_LOCKOUT', `Conta bloqueada após ${MAX_ATTEMPTS} tentativas falhas (IP: ${ip})`, ip);
        return {
          error: `Limite de tentativas excedido (${MAX_ATTEMPTS} falhas). Por segurança, o acesso foi bloqueado por 15 minutos.`,
          locked: true,
        };
      }

      this.failedAttempts.set(ip, attemptRecord);
      this.logAction('FAILED_LOGIN_ATTEMPT', `Tentativa de login inválida com usuário "${username}" (IP: ${ip})`, ip);
      return {
        error: `Credenciais inválidas. Restam ${MAX_ATTEMPTS - attemptRecord.count} tentativa(s) antes do bloqueio temporário.`,
        remainingAttempts: MAX_ATTEMPTS - attemptRecord.count,
      };
    }

    // Success: Clear failed attempts
    this.failedAttempts.delete(ip);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
    this.activeTokens.set(token, { username: this.data.admin.username, expiresAt });

    this.logAction('ADMIN_LOGIN', `Login administrativo efetuado com sucesso por ${username} (IP: ${ip})`, ip);
    return {
      token,
      user: {
        username: this.data.admin.username,
        name: this.data.admin.name,
      },
    };
  }

  public validateToken(token: string): boolean {
    const session = this.activeTokens.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.activeTokens.delete(token);
      return false;
    }
    return true;
  }

  public invalidateToken(token: string) {
    this.activeTokens.delete(token);
  }

  public updateAdminCredentials(
    currentPassword: string,
    newUsername?: string,
    newPassword?: string,
    user = 'Administrador'
  ): { success: boolean; error?: string } {
    // 1. Verify current password
    const isCurrentValid = verifyPassword(
      currentPassword,
      this.data.admin.passwordHash,
      this.data.admin.salt
    );
    if (!isCurrentValid) {
      this.logAction('SECURITY_ALERT', `Tentativa não autorizada de alterar credenciais (senha atual incorreta)`);
      return { success: false, error: 'A senha atual informada está incorreta.' };
    }

    // 2. Validate new password strength if provided
    if (newPassword) {
      if (newPassword.length < 8) {
        return { success: false, error: 'A nova senha deve ter no mínimo 8 caracteres.' };
      }
      const hasUpper = /[A-Z]/.test(newPassword);
      const hasLower = /[a-z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

      if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        return {
          success: false,
          error:
            'A nova senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial (!@#$%&*).',
        };
      }

      const { hash, salt } = hashPassword(newPassword);
      this.data.admin.passwordHash = hash;
      this.data.admin.salt = salt;
    }

    // 3. Update username if provided
    if (newUsername && newUsername.trim() !== '') {
      const cleanUser = newUsername.trim();
      if (cleanUser.length < 4) {
        return { success: false, error: 'O nome de usuário deve conter no mínimo 4 caracteres.' };
      }
      this.data.admin.username = cleanUser;
    }

    // 4. Invalidate all existing tokens except current to force re-authentication for security
    this.activeTokens.clear();

    this.logAction(
      'ADMIN_CREDENTIALS_CHANGED',
      `Credenciais de acesso atualizadas com sucesso por ${user}. Todas as sessões anteriores foram encerradas.`
    );
    this.save();
    return { success: true };
  }

  // Audit Logs
  public logAction(action: string, details: string, ip?: string) {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      details,
      ip,
    };
    this.data.auditLogs.unshift(log);
    // Keep max 500 logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.save();
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.data.auditLogs];
  }
}

export const db = new DatabaseManager();
