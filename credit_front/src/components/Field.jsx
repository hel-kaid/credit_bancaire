export default function Field({ field, value, error, onChange, onBlur }) {
  const id = `f-${field.name}`;
  const describedBy = error ? `${id}-err` : field.hint ? `${id}-hint` : undefined;
  const common = {
    id,
    name: field.name,
    value,
    onChange: (e) => onChange(field.name, e.target.value),
    onBlur: () => onBlur(field.name),
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": describedBy,
  };

  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{field.label}</label>
      {field.type === "select" ? (
        <select {...common}>
          <option value="">Choisir…</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input {...common} type="number" inputMode="decimal" min="0" step="any" />
      )}
      {error ? (
        <p className="error" id={`${id}-err`} role="alert">{error}</p>
      ) : field.hint ? (
        <p className="hint" id={`${id}-hint`}>{field.hint}</p>
      ) : null}
    </div>
  );
}
