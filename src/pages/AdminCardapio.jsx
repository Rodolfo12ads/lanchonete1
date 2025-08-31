import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';
import Header from '../components/Header';

export default function AdminCardapio() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const { toasts, addToast, removeToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    active: true,
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const productData = {
      ...formData,
      price: parseFloat(formData.price),
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        addToast('Produto atualizado com sucesso!', 'success');
      } else {
        await addDoc(collection(db, 'products'), productData);
        addToast('Produto adicionado com sucesso!', 'success');
      }
      
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      addToast('Erro ao salvar produto. Tente novamente.', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      imageUrl: '',
      active: true,
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      imageUrl: product.imageUrl,
      active: product.active,
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        addToast('Produto excluído com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
        addToast('Erro ao excluir produto. Tente novamente.', 'error');
      }
    }
  };

  const toggleActive = async (product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), {
        active: !product.active,
      });
      addToast(
        `Produto ${product.active ? 'ocultado' : 'ativado'} com sucesso!`, 
        'success'
      );
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      addToast('Erro ao alterar status. Tente novamente.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Gerenciar Cardápio</h1>
            <p className="text-gray-600 text-lg">Adicione, edite e gerencie os produtos do cardápio</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-8 py-4 rounded-2xl hover:bg-red-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105"
          >
            <FiPlus className="w-5 h-5" />
            Novo Produto
          </button>
        </div>

        {/* Formulário */}
        <Modal
          isOpen={showForm}
          onClose={resetForm}
          title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block font-semibold text-gray-900 mb-3">
                    Nome do Produto
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-semibold text-gray-900 mb-3">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                    rows="4"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-900 mb-3">
                      Preço (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block font-semibold text-gray-900 mb-3">
                      Categoria
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                      required
                    >
                      <option value="">Selecione...</option>
                      <option value="Lanches">Lanches</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Acompanhamentos">Acompanhamentos</option>
                      <option value="Sobremesas">Sobremesas</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block font-semibold text-gray-900 mb-3">
                    URL da Imagem
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                    placeholder="https://exemplo.com/imagem.jpg"
                    required
                  />
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="active" className="font-medium text-gray-900">
                    Produto ativo no cardápio
                  </label>
                </div>
                
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 transition-colors font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl"
                  >
                    {editingProduct ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
        </Modal>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="xl" />
          </div>
        ) : (
          <>
            {/* Lista de produtos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 ${
                    !product.active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="h-48 w-full relative">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="object-cover w-full h-full"
                    />
                    {!product.active && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                        <span className="text-white font-bold text-lg bg-red-600 px-4 py-2 rounded-full">
                          INATIVO
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-xl text-gray-900">{product.name}</h3>
                      <span className="text-red-600 font-bold text-lg">
                        R$ {Number(product.price).toFixed(2)}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3 leading-relaxed">{product.description}</p>
                    <p className="text-sm text-gray-500 mb-6 bg-gray-50 px-3 py-1 rounded-full inline-block">
                      {product.category}
                    </p>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors font-semibold"
                      >
                        <FiEdit className="w-4 h-4" />
                        Editar
                      </button>
                      
                      <button
                        onClick={() => toggleActive(product)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors font-semibold ${
                          product.active
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {product.active ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                        {product.active ? 'Ocultar' : 'Mostrar'}
                      </button>
                      
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-semibold"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
                  
            {products.length === 0 && (
              <div className="text-center py-20">
                <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-6xl">🍔</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Nenhum produto cadastrado
                </h3>
                <p className="text-gray-600 mb-8 text-lg">
                  Comece adicionando produtos ao seu cardápio
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-8 py-4 rounded-2xl hover:bg-red-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl"
                >
                  <FiPlus className="w-5 h-5" />
                  Adicionar Primeiro Produto
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
