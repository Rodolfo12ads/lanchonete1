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

// Função para remover acentos e caracteres especiais (exigência do PIX)
const removeAccents = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, "") // Remove caracteres especiais, mantém apenas letras, números e espaços
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

  // Validar se o valor é um número válido
  const numValue = Number(value);
  if (isNaN(numValue) || numValue <= 0) {
    throw new Error("Valor da transação inválido");
  }

  const formattedValue = numValue.toFixed(2);

  // Normalizar nome e cidade (remover acentos e caracteres especiais)
  const normalizedName = removeAccents(recipientName).substring(0, 25); // Limite de 25 caracteres
  const normalizedCity = removeAccents(city).substring(0, 15); // Limite de 15 caracteres

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

  // Campo 52 - Merchant Category Code (fixo '0000' para não categorizado)
  const field52 = "52040000";

  // Campo 53 - Moeda (Real Brasileiro '986')
  const field53 = "5303986";

  // Campo 54 - Valor da transação
  const field54 = `54${formattedValue.length
    .toString()
    .padStart(2, "0")}${formattedValue}`;

  // Campo 58 - País (BR)
  const field58 = "5802BR";

  // Campo 59 - Nome do beneficiário
  const field59 = `59${normalizedName.length
    .toString()
    .padStart(2, "0")}${normalizedName}`;

  // Campo 60 - Cidade
  const field60 = `60${normalizedCity.length
    .toString()
    .padStart(2, "0")}${normalizedCity}`;

  // Campo 62 - Dados Adicionais (opcional)
  let field62 = "";
  if (transactionId && transactionId.trim()) {
    // Limitar o transactionId a 25 caracteres (exigência do PIX)
    const limitedTxId = transactionId.substring(0, 25);
    const txIdField = `05${limitedTxId.length
      .toString()
      .padStart(2, "0")}${limitedTxId}`;
    field62 = `62${txIdField.length.toString().padStart(2, "0")}${txIdField}`;
  }

  // Montar payload sem CRC
  const payloadParts = [
    "000201", // Payload Format Indicator
    "010212", // Point of Initiation Method (12 = estático, 11 = dinâmico)
    field26,
    field52, // Merchant Category Code
    field53, // Currency (BRL)
    field54, // Amount
    field58, // Country Code
    field59, // Merchant Name
    field60, // City
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
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
        crc &= 0xffff;
      }
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
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [generatingQr, setGeneratingQr] = useState(false);
  const [pixConfig, setPixConfig] = useState(null);
  const [error, setError] = useState(null);

  // Carregar configuração PIX
  useEffect(() => {
    const loadPixConfig = async () => {
      try {
        const pixConfigDoc = await getDoc(doc(db, "settings", "pix-config"));
        if (pixConfigDoc.exists()) {
          const configData = pixConfigDoc.data();

          // Validar dados essenciais da configuração PIX
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
    if (timeLeft > 0 && paymentStatus === "pending_payment") {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && paymentStatus === "pending_payment") {
      toast.error("Tempo para pagamento expirado");
      updateOrderStatus("expired");
    }
  }, [timeLeft, paymentStatus]);

  // Função para testar um payload PIX exemplo (para debug)
  const generateTestPixPayload = () => {
    // PIX de teste com dados válidos conhecidos
    const testData = {
      pixKey: "12345678901", // CPF de teste
      merchantName: "LOJA TESTE",
      merchantCity: "SAO PAULO",
      amount: "10.00",
    };

    return generatePixPayload(
      testData.pixKey,
      testData.merchantName,
      testData.merchantCity,
      testData.amount,
      "TEST123"
    );
  };

  const generatePixQRCode = async () => {
    if (generatingQr || !order || !order.total || !pixConfig) {
      console.log("Condições não atendidas para gerar QR Code:", {
        generatingQr,
        hasOrder: !!order,
        hasTotal: !!order?.total,
        hasPixConfig: !!pixConfig,
      });
      return;
    }

    setGeneratingQr(true);
    setError(null);

    try {
      console.log("=== INICIANDO GERAÇÃO DO PIX ===");
      console.log("Configuração PIX:", {
        pixKey: pixConfig.pixKey?.substring(0, 15) + "...",
        establishmentName: pixConfig.establishmentName,
        establishmentCity: pixConfig.establishmentCity,
      });
      console.log("Dados do pedido:", {
        total: order.total,
        orderNumber: order.orderNumber || order.id,
      });

      // Primeiro, vamos testar com dados conhecidos
      console.log("=== TESTE COM DADOS PADRÃO ===");
      try {
        const testPixPayload = generateTestPixPayload();
        console.log(
          "PIX de teste gerado com sucesso:",
          testPixPayload.substring(0, 50) + "..."
        );
      } catch (testError) {
        console.error("Erro no PIX de teste:", testError.message);
      }

      // Validações rigorosas dos dados reais
      const errors = [];

      if (!pixConfig.pixKey?.trim()) errors.push("Chave PIX vazia");
      if (!pixConfig.establishmentName?.trim())
        errors.push("Nome do estabelecimento vazio");
      if (!pixConfig.establishmentCity?.trim()) errors.push("Cidade vazia");
      if (!order.total || order.total <= 0) errors.push("Valor inválido");

      if (errors.length > 0) {
        throw new Error("Dados inválidos: " + errors.join(", "));
      }

      // Limpar e validar dados antes de usar
      const cleanData = {
        pixKey: pixConfig.pixKey.trim(),
        name: pixConfig.establishmentName.trim(),
        city: pixConfig.establishmentCity.trim(),
        amount: parseFloat(order.total).toFixed(2),
        txId: (order.orderNumber || order.id || "").toString().trim(),
      };

      console.log("=== DADOS LIMPOS ===", cleanData);

      // Tentar diferentes abordagens se a primeira falhar
      let pixString = "";
      let attempts = [
        // Tentativa 1: Com ID da transação
        () =>
          generatePixPayload(
            cleanData.pixKey,
            cleanData.name,
            cleanData.city,
            cleanData.amount,
            cleanData.txId
          ),
        // Tentativa 2: Sem ID da transação
        () =>
          generatePixPayload(
            cleanData.pixKey,
            cleanData.name,
            cleanData.city,
            cleanData.amount,
            ""
          ),
        // Tentativa 3: Com dados mais básicos
        () =>
          generatePixPayload(
            cleanData.pixKey,
            "LOJA",
            "SAO PAULO",
            cleanData.amount,
            ""
          ),
      ];

      for (let i = 0; i < attempts.length; i++) {
        try {
          console.log(`=== TENTATIVA ${i + 1} ===`);
          pixString = attempts[i]();
          console.log(`Tentativa ${i + 1} bem-sucedida!`);
          break;
        } catch (attemptError) {
          console.error(`Tentativa ${i + 1} falhou:`, attemptError.message);
          if (i === attempts.length - 1) {
            throw attemptError; // Se todas as tentativas falharam, lançar o último erro
          }
        }
      }

      if (!pixString) {
        throw new Error(
          "Não foi possível gerar o payload PIX com nenhuma das tentativas"
        );
      }

      console.log("=== PIX GERADO COM SUCESSO ===");
      console.log("Tamanho do payload:", pixString.length);
      console.log("Primeiros 100 caracteres:", pixString.substring(0, 100));

      setPixCode(pixString);

      // Gerar QR Code
      const qrCodeDataURL = await QRCode.toDataURL(pixString, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
        type: "image/png",
        quality: 0.92,
      });

      setQrCodeImage(qrCodeDataURL);
      console.log("QR Code gerado com sucesso!");
      toast.success("QR Code PIX gerado com sucesso!");
    } catch (error) {
      console.error("=== ERRO AO GERAR PIX ===");
      console.error("Erro:", error.message);
      console.error("Stack:", error.stack);

      // Análise dos dados para debug
      console.error("Análise dos dados:", {
        pixConfig: pixConfig
          ? {
              hasPixKey: !!pixConfig.pixKey,
              pixKeyLength: pixConfig.pixKey?.length,
              pixKeyType: typeof pixConfig.pixKey,
              hasName: !!pixConfig.establishmentName,
              nameLength: pixConfig.establishmentName?.length,
              hasCity: !!pixConfig.establishmentCity,
              cityLength: pixConfig.establishmentCity?.length,
            }
          : "null",
        order: order
          ? {
              hasTotal: !!order.total,
              total: order.total,
              totalType: typeof order.total,
              hasId: !!order.id,
              hasOrderNumber: !!order.orderNumber,
            }
          : "null",
      });

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

      // Fallback para navegadores que não suportam clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = pixCode;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Código PIX copiado!");
      } catch (fallbackError) {
        toast.error("Não foi possível copiar o código PIX");
      }
      document.body.removeChild(textArea);
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
    </div>
  );
}
