import { useState, type ChangeEvent } from "react";
import type { Id } from "../../convex/_generated/dataModel";

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

type CloseSaleDialogProps = {
    isOpen: boolean;
    saleId: Id<"sales"> | null;
    paymentMethod: "Contado" | "Tarjeta" | "Transferencia" | "Otros";
    notes: string;
    isProcessing: boolean;
    onClose: () => void;
    onCloseWithoutEmit: (
        customerData: CustomerFormState | null,
        paymentMethod: "Contado" | "Tarjeta" | "Transferencia" | "Otros",
        notes?: string
    ) => void;
    onEmitBoleta: (
        customerData: CustomerFormState | null,
        paymentMethod: "Contado" | "Tarjeta" | "Transferencia" | "Otros",
        notes?: string,
        customerEmail?: string
    ) => void;
    onEmitFactura: (
        customerData: CustomerFormState,
        paymentMethod: "Contado" | "Tarjeta" | "Transferencia" | "Otros",
        notes?: string,
        customerEmail?: string
    ) => void;
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

    if (!isOpen || !saleId) {
        return null;
    }

    const handleCustomerFormChange = (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = event.target;
        setCustomerForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleClose = () => {
        setCustomerForm(DEFAULT_CUSTOMER_FORM);
        setShowCustomerForm(false);
        setPaymentMethod("Contado");
        setNotes("");
        setSendEmail(false);
        onClose();
    };

    const handleCloseWithoutEmit = () => {
        const customerData =
            showCustomerForm &&
            customerForm.documentType &&
            customerForm.documentNumber &&
            customerForm.name
                ? customerForm
                : null;
        onCloseWithoutEmit(
            customerData,
            paymentMethod,
            notes.trim() || undefined
        );
        handleClose();
    };

    const handleEmitBoleta = () => {
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

        onEmitBoleta(
            customerData,
            paymentMethod,
            notes.trim() || undefined,
            customerEmail
        );
        handleClose();
    };

    const handleEmitFactura = () => {
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

        onEmitFactura(
            customerForm,
            paymentMethod,
            notes.trim() || undefined,
            customerEmail
        );
        handleClose();
    };

    const isCustomerFormValid =
        customerForm.documentType &&
        customerForm.documentNumber.trim() &&
        customerForm.name.trim();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-10">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur" />
            <div className="relative flex w-full max-w-2xl flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/95 p-6 text-white shadow-2xl shadow-black/60 max-h-[90vh] overflow-hidden">
                <header className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Cerrar venta</h2>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:text-white"
                            aria-label="Cerrar"
                            disabled={isProcessing}
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-sm text-slate-400">
                        Completa la información del cliente (opcional) y
                        selecciona cómo deseas proceder.
                    </p>
                </header>

                <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={showCustomerForm}
                                    onChange={(e) =>
                                        setShowCustomerForm(e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                    disabled={isProcessing}
                                />
                                <span>Registrar información del cliente</span>
                                <p className="text-xs text-slate-400">
                                    Obligatorio para emitir factura
                                </p>
                            </label>

                            {showCustomerForm && (
                                <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="documentType"
                                                className="text-sm font-medium text-slate-200"
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
                                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                                                disabled={isProcessing}
                                            >
                                                <option value="">
                                                    Selecciona
                                                </option>
                                                <option value="DNI">DNI</option>
                                                <option value="RUC">RUC</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label
                                                htmlFor="documentNumber"
                                                className="text-sm font-medium text-slate-200"
                                            >
                                                Número de documento
                                            </label>
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
                                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                                                placeholder="Número de DNI o RUC"
                                                disabled={isProcessing}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            htmlFor="customerName"
                                            className="text-sm font-medium text-slate-200"
                                        >
                                            Nombre completo / Razón social
                                        </label>
                                        <input
                                            id="customerName"
                                            name="name"
                                            type="text"
                                            value={customerForm.name}
                                            onChange={handleCustomerFormChange}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                                            placeholder="Nombre del cliente"
                                            disabled={isProcessing}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            htmlFor="customerAddress"
                                            className="text-sm font-medium text-slate-200"
                                        >
                                            Dirección
                                        </label>
                                        <input
                                            id="customerAddress"
                                            name="address"
                                            type="text"
                                            value={customerForm.address}
                                            onChange={handleCustomerFormChange}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                                            placeholder="Dirección del cliente"
                                            disabled={isProcessing}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="customerEmail"
                                                className="text-sm font-medium text-slate-200"
                                            >
                                                Email
                                            </label>
                                            <input
                                                id="customerEmail"
                                                name="email"
                                                type="email"
                                                value={customerForm.email}
                                                onChange={
                                                    handleCustomerFormChange
                                                }
                                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                                                placeholder="email@ejemplo.com"
                                                disabled={isProcessing}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label
                                                htmlFor="customerPhone"
                                                className="text-sm font-medium text-slate-200"
                                            >
                                                Teléfono
                                            </label>
                                            <input
                                                id="customerPhone"
                                                name="phone"
                                                type="text"
                                                value={customerForm.phone}
                                                onChange={
                                                    handleCustomerFormChange
                                                }
                                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                                                placeholder="Teléfono"
                                                disabled={isProcessing}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="flex flex-col gap-1 text-left text-slate-200">
                                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
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
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                    disabled={isProcessing}
                                >
                                    <option value="Contado">Efectivo</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                    <option value="Transferencia">
                                        Transferencia
                                    </option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </label>

                            <label className="flex flex-col gap-1 text-left text-slate-200">
                                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                    Notas
                                </span>
                                <textarea
                                    value={notes}
                                    onChange={(event) =>
                                        setNotes(event.target.value)
                                    }
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                    placeholder="Comentario opcional para el cierre"
                                    disabled={isProcessing}
                                />
                            </label>
                            <div className="mt-2 rounded-lg ">
                                <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={sendEmail}
                                        onChange={(e) =>
                                            setSendEmail(e.target.checked)
                                        }
                                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                        disabled={isProcessing}
                                    />
                                    <span>Enviar comprobante por correo</span>
                                </label>
                            </div>
                            {sendEmail &&
                                (!customerForm.email ||
                                    !customerForm.email.trim()) && (
                                    <p className="text-xs text-red-400 mt-1">
                                        Debe ingresar un correo electrónico para
                                        enviar el comprobante
                                    </p>
                                )}
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleEmitFactura}
                                disabled={isProcessing || !isCustomerFormValid}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isProcessing
                                    ? "Procesando..."
                                    : "EMITIR FACTURA"}
                            </button>

                            <button
                                type="button"
                                onClick={handleEmitBoleta}
                                disabled={isProcessing}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/40 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isProcessing
                                    ? "Procesando..."
                                    : "EMITIR BOLETA"}
                            </button>

                            <button
                                type="button"
                                onClick={handleCloseWithoutEmit}
                                disabled={isProcessing}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isProcessing
                                    ? "Procesando..."
                                    : "CERRAR SIN EMITIR"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CloseSaleDialog;
