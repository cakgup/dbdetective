# SCENARIO 06
# SQL BASELINE DAN FULL FIREWALL POLICY LIFECYCLE

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 06 of 12.
> Expected output is intentionally omitted.

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 06 — SQL Baseline dan Full Firewall Policy Lifecycle
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 06
```

---

## Step 1 — Deploy Temporary `Log all`

Auditor:

**[REFERENCE / CONCEPT]**

```text
Policies
    ↓
Database Firewall Policies
```

Click:

**[WEB CONSOLE]**

```text
Deploy Log all
```

Purpose:

```text
collect representative SQL for learning/baseline
```

---

## Step 2 — Generate Normal Workload

Use Instructor shortcut:

```text
Normal SQL Workload
```

atau secara manual:

**[OS TERMINAL]**

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

Run:

**[SQL*PLUS]**

```sql
SELECT COUNT(*)
FROM avdf_d2_app.customer_secure;
```

Run:

**[SQL*PLUS]**

```sql
SELECT customer_name,
       credit_limit
FROM avdf_d2_app.customer_secure
WHERE customer_id=1;
```

Run same pattern with different literal:

**[SQL*PLUS]**

```sql
SELECT customer_name,
       credit_limit
FROM avdf_d2_app.customer_secure
WHERE customer_id=5;
```

Run:

**[SQL*PLUS]**

```sql
SELECT customer_id,
       customer_name
FROM avdf_d2_app.customer_secure
WHERE account_status='ACTIVE';
```

---

## Step 3 — Inspect SQL Clusters

Navigate:

**[REFERENCE / CONCEPT]**

```text
Policies
    ↓
Database Firewall Policies
    ↓
SQL Cluster Sets
```

Expected cluster catalog contains representative categories such as:

Observe:

Key concept:

```text
different literals can map to the same SQL pattern/cluster
```

---

## Step 4 — Create Policy Shell

Click:

**[WEB CONSOLE]**

```text
Create
```

Set:

**[WEB CONSOLE]**

```text
Target Type : Oracle Database
Policy Name : LAB_D4_DETECTIVE
Description : Detective monitoring policy for training
```

---

## Step 5 — Create Database User Set

In policy:

```text
Sets / Profiles
```

Create:

```text
D4_APP_READERS
```

Member:

```text
AVDF_D2_READER
```

---

## Step 6 — Create Database Object Set

Create:

```text
D4_SENSITIVE_OBJECTS
```

Member:

```text
CUSTOMER_SECURE
```

---

## Step 7 — Create Client Program Set

Create:

```text
D4_SQLPLUS_CLIENT
```

Member:

```text
sqlplus
```

---

## Step 8 — Create Profile

Create:

```text
D4_READER_PROFILE
```

Associate:

```text
DB User Set = D4_APP_READERS
```

---

## Step 9 — Create SQL Cluster Set

Open:

**[WEB CONSOLE]**

```text
SQL Cluster Sets
```

Name:

**[WEB CONSOLE]**

```text
D4_NORMAL_SQL
```

Description:

```text
Known normal SQL for AVDF_D2_READER
```

Choose baseline clusters:

```text
COUNT_CUSTOMER
CUSTOMER_BY_ID
ACTIVE_CUSTOMERS
```

Save.

---

## Step 10 — Create SQL Statement Rule

Add Rule:

```text
Rule Name  : KNOWN_APPLICATION_SQL
Rule Type  : SQL Statement
Profile    : D4_READER_PROFILE
Cluster Set: D4_NORMAL_SQL
Action     : Pass
Logging    : Unique
Severity   : Minimal
```

---

## Step 11 — Create Sensitive Database Object Rule

Add:

```text
Rule Name  : MONITOR_SENSITIVE_CUSTOMER_DATA
Type       : Database Object
Profile    : D4_READER_PROFILE
Object Set : D4_SENSITIVE_OBJECTS
Commands   : SELECT, UPDATE
Row Count  : Capture
Action     : Alert
Logging    : Always
Severity   : Major
```

---

## Step 12 — Configure Default Rule

Use:

```text
Default Rule
```

Configure:

```text
Action   : Alert
Logging  : Always
Severity : Moderate
```

---

## Step 13 — Configure Unknown Traffic

```text
Action   : Alert
Logging  : Always
Severity : Major
```

---

## Step 14 — Configure Login / Logout

---

## Step 15 — Optional Session Context Rule

Create:

```text
MONITOR_READER_SESSION
```

Using:

```text
D4_APP_READERS
D4_READER_PROFILE
Action   : Alert
Logging  : Unique
Severity : Moderate
```

Important:

```text
a broad Session Context rule can match before other rules,
depending on evaluation order
```

---

## Step 16 — Configure Evaluation Order

Open:

**[WEB CONSOLE]**

```text
Evaluation Order
```

Recommended training order:

**[WEB CONSOLE]**

```text
1. SQL Statement
2. Database Object
3. Session Context
4. Default
```

Save.

---

## Step 17 — Publish Policy

Click:

**[WEB CONSOLE]**

```text
Save / Publish
```

Job:

```text
Database Firewall Policy Publication
Completed
```

---

## Step 18 — Deploy Policy

Click:

**[WEB CONSOLE]**

```text
Deploy to PDB1_26AI
```

Verify Monitoring Point:

```text
Policy : LAB_D4_DETECTIVE
```

---
