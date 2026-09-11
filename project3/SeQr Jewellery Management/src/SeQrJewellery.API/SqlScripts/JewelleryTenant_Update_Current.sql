/*
================================================================================
  SeQr Jewellery — TENANT DB UPDATE (idempotent)
  Target: Jewellery Management tenant DB (e.g. SeQrJewellery_Demo / goldpalace DB)
================================================================================
  Safe to re-run. Consolidates:
    - Unmapped JewelleryTags (nullable JewelleryItemId)
    - BarcodeValue / QRCodeValue (drop TagType, rename TagValue)
    - EPCHex + backfill
    - JewelleryItems.IsSold / SoldAt
    - InventoryAudits / InventoryAuditScans / InventoryAuditMissing

  Also records EF migration history rows so app startup migrate does not fail
  when columns/tables already exist (__EFMigrationsHistory_Tenant).

  Seed preprinted tags separately: Seed_PreprintedJewelleryTags.sql (optional).
================================================================================
*/

SET NOCOUNT ON;
PRINT N'=== Jewellery tenant DB update starting ===';

IF OBJECT_ID(N'dbo.JewelleryTags', N'U') IS NULL
BEGIN
    RAISERROR(N'dbo.JewelleryTags not found. Connect to the Jewellery tenant database.', 16, 1);
    RETURN;
END
GO

-- ── 1) Allow unmapped tags (nullable JewelleryItemId) ───────────────────────
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_JewelleryTags_JewelleryItems_JewelleryItemId')
BEGIN
    ALTER TABLE dbo.JewelleryTags DROP CONSTRAINT FK_JewelleryTags_JewelleryItems_JewelleryItemId;
    PRINT N'Dropped FK_JewelleryTags_JewelleryItems_JewelleryItemId';
END
GO

-- Make nullable if currently NOT NULL
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.JewelleryTags')
      AND name = N'JewelleryItemId'
      AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.JewelleryTags ALTER COLUMN JewelleryItemId UNIQUEIDENTIFIER NULL;
    PRINT N'JewelleryTags.JewelleryItemId set to NULL';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_JewelleryTags_JewelleryItems_JewelleryItemId')
   AND OBJECT_ID(N'dbo.JewelleryItems', N'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.JewelleryTags WITH CHECK ADD CONSTRAINT FK_JewelleryTags_JewelleryItems_JewelleryItemId
        FOREIGN KEY (JewelleryItemId) REFERENCES dbo.JewelleryItems (Id) ON DELETE SET NULL;
    PRINT N'Re-created FK_JewelleryTags_JewelleryItems_JewelleryItemId (ON DELETE SET NULL)';
END
GO

-- ── 1b) Narrow EPC (was nvarchar(max) in InitialTenant — cannot be indexed) ─
IF EXISTS (
    SELECT 1 FROM sys.columns c
    INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.JewelleryTags')
      AND c.name = N'EPC'
      AND (t.name = N'nvarchar' AND c.max_length = -1)  -- nvarchar(max)
)
BEGIN
    -- Truncate any oversized values before shrink (EPC is expected ≤ 50 chars)
    UPDATE dbo.JewelleryTags
    SET EPC = LEFT(EPC, 50)
    WHERE EPC IS NOT NULL AND LEN(EPC) > 50;

    ALTER TABLE dbo.JewelleryTags ALTER COLUMN EPC NVARCHAR(50) NULL;
    PRINT N'Altered JewelleryTags.EPC to NVARCHAR(50)';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_JewelleryTags_EPC' AND object_id = OBJECT_ID(N'dbo.JewelleryTags')
)
BEGIN
    -- Ensure indexable type even if already NVARCHAR but oversized
    IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.JewelleryTags') AND name = N'EPC' AND max_length > 100
    )
    BEGIN
        UPDATE dbo.JewelleryTags SET EPC = LEFT(EPC, 50) WHERE EPC IS NOT NULL AND LEN(EPC) > 50;
        ALTER TABLE dbo.JewelleryTags ALTER COLUMN EPC NVARCHAR(50) NULL;
    END

    CREATE UNIQUE NONCLUSTERED INDEX IX_JewelleryTags_EPC
        ON dbo.JewelleryTags (EPC)
        WHERE EPC IS NOT NULL;
    PRINT N'Created IX_JewelleryTags_EPC';
END
ELSE
    PRINT N'IX_JewelleryTags_EPC already exists';
GO

-- ── 2) TagValue → BarcodeValue, drop TagType, add QRCodeValue ───────────────
IF COL_LENGTH(N'dbo.JewelleryTags', N'TagValue') IS NOT NULL
   AND COL_LENGTH(N'dbo.JewelleryTags', N'BarcodeValue') IS NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_JewelleryTags_TagValue' AND object_id = OBJECT_ID(N'dbo.JewelleryTags'))
        DROP INDEX IX_JewelleryTags_TagValue ON dbo.JewelleryTags;

    EXEC sp_rename N'dbo.JewelleryTags.TagValue', N'BarcodeValue', N'COLUMN';

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_JewelleryTags_BarcodeValue' AND object_id = OBJECT_ID(N'dbo.JewelleryTags'))
        CREATE UNIQUE NONCLUSTERED INDEX IX_JewelleryTags_BarcodeValue ON dbo.JewelleryTags (BarcodeValue);

    PRINT N'Renamed TagValue → BarcodeValue';
END
ELSE
    PRINT N'BarcodeValue already present (or TagValue absent)';
GO

IF COL_LENGTH(N'dbo.JewelleryTags', N'TagType') IS NOT NULL
BEGIN
    ALTER TABLE dbo.JewelleryTags DROP COLUMN TagType;
    PRINT N'Dropped JewelleryTags.TagType';
END
GO

IF COL_LENGTH(N'dbo.JewelleryTags', N'QRCodeValue') IS NULL
BEGIN
    ALTER TABLE dbo.JewelleryTags ADD QRCodeValue NVARCHAR(200) NULL;
    PRINT N'Added JewelleryTags.QRCodeValue';
END
GO

IF COL_LENGTH(N'dbo.JewelleryTags', N'QRCodeValue') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_JewelleryTags_QRCodeValue' AND object_id = OBJECT_ID(N'dbo.JewelleryTags')
   )
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX IX_JewelleryTags_QRCodeValue
        ON dbo.JewelleryTags (QRCodeValue)
        WHERE QRCodeValue IS NOT NULL;
    PRINT N'Created IX_JewelleryTags_QRCodeValue';
END
GO

-- Ensure BarcodeValue unique index exists
IF COL_LENGTH(N'dbo.JewelleryTags', N'BarcodeValue') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_JewelleryTags_BarcodeValue' AND object_id = OBJECT_ID(N'dbo.JewelleryTags')
   )
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX IX_JewelleryTags_BarcodeValue ON dbo.JewelleryTags (BarcodeValue);
    PRINT N'Created IX_JewelleryTags_BarcodeValue';
END
GO

-- ── 3) EPCHex ───────────────────────────────────────────────────────────────
IF COL_LENGTH(N'dbo.JewelleryTags', N'EPCHex') IS NULL
BEGIN
    ALTER TABLE dbo.JewelleryTags ADD EPCHex NVARCHAR(100) NULL;
    PRINT N'Added JewelleryTags.EPCHex';
END
GO

UPDATE dbo.JewelleryTags
SET EPCHex = CONVERT(VARCHAR(100), CONVERT(VARBINARY(50), CAST(EPC AS VARCHAR(50))), 2)
WHERE EPC IS NOT NULL
  AND (EPCHex IS NULL OR EPCHex = N'');
PRINT N'EPCHex backfill applied';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_JewelleryTags_EPCHex' AND object_id = OBJECT_ID(N'dbo.JewelleryTags')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX IX_JewelleryTags_EPCHex
        ON dbo.JewelleryTags (EPCHex)
        WHERE EPCHex IS NOT NULL;
    PRINT N'Created IX_JewelleryTags_EPCHex';
END
GO

-- ── 4) IsSold / SoldAt on JewelleryItems ───────────────────────────────────
IF OBJECT_ID(N'dbo.JewelleryItems', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.JewelleryItems', N'IsSold') IS NULL
BEGIN
    ALTER TABLE dbo.JewelleryItems ADD IsSold BIT NOT NULL CONSTRAINT DF_JewelleryItems_IsSold DEFAULT (0);
    PRINT N'Added JewelleryItems.IsSold';
END
GO

IF OBJECT_ID(N'dbo.JewelleryItems', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.JewelleryItems', N'SoldAt') IS NULL
BEGIN
    ALTER TABLE dbo.JewelleryItems ADD SoldAt DATETIME2 NULL;
    PRINT N'Added JewelleryItems.SoldAt';
END
GO

-- ── 5) Inventory audit tables ───────────────────────────────────────────────
IF OBJECT_ID(N'dbo.InventoryAudits', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.InventoryAudits
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_InventoryAudits PRIMARY KEY,
        StartedAt DATETIME2 NOT NULL,
        CompletedAt DATETIME2 NULL,
        Status INT NOT NULL,
        StartedBy NVARCHAR(200) NOT NULL,
        Notes NVARCHAR(1000) NULL,
        ExpectedCount INT NOT NULL CONSTRAINT DF_InventoryAudits_ExpectedCount DEFAULT (0),
        ScannedCount INT NOT NULL CONSTRAINT DF_InventoryAudits_ScannedCount DEFAULT (0),
        MatchedCount INT NOT NULL CONSTRAINT DF_InventoryAudits_MatchedCount DEFAULT (0),
        MissingCount INT NOT NULL CONSTRAINT DF_InventoryAudits_MissingCount DEFAULT (0),
        ExtraCount INT NOT NULL CONSTRAINT DF_InventoryAudits_ExtraCount DEFAULT (0),
        SoldSkippedCount INT NOT NULL CONSTRAINT DF_InventoryAudits_SoldSkippedCount DEFAULT (0)
    );
    PRINT N'Created dbo.InventoryAudits';
END
ELSE
    PRINT N'dbo.InventoryAudits already exists';
GO

IF OBJECT_ID(N'dbo.InventoryAuditScans', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.InventoryAuditScans
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_InventoryAuditScans PRIMARY KEY,
        AuditId UNIQUEIDENTIFIER NOT NULL,
        EPCHex NVARCHAR(100) NOT NULL,
        TagId UNIQUEIDENTIFIER NULL,
        ItemId UNIQUEIDENTIFIER NULL,
        Outcome INT NOT NULL,
        ScannedAt DATETIME2 NOT NULL,
        CONSTRAINT FK_InventoryAuditScans_InventoryAudits_AuditId
            FOREIGN KEY (AuditId) REFERENCES dbo.InventoryAudits (Id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IX_InventoryAuditScans_AuditId_EPCHex
        ON dbo.InventoryAuditScans (AuditId, EPCHex);

    PRINT N'Created dbo.InventoryAuditScans';
END
ELSE
    PRINT N'dbo.InventoryAuditScans already exists';
GO

IF OBJECT_ID(N'dbo.InventoryAuditMissing', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.InventoryAuditMissing
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_InventoryAuditMissing PRIMARY KEY,
        AuditId UNIQUEIDENTIFIER NOT NULL,
        TagId UNIQUEIDENTIFIER NOT NULL,
        ItemId UNIQUEIDENTIFIER NULL,
        BarcodeValue NVARCHAR(200) NULL,
        EPCHex NVARCHAR(100) NULL,
        Reason NVARCHAR(50) NOT NULL,
        CONSTRAINT FK_InventoryAuditMissing_InventoryAudits_AuditId
            FOREIGN KEY (AuditId) REFERENCES dbo.InventoryAudits (Id) ON DELETE CASCADE
    );

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_InventoryAuditMissing_AuditId' AND object_id = OBJECT_ID(N'dbo.InventoryAuditMissing')
    )
        CREATE INDEX IX_InventoryAuditMissing_AuditId ON dbo.InventoryAuditMissing (AuditId);

    PRINT N'Created dbo.InventoryAuditMissing';
END
ELSE
    PRINT N'dbo.InventoryAuditMissing already exists';
GO

-- ── 6) ReferenceNumber on JewelleryTags ──────────────────────────────────────
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

-- ── 7) Item media (images/videos) ────────────────────────────────────────────
IF OBJECT_ID(N'dbo.ItemMedia', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ItemMedia
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ItemMedia PRIMARY KEY,
        JewelleryItemId UNIQUEIDENTIFIER NOT NULL,
        FileName NVARCHAR(300) NOT NULL,
        ContentType NVARCHAR(100) NOT NULL,
        MediaType INT NOT NULL,
        StoragePath NVARCHAR(500) NOT NULL,
        FileSizeBytes BIGINT NOT NULL,
        SortOrder INT NOT NULL,
        IsPrimary BIT NOT NULL,
        Embedding VARBINARY(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL,
        UpdatedAt DATETIME2 NULL,
        CreatedBy NVARCHAR(MAX) NOT NULL,
        UpdatedBy NVARCHAR(MAX) NULL,
        IsActive BIT NOT NULL,
        IsDeleted BIT NOT NULL,
        DeletedAt DATETIME2 NULL,
        DeletedBy NVARCHAR(MAX) NULL,
        CONSTRAINT FK_ItemMedia_JewelleryItems_JewelleryItemId
            FOREIGN KEY (JewelleryItemId) REFERENCES dbo.JewelleryItems (Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_ItemMedia_JewelleryItemId ON dbo.ItemMedia (JewelleryItemId);
    PRINT N'Created dbo.ItemMedia';
END
ELSE
    PRINT N'dbo.ItemMedia already exists';
GO

-- ── 8) Mark EF tenant migrations applied (optional / recommended) ───────────
IF OBJECT_ID(N'dbo.__EFMigrationsHistory_Tenant', N'U') IS NOT NULL
BEGIN
    ;WITH Migs AS (
        SELECT * FROM (VALUES
            (N'20260724122928_AllowUnmappedJewelleryTags', N'10.0.9'),
            (N'20260724150323_JewelleryTags_BarcodeQrEpc', N'10.0.9'),
            (N'20260724152756_JewelleryTags_Add_EPCHex', N'10.0.9'),
            (N'20260724154957_JewelleryItem_IsSold_And_InventoryAudits', N'10.0.9'),
            (N'20260726062210_JewelleryTags_Add_ReferenceNumber', N'10.0.9'),
            (N'20260804171516_ItemMedia_Table', N'10.0.9')
        ) AS v(MigrationId, ProductVersion)
    )
    INSERT INTO dbo.__EFMigrationsHistory_Tenant (MigrationId, ProductVersion)
    SELECT m.MigrationId, m.ProductVersion
    FROM Migs m
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.__EFMigrationsHistory_Tenant h WHERE h.MigrationId = m.MigrationId
    );

    PRINT N'EF migration history rows ensured (__EFMigrationsHistory_Tenant)';
END
ELSE
    PRINT N'__EFMigrationsHistory_Tenant not found — skip history insert (OK if you only use SQL scripts)';
GO

PRINT N'=== Jewellery tenant DB update finished ===';
GO
