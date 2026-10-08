# ⚡ Black Fighters — The Precision Study Layer for Medicine

> **Black Fighters** is an editorial-grade, AI-powered study intelligence platform built for medical students, clinical residents, and healthcare scholars. It synthesizes 1,000-page clinical textbooks and dense lecture slides into structured, citation-grounded summaries, diagnostic reasoning quizzes, and synchronized spaced repetition.

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)](https://github.com/Kandil455/black-fighters)
[![Tests](https://img.shields.io/badge/Tests-179%2F179%20Passing-success?style=flat-square)](https://github.com/Kandil455/black-fighters)
[![License](https://img.shields.io/badge/License-Proprietary-blue?style=flat-square)](https://blackfighters.site/)
[![Live App](https://img.shields.io/badge/Web-blackfighters.site-orange?style=flat-square)](https://blackfighters.site/)

---

## 🏛️ Editorial Design Language & System Tokens

The Black Fighters web experience is engineered under strict, studio-grade editorial aesthetics:

- **Typography Hierarchy:**
  - `Instrument Serif` (regular & italic): Headlines, thesis statements, numerical metrics, quotes, and pricing.
  - `Inter Tight` (400, 500, 600): Explanatory body prose, clinical reasoning boxes, and feature lists.
  - `JetBrains Mono` (400, 500, uppercase): Metadata, indices `(01)`, tags, system badges, and navigation.
- **Color Philosophy:**
  - **Light Mode:** Canvas Paper `#f3f1ec`, Elevated Paper `#e9e6de`, Ink Typography `#0d0d0c`, Hairline Rules `rgba(13,13,12,0.14)`.
  - **Dark Mode:** Deep Carbon Black `#0c0c0b`, Card Surface `#151513`, Off-White Ink `#f1efe9`, Hairlines `rgba(241,239,233,0.16)`.
  - **Single Accent:** Signal `#ff4d1f` (Light) / `#ff6a3d` (Dark) — reserved for italics, dots, progress indicators, checks, and primary CTAs.
- **Spatial Geometry:** Square corners everywhere; only pill buttons receive rounded caps. All section dividers are 1px hairline rules without drop shadows or blurred containers.

---

## ⚡ Core Platform Capabilities

### 1. 1,000-Page Textbook & Lecture Synthesis Engine
Partitions vast medical textbooks and syllabus PDFs into semantic chapters while maintaining a locked medical glossary. Every statement is bi-directionally cited back to its exact source page.

### 2. Prerequisite Scaffolding («قبل ما تقرا»)
Every clinical topic opens with an intuitive foundational bridge that deconstructs underlying physiological mechanisms before introducing complex pharmacodynamics and treatment algorithms.

### 3. Clinical Reasoning & Active Recall Banks
Auto-generates diagnostic case dilemmas, OSCE scenarios, and evidence-based questions tied directly to the ingested slides.

### 4. FSRS Spaced Repetition Flashcards
Implements modern Free Spaced Repetition Scheduling (FSRS) to calculate optimal memory decay intervals, guaranteeing long-term clinical knowledge retention.

### 5. Autonomous Telegram Bot & Mini App Sync
Two-way synchronization allows users to upload documents, receive formatted briefings, download high-resolution print-ready PDFs, and solve interactive quizzes directly inside Telegram.

### 6. Double-Entry Credit Ledger & Safety Guarantee
All AI computation credits are managed via a strict double-entry ledger. Credits are only reserved upon job initiation and 100% restored if any document processing job encounters an error.

---

## 📊 Telemetry & Verification Metrics

- **1,000 Pages:** Maximum document buffer processed in a single coordinated pipeline.
- **99.4% Accuracy:** Citation grounding and factual trace to source textbook pages.
- **14 Hours:** Average study hours saved weekly per student across medical cohorts.
- **28+ Disciplines:** Comprehensive coverage across Anatomy, Physiology, Pharmacology, Pathology, Internal Medicine, Surgery, and Pediatrics.

---

## 💳 Transparent Pricing & Tiers (EGP)

| Plan | Monthly | Annual (25% Off) | Key Features |
| :--- | :--- | :--- | :--- |
| **Starter** | **0 EGP** | **0 EGP** | Core lecture summaries, prerequisite boxes, daily FSRS flashcards |
| **Pro Fighter** *(Featured)* | **149 EGP** | **119 EGP** | 900 AI credits, 1,000-page engine, page citations, Telegram bot sync |
| **Supreme Max** | **249 EGP** | **199 EGP** | 2,500 AI credits, priority queue, emergency round simulations, ledger insurance |

---

## 🛠️ Getting Started & Local Development

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
# Clone the repository
git clone https://github.com/Kandil455/black-fighters.git
cd black-fighters

# Install dependencies
npm install
```

### Running Locally
```bash
# Start Vite development server
npm run dev:local
```
The application will be live at `http://127.0.0.1:5173/`.

### Verifying Quality & Tests
```bash
# Run the 179-contract automated test suite
npm test

# Verify production build & PWA precache
npm run build
```

---

## 📁 Repository Structure

```text
├── BLACK_FIGHTERS_DOCUMENTATION.md  # Detailed editorial landing page specification
├── index.html                       # Base HTML entry with clinical font links
├── src/
│   ├── pages/
│   │   ├── Landing.jsx              # Main Black Fighters editorial landing page
│   │   ├── LandingLegacy.jsx        # Preserved previous landing page backup
│   │   ├── Dashboard.jsx            # Student clinical study hub
│   │   ├── TelegramMiniApp.jsx      # Telegram webview interface
│   │   └── ...
│   ├── components/
│   │   ├── Layout.jsx               # App navigation & sidebar
│   │   ├── BadgeUnlockModal.jsx     # Gamification engine
│   │   └── ...
│   ├── lib/
│   │   ├── BadgeContext.jsx         # Achievement state management
│   │   ├── AuthContext.jsx          # Firebase authentication provider
│   │   └── ...
│   └── design/
│       └── atlas-tokens.css         # Clinical color and layout variables
├── public/
│   ├── black-fighters.html          # Self-contained standalone HTML landing page
│   └── ...
└── tests/
    └── unit/                        # Motion performance & budget contracts
```

---

## 👑 Sovereignty & Leadership
Designed and maintained exclusively for the **Black Fighters** academic ecosystem under the supreme command of **Alpha** ⚡.
