import { FiGrid } from 'react-icons/fi';

export default function CategoryFilter({ categories, activeCategory, onCategoryChange }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <FiGrid className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Categorias</h3>
      </div>
      
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-2">
        <button
          onClick={() => onCategoryChange('')}
          className={`flex-shrink-0 px-6 py-3 rounded-full font-semibold transition-all duration-300 whitespace-nowrap
            ${
              !activeCategory
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-red-200'
            }`}
        >
          Todos os Produtos
        </button>
        
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`flex-shrink-0 px-6 py-3 rounded-full font-semibold transition-all duration-300 whitespace-nowrap
              ${
                activeCategory === category
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-red-200'
              }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}