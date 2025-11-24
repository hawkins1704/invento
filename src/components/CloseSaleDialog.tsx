import { useState, type ChangeEvent } from "react";
import type { Id } from "../../convex/_generated/dataModel";

type CustomerFormState = {
  documentType: "RUC" | "DNI" | "";
  documentNumber: string;
  name: string;
  address: string;
  district: string;
  province: string;
  department: string;
  email: string;
  phone: string;
};

const DEFAULT_CUSTOMER_FORM: CustomerFormState = {
  documentType: "",
  documentNumber: "",
  name: "",
  address: "",
  district: "",
  province: "",
  department: "",
  email: "",
  phone: "",
};

type CloseSaleDialogProps = {
  isOpen: boolean;
  saleId: Id<"sales"> | null;
  paymentMethod: "cash" | "card" | "transfer" | "other";
  notes: string;
  isProcessing: boolean;
  onClose: () => void;
  onCloseWithoutEmit: (paymentMethod: "cash" | "card" | "transfer" | "other", notes?: string) => void;
  onEmitBoleta: (customerData: CustomerFormState | null, paymentMethod: "cash" | "card" | "transfer" | "other", notes?: string) => void;
  onEmitFactura: (customerData: CustomerFormState, paymentMethod: "cash" | "card" | "transfer" | "other", notes?: string) => void;
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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "other">(initialPaymentMethod);
  const [notes, setNotes] = useState(initialNotes);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(DEFAULT_CUSTOMER_FORM);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  if (!isOpen || !saleId) {
    return null;
  }

  const handleCustomerFormChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setCustomerForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleClose = () => {
    setCustomerForm(DEFAULT_CUSTOMER_FORM);
    setShowCustomerForm(false);
    setPaymentMethod("cash");
    setNotes("");
    onClose();
  };

  const handleCloseWithoutEmit = () => {
    onCloseWithoutEmit(paymentMethod, notes.trim() || undefined);
    handleClose();
  };

  const handleEmitBoleta = () => {
    const customerData = showCustomerForm && customerForm.documentType && customerForm.documentNumber && customerForm.name
      ? customerForm
      : null;
    onEmitBoleta(customerData, paymentMethod, notes.trim() || undefined);
    handleClose();
  };

  const handleEmitFactura = () => {
    if (!showCustomerForm || !customerForm.documentType || !customerForm.documentNumber || !customerForm.name) {
      return; // No permitir emitir factura sin datos del cliente
    }
    onEmitFactura(customerForm, paymentMethod, notes.trim() || undefined);
    handleClose();
  };

  const isCustomerFormValid = customerForm.documentType && customerForm.documentNumber.trim() && customerForm.name.trim();

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
            Completa la información del cliente (opcional) y selecciona cómo deseas proceder.
          </p>
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
          <div className="space-y-5">
            <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={showCustomerForm}
                onChange={(e) => setShowCustomerForm(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                disabled={isProcessing}
              />
              <span>Registrar información del cliente</span>
            </label>

            {showCustomerForm && (
              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="documentType" className="text-sm font-medium text-slate-200">
                      Tipo de documento
                    </label>
                    <select
                      id="documentType"
                      name="documentType"
                      value={customerForm.documentType}
                      onChange={handleCustomerFormChange}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                      disabled={isProcessing}
                    >
                      <option value="">Selecciona</option>
                      <option value="DNI">DNI</option>
                      <option value="RUC">RUC</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="documentNumber" className="text-sm font-medium text-slate-200">
                      Número de documento
                    </label>
                    <input
                      id="documentNumber"
                      name="documentNumber"
                      type="text"
                      value={customerForm.documentNumber}
                      onChange={handleCustomerFormChange}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                      placeholder="Número de DNI o RUC"
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="customerName" className="text-sm font-medium text-slate-200">
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
                  <label htmlFor="customerAddress" className="text-sm font-medium text-slate-200">
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

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label htmlFor="customerDistrict" className="text-sm font-medium text-slate-200">
                      Distrito
                    </label>
                    <input
                      id="customerDistrict"
                      name="district"
                      type="text"
                      value={customerForm.district}
                      onChange={handleCustomerFormChange}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                      placeholder="Distrito"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="customerProvince" className="text-sm font-medium text-slate-200">
                      Provincia
                    </label>
                    <input
                      id="customerProvince"
                      name="province"
                      type="text"
                      value={customerForm.province}
                      onChange={handleCustomerFormChange}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                      placeholder="Provincia"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="customerDepartment" className="text-sm font-medium text-slate-200">
                      Departamento
                    </label>
                    <input
                      id="customerDepartment"
                      name="department"
                      type="text"
                      value={customerForm.department}
                      onChange={handleCustomerFormChange}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                      placeholder="Departamento"
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="customerEmail" className="text-sm font-medium text-slate-200">
                      Email
                    </label>
                    <input
                      id="customerEmail"
                      name="email"
                      type="email"
                      value={customerForm.email}
                      onChange={handleCustomerFormChange}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                      placeholder="email@ejemplo.com"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="customerPhone" className="text-sm font-medium text-slate-200">
                      Teléfono
                    </label>
                    <input
                      id="customerPhone"
                      name="phone"
                      type="text"
                      value={customerForm.phone}
                      onChange={handleCustomerFormChange}
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
              <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Método de pago</span>
              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as typeof paymentMethod)
                }
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                disabled={isProcessing}
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-left text-slate-200">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Notas</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Comentario opcional para el cierre"
                disabled={isProcessing}
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              type="button"
              onClick={handleEmitFactura}
              disabled={isProcessing || !isCustomerFormValid}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? "Procesando..." : "EMITIR FACTURA"}
            </button>

            <button
              type="button"
              onClick={handleEmitBoleta}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/40 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? "Procesando..." : "EMITIR BOLETA"}
            </button>

            <button
              type="button"
              onClick={handleCloseWithoutEmit}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? "Procesando..." : "CERRAR SIN EMITIR"}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloseSaleDialog;

