# 🏗️ SkyWeb Repository Structure (v1.0)

## 💡 Overview
SkyWeb follows a **monorepo architecture** — meaning all frontend, backend, and shared assets live under one GitHub repository.  
This approach simplifies version control, automation, and cross‑tier collaboration.

---

## 📁 Folder Structure

```
skyweb/
│
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── Navbar.jsx
│   │   │   ├── pages/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   └── Settings.jsx
│   │   │   ├── services/
│   │   │   │   └── api.js
│   │   │   ├── context/
│   │   │   │   └── AuthContext.jsx
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   └── package.json
│   │
│   └── server/
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── userRoutes.js
│       │   └── transactionRoutes.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── userController.js
│       │   └── transactionController.js
│       ├── models/
│       │   ├── userModel.js
│       │   └── transactionModel.js
│       ├── middleware/
│       │   ├── authMiddleware.js
│       │   └── errorMiddleware.js
│       ├── config/
│       │   └── db.js
│       ├── utils/
│       │   └── logger.js
│       ├── server.js
│       └── package.json
│
├── shared/
│   ├── config/
│   │   ├── constants.js
│   │   └── env.example
│   ├── models/
│   │   └── schemaTemplates/
│   └── assets/
│       └── logo.svg
│
├── scripts/
│   ├── start-all.ps1
│   ├── start-all.sh
│   └── deploy.js
│
├── docs/
│   ├── Express_Response_Flow_CheatSheet.md
│   └── Architecture_Overview.md
│
├── .gitignore
├── README.md
└── package.json
```

---

## 🧩 Directory Descriptions

### **apps/**
Contains the two core runnable applications:
- **`web/`** → React (frontend) app built with Vite.  
  Handles UI rendering, routing, and API requests to the backend.
- **`server/`** → Node.js + Express backend.  
  Exposes REST endpoints, connects to MongoDB/PostgreSQL, handles authentication.

---

### **shared/**
Holds configuration and resources reused across both tiers:
- **`config/`** → Constants, environment templates, and shared variables.
- **`models/`** → Schema templates or validation logic that may appear in both frontend and backend.
- **`assets/`** → Common graphics, icons, or static files.

---

### **scripts/**
Operational automation layer (foundation of *SkyOps*):
- **`start-all.ps1` / `start-all.sh`** → Run both apps together.
- **`deploy.js`** → Handles build + deployment logic (CI/CD integration).

---

### **docs/**
Developer documentation and architectural references.  
All new learning artifacts (like cheat sheets, design docs, and setup notes) should live here.

---

## 🚀 Setup Commands

```bash
# Install dependencies
cd apps/web && npm install
cd ../server && npm install

# Run frontend (Vite)
npm run dev

# Run backend (Express)
npm start
```

---

## 🧠 Notes for Future SkyWeb Versions
- Add **`/database/`** folder when PostgreSQL is introduced.
- Add **`/analytics/`** when tracking and reports modules are integrated.
- Add **`/agentic/`** layer for LLM orchestration in v2.0.

---

### ✨ Author’s Note
SkyWeb is built to **grow with you** — a living, evolving system that can support any data, any connector, any dream.
