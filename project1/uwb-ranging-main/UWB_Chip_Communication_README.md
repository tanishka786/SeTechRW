# UWB Chip Communication Setup

This README describes the commands required to run the UWB chip communication setup for different cases, roles, and hops using `start_chip.py`.

---

## Prerequisites

Before starting, make sure:

- Python is installed and available from the command line.
- `start_chip.py` is available in the current working directory.
- The required UWB chips/devices are connected.
- Each device is assigned the correct role.
- The devices are started in the required order for each case.

---

## Command Format

### Basic Command

```bash
python start_chip.py --role <role> --case <case>
```

### Command with Hop

```bash
python start_chip.py --role <role> --case <case> --hop <hop_number>
```

### Available Roles

- `primary`
- `secondary`
- `tag`

### Available Cases

- **Case A**
- **Case C**

---

# Case C — Direct Hop

In **Case C**, the Primary communicates directly with the Tag.

## Communication Flow

```text
Other Laptop (Primary)
        |
        | Direct Hop
        v
This PC (Tag)
```

## Step 1 — Start Primary

On the **Other Laptop**, run:

```bash
python start_chip.py --role primary --case C
```

## Step 2 — Start Tag

On **This PC**, run:

```bash
python start_chip.py --role tag --case C
```

## Case C Commands

| Device | Role | Command |
|---|---|---|
| Other Laptop | Primary | `python start_chip.py --role primary --case C` |
| This PC | Tag | `python start_chip.py --role tag --case C` |

---

# Case A — Hop 1

**Machine 1 ↔ Secondary**

In **Case A — Hop 1**, the Tag communicates with the Secondary.

## Communication Flow

```text
This PC (Tag)
      |
      | Hop 1
      v
Other Laptop (Secondary)
```

## Step 1 — Start Secondary

On the **Other Laptop**, run:

```bash
python start_chip.py --role secondary --case A
```

## Step 2 — Start Tag

On **This PC**, run:

```bash
python start_chip.py --role tag --case A
```

## Step 3 — Wait for Posted Tag

After starting the Tag, wait for the following message:

```text
Posted tag -> secondary
```

Do not proceed until the expected message is received.

## Case A — Hop 1 Commands

| Device | Role | Command |
|---|---|---|
| Other Laptop | Secondary | `python start_chip.py --role secondary --case A` |
| This PC | Tag | `python start_chip.py --role tag --case A` |

### Execution Order

```text
1. Start Secondary on Other Laptop
              |
              v
2. Start Tag on This PC
              |
              v
3. Wait for "Posted tag -> secondary"
```

---

# Case A — Hop 2

**Secondary ↔ Bin 1**

In **Case A — Hop 2**, the Primary and Secondary Chip are used for the second hop.

## Communication Flow

```text
Primary
   |
   | Hop 2
   v
Secondary Chip
   |
   v
Bin 1
```

## Step 1 — Start Primary First

On the **Primary** machine, run:

```bash
python start_chip.py --role primary --case A --hop 2
```

## Step 2 — Start Secondary Chip

On the **Secondary Chip**, run:

```bash
python start_chip.py --role secondary --case A --hop 2
```

> **Important:** Start the Primary **before** starting the Secondary Chip.

## Case A — Hop 2 Commands

| Device | Role | Command |
|---|---|---|
| Primary | Primary | `python start_chip.py --role primary --case A --hop 2` |
| Secondary Chip | Secondary | `python start_chip.py --role secondary --case A --hop 2` |

### Execution Order

```text
1. Start Primary
        |
        v
2. Start Secondary Chip
```

---

# Complete Execution Summary

## Case C — Direct Hop

```text
Other Laptop
     |
  Primary
     |
     | Direct Hop
     v
 This PC
   Tag
```

### Commands

```bash
# Other Laptop
python start_chip.py --role primary --case C

# This PC
python start_chip.py --role tag --case C
```

---

## Case A — Hop 1

```text
Other Laptop
     |
 Secondary
     ^
     |
   Hop 1
     |
     |
 This PC
   Tag
```

### Commands

```bash
# Other Laptop
python start_chip.py --role secondary --case A

# This PC
python start_chip.py --role tag --case A
```

### Expected Message

```text
Posted tag -> secondary
```

---

## Case A — Hop 2

```text
Primary
   |
   | Hop 2
   v
Secondary Chip
   |
   v
 Bin 1
```

### Commands

```bash
# Primary - START FIRST
python start_chip.py --role primary --case A --hop 2

# Secondary Chip - START SECOND
python start_chip.py --role secondary --case A --hop 2
```

---

# Quick Reference

| Case | Hop | Device | Role | Command |
|---|---|---|---|---|
| C | Direct | Other Laptop | Primary | `python start_chip.py --role primary --case C` |
| C | Direct | This PC | Tag | `python start_chip.py --role tag --case C` |
| A | Hop 1 | Other Laptop | Secondary | `python start_chip.py --role secondary --case A` |
| A | Hop 1 | This PC | Tag | `python start_chip.py --role tag --case A` |
| A | Hop 2 | Primary | Primary | `python start_chip.py --role primary --case A --hop 2` |
| A | Hop 2 | Secondary Chip | Secondary | `python start_chip.py --role secondary --case A --hop 2` |

---

# Important Notes

1. Make sure the correct UWB device is assigned to the correct role.
2. Follow the execution order specified for each case.
3. For **Case A — Hop 1**, wait for:
   ```text
   Posted tag -> secondary
   ```
4. For **Case A — Hop 2**, always start the **Primary first**.
5. Make sure `start_chip.py` is being executed from the correct project directory.
6. Keep the required devices connected and powered before starting the commands.

---

# Troubleshooting Checklist

If the communication does not start:

- Check that the UWB chip is connected correctly.
- Check that the correct device is being used for each role.
- Verify the command arguments.
- Verify that the Primary is started first where required.
- For Case A — Hop 1, check whether:
  ```text
  Posted tag -> secondary
  ```
  has appeared.
- Check the terminal output for errors from `start_chip.py`.

---

## Reference

The commands in this README correspond to the UWB chip communication setup using:

```text
start_chip.py
```

Supported configuration:

```text
Case C  → Direct Hop

Case A  → Hop 1
        → Hop 2
```
