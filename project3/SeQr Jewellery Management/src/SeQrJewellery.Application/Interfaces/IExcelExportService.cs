namespace SeQrJewellery.Application.Interfaces;

public interface IExcelExportService
{
    /// <summary>
    /// Builds a single-sheet .xlsx workbook from headers + row data and returns the raw file bytes.
    /// </summary>
    byte[] Export(string sheetName, IReadOnlyList<string> headers, IEnumerable<IReadOnlyList<object?>> rows);
}
