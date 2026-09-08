#!/usr/bin/env python3
"""
Birla Carbon Local QR + Barcode Demo
-------------------------------------

What this script does:
1. Starts a local Flask web application.
2. Creates a Birla Carbon-style scan-result page.
3. Generates a QR code whose URL points to the local scan-result page.
4. Generates a Code 128 barcode for the product reference/barcode.
5. Generates a PDF product-information page.
6. Uses the supplied Aditya Birla / Birla Carbon logo if it is beside this script.

Install:
    pip install flask qrcode[pil] python-barcode pillow reportlab

Run:
    python birla_carbon_qr_app.py

Default:
    Web page: http://127.0.0.1:5000/scan/<token>
    QR image: generated_codes/birla_carbon_qr.png
    Barcode:  generated_codes/birla_carbon_barcode.png
    PDF:      generated_codes/birla_carbon_product.pdf

IMPORTANT:
- A QR code containing localhost/127.0.0.1 works only when the scanning device
  can reach the computer running this Flask server.
- If you scan from a phone on the same Wi-Fi, start with:
      python birla_carbon_qr_app.py --host-url http://YOUR-LAPTOP-IP:5000
  Example:
      python birla_carbon_qr_app.py --host-url http://192.168.1.25:5000
"""

from __future__ import annotations

import argparse
import io
import os
import secrets
import socket
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import qrcode
from flask import Flask, abort, render_template_string, send_file
from PIL import Image
import barcode
from barcode.writer import ImageWriter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated_codes"
LOGO_PATH = BASE_DIR / "aditya-birla-logo-retina.webp"

OUTPUT_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# EDIT PRODUCT INFORMATION HERE
# ---------------------------------------------------------------------------
# Replace these values with the real Birla Carbon product information you want
# to demonstrate. The application stores these values only in memory for this
# local demo.
PRODUCT = {
    "brand_name": "Birla Carbon",
    "product_name": "Birla Carbon Sample Product",
    "description": "Sample product record for QR/barcode warehouse scanning POC.",
    "manufactured_by": "Birla Carbon",
    "product_reference": "226594",
    "barcode": "226594",
    "batch_no": "DEMO-001",
    "mfg_date": "September 2026",
    "exp_date": "N/A",
    "mrp": "N/A",
    "net_weight": "25 kg",
    "website": "https://www.birlacarbon.com/",
    "location": "Warehouse POC",
    "category": "Carbon Black",
}

# One token is generated for this run. It is similar in purpose to the
# random "r=..." token in the supplied SeQr demo URL, but it belongs to this
# local application and does not call the SeQr server.
TOKEN = secrets.token_urlsafe(24)

app = Flask(__name__)

# This is replaced when --host-url is supplied.
PUBLIC_BASE_URL = "http://127.0.0.1:5000"


def get_local_ip() -> str:
    """Best-effort LAN IP discovery for phone scanning on the same network."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def make_qr(url: str, output: Path) -> None:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=5,
    )
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    # Add a clean white center containing a small logo when available.
    if LOGO_PATH.exists():
        logo = Image.open(LOGO_PATH).convert("RGBA")
        logo.thumbnail((130, 130))

        # Keep a white quiet area around the logo.
        pad = 18
        canvas_size = logo.width + pad * 2
        center = Image.new("RGBA", (canvas_size, canvas_size), "white")
        center.alpha_composite(
            logo,
            ((canvas_size - logo.width) // 2, (canvas_size - logo.height) // 2),
        )
        center = center.convert("RGB")

        x = (image.width - center.width) // 2
        y = (image.height - center.height) // 2
        image.paste(center, (x, y))

    image.save(output)


def make_barcode(value: str, output: Path) -> None:
    code = barcode.get("code128", value, writer=ImageWriter())
    code.save(
        str(output.with_suffix("")),
        options={
            "module_width": 0.35,
            "module_height": 18,
            "font_size": 12,
            "text_distance": 5,
            "quiet_zone": 6,
            "write_text": True,
        },
    )


def make_pdf(output: Path) -> None:
    """Create a simple product information PDF for the local demo."""
    c = canvas.Canvas(str(output), pagesize=A4)
    width, height = A4

    # Header
    c.setFont("Helvetica-Bold", 20)
    c.drawString(25 * mm, height - 25 * mm, "Birla Carbon")
    c.setFont("Helvetica", 9)
    c.drawRightString(
        width - 25 * mm,
        height - 24 * mm,
        "Product Information — Local POC",
    )

    y = height - 45 * mm
    c.setFont("Helvetica-Bold", 14)
    c.drawString(25 * mm, y, PRODUCT["product_name"])
    y -= 12 * mm

    fields = [
        ("Brand Name", PRODUCT["brand_name"]),
        ("Product Reference Number", PRODUCT["product_reference"]),
        ("Barcode", PRODUCT["barcode"]),
        ("Batch No.", PRODUCT["batch_no"]),
        ("Manufactured By", PRODUCT["manufactured_by"]),
        ("MFG Date", PRODUCT["mfg_date"]),
        ("EXP Date", PRODUCT["exp_date"]),
        ("Net Weight", PRODUCT["net_weight"]),
        ("Category", PRODUCT["category"]),
        ("Warehouse Location", PRODUCT["location"]),
        ("Website", PRODUCT["website"]),
    ]

    c.setFont("Helvetica", 10)
    for label, value in fields:
        c.setFont("Helvetica-Bold", 9)
        c.drawString(25 * mm, y, label)
        c.setFont("Helvetica", 9)
        c.drawString(75 * mm, y, str(value))
        y -= 8 * mm

    y -= 4 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(25 * mm, y, "Description")
    y -= 7 * mm

    c.setFont("Helvetica", 9)
    description = PRODUCT["description"]
    # Basic wrapping
    words = description.split()
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if c.stringWidth(candidate, "Helvetica", 9) > 150 * mm:
            c.drawString(25 * mm, y, line)
            y -= 5 * mm
            line = word
        else:
            line = candidate
    if line:
        c.drawString(25 * mm, y, line)

    y -= 18 * mm
    c.setFont("Helvetica", 8)
    c.drawString(
        25 * mm,
        y,
        "Generated locally for warehouse QR/barcode scanning POC.",
    )
    c.drawString(
        25 * mm,
        y - 5 * mm,
        f"Generated at UTC: {datetime.now(timezone.utc).isoformat()}",
    )

    c.save()


def generate_assets() -> dict[str, str]:
    scan_url = f"{PUBLIC_BASE_URL.rstrip('/')}/scan/{TOKEN}"

    qr_path = OUTPUT_DIR / "birla_carbon_qr.png"
    barcode_path = OUTPUT_DIR / "birla_carbon_barcode.png"
    pdf_path = OUTPUT_DIR / "birla_carbon_product.pdf"

    make_qr(scan_url, qr_path)
    make_barcode(PRODUCT["barcode"], barcode_path)
    make_pdf(pdf_path)

    return {
        "scan_url": scan_url,
        "qr": str(qr_path),
        "barcode": str(barcode_path),
        "pdf": str(pdf_path),
    }


PAGE = """
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ product.product_name }} — Birla Carbon</title>
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0;
        background: #f3f5f4;
        font-family: Arial, Helvetica, sans-serif;
        color: #24312c;
    }
    .page {
        width: min(900px, calc(100% - 24px));
        margin: 24px auto;
        background: white;
        border: 1px solid #d8dedb;
        box-shadow: 0 4px 20px rgba(0,0,0,.08);
    }
    .top {
        padding: 20px 24px;
        border-bottom: 1px solid #e0e5e2;
        display: flex;
        align-items: center;
        gap: 18px;
    }
    .logo {
        width: 74px;
        height: 74px;
        object-fit: contain;
    }
    .brand {
        flex: 1;
    }
    .brand h1 {
        margin: 0;
        font-size: 28px;
        letter-spacing: .2px;
        color: #222;
    }
    .brand p {
        margin: 5px 0 0;
        color: #64716c;
        font-size: 14px;
    }
    .status {
        border: 1px solid #b8d9c3;
        background: #effaf2;
        color: #15733b;
        padding: 8px 12px;
        font-size: 12px;
        border-radius: 18px;
        font-weight: 700;
    }
    .hero {
        padding: 22px 24px 8px;
    }
    .hero h2 {
        margin: 0;
        font-size: 24px;
        color: #183b31;
    }
    .hero .description {
        margin-top: 8px;
        color: #58655f;
        line-height: 1.5;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 18px;
        font-size: 14px;
    }
    td {
        border: 1px solid #dce2df;
        padding: 11px 13px;
        vertical-align: top;
    }
    td:first-child {
        width: 32%;
        background: #f7f9f8;
        font-weight: 700;
        color: #35443e;
    }
    a {
        color: #0878c9;
    }
    .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        padding: 22px 24px;
    }
    .btn {
        display: inline-block;
        text-decoration: none;
        padding: 11px 16px;
        border-radius: 7px;
        border: 1px solid #c9d2ce;
        color: #25322d;
        background: white;
        font-weight: 700;
        font-size: 13px;
    }
    .btn.primary {
        background: #1b3e32;
        color: white;
        border-color: #1b3e32;
    }
    .footer {
        border-top: 1px solid #e0e5e2;
        padding: 15px 24px;
        color: #7a8580;
        font-size: 11px;
        text-align: center;
    }
    @media (max-width: 600px) {
        .top { align-items: flex-start; }
        .logo { width: 58px; height: 58px; }
        .brand h1 { font-size: 21px; }
        .status { display: none; }
        .hero, .actions, .top { padding-left: 16px; padding-right: 16px; }
        td:first-child { width: 40%; }
    }
</style>
</head>
<body>
<div class="page">
    <div class="top">
        {% if logo_available %}
            <img class="logo" src="/logo" alt="Aditya Birla logo">
        {% endif %}
        <div class="brand">
            <h1>Birla Carbon</h1>
            <p>Product Scan Result</p>
        </div>
        <div class="status">VERIFIED SCAN</div>
    </div>

    <div class="hero">
        <h2>{{ product.product_name }}</h2>
        <div class="description">{{ product.description }}</div>

        <table>
            <tr><td>Brand Name</td><td>{{ product.brand_name }}</td></tr>
            <tr><td>Product Reference Number</td><td>{{ product.product_reference }}</td></tr>
            <tr><td>Barcode</td><td>{{ product.barcode }}</td></tr>
            <tr><td>Batch No.</td><td>{{ product.batch_no }}</td></tr>
            <tr><td>Manufactured By</td><td>{{ product.manufactured_by }}</td></tr>
            <tr><td>MFG Date</td><td>{{ product.mfg_date }}</td></tr>
            <tr><td>EXP Date</td><td>{{ product.exp_date }}</td></tr>
            <tr><td>Net Weight</td><td>{{ product.net_weight }}</td></tr>
            <tr><td>Category</td><td>{{ product.category }}</td></tr>
            <tr><td>Warehouse Location</td><td>{{ product.location }}</td></tr>
            <tr><td>Website</td><td><a href="{{ product.website }}" target="_blank">{{ product.website }}</a></td></tr>
            <tr><td>Scanned Date</td><td>{{ scanned_at }}</td></tr>
            <tr><td>Scan Token</td><td>{{ token }}</td></tr>
        </table>
    </div>

    <div class="actions">
        <a class="btn primary" href="/product.pdf">View / Download Product PDF</a>
        <a class="btn" href="/barcode.png">View Barcode</a>
        <a class="btn" href="/qr.png">View QR Code</a>
    </div>

    <div class="footer">
        Local warehouse POC • QR/barcode identification layer • UWB bin-location integration can be connected to this record later.
    </div>
</div>
</body>
</html>
"""


@app.route("/")
def home():
    return render_template_string(
        """
        <!doctype html>
        <html><body style="font-family:Arial;padding:40px">
        <h1>Birla Carbon QR/Barcode POC</h1>
        <p><a href="/scan/{{ token }}">Open Scan Result</a></p>
        <p>QR URL: <code>{{ scan_url }}</code></p>
        <p>Generated files are in <code>generated_codes/</code>.</p>
        </body></html>
        """,
        token=TOKEN,
        scan_url=f"{PUBLIC_BASE_URL.rstrip('/')}/scan/{TOKEN}",
    )


@app.route("/scan/<token>")
def scan(token: str):
    if token != TOKEN:
        abort(404)

    return render_template_string(
        PAGE,
        product=PRODUCT,
        token=token,
        scanned_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        logo_available=LOGO_PATH.exists(),
    )


@app.route("/logo")
def logo():
    if not LOGO_PATH.exists():
        abort(404)
    return send_file(LOGO_PATH, mimetype="image/webp")


@app.route("/qr.png")
def qr():
    return send_file(OUTPUT_DIR / "birla_carbon_qr.png", mimetype="image/png")


@app.route("/barcode.png")
def barcode_image():
    return send_file(OUTPUT_DIR / "birla_carbon_barcode.png", mimetype="image/png")


@app.route("/product.pdf")
def product_pdf():
    return send_file(
        OUTPUT_DIR / "birla_carbon_product.pdf",
        mimetype="application/pdf",
        as_attachment=False,
        download_name="birla_carbon_product.pdf",
    )


def main() -> None:
    global PUBLIC_BASE_URL

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--host-url",
        default="http://127.0.0.1:5000",
        help="Base URL encoded into the QR code. Example: http://192.168.1.25:5000",
    )
    parser.add_argument("--port", type=int, default=5000)
    args = parser.parse_args()

    # If the caller leaves the default localhost URL, keep it exactly local.
    PUBLIC_BASE_URL = args.host_url.rstrip("/")

    assets = generate_assets()

    print("\n==============================================")
    print(" Birla Carbon QR / Barcode Local POC")
    print("==============================================")
    print(f"Scan-result URL : {assets['scan_url']}")
    print(f"QR image        : {assets['qr']}")
    print(f"Barcode image   : {assets['barcode']}")
    print(f"Product PDF     : {assets['pdf']}")
    print("\nOpen this in a browser:")
    print(f"  {assets['scan_url']}")
    print("\nPress Ctrl+C to stop the server.")
    print("==============================================\n")

    # Bind to all interfaces so a phone on the same LAN can reach the app.
    app.run(host="0.0.0.0", port=args.port, debug=False)


if __name__ == "__main__":
    main()
