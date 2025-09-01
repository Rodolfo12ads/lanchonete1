import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Copy,
  CheckCircle,
  Clock,
  ArrowLeft,
  Smartphone,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { db } from "../firebase";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
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

// Função para gerar o payload PIX manualmente - CORRIGIDA
const generatePixPayload = (
  pixKey,
  recipientName,
  city,
  value,
  transactionId = ""
) => {
  // Validações básicas
  if (!pixKey || !recipientName || !city || value === undefined || value <= 0) {
    throw new Error("Parâmetros obrigatórios não fornecidos ou inválidos");
  }

  const formattedValue = Number(value).toFixed(2);

  // Normalizar nome e cidade (remover acentos e caracteres especiais)
  const normalizedName = removeAccents(recipientName).substring(0, 25);
  const normalizedCity = removeAccents(city).substring(0, 15);

  // Validar se os campos normalizados não estão vazios
  if (!normalizedName || !normalizedCity) {
    throw new Error(
      "Nome do beneficiário ou cidade inválidos após normalização"
    );
  }

  // Construir Merchant Account Information (campo 26)
  const gui = "br.gov.bcb.pix";
  const guiField = `00${gui.length.toString().padStart(2, "0")}${gui}`;
  const keyField = `01${pixKey.length.toString().padStart(2, "0")}${pixKey}`;
  const merchantInfo = `${guiField}${keyField}`;
  const field26 = `26${merchantInfo.length
    .toString()
    .padStart(2, "0")}${merchantInfo}`;

  // Campos obrigatórios do PIX
  const field52 = "52040000"; // Merchant Category Code
  const field53 = "5303986"; // Moeda (Real Brasileiro)
  const field54 = `54${formattedValue.length
    .toString()
    .padStart(2, "0")}${formattedValue}`; // Valor da transação
  const field58 = "5802BR"; // País
  const field59 = `59${normalizedName.length
    .toString()
    .padStart(2, "0")}${normalizedName}`; // Nome do beneficiário
  const field60 = `60${normalizedCity.length
    .toString()
    .padStart(2, "0")}${normalizedCity}`; // Cidade

  // Campo 62 - Dados Adicionais (opcional)
  let field62 = "";
  if (transactionId && transactionId.trim()) {
    const limitedTxId = removeAccents(transactionId).substring(0, 25);
    const txIdField = `05${limitedTxId.length
      .toString()
      .padStart(2, "0")}${limitedTxId}`;
    field62 = `62${txIdField.length.toString().padStart(2, "0")}${txIdField}`;
  }

  // Montar payload sem CRC
  const payloadParts = [
    "000201", // Payload Format Indicator
    "010212", // Point of Initiation Method (12 = estático)
    field26,
    field52,
    field53,
    field54,
    field58,
    field59,
    field60,
  ];

  // Adicionar campo 62 apenas se existir
  if (field62) {
    payloadParts.push(field62);
  }

  payloadParts.push("6304"); // CRC16 placeholder

  const payloadWithoutCRC = payloadParts.join("");

  // Calcular CRC16 (implementação corrigida)
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

export default function PagamentoPix() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeImage, setQrCodeImage] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos
  const [paymentStatus, setPaymentStatus] = useState("pending_payment");
  const [generatingQr, setGeneratingQr] = useState(false);
  const [pixConfig, setPixConfig] = useState(null);
  const [error, setError] = useState(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Carregar configuração PIX
  useEffect(() => {
    const loadPixConfig = async () => {
      try {
        const pixConfigDoc = await getDoc(doc(db, "settings", "pix-config"));
        if (pixConfigDoc.exists()) {
          const configData = pixConfigDoc.data();

          if (!configData.pixKey) {
            throw new Error("Chave PIX não configurada no sistema");
          }
          if (!configData.establishmentName) {
            throw new Error("Nome do estabelecimento não configurado");
          }
          if (!configData.establishmentCity) {
            throw new Error("Cidade do estabelecimento não configurada");
          }

          setPixConfig(configData);
        } else {
          throw new Error("Configuração PIX não encontrada no banco de dados");
        }
      } catch (error) {
        console.error("Erro ao carregar configuração PIX:", error);
        setError(error.message);
        toast.error("Erro ao carregar configuração PIX: " + error.message);
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

    const unsubscribe = onSnapshot(
      doc(db, "orders", orderId),
      (doc) => {
        if (doc.exists()) {
          const orderData = { id: doc.id, ...doc.data() };
          setOrder(orderData);
          setPaymentStatus(orderData.status || "pending_payment");

          // Verificar se o pagamento foi confirmado
          if (orderData.status === "paid") {
            setPaymentConfirmed(true);
            toast.success("Pagamento confirmado!");

            // Não navegar imediatamente, deixar usuário ver a confirmação
            setTimeout(() => {
              navigate(`/pedido-confirmado/${orderId}`);
            }, 5000);
          }
        } else {
          toast.error("Pedido não encontrado");
          navigate("/cardapio");
        }
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao buscar pedido:", error);
        toast.error("Erro ao carregar dados do pedido");
        setError("Erro ao carregar dados do pedido");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId, navigate]);

  // Gerar QR Code quando order e pixConfig estiverem disponíveis
  useEffect(() => {
    if (order && order.total && pixConfig && !error) {
      generatePixQRCode();
    }
  }, [order, pixConfig, error]);

  // Timer para expiração do pagamento
  useEffect(() => {
    let timer;
    if (
      timeLeft > 0 &&
      paymentStatus === "pending_payment" &&
      !paymentConfirmed
    ) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && paymentStatus === "pending_payment") {
      toast.error("Tempo para pagamento expirado");
      updateOrderStatus("expired");
    }
    return () => clearTimeout(timer);
  }, [timeLeft, paymentStatus, paymentConfirmed]);

  const generatePixQRCode = async () => {
    if (generatingQr || !order || !order.total || !pixConfig) return;

    setGeneratingQr(true);
    setError(null);

    try {
      // Validações rigorosas dos dados reais
      if (!pixConfig.pixKey?.trim()) throw new Error("Chave PIX vazia");
      if (!pixConfig.establishmentName?.trim())
        throw new Error("Nome do estabelecimento vazio");
      if (!pixConfig.establishmentCity?.trim()) throw new Error("Cidade vazia");
      if (!order.total || order.total <= 0) throw new Error("Valor inválido");

      // Limpar e validar dados antes de usar
      const cleanData = {
        pixKey: pixConfig.pixKey.trim(),
        name: pixConfig.establishmentName.trim(),
        city: pixConfig.establishmentCity.trim(),
        amount: order.total,
        txId: (order.orderNumber || order.id || "").toString().trim(),
      };

      // Gerar payload PIX
      const pixString = generatePixPayload(
        cleanData.pixKey,
        cleanData.name,
        cleanData.city,
        cleanData.amount,
        cleanData.txId
      );

      setPixCode(pixString);

      // Gerar QR Code
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

  const updateOrderStatus = async (status) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error);
      toast.error("Erro ao atualizar status do pedido");
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  // Componente de overlay de confirmação de pagamento
  const PaymentConfirmationOverlay = () => (
    <AnimatePresence>
      {paymentConfirmed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-12 h-12 text-green-600" />
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Pagamento Confirmado!
            </h2>
            <p className="text-gray-600 mb-6">
              Seu pagamento foi confirmado com sucesso. Em instantes você será
              redirecionado para a página de confirmação do pedido.
            </p>

            <div className="bg-green-50 rounded-xl p-4 mb-6">
              <p className="text-green-800 font-medium">
                Pedido: {order?.orderNumber || order?.id}
              </p>
              <p className="text-green-800 font-medium">
                Valor: {order?.total ? formatPrice(order.total) : "N/A"}
              </p>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate(`/pedido-confirmado/${orderId}`)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                Ver Pedido <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/cardapio")}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Voltar ao Cardápio
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-500">
              <p>
                Redirecionando em {timeLeft > 0 ? Math.ceil(timeLeft / 60) : 0}{" "}
                segundos...
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Componente de erro
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Erro no Pagamento PIX
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setError(null);
                  if (order && pixConfig) {
                    generatePixQRCode();
                  }
                }}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </button>
              <button
                onClick={() => navigate("/cardapio")}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Voltar ao Cardápio
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Tela de loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">Carregando dados do pagamento...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Pedido não encontrado
  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Pedido não encontrado
            </h2>
            <p className="text-gray-600 mb-4">
              O pedido solicitado não foi encontrado em nossa base de dados.
            </p>
            <button
              onClick={() => navigate("/cardapio")}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Voltar ao Cardápio
            </button>
          </div>
        </div>
        <Footer />
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
            Pagamento via PIX
          </h1>
          <p className="text-gray-600">
            Pedido {order.orderNumber || order.id}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* QR Code e Instruções */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Smartphone className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-bold text-gray-900">
                  Pague com PIX
                </h2>
              </div>
              {paymentStatus === "pending_payment" && timeLeft > 0 && (
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
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm"
                >
                  <img
                    src={qrCodeImage}
                    alt="QR Code PIX"
                    className="w-64 h-64"
                  />
                </motion.div>
              ) : (
                <div className="w-64 h-64 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-gray-200">
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
                  Ou copie o código PIX:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixCode}
                    readOnly
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-sm font-mono break-all"
                    style={{ wordBreak: "break-all" }}
                  />
                  <button
                    onClick={copyPixCode}
                    className="px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center"
                    title="Copiar código PIX"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {!qrCodeImage && !generatingQr && !error && (
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

            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Como pagar:
              </h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Abra o app do seu banco ou carteira digital</li>
                <li>2. Selecione a opção PIX</li>
                <li>3. Escaneie o QR Code ou cole o código copiado</li>
                <li>4. Confirme os dados e o valor</li>
                <li>5. Finalize o pagamento</li>
                <li>6. Aguarde a confirmação automática</li>
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
                    : paymentStatus === "expired"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
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
                {!["pending_payment", "paid", "expired"].includes(
                  paymentStatus
                ) && "Status: " + paymentStatus}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {order.items &&
                order.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {item.name}
                      </h4>
                      <p className="text-gray-600 text-sm">
                        {item.quantity}x {formatPrice(item.price)}
                      </p>
                      {item.observations && (
                        <p className="text-gray-500 text-xs italic">
                          {item.observations}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
            </div>

            {order.deliveryFee && order.deliveryFee > 0 && (
              <div className="flex justify-between items-center py-2 border-t border-gray-100">
                <span className="text-gray-600">Taxa de entrega:</span>
                <span className="font-semibold text-gray-900">
                  {formatPrice(order.deliveryFee)}
                </span>
              </div>
            )}

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-xl font-bold text-orange-600">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>

            {order.customer && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Dados de Entrega:
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>Nome:</strong> {order.customer.name}
                  </p>
                  <p>
                    <strong>Telefone:</strong> {order.customer.phone}
                  </p>
                  {order.customer.address && (
                    <>
                      <p>
                        <strong>Endereço:</strong>{" "}
                        {order.customer.address.street}
                        {order.customer.address.number &&
                          `, ${order.customer.address.number}`}
                      </p>
                      {order.customer.address.complement && (
                        <p>
                          <strong>Complemento:</strong>{" "}
                          {order.customer.address.complement}
                        </p>
                      )}
                      {order.customer.address.neighborhood && (
                        <p>
                          <strong>Bairro:</strong>{" "}
                          {order.customer.address.neighborhood}
                        </p>
                      )}
                      {order.customer.address.city && (
                        <p>
                          <strong>Cidade:</strong> {order.customer.address.city}
                        </p>
                      )}
                      {order.customer.address.zipCode && (
                        <p>
                          <strong>CEP:</strong> {order.customer.address.zipCode}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* Overlay de confirmação de pagamento */}
      <PaymentConfirmationOverlay />
    </div>
  );
}
