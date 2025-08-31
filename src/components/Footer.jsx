import { FiPhone, FiMail, FiMapPin, FiClock, FiInstagram, FiFacebook, FiTwitter } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Logo e descrição */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">🍔</span>
              </div>
              <span className="text-3xl font-bold">Burger House</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Os melhores lanches da cidade, feitos com ingredientes frescos e muito amor.
            </p>
            
            {/* Redes sociais */}
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                <FiInstagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                <FiFacebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                <FiTwitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Horário de funcionamento */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FiClock className="w-5 h-5 text-red-500" />
              Funcionamento
            </h3>
            <div className="text-gray-400 space-y-2">
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Segunda a Sexta: 18h às 23h
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Sábado e Domingo: 18h às 00h
              </p>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Contato</h3>
            <div className="text-gray-400 space-y-3">
              <p className="flex items-center gap-3">
                <FiPhone className="w-5 h-5 text-red-500" />
                (11) 99999-9999
              </p>
              <p className="flex items-center gap-3">
                <FiMail className="w-5 h-5 text-red-500" />
                contato@burgerhouse.com
              </p>
              <p className="flex items-center gap-3">
                <FiMapPin className="w-5 h-5 text-red-500" />
                Rua dos Lanches, 123 - Centro
              </p>
            </div>
          </div>
          
          {/* Links úteis */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Links Úteis</h3>
            <div className="space-y-2">
              <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                Sobre Nós
              </a>
              <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                Termos de Uso
              </a>
              <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                Suporte
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400">
            &copy; 2025 Burger House. Todos os direitos reservados.
          </p>
          <p className="text-gray-500 text-sm">
            Desenvolvido com ❤️ para os amantes de lanches
          </p>
        </div>
      </div>
    </footer>
  );
}