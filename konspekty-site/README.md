# Конспекты — статический сайт (GitHub Pages)

Чистый фронтенд: **HTML + CSS + JavaScript**. Без Node, без сборки.

## GitHub Pages

1. Создайте репозиторий на GitHub (например `konspekty-seti`).
2. Залейте **содержимое папки `konspekty-site`** в корень репозитория  
   (должны быть `index.html`, `css/`, `js/`, `content/`, `.nojekyll`).
3. **Settings → Pages → Build and deployment:**
   - Source: **Deploy from a branch**
   - Branch: `main` (или `master`), папка **`/ (root)`**
4. Через 1–2 минуты сайт откроется по адресу:  
   `https://ВАШ_ЛОГИН.github.io/ИМЯ_РЕПОЗИТОРИЯ/`

### Обновление текстов

После правки `.md` в папке `winx` запустите из `konspekty-site`:

```powershell
.\sync-content.ps1
```

Затем закоммитьте изменения в `content/` и запушьте на GitHub.

## Локальный просмотр

```powershell
cd konspekty-site
python -m http.server 8080
```

Откройте: http://localhost:8080/

> Двойной клик по `index.html` может не сработать в Chrome из‑за ограничений `fetch` для `file://`. На GitHub Pages и с локальным сервером всё работает.

## Структура

```
konspekty-site/
  index.html
  css/style.css
  js/app.js
  content/*.md      ← все конспекты
  .nojekyll         ← отключает Jekyll на GitHub Pages
  sync-content.ps1
```
