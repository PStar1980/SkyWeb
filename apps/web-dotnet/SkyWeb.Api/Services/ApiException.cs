namespace SkyWeb.Api.Services;

public sealed class ApiException : Exception
{
    public ApiException(int statusCode, string message, object? details = null)
        : base(message)
    {
        StatusCode = statusCode;
        Details = details;
    }

    public int StatusCode { get; }

    public object? Details { get; }
}
