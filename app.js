const KEY_STORAGE = "or-key";
const MODEL_STORAGE = "or-model";
const MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models";
const CHAT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const PROMPT =
  "Napisz krótkie przemyślenie AI (2–4 zdania) na dowolny interesujący temat. " +
  "Zwróć sam zwykły tekst, bez nagłówków i list.";

const screenKey = document.getElementById("screen-key");
const screenModel = document.getElementById("screen-model");
const screenResult = document.getElementById("screen-result");
const keyInput = document.getElementById("key-input");
const keyToggle = document.getElementById("key-toggle");
const keySave = document.getElementById("key-save");
const modelList = document.getElementById("model-list");
const modelHint = document.getElementById("model-hint");
const resultModel = document.getElementById("result-model");
const resultBody = document.getElementById("result-body");
const statusEl = document.getElementById("status");

let currentSelection = null;

/* ---------- pomocnicze ---------- */

function show(screen) {
  for (const s of [screenKey, screenModel, screenResult]) s.hidden = s !== screen;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message ?? "";
  statusEl.classList.toggle("status-error", Boolean(isError));
}

function getKey() {
  return localStorage.getItem(KEY_STORAGE) ?? "";
}

function getModel() {
  return localStorage.getItem(MODEL_STORAGE) ?? "";
}

function modelLabel(id) {
  return id.replace(/:free$/, "").replace(/\/_/, "/");
}

/* ---------- stan 1: klucz ---------- */

keyToggle.addEventListener("click", () => {
  const isPassword = keyInput.type === "password";
  keyInput.type = isPassword ? "text" : "password";
  keyToggle.setAttribute("aria-label", isPassword ? "Ukryj klucz" : "Pokaż klucz");
});

keySave.addEventListener("click", () => {
  const value = keyInput.value.trim();
  if (!value) {
    setStatus("Wprowadź klucz API.", true);
    keyInput.focus();
    return;
  }
  localStorage.setItem(KEY_STORAGE, value);
  keyInput.value = "";
  setStatus("");
  route();
});

function renderKeyScreen(message) {
  show(screenKey);
  setStatus(message, Boolean(message));
  keyInput.focus();
}

/* ---------- stan 2: model ---------- */

async function loadModels() {
  show(screenModel);
  modelList.innerHTML = '<p class="hint">Wczytywanie modeli…</p>';
  modelHint.textContent = "";
  setStatus("");

  let models;
  try {
    const res = await fetch(MODELS_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    models = (data.data ?? []).filter((m) => m.id.endsWith(":free"));
  } catch (error) {
    modelList.innerHTML = "";
    modelHint.textContent =
      "Nie udało się pobrać listy modeli. Sprawdź połączenie z internetem.";
    setStatus(String(error), true);
    const retry = document.createElement("button");
    retry.className = "btn-secondary";
    retry.type = "button";
    retry.textContent = "Spróbuj ponownie";
    retry.addEventListener("click", loadModels);
    modelList.append(retry);
    return;
  }

  if (models.length === 0) {
    modelList.innerHTML = '<p class="hint">Brak dostępnych darmowych modeli.</p>';
    return;
  }

  models.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  modelList.innerHTML = "";
  for (const model of models) {
    const context = model.context_length
      ? `${Math.round(model.context_length / 1000)}k kontekstu`
      : "";
    const option = document.createElement("button");
    option.className = "model-option";
    option.type = "button";
    option.setAttribute("role", "radio");
    option.setAttribute("aria-checked", "false");
    option.innerHTML = `
      <span class="model-name">${model.name ?? model.id}</span>
      <span class="model-ctx">${context}</span>
    `;
    option.addEventListener("click", () => {
      localStorage.setItem(MODEL_STORAGE, model.id);
      route();
    });
    modelList.append(option);
  }
}

/* ---------- stan 3: wynik ---------- */

async function readErrorMessage(res) {
  const text = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(text);
    const message = parsed?.error?.message;
    const raw = parsed?.error?.metadata?.raw;
    return [message, typeof raw === "string" ? raw : ""].filter(Boolean).join(" — ").slice(0, 300);
  } catch {
    return text.slice(0, 300) || res.statusText || "brak szczegółów";
  }
}

function renderResultScreen(model) {
  show(screenResult);
  resultModel.textContent = modelLabel(model);
}

async function generate() {
  const key = getKey();
  const model = getModel();

  renderResultScreen(model);
  resultBody.innerHTML = '<span class="loading">Myślę…</span>';
  setStatus("");

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: PROMPT }],
        max_tokens: 300,
      }),
    });

    if (res.status === 401) {
      localStorage.removeItem(KEY_STORAGE);
      renderKeyScreen("Nieprawidłowy klucz API. Wprowadź go ponownie.");
      return;
    }

    if (!res.ok) {
      const detail = await readErrorMessage(res);
      resultBody.innerHTML = "";
      const hint =
        res.status === 429
          ? "Limit darmowych modeli (np. 50/dzień) lub model jest przeciążony."
          : "Ten model może być niedostępny dla Twojego konta lub aplikacji.";
      setStatus(`Błąd ${res.status}: ${detail}. ${hint} Spróbuj innego modelu.`, true);
      return;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Pusta odpowiedź modelu.");
    resultBody.textContent = content;
    setStatus("Gotowe.");
  } catch (error) {
    resultBody.innerHTML = "";
    resultModel.textContent = modelLabel(model);
    setStatus(`Błąd: ${error.message}`, true);
    if (!navigator.onLine) setStatus("Brak połączenia z internetem.", true);
  }
}

document.getElementById("again").addEventListener("click", generate);
document.getElementById("change").addEventListener("click", () => {
  localStorage.removeItem(MODEL_STORAGE);
  route();
});

/* ---------- router ---------- */

function route() {
  setStatus("");
  if (!getKey()) {
    renderKeyScreen();
  } else if (!getModel()) {
    loadModels();
  } else {
    generate();
  }
}

window.addEventListener("online", () => {
  if (!getKey() || !getModel()) return;
  setStatus("Online.");
});

route();

/* ---------- service worker ---------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Rejestracja service workera nie powiodła się:", error);
    });
  });
}