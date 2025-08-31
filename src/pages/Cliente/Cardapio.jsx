import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../../components/ProductCard";
import CartFooter from "../../components/CartFooter";
import SearchBar from "../../components/SearchBar";
import CategoryFilter from "../../components/CategoryFilter";
import LoadingSpinner from "../../components/LoadingSpinner";
import ToastContainer from "../../components/ToastContainer";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useToast } from "../../hooks/useToast";
import { db } from "../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../../auth/AuthProvider";

// 👉 importa a imagem do "Menu"
import menuImage from "../../assets/images/menu.png";

import { motion } from "framer-motion";

export default function Cardapio() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  useAuth();
  const [loading, setLoading] = useState(true);
  const { toasts, addToast, removeToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "products"), where("active", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category))).sort();
  }, [products]);

  const [activeCat, setActiveCat] = useState("");

  useEffect(() => {
    if (!activeCat && categories[0]) setActiveCat(categories[0]);
  }, [categories, activeCat]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = !activeCat || p.category === activeCat;
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCat, searchTerm]);

  const addToCart = (p) => {
    const idx = cart.findIndex((i) => i.id === p.id);
    if (idx >= 0) {
      const c = [...cart];
      c[idx].qty += 1;
      setCart(c);
      addToast(`${p.name} adicionado ao carrinho!`, "success", 3000);
    } else {
      setCart([
        ...cart,
        {
          id: p.id,
          name: p.name,
          price: Number(p.price),
          imageUrl: p.imageUrl,
          qty: 1,
        },
      ]);
      addToast(`${p.name} adicionado ao carrinho!`, "success", 3000);
    }
  };

  const updateCartQty = (id, newQty) => {
    if (newQty <= 0) {
      setCart(cart.filter((item) => item.id !== id));
    } else {
      setCart(
        cart.map((item) => (item.id === id ? { ...item, qty: newQty } : item))
      );
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
        <div className="text-center mb-10">
          {/* 👉 imagem estilizada com animação */}
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            src={menuImage}
            alt="Menu"
            className="mx-auto w-[320px] md:w-[480px] lg:w-[600px] object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
          />
        </div>

        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

        <CategoryFilter
          categories={categories}
          activeCategory={activeCat}
          onCategoryChange={setActiveCat}
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="xl" />
          </div>
        ) : (
          <>
            {/* Produtos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAdd={() => addToCart(p)}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🔍</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {searchTerm
                    ? "Nenhum produto encontrado"
                    : "Nenhum produto disponível"}
                </h3>
                <p className="text-gray-500 text-lg">
                  {searchTerm
                    ? "Tente buscar por outro termo ou categoria"
                    : "Nenhum produto disponível nesta categoria no momento"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Carrinho */}
      {cart.length > 0 && (
        <CartFooter
          cart={cart}
          onFinish={() => navigate("/checkout")}
          onQty={updateCartQty}
          onRemove={removeFromCart}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Footer />
    </div>
  );
}
