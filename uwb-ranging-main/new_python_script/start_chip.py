"""
Run one DWM3001C in the warehouse test and post distances in meters.

Fill chips.json ports first. Copy the whole new_python_script folder to the
other laptops. The tag posts distances: if the tag runs on the warehouse PC
use http://127.0.0.1:5000. If the tag runs on another laptop, use that PC's
current IPv4, e.g. http://192.168.68.107:5000

Two-bin placement test (tag laptop vs Bin 1 laptop vs Bin 2 laptop):
  Bin 1 laptop:  python start_chip.py --role bin1 --case C
  Bin 2 laptop:  python start_chip.py --role bin2 --case C
  Tag laptop:    python start_chip.py --role tag --case C --scan-bins
Then scan a product, walk the tag laptop next to Bin 1 or Bin 2, click End journey.

Target one bin only:
  Tag: python start_chip.py --role tag --case C --bin 1
  Tag: python start_chip.py --role tag --case C --bin 2

Case C (direct Machine 1 <-> Bin 1 only):
  this PC:  python start_chip.py --role tag --case C
  other PC: python start_chip.py --role primary --case C

Case A hop 1 (Machine 1 <-> secondary):
  this PC:  python start_chip.py --role tag --case A
  other PC: python start_chip.py --role secondary --case A

Case A hop 2 (secondary <-> Bin 1) on the other laptop:
  python start_chip.py --role secondary --case A --hop 2
  python start_chip.py --role primary --case A --hop 2
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "run_fira_twr.py"
CONFIG_PATH = HERE / "chips.json"

STATUS_RE = re.compile(r"status:\s+(.+?)\s+\(0x([0-9a-fA-F]+)\)")
MAC_RE = re.compile(r"mac address:\s+([0-9a-fA-F:]+)", re.I)
DISTANCE_RE = re.compile(r"distance:\s+([0-9.]+)\s+cm")
ROLES = ["tag", "primary", "secondary", "bin1", "bin2"]


def load_config():
    if not CONFIG_PATH.exists():
        raise SystemExit(f"Missing {CONFIG_PATH}. Copy chips.json and set COM ports.")
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def chip_for(role: str, chips: dict) -> dict:
    if role in chips:
        return chips[role]
    if role == "bin1":
        return chips["primary"]
    if role == "bin2":
        return chips.get("bin2") or chips["secondary"]
    raise SystemExit(f"Unknown role {role}")


def dest_role_for_bin(bin_no: int) -> str:
    return "bin1" if bin_no == 1 else "bin2"


def norm_mac(value: str) -> str:
    hex_only = re.sub(r"[^0-9A-Fa-f]", "", value or "")
    if len(hex_only) >= 4:
        hex_only = hex_only[-4:]
        return f"{hex_only[:2]}:{hex_only[2:]}".upper()
    return (value or "").replace("-", ":").upper()


def same_mac(left: str, right: str) -> bool:
    a = norm_mac(left)
    b = norm_mac(right)
    if a == b:
        return True
    rev = ":".join(reversed(a.split(":")))
    return rev == b


_post_lock = threading.Lock()
_last_post_at = 0.0
_post_inflight = False


def post_range(api_url: str, ingest_key: str, from_role: str, to_role: str, distance_cm: float):
    global _last_post_at, _post_inflight
    distance_m = round(distance_cm / 100.0, 3)
    now = time.time()
    with _post_lock:
        if _post_inflight or now - _last_post_at < 0.8:
            return
        _post_inflight = True
        _last_post_at = now

    def worker():
        global _post_inflight
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
            with urllib.request.urlopen(request, timeout=2) as response:
                json.loads(response.read().decode("utf-8"))
            print(f"Posted {from_role} -> {to_role}: {distance_m:.3f} m")
        except urllib.error.URLError as exc:
            print(f"API post failed: {exc} ({api_url})", file=sys.stderr)
        finally:
            with _post_lock:
                _post_inflight = False

    threading.Thread(target=worker, daemon=True).start()


def peers_for(role: str, test_case: str, hop: int, bin_no: int) -> tuple[bool, str]:
    if test_case == "C":
        if role == "tag":
            return False, dest_role_for_bin(bin_no)
        if role in ("primary", "bin1", "bin2"):
            return True, "tag"
        raise SystemExit("Case C uses tag + bin1 + bin2. Secondary is only for Case A.")
    if hop == 1:
        if role == "tag":
            return False, "secondary"
        if role == "secondary":
            return True, "tag"
        raise SystemExit("Case A hop 1 is tag <-> secondary. Primary stays idle, or use --hop 2.")
    if role == "secondary":
        return False, "primary"
    if role in ("primary", "bin1"):
        return True, "secondary"
    raise SystemExit("Case A hop 2 is secondary <-> primary. Tag stays idle.")


def session_id(test_case: str, hop: int, bin_no: int) -> str:
    if test_case == "C":
        return "42" if bin_no == 1 else "43"
    return "50" if hop == 1 else "51"


def clear_old_sessions(port: str) -> None:
    try:
        from uci import Client
    except Exception as exc:
        print(f"Note: could not import UCI to clear sessions ({exc})")
        return
    client = None
    try:
        client = Client(port=port)
        for sid in (1, 2, 42, 43, 50, 51):
            try:
                client.session_deinit(sid)
            except Exception:
                pass
        print("Cleared leftover sessions on the chip.")
    except Exception as exc:
        print(f"Note: unplug/replug {port} if session init fails ({exc})")
    finally:
        if client is not None:
            try:
                client.close()
            except Exception:
                pass


def run_ranging(
    port: str,
    local_mac: str,
    dest_mac: str,
    sid: str,
    controlee: bool,
    duration: str,
    from_role: str,
    to_role: str,
    api_url: str,
    ingest_key: str,
) -> None:
    cmd = [
        sys.executable,
        str(SCRIPT),
        "-p",
        port,
        "-t",
        duration,
        "--mac",
        local_mac,
        "--dest-mac",
        dest_mac,
        "--session",
        sid,
    ]
    if controlee:
        cmd.append("--controlee")

    print("=" * 60)
    print(f"Role        : {from_role} ({'controlee' if controlee else 'initiator'})")
    print(f"Session     : {sid}")
    print(f"Port        : {port}")
    print(f"MAC         : {local_mac} -> {dest_mac} ({to_role})")
    print(f"API         : {api_url}")
    print("Distance    : posted in meters (cm / 100)")
    print("=" * 60)

    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
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
            peer = to_role
            if not same_mac(last_mac, dest_mac):
                continue
            post_range(api_url, ingest_key, from_role, peer, distance_cm)
    except KeyboardInterrupt:
        print("\nStopping chip (sending RETURN so the session can deinit)...")
        try:
            if process.stdin:
                process.stdin.write("\n")
                process.stdin.flush()
            process.wait(timeout=8)
        except Exception:
            process.terminate()
            process.wait()
        raise
    process.wait()


def main():
    parser = argparse.ArgumentParser(description="Start one DWM3001C for warehouse TWR testing.")
    parser.add_argument("--role", required=True, choices=ROLES)
    parser.add_argument("--case", default="C", choices=["A", "C"], help="A = hop, C = direct")
    parser.add_argument("--hop", type=int, default=1, choices=[1, 2], help="Case A only: 1 = tag-secondary, 2 = secondary-primary")
    parser.add_argument("--bin", type=int, default=1, choices=[1, 2], help="Case C: range Tag <-> Bin 1 or Bin 2")
    parser.add_argument("--scan-bins", action="store_true", help="Tag only: alternate ranging to Bin 1 and Bin 2")
    parser.add_argument("--port", help="Override COM port from chips.json")
    parser.add_argument("--time", default="-1", help="Session duration seconds, -1 forever")
    args = parser.parse_args()

    config = load_config()
    chips = config["chips"]
    chip = chip_for(args.role, chips)
    port = args.port or chip.get("port")
    if not port:
        raise SystemExit(f"Set chips.json chips.{args.role}.port or pass --port COMx")

    api_url = config.get("apiUrl") or "http://127.0.0.1:5000"
    ingest_key = config.get("ingestKey") or "forklift-uwb-test"
    local_mac = chip["mac"]

    if args.scan_bins:
        if args.role != "tag" or args.case != "C":
            raise SystemExit("--scan-bins is for: python start_chip.py --role tag --case C --scan-bins")
        print("Scanning Bin 1 and Bin 2 in turn. Walk the tag laptop to the nearer bin, then End journey.")
        try:
            while True:
                for bin_no in (1, 2):
                    dest_role = dest_role_for_bin(bin_no)
                    dest_mac = chip_for(dest_role, chips)["mac"]
                    sid = session_id("C", 1, bin_no)
                    clear_old_sessions(port)
                    run_ranging(
                        port,
                        local_mac,
                        dest_mac,
                        sid,
                        False,
                        "6",
                        "tag",
                        dest_role,
                        api_url,
                        ingest_key,
                    )
                    time.sleep(0.4)
        except KeyboardInterrupt:
            print("\nStopped bin scan.")
            clear_old_sessions(port)
            return

    controlee, peer_role = peers_for(args.role, args.case, args.hop, args.bin)
    dest_mac = chip_for(peer_role, chips)["mac"]
    sid = session_id(args.case, args.hop, args.bin)
    from_role = "tag" if args.role == "tag" else args.role
    if args.role == "primary":
        from_role = "bin1"

    if args.case == "A" and args.hop == 1 and args.role == "tag":
        print("Start the secondary on the other laptop FIRST, then run this tag command.")

    clear_old_sessions(port)
    try:
        run_ranging(
            port,
            local_mac,
            dest_mac,
            sid,
            controlee,
            args.time,
            from_role if not controlee else args.role,
            peer_role,
            api_url,
            ingest_key,
        )
    except KeyboardInterrupt:
        clear_old_sessions(port)


if __name__ == "__main__":
    main()
