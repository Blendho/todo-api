const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

app.post('/api/users', function(req, res) {
    const name = req.body.name;
    const email = req.body.email;

    pool.query(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        [name, email],
        function(err, result) {
            if (err) {
                res.status(500).send({ error: err.message });
            } else {
                res.status(201).send(result.rows[0]);
            }
        }
    );
});

app.get('/api/users', function(req, res) {
    pool.query('SELECT * FROM users ORDER BY id', function(err, result) {
        if (err) {
            res.status(500).send({ error: err.message });
        } else {
            res.status(200).send(result.rows);
        }
    });
});

app.get('/api/users/:id/todos', function(req, res) {
    const userId = parseInt(req.params.id);

    pool.query(
        'SELECT todos.id, todos.task, todos.completed, users.name, users.email FROM todos JOIN users ON todos.user_id = users.id WHERE users.id = $1 ORDER BY todos.id',
        [userId],
        function(err, result) {
            if (err) {
                res.status(500).send({ error: err.message });
            } else if (result.rows.length === 0) {
                res.status(404).send({ error: 'No todos found for this user' });
            } else {
                res.status(200).send(result.rows);
            }
        }
    );
});

app.post('/api/users/:id/todos', function(req, res) {
    const userId = parseInt(req.params.id);
    const task = req.body.task;
    const completed = req.body.completed || false;

    pool.query(
        'INSERT INTO todos (task, completed, user_id) VALUES ($1, $2, $3) RETURNING *',
        [task, completed, userId],
        function(err, result) {
            if (err) {
                res.status(500).send({ error: err.message });
            } else {
                res.status(201).send(result.rows[0]);
            }
        }
    );
});

app.put('/api/todos/:id', function(req, res) {
    const id = parseInt(req.params.id);
    const task = req.body.task;
    const completed = req.body.completed;

    pool.query(
        'UPDATE todos SET task = $1, completed = $2 WHERE id = $3 RETURNING *',
        [task, completed, id],
        function(err, result) {
            if (err) {
                res.status(500).send({ error: err.message });
            } else if (result.rows.length === 0) {
                res.status(404).send({ error: 'Todo not found' });
            } else {
                res.status(200).send(result.rows[0]);
            }
        }
    );
});

app.delete('/api/todos/:id', function(req, res) {
    const id = parseInt(req.params.id);

    pool.query(
        'DELETE FROM todos WHERE id = $1 RETURNING *',
        [id],
        function(err, result) {
            if (err) {
                res.status(500).send({ error: err.message });
            } else if (result.rows.length === 0) {
                res.status(404).send({ error: 'Todo not found' });
            } else {
                res.status(200).send({ 
                    message: 'Todo deleted!', 
                    todo: result.rows[0] 
                });
            }
        }
    );
});

app.listen(3000, function() {
    console.log('Todo API with Database running on port 3000');
});