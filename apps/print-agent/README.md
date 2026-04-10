# Print agent

Polls `GET /api/print-jobs` on your backend, sends raw ESC/POS to a LAN thermal printer (default port **9100**), then calls `POST /api/print-done` or `POST /api/print-failed`.

## Layout

Put these files in the **same folder** (e.g. `C:\RestaurantPrintAgent\`):

| File | Description |
|------|-------------|
| `print-agent.exe` | Built Windows binary (see below) or run `node agent.js` from source |
| `config.json` | Copy from `config.json.example` and fill in token, API URL, printer IP |

Optional: `.env` in the same folder (overrides for secrets).

Config resolution:

1. If `config.json` exists in **current working directory**, that folder is used (good for shortcuts with a set “Start in” path).
2. Otherwise, if running the **packaged `.exe`**, the folder next to `print-agent.exe` is used.
3. When developing with `node agent.js`, the agent’s directory is used if `config.json` is not in the cwd.

## Run from source

```bash
cd apps/print-agent
copy config.json.example config.json
# edit config.json
npm install
npm start
```

## Build Windows `.exe` (no Node required on the restaurant PC)

From the monorepo root:

```bash
npm run build -w @restaurant/print-agent
```

Or inside `apps/print-agent`:

```bash
npm run build
```

Outputs:

- `dist/agent.bundle.cjs` — intermediate bundle
- `dist/print-agent.exe` — standalone executable

Copy `dist/print-agent.exe` and your `config.json` to the install folder on the PC that can reach the printer and the API.

## Auto-start on Windows

**Option A — Startup folder (simple)**

Run PowerShell **as the same Windows user** that will run the agent:

```powershell
cd path\to\repo\apps\print-agent\scripts
.\install-startup-shortcut.ps1 -InstallDir "C:\RestaurantPrintAgent"
```

**Option B — Scheduled task at logon**

```powershell
.\register-logon-task.ps1 -InstallDir "C:\RestaurantPrintAgent"
```

Use one method, not both, to avoid two instances.

## Environment variables

You can set these instead of `config.json` (e.g. in System Properties):

| Variable | Purpose |
|----------|---------|
| `PRINT_AGENT_BASE_URL` | API origin (no `/graphql`) |
| `PRINT_AGENT_TOKEN` | Print agent token from restaurant settings |
| `PRINTER_HOST` | Printer IP |
| `PRINTER_PORT` | Default `9100` |
| `POLL_INTERVAL_MS` | Default `2500` |
