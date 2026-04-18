const { body, validationResult } = require('express-validator');

// These are validation RULES — they describe what valid data looks like
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

module.exports = { userValidationRules };

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

module.exports = { userValidationRules, todoValidationRules };