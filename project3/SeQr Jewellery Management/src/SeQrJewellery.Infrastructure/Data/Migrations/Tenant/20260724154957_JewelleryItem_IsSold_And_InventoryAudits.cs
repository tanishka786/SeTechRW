using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeQrJewellery.Infrastructure.Data.Migrations.Tenant
{
    /// <inheritdoc />
    public partial class JewelleryItem_IsSold_And_InventoryAudits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: columns/tables may already exist from SqlScripts/*.sql
            migrationBuilder.Sql(@"
IF COL_LENGTH(N'dbo.JewelleryItems', N'IsSold') IS NULL
    ALTER TABLE dbo.JewelleryItems ADD IsSold BIT NOT NULL CONSTRAINT DF_JewelleryItems_IsSold DEFAULT (0);

IF COL_LENGTH(N'dbo.JewelleryItems', N'SoldAt') IS NULL
    ALTER TABLE dbo.JewelleryItems ADD SoldAt DATETIME2 NULL;

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
        ExpectedCount INT NOT NULL,
        ScannedCount INT NOT NULL,
        MatchedCount INT NOT NULL,
        MissingCount INT NOT NULL,
        ExtraCount INT NOT NULL,
        SoldSkippedCount INT NOT NULL
    );
END

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
    CREATE INDEX IX_InventoryAuditMissing_AuditId ON dbo.InventoryAuditMissing (AuditId);
END

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
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.InventoryAuditMissing', N'U') IS NOT NULL DROP TABLE dbo.InventoryAuditMissing;
IF OBJECT_ID(N'dbo.InventoryAuditScans', N'U') IS NOT NULL DROP TABLE dbo.InventoryAuditScans;
IF OBJECT_ID(N'dbo.InventoryAudits', N'U') IS NOT NULL DROP TABLE dbo.InventoryAudits;

IF COL_LENGTH(N'dbo.JewelleryItems', N'SoldAt') IS NOT NULL
    ALTER TABLE dbo.JewelleryItems DROP COLUMN SoldAt;

IF COL_LENGTH(N'dbo.JewelleryItems', N'IsSold') IS NOT NULL
BEGIN
    DECLARE @df sysname =
        (SELECT dc.name FROM sys.default_constraints dc
         INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
         WHERE dc.parent_object_id = OBJECT_ID(N'dbo.JewelleryItems') AND c.name = N'IsSold');
    IF @df IS NOT NULL EXEC(N'ALTER TABLE dbo.JewelleryItems DROP CONSTRAINT [' + @df + N']');
    ALTER TABLE dbo.JewelleryItems DROP COLUMN IsSold;
END
");
        }
    }
}
