-- =============================================================================
-- Seed preprinted JewelleryTags (unmapped labels in stock)
-- Run on the TENANT database (e.g. SeQrJewellery_Demo).
-- Prereq: JewelleryTags_AllowUnmapped.sql + JewelleryTags_BarcodeQrEpc.sql + JewelleryTags_Add_EPCHex.sql
-- =============================================================================
DECLARE @LabelCount INT = 100;

-- BarcodeValue sequence prefix (produces SQ1, SQ2, SQ3, …)
DECLARE @Prefix NVARCHAR(10) = N'SQ';

-- =============================================================================
IF @LabelCount IS NULL OR @LabelCount < 1
BEGIN
    RAISERROR(N'@LabelCount must be >= 1', 16, 1);
    RETURN;
END;

DECLARE @StartSeq INT =
(
    SELECT ISNULL(MAX(TRY_CAST(SUBSTRING(BarcodeValue, LEN(@Prefix) + 1, 50) AS INT)), 0)
    FROM dbo.JewelleryTags
    WHERE BarcodeValue LIKE @Prefix + N'[0-9]%'
);

DECLARE @i INT = 1;
DECLARE @seq INT;
DECLARE @barcode NVARCHAR(200);
DECLARE @qr NVARCHAR(200);
DECLARE @epc NVARCHAR(12);
DECLARE @epcHex NVARCHAR(100);
DECLARE @attempts INT;

WHILE @i <= @LabelCount
BEGIN
    SET @seq = @StartSeq + @i;
    SET @barcode = @Prefix + CAST(@seq AS NVARCHAR(20));
    SET @qr = N'QR-' + @barcode;

    IF EXISTS (SELECT 1 FROM dbo.JewelleryTags WHERE BarcodeValue = @barcode)
    BEGIN
        SET @StartSeq = @seq;
    END
    ELSE
    BEGIN
        SET @attempts = 0;
        SET @epc = NULL;
        WHILE @epc IS NULL AND @attempts < 30
        BEGIN
            SET @attempts += 1;
            SET @epc =
                CAST((ABS(CHECKSUM(NEWID())) % 9000) + 1000 AS VARCHAR(4)) +
                CAST((ABS(CHECKSUM(NEWID())) % 9000) + 1000 AS VARCHAR(4)) +
                CAST((ABS(CHECKSUM(NEWID())) % 9000) + 1000 AS VARCHAR(4));

            IF EXISTS (SELECT 1 FROM dbo.JewelleryTags WHERE EPC = @epc)
                SET @epc = NULL;
        END;

        IF @epc IS NULL
        BEGIN
            RAISERROR(N'Could not generate unique 12-digit EPC after retries.', 16, 1);
            RETURN;
        END;

        -- UTF-8/ASCII hex of EPC (matches Domain.Helpers.EpcEncoding.ToHex)
        SET @epcHex = CONVERT(VARCHAR(100), CONVERT(VARBINARY(50), CAST(@epc AS VARCHAR(50))), 2);

        INSERT INTO dbo.JewelleryTags
        (
            Id,
            JewelleryItemId,
            BarcodeValue,
            QRCodeValue,
            EPC,
            EPCHex,
            TID,
            IsPrimary,
            IsActive,
            PrintCount,
            CreatedAt,
            CreatedBy,
            IsDeleted
        )
        VALUES
        (
            NEWID(),
            NULL,
            @barcode,          -- SQ1, SQ2, …
            @qr,               -- QR-SQ1, …
            @epc,              -- 12-digit unique RFID token
            @epcHex,           -- hex-encoded EPC
            NULL,
            0,
            1,
            0,
            SYSUTCDATETIME(),
            N'seed-script',
            0
        );

        SET @i += 1;
    END
END;

PRINT CONCAT(N'Inserted ', @LabelCount, N' preprinted tags starting after sequence ', @StartSeq, N'.');

SELECT TOP (@LabelCount)
    BarcodeValue, QRCodeValue, EPC, EPCHex, JewelleryItemId, IsActive, CreatedAt
FROM dbo.JewelleryTags
WHERE BarcodeValue LIKE @Prefix + N'[0-9]%'
ORDER BY TRY_CAST(SUBSTRING(BarcodeValue, LEN(@Prefix) + 1, 50) AS INT) DESC;
