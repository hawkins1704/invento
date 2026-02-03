import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
    FaCheck,
    FaChevronLeft,
    FaChevronRight,
    FaWhatsapp,
} from "react-icons/fa";
import { FaTwitter, FaLinkedin, FaFacebook, FaInstagram } from "react-icons/fa";

const WHATSAPP_PHONE = "51992095138";
const WHATSAPP_CONTACT_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent("Hola Fudi! Vengo desde tu website y quisiera recibir más información! ")}`;

const getWhatsAppPlanUrl = (planName: string) =>
    `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(`Hola Fudi! Vengo de tu website y estoy interesado en tu plan ${planName}! `)}`;

const testimonials = [
    {
        quote: "Invento está ayudando a nuestra empresa a disminuir los gastos operativos y mejorar la eficiencia en la gestión de inventario de manera significativa.",
        author: "Sarah Miller",
        role: "CEO de TechCorp",
    },
    {
        quote: "La plataforma ha transformado completamente cómo gestionamos nuestro inventario. Es intuitiva, potente y nos ahorra horas de trabajo cada semana.",
        author: "Carlos Rodríguez",
        role: "Director de Operaciones",
    },
    {
        quote: "Desde que implementamos Invento, nuestra precisión en el control de stock ha mejorado en un 95%. Es una herramienta esencial para nuestro negocio.",
        author: "María González",
        role: "Gerente de Logística",
    },
    {
        quote: "El dashboard en tiempo real nos permite tomar decisiones rápidas y precisas. Nuestro equipo está más productivo que nunca.",
        author: "Juan Pérez",
        role: "Fundador de RetailPro",
    },
];

function TestimonialsSlider() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(
                (prevIndex) => (prevIndex + 1) % testimonials.length
            );
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
                            <blockquote className="text-xl md:text-2xl font-medium text-slate-700 dark:text-slate-300 mb-6">
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
                                ? "bg-[#fa7316] w-8"
                                : "bg-slate-300 dark:bg-slate-600 w-2"
                        }`}
                        aria-label={`Ir al testimonio ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}

export default function LandingPage() {
    // Helper function para scroll seguro (solo en cliente)
    const scrollToSection = (id: string) => {
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <img
                                src="/logo-main.svg"
                                alt="Logo"
                                className="h-8 w-auto"
                            />
                        </div>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center space-x-8">
                            <button
                                onClick={() => scrollToSection("funciones")}
                                className="text-slate-700 dark:text-slate-300 hover:text-[#fa7316] transition-colors"
                            >
                                Funciones
                            </button>
                            <button
                                onClick={() => scrollToSection("reseñas")}
                                className="text-slate-700 dark:text-slate-300 hover:text-[#fa7316] transition-colors"
                            >
                                Reseñas
                            </button>
                            <button
                                onClick={() => scrollToSection("planes")}
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
                                Inicia sesión
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-50 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-3xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-6">
                        Todo tu restaurante, <br />
                        <span className="relative">en un solo sistema!</span>
                    </h1>
                    <p className="text-md md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
                        Controla ventas, facturación electrónica, pedidos en
                        vivo y rendimiento de tus sucursales desde una sola
                        plataforma diseñada para restaurantes.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href={WHATSAPP_CONTACT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-3 bg-[#fa7316] text-white rounded-lg hover:bg-[#e86514] transition-colors font-semibold"
                        >
                            Comienza Ya!
                        </a>
                        <a
                            href="#funciones"
                            className="px-8 py-3 border border-[#fa7316] text-[#fa7316] rounded-lg hover:bg-[#fa7316] hover:text-white transition-colors font-semibold"
                        >
                            Saber Más
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section
                id="funciones"
                className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800 scroll-mt-20"
            >
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-white mb-16">
                        Fudi tiene lo que necesitas!
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg">
                            <h3 className="text-2xl font-bold text-[#fa7316] mb-4">
                                Ventas y pedidos en tiempo real
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                Gestiona pedidos en vivo, visualiza ventas al
                                instante y monitorea el rendimiento de cada
                                sucursal sin esperar cierres de turno.
                            </p>
                            <div className="mt-6 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                <img
                                    src="/lp-feature-1.png"
                                    alt="Ventas y pedidos en tiempo real"
                                    className="shadow-lg rounded-lg"
                                />
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg">
                            <h3 className="text-2xl font-bold text-[#fa7316] mb-4">
                                Facturación electrónica integrada
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                Emite boletas y facturas electrónicas
                                directamente desde Fudi, sin usar sistemas
                                externos ni procesos manuales.
                            </p>

                            <div className="mt-6 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                <img
                                    src="/lp-feature-2.png"
                                    alt="Facturación electrónica integrada"
                                    className="shadow-lg rounded-lg"
                                />
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg">
                            <h3 className="text-2xl font-bold text-[#fa7316] mb-4">
                                Gestión de productos, sucursales y equipo
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                Administra productos, precios, sucursales y
                                trabajadores desde un solo lugar.
                            </p>
                            <div className="mt-6 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                <img
                                    src="/lp-feature-3.png"
                                    alt="Gestión de productos, sucursales y equipo"
                                    className="shadow-lg rounded-lg"
                                />
                            </div>
                        </div>

                        {/* Feature 4 - Placeholder */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg">
                            <h3 className="text-2xl font-bold text-[#fa7316] mb-4">
                                Decisiones basadas en datos, no en suposiciones
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                Analiza qué vendes más, cuándo vendes mejor y en
                                qué horas generas más ingresos con reportes y
                                mapas de calor.
                            </p>
                            <div className="mt-6 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                <img
                                    src="/lp-feature-4.png"
                                    alt="Decisiones basadas en datos, no en suposiciones"
                                    className="shadow-lg rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-12">
                        <a
                            href={WHATSAPP_CONTACT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-3 bg-[#fa7316] text-white rounded-lg hover:bg-[#e86514] transition-colors font-semibold"
                        >
                            Comienza Ya!
                        </a>
                    </div>
                </div>
            </section>

            {/* Partners / Reseñas Section */}
            <section
                id="reseñas"
                className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-20"
            >
                <div className="max-w-7xl mx-auto">
                    <p className="text-center text-slate-400  grayscale dark:text-slate-400 text-md font-medium tracking-wider mb-8 uppercase">
                        Restaurantes que ya confían en Fudi
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 grayscale">
                        <div className="text-slate-400 font-semibold text-lg">
                            HubSpot
                        </div>
                        <div className="text-slate-400 font-semibold text-lg">
                            Slack
                        </div>
                        <div className="text-slate-400 font-semibold text-lg">
                            Google Drive
                        </div>
                        <div className="text-slate-400 font-semibold text-lg">
                            Asana
                        </div>
                        <div className="text-slate-400 font-semibold text-lg">
                            Zapier
                        </div>
                        <div className="text-slate-400 font-semibold text-lg">
                            Salesforce
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Slider Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <TestimonialsSlider />
            </section>

            {/* Pricing Plans Section */}
            <section
                id="planes"
                className="py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20"
            >
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-white mb-4">
                        Planes de Precios
                    </h2>
                    <p className="text-center text-slate-600 dark:text-slate-400 mb-12">
                        Contamos con planes que se ajustan a tus necesidades
                    </p>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
                        {/* Plan Starter */}
                        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border-2 border-slate-200 dark:border-slate-700">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Plan Starter
                            </h3>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                                    S/ 39
                                </span>
                                <span className="text-slate-600 dark:text-slate-400">
                                    /mes
                                </span>
                            </div>
                            <ul className="flex-1 space-y-4 mb-8">
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        1 Sucursal
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Trabajadores ilimitados
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Facturación electrónica integrada
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Hasta 2000 ventas/mes
                                    </span>
                                </li>
                            </ul>
                            <a
                                href={getWhatsAppPlanUrl("Plan Starter")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center px-6 py-3 border border-[#fa7316] text-[#fa7316] rounded-lg hover:bg-[#fa7316] hover:text-white transition-colors font-semibold"
                            >
                                Lo quiero!
                            </a>
                        </div>

                        {/* Plan Negocio - IDEAL */}
                        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-xl p-8 shadow-xl border-2 border-[#fa7316] relative">
                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                <span className="bg-[#fa7316] text-white px-4 py-1 rounded-full text-sm font-bold">
                                    IDEAL
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Plan Negocio
                            </h3>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                                    S/ 79
                                </span>
                                <span className="text-slate-600 dark:text-slate-400">
                                    /mes
                                </span>
                            </div>
                            <ul className="flex-1 space-y-4 mb-8">
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Hasta 5 sucursales
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Trabajadores ilimitados
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Facturación electrónica integrada
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Ventas ilimitadas
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Gráficos y reportes avanzados
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Soporte 24/7
                                    </span>
                                </li>
                            </ul>
                            <a
                                href={getWhatsAppPlanUrl("Plan Negocio")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center px-6 py-3 bg-[#fa7316] text-white rounded-lg hover:bg-[#e86514] transition-colors font-semibold"
                            >
                                Lo quiero!
                            </a>
                        </div>

                        {/* Plan Pro */}
                        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border-2 border-slate-200 dark:border-slate-700">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Plan Pro
                            </h3>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                                    S/ 130
                                </span>
                                <span className="text-slate-600 dark:text-slate-400">
                                    /mes
                                </span>
                            </div>
                            <ul className="flex-1 space-y-4 mb-8">
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Sucursales ilimitadas
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Trabajadores ilimitados
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Facturación electrónica integrada
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Ventas ilimitadas
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Gráficos y reportes avanzados
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Secciones hechas a medida
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FaCheck className="text-[#fa7316] mt-1 flex-shrink-0" />
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Soporte 24/7
                                    </span>
                                </li>
                            </ul>
                            <a
                                href={getWhatsAppPlanUrl("Plan Pro")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center px-6 py-3 border border-[#fa7316] text-[#fa7316] rounded-lg hover:bg-[#fa7316] hover:text-white transition-colors font-semibold"
                            >
                                Lo quiero!
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA Banner */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900 dark:bg-slate-950 border-b-2 border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <h2 className="flex items-center gap-2 text-3xl md:text-4xl font-bold text-white text-center md:text-left flex-1">
                            Empieza a gestionar tu restaurante como un negocio
                            moderno!
                        </h2>
                        <div className="flex justify-end  flex-col sm:flex-row gap-4 flex-1">
                            <a
                                href={WHATSAPP_CONTACT_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-slate-900 transition-colors font-semibold text-center"
                            >
                                Solicitar Demo
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
                        <div className="col-span-2">
                            <div className="flex items-center mb-4">
                                <img
                                    src="/logo-main.svg"
                                    alt="Logo"
                                    className="h-8 w-auto"
                                />
                            </div>

                            <p className="text-slate-400 text-sm mb-2">Lima, Perú</p>
                            <p className="text-slate-400 text-sm mb-4">
                                El que habita al abrigo del Altísimo Morará bajo
                                la sombra del Omnipotente. Diré yo a Jehová:
                                Esperanza mía, y castillo mío; Mi Dios, en quien
                                confiaré.
                                Salmos 91:1-2
                            </p>
                        </div>


                    </div>

                    <div className="border-t border-slate-800 pt-8 flex items-center justify-between">
                        <p className="text-slate-400 text-sm">
                            © 2026 Fudi. Todos los derechos reservados.
                        </p>
                        <div className="flex items-center space-x-4">
                            <a
                                href="#"
                                className="text-slate-400 hover:text-[#fa7316] transition-colors"
                            >
                                <FaTwitter className="h-5 w-5" />
                            </a>
                            <a
                                href="#"
                                className="text-slate-400 hover:text-[#fa7316] transition-colors"
                            >
                                <FaLinkedin className="h-5 w-5" />
                            </a>
                            <a
                                href="#"
                                className="text-slate-400 hover:text-[#fa7316] transition-colors"
                            >
                                <FaFacebook className="h-5 w-5" />
                            </a>
                            <a
                                href="#"
                                className="text-slate-400 hover:text-[#fa7316] transition-colors"
                            >
                                <FaInstagram className="h-5 w-5" />
                            </a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* WhatsApp Floating Button */}
            <a
                href={WHATSAPP_CONTACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-float-btn fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg group"
                aria-label="Contactar por WhatsApp"
            >
                <FaWhatsapp className="h-7 w-7" />
                <span className="whatsapp-float-tooltip pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-2 text-sm text-white shadow-md">
                    Quiero contactarme!
                </span>
            </a>
        </div>
    );
}
