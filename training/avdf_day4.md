# DAY 4 HANDS-ON LAB

# Oracle Database Firewall Policies, SQL Baseline, Profiles, Sensitive Data Monitoring, Alerts & Investigation

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

Existing AVDF components from previous days:

```text
Secured Target       : PDB1_26AI
Database Firewall    : DBFW1
Deployment Mode      : Monitoring (Host Monitor)

Database Address     : 192.168.56.26
Listener Port        : 1521
Service              : PDB1

Audit Vault Agent    : RUNNING
Host Monitor         : RUNNING

TABLE Trail
  UNIFIED_AUDIT_TRAIL

NETWORK Trail
  Database Firewall / Host Monitor
```

Application accounts:

```text
AVDF_D2_APP
AVDF_D2_READER
```

Sensitive table:

```text
AVDF_D2_APP.CUSTOMER_SECURE
```

---

# 2. DAY 4 PRIMARY OBJECTIVE

Day 3 menjawab:

```text
Can Database Firewall see SQL traffic?
```

Day 4 menjawab:

```text
Which SQL should be interesting?

Which users should be watched?

Which objects are sensitive?

Which SQL is normal?

Which SQL is abnormal?

When should an alert be generated?
```

Workflow hari ini:

```text
SQL TRAFFIC
     │
     ▼
DATABASE FIREWALL
     │
     ▼
POLICY
     │
     ├── Session Context
     ├── SQL Statement
     ├── Database Object
     └── Default
             │
             ▼
       PASS / LOG / ALERT
             │
             ▼
       AUDIT VAULT SERVER
             │
       ┌─────┴─────┐
       ▼           ▼
    REPORT       ALERT
       │           │
       └─────┬─────┘
             ▼
       INVESTIGATION
```

Oracle AVDF user-defined Database Firewall policies mempunyai rule types seperti Session Context, SQL Statement, Database Object, Login/Logout, Unknown Traffic, dan Default. SQL Statement rules dapat menggunakan SQL clusters, sedangkan Database Object rules dapat mengawasi SQL berdasarkan operasi dan tabel/view yang diakses.

---

# 3. DAY 4 LEARNING OBJECTIVES

Pada akhir Day 4 peserta mampu:

1. Memahami lifecycle Database Firewall policy.
2. Memahami predefined dan user-defined policies.
3. Menggunakan predefined `Log all` policy untuk learning.
4. Menghasilkan representative SQL workload.
5. Memahami konsep SQL cluster.
6. Membuat SQL cluster set.
7. Membuat Database User Set.
8. Membuat Database Object Set.
9. Membuat Client Program Set.
10. Membuat Profile.
11. Memahami policy evaluation order.
12. Membuat Session Context rule.
13. Membuat SQL Statement rule.
14. Membuat Database Object rule.
15. Membuat Default rule.
16. Monitor access ke sensitive objects.
17. Monitor SQL dari application account.
18. Capture returned row count.
19. Detect potential data extraction.
20. Publish/save Database Firewall policy.
21. Deploy policy ke secured target.
22. Generate matching dan non-matching SQL.
23. Generate firewall alerts.
24. Investigate SQL melalui reports.
25. Correlate network evidence dengan Unified Audit.
26. Melakukan basic anomaly investigation.

---

# 4. RECOMMENDED DAY 4 SCHEDULE

| Waktu       | Materi                                |
| ----------- | ------------------------------------- |
| 09:00–09:30 | Day 3 Validation                      |
| 09:30–10:00 | Database Firewall Policy Architecture |
| 10:00–10:45 | Deploy temporary Log All policy       |
| 10:45–12:00 | Generate representative workload      |
| 13:00–13:45 | SQL Clusters, Sets and Profiles       |
| 13:45–14:45 | Build Detective Firewall Policy       |
| 14:45–15:15 | Deploy custom policy                  |
| 15:15–16:00 | Sensitive-object & anomaly testing    |
| 16:00–16:30 | Row-count / exfiltration monitoring   |
| 16:30–17:00 | Alerts and incident investigation     |

---

# PART A

# VALIDATE DAY 3 ENVIRONMENT

---

# Lab 1 — Set Oracle Environment

Login:

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

Check PDB:

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

Exit:

```sql
EXIT
```

---

# Lab 3 — Verify Listener

```bash
lsnrctl status
```

Pastikan:

```text
PDB1
1521
READY
```

---

# Lab 4 — Verify Audit Vault Agent

```bash
cd /home/oracle/avdf_agent/bin
./agentctl status
```

Expected:

```text
RUNNING
```

---

# Lab 5 — Verify Firewall

Pada AVDF:

```text
avcli> LIST FIREWALL;
```

Expected terdapat:

```text
DBFW1
```

Check:

```text
avcli> SHOW STATUS FOR FIREWALL DBFW1;
```

Expected:

```text
Status : RUNNING
```

---

# Lab 6 — Verify Monitoring Point

```text
avcli> LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

Expected secara konsep:

```text
Target     : PDB1_26AI
Firewall   : DBFW1
Mode       : Monitoring_Host_Monitor
Address    : 192.168.56.26:1521:PDB1
Status     : Running
```

---

# Lab 7 — Verify Trails

```text
avcli> LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

Expected terdapat:

```text
TABLE
UNIFIED_AUDIT_TRAIL

NETWORK
```

---

# PART B

# DATABASE FIREWALL POLICY ARCHITECTURE

Oracle Database Firewall adalah multistage policy engine.

Evaluation secara umum:

```text
SQL TRAFFIC
    │
    ▼
SESSION CONTEXT
    │
    ▼
SQL STATEMENT
    │
    ▼
DATABASE OBJECT
    │
    ▼
DEFAULT
```

Jika rule sudah match:

```text
MATCH
  ↓
ACTION
  ↓
evaluation stops
```

Secara default, Session Context dievaluasi terlebih dahulu, disusul SQL Statement, Database Object, dan terakhir Default rule. Pada AVDF modern evaluation order tertentu juga dapat diubah melalui console.

---

# Lab 8 — Understand Session Context

Session context melihat:

```text
Client IP
Database User
OS User
Client Program
```

Contoh:

```text
Database User = AVDF_D2_READER
Client Program = sqlplus
```

Database Firewall dapat memberikan policy khusus berdasarkan actor tersebut.

---

# Lab 9 — Understand SQL Statement Rules

Database Firewall mengelompokkan SQL yang serupa ke dalam:

```text
SQL Cluster
```

Contoh:

```sql
SELECT customer_name
FROM customer_secure
WHERE customer_id = 1;
```

dan:

```sql
SELECT customer_name
FROM customer_secure
WHERE customer_id = 2;
```

dapat dikenali sebagai pattern SQL yang sama/serupa.

Concept:

```text
SQL statements
      ↓
SQL grammar analysis
      ↓
SQL clusters
      ↓
SQL cluster set
      ↓
policy rule
```

Oracle menjelaskan bahwa SQL Statement rule dapat menggunakan cluster set untuk membangun allow-list atau deny-list style policies.

---

# Lab 10 — Understand Database Object Rules

Database Object Rule digunakan untuk memonitor:

```text
which user
+
which operation
+
which table/view
```

Contoh:

```text
User
AVDF_D2_READER

Operation
SELECT

Object
CUSTOMER_SECURE

Action
ALERT
```

Database Object rules memang ditujukan untuk monitoring atau enforcement terhadap operasi pada specific tables/views dan merupakan mekanisme penting untuk sensitive-data monitoring.

---

# PART C

# PREDEFINED DATABASE FIREWALL POLICIES

AVDF menyediakan beberapa predefined policy.

Contohnya:

```text
Default
Log all
Log all - no mask
Log sample
```

`Default` secara umum mencatat login/logout dan DDL/DCL tertentu tetapi melewatkan sebagian besar traffic lain tanpa logging. `Log all` mencatat seluruh SQL dan cocok untuk periode learning tetapi dapat menghasilkan volume repository yang besar.

---

# Lab 11 — Inspect Current Policy

Audit Vault Server:

```text
Targets
   ↓
PDB1_26AI
   ↓
Database Firewall Monitoring
```

Cari field:

```text
Database Firewall Policy
```

Catat policy aktif saat ini.

Kemungkinan:

```text
Default
```

---

# Lab 12 — Inspect Predefined Policies

Login sebagai Auditor.

Navigate:

```text
Policies
   ↓
Database Firewall Policies
   ↓
Pre-defined Database Firewall Policies
```

Cari:

```text
Default
Log all
Log all - no mask
Log sample
```

---

# PART D

# TEMPORARILY DEPLOY LOG ALL POLICY

Tujuan:

```text
collect representative SQL
       ↓
allow Database Firewall to analyze SQL
       ↓
create clusters
       ↓
use clusters for policy development
```

`Log all` hanya digunakan sementara karena semua statement akan dikirim ke Audit Vault repository.

---

# Lab 13 — Deploy Log All

Audit Vault Server:

```text
Policies
   ↓
Database Firewall Policies
   ↓
Pre-defined Database Firewall Policies
```

Select:

```text
Log all
```

Click:

```text
Deploy
```

Select target:

```text
PDB1_26AI
```

Click:

```text
Deploy
```

Oracle AVDF 20.8+ memungkinkan policy deployment langsung dari Policies tab ke target.

---

# Lab 14 — Verify Policy Deployment

Navigate:

```text
Targets
   ↓
PDB1_26AI
   ↓
Database Firewall Monitoring
```

Expected:

```text
Database Firewall Policy
------------------------
Log all
```

---

# Lab 15 — Record Baseline Time

Database:

```bash
sqlplus system/oracle@//192.168.56.26:1521/PDB1
```

Run:

```sql
SELECT TO_CHAR(SYSTIMESTAMP,
               'YYYY-MM-DD HH24:MI:SS TZH:TZM')
       baseline_start
FROM dual;
```

Example:

```text
BASELINE_START
-----------------------------
2026-09-13 10:15:22 +07:00
```

Record this timestamp.

Exit:

```sql
EXIT
```

---

# PART E

# GENERATE REPRESENTATIVE NORMAL WORKLOAD

Kita sekarang melakukan training / learning workload.

Normal behavior untuk:

```text
AVDF_D2_READER
```

akan dianggap:

```text
SELECT customer
SELECT customer by ID
SELECT active customers
SELECT customer credit limit
```

---

# Lab 16 — Login Application Reader

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

Expected:

```text
Connected to:
Oracle AI Database 26ai Enterprise Edition
```

---

# Lab 17 — Normal Query 1

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

# Lab 18 — Normal Query 2

```sql
SET LINES 180

COLUMN customer_name FORMAT A20
COLUMN city FORMAT A15
COLUMN account_status FORMAT A15

SELECT customer_id,
       customer_name,
       city,
       account_status
FROM   avdf_d2_app.customer_secure
ORDER  BY customer_id;
```

Expected:

```text
CUSTOMER_ID CUSTOMER_NAME        CITY            ACCOUNT_STATUS
----------- -------------------- --------------- ---------------
1           Budi Santoso         Jakarta         ACTIVE
2           Siti Aminah          Bandung         ACTIVE
3           Andi Wijaya          Surabaya        ACTIVE
4           Rina Putri           Depok           ACTIVE
5           Dewi Lestari         Bogor           SUSPENDED
```

---

# Lab 19 — Normal Parameterized Pattern

Run:

```sql
SELECT customer_name,
       credit_limit
FROM   avdf_d2_app.customer_secure
WHERE  customer_id = 1;
```

Then:

```sql
SELECT customer_name,
       credit_limit
FROM   avdf_d2_app.customer_secure
WHERE  customer_id = 2;
```

Then:

```sql
SELECT customer_name,
       credit_limit
FROM   avdf_d2_app.customer_secure
WHERE  customer_id = 3;
```

Expected data differs, tetapi struktur SQL sama.

Concept:

```text
3 SQL executions
      ↓
similar SQL structure
      ↓
likely same SQL cluster
```

---

# Lab 20 — Normal Status Query

```sql
SELECT customer_id,
       customer_name
FROM   avdf_d2_app.customer_secure
WHERE  account_status='ACTIVE';
```

Expected:

```text
CUSTOMER_ID CUSTOMER_NAME
----------- --------------------
1           Budi Santoso
2           Siti Aminah
3           Andi Wijaya
4           Rina Putri
```

---

# Lab 21 — Repeat Normal Workload

Run:

```sql
SELECT COUNT(*)
FROM avdf_d2_app.customer_secure;

SELECT customer_id,
       customer_name
FROM avdf_d2_app.customer_secure
WHERE account_status='ACTIVE';

SELECT customer_name,
       credit_limit
FROM avdf_d2_app.customer_secure
WHERE customer_id=4;
```

Exit:

```sql
EXIT
```

---

# PART F

# GENERATE HR NORMAL WORKLOAD

```bash
sqlplus hr/oracle@//192.168.56.26:1521/PDB1
```

Run:

```sql
SELECT COUNT(*)
FROM employees;
```

Expected:

```text
COUNT(*)
----------
107
```

Run:

```sql
SELECT employee_id,
       first_name,
       last_name
FROM employees
WHERE department_id=90;
```

Run:

```sql
SELECT department_id,
       COUNT(*)
FROM employees
GROUP BY department_id
ORDER BY department_id;
```

Exit.

---

# PART G

# VERIFY LOGGED SQL IN AVDF

Navigate:

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
```

Filter timestamp:

```text
>= baseline_start
```

Expected users:

```text
AVDF_D2_READER
HR
```

Expected SQL:

```text
SELECT CUSTOMER_SECURE
SELECT EMPLOYEES
```

---

# Lab 22 — Inspect Database Firewall Event

Select one `AVDF_D2_READER` event.

Inspect fields such as:

```text
Target
Database User
Client Program
Client IP
Event Time
Command
Object
SQL Text
Policy
Monitoring Point
Network Connection
Threat Severity
```

Network events generated by Database Firewall can be identified separately from audit-trail events, and AVDF repository records include a monitoring-point reference for firewall-originated events.

---

# PART H

# CREATE CUSTOM DETECTIVE POLICY

Policy name:

```text
LAB_D4_DETECTIVE
```

Purpose:

```text
Monitor application user
Monitor sensitive table
Recognize normal SQL
Alert on unexpected SQL
Capture row counts
```

---

# Lab 23 — Create Policy

Audit Vault Server:

```text
Policies
   ↓
Database Firewall Policies
   ↓
Create
```

Set:

```text
Target Type:
Oracle Database

Policy Name:
LAB_D4_DETECTIVE

Description:
Day 4 detective monitoring policy for PDB1
```

Click:

```text
Save
```

For AVDF 20.10+, the current documentation specifies `Save`; policy publishing behavior differs slightly by AVDF 20.x release, so follow the button offered by the installed release (`Save` or `Save and Publish`).

---

# PART I

# CREATE DATABASE USER SET

We want to identify:

```text
AVDF_D2_READER
```

---

# Lab 24 — Open Sets / Profiles

Inside policy:

```text
LAB_D4_DETECTIVE
```

Click:

```text
Sets/Profiles
```

Open:

```text
Database User Sets
```

Click:

```text
Add
```

---

# Lab 25 — Create User Set

Name:

```text
D4_APP_READERS
```

Description:

```text
Application reader accounts monitored by Day 4 policy
```

Values:

```text
AVDF_D2_READER
```

Save.

Expected:

```text
D4_APP_READERS
```

appears in the Database User Sets list.

Oracle AVDF supports sets for database users, IP addresses, OS users, client programs, database objects, and SQL clusters.

---

# PART J

# CREATE DATABASE OBJECT SET

Sensitive object:

```text
CUSTOMER_SECURE
```

---

# Lab 26 — Create Object Set

Navigate:

```text
Sets/Profiles
   ↓
Database Object Sets
   ↓
Add
```

Name:

```text
D4_SENSITIVE_OBJECTS
```

Description:

```text
Sensitive application objects
```

Enter:

```text
CUSTOMER_SECURE
```

Save.

Expected:

```text
D4_SENSITIVE_OBJECTS
```

---

# Important Note

Database Firewall Database Object matching evaluates the table name itself; Oracle documentation notes that schema-qualified and unqualified references can be evaluated against the configured table name.

Therefore:

```text
AVDF_D2_APP.CUSTOMER_SECURE
```

can be represented in the set as:

```text
CUSTOMER_SECURE
```

---

# PART K

# CREATE CLIENT PROGRAM SET

Optional but useful.

---

# Lab 27 — Find Client Program

From AVDF report, inspect an event generated from SQL*Plus.

Likely:

```text
sqlplus
```

or similar client-program representation.

Use the **exact value shown in your AVDF report**.

---

# Lab 28 — Create Client Program Set

Navigate:

```text
Sets/Profiles
   ↓
Client Program Sets
   ↓
Add
```

Name:

```text
D4_SQLPLUS_CLIENT
```

Value:

```text
sqlplus
```

If AVDF displays another exact string, use that string.

Save.

Client program and OS user values originate from client context, so Oracle cautions that they may not be equally trustworthy in every environment.

---

# PART L

# CREATE PROFILE

A Profile combines sets.

We create:

```text
D4_READER_PROFILE
```

containing:

```text
DB User Set
=
D4_APP_READERS
```

Optionally:

```text
Client Program Set
=
D4_SQLPLUS_CLIENT
```

---

# Lab 29 — Create Profile

Navigate:

```text
Sets/Profiles
   ↓
Profiles
   ↓
Add
```

Set:

```text
Name:
D4_READER_PROFILE

Description:
Application reader profile
```

DB User Set:

```text
D4_APP_READERS
```

For a simpler lab, leave:

```text
IP Address Set     = -
OS User Set        = -
Client Program Set = -
```

Save.

Expected:

```text
D4_READER_PROFILE
```

Oracle requires at least one set to exist before a profile can be created.

---

# PART M

# CREATE SQL CLUSTER SET

Database Firewall has already captured normal SQL under `Log all`.

Now we build:

```text
D4_NORMAL_SQL
```

---

# Lab 30 — Open SQL Cluster Sets

Navigate:

```text
LAB_D4_DETECTIVE
   ↓
Sets/Profiles
   ↓
SQL Cluster Sets
   ↓
Add
```

---

# Lab 31 — Filter SQL Clusters

Set:

```text
Target:
PDB1_26AI
```

Use filtering options to show clusters from:

```text
AVDF_D2_READER
```

Click:

```text
Go
```

AVDF displays SQL clusters collected from network traffic. SQL clusters represent groups of similar SQL, and the console allows selecting clusters based on collected target data.

---

# Lab 32 — Inspect Sample SQL

Locate cluster containing statements similar to:

```sql
SELECT customer_name,
       credit_limit
FROM avdf_d2_app.customer_secure
WHERE customer_id = ...
```

Also locate:

```sql
SELECT COUNT(*)
FROM avdf_d2_app.customer_secure
```

and:

```sql
SELECT customer_id,
       customer_name
FROM avdf_d2_app.customer_secure
WHERE account_status = ...
```

---

# Lab 33 — Build Cluster Set

Select the normal application SQL clusters.

Name:

```text
D4_NORMAL_SQL
```

Description:

```text
Known normal SQL for AVDF_D2_READER
```

Save.

Expected:

```text
D4_NORMAL_SQL
```

---

# PART N

# BUILD SQL STATEMENT RULE

We now tell Database Firewall:

> SQL that matches our known workload from the expected application user is considered normal.

---

# Lab 34 — Add SQL Statement Rule

Navigate:

```text
LAB_D4_DETECTIVE
   ↓
SQL Statement
   ↓
Add
```

Set:

```text
Rule Name:
KNOWN_APPLICATION_SQL

Description:
Known baseline SQL for application reader

Profile:
D4_READER_PROFILE

Cluster Set:
D4_NORMAL_SQL
```

---

# Lab 35 — Configure Rule Action

Set:

```text
Action:
Pass
```

Logging Level:

```text
Unique
```

or the equivalent option in your installed AVDF release that logs a representative unique occurrence.

Threat Severity:

```text
Minimal
```

Save.

Oracle's policy model separates the **Action**, **Logging Level**, and **Threat Severity**. A `Pass` action permits the statement while logging can independently retain evidence for forensic use.

For learning/baseline policies, unique-style logging is useful because it limits repository volume while retaining representative activity.

---

# PART O

# CREATE SENSITIVE OBJECT RULE

Now:

```text
Any SELECT / UPDATE
against
CUSTOMER_SECURE
by
D4_READER_PROFILE
```

should be highly visible.

---

# Lab 36 — Create Database Object Rule

Navigate:

```text
LAB_D4_DETECTIVE
   ↓
Database Objects
   ↓
Add
```

Set:

```text
Rule Name:
MONITOR_SENSITIVE_CUSTOMER_DATA

Description:
Monitor reader access to CUSTOMER_SECURE

Profile:
D4_READER_PROFILE
```

---

# Lab 37 — Select Commands

Because our AVDF baseline is modern 20.18+, select specific commands:

```text
SELECT
UPDATE
```

AVDF 20.11+ uses specific command values rather than generic DML/DDL categories in various policy/reporting contexts.

---

# Lab 38 — Select Object Set

Set:

```text
DB Object Set:
D4_SENSITIVE_OBJECTS
```

Containing:

```text
CUSTOMER_SECURE
```

---

# Lab 39 — Enable Row Count Capture

Because `SELECT` is included:

```text
Capture number of rows returned for SELECT queries:
Yes
```

This is especially useful for detecting:

```text
unusually large query results
```

or possible:

```text
data exfiltration
```

Oracle supports returned-row-count capture for Oracle Database `SELECT` operations through Database Object rules, and it can be used in reports and alert policies.

Day 3 already enabled:

```text
Database Response Monitoring
```

which is required for returned-row-count capture with Host Monitor mode.

---

# Lab 40 — Configure Sensitive Object Action

Set:

```text
Action:
Alert
```

Logging Level:

```text
Always
```

If your release labels the option differently, choose the logging level whose meaning is:

```text
log every matching statement
```

Threat Severity:

```text
Major
```

Save.

Because the monitoring point is Host Monitor:

```text
Alert
```

is appropriate.

We do **not** use:

```text
Block
```

---

# PART P

# CONFIGURE DEFAULT RULE

The Default Rule handles statements which did not match earlier rules.

For a detective policy, this is an excellent anomaly detector.

Concept:

```text
Known SQL
   ↓
KNOWN_APPLICATION_SQL
   ↓
Pass


Unknown to our baseline
   ↓
Default Rule
   ↓
Alert
```

---

# Lab 41 — Open Default Rule

Navigate:

```text
LAB_D4_DETECTIVE
   ↓
Default
   ↓
Default Rule
```

Set:

```text
Action:
Alert

Logging:
Always

Threat Severity:
Moderate
```

Do NOT configure:

```text
Block
```

Save.

The Default Rule exists specifically for SQL that does not match Session Context, SQL Statement, or Database Object rules.

---

# PART Q

# CONFIGURE UNKNOWN TRAFFIC

Unknown Traffic is different from normal SQL which simply failed to match a policy rule.

Unknown traffic can mean that:

```text
SQL parser cannot recognize statement
invalid semantics
unsupported protocol
```

Oracle documents Unknown Traffic as a distinct Database Firewall policy configuration.

---

# Lab 42 — Configure Unknown Traffic

Inside:

```text
LAB_D4_DETECTIVE
```

click:

```text
Configuration
   ↓
Unknown Traffic
```

Set:

```text
Action:
Alert

Logging Level:
Always

Threat Severity:
Major
```

Save.

---

# PART R

# LOGIN / LOGOUT MONITORING

Database Firewall can also monitor database login/logout activity.

---

# Lab 43 — Open Login/Logout Policy

Navigate:

```text
LAB_D4_DETECTIVE
   ↓
Configuration
   ↓
Login / Logout
```

Configure successful login:

```text
Action:
Pass

Logging:
enabled

Threat Severity:
Minimal
```

Configure unsuccessful login:

```text
Action:
Alert

Logging:
enabled

Threat Severity:
Major
```

Because Day 3 enabled database response monitoring, the Database Firewall can correlate the connection with database response information.

---

# PART S

# REVIEW POLICY EVALUATION

At this stage:

```text
LAB_D4_DETECTIVE
```

contains roughly:

```text
SQL Statement
-------------
KNOWN_APPLICATION_SQL

Database Object
---------------
MONITOR_SENSITIVE_CUSTOMER_DATA

Default
-------
Alert unexpected SQL

Unknown Traffic
---------------
Alert

Login / Logout
--------------
Log / alert failures
```

---

# Lab 44 — Verify Policy Architecture

Conceptually:

```text
Incoming SQL
     │
     ▼
Session Context
     │
     ▼
SQL Statement
     │
     ├── normal cluster
     │      ↓
     │     PASS
     │
     ▼
Database Object
     │
     ├── CUSTOMER_SECURE
     │      ↓
     │     ALERT
     │
     ▼
Default
     │
     ▼
   ALERT
```

---

# Important Rule-Order Observation

Because Database Firewall stops evaluation after a rule match, a broad SQL Statement rule could prevent a later Database Object rule from seeing that same statement.

Therefore **rule design and evaluation order matter**.

For this lab, use AVDF's:

```text
Evaluation Order
```

facility if necessary so the sensitive-object monitoring behavior takes priority over overly broad baseline rules.

Oracle AVDF 20.4+ allows policy evaluation order to be adjusted, apart from the Default rule being last.

---

# PART T

# SAVE / PUBLISH POLICY

---

# Lab 45 — Save Policy

Click:

```text
Save
```

or:

```text
Save and Publish
```

depending on installed AVDF release.

Check:

```text
Settings
   ↓
Jobs
```

if your release uses a publication job.

---

# Lab 46 — Verify Policy

Navigate:

```text
Policies
   ↓
Database Firewall Policies
```

Expected:

```text
LAB_D4_DETECTIVE
```

---

# PART U

# DEPLOY POLICY

---

# Lab 47 — Deploy Policy

Select:

```text
LAB_D4_DETECTIVE
```

Click:

```text
Deploy
```

Target:

```text
PDB1_26AI
```

Click:

```text
Deploy
```

Database Firewall policy deployment is supported from the Policies tab in AVDF 20.8+, and can also be assigned from the target's Database Firewall Monitoring section.

---

# Lab 48 — Verify Assigned Policy

Navigate:

```text
Targets
   ↓
PDB1_26AI
   ↓
Database Firewall Monitoring
```

Expected:

```text
Policy:
LAB_D4_DETECTIVE
```

---

# PART V

# TEST KNOWN SQL

Login:

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

---

# Lab 49 — Execute Known SQL

```sql
SELECT customer_name,
       credit_limit
FROM avdf_d2_app.customer_secure
WHERE customer_id=1;
```

Expected:

```text
CUSTOMER_NAME        CREDIT_LIMIT
-------------------- ------------
Budi Santoso             50000000
```

---

# Lab 50 — Different Literal, Same SQL Pattern

```sql
SELECT customer_name,
       credit_limit
FROM avdf_d2_app.customer_secure
WHERE customer_id=5;
```

Expected:

```text
CUSTOMER_NAME        CREDIT_LIMIT
-------------------- ------------
Dewi Lestari             60000000
```

The SQL grammar pattern should still correspond to the baseline cluster.

---

# PART W

# TEST SENSITIVE DATA RULE

Run:

```sql
SELECT customer_id,
       customer_name,
       city,
       credit_limit,
       account_status
FROM avdf_d2_app.customer_secure
ORDER BY customer_id;
```

Expected:

```text
5 rows selected.
```

Because:

```text
Object = CUSTOMER_SECURE
Command = SELECT
Profile = D4_READER_PROFILE
```

rule should match:

```text
MONITOR_SENSITIVE_CUSTOMER_DATA
```

Expected Firewall action:

```text
ALERT
```

but query remains successful because monitoring mode does not block it.

---

# PART X

# TEST UPDATE RULE

Run:

```sql
UPDATE avdf_d2_app.customer_secure
SET account_status='REVIEW'
WHERE customer_id=1;
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

Even though transaction is rolled back, Database Firewall already observed the SQL traffic.

---

# PART Y

# TEST UNEXPECTED SQL

Normal baseline did not include queries against HR.

As `AVDF_D2_READER`, this user does not currently have HR access.

First attempt:

```sql
SELECT *
FROM hr.employees;
```

Likely:

```text
ORA-00942: table or view "HR"."EMPLOYEES" does not exist
```

or privilege-related equivalent.

Firewall can still inspect the SQL sent through the network, and response monitoring can provide database error context.

Exit:

```sql
EXIT
```

---

# PART Z

# CREATE A SAFE NEW QUERY SHAPE

Reconnect:

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

Run SQL not included in normal baseline:

```sql
SELECT city,
       COUNT(*) customer_count
FROM avdf_d2_app.customer_secure
GROUP BY city
ORDER BY city;
```

Expected:

```text
CITY            CUSTOMER_COUNT
--------------- --------------
Bandung                      1
Bogor                        1
Depok                        1
Jakarta                      1
Surabaya                     1
```

This should produce a new/unexpected SQL pattern.

Depending on the evaluation order, it may match:

```text
MONITOR_SENSITIVE_CUSTOMER_DATA
```

before reaching Default.

That itself teaches an important point:

> "Unexpected SQL" does not necessarily reach Default if another earlier rule catches it.

---

# PART AA

# GENERATE A DEFAULT-RULE EVENT

Use an object not contained in:

```text
D4_SENSITIVE_OBJECTS
```

For example:

```sql
SELECT SYSDATE
FROM dual;
```

Expected:

```text
SYSDATE
---------
...
```

If this SQL cluster was not part of `D4_NORMAL_SQL`, it should reach:

```text
Default Rule
```

and produce:

```text
ALERT
```

according to the policy.

---

# PART AB

# TEST FAILED LOGIN

Exit first.

Then:

```bash
sqlplus -L 'avdf_d2_reader/WrongPassword@//192.168.56.26:1521/PDB1'
```

Expected:

```text
ERROR:
ORA-01017: invalid username/password; logon denied
```

Repeat:

```bash
for i in 1 2 3
do
  echo "Attempt $i"
  sqlplus -L -s 'avdf_d2_reader/WrongPassword@//192.168.56.26:1521/PDB1' <<'EOF'
EXIT
EOF
done
```

Example:

```text
Attempt 1
ORA-01017

Attempt 2
ORA-01017

Attempt 3
ORA-01017
```

---

# PART AC

# INVESTIGATE DATABASE FIREWALL ALERTS

Login Audit Vault Server.

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

Look for events produced by:

```text
LAB_D4_DETECTIVE
```

---

# Lab 51 — Sensitive Data Alert

Find event where:

```text
User:
AVDF_D2_READER

Object:
CUSTOMER_SECURE

Event / Command:
SELECT

Policy:
LAB_D4_DETECTIVE
```

Threat:

```text
Major
```

---

# Lab 52 — UPDATE Alert

Find:

```text
User:
AVDF_D2_READER

Command:
UPDATE

Object:
CUSTOMER_SECURE
```

---

# Lab 53 — Default Rule Alert

Find:

```text
SELECT SYSDATE FROM DUAL
```

Expected policy:

```text
LAB_D4_DETECTIVE
```

---

# PART AD

# EXFILTRATION-DETECTION LAB

This is one of the most valuable detective exercises.

Oracle AVDF can capture returned row count for `SELECT` queries on Oracle targets and expose it in reports/alerts. Oracle specifically describes this as a way to identify potential data-exfiltration behavior.

---

# Lab 54 — Small Query

Login:

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

Run:

```sql
SELECT customer_id,
       customer_name
FROM avdf_d2_app.customer_secure
WHERE customer_id=1;
```

Expected:

```text
1 row selected.
```

---

# Lab 55 — Larger Query

Run:

```sql
SELECT *
FROM avdf_d2_app.customer_secure;
```

Expected:

```text
5 rows selected.
```

Exit.

---

# Lab 56 — Verify Row Count

Audit Vault:

```text
Reports
   ↓
All Activity
```

Add/display column:

```text
Row Count
```

Filter:

```text
User   = AVDF_D2_READER
Object = CUSTOMER_SECURE
```

Expected examples:

```text
SQL                           ROW_COUNT
----------------------------  ---------
WHERE CUSTOMER_ID=...                 1
SELECT *                              5
```

---

# PART AE

# CREATE ROW-COUNT ALERT

Create an alert when:

```text
ROW_COUNT > 3
```

This is deliberately small for the training dataset.

In production, the threshold would be determined by normal workload.

---

# Lab 57 — Create Alert Policy

Navigate:

```text
Policies
   ↓
Alert Policies
   ↓
Create
```

Name:

```text
LAB_D4_LARGE_RESULT
```

Description:

```text
Detect unusually large SELECT result on training data
```

Severity:

```text
Critical
```

---

# Lab 58 — Define Condition

Use condition field available in AVDF:

```text
:ROW_COUNT > 3
```

Optionally narrow the event:

```text
upper(:USER)='AVDF_D2_READER'
AND :ROW_COUNT > 3
```

You may also add target filtering through the target selection UI.

AVDF's alert-condition model allows fields such as `ROW_COUNT`, `USER`, `OBJECT`, `EVENT`, `EVENT_STATUS`, and network information to be evaluated.

---

# Lab 59 — Trigger Large Result Alert

Execute:

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1' <<'EOF'
SET PAGES 100
SELECT *
FROM avdf_d2_app.customer_secure;
EXIT
EOF
```

Expected:

```text
5 rows selected.
```

---

# Lab 60 — Verify Alert

Navigate:

```text
Alerts
   ↓
Alerts
```

Filter:

```text
Alert Policy = LAB_D4_LARGE_RESULT
Target       = PDB1_26AI
```

Expected:

```text
Severity : Critical
Row Count: 5
User     : AVDF_D2_READER
```

---

# PART AF

# REPEAT QUERY FREQUENCY TEST

Potential exfiltration is not always one huge query.

It can also be:

```text
many small queries
```

Generate:

```bash
for i in 1 2 3 4 5 6 7 8 9 10
do
sqlplus -L -s 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1' <<'EOF'
SET HEADING OFF FEEDBACK OFF
SELECT COUNT(*)
FROM avdf_d2_app.customer_secure;
EXIT
EOF
done
```

Expected:

```text
5
5
5
...
```

Use reports to see repeated traffic frequency.

---

# PART AG

# SESSION CONTEXT RULE — OPTIONAL ADVANCED LAB

We can also monitor everything performed by:

```text
AVDF_D2_READER
```

regardless of SQL.

---

# Lab 61 — Create Session Context Rule

Inside:

```text
LAB_D4_DETECTIVE
```

Navigate:

```text
Session Context
   ↓
Add
```

Rule:

```text
Rule Name:
MONITOR_READER_SESSION

DB User Set:
Include D4_APP_READERS
```

Action:

```text
Alert
```

Logging:

```text
Unique
```

Threat:

```text
Moderate
```

Save.

A Session Context rule can match attributes such as IP address, database user, OS user, and client program.

---

# Important

A very broad Session Context rule may match **before** SQL Statement and Database Object rules.

Therefore do not blindly put:

```text
Alert all traffic from AVDF_D2_READER
```

at the top unless that is intentional.

This lab is intended to demonstrate:

```text
policy evaluation matters
```

---

# PART AH

# INVESTIGATE POLICY EVALUATION ORDER

---

# Lab 62 — View Evaluation Order

Inside:

```text
LAB_D4_DETECTIVE
```

click:

```text
Evaluation Order
```

Study rule order.

A sensible detective layout might be:

```text
1. Highly specific Session rules
2. Known SQL Statement rules
3. Sensitive Database Object rules
4. Other object rules
5. Default
```

But actual ordering should match your policy objective.

---

# PART AI

# REPORTING LAB

The original syllabus explicitly includes AVDF built-in reports, report management, customization, and custom reports.

Oracle AVDF reports can cover privileged activity, database schema changes, SQL execution, account changes, roles, privileges, objects, and security configuration.

---

# Lab 63 — All Activity Report

Navigate:

```text
Reports
   ↓
Activity Reports
   ↓
All Activity
```

Set:

```text
Target = PDB1_26AI
```

---

# Lab 64 — Add Useful Columns

Display columns such as:

```text
Event Time
User
Client IP
Client Host
Client Program
Event
Object
Command Text
Event Status
Policy Name
Row Count
Threat Severity
Network Connection
```

---

# Lab 65 — Filter Firewall Events

Filter:

```text
Policy Name = LAB_D4_DETECTIVE
```

or filter based on monitoring point/network source.

Expected:

```text
Firewall-generated events only
```

---

# Lab 66 — Sensitive Object Report

Filter:

```text
Object = CUSTOMER_SECURE
```

Expected activity:

```text
SELECT
UPDATE
```

Users:

```text
AVDF_D2_READER
```

---

# Lab 67 — Large Result Investigation

Filter:

```text
Object = CUSTOMER_SECURE
```

Sort:

```text
Row Count DESC
```

Look for:

```text
5
```

versus normal query:

```text
1
```

---

# PART AJ

# NATIVE AUDIT CORRELATION

Firewall evidence tells us what occurred over SQL traffic.

Unified Audit gives native database evidence.

Let's correlate both.

---

# Lab 68 — Native Audit Query

```bash
sqlplus / as sysdba
```

Run:

```sql
ALTER SESSION SET CONTAINER=PDB1;

SET LINES 280
SET LONG 2000
SET PAGES 200

COLUMN event_time FORMAT A19
COLUMN dbusername FORMAT A18
COLUMN action_name FORMAT A18
COLUMN object_schema FORMAT A18
COLUMN object_name FORMAT A25
COLUMN sql_text FORMAT A80

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code,
       DBMS_LOB.SUBSTR(sql_text,80,1) sql_text
FROM   unified_audit_trail
WHERE  dbusername='AVDF_D2_READER'
ORDER  BY event_timestamp DESC
FETCH FIRST 30 ROWS ONLY;
```

Example:

```text
EVENT_TIME          DBUSERNAME       ACTION_NAME OBJECT_SCHEMA OBJECT_NAME
------------------- ---------------- ----------- ------------- ---------------
...                 AVDF_D2_READER   SELECT      AVDF_D2_APP   CUSTOMER_SECURE
...                 AVDF_D2_READER   UPDATE      AVDF_D2_APP   CUSTOMER_SECURE
...                 AVDF_D2_READER   LOGON
```

---

# Lab 69 — Failed Login Correlation

```sql
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
ORDER  BY event_timestamp DESC
FETCH FIRST 20 ROWS ONLY;
```

Look for:

```text
RETURN_CODE = 1017
```

Compare with Database Firewall login event.

---

# PART AK

# TWO INDEPENDENT DETECTIVE CHANNELS

At this point:

```text
Channel 1
---------
Oracle Database
   ↓
Unified Audit
   ↓
UNIFIED_AUDIT_TRAIL
```

and:

```text
Channel 2
---------
Network SQL
   ↓
Host Monitor
   ↓
Database Firewall
```

both feed:

```text
Audit Vault Server
```

This provides:

```text
database evidence
+
network evidence
```

---

# PART AL

# INCIDENT SIMULATION

Scenario:

> `AVDF_D2_READER` biasanya hanya mencari customer berdasarkan customer ID. Tiba-tiba account tersebut login setelah beberapa failed attempts, melakukan full-table read, menampilkan seluruh credit limit, lalu mencoba UPDATE.

---

# Lab 70 — Generate Failed Logins

```bash
for i in 1 2 3
do
  sqlplus -L -s 'avdf_d2_reader/WrongPassword@//192.168.56.26:1521/PDB1' <<'EOF'
EXIT
EOF
done
```

---

# Lab 71 — Successful Login

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

---

# Lab 72 — Full Sensitive Data Read

```sql
SELECT *
FROM avdf_d2_app.customer_secure;
```

---

# Lab 73 — Credit Limit Enumeration

```sql
SELECT customer_id,
       customer_name,
       credit_limit
FROM avdf_d2_app.customer_secure
ORDER BY credit_limit DESC;
```

Example:

```text
CUSTOMER_ID CUSTOMER_NAME        CREDIT_LIMIT
----------- -------------------- ------------
3           Andi Wijaya              75000000
5           Dewi Lestari             60000000
1           Budi Santoso             50000000
2           Siti Aminah              35000000
4           Rina Putri               25000000
```

---

# Lab 74 — Unauthorized-style Modification

```sql
UPDATE avdf_d2_app.customer_secure
SET credit_limit=99999999
WHERE customer_id=1;
```

Expected:

```text
1 row updated.
```

Rollback:

```sql
ROLLBACK;
```

---

# Lab 75 — Unexpected Query

```sql
SELECT city,
       SUM(credit_limit)
FROM avdf_d2_app.customer_secure
GROUP BY city;
```

Exit:

```sql
EXIT
```

---

# PART AM

# BUILD INCIDENT TIMELINE

Audit Vault report filter:

```text
User = AVDF_D2_READER
```

Sort:

```text
Event Time ASC
```

Expected conceptual timeline:

```text
16:10:01 Failed LOGON
16:10:04 Failed LOGON
16:10:07 Failed LOGON

16:10:40 Successful LOGON

16:10:52 SELECT CUSTOMER_SECURE
         Row Count = 5

16:11:06 SELECT CREDIT_LIMIT

16:11:25 UPDATE CUSTOMER_SECURE

16:11:42 New aggregate SQL pattern

16:12:00 LOGOUT
```

---

# Lab 76 — Answer Investigation Questions

Participant must determine:

```text
WHO?
AVDF_D2_READER

WHEN?
Event timestamps

TARGET?
PDB1_26AI

OBJECT?
CUSTOMER_SECURE

CLIENT?
SQL*Plus

FAILED LOGIN?
Yes

LARGE READ?
Yes

MODIFICATION?
Yes

NORMAL SQL?
Partly no

FIREWALL POLICY?
LAB_D4_DETECTIVE
```

---

# PART AN

# ALERT INTERPRETATION

The interesting point is that multiple controls may fire.

Potential alerts:

```text
Failed Login Alert
       +
Sensitive Object Alert
       +
Large Result Alert
       +
Default Rule Alert
```

One incident may therefore produce:

```text
multiple security signals
```

The investigator's job is not merely to count alerts.

The task is:

```text
correlate them into one story
```

---

# PART AO

# DETECTIVE POLICY DESIGN PRINCIPLE

Avoid creating:

```text
Alert on everything
```

because:

```text
too many events
      ↓
alert fatigue
      ↓
important signals disappear
```

Better:

```text
normal baseline
      ↓
identify sensitive actors
      ↓
identify sensitive objects
      ↓
define expected SQL
      ↓
alert on meaningful deviation
```

---

# PART AP

# COMPARE POLICY MODELS

## Policy 1 — Log All

Useful for:

```text
learning
baseline creation
short forensic windows
```

Disadvantage:

```text
large repository volume
```

---

## Policy 2 — Default

Useful for:

```text
basic monitoring
login/logout
DDL/DCL visibility
```

but does not capture everything.

---

## Policy 3 — LAB_D4_DETECTIVE

Purpose:

```text
focused monitoring
+
sensitive-object detection
+
unexpected SQL detection
+
anomaly investigation
```

---

# PART AQ

# SQL CLUSTER ALLOW-LIST CONCEPT

Our cluster set:

```text
D4_NORMAL_SQL
```

acts as a learned normal behavior set.

Concept:

```text
Application traffic
       │
       ▼
Known SQL cluster?
       │
   ┌───┴────┐
   │        │
  YES       NO
   │        │
   ▼        ▼
 PASS     further rules
             │
             ▼
           ALERT
```

This is one of the major concepts behind Database Firewall.

Oracle describes building allowed SQL cluster sets from trusted workload as a way to distinguish expected application SQL from statements outside the learned set.

---

# PART AR

# DATABASE OBJECT MONITORING CONCEPT

Our rule:

```text
MONITOR_SENSITIVE_CUSTOMER_DATA
```

performs:

```text
DATABASE USER
     +
COMMAND
     +
OBJECT
     ↓
POLICY DECISION
```

For example:

```text
AVDF_D2_READER
       +
SELECT
       +
CUSTOMER_SECURE
       ↓
ALERT + LOG
```

---

# PART AS

# EXPORT POLICY — OPTIONAL LAB

Oracle AVDF can export user-defined firewall policies for reuse or movement between Audit Vault Server environments. This is available in modern AVDF 20.x and requires the user-defined policy to be published.

---

# Lab 77 — Export Policy

Navigate:

```text
Policies
   ↓
Database Firewall Policies
```

Select:

```text
LAB_D4_DETECTIVE
```

Click:

```text
Export
```

Enter export password when prompted.

Save exported policy file securely.

---

# PART AT

# COPY POLICY — OPTIONAL LAB

Once a firewall policy has been deployed, Oracle does not permit direct editing in the same way; the normal workflow is to copy it, modify the copy, then publish/deploy the replacement.

---

# Lab 78 — Copy Policy

Select:

```text
LAB_D4_DETECTIVE
```

Click:

```text
Copy
```

Create:

```text
LAB_D4_DETECTIVE_V2
```

Use this when tuning rather than altering production policy unexpectedly.

---

# PART AU

# TROUBLESHOOTING — POLICY DEPLOYED BUT NO EVENTS

Checklist:

```text
1. Is DBFW1 running?
2. Is monitoring point running?
3. Is Host Monitor running?
4. Is NETWORK trail running?
5. Is correct policy deployed?
6. Is SQL actually traversing monitored path?
7. Does SQL match the rule?
8. Is logging enabled?
9. Is report time filter correct?
10. Is user/object spelling correct?
```

---

# Lab 79 — Verify Firewall

```text
avcli> SHOW STATUS FOR FIREWALL DBFW1;
```

---

# Lab 80 — Verify Monitoring Point

```text
avcli> LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

Check:

```text
Status
Policy
Mode
```

---

# Lab 81 — Verify Agent

Database host:

```bash
cd /home/oracle/avdf_agent/bin
./agentctl status
```

Expected:

```text
RUNNING
```

---

# Lab 82 — Verify Network SQL Exists

Create persistent session:

```bash
sqlplus hr/oracle@//192.168.56.26:1521/PDB1
```

From another terminal:

```bash
ss -tn | grep 1521
```

Expected:

```text
ESTAB
```

---

# PART AV

# TROUBLESHOOTING — ROW COUNT MISSING

If:

```text
ROW_COUNT
```

is null or unavailable:

Check:

```text
Database Response Monitoring = enabled
```

Check rule:

```text
Command = SELECT
```

Check:

```text
Capture number of rows returned
=
Yes
```

Use simple single-table query:

```sql
SELECT *
FROM avdf_d2_app.customer_secure;
```

Oracle specifically recommends using row-count capture primarily with straightforward single-table SELECTs; multi-table/composite operations can complicate interpretation.

---

# PART AW

# TROUBLESHOOTING — EXPECTED SQL ALERTS AS DEFAULT

Possible cause:

```text
D4_NORMAL_SQL
```

does not contain the cluster.

Fix workflow:

```text
Generate expected SQL
      ↓
Collect traffic
      ↓
Inspect cluster
      ↓
Add cluster to D4_NORMAL_SQL
      ↓
Deploy updated/copied policy
```

This is normal:

```text
policy tuning
```

---

# PART AX

# TROUBLESHOOTING — TOO MANY ALERTS

Possible causes:

```text
Default Rule too broad
Session Context rule too broad
Logging = Always
Threat level too aggressive
Baseline incomplete
```

Solution:

```text
expand valid SQL baseline
use profiles
narrow object sets
adjust rule order
use unique/sample logging
```

---

# PART AY

# DAY 4 FINAL ARCHITECTURE

At the end of Day 4:

```text
                       CLIENT
                          │
                          │ SQL
                          ▼
                  Oracle Database
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
      Unified Auditing             Host Monitor
            │                           │
            ▼                           ▼
 UNIFIED_AUDIT_TRAIL           Database Firewall
            │                           │
            │                 ┌─────────┴─────────┐
            │                 │ Policy Engine     │
            │                 │                   │
            │                 │ Session Context   │
            │                 │ SQL Statements    │
            │                 │ Database Objects  │
            │                 │ Default           │
            │                 └─────────┬─────────┘
            │                           │
            └──────────────┬────────────┘
                           ▼
                  AUDIT VAULT SERVER
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
              REPORT      ALERT   INVESTIGATION
```

---

# PART AZ

# DAY 4 FINAL CHECKPOINT

Database state:

```text
ORCLCDB
OPEN

PDB1
READ WRITE

CUSTOMER_SECURE
5 rows
```

Users:

```text
AVDF_D2_APP
OPEN

AVDF_D2_READER
OPEN
```

AVDF:

```text
PDB1_26AI
Registered

DBFW1
Running

Monitoring Mode
Host Monitor

Policy
LAB_D4_DETECTIVE
```

Policy components:

```text
D4_APP_READERS
Database User Set

D4_SENSITIVE_OBJECTS
Database Object Set

D4_READER_PROFILE
Profile

D4_NORMAL_SQL
SQL Cluster Set

KNOWN_APPLICATION_SQL
SQL Statement Rule

MONITOR_SENSITIVE_CUSTOMER_DATA
Database Object Rule

Default Rule
Alert

Unknown Traffic
Alert
```

Alert:

```text
LAB_D4_LARGE_RESULT
```

Reports should contain:

```text
Normal SQL
Sensitive SELECT
UPDATE
Failed LOGON
Unexpected SQL
Row Count
Firewall Alerts
```

---

# PART BA

# DAY 4 REVIEW QUESTIONS

## Question 1

Apa perbedaan SQL Cluster dengan SQL Cluster Set?

Answer:

```text
SQL Cluster
=
group of structurally similar SQL statements
```

while:

```text
SQL Cluster Set
=
collection of one or more SQL clusters used in policies
```

---

## Question 2

Apa fungsi Profile?

Answer:

Profile menggabungkan actor-related sets:

```text
IP Address
DB User
OS User
Client Program
```

dan dapat digunakan oleh policy rules.

---

## Question 3

Apa fungsi Database Object Rule?

Answer:

Memantau SQL berdasarkan:

```text
command
+
database object
+
optional profile
```

---

## Question 4

Apa fungsi Default Rule?

Answer:

Menangani SQL yang tidak match dengan rule sebelumnya.

---

## Question 5

Mengapa tidak menggunakan Block?

Answer:

Karena Day 4 memakai:

```text
Monitoring (Host Monitor)
```

dan course berfokus pada:

```text
Detective Controls
```

---

## Question 6

Mengapa Log All tidak dipakai terus-menerus?

Answer:

Karena:

```text
all SQL
     ↓
large audit volume
     ↓
repository/storage growth
```

`Log all` lebih cocok untuk:

```text
short learning/baseline window
```

---

## Question 7

Apa keuntungan SQL baseline?

Answer:

Kita dapat membedakan:

```text
expected SQL
```

dari:

```text
new/unusual SQL
```

---

## Question 8

Apa kegunaan Row Count?

Answer:

Membantu mendeteksi:

```text
unexpectedly large result sets
```

dan possible:

```text
data extraction / exfiltration
```

---

# PART BB

# FINAL DAY 4 INCIDENT FLOW

Peserta seharusnya sekarang mampu menjelaskan:

```text
NORMAL APPLICATION WORKLOAD
          │
          ▼
    SQL COLLECTION
          │
          ▼
      SQL CLUSTERS
          │
          ▼
       BASELINE
          │
          ▼
  DATABASE FIREWALL POLICY
          │
          ├── known SQL
          │      ↓
          │    PASS/LOG
          │
          ├── sensitive object
          │      ↓
          │    ALERT
          │
          └── unexpected SQL
                 ↓
               ALERT
                 │
                 ▼
          AUDIT VAULT SERVER
                 │
          ┌──────┴──────┐
          ▼             ▼
       REPORT         ALERT
          │             │
          └──────┬──────┘
                 ▼
           INVESTIGATION
```

---

# PART BC

# DAY 4 MAIN TAKEAWAY

Day 3 taught:

```text
Database Firewall can see SQL traffic.
```

Day 4 teaches:

```text
Database Firewall can decide
which SQL activity matters.
```

That decision can be based on:

```text
WHO
Database User

WHERE FROM
IP / client information

HOW
Client Program

WHAT
SQL Statement

AGAINST WHAT
Database Object

HOW MUCH DATA
Returned Row Count

IS IT NORMAL
SQL Cluster Baseline
```

The final objective remains purely detective:

```text
BASELINE
   ↓
MONITOR
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
```

not:

```text
BLOCK
```

---

# DO NOT CLEAN UP

Do not remove:

```text
LAB_D4_DETECTIVE
D4_NORMAL_SQL
D4_APP_READERS
D4_SENSITIVE_OBJECTS
D4_READER_PROFILE
LAB_D4_LARGE_RESULT
```

Do not stop:

```text
DBFW1
Host Monitor
NETWORK Trail
```

Do not drop:

```text
AVDF_D2_APP
AVDF_D2_READER
CUSTOMER_SECURE
```

These objects will be reused on Day 5 for:

```text
central reporting
alert correlation
entitlement review
compliance
full forensic investigation
final capstone
```
