const express = require('express');
const { body, validationResult } = require('express-validator');
const { userValidationRules, todoValidationRules } = require('./validation');

const app = express();
app.use(express.json());

// ── CREATE USER WITH VALIDATION ────────────────────────
app.post('/api/users', userValidationRules, function(req, res) {
    // Step 1: Check if validation passed
    const errors = validationResult(req);

    // Step 2: If there are errors, send them back
    if (!errors.isEmpty()) {
        return res.status(400).send({ errors: errors.array() });
    }

    // Step 3: If we reach here, data is valid — safe to use
    const name = req.body.name;
    const email = req.body.email;

    res.status(201).send({
        message: 'User is valid!',
        user: { name, email }
    });
});

app.post('/api/todos', todoValidationRules, function(req, res) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).send({ errors: errors.array() });
    }

    const task = req.body.task;
    const completed = req.body.completed || false;

    res.status(201).send({
        message: 'Todo is valid!',
        todo: { task, completed }
    });
});

app.listen(3000, function() {
    console.log('Validation test server running on port 3000');
});