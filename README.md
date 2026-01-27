# Health Overview

A personal health dashboard and reporting tool that aggregates data from multiple sources into a unified view. Built with Next.js, TypeScript, and Nivo charts.

## Data Sources

| Source | What it provides | How to get the data |
|--------|-----------------|---------------------|
| **1177 / Swedish Healthcare** | Lab results (blood panels, biomarkers) | Export from 1177.se, place Excel file in `data/FILES/` |
| **Strava** | Running and activity data | OAuth via `pnpm run strava:auth`, then `pnpm run strava:download` |
| **Oura Ring** | Sleep, HRV, SpO2, readiness, respiratory rate | OAuth via `pnpm run oura:auth`, then `pnpm run oura:download` |
| **Apple Watch** | Steps, heart rate, VO2 max, sleep, exercise | Export from Apple Health app, parse with `pnpm run apple:parse` |

## Getting Started

This project was built using [Claude Code](https://claude.ai/code).

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) package manager

### Setup

```bash
# Install dependencies
pnpm install

# Create environment file
cp .env.example .env.local
# Then fill in your API credentials (see Environment Variables below)
```

### Environment Variables

Create a `.env.local` file with:

```
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_ACCESS_TOKEN=your_strava_access_token
STRAVA_REFRESH_TOKEN=your_strava_refresh_token
OURA_ACCESS_TOKEN=your_oura_access_token
OURA_CLIENT_ID=your_oura_client_id
OURA_CLIENT_SECRET=your_oura_client_secret
```

**Strava:** Create an app at [strava.com/settings/api](https://www.strava.com/settings/api) to get your client ID and secret.

**Oura:** Create an app at [cloud.ouraring.com/oauth/applications](https://cloud.ouraring.com/oauth/applications).

### Data Pipeline

Run these scripts to populate your local data directory:

```bash
# 1. Authorize and download from external APIs
pnpm run strava:auth        # One-time Strava OAuth setup
pnpm run strava:download    # Download all Strava activities

pnpm run oura:auth          # One-time Oura OAuth setup
pnpm run oura:download      # Download all Oura daily data

# 2. Parse local data exports
pnpm run lab:parse          # Parse lab results from Excel (data/FILES/Provsvar.xlsx)

# 3. Build the unified dataset
pnpm run build:unified      # Merges all sources into data/unified/daily.json

# 4. Generate PDF health report
pnpm run report:generate    # Outputs to reports/health-report-YYYY-MM-DD.pdf
```

### Run the Dashboard

```bash
pnpm run dev    # Start dev server at http://localhost:3000
pnpm run build  # Production build
pnpm run start  # Start production server
```

## PDF Health Report

Run `pnpm run report:generate` to produce a comprehensive PDF report containing:

- **Cover page** with overall health summary
- **Key metrics dashboard** (resting HR, HRV, VO2 max, steps, sleep, SpO2, BMI)
- **Cardiovascular & fitness analysis** with running stats and monthly distance breakdown
- **Sleep analysis** with stage breakdown, SpO2, and respiratory rate
- **Lab results table** with reference ranges, status indicators, and trend arrows
- **Strengths & areas for attention** based on all available data
- **Recommendations** for supplementation and monitoring

Output: `reports/health-report-YYYY-MM-DD.pdf`

## Project Structure

```
scripts/                    Data pipeline scripts
  authorizeStrava.ts        Strava OAuth flow
  downloadStravaData.ts     Strava API client
  authorizeOura.ts          Oura OAuth flow
  downloadOuraData.ts       Oura API client
  parseLabData.ts           Parse lab Excel exports
  parseAppleHealth.ts       Parse Apple Health XML
  buildUnifiedData.ts       Merge all sources by date
  generateHealthReport.ts   PDF report generator

types/                      TypeScript type definitions
  unified.ts                UnifiedDailyRecord, source priorities
  labResults.ts             Lab result types, reference ranges
  strava.ts                 Strava activity types

data/                       Local data (gitignored)
  lab_results.json          Parsed lab reports
  unified/daily.json        Merged daily health metrics
  strava/activities.json    Strava activities
  oura/                     Oura ring data files
  apple_health/             Apple Health exports

components/                 React dashboard components
pages/                      Next.js pages
```

## Tech Stack

- **Framework:** Next.js 13, React 18
- **Language:** TypeScript
- **Charts:** Nivo (bar, line, calendar, pie, scatterplot)
- **PDF:** pdfkit
- **Styling:** Tailwind CSS
- **Auth:** NextAuth.js + Firebase

## License

MIT
