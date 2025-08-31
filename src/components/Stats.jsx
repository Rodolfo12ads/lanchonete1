import { useEffect, useState } from 'react';

const stats = [
  { number: 500, label: 'Clientes Satisfeitos', suffix: '+' },
  { number: 1200, label: 'Lanches Entregues', suffix: '+' },
  { number: 4.9, label: 'Avaliação Média', suffix: '/5', decimal: true },
  { number: 30, label: 'Minutos de Entrega', suffix: 'min' }
];

function AnimatedNumber({ target, suffix = '', decimal = false }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const increment = target / 100;
    const timer = setInterval(() => {
      setCurrent(prev => {
        const next = prev + increment;
        if (next >= target) {
          clearInterval(timer);
          return target;
        }
        return next;
      });
    }, 20);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <span>
      {decimal ? current.toFixed(1) : Math.floor(current)}
      {suffix}
    </span>
  );
}

export default function Stats() {
  return (
    <section className="py-16 bg-gradient-to-r from-red-600 to-orange-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl lg:text-5xl font-bold mb-2">
                <AnimatedNumber 
                  target={stat.number} 
                  suffix={stat.suffix}
                  decimal={stat.decimal}
                />
              </div>
              <div className="text-red-100 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}