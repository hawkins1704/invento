import { MdDeleteOutline } from "react-icons/md";

type DeleteButtonProps = {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
};

const DeleteButton = ({
    onClick,
    disabled = false,
    children,
    className = "",
}: DeleteButtonProps) => {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-500/60 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-500/10 dark:text-red-200 dark:hover:text-red-100 dark:hover:bg-red-500/20 ${className}`}
        >
            <MdDeleteOutline />
            {children}
        </button>
    );
};

export default DeleteButton;
