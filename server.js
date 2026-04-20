const express = require('express');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create logs folder if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
    fs.mkdirSync(path.join(__dirname, 'logs'));
}

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'logs', 'access.log'),
    { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
    path.join(__dirname, 'logs', 'error.log'),
    { flags: 'a' }
);

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const fileFilter = function(req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: fileFilter
});


function logError(req, error) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const route = req.originalUrl;
    const message = error.message;
    const stack = error.stack;

    const logLine = `[${timestamp}] ${method} ${route} - ERROR: ${message}\n${stack}\n\n`;

    errorLogStream.write(logLine);
    console.error(logLine);
}

// General rate limit — applies to ALL routes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests. Please try again in 15 minutes.' }
});

// Strict rate limit — applies ONLY to login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


async function sendWelcomeEmail(userEmail, userName) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Welcome! Your account has been created 🎉',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                
                <div style="background-color: #4F46E5; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0;">Welcome Aboard! 🎉</h1>
                </div>

                <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #333;">Hi ${userName},</h2>
                    
                    <p style="color: #666; line-height: 1.6;">
                        Your account has been successfully created. 
                        You're all set to start using the app.
                    </p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #333;"><strong>Account Details:</strong></p>
                        <p style="margin: 5px 0; color: #666;">Name: ${userName}</p>
                        <p style="margin: 5px 0; color: #666;">Email: ${userEmail}</p>
                    </div>

                    <a href="http://localhost:3000" 
                       style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
                        Go to App
                    </a>

                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        If you didn't create this account, you can safely ignore this email.
                    </p>
                </div>

            </div>
        `
    };

    await transporter.sendMail(mailOptions);
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use('/uploads', express.static('uploads'));
app.use(morgan('dev'));
app.use(morgan('combined', { stream: accessLogStream }));
app.use(generalLimiter);


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).send({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, function(err, user) {
        if (err) {
            return res.status(403).send({ error: 'Invalid or expired token.' });
        }

        req.user = user;
        next();
    });
}

app.get('/api/todos', authenticateToken, async function(req, res) {
    try {
 const userId = req.user.userId;

        const result = await pool.query(
            'SELECT * FROM todos WHERE user_id = $1 ORDER BY id',
            [userId]
        );
        res.status(200).send(result.rows);
   } catch (error) {
    logError(req, error);
    res.status(500).send({ error: 'Something went wrong' });
}
});

app.get('/api/todos/:id', authenticateToken, async function(req, res) {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user.userId;

        const result = await pool.query(
            'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send({ error: 'Todo not found' });
        }

        res.status(200).send(result.rows[0]);
    } catch (error) {
    logError(req, error);
    res.status(500).send({ error: 'Something went wrong' });
}
});

app.post('/api/todos', authenticateToken,
    body('task').trim().notEmpty().withMessage('Task is required'),
    body('completed').optional().isBoolean().withMessage('Completed must be true or false'),
    async function(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).send({ errors: errors.array() });
            }

            const task = req.body.task;
            const completed = req.body.completed || false;
            const userId = req.user.userId;

            const result = await pool.query(
                'INSERT INTO todos (task, completed, user_id) VALUES ($1, $2, $3) RETURNING *',
                [task, completed, userId]
            );

            res.status(201).send(result.rows[0]);

        } catch (error) {
            logError(req, error);
            res.status(500).send({ error: 'Something went wrong' });
        }
    }
);

app.put('/api/todos/:id', authenticateToken,
    body('task').trim().notEmpty().withMessage('Task is required'),
    body('completed').isBoolean().withMessage('Completed must be true or false'),
    async function(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).send({ errors: errors.array() });
            }

            const id = parseInt(req.params.id);
            const task = req.body.task;
            const completed = req.body.completed;
            const userId = req.user.userId;

            const result = await pool.query(
                'UPDATE todos SET task = $1, completed = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
                [task, completed, id, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).send({ error: 'Todo not found' });
            }

            res.status(200).send(result.rows[0]);

        } catch (error) {
            logError(req, error);
            res.status(500).send({ error: 'Something went wrong' });
        }
    }
);

app.delete('/api/todos/:id', authenticateToken, async function(req, res) {
    try {
        const id = parseInt(req.params.id);
         const userId = req.user.userId;

        const result = await pool.query(
            'DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send({ error: 'Todo not found' });
        }

        res.status(200).send({ message: 'Todo deleted!', todo: result.rows[0] });
    } catch (error) {
    logError(req, error);
    res.status(500).send({ error: 'Something went wrong' });
}
});


app.post('/api/register',
    body('name').trim().escape().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    async function(req, res) {
        try {
            // Check if any validation rules failed
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).send({ errors: errors.array() });
            }

            const name = req.body.name;
            const email = req.body.email;
            const password = req.body.password;

            // Check for duplicate email
            const existingUser = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).send({ error: 'An account with this email already exists' });
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const result = await pool.query(
                'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
                [name, email, hashedPassword]
            );

            const user = result.rows[0];
            delete user.password;

// Send welcome email
try {
    await sendWelcomeEmail(user.email, user.name);
} catch (emailError) {
    console.error('Welcome email failed:', emailError);
}

res.status(201).send(user);

        } catch (error) {
    logError(req, error);
    res.status(500).send({ error: 'Something went wrong' });
}
    }
);

app.post('/api/login', loginLimiter,
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    async function(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).send({ errors: errors.array() });
            }

            const email = req.body.email;
            const password = req.body.password;

            const result = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).send({ error: 'Invalid email or password' });
            }

            const user = result.rows[0];

            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                return res.status(401).send({ error: 'Invalid email or password' });
            }

            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(200).send({ token: token });

       } catch (error) {
    logError(req, error);
    res.status(500).send({ error: 'Something went wrong' });
}
    }
);


app.post('/api/upload', function(req, res) {
    upload.single('file')(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            // Multer-specific errors (file too large, etc.)
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).send({ error: 'File too large. Maximum size is 2MB.' });
            }
            return res.status(400).send({ error: err.message });
        } else if (err) {
            // Custom errors (wrong file type, etc.)
            return res.status(400).send({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).send({ error: 'No file uploaded' });
        }

        res.status(200).send({
            message: 'File uploaded successfully',
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });
    });
});

app.post('/api/users/profile-picture', authenticateToken, function(req, res) {
    upload.single('profilePicture')(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).send({ error: 'File too large. Maximum size is 2MB.' });
            }
            return res.status(400).send({ error: err.message });
        } else if (err) {
            return res.status(400).send({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).send({ error: 'No file uploaded' });
        }

        try {
            const userId = req.user.userId;

            // Step 1 — Get the user's current profile picture before updating
            const currentUser = await pool.query(
                'SELECT profile_picture FROM users WHERE id = $1',
                [userId]
            );

            // Step 2 — Build the new file URL
            const filePath = req.file.path.replace(/\\/g, '/');
            const fileUrl = `${req.protocol}://${req.get('host')}/${filePath}`;

            // Step 3 — Update the database with new picture
            const result = await pool.query(
                'UPDATE users SET profile_picture = $1 WHERE id = $2 RETURNING id, name, email, profile_picture',
                [fileUrl, userId]
            );

            // Step 4 — Delete the old file from disk if one existed
            const oldPicture = currentUser.rows[0].profile_picture;

            if (oldPicture) {
                const oldFilename = oldPicture.split('/uploads/')[1];
                const oldFilePath = path.join(__dirname, 'uploads', oldFilename);

                fs.unlink(oldFilePath, function(unlinkErr) {
                    if (unlinkErr) {
                        console.error('Could not delete old profile picture:', unlinkErr);
                    }
                });
            }

            res.status(200).send({
                message: 'Profile picture updated successfully',
                user: result.rows[0]
            });

        } catch (error) {
            logError(req, error);
            res.status(500).send({ error: 'Something went wrong' });
        }
    });
});

// ── Forgot Password ──────────────────────────────────────────────────────────
app.post('/api/forgot-password',
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    async function(req, res) {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).send({ errors: errors.array() });
        }

        const { email } = req.body;

        try {
            // Step 1: Look up the user
            const result = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            // Step 2: Always respond the same way (security)
            if (result.rows.length === 0) {
                return res.status(200).send({
                    message: 'If that email exists, a reset link has been sent.'
                });
            }

            const user = result.rows[0];

            // Step 3: Generate token + expiry
            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

            // Step 4: Save token to database
            await pool.query(
                'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
                [resetToken, expiresAt, user.id]
            );

            // Step 5: Send email
            const resetLink = `http://todo-api-yxa6.onrender.com/reset-password?token=${resetToken}`;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Password Reset Request',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        
                        <div style="background-color: #4F46E5; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                            <h1 style="color: white; margin: 0;">Password Reset</h1>
                        </div>

                        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
                            <h2 style="color: #333;">Hi ${user.name},</h2>
                            
                            <p style="color: #666; line-height: 1.6;">
                                We received a request to reset your password. 
                                Click the button below to set a new one.
                            </p>

                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}" 
                                   style="background-color: #4F46E5; color: white; padding: 14px 28px; 
                                          border-radius: 6px; text-decoration: none; font-weight: bold; 
                                          font-size: 16px;">
                                    Reset My Password
                                </a>
                            </div>

                            <p style="color: #666; line-height: 1.6;">
                                This link expires in <strong>1 hour</strong>. 
                                If you didn't request this, you can safely ignore this email.
                            </p>

                            <p style="color: #999; font-size: 12px; margin-top: 30px;">
                                Or paste this link in your browser:<br/>
                                <a href="${resetLink}" style="color: #4F46E5;">${resetLink}</a>
                            </p>
                        </div>

                    </div>
                `
            });


            res.status(200).send({
                message: 'If that email exists, a reset link has been sent.'
            });

       } catch (error) {
    logError(req, error);
    res.status(500).send({ error: 'Something went wrong. Please try again.' });
}
    }
);


// ── Reset Password ───────────────────────────────────────────────────────────
app.post('/api/reset-password',
    body('token').notEmpty().withMessage('Token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    async function(req, res) {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).send({ errors: errors.array() });
        }

        const { token, password } = req.body;

        try {
            // Step 1: Find user with this token
            const result = await pool.query(
                'SELECT * FROM users WHERE reset_token = $1',
                [token]
            );

            // Step 2: Check if token exists
            if (result.rows.length === 0) {
                return res.status(400).send({ error: 'Invalid or expired reset token.' });
            }

            const user = result.rows[0];

            // Step 3: Check if token is expired
            const now = new Date();
            if (now > user.reset_token_expires) {
                return res.status(400).send({ error: 'Invalid or expired reset token.' });
            }

            // Step 4: Hash the new password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Step 5: Update password + clear the token
            await pool.query(
                'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
                [hashedPassword, user.id]
            );

            res.status(200).send({ message: 'Password reset successful. You can now log in.' });

        } catch (error) {
            logError(req, error);
            res.status(500).send({ error: 'Something went wrong. Please try again.' });
        }
    }
);

const PORT = process.env.PORT || 3000;


app.listen(PORT, function() {
    console.log(`Server running on port ${PORT}`);
});