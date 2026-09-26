# SentinelAI 🚨🤖

> **AI-Powered Real-Time Incident Intelligence & Telemetry Management Platform**  
> *Developed by [Kritika Giri (@Kritzz-23)](https://github.com/Kritzz-23)*

<p align="center">
  <a href="https://kritzz-23.github.io/SentinelAI/">
    <img src="https://img.shields.io/badge/🌐_Live_Working_Demo-kritzz--23.github.io%2FSentinelAI-8B5CF6?style=for-the-badge&logoColor=white" alt="Live Demo">
  </a>
  <a href="https://github.com/Kritzz-23/SentinelAI">
    <img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repo">
  </a>
  <a href="https://kritzz-23.github.io/">
    <img src="https://img.shields.io/badge/Portfolio-Kritika_Giri-06B6D4?style=for-the-badge" alt="Portfolio">
  </a>
</p>

---

## ⚡ Live Working Application
Explore the complete, working incident management platform right now in your browser:  
👉 **[https://kritzz-23.github.io/SentinelAI/](https://kritzz-23.github.io/SentinelAI/)**

### Interactive Sandbox Highlights:
- 🚨 **Live Incident Triage Feed**: Filter, search, and inspect real-world production outages across microservices (`payments-api`, `auth-service`, `database-cluster`).
- 🤖 **Automated SentinelAI Investigation (RCA)**: Click *Analyze with SentinelAI* to run pattern matching, isolate error signatures, generate root-cause diagnoses, and generate step-by-step remediation runbooks.
- 💥 **Outage Simulator**: Click *Simulate Outage* to inject real-time microservice anomalies into the pipeline.
- 📡 **Real-Time Telemetry Stream**: Live distributed log ingestion console tracking microservice health.
- ⏱️ **Operational Metrics**: Real-time MTTR (Mean Time to Resolution), active incident counts, and SLA tracking.

---

## 🏗️ System Architecture

```text
               ┌────────────────────────────────────────────────────────┐
               │         React + TypeScript Client Dashboard            │
               │        (Hosted on GitHub Pages / Local Port 5173)      │
               └───────────────────────────┬────────────────────────────┘
                                           │ REST / WebSocket
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │           FastAPI Gateway & Microservices API          │
               │                   (Local Port 8000)                    │
               └───────────┬───────────────────────┬────────────────────┘
                           │                       │
                ┌──────────┴────────┐     ┌────────┴────────┐
                ▼                   ▼     ▼                 ▼
          PostgreSQL             Redis Cache            RabbitMQ
      (Relational DB)         (Rate Limiter)         (Event Stream)
                │                                           │
                └─────────────────┬─────────────────────────┘
                                  ▼
               ┌────────────────────────────────────────────────────────┐
               │        Python SentinelAI Intelligence Service          │
               │                   (Local Port 8001)                    │
               │  ├─ Regex & Neural Log Clustering                      │
               │  ├─ Contextual Root Cause Diagnostics                  │
               │  ├─ RAG Knowledge Retrieval (Runbooks)                 │
               │  └─ Actionable Remediation Checklists                  │
               └────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack & Implementation

| Layer | Technologies Leveraged |
| :--- | :--- |
| **Frontend / Dashboard** | React 18, TypeScript, Vanilla CSS3 Design System, Lucide Icons, Vite |
| **Backend API Gateway** | Python 3.11, FastAPI, Pydantic, Uvicorn, JWT Auth |
| **AI Intelligence Service** | Python, Regular Expression Clustering, Deterministic Fallback, NLP |
| **Data & Messaging** | PostgreSQL, Redis, RabbitMQ |
| **DevOps & Cloud** | Docker, Docker Compose, GitHub Actions, GitHub Pages |

---

## 🚀 Local Docker Development

If you wish to run the full multi-container backend stack with PostgreSQL, Redis, and RabbitMQ locally:

### 1. Clone & Configure
```bash
git clone https://github.com/Kritzz-23/SentinelAI.git
cd SentinelAI
cp .env.example .env
```

### 2. Launch Multi-Container Infrastructure
```bash
docker compose up --build
```

### 3. Service Endpoints
- **Web Dashboard:** `http://localhost:5173`
- **FastAPI Backend Docs:** `http://localhost:8000/docs`
- **SentinelAI Service Docs:** `http://localhost:8001/docs`
- **RabbitMQ Management UI:** `http://localhost:15672` *(guest / guest)*

### Demo Account
- **Email:** `admin@sentinel.local`
- **Password:** `Admin@123`

---

## 📁 Repository Structure

```
SentinelAI/
│
├── docs/                        # Complete Live Web Application (Hosted on GitHub Pages)
│   ├── index.html               # Incident Command Center UI & Telemetry Console
│   ├── styles.css               # Modern dark-mode design system & animations
│   └── app.js                   # Client-side deterministic AI engine & telemetry stream
│
├── backend/                     # FastAPI Gateway API
│   ├── app/                     # Incident CRUD, Auth, WebSocket handlers
│   └── Dockerfile
│
├── ai_service/                  # Python AI Intelligence Engine
│   ├── app/main.py              # Log pattern classification & RCA generation
│   └── Dockerfile
│
├── frontend/                    # Vite + React source codebase
│   └── src/
│
├── docker-compose.yml           # Local multi-service infrastructure
└── README.md
```

---

## 👤 Author

**Kritika Giri**  
- Portfolio: [https://kritzz-23.github.io/](https://kritzz-23.github.io/)  
- GitHub: [@Kritzz-23](https://github.com/Kritzz-23)  
- LinkedIn: [linkedin.com/in/kritika-giri-2320aa345](https://www.linkedin.com/in/kritika-giri-2320aa345/)  
- Email: [girikritika30@gmail.com](mailto:girikritika30@gmail.com)
