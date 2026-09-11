using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeQrJewellery.Infrastructure.Data.Migrations.Tenant
{
    /// <inheritdoc />
    public partial class JewelleryTags_Add_ReferenceNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "ReferenceNumber",
                table: "JewelleryTags",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_JewelleryTags_ReferenceNumber",
                table: "JewelleryTags",
                column: "ReferenceNumber",
                unique: true,
                filter: "[ReferenceNumber] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JewelleryTags_ReferenceNumber",
                table: "JewelleryTags");

            migrationBuilder.DropColumn(
                name: "ReferenceNumber",
                table: "JewelleryTags");
        }
    }
}
