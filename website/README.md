# Birla Carbon — Warehouse Intelligence

React frontend plus a MongoDB-backed Express API.

## Prerequisites

- Node.js 20+
- MongoDB 7 running locally on `mongodb://127.0.0.1:27017`

## Start

```bash
# 1. Seed warehouse collections + Print queue Excel catalog
npm run seed

# 2. Start the API (port 5000)
npm run dev:server

# 3. Start the Vite app (port 5173)
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:5000`.

## Demo login

- Email: `admin@forklift.com`
- Mobile: `9876543210`
- OTP: `123456` (development OTP; a generated code is also shown)

## Scanner lookup keys

Imported from `PrintQueue_20260901_132810.xlsx` sheet **Print queue**:

- Queue Id
- Product ref (example `226587`)
- Product code
- QR value URL

Try looking up `226587` on `/scanner`.

## Excel import

`POST /api/import/excel` with form field `file`, or re-run:

```bash
npm run seed
```
