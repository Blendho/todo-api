const express = require('express');
const pool = require('./db');
const AppError = require('./errors');

const app = express();
app.use(express.json());

// ── GET ALL TODOS ──────────────────────────────────────
app.get('/api/todos', async function(req, res, next) {
    try {
        const result = await pool.query('SELECT * FROM todos ORDER BY id');
        res.status(200).send(result.rows);
    } catch (err) {
        next(err);
    }
});

// ── GET ONE TODO ───────────────────────────────────────
app.get('/api/todos/:id', async function(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query(
            'SELECT * FROM todos WHERE id = $1', [id]
        );

        if (result.rows.length === 0) {
            throw new AppError('Todo not found', 404);
        }

        res.status(200).send(result.rows[0]);
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
    console.log('Error handling test running on port 3000');
});