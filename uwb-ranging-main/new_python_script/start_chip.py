"""
Run one DWM3001C in the warehouse test and post distances in meters.

Fill chips.json ports first. The board that prints TWR reports (usually the
initiator / tag) posts to the Birla Carbon API.

Case C (direct Machine 1 <-> Bin 1). This PC = tag COM12, other laptop = primary COM9:
  this PC:  python start_chip.py --role tag --case C
  other PC: python start_chip.py --role primary --case C

Case A hop 1 (Machine 1 <-> secondary COM10):
  this PC:  python start_chip.py --role tag --case A
  other PC: python start_chip.py --role secondary --case A

Case A hop 2 (secondary COM10 <-> Bin 1 COM9) on the other laptop:
  python start_chip.py --role secondary --case A --hop 2
  python start_chip.py --role primary --case A --hop 2

chips.json apiUrl must be this warehouse PC, e.g. http://192.168.68.105:5000
Copy the whole new_python_script folder to the other laptop (not one file, not the website).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "run_fira_twr.py"
CONFIG_PATH = HERE / "chips.json"

STATUS_RE = re.compile(r"status:\s+(.+?)\s+\(0x([0-9a-fA-F]+)\)")
MAC_RE = re.compile(r"mac address:\s+([0-9a-fA-F:]+)", re.I)
DISTANCE_RE = re.compile(r"distance:\s+([0-9.]+)\s+cm")


def load_config():
    if not CONFIG_PATH.exists():
        raise SystemExit(f"Missing {CONFIG_PATH}. Copy chips.json and set COM ports.")
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def norm_mac(value: str) -> str:
    hex_only = re.sub(r"[^0-9A-Fa-f]", "", value or "")
    if len(hex_only) >= 4:
        hex_only = hex_only[-4:]
        return f"{hex_only[:2]}:{hex_only[2:]}".upper()
    return (value or "").replace("-", ":").upper()


def post_range(api_url: str, ingest_key: str, from_role: str, to_role: str, distance_cm: float):
    distance_m = round(distance_cm / 100.0, 3)
    body = json.dumps(
        {
            "fromRole": from_role,
            "toRole": to_role,
            "distanceCm": distance_cm,
            "distanceM": distance_m,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        f"{api_url.rstrip('/')}/api/uwb/ranges",
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-UWB-Key": ingest_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
        print(f"Posted {from_role} -> {to_role}: {distance_m:.3f} m")
        return payload
    except urllib.error.URLError as exc:
        print(f"API post failed: {exc}", file=sys.stderr)
        return None


def peers_for(role: str, test_case: str, hop: int) -> tuple[bool, str]:
    if test_case == "C":
        if role == "tag":
            return False, "primary"
        if role == "primary":
            return True, "tag"
        raise SystemExit("Case C does not use the secondary chip. Use --case A for hop tests.")
    if hop == 1:
        if role == "tag":
            return False, "secondary"
        if role == "secondary":
            return True, "tag"
        raise SystemExit("Case A hop 1 is tag <-> secondary. Primary stays idle, or use --hop 2.")
    if role == "secondary":
        return False, "primary"
    if role == "primary":
        return True, "secondary"
    raise SystemExit("Case A hop 2 is secondary <-> primary. Tag stays idle.")


def main():
    parser = argparse.ArgumentParser(description="Start one DWM3001C for warehouse TWR testing.")
    parser.add_argument("--role", required=True, choices=["tag", "primary", "secondary"])
    parser.add_argument("--case", default="C", choices=["A", "C"], help="A = hop, C = direct")
    parser.add_argument("--hop", type=int, default=1, choices=[1, 2], help="Case A only: 1 = tag-secondary, 2 = secondary-primary")
    parser.add_argument("--port", help="Override COM port from chips.json")
    parser.add_argument("--time", default="-1", help="Session duration seconds, -1 forever")
    args = parser.parse_args()

    config = load_config()
    chips = config["chips"]
    chip = chips[args.role]
    port = args.port or chip.get("port")
    if not port:
        raise SystemExit(f"Set chips.json chips.{args.role}.port or pass --port COMx")

    controlee, peer_role = peers_for(args.role, args.case, args.hop)
    local_mac = chip["mac"]
    dest_mac = chips[peer_role]["mac"]
    api_url = config.get("apiUrl") or "http://127.0.0.1:5000"
    ingest_key = config.get("ingestKey") or "forklift-uwb-test"
    mac_to_role = {norm_mac(item["mac"]): name for name, item in chips.items()}

    cmd = [
        sys.executable,
        str(SCRIPT),
        "-p",
        port,
        "-t",
        str(args.time),
        "--mac",
        local_mac,
        "--dest-mac",
        dest_mac,
        "--session",
        "42" if args.hop == 1 else "43",
    ]
    if controlee:
        cmd.append("--controlee")

    print("=" * 60)
    print(f"Role        : {args.role} ({'controlee' if controlee else 'initiator'})")
    print(f"Case        : {'A hop ' + str(args.hop) if args.case == 'A' else 'C direct'}")
    print(f"Port        : {port}")
    print(f"MAC         : {local_mac} -> {dest_mac} ({peer_role})")
    print(f"API         : {api_url}")
    print("Distance    : posted in meters (cm / 100)")
    print("=" * 60)

    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    last_status = None
    last_mac = dest_mac
    try:
        assert process.stdout is not None
        for line in process.stdout:
            print(line, end="")
            status_match = STATUS_RE.search(line)
            if status_match:
                last_status = status_match.group(1).strip()
            mac_match = MAC_RE.search(line)
            if mac_match:
                last_mac = mac_match.group(1)
            distance_match = DISTANCE_RE.search(line)
            if not distance_match or controlee:
                continue
            distance_cm = float(distance_match.group(1))
            if last_status != "Ok" or distance_cm >= 65535:
                continue
            to_role = mac_to_role.get(norm_mac(last_mac), peer_role)
            if to_role == args.role:
                continue
            post_range(api_url, ingest_key, args.role, to_role, distance_cm)
    except KeyboardInterrupt:
        print("\nStopping chip...")
        process.terminate()
    process.wait()


if __name__ == "__main__":
    main()
