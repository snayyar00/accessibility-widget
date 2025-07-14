
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
NODE_ENV=development

REACT_APP_DOMAIN=http://localhost:3000

REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_GRAPHQL_URL=http://localhost:3001/graphql

REACT_APP_SENTRY_DSN=

REACT_APP_STRIPE_PUBLIC_KEY=
REACT_APP_PLAN_NAME=single
```

---

## Useful Commands

- **Start app:**  
  `npm start` — development with hot-reload

- **Build for production:**  
  `npm run build` — output to `build/`

---

## Note

All backend API documentation is available in the `api/README.md` file in the root of this repository.
