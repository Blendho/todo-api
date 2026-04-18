-- Migration 002: Create todos table
-- Created: 2026-04-08

CREATE TABLE IF NOT EXISTS todos (
    id         SERIAL PRIMARY KEY,
    task       TEXT NOT NULL,
    completed  BOOLEAN DEFAULT false,
    user_id    INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);