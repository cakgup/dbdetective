# SCENARIO 08
# REPORTING, SAVED REPORTS, SCHEDULING, TARGET GROUP, COMPLIANCE

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 08 of 12.
> Expected output is intentionally omitted.

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 08 — Reporting, Saved Reports, Scheduling, Target Group, Compliance
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 08
```

---

## Step 1 — All Activity

Auditor:

**[REFERENCE / CONCEPT]**

```text
Reports
    ↓
Activity Reports
    ↓
All Activity
```

Use columns:

```text
Event Time
Target
User
Event
Object Owner
Object
Status
Source
SQL
Policy
Rule
Row Count
Client IP
Client Program
```

---

## Step 2 — Filter Application Reader

Filter:

```text
Target = PDB1_26AI
User   = AVDF_D2_READER
```

Sort:

```text
Event Time ASC
```

Observe chronological behavior.

---

## Step 3 — Failed Login Report

Open:

Filter:

**[WEB CONSOLE]**

```text
AVDF_D2_READER
```

Expected failed authentication evidence.

---

## Step 4 — Login/Logout Report

Open:

Compare failed and successful authentication.

---

## Step 5 — Database Firewall Monitored Activity

Open:

**[REFERENCE / CONCEPT]**

```text
Database Firewall Reports
    ↓
Monitored Activity
```

Filter:

```text
Policy = LAB_D4_DETECTIVE
```

Inspect:

```text
SQL
Rule
Severity
Row Count
Database Response
```

---

## Step 6 — Create Focused Investigation Report

From All Activity filter:

```text
Target = PDB1_26AI
User   = AVDF_D2_READER
```

Add columns needed for investigation.

Sort:

```text
Event Time ASC
```

---

## Step 7 — Save Customized Report

Navigate / action:

**[WEB CONSOLE]**

```text
Save Report
```

Name:

**[WEB CONSOLE]**

```text
D5_READER_INVESTIGATION
```

Expected saved report visible under:

---

## Step 8 — Schedule Report

Open saved report and create schedule:

```text
D5_DAILY_INVESTIGATION
```

---

## Step 9 — Create Target Group

AVCLI:

**[AVCLI]**

```text
CREATE TARGET GROUP D5_TRAINING_GROUP;
```

---

## Step 10 — Add Target to Group

**[AVCLI]**

```text
ALTER TARGET GROUP D5_TRAINING_GROUP
ADD TARGET PDB1_26AI;
```

Verify:

**[REFERENCE / CONCEPT]**

```text
Targets
    ↓
Target Groups
```

---

## Step 11 — Add Compliance Group

Use console Compliance workflow.

Assign:

```text
PDB1_26AI
```

to training compliance group.

Then open:

**[REFERENCE / CONCEPT]**

```text
Reports
    ↓
Compliance Reports
```

---
