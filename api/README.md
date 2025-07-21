# Accessibility Widget API

Backend service for managing data and logic of the accessibility-widget.

---

## Quick Start

### 1. Set environment variables

Copy `.env.example` to `.env` and fill in all required values:

```bash
cp .env.example .env
# Edit .env and set your secrets and config
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Run in development mode

```bash
npm run dev
```

The server will start on the port specified in `.env` (default: `http://localhost:3001`).

### 4. Build the project

Compile the TypeScript code into the `dist` folder:

```bash
npm run build
```

### 5. Run in production

```bash
npm start
```

---

## Project Structure

```
├── server.ts              # Main server file
├── config/                # Configurations (DB, translation, preprocessing)
├── constants/             # Constants
├── email-templates/       # MJML email templates
├── graphql/               # GraphQL schemas and resolvers
├── helpers/               # Helper functions
├── jobs/                  # Scheduled tasks (cron)
├── libs/                  # External libraries
├── middlewares/           # Express middlewares
├── repository/            # Database access
├── scripts/               # Admin scripts
├── public/                # Public files
├── controllers/           # Express route handlers (business logic for API endpoints)
├── routes/                # Express route definitions (URL structure and registration)
├── utils/                 # Utilities
├── validations/           # Validations
├── package.json
├── README.md
└── .env                   # Environment variables
```

---

## Environment Variables

Create a `.env` file and specify all required variables. Example:

```env
BREVO_API_KEY=

DATABASE_HOST=
DATABASE_NAME=accessible
DATABASE_PASSWORD=
DATABASE_PORT=
DATABASE_USER=

EMAIL_FROM=

ENHANCED_PROCESSING_ENABLED=true

FF_BATCH_PROCESSING=true
FF_CONFIDENCE_SCORING=true
FF_COST_OPTIMIZATION=true
FF_ENHANCED_SCORING=true
FF_GPT_FUNCTION_CALLING=true
FF_SMART_DEDUPLICATION=true
FF_TEMPLATE_DETECTION=true

FRONTEND_URL= # One or more URLs separated by commas (e.g. http://localhost:3000,https://app.example.com)

JWT_ALGORITHM=
JWT_AUDIENCE=
JWT_EXPIRESIN=12h
JWT_ISSUER=
JWT_SECRET=
JWT_SUBJECT=

NODE_ENV=development

OPENROUTER_API_KEY=

PA11Y_SERVER_URL=https://check.webability.io

PORT=3001

PREPROCESSING_BATCH_SIZE=5
PREPROCESSING_CONFIDENCE_THRESHOLD=30
PREPROCESSING_DEBUG_MODE=true
PREPROCESSING_MAX_CONCURRENCY=10
PREPROCESSING_TEMPLATE_THRESHOLD=3

R2_ACCESS_KEY_ID=
R2_BUCKET=
R2_ENDPOINT=
R2_SECRET_ACCESS_KEY=

SECONDARY_SERVER_URL=https://analyzer.webability.io

SENTRY_DSN=

STRIPE_PRIVATE_KEY=
STRIPE_WEBHOOK_SECRET=

AZURE_API_KEY=
AZURE_ENDPOINT=
AZURE_REGION=northeurope
```

---

## Useful Commands

- **Start server:**  
  `npm run dev` — development with hot-reload  
  `npm start` — production

- **Build project:**  
  `npm run build` — compile TypeScript to `dist`

- **Database migrations (currently not working):**  
  `npm run db:migrate` — apply migrations  
  `npm run db:rollback` — rollback migrations  
  `npm run db:seed` — run seeds

- **Linting:**  
  `npm run lint` — check code  
  `npm run lint:fix` — auto-fix

- **Formatting:**  
  `npm run format` — check formatting  
  `npm run format:fix` — auto-format files

---

## Example API Requests

Health-check request example:

```bash
curl http://localhost:3001/
```

GraphQL request example:

```graphql
query {
  validateToken(token: "your-token") {
    valid
    userId
  }
}
```

---

## Note

All endpoints and request examples for this project are collected in [Hoppscotch](https://hoppscotch.webability.io).
To get access to the request collection, please ask the administrator to add you to the team.

For local GraphQL API testing during development, you can also use [Apollo Playground](http://localhost:3001/graphql).
