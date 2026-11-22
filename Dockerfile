# ── Build ────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/CaetanoFinancas.Api/CaetanoFinancas.Api.csproj src/CaetanoFinancas.Api/
RUN dotnet restore src/CaetanoFinancas.Api/CaetanoFinancas.Api.csproj

COPY . .
RUN dotnet publish src/CaetanoFinancas.Api/CaetanoFinancas.Api.csproj \
    -c Release -o /app/publish --no-restore

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Pasta persistente para o SQLite (o volume do Fly.io é montado aqui)
RUN mkdir -p /app/data

COPY --from=build /app/publish .

# Variáveis de ambiente padrão para produção
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
ENTRYPOINT ["dotnet", "CaetanoFinancas.Api.dll"]
