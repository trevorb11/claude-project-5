# Builder Studio - Competitive Intelligence Platform

## Overview
A Next.js 16 application for competitive intelligence research. Users set up their company profile, run deep self-assessment research, track competitors, generate AI-powered research case files with web search capabilities, view competitive scoring across 7 dimensions, and create intelligence reports.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Database**: SQLite via better-sqlite3 (stored in `data/` directory)
- **Styling**: Tailwind CSS v4 with PostCSS
- **AI**: OpenAI via Replit AI Integrations (auto-configured, billed to Replit credits; falls back to simulated data)
- **Icons**: lucide-react
- **Theme**: Builder Studio light theme (navy/orange/teal palette)

## Project Structure
```
src/
  app/
    page.tsx              - Dashboard (main page)
    layout.tsx            - Root layout with Sidebar
    setup/page.tsx        - Company profile setup + deep self-assessment research
    competitor/[id]/      - Individual competitor view with case files & scoring
    competitor/page.tsx   - Competitor listing
    intelligence/page.tsx - Intelligence reports
    api/
      company/
        route.ts          - Company profile CRUD
        research/route.ts - Company deep research (self-assessment)
      competitors/route.ts - Competitors CRUD
      research/route.ts   - Research/case files (deep research + update scans)
      intelligence/route.ts - Intelligence reports
  components/
    Sidebar.tsx           - Navigation sidebar
  lib/
    db.ts                 - SQLite database setup & initialization
    research-agent.ts     - OpenAI-powered research agent with web search
    types.ts              - TypeScript type definitions
```

## Key Features
- **Company Deep Research**: Self-assessment baseline via `runCompanyDeepResearch()` with SWOT analysis, market position, digital presence evaluation
- **Competitor Case Files**: Deep research on competitors via `runDeepResearch()` using OpenAI Responses API with web search for live data
- **Update Scans**: Lightweight research updates via `runResearchUpdate()` for scheduled monitoring
- **Competitive Scoring**: 7-dimension scorecard (product strength, market position, digital presence, customer satisfaction, pricing, innovation velocity, threat level)
- **Intelligence Reports**: AI-generated comprehensive reports synthesizing all competitor findings
- **Source Citations**: Web search results include clickable source URLs displayed in the UI

## AI Integration Architecture
- `callAI()` in `research-agent.ts` is the central AI function
- Attempts OpenAI Responses API with `web_search` tool first (for live data with source citations)
- Falls back to Chat Completions API if Responses API is unavailable
- `isOpenAICompatible()` detects OpenAI-native or Replit AI Integrations proxy
- Simulated fallback data generated when no API key is configured

## Configuration
- **Dev server**: `npm run dev` (port 5000, host 0.0.0.0)
- **Production**: `npm run build` then `npm run start` (port 5000)
- **Environment**: `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` (auto-set by Replit AI Integrations)

## User Preferences
- Light theme preferred (Builder Studio branding)
- Navy/orange/teal color palette

## Recent Changes
- 2026-02-07: Fixed web search integration — `isOpenAICompatible()` now correctly detects Replit proxy, added try-catch fallback from Responses API to Chat Completions
- 2026-02-06: Merged GitHub features: company deep research, web search + competitive scoring, update scans, Builder Studio rebrand
- 2026-02-06: Connected OpenAI via Replit AI Integrations — uses OpenAI SDK, billed to Replit credits
- 2026-02-06: Initial Replit setup - configured port 5000, allowed dev origins, deployment config
