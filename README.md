# Memozy-Personalized-Diary-application
Memozy
Personal journaling web app — Vite + React frontend, Express backend with optional MongoDB persistence.

Overview
Memozy is a lightweight journaling application for capturing memories, poems, stories and short diary entries. The frontend is built with Vite, React and TypeScript and uses Tailwind/shadcn UI components. The backend is a small Express server that supports optional MongoDB persistence; if no database is configured it falls back to an in-memory store for fast local development.

Features
User signup / login (JWT)
Create,delete entries, poems, and stories
Image uploads (served from /uploads)
Basic sentiment analysis endpoint for entries
Calendar and timeline views for browsing memories
In-memory fallback when MongoDB is not configured (for local dev)
Tech stack
Frontend: Vite, React, TypeScript, Tailwind CSS, shadcn/ui components
Backend: Node.js, Express, multer;MongoDB

