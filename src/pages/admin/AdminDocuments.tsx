import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useAPISUNAT } from "../../hooks/useAPISUNAT";
import type { APISUNATDocument, PDFFormat } from "../../types/apisunat";
import { formatDate } from "../../utils/format";
import { FaDownload, FaSpinner } from "react-icons/fa";
import CloseButton from "../../components/CloseButton";
import DataTable from "../../components/table/DataTable";
import TableRow from "../../components/table/TableRow";
import Pagination from "../../components/pagination/Pagination";
import EmptyState from "../../components/empty-state/EmptyState";
import PageHeader from "../../components/page-header/PageHeader";

const getStatusBadge = (status: string) => {
  const statusConfig = {
    PENDIENTE: {
      label: "Pendiente",
      className: "border-yellow-500/40 bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-200",
    },
    ACEPTADO: {
      label: "Aceptado",
      className: "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
    },
    RECHAZADO: {
      label: "Rechazado",
      className: "border-red-500/40 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200",
    },
    EXCEPCION: {
      label: "Excepción",
      className: "border-orange-500/40 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-200",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    className: "border-slate-500/40 bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
};

const getDocumentTypeName = (type: string): string => {
  const typeMap: Record<string, string> = {
    "01": "Factura",
    "03": "Boleta de Venta",
    "04": "Liquidación de Compra",
    "07": "Nota de Crédito",
    "08": "Nota de Débito",
    "09": "Guía de Remisión - Remitente",
  };

  return typeMap[type] || type;
};

const ITEMS_PER_PAGE = 10;

const AdminDocuments = () => {
  const currentUser = useQuery(api.users.getCurrent) as Doc<"users"> | undefined;
  const { listDocuments, downloadPDF, isLoading, error } = useAPISUNAT();
  const [documents, setDocuments] = useState<APISUNATDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<APISUNATDocument | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<PDFFormat>("A4");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!currentUser?.personaId || !currentUser?.personaToken) {
        return;
      }

      setIsLoadingDocuments(true);
      const skip = (currentPage - 1) * ITEMS_PER_PAGE;
      const result = await listDocuments(
        currentUser.personaId,
        currentUser.personaToken,
        {
          limit: ITEMS_PER_PAGE,
          skip,
          order: "DESC",
        }
      );

      if (result) {
        setDocuments(result);
        // Si la respuesta tiene menos elementos que el limit, es la última página
        if (result.length < ITEMS_PER_PAGE) {
          setTotalItems(skip + result.length);
        } else {
          // Si tiene exactamente el limit, podría haber más páginas
          // Establecemos totalItems para permitir navegar a la siguiente página
          // Si ya tenemos un totalItems mayor, lo mantenemos, sino asumimos que hay al menos una página más
          setTotalItems((prevTotal) => {
            const minTotal = skip + result.length + 1;
            return prevTotal > minTotal ? prevTotal : minTotal;
          });
        }
      }
      setIsLoadingDocuments(false);
    };

    if (currentUser?.personaId && currentUser?.personaToken) {
      void loadDocuments();
    }
  }, [currentUser?.personaId, currentUser?.personaToken, listDocuments, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const handleDownloadClick = (document: APISUNATDocument) => {
    setSelectedDocument(document);
    setSelectedFormat("A4");
    setDownloadError(null);
  };

  const handleCloseModal = () => {
    if (!isDownloading) {
      setSelectedDocument(null);
      setDownloadError(null);
    }
  };

  const handleDownload = async () => {
    if (!selectedDocument || !currentUser?.personaToken) {
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
      await downloadPDF(
        selectedDocument.id,
        selectedFormat,
        selectedDocument.fileName,
      );

      // Cerrar modal después de abrir el PDF
      setSelectedDocument(null);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Error al abrir el PDF"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (currentUser === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-600 dark:text-slate-400">
        Cargando información...
      </div>
    );
  }

  if (!currentUser.personaId || !currentUser.personaToken) {
    return (
      <div className="space-y-8">
        <PageHeader
          chipLabel="Documentos"
          title="Documentos Emitidos"
          description="Visualiza todos los documentos electrónicos emitidos a través de APISUNAT."
        />

        <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 p-8 text-slate-900 dark:text-white">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-600 dark:text-slate-400">
            <span className="text-4xl" aria-hidden>
              ⚠️
            </span>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Para ver los documentos emitidos, necesitas configurar tu Persona ID y Persona Token en tu perfil.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        chipLabel="Documentos"
        title="Documentos Emitidos"
        description="Visualiza todos los documentos electrónicos emitidos como boletas de venta o facturas."
      />

      <section className="">
        {isLoadingDocuments || isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-600 dark:text-slate-400">
            <span className="text-4xl" aria-hidden>
              <FaSpinner className="animate-spin"/>
            </span>
            <p className="text-sm text-slate-600 dark:text-slate-400">Cargando documentos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-red-400">
            <span className="text-4xl" aria-hidden>
              ❌
            </span>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<span className="text-4xl">📄</span>}
            message="No hay documentos emitidos aún. Los documentos aparecerán aquí después de ser emitidos."
          />
        ) : (
          <>
            {/* Vista de tarjetas para mobile */}
            <div className="space-y-3 md:hidden">
              {documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onDownloadClick={handleDownloadClick}
                />
              ))}
            </div>
            {/* Vista de tabla para tablet y desktop */}
            <div className="hidden md:block">
              <DataTable
                columns={[
                  { label: "Filename", key: "filename" },
                  { label: "Tipo", key: "type" },
                  { label: "Status", key: "status" },
                  { label: "Fecha Emisión", key: "issueDate" },
                  { label: "Fecha Respuesta", key: "responseDate" },
                  { label: "Descargar", key: "download", align: "right" },
                ]}
              >
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {document.fileName}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {getDocumentTypeName(document.type)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(document.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {formatDate(document.issueTime * 1000)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {document.responseTime ? formatDate(document.responseTime * 1000) : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadClick(document)}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:border-[#fa7316] hover:text-[#fa7316] cursor-pointer dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
                        aria-label="Descargar PDF"
                      >
                        <FaDownload className="text-lg" />
                      </button>
                    </td>
                  </TableRow>
                ))}
              </DataTable>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
              itemLabel="documentos"
            />
          </>
        )}
      </section>

      {/* Modal de descarga */}
      {selectedDocument && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 dark:bg-slate-950/70 px-4 py-10 backdrop-blur">
          <div className="relative w-full max-w-md rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/95 p-6 text-slate-900 dark:text-white shadow-2xl shadow-black/60">
           <CloseButton onClick={handleCloseModal} />

            <div className="space-y-5 pt-6">
              <header className="space-y-2">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Descargar PDF</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Selecciona el formato del documento que deseas descargar.
                </p>
              </header>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-sm text-slate-700 dark:text-slate-300">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-500 dark:text-slate-500">Documento</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{selectedDocument.fileName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500">{getDocumentTypeName(selectedDocument.type)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-500" htmlFor="pdf-format">
                  Formato
                </label>
                <select
                  id="pdf-format"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as PDFFormat)}
                  disabled={isDownloading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="ticket58mm">Ticket 58mm</option>
                  <option value="ticket80mm">Ticket 80mm</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Selecciona el formato de impresión del documento.
                </p>
              </div>

              {downloadError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {downloadError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isDownloading}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isDownloading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Descargando...
                    </>
                  ) : (
                    <>
                      <FaDownload />
                      Descargar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DocumentCard = ({
  document,
  onDownloadClick,
}: {
  document: APISUNATDocument;
  onDownloadClick: (document: APISUNATDocument) => void;
}) => {
  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40 p-4 transition hover:bg-slate-100 dark:hover:bg-slate-900/60">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {document.fileName}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {getDocumentTypeName(document.type)}
          </p>
        </div>
        <div className="flex-shrink-0">
          {getStatusBadge(document.status)}
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-500">Fecha Emisión:</span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {formatDate(document.issueTime * 1000)}
          </p>
        </div>
        {document.responseTime && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-500">Fecha Respuesta:</span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {formatDate(document.responseTime * 1000)}
            </p>
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onDownloadClick(document)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-[#fa7316] dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
          aria-label="Descargar PDF"
        >
          <FaDownload className="text-sm" />
          Descargar PDF
        </button>
      </div>
    </div>
  );
};

export default AdminDocuments;
