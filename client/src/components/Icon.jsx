export function Icon({ name, className = "", filled = false }) {
  const style = filled ? { fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24' } : undefined;
  return (
    <span className={`material-symbols-outlined ${className}`} style={style}>
      {name}
    </span>
  );
}

