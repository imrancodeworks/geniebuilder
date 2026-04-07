# GenieBuilder v4 — Smart Interview Coach


AI-powered interview simulator with adaptive smart mode, real-time feedback, and MNC readiness benchmarks.

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Build for Production

```bash
npm run build
npm run preview
```

## Features

### Scoring Modes
- **🤖 AI Mode** — Strict, accurate scoring by Claude AI (no grace marks). Requires Anthropic API key.
- **⚡ Smart Mode** — Adaptive offline engine. Questions adapt based on your weak areas. No internet needed.

### What's New in v4
- **Strict AI Scoring** — No inflated scores. Vague answers get 20–40, solid answers 60–75, exceptional 90+
- **Hover & Glow Effects** — Smooth interactive effects on all buttons and cards
- **Expanded MNC Rankings** — 31 companies with roles and India locations (Chennai/Hyderabad/Bangalore)
  - Added: Samsung, Hyundai Motor, Bosch, Siemens, Oracle
  - All companies show available roles and hiring locations in tooltip
- **MNC Tooltip** — Hover any bar to see roles available and 📍 locations
- **Qualification Summary** — See exactly how many companies you qualify for

### Companies Tracked
**Tier 1** — Google, Microsoft, Amazon, Apple, Meta, Netflix, Uber, Stripe, LinkedIn  
**Tier 2** — IBM, Samsung, Hyundai, Bosch, Siemens, Oracle, Salesforce, Adobe, SAP, Cisco, Intel  
**Tier 3** — Accenture, Deloitte, EY, PwC, Capgemini, Cognizant  
**Tier 4** — HCLTech, Infosys, TCS, Wipro, Tech Mahindra, LTIMindtree

## Tech Stack
- React 18 + Vite
- Recharts (data visualization)
- Anthropic Claude API (AI mode)
- LocalStorage (session history, smart mode state)
