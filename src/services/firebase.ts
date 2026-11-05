import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { Product, StoreSettings, Order, AuditLog, OrderStatus } from '../types/index.ts';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with the provisioned database ID
export const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test Firestore Connection at boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Cliente offline ou aguardando conexão.');
      return false;
    }
    return true;
  }
}

/**
 * Recursively removes all `undefined` fields from an object or array.
 * Firestore strictly rejects JavaScript `undefined` as a field value.
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        clean[key] = sanitizeForFirestore(val);
      }
    }
    return clean as any;
  }
  return data;
}

// -------------------------------------------------------------
// Cloud Firestore Data Access Services
// -------------------------------------------------------------

export const cloudDb = {
  // 1. PRODUCTS
  async getProducts(activeOnly = true): Promise<Product[]> {
    try {
      const colRef = collection(firestore, 'products');
      const q = activeOnly
        ? query(colRef, where('active', '==', true))
        : query(colRef);
      
      const snap = await getDocs(q);
      const list: Product[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Product);
      });

      // Sort by creation date descending
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.error('[Firestore] Erro ao buscar produtos:', err);
      throw err;
    }
  },

  async getProduct(id: string): Promise<Product | null> {
    try {
      const d = await getDoc(doc(firestore, 'products', id));
      if (!d.exists()) return null;
      return { id: d.id, ...d.data() } as Product;
    } catch (err) {
      console.error('[Firestore] Erro ao buscar produto:', err);
      throw err;
    }
  },

  async saveProduct(productData: any, id?: string): Promise<Product> {
    const now = new Date().toISOString();
    const prodId = id || productData.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // If updating an existing product, retrieve existing fields to prevent overwriting prices or descriptions
    let existingProd: Product | null = null;
    if (id || productData.id) {
      try {
        existingProd = await this.getProduct(id || productData.id);
      } catch {
        existingProd = null;
      }
    }

    const name = productData.name !== undefined ? productData.name : (existingProd?.name || 'Produto');
    const slug = (name || 'produto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const price = productData.price !== undefined
      ? Number(productData.price)
      : (existingProd?.price !== undefined ? Number(existingProd.price) : 0);

    const stock = productData.stock !== undefined
      ? Number(productData.stock)
      : (existingProd?.stock !== undefined ? Number(existingProd.stock) : 0);

    const description = productData.description !== undefined
      ? productData.description
      : (existingProd?.description || '');

    const category = productData.category !== undefined
      ? productData.category
      : (existingProd?.category || 'Geral');

    const images = Array.isArray(productData.images) && productData.images.length > 0
      ? productData.images
      : (existingProd?.images && existingProd.images.length > 0 ? existingProd.images : ['./logo.png']);

    const active = productData.active !== undefined
      ? Boolean(productData.active)
      : (existingProd?.active !== undefined ? Boolean(existingProd.active) : true);

    const featured = productData.featured !== undefined
      ? Boolean(productData.featured)
      : (existingProd?.featured !== undefined ? Boolean(existingProd.featured) : false);

    const weightKg = productData.weightKg !== undefined
      ? Number(productData.weightKg)
      : (existingProd?.weightKg || 0.25);

    const widthCm = productData.widthCm !== undefined
      ? Number(productData.widthCm)
      : (existingProd?.widthCm || 15);

    const heightCm = productData.heightCm !== undefined
      ? Number(productData.heightCm)
      : (existingProd?.heightCm || 4);

    const lengthCm = productData.lengthCm !== undefined
      ? Number(productData.lengthCm)
      : (existingProd?.lengthCm || 20);

    const promotionalPrice = productData.promotionalPrice !== undefined
      ? (productData.promotionalPrice !== null && productData.promotionalPrice !== '' && !isNaN(Number(productData.promotionalPrice)) && Number(productData.promotionalPrice) > 0 ? Number(productData.promotionalPrice) : undefined)
      : existingProd?.promotionalPrice;

    const rawProduct: Record<string, any> = {
      id: prodId,
      name,
      slug,
      description,
      category,
      price,
      stock,
      images,
      active,
      featured,
      weightKg,
      widthCm,
      heightCm,
      lengthCm,
      createdAt: existingProd?.createdAt || productData.createdAt || now,
      updatedAt: now,
    };

    if (promotionalPrice !== undefined && promotionalPrice > 0) {
      rawProduct.promotionalPrice = promotionalPrice;
    }

    const sanitized = sanitizeForFirestore(rawProduct);
    await setDoc(doc(firestore, 'products', prodId), sanitized, { merge: true });
    await this.addLog('PRODUCT_SAVE', `Produto "${rawProduct.name}" salvo no banco em nuvem.`);
    return sanitized as Product;
  },

  async updateProductStock(id: string, newStock: number): Promise<void> {
    const now = new Date().toISOString();
    const clampedStock = Math.max(0, newStock);
    try {
      const prodRef = doc(firestore, 'products', id);
      await updateDoc(prodRef, {
        stock: clampedStock,
        updatedAt: now,
      });
      await this.addLog('STOCK_UPDATE', `Estoque do produto ${id} atualizado para ${clampedStock}.`);
    } catch (err) {
      console.warn('[Firestore] Falha no updateDoc de estoque, usando fallback seguro:', err);
      const existing = await this.getProduct(id).catch(() => null);
      if (existing) {
        existing.stock = clampedStock;
        existing.updatedAt = now;
        await setDoc(doc(firestore, 'products', id), sanitizeForFirestore(existing), { merge: true });
      }
    }
  },

  async deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'products', id));
    await this.addLog('PRODUCT_DELETE', `Produto ${id} excluído da nuvem.`);
  },

  // 2. SETTINGS
  async getSettings(): Promise<StoreSettings | null> {
    try {
      const d = await getDoc(doc(firestore, 'settings', 'consertacell_main'));
      if (d.exists()) {
        return d.data() as StoreSettings;
      }
      return null;
    } catch (err) {
      console.warn('[Firestore] Configurações em nuvem ainda não criadas:', err);
      return null;
    }
  },

  async saveSettings(settings: StoreSettings): Promise<StoreSettings> {
    const sanitized = sanitizeForFirestore(settings);
    await setDoc(doc(firestore, 'settings', 'consertacell_main'), sanitized, { merge: true });
    await this.addLog('SETTINGS_UPDATE', 'Configurações da loja atualizadas no banco em nuvem.');
    return sanitized as StoreSettings;
  },

  // 3. ADMIN CREDENTIALS
  async getAdminCreds(): Promise<{ username: string; passwordHash: string }> {
    try {
      const d = await getDoc(doc(firestore, 'settings', 'consertacell_auth'));
      if (d.exists()) {
        const data = d.data();
        return {
          username: data.username || 'admin',
          passwordHash: data.passwordHash || 'admin123',
        };
      }
    } catch (err) {
      console.warn('[Firestore] Usando credenciais padrão:', err);
    }
    return {
      username: 'admin',
      passwordHash: 'admin123',
    };
  },

  async saveAdminCreds(username: string, passwordHash: string): Promise<void> {
    const payload = sanitizeForFirestore({
      username,
      passwordHash,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(firestore, 'settings', 'consertacell_auth'), payload);
    await this.addLog('AUTH_UPDATE', `Credenciais do administrador alteradas para usuário "${username}".`);
  },

  // 4. ORDERS
  async checkOrderExpiration(order: Order): Promise<Order> {
    if (order.status !== 'pending') return order;
    const createdAtMs = new Date(order.createdAt).getTime();
    const expiresAtMs = order.expiresAt
      ? new Date(order.expiresAt).getTime()
      : createdAtMs + 30 * 60 * 1000;

    if (Date.now() > expiresAtMs) {
      console.log(`[Firestore] Pedido ${order.orderNumber} expirou (> 30 min). Cancelando e restaurando estoque.`);
      const now = new Date().toISOString();
      const updatedHistory = [
        ...(order.statusHistory || []),
        {
          status: 'cancelled' as OrderStatus,
          timestamp: now,
          note: 'Pedido cancelado automaticamente após 30 minutos sem confirmação de pagamento.',
        },
      ];

      const updates = {
        status: 'cancelled' as OrderStatus,
        updatedAt: now,
        statusHistory: updatedHistory,
      };

      try {
        await updateDoc(doc(firestore, 'orders', order.id), sanitizeForFirestore(updates));
        // Restore stock
        for (const it of order.items || []) {
          try {
            const prodRef = doc(firestore, 'products', it.productId);
            const pSnap = await getDoc(prodRef);
            if (pSnap.exists()) {
              const currentStock = Number(pSnap.data().stock) || 0;
              await updateDoc(prodRef, {
                stock: currentStock + it.quantity,
                updatedAt: now,
              });
            }
          } catch (stkErr) {
            console.warn('[Firestore] Falha ao restaurar estoque de produto cancelado:', stkErr);
          }
        }
        await this.addLog('ORDER_EXPIRED', `Pedido ${order.orderNumber} cancelado por expiração de tempo (30 minutos).`);
      } catch (e) {
        console.error('[Firestore] Erro ao persistir cancelamento por expiração:', e);
      }

      return {
        ...order,
        ...updates,
      };
    }
    return order;
  },

  async createOrder(order: Order): Promise<Order> {
    const sanitized = sanitizeForFirestore(order);
    await setDoc(doc(firestore, 'orders', order.id), sanitized);
    await this.addLog('ORDER_CREATE', `Pedido ${order.orderNumber} registrado no banco em nuvem (R$ ${order.total.toFixed(2)}).`);
    return sanitized as Order;
  },

  async getOrder(idOrNumber: string): Promise<Order | null> {
    try {
      // Direct ID
      const direct = await getDoc(doc(firestore, 'orders', idOrNumber));
      if (direct.exists()) {
        const orderData = { id: direct.id, ...direct.data() } as Order;
        return await this.checkOrderExpiration(orderData);
      }

      // Query by orderNumber (e.g. CC-1001)
      const q = query(collection(firestore, 'orders'), where('orderNumber', '==', idOrNumber));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const orderData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Order;
        return await this.checkOrderExpiration(orderData);
      }
      return null;
    } catch (err) {
      console.error('[Firestore] Erro ao buscar pedido:', err);
      return null;
    }
  },

  async getOrders(status?: string): Promise<Order[]> {
    try {
      const colRef = collection(firestore, 'orders');
      const q = status && status !== 'todos'
        ? query(colRef, where('status', '==', status))
        : query(colRef);

      const snap = await getDocs(q);
      const list: Order[] = [];
      for (const d of snap.docs) {
        const orderData = { id: d.id, ...d.data() } as Order;
        const verified = await this.checkOrderExpiration(orderData);
        // If caller requested pending orders and it was expired, omit it from pending
        if (status === 'pending' && verified.status !== 'pending') {
          continue;
        }
        list.push(verified);
      }

      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error('[Firestore] Erro ao listar pedidos:', err);
      return [];
    }
  },

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    note?: string,
    trackingCode?: string
  ): Promise<Order | null> {
    const existing = await this.getOrder(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedHistory = [
      ...(existing.statusHistory || []),
      {
        status,
        timestamp: now,
        note: note || `Status alterado para ${status}`,
      },
    ];

    const updates: Record<string, any> = {
      status,
      updatedAt: now,
      statusHistory: updatedHistory,
    };
    if (status === 'approved') {
      updates.paidAt = now;
    }
    if (trackingCode !== undefined && trackingCode !== null && trackingCode !== '') {
      updates.trackingCode = trackingCode;
    }

    const sanitized = sanitizeForFirestore(updates);
    await updateDoc(doc(firestore, 'orders', existing.id), sanitized);
    await this.addLog('ORDER_STATUS_UPDATE', `Pedido ${existing.orderNumber} atualizado para status "${status}".`);
    return { ...existing, ...sanitized } as Order;
  },

  // 5. AUDIT LOGS
  async addLog(action: string, details: string): Promise<void> {
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const log = sanitizeForFirestore({
        id: logId,
        timestamp: new Date().toISOString(),
        action,
        details,
        ip: 'Cloud Firestore',
      });
      await setDoc(doc(firestore, 'audit_logs', logId), log);
    } catch {
      // Non-blocking
    }
  },

  async getLogs(): Promise<AuditLog[]> {
    try {
      const snap = await getDocs(collection(firestore, 'audit_logs'));
      const list: AuditLog[] = [];
      snap.forEach((d) => list.push(d.data() as AuditLog));
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  },
};
