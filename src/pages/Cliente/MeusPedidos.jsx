import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { FiClock, FiCheckCircle, FiTruck } from 'react-icons/fi';

export default function MeusPedidos() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const formatDate = (ts) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'aguardando':
        return 'text-yellow-600 bg-yellow-100';
      case 'em preparo':
        return 'text-blue-600 bg-blue-100';
      case 'pronto':
        return 'text-green-600 bg-green-100';
      case 'entregue':
        return 'text-green-700 bg-green-200';
      case 'cancelado':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'aguardando':
        return <FiClock className="w-4 h-4" />;
      case 'em preparo':
        return <FiTruck className="w-4 h-4" />;
      case 'pronto':
      case 'entregue':
        return <FiCheckCircle className="w-4 h-4" />;
      default:
        return <FiClock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Meus Pedidos
          </h1>
          <p className="text-gray-600 text-lg">
            Acompanhe o status dos seus pedidos em tempo real
          </p>
        </div>

        {!user ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🔒</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Faça login para ver seus pedidos
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              Entre com sua conta Google para acompanhar seus pedidos
            </p>
            <Link
              to="/login"
              className="inline-flex items-center px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg"
            >
              Fazer Login
            </Link>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="xl" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Nenhum pedido ainda
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              Que tal fazer seu primeiro pedido?
            </p>
            <Link
              to="/cardapio"
              className="inline-flex items-center px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg"
            >
              Ver Cardápio
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((o) => (
              <div
                key={o.id}
                className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <div className="font-bold text-xl text-gray-900">
                      Pedido #{o.id.slice(-6)}
                    </div>
                    <div className="text-gray-500">
                      {formatDate(o.createdAt)}
                    </div>
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${getStatusColor(
                      o.status
                    )}`}
                  >
                    {getStatusIcon(o.status)}
                    <span className="capitalize">{o.status || 'aguardando'}</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <h4 className="font-bold text-gray-900 mb-4">Itens do pedido:</h4>
                  <div className="space-y-3">
                    {o.items?.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <span className="text-gray-900 font-medium">
                          {it.qty}x {it.name}
                        </span>
                        <span className="font-bold text-red-600">
                          R$ {(it.price * it.qty).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-4 flex justify-between items-center">
                  <span className="text-gray-700 font-medium text-lg">Total do pedido:</span>
                  <span className="text-3xl font-bold text-red-600">
                    R$ {Number(o.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Footer />
    </div>
  );
}
