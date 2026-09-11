using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class LabelTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TagType TagType { get; set; } = TagType.Barcode;
    public LabelSize LabelSize { get; set; } = LabelSize.Small;
    public decimal LabelWidthMm { get; set; } = 38;
    public decimal LabelHeightMm { get; set; } = 25;
    public string BartenderTemplateName { get; set; } = string.Empty; // .btw file name
    public string? FieldMappings { get; set; } // JSON mapping of item fields to template fields
    public bool IsDefault { get; set; } = false;
    public string? PreviewImageUrl { get; set; }
}
