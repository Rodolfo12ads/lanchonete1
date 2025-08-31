import PropTypes from 'prop-types';

import { useState } from 'react';
import { FiMinus, FiPlus, FiTrash2, FiShoppingCart, FiChevronUp, FiChevronDown } from 'react-icons/fi';

export default function CartFooter({ cart, onFinish, onQty, onRemove }) {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const [isExpanded, setIsExpanded] = useState(false);
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-50 backdrop-blur-sm">
      {/* Carrinho expandido */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto border-b border-gray-100 bg-gray-50">
          <div className="p-4">
            <h3 className="font-bold text-xl mb-6 flex items-center text-gray-900">
              <FiShoppingCart className="mr-2" />
              Seu Carrinho
            </h3>
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{item.name}</h4>
                    <p className="text-red-600 font-bold">
                      R$ {(item.price * item.qty).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onQty(item.id, item.qty - 1)}
                      className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <FiMinus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-lg">{item.qty}</span>
                    <button
                      onClick={() => onQty(item.id, item.qty + 1)}
                      className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors ml-2"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer do carrinho */}
      <div className="px-6 py-4 bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors font-medium"
          >
            <div className="relative">
              <FiShoppingCart className="w-6 h-6" />
              <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems}
              </div>
            </div>
            <span>
              {cart.length} {cart.length === 1 ? 'produto' : 'produtos'}
            </span>
            {isExpanded ? <FiChevronDown className="w-4 h-4" /> : <FiChevronUp className="w-4 h-4" />}
          </button>
          
          <div className="flex-1 text-center">
            <span className="font-bold text-xl text-gray-900">
              Total: R$ {total.toFixed(2)}
            </span>
          </div>
          
          <button
            onClick={onFinish}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            Finalizar Pedido
          </button>
        </div>
      </div>
    </div>
  );
}

CartFooter.propTypes = {
  cart: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      qty: PropTypes.number.isRequired,
      imageUrl: PropTypes.string.isRequired,
    })
  ).isRequired,
  onQty: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onFinish: PropTypes.func.isRequired,
};

