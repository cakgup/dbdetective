# SCENARIO 09
# ENTITLEMENT BASELINE, PRIVILEGE ESCALATION, DAN DRIFT

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 09 of 12.
> Expected output is intentionally omitted.

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 09 — Entitlement Baseline, Privilege Escalation dan Drift
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 09
```

---

## Step 1 — Enable Entitlement Setup Privileges

SQL*Plus:

**[SQL*PLUS]**

```sql
ALTER SESSION SET CONTAINER=PDB1;

@/home/oracle/avdf_setup/oracle_user_setup.sql AVDFCOLLECT ENTITLEMENT
```

---

## Step 2 — Review Baseline Role Grants

**[SQL*PLUS]**

```sql
SELECT grantee,
       granted_role,
       admin_option
FROM dba_role_privs
WHERE grantee='AVDF_D2_READER';
```

Record result.

---

## Step 3 — Review Baseline System Privileges

**[SQL*PLUS]**

```sql
SELECT grantee,
       privilege
FROM dba_sys_privs
WHERE grantee='AVDF_D2_READER';
```

Record result.

---

## Step 4 — Review Baseline Object Privileges

**[SQL*PLUS]**

```sql
SELECT grantee,
       owner,
       table_name,
       privilege
FROM dba_tab_privs
WHERE grantee='AVDF_D2_READER'
ORDER BY owner, table_name, privilege;
```

Expected baseline includes:

No:

```text
HR.EMPLOYEES SELECT
```

---

## Step 5 — Retrieve Baseline Entitlements

AVCLI:

**[AVCLI]**

```text
RETRIEVE USER ENTITLEMENT FROM TARGET PDB1_26AI;
```

---

## Step 6 — Verify Job

**[REFERENCE / CONCEPT]**

```text
Settings
    ↓
Jobs
```

---

## Step 7 — Label Baseline

Navigate:

**[REFERENCE / CONCEPT]**

```text
Targets
    ↓
User Entitlement Snapshots
```

Click:

**[WEB CONSOLE]**

```text
Label Baseline
```

Description:

```text
Approved entitlement baseline before Day 5 privilege changes
```

---

## Step 8 — Audit GRANT/REVOKE Changes

Create policy:

**[SQL*PLUS]**

```sql
CREATE AUDIT POLICY avdf_d5_hr_grants
  ACTIONS GRANT ON hr.employees;
```

Enable:

**[SQL*PLUS]**

```sql
AUDIT POLICY avdf_d5_hr_grants;
```

---

## Step 9 — Create Power Role

**[SQL*PLUS]**

```sql
CREATE ROLE avdf_d5_power_role;
```

Grant system privilege:

**[SQL*PLUS]**

```sql
GRANT CREATE TABLE
TO avdf_d5_power_role;
```

---

## Step 10 — Grant Role to Reader

**[SQL*PLUS]**

```sql
GRANT avdf_d5_power_role
TO avdf_d2_reader;
```

---

## Step 11 — Grant Direct HR Access

**[SQL*PLUS]**

```sql
GRANT SELECT
ON hr.employees
TO avdf_d2_reader;
```

---

## Step 12 — Verify New Entitlements

Role:

**[SQL*PLUS]**

```sql
SELECT grantee,
       granted_role
FROM dba_role_privs
WHERE grantee='AVDF_D2_READER';
```

Role privilege:

**[SQL*PLUS]**

```sql
SELECT role,
       privilege
FROM role_sys_privs
WHERE role='AVDF_D5_POWER_ROLE';
```

Object privilege:

**[SQL*PLUS]**

```sql
SELECT grantee,
       owner,
       table_name,
       privilege
FROM dba_tab_privs
WHERE grantee='AVDF_D2_READER'
AND owner='HR'
AND table_name='EMPLOYEES';
```

---

## Step 13 — Prove Access Has Changed

Connect:

**[OS TERMINAL]**

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

Run:

**[SQL*PLUS]**

```sql
SELECT COUNT(*)
FROM hr.employees;
```

---

## Step 14 — Retrieve After-Escalation Snapshot

AVCLI:

**[AVCLI]**

```text
RETRIEVE USER ENTITLEMENT FROM TARGET PDB1_26AI;
```

Wait for Completed job.

---

## Step 15 — Label New Snapshot

Targets:

```text
User Entitlement Snapshots
```

Click:

**[WEB CONSOLE]**

```text
Label After Escalation
```

---

## Step 16 — Compare Snapshots

Reports:

**[WEB CONSOLE]**

```text
Entitlement Reports
```

Compare:

```text
D5_BASELINE
vs
D5_AFTER_ESCALATION
```

---

## Step 17 — Interpret

Answer:

---
