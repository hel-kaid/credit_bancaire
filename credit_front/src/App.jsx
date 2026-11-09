import { useEffect, useRef, useState } from "react";
import ScoringForm from "./components/ScoringForm.jsx";
import DecisionCard from "./components/DecisionCard.jsx";
import Factors from "./components/Factors.jsx";
import { scoreClient } from "./api.js";

// Les messages de l'API peuvent contenir un détail technique entre parenthèses : on ne garde que le début.
const cleanMessage = (m) => String(m).split(" (")[0];

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [serverErrors, setServerErrors] = useState({});
  const abortRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [result]);

  async function handleSubmit(payload) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setApiError(null);
    setServerErrors({});
    try {
      setResult(await scoreClient(payload, ctrl.signal));
    } catch (e) {
      if (e.name === "AbortError") return;
      setResult(null);
      if (e.status === 400 && e.details?.length) {
        setServerErrors(Object.fromEntries(e.details.map((d) => [d.field, cleanMessage(d.message)])));
      }
      setApiError(e.message);
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
  }

  const clearServerError = (name) =>
    setServerErrors((prev) => {
      if (!(name in prev)) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });

  const reset = () => {
    abortRef.current?.abort();
    setResult(null);
    setApiError(null);
    setServerErrors({});
    setLoading(false);
  };

  return (
    <div className="page">
      <header>
        <h1>Scoring de crédit</h1>
        <p className="muted">Saisissez le dossier du client pour obtenir une aide à la décision.</p>
      </header>

      <main className="layout">
        <ScoringForm onSubmit={handleSubmit} loading={loading} serverErrors={serverErrors}
                     onFieldEdit={clearServerError} onReset={reset} />

        <div className="side" ref={resultRef}>
          {apiError && <div className="card alert" role="alert"><strong>La demande a échoué.</strong> {apiError}</div>}

          {result ? (
            <>
              <DecisionCard result={result} />
              <Factors factors={result.factors} />
              <p className="disclaimer">
                Ce résultat est une aide à la décision basée sur des décisions passées. Il ne remplace pas
                l'analyse d'un conseiller et ne doit pas être le seul élément d'une décision.
              </p>
            </>
          ) : (
            !apiError && (
              <div className="card placeholder">
                <h2>Résultat</h2>
                <p className="muted">La décision et ses justifications s'afficheront ici une fois le dossier évalué.</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
