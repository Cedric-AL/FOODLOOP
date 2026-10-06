# FoodLoop Architecture Overview

FoodLoop follows a simple layered architecture for the initial project setup.

```text
React + TypeScript
        │
        │ REST API
        ▼
Spring Boot
        │
        ▼
Spring Data JPA
        │
        ▼
Hibernate
        │
        ▼
Supabase PostgreSQL
```

## Layer Responsibilities

### Frontend Layer

The frontend is responsible for user-facing pages, form input handling, and requests to the backend through HTTP APIs.

### Backend Layer

The backend handles business logic, API endpoints, and communication between the frontend and the data layer.

### Data Access Layer

Spring Data JPA and Hibernate handle database interaction and entity persistence.

### Database Layer

Supabase PostgreSQL stores the application's data and supports future data model growth.

## Notes

This architecture is intended for the initial project foundation and may evolve as the application grows.
