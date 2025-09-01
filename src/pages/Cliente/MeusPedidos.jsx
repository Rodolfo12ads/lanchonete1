import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  FiClock,
  FiCheckCircle,
  FiTruck,
  FiDollarSign,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
  FiShoppingBag,
} from "react-icons/fi";

export default function MeusPedidos() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const ordersData = snap.docs.map((d) => {
        const data = d.data();

        // Garantir que os itens tenham a estrutura correta
        const items =
          data.items?.map((item) => ({
            ...item,
            // Usar price, preco, value ou valor como fallback
            price: parseFloat(
              item.price || item.preco || item.value || item.valor || 0
            ),
            // Usar qty, quantity, quantidade como fallback
            qty: parseInt(item.qty || item.quantity || item.quantidade || 1),
          })) || [];

        return {
          id: d.id,
          ...data,
          items,
          // Garantir que o total seja um número
          total: parseFloat(data.total || 0),
        };
      });

      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const formatDate = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatPrice = (price) => {
    const numPrice = typeof price === "number" ? price : parseFloat(price || 0);
    if (isNaN(numPrice)) return "R$ 0,00";

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numPrice);
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "aguardando":
        return {
          text: "Aguardando pagamento",
          color: "text-yellow-800 bg-yellow-100 border-yellow-200",
          icon: <FiClock className="w-4 h-4" />,
          progress: 25,
        };
      case "em preparo":
        return {
          text: "Em preparo",
          color: "text-blue-800 bg-blue-100 border-blue-200",
          icon: <FiShoppingBag className="w-4 h-4" />,
          progress: 50,
        };
      case "pronto":
        return {
          text: "Pronto para entrega",
          color: "text-purple-800 bg-purple-100 border-purple-200",
          icon: <FiCheckCircle className="w-4 h-4" />,
          progress: 75,
        };
      case "entregue":
        return {
          text: "Entregue",
          color: "text-green-800 bg-green-100 border-green-200",
          icon: <FiTruck className="w-4 h-4" />,
          progress: 100,
        };
      case "cancelado":
        return {
          text: "Cancelado",
          color: "text-red-800 bg-red-100 border-red-200",
          icon: <FiAlertCircle className="w-4 h-4" />,
          progress: 0,
        };
      default:
        return {
          text: "Status desconhecido",
          color: "text-gray-800 bg-gray-100 border-gray-200",
          icon: <FiAlertCircle className="w-4 h-4" />,
          progress: 0,
        };
    }
  };

  const toggleOrderDetails = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };

  // Função para debug - exibe a estrutura completa do pedido
  const debugOrder = (order) => {
    console.log("Estrutura completa do pedido:", order);
    alert(
      "Estrutura do pedido foi logada no console. Verifique se os preços estão corretos."
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Meus Pedidos
          </h1>
          <p className="text-gray-600">
            Acompanhe o status dos seus pedidos em tempo real
          </p>
        </div>

        {!user ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🔒</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Faça login para ver seus pedidos
            </h3>
            <p className="text-gray-600 mb-6">
              Entre com sua conta para acompanhar seus pedidos
            </p>
            <Link
              to="/login"
              className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Fazer Login
            </Link>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="xl" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">📦</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Nenhum pedido ainda
            </h3>
            <p className="text-gray-600 mb-6">
              Que tal fazer seu primeiro pedido?
            </p>
            <Link
              to="/cardapio"
              className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Ver Cardápio
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"
                >
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => toggleOrderDetails(order.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg text-gray-900 mb-1">
                          Pedido #{order.id.slice(-6).toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}
                        >
                          {statusInfo.icon}
                          <span>{statusInfo.text}</span>
                        </div>
                        <button className="ml-3 text-gray-400 hover:text-gray-600">
                          {expandedOrder === order.id ? (
                            <FiChevronUp className="w-5 h-5" />
                          ) : (
                            <FiChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    {order.status !== "cancelado" && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${statusInfo.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Realizado</span>
                          <span>Preparando</span>
                          <span>Pronto</span>
                          <span>Entregue</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {expandedOrder === order.id && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-gray-900 flex items-center">
                          <FiShoppingBag className="mr-2" />
                          Itens do pedido
                        </h4>
                        {/* <button
                          onClick={() => debugOrder(order)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Ver detalhes técnicos
                        </button> */}
                      </div>

                      <div className="space-y-3 mb-4">
                        {order.items?.map((item, index) => {
                          // Calcular preço do item com fallbacks
                          const itemPrice =
                            item.price ||
                            item.preco ||
                            item.value ||
                            item.valor ||
                            0;
                          const itemQty =
                            item.qty || item.quantity || item.quantidade || 1;
                          const itemTotal =
                            parseFloat(itemPrice) * parseInt(itemQty);

                          return (
                            <div
                              key={index}
                              className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100"
                            >
                              <div>
                                <span className="font-medium text-gray-900">
                                  {itemQty}x {item.name}
                                </span>
                                {item.observations && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    Obs: {item.observations}
                                  </p>
                                )}
                                {/* Exibir preço unitário para debug */}
                                <p className="text-xs text-gray-400 mt-1">
                                  Unit: {formatPrice(itemPrice)}
                                </p>
                              </div>
                              <span className="font-bold text-red-600">
                                {formatPrice(itemTotal)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <div className="flex items-center text-gray-700">
                          <FiDollarSign className="mr-2" />
                          <span className="font-medium">Total do pedido:</span>
                        </div>
                        <span className="text-xl font-bold text-red-600">
                          {formatPrice(order.total)}
                        </span>
                      </div>

                      {order.paymentMethod && (
                        <div className="mt-3 text-sm text-gray-600">
                          Forma de pagamento: {order.paymentMethod}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
