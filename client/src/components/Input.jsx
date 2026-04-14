export function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label ? (
        <div className="mb-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
          {label}
        </div>
      ) : null}
      <input
        className={`w-full bg-surface-container-lowest border border-outline-variant/10 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
        {...props}
      />
      {error ? <div className="mt-2 text-xs text-error">{error}</div> : null}
    </label>
  );
}

