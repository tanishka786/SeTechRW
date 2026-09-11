using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeQrJewellery.Infrastructure.Data.Migrations.Tenant
{
    /// <inheritdoc />
    public partial class InvoiceTemplateCustomization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccentColorHex",
                table: "InvoiceSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "#FEF3C7");

            migrationBuilder.AddColumn<float>(
                name: "FontSizePt",
                table: "InvoiceSettings",
                type: "real",
                nullable: false,
                defaultValue: 9f);

            migrationBuilder.AddColumn<string>(
                name: "FooterNote",
                table: "InvoiceSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LogoHeightMm",
                table: "InvoiceSettings",
                type: "int",
                nullable: false,
                defaultValue: 18);

            migrationBuilder.AddColumn<int>(
                name: "MarginMm",
                table: "InvoiceSettings",
                type: "int",
                nullable: false,
                defaultValue: 12);

            migrationBuilder.AddColumn<int>(
                name: "PaperSize",
                table: "InvoiceSettings",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryColorHex",
                table: "InvoiceSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "#B45309");

            migrationBuilder.AddColumn<bool>(
                name: "ShowBankDetails",
                table: "InvoiceSettings",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowLogo",
                table: "InvoiceSettings",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowPaymentHistory",
                table: "InvoiceSettings",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowTagline",
                table: "InvoiceSettings",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Tagline",
                table: "InvoiceSettings",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccentColorHex",
                table: "InvoiceSettings");

            migrationBuilder.DropColumn(
                name: "FontSizePt",
                table: "InvoiceSettings");

            migrationBuilder.DropColumn(
                name: "FooterNote",
                table: "InvoiceSettings");

            migrationBuilder.DropColumn(
                name: "LogoHeightMm",
                table: "InvoiceSettings");

            migrationBuilder.DropColumn(
                name: "MarginMm",
                table: "InvoiceSettings");

            migrationBuilder.DropColumn(
                name: "PaperSize",
                table: "InvoiceSettings");

            migrationBuilder.DropColumn(
                name: "PrimaryColorHex",
                table: "InvoiceSettings");

            migrationBuilder.DropColumn(
                name: "ShowBankDetails",
                table: "InvoiceSettings");

            migrationBuilder.DropColumn(
                name: "ShowLogo",
                table: "InvoiceSettings");

            migrationBuilder.DropColumn(
                name: "ShowPaymentHistory",
                table: "InvoiceSettings");

            migrationBuilder.DropColumn(
                name: "ShowTagline",
                table: "InvoiceSettings");

            migrationBuilder.DropColumn(
                name: "Tagline",
                table: "InvoiceSettings");
        }
    }
}
