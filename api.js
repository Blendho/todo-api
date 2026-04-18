require('dotenv').config();
const express = require('express');
const pool = require('./db');
const AppError = require('./errors');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());


// ── VALIDATION RULES ──────────────────────────────────
const userValidationRules = [
    body('name')
        .notEmpty()
        .withMessage('Name is required'),
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Must be a valid email address'),
];

const todoValidationRules = [
    body('task')
        .notEmpty()
        .withMessage('Task is required')
        .isLength({ min: 3 })
        .withMessage('Task must be at least 3 characters long'),
    body('completed')
        .optional()
        .isBoolean()
        .withMessage('Completed must be true or false'),
];


// ── ENDPOINT 1: Create a User ─────────────────────────
app.post('/api/users', userValidationRules, async function(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).send({ errors: errors.array() });
        }

        const { name, email } = req.body;

        const result = await pool.query(
            'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
            [name, email]
        );

        res.status(201).send(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// ── ENDPOINT 2: Get All Users ─────────────────────────
app.get('/api/users', async function(req, res, next) {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY id');
        res.status(200).send(result.rows);
    } catch (err) {
        next(err);
    }
});

// ── ENDPOINT 3: Get One User ──────────────────────────
app.get('/api/users/:id', async function(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1', [id]
        );

        if (result.rows.length === 0) {
            throw new AppError('User not found', 404);
        }

        res.status(200).send(result.rows[0]);
    } catch (err) {
        next(err);
    }
});


// ── ENDPOINT 4: Get All Todos for a User ──────────────
app.get('/api/users/:id/todos', async function(req, res, next) {
    try {
        const userId = parseInt(req.params.id);

        // First check if user exists
        const user = await pool.query(
            'SELECT * FROM users WHERE id = $1', [userId]
        );

        if (user.rows.length === 0) {
            throw new AppError('User not found', 404);
        }

        // Then get their todos
        const result = await pool.query(
            'SELECT todos.id, todos.task, todos.completed, todos.created_at, ' +
            'users.name, users.email FROM todos ' +
            'JOIN users ON todos.user_id = users.id ' +
            'WHERE users.id = $1 ORDER BY todos.id',
            [userId]
        );

        res.status(200).send(result.rows);
    } catch (err) {
        next(err);
    }
});

// ── ENDPOINT 5: Create a Todo for a User ──────────────
app.post('/api/users/:id/todos', todoValidationRules, async function(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).send({ errors: errors.array() });
        }

        const userId = parseInt(req.params.id);

        // First check if user exists
        const user = await pool.query(
            'SELECT * FROM users WHERE id = $1', [userId]
        );

        if (user.rows.length === 0) {
            throw new AppError('User not found', 404);
        }

        const { task, completed } = req.body;

        const result = await pool.query(
            'INSERT INTO todos (task, completed, user_id) VALUES ($1, $2, $3) RETURNING *',
            [task, completed || false, userId]
        );

        res.status(201).send(result.rows[0]);
    } catch (err) {
        next(err);
    }
});


// ── ENDPOINT 6: Update a Todo ─────────────────────────
app.put('/api/todos/:id', todoValidationRules, async function(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).send({ errors: errors.array() });
        }

        const id = parseInt(req.params.id);
        const { task, completed } = req.body;

        const result = await pool.query(
            'UPDATE todos SET task = $1, completed = $2 WHERE id = $3 RETURNING *',
            [task, completed, id]
        );

        if (result.rows.length === 0) {
            throw new AppError('Todo not found', 404);
        }

        res.status(200).send(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// ── ENDPOINT 7: Delete a Todo ─────────────────────────
app.delete('/api/todos/:id', async function(req, res, next) {
    try {
        const id = parseInt(req.params.id);

        const result = await pool.query(
            'DELETE FROM todos WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            throw new AppError('Todo not found', 404);
        }

        res.status(200).send({
            message: 'Todo deleted!',
            todo: result.rows[0]
        });
    } catch (err) {
        next(err);
    }
});

// ── GLOBAL ERROR HANDLER (ALWAYS LAST!) ───────────────
app.use(function(err, req, res, next) {
    console.error(err.message);
    res.status(err.statusCode || 500).send({
        error: err.message || 'Something went wrong'
    });
});

app.listen(3000, function() {
    console.log('Professional Todo API running on port 3000');
});