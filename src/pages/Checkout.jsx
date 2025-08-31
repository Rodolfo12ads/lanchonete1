import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Smartphone,
  MapPin,
  ArrowLeft,
  ShoppingBag,
  Clock,
  Plus,
  Minus,
  Trash2,
  Loader,
  User,
  Mail,
  Phone,
  Home,
  Map,
  Navigation,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

export default function Checkout() {
  const {
    items,
    getTotalPrice,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

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
      state: "",
      zipCode: "",
    },
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate("/cardapio");
      toast.error("Seu carrinho está vazio!");
    }
  }, [items, navigate]);

  // Função para buscar endereço pelo CEP
  const fetchAddressByCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, "");

    if (cleanCep.length !== 8) {
      setFieldErrors({ ...fieldErrors, zipCode: "CEP deve conter 8 dígitos" });
      return;
    }

    setCepLoading(true);
    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`
      );
      const data = await response.json();

      if (data.erro) {
        setFieldErrors({ ...fieldErrors, zipCode: "CEP não encontrado" });
        toast.error("CEP não encontrado");
        return;
      }

      // Atualiza os campos de endereço com os dados da API
      setCustomerData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
          complement: data.complemento || "",
          zipCode: cleanCep,
        },
      }));

      // Limpar erros de endereço
      const newErrors = { ...fieldErrors };
      delete newErrors.zipCode;
      delete newErrors.street;
      delete newErrors.neighborhood;
      delete newErrors.city;
      delete newErrors.state;
      setFieldErrors(newErrors);

      toast.success("Endereço preenchido automaticamente");
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      setFieldErrors({ ...fieldErrors, zipCode: "Erro ao buscar CEP" });
      toast.error("Erro ao buscar CEP. Tente novamente.");
    } finally {
      setCepLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    // Limpar erro do campo quando usuário começar a digitar
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }

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

  // Função para lidar com a mudança do CEP
  const handleCepChange = (value) => {
    // Aplicar máscara de CEP
    const formattedValue = value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);

    handleInputChange("address.zipCode", formattedValue);

    // Busca automaticamente quando o CEP tiver 8 dígitos
    if (value.replace(/\D/g, "").length === 8) {
      fetchAddressByCep(value);
    }
  };

  // Função para formatar telefone
  const handlePhoneChange = (value) => {
    const formattedValue = value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);

    handleInputChange("phone", formattedValue);
  };

  const validateStep1 = () => {
    const errors = {};
    const { name, email, phone, address } = customerData;

    if (!name) errors.name = "Nome é obrigatório";
    if (!email || !/\S+@\S+\.\S+/.test(email)) errors.email = "Email inválido";
    if (!phone || phone.replace(/\D/g, "").length < 10)
      errors.phone = "Telefone inválido";
    if (!address.zipCode || address.zipCode.replace(/\D/g, "").length !== 8)
      errors.zipCode = "CEP inválido";
    if (!address.street) errors.street = "Rua é obrigatória";
    if (!address.number) errors.number = "Número é obrigatório";
    if (!address.neighborhood) errors.neighborhood = "Bairro é obrigatório";
    if (!address.city) errors.city = "Cidade é obrigatória";
    if (!address.state || address.state.length !== 2)
      errors.state = "Estado é obrigatório";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) {
      toast.error("Verifique os campos destacados");
      return;
    }
    if (step === 2) {
      handleCreateOrder();
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
      navigate(`/pagamento/${docRef.id}`);
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao processar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price || 0);

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <span className={step === 1 ? "text-orange-600 font-medium" : ""}>
            Entrega
          </span>
          <span>›</span>
          <span className={step === 2 ? "text-orange-600 font-medium" : ""}>
            Pagamento
          </span>
          <span>›</span>
          <span>Confirmação</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Coluna de formulário */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Dados Pessoais
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Seu nome completo"
                          value={customerData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            fieldErrors.name
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          required
                        />
                      </div>
                      {fieldErrors.name && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> {fieldErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-mail
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          placeholder="seu@email.com"
                          value={customerData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            fieldErrors.email
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          required
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />{" "}
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="(00) 00000-0000"
                          value={customerData.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            fieldErrors.phone
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          required
                        />
                      </div>
                      {fieldErrors.phone && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />{" "}
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Endereço de Entrega
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CEP
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="00000-000"
                          value={customerData.address.zipCode}
                          onChange={(e) => handleCepChange(e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            fieldErrors.zipCode
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          required
                        />
                        {cepLoading && (
                          <div className="absolute right-3 top-3">
                            <Loader className="w-5 h-5 animate-spin text-orange-500" />
                          </div>
                        )}
                      </div>
                      {fieldErrors.zipCode && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />{" "}
                          {fieldErrors.zipCode}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rua
                      </label>
                      <div className="relative">
                        <Navigation className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Nome da rua"
                          value={customerData.address.street}
                          onChange={(e) =>
                            handleInputChange("address.street", e.target.value)
                          }
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            fieldErrors.street
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          required
                        />
                      </div>
                      {fieldErrors.street && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />{" "}
                          {fieldErrors.street}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número
                      </label>
                      <div className="relative">
                        <Home className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Nº"
                          value={customerData.address.number}
                          onChange={(e) =>
                            handleInputChange("address.number", e.target.value)
                          }
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            fieldErrors.number
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          required
                        />
                      </div>
                      {fieldErrors.number && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />{" "}
                          {fieldErrors.number}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Complemento
                      </label>
                      <input
                        type="text"
                        placeholder="Apartamento, bloco, etc."
                        value={customerData.address.complement}
                        onChange={(e) =>
                          handleInputChange(
                            "address.complement",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bairro
                      </label>
                      <div className="relative">
                        <Map className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Nome do bairro"
                          value={customerData.address.neighborhood}
                          onChange={(e) =>
                            handleInputChange(
                              "address.neighborhood",
                              e.target.value
                            )
                          }
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            fieldErrors.neighborhood
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          required
                        />
                      </div>
                      {fieldErrors.neighborhood && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />{" "}
                          {fieldErrors.neighborhood}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cidade
                      </label>
                      <div className="relative">
                        <Map className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Nome da cidade"
                          value={customerData.address.city}
                          onChange={(e) =>
                            handleInputChange("address.city", e.target.value)
                          }
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            fieldErrors.city
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          required
                        />
                      </div>
                      {fieldErrors.city && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> {fieldErrors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estado
                      </label>
                      <div className="relative">
                        <Map className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="UF"
                          value={customerData.address.state}
                          onChange={(e) =>
                            handleInputChange(
                              "address.state",
                              e.target.value.toUpperCase()
                            )
                          }
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 uppercase ${
                            fieldErrors.state
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          maxLength={2}
                          required
                        />
                      </div>
                      {fieldErrors.state && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />{" "}
                          {fieldErrors.state}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Forma de Pagamento
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <label
                      className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === "pix"
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-full ${
                          paymentMethod === "pix"
                            ? "bg-orange-100"
                            : "bg-gray-100"
                        }`}
                      >
                        <Smartphone
                          className={`w-5 h-5 ${
                            paymentMethod === "pix"
                              ? "text-orange-600"
                              : "text-gray-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">PIX</span>
                        <p className="text-sm text-gray-500">
                          Pagamento instantâneo com até 10% de desconto
                        </p>
                      </div>
                      <input
                        type="radio"
                        name="payment"
                        value="pix"
                        checked={paymentMethod === "pix"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-5 w-5 text-orange-600 focus:ring-orange-500"
                      />
                    </label>

                    <label
                      className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === "card"
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-full ${
                          paymentMethod === "card"
                            ? "bg-orange-100"
                            : "bg-gray-100"
                        }`}
                      >
                        <CreditCard
                          className={`w-5 h-5 ${
                            paymentMethod === "card"
                              ? "text-orange-600"
                              : "text-gray-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">Cartão de Crédito</span>
                        <p className="text-sm text-gray-500">
                          Pague em até 12x no cartão
                        </p>
                      </div>
                      <input
                        type="radio"
                        name="payment"
                        value="card"
                        checked={paymentMethod === "card"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-5 w-5 text-orange-600 focus:ring-orange-500"
                      />
                    </label>
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

              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 border-b pb-3"
                  >
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

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => decreaseQuantity(item.id)}
                          className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                        >
                          <Minus className="w-4 h-4 text-gray-700" />
                        </button>
                        <span className="font-semibold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => increaseQuantity(item.id)}
                          className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                        >
                          <Plus className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="ml-2 p-1 rounded-full bg-red-100 hover:bg-red-200"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totais */}
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

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={handleNextStep}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Processando...
                    </>
                  ) : step === 2 ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirmar Pedido
                    </>
                  ) : (
                    "Continuar para Pagamento"
                  )}
                </button>

                <button
                  onClick={() => clearCart()}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Pedido
                </button>
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
