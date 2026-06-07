namespace SkyWeb.Api.DTOs.Health;

public sealed record HealthResponse(
    bool Ok,
    string Service,
    string Timestamp,
    string? Database = null,
    string? Error = null
);
