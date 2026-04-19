# Parikh Acquisition Terminal

Interactive dental practice acquisition dashboard built for Dr. Ankit Parikh, DMD. Filters 130 listings against Shreya's fellowship rank list, runs an SBA 7(a) deal model per practice, and tracks outreach — all in the browser, no backend.

## What's inside

```
Terminal.html         # main app (open this locally to run)
index.html            # redirect → Terminal.html (for hosting root URL)
src/
  app.jsx             # main React app shell
  sidebar.jsx         # scenarios, reality filters, weight sliders
  table.jsx           # sortable listings table
  detail.jsx          # per-listing detail drawer (deal model, outreach)
  scoring.jsx         # 4-dimension fit score + SBA model
  components.jsx      # shared UI atoms
  data.jsx            # embedded listings + brokers data
data/
  listings.json       # source listings (edit this to refresh data)
  brokers.json        # broker contacts
  scoring.json        # scoring reference
.do/app.yaml          # DigitalOcean App Platform config
```

## Run locally

Just open `Terminal.html` in any browser. No build step, no dependencies install.

## Deploy to DigitalOcean App Platform (one-time, ~10 min)

**Goal:** host this at a public URL, free tier, auto-redeploy on `git push`.

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial Parikh Acquisition Terminal"
git branch -M main
git remote add origin git@github.com:<your-user>/parikh-terminal.git
git push -u origin main
```

### 2. Create the DO App
1. Go to https://cloud.digitalocean.com/apps → **Create App**
2. Choose **GitHub** → authorize → select the repo → branch `main`
3. DO detects `.do/app.yaml` and configures a **Static Site** automatically
   - Build command: *(none needed — static files)*
   - Output directory: `/`
4. Pick the **Starter** plan (static sites = free)
5. **Create Resources** → wait ~90 seconds → done

You'll get a URL like `https://parikh-terminal-xyz.ondigitalocean.app`. Optional: point a custom subdomain at it in Settings → Domains.

### 3. Updating listings

Two options:

**Option A — edit JSON directly** (simplest)
1. Edit `data/listings.json` in GitHub's web editor
2. Commit → DO auto-rebuilds in ~60s → live

**Option B — regenerate from a spreadsheet**
Keep maintaining the Excel, re-export, have Claude parse it into `data/listings.json` and commit.

### 4. State + outreach data

All user state (filters, weights, outreach notes, offer amounts) is stored in the **browser's localStorage** on the device you open the app from. That means:
- ✅ Your notes survive refreshes and tab closes
- ⚠️ Opening the URL on a different device starts fresh
- ⚠️ Clearing browser data wipes your outreach tracker

If you want cross-device sync later, add a tiny backend (DO Functions + a database) — but for a single user on 1–2 devices, localStorage is fine and zero-infra.

## Handoff to Claude (Cowork / Code)

Prompt to give Claude:

> This is a static HTML/React app. Deploy it to my DigitalOcean App Platform as a static site from a new GitHub repo called `parikh-terminal`. The config is already in `.do/app.yaml`. Push all files to the new repo, create the DO app from the repo, and give me the live URL.

Claude should have access to your GitHub + DigitalOcean via their respective MCPs or CLIs.

## Notes

- The embedded `src/data.jsx` is a denormalized copy of `data/*.json` so the app loads with zero network requests. If you edit `data/listings.json`, regenerate `src/data.jsx` (Claude can do this — it's just a JSON → JS wrapper).
- Scoring model is in `src/scoring.jsx`. Four dimensions: Deal, FFS, Location (Shreya's rank), Upside (implant/sedation lift). Weights are user-controllable.
- Built April 2026 against Dashboard v4 data. 130 listings, 8 markets.
