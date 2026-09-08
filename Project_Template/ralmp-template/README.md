# template.io

Reusable frontend template for branded asset / operations apps. The working app is in **`ralmp-template`**.

Stack: **React + Vite + TypeScript + Tailwind CSS + DaisyUI**. Data is stored in the browser (`localStorage`). No backend is required.

---

## How to run (simple steps)

### 1. Install Node.js

Install **Node.js 20 or later** from [nodejs.org](https://nodejs.org/).

Check in a terminal:

```bash
node -v
npm -v
```

### 2. Open the app folder

```bash
cd ralmp-template
```

### 3. Install packages (first time only)

```bash
npm install
```

### 4. Start the app

```bash
npm run dev
```

Vite will open the app in your browser at **http://localhost:5173**.

If the browser does not open, go to that URL yourself.

---

## Other commands

Run these from `ralmp-template`:

| Command | What it does |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Type-check and build production files |
| `npm run preview` | Preview the production build |

---

## What you will see

The app loads a demo project and keeps data in your browser.

| Page | URL |
|---|---|
| Dashboard | `/dashboard` |
| Masters | `/masters` |
| Operations | `/operations` |
| Maintenance | `/maintenance` |
| Cycle Counts | `/cycle-counts` |
| Tracking | `/tracking` |
| Reports | `/reports` |
| Hardware | `/hardware` |
| Administration | `/admin` |
| Projects | `/projects` |
| TV display | `/tv-display` |

Use **Projects** to create another branded project. Use the theme control in the header to switch light/dark and DaisyUI palettes.

---

## Notes

- Demo data is created on first load.
- Clearing site data / localStorage resets the app.
- There is no login server. Roles in Administration are demo-only.
- Attachments in this folder (`prompt_info.txt`, screenshots, `RALMP.mp4`) are briefing materials for adapting the template — they are not required to run it.
