// Appel à l'API de scoring (CRED-38).
const BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(message, { status = 0, details = [] } = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function scoreClient(payload, signal) {
  let res;
  try {
    res = await fetch(`${BASE}/api/v1/credit-scoring`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ApiError("Impossible de joindre le serveur. Vérifiez que l'API est démarrée.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* corps non JSON */
  }

  if (!res.ok) {
    throw new ApiError(data?.message ?? `Erreur du serveur (code ${res.status}).`, {
      status: res.status,
      details: data?.details ?? [],
    });
  }
  return data;
}
