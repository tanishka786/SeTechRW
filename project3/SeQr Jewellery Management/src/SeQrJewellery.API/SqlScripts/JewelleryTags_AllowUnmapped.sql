-- Run on the TENANT database (e.g. SeQrJewellery_Demo / SeQrJewellery_goldpalace).
-- Makes JewelleryTags.JewelleryItemId optional so preprinted labels can sit in stock unmapped.

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_JewelleryTags_JewelleryItems_JewelleryItemId')
BEGIN
    ALTER TABLE dbo.JewelleryTags DROP CONSTRAINT FK_JewelleryTags_JewelleryItems_JewelleryItemId;
END
GO

-- Allow unmapped (preprinted) tags
ALTER TABLE dbo.JewelleryTags ALTER COLUMN JewelleryItemId UNIQUEIDENTIFIER NULL;
GO

ALTER TABLE dbo.JewelleryTags WITH CHECK ADD CONSTRAINT FK_JewelleryTags_JewelleryItems_JewelleryItemId
    FOREIGN KEY (JewelleryItemId) REFERENCES dbo.JewelleryItems (Id) ON DELETE SET NULL;
GO

-- Unique EPC when present (preprinted RFID)
-- EPC may still be nvarchar(max) from InitialTenant — narrow before indexing.
IF EXISTS (
    SELECT 1 FROM sys.columns c
    INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.JewelleryTags')
      AND c.name = N'EPC'
      AND t.name = N'nvarchar'
      AND (c.max_length = -1 OR c.max_length > 100)
)
BEGIN
    UPDATE dbo.JewelleryTags SET EPC = LEFT(EPC, 50) WHERE EPC IS NOT NULL AND LEN(EPC) > 50;
    ALTER TABLE dbo.JewelleryTags ALTER COLUMN EPC NVARCHAR(50) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_JewelleryTags_EPC' AND object_id = OBJECT_ID(N'dbo.JewelleryTags')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX IX_JewelleryTags_EPC
        ON dbo.JewelleryTags (EPC)
        WHERE EPC IS NOT NULL;
END
GO
