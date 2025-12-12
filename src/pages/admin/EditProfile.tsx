import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import type { ChangeEvent, FormEvent } from "react";
import imageCompression from "browser-image-compression";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { FaArrowLeft } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";

type ProfileFormState = {
  name: string;
  administratorCode: string;
  salesCode: string;
  inventoryCode: string;
  companyName: string;
  companyCommercialName: string;
  ruc: string;
  companyLogoFile: File | null;
  personaId: string;
  personaToken: string;
  serieBoleta: string;
  serieFactura: string;
  IGVPercentage: "10" | "18" | "";
  printFormat: "A4" | "A5" | "ticket58mm" | "ticket80mm" | "";
  companyAddress: string;
  companyDistrict: string;
  companyProvince: string;
  companyDepartment: string;
};

const DEFAULT_FORM: ProfileFormState = {
  name: "",
  administratorCode: "",
  salesCode: "",
  inventoryCode: "",
    companyName: "",
    companyCommercialName: "",
    ruc: "",
  companyLogoFile: null,
    personaId: "",
    personaToken: "",
    serieBoleta: "",
    serieFactura: "",
    IGVPercentage: "",
    printFormat: "",
  companyAddress: "",
  companyDistrict: "",
  companyProvince: "",
  companyDepartment: "",
};

const EditProfile = () => {
  const navigate = useNavigate();
  const currentUser = useQuery(api.users.getCurrent) as Doc<"users"> | undefined;
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [formState, setFormState] = useState<ProfileFormState>(DEFAULT_FORM);
  const [currentCompanyLogoUrl, setCurrentCompanyLogoUrl] = useState<string | null>(null);
  const [previewCompanyLogoUrl, setPreviewCompanyLogoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCompanyLogoRemoved, setIsCompanyLogoRemoved] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormState({
        name: currentUser.name ?? "",
        administratorCode: currentUser.administratorCode ?? "",
        salesCode: currentUser.salesCode ?? "",
        inventoryCode: (currentUser as Doc<"users">).inventoryCode ?? "",
        companyName: currentUser.companyName ?? "",
        companyCommercialName: (currentUser as Doc<"users">).companyCommercialName ?? "",
        ruc: (currentUser as Doc<"users">).ruc ?? "",
        companyLogoFile: null,
        personaId: currentUser.personaId ?? "",
        personaToken: currentUser.personaToken ?? "",
        serieBoleta: (currentUser as Doc<"users">).serieBoleta ?? "",
        serieFactura: (currentUser as Doc<"users">).serieFactura ?? "",
        IGVPercentage: currentUser.IGVPercentage ? (currentUser.IGVPercentage.toString() as "10" | "18") : "",
        printFormat: (currentUser as Doc<"users">).printFormat ?? "",
        companyAddress: (currentUser as Doc<"users">).companyAddress ?? "",
        companyDistrict: (currentUser as Doc<"users">).companyDistrict ?? "",
        companyProvince: (currentUser as Doc<"users">).companyProvince ?? "",
        companyDepartment: (currentUser as Doc<"users">).companyDepartment ?? "",
      });
      setCurrentCompanyLogoUrl(
        (currentUser as Doc<"users"> & { companyLogoUrl: string | null }).companyLogoUrl ?? null
      );
    }
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (previewCompanyLogoUrl) {
        URL.revokeObjectURL(previewCompanyLogoUrl);
      }
    };
  }, [previewCompanyLogoUrl]);
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCompanyLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFormState((previous) => ({ ...previous, companyLogoFile: file }));
    setPreviewCompanyLogoUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return file ? URL.createObjectURL(file) : null;
    });
    setIsCompanyLogoRemoved(false);
  };

  const handleRemoveCompanyLogo = () => {
    setFormState((previous) => ({ ...previous, companyLogoFile: null }));
    setPreviewCompanyLogoUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
    setCurrentCompanyLogoUrl(null);
    setIsCompanyLogoRemoved(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    try {
      setIsSubmitting(true);

      let companyLogoStorageId: Id<"_storage"> | undefined;
      const shouldRemoveCompanyLogo = isCompanyLogoRemoved && !formState.companyLogoFile;

      if (formState.companyLogoFile) {
        const uploadUrl = await generateUploadUrl();
        const compressedFile = await imageCompression(formState.companyLogoFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        });

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": compressedFile.type },
          body: compressedFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("No se pudo subir el logo de la empresa, intenta nuevamente.");
        }

        const result = (await uploadResponse.json()) as {
          storageId: Id<"_storage">;
        };
        companyLogoStorageId = result.storageId;
      }

      await updateProfile({
        name: formState.name.trim() || undefined,
        administratorCode: formState.administratorCode.trim() || undefined,
        salesCode: formState.salesCode.trim() || undefined,
        inventoryCode: formState.inventoryCode.trim() || undefined,
        companyName: formState.companyName.trim() || undefined,
        companyCommercialName: formState.companyCommercialName.trim() || undefined,
        ruc: formState.ruc.trim() || undefined,
        companyLogo: companyLogoStorageId,
        removeCompanyLogo: shouldRemoveCompanyLogo ? true : undefined,
        personaId: formState.personaId.trim() || undefined,
        personaToken: formState.personaToken.trim() || undefined,
        serieBoleta: formState.serieBoleta.trim() || undefined,
        serieFactura: formState.serieFactura.trim() || undefined,
        IGVPercentage: formState.IGVPercentage
          ? (Number(formState.IGVPercentage) as 10 | 18)
          : undefined,
        printFormat: formState.printFormat
          ? (formState.printFormat as "A4" | "A5" | "ticket58mm" | "ticket80mm")
          : undefined,
        companyAddress: formState.companyAddress.trim() || undefined,
        companyDistrict: formState.companyDistrict.trim() || undefined,
        companyProvince: formState.companyProvince.trim() || undefined,
        companyDepartment: formState.companyDepartment.trim() || undefined,
      });

      setSuccessMessage("Perfil actualizado correctamente.");
      setFormState((previous) => ({ ...previous, companyLogoFile: null }));
      setPreviewCompanyLogoUrl((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }
        return null;
      });
      setIsCompanyLogoRemoved(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el perfil.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentUser === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        Cargando información del perfil...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-1 text-sm font-semibold  text-slate-300 transition hover:border-[#fa7316] hover:text-white"
          >
            <FaArrowLeft />
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-3xl font-semibold">Editar perfil</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Actualiza la configuración de tu perfil de usuario, datos de la empresa y facturación.
            </p>
          </div>
        </div>
      </header>

      <form
        className="space-y-8 rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20"
        onSubmit={handleSubmit}
      >
        {/* DATOS DEL USUARIO */}
        <section className="space-y-5">
          <div className="border-b border-slate-700 pb-3">
            <h2 className="text-xl font-semibold">Datos del Usuario</h2>
            <p className="mt-1 text-sm text-slate-400">
              Información personal y códigos de acceso.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-slate-200"
              >
                Nombre
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formState.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="administratorCode"
                className="text-sm font-medium text-slate-200"
              >
                Código de Administrador
              </label>
              <input
                id="administratorCode"
                name="administratorCode"
                type="text"
                value={formState.administratorCode}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Código de administrador"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="salesCode"
                className="text-sm font-medium text-slate-200"
              >
                Código de Ventas
              </label>
              <input
                id="salesCode"
                name="salesCode"
                type="text"
                value={formState.salesCode}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Código de ventas"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="inventoryCode"
                className="text-sm font-medium text-slate-200"
              >
                Código de Inventario
              </label>
              <input
                id="inventoryCode"
                name="inventoryCode"
                type="text"
                value={formState.inventoryCode}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Código de inventario"
              />
            </div>
          </div>
        </section>

        {/* DATOS DE LA EMPRESA */}
        <section className="space-y-5">
          <div className="border-b border-slate-700 pb-3">
            <h2 className="text-xl font-semibold">Datos de la Empresa</h2>
            <p className="mt-1 text-sm text-slate-400">
              Información de tu empresa y logo corporativo.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="companyName"
                className="text-sm font-medium text-slate-200"
              >
                Razón Social
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                value={formState.companyName}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Razón social de la empresa"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="companyCommercialName"
                className="text-sm font-medium text-slate-200"
              >
                Nombre Comercial
              </label>
              <input
                id="companyCommercialName"
                name="companyCommercialName"
                type="text"
                value={formState.companyCommercialName}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Nombre comercial de la empresa"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="ruc"
                className="text-sm font-medium text-slate-200"
              >
                RUC
              </label>
              <input
                id="ruc"
                name="ruc"
                type="text"
                value={formState.ruc}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Número de RUC"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="companyLogo"
              className="text-sm font-medium text-slate-200"
            >
              Logo de la Empresa
            </label>
            <input
              id="companyLogo"
              name="companyLogo"
              type="file"
              accept="image/*"
              onChange={handleCompanyLogoChange}
              className="w-full cursor-pointer rounded-lg border border-dashed border-slate-700 bg-slate-900 px-4 py-4 text-sm text-slate-400 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#fa7316] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-[#fa7316]/50"
            />
            <p className="text-xs text-slate-500">
              Si no seleccionas una nueva imagen, se mantendrá la actual. Tamaño recomendado máx. 1280px.
            </p>

            {(previewCompanyLogoUrl || currentCompanyLogoUrl) && (
              <div className="mt-4 flex items-center gap-4">
                <div className="h-24 w-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                  <img
                    src={previewCompanyLogoUrl ?? currentCompanyLogoUrl ?? ""}
                    alt="Logo de la empresa"
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCompanyLogo}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition hover:border-red-500/60 hover:text-red-100"
                  disabled={isSubmitting}
                >
                  <MdDeleteOutline className="w-4 h-4" />
                  <span>Quitar logo</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* DATOS DE FACTURACIÓN */}
        <section className="space-y-5">
          <div className="border-b border-slate-700 pb-3">
            <h2 className="text-xl font-semibold">Datos de Facturación</h2>
            <p className="mt-1 text-sm text-slate-400">
              Configuración para la emisión de comprobantes electrónicos con APISUNAT.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="personaId"
                className="text-sm font-medium text-slate-200"
              >
                Persona ID
              </label>
              <input
                id="personaId"
                name="personaId"
                type="text"
                value={formState.personaId}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="ID de persona en APISUNAT"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="personaToken"
                className="text-sm font-medium text-slate-200"
              >
                Persona Token
              </label>
              <input
                id="personaToken"
                name="personaToken"
                type="text"
                value={formState.personaToken}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Token de autenticación APISUNAT"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="serieBoleta"
                className="text-sm font-medium text-slate-200"
              >
                Serie Boleta
              </label>
              <input
                id="serieBoleta"
                name="serieBoleta"
                type="text"
                value={formState.serieBoleta}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Ej: B001"
                maxLength={4}
              />
              <p className="text-xs text-slate-500">
                Serie para boletas de venta (4 caracteres, ej: B001)
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="serieFactura"
                className="text-sm font-medium text-slate-200"
              >
                Serie Factura
              </label>
              <input
                id="serieFactura"
                name="serieFactura"
                type="text"
                value={formState.serieFactura}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Ej: F001"
                maxLength={4}
              />
              <p className="text-xs text-slate-500">
                Serie para facturas (4 caracteres, ej: F001)
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="IGVPercentage"
                className="text-sm font-medium text-slate-200"
              >
                Porcentaje de IGV
              </label>
              <select
                id="IGVPercentage"
                name="IGVPercentage"
                value={formState.IGVPercentage}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
              >
                <option value="">Selecciona un porcentaje</option>
                <option value="10">10%</option>
                <option value="18">18%</option>
              </select>
              <p className="text-xs text-slate-500">
                Este porcentaje se utilizará para calcular el IGV de los productos
                que crees o edites.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="printFormat"
                className="text-sm font-medium text-slate-200"
              >
                Formato de Impresión PDF
              </label>
              <select
                id="printFormat"
                name="printFormat"
                value={formState.printFormat}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
              >
                <option value="">Selecciona un formato</option>
                <option value="A4">A4</option>
                <option value="A5">A5</option>
                <option value="ticket58mm">Ticket 58mm</option>
                <option value="ticket80mm">Ticket 80mm</option>
              </select>
              <p className="text-xs text-slate-500">
                Formato predeterminado para descargar PDFs de documentos emitidos.
              </p>
            </div>
          </div>
        </section>

        {/* DIRECCIÓN DE LA EMPRESA */}
        <section className="space-y-5">
          <div className="border-b border-slate-700 pb-3">
            <h2 className="text-xl font-semibold">Dirección de la Empresa</h2>
            <p className="mt-1 text-sm text-slate-400">
              Dirección completa de la empresa para los comprobantes electrónicos.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="companyAddress"
              className="text-sm font-medium text-slate-200"
            >
              Dirección
            </label>
            <input
              id="companyAddress"
              name="companyAddress"
              type="text"
              value={formState.companyAddress}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
              placeholder="Ej: AV. UNIVERSITARIA NRO. 1699 URB. SANTA EMMA"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <label
                htmlFor="companyDistrict"
                className="text-sm font-medium text-slate-200"
              >
                Distrito
              </label>
              <input
                id="companyDistrict"
                name="companyDistrict"
                type="text"
                value={formState.companyDistrict}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Ej: LIMA"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="companyProvince"
                className="text-sm font-medium text-slate-200"
              >
                Provincia
              </label>
              <input
                id="companyProvince"
                name="companyProvince"
                type="text"
                value={formState.companyProvince}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Ej: LIMA"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="companyDepartment"
                className="text-sm font-medium text-slate-200"
              >
                Departamento
              </label>
              <input
                id="companyDepartment"
                name="companyDepartment"
                type="text"
                value={formState.companyDepartment}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Ej: LIMA"
              />
            </div>
          </div>
        </section>

        {formError && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {formError}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando cambios..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;
