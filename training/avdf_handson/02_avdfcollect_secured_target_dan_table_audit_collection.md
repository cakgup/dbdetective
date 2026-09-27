# SCENARIO 02
# AVDFCOLLECT, SECURED TARGET, DAN TABLE AUDIT COLLECTION

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 02 of 12.
> Expected output is intentionally omitted.

## Objective

Membangun:

**[REFERENCE / CONCEPT]**

```text
UNIFIED_AUDIT_TRAIL
        ↓
AVDFCOLLECT
        ↓
TABLE Trail
        ↓
Audit Vault Repository
        ↓
Report
```

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 02 — AVDFCOLLECT, Secured Target dan TABLE Audit Collection
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 02
```

---

## Step 1 — Download Target Setup Script

Login Administrator.

Navigate:

**[WEB CONSOLE]**

```text
Targets
```

Gunakan Target Setup Script function.

Expected file concept:

---

## Step 2 — Create AVDFCOLLECT

SQL*Plus:

**[SQL*PLUS]**

```sql
ALTER SESSION SET CONTAINER=PDB1;

CREATE USER avdfcollect
IDENTIFIED BY "Oracle#AVDF26";

GRANT CREATE SESSION
TO avdfcollect;
```

---

## Step 3 — Run SETUP Mode

**[SQL*PLUS]**

```sql
@/home/oracle/avdf_setup/oracle_user_setup.sql AVDFCOLLECT SETUP
```

---

## Step 4 — Verify AVDFCOLLECT

**[SQL*PLUS]**

```sql
SELECT username,
       account_status,
       profile
FROM dba_users
WHERE username='AVDFCOLLECT';
```

---

## Step 5 — Test Target Account Login

OS Terminal:

**[OS TERMINAL]**

```bash
sqlplus -L 'avdfcollect/Oracle#AVDF26@//192.168.56.26:1521/PDB1'
```

---

## Step 6 — Register Secured Target

Use AVCLI Simulator:

**[AVCLI]**

```text
REGISTER SECURED TARGET PDB1_26AI
OF SECURED TARGET TYPE "Oracle Database"
AT jdbc:oracle:thin:@//192.168.56.26:1521/PDB1
AUTHENTICATED BY AVDFCOLLECT;
```

---

## Step 7 — Verify Target

**[AVCLI]**

```text
LIST SECURED TARGET;
```

Web Console:

**[REFERENCE / CONCEPT]**

```text
Targets
    ↓
PDB1_26AI
```

Verify:

```text
Host       : 192.168.56.26
Port       : 1521
Service    : PDB1
Credential : AVDFCOLLECT
```

---

## Step 8 — Add TABLE Trail

Navigate:

**[REFERENCE / CONCEPT]**

```text
Targets
    ↓
PDB1_26AI
    ↓
Audit Data Collection
```

Click:

**[WEB CONSOLE]**

```text
Add TABLE Trail
```

v0.8 creates:

**[WEB CONSOLE]**

```text
Trail Type : TABLE
Location   : UNIFIED_AUDIT_TRAIL
Host       : agentless collection
Status     : CONFIGURED / not yet started
```

---

## Step 9 — Start Collection

AVCLI:

**[AVCLI]**

```text
START COLLECTION FOR SECURED TARGET PDB1_26AI
USING HOST 'agentless collection'
FROM TABLE UNIFIED_AUDIT_TRAIL;
```

---

## Step 10 — Verify Trail

**[AVCLI]**

```text
LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

---

## Step 11 — Generate New Native Activity

Use AVDF_DEMO:

**[OS TERMINAL]**

```bash
sqlplus -L 'avdf_demo/Oracle#26Lab1@//192.168.56.26:1521/PDB1'
```

Run:

**[SQL*PLUS]**

```sql
SELECT COUNT(*)
FROM hr.employees;
```

---

## Step 12 — Verify Local Evidence First

SYS:

**[SQL*PLUS]**

```sql
SELECT event_timestamp,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code
FROM unified_audit_trail
WHERE dbusername='AVDF_DEMO'
ORDER BY event_timestamp DESC
FETCH FIRST 10 ROWS ONLY;
```

Troubleshooting principle:

```text
If the record does not exist in Oracle,
AVDF cannot collect it.
```

---

## Step 13 — Verify Central AVDF Evidence

Login Auditor.

Navigate:

**[REFERENCE / CONCEPT]**

```text
Reports
    ↓
Activity Reports
    ↓
All Activity
```

Filter:

```text
Target = PDB1_26AI
User   = AVDF_DEMO
Object = EMPLOYEES
```

---

## Step 14 — Troubleshooting Drill

Instructor:

```text
Break Audit Trail
```

Then inspect:

**[REFERENCE / CONCEPT]**

```text
Targets
    ↓
Audit Trails
```

Expected unhealthy state.

Clear:

Restart collection if required.

---
