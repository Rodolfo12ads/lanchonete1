import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Smartphone,
  MapPin,
  User,
  Mail,
  Phone,
  ArrowLeft,
  ShoppingBag,
  Clock,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

export default function Checkout() {
  const { items, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Dados, 2: Pagamento, 3: Confirmação
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [loading, setLoading] = useState(false);

  const [customerData, setCustomerData] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      zipCode: "",
    },
  });

  // Redirecionar se carrinho vazio
  useEffect(() => {
    if (items.length === 0) {
      navigate("/cardapio");
      toast.error("Seu carrinho está vazio!");
    }
  }, [items, navigate]);

  const handleInputChange = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setCustomerData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setCustomerData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const validateStep1 = () => {
    const { name, email, phone, address } = customerData;
    return (
      name &&
      email &&
      phone &&
      address.street &&
      address.number &&
      address.neighborhood &&
      address.city &&
      address.zipCode
    );
  };

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setStep(step + 1);
  };

  const handleCreateOrder = async () => {
    setLoading(true);

    try {
      const orderData = {
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        })),
        customer: customerData,
        total: getTotalPrice(),
        paymentMethod,
        status: "pending_payment",
        createdAt: serverTimestamp(),
        userId: user?.uid || null,
        customerEmail: customerData.email,
        orderNumber: `#${Date.now().toString().slice(-6)}`,
      };

      const docRef = await addDoc(collection(db, "orders"), orderData);

      // Navegar para página de pagamento Pix
      navigate(`/pagamento/${docRef.id}`);
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao processar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header do Checkout */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/cardapio")}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Cardápio
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finalizar Pedido
          </h1>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-6">
            {[
              { num: 1, label: "Dados de Entrega" },
              { num: 2, label: "Pagamento" },
              { num: 3, label: "Confirmação" },
            ].map((stepItem) => (
              <div key={stepItem.num} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step >= stepItem.num
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {stepItem.num}
                </div>
                <span
                  className={`text-sm ${
                    step >= stepItem.num
                      ? "text-orange-600 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  {stepItem.label}
                </span>
                {stepItem.num < 3 && (
                  <div
                    className={`w-8 h-0.5 ${
                      step > stepItem.num ? "bg-orange-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Formulário Principal */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Step 1: Dados de Entrega */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-6 h-6 text-orange-500" />
                    <h2 className="text-xl font-bold text-gray-900">
                      Dados de Entrega
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={customerData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Seu nome completo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-mail *
                      </label>
                      <input
                        type="email"
                        value={customerData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="seu@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefone *
                      </label>
                      <input
                        type="tel"
                        value={customerData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CEP *
                      </label>
                      <input
                        type="text"
                        value={customerData.address.zipCode}
                        onChange={(e) =>
                          handleInputChange("address.zipCode", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="00000-000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rua *
                      </label>
                      <input
                        type="text"
                        value={customerData.address.street}
                        onChange={(e) =>
                          handleInputChange("address.street", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Nome da rua"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número *
                      </label>
                      <input
                        type="text"
                        value={customerData.address.number}
                        onChange={(e) =>
                          handleInputChange("address.number", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="123"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={customerData.address.complement}
                        onChange={(e) =>
                          handleInputChange(
                            "address.complement",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Apto, bloco, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bairro *
                      </label>
                      <input
                        type="text"
                        value={customerData.address.neighborhood}
                        onChange={(e) =>
                          handleInputChange(
                            "address.neighborhood",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Nome do bairro"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        value={customerData.address.city}
                        onChange={(e) =>
                          handleInputChange("address.city", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Nome da cidade"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleNextStep}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Continuar para Pagamento
                  </button>
                </motion.div>
              )}

              {/* Step 2: Pagamento */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <CreditCard className="w-6 h-6 text-orange-500" />
                    <h2 className="text-xl font-bold text-gray-900">
                      Método de Pagamento
                    </h2>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div
                      onClick={() => setPaymentMethod("pix")}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                        paymentMethod === "pix"
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-6 h-6 text-orange-500" />
                        <div>
                          <h3 className="font-semibold text-gray-900">PIX</h3>
                          <p className="text-sm text-gray-600">
                            Pagamento instantâneo via QR Code
                          </p>
                        </div>
                        <div className="ml-auto">
                          <div
                            className={`w-5 h-5 rounded-full border-2 ${
                              paymentMethod === "pix"
                                ? "border-orange-500 bg-orange-500"
                                : "border-gray-300"
                            }`}
                          >
                            {paymentMethod === "pix" && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-300 transition-all duration-300"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleCreateOrder}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      {loading ? "Processando..." : "Finalizar Pedido"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Resumo do Pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <div className="flex items-center gap-3 mb-6">
                <ShoppingBag className="w-6 h-6 text-orange-500" />
                <h3 className="text-xl font-bold text-gray-900">
                  Resumo do Pedido
                </h3>
              </div>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
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

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">
                    {formatPrice(getTotalPrice())}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Taxa de entrega:</span>
                  <span className="font-semibold text-green-600">Grátis</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">
                      Total:
                    </span>
                    <span className="text-xl font-bold text-orange-600">
                      {formatPrice(getTotalPrice())}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-orange-50 rounded-xl">
                <div className="flex items-center gap-2 text-orange-700">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Tempo de entrega</span>
                </div>
                <p className="text-orange-600 text-sm mt-1">30-45 minutos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
