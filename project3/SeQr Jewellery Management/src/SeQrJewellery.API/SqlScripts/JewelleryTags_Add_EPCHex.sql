-- Run on the TENANT database.
-- Add EPCHex (hex-encoded EPC) and unique index. Backfill from existing EPC.

IF COL_LENGTH(N'dbo.JewelleryTags', N'EPCHex') IS NULL
BEGIN
    ALTER TABLE dbo.JewelleryTags ADD EPCHex NVARCHAR(100) NULL;
END
GO

-- Backfill: UTF-8/ASCII hex of EPC (same as Convert.ToHexString for digit EPC strings)
UPDATE dbo.JewelleryTags
SET EPCHex = CONVERT(VARCHAR(100), CONVERT(VARBINARY(50), CAST(EPC AS VARCHAR(50))), 2)
WHERE EPC IS NOT NULL
  AND (EPCHex IS NULL OR EPCHex = N'');
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_JewelleryTags_EPCHex' AND object_id = OBJECT_ID(N'dbo.JewelleryTags')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX IX_JewelleryTags_EPCHex
        ON dbo.JewelleryTags (EPCHex)
        WHERE EPCHex IS NOT NULL;
END
GO
