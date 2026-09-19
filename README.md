# LOOP — Customer Feedback Intelligence Platform

LOOP is a web-based **Customer Feedback Intelligence Platform** that helps teams collect customer feedback, organize it, understand sentiment and themes, identify priorities, and turn raw feedback into actionable insights.

The platform combines workspace-based application architecture, role-based access control, feedback management, analytics, AI-assisted classification, semantic similarity search, an AI question-and-answer experience (**Ask LOOP**), and Voice-of-Customer reporting.

---

## 🚀 Live Project

**Live Application:**  
https://loop-ai-feedback-platform-zeta.vercel.app

**Source Code:**  
https://github.com/YashAgrawal2006/loop-ai-feedback-platform.git

---

## ✨ Key Features

### 🔐 Authentication & Workspace Management

- User signup and login.
- Workspace-based application architecture.
- Protected authenticated application routes.
- Server-side authorization checks.
- Workspace-scoped data access.

### 👥 Role-Based Access Control

LOOP supports three application roles:

| Role | Purpose |
|---|---|
| **ADMIN** | Administrative access and member management. |
| **ANALYST** | Feedback analysis and permitted operational/reporting actions. |
| **VIEWER** | Read-oriented access to workspace insights. |

Authorization is enforced through server-side API logic.

### 💬 Customer Feedback Management

- Customer feedback submission.
- Customer, source/channel and message management.
- Sentiment, category, urgency, theme and priority classification.
- Feedback status management.
- Search and filtering.
- Feedback inbox.
- CSV ingestion support.

### 📊 Dashboard & Analytics

The dashboard provides:

- Total feedback metrics.
- Feedback volume.
- Sentiment breakdown.
- Priority analysis.
- Theme-oriented insights.
- Feedback trends and operational information.

### 🤖 AI-Powered Feedback Intelligence

LOOP uses **Google Gemini** for AI-assisted capabilities including:

- Automated feedback classification.
- Sentiment analysis.
- Category and theme classification.
- Urgency and priority analysis.
- Feedback summarization.
- AI-assisted theme linking.
- Embedding generation.

### 🔎 Semantic Similarity Search

Feedback embeddings allow LOOP to find conceptually related customer feedback rather than relying only on exact keyword matches.

### 🧠 Ask LOOP

**Ask LOOP** provides an AI-powered question-and-answer interface over customer feedback.

Users can ask questions such as:

> "Why are customers having problems with checkout and payments?"

The system retrieves relevant feedback and uses the retrieved information as grounding context for AI-generated responses.

### 📈 Voice-of-Customer Reports

LOOP can generate Voice-of-Customer reports for selected reporting periods.

Reports include:

- Feedback statistics.
- Sentiment distribution.
- Priority information.
- Theme insights.
- Customer feedback evidence.
- AI-generated narrative.
- PDF export.

### 👨‍💼 Administration

Administrators can manage workspace members and roles through the administration functionality.

---

## 🏗️ System Architecture

```text
                    LOOP Web Application
                            │
                Next.js + React + TypeScript
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
        Application UI                 API Routes
        Dashboard                     Authentication
        Feedback                      Feedback
        Ask LOOP                      AI / Embeddings
        Reports                       Themes
        Admin                         Reports
             │                             │
             └──────────────┬──────────────┘
                            ▼
                    Authorization Layer
                    NextAuth + RBAC
                            │
                            ▼
                       Prisma ORM
                            │
                            ▼
                     PostgreSQL DB
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
         Feedback        Users         Workspaces
         Themes        Embeddings        Reports
                            │
                            ▼
                      Google Gemini
                 Classification / AI / Q&A
