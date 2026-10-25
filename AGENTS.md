# FOODLOOP project guidance

FoodLoop is an academic food waste redistribution project connecting food establishments with recipient organizations and communities.

## Agreed technology stack

- Frontend: React + TypeScript + Vite in `frontend/`.
- Backend: Java 17 + Spring Boot + Maven in `backend/`.
- Database: Supabase PostgreSQL.
- Database integration: Spring Data JPA + Hibernate.
- Database management: Supabase Dashboard / SQL Editor.
- Editor: Visual Studio Code. Version control: Git + GitHub.

Keep the Java backend. Do not introduce Django or replace the agreed stack unless the user explicitly requests a change.

## Working practices

Read the existing code and relevant documentation before changing behavior. Treat planned database documentation as a proposal, not proof of the live Supabase schema. Inspect the supplied schema before mapping entities or proposing migrations.

Keep credentials in environment variables or ignored local configuration. Never commit database passwords, Supabase secret keys, or other credentials. Do not modify the live database without explicit authorization.

Use feature branches for implementation work and run checks appropriate to the changes. Report any checks that could not run. Do not claim local changes are available on GitHub until they have been committed and pushed successfully.

The repository is in its foundation stage. Verify reported issues against the current checkout before fixing them. Keep durable project decisions in repository documentation so desktop and cloud chats can use the same guidance after synchronization.
