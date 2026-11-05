import { Router, type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import { db } from './db.ts';
import type { ShippingOption, OrderStatus, Product } from '../src/types/index.ts';
import { generatePixBrCode, generatePixQrCodeDataUrl } from '../src/utils/pix.ts';
import { asaasService } from './asaas.ts';

export const apiRouter = Router();

// Middleware: Authenticate Admin Token
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acesso negado. Token de autenticação não fornecido.' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!db.validateToken(token)) {
    res.status(401).json({ error: 'Sessão expirada ou token inválido. Faça login novamente.' });
    return;
  }
  next();
}

// -------------------------------------------------------------
// 1. SETTINGS ROUTES
// -------------------------------------------------------------

apiRouter.get('/settings', (_req: Request, res: Response) => {
  res.json(db.getPublicSettings());
});

apiRouter.get('/admin/settings', requireAdmin, (_req: Request, res: Response) => {
  res.json(db.getSettings());
});

apiRouter.put('/admin/settings', requireAdmin, (req: Request, res: Response) => {
  try {
    const updated = db.updateSettings(req.body, 'Administrador');
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao atualizar configurações' });
  }
});

// -------------------------------------------------------------
// 2. PRODUCTS ROUTES
// -------------------------------------------------------------

apiRouter.get('/products', (req: Request, res: Response) => {
  const { category, search, sort, activeOnly } = req.query;
  let products = db.getProducts(activeOnly !== 'false');

  if (category && typeof category === 'string' && category !== 'todos') {
    products = products.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    products = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }

  if (sort === 'price-asc') {
    products.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-desc') {
    products.sort((a, b) => b.price - a.price);
  } else {
    products.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  res.json(products);
});

apiRouter.get('/products/:id', (req: Request, res: Response) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Produto não encontrado' });
    return;
  }
  res.json(product);
});

apiRouter.post('/admin/products', requireAdmin, (req: Request, res: Response) => {
  const {
    name,
    description,
    category,
    price,
    promotionalPrice,
    stock,
    images,
    active,
    featured,
    weightKg,
    widthCm,
    heightCm,
    lengthCm,
  } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'Nome do produto é obrigatório' });
    return;
  }

  const numericPrice = Number(price);
  if (isNaN(numericPrice) || numericPrice < 0) {
    res.status(400).json({ error: 'Preço deve ser um valor válido' });
    return;
  }

  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const product = db.createProduct(
    {
      name: name.trim(),
      slug,
      description: description || '',
      category: category || 'Geral',
      price: numericPrice,
      promotionalPrice: promotionalPrice ? Number(promotionalPrice) : undefined,
      stock: Number(stock) || 0,
      images: Array.isArray(images) && images.length > 0 ? images : ['/logo.png'],
      active: active !== undefined ? Boolean(active) : true,
      featured: Boolean(featured),
      weightKg: Number(weightKg) || 0.3,
      widthCm: Number(widthCm) || 15,
      heightCm: Number(heightCm) || 5,
      lengthCm: Number(lengthCm) || 20,
    },
    'Administrador'
  );

  res.status(201).json(product);
});

apiRouter.put('/admin/products/:id', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateProduct(req.params.id, req.body, 'Administrador');
  if (!updated) {
    res.status(404).json({ error: 'Produto não encontrado' });
    return;
  }
  res.json(updated);
});

apiRouter.delete('/admin/products/:id', requireAdmin, (req: Request, res: Response) => {
  const success = db.deleteProduct(req.params.id, 'Administrador');
  if (!success) {
    res.status(404).json({ error: 'Produto não encontrado' });
    return;
  }
  res.json({ message: 'Produto excluído com sucesso' });
});

// -------------------------------------------------------------
// 3. SHIPPING CALCULATION (LOCAL ARAPONGAS & CORREIOS PAC/SEDEX)
// -------------------------------------------------------------

apiRouter.post('/shipping/calculate', (req: Request, res: Response) => {
  const { cep, items } = req.body;
  if (!cep) {
    res.status(400).json({ error: 'CEP de destino é obrigatório' });
    return;
  }

  const cleanCep = String(cep).replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    res.status(400).json({ error: 'CEP inválido. Deve conter 8 dígitos numéricos.' });
    return;
  }

  const settings = db.getSettings();
  const options: ShippingOption[] = [];

  // 1. Opção permanente: Retirar no Local (Balcão Conserta Cell - Arapongas/PR)
  options.push({
    id: 'pickup',
    title: 'Retirar no Local — Balcão Conserta Cell',
    price: 0,
    estimatedDays: 'Pronto em até 2 horas úteis',
    description: 'Retirada gratuita na loja física em Arapongas/PR. Avisamos assim que o pedido for separado.',
    isLocal: true,
  });

  // Arapongas range: 86700-000 to 86719-999
  const cepNum = parseInt(cleanCep, 10);
  const startNum = parseInt(settings.localDelivery.cepStart.replace(/\D/g, ''), 10);
  const endNum = parseInt(settings.localDelivery.cepEnd.replace(/\D/g, ''), 10);

  const isArapongas = cepNum >= startNum && cepNum <= endNum;

  if (isArapongas) {
    // Local Delivery in Arapongas
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
    // Outside Arapongas: Correios PAC & SEDEX
    if (settings.correios.enabled) {
      // Calculate total weight and package volume
      let totalWeight = 0;
      let totalVolumeCm3 = 0;

      if (Array.isArray(items)) {
        for (const it of items) {
          const prod = db.getProductById(it.productId);
          const qty = Math.max(1, Number(it.quantity) || 1);
          const weight = prod?.weightKg || 0.25;
          const w = prod?.widthCm || 15;
          const h = prod?.heightCm || 4;
          const l = prod?.lengthCm || 20;

          totalWeight += weight * qty;
          totalVolumeCm3 += w * h * l * qty;
        }
      }

      if (totalWeight <= 0) totalWeight = 0.3;

      // Volumetric weight according to Correios rule: V / 6000
      const volumetricWeight = totalVolumeCm3 / 6000;
      const billedWeight = Math.max(totalWeight, volumetricWeight);

      // Base postal distance tier calculation based on destination CEP prefix
      const statePrefix = parseInt(cleanCep.substring(0, 2), 10);
      let pacBase = 18.9;
      let sedexBase = 28.5;
      let pacDays = '3 a 5 dias úteis';
      let sedexDays = '1 a 2 dias úteis';

      if (statePrefix >= 80 && statePrefix <= 87) {
        // Paraná (same state)
        pacBase = 18.5;
        sedexBase = 26.9;
        pacDays = '2 a 4 dias úteis';
        sedexDays = '1 dia útil';
      } else if (statePrefix >= 11 && statePrefix <= 19) {
        // São Paulo
        pacBase = 22.9;
        sedexBase = 36.9;
        pacDays = '3 a 5 dias úteis';
        sedexDays = '1 a 2 dias úteis';
      } else if (statePrefix >= 88 && statePrefix <= 99) {
        // Santa Catarina & Rio Grande do Sul
        pacBase = 24.5;
        sedexBase = 39.9;
        pacDays = '4 a 6 dias úteis';
        sedexDays = '2 a 3 dias úteis';
      } else if (statePrefix >= 20 && statePrefix <= 39) {
        // Rio de Janeiro, Minas Gerais & Espírito Santo
        pacBase = 28.9;
        sedexBase = 46.5;
        pacDays = '4 a 7 dias úteis';
        sedexDays = '2 a 3 dias úteis';
      } else if (statePrefix >= 70 && statePrefix <= 79) {
        // Centro-Oeste
        pacBase = 32.5;
        sedexBase = 54.0;
        pacDays = '5 a 8 dias úteis';
        sedexDays = '2 a 4 dias úteis';
      } else {
        // Nordeste e Norte
        pacBase = 39.9;
        sedexBase = 68.9;
        pacDays = '7 a 12 dias úteis';
        sedexDays = '3 a 5 dias úteis';
      }

      // Progressive weight surcharge for packages > 1kg
      if (billedWeight > 1) {
        const extraKg = Math.ceil(billedWeight - 1);
        pacBase += extraKg * 4.8;
        sedexBase += extraKg * 8.5;
      }

      options.push({
        id: 'correios_pac',
        title: 'Correios — PAC',
        price: Number(pacBase.toFixed(2)),
        estimatedDays: pacDays,
        description: 'Envio econômico oficial com código de rastreio dos Correios.',
        isLocal: false,
      });

      options.push({
        id: 'correios_sedex',
        title: 'Correios — SEDEX',
        price: Number(sedexBase.toFixed(2)),
        estimatedDays: sedexDays,
        description: 'Envio expresso prioritário com entrega rápida e rastreamento.',
        isLocal: false,
      });
    }
  }

  res.json({
    isLocal: isArapongas,
    options,
    note: isArapongas
      ? 'Endereço em Arapongas/PR com entrega local.'
      : 'Cálculo de frete Correios baseado em peso e dimensões reais.',
  });
});

// -------------------------------------------------------------
// 4. ORDERS & MERCADO PAGO INTEGRATION
// -------------------------------------------------------------

apiRouter.post('/orders', async (req: Request, res: Response) => {
  const {
    customer,
    items,
    shippingOptionId,
    paymentMethod,
    installmentsCount,
    cardToken,
    cardLast4,
    cardBrand,
  } = req.body;

  // If in-store pickup, populate default store address if missing
  if (shippingOptionId === 'pickup' && customer) {
    if (!customer.street || !customer.street.trim()) customer.street = 'Retirada no Balcão Conserta Cell';
    if (!customer.number || !customer.number.trim()) customer.number = 'Loja Física';
    if (!customer.neighborhood || !customer.neighborhood.trim()) customer.neighborhood = 'Centro';
    if (!customer.city || !customer.city.trim()) customer.city = 'Arapongas';
    if (!customer.state || !customer.state.trim()) customer.state = 'PR';
    if (!customer.cep || !customer.cep.trim()) customer.cep = '86700-000';
  }

  if (
    !customer ||
    !customer.fullName ||
    !customer.cpf ||
    !customer.phone ||
    !customer.cep ||
    !customer.street
  ) {
    res.status(400).json({ error: 'Dados cadastrais e endereço incompletos para envio do pedido.' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'O carrinho está vazio.' });
    return;
  }

  const settings = db.getSettings();

  // Validate stock and recalculate subtotal strictly from DB prices (tamper prevention)
  let subtotal = 0;
  let totalWeight = 0;
  let totalVolume = 0;

  const verifiedItems: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    image?: string;
  }[] = [];

  for (const it of items) {
    const prod = db.getProductById(it.productId);
    if (!prod) {
      res.status(400).json({ error: `Produto "${it.productName || it.productId}" não está mais disponível.` });
      return;
    }
    if (!prod.active) {
      res.status(400).json({ error: `O produto "${prod.name}" está inativo no momento.` });
      return;
    }
    const requestedQty = Math.max(1, parseInt(it.quantity, 10) || 1);
    if (prod.stock < requestedQty) {
      res.status(400).json({
        error: `Estoque insuficiente para "${prod.name}". Disponível em estoque: ${prod.stock} unidade(s).`,
      });
      return;
    }

    const actualPrice = prod.promotionalPrice && prod.promotionalPrice > 0 ? prod.promotionalPrice : prod.price;
    subtotal += actualPrice * requestedQty;
    totalWeight += (prod.weightKg || 0.25) * requestedQty;
    totalVolume += (prod.widthCm || 15) * (prod.heightCm || 4) * (prod.lengthCm || 20) * requestedQty;

    verifiedItems.push({
      productId: prod.id,
      productName: prod.name,
      price: actualPrice,
      quantity: requestedQty,
      image: prod.images[0] || '/logo.png',
    });
  }

  // Calculate Shipping
  const cleanCep = String(customer.cep).replace(/\D/g, '');
  const cepNum = parseInt(cleanCep, 10);
  const startNum = parseInt(settings.localDelivery.cepStart.replace(/\D/g, ''), 10);
  const endNum = parseInt(settings.localDelivery.cepEnd.replace(/\D/g, ''), 10);
  const isArapongas = cepNum >= startNum && cepNum <= endNum;

  let selectedShipping: ShippingOption;

  if (shippingOptionId === 'pickup') {
    selectedShipping = {
      id: 'pickup',
      title: 'Retirar no Local — Balcão Conserta Cell',
      price: 0,
      estimatedDays: 'Pronto em até 2 horas úteis',
      description: 'Retirada gratuita na loja física em Arapongas/PR.',
      isLocal: true,
    };
  } else if (isArapongas) {
    selectedShipping = {
      id: 'local',
      title: 'Entrega Local — Arapongas/PR',
      price: Number(settings.localDelivery.fee.toFixed(2)),
      estimatedDays: settings.localDelivery.estimatedTime,
      description: 'Entrega rápida na sua residência ou empresa em Arapongas.',
      isLocal: true,
    };
  } else {
    // Determine PAC or SEDEX
    const billedWeight = Math.max(totalWeight, totalVolume / 6000);
    const statePrefix = parseInt(cleanCep.substring(0, 2), 10);
    let pacBase = 18.5;
    let sedexBase = 26.9;
    let pacDays = '2 a 4 dias úteis';
    let sedexDays = '1 a 2 dias úteis';

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

    if (shippingOptionId === 'correios_sedex') {
      selectedShipping = {
        id: 'correios_sedex',
        title: 'Correios — SEDEX',
        price: Number(sedexBase.toFixed(2)),
        estimatedDays: sedexDays,
        description: 'Envio expresso com código de rastreio.',
        isLocal: false,
      };
    } else {
      selectedShipping = {
        id: 'correios_pac',
        title: 'Correios — PAC',
        price: Number(pacBase.toFixed(2)),
        estimatedDays: pacDays,
        description: 'Envio econômico com código de rastreio.',
        isLocal: false,
      };
    }
  }

  const total = Number((subtotal + selectedShipping.price).toFixed(2));

  // Determine next order number for Asaas externalReference correlation
  const existingOrdersCount = db.getOrders().length;
  const orderNumber = `CC-${existingOrdersCount + 1001}`;

  // Installments calculation: up to 3x sem juros, up to 21x with interest
  let installmentPlan = undefined;
  if (paymentMethod === 'credit_card') {
    installmentPlan = asaasService.calculateInstallmentPlan(
      total,
      parseInt(installmentsCount, 10) || 1,
      settings.payment.maxInterestFree || 3,
      settings.payment.maxInstallments || 21,
      settings.payment.interestRateMonthly || 1.99
    );
  }

  // Payment processing with Asaas
  let pixCode: string | undefined = undefined;
  let pixQrCodeBase64: string | undefined = undefined;
  let asaasPaymentId: string | undefined = undefined;
  let asaasCustomerId: string | undefined = undefined;
  let asaasInvoiceUrl: string | undefined = undefined;
  let asaasStatus: string | undefined = undefined;
  let finalCardBrand: string | undefined = cardBrand;
  let finalCardLast4: string | undefined = cardLast4;
  let initialStatus: OrderStatus = 'pending';
  let paidAt: string | undefined = undefined;

  const isAsaasConfigured = asaasService.isConfigured(settings.payment);

  if (paymentMethod === 'pix') {
    if (isAsaasConfigured) {
      try {
        const pixRes = await asaasService.createPixCharge({
          customer,
          amount: total,
          orderNumber,
          customConfig: settings.payment,
        });

        pixCode = pixRes.pixCode;
        pixQrCodeBase64 = pixRes.pixQrCodeBase64;
        asaasPaymentId = pixRes.paymentId;
        asaasCustomerId = pixRes.customerId;
        asaasInvoiceUrl = pixRes.invoiceUrl;
        asaasStatus = pixRes.status;
      } catch (err: any) {
        console.error('[Asaas] Erro ao criar cobrança PIX:', err);
        res.status(400).json({
          error: `Erro ao gerar cobrança PIX no Asaas: ${err.message || 'Verifique as credenciais.'}`,
        });
        return;
      }
    } else {
      // Asaas not configured yet with API key:
      // Record order without simulating fake PIX or pretending charge was registered
      console.warn('[Asaas] API Key do Asaas não configurada. Pedido registrado em modo de configuração.');
    }
  } else if (paymentMethod === 'credit_card') {
    if (!isAsaasConfigured) {
      res.status(400).json({
        error:
          'O processamento de cartão de crédito requer a configuração da chave de API do Asaas no servidor (ASAAS_API_KEY ou no Painel Administrativo).',
      });
      return;
    }

    const creditCard = req.body.creditCard;
    if (
      !creditCard ||
      !creditCard.number ||
      !creditCard.holderName ||
      !creditCard.ccv ||
      !creditCard.expiryMonth ||
      !creditCard.expiryYear
    ) {
      res.status(400).json({
        error: 'Dados completos do cartão de crédito são obrigatórios para processamento seguro via Asaas.',
      });
      return;
    }

    try {
      const cardRes = await asaasService.createCreditCardCharge({
        customer,
        orderNumber,
        totalAmount: total,
        installments: installmentPlan,
        creditCard,
        customConfig: settings.payment,
      });

      asaasPaymentId = cardRes.paymentId;
      asaasCustomerId = cardRes.customerId;
      asaasInvoiceUrl = cardRes.invoiceUrl;
      asaasStatus = cardRes.status;
      finalCardBrand = cardRes.cardBrand;
      finalCardLast4 = cardRes.cardLast4;

      if (cardRes.status === 'CONFIRMED' || cardRes.status === 'RECEIVED') {
        initialStatus = 'approved';
        paidAt = new Date().toISOString();
      }
    } catch (err: any) {
      console.error('[Asaas] Falha no pagamento com cartão:', err);
      res.status(400).json({
        error: `Pagamento com cartão não autorizado: ${err.message || 'Verifique os dados informados.'}`,
      });
      return;
    }
  }

  const order = db.createOrder({
    customer,
    items: verifiedItems,
    subtotal: Number(subtotal.toFixed(2)),
    shippingCost: selectedShipping.price,
    shippingSelection: selectedShipping,
    total,
    paymentMethod: paymentMethod === 'credit_card' ? 'credit_card' : 'pix',
    installments: installmentPlan,
    status: initialStatus,
    paidAt,
    pixCode,
    pixQrCodeBase64,
    cardBrand: finalCardBrand || (paymentMethod === 'credit_card' ? 'Cartão' : undefined),
    cardLast4: finalCardLast4 || undefined,
    asaasPaymentId,
    asaasCustomerId,
    asaasInvoiceUrl,
    asaasStatus,
  });

  res.status(201).json(order);
});

apiRouter.get('/orders/:id', (req: Request, res: Response) => {
  const order = db.getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido não localizado.' });
    return;
  }
  res.json(order);
});

// -------------------------------------------------------------
// 5. ADMIN AUTH & DASHBOARD
// -------------------------------------------------------------

apiRouter.post('/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    return;
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const result = db.authenticateAdmin(username, password, clientIp);

  if (!result.token) {
    const statusCode = result.locked ? 429 : 401;
    res.status(statusCode).json({
      error: result.error || 'Credenciais inválidas.',
      locked: result.locked,
      remainingAttempts: result.remainingAttempts,
    });
    return;
  }

  res.json({
    token: result.token,
    user: result.user,
  });
});

apiRouter.post('/admin/logout', requireAdmin, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.invalidateToken(token);
  }
  res.json({ message: 'Sessão encerrada com sucesso.' });
});

apiRouter.get('/admin/orders', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.query;
  let orders = db.getOrders();
  if (status && typeof status === 'string' && status !== 'todos') {
    orders = orders.filter((o) => o.status === status);
  }
  res.json(orders);
});

apiRouter.patch('/admin/orders/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { status, note, trackingCode } = req.body;
  if (!status) {
    res.status(400).json({ error: 'Status do pedido é obrigatório.' });
    return;
  }

  const validStatuses: OrderStatus[] = [
    'pending',
    'approved',
    'preparing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ];

  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Status informado é inválido.' });
    return;
  }

  const updated = db.updateOrderStatus(req.params.id, status, note, trackingCode, 'Administrador');
  if (!updated) {
    res.status(404).json({ error: 'Pedido não encontrado.' });
    return;
  }

  res.json(updated);
});

apiRouter.get('/admin/logs', requireAdmin, (_req: Request, res: Response) => {
  res.json(db.getAuditLogs());
});

apiRouter.post('/admin/credentials', requireAdmin, (req: Request, res: Response) => {
  const { currentPassword, newUsername, newPassword } = req.body;

  if (!currentPassword) {
    res.status(400).json({ error: 'A senha atual é obrigatória para autorizar alterações de segurança.' });
    return;
  }

  const result = db.updateAdminCredentials(currentPassword, newUsername, newPassword, 'Administrador');
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ message: 'Credenciais de acesso atualizadas com sucesso. Por segurança, faça login novamente.' });
});

// -------------------------------------------------------------
// 6. ASAAS PAYMENT WEBHOOK & STATUS INQUIRY
// -------------------------------------------------------------

apiRouter.post('/webhooks/asaas', async (req: Request, res: Response) => {
  const settings = db.getSettings();
  const tokenHeader = (req.headers['asaas-access-token'] as string) || '';

  // 1. Validate Webhook Security Token
  const isTokenValid = asaasService.verifyWebhookToken(tokenHeader, settings.payment);
  if (!isTokenValid) {
    console.warn('[Asaas Webhook] Notificação rejeitada: token de webhook inválido.');
    res.status(401).json({ error: 'Token de autenticação do webhook inválido.' });
    return;
  }

  const { event, payment } = req.body || {};
  if (!event || !payment) {
    res.status(400).json({ error: 'Payload de webhook incompleto.' });
    return;
  }

  const paymentId = payment.id;
  const externalRef = payment.externalReference;
  db.logAction('ASAAS_WEBHOOK', `Evento "${event}" recebido para a cobrança ${paymentId} (${externalRef || 'sem ref'})`);

  const allOrders = db.getOrders();
  const targetOrder = allOrders.find(
    (o) =>
      (externalRef && o.orderNumber === externalRef) ||
      (paymentId && o.asaasPaymentId === paymentId) ||
      (externalRef && o.id === externalRef)
  );

  if (!targetOrder) {
    console.warn(`[Asaas Webhook] Nenhum pedido local corresponde à cobrança ${paymentId} / ${externalRef}`);
    res.status(200).json({ status: 'ignored', message: 'Pedido não encontrado.' });
    return;
  }

  // Idempotency: Prevent double processing
  if (
    (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') &&
    targetOrder.status === 'approved'
  ) {
    console.log(`[Asaas Webhook] Pedido ${targetOrder.orderNumber} já se encontra aprovado. Ignorando.`);
    res.status(200).json({ status: 'already_processed' });
    return;
  }

  if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
    db.updateOrderStatus(
      targetOrder.id,
      'approved',
      `Pagamento de R$ ${payment.value || targetOrder.total} confirmado legitimamente pelo Asaas (${payment.billingType || 'Cobrança'}).`
    );
    console.log(`[Asaas Webhook] ✅ Pedido ${targetOrder.orderNumber} APROVADO via Asaas.`);
  } else if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_DELETED') {
    if (targetOrder.status === 'pending') {
      db.updateOrderStatus(
        targetOrder.id,
        'cancelled',
        `Cobrança cancelada ou vencida no Asaas (${event}).`
      );
    }
  } else if (event === 'PAYMENT_REFUNDED') {
    db.updateOrderStatus(
      targetOrder.id,
      'cancelled',
      `Pagamento estornado no Asaas.`
    );
  }

  res.status(200).json({ status: 'success', received: true });
});

// Also keep legacy /webhooks/mercadopago endpoint for safety, returning 200
apiRouter.post('/webhooks/mercadopago', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', provider: 'migrated_to_asaas' });
});

// 7. REAL-TIME PAYMENT STATUS CHECK
apiRouter.get('/orders/:id/payment-status', async (req: Request, res: Response) => {
  const order = db.getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido não localizado.' });
    return;
  }

  const settings = db.getSettings();
  if (order.status === 'pending' && order.asaasPaymentId && asaasService.isConfigured(settings.payment)) {
    try {
      const asaasStatus = await asaasService.getPaymentStatus(order.asaasPaymentId, settings.payment);
      if (asaasStatus.status === 'CONFIRMED' || asaasStatus.status === 'RECEIVED') {
        const updated = db.updateOrderStatus(
          order.id,
          'approved',
          'Pagamento confirmado e verificado em tempo real com o Asaas.'
        );
        res.json({ order: updated, asaas: asaasStatus, updated: true });
        return;
      }
    } catch (err) {
      console.warn('[Asaas] Falha ao consultar status em tempo real:', err);
    }
  }

  res.json({ order, updated: false });
});

// 8. ADMIN ASAAS STATUS ENDPOINT
apiRouter.get('/admin/asaas/status', requireAdmin, (_req: Request, res: Response) => {
  const settings = db.getSettings();
  const isConfigured = asaasService.isConfigured(settings.payment);
  const environment = asaasService.getEnvironment(settings.payment);
  const maskedKey = asaasService.maskApiKey(settings.payment.apiKey);
  const webhookConfigured = Boolean(
    process.env.ASAAS_WEBHOOK_TOKEN || settings.payment.webhookAccessToken
  );

  res.json({
    isConfigured,
    environment,
    maskedKey,
    webhookConfigured,
    provider: 'asaas',
  });
});
