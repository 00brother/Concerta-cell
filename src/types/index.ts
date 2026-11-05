export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  promotionalPrice?: number;
  stock: number;
  images: string[];
  active: boolean;
  featured: boolean;
  weightKg: number;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  companyName: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  whatsappUrl: string;
  address: string;
  hours: {
    weekday: string;
    saturday: string;
    sunday: string;
  };
  aboutText: string;
  pickup?: {
    enabled: boolean;
    estimatedTime: string;
    instructions: string;
    address: string;
  };
  localDelivery: {
    enabled: boolean;
    fee: number;
    estimatedTime: string;
    cepStart: string;
    cepEnd: string;
  };
  correios: {
    enabled: boolean;
    originCep: string;
    apiConfigured: boolean;
    apiKey?: string;
    contractCode?: string;
    fallbackNote: string;
  };
  payment: {
    provider: 'mercadopago' | 'pix_direct';
    isConfigured: boolean;
    publicKey?: string;
    accessToken?: string;
    webhookSecret?: string;
    maxInstallments: number;
    maxInterestFree: number;
    interestRateMonthly: number;
    pixKey?: string;
    pixKeyType?: 'cnpj' | 'cpf' | 'phone' | 'email' | 'random';
    pixRecipientName?: string;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CustomerInfo {
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export type ShippingType = 'local' | 'pickup' | 'correios_pac' | 'correios_sedex';

export interface ShippingOption {
  id: ShippingType;
  title: string;
  price: number;
  estimatedDays: string;
  description: string;
  isLocal: boolean;
}

export type OrderStatus =
  | 'pending'
  | 'approved'
  | 'preparing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface InstallmentPlan {
  count: number;
  installmentValue: number;
  totalAmount: number;
  hasInterest: boolean;
  interestRate: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  shippingSelection: ShippingOption;
  total: number;
  paymentMethod: 'pix' | 'credit_card';
  installments?: InstallmentPlan;
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  pixCode?: string;
  pixQrCodeBase64?: string;
  cardBrand?: string;
  cardLast4?: string;
  mpPaymentId?: string;
  trackingCode?: string;
  expiresAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  ip?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: 'admin';
}
