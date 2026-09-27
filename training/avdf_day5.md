# DAY 5 HANDS-ON LAB

# Oracle AVDF Reporting, Entitlement Auditing, Compliance, Stored Procedure Monitoring & Final Forensic Investigation

---

# 1. LAB ENVIRONMENT

Database environment:

```text
OS          : Oracle Linux Server 9.8
Oracle      : Oracle AI Database 26ai Enterprise Edition 23.26.1.0.0

ORACLE_HOME : /opt/oracle/product/26ai/dbhome_1
ORACLE_BASE : /opt/oracle
ORACLE_SID  : ORCLCDB

CDB         : ORCLCDB
PDB         : PDB1

Listener    : 192.168.56.26:1521

SYS         : oracle
SYSTEM      : oracle
HR          : oracle
```

Existing AVDF environment from Day 1–4:

```text
Secured Target       : PDB1_26AI
Database Firewall    : DBFW1

Audit Vault Agent    : RUNNING
Host Monitor         : RUNNING

Database Firewall Mode
----------------------
Monitoring (Host Monitor)

TABLE Trail
-----------
UNIFIED_AUDIT_TRAIL

NETWORK Trail
-------------
Database Firewall / Host Monitor

Firewall Policy
---------------
LAB_D4_DETECTIVE
```

Application accounts:

```text
AVDF_D2_APP
AVDF_D2_READER
AVDFCOLLECT
```

Sensitive application table:

```text
AVDF_D2_APP.CUSTOMER_SECURE
```

Existing Day 4 objects:

```text
D4_APP_READERS
D4_SENSITIVE_OBJECTS
D4_READER_PROFILE
D4_NORMAL_SQL

LAB_D4_DETECTIVE
LAB_D4_LARGE_RESULT
```

---

# 2. DAY 5 OBJECTIVE

Day 1:

```text
Oracle Database
      ↓
Unified Audit
      ↓
Audit Vault
```

Day 2:

```text
Audit Vault
      ↓
Audit Policies
Alerts
Retention
Investigation
```

Day 3:

```text
Network SQL
      ↓
Host Monitor
      ↓
Database Firewall
```

Day 4:

```text
Normal SQL
      ↓
Baseline
      ↓
Firewall Policy
      ↓
Detect Anomalies
```

Day 5 menyatukan semuanya:

```text
              DATABASE ACTIVITY
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   UNIFIED AUDITING        DATABASE FIREWALL
          │                       │
          ▼                       ▼
    Native Evidence         Network Evidence
          │                       │
          └───────────┬───────────┘
                      ▼
               AUDIT VAULT
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
     REPORTS       ALERTS      ENTITLEMENTS
        │             │             │
        └─────────────┼─────────────┘
                      ▼
                  CORRELATE
                      │
                      ▼
                 INVESTIGATE
                      │
                      ▼
                  COMPLIANCE
```

---

# 3. DAY 5 LEARNING OBJECTIVES

Pada akhir Day 5 peserta mampu:

1. Memvalidasi seluruh AVDF environment.
2. Menggunakan built-in AVDF reports.
3. Menggunakan All Activity report.
4. Menggunakan Failed Login Events report.
5. Menggunakan Database Schema Activity report.
6. Menggunakan Entitlement Activity report.
7. Menggunakan Database Firewall reports.
8. Memfilter dan menyesuaikan report.
9. Menyimpan customized report.
10. Membuat scheduled report.
11. Mengelola target group.
12. Menghubungkan target dengan compliance group.
13. Menyiapkan AVDF account untuk entitlement retrieval.
14. Mengambil user entitlement snapshot.
15. Memberikan label kepada snapshot.
16. Membuat entitlement baseline.
17. Mensimulasikan privilege drift.
18. Mengambil entitlement snapshot kedua.
19. Membandingkan dua entitlement snapshots.
20. Mengidentifikasi privilege escalation.
21. Menggunakan Privileged Users report.
22. Menggunakan System Privileges report.
23. Menggunakan Object Privileges report.
24. Menggunakan User Privileges report.
25. Menggunakan Role Privileges report.
26. Mengaktifkan Stored Procedure Auditing.
27. Mendeteksi procedure creation/modification.
28. Mengelola AVDF alerts.
29. Melakukan alert triage.
30. Mengorelasikan native audit dengan firewall evidence.
31. Melakukan full security incident investigation.
32. Membuat incident timeline.
33. Menentukan root cause.
34. Menentukan entitlement change yang menyebabkan akses.
35. Membuat final forensic findings.

---

# 4. RECOMMENDED DAY 5 SCHEDULE

| Waktu       | Materi                         |
| ----------- | ------------------------------ |
| 09:00–09:30 | Environment validation         |
| 09:30–10:30 | Built-in Reports               |
| 10:30–11:00 | Customized & Scheduled Reports |
| 11:00–11:30 | Target Groups & Compliance     |
| 11:30–12:00 | Prepare Entitlement Retrieval  |
| 13:00–13:45 | Baseline Entitlement Snapshot  |
| 13:45–14:30 | Privilege Drift Simulation     |
| 14:30–15:00 | Snapshot Comparison            |
| 15:00–15:30 | Stored Procedure Auditing      |
| 15:30–16:00 | Alert Investigation            |
| 16:00–17:00 | Final Forensic Capstone        |

---

# PART A

# VALIDATE DAY 1–4 ENVIRONMENT

---

# Lab 1 — Set Oracle Environment

```bash
sudo su - oracle
```

Set:

```bash
export ORACLE_BASE=/opt/oracle
export ORACLE_HOME=/opt/oracle/product/26ai/dbhome_1
export ORACLE_SID=ORCLCDB
export PATH=$ORACLE_HOME/bin:$PATH
```

Verify:

```bash
echo $ORACLE_BASE
echo $ORACLE_HOME
echo $ORACLE_SID
which sqlplus
```

Expected:

```text
/opt/oracle
/opt/oracle/product/26ai/dbhome_1
ORCLCDB
/opt/oracle/product/26ai/dbhome_1/bin/sqlplus
```

---

# Lab 2 — Verify Database

```bash
sqlplus / as sysdba
```

Run:

```sql
SET LINES 200
SET PAGES 100

SELECT instance_name,
       status,
       database_status
FROM   v$instance;
```

Expected:

```text
INSTANCE_NAME STATUS       DATABASE_STATUS
------------- ------------ -----------------
ORCLCDB       OPEN         ACTIVE
```

---

# Lab 3 — Verify PDB

```sql
SHOW PDBS
```

Expected:

```text
CON_ID CON_NAME      OPEN MODE  RESTRICTED
------ ------------- ---------- ----------
2      PDB$SEED      READ ONLY  NO
3      PDB1          READ WRITE NO
```

Switch:

```sql
ALTER SESSION SET CONTAINER=PDB1;

SHOW CON_NAME
```

Expected:

```text
CON_NAME
------------------------------
PDB1
```

---

# Lab 4 — Verify Training Users

```sql
COLUMN username FORMAT A20
COLUMN account_status FORMAT A20

SELECT username,
       account_status
FROM   dba_users
WHERE  username IN
       ('AVDFCOLLECT',
        'AVDF_D2_APP',
        'AVDF_D2_READER')
ORDER BY username;
```

Expected:

```text
USERNAME             ACCOUNT_STATUS
-------------------- --------------------
AVDFCOLLECT          OPEN
AVDF_D2_APP          OPEN
AVDF_D2_READER       OPEN
```

---

# Lab 5 — Verify Sensitive Table

```sql
SELECT COUNT(*)
FROM avdf_d2_app.customer_secure;
```

Expected:

```text
  COUNT(*)
----------
         5
```

---

# Lab 6 — Verify Native Audit

```sql
SELECT COUNT(*)
FROM unified_audit_trail;
```

Example:

```text
  COUNT(*)
----------
      1247
```

Actual number will vary.

---

# Lab 7 — Verify Audit Vault Trails

On AVDF:

```text
avcli> LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

Expected contains:

```text
TABLE
UNIFIED_AUDIT_TRAIL

NETWORK
```

TABLE trail may display:

```text
RUNNING
```

or:

```text
IDLE
```

NETWORK trail should also be active.

---

# Lab 8 — Verify Database Firewall

```text
avcli> LIST FIREWALL;
```

Expected:

```text
DBFW1
```

Check monitoring point:

```text
avcli> LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

Conceptual result:

```text
Target      : PDB1_26AI
Firewall    : DBFW1
Mode        : Monitoring_Host_Monitor
Status      : Running
Policy      : LAB_D4_DETECTIVE
```

---

# PART B

# AVDF REPORTING OVERVIEW

The original syllabus explicitly covers:

```text
Using Built-in Reports
Managing Reports
Customizing Built-in Reports
Creating Custom Reports
```

Current AVDF provides activity, entitlement, Database Firewall, stored-procedure, alert, summary/anomaly, and compliance report families.

---

# Lab 9 — Open All Activity Report

Login to Audit Vault Server as Auditor.

Navigate:

```text
Reports
   ↓
Activity Reports
   ↓
All Activity
```

Set filter:

```text
Target = PDB1_26AI
```

Set time:

```text
Last 1 Day
```

or select the Day 1–5 training window.

---

# Lab 10 — Select Investigation Columns

Add/display useful columns:

```text
Event Time
Target
User
Event
Event Status
Object Owner
Object
Command Text
Client Host
Client IP
Client Program
Policy Name
Threat Severity
Row Count
```

Not every event source fills every column.

That is normal because:

```text
Unified Audit
```

and:

```text
Database Firewall
```

supply different contextual information.

---

# Lab 11 — Filter Application Reader

Filter:

```text
User = AVDF_D2_READER
```

Expected events accumulated from previous days may include:

```text
LOGON

SELECT
CUSTOMER_SECURE

UPDATE
CUSTOMER_SECURE

Failed LOGON

Database Firewall alerts
```

---

# Lab 12 — Failed Login Events Report

Navigate:

```text
Reports
   ↓
Activity Reports
   ↓
Failed Login Events
```

Filter:

```text
Target = PDB1_26AI
User   = AVDF_D2_READER
```

Expected:

```text
AVDF_D2_READER
LOGON
FAILURE
```

with multiple events created during Day 2 and Day 4.

The current AVDF built-in reports include separate Failed Login Events and Login/Logout reports.

---

# Lab 13 — Login and Logout Report

Navigate:

```text
Reports
   ↓
Activity Reports
   ↓
Login and Logout
```

Filter:

```text
Target = PDB1_26AI
```

Compare:

```text
successful authentication
```

versus:

```text
failed authentication
```

---

# Lab 14 — Database Schema Activity Report

Navigate:

```text
Reports
   ↓
Activity Reports
   ↓
Database Schema Activity
```

Filter:

```text
Target = PDB1_26AI
User   = AVDF_D2_APP
```

Look for activity produced during earlier days:

```text
CREATE TABLE
ALTER TABLE
DROP TABLE
```

Example object:

```text
TEMP_ORDERS
```

---

# Lab 15 — Entitlement Activity Report

Navigate:

```text
Reports
   ↓
Activity Reports
   ↓
Entitlement Activity
```

This report focuses on changes involving:

```text
GRANT
REVOKE
roles
privileges
```

We will populate more interesting data later.

---

# Lab 16 — Database Firewall Monitored Activity

Navigate:

```text
Reports
   ↓
Activity Reports
   ↓
Database Firewall Reports
   ↓
Monitored Activity
```

Filter:

```text
Target = PDB1_26AI
```

Current AVDF names this report **Monitored Activity**; older AVDF versions called it Database Firewall Monitored Activity.

---

# Lab 17 — Database Firewall Alert Activity

Navigate to:

```text
Database Firewall Reports
   ↓
Alert Activity
```

Older AVDF versions may show:

```text
Warned Statements
```

Look for events from:

```text
LAB_D4_DETECTIVE
```

---

# Lab 18 — Inspect Day 4 Sensitive-Object Alert

Filter:

```text
User   = AVDF_D2_READER
Object = CUSTOMER_SECURE
```

Expected:

```text
SELECT
UPDATE
```

Policy:

```text
LAB_D4_DETECTIVE
```

Threat severity:

```text
Major
```

if Day 4 was configured exactly as specified.

---

# PART C

# CUSTOMIZE AND SAVE REPORT

---

# Lab 19 — Create Focused Investigation Report

Start with:

```text
All Activity
```

Filter:

```text
Target = PDB1_26AI
```

and:

```text
User = AVDF_D2_READER
```

Display:

```text
Event Time
User
Client IP
Client Program
Event
Object
Event Status
Command Text
Policy Name
Row Count
```

Sort:

```text
Event Time ASC
```

---

# Lab 20 — Save Customized Report

From report actions:

```text
Save Report
```

Name:

```text
D5_READER_INVESTIGATION
```

Description:

```text
Day 5 AVDF_D2_READER forensic investigation report
```

Save.

AVDF supports filtering, formatting and saving customized versions of built-in reports.

---

# Lab 21 — Reopen Saved Report

Navigate:

```text
Reports
   ↓
Saved / Customized Reports
```

Open:

```text
D5_READER_INVESTIGATION
```

Verify the filters are retained.

---

# PART D

# SCHEDULE A REPORT

---

# Lab 22 — Create Report Schedule

Open:

```text
D5_READER_INVESTIGATION
```

Choose:

```text
Schedule
```

Example configuration:

```text
Schedule Name:
D5_DAILY_INVESTIGATION

Frequency:
Daily

Format:
PDF
```

or:

```text
XLS
```

Use the next convenient execution time.

AVDF supports scheduled generation of PDF and XLS reports.

---

# Lab 23 — Check Scheduled Reports

Navigate:

```text
Reports
   ↓
Scheduled Reports
```

Find:

```text
D5_DAILY_INVESTIGATION
```

Expected:

```text
Enabled
```

---

# PART E

# TARGET GROUPS

The original syllabus includes:

```text
Creating Secured Target Groups
Assigning a Secured Target to a Compliance Group
```

---

# Lab 24 — Create Training Target Group

AVCLI:

```text
avcli> CREATE TARGET GROUP D5_TRAINING_GROUP
DESCRIPTION 'Oracle 26ai Day 5 training targets';
```

Expected conceptually:

```text
Target group D5_TRAINING_GROUP created.
```

Current AVDF supports target-group creation through AVCLI.

---

# Lab 25 — Add Target to Group

```text
avcli> ALTER TARGET GROUP D5_TRAINING_GROUP
ADD TARGET PDB1_26AI;
```

Expected:

```text
Target PDB1_26AI added to D5_TRAINING_GROUP.
```

---

# Lab 26 — Verify from Console

Navigate:

```text
Targets
   ↓
Target Groups
```

Expected:

```text
D5_TRAINING_GROUP
```

Members:

```text
PDB1_26AI
```

Target groups are useful for organizing targets and granting auditors access to a set of targets rather than one-by-one.

---

# PART F

# COMPLIANCE GROUP

AVDF includes preconfigured groups for compliance categories.

Available categories depend on release/configuration and can include frameworks such as:

```text
PCI-DSS
SOX
HIPAA
GDPR / Data Privacy
GLBA
DPA
```

---

# Lab 27 — Add PDB1 to a Compliance Group

Login as appropriate Auditor/Super Auditor.

Navigate:

```text
Targets
   ↓
Target Groups
   ↓
Pre-configured Groups
```

Choose one available category.

For training, for example:

```text
PCI-DSS
```

or:

```text
Data Privacy / GDPR
```

Move:

```text
PDB1_26AI
```

from:

```text
Available
```

to:

```text
Selected
```

Save.

Current AVDF implements compliance association through these preconfigured target groups.

---

# PART G

# PREPARE USER ENTITLEMENT RETRIEVAL

This is a major Day 5 section.

The original syllabus explicitly requires:

```text
Managing Entitlements

Retrieving Entitlement Data
from an Oracle Database

Creating a snapshot

Creating Labels

Assigning Labels

Using Entitlement Reports
```

---

# Important

`SETUP` mode used earlier is for:

```text
audit collection
+
audit-policy management
```

Entitlement retrieval requires:

```text
ENTITLEMENT
```

mode for the AVDF account.

Current Oracle AVDF setup scripts explicitly provide separate `SETUP`, `SPA`, and `ENTITLEMENT` modes.

---

# Lab 28 — Locate Oracle AVDF Setup Script

Assume it was downloaded earlier to:

```text
/home/oracle/avdf_setup/oracle_user_setup.sql
```

Verify:

```bash
ls -l /home/oracle/avdf_setup/oracle_user_setup.sql
```

Expected:

```text
-rw-r--r-- ... oracle_user_setup.sql
```

If the file does not exist, download it from:

```text
Targets
   ↓
Target Setup Script
```

on Audit Vault Server.

---

# Lab 29 — Enable Entitlement Privileges

Connect:

```bash
sqlplus / as sysdba
```

Switch:

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Run:

```sql
@/home/oracle/avdf_setup/oracle_user_setup.sql AVDFCOLLECT ENTITLEMENT
```

Output varies by AVDF release.

The important criterion:

```text
script completes successfully
```

without an unhandled:

```text
ORA-
```

error.

---

# Lab 30 — Verify AVDFCOLLECT

```sql
SELECT username,
       account_status
FROM   dba_users
WHERE  username='AVDFCOLLECT';
```

Expected:

```text
USERNAME             ACCOUNT_STATUS
-------------------- --------------------
AVDFCOLLECT          OPEN
```

---

# PART H

# EXAMINE CURRENT ENTITLEMENTS NATIVELY

Before creating AVDF snapshot, understand the source data.

---

# Lab 31 — Current Role Grants

```sql
COLUMN grantee FORMAT A20
COLUMN granted_role FORMAT A30
COLUMN admin_option FORMAT A12

SELECT grantee,
       granted_role,
       admin_option
FROM   dba_role_privs
WHERE  grantee='AVDF_D2_READER'
ORDER BY granted_role;
```

Example:

```text
no rows selected
```

or roles already existing from your environment.

Record the current result.

---

# Lab 32 — Current System Privileges

```sql
COLUMN privilege FORMAT A30

SELECT grantee,
       privilege,
       admin_option
FROM   dba_sys_privs
WHERE  grantee='AVDF_D2_READER'
ORDER BY privilege;
```

Expected baseline may include:

```text
CREATE SESSION
```

depending on how Oracle exposes the direct grant.

---

# Lab 33 — Current Object Privileges

```sql
COLUMN owner FORMAT A15
COLUMN table_name FORMAT A25
COLUMN privilege FORMAT A15

SELECT grantee,
       owner,
       table_name,
       privilege,
       grantable
FROM   dba_tab_privs
WHERE  grantee='AVDF_D2_READER'
ORDER BY owner,
         table_name,
         privilege;
```

Expected contains:

```text
AVDF_D2_APP CUSTOMER_SECURE SELECT
AVDF_D2_APP CUSTOMER_SECURE UPDATE
```

---

# PART I

# CREATE BASELINE ENTITLEMENT SNAPSHOT

Every entitlement retrieval creates a snapshot of that point in time. AVDF can later compare snapshots to identify entitlement drift or privilege escalation.

---

# Lab 34 — Retrieve Baseline Entitlement

AVCLI:

```text
avcli> RETRIEVE USER ENTITLEMENT FROM TARGET PDB1_26AI;
```

Expected:

```text
The job to retrieve user entitlement is submitted successfully.
```

This is the current documented AVCLI syntax.

---

# Lab 35 — Monitor Entitlement Job

Navigate:

```text
Settings
   ↓
Jobs
```

Find:

```text
User Entitlement
```

for:

```text
PDB1_26AI
```

Expected:

```text
Completed
```

Do not proceed to snapshot comparison until the retrieval job has completed.

---

# Lab 36 — View Snapshot

Navigate:

```text
Targets
   ↓
PDB1_26AI
   ↓
User Entitlements Snapshots
```

A new snapshot should be visible.

Record its timestamp.

---

# Lab 37 — Create Baseline Label

Navigate:

```text
Reports
   ↓
Entitlements
   ↓
Snapshot Labels
```

Create label:

```text
D5_BASELINE
```

Description:

```text
Approved entitlement baseline before Day 5 privilege changes
```

---

# Lab 38 — Assign Label to Baseline Snapshot

Select the snapshot from Lab 36.

Assign:

```text
D5_BASELINE
```

AVDF supports labels specifically so snapshots can be grouped and compared later.

---

# PART J

# BASELINE ENTITLEMENT REPORTS

---

# Lab 39 — User Privileges Report

Navigate:

```text
Reports
   ↓
Activity Reports
   ↓
Entitlement Reports
   ↓
User Privileges
```

Select:

```text
Target = PDB1_26AI
Label  = D5_BASELINE
```

Filter:

```text
User = AVDF_D2_READER
```

Record privileges.

---

# Lab 40 — Object Privileges Report

Open:

```text
Object Privileges
```

Filter:

```text
AVDF_D2_READER
```

Expected:

```text
CUSTOMER_SECURE
SELECT

CUSTOMER_SECURE
UPDATE
```

---

# Lab 41 — Role Privileges Report

Open:

```text
Role Privileges
```

Filter:

```text
AVDF_D2_READER
```

Record baseline.

---

# Lab 42 — System Privileges Report

Open:

```text
System Privileges
```

Filter:

```text
AVDF_D2_READER
```

This becomes our:

```text
BEFORE
```

state.

AVDF entitlement reports include role, object, privileged-user, system-privilege, user-account and user-privilege views.

---

# PART K

# PREPARE DETERMINISTIC GRANT AUDITING

We want the privilege change itself to leave native audit evidence.

Oracle 26ai can audit `GRANT` on a specific object; auditing GRANT on that object also captures corresponding REVOKE operations.

---

# Lab 43 — Create Grant Audit Policy

Connect:

```bash
sqlplus / as sysdba
```

Switch:

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Create:

```sql
CREATE AUDIT POLICY avdf_d5_hr_grants
  ACTIONS GRANT ON hr.employees;
```

Expected:

```text
Audit policy created.
```

Enable:

```sql
AUDIT POLICY avdf_d5_hr_grants;
```

Expected:

```text
Audit succeeded.
```

---

# Lab 44 — Verify Policy

```sql
SELECT policy_name,
       audit_option,
       object_schema,
       object_name
FROM   audit_unified_policies
WHERE  policy_name='AVDF_D5_HR_GRANTS';
```

Expected:

```text
POLICY_NAME          AUDIT_OPTION OBJECT_SCHEMA OBJECT_NAME
-------------------- ------------ ------------- -----------
AVDF_D5_HR_GRANTS    GRANT        HR            EMPLOYEES
```

---

# PART L

# SIMULATE ENTITLEMENT DRIFT

Scenario:

> Application reader seharusnya hanya dapat membaca dan memperbarui CUSTOMER_SECURE. Seorang administrator kemudian memberikan additional object access dan powerful role.

---

# Lab 45 — Create Power Role

As SYS in PDB1:

```sql
CREATE ROLE avdf_d5_power_role;
```

Expected:

```text
Role created.
```

Grant system privilege:

```sql
GRANT CREATE TABLE
TO avdf_d5_power_role;
```

Expected:

```text
Grant succeeded.
```

---

# Lab 46 — Grant Role to Reader

```sql
GRANT avdf_d5_power_role
TO avdf_d2_reader;
```

Expected:

```text
Grant succeeded.
```

Now:

```text
AVDF_D2_READER
```

has a new role it did not have at baseline.

---

# Lab 47 — Grant Direct HR Access

```sql
GRANT SELECT
ON hr.employees
TO avdf_d2_reader;
```

Expected:

```text
Grant succeeded.
```

This is especially useful because:

```text
before
------
AVDF_D2_READER
could not read HR.EMPLOYEES
```

and:

```text
after
-----
AVDF_D2_READER
can read HR.EMPLOYEES
```

---

# Lab 48 — Verify New Role

```sql
SELECT grantee,
       granted_role
FROM   dba_role_privs
WHERE  grantee='AVDF_D2_READER'
ORDER BY granted_role;
```

Expected contains:

```text
GRANTEE             GRANTED_ROLE
------------------- ----------------------
AVDF_D2_READER      AVDF_D5_POWER_ROLE
```

---

# Lab 49 — Inspect Role Privileges

```sql
SELECT role,
       privilege
FROM   role_sys_privs
WHERE  role='AVDF_D5_POWER_ROLE';
```

Expected:

```text
ROLE                 PRIVILEGE
-------------------- --------------------
AVDF_D5_POWER_ROLE   CREATE TABLE
```

---

# Lab 50 — Verify New Object Privilege

```sql
SELECT grantee,
       owner,
       table_name,
       privilege
FROM   dba_tab_privs
WHERE  grantee='AVDF_D2_READER'
ORDER BY owner,
         table_name,
         privilege;
```

Expected now includes:

```text
AVDF_D2_READER HR          EMPLOYEES       SELECT
AVDF_D2_READER AVDF_D2_APP CUSTOMER_SECURE SELECT
AVDF_D2_READER AVDF_D2_APP CUSTOMER_SECURE UPDATE
```

This is our:

```text
ENTITLEMENT DRIFT
```

---

# PART M

# VERIFY GRANT AUDIT EVENT

---

# Lab 51 — Query Unified Audit Trail

```sql
SET LINES 250
SET PAGES 100

COLUMN event_time FORMAT A19
COLUMN dbusername FORMAT A15
COLUMN action_name FORMAT A12
COLUMN object_schema FORMAT A15
COLUMN object_name FORMAT A20
COLUMN target_user FORMAT A20
COLUMN object_privileges FORMAT A25

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       target_user,
       object_privileges
FROM   unified_audit_trail
WHERE  action_name IN ('GRANT','REVOKE')
AND    object_schema='HR'
AND    object_name='EMPLOYEES'
ORDER BY event_timestamp DESC;
```

Expected conceptually:

```text
EVENT_TIME          DBUSERNAME ACTION_NAME OBJECT_SCHEMA OBJECT_NAME TARGET_USER     OBJECT_PRIVILEGES
------------------- ---------- ----------- ------------- ----------- --------------- -----------------
...                 SYS        GRANT       HR            EMPLOYEES   AVDF_D2_READER SELECT
```

`TARGET_USER` records the grantee for this type of audit event.

---

# PART N

# USE NEW PRIVILEGE

Now we create the security scenario.

Before the privilege change this SQL would fail.

After the grant:

```text
it succeeds.
```

---

# Lab 52 — Login as Reader

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

---

# Lab 53 — Access HR.EMPLOYEES

```sql
SET LINES 180

SELECT employee_id,
       first_name,
       last_name,
       salary
FROM   hr.employees
WHERE  department_id=90;
```

Expected:

```text
EMPLOYEE_ID FIRST_NAME      LAST_NAME      SALARY
----------- --------------- -------------- ----------
100         Steven          King              24000
101         Neena           Kochhar           17000
102         Lex             De Haan            17000
```

This is important.

The question is no longer only:

```text
Who executed the SQL?
```

but:

```text
WHY was this account suddenly able
to execute the SQL?
```

Entitlement data will answer that.

---

# Lab 54 — Full HR Row Count

```sql
SELECT COUNT(*)
FROM hr.employees;
```

Expected:

```text
  COUNT(*)
----------
       107
```

---

# Lab 55 — Existing Sensitive Data Access

```sql
SELECT *
FROM avdf_d2_app.customer_secure;
```

Expected:

```text
5 rows selected.
```

---

# Lab 56 — Modification Attempt

```sql
UPDATE avdf_d2_app.customer_secure
SET    credit_limit = credit_limit + 1000000
WHERE  customer_id=1;
```

Expected:

```text
1 row updated.
```

Rollback:

```sql
ROLLBACK;
```

Expected:

```text
Rollback complete.
```

Exit:

```sql
EXIT
```

---

# PART O

# GENERATE AUTHENTICATION ANOMALY

---

# Lab 57 — Failed Login Attempts

```bash
for i in 1 2 3
do
  echo "Day 5 failed login attempt $i"
  sqlplus -L -s 'avdf_d2_reader/WrongPassword@//192.168.56.26:1521/PDB1' <<'EOF'
EXIT
EOF
done
```

Example:

```text
Day 5 failed login attempt 1
ORA-01017: invalid username/password; logon denied

Day 5 failed login attempt 2
ORA-01017: invalid username/password; logon denied

Day 5 failed login attempt 3
ORA-01017: invalid username/password; logon denied
```

This should also trigger the Day 2 failed-login alert if it remains active.

---

# PART P

# CREATE SECOND ENTITLEMENT SNAPSHOT

---

# Lab 58 — Retrieve Entitlements Again

AVCLI:

```text
avcli> RETRIEVE USER ENTITLEMENT FROM TARGET PDB1_26AI;
```

Expected:

```text
The job to retrieve user entitlement is submitted successfully.
```

---

# Lab 59 — Verify Job Completion

Navigate:

```text
Settings
   ↓
Jobs
```

Find the latest:

```text
User Entitlement
```

Target:

```text
PDB1_26AI
```

Expected:

```text
Completed
```

---

# Lab 60 — View New Snapshot

Navigate:

```text
Targets
   ↓
PDB1_26AI
   ↓
User Entitlements Snapshots
```

You should now have at least:

```text
Snapshot A
before privilege change

Snapshot B
after privilege change
```

---

# Lab 61 — Create Second Label

Create:

```text
D5_AFTER_ESCALATION
```

Description:

```text
Entitlement state after Day 5 privilege drift simulation
```

Assign to the latest snapshot.

---

# PART Q

# COMPARE ENTITLEMENT SNAPSHOTS

This is one of the most important labs in the entire 5-day training.

---

# Lab 62 — Open Entitlement Comparison

Navigate:

```text
Reports
   ↓
Entitlement Reports
```

Choose snapshot/label comparison.

Compare:

```text
D5_BASELINE
```

against:

```text
D5_AFTER_ESCALATION
```

AVDF is specifically designed to compare entitlement snapshots or labels to detect privilege changes over time.

---

# Lab 63 — Compare User Privileges

Filter:

```text
User = AVDF_D2_READER
```

Expected new entitlement includes:

```text
AVDF_D5_POWER_ROLE
```

and:

```text
SELECT
ON
HR.EMPLOYEES
```

---

# Lab 64 — Compare Role Privileges

Open:

```text
Role Privileges
```

Look for:

```text
AVDF_D5_POWER_ROLE
```

which carries:

```text
CREATE TABLE
```

---

# Lab 65 — Compare Object Privileges

Expected change:

```text
BEFORE

HR.EMPLOYEES
<no privilege>
```

versus:

```text
AFTER

HR.EMPLOYEES
SELECT
```

---

# Lab 66 — Interpret Entitlement Drift

The complete story is:

```text
Baseline
   │
   │ AVDF_D2_READER
   │ no HR access
   ▼

Privilege change
   │
   ├── AVDF_D5_POWER_ROLE
   │       └── CREATE TABLE
   │
   └── SELECT ON HR.EMPLOYEES
           │
           ▼

New entitlement snapshot
           │
           ▼

AVDF detects entitlement drift
```

---

# PART R

# PRIVILEGED USER REPORT

AVDF entitlement data also drives reports that classify privileged users.

An entitlement retrieval job is important for populating reports such as **All Activity by Privileged Users**.

---

# Lab 67 — Open All Activity by Privileged Users

Navigate:

```text
Reports
   ↓
Activity Reports
   ↓
All Activity by Privileged Users
```

Target:

```text
PDB1_26AI
```

If your newly created training role does not qualify under AVDF's privileged-user criteria, that is expected.

The important learning point is:

```text
privileged-user classification
depends on entitlement information
```

rather than merely usernames.

---

# PART S

# STORED PROCEDURE AUDITING

The original syllabus also includes:

```text
Overview of Oracle Database Stored Procedure Auditing
```

AVDF can periodically retrieve stored-procedure definitions and report:

```text
created
modified
deleted
```

procedures.

---

# Lab 68 — Grant SPA Privileges to AVDFCOLLECT

Run:

```bash
sqlplus / as sysdba
```

Switch:

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Run:

```sql
@/home/oracle/avdf_setup/oracle_user_setup.sql AVDFCOLLECT SPA
```

Expected:

```text
setup completes successfully
```

The `SPA` mode exists specifically for Stored Procedure Auditing.

---

# Lab 69 — Create Stored Procedure

Connect as application owner:

```bash
sqlplus -L 'avdf_d2_app/Oracle#D2App26@//192.168.56.26:1521/PDB1'
```

If `CREATE PROCEDURE` was not previously granted, SYS must first run:

```sql
GRANT CREATE PROCEDURE
TO avdf_d2_app;
```

Now as `AVDF_D2_APP`:

```sql
CREATE OR REPLACE PROCEDURE get_customer_count
AS
    l_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO   l_count
    FROM   customer_secure;

    DBMS_OUTPUT.PUT_LINE(
        'Customer count = ' || l_count
    );
END;
/
```

Expected:

```text
Procedure created.
```

---

# Lab 70 — Execute Procedure

```sql
SET SERVEROUTPUT ON

BEGIN
    get_customer_count;
END;
/
```

Expected:

```text
Customer count = 5

PL/SQL procedure successfully completed.
```

---

# Lab 71 — Verify Procedure

```sql
COLUMN object_name FORMAT A30

SELECT object_name,
       object_type,
       status
FROM   user_objects
WHERE  object_name='GET_CUSTOMER_COUNT';
```

Expected:

```text
OBJECT_NAME          OBJECT_TYPE STATUS
-------------------- ----------- -------
GET_CUSTOMER_COUNT   PROCEDURE   VALID
```

Exit.

---

# Lab 72 — Enable Stored Procedure Retrieval

On Audit Vault Server:

```text
Targets
   ↓
PDB1_26AI
   ↓
Schedule Retrieval Jobs
```

Under:

```text
Stored Procedure Auditing
```

choose:

```text
Create/Update Schedule
```

Enable.

For training, use a short practical schedule supported by your console.

Save.

AVDF stored-procedure reports are populated by scheduled retrieval jobs.

---

# Lab 73 — Verify SPA Job

Navigate:

```text
Settings
   ↓
Jobs
```

Look for:

```text
Stored Procedure Auditing
```

Expected:

```text
Completed
```

after the retrieval occurs.

---

# Lab 74 — Modify Procedure

Connect:

```bash
sqlplus -L 'avdf_d2_app/Oracle#D2App26@//192.168.56.26:1521/PDB1'
```

Replace:

```sql
CREATE OR REPLACE PROCEDURE get_customer_count
AS
    l_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO   l_count
    FROM   customer_secure
    WHERE  account_status='ACTIVE';

    DBMS_OUTPUT.PUT_LINE(
        'Active customer count = ' || l_count
    );
END;
/
```

Expected:

```text
Procedure created.
```

Test:

```sql
SET SERVEROUTPUT ON

BEGIN
    get_customer_count;
END;
/
```

Example:

```text
Active customer count = 4

PL/SQL procedure successfully completed.
```

Exit.

---

# Lab 75 — Retrieve Stored Procedure State Again

Allow/run the scheduled retrieval again.

Then navigate:

```text
Reports
   ↓
Activity Reports
   ↓
Stored Procedure Changes
```

Current AVDF provides reports for:

```text
Created Stored Procedures

Stored Procedure Modification History

Deleted Stored Procedures
```

---

# Lab 76 — Verify Modification

Filter:

```text
Target = PDB1_26AI
```

Procedure:

```text
GET_CUSTOMER_COUNT
```

Expected:

```text
creation
```

and later:

```text
modification
```

history.

---

# PART T

# ALERT MANAGEMENT

The original syllabus includes:

```text
Overview of Alerts
Email Notifications
Templates
Distribution Lists
```

---

# Lab 77 — List Alert Policies

AVCLI:

```text
avcli> LIST ALERT POLICIES;
```

Expected to include policies created during training, such as:

```text
LAB_FAILED_LOGIN

LAB_D4_LARGE_RESULT
```

Current AVDF supports listing, enabling, disabling, and deleting alert policies from AVCLI.

---

# Lab 78 — Open Alert Console

Navigate:

```text
Alerts
   ↓
Alerts
```

Filter:

```text
Target = PDB1_26AI
```

Look for:

```text
failed login alerts

large result alerts

Database Firewall alerts
```

---

# Lab 79 — Alert Status Workflow

New alerts initially have status:

```text
New
```

Select an alert and change it to:

```text
Open
```

during investigation.

After investigation, change to:

```text
Closed
```

AVDF supports alert workflow/status management and manual notification from the alert console.

---

# PART U

# OPTIONAL EMAIL NOTIFICATION LAB

Only perform this if SMTP has already been configured on the Audit Vault Server.

Do not configure fake SMTP infrastructure merely for this lab.

Navigate:

```text
Settings
   ↓
Notifications
```

Create distribution list:

```text
D5_SECURITY_TEAM
```

Add the actual training email address(es).

Then edit:

```text
LAB_FAILED_LOGIN
```

and associate:

```text
D5_SECURITY_TEAM
```

with an appropriate notification template.

Current AVDF supports both notification templates and distribution lists for alert email delivery.

---

# PART V

# OPERATIONAL STATUS REVIEW

The original syllabus includes:

```text
Viewing Audit Trails and Status

Viewing Enforcement Points / Monitoring Points

Data Retention Policy

Monitoring Jobs
```

---

# Lab 80 — Audit Trail Status

```text
avcli> LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

Check:

```text
TABLE
UNIFIED_AUDIT_TRAIL
```

and:

```text
NETWORK
```

Expected status:

```text
RUNNING
```

or:

```text
IDLE
```

depending on trail.

---

# Lab 81 — Database Firewall Monitoring Status

```text
avcli> LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

Verify:

```text
DBFW1

Monitoring_Host_Monitor

LAB_D4_DETECTIVE
```

---

# Lab 82 — Retention Policy

```text
avcli> SHOW RETENTION POLICY
FOR TARGET PDB1_26AI;
```

Expected:

```text
LAB_3M_ONLINE
```

if Day 2's configuration remains active.

---

# Lab 83 — Review Jobs

Console:

```text
Settings
   ↓
Jobs
```

Review recent:

```text
User Entitlement
Audit Policy Retrieval
Audit Policy Provisioning
Stored Procedure Auditing
Firewall Policy Deployment
```

One of the key operational skills in AVDF is distinguishing:

```text
configuration failure
```

from:

```text
collection failure
```

from:

```text
retrieval job failure
```

---

# PART W

# FINAL FORENSIC CAPSTONE

This is the final exercise of the entire five-day course.

No new feature is introduced.

The objective is to use all evidence sources already configured.

---

# 84. INCIDENT SCENARIO

Security Operations reports the following:

> An application account experienced repeated authentication failures. Shortly afterward the account successfully logged in, queried a table outside its normal application schema, extracted customer data, and attempted to modify customer information.

Participants do not initially know:

```text
how the account obtained new access
```

The task is to reconstruct the complete incident.

---

# Stage 1 — Authentication Investigation

---

# Lab 85 — Native Failed-Login Investigation

Database:

```bash
sqlplus / as sysdba
```

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Run:

```sql
SET LINES 250

COLUMN event_time FORMAT A19
COLUMN dbusername FORMAT A18
COLUMN userhost FORMAT A25
COLUMN client_program_name FORMAT A30

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       return_code,
       userhost,
       client_program_name
FROM   unified_audit_trail
WHERE  dbusername='AVDF_D2_READER'
AND    action_name='LOGON'
ORDER BY event_timestamp DESC
FETCH FIRST 20 ROWS ONLY;
```

Expected pattern:

```text
EVENT_TIME          DBUSERNAME        ACTION_NAME RETURN_CODE
------------------- ----------------- ----------- -----------
...                 AVDF_D2_READER    LOGON              1017
...                 AVDF_D2_READER    LOGON              1017
...                 AVDF_D2_READER    LOGON              1017
...                 AVDF_D2_READER    LOGON                 0
```

Interpret:

```text
1017
=
ORA-01017
```

---

# Lab 86 — AVDF Failed Login Report

AVDF:

```text
Reports
   ↓
Failed Login Events
```

Filter:

```text
User   = AVDF_D2_READER
Target = PDB1_26AI
```

Compare with native evidence.

---

# Stage 2 — Data Access Investigation

---

# Lab 87 — Find Native HR Access

```sql
SET LONG 2000

COLUMN event_time FORMAT A19
COLUMN sql_text FORMAT A100

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code,
       DBMS_LOB.SUBSTR(sql_text,100,1) sql_text
FROM   unified_audit_trail
WHERE  dbusername='AVDF_D2_READER'
AND    object_schema='HR'
ORDER BY event_timestamp DESC;
```

If HR access is covered by your enabled audit configuration, expected:

```text
AVDF_D2_READER
SELECT
HR
EMPLOYEES
```

If a specific SELECT audit policy was not enabled for HR.EMPLOYEES, Database Firewall evidence still provides the network observation.

That distinction itself is important:

```text
absence from one evidence source
does not mean
the activity did not happen
```

---

# Lab 88 — Find Firewall HR Access

AVDF:

```text
Reports
   ↓
Database Firewall Reports
   ↓
Monitored Activity
```

Filter:

```text
User = AVDF_D2_READER
```

Find command text containing:

```text
HR.EMPLOYEES
```

Example:

```sql
SELECT employee_id,
       first_name,
       last_name,
       salary
FROM hr.employees
WHERE department_id=90
```

---

# Stage 3 — Sensitive Customer Data Investigation

---

# Lab 89 — Find Full-Table Read

AVDF:

```text
All Activity
```

Filter:

```text
User   = AVDF_D2_READER
Object = CUSTOMER_SECURE
```

Look for:

```sql
SELECT *
FROM AVDF_D2_APP.CUSTOMER_SECURE
```

Check:

```text
Row Count = 5
```

and:

```text
Policy = LAB_D4_DETECTIVE
```

---

# Lab 90 — Find Large Result Alert

Navigate:

```text
Alerts
```

Filter:

```text
LAB_D4_LARGE_RESULT
```

Expected:

```text
User      : AVDF_D2_READER
Target    : PDB1_26AI
Row Count : 5
Severity  : Critical
```

---

# Stage 4 — Modification Investigation

---

# Lab 91 — Find UPDATE

Native:

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code,
       DBMS_LOB.SUBSTR(sql_text,100,1) sql_text
FROM   unified_audit_trail
WHERE  dbusername='AVDF_D2_READER'
AND    object_name='CUSTOMER_SECURE'
AND    action_name='UPDATE'
ORDER BY event_timestamp DESC;
```

Expected SQL similar to:

```text
UPDATE avdf_d2_app.customer_secure
SET credit_limit=credit_limit+1000000
WHERE customer_id=1
```

Even though:

```text
ROLLBACK
```

was eventually issued, the attempted SQL operation is still part of the evidence.

---

# Stage 5 — Root-Cause Question

At this point we know:

```text
AVDF_D2_READER accessed HR.EMPLOYEES
```

But the key question is:

```text
HOW?
```

---

# Lab 92 — Check Current Object Privilege

```sql
SELECT grantee,
       owner,
       table_name,
       privilege
FROM   dba_tab_privs
WHERE  grantee='AVDF_D2_READER'
AND    owner='HR';
```

Expected:

```text
GRANTEE           OWNER TABLE_NAME PRIVILEGE
----------------- ----- ---------- ---------
AVDF_D2_READER    HR    EMPLOYEES  SELECT
```

---

# Lab 93 — Find Who Granted It

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       target_user,
       object_privileges
FROM   unified_audit_trail
WHERE  action_name='GRANT'
AND    object_schema='HR'
AND    object_name='EMPLOYEES'
ORDER BY event_timestamp DESC;
```

Expected:

```text
DBUSERNAME : SYS
TARGET_USER: AVDF_D2_READER
ACTION     : GRANT
OBJECT     : HR.EMPLOYEES
PRIVILEGE  : SELECT
```

This gives:

```text
native forensic evidence
```

of the privilege change.

---

# Lab 94 — Confirm Entitlement Drift

AVDF:

```text
Reports
   ↓
Entitlement Reports
```

Compare:

```text
D5_BASELINE
```

with:

```text
D5_AFTER_ESCALATION
```

Find:

```text
New role:
AVDF_D5_POWER_ROLE

New object privilege:
SELECT ON HR.EMPLOYEES
```

Now we have a causal sequence.

---

# PART X

# BUILD FINAL INCIDENT TIMELINE

Participants must construct a timeline similar to:

```text
15:00:00
Entitlement baseline exists

15:15:03
AVDF_D5_POWER_ROLE granted

15:15:20
SELECT ON HR.EMPLOYEES granted

15:30:10
Failed LOGON AVDF_D2_READER

15:30:13
Failed LOGON AVDF_D2_READER

15:30:16
Failed LOGON AVDF_D2_READER

15:31:01
Successful LOGON

15:31:20
SELECT HR.EMPLOYEES

15:31:45
SELECT * CUSTOMER_SECURE

15:31:45
Row Count = 5

15:31:46
LAB_D4_LARGE_RESULT alert

15:32:15
UPDATE CUSTOMER_SECURE

15:40:00
New entitlement snapshot retrieved
```

Actual timestamps will come from your lab.

---

# PART Y

# CORRELATE ALL EVIDENCE SOURCES

The participant should produce a matrix like this:

| Question                              | Evidence Source                   |
| ------------------------------------- | --------------------------------- |
| Who logged in?                        | Unified Audit / AVDF              |
| Was login successful?                 | Unified Audit                     |
| Were there failed attempts?           | Failed Login Report / Alert       |
| What SQL was issued?                  | Database Firewall / Unified Audit |
| Which object was accessed?            | Both                              |
| How many rows returned?               | Database Firewall                 |
| Which firewall policy matched?        | Database Firewall                 |
| What privileges did the user possess? | Entitlement Snapshot              |
| Did privileges change?                | Entitlement Comparison            |
| Who granted object access?            | Unified Audit GRANT record        |
| Was application data changed?         | Unified Audit + Firewall          |
| Did stored code change?               | Stored Procedure Changes report   |

---

# PART Z

# INCIDENT FINDING

The participant should be able to conclude something similar to:

```text
Account:
AVDF_D2_READER

Authentication anomaly:
Multiple failed authentication attempts

Successful access:
Yes

Unexpected access:
HR.EMPLOYEES

Sensitive application access:
CUSTOMER_SECURE

Data extraction:
Full-table SELECT observed

Modification:
UPDATE CUSTOMER_SECURE attempted

Entitlement drift:
Yes

New object privilege:
SELECT ON HR.EMPLOYEES

New role:
AVDF_D5_POWER_ROLE

Granting account:
SYS

Database Firewall evidence:
Present

Unified Audit evidence:
Present

AVDF alert evidence:
Present

Entitlement comparison:
Present
```

---

# PART AA

# WHY ENTITLEMENT AUDITING MATTERS

Without entitlement auditing we know:

```text
AVDF_D2_READER
accessed HR.EMPLOYEES
```

With entitlement auditing we can answer:

```text
WHY
could AVDF_D2_READER access HR.EMPLOYEES?
```

The answer is:

```text
because its privileges changed
```

Thus:

```text
Activity Evidence
        +
Entitlement Evidence
        =
Much Stronger Investigation
```

Oracle specifically describes entitlement comparison as useful for detecting drift from an approved access baseline and identifying privilege escalation.

---

# PART AB

# COMPLIANCE REPORT REVIEW

After entitlement retrieval:

Navigate:

```text
Reports
   ↓
Compliance Reports
```

Select the compliance category used earlier.

Example:

```text
PCI-DSS
```

or:

```text
Data Privacy
```

Select:

```text
PDB1_26AI
```

Review available reports.

Compliance reporting in AVDF is tied to compliance target groups and, for some reports, available entitlement data.

---

# PART AC

# OPTIONAL — STIG AUDIT POLICY

Because the database is Oracle 26ai, AVDF modern releases can provision the STIG unified-audit configuration for Oracle Database 21 and later.

This is optional because it expands audit volume.

Check current policies first:

```text
avcli> LIST UNIFIED AUDIT ORACLE PREDEFINED POLICIES
FOR TARGET PDB1_26AI;
```

AVDF's STIG configuration can enable Oracle policies including:

```text
ORA_STIG_RECOMMENDATIONS
ORA_LOGON_LOGOFF
ORA_ALL_TOPLEVEL_ACTIONS
```

and can use retrieved entitlement information to identify privileged users.

Do not enable this merely as an experiment if you want to preserve your existing audit-policy configuration.

---

# PART AD

# RESTORE ENTITLEMENT TO BASELINE

After the forensic exercise, remove the intentionally added privileges.

---

# Lab 95 — Revoke HR Access

SYS:

```sql
REVOKE SELECT
ON hr.employees
FROM avdf_d2_reader;
```

Expected:

```text
Revoke succeeded.
```

Because `AVDF_D5_HR_GRANTS` audits GRANT on this object, the corresponding REVOKE is also audited.

---

# Lab 96 — Revoke Power Role

```sql
REVOKE avdf_d5_power_role
FROM avdf_d2_reader;
```

Expected:

```text
Revoke succeeded.
```

---

# Lab 97 — Drop Training Role

```sql
DROP ROLE avdf_d5_power_role;
```

Expected:

```text
Role dropped.
```

---

# Lab 98 — Verify HR Access Removed

```sql
SELECT grantee,
       owner,
       table_name,
       privilege
FROM   dba_tab_privs
WHERE  grantee='AVDF_D2_READER'
AND    owner='HR';
```

Expected:

```text
no rows selected
```

---

# Lab 99 — Verify Role Removed

```sql
SELECT grantee,
       granted_role
FROM   dba_role_privs
WHERE  grantee='AVDF_D2_READER'
AND    granted_role='AVDF_D5_POWER_ROLE';
```

Expected:

```text
no rows selected
```

---

# Lab 100 — Verify REVOKE Audit Record

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       target_user,
       object_privileges
FROM   unified_audit_trail
WHERE  action_name IN ('GRANT','REVOKE')
AND    object_schema='HR'
AND    object_name='EMPLOYEES'
ORDER BY event_timestamp;
```

Expected sequence:

```text
GRANT
...
REVOKE
```

---

# PART AE

# OPTIONAL FINAL ENTITLEMENT SNAPSHOT

For completeness, retrieve entitlement one more time:

```text
avcli> RETRIEVE USER ENTITLEMENT FROM TARGET PDB1_26AI;
```

Create label:

```text
D5_RESTORED
```

Now compare:

```text
D5_BASELINE
```

against:

```text
D5_RESTORED
```

Ideally the intentionally introduced privilege differences should have disappeared.

This demonstrates:

```text
baseline
   ↓
drift
   ↓
detection
   ↓
remediation
   ↓
verification
```

---

# PART AF

# FINAL OPERATIONAL CHECK

AVCLI:

```text
avcli> LIST SECURED TARGET;
```

Expected:

```text
PDB1_26AI
```

---

Check trails:

```text
avcli> LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

Expected:

```text
TABLE
UNIFIED_AUDIT_TRAIL

NETWORK
```

---

Check firewall:

```text
avcli> LIST FIREWALL;
```

Expected:

```text
DBFW1
```

---

Check monitoring point:

```text
avcli> LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

Expected:

```text
Running
LAB_D4_DETECTIVE
```

---

Check retention:

```text
avcli> SHOW RETENTION POLICY
FOR TARGET PDB1_26AI;
```

Expected:

```text
LAB_3M_ONLINE
```

---

Check alerts:

```text
avcli> LIST ALERT POLICIES;
```

Expected includes:

```text
LAB_FAILED_LOGIN
LAB_D4_LARGE_RESULT
```

---

# PART AG

# FINAL DATABASE CHECK

```bash
sqlplus / as sysdba
```

```sql
ALTER SESSION SET CONTAINER=PDB1;

SET LINES 200

SELECT username,
       account_status
FROM   dba_users
WHERE  username IN
       ('AVDFCOLLECT',
        'AVDF_D2_APP',
        'AVDF_D2_READER')
ORDER BY username;
```

Expected:

```text
AVDFCOLLECT          OPEN
AVDF_D2_APP          OPEN
AVDF_D2_READER       OPEN
```

---

# PART AH

# FINAL AUDIT POLICY CHECK

```sql
SELECT policy_name,
       entity_name,
       success,
       failure
FROM   audit_unified_enabled_policies
WHERE  policy_name LIKE 'AVDF%'
ORDER BY policy_name,
         entity_name;
```

Possible output includes:

```text
AVDF_DAY1_HR_ACCESS
AVDF_DAY1_LOGIN
AVDF_D2_SCHEMA_CHANGES
AVDF_D2_SENSITIVE_ACCESS
AVDF_D5_HR_GRANTS
```

depending on which previous policies remain enabled.

---

# PART AI

# OPTIONAL CLEANUP

Do not perform this if you want to keep the VM as a demonstration environment.

Disable Day 5 policy:

```sql
NOAUDIT POLICY avdf_d5_hr_grants;
```

Drop:

```sql
DROP AUDIT POLICY avdf_d5_hr_grants;
```

Expected:

```text
Noaudit succeeded.

Audit policy dropped.
```

---

Procedure cleanup:

```sql
DROP PROCEDURE avdf_d2_app.get_customer_count;
```

Expected:

```text
Procedure dropped.
```

Do not drop:

```text
AVDFCOLLECT
```

unless the entire AVDF target will also be decommissioned.

---

# PART AJ

# FIVE-DAY TRAINING ARCHITECTURE

At completion of the course:

```text
                        USER / APPLICATION
                               │
                               │ SQL
                               ▼
                     ORACLE AI DATABASE 26ai
              ┌────────────────┴─────────────────┐
              │                                  │
              ▼                                  ▼
       UNIFIED AUDITING                    NETWORK SQL
              │                                  │
              ▼                                  ▼
   UNIFIED_AUDIT_TRAIL                     HOST MONITOR
              │                                  │
              │                                  ▼
              │                         DATABASE FIREWALL
              │                                  │
              │                           FIREWALL POLICY
              │                                  │
              └─────────────────┬────────────────┘
                                ▼
                       AUDIT VAULT SERVER
                                │
         ┌──────────────┬───────┼────────┬─────────────┐
         ▼              ▼       ▼        ▼             ▼
      REPORTS         ALERTS  POLICIES ENTITLEMENTS COMPLIANCE
         │              │       │        │             │
         └──────────────┴───────┼────────┴─────────────┘
                                ▼
                           CORRELATION
                                │
                                ▼
                          INVESTIGATION
                                │
                                ▼
                             EVIDENCE
```

---

# PART AK

# WHAT EACH LAYER ANSWERS

## Unified Auditing

Answers:

```text
Who executed the activity?

What database action occurred?

Which object was involved?

Was it successful?

What SQL was recorded?
```

---

## Database Firewall

Answers:

```text
What SQL crossed the network?

Where did it originate?

Which application/user sent it?

Did SQL match expected behavior?

Which policy matched?

How many rows were returned?

Was the SQL considered suspicious?
```

---

## Entitlement Auditing

Answers:

```text
What access did the user have?

What roles did the user have?

Which object privileges existed?

Did privileges change?

When did access drift from baseline?
```

---

## Alerts

Answers:

```text
Which events require immediate attention?

How severe are they?

Has a threshold been exceeded?
```

---

## Reports

Answers:

```text
How can evidence be presented,
filtered,
scheduled,
reviewed,
and retained?
```

---

# PART AL

# FINAL COURSE DETECTIVE MODEL

The complete training now follows:

```text
                 ACTIVITY
                    │
                    ▼
                 OBSERVE
                    │
             ┌──────┴──────┐
             ▼             ▼
           AUDIT         MONITOR
             │             │
             └──────┬──────┘
                    ▼
                  DETECT
                    │
                    ▼
                  ALERT
                    │
                    ▼
                CORRELATE
                    │
                    ▼
               INVESTIGATE
                    │
                    ▼
                 REPORT
                    │
                    ▼
               COMPLIANCE
```

Not:

```text
DETECT
  ↓
BLOCK
  ↓
PREVENT
```

Blocking capability exists in Database Firewall, but it was deliberately not made the primary learning objective because this course remains:

```text
ORACLE DATABASE SECURITY:
DETECTIVE CONTROLS
```

---

# PART AM

# FINAL DAY 5 REVIEW QUESTIONS

## Question 1

Apa fungsi entitlement snapshot?

Answer:

```text
captures user/role/privilege state
at a specific point in time
```

---

## Question 2

Mengapa dua snapshot dibandingkan?

Answer:

Untuk menemukan:

```text
privilege drift
role changes
object access changes
privilege escalation
```

---

## Question 3

Apa perbedaan Entitlement Activity Report dan Entitlement Snapshot?

Answer:

```text
Entitlement Activity
=
observed GRANT/REVOKE type activity
```

whereas:

```text
Entitlement Snapshot
=
state of users/roles/privileges
at a particular point in time
```

---

## Question 4

Apa keuntungan Database Firewall evidence?

Answer:

Ia memberikan independent observation terhadap:

```text
SQL network activity
```

dan dapat menangkap context seperti:

```text
client
SQL pattern
firewall policy
row count
```

---

## Question 5

Apa keuntungan Unified Audit evidence?

Answer:

Ia adalah:

```text
database-native evidence
```

yang mengetahui database action dan internal execution context.

---

## Question 6

Mengapa entitlement report sangat penting?

Answer:

Karena aktivitas saja menjawab:

```text
WHAT happened?
```

sedangkan entitlement dapat membantu menjawab:

```text
WHY was the user allowed to do it?
```

---

## Question 7

Apa fungsi target group?

Answer:

Mengorganisasi target dan mempermudah:

```text
auditor access management
reporting organization
compliance grouping
```

---

## Question 8

Apa fungsi compliance group?

Answer:

Menghubungkan target dengan:

```text
preconfigured compliance reporting category
```

---

## Question 9

Apa fungsi Stored Procedure Auditing?

Answer:

Mendeteksi lifecycle perubahan:

```text
CREATE
MODIFY
DELETE
```

terhadap stored procedures.

---

## Question 10

Apakah Audit Vault menggantikan Unified Auditing?

Answer:

```text
NO
```

Oracle Database:

```text
creates native audit evidence
```

Audit Vault:

```text
collects
centralizes
correlates
reports
alerts
retains
```

that evidence.

---

# PART AN

# FINAL COURSE OUTCOME

At the end of Day 5, a participant should be able to answer a real database security investigation such as:

```text
WHO accessed the database?

WHEN did access happen?

WHERE did the session originate?

WAS authentication successful?

WHAT SQL was executed?

WHICH objects were accessed?

HOW MUCH data was returned?

WAS the SQL normal application behavior?

WHICH Database Firewall policy matched?

WHAT privileges did the user possess?

DID those privileges recently change?

WHO granted the new privilege?

WHAT happened before and after the event?

WHICH alerts were generated?

WHAT evidence supports the conclusion?
```

This represents the complete Oracle AVDF detective-control lifecycle:

```text
AUDIT
  ↓
COLLECT
  ↓
CENTRALIZE
  ↓
MONITOR
  ↓
BASELINE
  ↓
DETECT
  ↓
ALERT
  ↓
CORRELATE
  ↓
INVESTIGATE
  ↓
REPORT
  ↓
COMPLIANCE
```

---

# FINAL 5-DAY SUMMARY

| Day       | Main Hands-on Focus                                                      |
| --------- | ------------------------------------------------------------------------ |
| **Day 1** | AVDF architecture, secured target preparation, Unified Audit collection  |
| **Day 2** | Audit Vault operations, centralized audit policies, retention, alerts    |
| **Day 3** | Database Firewall, Host Monitor, monitoring point, network evidence      |
| **Day 4** | SQL baseline, firewall policies, profiles, sensitive-object monitoring   |
| **Day 5** | Reports, entitlements, compliance, stored procedures, full investigation |

This progression preserves the intent of the original Oracle course:

```text
DATABASE SECURITY
      ↓
DETECTIVE CONTROLS
```

while adapting the hands-on environment to:

```text
Oracle AI Database 26ai
+
Oracle AVDF 20.x
```
