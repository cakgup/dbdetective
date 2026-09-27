# DAY 2 HANDS-ON LAB

# Oracle Audit Vault Operations, Centralized Audit Policy Management, Alerts & Investigation

**Platform**

```text
OS          : Oracle Linux Server 9.8
Oracle      : Oracle AI Database 26ai Enterprise Edition 23.26.1.0.0

ORACLE_HOME : /opt/oracle/product/26ai/dbhome_1
ORACLE_BASE : /opt/oracle
ORACLE_SID  : ORCLCDB

CDB         : ORCLCDB
PDB         : PDB1

SYS         : oracle
SYSTEM      : oracle

Listener    : 192.168.56.26:1521
Service     : PDB1
```

Database connection:

```bash
sqlplus system/oracle@//192.168.56.26:1521/PDB1
```

SYS:

```bash
sqlplus / as sysdba
```

---

# 1. Day 2 Objective

Pada Day 1 kita sudah membangun alur dasar:

```text
Oracle AI Database 26ai
       │
       ▼
Unified Auditing
       │
       ▼
UNIFIED_AUDIT_TRAIL
       │
       ▼
Audit Vault Collection
       │
       ▼
Audit Vault Server
```

Day 2 memperluasnya menjadi:

```text
                 AUDIT VAULT SERVER
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
     Retention       Policies       Alerts
           │             │             │
           └──────┬──────┴──────┬──────┘
                  │             │
                  ▼             ▼
              COLLECTION     REPORTING
                  │             │
                  └──────┬──────┘
                         ▼
                   INVESTIGATION
                         │
                         ▼
                 Oracle Database
```

Pada akhir Day 2 peserta mampu:

1. Memvalidasi hasil Day 1.
2. Memastikan AVDF secured target sehat.
3. Memastikan `UNIFIED_AUDIT_TRAIL` dikoleksi.
4. Mengkonfigurasi retention policy.
5. Membuat custom Unified Audit Policy pada Oracle Database.
6. Mengambil konfigurasi audit policy dari database ke AVDF.
7. Melihat Oracle predefined dan custom policies dari AVDF.
8. Mengaktifkan audit policy secara terpusat dari AVDF.
9. Memverifikasi policy benar-benar aktif pada PDB.
10. Menghasilkan security-relevant audit events.
11. Memastikan event dikoleksi AVDF.
12. Menggunakan AVDF Activity Reports.
13. Membuat failed-login alert.
14. Menguji threshold-based alert.
15. Melakukan basic incident investigation.
16. Memahami perbedaan agentless collection dengan Audit Vault Agent.
17. Opsional: memasang dan mengaktifkan Audit Vault Agent.

---

# 2. Recommended Day 2 Schedule

| Waktu       | Materi                                |
| ----------- | ------------------------------------- |
| 09:00–09:30 | Day 1 validation                      |
| 09:30–10:15 | AVDF collection health                |
| 10:15–11:00 | Data retention policy                 |
| 11:00–12:00 | Build Day 2 audited application       |
| 13:00–14:00 | Retrieve audit policies into AVDF     |
| 14:00–15:00 | Centralized audit-policy provisioning |
| 15:00–15:45 | Generate & collect security events    |
| 15:45–16:30 | AVDF reports & investigation          |
| 16:30–17:00 | Alert policy & attack simulation      |

---

# PART A

# Day 1 Validation

---

# Lab 1 — Set Oracle Environment

Login:

```bash
sudo su - oracle
```

Set environment:

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

# Lab 2 — Check Listener

```bash
lsnrctl status
```

Pastikan terdapat service PDB1:

```text
Service "pdb1" has 1 instance(s).
  Instance "ORCLCDB", status READY ...
```

---

# Lab 3 — Check Database and PDB

```bash
sqlplus / as sysdba
```

Jalankan:

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
    CON_ID CON_NAME     OPEN MODE  RESTRICTED
---------- ------------ ---------- ----------
         2 PDB$SEED     READ ONLY  NO
         3 PDB1         READ WRITE NO
```

---

# Lab 4 — Switch to PDB1

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

# Lab 5 — Verify Day 1 Users

```sql
COLUMN username FORMAT A20
COLUMN account_status FORMAT A20

SELECT username,
       account_status
FROM   dba_users
WHERE  username IN ('AVDF_DEMO','AVDFCOLLECT')
ORDER  BY username;
```

Expected:

```text
USERNAME             ACCOUNT_STATUS
-------------------- --------------------
AVDFCOLLECT          OPEN
AVDF_DEMO             OPEN
```

Jika `AVDF_DEMO` tidak ada, buat ulang:

```sql
CREATE USER avdf_demo
IDENTIFIED BY "Oracle#26Lab1";

GRANT CREATE SESSION TO avdf_demo;

GRANT SELECT ON hr.employees TO avdf_demo;
```

---

# Lab 6 — Verify Day 1 Audit Policies

```sql
COLUMN policy_name FORMAT A30
COLUMN entity_name FORMAT A20
COLUMN success FORMAT A10
COLUMN failure FORMAT A10

SELECT policy_name,
       entity_name,
       success,
       failure
FROM   audit_unified_enabled_policies
WHERE  policy_name LIKE 'AVDF_DAY1%'
ORDER  BY policy_name;
```

Expected:

```text
POLICY_NAME                  ENTITY_NAME SUCCESS FAILURE
---------------------------- ----------- ------- -------
AVDF_DAY1_HR_ACCESS          AVDF_DEMO   YES     YES
AVDF_DAY1_LOGIN              ALL USERS   YES     YES
```

Jika tidak ada, jangan panik. Day 2 akan membuat policy baru sendiri.

---

# Lab 7 — Verify Unified Audit Trail Is Working

```sql
SELECT COUNT(*) AS audit_records
FROM   unified_audit_trail;
```

Contoh:

```text
AUDIT_RECORDS
-------------
          485
```

Jumlah pasti berbeda.

---

# PART B

# Audit Vault Server Health Check

Bagian ini dilakukan pada Audit Vault Server.

Oracle mensyaratkan target diregister sebelum audit trail dapat dikonfigurasi, dan audit trail collection harus dijalankan setelah trail dibuat.

---

# Lab 8 — Check Registered Target

Pada session AVCLI:

```text
avcli> LIST SECURED TARGET;
```

Expected terdapat:

```text
PDB1_26AI
```

Contoh:

```text
Secured Target Name
------------------------------
PDB1_26AI
```

Jika `PDB1_26AI` belum ada:

```text
avcli> REGISTER SECURED TARGET PDB1_26AI
        OF SECURED TARGET TYPE "Oracle Database"
        AT jdbc:oracle:thin:@//192.168.56.26:1521/PDB1
        AUTHENTICATED BY AVDFCOLLECT;
```

AVDF akan meminta password target account.

Masukkan:

```text
Oracle#AVDF26
```

Oracle mendokumentasikan `REGISTER SECURED TARGET` dengan JDBC URL serta target database credential seperti ini.

---

# Lab 9 — Check Audit Trail

```text
avcli> LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

Expected kurang lebih:

```text
Secured Target : PDB1_26AI
Trail Type     : TABLE
Location       : UNIFIED_AUDIT_TRAIL
Host           : agentless collection
Status         : RUNNING
```

Status juga dapat menjadi:

```text
IDLE
```

`IDLE` tidak selalu berarti error.

Artinya collector dapat sedang menunggu record baru.

Yang harus diinvestigasi adalah status semacam:

```text
STOPPED_ERROR
```

---

# Lab 10 — Start Collection If Necessary

Jika trail belum dibuat:

```text
avcli> START COLLECTION FOR SECURED TARGET PDB1_26AI
        USING HOST 'agentless collection'
        FROM TABLE UNIFIED_AUDIT_TRAIL;
```

Oracle AVDF mendokumentasikan bahwa untuk Oracle Database TABLE trail dalam agentless mode, nama host adalah:

```text
'agentless collection'
```

Check lagi:

```text
avcli> LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

---

# Lab 11 — Generate Heartbeat Audit Event

Di database:

```bash
sqlplus -L 'avdf_demo/Oracle#26Lab1@//192.168.56.26:1521/PDB1'
```

Jalankan:

```sql
SELECT COUNT(*)
FROM   hr.employees;

EXIT
```

Expected:

```text
  COUNT(*)
----------
       107
```

---

# Lab 12 — Verify Locally

```bash
sqlplus / as sysdba
```

```sql
ALTER SESSION SET CONTAINER=PDB1;

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code
FROM   unified_audit_trail
WHERE  dbusername='AVDF_DEMO'
ORDER  BY event_timestamp DESC
FETCH FIRST 5 ROWS ONLY;
```

Contoh:

```text
EVENT_TIME          DBUSERNAME ACTION_NAME OBJECT_SCHEMA OBJECT_NAME RETURN_CODE
------------------- ---------- ----------- ------------- ----------- -----------
2026-09-13 09:38:20 AVDF_DEMO  SELECT      HR            EMPLOYEES            0
2026-09-13 09:38:18 AVDF_DEMO  LOGON                                  0
```

---

# Important Troubleshooting Rule

Selalu troubleshoot dari bawah ke atas:

```text
SQL operation
    ↓
Audit policy
    ↓
UNIFIED_AUDIT_TRAIL
    ↓
Network connectivity
    ↓
AVDF audit trail
    ↓
AVDF repository
    ↓
Report
```

Jangan mulai dari AVDF report jika record bahkan tidak ada di:

```text
UNIFIED_AUDIT_TRAIL
```

---

# PART C

# Configure AVDF Data Retention

Silabus asli memasukkan data retention, archiving dan archive jobs sebagai bagian administrasi Audit Vault.

Oracle merekomendasikan retention policy dikonfigurasi untuk target sebelum audit-trail collection.

Karena ini training, kita gunakan:

```text
Online retention : 3 months
Archive retention: 0 months
```

Dengan demikian kita tidak membutuhkan external archive repository untuk lab.

---

# Lab 13 — List Existing Retention Policies

Sebagai AVDF super administrator / appropriate privileged account:

```text
avcli> LIST RETENTION POLICIES;
```

Contoh:

```text
Retention Policy
-----------------------------------------
3 months online, 6 months in archive
...
```

---

# Lab 14 — Create Training Retention Policy

Create policy:

```text
avcli> CREATE RETENTION POLICY LAB_3M_ONLINE
        ONLINE MONTHS 3
        ARCHIVED MONTHS 0;
```

Expected:

```text
Retention policy LAB_3M_ONLINE created successfully.
```

Syntax resminya adalah:

```text
CREATE RETENTION POLICY <name>
ONLINE MONTHS <n>
ARCHIVED MONTHS <n>
```

---

# Lab 15 — Verify Policy

```text
avcli> LIST RETENTION POLICIES;
```

Cari:

```text
LAB_3M_ONLINE
```

---

# Lab 16 — Apply Policy to Target

Retention policy diterapkan oleh account dengan privilege yang sesuai, pada dokumentasi AVDF disebut super auditor untuk operation ini.

```text
avcli> APPLY RETENTION POLICY LAB_3M_ONLINE
        TO TARGET PDB1_26AI;
```

Expected:

```text
Retention policy LAB_3M_ONLINE applied successfully.
```

---

# Lab 17 — Verify Target Retention

```text
avcli> SHOW RETENTION POLICY FOR TARGET PDB1_26AI;
```

Expected:

```text
Target           : PDB1_26AI
Retention Policy : LAB_3M_ONLINE
```

Perintah `CREATE`, `APPLY`, `LIST`, dan `SHOW RETENTION POLICY` merupakan AVCLI commands resmi.

---

# PART D

# Build Day 2 Application Environment

Sekarang kita membuat application schema kecil agar event lebih realistis dibanding sekadar query HR.EMPLOYEES.

---

# Lab 18 — Create Application Owner

Database:

```bash
sqlplus / as sysdba
```

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Create schema:

```sql
CREATE USER avdf_d2_app
IDENTIFIED BY "Oracle#D2App26"
DEFAULT TABLESPACE users
QUOTA 20M ON users;
```

Expected:

```text
User created.
```

Grant:

```sql
GRANT CREATE SESSION,
      CREATE TABLE
TO avdf_d2_app;
```

Expected:

```text
Grant succeeded.
```

---

# Lab 19 — Create Application Reader

```sql
CREATE USER avdf_d2_reader
IDENTIFIED BY "Oracle#D2Read26";
```

Expected:

```text
User created.
```

```sql
GRANT CREATE SESSION TO avdf_d2_reader;
```

Expected:

```text
Grant succeeded.
```

---

# Lab 20 — Create Sensitive Application Table

Connect:

```bash
sqlplus -L 'avdf_d2_app/Oracle#D2App26@//192.168.56.26:1521/PDB1'
```

Create:

```sql
CREATE TABLE customer_secure
(
    customer_id     NUMBER PRIMARY KEY,
    customer_name   VARCHAR2(100),
    city            VARCHAR2(50),
    credit_limit    NUMBER,
    account_status  VARCHAR2(20)
);
```

Expected:

```text
Table created.
```

Insert test data:

```sql
INSERT INTO customer_secure
VALUES (1,'Budi Santoso','Jakarta',50000000,'ACTIVE');

INSERT INTO customer_secure
VALUES (2,'Siti Aminah','Bandung',35000000,'ACTIVE');

INSERT INTO customer_secure
VALUES (3,'Andi Wijaya','Surabaya',75000000,'ACTIVE');

INSERT INTO customer_secure
VALUES (4,'Rina Putri','Depok',25000000,'ACTIVE');

INSERT INTO customer_secure
VALUES (5,'Dewi Lestari','Bogor',60000000,'SUSPENDED');

COMMIT;
```

Expected:

```text
1 row created.
...
Commit complete.
```

Verify:

```sql
SET LINES 160
COLUMN customer_name FORMAT A20
COLUMN city FORMAT A15
COLUMN account_status FORMAT A15

SELECT *
FROM   customer_secure
ORDER  BY customer_id;
```

Expected:

```text
CUSTOMER_ID CUSTOMER_NAME        CITY            CREDIT_LIMIT ACCOUNT_STATUS
----------- -------------------- --------------- ------------ ---------------
          1 Budi Santoso         Jakarta             50000000 ACTIVE
          2 Siti Aminah          Bandung             35000000 ACTIVE
          3 Andi Wijaya          Surabaya            75000000 ACTIVE
          4 Rina Putri           Depok               25000000 ACTIVE
          5 Dewi Lestari         Bogor               60000000 SUSPENDED
```

---

# Lab 21 — Grant Application Access

Masih sebagai `AVDF_D2_APP`:

```sql
GRANT SELECT, UPDATE
ON customer_secure
TO avdf_d2_reader;
```

Expected:

```text
Grant succeeded.
```

Exit:

```sql
EXIT
```

---

# PART E

# Create Custom Audit Policies for AVDF Management

Tujuan bagian ini sangat penting:

```text
Create policy in Oracle
        ↓
Retrieve policy into AVDF
        ↓
Enable policy from AVDF
        ↓
AVDF provisions target
```

Oracle AVDF modern mendukung retrieval dan centralized provisioning dari Unified Audit policies.

---

# Lab 22 — Create Sensitive Data Policy

Connect SYS:

```bash
sqlplus / as sysdba
```

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Create:

```sql
CREATE AUDIT POLICY avdf_d2_sensitive_access
  ACTIONS
    SELECT ON avdf_d2_app.customer_secure,
    UPDATE ON avdf_d2_app.customer_secure;
```

Expected:

```text
Audit policy created.
```

Do **not** enable it yet.

AVDF will enable it later.

---

# Lab 23 — Create Schema Change Policy

```sql
CREATE AUDIT POLICY avdf_d2_schema_changes
  ACTIONS
    CREATE TABLE,
    ALTER TABLE,
    DROP TABLE;
```

Expected:

```text
Audit policy created.
```

Again:

```text
DO NOT AUDIT POLICY ...
```

yet.

The purpose is to demonstrate centralized provisioning.

Oracle 26ai supports custom unified audit policies containing standard actions and object actions through `CREATE AUDIT POLICY`.

---

# Lab 24 — Verify Policies Exist But Are Disabled

```sql
COLUMN policy_name FORMAT A30
COLUMN audit_option FORMAT A30
COLUMN object_schema FORMAT A20
COLUMN object_name FORMAT A25

SELECT policy_name,
       audit_option,
       object_schema,
       object_name
FROM   audit_unified_policies
WHERE  policy_name LIKE 'AVDF_D2%'
ORDER  BY policy_name,
          audit_option;
```

Expected:

```text
POLICY_NAME                  AUDIT_OPTION OBJECT_SCHEMA OBJECT_NAME
---------------------------- ------------ ------------- -----------------------
AVDF_D2_SCHEMA_CHANGES       ALTER TABLE
AVDF_D2_SCHEMA_CHANGES       CREATE TABLE
AVDF_D2_SCHEMA_CHANGES       DROP TABLE
AVDF_D2_SENSITIVE_ACCESS     SELECT       AVDF_D2_APP   CUSTOMER_SECURE
AVDF_D2_SENSITIVE_ACCESS     UPDATE       AVDF_D2_APP   CUSTOMER_SECURE
```

Check enabled state:

```sql
SELECT policy_name,
       entity_name
FROM   audit_unified_enabled_policies
WHERE  policy_name LIKE 'AVDF_D2%';
```

Expected:

```text
no rows selected
```

This is intentional.

---

# PART F

# Retrieve Audit Policies into Audit Vault

Oracle AVDF 20.8+ provides:

```text
RETRIEVE AUDIT POLICIES FROM TARGET
```

to retrieve policies from the Oracle Database target.

---

# Lab 25 — Retrieve Policies

AVCLI:

```text
avcli> RETRIEVE AUDIT POLICIES FROM TARGET PDB1_26AI;
```

Expected conceptual output:

```text
The job to retrieve audit settings is submitted successfully.
```

Retrieval berjalan sebagai AVDF job.

---

# Lab 26 — Check Job in AVDF Console

Login sebagai auditor.

Navigate:

```text
Settings
   ↓
Jobs
```

atau pada release/UI baru melalui job/status page yang sesuai.

Cari job:

```text
Audit Policy Retrieval
```

Target:

```text
PDB1_26AI
```

Expected:

```text
Status : Completed
```

Jika:

```text
Failed
```

biasanya check:

```text
AVDFCOLLECT credentials
Target setup script
Network connection
JDBC connection
Required privileges
```

Oracle mencatat bahwa target-policy retrieval harus berhasil sebelum policy dapat dilihat/provisioned dengan benar.

---

# Lab 27 — List All Unified Audit Policies

```text
avcli> LIST UNIFIED AUDIT POLICIES FOR TARGET PDB1_26AI;
```

Output akan panjang.

Cari:

```text
AVDF_D2_SENSITIVE_ACCESS
AVDF_D2_SCHEMA_CHANGES
```

---

# Lab 28 — List Only Custom Policies

```text
avcli> LIST UNIFIED AUDIT CUSTOM POLICIES FOR TARGET PDB1_26AI;
```

Contoh:

```text
| Unified Policy Name          | Enabled |
|------------------------------|---------|
| AVDF_D2_SENSITIVE_ACCESS     | No      |
| AVDF_D2_SCHEMA_CHANGES       | No      |
...
```

Oracle menyediakan AVCLI command khusus untuk core, Oracle predefined, custom, dan seluruh unified policies.

---

# Lab 29 — List Oracle Predefined Policies

```text
avcli> LIST UNIFIED AUDIT ORACLE PREDEFINED POLICIES
        FOR TARGET PDB1_26AI;
```

Anda dapat melihat policy seperti:

```text
ORA_SECURECONFIG
ORA_LOGIN_LOGOUT
ORA_STIG_RECOMMENDATIONS
...
```

Daftar aktual bergantung release Oracle Database.

---

# PART G

# Centrally Provision Policies from AVDF

Sekarang Audit Vault tidak hanya mengumpulkan audit data.

Audit Vault juga digunakan untuk:

```text
retrieve
view
enable
disable
```

Unified Audit policy pada Oracle target.

Ini adalah salah satu perbedaan penting antara:

```text
Audit collection
```

dan:

```text
Audit policy management
```

---

# Lab 30 — Enable Sensitive Access Policy from AVDF

Policy ini kita aktifkan hanya untuk:

```text
AVDF_D2_READER
```

AVCLI:

```text
avcli> ENABLE UNIFIED AUDIT POLICY AVDF_D2_SENSITIVE_ACCESS
        ON TARGET PDB1_26AI
        FOR USERS 'AVDF_D2_READER';
```

Expected:

```text
The job to provision audit policy is successfully submitted.
```

Oracle mendokumentasikan centralized provisioning dengan:

```text
ENABLE UNIFIED AUDIT POLICY <policy>
ON TARGET <target>
FOR USERS <users>
```

---

# Lab 31 — Enable Schema Policy

Enable untuk application owner:

```text
avcli> ENABLE UNIFIED AUDIT POLICY AVDF_D2_SCHEMA_CHANGES
        ON TARGET PDB1_26AI
        FOR USERS 'AVDF_D2_APP';
```

Expected:

```text
The job to provision audit policy is successfully submitted.
```

---

# Lab 32 — Verify Provisioning Jobs

Audit Vault Server Console:

```text
Settings
   ↓
Jobs
```

Cari:

```text
Audit Policy Provisioning
```

Expected:

```text
Completed
```

---

# Lab 33 — Verify Directly on Database

Sekarang database-side.

```bash
sqlplus / as sysdba
```

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Query:

```sql
COLUMN policy_name FORMAT A30
COLUMN entity_name FORMAT A20
COLUMN entity_type FORMAT A15
COLUMN success FORMAT A10
COLUMN failure FORMAT A10

SELECT policy_name,
       entity_name,
       entity_type,
       success,
       failure
FROM   audit_unified_enabled_policies
WHERE  policy_name LIKE 'AVDF_D2%'
ORDER  BY policy_name;
```

Expected:

```text
POLICY_NAME                  ENTITY_NAME      ENTITY_TYPE SUCCESS FAILURE
---------------------------- ---------------- ----------- ------- -------
AVDF_D2_SCHEMA_CHANGES       AVDF_D2_APP      USER        YES     YES
AVDF_D2_SENSITIVE_ACCESS     AVDF_D2_READER   USER        YES     YES
```

Ini membuktikan:

```text
AVDF
  │
  │ policy provisioning
  ▼
Oracle Database
```

benar-benar terjadi.

---

# PART H

# Generate Sensitive-Data Activity

---

# Lab 34 — Normal SELECT Activity

Login sebagai application reader:

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

Run:

```sql
SET LINES 160

COLUMN customer_name FORMAT A20
COLUMN account_status FORMAT A15

SELECT customer_id,
       customer_name,
       credit_limit,
       account_status
FROM   avdf_d2_app.customer_secure
ORDER  BY customer_id;
```

Expected:

```text
CUSTOMER_ID CUSTOMER_NAME        CREDIT_LIMIT ACCOUNT_STATUS
----------- -------------------- ------------ ---------------
          1 Budi Santoso             50000000 ACTIVE
          2 Siti Aminah              35000000 ACTIVE
          3 Andi Wijaya              75000000 ACTIVE
          4 Rina Putri               25000000 ACTIVE
          5 Dewi Lestari             60000000 SUSPENDED
```

---

# Lab 35 — Generate UPDATE

```sql
UPDATE avdf_d2_app.customer_secure
SET    account_status='REVIEW'
WHERE  customer_id=3;
```

Expected:

```text
1 row updated.
```

Rollback agar data kembali:

```sql
ROLLBACK;
```

Expected:

```text
Rollback complete.
```

Walaupun di-rollback, SQL statement sudah terjadi dan dapat diaudit.

Exit:

```sql
EXIT
```

---

# Lab 36 — Verify Sensitive Access Locally

SYS:

```sql
SET LINES 260
SET LONG 2000

COLUMN event_time FORMAT A19
COLUMN dbusername FORMAT A18
COLUMN action_name FORMAT A15
COLUMN object_schema FORMAT A15
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
AND    object_name='CUSTOMER_SECURE'
ORDER  BY event_timestamp DESC;
```

Contoh:

```text
EVENT_TIME          DBUSERNAME        ACTION_NAME OBJECT_SCHEMA OBJECT_NAME      RETURN_CODE
------------------- ----------------- ----------- ------------- ---------------- -----------
2026-09-13 14:15:43 AVDF_D2_READER    UPDATE      AVDF_D2_APP   CUSTOMER_SECURE           0
2026-09-13 14:15:20 AVDF_D2_READER    SELECT      AVDF_D2_APP   CUSTOMER_SECURE           0
```

---

# Lab 37 — Verify Which Policy Generated It

```sql
COLUMN policy FORMAT A35

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       unified_audit_policies policy
FROM   unified_audit_trail
WHERE  dbusername='AVDF_D2_READER'
AND    unified_audit_policies LIKE '%AVDF_D2%'
ORDER  BY event_timestamp DESC;
```

Expected:

```text
EVENT_TIME          DBUSERNAME       ACTION_NAME POLICY
------------------- ---------------- ----------- ----------------------------
2026-09-13 14:15:43 AVDF_D2_READER   UPDATE      AVDF_D2_SENSITIVE_ACCESS
2026-09-13 14:15:20 AVDF_D2_READER   SELECT      AVDF_D2_SENSITIVE_ACCESS
```

---

# PART I

# Generate Schema Change Activity

---

# Lab 38 — Connect as Application Owner

```bash
sqlplus -L 'avdf_d2_app/Oracle#D2App26@//192.168.56.26:1521/PDB1'
```

Create table:

```sql
CREATE TABLE temp_orders
(
    order_id NUMBER,
    amount   NUMBER
);
```

Expected:

```text
Table created.
```

Alter:

```sql
ALTER TABLE temp_orders
ADD description VARCHAR2(100);
```

Expected:

```text
Table altered.
```

Drop:

```sql
DROP TABLE temp_orders PURGE;
```

Expected:

```text
Table dropped.
```

Exit:

```sql
EXIT
```

---

# Lab 39 — Verify Schema Change Audit Events

SYS:

```sql
COLUMN event_time FORMAT A19
COLUMN action_name FORMAT A20
COLUMN object_name FORMAT A25

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_name,
       return_code,
       unified_audit_policies
FROM   unified_audit_trail
WHERE  dbusername='AVDF_D2_APP'
AND    unified_audit_policies LIKE '%AVDF_D2_SCHEMA_CHANGES%'
ORDER  BY event_timestamp;
```

Expected:

```text
EVENT_TIME          DBUSERNAME  ACTION_NAME  OBJECT_NAME RETURN_CODE
------------------- ----------- ------------ ----------- -----------
2026-09-13 14:30:02 AVDF_D2_APP CREATE TABLE TEMP_ORDERS          0
2026-09-13 14:30:17 AVDF_D2_APP ALTER TABLE  TEMP_ORDERS          0
2026-09-13 14:30:31 AVDF_D2_APP DROP TABLE   TEMP_ORDERS          0
```

---

# PART J

# Verify Central AVDF Collection

---

# Lab 40 — Check Trail

AVCLI:

```text
avcli> LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

Expected:

```text
Status : RUNNING
```

atau:

```text
Status : IDLE
```

---

# Lab 41 — Generate a Known Timestamp

Database:

```sql
SELECT TO_CHAR(SYSTIMESTAMP,
               'YYYY-MM-DD HH24:MI:SS TZH:TZM')
       AS test_time
FROM dual;
```

Contoh:

```text
TEST_TIME
-----------------------------
2026-09-13 14:42:05 +07:00
```

Catat waktu ini untuk filtering pada AVDF report.

---

# PART K

# Use AVDF Activity Reports

Oracle AVDF Activity Reports mencakup SQL activity, application access, login activity, failed login, schema changes, privileged activity dan berbagai kategori lain.

---

# Lab 42 — Open All Activity Report

Login ke Audit Vault Server sebagai auditor.

Navigate:

```text
Reports
   ↓
Activity Reports
   ↓
All Activity
```

Gunakan filter:

```text
Target
=
PDB1_26AI
```

Tambahkan waktu Day 2.

Expected melihat activity dari:

```text
AVDF_D2_READER
AVDF_D2_APP
```

---

# Lab 43 — Filter Sensitive Object Activity

Filter:

```text
Target       = PDB1_26AI
Object Owner = AVDF_D2_APP
Object       = CUSTOMER_SECURE
```

Expected activity:

```text
SELECT
UPDATE
```

Kolom yang berguna:

```text
Target
User
Event Time
Event
Object Owner
Object
Client Host
Client Program
Command Text
Event Status
Policy Name
```

AVDF audit records memang memiliki metadata seperti target, user, event, object, client program, command text, event status dan policy name.

---

# Lab 44 — Inspect Individual Event

Klik event `SELECT`.

Perhatikan:

```text
Target              PDB1_26AI
User                AVDF_D2_READER
Object Owner        AVDF_D2_APP
Object              CUSTOMER_SECURE
Event               SELECT
Status              SUCCESS
Policy              AVDF_D2_SENSITIVE_ACCESS
```

Kemudian buka event `UPDATE`.

Bandingkan:

```text
SELECT event
vs
UPDATE event
```

---

# Lab 45 — Database Schema Report

Navigate:

```text
Reports
   ↓
Activity Reports
   ↓
Database Schema
```

Filter:

```text
Target = PDB1_26AI
User   = AVDF_D2_APP
```

Cari:

```text
CREATE TABLE
ALTER TABLE
DROP TABLE
```

terhadap:

```text
TEMP_ORDERS
```

---

# PART L

# Failed Authentication Monitoring

Authentication attack merupakan contoh klasik detective control.

Kita akan mensimulasikan:

```text
normal login
+
3 failed logins
```

---

# Lab 46 — Successful Login Baseline

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1' <<'EOF'
SELECT USER FROM dual;
EXIT
EOF
```

Expected:

```text
USER
------------------------------
AVDF_D2_READER
```

---

# Lab 47 — Generate Three Failed Logins

Copy-paste:

```bash
for i in 1 2 3
do
  echo "Attempt $i"
  sqlplus -L -s 'avdf_d2_reader/WrongPassword@//192.168.56.26:1521/PDB1' <<'EOF'
EXIT
EOF
done
```

Contoh:

```text
Attempt 1
ERROR:
ORA-01017: invalid username/password; logon denied

Attempt 2
ERROR:
ORA-01017: invalid username/password; logon denied

Attempt 3
ERROR:
ORA-01017: invalid username/password; logon denied
```

---

# Lab 48 — Verify Failures Locally

```sql
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
ORDER  BY event_timestamp DESC
FETCH FIRST 10 ROWS ONLY;
```

Expected:

```text
EVENT_TIME          DBUSERNAME       ACTION_NAME RETURN_CODE
------------------- ---------------- ----------- -----------
2026-09-13 15:10:24 AVDF_D2_READER   LOGON              1017
2026-09-13 15:10:22 AVDF_D2_READER   LOGON              1017
2026-09-13 15:10:20 AVDF_D2_READER   LOGON              1017
2026-09-13 15:09:48 AVDF_D2_READER   LOGON                 0
```

Interpretation:

```text
0    = successful login
1017 = ORA-01017
```

---

# PART M

# Create AVDF Failed Login Alert

AVDF alerts bersifat rule-based terhadap audit records yang telah dikoleksi. Oracle bahkan menggunakan repeated failed login sebagai contoh utama threshold alert.

---

# Lab 49 — Create Alert Policy

Login Audit Vault Server sebagai auditor.

Navigate:

```text
Policies
   ↓
Alert Policies
   ↓
Create
```

Isi:

```text
Alert Name:
LAB_FAILED_LOGIN

Description:
Three failed database logins within five minutes

Target Type:
Oracle Database

Severity:
Critical
```

---

# Lab 50 — Define Condition

Gunakan condition:

```text
upper(:EVENT_STATUS)='FAILURE'
and
upper(:EVENT)='LOGON'
```

Jika release AVDF Anda menampilkan `EVENT_NAME` alih-alih `EVENT` dalam UI/available-fields list, gunakan field yang disediakan UI tersebut.

Dokumentasi AVDF menggunakan bentuk condition:

```text
upper(:EVENT_STATUS)='FAILURE'
and upper(:EVENT_NAME)='LOGON'
```

dan pada UI release yang lebih baru juga mendokumentasikan field `EVENT`.

Untuk training, **gunakan nama field persis yang muncul pada Available Fields di console Anda**.

---

# Lab 51 — Configure Threshold

Set:

```text
Threshold:
3

Duration:
5 minutes
```

Artinya:

```text
3 failed logins
within
5 minutes
```

akan menghasilkan alert.

---

# Lab 52 — Restrict to Training Target

Jika menggunakan target filter, pilih:

```text
PDB1_26AI
```

Sehingga alert tidak berlaku pada target lain.

Save policy.

---

# Lab 53 — Verify Alert Policy

AVCLI:

```text
avcli> LIST ALERT POLICIES;
```

Expected terdapat:

```text
LAB_FAILED_LOGIN
```

---

# Lab 54 — Trigger Alert

Ulangi failed login test:

```bash
for i in 1 2 3
do
  echo "Failed login simulation $i"
  sqlplus -L -s 'avdf_d2_reader/WrongPassword@//192.168.56.26:1521/PDB1' <<'EOF'
EXIT
EOF
done
```

---

# Lab 55 — Verify Alert

Audit Vault Server:

```text
Alerts
   ↓
Alerts
```

Filter:

```text
Alert Policy = LAB_FAILED_LOGIN
Target       = PDB1_26AI
```

Expected:

```text
Severity : Critical
Target   : PDB1_26AI
```

Event information harus menunjukkan failed authentication activity.

---

# Lab 56 — Investigate Alert

Dari alert, drill down ke related audit events.

Cari:

```text
User
AVDF_D2_READER

Event
LOGON

Status
FAILURE
```

Perhatikan:

```text
Client host
Client IP
Client program
Event time
Error information
```

Sekarang peserta tidak hanya melihat:

```text
login failed
```

tetapi memiliki:

```text
Who?
When?
From where?
How many times?
Using which client?
Against which target?
```

---

# PART N

# Compare Local Audit and Central AVDF Evidence

Sekarang bandingkan dua sisi.

## Oracle Database

```text
UNIFIED_AUDIT_TRAIL
```

menyimpan source audit data.

## Audit Vault

```text
AVDF repository
```

menyimpan centralized normalized audit data.

Konsep:

```text
         Oracle Database
               │
        native audit data
               │
               ▼
     UNIFIED_AUDIT_TRAIL
               │
               │ collection
               ▼
       Audit Vault Server
               │
          normalization
               │
               ▼
     Central Audit Repository
          /      |       \
         /       |        \
    Reports    Alerts    Analysis
```

---

# Lab 57 — Local Investigation Query

Copy-paste:

```sql
SET LINES 300
SET LONG 2000
SET PAGES 200

COLUMN event_time FORMAT A19
COLUMN dbusername FORMAT A18
COLUMN action_name FORMAT A20
COLUMN object_owner FORMAT A16
COLUMN object_name FORMAT A22
COLUMN policy FORMAT A32
COLUMN sql_text FORMAT A75

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') AS event_time,
       dbusername,
       action_name,
       object_schema AS object_owner,
       object_name,
       return_code,
       unified_audit_policies AS policy,
       DBMS_LOB.SUBSTR(sql_text,75,1) AS sql_text
FROM   unified_audit_trail
WHERE  dbusername IN
       ('AVDF_D2_APP','AVDF_D2_READER')
ORDER  BY event_timestamp DESC
FETCH FIRST 50 ROWS ONLY;
```

Anda seharusnya melihat kombinasi:

```text
LOGON success
LOGON failure
SELECT
UPDATE
CREATE TABLE
ALTER TABLE
DROP TABLE
```

---

# Lab 58 — Count Activity by User

```sql
SELECT dbusername,
       COUNT(*) AS event_count
FROM   unified_audit_trail
WHERE  dbusername IN
       ('AVDF_D2_APP','AVDF_D2_READER')
GROUP  BY dbusername
ORDER  BY event_count DESC;
```

Contoh:

```text
DBUSERNAME         EVENT_COUNT
------------------ -----------
AVDF_D2_READER              12
AVDF_D2_APP                   7
```

---

# Lab 59 — Count Failed Authentication

```sql
SELECT dbusername,
       COUNT(*) AS failed_logins
FROM   unified_audit_trail
WHERE  action_name='LOGON'
AND    return_code <> 0
AND    dbusername='AVDF_D2_READER'
GROUP  BY dbusername;
```

Contoh:

```text
DBUSERNAME         FAILED_LOGINS
------------------ -------------
AVDF_D2_READER                 6
```

---

# PART O

# Central Audit Policy Lifecycle

Day 2 harus membuat peserta benar-benar memahami lifecycle berikut:

```text
Oracle Database
      │
      │ custom audit policy
      ▼
AVDF RETRIEVE
      │
      ▼
AVDF knows policy
      │
      ▼
AVDF ENABLE
      │
      ▼
Database policy enabled
      │
      ▼
Database activity
      │
      ▼
UNIFIED_AUDIT_TRAIL
      │
      ▼
AVDF collection
      │
      ▼
Report / Alert
```

---

# Lab 60 — Disable Policy Centrally

Sebagai demonstration:

```text
avcli> DISABLE UNIFIED AUDIT POLICY AVDF_D2_SCHEMA_CHANGES
        ON TARGET PDB1_26AI;
```

Expected:

```text
The job to provision audit policy is successfully submitted.
```

---

# Lab 61 — Verify Database State

Database:

```sql
SELECT policy_name,
       entity_name
FROM   audit_unified_enabled_policies
WHERE  policy_name='AVDF_D2_SCHEMA_CHANGES';
```

Expected setelah provisioning selesai:

```text
no rows selected
```

---

# Lab 62 — Re-enable Policy

AVCLI:

```text
avcli> ENABLE UNIFIED AUDIT POLICY AVDF_D2_SCHEMA_CHANGES
        ON TARGET PDB1_26AI
        FOR USERS 'AVDF_D2_APP';
```

Verify database:

```sql
SELECT policy_name,
       entity_name
FROM   audit_unified_enabled_policies
WHERE  policy_name='AVDF_D2_SCHEMA_CHANGES';
```

Expected:

```text
POLICY_NAME                  ENTITY_NAME
---------------------------- ----------------
AVDF_D2_SCHEMA_CHANGES       AVDF_D2_APP
```

Ini adalah demonstration yang sangat penting karena menunjukkan:

```text
AVDF ≠ hanya repository
```

AVDF juga dapat berfungsi sebagai centralized audit-policy management platform untuk Oracle Database.

---

# PART P

# Optional — Audit Vault Agent Track

Day 1 menggunakan **agentless collection** karena lebih sederhana untuk training.

Namun silabus asli secara eksplisit membahas:

```text
Registering Hosts
Deploying Audit Vault Agent
Activating Audit Vault Agent
```

Karena itu bagian ini sangat disarankan sebagai instructor demo atau optional student lab.

Oracle AVDF 20.9+ mengizinkan agentless collection untuk hingga 20 Oracle Database TABLE audit trails, tetapi Audit Vault Agent tetap merupakan arsitektur penting yang perlu dipahami.

---

# Lab 63 — Find Database Hostname

Database server:

```bash
hostname -s
```

Contoh:

```text
db26ai
```

Catat hasilnya.

Misalkan:

```text
db26ai
```

---

# Lab 64 — Register Agent Host

Pada AVCLI, ganti `db26ai` jika hostname aktual Anda berbeda.

```text
avcli> REGISTER HOST db26ai WITH IP 192.168.56.26;
```

Expected:

```text
Host db26ai registered successfully.
```

Oracle mendokumentasikan syntax:

```text
REGISTER HOST <host_name> WITH IP <ip_address>
```

---

# Lab 65 — Verify Host

```text
avcli> LIST HOST;
```

Expected terdapat:

```text
db26ai
```

---

# Lab 66 — Download Agent

Dari Audit Vault Server Console:

```text
Agents
   ↓
Agent Hosts
   ↓
Download Agent
```

Download:

```text
agent.jar
```

ke database host.

Misalkan disimpan:

```text
/home/oracle/agent.jar
```

---

# Lab 67 — Create Agent Home

Database host:

```bash
sudo su - oracle
```

```bash
mkdir -p /home/oracle/avdf_agent
```

Check Java:

```bash
$ORACLE_HOME/jdk/bin/java -version
```

Contoh:

```text
java version ...
```

---

# Lab 68 — Install Agent

```bash
$ORACLE_HOME/jdk/bin/java \
  -jar /home/oracle/agent.jar \
  -d /home/oracle/avdf_agent
```

Output bergantung AVDF release, tetapi installation harus selesai tanpa error.

---

# Lab 69 — Check Agent Files

```bash
ls -l /home/oracle/avdf_agent/bin
```

Harus terdapat:

```text
agentctl
```

---

# Lab 70 — Obtain Activation Key

Audit Vault Server Console:

```text
Agents
   ↓
Agents
   ↓
db26ai
```

Copy:

```text
Agent Activation Key
```

Format kira-kira:

```text
db26ai::XXXX-XXXX-XXXX-XXXX-XXXX
```

---

# Lab 71 — Activate Agent

Database server:

```bash
cd /home/oracle/avdf_agent/bin
```

Run:

```bash
./agentctl start -k
```

Prompt:

```text
Enter Activation Key:
```

Paste activation key.

Oracle mendokumentasikan initial activation menggunakan:

```text
agentctl start -k
```

dan activation key hanya diperlukan pada activation pertama.

---

# Lab 72 — Check Agent Status

```bash
./agentctl status
```

Expected:

```text
RUNNING
```

Output aktual bergantung release.

---

# Lab 73 — Normal Agent Operations

Stop:

```bash
./agentctl stop
```

Check:

```bash
./agentctl status
```

Expected:

```text
STOPPED
```

Start kembali:

```bash
./agentctl start
```

Check:

```bash
./agentctl status
```

Expected:

```text
RUNNING
```

Oracle meminta agent dimulai/dihentikan dengan OS account yang sama dengan account yang digunakan saat instalasi.

---

# Important

Kita **tidak perlu memindahkan Day 2 production trail dari agentless ke agent** hanya untuk membuktikan agent installation.

Tujuan optional lab ini:

```text
Understand
Register
Install
Activate
Start
Stop
Check
```

Audit trail Day 2 dapat tetap:

```text
agentless collection
```

agar lab tidak menjadi tidak stabil.

---

# PART Q

# Advanced Troubleshooting

---

# Lab 74 — Problem: Target Retrieval Fails

Pertama test database credential:

```bash
sqlplus -L 'avdfcollect/Oracle#AVDF26@//192.168.56.26:1521/PDB1'
```

Jika:

```text
Connected.
```

credential valid.

Jika:

```text
ORA-01017
```

reset target password.

SYS:

```sql
ALTER USER avdfcollect
IDENTIFIED BY "Oracle#AVDF26"
ACCOUNT UNLOCK;
```

---

# Lab 75 — Check PDB Service

```bash
lsnrctl status
```

Pastikan:

```text
PDB1
```

terdaftar.

---

# Lab 76 — Check AVDF User

```sql
ALTER SESSION SET CONTAINER=PDB1;

SELECT username,
       account_status
FROM   dba_users
WHERE  username='AVDFCOLLECT';
```

Expected:

```text
AVDFCOLLECT OPEN
```

---

# Lab 77 — Check Audit Setup

Pastikan target setup script dari AVDF telah dijalankan seperti Day 1.

Jangan memperbaiki masalah dengan:

```sql
GRANT DBA TO AVDFCOLLECT;
```

AVDF menyediakan setup privilege script sendiri.

---

# Lab 78 — Problem: AVDF Report Empty

Check source:

```sql
SELECT COUNT(*)
FROM   unified_audit_trail
WHERE  dbusername='AVDF_D2_READER';
```

Jika:

```text
0
```

masalah ada pada auditing, bukan collection.

---

# Lab 79 — Check Audit Policy

```sql
SELECT policy_name,
       entity_name
FROM   audit_unified_enabled_policies
WHERE  policy_name='AVDF_D2_SENSITIVE_ACCESS';
```

Expected:

```text
AVDF_D2_SENSITIVE_ACCESS AVDF_D2_READER
```

---

# Lab 80 — Check Trail

AVCLI:

```text
avcli> LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

Jika:

```text
STOPPED
```

start:

```text
avcli> START COLLECTION FOR SECURED TARGET PDB1_26AI
        USING HOST 'agentless collection'
        FROM TABLE UNIFIED_AUDIT_TRAIL;
```

Jika:

```text
STOPPED_ERROR
```

investigasi:

```text
Target credentials
Network
Listener
Service
AVDFCOLLECT privilege
Audit trail configuration
```

AVDF sendiri dapat menghasilkan alert bila audit trail tetap berada pada `STOPPED_ERROR` setelah retry.

---

# PART R

# Day 2 Incident Challenge

Scenario:

> Security team menerima alert bahwa terdapat beberapa failed login terhadap `AVDF_D2_READER`. Beberapa menit kemudian account tersebut berhasil login dan mengakses `CUSTOMER_SECURE`.

Peserta harus membuktikan seluruh kejadian.

---

# Lab 81 — Find Authentication Timeline

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
ORDER  BY event_timestamp;
```

Cari urutan:

```text
FAIL
FAIL
FAIL
SUCCESS
```

---

# Lab 82 — Find Data Access After Login

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       action_name,
       object_schema,
       object_name,
       return_code,
       DBMS_LOB.SUBSTR(sql_text,100,1) sql_text
FROM   unified_audit_trail
WHERE  dbusername='AVDF_D2_READER'
AND    object_name='CUSTOMER_SECURE'
ORDER  BY event_timestamp;
```

---

# Lab 83 — Correlate Timeline

Peserta harus menghasilkan timeline seperti:

```text
15:10:20  Failed LOGON
15:10:22  Failed LOGON
15:10:24  Failed LOGON
15:11:03  Successful LOGON
15:11:16  SELECT CUSTOMER_SECURE
15:11:40  UPDATE CUSTOMER_SECURE
15:12:01  LOGOFF
```

---

# Lab 84 — Investigate Centrally in AVDF

AVDF All Activity Report.

Filter:

```text
Target = PDB1_26AI

User =
AVDF_D2_READER
```

Sort:

```text
Event Time ascending
```

Peserta harus merekonstruksi kejadian yang sama tanpa query database secara langsung.

Inilah salah satu value utama Audit Vault:

```text
central investigation
```

---

# PART S

# Day 2 Final Architecture

Setelah Day 2, arsitektur yang dipahami peserta menjadi:

```text
                          AUDITOR
                             │
                             ▼
                 ┌──────────────────────┐
                 │ AUDIT VAULT SERVER   │
                 │                      │
                 │ Target Management    │
                 │ Audit Policies       │
                 │ Retention            │
                 │ Collection           │
                 │ Alerts               │
                 │ Reports              │
                 │ Investigation        │
                 └──────────▲───────────┘
                            │
                     Audit Collection
                            │
             ┌──────────────┴─────────────┐
             │                            │
      Agentless Collection         Audit Vault Agent
             │                      (optional lab)
             │                            │
             └──────────────┬─────────────┘
                            ▼
               ┌────────────────────────┐
               │ Oracle AI DB 26ai      │
               │                        │
               │ PDB1                   │
               │                        │
               │ Unified Audit Policies │
               │          │             │
               │          ▼             │
               │ UNIFIED_AUDIT_TRAIL    │
               │                        │
               └────────────────────────┘
```

---

# PART T

# Day 2 Final Checkpoint

Database:

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Check users:

```sql
SELECT username,
       account_status
FROM   dba_users
WHERE  username IN
       ('AVDFCOLLECT',
        'AVDF_DEMO',
        'AVDF_D2_APP',
        'AVDF_D2_READER')
ORDER  BY username;
```

Expected:

```text
USERNAME             ACCOUNT_STATUS
-------------------- --------------------
AVDFCOLLECT          OPEN
AVDF_DEMO            OPEN
AVDF_D2_APP          OPEN
AVDF_D2_READER       OPEN
```

---

Check policies:

```sql
SELECT policy_name,
       entity_name,
       success,
       failure
FROM   audit_unified_enabled_policies
WHERE  policy_name LIKE 'AVDF_D2%'
ORDER  BY policy_name;
```

Expected:

```text
POLICY_NAME                  ENTITY_NAME       SUCCESS FAILURE
---------------------------- ----------------- ------- -------
AVDF_D2_SCHEMA_CHANGES       AVDF_D2_APP       YES     YES
AVDF_D2_SENSITIVE_ACCESS     AVDF_D2_READER    YES     YES
```

---

Check sensitive activity:

```sql
SELECT dbusername,
       action_name,
       object_name,
       return_code
FROM   unified_audit_trail
WHERE  dbusername IN
       ('AVDF_D2_APP','AVDF_D2_READER')
ORDER  BY event_timestamp DESC
FETCH FIRST 20 ROWS ONLY;
```

Expected terdapat:

```text
AVDF_D2_READER  SELECT
AVDF_D2_READER  UPDATE

AVDF_D2_APP     CREATE TABLE
AVDF_D2_APP     ALTER TABLE
AVDF_D2_APP     DROP TABLE

AVDF_D2_READER  LOGON  1017
AVDF_D2_READER  LOGON  0
```

---

AVDF checklist:

```text
PDB1_26AI
    Registered               YES

Retention Policy
    LAB_3M_ONLINE            Applied

UNIFIED_AUDIT_TRAIL
    Collection               RUNNING / IDLE

AVDF_D2_SENSITIVE_ACCESS
    Retrieved                YES
    Provisioned              YES

AVDF_D2_SCHEMA_CHANGES
    Retrieved                YES
    Provisioned              YES

LAB_FAILED_LOGIN
    Enabled                  YES

Activity Report
    Data visible             YES
```

---

# PART U

# Cleanup

Untuk melanjutkan ke Day 3:

```text
DO NOT CLEAN UP.
```

Object Day 2 sengaja dipertahankan karena akan berguna untuk:

```text
Day 3
Database Firewall / monitoring
atau
advanced AVDF investigation
```

Jika benar-benar ingin cleanup:

```sql
NOAUDIT POLICY avdf_d2_sensitive_access BY avdf_d2_reader;
NOAUDIT POLICY avdf_d2_schema_changes BY avdf_d2_app;

DROP AUDIT POLICY avdf_d2_sensitive_access;
DROP AUDIT POLICY avdf_d2_schema_changes;

DROP USER avdf_d2_reader CASCADE;
DROP USER avdf_d2_app CASCADE;
```

Expected:

```text
Noaudit succeeded.

Audit policy dropped.

User dropped.
```

Jangan drop:

```text
AVDFCOLLECT
```

karena masih dibutuhkan AVDF.

---

# Day 2 Main Lessons

Peserta sekarang harus memahami bahwa Audit Vault memiliki beberapa fungsi berbeda:

```text
1. TARGET MANAGEMENT

2. AUDIT COLLECTION

3. CENTRAL REPOSITORY

4. RETENTION

5. AUDIT POLICY MANAGEMENT

6. REPORTING

7. ALERTING

8. INVESTIGATION
```

Hubungan keseluruhannya:

```text
                     AVDF
                      │
       ┌──────────────┼───────────────┐
       │              │               │
       ▼              ▼               ▼
   Configure       Collect         Monitor
       │              │               │
       ▼              ▼               ▼
Audit Policies   Audit Records      Alerts
       │              │               │
       └──────────┬───┴───────────────┘
                  ▼
             Investigation
                  │
                  ▼
               Reports
```

Audit Vault bukan pengganti Oracle auditing.

Audit Vault mengelola dan memanfaatkan auditing yang dilakukan oleh database:

```text
Oracle Database
      ↓
Unified Auditing
      ↓
Audit Records
      ↓
Audit Vault
      ↓
Central Monitoring
      ↓
Alert
      ↓
Investigation
      ↓
Report
```

# Day 2 Final Outcome

Pada akhir Day 2 peserta telah melihat siklus lengkap:

```text
CREATE AUDIT POLICY
        ↓
RETRIEVE INTO AVDF
        ↓
ENABLE FROM AVDF
        ↓
DATABASE POLICY ACTIVE
        ↓
USER ACTIVITY
        ↓
UNIFIED_AUDIT_TRAIL
        ↓
AVDF COLLECTION
        ↓
CENTRAL REPORT
        ↓
ALERT
        ↓
INVESTIGATION
```

Ini merupakan fondasi penting sebelum masuk ke sisi **Database Firewall / database network activity monitoring** pada hari berikutnya.
