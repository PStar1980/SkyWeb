using System.Text.Json;
using SkyWeb.Api.Data;
using SkyWeb.Api.Middleware;
using SkyWeb.Api.Options;
using SkyWeb.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<DbConnectionFactory>();
builder.Services.AddScoped<MacroReadService>();
builder.Services.AddScoped<PublicMacroService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<SkyWebAuthorizationService>();
builder.Services.AddScoped<SkyWebProfileService>();
builder.Services.AddScoped<SkyWebPreferencesService>();
builder.Services.AddScoped<SkyWebSavedViewsService>();
builder.Services.AddScoped<SkyWebDashboardsService>();
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection("Auth"));
builder.Services.Configure<SkyServerOptions>(builder.Configuration.GetSection("SkyServer"));
builder.Services.AddHttpClient<SkyServerProxyService>();

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("SkyWebClient", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
        else
        {
            policy.AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("SkyWebClient");
app.UseMiddleware<AuthMiddleware>();
app.MapControllers();

app.Run();
