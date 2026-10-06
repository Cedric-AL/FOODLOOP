# Supabase Setup Guide

This document explains the initial Supabase database setup for FoodLoop.

## 1. Create a Supabase Account

Create an account at the Supabase website and start a new project.

## 2. Create a FoodLoop Project

Create a new project named `FoodLoop` or a similar project name that matches your team structure.

## 3. Locate Database Credentials

After the project is created, open the project dashboard and find the PostgreSQL connection information, including:

- Database host
- Database port
- Database name
- Database username
- Database password
- Connection string

## 4. Store Credentials Locally Only

Store the credentials in local environment configuration, such as `.env` files on your developer machine.

Do not commit these values to GitHub.

## 5. Connect the Backend

The Spring Boot backend is configured to use environment variables such as:

```text
DB_URL=
DB_USERNAME=
DB_PASSWORD=
```

These should be filled from your Supabase project settings.

## 6. Use Supabase Dashboard and SQL Editor

The Supabase dashboard can be used for database management, testing, and schema review. The SQL Editor is the recommended place for creating and reviewing database objects.

## 7. Security Reminder

- Never commit real credentials.
- Never share database URLs or passwords in project files.
- Use `.env.example` files only as templates.
