-- =============================================================================
-- Add ReferenceNumber to JewelleryTags (unique numeric sequence for Admin labels)
-- Run on the TENANT database (e.g. SeQrJewellery_Demo).
-- Idempotent.
-- =============================================================================
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.JewelleryTags', N'U') IS NULL
BEGIN
    RAISERROR(N'dbo.JewelleryTags not found. Connect to the Jewellery tenant database.', 16, 1);
    RETURN;
END
GO

IF COL_LENGTH(N'dbo.JewelleryTags', N'ReferenceNumber') IS NULL
BEGIN
    ALTER TABLE dbo.JewelleryTags ADD ReferenceNumber BIGINT NULL;
    PRINT N'Added JewelleryTags.ReferenceNumber';
END
ELSE
    PRINT N'JewelleryTags.ReferenceNumber already exists';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_JewelleryTags_ReferenceNumber'
      AND object_id = OBJECT_ID(N'dbo.JewelleryTags')
)
BEGIN
    CREATE UNIQUE INDEX IX_JewelleryTags_ReferenceNumber
        ON dbo.JewelleryTags (ReferenceNumber)
        WHERE ReferenceNumber IS NOT NULL;
    PRINT N'Created IX_JewelleryTags_ReferenceNumber';
END
ELSE
    PRINT N'IX_JewelleryTags_ReferenceNumber already exists';
GO

IF OBJECT_ID(N'dbo.__EFMigrationsHistory_Tenant', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM dbo.__EFMigrationsHistory_Tenant
        WHERE MigrationId = N'20260726062210_JewelleryTags_Add_ReferenceNumber'
    )
    BEGIN
        INSERT INTO dbo.__EFMigrationsHistory_Tenant (MigrationId, ProductVersion)
        VALUES (N'20260726062210_JewelleryTags_Add_ReferenceNumber', N'10.0.9');
        PRINT N'Recorded EF migration 20260726062210_JewelleryTags_Add_ReferenceNumber';
    END
END
GO
