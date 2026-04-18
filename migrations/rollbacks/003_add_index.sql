-- Rollback 003: Remove index on todos user_id
-- Undoes: 003_add_index.sql

DROP INDEX IF EXISTS idx_todos_user_id;