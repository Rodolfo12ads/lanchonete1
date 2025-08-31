import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Cardapio from './pages/Cliente/Cardapio';
import MeusPedidos from './pages/Cliente/MeusPedidos';
import Login from './pages/Login';
import Checkout from './pages/Checkout';
import PagamentoPix from './pages/PagamentoPix';
import PedidoConfirmado from './pages/PedidoConfirmado';
import { AdminRoute } from './components/ProtectedRoute';
import AdminCardapio from './pages/AdminCardapio';
import AdminPedidos from './pages/AdminPedidos';
import AdminConfigPix from './pages/AdminConfigPix';
import AuthProvider from './auth/AuthProvider';
import { CartProvider } from './context/CartContext';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/" element={<Cardapio />} />
            <Route path="/home" element={<Home />} />
            <Route path="/cardapio" element={<Cardapio />} />
            <Route path="/meus-pedidos" element={<MeusPedidos />} />
            <Route path="/login" element={<Login />} />
            
            {/* Rotas de Checkout e Pagamento */}
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pagamento/:orderId" element={<PagamentoPix />} />
            <Route path="/pedido-confirmado/:orderId" element={<PedidoConfirmado />} />

            {/* Rotas Admin protegidas */}
            <Route
              path="/admin/cardapio"
              element={
                <AdminRoute>
                  <AdminCardapio />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/pedidos"
              element={
                <AdminRoute>
                  <AdminPedidos />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/config-pix"
              element={
                <AdminRoute>
                  <AdminConfigPix />
                </AdminRoute>
              }
            />

          </Routes>
        </BrowserRouter>
        
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#374151',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;

