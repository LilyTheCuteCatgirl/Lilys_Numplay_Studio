# Lily's NumplayStudio

A browser-based game selector, build tool, WebUSB installer, and local save vault for the [NumPlay](https://github.com/Mason363/NumPlay) calculator app.

This independently hosted interface is based on NumPlay by Mason363 and contributors. The generated calculator application remains named **NumPlay**.

Source code is provided under the GPL-3.0-or-later license. See [LICENSE](LICENSE). NumPlay and its game assets belong to their respective authors.

## Local development

Open the repository in VS Code and run `py tools/localhost.py` (Python 3 required).
The local preview opens at `http://localhost:8765/`; use Ctrl+C to stop it.
Use `py tools/localhost.py --refresh` to refresh the upstream NumPlay kit.

Only `main` deploys the website (automatically on pushes to `main`, or manually
when run on `main`). Use `test-v2` to test changes before merging.
The calculator game kit and linker are supplied by upstream NumPlay during
local preview and deployment. They are not stored in this repository.

## Backed-up game stats

Save Vault's game editors live in `site/game-saves/games/`.
`binary.js` validates game-specific binary save formats; `catalog.js`
registers additional game editors. More complex or older formats can be
read-only. Editing a browser backup does **not** automatically restore it
to a connected calculator. Export backups before making changes.
