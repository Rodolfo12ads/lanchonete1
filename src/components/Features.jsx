import {
  FiClock,
  FiShield,
  FiHeart,
  FiTruck,
  FiStar,
  FiUsers,
} from "react-icons/fi";

const features = [
  {
    icon: FiHeart,
    title: "Ingredientes Frescos",
    description:
      "Selecionamos apenas os melhores ingredientes, frescos e de qualidade premium para nossos lanches.",
    color: "red",
  },
  {
    icon: FiClock,
    title: "Entrega Rápida",
    description:
      "Preparamos e entregamos seu pedido em até 30 minutos, sempre quentinho e saboroso.",
    color: "orange",
  },
  {
    icon: FiShield,
    title: "Qualidade Garantida",
    description:
      "Cada lanche é preparado com carinho e atenção aos detalhes, garantindo a melhor experiência.",
    color: "yellow",
  },
  {
    icon: FiTruck,
    title: "Entrega Grátis",
    description:
      "Entrega gratuita para pedidos acima de R$ 30,00 em toda a região metropolitana.",
    color: "green",
  },
  {
    icon: FiStar,
    title: "Avaliação 5 Estrelas",
    description:
      "Mais de 500 clientes satisfeitos avaliam nossos lanches com 5 estrelas.",
    color: "blue",
  },
  {
    icon: FiUsers,
    title: "Atendimento Premium",
    description:
      "Nossa equipe está sempre pronta para oferecer o melhor atendimento e suporte.",
    color: "purple",
  },
];

const colorClasses = {
  red: "bg-red-100 text-red-600",
  orange: "bg-orange-100 text-orange-600",
  yellow: "bg-yellow-100 text-yellow-600",
  green: "bg-green-100 text-green-600",
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
};

export default function Features() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Por que escolher a
            <span className="block bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Snacks Chicken?
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Combinamos tradição, qualidade e inovação para criar a melhor
            experiência gastronômica da cidade
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-8 bg-gray-50 rounded-3xl hover:bg-white hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
              >
                <div
                  className={`w-16 h-16 ${
                    colorClasses[feature.color]
                  } rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
