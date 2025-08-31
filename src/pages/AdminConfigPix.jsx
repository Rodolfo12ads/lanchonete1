import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Smartphone, 
  Save, 
  Eye, 
  EyeOff,
  CreditCard,
  Building,
  MapPin,
  User,
  Mail,
  Phone
} from 'lucide-react';
import Header from '../components/Header';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function AdminConfigPix() {
  const [loading, setLoading] = useState(false);
  const [showPixKey, setShowPixKey] = useState(false);
  const [pixConfig, setPixConfig] = useState({
    pixKey: '',
    pixKeyType: 'email', // email, cpf, cnpj, phone, random
    establishmentName: 'Burger House',
    establishmentCity: 'São Paulo',
    establishmentAddress: {
      street: '',
      number: '',
      neighborhood: '',
      city: 'São Paulo',
      zipCode: '',
      state: 'SP'
    },
    contactInfo: {
      email: '',
      phone: '',
      whatsapp: ''
    },
    deliveryInfo: {
      deliveryFee: 0,
      freeDeliveryMinimum: 50,
      estimatedTime: '30-45 minutos',
      deliveryRadius: '5km'
    },
    paymentSettings: {
      pixEnabled: true,
      pixTimeout: 15, // minutos
      autoConfirmPayment: false
    }
  });

  useEffect(() => {
    loadPixConfig();
  }, []);

  const loadPixConfig = async () => {
    try {
      const docRef = doc(db, 'settings', 'pix-config');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setPixConfig(prev => ({
          ...prev,
          ...docSnap.data()
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setPixConfig(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setPixConfig(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validatePixKey = (key, type) => {
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
      case 'cpf':
        return /^\d{11}$/.test(key.replace(/\D/g, ''));
      case 'cnpj':
        return /^\d{14}$/.test(key.replace(/\D/g, ''));
      case 'phone':
        return /^\d{10,11}$/.test(key.replace(/\D/g, ''));
      case 'random':
        return key.length >= 32;
      default:
        return false;
    }
  };

  const handleSave = async () => {
    if (!pixConfig.pixKey) {
      toast.error('Chave Pix é obrigatória');
      return;
    }

    if (!validatePixKey(pixConfig.pixKey, pixConfig.pixKeyType)) {
      toast.error('Chave Pix inválida para o tipo selecionado');
      return;
    }

    if (!pixConfig.establishmentName || !pixConfig.establishmentCity) {
      toast.error('Nome e cidade do estabelecimento são obrigatórios');
      return;
    }

    setLoading(true);
    
    try {
      const docRef = doc(db, 'settings', 'pix-config');
      await setDoc(docRef, {
        ...pixConfig,
        updatedAt: new Date()
      });
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const formatPixKey = (key, type) => {
    switch (type) {
      case 'cpf':
        return key.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      case 'cnpj':
        return key.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      case 'phone':
        return key.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
      default:
        return key;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-bold text-gray-900">Configurações Pix</h1>
          </div>
          <p className="text-gray-600">Configure as informações do Pix e do estabelecimento</p>
        </div>

        <div className="space-y-8">
          {/* Configurações Pix */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Smartphone className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">Configurações Pix</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Chave Pix *
                </label>
                <select
                  value={pixConfig.pixKeyType}
                  onChange={(e) => handleInputChange('pixKeyType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="email">E-mail</option>
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Chave Aleatória</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chave Pix *
                </label>
                <div className="relative">
                  <input
                    type={showPixKey ? 'text' : 'password'}
                    value={pixConfig.pixKey}
                    onChange={(e) => handleInputChange('pixKey', e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder={
                      pixConfig.pixKeyType === 'email' ? 'seu@email.com' :
                      pixConfig.pixKeyType === 'cpf' ? '000.000.000-00' :
                      pixConfig.pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
                      pixConfig.pixKeyType === 'phone' ? '(11) 99999-9999' :
                      'Chave aleatória de 32 caracteres'
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPixKey(!showPixKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPixKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {pixConfig.pixKey && (
                  <p className="text-sm text-gray-500 mt-1">
                    Formato: {formatPixKey(pixConfig.pixKey, pixConfig.pixKeyType)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout do Pagamento (minutos) *
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={pixConfig.paymentSettings.pixTimeout}
                  onChange={(e) => handleInputChange('paymentSettings.pixTimeout', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pixEnabled"
                  checked={pixConfig.paymentSettings.pixEnabled}
                  onChange={(e) => handleInputChange('paymentSettings.pixEnabled', e.target.checked)}
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="pixEnabled" className="ml-2 text-sm font-medium text-gray-700">
                  Habilitar pagamentos via Pix
                </label>
              </div>
            </div>
          </motion.div>

          {/* Informações do Estabelecimento */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Building className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">Informações do Estabelecimento</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Estabelecimento *
                </label>
                <input
                  type="text"
                  value={pixConfig.establishmentName}
                  onChange={(e) => handleInputChange('establishmentName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Nome da sua lanchonete"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade *
                </label>
                <input
                  type="text"
                  value={pixConfig.establishmentCity}
                  onChange={(e) => handleInputChange('establishmentCity', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Cidade do estabelecimento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  value={pixConfig.contactInfo.email}
                  onChange={(e) => handleInputChange('contactInfo.email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="contato@lanchonete.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone de Contato
                </label>
                <input
                  type="tel"
                  value={pixConfig.contactInfo.phone}
                  onChange={(e) => handleInputChange('contactInfo.phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </motion.div>

          {/* Configurações de Entrega */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">Configurações de Entrega</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa de Entrega (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pixConfig.deliveryInfo.deliveryFee}
                  onChange={(e) => handleInputChange('deliveryInfo.deliveryFee', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Mínimo para Frete Grátis (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pixConfig.deliveryInfo.freeDeliveryMinimum}
                  onChange={(e) => handleInputChange('deliveryInfo.freeDeliveryMinimum', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="50.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tempo Estimado de Entrega
                </label>
                <input
                  type="text"
                  value={pixConfig.deliveryInfo.estimatedTime}
                  onChange={(e) => handleInputChange('deliveryInfo.estimatedTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="30-45 minutos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raio de Entrega
                </label>
                <input
                  type="text"
                  value={pixConfig.deliveryInfo.deliveryRadius}
                  onChange={(e) => handleInputChange('deliveryInfo.deliveryRadius', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="5km"
                />
              </div>
            </div>
          </motion.div>

          {/* Botão Salvar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-end"
          >
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

