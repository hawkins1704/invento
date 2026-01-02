import { IoChevronBack, IoChevronForward } from "react-icons/io5";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  itemLabel?: string; // Label for items (e.g., "productos", "elementos")
};

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemLabel = "elementos",
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const offset = (currentPage - 1) * itemsPerPage;
  const startItem = offset + 1;
  const endItem = Math.min(offset + itemsPerPage, totalItems);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Mostrando {startItem} - {endItem} de {totalItems} {itemLabel}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white dark:disabled:hover:border-slate-700 dark:disabled:hover:text-slate-300"
          aria-label="Página anterior"
        >
          <IoChevronBack className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first page, last page, current page, and pages around current
            const showPage =
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1);

            if (!showPage) {
              // Show ellipsis
              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={page} className="px-2 text-sm text-slate-500 dark:text-slate-500">
                    ...
                  </span>
                );
              }
              return null;
            }

            return (
              <button
                key={page}
                type="button"
                onClick={() => handlePageChange(page)}
                className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  currentPage === page
                    ? "border-[#fa7316] bg-[#fa7316] text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
                aria-label={`Ir a página ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white dark:disabled:hover:border-slate-700 dark:disabled:hover:text-slate-300"
          aria-label="Página siguiente"
        >
          <IoChevronForward className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
