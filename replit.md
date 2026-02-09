# Homebuilder Studio - Competitive Intelligence Platform

## Overview
A Next.js 16 application for competitive intelligence research. Users set up their company profile, run deep self-assessment research, track competitors, generate AI-powered research case files with web search capabilities, view competitive scoring across 7 dimensions, compare competitors side-by-side, create battle cards, track changes with automated alerts, sync data to GoHighLevel CRM, compare floor plans, and generate intelligence reports.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Database**: SQLite via better-sqlite3 (stored in `data/` directory)
- **Styling**: Tailwind CSS v4 with PostCSS
- **AI**: OpenAI via Replit AI Integrations (auto-configured, billed to Replit credits; falls back to simulated data)
- **Icons**: lucide-react
- **Theme**: Homebuilder Studio light theme (navy/orange/teal palette, logo at /public/images/logo.png)
- **CRM Integration**: GoHighLevel (GHL) via built-in API client + MCP server

## Project Structure
```
src/
  app/
    page.tsx              - Dashboard (main page)
    layout.tsx            - Root layout with Sidebar
    setup/page.tsx        - Company profile setup + deep self-assessment research
    competitor/[id]/      - Individual competitor view with case files & scoring
    competitor/page.tsx   - Competitor listing
    compare/page.tsx      - Side-by-side competitor comparison (up to 4)
    battlecard/[id]/      - Competitive battle card / cheat sheet
    floorplans/page.tsx   - Floor plan comparison across competitors
    alerts/page.tsx       - Competitive change alerts & notifications
    intelligence/page.tsx - Intelligence reports
    integrations/page.tsx - GoHighLevel CRM integration settings
    api/
      company/
        route.ts          - Company profile CRUD
        research/route.ts - Company deep research (self-assessment)
      competitors/route.ts - Competitors CRUD
      research/route.ts   - Research/case files (deep research + update scans + change detection)
      intelligence/route.ts - Intelligence reports
      alerts/route.ts     - Competitive alerts CRUD (read, mark as read, dismiss)
      floorplans/
        route.ts          - Floor plan CRUD (add your own + view competitor plans)
        score/route.ts    - Floor plan competitive scoring
      integrations/
        ghl/route.ts      - GoHighLevel integration config & sync
  components/
    Sidebar.tsx           - Navigation sidebar
  lib/
    db.ts                 - SQLite database setup & initialization (tables: company_profile, company_research, competitors, case_files, intelligence_reports, floor_plans, alerts, ghl_config, ghl_field_mappings)
    research-agent.ts     - OpenAI-powered research agent with web search
    change-detection.ts   - Change detection engine (compares old vs new findings to generate alerts)
    ghl.ts                - GoHighLevel API client (sync competitors, push alerts)
    types.ts              - TypeScript type definitions
```

## Key Features
1. **Company Deep Research**: Self-assessment baseline via `runCompanyDeepResearch()` with SWOT analysis, market position, digital presence evaluation
2. **Competitor Case Files**: Deep research on competitors via `runDeepResearch()` using OpenAI Responses API with web search for live data
3. **Update Scans**: Lightweight research updates via `runResearchUpdate()` for scheduled monitoring (daily/weekly/monthly)
4. **Competitive Scoring**: 7-dimension scorecard (product strength, market position, digital presence, customer satisfaction, pricing, innovation velocity, threat level)
5. **Side-by-Side Comparison**: Compare up to 4 competitors across all scoring dimensions with visual bar charts
6. **Battle Cards**: One-page competitive cheat sheets with key talking points, strengths/weaknesses, and counter-arguments
7. **Competitive Alerts**: Automated change detection when re-researching competitors — tracks pricing changes, new products, market moves
8. **Floor Plan Comparison**: Compare home builder floor plans across competitors with spec-by-spec analysis and competitive scoring
9. **GoHighLevel CRM Sync**: Push competitor data and alerts to GHL contacts for team notifications and CRM workflows
10. **Intelligence Reports**: AI-generated comprehensive reports synthesizing all competitor findings
11. **Source Citations**: Web search results include clickable source URLs displayed in the UI
12. **PDF Export**: Print-optimized layouts across all pages (Compare, Battle Cards, Floor Plans, etc.)

## AI Integration Architecture
- `callAI()` in `research-agent.ts` is the central AI function
- Attempts OpenAI Responses API with `web_search` tool first (for live data with source citations)
- Falls back to Chat Completions API if Responses API is unavailable
- `isOpenAICompatible()` detects OpenAI-native or Replit AI Integrations proxy
- Simulated fallback data generated when no API key is configured
- Change detection in `change-detection.ts` compares old vs new findings to generate alerts

## Data Handling
- Legacy case files without `competitive_scores` are automatically assigned default scores (5/10) via `ensureScores()` helper in the research API route
- Re-running research on a competitor will generate real AI-scored competitive_scores
- Floor plans are extracted from competitor research and stored in the `floor_plans` table
- Alerts are generated by comparing previous vs new case file findings during update scans

## Configuration
- **Dev server**: `npm run dev` (port 5000, host 0.0.0.0)
- **Production**: `npm run build` then `npm run start` (port 5000)
- **Environment**: `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` (auto-set by Replit AI Integrations)
- **GHL Integration**: Configured via /integrations page (API key + Location ID stored in SQLite ghl_config table)
- **GHL MCP Server**: Also available for direct GHL API access (coexists with built-in client)

## User Preferences
- Light theme preferred (Builder Studio branding)
- Navy/orange/teal color palette

## Recent Changes
- 2026-02-09: Company self-assessment integration — own company case file shown prominently on Case Files page with blue gradient card and "Your Company" badge; Compare page auto-selects company first and shows "You" badges; regular competitors filtered from company card display
- 2026-02-09: Rebranded to match Homebuilder Studio visual identity — integrated official logo, updated color palette (navy #1a365d, orange #e8702a, teal #5ba8a0), gradient accent bar on sidebar, orange CTA buttons, teal scan buttons, updated page title
- 2026-02-09: Added AI Website Scanner for floor plans — scans builder websites to extract floor plan specs (model names, prices, sq ft, bedrooms, etc.) with web search, shows results in preview table with select/deselect, then imports chosen plans. API at /api/floorplans/scan (POST to scan, PUT to import).
- 2026-02-08: Fixed legacy competitive_scores — added ensureScores() helper with 5/10 defaults for pre-existing case files
- 2026-02-08: Verified new features from GitHub PR: Compare, Battle Cards, Alerts, Floor Plans, GHL Integration, PDF Export
- 2026-02-07: Fixed web search integration — `isOpenAICompatible()` now correctly detects Replit proxy, added try-catch fallback from Responses API to Chat Completions
- 2026-02-06: Merged GitHub features: company deep research, web search + competitive scoring, update scans, Builder Studio rebrand
- 2026-02-06: Connected OpenAI via Replit AI Integrations — uses OpenAI SDK, billed to Replit credits
- 2026-02-06: Initial Replit setup - configured port 5000, allowed dev origins, deployment config
