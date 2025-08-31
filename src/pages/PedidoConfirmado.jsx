import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  Truck, 
  MapPin,
  Phone,
  ArrowLeft,
  Download,
  Share2
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ReceiptGenerator from '../components/ReceiptGenerator';
import { db } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function PedidoConfirmado() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (!orderId) {
      navigate('/cardapio');
      return;
    }

    // Escutar mudanças no pedido em tempo real
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (doc) => {
      if (doc.exists()) {
        const orderData = { id: doc.id, ...doc.data() };
        setOrder(orderData);
      } else {
        toast.error('Pedido não encontrado');
        navigate('/cardapio');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, navigate]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'paid':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-500" />,
          title: 'Pagamento Confirmado!',
          description: 'Seu pedido foi confirmado e está sendo preparado.',
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'preparing':
        return {
          icon: <Clock className="w-8 h-8 text-blue-500" />,
          title: 'Preparando seu Pedido',
          description: 'Nossa equipe está preparando seu pedido com carinho.',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'ready':
        return {
          icon: <CheckCircle className="w-8 h-8 text-purple-500" />,
          title: 'Pedido Pronto!',
          description: 'Seu pedido está pronto e saindo para entrega.',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        };
      case 'delivered':
        return {
          icon: <Truck className="w-8 h-8 text-gray-500" />,
          title: 'Pedido Entregue',
          description: 'Seu pedido foi entregue com sucesso!',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
      default:
        return {
          icon: <Clock className="w-8 h-8 text-yellow-500" />,
          title: 'Processando Pedido',
          description: 'Estamos processando seu pedido.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        };
    }
  };

  const shareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: `Pedido ${order.orderNumber} - Burger House`,
        text: `Meu pedido na Burger House foi confirmado! Total: ${formatPrice(order.total)}`,
        url: window.location.href
      });
    } else {
      // Fallback para navegadores que não suportam Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Carregando informações do pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
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

  const statusInfo = getStatusInfo(order.status);

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
        </div>

        {/* Status Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${statusInfo.bgColor} rounded-2xl p-8 mb-8 text-center`}
        >
          <div className="mb-4">
            {statusInfo.icon}
          </div>
          <h1 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
            {statusInfo.title}
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            {statusInfo.description}
          </p>
          <div className="text-2xl font-bold text-gray-900">
            Pedido {order.orderNumber}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Informações do Pedido */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Detalhes do Pedido</h2>
            
            {/* Timeline do Status */}
            <div className="space-y-4 mb-6">
              {[
                { status: 'paid', label: 'Pagamento Confirmado', time: order.paidAt },
                { status: 'preparing', label: 'Em Preparo', time: order.preparingAt },
                { status: 'ready', label: 'Pronto para Entrega', time: order.readyAt },
                { status: 'delivered', label: 'Entregue', time: order.deliveredAt }
              ].map((step, index) => {
                const isCompleted = order.status === step.status || 
                  (order.status === 'preparing' && step.status === 'paid') ||
                  (order.status === 'ready' && ['paid', 'preparing'].includes(step.status)) ||
                  (order.status === 'delivered' && ['paid', 'preparing', 'ready'].includes(step.status));
                
                const isCurrent = order.status === step.status;
                
                return (
                  <div key={step.status} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${
                      isCompleted ? 'bg-green-500' : 
                      isCurrent ? 'bg-orange-500' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1">
                      <div className={`font-medium ${
                        isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </div>
                      {step.time && (
                        <div className="text-sm text-gray-500">
                          {formatDate(step.time)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Informações de Entrega */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900">Endereço de Entrega</h3>
              </div>
              <div className="text-sm text-gray-700">
                <p>{order.customer.address.street}, {order.customer.address.number}</p>
                {order.customer.address.complement && (
                  <p>{order.customer.address.complement}</p>
                )}
                <p>{order.customer.address.neighborhood}</p>
                <p>{order.customer.address.city} - {order.customer.address.zipCode}</p>
              </div>
            </div>

            {/* Tempo Estimado */}
            <div className="bg-orange-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-orange-900">Tempo de Entrega</h3>
              </div>
              <p className="text-orange-700">
                {order.status === 'delivered' ? 'Entregue' : '30-45 minutos'}
              </p>
            </div>
          </motion.div>

          {/* Resumo do Pedido */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Resumo do Pedido</h2>

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
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">{formatPrice(order.total)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Taxa de entrega:</span>
                <span className="font-semibold text-green-600">Grátis</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-orange-600">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Informações de Pagamento */}
            <div className="bg-green-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-green-900">Pagamento Confirmado</h3>
              </div>
              <p className="text-green-700 text-sm">
                Pago via {order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod} em {formatDate(order.paidAt || order.createdAt)}
              </p>
            </div>

            {/* Ações */}
            <div className="space-y-3">
              <button
                onClick={() => setShowReceipt(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Download className="w-5 h-5" />
                Baixar Comprovante
              </button>
              
              <button
                onClick={shareOrder}
                className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Compartilhar Pedido
              </button>
            </div>

            {/* Contato */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Dúvidas sobre seu pedido?</p>
              <a
                href="tel:+5511999999999"
                className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold"
              >
                <Phone className="w-4 h-4" />
                (11) 99999-9999
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modal do Comprovante */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <ReceiptGenerator 
            order={order} 
            onClose={() => setShowReceipt(false)} 
          />
        </div>
      )}

      <Footer />
    </div>
  );
}

