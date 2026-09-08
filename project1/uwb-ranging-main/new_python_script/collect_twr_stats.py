import subprocess
import re
import statistics
from pathlib import Path
from datetime import datetime

PORT = "COM8"
DURATION = "10"
SCRIPT = Path(__file__).with_name("run_fira_twr.py")

cmd = ["python", str(SCRIPT), "-p", PORT, "-t", DURATION, "-v"]

print("=" * 60)
print("DWM3001C TWR Measurement Collector")
print("=" * 60)
print(f"Controller port : {PORT}")
print(f"Test duration   : {DURATION} seconds")
print()
print("Make sure Board 2 is already running on COM9 as --controlee.")
print()

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
log_file = Path(__file__).with_name(f"twr_raw_{timestamp}.log")

distances = []
ok_count = 0
timeout_count = 0
other_error_count = 0
measurement_count = 0
last_status = None

print("Starting controller on COM8...")
print("-" * 60)

with log_file.open("w", encoding="utf-8") as log:
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    try:
        for line in process.stdout:
            print(line, end="")
            log.write(line)
            log.flush()

            status_match = re.search(
                r"status:\s+(.+?)\s+\(0x([0-9a-fA-F]+)\)", line
            )
            if status_match:
                last_status = status_match.group(1).strip()

                if last_status == "Ok":
                    ok_count += 1
                elif last_status == "RangingRxTimeout":
                    timeout_count += 1
                else:
                    other_error_count += 1

            distance_match = re.search(
                r"distance:\s+([0-9.]+)\s+cm", line
            )
            if distance_match:
                measurement_count += 1
                distance = float(distance_match.group(1))

                # 65535 cm is the invalid distance used for a timeout.
                if last_status == "Ok" and distance < 65535:
                    distances.append(distance)

    except KeyboardInterrupt:
        print("\nStopping test...")
        process.terminate()

    process.wait()

print()
print("=" * 60)
print("TWR TEST RESULTS")
print("=" * 60)

total_reports = ok_count + timeout_count + other_error_count

print(f"Total measurement reports : {total_reports}")
print(f"Successful (Ok)            : {ok_count}")
print(f"Timeouts                   : {timeout_count}")
print(f"Other errors               : {other_error_count}")

if total_reports:
    print(f"Success rate               : {ok_count / total_reports * 100:.2f}%")

if distances:
    avg = statistics.mean(distances)
    minimum = min(distances)
    maximum = max(distances)

    print()
    print("VALID DISTANCE MEASUREMENTS")
    print(f"Count                      : {len(distances)}")
    print(f"Average                    : {avg:.2f} cm")
    print(f"Minimum                    : {minimum:.2f} cm")
    print(f"Maximum                    : {maximum:.2f} cm")

    if len(distances) > 1:
        print(f"Std deviation              : {statistics.stdev(distances):.2f} cm")

    print()
    print("Measurements:")
    print(", ".join(f"{d:.1f}" for d in distances))
else:
    print()
    print("No valid distance measurements were collected.")
    print("Check that Board 2 is running as the controlee on COM9.")

print()
print(f"Raw log saved to: {log_file}")
print("=" * 60)
