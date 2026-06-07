namespace SkyWeb.Api.Models.Macro;

public sealed record MacroViewDefinition(
    string ViewKey,
    string SchemaName,
    string ViewName,
    string Label,
    string Region,
    string Category,
    string Description);
