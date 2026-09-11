-- Inventory audit tables used by SeQr Scan Service jewellery module
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
END
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
END
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
END
GO
