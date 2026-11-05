import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Package,
  Settings as SettingsIcon,
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  CreditCard,
  FileText,
  AlertCircle,
  LogOut,
  Save,
  Search,
  Upload,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Key,
  Check,
} from 'lucide-react';
import type { Product, Order, StoreSettings, AuditLog, OrderStatus } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStoreUpdated: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  onStoreUpdated,
}) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('consertacell_admin_token') || null;
  });

  // Auth form
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Tabs: 'products' | 'orders' | 'settings' | 'security' | 'logs'
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'settings' | 'security' | 'logs'>('products');

  // Products Data
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Orders Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<string>('todos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending');
  const [trackingCodeInput, setTrackingCodeInput] = useState('');
  const [statusNoteInput, setStatusNoteInput] = useState('');

  // Settings Data
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');

  // Logs Data
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Admin Credentials Update State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [credentialsMsg, setCredentialsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);

  // Product Form State
  const [prodForm, setProdForm] = useState({
    name: '',
    category: 'Capinhas & Películas',
    price: '',
    promotionalPrice: '',
    stock: '10',
    weightKg: '0.2',
    description: '',
    imageUrl: '',
    active: true,
    featured: false,
  });

  useEffect(() => {
    if (isOpen && token) {
      loadTabData();
    }
  }, [isOpen, token, activeTab]);

  const loadTabData = async () => {
    if (!token) return;

    if (activeTab === 'products') {
      setProductsLoading(true);
      try {
        const list = await api.getProducts({ activeOnly: 'false' as any });
        setProducts(list);
      } catch (e) {
        console.error(e);
      } finally {
        setProductsLoading(false);
      }
    } else if (activeTab === 'orders') {
      setOrdersLoading(true);
      try {
        const list = await api.getAdminOrders(token, orderFilter === 'todos' ? undefined : orderFilter);
        setOrders(list);
      } catch (e) {
        console.error(e);
      } finally {
        setOrdersLoading(false);
      }
    } else if (activeTab === 'settings') {
      setSettingsLoading(true);
      try {
        const data = await api.getAdminSettings(token);
        setSettings(data);
      } catch (e) {
        console.error(e);
      } finally {
        setSettingsLoading(false);
      }
    } else if (activeTab === 'logs') {
      try {
        const logData = await api.getAdminLogs(token);
        setLogs(logData);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await api.adminLogin(usernameInput, passwordInput);
      setToken(res.token);
      localStorage.setItem('consertacell_admin_token', res.token);
      setUsernameInput('');
      setPasswordInput('');
    } catch (err: any) {
      setLoginError(err.message || 'Credenciais inválidas');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('consertacell_admin_token');
  };

  // Open Product Modal for Creation or Edit
  const openProductForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProdForm({
        name: product.name,
        category: product.category,
        price: String(product.price),
        promotionalPrice: product.promotionalPrice ? String(product.promotionalPrice) : '',
        stock: String(product.stock),
        weightKg: String(product.weightKg || 0.3),
        description: product.description || '',
        imageUrl: product.images[0] || '',
        active: product.active,
        featured: product.featured,
      });
    } else {
      setEditingProduct(null);
      setProdForm({
        name: '',
        category: 'Capinhas & Películas',
        price: '',
        promotionalPrice: '',
        stock: '10',
        weightKg: '0.2',
        description: '',
        imageUrl: '',
        active: true,
        featured: false,
      });
    }
    setProductModalOpen(true);
  };

  // Handle Image Upload to Base64
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProdForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const payload = {
        name: prodForm.name,
        category: prodForm.category,
        price: parseFloat(prodForm.price),
        promotionalPrice: prodForm.promotionalPrice ? parseFloat(prodForm.promotionalPrice) : undefined,
        stock: parseInt(prodForm.stock, 10),
        weightKg: parseFloat(prodForm.weightKg) || 0.3,
        description: prodForm.description,
        images: prodForm.imageUrl ? [prodForm.imageUrl] : ['./logo.png'],
        active: prodForm.active,
        featured: prodForm.featured,
      };

      if (editingProduct) {
        await api.updateAdminProduct(editingProduct.id, payload, token);
      } else {
        await api.createAdminProduct(payload, token);
      }

      setProductModalOpen(false);
      loadTabData();
      onStoreUpdated();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar produto');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!token) return;
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) return;

    try {
      await api.deleteAdminProduct(id, token);
      loadTabData();
      onStoreUpdated();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir produto');
    }
  };

  const handleToggleProductStatus = async (product: Product) => {
    if (!token) return;
    try {
      await api.updateAdminProduct(product.id, { active: !product.active }, token);
      loadTabData();
      onStoreUpdated();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar produto');
    }
  };

  // Order Details & Status Update
  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setTrackingCodeInput(order.trackingCode || '');
    setStatusNoteInput('');
  };

  const handleUpdateOrderStatus = async () => {
    if (!token || !selectedOrder) return;

    try {
      const updated = await api.updateAdminOrderStatus(
        selectedOrder.id,
        {
          status: newStatus,
          trackingCode: trackingCodeInput || undefined,
          note: statusNoteInput || undefined,
        },
        token
      );
      setSelectedOrder(updated);
      loadTabData();
      alert('Status do pedido atualizado com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !settings) return;

    setSettingsSavedMsg('');
    try {
      await api.updateAdminSettings(settings, token);
      setSettingsSavedMsg('Configurações atualizadas com sucesso!');
      setTimeout(() => setSettingsSavedMsg(''), 4000);
      onStoreUpdated();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configurações');
    }
  };

  // Password Complexity Validation Helpers
  const hasMinLen = newPasswordInput.length >= 8;
  const hasUpper = /[A-Z]/.test(newPasswordInput);
  const hasLower = /[a-z]/.test(newPasswordInput);
  const hasNumber = /[0-9]/.test(newPasswordInput);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPasswordInput);
  const isNewPasswordValid = !newPasswordInput || (hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial);
  const isPasswordMatching = !newPasswordInput || (newPasswordInput === confirmPasswordInput);

  // Update Admin Credentials (Username and/or Password)
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!currentPasswordInput) {
      setCredentialsMsg({ type: 'error', text: 'Informe a senha atual para autorizar as alterações de segurança.' });
      return;
    }

    if (newPasswordInput) {
      if (!hasMinLen || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        setCredentialsMsg({
          type: 'error',
          text: 'A nova senha deve atender a todos os 5 critérios de segurança.',
        });
        return;
      }
      if (newPasswordInput !== confirmPasswordInput) {
        setCredentialsMsg({ type: 'error', text: 'A confirmação de senha não confere com a nova senha digitada.' });
        return;
      }
    }

    if (newUsernameInput && newUsernameInput.trim().length < 4) {
      setCredentialsMsg({ type: 'error', text: 'O novo nome de usuário deve conter pelo menos 4 caracteres.' });
      return;
    }

    if (!newUsernameInput.trim() && !newPasswordInput) {
      setCredentialsMsg({ type: 'error', text: 'Preencha um novo nome de usuário ou uma nova senha para atualizar.' });
      return;
    }

    setCredentialsLoading(true);
    setCredentialsMsg(null);

    try {
      const res = await api.updateAdminCredentials(
        {
          currentPassword: currentPasswordInput,
          newUsername: newUsernameInput.trim() || undefined,
          newPassword: newPasswordInput || undefined,
        },
        token
      );

      setCredentialsMsg({
        type: 'success',
        text: `${res.message || 'Credenciais atualizadas com sucesso!'} O acesso será desconectado em 3 segundos para que você entre com os novos dados.`,
      });

      setCurrentPasswordInput('');
      setNewUsernameInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');

      setTimeout(() => {
        handleLogout();
      }, 3000);
    } catch (err: any) {
      setCredentialsMsg({
        type: 'error',
        text: err.message || 'Falha ao atualizar credenciais de acesso.',
      });
    } finally {
      setCredentialsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/90 sm:backdrop-blur-md overflow-hidden">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] max-w-6xl bg-[#121212] border-0 sm:border border-[#2a2a2a] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="p-3.5 sm:p-5 border-b border-[#262626] bg-[#171717] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-500">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Painel do Lojista — Conserta Cell
                <span className="text-[10px] font-normal bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-800/60">
                  Arapongas/PR
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Gestão comercial de produtos, pedidos, entregas e pagamentos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {token && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-[#222222] hover:bg-neutral-800 text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Desconectar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* If Not Logged In: Show Authentication Form */}
        {!token ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-600/50 flex items-center justify-center text-red-500">
              <Lock className="w-8 h-8" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Acesso Restrito ao Lojista</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Área reservada para a administração da Conserta Cell.
              </p>
            </div>

            {loginError && (
              <div className="w-full p-3.5 bg-red-950/70 border border-red-700/80 rounded-xl text-xs text-red-200 flex items-start gap-2.5 shadow-lg">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-semibold text-red-100">Falha na Autenticação</p>
                  <p className="text-[11px] text-red-300/90 mt-0.5">{loginError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Usuário Administrador</label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Seu usuário de acesso"
                  className="w-full bg-[#181818] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Senha de Acesso</label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#181818] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 pr-10 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1.5 rounded-md transition-colors"
                    title={showLoginPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-neutral-900/80 border border-neutral-800 rounded-xl text-[11px] text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-red-500 shrink-0" />
                <span>
                  Proteção anti-força bruta ativa com bloqueio temporário de 15 min após tentativas incorretas.
                </span>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-[#E50914] hover:bg-[#c80812] active:scale-98 text-white py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-red-950/60 cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? 'Verificando credenciais...' : 'Entrar no Painel'}
              </button>

              <div className="text-center pt-2">
                <p className="text-[11px] text-neutral-400">
                  Credenciais padrão para demonstração: <span className="font-mono text-white bg-neutral-800 px-1.5 py-0.5 rounded">admin</span> / <span className="font-mono text-white bg-neutral-800 px-1.5 py-0.5 rounded">admin123</span>
                </p>
                <p className="text-[10px] text-neutral-500 mt-1">
                  (Você pode alterar seu usuário e senha com segurança na aba &ldquo;Segurança&rdquo;)
                </p>
              </div>
            </form>
          </div>
        ) : (
          /* Logged In: Full Admin Dashboard */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-56 bg-[#161616] border-b md:border-b-0 md:border-r border-[#262626] p-2 sm:p-3 flex md:flex-col gap-1.5 shrink-0 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'products'
                    ? 'bg-[#E50914] text-white shadow-sm shadow-red-950/50'
                    : 'text-neutral-400 hover:text-white hover:bg-[#202020]'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>Produtos & Estoque</span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'orders'
                    ? 'bg-[#E50914] text-white shadow-sm shadow-red-950/50'
                    : 'text-neutral-400 hover:text-white hover:bg-[#202020]'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span>Pedidos dos Clientes</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'settings'
                    ? 'bg-[#E50914] text-white shadow-sm shadow-red-950/50'
                    : 'text-neutral-400 hover:text-white hover:bg-[#202020]'
                }`}
              >
                <SettingsIcon className="w-4 h-4 shrink-0" />
                <span>Configurações & Frete</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'security'
                    ? 'bg-[#E50914] text-white shadow-sm shadow-red-950/50'
                    : 'text-neutral-400 hover:text-white hover:bg-[#202020]'
                }`}
              >
                <Key className="w-4 h-4 shrink-0" />
                <span>Segurança de Acesso</span>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'logs'
                    ? 'bg-[#E50914] text-white shadow-sm shadow-red-950/50'
                    : 'text-neutral-400 hover:text-white hover:bg-[#202020]'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Auditoria & Logs</span>
              </button>
            </div>

            {/* Main Tab Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0F0F0F]">
              {/* TAB 1: PRODUCTS */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#262626]">
                    <div>
                      <h3 className="text-base font-bold text-white">Catálogo de Produtos</h3>
                      <p className="text-xs text-neutral-400">
                        {products.length} produto(s) cadastrado(s)
                      </p>
                    </div>

                    <button
                      onClick={() => openProductForm()}
                      className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-[#c80812] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-red-950/40 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar Novo Produto</span>
                    </button>
                  </div>

                  {productsLoading ? (
                    <div className="p-8 text-center text-xs text-neutral-400">Carregando catálogo...</div>
                  ) : products.length === 0 ? (
                    <div className="p-12 text-center bg-[#141414] rounded-2xl border border-[#262626] space-y-3">
                      <ShoppingBag className="w-10 h-10 text-neutral-500 mx-auto" />
                      <h4 className="text-sm font-bold text-white">Nenhum produto cadastrado ainda</h4>
                      <p className="text-xs text-neutral-400 max-w-md mx-auto">
                        Conforme as regras do projeto, nenhum produto fictício foi criado previamente. Clique no botão abaixo para cadastrar seus produtos reais com fotos, preços e estoque.
                      </p>
                      <button
                        onClick={() => openProductForm()}
                        className="inline-flex items-center gap-1.5 bg-[#E50914] hover:bg-[#c80812] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        Cadastrar Primeiro Produto
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {products.map((p) => (
                        <div
                          key={p.id}
                          className="bg-[#141414] p-3.5 rounded-xl border border-[#262626] flex flex-col justify-between space-y-3"
                        >
                          <div className="flex gap-3">
                            <div className="w-16 h-16 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                              <img
                                src={p.images[0] || './logo.png'}
                                alt=""
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = './logo.png';
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                                {p.category}
                              </span>
                              <h4 className="text-xs font-bold text-white truncate" title={p.name}>
                                {p.name}
                              </h4>
                              <p className="text-xs font-mono font-bold text-red-400 mt-1">
                                R$ {p.price.toFixed(2).replace('.', ',')}
                              </p>
                              <span className="text-[11px] text-neutral-400">
                                Estoque: <strong className="text-white">{p.stock} un.</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#222222]">
                            <button
                              onClick={() => handleToggleProductStatus(p)}
                              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                                p.active
                                  ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                                  : 'text-neutral-400 bg-neutral-900 border border-neutral-700'
                              }`}
                            >
                              {p.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              <span>{p.active ? 'Ativo' : 'Pausado'}</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openProductForm(p)}
                                className="p-1.5 bg-[#222222] hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="p-1.5 bg-[#222222] hover:bg-red-950 text-neutral-400 hover:text-red-400 rounded-lg text-xs transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ORDERS */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#262626]">
                    <div>
                      <h3 className="text-base font-bold text-white">Pedidos Recebidos</h3>
                      <p className="text-xs text-neutral-400">
                        {orders.length} pedido(s) no total
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">Filtrar:</span>
                      <select
                        value={orderFilter}
                        onChange={(e) => {
                          setOrderFilter(e.target.value);
                        }}
                        className="bg-[#181818] border border-[#333333] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
                      >
                        <option value="todos">Todos os status</option>
                        <option value="pending">Aguardando pagamento</option>
                        <option value="approved">Pagamento aprovado</option>
                        <option value="preparing">Em preparação</option>
                        <option value="shipped">Enviado</option>
                        <option value="out_for_delivery">Saiu para entrega</option>
                        <option value="delivered">Entregue</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  {ordersLoading ? (
                    <div className="p-8 text-center text-xs text-neutral-400">Carregando pedidos...</div>
                  ) : orders.length === 0 ? (
                    <div className="p-12 text-center bg-[#141414] rounded-2xl border border-[#262626] text-neutral-400 text-xs">
                      Nenhum pedido registrado com o filtro selecionado.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {orders.map((ord) => (
                        <div
                          key={ord.id}
                          onClick={() => handleOpenOrder(ord)}
                          className="bg-[#141414] p-3.5 rounded-xl border border-[#262626] hover:border-red-600/60 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white font-mono">
                                #{ord.orderNumber}
                              </span>
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                                  ord.status === 'delivered'
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                    : ord.status === 'cancelled'
                                    ? 'bg-red-950/60 text-red-300 border-red-800'
                                    : ord.status === 'approved'
                                    ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                                    : 'bg-amber-950/60 text-amber-300 border-amber-800'
                                }`}
                              >
                                {ord.status === 'pending'
                                  ? 'Aguardando Pagamento'
                                  : ord.status === 'approved'
                                  ? 'Pagamento Aprovado'
                                  : ord.status === 'preparing'
                                  ? 'Em Preparação'
                                  : ord.status === 'shipped'
                                  ? 'Enviado'
                                  : ord.status === 'out_for_delivery'
                                  ? 'Saiu para Entrega'
                                  : ord.status === 'delivered'
                                  ? 'Entregue'
                                  : 'Cancelado'}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-300 mt-1">
                              <strong>{ord.customer.fullName}</strong> ({ord.customer.city}/{ord.customer.state})
                            </p>
                            <p className="text-[11px] text-neutral-500">
                              {new Date(ord.createdAt).toLocaleDateString('pt-BR')} · {ord.items.length} produto(s) · {ord.shippingSelection.title}
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <span className="text-sm font-bold font-mono text-red-400">
                              R$ {ord.total.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-[11px] text-neutral-400 block">
                              {ord.paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SETTINGS */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="pb-3 border-b border-[#262626]">
                    <h3 className="text-base font-bold text-white">Configurações Gerais da Loja</h3>
                    <p className="text-xs text-neutral-400">
                      Parâmetros comerciais de frete, entrega local e pagamentos
                    </p>
                  </div>

                  {settingsSavedMsg && (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>{settingsSavedMsg}</span>
                    </div>
                  )}

                  {settings && (
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                      {/* Section: Local Delivery in Arapongas */}
                      <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                            <Truck className="w-4 h-4" />
                            Entrega Local — Arapongas/PR
                          </h4>
                          <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.localDelivery.enabled}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  localDelivery: {
                                    ...settings.localDelivery,
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="accent-red-600"
                            />
                            <span>Ativar entrega local</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">Taxa de Entrega Local (R$)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={settings.localDelivery.fee}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  localDelivery: {
                                    ...settings.localDelivery,
                                    fee: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl focus:border-red-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">Prazo Estimado da Entrega Local</label>
                            <input
                              type="text"
                              value={settings.localDelivery.estimatedTime}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  localDelivery: {
                                    ...settings.localDelivery,
                                    estimatedTime: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl focus:border-red-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">Faixa de CEP Inicial Arapongas</label>
                            <input
                              type="text"
                              value={settings.localDelivery.cepStart}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  localDelivery: {
                                    ...settings.localDelivery,
                                    cepStart: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl font-mono focus:border-red-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">Faixa de CEP Final Arapongas</label>
                            <input
                              type="text"
                              value={settings.localDelivery.cepEnd}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  localDelivery: {
                                    ...settings.localDelivery,
                                    cepEnd: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl font-mono focus:border-red-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section: Correios Integration */}
                      <div className="bg-[#141414] p-4 sm:p-5 rounded-2xl border border-[#262626] space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                            <Truck className="w-4 h-4" />
                            Correios (PAC & SEDEX) — Nacional
                          </h4>
                          <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.correios.enabled}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  correios: {
                                    ...settings.correios,
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="accent-red-600"
                            />
                            <span>Ativar Correios</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">CEP de Origem (Arapongas)</label>
                            <input
                              type="text"
                              value={settings.correios.originCep}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  correios: {
                                    ...settings.correios,
                                    originCep: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl font-mono focus:border-red-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">Código de Contrato / Cartão Correios</label>
                            <input
                              type="text"
                              value={settings.correios.contractCode || ''}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  correios: {
                                    ...settings.correios,
                                    contractCode: e.target.value,
                                  },
                                })
                              }
                              placeholder="Opcional se possuir contrato"
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl focus:border-red-500 focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-neutral-300 mb-1 font-medium">Chave / Token API Correios ou Melhor Envio</label>
                            <input
                              type="password"
                              value={settings.correios.apiKey || ''}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  correios: {
                                    ...settings.correios,
                                    apiKey: e.target.value,
                                    apiConfigured: Boolean(e.target.value),
                                  },
                                })
                              }
                              placeholder="Insira o token quando contratado pelo lojista"
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl font-mono focus:border-red-500 focus:outline-none"
                            />
                            <p className="text-[11px] text-neutral-400 mt-1">
                              * Se a chave não for informada, o sistema utiliza a tabela postal padrão oficial dos Correios por peso e dimensões.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Section: Payment Gateway & Installments */}
                      <div className="bg-[#141414] p-4 sm:p-5 rounded-2xl border border-[#262626] space-y-3.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4" />
                          Pagamentos & Mercado Pago
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">Chave PIX da Conserta Cell</label>
                            <input
                              type="text"
                              value={settings.payment.pixKey || ''}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  payment: {
                                    ...settings.payment,
                                    pixKey: e.target.value,
                                  },
                                })
                              }
                              placeholder="(43) 99837-0350"
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl font-mono focus:border-red-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">Nome do Favorecido no PIX</label>
                            <input
                              type="text"
                              value={settings.payment.pixRecipientName || ''}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  payment: {
                                    ...settings.payment,
                                    pixRecipientName: e.target.value,
                                  },
                                })
                              }
                              placeholder="Conserta Cell Arapongas"
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl focus:border-red-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">Máximo de Parcelas Sem Juros</label>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={settings.payment.maxInterestFree}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  payment: {
                                    ...settings.payment,
                                    maxInterestFree: parseInt(e.target.value, 10) || 3,
                                  },
                                })
                              }
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl focus:border-red-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-neutral-400">Requisito da loja: até 3x sem juros</span>
                          </div>

                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">Máximo Total de Parcelas (Cartão)</label>
                            <input
                              type="number"
                              min="1"
                              max="21"
                              value={settings.payment.maxInstallments}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  payment: {
                                    ...settings.payment,
                                    maxInstallments: parseInt(e.target.value, 10) || 21,
                                  },
                                })
                              }
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl focus:border-red-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-neutral-400">Requisito da loja: possibilidade até 21x</span>
                          </div>

                          <div className="sm:col-span-2 pt-3 border-t border-[#222222]">
                            <p className="text-neutral-200 font-semibold mb-1">Chaves do Mercado Pago Developers</p>
                            <p className="text-[11px] text-neutral-400 mb-2 leading-relaxed">
                              Ao criar uma aplicação no portal do <strong>Mercado Pago Developers</strong>, cole as duas chaves abaixo para ativação instantânea do PIX com baixa automática e cartão de crédito parcelado:
                            </p>
                          </div>

                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">Mercado Pago Public Key (Frontend)</label>
                            <input
                              type="text"
                              value={settings.payment.publicKey || ''}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  payment: {
                                    ...settings.payment,
                                    publicKey: e.target.value,
                                  },
                                })
                              }
                              placeholder="APP_USR-..."
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl font-mono focus:border-red-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-neutral-300 mb-1 font-medium">Mercado Pago Access Token (Backend Seguro)</label>
                            <input
                              type="password"
                              value={settings.payment.accessToken || ''}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  payment: {
                                    ...settings.payment,
                                    accessToken: e.target.value,
                                    isConfigured: Boolean(e.target.value),
                                  },
                                })
                              }
                              placeholder="APP_USR-..."
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl font-mono focus:border-red-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Save Settings Button */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          className="flex items-center justify-center gap-2 bg-[#E50914] hover:bg-[#c80812] active:scale-98 text-white px-7 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-red-950/50 cursor-pointer w-full sm:w-auto"
                        >
                          <Save className="w-4 h-4" />
                          <span>Salvar Configurações da Loja</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 4: SECURITY & CREDENTIALS (DEDICATED SCREEN) */}
              {activeTab === 'security' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="pb-3 border-b border-[#262626]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-500">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          Segurança de Acesso do Lojista
                          <span className="text-[10px] font-normal bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded">
                            Hash scrypt ativo
                          </span>
                        </h3>
                        <p className="text-xs text-neutral-400">
                          Altere seu usuário de login ou defina uma nova senha protegida contra ataques de força bruta.
                        </p>
                      </div>
                    </div>
                  </div>

                  {credentialsMsg && (
                    <div
                      className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                        credentialsMsg.type === 'success'
                          ? 'bg-emerald-950/70 border border-emerald-700/80 text-emerald-200'
                          : 'bg-red-950/70 border border-red-700/80 text-red-200'
                      }`}
                    >
                      {credentialsMsg.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-relaxed">{credentialsMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdateCredentials} className="bg-[#141414] p-5 sm:p-6 rounded-2xl border border-[#2a2a2a] space-y-4 shadow-xl">
                    {/* Current Password - Required for any security changes */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-200 mb-1">
                        Senha Atual do Administrador <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          required
                          value={currentPasswordInput}
                          onChange={(e) => setCurrentPasswordInput(e.target.value)}
                          placeholder="Digite sua senha atual para autorizar"
                          className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 pr-10 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1.5 rounded-md transition-colors"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        Exigido para qualquer alteração por motivos de conformidade e segurança.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-[#222222]">
                      {/* New Username */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Novo Usuário (Opcional)
                        </label>
                        <input
                          type="text"
                          value={newUsernameInput}
                          onChange={(e) => setNewUsernameInput(e.target.value)}
                          placeholder="Ex: conserta_admin"
                          className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
                        />
                        <span className="text-[10px] text-neutral-500 block mt-1">Mínimo 4 caracteres (deixe em branco para manter)</span>
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Nova Senha (Opcional)
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 pr-10 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1.5 rounded-md transition-colors"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <span className="text-[10px] text-neutral-500 block mt-1">Deixe em branco para manter a senha atual</span>
                      </div>
                    </div>

                    {/* Password Requirements Checklist (shown when typing a new password) */}
                    {newPasswordInput && (
                      <div className="p-3.5 bg-[#181818] rounded-xl border border-[#282828] space-y-2.5">
                        <p className="text-[11px] font-bold text-neutral-300">
                          Requisitos de Complexidade da Nova Senha:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                          <div className={`flex items-center gap-1.5 ${hasMinLen ? 'text-emerald-400' : 'text-neutral-500'}`}>
                            <Check className={`w-3.5 h-3.5 ${hasMinLen ? 'text-emerald-400' : 'text-neutral-600'}`} />
                            <span>Mínimo 8 caracteres ({newPasswordInput.length}/8)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400' : 'text-neutral-500'}`}>
                            <Check className={`w-3.5 h-3.5 ${hasUpper ? 'text-emerald-400' : 'text-neutral-600'}`} />
                            <span>Letra maiúscula (A-Z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-400' : 'text-neutral-500'}`}>
                            <Check className={`w-3.5 h-3.5 ${hasLower ? 'text-emerald-400' : 'text-neutral-600'}`} />
                            <span>Letra minúscula (a-z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-neutral-500'}`}>
                            <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-400' : 'text-neutral-600'}`} />
                            <span>Número (0-9)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : 'text-neutral-500'}`}>
                            <Check className={`w-3.5 h-3.5 ${hasSpecial ? 'text-emerald-400' : 'text-neutral-600'}`} />
                            <span>Símbolo especial (!@#$%&*)</span>
                          </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="pt-2 border-t border-[#262626]">
                          <label className="block text-xs font-semibold text-neutral-300 mb-1">
                            Confirmar Nova Senha
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPasswordInput}
                              onChange={(e) => setConfirmPasswordInput(e.target.value)}
                              placeholder="Digite novamente a nova senha"
                              className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs px-3.5 py-2.5 pr-10 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1.5 rounded-md transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {confirmPasswordInput && (
                            <p
                              className={`text-[10px] mt-1 font-semibold ${
                                isPasswordMatching ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {isPasswordMatching ? '✓ As senhas conferem.' : '✗ As senhas não conferem.'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={credentialsLoading || (Boolean(newPasswordInput) && (!isNewPasswordValid || !isPasswordMatching))}
                        className="bg-[#E50914] hover:bg-[#c80812] disabled:opacity-40 text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/50 w-full sm:w-auto"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{credentialsLoading ? 'Atualizando credenciais...' : 'Atualizar Credenciais de Acesso'}</span>
                      </button>
                      <p className="text-[10px] text-neutral-500 mt-2">
                        Nota: Ao alterar as credenciais, todas as sessões anteriores serão invalidadas e você será desconectado para entrar com os novos dados.
                      </p>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: AUDIT LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <div className="pb-3 border-b border-[#262626]">
                    <h3 className="text-base font-bold text-white">Logs de Auditoria do Sistema</h3>
                    <p className="text-xs text-neutral-400">
                      Registro de ações importantes (pedidos, atualizações de estoque, logins)
                    </p>
                  </div>

                  <div className="bg-[#141414] rounded-xl border border-[#262626] divide-y divide-[#222222] max-h-[60vh] overflow-y-auto">
                    {logs.map((log) => (
                      <div key={log.id} className="p-3 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-red-400 mr-2">
                            [{log.action}]
                          </span>
                          <span className="text-neutral-300">{log.details}</span>
                        </div>
                        <span className="text-[11px] text-neutral-500 font-mono shrink-0 ml-4">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Creation / Edit Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl p-6 space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <h3 className="text-base font-bold text-white">
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto Real'}
              </h3>
              <button
                onClick={() => setProductModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-neutral-300 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  placeholder="Ex: Carregador Rápido 20W USB-C"
                  className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Categoria *</label>
                  <select
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl"
                  >
                    <option value="Capinhas & Películas">Capinhas & Películas</option>
                    <option value="Carregadores & Cabos">Carregadores & Cabos</option>
                    <option value="Fones & Áudio">Fones & Áudio</option>
                    <option value="Suportes & Acessórios">Suportes & Acessórios</option>
                    <option value="Telas & Peças">Telas & Peças</option>
                    <option value="Baterias">Baterias</option>
                    <option value="Geral">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Estoque Disponível *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={prodForm.stock}
                    onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })}
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Preço Normal (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodForm.price}
                    onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                    placeholder="49.90"
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Preço Promo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodForm.promotionalPrice}
                    onChange={(e) => setProdForm({ ...prodForm, promotionalPrice: e.target.value })}
                    placeholder="Opcional"
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Peso (kg) Correios</label>
                  <input
                    type="number"
                    step="0.05"
                    value={prodForm.weightKg}
                    onChange={(e) => setProdForm({ ...prodForm, weightKg: e.target.value })}
                    className="w-full bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Photo Upload / URL */}
              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Foto do Produto (URL ou Enviar Imagem)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prodForm.imageUrl}
                    onChange={(e) => setProdForm({ ...prodForm, imageUrl: e.target.value })}
                    placeholder="https://... ou faça upload"
                    className="flex-1 bg-[#1b1b1b] border border-[#333333] text-white text-base sm:text-xs p-2.5 rounded-xl"
                  />
                  <label className="cursor-pointer bg-[#222222] hover:bg-neutral-700 text-white px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {prodForm.imageUrl && (
                  <div className="mt-2 w-20 h-20 bg-black/60 rounded-lg border border-neutral-700 p-1 flex items-center justify-center overflow-hidden">
                    <img src={prodForm.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Descrição Detalhada</label>
                <textarea
                  rows={3}
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  placeholder="Compatibilidade, material, garantia, etc."
                  className="w-full bg-[#1b1b1b] border border-[#333333] text-white p-2 rounded-lg focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={prodForm.active}
                    onChange={(e) => setProdForm({ ...prodForm, active: e.target.checked })}
                    className="accent-red-600"
                  />
                  <span>Produto Ativo no Catálogo</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={prodForm.featured}
                    onChange={(e) => setProdForm({ ...prodForm, featured: e.target.checked })}
                    className="accent-red-600"
                  />
                  <span>Destacar na Página Inicial</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#262626] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E50914] hover:bg-[#c80812] text-white font-bold rounded-lg text-xs shadow-md shadow-red-950/50"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details & Status Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl p-6 space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div>
                <h3 className="text-base font-bold text-white">
                  Pedido #{selectedOrder.orderNumber}
                </h3>
                <span className="text-xs text-neutral-400">
                  {new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* Buyer info */}
              <div className="bg-[#181818] p-3.5 rounded-xl border border-[#262626] space-y-1">
                <p className="font-bold text-white">Dados do Comprador</p>
                <p className="text-neutral-300">Nome: {selectedOrder.customer.fullName} · CPF: {selectedOrder.customer.cpf}</p>
                <p className="text-neutral-300">Telefone/WhatsApp: {selectedOrder.customer.phone} · E-mail: {selectedOrder.customer.email}</p>
                <p className="text-neutral-300">
                  Endereço: {selectedOrder.customer.street}, nº {selectedOrder.customer.number}{' '}
                  {selectedOrder.customer.complement ? `(${selectedOrder.customer.complement})` : ''} - {selectedOrder.customer.neighborhood}, {selectedOrder.customer.city}/{selectedOrder.customer.state} - CEP: {selectedOrder.customer.cep}
                </p>
              </div>

              {/* Items */}
              <div className="bg-[#181818] p-3.5 rounded-xl border border-[#262626] space-y-2">
                <p className="font-bold text-white">Itens Comprados</p>
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-neutral-300 py-1 border-b border-neutral-800 last:border-none">
                    <span>{it.quantity}x {it.productName}</span>
                    <span className="font-mono text-white font-semibold">
                      R$ {(it.price * it.quantity).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 text-sm font-bold text-white">
                  <span>Total (com frete)</span>
                  <span className="font-mono text-red-400">R$ {selectedOrder.total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Status Update Form */}
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-red-900/50 space-y-3">
                <h4 className="font-bold text-white">Atualizar Status do Pedido</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-300 mb-1">Novo Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                      className="w-full bg-[#111111] border border-[#333333] text-white p-2 rounded-lg"
                    >
                      <option value="pending">Aguardando pagamento</option>
                      <option value="approved">Pagamento aprovado</option>
                      <option value="preparing">Em preparação</option>
                      <option value="shipped">Enviado</option>
                      <option value="out_for_delivery">Saiu para entrega</option>
                      <option value="delivered">Entregue</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-300 mb-1">Código de Rastreio (Correios)</label>
                    <input
                      type="text"
                      placeholder="Ex: QB123456789BR"
                      value={trackingCodeInput}
                      onChange={(e) => setTrackingCodeInput(e.target.value)}
                      className="w-full bg-[#111111] border border-[#333333] text-white p-2 rounded-lg font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1">Observação do Histórico (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Pacote despachado na agência dos Correios de Arapongas"
                    value={statusNoteInput}
                    onChange={(e) => setStatusNoteInput(e.target.value)}
                    className="w-full bg-[#111111] border border-[#333333] text-white p-2 rounded-lg"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUpdateOrderStatus}
                  className="bg-[#E50914] hover:bg-[#c80812] text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md"
                >
                  Salvar Novo Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
