import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, afterEach } from "vitest";
import App from "../App.jsx";
import { toPayload, EXAMPLE, validateField } from "../fields.js";

const okResponse = (over = {}) => ({
  decision: "ACCORDE", probability_approval: 0.84, threshold: 0.46, review_low: 0.38, review_high: 0.54,
  factors: [
    { field: "credit_history", label: "Historique de crédit", value: "0", impact: -15.1, direction: "defavorable", message: "" },
    { field: "loan_amount", label: "Montant du prêt", value: "130.0", impact: 2.4, direction: "favorable", message: "" },
  ],
  model_version: "1.0", ...over,
});

const mockFetch = (status, body) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }));

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

async function fillExample(user) {
  await user.click(screen.getByRole("button", { name: /remplir un exemple/i }));
}

test("les champs obligatoires sont signalés et aucun appel n'est fait", async () => {
  const user = userEvent.setup();
  mockFetch(200, okResponse());
  render(<App />);
  await user.click(screen.getByRole("button", { name: /évaluer le dossier/i }));
  expect((await screen.findAllByText("Champ obligatoire")).length).toBeGreaterThanOrEqual(10);
  expect(fetch).not.toHaveBeenCalled();
});

test("validation en temps réel d'un revenu hors limites", async () => {
  const user = userEvent.setup();
  render(<App />);
  const input = screen.getByLabelText("Revenu du demandeur");
  await user.type(input, "5000000");
  expect(await screen.findByText(/Maximum/)).toBeInTheDocument();
  expect(input).toHaveAttribute("aria-invalid", "true");
  await user.clear(input);
  await user.type(input, "4500");
  await waitFor(() => expect(input).not.toHaveAttribute("aria-invalid"));
});

test("soumission réussie : envoie le bon JSON et affiche décision + critères", async () => {
  const user = userEvent.setup();
  mockFetch(200, okResponse());
  render(<App />);
  await fillExample(user);
  await user.click(screen.getByRole("button", { name: /évaluer le dossier/i }));

  expect(await screen.findByText("Crédit accordé")).toBeInTheDocument();
  expect(screen.getByText("84 %")).toBeInTheDocument();
  const factors = within(screen.getByRole("list"));
  expect(factors.getByText("Historique de crédit")).toBeInTheDocument();
  expect(factors.getByText("Non conforme")).toBeInTheDocument();

  const [url, opts] = fetch.mock.calls[0];
  expect(url).toBe("/api/v1/credit-scoring");
  expect(JSON.parse(opts.body)).toEqual(toPayload(EXAMPLE));
  expect(JSON.parse(opts.body).dependents).toBe(0);
});

test.each([
  ["REFUSE", "Crédit refusé"],
  ["ETUDE_MANUELLE", "Étude manuelle"],
])("affiche l'état %s", async (decision, title) => {
  const user = userEvent.setup();
  mockFetch(200, okResponse({ decision, probability_approval: 0.46 }));
  render(<App />);
  await fillExample(user);
  await user.click(screen.getByRole("button", { name: /évaluer le dossier/i }));
  expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
});

test("une erreur 400 de l'API est affichée sous le champ concerné", async () => {
  const user = userEvent.setup();
  mockFetch(400, {
    error: "validation_error", message: "Données manquantes ou hors des limites autorisées",
    details: [{ field: "loan_amount", message: "Valeur hors des limites autorisées (Input should be less than or equal to 1000)" }],
  });
  render(<App />);
  await fillExample(user);
  await user.click(screen.getByRole("button", { name: /évaluer le dossier/i }));
  expect(await screen.findByText("Valeur hors des limites autorisées")).toBeInTheDocument();
  // modifier le champ efface l'erreur serveur
  await user.type(screen.getByLabelText(/Montant du prêt/), "1");
  await waitFor(() => expect(screen.queryByText("Valeur hors des limites autorisées")).not.toBeInTheDocument());
});

test("serveur injoignable : message clair, pas de plantage", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  render(<App />);
  await fillExample(user);
  await user.click(screen.getByRole("button", { name: /évaluer le dossier/i }));
  expect(await screen.findByText(/Impossible de joindre le serveur/)).toBeInTheDocument();
});

test("réinitialiser vide le formulaire et le résultat", async () => {
  const user = userEvent.setup();
  mockFetch(200, okResponse());
  render(<App />);
  await fillExample(user);
  await user.click(screen.getByRole("button", { name: /évaluer le dossier/i }));
  await screen.findByText("Crédit accordé");
  await user.click(screen.getByRole("button", { name: /réinitialiser/i }));
  expect(screen.queryByText("Crédit accordé")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Revenu du demandeur")).toHaveValue(null);
});

test("règles de validation alignées sur l'API", () => {
  expect(validateField("applicant_income", "0")).toBeTruthy();
  expect(validateField("applicant_income", "100000")).toBeNull();
  expect(validateField("applicant_income", "100001")).toBeTruthy();
  expect(validateField("coapplicant_income", "0")).toBeNull();
  expect(validateField("coapplicant_income", "-1")).toBeTruthy();
  expect(validateField("loan_amount", "0.5")).toBeTruthy();
  expect(validateField("loan_amount", "1000")).toBeNull();
});
