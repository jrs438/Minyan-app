# Getting this into Claude Code

## Option A — GitHub (recommended)

1. Create a new repo on github.com (e.g. `cbt-minyan`). Keep it **private**.
2. On your computer:
   ```bash
   tar -xzf cbt-minyan-handoff.tar.gz
   cd cbt-minyan
   git init
   git add .
   git commit -m "Initial handoff from Claude"
   git remote add origin https://github.com/YOUR_USERNAME/cbt-minyan.git
   git branch -M main
   git push -u origin main
   ```
3. Open Claude Code in that directory:
   ```bash
   cd cbt-minyan
   claude
   ```
4. Claude Code auto-reads `CLAUDE.md`. Say: "Read HANDOFF.md and let's start with npm install and fixing build errors."

## Option B — Local folder (no GitHub)

1. Extract the tarball wherever you keep projects:
   ```bash
   tar -xzf cbt-minyan-handoff.tar.gz
   cd cbt-minyan
   ```
2. Launch Claude Code:
   ```bash
   claude
   ```
3. Same first prompt as above.

## Installing Claude Code (if you haven't)

```bash
npm install -g @anthropic-ai/claude-code
```
Requires Node.js 18+. Then run `claude` in any project directory.
Docs: https://docs.claude.com  (search "Claude Code")

## First prompt to paste into Claude Code

> Read HANDOFF.md and CLAUDE.md for full context. This is a minyan app for my shul.
> Let's start by running `npm install`, then `npm run build`, and fix every error
> that surfaces. Explain what you're fixing as you go — I'm not a developer.
> After it builds clean, help me set up .env.local and test login locally.
