import { useAuth } from '../auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FiArrowLeft } from 'react-icons/fi';

export default function Login() {
  const { user, loginWithGoogle } = useAuth();

  // Se já estiver logado, redireciona para home
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">
        {/* Botão voltar */}
        <Link
          to="/"
          className="absolute top-6 left-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        
        {/* Logo */}
        <div className="text-center mb-10 pt-4">
          <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <span className="text-white font-bold text-3xl">🍔</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Burger House
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Entre para salvar seus pedidos e ter uma experiência personalizada
          </p>
        </div>

        {/* Botão de login */}
        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-4 py-5 rounded-2xl bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl hover:border-gray-300 transition-all duration-300 font-semibold text-gray-700 mb-8 hover:scale-105"
        >
          <FcGoogle className="text-3xl" />
          <span className="text-lg">Continuar com Google</span>
        </button>

        {/* Link para continuar sem login */}
        <div className="text-center">
          <p className="text-gray-500 mb-4">ou</p>
          <Link
            to="/cardapio"
            className="text-red-600 hover:text-red-700 font-semibold transition-colors text-lg"
          >
            Continuar sem fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}
