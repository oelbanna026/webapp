export function Button({ variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2 font-headline font-black uppercase tracking-widest text-[10px] rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary: "bg-primary text-on-primary-container hover:brightness-110",
    secondary: "bg-secondary text-on-secondary hover:brightness-110",
    ghost:
      "bg-surface-container-highest/60 backdrop-blur-md border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest",
  };

  return <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props} />;
}

