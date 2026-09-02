# Birla Carbon Local QR/Barcode POC

## Install

```bash
pip install -r requirements.txt
```

## Run locally

```bash
python birla_carbon_qr_app.py
```

Then open:

http://127.0.0.1:5000/

The script creates:
- generated_codes/birla_carbon_qr.png
- generated_codes/birla_carbon_barcode.png
- generated_codes/birla_carbon_product.pdf

## Scan from a phone

If the phone and laptop are on the same Wi-Fi, find the laptop IP and run:

```bash
python birla_carbon_qr_app.py --host-url http://YOUR-LAPTOP-IP:5000
```

Example:

```bash
python birla_carbon_qr_app.py --host-url http://192.168.1.25:5000
```

Scan the generated QR with the phone camera. It will open the local
Birla Carbon scan-result page.

## Product data

Edit the PRODUCT dictionary at the top of birla_carbon_qr_app.py.
Do not use demo values as real Birla Carbon product information.

## Relationship to the supplied SeQr URL

The supplied URL:

https://seqrtechnology.com/dl?r=DEArEeZNO6XQxQ0AAC-LLiwRWzdGxBWRpkSH76jSNHg

is treated as a visual/behavioral reference only.

This POC does NOT impersonate or call that URL. It creates its own local
token and scan-result route.

NOTE - These records are FICTIONAL demo data created for the local QR/barcode warehouse POC.
They are not representations of actual Birla Carbon products, batches, prices,
manufacturing records, or inventory.