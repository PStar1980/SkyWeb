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

    [AcceptVerbs("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")]
    [Route("skyweb")]
    [Route("skyweb/{**path}")]
    public async Task ProxyToSkyServer(CancellationToken cancellationToken)
    {
        await _proxyService.ProxyAsync(HttpContext, cancellationToken);
    }
}
