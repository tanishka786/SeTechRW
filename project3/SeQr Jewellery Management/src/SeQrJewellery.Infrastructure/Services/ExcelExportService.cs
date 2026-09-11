using ClosedXML.Excel;
using SeQrJewellery.Application.Interfaces;

namespace SeQrJewellery.Infrastructure.Services;

public class ExcelExportService : IExcelExportService
{
    public byte[] Export(string sheetName, IReadOnlyList<string> headers, IEnumerable<IReadOnlyList<object?>> rows)
    {
        using var workbook = new XLWorkbook();
        var safeSheetName = string.IsNullOrWhiteSpace(sheetName) ? "Sheet1" : sheetName;
        if (safeSheetName.Length > 31) safeSheetName = safeSheetName[..31];
        var sheet = workbook.Worksheets.Add(safeSheetName);

        for (var c = 0; c < headers.Count; c++)
        {
            var cell = sheet.Cell(1, c + 1);
            cell.Value = headers[c];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FEF3C7");
            cell.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
        }

        var rowIndex = 2;
        foreach (var row in rows)
        {
            for (var c = 0; c < row.Count; c++)
            {
                var cell = sheet.Cell(rowIndex, c + 1);
                SetCellValue(cell, row[c]);
            }
            rowIndex++;
        }

        if (headers.Count > 0 && rowIndex > 1)
        {
            sheet.Range(1, 1, rowIndex - 1, headers.Count).SetAutoFilter();
        }
        sheet.Columns().AdjustToContents();
        sheet.SheetView.FreezeRows(1);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void SetCellValue(IXLCell cell, object? value)
    {
        switch (value)
        {
            case null:
                cell.Value = string.Empty;
                break;
            case DateTime dt:
                cell.Value = dt;
                cell.Style.DateFormat.Format = "dd/MM/yyyy";
                break;
            case decimal dec:
                cell.Value = dec;
                cell.Style.NumberFormat.Format = "#,##0.00";
                break;
            case double dbl:
                cell.Value = dbl;
                cell.Style.NumberFormat.Format = "#,##0.00";
                break;
            case int i:
                cell.Value = i;
                break;
            case long l:
                cell.Value = l;
                break;
            case bool b:
                cell.Value = b ? "Yes" : "No";
                break;
            default:
                cell.Value = value.ToString() ?? string.Empty;
                break;
        }
    }
}
