using System.Data;
using Npgsql;

namespace SkyWeb.Api.Data;

public sealed class DbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("SkyDb")
            ?? throw new InvalidOperationException(
                "Missing connection string: ConnectionStrings:SkyDb. Configure it in appsettings.Development.json, user secrets, or the ConnectionStrings__SkyDb environment variable.");
    }

    public IDbConnection CreateConnection()
    {
        return new NpgsqlConnection(_connectionString);
    }
}
