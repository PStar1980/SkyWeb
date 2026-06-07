using Dapper;
using Microsoft.AspNetCore.Mvc;
using SkyWeb.Api.Data;
using SkyWeb.Api.DTOs.Health;

namespace SkyWeb.Api.Controllers;

[ApiController]
[Route("")]
public sealed class HealthController : ControllerBase
{
    private const string ServiceName = "SkyWeb.Api";
    private readonly DbConnectionFactory _connectionFactory;

    public HealthController(DbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    [HttpGet("_health")]
    public ActionResult<HealthResponse> GetHealth()
    {
        return Ok(new HealthResponse(
            Ok: true,
            Service: ServiceName,
            Timestamp: DateTimeOffset.UtcNow.ToString("O")
        ));
    }

    [HttpGet("_db/health")]
    public async Task<ActionResult<HealthResponse>> GetDatabaseHealth()
    {
        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var database = await connection.ExecuteScalarAsync<string>("select current_database();");

            return Ok(new HealthResponse(
                Ok: true,
                Service: ServiceName,
                Timestamp: DateTimeOffset.UtcNow.ToString("O"),
                Database: database
            ));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new HealthResponse(
                Ok: false,
                Service: ServiceName,
                Timestamp: DateTimeOffset.UtcNow.ToString("O"),
                Error: ex.Message
            ));
        }
    }
}
