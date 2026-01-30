import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useQuery } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useMiAPIDoc } from "../hooks/useMiAPIDoc";
import type { RUCResponse, DNIResponse } from "../types/miapidoc";
import { HiOutlineReceiptTax } from "react-icons/hi";
import { MdErrorOutline } from "react-icons/md";
import { BiBadgeCheck } from "react-icons/bi";
import CloseButton from "./CloseButton";
import {  FaWhatsapp } from "react-icons/fa6";

type CustomerFormState = {
    documentType: "RUC" | "DNI" | "";
    documentNumber: string;
    name: string;
    address: string;
    email: string;
    phone: string;
};

const DEFAULT_CUSTOMER_FORM: CustomerFormState = {
    documentType: "",
    documentNumber: "",
    name: "",
    address: "",
    email: "",
    phone: "",
};

type CustomerMetadata = {
    customerId: Id<"customers"> | null;
    hasChanges: boolean;
    originalData: CustomerFormState | null;
};

type CloseSaleDialogProps = {
    isOpen: boolean;
    saleId: Id<"sales"> | null;
    paymentMethod: "Contado" | "Credito";
    notes: string;
    isProcessing: boolean;
    onClose: () => void;
    onPrint?: () => void;
    companyName?: string;
    pdfTicketUrl?: string;
    onCloseWithoutEmit: (
        customerData: CustomerFormState | null,
        customerMetadata: CustomerMetadata,
        paymentMethod: "Contado" | "Credito",
        notes?: string
    ) => Promise<{ success: boolean; error?: string }>;
    onEmitBoleta: (
        customerData: CustomerFormState | null,
        customerMetadata: CustomerMetadata,
        paymentMethod: "Contado" | "Credito",
        notes?: string
    ) => Promise<{
        success: boolean;
        error?: string;
    }>;
    onEmitFactura: (
        customerData: CustomerFormState,
        customerMetadata: CustomerMetadata,
        paymentMethod: "Contado" | "Credito",
        notes?: string
    ) => Promise<{
        success: boolean;
        error?: string;
    }>;
};

const CloseSaleDialog = ({
    isOpen,
    saleId,
    paymentMethod: initialPaymentMethod,
    notes: initialNotes,
    isProcessing,
    onClose,
    onPrint,
    companyName = "",
    pdfTicketUrl = "",
    onCloseWithoutEmit,
    onEmitBoleta,
    onEmitFactura,
}: CloseSaleDialogProps) => {
    const [paymentMethod, setPaymentMethod] = useState<
        "Contado" | "Credito"
    >(initialPaymentMethod);
    const [notes, setNotes] = useState(initialNotes);
    const [customerForm, setCustomerForm] = useState<CustomerFormState>(
        DEFAULT_CUSTOMER_FORM
    );
    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [isLoadingCustomerData, setIsLoadingCustomerData] = useState(false);
    const [emissionStatus, setEmissionStatus] = useState<
        "idle" | "loading" | "success" | "error" | "closed"
    >("idle");
    const [emissionError, setEmissionError] = useState<string | null>(null);
    const [originalCustomerData, setOriginalCustomerData] =
        useState<CustomerFormState | null>(null);
    const [customerIdFromConvex, setCustomerIdFromConvex] =
        useState<Id<"customers"> | null>(null);
    const [isDocumentEmitted, setIsDocumentEmitted] = useState(false);
    const [showWhatsAppForm, setShowWhatsAppForm] = useState(false);
    const [whatsAppPrefix, setWhatsAppPrefix] = useState("51");
    const [whatsAppNumber, setWhatsAppNumber] = useState("");
    const [whatsAppNumberError, setWhatsAppNumberError] = useState<string | null>(null);

    const { consultarRUC, consultarDNI } = useMiAPIDoc();
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastQueriedRef = useRef<string>(""); // Para evitar consultas duplicadas

    // Query para buscar cliente en CONVEX
    const customerFromConvex = useQuery(
        api.customers.getByDocument,
        customerForm.documentType &&
            customerForm.documentNumber.trim().replace(/\D/g, "").length ===
                (customerForm.documentType === "DNI" ? 8 : 11)
            ? {
                  documentType: customerForm.documentType as "RUC" | "DNI",
                  documentNumber: customerForm.documentNumber
                      .trim()
                      .replace(/\D/g, ""),
              }
            : "skip"
    );

    const handleCustomerFormChange = (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = event.target;
        setCustomerForm((previous) => {
            const updated = {
                ...previous,
                [name]: value,
            };

            // Si se cambió el número de documento, detectar automáticamente el tipo
            if (name === "documentNumber") {
                const documentNumber = value.trim().replace(/\D/g, ""); // Solo números
                const length = documentNumber.length;

                // Si cambió el número de documento, resetear datos originales y customerId
                if (previous.documentNumber !== value) {
                    setOriginalCustomerData(null);
                    setCustomerIdFromConvex(null);
                }

                // Si no hay tipo seleccionado, detectar automáticamente según la longitud
                if (!previous.documentType) {
                    if (length === 8) {
                        updated.documentType = "DNI";
                        // Resetear el ref para permitir búsqueda inmediata
                        lastQueriedRef.current = "";
                    } else if (length === 11) {
                        updated.documentType = "RUC";
                        // Resetear el ref para permitir búsqueda inmediata
                        lastQueriedRef.current = "";
                    }
                }
            }

            // Si se cambió manualmente el tipo de documento, resetear el ref y datos originales
            if (name === "documentType") {
                lastQueriedRef.current = "";
                setOriginalCustomerData(null);
                setCustomerIdFromConvex(null);
                return updated;
            }

            return updated;
        });
    };

    // Efecto para cargar datos desde CONVEX cuando se encuentra un cliente
    useEffect(() => {
        if (!showCustomerForm || !customerFromConvex) {
            return;
        }

        // Si encontramos un cliente en CONVEX, cargar sus datos
        const convexData: CustomerFormState = {
            documentType: customerFromConvex.documentType,
            documentNumber: customerFromConvex.documentNumber,
            name: customerFromConvex.name || "",
            address: customerFromConvex.address || "",
            email: customerFromConvex.email || "",
            phone: customerFromConvex.phone || "",
        };

        // Solo actualizar si los datos son diferentes (evitar loops infinitos)
        const currentData = JSON.stringify(customerForm);
        const newData = JSON.stringify(convexData);

        if (currentData !== newData) {
            setCustomerForm(convexData);
            setOriginalCustomerData(convexData);
            setCustomerIdFromConvex(customerFromConvex._id);
            setIsLoadingCustomerData(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerFromConvex, showCustomerForm]);

    // Efecto para consultar datos automáticamente cuando se ingresa RUC o DNI
    useEffect(() => {
        // Limpiar timer anterior si existe
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (!showCustomerForm) {
            return;
        }

        const documentNumber = customerForm.documentNumber
            .trim()
            .replace(/\D/g, ""); // Solo números
        const length = documentNumber.length;

        // Determinar el tipo de documento y la longitud requerida
        let documentType: "DNI" | "RUC" | null = null;
        let requiredLength = 0;
        let shouldUpdateType = false;

        if (customerForm.documentType === "DNI") {
            documentType = "DNI";
            requiredLength = 8;
        } else if (customerForm.documentType === "RUC") {
            documentType = "RUC";
            requiredLength = 11;
        } else if (length === 8) {
            // Auto-detectar DNI si no hay tipo seleccionado
            documentType = "DNI";
            requiredLength = 8;
            shouldUpdateType = true;
        } else if (length === 11) {
            // Auto-detectar RUC si no hay tipo seleccionado
            documentType = "RUC";
            requiredLength = 11;
            shouldUpdateType = true;
        }

        // Si se detectó automáticamente el tipo, actualizar el estado primero
        if (shouldUpdateType && documentType) {
            setCustomerForm((previous) => ({
                ...previous,
                documentType,
            }));
            // Resetear el ref para permitir búsqueda después de actualizar el tipo
            lastQueriedRef.current = "";
            // Resetear datos originales cuando cambia el documento
            setOriginalCustomerData(null);
            setCustomerIdFromConvex(null);
            // No buscar todavía, esperar al siguiente render cuando el tipo ya esté actualizado
            return;
        }

        // Solo consultar MiAPI si:
        // 1. El formulario de cliente está visible
        // 2. Se detectó un tipo de documento válido
        // 3. El número tiene exactamente la longitud requerida
        // 4. La query de CONVEX terminó y NO encontramos el cliente (customerFromConvex es null, no undefined)
        if (
            documentType &&
            length === requiredLength &&
            customerFromConvex === null
        ) {
            const queryKey = `${documentType}-${documentNumber}`;

            // Evitar consultas duplicadas
            if (queryKey === lastQueriedRef.current) {
                return;
            }

            // Debounce: esperar 500ms después de que el usuario deje de escribir
            debounceTimerRef.current = setTimeout(async () => {
                setIsLoadingCustomerData(true);
                lastQueriedRef.current = queryKey;

                try {
                    if (documentType === "RUC") {
                        const response = await consultarRUC(documentNumber);
                        if (response) {
                            // Mapear datos de RUC según estructura de MiAPI Cloud
                            setCustomerForm((previous) => {
                                const updated = { ...previous };
                                const rucResponse = response as RUCResponse;

                                // Mapear razón social al nombre
                                if (rucResponse.razon_social) {
                                    updated.name = rucResponse.razon_social;
                                }

                                // Mapear dirección desde domiciliado
                                if (rucResponse.domiciliado?.direccion) {
                                    updated.address = rucResponse.domiciliado.direccion;
                                }

                                // Nota: La API de RUC no devuelve email ni teléfono
                                // Estos campos se mantienen vacíos o se pueden llenar manualmente

                                return updated;
                            });
                            // Resetear datos originales ya que viene de MiAPI (nuevo cliente)
                            setOriginalCustomerData(null);
                            setCustomerIdFromConvex(null);
                        }
                    } else if (documentType === "DNI") {
                        const response = await consultarDNI(documentNumber);
                        if (response) {
                            // Mapear datos de DNI según estructura de MiAPI Cloud
                            setCustomerForm((previous) => {
                                const updated = { ...previous };
                                const dniResponse = response as DNIResponse;

                                // Construir nombre completo desde los campos de MiAPI
                                // Formato: ape_paterno ape_materno nombres
                                const nombreParts: string[] = [];
                                if (dniResponse.ape_paterno) {
                                    nombreParts.push(dniResponse.ape_paterno);
                                }
                                if (dniResponse.ape_materno) {
                                    nombreParts.push(dniResponse.ape_materno);
                                }
                                if (dniResponse.nombres) {
                                    nombreParts.push(dniResponse.nombres);
                                }
                                
                                if (nombreParts.length > 0) {
                                    updated.name = nombreParts.join(" ").trim();
                                }

                                // Mapear dirección desde domiciliado (opcional)
                                if (dniResponse.domiciliado?.direccion) {
                                    updated.address = dniResponse.domiciliado.direccion;
                                }

                                // Nota: La API de DNI no devuelve email ni teléfono
                                // Estos campos se mantienen vacíos o se pueden llenar manualmente

                                return updated;
                            });
                            // Resetear datos originales ya que viene de MiAPI (nuevo cliente)
                            setOriginalCustomerData(null);
                            setCustomerIdFromConvex(null);
                        }
                    } else {
                        setIsLoadingCustomerData(false);
                        return;
                    }
                } catch (error) {
                    // Silenciar errores, solo no autocompletar si falla
                    console.error(
                        "Error al consultar datos del cliente:",
                        error
                    );
                } finally {
                    setIsLoadingCustomerData(false);
                }
            }, 500); // 500ms de debounce
        } else if (!documentType || length !== requiredLength) {
            // Si no hay tipo válido o longitud incorrecta, ocultar loading
            setIsLoadingCustomerData(false);
        } else if (customerFromConvex !== undefined) {
            // Si customerFromConvex tiene un valor (ya sea el cliente o null), ocultar loading
            // porque ya terminó la búsqueda en CONVEX
            setIsLoadingCustomerData(false);
        }

        // Cleanup function
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [
        showCustomerForm,
        customerForm.documentType,
        customerForm.documentNumber,
        customerFromConvex,
        consultarRUC,
        consultarDNI,
    ]);

    // Función para comparar si hay cambios en los datos del cliente
    const hasCustomerChanges = (): boolean => {
        if (!originalCustomerData) {
            // Si no hay datos originales, significa que es un cliente nuevo (viene de MiAPI)
            // En este caso, siempre hay "cambios" porque necesitamos crear el cliente
            return true;
        }

        // Comparar todos los campos
        return (
            customerForm.name.trim() !==
                (originalCustomerData.name || "").trim() ||
            customerForm.address.trim() !==
                (originalCustomerData.address || "").trim() ||
            customerForm.email.trim() !==
                (originalCustomerData.email || "").trim() ||
            customerForm.phone.trim() !==
                (originalCustomerData.phone || "").trim()
        );
    };

    // Limpiar el ref cuando se cierra el diálogo o se resetea el formulario
    useEffect(() => {
        if (!isOpen) {
            lastQueriedRef.current = "";
            setOriginalCustomerData(null);
            setCustomerIdFromConvex(null);
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        }
    }, [isOpen]);

    const handleClose = () => {
        setCustomerForm(DEFAULT_CUSTOMER_FORM);
        setShowCustomerForm(false);
        setPaymentMethod("Contado");
        setNotes("");
        setIsLoadingCustomerData(false);
        setEmissionStatus("idle");
        setEmissionError(null);
        setIsDocumentEmitted(false);
        setShowWhatsAppForm(false);
        setWhatsAppPrefix("51");
        setWhatsAppNumber("");
        setWhatsAppNumberError(null);
        setOriginalCustomerData(null);
        setCustomerIdFromConvex(null);
        lastQueriedRef.current = "";
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        // Cerrar el diálogo y limpiar el estado en el componente padre
        onClose();
    };

    const handleCloseWithoutEmit = async () => {
        const customerData =
            showCustomerForm &&
            customerForm.documentType &&
            customerForm.documentNumber &&
            customerForm.name
                ? customerForm
                : null;

        const customerMetadata: CustomerMetadata = {
            customerId: customerIdFromConvex,
            hasChanges: hasCustomerChanges(),
            originalData: originalCustomerData,
        };

        setEmissionStatus("loading");
        setEmissionError(null);
        setIsDocumentEmitted(false);

        try {
            const result = await onCloseWithoutEmit(
                customerData,
                customerMetadata,
                paymentMethod,
                notes.trim() || undefined
            );

            if (result.success) {
                setEmissionStatus("closed");
            } else {
                setEmissionStatus("error");
                setEmissionError(result.error || "Error al cerrar la venta");
            }
        } catch (error) {
            setEmissionStatus("error");
            setEmissionError(
                error instanceof Error
                    ? error.message
                    : "Error desconocido al cerrar la venta"
            );
        }
    };

    const handleEmitBoleta = async () => {
        const customerData =
            showCustomerForm &&
            customerForm.documentType &&
            customerForm.documentNumber &&
            customerForm.name
                ? customerForm
                : null;

        const customerMetadata: CustomerMetadata = {
            customerId: customerIdFromConvex,
            hasChanges: hasCustomerChanges(),
            originalData: originalCustomerData,
        };

        setEmissionStatus("loading");
        setEmissionError(null);

        try {
            const result = await onEmitBoleta(
                customerData,
                customerMetadata,
                paymentMethod,
                notes.trim() || undefined
            );

            if (result.success) {
                setIsDocumentEmitted(true);
                setEmissionStatus("success");
            } else {
                setEmissionStatus("error");
                setEmissionError(result.error || "Error al emitir boleta");
            }
        } catch (error) {
            setEmissionStatus("error");
            setEmissionError(
                error instanceof Error
                    ? error.message
                    : "Error desconocido al emitir boleta"
            );
        }
    };

    const handleEmitFactura = async () => {
        if (
            !showCustomerForm ||
            !customerForm.documentType ||
            !customerForm.documentNumber ||
            !customerForm.name
        ) {
            return; // No permitir emitir factura sin datos del cliente
        }

        const customerMetadata: CustomerMetadata = {
            customerId: customerIdFromConvex,
            hasChanges: hasCustomerChanges(),
            originalData: originalCustomerData,
        };

        setEmissionStatus("loading");
        setEmissionError(null);

        try {
            const result = await onEmitFactura(
                customerForm,
                customerMetadata,
                paymentMethod,
                notes.trim() || undefined
            );

            if (result.success) {
                setIsDocumentEmitted(true);
                setEmissionStatus("success");
            } else {
                setEmissionStatus("error");
                setEmissionError(result.error || "Error al emitir factura");
            }
        } catch (error) {
            setEmissionStatus("error");
            setEmissionError(
                error instanceof Error
                    ? error.message
                    : "Error desconocido al emitir factura"
            );
        }
    };

    // Validar si el número de documento es válido según su tipo
    const documentNumberClean = customerForm.documentNumber
        .trim()
        .replace(/\D/g, "");
    const isValidDocumentNumber = (): boolean => {
        if (!customerForm.documentType) {
            // Si no hay tipo seleccionado, es válido si tiene 8 o 11 dígitos
            return (
                documentNumberClean.length === 8 ||
                documentNumberClean.length === 11
            );
        }
        if (customerForm.documentType === "DNI") {
            return documentNumberClean.length === 8;
        }
        if (customerForm.documentType === "RUC") {
            return documentNumberClean.length === 11;
        }
        return true;
    };

    const showDocumentNumberError =
        customerForm.documentType !== "" &&
        documentNumberClean.length > 0 &&
        !isValidDocumentNumber();

    const isCustomerFormValid =
        customerForm.documentType &&
        customerForm.documentNumber.trim() &&
        customerForm.name.trim() &&
        isValidDocumentNumber();

    // Early return después de todos los hooks para cumplir con las reglas de Hooks
    if (!isOpen || !saleId) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-10">
            <div className="absolute inset-0 bg-black/40 backdrop-blur dark:bg-slate-950/70" />
            <div id="print-container" className="relative flex w-full max-w-2xl flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl shadow-black/60 dark:border-slate-800 dark:bg-slate-900/95 dark:text-white max-h-[90vh] overflow-hidden">
                {emissionStatus === "idle" ? (
                    <>
                        <header className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                                    Cerrar venta
                                </h2>
                                <CloseButton onClick={handleClose} />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Completa la información del cliente (opcional) y
                                selecciona cómo deseas proceder.
                            </p>
                        </header>

                        <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                !isProcessing &&
                                                setShowCustomerForm(
                                                    !showCustomerForm
                                                )
                                            }
                                            disabled={isProcessing}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none  disabled:opacity-50 disabled:cursor-not-allowed ${
                                                showCustomerForm
                                                    ? "bg-[#fa7316]"
                                                    : "bg-slate-300 dark:bg-slate-700"
                                            }`}
                                            role="switch"
                                            aria-checked={showCustomerForm}
                                            aria-label="Registrar información del cliente"
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    showCustomerForm
                                                        ? "translate-x-6"
                                                        : "translate-x-1"
                                                }`}
                                            />
                                        </button>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-slate-700 dark:text-slate-200">
                                                Registrar información del
                                                cliente
                                            </span>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Obligatorio para emitir factura
                                            </p>
                                        </div>
                                    </div>

                                    {showCustomerForm && (
                                        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <label
                                                        htmlFor="documentType"
                                                        className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                                    >
                                                        Tipo de documento
                                                    </label>
                                                    <select
                                                        id="documentType"
                                                        name="documentType"
                                                        value={
                                                            customerForm.documentType
                                                        }
                                                        onChange={
                                                            handleCustomerFormChange
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                                        disabled={isProcessing}
                                                    >
                                                        <option value="">
                                                            Selecciona
                                                        </option>
                                                        <option value="DNI">
                                                            DNI
                                                        </option>
                                                        <option value="RUC">
                                                            RUC
                                                        </option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label
                                                        htmlFor="documentNumber"
                                                        className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                                    >
                                                        Número de documento
                                                        {isLoadingCustomerData && (
                                                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                                                Consultando...
                                                            </span>
                                                        )}
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            id="documentNumber"
                                                            name="documentNumber"
                                                            type="text"
                                                            value={
                                                                customerForm.documentNumber
                                                            }
                                                            onChange={
                                                                handleCustomerFormChange
                                                            }
                                                            className={`w-full rounded-lg border px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 dark:text-white dark:placeholder:text-slate-500 ${
                                                                showDocumentNumberError
                                                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                                                                    : "border-slate-300 bg-white focus:border-[#fa7316] focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900"
                                                            }`}
                                                            placeholder="Número de DNI o RUC"
                                                            disabled={
                                                                isProcessing
                                                            }
                                                        />
                                                        {isLoadingCustomerData && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#fa7316] dark:border-slate-600"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {showDocumentNumberError && (
                                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                            Número de documento
                                                            inválido
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label
                                                    htmlFor="customerName"
                                                    className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                                >
                                                    Nombre completo / Razón
                                                    social
                                                </label>
                                                <input
                                                    id="customerName"
                                                    name="name"
                                                    type="text"
                                                    value={customerForm.name}
                                                    onChange={
                                                        handleCustomerFormChange
                                                    }
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                                                    placeholder="Nombre del cliente"
                                                    disabled={isProcessing}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label
                                                    htmlFor="customerAddress"
                                                    className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                                >
                                                    Dirección
                                                </label>
                                                <input
                                                    id="customerAddress"
                                                    name="address"
                                                    type="text"
                                                    value={customerForm.address}
                                                    onChange={
                                                        handleCustomerFormChange
                                                    }
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                                                    placeholder="Dirección del cliente"
                                                    disabled={isProcessing}
                                                />
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <label
                                                        htmlFor="customerEmail"
                                                        className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                                    >
                                                        Email
                                                    </label>
                                                    <input
                                                        id="customerEmail"
                                                        name="email"
                                                        type="email"
                                                        value={
                                                            customerForm.email
                                                        }
                                                        onChange={
                                                            handleCustomerFormChange
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                                                        placeholder="email@ejemplo.com"
                                                        disabled={isProcessing}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label
                                                        htmlFor="customerPhone"
                                                        className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                                    >
                                                        Teléfono
                                                    </label>
                                                    <input
                                                        id="customerPhone"
                                                        name="phone"
                                                        type="text"
                                                        value={
                                                            customerForm.phone
                                                        }
                                                        onChange={
                                                            handleCustomerFormChange
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                                                        placeholder="Teléfono"
                                                        disabled={isProcessing}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label className="flex flex-col gap-1 text-left text-slate-700 dark:text-slate-200">
                                        <span className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                            Método de pago
                                        </span>
                                        <select
                                            value={paymentMethod}
                                            onChange={(event) =>
                                                setPaymentMethod(
                                                    event.target
                                                        .value as typeof paymentMethod
                                                )
                                            }
                                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                            disabled={isProcessing}
                                        >
                                            <option value="Contado">
                                                Contado
                                            </option>
                                            <option value="Credito">
                                                Crédito
                                            </option>
                                        </select>
                                    </label>

                                    <label className="flex flex-col gap-1 text-left text-slate-700 dark:text-slate-200">
                                        <span className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                            Notas
                                        </span>
                                        <textarea
                                            value={notes}
                                            onChange={(event) =>
                                                setNotes(event.target.value)
                                            }
                                            rows={3}
                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                            placeholder="Comentario opcional para el cierre"
                                            disabled={isProcessing}
                                        />
                                    </label>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-2 lg:gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleEmitFactura}
                                        disabled={
                                            isProcessing ||
                                            !isCustomerFormValid ||
                                            customerForm.documentType === "DNI"
                                        }
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                                        title={
                                            customerForm.documentType === "DNI"
                                                ? "Las facturas solo se pueden emitir con RUC"
                                                : ""
                                        }
                                    >
                                        <HiOutlineReceiptTax className="h-5 w-5" />
                                        EMITIR FACTURA
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleEmitBoleta}
                                        disabled={isProcessing}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                                    >
                                        <HiOutlineReceiptTax className="h-5 w-5" />
                                        EMITIR BOLETA
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCloseWithoutEmit}
                                        disabled={isProcessing}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                                    >
                                        REGISTRAR Y CERRAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : emissionStatus === "loading" ? (
                    <>
                        <header className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                                    Generando documento
                                </h2>
                            </div>
                        </header>
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
                            <div className="flex gap-1">
                                <div className="h-2 w-2 animate-bounce rounded-full bg-[#fa7316] [animation-delay:-0.3s]"></div>
                                <div className="h-2 w-2 animate-bounce rounded-full bg-[#fa7316] [animation-delay:-0.15s]"></div>
                                <div className="h-2 w-2 animate-bounce rounded-full bg-[#fa7316]"></div>
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                ENVIANDO A SUNAT...
                            </p>
                        </div>
                    </>
                ) : emissionStatus === "error" ? (
                    <>
                        <header className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                                    Error
                                </h2>
                            </div>
                        </header>
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
                            <MdErrorOutline className="h-12 w-12 text-red-500" />
                            <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center max-w-md">
                                {emissionError || "Error al emitir documento"}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setEmissionStatus("idle");
                                    setEmissionError(null);
                                }}
                                className="rounded-lg border border-slate-300 bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                            >
                                INTENTARLO NUEVAMENTE
                            </button>
                        </div>
                    </>
                ) : emissionStatus === "success" ||
                  emissionStatus === "closed" ? (
                    <>
                        <header className="flex flex-col gap-2">
                            <div className="flex items-center justify-center sm:justify-between">
                                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                                    {isDocumentEmitted
                                        ? "Documento emitido!"
                                        : "Venta finalizada!"}
                                </h2>
                            </div>
                        </header>
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
                            <BiBadgeCheck className="h-12 w-12 text-green-500" />
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 text-center">
                                {isDocumentEmitted
                                    ? "El documento se emitió de manera satisfactoria"
                                    : "La venta se cerró correctamente"}
                            </p>
                            {isDocumentEmitted ? (
                                <div className="flex w-full flex-col gap-3">
                                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={() => setShowWhatsAppForm((prev) => !prev)}
                                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white cursor-pointer"
                                        >
                                            <FaWhatsapp className="h-5 w-5"/>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onPrint?.()}
                                            disabled={!onPrint}
                                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white cursor-pointer"
                                        >
                                            IMPRIMIR
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white cursor-pointer"
                                        >
                                            CERRAR
                                        </button>
                                    </div>
                                    {showWhatsAppForm && (
                                        <div className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                                            <div className="flex flex-wrap items-end gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                        Prefijo
                                                    </label>
                                                    <div className="flex items-center rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                                                        <span className="pl-3 text-sm text-slate-600 dark:text-slate-300">+</span>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            value={whatsAppPrefix}
                                                            onChange={(e) => {
                                                                const v = e.target.value.replace(/\D/g, "");
                                                                setWhatsAppPrefix(v);
                                                                setWhatsAppNumberError(null);
                                                            }}
                                                            className="w-14 border-0 bg-transparent py-2 pr-2 text-sm text-slate-900 outline-none dark:text-white"
                                                            placeholder="51"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-1 min-w-[120px] flex-col gap-1">
                                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                        Número
                                                    </label>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={whatsAppNumber}
                                                        onChange={(e) => {
                                                            const v = e.target.value.replace(/\D/g, "");
                                                            setWhatsAppNumber(v);
                                                            setWhatsAppNumberError(null);
                                                        }}
                                                        className={`rounded-lg border bg-white py-2 px-3 text-sm text-slate-900 outline-none dark:bg-slate-900 dark:text-white ${
                                                            whatsAppNumberError
                                                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                                                                : "border-slate-300 dark:border-slate-700 focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                                        }`}
                                                        placeholder="999 999 999"
                                                    />
                                                    {whatsAppNumberError && (
                                                        <p className="text-xs text-red-600 dark:text-red-400">
                                                            {whatsAppNumberError}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const digits = whatsAppNumber.replace(/\D/g, "");
                                                        if (digits.length < 9) {
                                                            setWhatsAppNumberError("El número debe tener al menos 9 dígitos.");
                                                            return;
                                                        }
                                                        const fullNumber = whatsAppPrefix.replace(/\D/g, "") + digits;
                                                        const message = `Hola! Aquí te envío tu comprobante electrónico de tu compra en ${companyName || "nuestra tienda"}. Haz click en el siguiente enlace: ${pdfTicketUrl || ""}`;
                                                        const url = `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
                                                        window.open(url, "_blank", "noopener,noreferrer");
                                                    }}
                                                    className="rounded-lg border border-[#fa7316] bg-[#fa7316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e86a12] dark:border-[#fa7316] dark:bg-[#fa7316] dark:hover:bg-[#e86a12] cursor-pointer"
                                                >
                                                    ENVIAR
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                                >
                                    CERRAR
                                </button>
                            )}
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default CloseSaleDialog;
