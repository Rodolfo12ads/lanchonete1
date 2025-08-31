import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  QrCode,
  Copy,
  CheckCircle,
  Clock,
  ArrowLeft,
  Smartphone,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { db } from "../firebase";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import QRCode from "qrcode";

// Função para gerar o payload PIX manualmente - CORRIGIDA
const generatePixPayload = (
  pixKey,
  recipientName,
  city,
  value,
  transactionId = ""
) => {
  const formattedValue = Number(value).toFixed(2);

  // Construir Merchant Account Information (campo 26)
  const gui = "br.gov.bcb.pix";
  const keyField = "01" + pixKey.length.toString().padStart(2, "0") + pixKey;
  const merchantInfo =
    "00" + gui.length.toString().padStart(2, "0") + gui + keyField;
  const field26 =
    "26" + merchantInfo.length.toString().padStart(2, "0") + merchantInfo;

  // Campo 62 - Dados Adicionais
  let additionalData = "";
  if (transactionId) {
    const txIdField =
      "05" + transactionId.length.toString().padStart(2, "0") + transactionId;
    additionalData =
      "62" + txIdField.length.toString().padStart(2, "0") + txIdField;
  }

  // Montar payload sem CRC
  const payloadWithoutCRC = [
    "000201", // Payload Format Indicator
    "010212", // Point of Initiation Method (12 = static)
    field26,
    "52040000", // Merchant Category Code
    "5303986", // Currency (BRL)
    "54" + formattedValue.length.toString().padStart(2, "0") + formattedValue, // Amount
    "5802BR", // Country Code
    "59" + recipientName.length.toString().padStart(2, "0") + recipientName, // Merchant Name
    "60" + city.length.toString().padStart(2, "0") + city, // City
    additionalData,
    "6304", // CRC16 placeholder
  ].join("");

  // Calcular CRC16
  let crc = 0xffff;
  for (let i = 0; i < payloadWithoutCRC.length; i++) {
    crc ^= payloadWithoutCRC.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");

  return payloadWithoutCRC + crcHex;
};

export default function PagamentoPix() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeImage, setQrCodeImage] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [generatingQr, setGeneratingQr] = useState(false);
  const [pixConfig, setPixConfig] = useState(null);

  // Carregar configuração PIX
  useEffect(() => {
    const loadPixConfig = async () => {
      try {
        const pixConfigDoc = await getDoc(doc(db, "settings", "pix-config"));
        if (pixConfigDoc.exists()) {
          setPixConfig(pixConfigDoc.data());
        } else {
          console.error("Configuração PIX não encontrada no Firestore");
          toast.error(
            "Configuração PIX não encontrada. Contate o administrador."
          );
        }
      } catch (error) {
        console.error("Erro ao carregar configuração PIX:", error);
        toast.error("Erro ao carregar configuração PIX");
      }
    };
    loadPixConfig();
  }, []);

  // Buscar dados do pedido
  useEffect(() => {
    if (!orderId) {
      navigate("/cardapio");
      return;
    }
    const unsubscribe = onSnapshot(doc(db, "orders", orderId), (doc) => {
      if (doc.exists()) {
        const orderData = { id: doc.id, ...doc.data() };
        setOrder(orderData);
        setPaymentStatus(orderData.status || "pending_payment");

        if (orderData.status === "paid") {
          toast.success("Pagamento confirmado!");
          setTimeout(() => {
            navigate(`/pedido-confirmado/${orderId}`);
          }, 2000);
        }
      } else {
        toast.error("Pedido não encontrado");
        navigate("/cardapio");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orderId, navigate]);

  // Gerar QR Code quando order e pixConfig estiverem disponíveis
  useEffect(() => {
    if (order && order.total && pixConfig) {
      generatePixQRCode();
    }
  }, [order, pixConfig]);

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && paymentStatus === "pending_payment") {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      toast.error("Tempo para pagamento expirado");
      updateOrderStatus("expired");
    }
  }, [timeLeft, paymentStatus]);

  const generatePixQRCode = async () => {
    if (generatingQr || !order || !order.total || !pixConfig) return;
    setGeneratingQr(true);
    try {
      if (!pixConfig.pixKey) {
        toast.error("Chave PIX não configurada");
        return;
      }
      const pixString = generatePixPayload(
        pixConfig.pixKey,
        pixConfig.establishmentName || "Loja",
        pixConfig.establishmentCity || "Cidade",
        order.total,
        order.orderNumber
      );

      setPixCode(pixString);

      const qrCodeDataURL = await QRCode.toDataURL(pixString, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      setQrCodeImage(qrCodeDataURL);
    } catch (error) {
      console.error("Erro ao gerar QR Code Pix:", error);
      toast.error("Erro ao gerar código Pix");
    } finally {
      setGeneratingQr(false);
    }
  };

  const updateOrderStatus = async (status) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    toast.success("Código Pix copiado!");
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (!pixConfig && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Configuração PIX não encontrada
          </h2>
          <p className="text-gray-600 mb-4">
            A configuração do PIX não está disponível. Contate o administrador.
          </p>
          <button
            onClick={() => navigate("/cardapio")}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Voltar ao Cardápio
          </button>
        </div>
      </div>
    );
  }

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
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Pedido não encontrado
          </h2>
          <button
            onClick={() => navigate("/cardapio")}
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
        <div className="mb-8">
          <button
            onClick={() => navigate("/cardapio")}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Cardápio
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pagamento via Pix
          </h1>
          <p className="text-gray-600">Pedido {order.orderNumber}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* QR Code e Instruções */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Smartphone className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-bold text-gray-900">
                  Pague com Pix
                </h2>
              </div>
              {paymentStatus === "pending_payment" && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <span className="text-orange-600 font-semibold">
                    Tempo restante: {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </div>

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
                  {generatingQr ? (
                    <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-gray-400" />
                  )}
                </div>
              )}
            </div>

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

            {!qrCodeImage && !generatingQr && (
              <div className="text-center mb-6">
                <button
                  onClick={generatePixQRCode}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Gerar QR Code
                </button>
              </div>
            )}

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
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Resumo do Pedido
            </h3>
            <div className="mb-6">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                  paymentStatus === "pending_payment"
                    ? "bg-yellow-100 text-yellow-800"
                    : paymentStatus === "paid"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {paymentStatus === "pending_payment" && (
                  <Clock className="w-4 h-4" />
                )}
                {paymentStatus === "paid" && (
                  <CheckCircle className="w-4 h-4" />
                )}
                {paymentStatus === "expired" && (
                  <AlertCircle className="w-4 h-4" />
                )}
                {paymentStatus === "pending_payment" && "Aguardando Pagamento"}
                {paymentStatus === "paid" && "Pagamento Confirmado"}
                {paymentStatus === "expired" && "Pagamento Expirado"}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {order.items &&
                order.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {item.name}
                      </h4>
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

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-xl font-bold text-orange-600">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                Dados de Entrega:
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>Nome:</strong> {order.customer?.name}
                </p>
                <p>
                  <strong>Telefone:</strong> {order.customer?.phone}
                </p>
                <p>
                  <strong>Endereço:</strong> {order.customer?.address?.street},{" "}
                  {order.customer?.address?.number}
                </p>
                {order.customer?.address?.complement && (
                  <p>
                    <strong>Complemento:</strong>{" "}
                    {order.customer.address.complement}
                  </p>
                )}
                <p>
                  <strong>Bairro:</strong>{" "}
                  {order.customer?.address?.neighborhood}
                </p>
                <p>
                  <strong>Cidade:</strong> {order.customer?.address?.city}
                </p>
                <p>
                  <strong>CEP:</strong> {order.customer?.address?.zipCode}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
