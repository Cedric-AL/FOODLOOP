# FoodLoop Backend

This directory contains the initial Spring Boot backend foundation for the FoodLoop project.

## Purpose

The backend currently provides a minimal application foundation and health-check endpoint. It is not yet implementing the full FoodLoop business system.

## Supabase Setup

Developers should obtain connection details from their Supabase project dashboard. These values should be stored in a local `.env` file and never committed to GitHub.

## Run the Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

## Health Check

```text
GET http://localhost:8080/api/health
```
