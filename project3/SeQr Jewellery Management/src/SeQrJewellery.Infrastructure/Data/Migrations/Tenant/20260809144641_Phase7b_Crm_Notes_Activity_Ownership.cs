using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeQrJewellery.Infrastructure.Data.Migrations.Tenant
{
    /// <inheritdoc />
    public partial class Phase7b_Crm_Notes_Activity_Ownership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssignedToUserId",
                table: "Leads",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AssignedToUserName",
                table: "Leads",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Occasion",
                table: "Leads",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "LeadFollowUps",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByUserName",
                table: "LeadFollowUps",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LeadActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LeadId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActivityType = table.Column<int>(type: "int", nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Details = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PerformedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PerformedByUserName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeadActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeadActivities_Leads_LeadId",
                        column: x => x.LeadId,
                        principalTable: "Leads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LeadNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LeadId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedByUserName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsPinned = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeadNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeadNotes_Leads_LeadId",
                        column: x => x.LeadId,
                        principalTable: "Leads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Leads_AssignedToUserId",
                table: "Leads",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LeadFollowUps_ScheduledAt",
                table: "LeadFollowUps",
                column: "ScheduledAt");

            migrationBuilder.CreateIndex(
                name: "IX_LeadActivities_LeadId",
                table: "LeadActivities",
                column: "LeadId");

            migrationBuilder.CreateIndex(
                name: "IX_LeadActivities_OccurredAt",
                table: "LeadActivities",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_LeadNotes_LeadId",
                table: "LeadNotes",
                column: "LeadId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LeadActivities");

            migrationBuilder.DropTable(
                name: "LeadNotes");

            migrationBuilder.DropIndex(
                name: "IX_Leads_AssignedToUserId",
                table: "Leads");

            migrationBuilder.DropIndex(
                name: "IX_LeadFollowUps_ScheduledAt",
                table: "LeadFollowUps");

            migrationBuilder.DropColumn(
                name: "AssignedToUserId",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "AssignedToUserName",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "Occasion",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "LeadFollowUps");

            migrationBuilder.DropColumn(
                name: "CreatedByUserName",
                table: "LeadFollowUps");
        }
    }
}
