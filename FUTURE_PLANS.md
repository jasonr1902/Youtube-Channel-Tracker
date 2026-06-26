# Future Plans

This file tracks planned features that are not yet built. When a feature is implemented, remove it from this file.

**When the user asks "what should we do next?", check this file first and suggest items from it.**

---

## Production Analytics Page

A dedicated analytics page focused on the *production pipeline* itself (not YouTube performance metrics — that's the existing Analytics page). Key metrics to include:

- **Average time per stage** — how many days a video spends in Idea, Script, Filming, Editing, Scheduled before publishing
- **Idea → Published conversion rate** — what % of ideas ever reach Published stage
- **Stage funnel visualization** — how many videos are in each stage over time (like a funnel chart)
- **Fastest / slowest videos** — which videos moved through production fastest/slowest
- **Stage bottleneck detection** — which stage do videos get stuck in most

**Data source:** `video_stage_history` table (already populated — every stage transition is recorded, and initial stage is recorded on creation via the `track_initial_stage` DB trigger added in v5).

**When built:** remove this section and the `video_stage_history` note above.

---

## Instructions for Managing This File

- Items in this file are features the user asked to defer for later
- When the user asks "what should we do next?" or "what's planned?", reference this file
- When a feature is fully implemented, delete its section from this file
- Keep descriptions specific enough that a future session can implement them without asking the user to re-explain
