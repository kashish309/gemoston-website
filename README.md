---
title: Ali Gemora
emoji: 💎
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
---

# Ali Gemora

This is a Docker Space running the Ali Gemora FastAPI website.

## Hugging Face Space settings

Add these as private **Secrets** in the Space Settings. Never commit them to this repository:

- `ADMIN_PASSWORD_SALT`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `COOKIE_SECURE=true`
- `DATABASE_URL` (when using PostgreSQL for persistent prices and names)

The Docker image uses port `7860`. Uploaded images use `/data/ali-gemora-images`; attach a
read-write Hugging Face Storage Bucket at `/data` before relying on admin uploads for
persistent storage. Without attached storage, files written at runtime can be lost when
the Space restarts.
