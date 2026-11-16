import { useRef, useState } from "react";

function Select({ id, field, value, onChange, onBlur, describedBy, invalid }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const options = [{ value: "", label: "Choisir…" }, ...field.options];
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];
  const listId = `${id}-list`;

  const openList = () => { setActive(selectedIndex); setOpen(true); };
  const choose = (i) => { onChange(field.name, options[i].value); setOpen(false); };
  const move = (i) => {
    const next = Math.min(options.length - 1, Math.max(0, i));
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); open ? move(active + 1) : openList(); break;
      case "ArrowUp": e.preventDefault(); open ? move(active - 1) : openList(); break;
      case "Home": if (open) { e.preventDefault(); move(0); } break;
      case "End": if (open) { e.preventDefault(); move(options.length - 1); } break;
      case "Enter":
      case " ": e.preventDefault(); open ? choose(active) : openList(); break;
      case "Escape": if (open) { e.preventDefault(); setOpen(false); } break;
      case "Tab": setOpen(false); break;
      default: break;
    }
  };

  // Quand le focus quitte complètement le composant : on ferme et on signale le blur.
  const handleBlur = (e) => {
    if (wrapRef.current?.contains(e.relatedTarget)) return;
    setOpen(false);
    onBlur(field.name);
  };

  return (
    <div className="select-wrap" ref={wrapRef} onBlur={handleBlur}>
      <button
        type="button"
        id={id}
        className={`select-btn${value === "" ? " is-placeholder" : ""}${open ? " is-open" : ""}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-invalid={invalid ? "true" : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        <span>{selected.label}</span>
      </button>

      {open && (
        <ul className="select-list" role="listbox" id={listId} ref={listRef}>
          {options.map((o, i) => (
            <li
              key={o.value || "empty"}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={`select-option${i === active ? " is-active" : ""}${i === selectedIndex ? " is-selected" : ""}${o.value === "" ? " is-empty" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Field({ field, value, error, onChange, onBlur }) {
  const id = `f-${field.name}`;
  const describedBy = error ? `${id}-err` : field.hint ? `${id}-hint` : undefined;

  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{field.label}</label>
      {field.type === "select" ? (
        <Select id={id} field={field} value={value} onChange={onChange} onBlur={onBlur}
                describedBy={describedBy} invalid={!!error} />
      ) : (
        <input
          id={id}
          name={field.name}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          onBlur={() => onBlur(field.name)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
        />
      )}
      {error ? (
        <p className="error" id={`${id}-err`} role="alert">{error}</p>
      ) : field.hint ? (
        <p className="hint" id={`${id}-hint`}>{field.hint}</p>
      ) : null}
    </div>
  );
}