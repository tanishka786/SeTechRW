/*
  Fix for Msg 1919: EPC was nvarchar(max) and cannot be an index key.
  Run on Jewellery tenant DB if IX_JewelleryTags_EPC was skipped during Update_Current.
*/
SET NOCOUNT ON;

IF EXISTS (
    SELECT 1 FROM sys.columns c
    INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.JewelleryTags')
      AND c.name = N'EPC'
      AND t.name = N'nvarchar'
      AND (c.max_length = -1 OR c.max_length > 100)
)
BEGIN
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
    CREATE UNIQUE NONCLUSTERED INDEX IX_JewelleryTags_EPC
        ON dbo.JewelleryTags (EPC)
        WHERE EPC IS NOT NULL;
    PRINT N'Created IX_JewelleryTags_EPC';
END
ELSE
    PRINT N'IX_JewelleryTags_EPC already exists';
GO
