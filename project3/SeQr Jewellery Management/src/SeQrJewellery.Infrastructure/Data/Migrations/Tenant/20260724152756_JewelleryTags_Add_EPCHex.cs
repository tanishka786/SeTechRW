using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeQrJewellery.Infrastructure.Data.Migrations.Tenant
{
    /// <inheritdoc />
    public partial class JewelleryTags_Add_EPCHex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EPCHex",
                table: "JewelleryTags",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            // Backfill hex of EPC (UTF-8/ASCII bytes → hex), matches EpcEncoding.ToHex
            migrationBuilder.Sql("""
                UPDATE dbo.JewelleryTags
                SET EPCHex = CONVERT(VARCHAR(100), CONVERT(VARBINARY(50), CAST(EPC AS VARCHAR(50))), 2)
                WHERE EPC IS NOT NULL AND (EPCHex IS NULL OR EPCHex = N'');
                """);

            migrationBuilder.CreateIndex(
                name: "IX_JewelleryTags_EPCHex",
                table: "JewelleryTags",
                column: "EPCHex",
                unique: true,
                filter: "[EPCHex] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JewelleryTags_EPCHex",
                table: "JewelleryTags");

            migrationBuilder.DropColumn(
                name: "EPCHex",
                table: "JewelleryTags");
        }
    }
}
