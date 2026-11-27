# StudyMate AI — Code walkthrough

## Architecture

```text
Student browser
  React + Vite + Tailwind + React Router
     | Firebase Web SDK -> Firebase Authentication
     | Bearer Firebase ID token + HTTPS (live)
     v
  Express API -> Firebase Admin verifyIdToken
     | -> input validation / per-user rate limit
     | -> Gemini GenerateContent REST API
     | -> MongoDB Atlas (mongoose)
     v
  JSON -> React screen
```

Demo replaces Firebase token verification with a fixed local user, Gemini with fixed samples, and MongoDB with Map memory. Do not deploy demo.

## Client files

- `main.jsx` mounts React, BrowserRouter and AuthProvider. `App.jsx` defines public routes, Login/Register, protected Shell and its nested tool routes. Shell uses localStorage for theme and Firebase sign-out. `pages.jsx` contains named page components and reusable components.
- `auth.jsx` initializes Firebase only in live mode. AuthProvider observes auth state and exposes login/register/google/reset/logout. `authHeaders()` retrieves current Firebase ID token, not user's password. `api.js` injects it into Authorization. It also handles network errors and checks demo/live match at login.
- `pages.jsx`: useEntries fetches saved user items, runs requests with busy/error state, inserts updated items, deletes with confirmation. Dashboard and Progress call `/api/progress`. AI output renders via react-markdown (raw HTML not enabled; image elements excluded). Forms use React state. Quiz choices are submitted as index array; result is returned from server. Planner sends task completion boolean. Flashcards reveal answer client-side by design.
- `index.css` custom responsive styling alongside Tailwind v4. Theme variables are near top, primary button and welcome gradient also specify colors. Vite uses React and Tailwind plugins.

## Server files

- `index.js` loads env, validates live config, starts store/auth/AI, applies security middleware, JSON body limit and CORS. Health is intentionally public. `/api` mounts the authenticated router. Error middleware avoids sending raw stack traces or secrets.
- `auth.js` verifies Firebase ID token with Firebase Admin and sets `req.user.uid`. Never trust a uid from the request body for ownership.
- `store.js` implements create/list/get/update/remove. The Entry schema uses a UUID, userId, kind, title, data, createdAt. All user item operations filter on uid. In demo it uses a Map with cloned objects. MongoDB collection is `entries`.
- `ai.js` uses Google GenerateContent with server secret header and configurable model. PDF goes as inlineData base64. Structured responses request JSON MIME, parse JSON and validate shape. Demo explicitly returns sample content. No live provider calls in demo.
- `logic.js` validates text, integers, dates, structured generated output; computes score; hides quiz answers before submit; checks plan budget. `routes.js` implements every API and stores results. `test/logic.test.js` tests these pure functions without external dependencies.

## Data model (single collection by kind)

```js
{
  id: "uuid",
  userId: "Firebase UID",
  kind: "chat | notes | quiz | flashcards | plan",
  title: "Topic or filename",
  data: { /* shape varies by kind */ },
  createdAt: new Date()
}
```

`chat.data`: question, answer. `notes.data`: summary, filename. `quiz.data`: questions, optional result. `flashcards.data`: cards array. `plan.data`: examDate, startDate, minutes, tasks array. Quiz results and plan completion derive progress; no separate progress collection. Auth accounts reside in Firebase, not MongoDB; no passwords in MongoDB. List and analytics are bounded to latest 100 items per category.

## API table

Base `http://localhost:5000/api`. In live mode every endpoint except health requires `Authorization: Bearer <Firebase ID token>`. Demo needs no auth and is loopback only.

| Method | Endpoint | Request body | Result |
|---|---|---|---|
| GET | /health | — | status, demo |
| GET | /me | — | account info |
| GET | /entries/:kind | — | saved history |
| DELETE | /entries/:kind/:id | — | deletion confirmation |
| POST | /ai/chat | question, useHistory | saved answer |
| POST | /pdf/summarize | multipart file, language | saved summary |
| POST | /quiz/generate | topic, difficulty, count | quiz with no answer keys |
| POST | /quiz/:id/submit | answers (zero-based integer array) | score + answer review |
| POST | /flashcards/generate | topic, count | card set |
| POST | /planner/generate | subject, examDate, today, minutes, weakTopics | plan |
| PATCH | /planner/:id/task/:index | done (boolean) | updated plan |
| GET | /progress | — | metrics and trend |

Kinds are `chat`, `notes`, `quiz`, `flashcards`, `plan`.

## Postman test examples (local demo)

1. GET `http://localhost:5000/api/health`.
2. POST `http://localhost:5000/api/ai/chat` → Body → raw → JSON:

```json
{"question":"Explain OOP in Bangla", "useHistory":false}
```

3. POST `/api/quiz/generate`:

```json
{"topic":"Database", "difficulty":"Medium", "count":3}
```

Copy the returned `id` (not an example). POST `/api/quiz/ACTUAL_ID/submit`:

```json
{"answers":[0,1,0]}
```

4. POST `/api/flashcards/generate`:

```json
{"topic":"JavaScript", "count":5}
```

5. POST `/api/planner/generate` (replace today and exam date with your actual local dates, future exam date):

```json
{"subject":"Math","today":"2026-11-25","examDate":"2026-12-02","minutes":120,"weakTopics":"Algebra"}
```

6. PATCH `/api/planner/ACTUAL_ID/task/0`:

```json
{"done":true}
```

7. PDF: POST `/api/pdf/summarize` → Body → form-data → key `file` type File, select actual PDF, `language` type Text value `Bangla`. Live mode sends that PDF to Gemini, demo does not.
8. GET `/api/progress` and `/api/entries/chat`.

## Change/customize code

- Brand/name: App.jsx Brand component, Landing and index.html title.
- Theme: index.css `:root` variables, `.btn.primary`, `.welcome` gradient, `.brand-icon` etc.
- Sidebar navigation: App.jsx `navigation` and nested Routes; Dashboard cards: pages.jsx `features`.
- AI instructions: server/src/ai.js `instruction`; feature prompt in routes.js. For AI output type changes update validation in logic.js and matching React page.
- Max file size: routes.js multer limits and pages.jsx PDF validation/label. Keep within your provider limits.
- Planner day cap: routes.js `Math.min(remaining,14)` and UI text; validateGenerated max length/day and test updates as appropriate.
- API port: server .env PORT and client .env VITE_API_URL; Vite port and CLIENT_URL must match.

## Adding a new feature

Example: vocabulary learning. Add `vocab` to the router's `kinds` set, add POST route with text validation, structured AI response validation, store entry scoped by `req.user.uid`, return safe output. Create a React page using useEntries('vocab'), add protected Route and navigation item. Add unit tests for output validation and manual live tests for authorization and CRUD.

## Production notes

This is a complete source starter/project prototype, not a security-audited production product. Before a public release add integration/E2E tests, verify dependency compatibility/security with `npm audit` and review fixes, monitor cost and data retention, and verify live provider model support. Source is provided; node_modules and credentials are excluded deliberately. See README for exact setup commands and testing limitations.
