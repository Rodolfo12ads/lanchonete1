import { FiSearch, FiX } from 'react-icons/fi';

export default function SearchBar({ searchTerm, onSearchChange, placeholder = "Buscar produtos..." }) {
  return (
    <div className="relative max-w-md mx-auto mb-8">
      <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white shadow-sm text-gray-900 placeholder-gray-500"
      />
      {searchTerm && (
        <button
          onClick={() => onSearchChange('')}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}