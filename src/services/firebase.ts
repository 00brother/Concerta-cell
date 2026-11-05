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
  orderBy,
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
    // Expected if doc doesn't exist, but connection is alive
    return true;
  }
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
    const prodId = id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const slug = (productData.name || 'produto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const product: Product = {
      id: prodId,
      name: productData.name,
      slug,
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
      createdAt: productData.createdAt || now,
      updatedAt: now,
    };

    await setDoc(doc(firestore, 'products', prodId), product, { merge: true });
    await this.addLog('PRODUCT_SAVE', `Produto "${product.name}" salvo no banco em nuvem.`);
    return product;
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
    await setDoc(doc(firestore, 'settings', 'consertacell_main'), settings, { merge: true });
    await this.addLog('SETTINGS_UPDATE', 'Configurações da loja atualizadas no banco em nuvem.');
    return settings;
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
    await setDoc(doc(firestore, 'settings', 'consertacell_auth'), {
      username,
      passwordHash,
      updatedAt: new Date().toISOString(),
    });
    await this.addLog('AUTH_UPDATE', `Credenciais do administrador alteradas para usuário "${username}".`);
  },

  // 4. ORDERS
  async createOrder(order: Order): Promise<Order> {
    await setDoc(doc(firestore, 'orders', order.id), order);
    await this.addLog('ORDER_CREATE', `Pedido ${order.orderNumber} registrado no banco em nuvem (R$ ${order.total.toFixed(2)}).`);
    return order;
  },

  async getOrder(idOrNumber: string): Promise<Order | null> {
    try {
      // First try by direct ID
      const direct = await getDoc(doc(firestore, 'orders', idOrNumber));
      if (direct.exists()) {
        return direct.data() as Order;
      }

      // Query by orderNumber (e.g. CC-1001)
      const q = query(collection(firestore, 'orders'), where('orderNumber', '==', idOrNumber));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as Order;
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
      snap.forEach((d) => {
        list.push(d.data() as Order);
      });

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

    const updates: Partial<Order> = {
      status,
      updatedAt: now,
      statusHistory: updatedHistory,
    };
    if (trackingCode !== undefined) {
      updates.trackingCode = trackingCode;
    }

    await updateDoc(doc(firestore, 'orders', existing.id), updates);
    await this.addLog('ORDER_STATUS_UPDATE', `Pedido ${existing.orderNumber} atualizado para status "${status}".`);
    return { ...existing, ...updates };
  },

  // 5. AUDIT LOGS
  async addLog(action: string, details: string): Promise<void> {
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(firestore, 'audit_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        action,
        details,
        ip: 'Cloud Firestore',
      });
    } catch {
      // Non-blocking log error
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
