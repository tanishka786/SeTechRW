-- Item media (images/videos) attached to jewellery items. Idempotent.
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
