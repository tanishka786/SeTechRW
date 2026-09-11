-- Run on the TENANT database.
-- JewelleryTags: drop TagType, rename TagValue → BarcodeValue, add QRCodeValue.
-- Scan lookup uses BarcodeValue OR QRCodeValue OR EPC.

IF COL_LENGTH(N'dbo.JewelleryTags', N'TagValue') IS NOT NULL
   AND COL_LENGTH(N'dbo.JewelleryTags', N'BarcodeValue') IS NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_JewelleryTags_TagValue' AND object_id = OBJECT_ID(N'dbo.JewelleryTags'))
        DROP INDEX IX_JewelleryTags_TagValue ON dbo.JewelleryTags;

    EXEC sp_rename N'dbo.JewelleryTags.TagValue', N'BarcodeValue', N'COLUMN';

    CREATE UNIQUE NONCLUSTERED INDEX IX_JewelleryTags_BarcodeValue
        ON dbo.JewelleryTags (BarcodeValue);
END
GO

IF COL_LENGTH(N'dbo.JewelleryTags', N'TagType') IS NOT NULL
BEGIN
    ALTER TABLE dbo.JewelleryTags DROP COLUMN TagType;
END
GO

IF COL_LENGTH(N'dbo.JewelleryTags', N'QRCodeValue') IS NULL
BEGIN
    ALTER TABLE dbo.JewelleryTags ADD QRCodeValue NVARCHAR(200) NULL;

    CREATE UNIQUE NONCLUSTERED INDEX IX_JewelleryTags_QRCodeValue
        ON dbo.JewelleryTags (QRCodeValue)
        WHERE QRCodeValue IS NOT NULL;
END
GO
