# Jewellery tenant DB update

**Run on each Jewellery tenant database:** [`JewelleryTenant_Update_Current.sql`](JewelleryTenant_Update_Current.sql)

Idempotent. Covers tags (unmapped / barcode / QR / EPCHex), `IsSold`/`SoldAt`, and inventory audit tables.

Optional: [`Seed_PreprintedJewelleryTags.sql`](Seed_PreprintedJewelleryTags.sql)

Older split scripts in this folder are kept for reference only.
