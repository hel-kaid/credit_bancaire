// Affichage visuel de la décision : Accordé / Refusé / Étude manuelle (CRED-40).
const DECISIONS = {
  ACCORDE: { tone: "ok", icon: "✓", title: "Crédit accordé", text: "Le profil correspond à celui des dossiers habituellement acceptés." },
  REFUSE: { tone: "no", icon: "✕", title: "Crédit refusé", text: "Le profil correspond à celui des dossiers habituellement refusés." },
  ETUDE_MANUELLE: { tone: "warn", icon: "!", title: "Étude manuelle", text: "Le résultat est proche du seuil de décision : le dossier doit être examiné par un conseiller." },
};

export default function DecisionCard({ result }) {
  const d = DECISIONS[result.decision] ?? DECISIONS.ETUDE_MANUELLE;
  const p = Math.round(result.probability_approval * 100);
  const low = result.review_low * 100;
  const high = result.review_high * 100;

  // Jauge en trois zones : refus / étude manuelle / accord.
  const zones = `linear-gradient(to right, var(--no) 0 ${low}%, var(--warn) ${low}% ${high}%, var(--ok) ${high}% 100%)`;

  return (
    <section className={`card decision ${d.tone}`} aria-live="polite">
      <div className="badge" aria-hidden="true">{d.icon}</div>
      <div>
        <h2>{d.title}</h2>
        <p className="muted">{d.text}</p>
      </div>

      <div className="gauge-wrap">
        <div className="gauge-label">
          <span>Probabilité d'accord estimée</span>
          <strong>{p} %</strong>
        </div>
        <div className="gauge" style={{ background: zones }} role="img"
             aria-label={`Probabilité d'accord ${p} pour cent`}>
          <div className="marker" style={{ left: `${p}%` }} />
        </div>
        <div className="gauge-scale">
          <span>Refus</span><span>Étude manuelle</span><span>Accord</span>
        </div>
      </div>
    </section>
  );
}
