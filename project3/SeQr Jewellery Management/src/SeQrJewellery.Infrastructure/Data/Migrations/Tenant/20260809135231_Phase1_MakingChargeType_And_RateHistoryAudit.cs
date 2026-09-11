using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeQrJewellery.Infrastructure.Data.Migrations.Tenant
{
    /// <inheritdoc />
    public partial class Phase1_MakingChargeType_And_RateHistoryAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ItemsRepriced",
                table: "MetalRates",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "PreviousRate",
                table: "MetalRates",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByUserId",
                table: "MetalRates",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedByUserName",
                table: "MetalRates",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "MakingChargesPercent",
                table: "JewelleryItems",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AddColumn<int>(
                name: "MakingChargeType",
                table: "JewelleryItems",
                type: "int",
                nullable: false,
                defaultValue: 1); // MakingChargeType.Lumpsum

            migrationBuilder.AddColumn<decimal>(
                name: "MakingChargeValue",
                table: "JewelleryItems",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            // Backfill: percent mode when MakingChargesPercent > 0, else lumpsum from MakingCharges
            migrationBuilder.Sql("""
                UPDATE JewelleryItems
                SET MakingChargeType = CASE WHEN MakingChargesPercent > 0 THEN 2 ELSE 1 END,
                    MakingChargeValue = CASE
                        WHEN MakingChargesPercent > 0 THEN MakingChargesPercent
                        ELSE MakingCharges
                    END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ItemsRepriced",
                table: "MetalRates");

            migrationBuilder.DropColumn(
                name: "PreviousRate",
                table: "MetalRates");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "MetalRates");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserName",
                table: "MetalRates");

            migrationBuilder.DropColumn(
                name: "MakingChargeType",
                table: "JewelleryItems");

            migrationBuilder.DropColumn(
                name: "MakingChargeValue",
                table: "JewelleryItems");

            migrationBuilder.AlterColumn<decimal>(
                name: "MakingChargesPercent",
                table: "JewelleryItems",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4);
        }
    }
}
