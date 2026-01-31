import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FaCheck, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FaTwitter, FaLinkedin, FaFacebook, FaInstagram } from 'react-icons/fa';



const testimonials = [
  {
    quote: "Invento está ayudando a nuestra empresa a disminuir los gastos operativos y mejorar la eficiencia en la gestión de inventario de manera significativa.",
    author: "Sarah Miller",
    role: "CEO de TechCorp"
  },
  {
    quote: "La plataforma ha transformado completamente cómo gestionamos nuestro inventario. Es intuitiva, potente y nos ahorra horas de trabajo cada semana.",
    author: "Carlos Rodríguez",
    role: "Director de Operaciones"
  },
  {
    quote: "Desde que implementamos Invento, nuestra precisión en el control de stock ha mejorado en un 95%. Es una herramienta esencial para nuestro negocio.",
    author: "María González",
    role: "Gerente de Logística"
  },
  {
    quote: "El dashboard en tiempo real nos permite tomar decisiones rápidas y precisas. Nuestro equipo está más productivo que nunca.",
    author: "Juan Pérez",
    role: "Fundador de RetailPro"
  }
];

function TestimonialsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  return (
    <div className="max-w-4xl mx-auto relative">
      <div className="relative overflow-hidden">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="min-w-full text-center px-4"
            >
              <blockquote className="text-2xl md:text-3xl font-medium text-slate-700 dark:text-slate-300 mb-6">
                "{testimonial.quote}"
              </blockquote>
              <p className="text-slate-500 dark:text-slate-400">
                {testimonial.author}, {testimonial.role}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 bg-white dark:bg-slate-800 border-2 border-[#fa7316] text-[#fa7316] rounded-full p-3 hover:bg-[#fa7316] hover:text-white transition-colors shadow-lg z-10"
        aria-label="Testimonio anterior"
      >
        <FaChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 bg-white dark:bg-slate-800 border-2 border-[#fa7316] text-[#fa7316] rounded-full p-3 hover:bg-[#fa7316] hover:text-white transition-colors shadow-lg z-10"
        aria-label="Siguiente testimonio"
      >
        <FaChevronRight className="h-5 w-5" />
      </button>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-8">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-[#fa7316] w-8'
                : 'bg-slate-300 dark:bg-slate-600 w-2'
            }`}
            aria-label={`Ir al testimonio ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img src="/logo-main.svg" alt="Logo" className="h-8 w-auto" />
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => document.getElementById('funciones')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-slate-700 dark:text-slate-300 hover:text-[#fa7316] transition-colors"
              >
                Funciones
              </button>
              <button
                onClick={() => document.getElementById('reseñas')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-slate-700 dark:text-slate-300 hover:text-[#fa7316] transition-colors"
              >
                Reseñas
              </button>
              <button
                onClick={() => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-slate-700 dark:text-slate-300 hover:text-[#fa7316] transition-colors"
              >
                Planes
              </button>
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="px-4 py-2 border border-[#fa7316] text-[#fa7316] rounded-lg hover:bg-[#fa7316] hover:text-white transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 bg-[#fa7316] text-white rounded-lg hover:bg-[#e86514] transition-colors"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-50 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-6">
            Una herramienta para gestionar{' '}
            <span className="relative">
              inventario
              <span className="absolute bottom-0 left-0 right-0 h-3 bg-[#fa7316]/30 -z-10"></span>
            </span>{' '}
            y tu{' '}
            <span className="relative">
              equipo
              <span className="absolute bottom-0 left-0 right-0 h-3 bg-[#fa7316]/30 -z-10"></span>
            </span>
          </h1>
          <p className="text-md md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
            Simplifica la gestión de tu negocio con nuestra plataforma integral. 
            Controla inventario, ventas y personal desde un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-8 py-3 bg-[#fa7316] text-white rounded-lg hover:bg-[#e86514] transition-colors font-semibold"
            >
              Comienza Ya!
            </Link>
            <Link
              to="#funciones"
              className="px-8 py-3 border border-[#fa7316] text-[#fa7316] rounded-lg hover:bg-[#fa7316] hover:text-white transition-colors font-semibold"
            >
              Saber Más
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funciones" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-white mb-16">
            Tecnologías avanzadas para todo lo que necesitas
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-[#fa7316] mb-4">Dashboard Dinámico</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Visualiza todas las métricas importantes de tu negocio en tiempo real. 
                Toma decisiones informadas con datos actualizados al instante.
              </p>
              <button className="px-6 py-2 bg-[#fa7316] text-white rounded-lg hover:bg-[#e86514] transition-colors">
                Leer más
              </button>
              <div className="mt-6 h-48 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <div className="flex items-end gap-2 h-32">
                  <div className="w-8 bg-[#fa7316] h-16 rounded-t"></div>
                  <div className="w-8 bg-[#fa7316] h-24 rounded-t"></div>
                  <div className="w-8 bg-[#fa7316] h-20 rounded-t"></div>
                  <div className="w-8 bg-[#fa7316] h-28 rounded-t"></div>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-[#fa7316] mb-4">Notificaciones Inteligentes</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Mantente al día con alertas personalizadas sobre inventario bajo, 
                ventas importantes y actividades de tu equipo.
              </p>
              <button className="px-6 py-2 bg-[#fa7316] text-white rounded-lg hover:bg-[#e86514] transition-colors">
                Leer más
              </button>
              <div className="mt-6 h-48 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-6 bg-[#fa7316] rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Activado</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-6 bg-slate-300 dark:bg-slate-600 rounded-full relative">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Desactivado</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-[#fa7316] mb-4">Gestión de Tareas</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Organiza y asigna tareas a tu equipo. Rastrea el progreso y 
                mantén a todos sincronizados con las prioridades del negocio.
              </p>
              <button className="px-6 py-2 bg-[#fa7316] text-white rounded-lg hover:bg-[#e86514] transition-colors">
                Leer más
              </button>
              <div className="mt-6 h-48 bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#fa7316] rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-2 bg-[#fa7316] rounded w-3/4"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-400 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-2 bg-slate-300 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-400 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-2 bg-slate-300 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4 - Placeholder */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-[#fa7316] mb-4">Reportes Avanzados</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Genera reportes detallados de ventas, inventario y rendimiento. 
                Exporta datos en múltiples formatos para análisis externos.
              </p>
              <button className="px-6 py-2 bg-[#fa7316] text-white rounded-lg hover:bg-[#e86514] transition-colors">
                Leer más
              </button>
              <div className="mt-6 h-48 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <div className="text-slate-400 text-4xl">📊</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners / Reseñas Section */}
      <section id="reseñas" className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-slate-400  grayscale dark:text-slate-400 text-sm font-medium tracking-wider mb-8">
            ELLOS YA NOS ELIGIERON
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 grayscale">
            <div className="text-slate-400 font-semibold text-lg">HubSpot</div>
            <div className="text-slate-400 font-semibold text-lg">Slack</div>
            <div className="text-slate-400 font-semibold text-lg">Google Drive</div>
            <div className="text-slate-400 font-semibold text-lg">Asana</div>
            <div className="text-slate-400 font-semibold text-lg">Zapier</div>
            <div className="text-slate-400 font-semibold text-lg">Salesforce</div>
          </div>
        </div>
      </section>

      {/* Testimonials Slider Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <TestimonialsSlider />
      </section>

      {/* Pricing Plans Section */}
      <section id="planes" className="py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-white mb-4">
            Planes de Precios
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-12">
            Elige el plan que mejor se adapte a tu negocio
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plan Básico */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border-2 border-slate-200 dark:border-slate-700">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Plan Básico</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">S/ 99</span>
                <span className="text-slate-600 dark:text-slate-400">/mes</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Hasta 2 sucursales</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Hasta 5 usuarios</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Gestión de inventario básica</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Reportes básicos</span>
                </li>
              </ul>
              <Link
                to="/login"
                className="block w-full text-center px-6 py-3 border border-[#fa7316] text-[#fa7316] rounded-lg hover:bg-[#fa7316] hover:text-white transition-colors font-semibold"
              >
                Comenzar
              </Link>
            </div>

            {/* Plan Negocio - IDEAL */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-xl border-2 border-[#fa7316] relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#fa7316] text-white px-4 py-1 rounded-full text-sm font-bold">
                  IDEAL
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Plan Negocio</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">S/ 199</span>
                <span className="text-slate-600 dark:text-slate-400">/mes</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Hasta 5 sucursales</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Hasta 15 usuarios</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Gestión avanzada de inventario</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Reportes avanzados</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Soporte prioritario</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Integraciones API</span>
                </li>
              </ul>
              <Link
                to="/login"
                className="block w-full text-center px-6 py-3 bg-[#fa7316] text-white rounded-lg hover:bg-[#e86514] transition-colors font-semibold"
              >
                Comenzar
              </Link>
            </div>

            {/* Plan Empresarial */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border-2 border-slate-200 dark:border-slate-700">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Plan Empresarial</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">S/ 399</span>
                <span className="text-slate-600 dark:text-slate-400">/mes</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Sucursales ilimitadas</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Usuarios ilimitados</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Todas las funcionalidades</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Soporte 24/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Personalización avanzada</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Gerente de cuenta dedicado</span>
                </li>
              </ul>
              <Link
                to="/login"
                className="block w-full text-center px-6 py-3 border border-[#fa7316] text-[#fa7316] rounded-lg hover:bg-[#fa7316] hover:text-white transition-colors font-semibold"
              >
                Comenzar
              </Link>
            </div>
          </div>
        </div>
      </section>

   


      {/* Final CTA Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900 dark:bg-slate-950 border-b-2 border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <h2 className="flex items-center gap-2 text-3xl md:text-4xl font-bold text-white text-center md:text-left">
              Descubre todo el potencial de
              <img src="/logo-main.svg" alt="Logo" className="h-8 w-auto" />
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="#demo"
                className="px-6 py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-slate-900 transition-colors font-semibold text-center"
              >
                Solicitar Demo
              </Link>
              <Link
                to="#pricing"
                className="px-6 py-3 bg-[#fa7316] text-white rounded-lg hover:bg-[#e86514] transition-colors font-semibold text-center"
              >
                Ver Precios
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center mb-4">
                <img src="/logo-main.svg" alt="Logo" className="h-8 w-auto" />
              </div>
             
              <p className="text-slate-400 text-sm">
                Lima, Perú
              </p>
              <p className="text-slate-400 text-sm mb-4">
                Versículo
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Soluciones</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Gestión de Inventario</a></li>
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Ventas</a></li>
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Reportes</a></li>
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Equipo</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Acerca de</a></li>
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Carreras</a></li>
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Contacto</a></li>
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Recursos</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Documentación</a></li>
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">API</a></li>
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Soporte</a></li>
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Comunidad</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Privacidad</a></li>
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Términos</a></li>
                <li><a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors text-sm">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              © 2026 Fudi. Todos los derechos reservados.
            </p>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors">
                <FaTwitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors">
                <FaLinkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors">
                <FaFacebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#fa7316] transition-colors">
                <FaInstagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
