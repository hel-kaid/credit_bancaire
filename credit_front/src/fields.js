// Définition des champs, validation et conversion vers le format de l'API (CRED-35, CRED-37).
// Les limites reproduisent celles de l'API (credit_api/app/schemas.py) : à garder synchronisées.
export const LIMITS = {
  income: { max: 100000 },
  loan: { min: 1, max: 1000 },
};

export const TERMS = [12, 36, 60, 84, 120, 180, 240, 300, 360, 480];

const YES_NO = [
  { value: "Yes", label: "Oui" },
  { value: "No", label: "Non" },
];

export const SECTIONS = [
  {
    title: "Profil du demandeur",
    fields: [
      { name: "gender", label: "Genre", type: "select", options: [{ value: "Male", label: "Homme" }, { value: "Female", label: "Femme" }] },
      { name: "married", label: "Marié(e)", type: "select", options: YES_NO },
      { name: "dependents", label: "Personnes à charge", type: "select", options: [
        { value: "0", label: "0" }, { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3 ou plus" } ] },
      { name: "education", label: "Niveau d'études", type: "select", options: [
        { value: "Graduate", label: "Diplômé" }, { value: "Not Graduate", label: "Non diplômé" } ] },
      { name: "self_employed", label: "Travailleur indépendant", type: "select", options: YES_NO },
      { name: "credit_history", label: "Historique de crédit", type: "select", options: [
        { value: "1", label: "Conforme" }, { value: "0", label: "Non conforme" } ] },
    ],
  },
  {
    title: "Revenus",
    fields: [
      { name: "applicant_income", label: "Revenu du demandeur", type: "number", hint: `Maximum ${LIMITS.income.max.toLocaleString("fr-FR")}` },
      { name: "coapplicant_income", label: "Revenu du co-demandeur", type: "number", hint: "0 s'il n'y en a pas" },
    ],
  },
  {
    title: "Prêt demandé",
    fields: [
      { name: "loan_amount", label: "Montant du prêt (en milliers)", type: "number", hint: `Entre ${LIMITS.loan.min} et ${LIMITS.loan.max.toLocaleString("fr-FR")}` },
      { name: "loan_amount_term", label: "Durée du prêt", type: "select", options: TERMS.map((t) => ({ value: String(t), label: `${t} mois` })) },
      { name: "property_area", label: "Zone du bien", type: "select", options: [
        { value: "Urban", label: "Urbaine" }, { value: "Semiurban", label: "Semi-urbaine" }, { value: "Rural", label: "Rurale" } ] },
    ],
  },
];

export const FIELD_NAMES = SECTIONS.flatMap((s) => s.fields.map((f) => f.name));

export const EMPTY = Object.fromEntries(FIELD_NAMES.map((n) => [n, ""]));
EMPTY.loan_amount_term = "360";

export const EXAMPLE = {
  gender: "Male", married: "Yes", dependents: "0", education: "Graduate", self_employed: "No",
  credit_history: "1", applicant_income: "4500", coapplicant_income: "1500",
  loan_amount: "130", loan_amount_term: "360", property_area: "Semiurban",
};

export function validateField(name, raw) {
  const value = String(raw ?? "").trim();
  if (value === "") return "Champ obligatoire";
  switch (name) {
    case "applicant_income": {
      const n = Number(value);
      if (!Number.isFinite(n)) return "Nombre invalide";
      if (n <= 0) return "Doit être supérieur à 0";
      if (n > LIMITS.income.max) return `Maximum ${LIMITS.income.max.toLocaleString("fr-FR")}`;
      return null;
    }
    case "coapplicant_income": {
      const n = Number(value);
      if (!Number.isFinite(n)) return "Nombre invalide";
      if (n < 0) return "Ne peut pas être négatif";
      if (n > LIMITS.income.max) return `Maximum ${LIMITS.income.max.toLocaleString("fr-FR")}`;
      return null;
    }
    case "loan_amount": {
      const n = Number(value);
      if (!Number.isFinite(n)) return "Nombre invalide";
      if (n < LIMITS.loan.min || n > LIMITS.loan.max) return `Doit être entre ${LIMITS.loan.min} et ${LIMITS.loan.max.toLocaleString("fr-FR")}`;
      return null;
    }
    default:
      return null;
  }
}

export function validateAll(values) {
  const errors = {};
  for (const name of FIELD_NAMES) {
    const err = validateField(name, values[name]);
    if (err) errors[name] = err;
  }
  return errors;
}

export function toPayload(v) {
  return {
    gender: v.gender,
    married: v.married,
    dependents: parseInt(v.dependents, 10),
    education: v.education,
    self_employed: v.self_employed,
    applicant_income: Number(v.applicant_income),
    coapplicant_income: Number(v.coapplicant_income),
    loan_amount: Number(v.loan_amount),
    loan_amount_term: parseInt(v.loan_amount_term, 10),
    credit_history: parseInt(v.credit_history, 10),
    property_area: v.property_area,
  };
}

const VALUE_LABELS = {
  Yes: "Oui", No: "Non", Male: "Homme", Female: "Femme", Graduate: "Diplômé",
  "Not Graduate": "Non diplômé", Urban: "Urbaine", Semiurban: "Semi-urbaine", Rural: "Rurale",
};

export function formatValue(field, value) {
  if (field === "credit_history") return value === "1" ? "Conforme" : "Non conforme";
  if (field === "loan_amount_term") return `${value} mois`;
  if (VALUE_LABELS[value]) return VALUE_LABELS[value];
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("fr-FR") : value;
}
