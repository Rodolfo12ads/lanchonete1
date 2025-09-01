import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  updateDoc,
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
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Copy, Smartphone, RefreshCw, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "qrcode";

// Função para remover acentos e caracteres especiais (exigência do PIX)
const removeAccents = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/gi, "")
    .toUpperCase()
    .trim();
};

// Função para gerar o payload PIX manualmente
const generatePixPayload = (
  pixKey,
  recipientName,
  city,
  value,
  transactionId = ""
) => {
  if (!pixKey || !recipientName || !city || value === undefined || value <= 0) {
    throw new Error("Parâmetros obrigatórios não fornecidos ou inválidos");
  }

  const formattedValue = Number(value).toFixed(2);
  const normalizedName = removeAccents(recipientName).substring(0, 25);
  const normalizedCity = removeAccents(city).substring(0, 15);

  if (!normalizedName || !normalizedCity) {
    throw new Error(
      "Nome do beneficiário ou cidade inválidos após normalização"
    );
  }

  const gui = "br.gov.bcb.pix";
  const guiField = `00${gui.length.toString().padStart(2, "0")}${gui}`;
  const keyField = `01${pixKey.length.toString().padStart(2, "0")}${pixKey}`;
  const merchantInfo = `${guiField}${keyField}`;
  const field26 = `26${merchantInfo.length
    .toString()
    .padStart(2, "0")}${merchantInfo}`;

  const field52 = "52040000";
  const field53 = "5303986";
  const field54 = `54${formattedValue.length
    .toString()
    .padStart(2, "0")}${formattedValue}`;
  const field58 = "5802BR";
  const field59 = `59${normalizedName.length
    .toString()
    .padStart(2, "0")}${normalizedName}`;
  const field60 = `60${normalizedCity.length
    .toString()
    .padStart(2, "0")}${normalizedCity}`;

  let field62 = "";
  if (transactionId && transactionId.trim()) {
    const limitedTxId = removeAccents(transactionId).substring(0, 25);
    const txIdField = `05${limitedTxId.length
      .toString()
      .padStart(2, "0")}${limitedTxId}`;
    field62 = `62${txIdField.length.toString().padStart(2, "0")}${txIdField}`;
  }

  const payloadParts = [
    "000201",
    "010212",
    field26,
    field52,
    field53,
    field54,
    field58,
    field59,
    field60,
  ];

  if (field62) {
    payloadParts.push(field62);
  }

  payloadParts.push("6304");

  const payloadWithoutCRC = payloadParts.join("");

  const calculateCRC = (str) => {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      }
      crc &= 0xffff;
    }
    return crc;
  };

  const crc = calculateCRC(payloadWithoutCRC);
  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");

  return payloadWithoutCRC + crcHex;
};

export default function MeusPedidos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [pixConfig, setPixConfig] = useState(null);
  const [activePayments, setActivePayments] = useState({}); // Track active payment modals

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

        const items =
          data.items?.map((item) => ({
            ...item,
            price: parseFloat(
              item.price || item.preco || item.value || item.valor || 0
            ),
            qty: parseInt(item.qty || item.quantity || item.quantidade || 1),
          })) || [];

        return {
          id: d.id,
          ...data,
          items,
          total: parseFloat(data.total || 0),
        };
      });

      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Carregar configuração PIX
  useEffect(() => {
    const loadPixConfig = async () => {
      try {
        const pixConfigDoc = await getDoc(doc(db, "settings", "pix-config"));
        if (pixConfigDoc.exists()) {
          const configData = pixConfigDoc.data();
          if (
            configData.pixKey &&
            configData.establishmentName &&
            configData.establishmentCity
          ) {
            setPixConfig(configData);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar configuração PIX:", error);
      }
    };
    loadPixConfig();
  }, []);

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

  const handlePaymentClick = (orderId) => {
    setActivePayments((prev) => ({ ...prev, [orderId]: true }));
  };

  const closePaymentModal = (orderId) => {
    setActivePayments((prev) => {
      const newState = { ...prev };
      delete newState[orderId];
      return newState;
    });
  };

  const PaymentModal = ({ order, onClose }) => {
    const [qrCodeImage, setQrCodeImage] = useState("");
    const [pixCode, setPixCode] = useState("");
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos
    const [generatingQr, setGeneratingQr] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
      if (pixConfig && order) {
        generatePixQRCode();
      }
    }, [pixConfig, order]);

    // Timer para expiração do pagamento
    useEffect(() => {
      let timer;
      if (timeLeft > 0) {
        timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      } else {
        toast.error("Tempo para pagamento expirado");
        onClose();
      }
      return () => clearTimeout(timer);
    }, [timeLeft, onClose]);

    const generatePixQRCode = async () => {
      if (generatingQr || !order || !order.total || !pixConfig) return;

      setGeneratingQr(true);
      setError(null);

      try {
        if (!pixConfig.pixKey?.trim()) throw new Error("Chave PIX vazia");
        if (!pixConfig.establishmentName?.trim())
          throw new Error("Nome do estabelecimento vazio");
        if (!pixConfig.establishmentCity?.trim())
          throw new Error("Cidade vazia");
        if (!order.total || order.total <= 0) throw new Error("Valor inválido");

        const cleanData = {
          pixKey: pixConfig.pixKey.trim(),
          name: pixConfig.establishmentName.trim(),
          city: pixConfig.establishmentCity.trim(),
          amount: order.total,
          txId: (order.orderNumber || order.id || "").toString().trim(),
        };

        const pixString = generatePixPayload(
          cleanData.pixKey,
          cleanData.name,
          cleanData.city,
          cleanData.amount,
          cleanData.txId
        );

        setPixCode(pixString);

        const qrCodeDataURL = await QRCode.toDataURL(pixString, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
          errorCorrectionLevel: "M",
        });

        setQrCodeImage(qrCodeDataURL);
        toast.success("QR Code PIX gerado com sucesso!");
      } catch (error) {
        console.error("Erro ao gerar PIX:", error);
        const errorMessage =
          error.message || "Erro desconhecido ao gerar código PIX";
        setError(errorMessage);
        toast.error("Erro: " + errorMessage);
      } finally {
        setGeneratingQr(false);
      }
    };

    const copyPixCode = async () => {
      try {
        await navigator.clipboard.writeText(pixCode);
        toast.success("Código PIX copiado para a área de transferência!");
      } catch (error) {
        console.error("Erro ao copiar código PIX:", error);
        toast.error("Não foi possível copiar o código PIX");
      }
    };

    const formatTime = (seconds) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    };

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Pagamento PIX</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600">
                Pedido #{order.id.slice(-6).toUpperCase()}
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatPrice(order.total)}
              </p>
            </div>

            {timeLeft > 0 && (
              <div className="flex items-center justify-center gap-2 mb-4 p-3 bg-orange-50 rounded-lg">
                <FiClock className="w-5 h-5 text-orange-500" />
                <span className="text-orange-600 font-semibold">
                  Expira em: {formatTime(timeLeft)}
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              {qrCodeImage ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm inline-block"
                >
                  <img
                    src={qrCodeImage}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </motion.div>
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-gray-200 mx-auto">
                  {generatingQr ? (
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Gerando QR Code...
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <QrCode className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        QR Code não gerado
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {pixCode && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código PIX (Copiar e Colar):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixCode}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs font-mono"
                    style={{ wordBreak: "break-all" }}
                  />
                  <button
                    onClick={copyPixCode}
                    className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center"
                    title="Copiar código PIX"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {!qrCodeImage && !generatingQr && (
              <div className="text-center mb-6">
                <button
                  onClick={generatePixQRCode}
                  disabled={!pixConfig || !order}
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  Gerar QR Code PIX
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Como pagar:
              </h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Abra o app do seu banco</li>
                <li>2. Selecione a opção PIX</li>
                <li>3. Escaneie o QR Code ou cole o código</li>
                <li>4. Confirme os dados e finalize</li>
                <li>5. O pagamento será confirmado automaticamente</li>
              </ol>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
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

                    {/* Botão de pagamento para pedidos aguardando */}
                    {order.status === "aguardando" && pixConfig && (
                      <div className="mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePaymentClick(order.id);
                          }}
                          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
                        >
                          <CreditCard className="w-5 h-5" />
                          Pagar Agora - {formatPrice(order.total)}
                        </button>
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
                      </div>

                      <div className="space-y-3 mb-4">
                        {order.items?.map((item, index) => {
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

      {/* Modais de pagamento */}
      {Object.entries(activePayments).map(([orderId, isActive]) => {
        const order = orders.find((o) => o.id === orderId);
        return isActive && order ? (
          <PaymentModal
            key={orderId}
            order={order}
            onClose={() => closePaymentModal(orderId)}
          />
        ) : null;
      })}
    </div>
  );
}
