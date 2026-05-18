# Если GitHub Pages показывает 404

## Причина

Pages ищет **`index.html` в корне** выбранной папки (обычно `/` ветки `main`).

Если в репозитории так:

```
prs_kr/
  winx/
    konspekty-site/
      index.html    ← сайт здесь
```

то адрес **`.../prs_kr/`** даст 404. Сайт будет по адресу:

**https://aleksandra-ts.github.io/prs_kr/konspekty-site/**

(или с лишним `winx/` в пути — смотрите структуру на GitHub.)

---

## Решение 1 (быстро) — открыть правильный URL

На GitHub: **Code** → найдите, где лежит `index.html` с папками `css`, `js`, `content`.

Добавьте этот путь к URL, например:

`https://aleksandra-ts.github.io/prs_kr/ПУТЬ_К_ПАПКЕ_С_index.html/`

---

## Решение 2 (правильно) — сайт в корне репозитория

В репозитории `prs_kr` в **корне** должны быть:

```
index.html
css/
js/
content/
.nojekyll
```

**Не** вся папка `winx`, а **содержимое** `konspekty-site/`.

1. Скопируйте всё из `konspekty-site/` в корень репозитория на GitHub (или локально и `git push`).
2. **Settings → Pages** → Branch: `main`, Folder: **`/ (root)`**.
3. Подождите 2–5 минут.
4. Откройте: **https://aleksandra-ts.github.io/prs_kr/**

---

## Решение 3 — редирект из корня

Если оставляете структуру `konspekty-site/` внутри репо, в **корень** добавьте `index.html` с редиректом (файл есть в `winx/index.html`).

Тогда `.../prs_kr/` перенаправит на `.../prs_kr/konspekty-site/`.

---

## Проверка в Settings

- **Settings → Pages** — зелёная надпись «Your site is live at …»
- Если деплоя нет: включите Pages, выберите ветку `main`, папку `/root`
- Репозиторий должен быть **Public** (или Pages на платном плане)
