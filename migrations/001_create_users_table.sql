-- Migration 001: Create users table
-- Created: 2026-04-08

CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);