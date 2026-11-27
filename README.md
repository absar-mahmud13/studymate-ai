# StudyMate AI — সম্পূর্ণ সোর্স কোড ও সেটআপ গাইড

React + Tailwind CSS + Express + MongoDB Atlas + Firebase Authentication + Gemini API দিয়ে শিক্ষার্থীদের জন্য একটি AI study workspace।

## ১. প্রথমে জেনে নিন

- **Demo Mode**: API key, Firebase বা MongoDB ছাড়াই স্থানীয়ভাবে সব প্রধান UI ও feature flow চালানোর জন্য। AI response নির্দিষ্ট sample; PDF আসলে বিশ্লেষণ করা হয় না; data server memory-তে থাকে এবং restart করলে হারিয়ে যায়। Demo account বাস্তব authentication নয়। এটি কখনো public deploy করবেন না। Demo server শুধু 127.0.0.1-এ bind করে।
- **Live Mode**: নিজের Firebase project, MongoDB URI এবং Gemini key/model লাগবে। AI service-এর quota, দাম ও model availability আপনার account অনুযায়ী পরিবর্তিত হয়। ChatGPT subscription Gemini API credits নয়।
- এই release-এ সাতটি pure logic unit test এবং JavaScript/JSX syntax check পাস করেছে। নির্মাণ পরিবেশে npm registry-তে DNS/network access না থাকায় dependency install, full build, browser end-to-end test, live Firebase/MongoDB/Gemini test করা যায়নি। প্রথমবার চালিয়ে নিচের checklist অনুসারে যাচাই করুন। `package-lock.json` প্রথম npm install-এ তৈরি হবে।
- UI English, AI input Bangla/English; live tutor শিক্ষার্থীর ভাষায় উত্তর দেওয়ার নির্দেশ পায়। Admin dashboard, reminders, document OCR engine, real-time timer, production-grade monitoring এই version-এর scope-এ নেই।

## ২. কী কী আছে?

| Feature | বাস্তবায়ন |
|---|---|
| Landing, Dashboard | responsive layout, tool navigation, stats |
| Authentication | Firebase email/password, Google sign-in, reset, logout; protected backend API |
| AI Chat | question, previous 5 exchanges optional context, Markdown answer, copy/delete |
| PDF Summary | 10 MB limit, PDF header/MIME validation, Gemini inline PDF, English/Bangla, saved summaries |
| Quiz | topic/count/difficulty, validated JSON, hidden correct answers until submit, server score, review |
| Flashcards | topic, count, flip, previous/next, saved sets |
| Planner | subject/exam date/daily minutes/weak topics, up to 14-day plan, completion tracking |
| Progress | recent 100 items/category, quiz average/chart, planned minutes marked completed |
| Profile | account info, password reset, sign-out, light/dark theme |

## ৩. Software install (Windows/Linux/macOS)

1. https://nodejs.org/ থেকে বর্তমানে supported LTS, অন্তত Node.js 22.12 বা নতুন compatible version install করুন।
2. https://code.visualstudio.com/ থেকে VS Code install করুন।
3. https://git-scm.com/ থেকে Git install করুন (GitHub upload-এর জন্য)।
4. Optional: https://www.postman.com/downloads/ থেকে Postman।
5. VS Code Terminal খুলুন (Terminal > New Terminal)। চালান:

```bash
node -v
npm -v
git --version
```

Windows PowerShell-এ npm.ps1 execution policy error হলে Terminal dropdown থেকে Command Prompt ব্যবহার করুন, অথবা `npm.cmd` লিখুন। System-wide policy দুর্বল করার দরকার নেই।

## ৪. ZIP extract এবং project open

ZIP-এর উপর right-click > Extract All। Extract হওয়া `StudyMate-AI` folder VS Code-এর File > Open Folder থেকে খুলুন। Terminal-এর working directory ওই root folder হতে হবে, যেখানে `client`, `server` এবং `package.json` আছে।

```bash
npm run setup
```

এটি server ও client দুই জায়গায় npm install করে। Internet লাগবে। আলাদাভাবে চাইলে:

```bash
npm install --prefix server
npm install --prefix client
```

`node_modules` ইচ্ছাকৃতভাবে ZIP-এ রাখা হয়নি। Error হলে নিচের troubleshooting দেখুন।

## ৫. Demo Mode (প্রথমে এটাই চালান)

Root folder থেকে `.env.example` copy করুন। Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Windows Command Prompt:

```bat
copy server\.env.example server\.env
copy client\.env.example client\.env
```

macOS/Linux/Git Bash:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Server .env-এ `DEMO_MODE=true` ও client .env-এ `VITE_DEMO_MODE=true` থাকবে। বাকি key খালি থাকতে পারে।

Terminal 1 (root folder):

```bash
npm run dev:server
```

Expected terminal: `StudyMate API on port 5000 (LOCAL DEMO)`। Browser: http://localhost:5000/api/health — expected JSON `{"status":"ok","demo":true}`।

Terminal 2 (root folder):

```bash
npm run dev:client
```

Browser: http://localhost:5173 । Landing page > Get started > Enter demo workspace। Dashboard থেকে AI Chat, PDF, Quiz, Flashcards, Planner, Progress খুলুন। কোনো demo password লাগবে না। Demo login page reload করলে আবার Enter demo workspace করতে হতে পারে; server restart না হলে sample data থাকে।

দুইটি terminal খোলা রাখতে হবে। বন্ধ করতে Ctrl+C।

## ৬. Live Mode — MongoDB Atlas

1. https://www.mongodb.com/atlas এ account করুন এবং নতুন project তৈরি করুন।
2. উপলব্ধ free/low-cost cluster তৈরি করুন। Billing ও quota আগে দেখুন।
3. Database Access > Add Database User। আলাদা database username/password দিন। Atlas website login password নয়।
4. প্রয়োজনীয় database-এ read/write permission দিন।
5. Network Access > Add IP Address > নিজের বর্তমান public IP add করুন। Public wildcard 0.0.0.0/0 production-এ এড়িয়ে চলুন।
6. Database > Connect > Drivers > Node.js > connection string copy করুন। `<password>` বদলে database password দিন; বিশেষ character URL encode করতে হবে।
7. `server/.env`-এ লিখুন (example, বাস্তব URI নয়):

```dotenv
MONGODB_URI=mongodb+srv://studyuser:ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/studymate?retryWrites=true&w=majority
```

MongoDB-তে app-এর `entries` collection first write-এ তৈরি হবে। Database account credentials কখনো client env-এ দেবেন না।

## ৭. Live Mode — Gemini API

1. https://aistudio.google.com/ এ Google account দিয়ে sign in করুন।
2. API Keys থেকে নতুন key তৈরি করুন। Account-এর region availability, billing, usage limit যাচাই করুন।
3. https://ai.google.dev/gemini-api/docs/models থেকে অথবা AI Studio-তে আপনার project-এ উপলব্ধ `generateContent`, PDF ও JSON output সমর্থিত Flash model ID copy করুন। Model ID version পরিবর্তন হয়, তাই ইচ্ছাকৃতভাবে default model hard-code করা হয়নি।
4. `server/.env`:

```dotenv
GEMINI_API_KEY=PASTE_YOUR_REAL_KEY
GEMINI_MODEL=PASTE_SUPPORTED_MODEL_ID
```

Backend native `fetch` দিয়ে Gemini GenerateContent REST API call করে; আলাদা Google SDK প্রয়োজন নেই। Documentation: https://ai.google.dev/api/generate-content এবং https://ai.google.dev/gemini-api/docs/document-processing । API key browser-এ পাঠানো হয় না। Invalid model/limit হলে backend error দেখাবে।

## ৮. Live Mode — Firebase web authentication

1. https://console.firebase.google.com/ > Create a project (যেমন studymate-ai)।
2. Project Overview > Add app > Web (</> icon)। নাম দিন `StudyMate Web`, Register app।
3. Firebase configuration থেকে apiKey, authDomain, projectId, appId, messagingSenderId, storageBucket copy করুন। Firebase Hosting দরকার নেই।
4. Build > Authentication > Get started > Sign-in method > Email/Password enable করুন। Google sign-in ব্যবহার করতে Google provider enable ও support email নির্বাচন করুন।
5. Authentication > Settings > Authorized domains-এ `localhost` আছে কি না দেখুন; না থাকলে add করুন। Deploy করার পর Vercel domain add করুন।
6. `client/.env`-এ নিজের config বসান:

```dotenv
VITE_DEMO_MODE=false
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
```

Firebase web configuration public client identifiers; service-account private key এবং Gemini key একেবারেই আলাদা secret। `VITE_` variables browser bundle-এ চলে যায়, সেখানে private secret রাখবেন না।

## ৯. Live Mode — Firebase Admin (backend token verification)

1. Firebase Console > Project settings (gear) > Service accounts > Firebase Admin SDK > Generate new private key। JSON file download হবে। Key নিরাপদে রাখুন, GitHub-এ দেবেন না।
2. Backend-এর `FIREBASE_SERVICE_ACCOUNT_JSON` value হিসেবে সম্পূর্ণ JSON file-এর এক লাইনের representation লাগবে। PowerShell-এ (path আপনার downloaded file অনুযায়ী বদলান):

```powershell
(Get-Content 'C:\Users\YOUR_NAME\Downloads\YOUR_KEY.json' -Raw | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 20)
```

macOS/Linux/Git Bash (Node ব্যবহার করে, path বদলান):

```bash
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))))" /path/to/YOUR_KEY.json
```

Terminal output কেবল নিজের `.env` ফাইলে paste করুন। Screenshot/share করবেন না। Local dotenv file-এ JSON-কে single quotes দিয়ে wrap করুন যাতে private key-এর escaped `\n` অক্ষুণ্ণ থাকে। Example নিচে (নকল placeholder, বাস্তব key নয়):

```dotenv
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"YOUR_PROJECT","private_key":"-----BEGIN PRIVATE KEY-----\nREDACTED\n-----END PRIVATE KEY-----\n","client_email":"YOUR_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com"}'
```

বাস্তবে downloaded file-এর **সব fields** সহ complete JSON ব্যবহার করুন; উদাহরণটি replace করবেন। Client এবং server একই Firebase project-এর হতে হবে।

## ১০. Live Mode চালু করুন

`server/.env` সম্পূর্ণ example:

```dotenv
DEMO_MODE=false
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=YOUR_REAL_MONGODB_URI
GEMINI_API_KEY=YOUR_REAL_GEMINI_KEY
GEMINI_MODEL=YOUR_REAL_SUPPORTED_MODEL_ID
FIREBASE_SERVICE_ACCOUNT_JSON='YOUR_COMPLETE_ONE_LINE_JSON'
```

Client `.env`-এ `VITE_DEMO_MODE=false` এবং Firebase config থাকতে হবে। আগের দুই terminal Ctrl+C দিয়ে বন্ধ করে পুনরায় root folder থেকে চালান:

```bash
npm run dev:server
```

অন্য terminal:

```bash
npm run dev:client
```

Browser http://localhost:5000/api/health → `demo:false` হওয়া উচিত। এরপর http://localhost:5173 → Get started → Create an account → name/email/password (কমপক্ষে 6 characters) → Register। Google দিয়ে sign-in করাও সম্ভব। AI Chat-এ প্রশ্ন করে test করুন। তারপর PDF/Quiz/Flashcards/Planner।

## ১১. Source code কোন file-এ কী?

```text
StudyMate-AI/
├── README.md                   # এই বাংলা setup guide
├── CODE_GUIDE.md               # architecture ও file-by-file ব্যাখ্যা
├── package.json                # root npm shortcuts
├── .gitignore                  # secrets/node_modules exclude
├── client/
│   ├── .env.example            # frontend config template
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js          # React + Tailwind plugin
│   ├── vercel.json             # SPA routing
│   └── src/
│       ├── main.jsx            # React root/router/provider
│       ├── App.jsx             # landing, auth, dashboard shell, routing
│       ├── auth.jsx            # Firebase auth context and token
│       ├── api.js              # authenticated HTTP fetch wrapper
│       ├── pages.jsx           # all study feature screens
│       └── index.css           # responsive UI and theme
└── server/
    ├── .env.example            # server secret config template
    ├── package.json
    ├── src/
    │   ├── index.js            # Express startup/config/security/error handling
    │   ├── auth.js             # Firebase Admin verification
    │   ├── store.js            # MongoDB model, local demo memory CRUD
    │   ├── ai.js               # Gemini requests and demo response generator
    │   ├── logic.js            # validation, quiz scoring, plan constraints
    │   └── routes.js           # feature REST API routes
    └── test/
        └── logic.test.js       # Node test runner tests
```

## ১২. Testing

Root folder:

```bash
npm test
npm run build
```

প্রথম command pure unit tests; দ্বিতীয় command dependency installation-এর পরে production frontend build তৈরি করে `client/dist`-এ।

Manual checklist:

- [ ] Demo health endpoint works; demo entry opens dashboard.
- [ ] Live register, email/password, Google sign-in, logout, forgot password work.
- [ ] Bangla এবং English chat response, copy এবং delete কাজ করে।
- [ ] Valid PDF (<10 MB) summary saves; non-PDF/oversize rejected। Demo summary fixed।
- [ ] Quiz generates 3–10 questions, correct answers hidden until submit, result correct, duplicate submission blocked।
- [ ] Flashcards generate, flip, next/previous, saved history works।
- [ ] Future exam date and daily time produce plan, tasks complete, time budget enforced।
- [ ] Progress changes after quiz submission and planner tasks marked complete।
- [ ] Mobile width 375px এবং dark theme পরীক্ষা করুন।
- [ ] Live mode-এ token ছাড়া `/api/entries/chat` request 401; user A-এর item ID user B দিয়ে GET/DELETE/PATCH/submit করলে access না পায়।
- [ ] Browser reload-এ live history থাকে; demo restart-এ reset হয়।
- [ ] Git status-এ `.env` বা downloaded key নেই।

## ১৩. GitHub-এ upload

GitHub-এ empty repository `studymate-ai` তৈরি করুন। Root terminal:

```bash
git init
git add .
git status
git commit -m "Build StudyMate AI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/studymate-ai.git
git push -u origin main
```

`git status`-এ secrets না থাকা নিশ্চিত করে তারপর commit করবেন। Service account JSON অন্য নামে থাকলে project folder-এ রাখবেন না। Secret ভুল করে push হলে key revoke/rotate করুন, শুধু file delete যথেষ্ট নয়। npm install-এর পরে তৈরি হওয়া package-lock.json commit করুন।

## ১৪. Deployment — Render + Vercel

প্রথমে local live mode পরীক্ষা করুন। Demo deploy করবেন না। Free hosting tier, sleep, availability এবং billing terms current provider dashboard-এ যাচাই করুন।

**Backend Render:** https://render.com/ > New Web Service > GitHub repository > root directory `server`, runtime Node, build command `npm ci` (lockfile committed হলে), start command `npm start`। Health check path `/api/health`। Environment variables: `NODE_ENV=production`, `DEMO_MODE=false`, `MONGODB_URI`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `CLIENT_URL=https://YOUR_FRONTEND.vercel.app`। Render environment variable UI-তে JSON raw এক লাইনে paste করুন, dotenv-এর বাইরের single quote দেবেন না। Platform PORT স্বয়ংক্রিয়ভাবে দিলে সেটি ব্যবহার হবে। Render deployment যদি এক trusted reverse proxy-এর পেছনে চলে, `TRUST_PROXY=1` দিন; proxy topology যাচাই করুন। Atlas Network Access-এ Render-এর documented outbound IP ranges allow করুন। Backend URL copy করুন।

**Frontend Vercel:** https://vercel.com/ > Add New Project > GitHub repo > root directory `client`, framework Vite, build `npm run build`, output `dist`। সব `VITE_FIREBASE_*`, `VITE_DEMO_MODE=false`, `VITE_API_URL=https://YOUR_BACKEND.onrender.com` set করুন। Deploy করুন। `vercel.json` SPA rewrite already আছে।

Final steps: Firebase Authorized domains-এ frontend domain add করুন; Render CLIENT_URL-এ exact deployed frontend origin (trailing slash ছাড়া) set করে redeploy। Vercel env বদলালে rebuild/redeploy করুন। Live URL-এ sign in ও AI features পরীক্ষা করুন।

## ১৫. Common errors / solutions

| Error | করণীয় |
|---|---|
| `node` / `npm` not recognized | Node install, VS Code restart, PATH check |
| npm.ps1 cannot be loaded | Command Prompt বা npm.cmd ব্যবহার |
| `EAI_AGAIN` / `ENOTFOUND` | Internet/DNS/proxy/registry access check; retry npm install |
| Cannot find package | root থেকে `npm run setup` |
| Missing MONGODB_URI etc. | `server/.env` আছে কিনা দেখুন; demo false হলে সব keys required |
| Server connection refused | server terminal চালু, port 5000 health check |
| Client/server demo mismatch | দুই .env-এ একই mode, দুটো process restart |
| Port already in use | আগের terminal বন্ধ করুন অথবা port/API URL একসঙ্গে update করুন |
| Atlas connection failed | IP allowlist, DB username/password, URL encoding, URI |
| Firebase invalid API key / auth-domain | client Firebase config check |
| Firebase unauthorized-domain | Authentication > Settings > Authorized domains add |
| Invalid credentials JSON | complete one-line service-account JSON; `\n` preserve করুন |
| 401 | login করুন; same Firebase project and valid token check |
| Origin not allowed | server CLIENT_URL-এ exact client origin set |
| 429 | Gemini quota বা app rate limit; পরে retry করুন, usage check |
| AI request failed | API key, model ID, billing/project, GenerateContent support check |
| AI invalid JSON | Generate আবার করুন; JSON-capable model ব্যবহার করুন |
| PDF fails | real PDF, max 10 MB, supported model; encrypted PDF may fail |
| Vercel route refresh 404 | `client/vercel.json` deploy হয়েছে কি না দেখুন |

## ১৬. Security ও সীমাবদ্ধতা

Live backend token verify করে ও প্রতিটি data query Firebase uid-তে সীমাবদ্ধ রাখে। API key server-side, AI requests per-user rate-limited, global rate limit ও CORS/Helmet আছে। PDF raw bytes app database-এ রাখা হয় না; third-party Gemini service-এ পাঠানো হয়। Sensitive/private/copyright-restricted documents upload করবেন না; API provider-এর data handling terms পড়ুন। AI output যাচাই করা দরকার, factual accuracy guaranteed নয়। Public production release-এর আগে integration tests, dependency audit, rate-limit policy, billing budgets, privacy notice, deletion/retention policy, operational monitoring, database backups এবং stricter abuse protection যোগ করুন। In-memory limiter single server-এর জন্য; multi-instance deployment-এ shared rate-limit store দরকার। Planner task concurrent edits last-write-wins; production concurrency requirements অনুযায়ী atomic update যোগ করুন।

## ১৭. Recommended learning sequence

Demo setup → `main.jsx` → `App.jsx` → `pages.jsx` → `api.js` → server `index.js` → `routes.js` → `logic.js` → `ai.js` → `store.js` → Firebase live setup → tests → deploy। বিস্তারিত code flow ও API examples `CODE_GUIDE.md`-এ আছে।
