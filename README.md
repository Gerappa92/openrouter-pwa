# OpenRouter POC — Przemyślenia AI

Prosta instalowalna PWA do przetestowania komunikacji z **OpenRouter** bezpośrednio z przeglądarki (tablet). Po podaniu klucza i wybraniu darmowego modelu aplikacja przy każdym otwarciu generuje krótkie „przemyślenie AI”.

Adres (GitHub Pages): https://gerappa92.github.io/openrouter-pwa/

## Jak działa

1. **Klucz API** — ekran z polem na klucz OpenRouter (`sk-or-...`), zapisywany w `localStorage`.
2. **Wybór modelu** — lista pobierana na żywo z `GET https://openrouter.ai/api/v1/models`, filtrowana do modeli z sufiksem `:free`.
3. **Wynik** — `POST https://openrouter.ai/api/v1/chat/completions` generuje krótki tekst. Przyciski „Jeszcze raz” i „Zmień model”.

## Bezpieczeństwo

⚠️ Klucz trzymany jest w `localStorage` po stronie klienta — jest czytelny dla JS i dla każdego, kto ma dostęp do urządzenia. To akceptowalne dla POC na własnym tablecie. **Nie commituj klucza do repozytorium** ani nie wpisuj go w kodzie.

Limity darmowych modeli OpenRouter: 50 zapytań/dzień (1000/dzień po zakupieniu ≥10 kredytów). Przy `429` aplikacja wraca do wyboru modelu.

## Instalacja na tablecie

1. Otwórz adres w Chrome.
2. Menu ⋮ → **Zainstaluj aplikację** (lub „Dodaj do ekranu głównego”).
3. Uruchom z ekranu głównego, wpisz klucz, wybierz model.

## Struktura

| Plik | Rola |
|---|---|
| `index.html` | ekrany: klucz / wybór modelu / wynik |
| `app.js` | maszyna stanów, `fetch` do OpenRouter, obsługa błędów |
| `styles.css` | wygląd mobilny |
| `manifest.webmanifest` | metadane PWA (nazwa, ikony, `standalone`) |
| `sw.js` | cache app shellu; pomija żądania cross-origin |
| `icons/` | ikony 192/512 px, w tym maskowalne |

Bez build stepu — czyste pliki statyczne. Publikacja przez GitHub Pages (gałąź `main`, katalog główny).