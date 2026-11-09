import { useState } from "react";
import Field from "./Field.jsx";
import { SECTIONS, EMPTY, EXAMPLE, FIELD_NAMES, validateField, validateAll, toPayload } from "../fields.js";

export default function ScoringForm({ onSubmit, loading, serverErrors, onFieldEdit, onReset }) {
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});

  // Erreur affichée : validation locale en temps réel, sinon erreur renvoyée par l'API.
  const errorFor = (name) => (touched[name] ? validateField(name, values[name]) : null) || serverErrors[name] || null;

  const handleChange = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setTouched((t) => ({ ...t, [name]: true }));
    onFieldEdit(name);
  };
  const handleBlur = (name) => setTouched((t) => ({ ...t, [name]: true }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateAll(values);
    if (Object.keys(errors).length) {
      setTouched(Object.fromEntries(FIELD_NAMES.map((n) => [n, true])));
      document.getElementById(`f-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    onSubmit(toPayload(values));
  };

  const fillExample = () => {
    setValues(EXAMPLE);
    setTouched({});
  };
  const reset = () => {
    setValues(EMPTY);
    setTouched({});
    onReset();
  };

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <div className="form-head">
        <h2>Dossier client</h2>
        <button type="button" className="link" onClick={fillExample}>Remplir un exemple</button>
      </div>

      {SECTIONS.map((section) => (
        <fieldset key={section.title}>
          <legend>{section.title}</legend>
          <div className="grid">
            {section.fields.map((f) => (
              <Field key={f.name} field={f} value={values[f.name]} error={errorFor(f.name)}
                     onChange={handleChange} onBlur={handleBlur} />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="actions">
        <button type="submit" className="primary" disabled={loading}>
          {loading ? "Analyse en cours…" : "Évaluer le dossier"}
        </button>
        <button type="button" className="secondary" onClick={reset} disabled={loading}>Réinitialiser</button>
      </div>
    </form>
  );
}
