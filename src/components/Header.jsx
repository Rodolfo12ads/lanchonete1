import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../context/CartContext";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Settings, Menu, X, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";

import snackfundo from "../assets/images/snackfundo.png";

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { getTotalItems, toggleCart } = useCart();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  const isActive = (path) => location.pathname === path;

  // Verificar se usuário é admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (user && isAdmin) {
        const adminStatus = await isAdmin();
        setUserIsAdmin(adminStatus);
      } else {
        setUserIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user, isAdmin]);

  const menuVariants = {
    hidden: {
      opacity: 0,
      y: -20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.15,
      },
    },
  };

  const mobileMenuVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.3,
      },
    },
    visible: {
      opacity: 1,
      height: "auto",
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}

          <Link to="/" className="flex items-center">
            <motion.img
              whileHover={{ scale: 1.08, rotate: 1 }}
              whileTap={{ scale: 0.95 }}
              src={snackfundo}
              alt="Snack Fundo"
              className="w-40 h-20 md:w-48 md:h-24 object-contain drop-shadow-xl transition-all"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-2">
            {[
              { path: "/home", label: "Início" },
              { path: "/cardapio", label: "Cardápio" },
              ...(user
                ? [{ path: "/meus-pedidos", label: "Meus Pedidos" }]
                : []),
              ...(userIsAdmin
                ? [
                    { path: "/admin/cardapio", label: "Admin Cardápio" },
                    { path: "/admin/pedidos", label: "Admin Pedidos" },
                    { path: "/admin/config-pix", label: "Config Pix" },
                  ]
                : []),
            ].map((item) => (
              <Link key={item.path} to={item.path} className="relative">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`font-semibold transition-all duration-300 px-6 py-3 rounded-xl ${
                    isActive(item.path)
                      ? "text-white bg-gradient-to-r from-orange-500 to-red-500 shadow-lg"
                      : "text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                  }`}
                >
                  {item.label}
                </motion.div>
                {isActive(item.path) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl -z-10"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Cart Button */}
            <Link to="/checkout">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-3 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-300"
              >
                <ShoppingCart className="w-6 h-6" />
                {getTotalItems() > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                  >
                    {getTotalItems()}
                  </motion.span>
                )}
              </motion.button>
            </Link>

            {user ? (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50 transition-all duration-300"
                >
                  <img
                    src={
                      user.photoURL ||
                      `https://ui-avatars.com/api/?name=${user.displayName}&background=ff6b35&color=fff`
                    }
                    alt="Avatar"
                    className="w-10 h-10 rounded-full border-2 border-orange-200"
                  />
                  <span className="hidden md:block font-semibold text-gray-700">
                    {user.displayName?.split(" ")[0]}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      variants={menuVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-semibold text-gray-900">
                          {user.displayName}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>

                      <Link
                        to="/meus-pedidos"
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="w-5 h-5" />
                        <span>Meus Pedidos</span>
                      </Link>

                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Sair</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary px-6 py-3 rounded-xl font-semibold"
                >
                  Entrar
                </motion.button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-300"
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="lg:hidden border-t border-gray-100 py-4"
            >
              <nav className="flex flex-col space-y-2">
                {[
                  { path: "/home", label: "Início" },
                  { path: "/cardapio", label: "Cardápio" },
                  ...(user
                    ? [{ path: "/meus-pedidos", label: "Meus Pedidos" }]
                    : []),
                  ...(userIsAdmin
                    ? [
                        { path: "/admin/cardapio", label: "Admin Cardápio" },
                        { path: "/admin/pedidos", label: "Admin Pedidos" },
                        { path: "/admin/config-pix", label: "Config Pix" },
                      ]
                    : []),
                ].map((item, index) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        isActive(item.path)
                          ? "text-white bg-gradient-to-r from-orange-500 to-red-500"
                          : "text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}

                {!user && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="pt-4 border-t border-gray-100"
                  >
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold text-center"
                    >
                      Entrar
                    </Link>
                  </motion.div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
