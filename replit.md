# Case Files - Competitive Intelligence Platform

## Overview
A Next.js 16 application for competitive intelligence research. Users set up their company profile, track competitors, build case files with research findings, and generate intelligence reports.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Database**: SQLite via better-sqlite3 (stored in `data/` directory)
- **Styling**: Tailwind CSS v4 with PostCSS
- **AI**: OpenAI via Replit AI Integrations (auto-configured, no API key needed; falls back to simulated data)
- **Icons**: lucide-react

## Project Structure
```
src/
  app/
    page.tsx              - Dashboard (main page)
    layout.tsx            - Root layout with Sidebar
    setup/page.tsx        - Company profile setup
    competitor/[id]/      - Individual competitor view
    competitor/page.tsx   - Competitor listing
    intelligence/page.tsx - Intelligence reports
    api/
      company/route.ts    - Company profile CRUD
      competitors/route.ts - Competitors CRUD
      research/route.ts   - Research/case files management
      intelligence/route.ts - Intelligence reports
  components/
    Sidebar.tsx           - Navigation sidebar
  lib/
    db.ts                 - SQLite database setup & initialization
    research-agent.ts     - OpenAI-powered research agent
    types.ts              - TypeScript type definitions
```

## Configuration
- **Dev server**: `npm run dev` (port 5000, host 0.0.0.0)
- **Production**: `npm run build` then `npm run start` (port 5000)
- **Environment**: `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` (auto-set by Replit AI Integrations)

## Recent Changes
- 2026-02-06: Connected OpenAI via Replit AI Integrations for deep research — uses OpenAI SDK instead of raw fetch, billed to Replit credits
- 2026-02-06: Initial Replit setup - configured port 5000, allowed dev origins for Replit proxy, set up deployment config
