

const Chip = ({ label }: { label: string }) => {
  return (
    <div className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
    {label}
  </div>
  )
}

export default Chip