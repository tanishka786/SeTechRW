using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeQrJewellery.Infrastructure.Data.Migrations.Tenant
{
    /// <inheritdoc />
    public partial class JewelleryTags_BarcodeQrEpc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TagType",
                table: "JewelleryTags");

            migrationBuilder.RenameColumn(
                name: "TagValue",
                table: "JewelleryTags",
                newName: "BarcodeValue");

            migrationBuilder.RenameIndex(
                name: "IX_JewelleryTags_TagValue",
                table: "JewelleryTags",
                newName: "IX_JewelleryTags_BarcodeValue");

            migrationBuilder.AddColumn<string>(
                name: "QRCodeValue",
                table: "JewelleryTags",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_JewelleryTags_QRCodeValue",
                table: "JewelleryTags",
                column: "QRCodeValue",
                unique: true,
                filter: "[QRCodeValue] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JewelleryTags_QRCodeValue",
                table: "JewelleryTags");

            migrationBuilder.DropColumn(
                name: "QRCodeValue",
                table: "JewelleryTags");

            migrationBuilder.RenameColumn(
                name: "BarcodeValue",
                table: "JewelleryTags",
                newName: "TagValue");

            migrationBuilder.RenameIndex(
                name: "IX_JewelleryTags_BarcodeValue",
                table: "JewelleryTags",
                newName: "IX_JewelleryTags_TagValue");

            migrationBuilder.AddColumn<int>(
                name: "TagType",
                table: "JewelleryTags",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
