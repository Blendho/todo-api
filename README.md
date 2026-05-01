# Todo API

A full-stack REST API built with Node.js, Express, and PostgreSQL.

## Features

- User registration and login with JWT authentication
- Password hashing with bcrypt
- Todo CRUD operations (Create, Read, Update, Delete)
- Profile picture upload with Multer
- Welcome email on registration with Nodemailer
- Password reset via email
- Input validation and sanitization
- Rate limiting and security headers
- Request logging with Morgan

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT (jsonwebtoken)
- **File Uploads:** Multer
- **Email:** Nodemailer + Gmail
- **Security:** Helmet, CORS, express-rate-limit, bcrypt
- **Validation:** express-validator
- **Logging:** Morgan

## Getting Started

### Prerequisites
- Node.js installed
- PostgreSQL installed and running

### Installation

1. Clone the repository
   git clone https://github.com/Blendho/todo-api.git

2. Navigate into the project
   cd todo-api

3. Install dependencies
   npm install

4. Create your environment file
   cp .env.example .env
   Then fill in your actual values in the .env file

5. Set up the database
   Create a PostgreSQL database called tododb
   Run the migration files in the migrations/ folder

6. Start the server
   node server.js

   Server runs on http://localhost:3000

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/register | Register a new user | No |
| POST | /api/login | Login and get JWT token | No |
| POST | /api/forgot-password | Request password reset email | No |
| POST | /api/reset-password | Reset password with token | No |

### Todos
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/todos | Get all todos for logged in user | Yes |
| GET | /api/todos/:id | Get a single todo | Yes |
| POST | /api/todos | Create a new todo | Yes |
| PUT | /api/todos/:id | Update a todo | Yes |
| DELETE | /api/todos/:id | Delete a todo | Yes |

### Users
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/users/profile-picture | Upload profile picture | Yes |

## Environment Variables

See `.env.example` for all required environment variables.

## Security Features

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire in 24 hours
- Rate limiting: 100 requests per 15 minutes globally, 5 login attempts per 15 minutes
- SQL injection prevention with parameterized queries
- XSS protection with helmet.js
- Input validation and sanitization on all routes

## License

MIT