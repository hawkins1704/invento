
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import {  FaCheck } from "react-icons/fa";
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
        name: "Starter",
        description: "Perfecto para comenzar",
        icon: <FaRocket className="text-xl" />,
        features: [
            "Hasta 1 sucursal",
            "Productos ilimitados",
            "Gestión básica de inventario",
            "Reportes de ventas",
        ],
    },
    negocio: {
        name: "Negocio",
        description: "Para empresas en crecimiento",
        icon: <FaStore className="text-xl" />,
        features: [
            "Hasta 3 sucursales",
            "Productos ilimitados",
            "Gestión avanzada de inventario",
            "Reportes detallados",
            "Soporte prioritario",
        ],
    },
    pro: {
        name: "Pro",
        description: "Máxima funcionalidad",
        icon: <FaCrown className="text-xl" />,
        features: [
            "Sucursales ilimitadas",
            "Productos ilimitados",
            "Gestión completa de inventario",
            "Reportes avanzados y analytics",
            "Soporte 24/7",
            "Integraciones personalizadas",
        ],
    },
};

const AdminSubscription = () => {
    const currentUser = useQuery(api.users.getCurrent) as
        | (Doc<"users"> & { companyLogoUrl: string | null })
        | undefined;

    const currentSubscription: SubscriptionType =
        (currentUser?.subscriptionType as SubscriptionType) || "starter";

    if (currentUser === undefined) {
        return (
            <div className="flex flex-1 items-center justify-center text-slate-400">
                Cargando información de suscripción...
            </div>
        );
    }

    return (
        <div className="space-y-8">
          
            <PageHeader
                chipLabel="Suscripciones"
                title="Gestionar suscripciones"
                description="Selecciona el plan que mejor se adapte a las necesidades de tu negocio."
            />

            <div className="grid gap-6 md:grid-cols-3">
                {(Object.keys(SUBSCRIPTION_INFO) as SubscriptionType[]).map(
                    (type) => {
                        const info = SUBSCRIPTION_INFO[type];
                        const isSelected = currentSubscription === type;

                        return (
                            <div
                                key={type}
                                className={`relative rounded-lg border p-6 transition-all ${
                                    isSelected
                                        ? "border-[#fa7316] bg-[#fa7316]/10 shadow-lg shadow-[#fa7316]/20"
                                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
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
                                                : "bg-slate-800 text-slate-400"
                                        }`}
                                    >
                                        {info.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">
                                            {info.name}
                                        </h3>
                                        <p className="text-sm text-slate-400">
                                            {info.description}
                                        </p>
                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    {info.features.map((feature, index) => (
                                        <li
                                            key={index}
                                            className="flex items-start gap-2 text-sm text-slate-300"
                                        >
                                            <FaCheck
                                                className={`mt-0.5 flex-shrink-0 ${
                                                    isSelected
                                                        ? "text-[#fa7316]"
                                                        : "text-slate-500"
                                                }`}
                                            />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {isSelected && (
                                    <div className="mt-6 rounded-lg border border-[#fa7316]/30 bg-[#fa7316]/5 px-4 py-3 text-center text-sm text-[#fa7316]">
                                        Plan activo
                                    </div>
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

