import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  QrCode, 
  Copy, 
  CheckCircle, 
  Clock, 
  ArrowLeft,
  Smartphone,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { db } from '../firebase';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import QRCodePix from 'qrcode-pix';
import QRCode from 'qrcode';

export default function PagamentoPix() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos
  const [paymentStatus, setPaymentStatus] = useState('pending');

  useEffect(() => {
    if (!orderId) {
      navigate('/cardapio');
      return;
    }

    // Buscar dados do pedido e escutar mudanças
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (doc) => {
      if (doc.exists()) {
        const orderData = { id: doc.id, ...doc.data() };
        setOrder(orderData);
        setPaymentStatus(orderData.status);
        
        if (orderData.status === 'paid') {
          toast.success('Pagamento confirmado!');
          setTimeout(() => {
            navigate(`/pedido-confirmado/${orderId}`);
          }, 2000);
        }
      } else {
        toast.error('Pedido não encontrado');
        navigate('/cardapio');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, navigate]);

  useEffect(() => {
    if (order) {
      generatePixQRCode();
    }
  }, [order]);

  // Timer para expiração do pagamento
  useEffect(() => {
    if (timeLeft > 0 && paymentStatus === 'pending_payment') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      toast.error('Tempo para pagamento expirado');
      updateOrderStatus('expired');
    }
  }, [timeLeft, paymentStatus]);

  const generatePixQRCode = async () => {
    try {
      // Buscar configurações do Pix do admin
      const pixConfigDoc = await getDoc(doc(db, 'settings', 'pix-config'));
      let pixConfig = {
        key: 'admin@lanchonete.com',
        name: 'Burger House',
        city: 'São Paulo'
      };

      if (pixConfigDoc.exists()) {
        const configData = pixConfigDoc.data();
        pixConfig = {
          key: configData.pixKey || 'admin@lanchonete.com',
          name: configData.establishmentName || 'Burger House',
          city: configData.establishmentCity || 'São Paulo'
        };
      }

      // Gerar código Pix
      const qrCodePix = QRCodePix({
        version: '01',
        key: pixConfig.key,
        name: pixConfig.name,
        city: pixConfig.city,
        message: `Pedido ${order.orderNumber}`,
        value: order.total
      });

      const pixString = qrCodePix.payload();
      setPixCode(pixString);

      // Gerar QR Code visual
      const qrCodeDataURL = await QRCode.toDataURL(pixString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeImage(qrCodeDataURL);
    } catch (error) {
      console.error('Erro ao gerar QR Code Pix:', error);
      toast.error('Erro ao gerar código Pix');
    }
  };

  const updateOrderStatus = async (status) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    toast.success('Código Pix copiado!');
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados do pagamento...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Pedido não encontrado</h2>
          <button
            onClick={() => navigate('/cardapio')}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Voltar ao Cardápio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/cardapio')}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Cardápio
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pagamento via Pix</h1>
          <p className="text-gray-600">Pedido {order.orderNumber}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* QR Code e Instruções */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Smartphone className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-bold text-gray-900">Pague com Pix</h2>
              </div>
              
              {paymentStatus === 'pending_payment' && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <span className="text-orange-600 font-semibold">
                    Tempo restante: {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              {qrCodeImage ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="p-4 bg-white border-2 border-gray-200 rounded-2xl"
                >
                  <img 
                    src={qrCodeImage} 
                    alt="QR Code Pix" 
                    className="w-64 h-64"
                  />
                </motion.div>
              ) : (
                <div className="w-64 h-64 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Código Pix para Copiar */}
            {pixCode && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ou copie o código Pix:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixCode}
                    readOnly
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={copyPixCode}
                    className="px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Instruções */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Como pagar:</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Abra o app do seu banco</li>
                <li>2. Escolha a opção Pix</li>
                <li>3. Escaneie o QR Code ou cole o código</li>
                <li>4. Confirme o pagamento</li>
                <li>5. Pronto! Seu pedido será confirmado automaticamente</li>
              </ol>
            </div>
          </div>

          {/* Resumo do Pedido */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Resumo do Pedido</h3>

            {/* Status */}
            <div className="mb-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                paymentStatus === 'pending_payment' 
                  ? 'bg-yellow-100 text-yellow-800'
                  : paymentStatus === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {paymentStatus === 'pending_payment' && <Clock className="w-4 h-4" />}
                {paymentStatus === 'paid' && <CheckCircle className="w-4 h-4" />}
                {paymentStatus === 'expired' && <AlertCircle className="w-4 h-4" />}
                
                {paymentStatus === 'pending_payment' && 'Aguardando Pagamento'}
                {paymentStatus === 'paid' && 'Pagamento Confirmado'}
                {paymentStatus === 'expired' && 'Pagamento Expirado'}
              </div>
            </div>

            {/* Itens */}
            <div className="space-y-4 mb-6">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{item.name}</h4>
                    <p className="text-gray-600 text-sm">
                      {item.quantity}x {formatPrice(item.price)}
                    </p>
                  </div>
                  <span className="font-bold text-gray-900">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-xl font-bold text-orange-600">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>

            {/* Dados de Entrega */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Dados de Entrega:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Nome:</strong> {order.customer.name}</p>
                <p><strong>Telefone:</strong> {order.customer.phone}</p>
                <p><strong>Endereço:</strong> {order.customer.address.street}, {order.customer.address.number}</p>
                {order.customer.address.complement && (
                  <p><strong>Complemento:</strong> {order.customer.address.complement}</p>
                )}
                <p><strong>Bairro:</strong> {order.customer.address.neighborhood}</p>
                <p><strong>Cidade:</strong> {order.customer.address.city}</p>
                <p><strong>CEP:</strong> {order.customer.address.zipCode}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

