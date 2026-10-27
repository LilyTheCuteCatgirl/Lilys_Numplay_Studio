"""Run a local preview of Lily's NumplayStudio with the NumPlay game assets."""

import argparse
import mimetypes
import os
import shutil
import sys
import urllib.request
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from zipfile import ZipFile


REPO = Path(__file__).resolve().parent.parent
SITE = REPO / "site"
CACHE_BASE = Path(os.environ.get("LOCALAPPDATA", Path.home() / ".cache"))
CACHE = CACHE_BASE / "LilysNumplayStudio" / "localhost"
PREVIEW = CACHE / "preview"
LINKER_FILES = ("ld.js", "ld.wasm", "objcopy.js", "objcopy.wasm")


def download(url, target):
    print("Downloading", target.name + "...", flush=True)
    target.parent.mkdir(parents=True, exist_ok=True)
    partial_file = target.with_name(target.name + ".download")
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "LilysNumplayStudio-LocalPreview"})
        with urllib.request.urlopen(request, timeout=120) as response, partial_file.open("wb") as output:
            shutil.copyfileobj(response, output)
        partial_file.replace(target)
    finally:
        partial_file.unlink(missing_ok=True)


def prepare_kit(refresh):
    kit = CACHE / "kit"
    archive = CACHE / "NumPlay-kit.zip"
    if refresh:
        shutil.rmtree(kit, ignore_errors=True)
        archive.unlink(missing_ok=True)
    if (kit / "kit.json").is_file():
        return kit
    if not archive.is_file():
        download("https://codeload.github.com/Mason363/NumPlay/zip/refs/heads/kit", archive)

    shutil.rmtree(kit, ignore_errors=True)
    kit.mkdir(parents=True, exist_ok=True)
    with ZipFile(archive) as source:
        if source.testzip() is not None:
            raise RuntimeError("The downloaded game kit archive is damaged. Run with --refresh.")
        total = 0
        for item in source.infolist():
            name = PurePosixPath(item.filename)
            parts = name.parts
            if not parts or parts[0] != "NumPlay-kit" or ".." in parts or "\\" in item.filename:
                raise RuntimeError("Unexpected path in upstream game kit archive")
            if item.is_dir():
                continue
            if len(parts) < 2 or (item.external_attr >> 16) & 0o170000 == 0o120000:
                raise RuntimeError("Unexpected file in upstream game kit archive")
            total += item.file_size
            if total > 250 * 1024 * 1024:
                raise RuntimeError("Upstream game kit exceeds expected size")
            dest = kit.joinpath(*parts[1:])
            dest.parent.mkdir(parents=True, exist_ok=True)
            with source.open(item) as src, dest.open("wb") as out:
                shutil.copyfileobj(src, out)
    if not (kit / "kit.json").is_file():
        raise RuntimeError("The downloaded NumPlay kit has no kit.json")
    return kit


def prepare_assets(refresh):
    required = (
        "index.html", "app.js", "app.css",
        "usb/usb-readonly.js", "usb/usb-installer.js",
        "game-saves/save-vault.js", "game-saves/stats.js",
        "game-saves/stats.css", "game-saves/games/hillclimb.js", "game-saves/restore.js",
    )
    missing = [name for name in required if not (SITE / name).is_file()]
    if missing:
        raise RuntimeError(
            "Missing website files in " + str(SITE) + ": " + ", ".join(missing) +
            ". Check that the reorganized site/ folder was copied completely."
        )
    markup = (SITE / "index.html").read_text(encoding="utf-8")
    script_paths = (
        "usb/usb-readonly.js", "usb/usb-installer.js",
        "game-saves/stats.js", "game-saves/games/hillclimb.js", "game-saves/restore.js",
        "game-saves/save-vault.js", "app.js",
    )
    missing_links = [name for name in script_paths if 'src="' + name + '"' not in markup]
    if missing_links:
        raise RuntimeError(
            "Website index.html does not load: " + ", ".join(missing_links) +
            ". Make sure site/index.html belongs to the reorganized version."
        )
    CACHE.mkdir(parents=True, exist_ok=True)
    kit = prepare_kit(refresh)
    linker = CACHE / "ld"
    for name in LINKER_FILES:
        target = linker / name
        if refresh or not target.is_file():
            download("https://raw.githubusercontent.com/Mason363/NumPlay/main/customize/ld/" + name, target)

    game_list = CACHE / "games" / "games.json"
    if refresh or not game_list.is_file():
        download("https://raw.githubusercontent.com/Mason363/NumPlay/main/games/games.json", game_list)

    # The preview is assembled outside the Git repository.
    if PREVIEW.exists():
        shutil.rmtree(PREVIEW)
    shutil.copytree(SITE, PREVIEW)
    shutil.copytree(kit, PREVIEW / "kit", dirs_exist_ok=True)
    shutil.copytree(linker, PREVIEW / "ld", dirs_exist_ok=True)
    (PREVIEW / "games").mkdir(exist_ok=True)
    shutil.copy2(game_list, PREVIEW / "games" / "games.json")


def main():
    parser = argparse.ArgumentParser(description="Preview Lily's NumplayStudio locally")
    parser.add_argument("--port", type=int, default=8765, help="HTTP port (default: 8765)")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the browser")
    parser.add_argument("--refresh", action="store_true", help="Download fresh upstream game assets")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("Port must be between 1 and 65535")

    print("Preparing Lily's NumplayStudio localhost preview...", flush=True)
    prepare_assets(args.refresh)
    mimetypes.add_type("application/wasm", ".wasm")
    url = f"http://localhost:{args.port}/"
    try:
        with ThreadingHTTPServer(("127.0.0.1", args.port),
                                 partial(SimpleHTTPRequestHandler, directory=str(PREVIEW))) as server:
            print("\nReady:", url, flush=True)
            print("Press Ctrl+C in this terminal to stop the server.", flush=True)
            print("Your GitHub source files have not been modified.\n", flush=True)
            if not args.no_browser:
                webbrowser.open(url)
            server.serve_forever()
    except OSError as exc:
        raise RuntimeError(f"Could not start the localhost server on port {args.port}: {exc}") from exc


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nLocal preview stopped.")
    except Exception as exc:
        print("\nERROR:", exc, file=sys.stderr, flush=True)
        sys.exit(1)
