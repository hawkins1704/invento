export default function LoadingSpinner() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950 backdrop-blur-sm z-50">
            <div className="flex flex-col items-center gap-4">
                <div className="flex gap-2">
                    <div className="w-3 h-3 bg-[#fa7316] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-3 h-3 bg-[#fa7316] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-3 h-3 bg-[#fa7316] rounded-full animate-bounce"></div>
                </div>
            </div>
        </div>
    );
}
