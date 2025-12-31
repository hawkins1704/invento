

const Chip = ({ label }: { label: string }) => {
  return (
    <div className="inline-flex items-center rounded-full bg-slate-200 dark:bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700 dark:text-white">
    {label}
  </div>
  )
}

export default Chip