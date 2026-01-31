import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { FaCheck } from "react-icons/fa";
import { FaCrown, FaStore, FaRocket } from "react-icons/fa";
import PageHeader from "../../components/page-header/PageHeader";
type SubscriptionType = "starter" | "negocio" | "pro";

const SUBSCRIPTION_INFO: Record<
    SubscriptionType,
    {
        name: string;
        description: string;
        icon: React.ReactNode;
        features: string[];
    }
> = {
    starter: {
        name: "Plan Starter",
        description: "Perfecto para comenzar",
        icon: <FaRocket className="text-xl" />,
        features: [
            "1 Sucursal",
            "Trabajadores ilimitados",
            "Facturación electrónica integrada",
            "Hasta 2000 ventas/mes",
        ],
    },
    negocio: {
        name: "Plan Negocio",
        description: "Para empresas en crecimiento",
        icon: <FaStore className="text-xl" />,
        features: [
            "Hasta 5 sucursales",
            "Trabajadores ilimitados",
            "Facturación electrónica integrada",
            "Ventas ilimitadas",
            "Gráficos y reportes avanzados",
            "Soporte 24/7",
        ],
    },
    pro: {
        name: "Plan Pro",
        description: "Máxima funcionalidad",
        icon: <FaCrown className="text-xl" />,
        features: [
            "Sucursales ilimitadas",
            "Trabajadores ilimitados",
            "Facturación electrónica integrada",
            "Ventas ilimitadas",
            "Gráficos y reportes avanzados",
            "Secciones hechas a medida",
            "Soporte 24/7",
        ],
    },
};

const AdminSubscription = () => {
    const currentUser = useQuery(api.users.getCurrent) as
        | (Doc<"users"> & { companyLogoUrl: string | null })
        | undefined;

    const currentSubscription: SubscriptionType =
        (currentUser?.subscriptionType as SubscriptionType) || "starter";

    const getButtonText = (type: SubscriptionType): string => {
        switch (type) {
            case "starter":
                return "DESEO REDUCIR MI PLAN";
            case "negocio":
            case "pro":
                return "LO QUIERO!";
            default:
                return "";
        }
    };

    const getWhatsAppUrl = (planName: string): string => {
        const message = `Hola! Soy cliente de Fudi! Mi usuario es ${currentUser?.email}, tengo el plan ${currentUser?.subscriptionType} y quiero cambiar mi plan al ${planName}`;
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/51992095138?text=${encodedMessage}`;
    };

    if (currentUser === undefined) {
        return (
            <div className="flex flex-1 items-center justify-center text-slate-500 dark:text-slate-400">
                Cargando información de suscripción...
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                chipLabel="Suscripciones"
                title="Gestionar suscripciones"
                description=""
            />

            <div className="grid gap-6 lg:grid-cols-3">
                {(Object.keys(SUBSCRIPTION_INFO) as SubscriptionType[]).map(
                    (type) => {
                        const info = SUBSCRIPTION_INFO[type];
                        const isSelected = currentSubscription === type;

                        return (
                            <div
                                key={type}
                                className={`relative flex flex-col rounded-lg border p-6 transition-all ${
                                    isSelected
                                        ? "border-[#fa7316] bg-[#fa7316]/10 shadow-lg shadow-[#fa7316]/20"
                                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                                }`}
                            >
                                {isSelected && (
                                    <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-[#fa7316] px-3 py-1 text-xs font-semibold text-white">
                                        <FaCheck />
                                        <span>Actual</span>
                                    </div>
                                )}

                                <div className="mb-4 flex items-center gap-3">
                                    <div
                                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                                            isSelected
                                                ? "bg-[#fa7316]/20 text-[#fa7316]"
                                                : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                        }`}
                                    >
                                        {info.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                                            {info.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {info.description}
                                        </p>
                                    </div>
                                </div>

                                <ul className="mb-6 flex-1 space-y-3">
                                    {info.features.map((feature, index) => (
                                        <li
                                            key={index}
                                            className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                                        >
                                            <FaCheck
                                                className={`mt-0.5 flex-shrink-0 ${
                                                    isSelected
                                                        ? "text-[#fa7316]"
                                                        : "text-slate-400 dark:text-slate-500"
                                                }`}
                                            />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {isSelected ? (
                                    <div className="rounded-lg border border-[#fa7316]/30 bg-[#fa7316] px-4 py-3 text-center text-sm text-white font-semibold uppercase ">
                                        Ya tengo este plan
                                    </div>
                                ) : (
                                    <a
                                        href={getWhatsAppUrl(info.name)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block rounded-lg border border-[#fa7316] px-4 py-3 text-center text-sm text-[#fa7316] font-semibold uppercase transition-colors hover:bg-[#fa7316]/10"
                                    >
                                        {getButtonText(type)}
                                    </a>
                                )}
                            </div>
                        );
                    }
                )}
            </div>
        </div>
    );
};

export default AdminSubscription;

