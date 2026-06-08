using Microsoft.AspNetCore.Mvc;
using SkyWeb.Api.Services;

namespace SkyWeb.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class SkyServerProxyController : ControllerBase
{
    private readonly SkyServerProxyService _proxyService;

    public SkyServerProxyController(SkyServerProxyService proxyService)
    {
        _proxyService = proxyService;
    }

    [HttpPost("skyweb/alerts/evaluate")]
    [HttpPost("skyweb/alerts/{alertKey}/evaluate")]
    public async Task ProxyAlertEvaluationToSkyServer(CancellationToken cancellationToken)
    {
        await _proxyService.ProxyAsync(HttpContext, cancellationToken);
    }
}
