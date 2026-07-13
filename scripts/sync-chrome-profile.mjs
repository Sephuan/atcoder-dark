/**
 * Copy AtCoder-related session data from your real Chrome profile
 * into ./.chrome-profile (no network, no downloads).
 *
 * Source: ~/.config/google-chrome
 * Dest:   ./.chrome-profile
 *
 * Safe to re-run. Does NOT touch your main Chrome profile (read-only copy).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(process.env.HOME, ".config/google-chrome");
const dst = path.join(root, ".chrome-profile");

if (!fs.existsSync(src)) {
  console.error("Chrome profile not found:", src);
  process.exit(1);
}

// Prefer python for JSON merge + sqlite check (stdlib only)
const py = `
import json, shutil, sqlite3
from pathlib import Path

src = Path(${JSON.stringify(src)})
dst = Path(${JSON.stringify(dst)})
dst.mkdir(parents=True, exist_ok=True)
(dst / "Default" / "Network").mkdir(parents=True, exist_ok=True)

with open(src / "Local State", "r", encoding="utf-8") as f:
    main_ls = json.load(f)

dst_ls_path = dst / "Local State"
if dst_ls_path.exists():
    try:
        dst_ls = json.loads(dst_ls_path.read_text(encoding="utf-8"))
    except Exception:
        dst_ls = {}
else:
    dst_ls = {}

if "os_crypt" in main_ls:
    dst_ls["os_crypt"] = main_ls["os_crypt"]
    print("synced os_crypt")
dst_ls_path.write_text(json.dumps(dst_ls), encoding="utf-8")

files = [
    "Default/Cookies",
    "Default/Cookies-journal",
    "Default/Network/Cookies",
    "Default/Network/Cookies-journal",
    "Default/Login Data",
    "Default/Login Data-journal",
    "Default/Preferences",
]
for rel in files:
    s, d = src / rel, dst / rel
    if not s.exists():
        print("skip", rel)
        continue
    d.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(s, d)
    print("copied", rel, s.stat().st_size)

sldb = src / "Default" / "Local Storage" / "leveldb"
ddlb = dst / "Default" / "Local Storage" / "leveldb"
if sldb.exists():
    if ddlb.exists():
        shutil.rmtree(ddlb)
    shutil.copytree(sldb, ddlb)
    print("copied Local Storage/leveldb")

for path in [dst / "Default/Cookies", dst / "Default/Network/Cookies"]:
    if not path.exists():
        continue
    try:
        con = sqlite3.connect(str(path))
        rows = con.execute(
            "select host_key,name from cookies where host_key like '%atcoder%'"
        ).fetchall()
        print("atcoder cookies:", rows)
        con.close()
    except Exception as e:
        print("cookie check:", e)
print("OK")
`;

execFileSync("python3", ["-c", py], { stdio: "inherit" });
