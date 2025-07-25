# Accessibility Widget Frontend

Frontend client for the Accessibility Widget project.

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
npm start
```

### 4. Build for production

```bash
npm run build
```

Production build will be output to the `build/` directory.

---

## Project Structure

```
├── src/                # Source code
├── public/             # Static files
├── types/              # TypeScript types
├── build/              # Production build output
├── package.json
├── README.md
└── .env                # Environment variables
```

---

## Environment Variables

Create a `.env` file and specify all required variables. Example:

```env
REACT_APP_NODE_ENV=local

REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_GRAPHQL_URL=http://localhost:3001/graphql

REACT_APP_SENTRY_DSN=

REACT_APP_STRIPE_PUBLIC_KEY=
REACT_APP_PLAN_NAME=single

# HOST and PORT below are for local development with sslip.io domain mapping
# Example: http://try-webability-app.server.techywebsolutions.com.127.0.0.1.sslip.io:3000 will resolve to your local machine
HOST=try-webability-app.server.techywebsolutions.com.127.0.0.1.sslip.io
PORT=3000
```

---

## Useful Commands

- **Start app:**  
  `npm start` — development with hot-reload

- **Build for production:**  
  `npm run build` — output to `build/`

- **Generate GraphQL types for TypeScript:**  
  `npm run codegen` — runs `graphql-codegen` with `codegen.ts` config to generate TypeScript types and hooks from your GraphQL schema

---

## Note

All backend API documentation is available in the `api/README.md` file in the root of this repository.
