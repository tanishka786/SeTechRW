using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeQrJewellery.Infrastructure.Data.Migrations.Tenant
{
    [DbContext(typeof(TenantDbContext))]
    [Migration("20260911161000_JewelleryItemStoneSpecs")]
    public partial class JewelleryItemStoneSpecs : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "StoneCarat",
                table: "JewelleryItems",
                type: "decimal(8,3)",
                precision: 8,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StoneCut",
                table: "JewelleryItems",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StoneClarity",
                table: "JewelleryItems",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StoneColor",
                table: "JewelleryItems",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CertificateLab",
                table: "JewelleryItems",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE JewelleryItems
                SET StoneCarat = 0.500, StoneCut = N'Excellent', StoneClarity = N'VS1', StoneColor = N'F', CertificateLab = N'IGI'
                WHERE CertificateNumber = N'IGI-2024-1234567' AND StoneCarat IS NULL
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "StoneCarat", table: "JewelleryItems");
            migrationBuilder.DropColumn(name: "StoneCut", table: "JewelleryItems");
            migrationBuilder.DropColumn(name: "StoneClarity", table: "JewelleryItems");
            migrationBuilder.DropColumn(name: "StoneColor", table: "JewelleryItems");
            migrationBuilder.DropColumn(name: "CertificateLab", table: "JewelleryItems");
        }
    }
}
