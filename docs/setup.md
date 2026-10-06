# Setup Guide

This guide helps a new team member get started with the FoodLoop repository.

## 1. Install Required Tools

### Git

Install Git from the official website or package manager for your operating system.

### Visual Studio Code

Download and install Visual Studio Code.

### Node.js

Install Node.js for the frontend development environment.

### Java JDK

Install a Java JDK compatible with Spring Boot.

### Maven

Install Maven if it is not already available on your system.

## 2. Clone the Repository

```bash
git clone https://github.com/Cedric-AL/FOODLOOP.git
cd FOODLOOP
```

## 3. Open the Project in VS Code

Open the repository in Visual Studio Code and install recommended extensions when prompted.

## 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 5. Backend Setup

From the repository root:

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

## 6. Configure Environment Variables

### Frontend

Copy the example file and configure the proper values:

```bash
cd frontend
cp .env.example .env
```

Example:

```text
VITE_API_BASE_URL=http://localhost:8080/api
```

### Backend

Copy the example file and fill the values based on your Supabase project:

```bash
cd backend
cp .env.example .env
```

Example:

```text
DB_URL=jdbc:postgresql://<host>:5432/<database>
DB_USERNAME=<your-username>
DB_PASSWORD=<your-password>
SERVER_PORT=8080
```

## 7. Test the Health Endpoint

The backend health endpoint is:

```text
http://localhost:8080/api/health
```

The frontend should be able to call the API through the configured `VITE_API_BASE_URL` value.

## 8. Frontend and Backend Communication

The frontend development server normally runs on:

```text
http://localhost:5173
```

The backend normally runs on:

```text
http://localhost:8080
```

The frontend is expected to use Axios to call the Spring Boot API.

## 9. Supabase Setup Reminder

Supabase credentials must be provided in local environment configuration and must not be committed to the repository.
