-- Migration 003: Add index on todos user_id column
-- Created: 2026-04-08

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);