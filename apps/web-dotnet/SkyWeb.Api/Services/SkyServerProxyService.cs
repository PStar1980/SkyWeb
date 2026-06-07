using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using SkyWeb.Api.Options;

namespace SkyWeb.Api.Services;

public sealed class SkyServerProxyService
{
    private static readonly HashSet<string> SkippedRequestHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Host",
        "Content-Length",
        "Transfer-Encoding",
        "Connection",
        "Keep-Alive",
        "Proxy-Authenticate",
        "Proxy-Authorization",
        "TE",
        "Trailer",
        "Upgrade"
    };

    private static readonly HashSet<string> SkippedResponseHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Transfer-Encoding",
        "Connection",
        "Keep-Alive",
        "Proxy-Authenticate",
        "Proxy-Authorization",
        "TE",
        "Trailer",
        "Upgrade"
    };

    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private readonly ILogger<SkyServerProxyService> _logger;

    public SkyServerProxyService(
        HttpClient httpClient,
        IOptions<SkyServerOptions> options,
        ILogger<SkyServerProxyService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _baseUrl = NormalizeBaseUrl(options.Value.BaseUrl);
    }

    public async Task ProxyAsync(HttpContext context, CancellationToken cancellationToken = default)
    {
        var targetUri = BuildTargetUri(context.Request);

        using var upstreamRequest = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUri);
        CopyRequestHeaders(context.Request, upstreamRequest);

        if (HttpMethods.IsPost(context.Request.Method) ||
            HttpMethods.IsPut(context.Request.Method) ||
            HttpMethods.IsPatch(context.Request.Method))
        {
            upstreamRequest.Content = new StreamContent(context.Request.Body);
            CopyRequestContentHeaders(context.Request, upstreamRequest.Content.Headers);
        }

        _logger.LogInformation("Proxying {Method} {Path} to SkyServer", context.Request.Method, context.Request.Path);

        using var upstreamResponse = await _httpClient.SendAsync(
            upstreamRequest,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);

        context.Response.StatusCode = (int)upstreamResponse.StatusCode;
        CopyResponseHeaders(upstreamResponse, context.Response);

        await upstreamResponse.Content.CopyToAsync(context.Response.Body, cancellationToken);
    }

    private Uri BuildTargetUri(HttpRequest request)
    {
        var path = request.Path.Value ?? string.Empty;

        if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
        {
            path = path[4..];
        }

        if (!path.StartsWith('/'))
        {
            path = $"/{path}";
        }

        var query = request.QueryString.HasValue ? request.QueryString.Value : string.Empty;
        return new Uri($"{_baseUrl}{path}{query}");
    }

    private static void CopyRequestHeaders(HttpRequest request, HttpRequestMessage upstreamRequest)
    {
        foreach (var header in request.Headers)
        {
            if (SkippedRequestHeaders.Contains(header.Key) || header.Key.StartsWith("Content-", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            upstreamRequest.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }
    }

    private static void CopyRequestContentHeaders(HttpRequest request, HttpContentHeaders contentHeaders)
    {
        foreach (var header in request.Headers)
        {
            if (!header.Key.StartsWith("Content-", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(header.Key, "Content-Length", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            contentHeaders.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }
    }

    private static void CopyResponseHeaders(HttpResponseMessage upstreamResponse, HttpResponse response)
    {
        foreach (var header in upstreamResponse.Headers)
        {
            if (SkippedResponseHeaders.Contains(header.Key))
            {
                continue;
            }

            response.Headers[header.Key] = header.Value.ToArray();
        }

        foreach (var header in upstreamResponse.Content.Headers)
        {
            if (SkippedResponseHeaders.Contains(header.Key))
            {
                continue;
            }

            response.Headers[header.Key] = header.Value.ToArray();
        }
    }

    private static string NormalizeBaseUrl(string? baseUrl)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return "http://localhost:7171/api";
        }

        return baseUrl.TrimEnd('/');
    }
}
