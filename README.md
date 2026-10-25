# Savora (FoodLoop)

**Start with [Savora setup](docs/SAVORA_SETUP.md)** for the current database migration, connection settings, administrator setup and workflow checks. This supersedes the foundation-stage instructions below. The backend now requires database credentials and no longer disables database startup.

FoodLoop is an academic project focused on reducing food waste by connecting food establishments with organizations and communities that need food. The project is currently in its initial development stage and is being structured to support future implementation of a web-based donation, coordination, and tracking system.

## Project Purpose

The system is intended to help businesses record surplus food, apply a preliminary donation screening process, match donations with suitable recipients, and coordinate pickup and delivery logistics in a more organized way.

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Java + Spring Boot + Maven
- Database: PostgreSQL via Supabase
- ORM: Spring Data JPA + Hibernate
- API Communication: Axios
- Version Control: Git + GitHub

## Repository Structure

```text
FOODLOOP/
├── backend/
├── frontend/
├── docs/
│   ├── api/
│   ├── database/
│   ├── architecture/
│   └── setup.md
├── .gitignore
├── README.md
├── CONTRIBUTING.md
└── .vscode/
    └── extensions.json
```

## Development Status

The Savora frontend includes account login, organization verification with private document submission, administrator review, donation screening, recipient requests and pickup completion. The original demo is retained as a reference in docs/. Live Supabase connection and workflow checks require local credentials.

## Setup Documentation

See [Savora setup](docs/SAVORA_SETUP.md) for current setup and workflow guidance.

## Team Workflow

- Use GitHub Issues for tracked tasks.
- Work on feature branches.
- Keep frontend and backend changes separated.
- Test before pushing changes.

## Important Note

The current implementation is intended for local testing. The setup guide lists the remaining operational work before public launch.
