import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useQuery } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useDecolecta } from "../hooks/useDecolecta";
import type { RUCResponse, DNIResponse } from "../types/decolecta";
import { HiOutlineReceiptTax } from "react-icons/hi";
import { MdErrorOutline } from "react-icons/md";
import { BiBadgeCheck } from "react-icons/bi";
import CloseButton from "./CloseButton";
import { FaWhatsapp } from "react-icons/fa";

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
    paymentMethod: "Contado" | "Tarjeta" | "Transferencia" | "Otros";
    notes: string;
    isProcessing: boolean;
    onClose: () => void;
    onCloseWithoutEmit: (
        customerData: CustomerFormState | null,
        customerMetadata: CustomerMetadata,
        paymentMethod: "Contado" | "Tarjeta" | "Transferencia" | "Otros",
        notes?: string
    ) => Promise<{ success: boolean; error?: string }>;
    onEmitBoleta: (
        customerData: CustomerFormState | null,
        customerMetadata: CustomerMetadata,
        paymentMethod: "Contado" | "Tarjeta" | "Transferencia" | "Otros",
        notes?: string,
        customerEmail?: string
    ) => Promise<{
        success: boolean;
        documentId?: string;
        fileName?: string;
        error?: string;
    }>;
    onEmitFactura: (
        customerData: CustomerFormState,
        customerMetadata: CustomerMetadata,
        paymentMethod: "Contado" | "Tarjeta" | "Transferencia" | "Otros",
        notes?: string,
        customerEmail?: string
    ) => Promise<{
        success: boolean;
        documentId?: string;
        fileName?: string;
        error?: string;
    }>;
    onDownloadPDF?: (documentId: string, fileName: string) => Promise<void>;
    onSendPDFToWhatsapp?: (
        phoneNumber: string,
        documentId: string,
        fileName: string
    ) => Promise<{ success: boolean; error?: string }>;
};

const CloseSaleDialog = ({
    isOpen,
    saleId,
    paymentMethod: initialPaymentMethod,
    notes: initialNotes,
    isProcessing,
    onClose,
    onCloseWithoutEmit,
    onEmitBoleta,
    onEmitFactura,
    onDownloadPDF,
    onSendPDFToWhatsapp,
}: CloseSaleDialogProps) => {
    const [paymentMethod, setPaymentMethod] = useState<
        "Contado" | "Tarjeta" | "Transferencia" | "Otros"
    >(initialPaymentMethod);
    const [notes, setNotes] = useState(initialNotes);
    const [customerForm, setCustomerForm] = useState<CustomerFormState>(
        DEFAULT_CUSTOMER_FORM
    );
    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [sendEmail, setSendEmail] = useState(false);
    const [isLoadingCustomerData, setIsLoadingCustomerData] = useState(false);
    const [emissionStatus, setEmissionStatus] = useState<
        "idle" | "loading" | "success" | "error" | "closed"
    >("idle");
    const [emissionError, setEmissionError] = useState<string | null>(null);
    const [emittedDocumentId, setEmittedDocumentId] = useState<string | null>(
        null
    );
    const [emittedFileName, setEmittedFileName] = useState<string | null>(null);
    const [originalCustomerData, setOriginalCustomerData] =
        useState<CustomerFormState | null>(null);
    const [customerIdFromConvex, setCustomerIdFromConvex] =
        useState<Id<"customers"> | null>(null);
    const [isDocumentEmitted, setIsDocumentEmitted] = useState(false);
    const [showWhatsAppForm, setShowWhatsAppForm] = useState(false);
    const [whatsappCountryCode, setWhatsappCountryCode] = useState("+51");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
    const [whatsappError, setWhatsappError] = useState<string | null>(null);

    const { consultarRUC, consultarDNI } = useDecolecta();
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

        // Solo consultar Decolecta si:
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
                            // Mapear datos de RUC según estructura de Decolecta API
                            setCustomerForm((previous) => {
                                const updated = { ...previous };
                                const rucResponse = response as RUCResponse;

                                // Mapear razón social al nombre
                                if (rucResponse.razon_social) {
                                    updated.name = rucResponse.razon_social;
                                }

                                // Mapear dirección (con tilde según la API)
                                if (rucResponse.direccion) {
                                    updated.address = rucResponse.direccion;
                                }

                                // Nota: La API de RUC básico no devuelve email ni teléfono
                                // Estos campos se mantienen vacíos o se pueden llenar manualmente

                                return updated;
                            });
                            // Resetear datos originales ya que viene de Decolecta (nuevo cliente)
                            setOriginalCustomerData(null);
                            setCustomerIdFromConvex(null);
                        }
                    } else if (documentType === "DNI") {
                        const response = await consultarDNI(documentNumber);
                        if (response) {
                            // Mapear datos de DNI según estructura de Decolecta API
                            setCustomerForm((previous) => {
                                const updated = { ...previous };
                                const dniResponse = response as DNIResponse;

                                // Priorizar full_name, si no existe construir desde los campos individuales
                                if (dniResponse.full_name) {
                                    updated.name = dniResponse.full_name;
                                } else if (
                                    dniResponse.first_name &&
                                    dniResponse.first_last_name &&
                                    dniResponse.second_last_name
                                ) {
                                    updated.name =
                                        `${dniResponse.first_last_name} ${dniResponse.second_last_name} ${dniResponse.first_name}`.trim();
                                } else if (
                                    dniResponse.first_name &&
                                    dniResponse.first_last_name
                                ) {
                                    updated.name =
                                        `${dniResponse.first_last_name} ${dniResponse.first_name}`.trim();
                                } else if (dniResponse.first_name) {
                                    updated.name = dniResponse.first_name;
                                }
                                // Nota: La API de DNI de Decolecta no devuelve dirección, email ni teléfono
                                // Estos campos se mantienen vacíos o se pueden llenar manualmente

                                return updated;
                            });
                            // Resetear datos originales ya que viene de Decolecta (nuevo cliente)
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
            // Si no hay datos originales, significa que es un cliente nuevo (viene de Decolecta)
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
        setSendEmail(false);
        setIsLoadingCustomerData(false);
        setEmissionStatus("idle");
        setEmissionError(null);
        setEmittedDocumentId(null);
        setEmittedFileName(null);
        setIsDocumentEmitted(false);
        setOriginalCustomerData(null);
        setCustomerIdFromConvex(null);
        lastQueriedRef.current = "";
        setShowWhatsAppForm(false);
        setWhatsappCountryCode("+51");
        setWhatsappNumber("");
        setIsSendingWhatsApp(false);
        setWhatsappError(null);
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

        // Validar que si se quiere enviar correo, debe haber email
        if (sendEmail && (!customerForm.email || !customerForm.email.trim())) {
            alert(
                "Debe ingresar un correo electrónico para enviar el comprobante"
            );
            return;
        }

        const customerEmail =
            sendEmail && customerForm.email?.trim()
                ? customerForm.email.trim()
                : undefined;

        const customerMetadata: CustomerMetadata = {
            customerId: customerIdFromConvex,
            hasChanges: hasCustomerChanges(),
            originalData: originalCustomerData,
        };

        setEmissionStatus("loading");
        setEmissionError(null);
        setEmittedDocumentId(null);

        try {
            const result = await onEmitBoleta(
                customerData,
                customerMetadata,
                paymentMethod,
                notes.trim() || undefined,
                customerEmail
            );

            if (result.success && result.documentId) {
                setIsDocumentEmitted(true);
                setEmissionStatus("success");
                setEmittedDocumentId(result.documentId);
                setEmittedFileName(result.fileName || null);
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

        // Validar que si se quiere enviar correo, debe haber email
        if (sendEmail && (!customerForm.email || !customerForm.email.trim())) {
            alert(
                "Debe ingresar un correo electrónico para enviar el comprobante"
            );
            return;
        }

        const customerEmail =
            sendEmail && customerForm.email?.trim()
                ? customerForm.email.trim()
                : undefined;

        const customerMetadata: CustomerMetadata = {
            customerId: customerIdFromConvex,
            hasChanges: hasCustomerChanges(),
            originalData: originalCustomerData,
        };

        setEmissionStatus("loading");
        setEmissionError(null);
        setEmittedDocumentId(null);

        try {
            const result = await onEmitFactura(
                customerForm,
                customerMetadata,
                paymentMethod,
                notes.trim() || undefined,
                customerEmail
            );

            if (result.success && result.documentId) {
                setIsDocumentEmitted(true);
                setEmissionStatus("success");
                setEmittedDocumentId(result.documentId);
                setEmittedFileName(result.fileName || null);
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

    const handleDownloadPDF = async () => {
        if (onDownloadPDF && emittedDocumentId && emittedFileName) {
            await onDownloadPDF(emittedDocumentId, emittedFileName);
        }
    };

    const handleWhatsAppClick = () => {
        setShowWhatsAppForm(!showWhatsAppForm);
        setWhatsappError(null);
    };

    const handleSendWhatsApp = async () => {
        if (!onSendPDFToWhatsapp || !emittedDocumentId || !emittedFileName) {
            return;
        }

        // Validar número de teléfono (solo números, mínimo 9 dígitos)
        const cleanNumber = whatsappNumber.trim().replace(/\D/g, "");
        if (cleanNumber.length < 9) {
            setWhatsappError(
                "El número de teléfono debe tener al menos 9 dígitos"
            );
            return;
        }

        // Validar código de país (debe empezar con + y tener al menos 1 dígito)
        const cleanCountryCode = whatsappCountryCode.trim();
        if (!cleanCountryCode.startsWith("+") || cleanCountryCode.length < 2) {
            setWhatsappError(
                "El código de país debe empezar con + y tener al menos 1 dígito"
            );
            return;
        }

        // Combinar código de país con número (sin el + del código de país, ya que wa.me lo maneja)
        const countryCodeDigits = cleanCountryCode.replace(/\D/g, "");
        const fullPhoneNumber = `${countryCodeDigits}${cleanNumber}`;

        setIsSendingWhatsApp(true);
        setWhatsappError(null);

        try {
            const result = await onSendPDFToWhatsapp(
                fullPhoneNumber,
                emittedDocumentId,
                emittedFileName
            );

            if (result.success) {
                setShowWhatsAppForm(false);
                setWhatsappCountryCode("+51");
                setWhatsappNumber("");
            } else {
                setWhatsappError(
                    result.error || "Error al enviar por WhatsApp"
                );
            }
        } catch (error) {
            setWhatsappError(
                error instanceof Error
                    ? error.message
                    : "Error desconocido al enviar por WhatsApp"
            );
        } finally {
            setIsSendingWhatsApp(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-10">
            <div className="absolute inset-0 bg-black/40 backdrop-blur dark:bg-slate-950/70" />
            <div className="relative flex w-full max-w-2xl flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl shadow-black/60 dark:border-slate-800 dark:bg-slate-900/95 dark:text-white max-h-[90vh] overflow-hidden">
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
                                                Efectivo
                                            </option>
                                            <option value="Tarjeta">
                                                Tarjeta
                                            </option>
                                            <option value="Transferencia">
                                                Transferencia
                                            </option>
                                            <option value="Otros">Otros</option>
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
                                    <div className="mt-2 rounded-lg ">
                                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                                            <div className="relative inline-flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={sendEmail}
                                                    onChange={(e) =>
                                                        setSendEmail(
                                                            e.target.checked
                                                        )
                                                    }
                                                    className="peer h-6 w-6 appearance-none rounded-full border-2 border-slate-300 bg-white transition-colors checked:border-[#fa7316] checked:bg-[#fa7316] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                                                    disabled={isProcessing}
                                                />
                                                {sendEmail && (
                                                    <svg
                                                        className="pointer-events-none absolute h-4 w-4 text-white"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={3}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                            <span>
                                                Enviar comprobante por correo
                                            </span>
                                        </label>
                                    </div>
                                    {sendEmail &&
                                        (!customerForm.email ||
                                            !customerForm.email.trim()) && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                Debe ingresar un correo
                                                electrónico para enviar el
                                                comprobante
                                            </p>
                                        )}
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
                                        CERRAR SIN EMITIR
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
                                ENVIANDO VENTA...
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
                                        ? "Documento emitido"
                                        : "Venta cerrada"}
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
                            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                                {isDocumentEmitted &&
                                    onDownloadPDF &&
                                    emittedDocumentId &&
                                    emittedFileName && (
                                        <div className="flex  sm:flex-row gap-3 w-full max-w-md">
                                            <button
                                                type="button"
                                                onClick={handleWhatsAppClick}
                                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                                            >
                                                <FaWhatsapp className="h-5 w-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDownloadPDF}
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                                            >
                                                DESCARGAR PDF
                                            </button>
                                        </div>
                                    )}
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className={`inline-flex ${isDocumentEmitted && onDownloadPDF && emittedDocumentId && emittedFileName ? "flex-1" : "w-full"} items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white`}
                                >
                                    CERRAR
                                </button>
                            </div>
                            {showWhatsAppForm &&
                                isDocumentEmitted &&
                                onSendPDFToWhatsapp &&
                                emittedDocumentId &&
                                emittedFileName && (
                                    <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 w-full max-w-md dark:border-slate-800 dark:bg-slate-900/70">
                                        <label className="flex flex-col gap-1 text-left text-slate-700 dark:text-slate-200">
                                            <span className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                                Número de WhatsApp
                                            </span>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={whatsappCountryCode}
                                                    onChange={(e) => {
                                                        setWhatsappCountryCode(
                                                            e.target.value
                                                        );
                                                        setWhatsappError(null);
                                                    }}
                                                    placeholder="+51"
                                                    disabled={isSendingWhatsApp}
                                                    className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                                                />
                                                <input
                                                    type="text"
                                                    value={whatsappNumber}
                                                    onChange={(e) => {
                                                        setWhatsappNumber(
                                                            e.target.value
                                                        );
                                                        setWhatsappError(null);
                                                    }}
                                                    placeholder="987654321"
                                                    disabled={isSendingWhatsApp}
                                                    className={`flex-1 rounded-lg border px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 dark:text-white dark:placeholder:text-slate-500 ${
                                                        whatsappError
                                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                                                            : "border-slate-300 bg-white focus:border-[#fa7316] focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900"
                                                    }`}
                                                />
                                            </div>
                                        </label>
                                        {whatsappError && (
                                            <p className="text-xs text-red-600 dark:text-red-400">
                                                {whatsappError}
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleSendWhatsApp}
                                            disabled={
                                                isSendingWhatsApp ||
                                                !whatsappNumber.trim() ||
                                                !whatsappCountryCode.trim()
                                            }
                                            className="w-full rounded-lg border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                                        >
                                            {isSendingWhatsApp
                                                ? "ENVIANDO..."
                                                : "ENVIAR"}
                                        </button>
                                        {whatsappError && (
                                            <p className="text-xs text-red-600 dark:text-red-400">
                                                {whatsappError}
                                            </p>
                                        )}
                                    </div>
                                )}
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default CloseSaleDialog;
