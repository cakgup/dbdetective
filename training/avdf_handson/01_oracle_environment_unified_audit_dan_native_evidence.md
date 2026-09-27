# SCENARIO 01
# ORACLE ENVIRONMENT, UNIFIED AUDIT, DAN NATIVE EVIDENCE

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 01 of 12.
> Expected output is intentionally omitted.

## Objective

Membangun dasar:

**[REFERENCE / CONCEPT]**

```text
User Activity
    ↓
Oracle Database
    ↓
Unified Auditing
    ↓
UNIFIED_AUDIT_TRAIL
    ↓
Native Evidence
```

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 01 — Oracle Environment, Unified Audit dan Native Evidence
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 01
```

---

## Step 1 — Verify Environment Variables

Open:

**[REFERENCE / CONCEPT]**

```text
TRAINING
    ↓
Command Consoles
    ↓
OS Terminal
```

Run:

**[OS TERMINAL]**

```bash
echo $ORACLE_BASE
echo $ORACLE_HOME
echo $ORACLE_SID
which sqlplus
```

---

## Step 2 — Verify Host and Network

**[OS TERMINAL]**

```bash
hostname
```

Run:

**[OS TERMINAL]**

```bash
ip -br addr
```

Expected key value:

Run:

**[OS TERMINAL]**

```bash
ip route
```

Expected route to:

---

## Step 3 — Verify Listener

**[OS TERMINAL]**

```bash
lsnrctl status
```

Run:

**[OS TERMINAL]**

```bash
ss -lntp | grep 1521
```

---

## Step 4 — Verify CDB/PDB

Open SQL*Plus Simulator.

Run:

**[SQL*PLUS]**

```sql
SHOW PDBS;
```

Run:

**[SQL*PLUS]**

```sql
SELECT instance_name,
       status,
       database_status
FROM   v$instance;
```

---

## Step 5 — Verify Oracle Version

**[SQL*PLUS]**

```sql
SELECT banner_full
FROM   v$version;
```

---

## Step 6 — Verify Unified Auditing

**[SQL*PLUS]**

```sql
SELECT parameter,
       value
FROM   v$option
WHERE  parameter='Unified Auditing';
```

---

## Step 7 — Switch to PDB1

**[SQL*PLUS]**

```sql
ALTER SESSION SET CONTAINER=PDB1;
SHOW CON_NAME;
```

---

## Step 8 — Create Training User

**[SQL*PLUS]**

```sql
CREATE USER avdf_demo
IDENTIFIED BY "Oracle#26Lab1";
```

Grant session:

**[SQL*PLUS]**

```sql
GRANT CREATE SESSION
TO avdf_demo;
```

Grant HR access:

**[SQL*PLUS]**

```sql
GRANT SELECT
ON hr.employees
TO avdf_demo;
```

---

## Step 9 — Create Unified Audit Policy

**[SQL*PLUS]**

```sql
CREATE AUDIT POLICY avdf_day1_hr_access
  ACTIONS SELECT ON hr.employees;
```

Enable:

**[SQL*PLUS]**

```sql
AUDIT POLICY avdf_day1_hr_access
BY avdf_demo;
```

---

## Step 10 — Verify Audit Policy Definition

**[SQL*PLUS]**

```sql
SELECT policy_name,
       audit_option,
       object_schema,
       object_name
FROM   audit_unified_policies
WHERE  policy_name='AVDF_DAY1_HR_ACCESS';
```

---

## Step 11 — Verify Enabled Policy

**[SQL*PLUS]**

```sql
SELECT policy_name,
       entity_name,
       entity_type,
       success,
       failure
FROM   audit_unified_enabled_policies
WHERE  policy_name='AVDF_DAY1_HR_ACCESS';
```

---

## Step 12 — Generate Audited SQL

OS Terminal:

**[OS TERMINAL]**

```bash
sqlplus -L 'avdf_demo/Oracle#26Lab1@//192.168.56.26:1521/PDB1'
```

SQL*Plus:

**[SQL*PLUS]**

```sql
SELECT COUNT(*)
FROM hr.employees;
```

Run:

**[SQL*PLUS]**

```sql
SELECT employee_id,
       first_name,
       last_name
FROM hr.employees
FETCH FIRST 5 ROWS ONLY;
```

---

## Step 13 — Query Native Evidence

**[SQL*PLUS]**

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code,
       unified_audit_policies
FROM   unified_audit_trail
WHERE  dbusername='AVDF_DEMO'
ORDER  BY event_timestamp DESC;
```

---

## Step 14 — Display SQL Text

**[SQL*PLUS]**

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       action_name,
       DBMS_LOB.SUBSTR(sql_text,100,1) sql_text
FROM unified_audit_trail
WHERE dbusername='AVDF_DEMO'
ORDER BY event_timestamp DESC;
```

Expected contains actual query text.

---

## Step 15 — Create Authentication Audit Policy

**[SQL*PLUS]**

```sql
CREATE AUDIT POLICY avdf_day1_login
  ACTIONS LOGON, LOGOFF;

AUDIT POLICY avdf_day1_login;
```

---

## Step 16 — Generate Failed Authentication

OS Terminal:

**[OS TERMINAL]**

```bash
sqlplus -L 'avdf_demo/WrongPassword@//192.168.56.26:1521/PDB1'
```

---

## Step 17 — Investigate Authentication Events

**[SQL*PLUS]**

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       return_code,
       userhost,
       client_program_name
FROM unified_audit_trail
WHERE dbusername='AVDF_DEMO'
AND action_name IN ('LOGON','LOGOFF')
ORDER BY event_timestamp DESC;
```

Interpret:

---

## Scenario 01 Questions

1. Apakah auditing memblokir SELECT?
2. Di mana SQL text ditemukan?
3. Apa arti return code 1017?
4. Apa perbedaan audit policy definition dan enabled policy?

---
