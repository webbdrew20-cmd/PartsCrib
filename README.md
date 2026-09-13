# PartsCrib

Offline-first inventory management for maintenance shops. Track parts by
area, bin, row, and column — check parts in and out, get low-stock alerts,
and keep the crib running smoothly. No internet required.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## Features

- **Parts tracking** — every part lives at an area/bin/row/column location
- **Checkout flow** — log who took what, with a full activity history
- **Low-stock alerts** — min/max levels with "needs attention" flags
- **User roles** — admin and standard users with enforced permissions
- **Search & filters** — find parts fast by name, part number, or keyword
- **CSV export** — parts list and activity log export for counting and audits
- **Automatic backups** — daily inventory snapshots kept locally
- **Mobile friendly** — works on phones and tablets for shop-floor use
- **Fully offline** — runs on a local PC or server; no cloud, no accounts

## Quick start

1. Download `PartsCrib.exe` (Windows).
2. Double-click to run it. A browser window opens at
   `http://127.0.0.1:8787/`.
3. Log in with the default administrator account (username `MaintAdmin`).
   You will be forced to set your own password on first login.

To serve the whole shop network instead of just your PC:

```
PartsCrib.exe -shared
```

Then open `http://YOUR-PC-NAME:8787/` from any device on the network.
Allow TCP port 8787 through Windows Firewall if prompted (see
`www/guide.html` for the exact firewall rule).

## Default login

On first launch PartsCrib automatically creates the administrator account:

- **Username:** `MaintAdmin`
- **Password:** factory default — change it immediately. The app forces a
  password change on your first login, and passwords require at least
  10 characters.

Create additional users (admins and standard users) from **Settings**.

## Project layout

```
PartsCrib.exe        Windows server binary (runs the app)
www/                 Web UI — pages, styles, and client logic
  index.html         Parts list, search, and filters
  login.html         Sign in
  add.html           Add a new part
  part.html          Part detail, checkout, adjust quantity
  settings.html      Users, areas, config, export, backups
  password.html      Change your password
  guide.html         Built-in setup and user guide
  app.css / app.js   Shared styles and client logic
inventory/
  config.json        Areas, Wi-Fi/AP settings, ID counter
  parts.json         Parts database (starts empty — add your own)
  users.json         User accounts (created on first run — not in git)
```

## Data & backups

- All data lives in `inventory/` next to the exe — plain JSON and CSV.
- Daily backups are written to `inventory/backups/`.
- Export the parts list or activity log to CSV from **Settings** any time.

## Security notes

- Passwords are salted + SHA-256 hashed; sessions expire after 20 minutes
  of inactivity; logins are throttled after repeated failures.
- The default admin password **must** be changed on first login.
- For production use, run on a trusted local network — the app is designed
  for shop intranets, not the public internet.

## License

MIT — see [LICENSE](LICENSE). Built by Justin Webb.
