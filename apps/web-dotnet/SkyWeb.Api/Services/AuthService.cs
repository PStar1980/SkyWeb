using System.Collections.Concurrent;
using System.Data;
using System.Text.Json;
using Dapper;
using Microsoft.Extensions.Options;
using SkyWeb.Api.Data;
using SkyWeb.Api.DTOs.Auth;
using SkyWeb.Api.Options;

namespace SkyWeb.Api.Services;

public sealed class AuthService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly ConcurrentDictionary<string, LoginRateLimitState> LoginAttemptsByKey = new(StringComparer.OrdinalIgnoreCase);

    private readonly DbConnectionFactory _connectionFactory;
    private readonly AuthOptions _authOptions;

    public AuthService(DbConnectionFactory connectionFactory, IOptions<AuthOptions> authOptions)
    {
        _connectionFactory = connectionFactory;
        _authOptions = authOptions.Value;
    }

    public async Task<(AuthUserDto User, string SessionToken, DateTime ExpiresAt, IReadOnlyList<AuthPermissionDto> Permissions)> LoginAsync(
        LoginRequest request,
        HttpContext httpContext)
    {
        var email = NormalizeEmail(request.Email);
        var password = request.Password ?? string.Empty;
        var appCode = NormalizeAppCode(request.AppCode);
        var context = GetRequestContext(httpContext);
        var rateLimitKey = AssertLoginRateLimit(email, context);

        try
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                throw new AuthHttpException(401, "Email and password are required.");
            }

            var user = await FindUserByEmailAsync(email);
            if (user is null)
            {
                await RecordLoginEventAsync(new LoginEventWrite(
                    AppCode: appCode,
                    UserId: null,
                    SessionId: null,
                    EmailAttempted: email,
                    Success: false,
                    FailureReason: "INVALID_CREDENTIALS",
                    Context: context));

                throw new AuthHttpException(401, "Invalid email or password.");
            }

            if (!string.Equals(user.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                await RecordLoginEventAsync(new LoginEventWrite(
                    AppCode: appCode,
                    UserId: user.UserId,
                    SessionId: null,
                    EmailAttempted: email,
                    Success: false,
                    FailureReason: $"USER_{user.Status}",
                    Context: context));

                throw new AuthHttpException(401, "User account is not active.");
            }

            var application = await FindApplicationByCodeAsync(appCode);
            if (application is null)
            {
                await RecordLoginEventAsync(new LoginEventWrite(
                    AppCode: appCode,
                    UserId: user.UserId,
                    SessionId: null,
                    EmailAttempted: email,
                    Success: false,
                    FailureReason: "APPLICATION_NOT_CONFIGURED",
                    Context: context));

                throw new AuthHttpException(401, "Application is not available.");
            }

            var hasApplicationAccess = await HasApplicationAccessAsync(user.UserId, appCode);
            if (!hasApplicationAccess)
            {
                await RecordLoginEventAsync(new LoginEventWrite(
                    AppCode: appCode,
                    UserId: user.UserId,
                    SessionId: null,
                    EmailAttempted: email,
                    Success: false,
                    FailureReason: "APPLICATION_ACCESS_DENIED",
                    Context: context));

                throw new AuthHttpException(401, "User does not have access to this application.");
            }

            if (user.LockedUntil is not null && user.LockedUntil.Value > DateTime.UtcNow)
            {
                await RecordLoginEventAsync(new LoginEventWrite(
                    AppCode: appCode,
                    UserId: user.UserId,
                    SessionId: null,
                    EmailAttempted: email,
                    Success: false,
                    FailureReason: "USER_LOCKED",
                    Context: context));

                throw new AuthHttpException(401, "User account is temporarily locked.");
            }

            if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                var locked = await MarkFailedLoginAsync(user);

                await RecordLoginEventAsync(new LoginEventWrite(
                    AppCode: appCode,
                    UserId: user.UserId,
                    SessionId: null,
                    EmailAttempted: email,
                    Success: false,
                    FailureReason: locked ? "INVALID_CREDENTIALS_LOCKED" : "INVALID_CREDENTIALS",
                    Context: context));

                throw new AuthHttpException(401, "Invalid email or password.");
            }

            await ResetSuccessfulLoginStateAsync(user.UserId);
            var session = await CreateSessionAsync(user.UserId, appCode, context);
            var permissions = await GetPermissionsForUserAsync(user.UserId, appCode);

            await RecordLoginEventAsync(new LoginEventWrite(
                AppCode: appCode,
                UserId: user.UserId,
                SessionId: session.SessionId,
                EmailAttempted: email,
                Success: true,
                FailureReason: null,
                Context: context));

            await RecordAuditEventAsync(new AuditEventWrite(
                AppCode: appCode,
                UserId: user.UserId,
                EventType: "AUTH_LOGIN",
                ResourceType: "auth.sessions",
                ResourceId: session.SessionId.ToString(),
                Action: "login",
                Success: true,
                Message: "User logged in successfully.",
                Metadata: new Dictionary<string, object?> { ["email"] = email },
                Context: context));

            ClearLoginRateLimit(rateLimitKey);

            return (SanitizeUser(user), session.SessionToken, session.ExpiresAt, permissions);
        }
        catch (AuthHttpException)
        {
            RecordLoginRateLimitFailure(rateLimitKey);
            throw;
        }
        catch
        {
            RecordLoginRateLimitFailure(rateLimitKey);
            throw;
        }
    }

    public async Task<AuthContextDto?> GetSessionFromTokenAsync(string? sessionToken)
    {
        if (string.IsNullOrWhiteSpace(sessionToken))
        {
            return null;
        }

        var sessionTokenHash = AuthTokenService.HashToken(sessionToken);
        using var connection = _connectionFactory.CreateConnection();
        var row = await connection.QueryFirstOrDefaultAsync<SessionUserRow>(
            @"
                UPDATE auth.sessions s
                SET last_seen_at = CURRENT_TIMESTAMP,
                    expires_at = CURRENT_TIMESTAMP + (CAST(@SessionMinutes AS numeric) * INTERVAL '1 minute')
                FROM auth.users u, core.applications app, auth.user_applications ua
                WHERE s.user_id = u.user_id
                  AND s.app_id = app.app_id
                  AND ua.user_id = u.user_id
                  AND ua.app_id = s.app_id
                  AND s.session_token_hash = @SessionTokenHash
                  AND s.revoked_at IS NULL
                  AND s.expires_at > CURRENT_TIMESTAMP
                  AND u.status = 'ACTIVE'
                  AND ua.status = 'ACTIVE'
                  AND app.active = TRUE
                RETURNING
                    s.session_id AS SessionId,
                    s.app_id AS AppId,
                    app.app_code AS AppCode,
                    app.title AS AppTitle,
                    s.expires_at AS ExpiresAt,
                    s.last_seen_at AS LastSeenAt,
                    u.user_id AS UserId,
                    u.email AS Email,
                    u.username AS Username,
                    u.display_name AS DisplayName,
                    u.status AS Status,
                    u.is_system_user AS IsSystemUser,
                    u.last_login_at AS LastLoginAt
            ",
            new
            {
                SessionTokenHash = sessionTokenHash,
                SessionMinutes = GetSessionMinutes()
            });

        if (row is null)
        {
            return null;
        }

        var permissions = await GetPermissionsForUserAsync(row.UserId, row.AppCode ?? GetDefaultAppCode());

        return new AuthContextDto(
            Session: new AuthSessionDto(
                SessionId: row.SessionId,
                AppId: row.AppId,
                AppCode: row.AppCode,
                AppTitle: row.AppTitle,
                ExpiresAt: row.ExpiresAt,
                LastSeenAt: row.LastSeenAt,
                SessionMinutes: GetSessionMinutes()),
            User: new AuthUserDto(
                UserId: row.UserId,
                Email: row.Email,
                Username: row.Username,
                DisplayName: row.DisplayName,
                Status: row.Status,
                IsSystemUser: row.IsSystemUser,
                LastLoginAt: row.LastLoginAt),
            Permissions: permissions);
    }

    public async Task LogoutAsync(string? sessionToken, AuthContextDto? authContext, HttpContext httpContext)
    {
        if (string.IsNullOrWhiteSpace(sessionToken))
        {
            return;
        }

        var sessionTokenHash = AuthTokenService.HashToken(sessionToken);
        var context = GetRequestContext(httpContext);
        using var connection = _connectionFactory.CreateConnection();
        var revoked = await connection.QueryFirstOrDefaultAsync<RevokedSessionRow>(
            @"
                UPDATE auth.sessions
                SET revoked_at = CURRENT_TIMESTAMP,
                    revoked_reason = 'USER_LOGOUT'
                WHERE session_token_hash = @SessionTokenHash
                  AND revoked_at IS NULL
                RETURNING session_id AS SessionId, user_id AS UserId
            ",
            new { SessionTokenHash = sessionTokenHash });

        if (revoked is null)
        {
            return;
        }

        await RecordAuditEventAsync(new AuditEventWrite(
            AppCode: authContext?.Session.AppCode ?? GetDefaultAppCode(),
            UserId: authContext?.User.UserId ?? revoked.UserId,
            EventType: "AUTH_LOGOUT",
            ResourceType: "auth.sessions",
            ResourceId: revoked.SessionId.ToString(),
            Action: "logout",
            Success: true,
            Message: "User logged out successfully.",
            Metadata: new Dictionary<string, object?>(),
            Context: context));
    }

    public async Task<(AuthUserDto User, bool Changed, int RevokedOtherSessionsCount)> ChangePasswordAsync(
        ChangePasswordRequest request,
        AuthContextDto authContext,
        HttpContext httpContext)
    {
        var context = GetRequestContext(httpContext);
        var appCode = authContext.Session.AppCode ?? GetDefaultAppCode();
        var currentPassword = request.CurrentPassword ?? string.Empty;
        var newPassword = request.NewPassword ?? string.Empty;
        var confirmPassword = request.ConfirmPassword ?? string.Empty;

        if (string.IsNullOrWhiteSpace(currentPassword) ||
            string.IsNullOrWhiteSpace(newPassword) ||
            string.IsNullOrWhiteSpace(confirmPassword))
        {
            throw new AuthHttpException(400, "Current password, new password, and confirmation are required.");
        }

        if (!string.Equals(newPassword, confirmPassword, StringComparison.Ordinal))
        {
            throw new AuthHttpException(400, "New password and confirmation do not match.");
        }

        if (string.Equals(newPassword, currentPassword, StringComparison.Ordinal))
        {
            throw new AuthHttpException(400, "New password must be different from the current password.");
        }

        if (newPassword.Length < 12)
        {
            throw new AuthHttpException(400, "Password must be at least 12 characters long.");
        }

        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var user = await connection.QueryFirstOrDefaultAsync<UserRow>(
                @"
                    SELECT
                        user_id AS UserId,
                        email AS Email,
                        username AS Username,
                        display_name AS DisplayName,
                        password_hash AS PasswordHash,
                        status AS Status,
                        is_system_user AS IsSystemUser,
                        failed_login_count AS FailedLoginCount,
                        locked_until AS LockedUntil,
                        last_login_at AS LastLoginAt
                    FROM auth.users
                    WHERE user_id = @UserId
                    LIMIT 1
                ",
                new { authContext.User.UserId },
                transaction);

            if (user is null || !string.Equals(user.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                throw new AuthHttpException(404, "Active user account not found.");
            }

            if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            {
                await RecordAuditEventAsync(new AuditEventWrite(
                    AppCode: appCode,
                    UserId: authContext.User.UserId,
                    EventType: "AUTH_PASSWORD_CHANGE",
                    ResourceType: "auth.users",
                    ResourceId: authContext.User.UserId.ToString(),
                    Action: "change_own_password",
                    Success: false,
                    Message: "Password change rejected because the current password was incorrect.",
                    Metadata: new Dictionary<string, object?> { ["reason"] = "INVALID_CURRENT_PASSWORD" },
                    Context: context));

                throw new AuthHttpException(400, "Current password is incorrect.");
            }

            var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, _authOptions.BcryptRounds > 0 ? _authOptions.BcryptRounds : 12);
            var updatedUser = await connection.QueryFirstOrDefaultAsync<UserRow>(
                @"
                    UPDATE auth.users
                    SET password_hash = @PasswordHash,
                        failed_login_count = 0,
                        locked_until = NULL,
                        updated_by = @UserId,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = @UserId
                    RETURNING
                        user_id AS UserId,
                        email AS Email,
                        username AS Username,
                        display_name AS DisplayName,
                        password_hash AS PasswordHash,
                        status AS Status,
                        is_system_user AS IsSystemUser,
                        failed_login_count AS FailedLoginCount,
                        locked_until AS LockedUntil,
                        last_login_at AS LastLoginAt
                ",
                new
                {
                    UserId = authContext.User.UserId,
                    PasswordHash = newPasswordHash
                },
                transaction);

            if (updatedUser is null)
            {
                throw new AuthHttpException(404, "Active user account not found.");
            }

            var revokedOtherSessionsCount = 0;
            if (request.RevokeOtherSessions)
            {
                revokedOtherSessionsCount = await connection.ExecuteAsync(
                    @"
                        UPDATE auth.sessions
                        SET revoked_at = CURRENT_TIMESTAMP,
                            revoked_reason = 'PASSWORD_CHANGE'
                        WHERE user_id = @UserId
                          AND session_id <> @SessionId
                          AND revoked_at IS NULL
                          AND expires_at > CURRENT_TIMESTAMP
                    ",
                    new
                    {
                        UserId = authContext.User.UserId,
                        SessionId = authContext.Session.SessionId
                    },
                    transaction);
            }

            await RecordAuditEventAsync(
                new AuditEventWrite(
                    AppCode: appCode,
                    UserId: authContext.User.UserId,
                    EventType: "AUTH_PASSWORD_CHANGE",
                    ResourceType: "auth.users",
                    ResourceId: authContext.User.UserId.ToString(),
                    Action: "change_own_password",
                    Success: true,
                    Message: "User changed their own password successfully.",
                    Metadata: new Dictionary<string, object?>
                    {
                        ["revokeOtherSessions"] = request.RevokeOtherSessions,
                        ["revokedOtherSessionsCount"] = revokedOtherSessionsCount
                    },
                    Context: context),
                connection,
                transaction);

            transaction.Commit();
            return (SanitizeUser(updatedUser), true, revokedOtherSessionsCount);
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<IReadOnlyList<AuthPermissionDto>> GetPermissionsForUserAsync(Guid userId, string? appCode = null)
    {
        var normalizedAppCode = NormalizeAppCode(appCode);
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<AuthPermissionDto>(
            @"
                SELECT
                    permission_id AS PermissionId,
                    permission_code AS PermissionCode,
                    resource AS Resource,
                    action AS Action,
                    permission_description AS Description,
                    granted_through_roles AS GrantedThroughRoles,
                    app_id AS AppId,
                    app_code AS AppCode,
                    app_title AS AppTitle
                FROM auth.vw_user_permissions
                WHERE user_id = @UserId
                  AND app_code = @AppCode
                ORDER BY resource, action, permission_code
            ",
            new { UserId = userId, AppCode = normalizedAppCode });

        return rows.ToList();
    }

    private async Task<UserRow?> FindUserByEmailAsync(string email)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<UserRow>(
            @"
                SELECT
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    display_name AS DisplayName,
                    password_hash AS PasswordHash,
                    status AS Status,
                    is_system_user AS IsSystemUser,
                    failed_login_count AS FailedLoginCount,
                    locked_until AS LockedUntil,
                    last_login_at AS LastLoginAt
                FROM auth.users
                WHERE LOWER(email) = LOWER(@Email)
                LIMIT 1
            ",
            new { Email = email });
    }

    private async Task<ApplicationRow?> FindApplicationByCodeAsync(string appCode)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<ApplicationRow>(
            @"
                SELECT
                    app_id AS AppId,
                    app_code AS AppCode,
                    title AS Title,
                    active AS Active
                FROM core.applications
                WHERE app_code = @AppCode
                  AND active = TRUE
                LIMIT 1
            ",
            new { AppCode = appCode });
    }

    private async Task<bool> HasApplicationAccessAsync(Guid userId, string appCode)
    {
        using var connection = _connectionFactory.CreateConnection();
        var found = await connection.ExecuteScalarAsync<int>(
            @"
                SELECT COUNT(*)::int
                FROM auth.user_applications ua
                JOIN core.applications app
                  ON app.app_id = ua.app_id
                WHERE ua.user_id = @UserId
                  AND app.app_code = @AppCode
                  AND ua.status = 'ACTIVE'
                  AND app.active = TRUE
            ",
            new { UserId = userId, AppCode = appCode });

        return found > 0;
    }

    private async Task<SessionCreateResult> CreateSessionAsync(Guid userId, string appCode, RequestContext context)
    {
        var sessionToken = AuthTokenService.CreateSessionToken();
        var sessionTokenHash = AuthTokenService.HashToken(sessionToken);
        var metadata = SerializeJson(new Dictionary<string, object?>
        {
            ["source"] = appCode.Equals("SKYSERVER_ADMIN", StringComparison.OrdinalIgnoreCase)
                ? "admin-web"
                : appCode.ToLowerInvariant(),
            ["appCode"] = appCode,
            ["sessionMinutes"] = GetSessionMinutes()
        });

        using var connection = _connectionFactory.CreateConnection();
        var row = await connection.QueryFirstOrDefaultAsync<SessionCreateRow>(
            @"
                WITH app AS (
                    SELECT app_id, app_code, title
                    FROM core.applications
                    WHERE app_code = @AppCode
                      AND active = TRUE
                    LIMIT 1
                )
                INSERT INTO auth.sessions (
                    app_id,
                    user_id,
                    session_token_hash,
                    ip_address,
                    user_agent,
                    metadata,
                    expires_at,
                    last_seen_at
                )
                SELECT
                    app.app_id,
                    @UserId,
                    @SessionTokenHash,
                    CAST(@IpAddress AS inet),
                    @UserAgent,
                    CAST(@Metadata AS jsonb),
                    CURRENT_TIMESTAMP + (CAST(@SessionMinutes AS numeric) * INTERVAL '1 minute'),
                    CURRENT_TIMESTAMP
                FROM app
                RETURNING session_id AS SessionId, expires_at AS ExpiresAt, app_id AS AppId
            ",
            new
            {
                UserId = userId,
                SessionTokenHash = sessionTokenHash,
                IpAddress = context.IpAddress,
                UserAgent = context.UserAgent,
                Metadata = metadata,
                SessionMinutes = GetSessionMinutes(),
                AppCode = appCode
            });

        if (row is null)
        {
            throw new AuthHttpException(400, $"Application is not active or not configured: {appCode}");
        }

        return new SessionCreateResult(row.SessionId, sessionToken, row.ExpiresAt, row.AppId, appCode);
    }

    private async Task<bool> MarkFailedLoginAsync(UserRow user)
    {
        var nextFailedCount = user.FailedLoginCount + 1;
        var shouldLock = nextFailedCount >= (_authOptions.MaxFailedLoginAttempts > 0 ? _authOptions.MaxFailedLoginAttempts : 5);

        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            @"
                UPDATE auth.users
                SET failed_login_count = @FailedLoginCount,
                    locked_until = CASE
                        WHEN @ShouldLock = TRUE THEN CURRENT_TIMESTAMP + (CAST(@LockMinutes AS int) * INTERVAL '1 minute')
                        ELSE locked_until
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = @UserId
            ",
            new
            {
                FailedLoginCount = nextFailedCount,
                ShouldLock = shouldLock,
                LockMinutes = _authOptions.LockMinutes > 0 ? _authOptions.LockMinutes : 15,
                user.UserId
            });

        return shouldLock;
    }

    private async Task ResetSuccessfulLoginStateAsync(Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            @"
                UPDATE auth.users
                SET failed_login_count = 0,
                    locked_until = NULL,
                    last_login_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = @UserId
            ",
            new { UserId = userId });
    }

    private async Task RecordLoginEventAsync(LoginEventWrite write)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            @"
                INSERT INTO auth.login_events (
                    app_id,
                    user_id,
                    session_id,
                    email_attempted,
                    success,
                    failure_reason,
                    ip_address,
                    user_agent
                )
                VALUES (
                    (SELECT app_id FROM core.applications WHERE app_code = @AppCode LIMIT 1),
                    @UserId,
                    @SessionId,
                    @EmailAttempted,
                    @Success,
                    @FailureReason,
                    CAST(@IpAddress AS inet),
                    @UserAgent
                )
            ",
            new
            {
                write.AppCode,
                write.UserId,
                write.SessionId,
                write.EmailAttempted,
                write.Success,
                write.FailureReason,
                write.Context.IpAddress,
                write.Context.UserAgent
            });
    }

    private async Task RecordAuditEventAsync(
        AuditEventWrite write,
        IDbConnection? existingConnection = null,
        IDbTransaction? transaction = null)
    {
        var connection = existingConnection ?? _connectionFactory.CreateConnection();
        try
        {
            await connection.ExecuteAsync(
                @"
                    INSERT INTO auth.audit_events (
                        app_id,
                        user_id,
                        event_type,
                        resource_type,
                        resource_id,
                        action,
                        success,
                        message,
                        metadata,
                        ip_address,
                        user_agent
                    )
                    VALUES (
                        (SELECT app_id FROM core.applications WHERE app_code = @AppCode LIMIT 1),
                        @UserId,
                        @EventType,
                        @ResourceType,
                        @ResourceId,
                        @Action,
                        @Success,
                        @Message,
                        CAST(@Metadata AS jsonb),
                        CAST(@IpAddress AS inet),
                        @UserAgent
                    )
                ",
                new
                {
                    write.AppCode,
                    write.UserId,
                    write.EventType,
                    write.ResourceType,
                    write.ResourceId,
                    write.Action,
                    write.Success,
                    write.Message,
                    Metadata = SerializeJson(write.Metadata),
                    write.Context.IpAddress,
                    write.Context.UserAgent
                },
                transaction);
        }
        finally
        {
            if (existingConnection is null)
            {
                connection.Dispose();
            }
        }
    }

    private string AssertLoginRateLimit(string email, RequestContext context)
    {
        var key = GetLoginRateLimitKey(email, context);
        var now = DateTimeOffset.UtcNow;
        var state = LoginAttemptsByKey.AddOrUpdate(
            key,
            _ => new LoginRateLimitState(0, now.AddMilliseconds(GetRateLimitWindowMs()), null),
            (_, current) => current.WindowExpiresAt <= now
                ? new LoginRateLimitState(0, now.AddMilliseconds(GetRateLimitWindowMs()), null)
                : current);

        if (state.BlockedUntil is not null && state.BlockedUntil > now)
        {
            var retryAfterSeconds = (int)Math.Ceiling((state.BlockedUntil.Value - now).TotalSeconds);
            throw new AuthHttpException(
                429,
                "Too many login attempts. Please wait before trying again.",
                new { retryAfterSeconds });
        }

        return key;
    }

    private static void ClearLoginRateLimit(string key)
    {
        LoginAttemptsByKey.TryRemove(key, out _);
    }

    private void RecordLoginRateLimitFailure(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        LoginAttemptsByKey.AddOrUpdate(
            key,
            _ => new LoginRateLimitState(1, now.AddMilliseconds(GetRateLimitWindowMs()), null),
            (_, current) =>
            {
                var state = current.WindowExpiresAt <= now
                    ? new LoginRateLimitState(0, now.AddMilliseconds(GetRateLimitWindowMs()), null)
                    : current;
                var nextAttempts = state.Attempts + 1;
                var blockedUntil = nextAttempts >= GetRateLimitMaxAttempts()
                    ? now.AddMilliseconds(GetRateLimitBlockMs())
                    : state.BlockedUntil;

                return new LoginRateLimitState(
                    nextAttempts,
                    blockedUntil is null ? state.WindowExpiresAt : Max(state.WindowExpiresAt, blockedUntil.Value),
                    blockedUntil);
            });
    }

    private string NormalizeAppCode(string? appCode)
    {
        var fallback = GetDefaultAppCode();
        var normalized = string.IsNullOrWhiteSpace(appCode) ? fallback : appCode.Trim().ToUpperInvariant();
        return string.IsNullOrWhiteSpace(normalized) ? "SKYWEB" : normalized;
    }

    private string GetDefaultAppCode()
    {
        return string.IsNullOrWhiteSpace(_authOptions.ApplicationCode)
            ? "SKYWEB"
            : _authOptions.ApplicationCode.Trim().ToUpperInvariant();
    }

    private int GetSessionMinutes()
    {
        return _authOptions.SessionMinutes > 0 ? _authOptions.SessionMinutes : 720;
    }

    private int GetRateLimitWindowMs()
    {
        return _authOptions.LoginRateLimitWindowMs > 0 ? _authOptions.LoginRateLimitWindowMs : 60000;
    }

    private int GetRateLimitMaxAttempts()
    {
        return _authOptions.LoginRateLimitMaxAttempts > 0 ? _authOptions.LoginRateLimitMaxAttempts : 8;
    }

    private int GetRateLimitBlockMs()
    {
        return _authOptions.LoginRateLimitBlockMs > 0 ? _authOptions.LoginRateLimitBlockMs : 300000;
    }

    private static AuthUserDto SanitizeUser(UserRow user)
    {
        return new AuthUserDto(
            UserId: user.UserId,
            Email: user.Email,
            Username: user.Username,
            DisplayName: user.DisplayName,
            Status: user.Status,
            IsSystemUser: user.IsSystemUser,
            LastLoginAt: user.LastLoginAt);
    }

    private static RequestContext GetRequestContext(HttpContext httpContext)
    {
        return new RequestContext(
            IpAddress: httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent: httpContext.Request.Headers.UserAgent.ToString());
    }

    private static string NormalizeEmail(string? email)
    {
        return (email ?? string.Empty).Trim().ToLowerInvariant();
    }

    private static string SerializeJson(object? value)
    {
        return JsonSerializer.Serialize(value ?? new Dictionary<string, object?>(), JsonOptions);
    }

    private static string GetLoginRateLimitKey(string email, RequestContext context)
    {
        var emailPart = string.IsNullOrWhiteSpace(email) ? "no-email" : email.Trim().ToLowerInvariant();
        var ipPart = string.IsNullOrWhiteSpace(context.IpAddress) ? "no-ip" : context.IpAddress.Trim().ToLowerInvariant();
        return $"{ipPart}:{emailPart}";
    }

    private static DateTimeOffset Max(DateTimeOffset left, DateTimeOffset right)
    {
        return left >= right ? left : right;
    }

    private sealed record RequestContext(string? IpAddress, string? UserAgent);
    private sealed record LoginRateLimitState(int Attempts, DateTimeOffset WindowExpiresAt, DateTimeOffset? BlockedUntil);

    private sealed record LoginEventWrite(
        string AppCode,
        Guid? UserId,
        Guid? SessionId,
        string? EmailAttempted,
        bool Success,
        string? FailureReason,
        RequestContext Context);

    private sealed record AuditEventWrite(
        string AppCode,
        Guid? UserId,
        string EventType,
        string? ResourceType,
        string? ResourceId,
        string Action,
        bool Success,
        string? Message,
        object? Metadata,
        RequestContext Context);

    private sealed class ApplicationRow
    {
        public Guid AppId { get; set; }
        public string AppCode { get; set; } = string.Empty;
        public string? Title { get; set; }
        public bool Active { get; set; }
    }

    private sealed class SessionCreateRow
    {
        public Guid SessionId { get; set; }
        public DateTime ExpiresAt { get; set; }
        public Guid AppId { get; set; }
    }

    private sealed record SessionCreateResult(Guid SessionId, string SessionToken, DateTime ExpiresAt, Guid AppId, string AppCode);

    private sealed class RevokedSessionRow
    {
        public Guid SessionId { get; set; }
        public Guid UserId { get; set; }
    }

    private sealed class UserRow
    {
        public Guid UserId { get; set; }
        public string? Email { get; set; }
        public string? Username { get; set; }
        public string? DisplayName { get; set; }
        public string PasswordHash { get; set; } = string.Empty;
        public string? Status { get; set; }
        public bool IsSystemUser { get; set; }
        public int FailedLoginCount { get; set; }
        public DateTime? LockedUntil { get; set; }
        public DateTime? LastLoginAt { get; set; }
    }

    private sealed class SessionUserRow
    {
        public Guid SessionId { get; set; }
        public Guid AppId { get; set; }
        public string? AppCode { get; set; }
        public string? AppTitle { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? LastSeenAt { get; set; }
        public Guid UserId { get; set; }
        public string? Email { get; set; }
        public string? Username { get; set; }
        public string? DisplayName { get; set; }
        public string? Status { get; set; }
        public bool IsSystemUser { get; set; }
        public DateTime? LastLoginAt { get; set; }
    }
}
