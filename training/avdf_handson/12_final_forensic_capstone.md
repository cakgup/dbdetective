# SCENARIO 12
# FINAL FORENSIC CAPSTONE

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 12 of 12.
> Expected output is intentionally omitted.

## Objective

Reconstruct complete security incident.

This scenario combines all major evidence sources.

**[REFERENCE / CONCEPT]**

```text
                  INCIDENT
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
Unified Audit   DB Firewall    Entitlements
      │              │              │
      └──────────────┼──────────────┘
                     ▼
                   Alerts
                     │
                     ▼
               Correlation
                     │
                     ▼
               Investigation
                     │
                     ▼
                 Root Cause
```

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 12 — Final Forensic Capstone
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 12
```

---

# Phase 1 — Generate Incident

## Step 1 — Use Scenario Generator

Instructor:

**[REFERENCE / CONCEPT]**

```text
Scenario Generator
    ↓
Day 5 Incident
```

This creates a coherent sequence containing:

```text
privilege change
failed login attempts
successful login
HR.EMPLOYEES access
CUSTOMER_SECURE full-table read
large-result behavior
UPDATE attempt
entitlement drift
```

---

# Phase 2 — Authentication Investigation

## Step 2 — Native Failed Logins

SQL*Plus:

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
WHERE dbusername='AVDF_D2_READER'
AND action_name IN ('LOGON','LOGOFF')
ORDER BY event_timestamp;
```

Find:

```text
LOGON RETURN_CODE 1017
LOGON RETURN_CODE 1017
LOGON RETURN_CODE 1017
LOGON RETURN_CODE 0
```

Interpret:

---

## Step 3 — AVDF Failed Login Report

Reports:

```text
Failed Login Events
```

Filter:

```text
AVDF_D2_READER
```

Correlate timestamps.

---

# Phase 3 — HR Access Investigation

## Step 4 — Find Native HR Access

**[SQL*PLUS]**

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code,
       DBMS_LOB.SUBSTR(sql_text,100,1) sql_text
FROM unified_audit_trail
WHERE dbusername='AVDF_D2_READER'
AND object_schema='HR'
AND object_name='EMPLOYEES'
ORDER BY event_timestamp;
```

---

## Step 5 — Find Firewall HR Access

Reports:

**[REFERENCE / CONCEPT]**

```text
Database Firewall Reports
    ↓
Monitored Activity
```

Filter:

```text
User   = AVDF_D2_READER
Object = EMPLOYEES
```

Compare with native evidence.

---

# Phase 4 — Sensitive Customer Data Investigation

## Step 6 — Find Full-Table Read

All Activity filter:

```text
User   = AVDF_D2_READER
Object = CUSTOMER_SECURE
Event  = SELECT
```

Look for:

**[SQL*PLUS]**

```text
SELECT *
FROM AVDF_D2_APP.CUSTOMER_SECURE
```

---

## Step 7 — Find Firewall Policy Match

Inspect event detail:

```text
Policy Name     : LAB_D4_DETECTIVE
Policy Rule     : MONITOR_SENSITIVE_CUSTOMER_DATA
Action Taken    : Alert
Threat Severity : Major
Row Count       : 5
```

---

## Step 8 — Find Large Result Alert

Alerts filter:

```text
Alert Policy = LAB_D4_LARGE_RESULT
Target       = PDB1_26AI
User         = AVDF_D2_READER
```

---

# Phase 5 — Modification Investigation

## Step 9 — Find UPDATE

Native:

**[SQL*PLUS]**

```sql
SELECT event_timestamp,
       dbusername,
       action_name,
       object_schema,
       object_name,
       DBMS_LOB.SUBSTR(sql_text,100,1) sql_text
FROM unified_audit_trail
WHERE dbusername='AVDF_D2_READER'
AND action_name='UPDATE'
ORDER BY event_timestamp;
```

Firewall:

```text
User   = AVDF_D2_READER
Object = CUSTOMER_SECURE
Command= UPDATE
```

---

# Phase 6 — Determine WHY Access Was Possible

## Step 10 — Check Current Object Privilege

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

## Step 11 — Find Who Granted It

Query Unified Audit:

**[SQL*PLUS]**

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       DBMS_LOB.SUBSTR(sql_text,150,1) sql_text
FROM unified_audit_trail
WHERE action_name='GRANT'
ORDER BY event_timestamp;
```

Find grant involving:

```text
HR.EMPLOYEES
AVDF_D2_READER
```

---

## Step 12 — Confirm Entitlement Drift

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

# Phase 7 — Build Forensic Timeline

Build:

| Order | Event | Evidence |
|---:|---|---|
| 1 | Baseline entitlement | Entitlement snapshot |
| 2 | Power role granted | Unified Audit + entitlement |
| 3 | HR SELECT granted | Unified Audit + entitlement |
| 4 | Failed login #1 | Unified Audit |
| 5 | Failed login #2 | Unified Audit |
| 6 | Failed login #3 | Unified Audit |
| 7 | Successful login | Unified Audit |
| 8 | SELECT HR.EMPLOYEES | Unified Audit + Firewall |
| 9 | Full CUSTOMER_SECURE read | Unified Audit + Firewall |
| 10 | Returned row count = 5 | Database Firewall |
| 11 | Large-result alert | Alert |
| 12 | UPDATE CUSTOMER_SECURE | Unified Audit + Firewall |
| 13 | After-escalation snapshot | Entitlement |
| 14 | Drift comparison | Entitlement report |

---

# Phase 8 — Incident Finding

Participant should be able to state:

```text
Actor:
AVDF_D2_READER

Authentication:
Multiple failed logins occurred before successful access.

Unexpected Access:
HR.EMPLOYEES was accessed.

Sensitive Data:
CUSTOMER_SECURE was read.

Data Volume:
The full-table customer query returned five rows.

Modification:
An UPDATE against CUSTOMER_SECURE was attempted.

Privilege Drift:
Yes.

New Object Privilege:
SELECT ON HR.EMPLOYEES.

New Role:
AVDF_D5_POWER_ROLE.

Powerful Role Capability:
CREATE TABLE.

Granting Account:
SYS.

Evidence Sources:
Unified Audit
Database Firewall
Alerts
Entitlement snapshots
Privilege-change audit records
```

---

# Phase 9 — Remediation

## Step 13 — Revoke HR Access

SYS:

**[SQL*PLUS]**

```sql
REVOKE SELECT
ON hr.employees
FROM avdf_d2_reader;
```

---

## Step 14 — Revoke Power Role

**[SQL*PLUS]**

```sql
REVOKE avdf_d5_power_role
FROM avdf_d2_reader;
```

---

## Step 15 — Drop Role

**[SQL*PLUS]**

```sql
DROP ROLE avdf_d5_power_role;
```

---

## Step 16 — Verify HR Access Removed

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

## Step 17 — Verify Role Removed

**[SQL*PLUS]**

```sql
SELECT grantee,
       granted_role
FROM dba_role_privs
WHERE grantee='AVDF_D2_READER'
AND granted_role='AVDF_D5_POWER_ROLE';
```

---

## Step 18 — Verify REVOKE Evidence

**[SQL*PLUS]**

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       DBMS_LOB.SUBSTR(sql_text,150,1) sql_text
FROM unified_audit_trail
WHERE action_name='REVOKE'
ORDER BY event_timestamp DESC;
```

---
