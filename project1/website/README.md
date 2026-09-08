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

Imported from `Birla_Carbon_Demo_Queue.xlsx`:

- Barcode (example `226587`)
- Queue Id
- QR value URL (example `http://127.0.0.1:5000/scan/226587`)

Paste the barcode or the QR URL on `/scanner` to see product name, weight, and description.

## Excel import

`POST /api/import/excel` with form field `file`, or re-run:

```bash
npm run seed
```
