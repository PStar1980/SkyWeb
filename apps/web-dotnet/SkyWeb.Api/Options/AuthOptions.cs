namespace SkyWeb.Api.Options;

public sealed class AuthOptions
{
    public int SessionMinutes { get; init; } = 720;
    public string ApplicationCode { get; init; } = "SKYWEB";
    public int BcryptRounds { get; init; } = 12;
    public int MaxFailedLoginAttempts { get; init; } = 5;
    public int LockMinutes { get; init; } = 15;
    public int LoginRateLimitWindowMs { get; init; } = 60000;
    public int LoginRateLimitMaxAttempts { get; init; } = 8;
    public int LoginRateLimitBlockMs { get; init; } = 300000;
}
