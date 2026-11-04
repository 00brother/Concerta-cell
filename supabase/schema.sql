-- SCHEMA SQL PARA SUPABASE (Conserta Cell E-commerce)
-- Copie e cole este código no SQL Editor do seu projeto Supabase e clique em RUN.

-- 1. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Geral',
  price NUMERIC(10, 2) NOT NULL,
  promotional_price NUMERIC(10, 2),
  stock INTEGER NOT NULL DEFAULT 0,
  images JSONB NOT NULL DEFAULT '["/logo.png"]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  weight_kg NUMERIC(6, 3) NOT NULL DEFAULT 0.250,
  width_cm NUMERIC(6, 2) NOT NULL DEFAULT 15.00,
  height_cm NUMERIC(6, 2) NOT NULL DEFAULT 5.00,
  length_cm NUMERIC(6, 2) NOT NULL DEFAULT 20.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  shipping_cost NUMERIC(10, 2) NOT NULL,
  shipping_selection JSONB NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  installments JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  pix_code TEXT,
  pix_qr_code_base64 TEXT,
  card_brand TEXT,
  card_last4 TEXT,
  mp_payment_id TEXT,
  tracking_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE CONFIGURAÇÕES DA LOJA
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'consertacell_main',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABELA DE AUDITORIA & LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- HABILITAR LEITURA PÚBLICA PARA O CATÁLOGO
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Produtos ativos públicos" ON public.products
  FOR SELECT USING (active = true);

CREATE POLICY "Configurações públicas" ON public.settings
  FOR SELECT USING (true);
