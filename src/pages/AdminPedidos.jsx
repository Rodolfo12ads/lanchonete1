import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
} from 'firebase/firestore';
import { 
  FiEye, 
  FiTrash2, 
  FiClock, 
  FiCheck, 
  FiX, 
  FiTruck,
  FiDollarSign,
  FiAlertCircle,
  FiDownload,
  FiSmartphone
} from 'react-icons/fi';
import Header from '../components/Header';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminPedidos() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending_payment':
        return 'Aguardando Pagamento';
      case 'paid':
        return 'Pago';
      case 'preparing':
        return 'Preparando';
      case 'ready':
        return 'Pronto';
      case 'delivered':
        return 'Entregue';
      case 'cancelled':
        return 'Cancelado';
      case 'expired':
        return 'Expirado';
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending_payment':
        return <FiClock className="w-4 h-4" />;
      case 'paid':
        return <FiDollarSign className="w-4 h-4" />;
      case 'preparing':
        return <FiClock className="w-4 h-4" />;
      case 'ready':
        return <FiCheck className="w-4 h-4" />;
      case 'delivered':
        return <FiTruck className="w-4 h-4" />;
      case 'cancelled':
        return <FiX className="w-4 h-4" />;
      case 'expired':
        return <FiAlertCircle className="w-4 h-4" />;
      default:
        return <FiClock className="w-4 h-4" />;
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'paid' && { paidAt: new Date() }),
        ...(newStatus === 'delivered' && { deliveredAt: new Date() })
      });
      addToast('Status atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      addToast('Erro ao atualizar status', 'error');
    }
  };

  const confirmPayment = async (orderId) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date()
      });
      addToast('Pagamento confirmado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      addToast('Erro ao confirmar pagamento', 'error');
    }
  };

  const deleteOrder = async (orderId) => {
    if (window.confirm('Tem certeza que deseja excluir este pedido?')) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        addToast('Pedido excluído com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        addToast('Erro ao excluir pedido', 'error');
      }
    }
  };

  const generateReceipt = (order) => {
    // Gerar comprovante de pagamento
    const receiptData = {
      orderNumber: order.orderNumber,
      customer: order.customer,
      items: order.items,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt,
      status: order.status
    };
    
    // Simular download do comprovante
    const dataStr = JSON.stringify(receiptData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `comprovante-${order.orderNumber}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    addToast('Comprovante gerado com sucesso!', 'success');
  };

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

  const filteredOrders = orders.filter(order => {
    const statusMatch = filterStatus === 'all' || order.status === filterStatus;
    const paymentMatch = filterPayment === 'all' || order.paymentMethod === filterPayment;
    return statusMatch && paymentMatch;
  });

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending_payment').length,
    paid: orders.filter(o => o.status === 'paid').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Pedidos</h1>
          <p className="text-gray-600">Visualize e gerencie todos os pedidos da lanchonete</p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{orderStats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{orderStats.pending}</div>
            <div className="text-sm text-gray-600">Aguardando</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-green-600">{orderStats.paid}</div>
            <div className="text-sm text-gray-600">Pagos</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{orderStats.preparing}</div>
            <div className="text-sm text-gray-600">Preparando</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{orderStats.ready}</div>
            <div className="text-sm text-gray-600">Prontos</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-gray-600">{orderStats.delivered}</div>
            <div className="text-sm text-gray-600">Entregues</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">Todos os Status</option>
                <option value="pending_payment">Aguardando Pagamento</option>
                <option value="paid">Pago</option>
                <option value="preparing">Preparando</option>
                <option value="ready">Pronto</option>
                <option value="delivered">Entregue</option>
                <option value="cancelled">Cancelado</option>
                <option value="expired">Expirado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Pagamento
              </label>
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">Todos os Métodos</option>
                <option value="pix">PIX</option>
                <option value="card">Cartão</option>
                <option value="cash">Dinheiro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Pedidos */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagamento
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                  {filteredOrders.map((order) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{order.orderNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.customer?.name}</div>
                        <div className="text-sm text-gray-500">{order.customer?.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatPrice(order.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {order.paymentMethod === 'pix' && <FiSmartphone className="w-4 h-4 text-orange-500" />}
                          <span className="text-sm text-gray-900 capitalize">
                            {order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Ver detalhes"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          
                          {order.status === 'pending_payment' && order.paymentMethod === 'pix' && (
                            <button
                              onClick={() => confirmPayment(order.id)}
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                              title="Confirmar pagamento"
                            >
                              <FiDollarSign className="w-4 h-4" />
                            </button>
                          )}
                          
                          {order.status === 'paid' && (
                            <button
                              onClick={() => generateReceipt(order)}
                              className="text-purple-600 hover:text-purple-900 p-1 rounded"
                              title="Gerar comprovante"
                            >
                              <FiDownload className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Excluir pedido"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <FiAlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
              <p className="text-gray-500">Não há pedidos que correspondam aos filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Pedido */}
      <Modal
        isOpen={showOrderDetails}
        onClose={() => setShowOrderDetails(false)}
        title={`Detalhes do Pedido ${selectedOrder?.orderNumber}`}
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Status e Ações */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(selectedOrder.status)}`}>
                {getStatusIcon(selectedOrder.status)}
                {getStatusText(selectedOrder.status)}
              </span>
              
              <div className="flex gap-2">
                {selectedOrder.status === 'pending_payment' && (
                  <button
                    onClick={() => confirmPayment(selectedOrder.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Confirmar Pagamento
                  </button>
                )}
                {selectedOrder.status === 'paid' && (
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Iniciar Preparo
                  </button>
                )}
                {selectedOrder.status === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}
                    className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Marcar como Pronto
                  </button>
                )}
                {selectedOrder.status === 'ready' && (
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Marcar como Entregue
                  </button>
                )}
              </div>
            </div>

            {/* Informações do Cliente */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Informações do Cliente</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nome:</span> {selectedOrder.customer?.name}
                </div>
                <div>
                  <span className="font-medium">E-mail:</span> {selectedOrder.customer?.email}
                </div>
                <div>
                  <span className="font-medium">Telefone:</span> {selectedOrder.customer?.phone}
                </div>
                <div>
                  <span className="font-medium">Pagamento:</span> {selectedOrder.paymentMethod === 'pix' ? 'PIX' : selectedOrder.paymentMethod}
                </div>
              </div>
            </div>

            {/* Endereço de Entrega */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Endereço de Entrega</h3>
              <div className="text-sm text-gray-700">
                <p>{selectedOrder.customer?.address?.street}, {selectedOrder.customer?.address?.number}</p>
                {selectedOrder.customer?.address?.complement && (
                  <p>{selectedOrder.customer?.address?.complement}</p>
                )}
                <p>{selectedOrder.customer?.address?.neighborhood}</p>
                <p>{selectedOrder.customer?.address?.city} - {selectedOrder.customer?.address?.zipCode}</p>
              </div>
            </div>

            {/* Itens do Pedido */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Itens do Pedido</h3>
              <div className="space-y-3">
                {selectedOrder.items?.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">
                        {item.quantity}x {formatPrice(item.price)}
                      </p>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-orange-600">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Histórico</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Pedido criado:</span> {formatDate(selectedOrder.createdAt)}
                </div>
                {selectedOrder.paidAt && (
                  <div>
                    <span className="font-medium">Pagamento confirmado:</span> {formatDate(selectedOrder.paidAt)}
                  </div>
                )}
                {selectedOrder.deliveredAt && (
                  <div>
                    <span className="font-medium">Entregue em:</span> {formatDate(selectedOrder.deliveredAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

