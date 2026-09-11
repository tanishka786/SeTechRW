using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeQrJewellery.Infrastructure.Data.Migrations.Tenant
{
    /// <inheritdoc />
    public partial class AllowUnmappedJewelleryTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JewelleryTags_JewelleryItems_JewelleryItemId",
                table: "JewelleryTags");

            migrationBuilder.AlterColumn<Guid>(
                name: "JewelleryItemId",
                table: "JewelleryTags",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<string>(
                name: "EPC",
                table: "JewelleryTags",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_JewelleryTags_EPC",
                table: "JewelleryTags",
                column: "EPC",
                unique: true,
                filter: "[EPC] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_JewelleryTags_JewelleryItems_JewelleryItemId",
                table: "JewelleryTags",
                column: "JewelleryItemId",
                principalTable: "JewelleryItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JewelleryTags_JewelleryItems_JewelleryItemId",
                table: "JewelleryTags");

            migrationBuilder.DropIndex(
                name: "IX_JewelleryTags_EPC",
                table: "JewelleryTags");

            migrationBuilder.AlterColumn<Guid>(
                name: "JewelleryItemId",
                table: "JewelleryTags",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "EPC",
                table: "JewelleryTags",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_JewelleryTags_JewelleryItems_JewelleryItemId",
                table: "JewelleryTags",
                column: "JewelleryItemId",
                principalTable: "JewelleryItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
