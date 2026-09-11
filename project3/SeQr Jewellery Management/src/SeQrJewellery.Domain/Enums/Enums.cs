namespace SeQrJewellery.Domain.Enums;

public enum TagType
{
    Barcode = 1,
    RFID = 2,
    QRCode = 3
}

public enum MediaType
{
    Image = 1,
    Video = 2,
    Document = 3
}

public enum PrintStatus
{
    Pending = 1,
    Printing = 2,
    Completed = 3,
    Failed = 4,
    Cancelled = 5
}

public enum InvoiceType
{
    Sale = 1,
    Purchase = 2,
    Return = 3,
    Consignment = 4,
    Repair = 5
}

public enum InvoiceStatus
{
    Draft = 1,
    Confirmed = 2,
    PartiallyPaid = 3,
    Paid = 4,
    Cancelled = 5,
    Refunded = 6
}

public enum PaymentMethod
{
    Cash = 1,
    Card = 2,
    BankTransfer = 3,
    Cheque = 4,
    GoldExchange = 5,
    OldJewellery = 6,
    UPI = 7,
    CryptoCurrency = 8,
    Other = 9
}

public enum StockMovementType
{
    Purchase = 1,
    Sale = 2,
    Return = 3,
    Transfer = 4,
    Adjustment = 5,
    RepairIn = 6,
    RepairOut = 7,
    ConsignmentIn = 8,
    ConsignmentOut = 9,
    Opening = 10
}

public enum MetalType
{
    Gold = 1,
    Silver = 2,
    Platinum = 3,
    Palladium = 4,
    Diamond = 5,
    Other = 6
}

public enum RepairStatus
{
    Received = 1,
    InProgress = 2,
    ReadyForPickup = 3,
    Delivered = 4,
    Cancelled = 5,
    OnHold = 6
}

public enum TenantStatus
{
    Active = 1,
    Suspended = 2,
    Trial = 3,
    Expired = 4,
    Cancelled = 5
}

public enum TenantPlan
{
    Free = 1,
    Basic = 2,
    Professional = 3,
    Enterprise = 4
}

public enum RFIDReaderManufacturer
{
    Zebra = 1,
    Impinj = 2,
    Honeywell = 3,
    Alien = 4,
    Nordic = 5,
    ThingMagic = 6,
    Other = 7
}

public enum RFIDConnectionType
{
    USB = 1,
    Ethernet = 2,
    WiFi = 3,
    Bluetooth = 4,
    Serial = 5
}

public enum CustomerType
{
    Retail = 1,
    Wholesale = 2,
    Corporate = 3,
    VIP = 4
}

public enum GenderType
{
    Male = 1,
    Female = 2,
    Other = 3,
    PreferNotToSay = 4
}

public enum LabelSize
{
    Small = 1,
    Medium = 2,
    Large = 3,
    Custom = 4
}

public enum ReportType
{
    SalesReport = 1,
    InventoryReport = 2,
    CustomerReport = 3,
    AuditReport = 4,
    ProfitLossReport = 5,
    StockValuationReport = 6,
    RepairReport = 7,
    AgingReport = 8
}

public enum UserRole
{
    SuperAdmin = 1,
    TenantAdmin = 2,
    Manager = 3,
    Staff = 4,
    ReadOnly = 5
}

/// <summary>
/// How making charges are calculated for a jewellery item.
/// Lumpsum = fixed ₹ amount; PercentOfMetalRate = % of metal value;
/// PerGramAmount = ₹ amount × net weight (grams).
/// </summary>
public enum MakingChargeType
{
    Lumpsum = 1,
    PercentOfMetalRate = 2,
    PerGramAmount = 3
}

public enum LeadSource
{
    WalkIn = 1,
    Referral = 2,
    Online = 3,
    Phone = 4,
    SocialMedia = 5,
    Other = 6
}

public enum LeadStatus
{
    New = 1,
    Contacted = 2,
    Interested = 3,
    Negotiating = 4,
    Won = 5,
    Lost = 6
}

public enum FollowUpType
{
    Call = 1,
    Visit = 2,
    WhatsApp = 3,
    Email = 4,
    Other = 5
}

public enum LeadActivityType
{
    Created = 1,
    StatusChanged = 2,
    Assigned = 3,
    NoteAdded = 4,
    FollowUpScheduled = 5,
    FollowUpCompleted = 6,
    Converted = 7,
    Updated = 8,
    Deleted = 9
}

public enum AppModule
{
    Dashboard = 1,
    Inventory = 2,
    Invoices = 3,
    Customers = 4,
    Crm = 5,
    Repairs = 6,
    Reports = 7,
    RateHistory = 8,
    PrintQueue = 9,
    Social = 10,
    Settings = 11,
    Users = 12,
    Scan = 13,
    AuditReports = 14
}

[Flags]
public enum PermissionAction
{
    None = 0,
    View = 1,
    Create = 2,
    Edit = 4,
    Delete = 8,
    /// <summary>Module-admin: e.g. CRM Sales Admin can view/reassign all users' leads.</summary>
    Manage = 16,
    All = View | Create | Edit | Delete | Manage
}

public enum SocialPlatform
{
    Google = 1,
    Instagram = 2,
    Facebook = 3
}

public enum SocialPostStatus
{
    Draft = 1,
    Queued = 2,
    Published = 3,
    Failed = 4
}

public enum PaymentGatewayStatus
{
    Created = 1,
    Attempted = 2,
    Paid = 3,
    Failed = 4,
    Cancelled = 5
}

public enum InvoicePaperSize
{
    A4 = 1,
    A5 = 2,
    Letter = 3
}
