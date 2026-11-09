// Critères ayant le plus influencé la décision (CRED-41).
import { formatValue } from "../fields.js";

const MAX_BAR = 25; // un impact de 25 points remplit la demi-barre

export default function Factors({ factors }) {
  return (
    <section className="card">
      <h2>Critères qui ont pesé dans la décision</h2>
      {factors.length === 0 ? (
        <p className="muted">Le dossier est proche d'un profil typique : aucun critère ne se démarque.</p>
      ) : (
        <ul className="factors">
          {factors.map((f) => {
            const fav = f.direction === "favorable";
            const width = Math.min(Math.abs(f.impact) / MAX_BAR, 1) * 50;
            return (
              <li key={f.field}>
                <div className="factor-text">
                  <span className="factor-name">{f.label}</span>
                  <span className="muted">{formatValue(f.field, f.value)}</span>
                </div>
                <div className="bar" aria-hidden="true">
                  <div className={`fill ${fav ? "ok" : "no"}`}
                       style={fav ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }} />
                </div>
                <span className={`impact ${fav ? "ok" : "no"}`}>
                  {fav ? "+" : "−"}{Math.abs(f.impact).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pts
                  <span className="sr-only">{fav ? " en faveur de l'accord" : " en défaveur de l'accord"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="note">
        Estimation obtenue en comparant le dossier à un client typique : un « + » indique un critère
        qui augmente les chances d'accord, un « − » qui les diminue. C'est une aide à la lecture,
        pas une explication exacte du modèle.
      </p>
    </section>
  );
}
