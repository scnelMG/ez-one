# Infra

Deployment and operation assets.

## Initial Deployment Assumption

- AWS EC2 single-server deployment
- MySQL database
- Backend API and frontend static build served from the same server or reverse proxy
- Secrets are supplied through environment variables or an external secret mechanism

## Rules

- Do not commit production secrets.
- Keep `.env.example` files safe and non-sensitive.
- Database changes must be represented by migration files.
