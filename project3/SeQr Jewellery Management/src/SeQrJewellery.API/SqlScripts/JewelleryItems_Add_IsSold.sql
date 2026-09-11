-- JewelleryItems: sold flag for Scan Service inventory audits
IF COL_LENGTH(N'dbo.JewelleryItems', N'IsSold') IS NULL
BEGIN
    ALTER TABLE dbo.JewelleryItems ADD IsSold BIT NOT NULL CONSTRAINT DF_JewelleryItems_IsSold DEFAULT (0);
END
GO

IF COL_LENGTH(N'dbo.JewelleryItems', N'SoldAt') IS NULL
BEGIN
    ALTER TABLE dbo.JewelleryItems ADD SoldAt DATETIME2 NULL;
END
GO
