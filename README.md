# 📋 TaskFlow API — Production-Ready Task Management REST API

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/Node-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Tests](https://img.shields.io/badge/tests-node:test-3ddc84)

TaskFlow is a complete, production-minded REST API for project & task management. It implements the patterns real backends need: **JWT authentication with bcrypt-hashed passwords**, **Zod input validation on every mutation**, **ownership/RBAC checks** so users can only touch their own resources, **rate limiting**, **security headers** via Helmet, **interactive OpenAPI docs** served at `/docs`, and a full **integration test suite** built on the Node.js built-in test runner (zero extra test framework).

The architecture is deliberately layered — routes, middleware, and a store abstraction — so the in-memory database can be swapped for Postgres/Prisma or MongoDB by rewriting a single file (`src/db.js`) without touching business logic.

## ✨ Features

- **Auth** — register/login with bcrypt (cost 12), signed JWTs with configurable expiry, consistent 401 semantics.
- **Projects** — CRUD with per-user isolation; deleting a project cascades to its tasks.
- **Tasks** — statuses (`todo → in_progress → review → done`), priorities (`low → urgent`), due dates, combined filters and priority-sorted listings.
- **Validation** — Zod schemas return structured `422` field errors instead of leaking internals.
- **Security** — Helmet headers, CORS, 300 req/15min rate limit per IP, 1MB JSON body cap.
- **Docs** — full OpenAPI 3.0 spec rendered by Swagger UI at `/docs`.
- **Tests** — supertest integration tests covering auth flows, ownership, filtering and cascade deletes: `npm test`.
- **Health endpoint** — `/api/health` with uptime, ready for Docker/K8s probes.

## 🧱 Tech Stack

| Concern     | Choice                                  |
| ----------- | --------------------------------------- |
| Runtime     | Node.js 18+ (ESM)                       |
| Framework   | Express 4                               |
| Auth        | jsonwebtoken + bcryptjs                 |
| Validation  | Zod                                     |
| Docs        | OpenAPI 3.0 + swagger-ui-express        |
| Hardening   | helmet, cors, express-rate-limit        |
| Testing     | node:test + supertest                   |

## 🚀 Getting Started

```bash
git clone https://github.com/johnkey98/taskflow-api.git
cd taskflow-api
npm install

# configure environment
cp .env.example .env
# → set JWT_SECRET to a long random string

npm run dev        # dev mode with auto-reload on http://localhost:3000
npm test           # run the integration test suite
```

### Generate a strong JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 📡 API Overview

Interactive docs: **http://localhost:3000/docs**

| Method | Endpoint          | Auth | Description                          |
| ------ | ----------------- | ---- | ------------------------------------ |
| POST   | `/api/auth/register` | – | Create account, returns JWT          |
| POST   | `/api/auth/login`    | – | Get JWT                              |
| GET    | `/api/projects`      | ✅ | List my projects                     |
| POST   | `/api/projects`      | ✅ | Create project                       |
| GET    | `/api/projects/:id`  | ✅ | Project + tasks (owner only)         |
| DELETE | `/api/projects/:id`  | ✅ | Delete + cascade tasks               |
| GET    | `/api/tasks`         | ✅ | Filter by `projectId/status/priority`|
| POST   | `/api/tasks`         | ✅ | Create task                          |
| PATCH  | `/api/tasks/:id`     | ✅ | Update fields                        |
| DELETE | `/api/tasks/:id`     | ✅ | Delete task                          |
| GET    | `/api/health`        | –  | Liveness probe                       |

### Quick tour with curl

```bash
# 1. Register
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"supersecret123"}' | jq -r .token)

# 2. Create a project
PROJECT=$(curl -s -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Website Redesign"}' | jq -r .id)

# 3. Add a task
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT\",\"title\":\"Ship the landing page\",\"priority\":\"high\"}"

# 4. List high-priority tasks
curl -s "http://localhost:3000/api/tasks?priority=high" -H "Authorization: Bearer $TOKEN"
```

## 📂 Project Structure

```
taskflow-api/
├── openapi.yaml               # OpenAPI 3.0 spec (served at /docs)
├── src/
│   ├── index.js               # Bootstrap
│   ├── app.js                 # Express app: middleware, docs, routes
│   ├── db.js                  # In-memory store (swap point for a real DB)
│   ├── middleware/
│   │   ├── auth.js            # JWT bearer verification
│   │   └── error.js           # 404 + centralized error handling
│   └── routes/
│       ├── auth.routes.js
│       ├── projects.routes.js
│       └── tasks.routes.js
└── tests/
    └── api.test.js            # supertest integration suite
```

## 🗺 Roadmap

- [ ] Refresh tokens + token revocation
- [ ] Team workspaces with member roles (admin/member/viewer)
- [ ] Postgres adapter via Prisma
- [ ] Dockerfile + healthcheck
- [ ] Webhook events on task status change

## 📄 License

[MIT](LICENSE) © [John Key](https://github.com/johnkey98)
