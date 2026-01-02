import { IoMdClose } from "react-icons/io";

type CloseButtonProps = {
    onClick: () => void;
};
const CloseButton = ({ onClick }: CloseButtonProps) => {
    return (
        <button
            type="button"
            onClick={() => onClick()}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-slate-100 text-slate-700 transition hover:text-slate-900 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
            aria-label="Cerrar"
        >
            <IoMdClose />
        </button>
    );
};

export default CloseButton;
