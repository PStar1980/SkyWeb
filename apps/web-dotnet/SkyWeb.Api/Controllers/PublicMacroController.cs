using Microsoft.AspNetCore.Mvc;
using SkyWeb.Api.Services;

namespace SkyWeb.Api.Controllers;

[ApiController]
[Route("api/public/macro")]
public sealed class PublicMacroController : ControllerBase
{
    private readonly PublicMacroService _publicMacroService;

    public PublicMacroController(PublicMacroService publicMacroService)
    {
        _publicMacroService = publicMacroService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var payload = await _publicMacroService.GetPublicMacroSummaryAsync();
        return Ok(MergeOk(payload));
    }

    [HttpGet("views")]
    public async Task<IActionResult> ListViews()
    {
        var payload = await _publicMacroService.ListPublicMacroViewsAsync(ToQueryDictionary());
        return Ok(MergeOk(payload));
    }

    [HttpGet("views/{viewKey}/columns")]
    public async Task<IActionResult> GetViewColumns(string viewKey)
    {
        return await HandleServiceCallAsync(async () => MergeOk(await _publicMacroService.GetPublicMacroViewColumnsAsync(viewKey)));
    }

    [HttpGet("views/{viewKey}/latest")]
    public async Task<IActionResult> GetLatestViewRow(string viewKey)
    {
        return await HandleServiceCallAsync(async () => MergeOk(await _publicMacroService.GetLatestPublicMacroViewRowAsync(viewKey)));
    }

    [HttpGet("views/{viewKey}")]
    public async Task<IActionResult> ListViewRows(string viewKey)
    {
        return await HandleServiceCallAsync(async () => MergeOk(await _publicMacroService.ListPublicMacroViewRowsAsync(viewKey, ToQueryDictionary())));
    }

    [HttpGet("indicators")]
    public async Task<IActionResult> ListIndicators()
    {
        var payload = await _publicMacroService.ListPublicMacroIndicatorsAsync(ToQueryDictionary());
        return Ok(MergeOk(payload));
    }

    [HttpGet("indicators/{indicatorCode}/series")]
    public async Task<IActionResult> ListIndicatorSeries(string indicatorCode)
    {
        return await HandleServiceCallAsync(async () => MergeOk(await _publicMacroService.ListPublicMacroIndicatorSeriesAsync(indicatorCode, ToQueryDictionary())));
    }

    [HttpGet("indicators/{indicatorCode}")]
    public async Task<IActionResult> GetIndicator(string indicatorCode)
    {
        return await HandleServiceCallAsync(async () => MergeOk(await _publicMacroService.GetPublicMacroIndicatorAsync(indicatorCode)));
    }

    private Dictionary<string, string?> ToQueryDictionary()
    {
        return Request.Query.ToDictionary(
            entry => entry.Key,
            entry => (string?)entry.Value.ToString(),
            StringComparer.OrdinalIgnoreCase);
    }

    private static Dictionary<string, object?> MergeOk(object payload)
    {
        var result = new Dictionary<string, object?>
        {
            ["ok"] = true
        };

        foreach (var entry in ToObjectDictionary(payload))
        {
            result[entry.Key] = entry.Value;
        }

        return result;
    }

    private async Task<IActionResult> HandleServiceCallAsync(Func<Task<Dictionary<string, object?>>> action)
    {
        try
        {
            return Ok(await action());
        }
        catch (ApiException ex)
        {
            var errorPayload = new Dictionary<string, object?>
            {
                ["ok"] = false,
                ["error"] = ex.Message
            };

            if (ex.Details is not null)
            {
                errorPayload["details"] = ex.Details;
            }

            return StatusCode(ex.StatusCode, errorPayload);
        }
    }

    private static Dictionary<string, object?> ToObjectDictionary(object payload)
    {
        if (payload is IDictionary<string, object> objectDictionary)
        {
            return objectDictionary.ToDictionary(
                entry => entry.Key,
                entry => entry.Value is DBNull ? null : entry.Value,
                StringComparer.OrdinalIgnoreCase);
        }

        return payload.GetType()
            .GetProperties()
            .ToDictionary(
                property => property.Name,
                property =>
                {
                    var value = property.GetValue(payload);
                    return value is DBNull ? null : value;
                },
                StringComparer.OrdinalIgnoreCase);
    }
}
