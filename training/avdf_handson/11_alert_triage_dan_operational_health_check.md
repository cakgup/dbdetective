# SCENARIO 11
# ALERT TRIAGE DAN OPERATIONAL HEALTH CHECK

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 11 of 12.
> Expected output is intentionally omitted.

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 11 — Alert Triage dan Operational Health Check
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 11
```

---

## Step 1 — List Alert Policies

AVCLI:

**[AVCLI]**

```text
LIST ALERT POLICIES;
```

---

## Step 2 — Open Alerts Console

Navigate:

**[WEB CONSOLE]**

```text
Alerts
```

Review:

**[WEB CONSOLE]**

```text
Time
Severity
Message
Target
User
Object
Row Count
Policy
Status
```

---

## Step 3 — Investigate One Alert

Click:

**[WEB CONSOLE]**

```text
Investigate
```

Inspect related evidence.

---

## Step 4 — Perform Triage Workflow

Set:

**[REFERENCE / CONCEPT]**

```text
New
 ↓
Open
 ↓
Acknowledged
 ↓
Closed
```

Explain each state:

```text
New
not yet reviewed

Open
active investigation

Acknowledged
analyst has reviewed / accepted ownership

Closed
investigation completed
```

---

## Step 5 — Verify Audit Trail Status

AVCLI:

**[AVCLI]**

```text
LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

---

## Step 6 — Verify Firewall Monitor

**[AVCLI]**

```text
LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

---

## Step 7 — Verify Firewall

**[AVCLI]**

```text
SHOW STATUS FOR FIREWALL DBFW1;
```

---

## Step 8 — Verify Retention

**[AVCLI]**

```text
SHOW RETENTION POLICY
FOR TARGET PDB1_26AI;
```

---

## Step 9 — Review Jobs

Navigate:

**[REFERENCE / CONCEPT]**

```text
Settings
    ↓
Jobs
```

Review jobs from entire workflow:

```text
Audit Policy Retrieval
Audit Policy Provisioning
Database Firewall Policy Publication
Database Firewall Policy Deployment
Entitlement Retrieval
Stored Procedure Retrieval
```

---
