FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app

ENV CI=true

EXPOSE 4173
