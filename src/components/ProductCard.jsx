import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Plus, Heart, Star, Clock, Flame } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, onAdd }) {
  const [isLiked, setIsLiked] = useState(false);
  const { addItem } = useCart();

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    hover: {
      y: -12,
      scale: 1.03,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const imageVariants = {
    hover: {
      scale: 1.15,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1
      }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl border border-gray-100 cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-orange-50 to-red-50">
        <motion.img
          variants={imageVariants}
          src={product.imageUrl}
          alt={product.name}
          className="object-cover w-full h-full"
        />
        
        {/* Gradient Overlay */}
        <motion.div 
          variants={overlayVariants}
          initial="hidden"
          whileHover="visible"
          className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"
        />

        {/* Price Badge - Redesigned */}
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: "backOut" }}
          className="absolute top-4 right-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-2xl shadow-xl font-bold text-lg backdrop-blur-sm border border-white/20"
        >
          R$ {Number(product.price).toFixed(2)}
        </motion.div>

        {/* Like Button - Redesigned */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          className="absolute top-4 left-4 w-12 h-12 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl hover:bg-white transition-all duration-300 border border-gray-100"
        >
          <Heart 
            className={`w-6 h-6 transition-all duration-300 ${
              isLiked ? 'text-red-500 fill-current scale-110' : 'text-gray-600'
            }`} 
          />
        </motion.button>

        {/* Popular Badge */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="absolute bottom-4 left-4 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold"
        >
          <Flame className="w-4 h-4" />
          Popular
        </motion.div>

        {/* Rating Badge - Redesigned */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 border border-gray-100"
        >
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-sm font-bold text-gray-800">4.8</span>
        </motion.div>
      </div>
      
      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="space-y-3">
          <motion.h3 
            className="font-bold text-xl text-gray-900 group-hover:text-orange-600 transition-colors leading-tight"
            whileHover={{ x: 3 }}
          >
            {product.name}
          </motion.h3>
          <p className="text-gray-600 leading-relaxed line-clamp-2 text-sm">
            {product.description}
          </p>
        </div>

        {/* Tags Section */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 px-4 py-2 rounded-xl text-sm font-semibold border border-orange-200">
            <Clock className="w-4 h-4" />
            {product.category}
          </span>
          <div className="text-xs text-gray-500 font-medium">
            15-20 min
          </div>
        </div>
        
        {/* Add Button - Redesigned */}
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={(e) => {
            e.stopPropagation();
            addItem(product);
            if (onAdd) onAdd();
          }}
          className="w-full py-4 rounded-2xl text-white font-bold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 group/btn relative overflow-hidden"
        >
          {/* Button shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.6 }}
          />
          
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.4 }}
            className="relative z-10"
          >
            <Plus className="w-5 h-5" />
          </motion.div>
          <span className="relative z-10 text-lg">Adicionar ao Carrinho</span>
        </motion.button>
      </div>

      {/* Hover Glow Effect */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-pink-500/10 pointer-events-none rounded-3xl"
      />

      {/* Border Glow on Hover */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute inset-0 rounded-3xl border-2 border-gradient-to-r from-orange-400 to-red-400 pointer-events-none"
        style={{
          background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #f97316, #dc2626) border-box',
          border: '2px solid transparent'
        }}
      />
    </motion.div>
  );
}

// Validação das props
ProductCard.propTypes = {
  product: PropTypes.shape({
    name: PropTypes.string.isRequired,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    description: PropTypes.string,
    imageUrl: PropTypes.string.isRequired,
    category: PropTypes.string,
  }).isRequired,
  onAdd: PropTypes.func,
};

