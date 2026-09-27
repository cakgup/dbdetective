# DAY 1 HANDS-ON LAB

# Oracle Audit Vault and Database Firewall Fundamentals & Preparing Oracle AI Database 26ai as a Secured Target

---

## 1. Lab Environment

Lab ini menggunakan environment berikut:

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

PDB1        : READ WRITE

Sample Schema
-------------
HR          : installed
HR password : oracle
EMPLOYEES   : 107 rows
```

Koneksi database:

```bash
sqlplus system/oracle@192.168.56.26:1521/pdb1
```

atau:

```bash
sqlplus hr/oracle@192.168.56.26:1521/pdb1
```

---

# 2. AVDF Version Baseline

Untuk training Oracle AI Database 26ai ini, gunakan:

```text
Oracle Audit Vault and Database Firewall 20.18
atau versi yang lebih baru
```

Oracle support matrix saat ini mencantumkan Oracle Database 26ai Enterprise dan Standard Edition sebagai supported target mulai Oracle AVDF 20.18.

---

# 3. Day 1 Learning Objectives

Setelah menyelesaikan Day 1, peserta diharapkan mampu:

1. Menjelaskan fungsi Oracle Audit Vault and Database Firewall.
2. Menjelaskan perbedaan Audit Vault Server dan Database Firewall.
3. Menjelaskan konsep secured target.
4. Menjelaskan bagaimana audit records bergerak dari Oracle Database menuju Audit Vault Server.
5. Memahami hubungan Unified Auditing dan Audit Vault.
6. Memverifikasi Unified Auditing pada Oracle AI Database 26ai.
7. Membuat audit records sebagai sumber data AVDF.
8. Memahami perbedaan `UNIFIED_AUDIT_TRAIL` dan `CDB_UNIFIED_AUDIT_TRAIL`.
9. Menentukan strategi target PDB versus CDB.
10. Menyiapkan dedicated AVDF database account.
11. Menyiapkan seluruh parameter yang diperlukan untuk registration target.
12. Memahami `oracle_user_setup.sql`.
13. Memahami agent-based dan agentless collection.
14. Menyiapkan PDB1 untuk dikoleksi oleh Audit Vault Server.
15. Memahami proses end-to-end:

```text
Database Activity
        ↓
Unified Auditing
        ↓
UNIFIED_AUDIT_TRAIL
        ↓
AVDF Collector
        ↓
Audit Vault Server
        ↓
Monitoring
        ↓
Reporting
        ↓
Investigation
```

---

# 4. Recommended Day 1 Schedule

| Waktu       | Materi                                 |
| ----------- | -------------------------------------- |
| 09:00–09:30 | Introduction to AVDF                   |
| 09:30–10:00 | AVDF Architecture                      |
| 10:00–10:45 | Validate Oracle 26ai Environment       |
| 10:45–12:00 | Unified Audit as AVDF Data Source      |
| 13:00–14:00 | Generate and Investigate Audit Records |
| 14:00–14:45 | CDB/PDB Audit Collection Strategy      |
| 14:45–15:30 | Prepare AVDF Target Account            |
| 15:30–16:15 | Target Registration Design             |
| 16:15–16:45 | Agent vs Agentless Collection          |
| 16:45–17:00 | End-to-End Review                      |

---

# PART A

# Understanding Oracle AVDF Architecture

---

# Lab 1 — Understanding AVDF Components

Oracle AVDF memiliki dua komponen utama:

```text
Oracle Audit Vault
+
Oracle Database Firewall
```

Secara konseptual:

```text
                 ORACLE AVDF
                     
             ┌─────────────────┐
             │ Audit Vault     │
             │ Server          │
             └───────▲─────────┘
                     │
                     │ audit records
                     │
        ┌────────────┴────────────┐
        │                         │
        │                         │
 ┌──────┴──────┐          ┌───────┴───────┐
 │ Oracle      │          │ Database      │
 │ Database    │          │ Firewall      │
 │ Target      │          │               │
 └─────────────┘          └───────▲───────┘
                                  │
                                  │ SQL traffic
                                  │
                               Clients
```

---

## 1.1 Audit Vault Server

Audit Vault Server berfungsi sebagai centralized repository untuk:

```text
Collect
Store
Monitor
Analyze
Report
Alert
Retain
Archive
```

audit information dari target-target database.

Dalam lab kita:

```text
Secured Target
=============

PDB1
Oracle AI Database 26ai
192.168.56.26:1521/PDB1
```

---

## 1.2 Database Firewall

Database Firewall berbeda dari Audit Vault.

Audit Vault terutama berhubungan dengan:

```text
AUDIT DATA
```

sedangkan Database Firewall berhubungan dengan:

```text
DATABASE NETWORK ACTIVITY
```

Konsep sederhana:

```text
Application
     │
     │ SQL
     ▼
Database Firewall
     │
     │ SQL
     ▼
Oracle Database
```

Day 1 belum melakukan deployment Database Firewall.

Fokus Day 1 adalah:

```text
Oracle Database
       ↓
Audit data
       ↓
Audit Vault
```

---

# Lab 2 — Understanding the AVDF Audit Collection Flow

Untuk Oracle 26ai, salah satu sumber audit terpenting adalah:

```text
UNIFIED_AUDIT_TRAIL
```

Arsitekturnya:

```text
User
 │
 │ SQL
 ▼
Oracle AI Database 26ai
 │
 │
 ▼
Unified Audit Policy
 │
 ▼
Unified Audit Record
 │
 ▼
UNIFIED_AUDIT_TRAIL
 │
 │ AVDF audit collection
 ▼
Audit Vault Server
```

Dengan multitenant:

```text
ORCLCDB
│
├── CDB$ROOT
│
└── PDB1
     │
     ▼
UNIFIED_AUDIT_TRAIL
```

Untuk training ini kita akan memilih:

```text
Target        : PDB1
Audit Trail   : UNIFIED_AUDIT_TRAIL
```

Pendekatan ini sederhana karena semua activity yang kita gunakan berada di PDB1.

---

# PART B

# Validate the Oracle 26ai Environment

---

# Lab 3 — Login sebagai Oracle OS User

Login ke server:

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

Verifikasi:

```bash
echo $ORACLE_BASE
echo $ORACLE_HOME
echo $ORACLE_SID
which sqlplus
```

Contoh output:

```text
/opt/oracle
/opt/oracle/product/26ai/dbhome_1
ORCLCDB
/opt/oracle/product/26ai/dbhome_1/bin/sqlplus
```

---

# Lab 4 — Check Listener

Jalankan:

```bash
lsnrctl status
```

Contoh bagian output:

```text
LSNRCTL for Linux: Version 23.0.0.0.0

Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.56.26)(PORT=1521)))

STATUS of the LISTENER
------------------------
Alias                     LISTENER
Protocol                  TCP
Port                      1521
Status                    READY
```

Cari service `PDB1`.

Output dapat terlihat seperti:

```text
Service "pdb1" has 1 instance(s).
  Instance "ORCLCDB", status READY, has 1 handler(s) for this service...
```

Yang penting adalah:

```text
PDB1 service registered
Listener port = 1521
```

---

# Lab 5 — Test Network Database Connection

Jalankan:

```bash
sqlplus -L system/oracle@//192.168.56.26:1521/PDB1
```

Contoh output:

```text
SQL*Plus: Release 23.0.0.0.0

Connected to:
Oracle AI Database 26ai Enterprise Edition

SQL>
```

Keluar:

```sql
EXIT
```

Jika ini berhasil, maka nantinya Audit Vault Server secara prinsip dapat menggunakan Oracle Net/JDBC untuk mencapai target yang sama, asalkan routing dan firewall OS mengizinkannya.

---

# Lab 6 — Verify Database Version

Masuk:

```bash
sqlplus / as sysdba
```

Jalankan:

```sql
SET LINESIZE 200
SET PAGESIZE 100

SELECT banner_full
FROM   v$version;
```

Contoh output:

```text
BANNER_FULL
--------------------------------------------------------------------------------
Oracle AI Database 26ai Enterprise Edition Release 23.0.0.0.0 - Production
Version 23.26.1.0.0
```

Nomor banner minor dapat sedikit berbeda tergantung RU yang terpasang.

---

# Lab 7 — Verify CDB and PDB

Jalankan:

```sql
SHOW CON_NAME
```

Expected:

```text
CON_NAME
------------------------------
CDB$ROOT
```

Kemudian:

```sql
SHOW PDBS
```

Contoh:

```text
    CON_ID CON_NAME                       OPEN MODE  RESTRICTED
---------- ------------------------------ ---------- ----------
         2 PDB$SEED                       READ ONLY  NO
         3 PDB1                           READ WRITE NO
```

Pastikan:

```text
PDB1 = READ WRITE
```

---

# PART C

# Unified Auditing as the Source for Audit Vault

Oracle AI Database 26ai menggunakan Unified Auditing sebagai auditing architecture utama.

AVDF tidak "menciptakan" audit event Oracle Database.

Oracle Database terlebih dahulu menghasilkan audit record.

AVDF kemudian:

```text
collects
centralizes
stores
analyzes
reports
```

record tersebut.

---

# Lab 8 — Switch to PDB1

Masih sebagai SYS:

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Output:

```text
Session altered.
```

Check:

```sql
SHOW CON_NAME
```

Expected:

```text
CON_NAME
------------------------------
PDB1
```

---

# Lab 9 — Verify Unified Auditing

Jalankan:

```sql
SELECT parameter,
       value
FROM   v$option
WHERE  parameter = 'Unified Auditing';
```

Expected:

```text
PARAMETER                       VALUE
------------------------------  --------------------
Unified Auditing                TRUE
```

Jika:

```text
TRUE
```

maka Unified Auditing aktif.

---

# Lab 10 — Examine Predefined Audit Policies

Jalankan:

```sql
SET LINESIZE 220
SET PAGESIZE 200

COLUMN policy_name FORMAT A35
COLUMN oracle_supplied FORMAT A15

SELECT DISTINCT
       policy_name,
       oracle_supplied
FROM   audit_unified_policies
ORDER  BY policy_name;
```

Contoh potongan output:

```text
POLICY_NAME                         ORACLE_SUPPLIED
----------------------------------- ---------------
ORA_LOGIN_LOGOUT                    YES
ORA_SECURECONFIG                    YES
ORA_STIG_RECOMMENDATIONS            YES
...
```

Jumlah policy dapat berbeda tergantung release.

---

# Lab 11 — Check Enabled Policies

Jalankan:

```sql
COLUMN policy_name    FORMAT A30
COLUMN enabled_option FORMAT A20
COLUMN entity_name    FORMAT A20
COLUMN entity_type    FORMAT A15
COLUMN success        FORMAT A10
COLUMN failure        FORMAT A10

SELECT policy_name,
       enabled_option,
       entity_name,
       entity_type,
       success,
       failure
FROM   audit_unified_enabled_policies
ORDER  BY policy_name,
          entity_name;
```

Contoh output:

```text
POLICY_NAME          ENABLED_OPTION ENTITY_NAME ENTITY_TYPE SUCCESS FAILURE
-------------------- -------------- ----------- ----------- ------- -------
ORA_LOGIN_LOGOUT     BY USER        ALL USERS   USER        YES     YES
ORA_SECURECONFIG     BY USER        ALL USERS   USER        YES     YES
```

Hasil aktual dapat berbeda jika database berasal dari upgrade atau sebelumnya telah dikustomisasi.

---

# Lab 12 — Check Existing Unified Audit Records

Jalankan:

```sql
SELECT COUNT(*) AS audit_records
FROM   unified_audit_trail;
```

Contoh:

```text
AUDIT_RECORDS
-------------
          326
```

Jumlah akan berbeda pada setiap environment.

Yang penting:

```text
query berhasil
```

---

# Lab 13 — Inspect Latest Audit Records

Gunakan:

```sql
SET LINESIZE 250
SET PAGESIZE 100

COLUMN event_time     FORMAT A19
COLUMN dbusername     FORMAT A15
COLUMN action_name    FORMAT A25
COLUMN object_schema  FORMAT A15
COLUMN object_name    FORMAT A25
COLUMN return_code    FORMAT 999999

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') AS event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code
FROM   unified_audit_trail
ORDER  BY event_timestamp DESC
FETCH FIRST 15 ROWS ONLY;
```

Contoh:

```text
EVENT_TIME          DBUSERNAME ACTION_NAME          OBJECT_SCHEMA OBJECT_NAME RETURN_CODE
------------------- ---------- -------------------- ------------- ----------- -----------
2026-09-13 09:52:14 SYS        ALTER SESSION                                 0
2026-09-13 09:51:51 SYSTEM     LOGON                                         0
2026-09-13 09:51:02 SYS        LOGON                                         0
```

Oracle error code:

```text
RETURN_CODE = 0
```

berarti operation berhasil.

Non-zero berarti operation gagal.

---

# PART D

# Generate Controlled Audit Data

Sekarang kita membuat activity khusus agar nantinya sangat mudah dikenali ketika AVDF melakukan collection.

---

# Lab 14 — Create Training User

Sebagai SYS di `PDB1`:

```sql
CREATE USER avdf_demo
IDENTIFIED BY "Oracle#26Lab1";
```

Expected:

```text
User created.
```

Grant login:

```sql
GRANT CREATE SESSION TO avdf_demo;
```

Expected:

```text
Grant succeeded.
```

Berikan read access ke HR.EMPLOYEES:

```sql
GRANT SELECT ON hr.employees TO avdf_demo;
```

Expected:

```text
Grant succeeded.
```

---

# Lab 15 — Verify User

Jalankan:

```sql
COLUMN username FORMAT A20
COLUMN account_status FORMAT A20

SELECT username,
       account_status
FROM   dba_users
WHERE  username = 'AVDF_DEMO';
```

Expected:

```text
USERNAME             ACCOUNT_STATUS
-------------------- --------------------
AVDF_DEMO            OPEN
```

---

# Lab 16 — Create Audit Policy for HR.EMPLOYEES

Kita ingin memonitor access terhadap sample sensitive object:

```text
HR.EMPLOYEES
```

Buat policy:

```sql
CREATE AUDIT POLICY avdf_day1_hr_access
  ACTIONS SELECT ON hr.employees;
```

Expected:

```text
Audit policy created.
```

Enable hanya untuk training user:

```sql
AUDIT POLICY avdf_day1_hr_access
BY avdf_demo;
```

Expected:

```text
Audit succeeded.
```

---

# Lab 17 — Verify the Policy Definition

Jalankan:

```sql
COLUMN policy_name    FORMAT A30
COLUMN audit_option   FORMAT A20
COLUMN object_schema  FORMAT A15
COLUMN object_name    FORMAT A20

SELECT policy_name,
       audit_option,
       object_schema,
       object_name
FROM   audit_unified_policies
WHERE  policy_name = 'AVDF_DAY1_HR_ACCESS';
```

Expected:

```text
POLICY_NAME                  AUDIT_OPTION OBJECT_SCHEMA OBJECT_NAME
---------------------------- ------------ ------------- --------------------
AVDF_DAY1_HR_ACCESS          SELECT       HR            EMPLOYEES
```

---

# Lab 18 — Verify Policy Is Enabled

Jalankan:

```sql
SELECT policy_name,
       entity_name,
       entity_type,
       success,
       failure
FROM   audit_unified_enabled_policies
WHERE  policy_name = 'AVDF_DAY1_HR_ACCESS';
```

Expected:

```text
POLICY_NAME                  ENTITY_NAME ENTITY_TYPE SUCCESS FAILURE
---------------------------- ----------- ----------- ------- -------
AVDF_DAY1_HR_ACCESS          AVDF_DEMO   USER        YES     YES
```

---

# Lab 19 — Generate Audited Activity

Buka terminal kedua.

Login:

```bash
sqlplus -L 'avdf_demo/Oracle#26Lab1@//192.168.56.26:1521/PDB1'
```

Expected:

```text
Connected to:
Oracle AI Database 26ai Enterprise Edition
```

Jalankan:

```sql
SELECT COUNT(*)
FROM   hr.employees;
```

Expected:

```text
  COUNT(*)
----------
       107
```

Kemudian:

```sql
COLUMN first_name FORMAT A15
COLUMN last_name FORMAT A20

SELECT employee_id,
       first_name,
       last_name
FROM   hr.employees
FETCH FIRST 5 ROWS ONLY;
```

Contoh:

```text
EMPLOYEE_ID FIRST_NAME      LAST_NAME
----------- --------------- --------------------
        100 Steven          King
        101 Neena           Kochhar
        102 Lex             De Haan
        103 Alexander       Hunold
        104 Bruce           Ernst
```

Logout:

```sql
EXIT
```

---

# Lab 20 — Find the Audit Records

Kembali ke SYS session.

Jalankan:

```sql
SET LINESIZE 250

COLUMN event_time FORMAT A19
COLUMN dbusername FORMAT A15
COLUMN action_name FORMAT A15
COLUMN object_schema FORMAT A15
COLUMN object_name FORMAT A20
COLUMN policy FORMAT A30

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code,
       unified_audit_policies policy
FROM   unified_audit_trail
WHERE  dbusername = 'AVDF_DEMO'
AND    unified_audit_policies LIKE '%AVDF_DAY1_HR_ACCESS%'
ORDER  BY event_timestamp DESC;
```

Contoh:

```text
EVENT_TIME          DBUSERNAME ACTION_NAME OBJECT_SCHEMA OBJECT_NAME RETURN_CODE POLICY
------------------- ---------- ----------- ------------- ----------- ----------- --------------------
2026-09-13 10:43:21 AVDF_DEMO  SELECT      HR            EMPLOYEES            0 AVDF_DAY1_HR_ACCESS
2026-09-13 10:43:15 AVDF_DEMO  SELECT      HR            EMPLOYEES            0 AVDF_DAY1_HR_ACCESS
```

Ini adalah jenis data yang nantinya dapat dikoleksi AVDF.

---

# Lab 21 — Display SQL Text

Jalankan:

```sql
SET LONG 2000
SET LINESIZE 250

COLUMN event_time FORMAT A19
COLUMN sql_text FORMAT A100

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       action_name,
       DBMS_LOB.SUBSTR(sql_text,100,1) sql_text
FROM   unified_audit_trail
WHERE  dbusername = 'AVDF_DEMO'
AND    unified_audit_policies LIKE '%AVDF_DAY1_HR_ACCESS%'
ORDER  BY event_timestamp DESC;
```

Contoh:

```text
EVENT_TIME          ACTION_NAME SQL_TEXT
------------------- ----------- ---------------------------------------------------------
2026-09-13 10:43:21 SELECT      SELECT employee_id, first_name, last_name FROM hr.employees...
2026-09-13 10:43:15 SELECT      SELECT COUNT(*) FROM hr.employees
```

Sekarang peserta dapat melihat bahwa audit trail bukan sekadar:

```text
"AVDF_DEMO melakukan SELECT"
```

tetapi juga menyimpan contextual information yang diperlukan untuk investigation.

---

# PART E

# Audit Authentication Activity

Authentication adalah salah satu event paling penting bagi detective controls.

---

# Lab 22 — Create Dedicated Login Audit Policy

Buat:

```sql
CREATE AUDIT POLICY avdf_day1_login
  ACTIONS LOGON, LOGOFF;
```

Expected:

```text
Audit policy created.
```

Enable:

```sql
AUDIT POLICY avdf_day1_login;
```

Expected:

```text
Audit succeeded.
```

Policy ini diterapkan untuk semua users pada container PDB1.

---

# Lab 23 — Generate Successful Login

Dari shell:

```bash
sqlplus -L 'avdf_demo/Oracle#26Lab1@//192.168.56.26:1521/PDB1'
```

Kemudian:

```sql
SELECT USER FROM dual;
EXIT
```

Expected:

```text
USER
------------------------------
AVDF_DEMO
```

---

# Lab 24 — Generate Failed Login

Jalankan:

```bash
sqlplus -L 'avdf_demo/WrongPassword@//192.168.56.26:1521/PDB1'
```

Expected:

```text
ERROR:
ORA-01017: invalid username/password; logon denied
```

Ini adalah security event yang penting.

---

# Lab 25 — Investigate Authentication Events

Sebagai SYS:

```sql
COLUMN event_time FORMAT A19
COLUMN dbusername FORMAT A15
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
WHERE  dbusername = 'AVDF_DEMO'
AND    action_name IN ('LOGON','LOGOFF')
ORDER  BY event_timestamp DESC;
```

Contoh:

```text
EVENT_TIME          DBUSERNAME ACTION_NAME RETURN_CODE USERHOST       CLIENT_PROGRAM_NAME
------------------- ---------- ----------- ----------- -------------- -------------------
2026-09-13 11:03:11 AVDF_DEMO  LOGON              1017 db26ai         sqlplus
2026-09-13 11:02:54 AVDF_DEMO  LOGOFF                0 db26ai         sqlplus
2026-09-13 11:02:40 AVDF_DEMO  LOGON                 0 db26ai         sqlplus
```

Interpretasi:

```text
RETURN_CODE = 0
    successful

RETURN_CODE = 1017
    ORA-01017
    invalid username/password
```

---

# PART F

# Understand PDB versus CDB Audit Collection

AVDF dapat dikonfigurasi untuk mengambil audit data per-PDB atau dari CDB.

Ini penting untuk multitenant architecture.

---

# Lab 26 — View PDB-local Audit Records

Saat berada di:

```text
PDB1
```

jalankan:

```sql
SHOW CON_NAME
```

Expected:

```text
PDB1
```

Kemudian:

```sql
SELECT COUNT(*)
FROM   unified_audit_trail
WHERE  dbusername = 'AVDF_DEMO';
```

Contoh:

```text
  COUNT(*)
----------
         8
```

Ini hanya melihat audit data PDB1.

---

# Lab 27 — View Audit Records from CDB Root

Switch:

```sql
ALTER SESSION SET CONTAINER=CDB$ROOT;
```

Check:

```sql
SHOW CON_NAME
```

Expected:

```text
CDB$ROOT
```

Sekarang gunakan:

```sql
CDB_UNIFIED_AUDIT_TRAIL
```

Jalankan:

```sql
SET LINESIZE 250

COLUMN con_name FORMAT A15
COLUMN dbusername FORMAT A15
COLUMN action_name FORMAT A20

SELECT c.name AS con_name,
       u.dbusername,
       u.action_name,
       u.return_code
FROM   cdb_unified_audit_trail u
JOIN   v$containers c
ON     c.con_id = u.con_id
WHERE  u.dbusername = 'AVDF_DEMO'
ORDER  BY u.event_timestamp DESC;
```

Contoh:

```text
CON_NAME        DBUSERNAME      ACTION_NAME          RETURN_CODE
--------------- --------------- -------------------- -----------
PDB1            AVDF_DEMO       LOGON                       1017
PDB1            AVDF_DEMO       SELECT                         0
PDB1            AVDF_DEMO       SELECT                         0
```

---

# Lab 28 — Decide Collection Architecture

Oracle AVDF memungkinkan dua pola.

## Approach A — Per-PDB Collection

```text
PDB1
 │
 ▼
UNIFIED_AUDIT_TRAIL
 │
 ▼
AVDF
```

Target:

```text
PDB1_26AI
```

Trail:

```text
UNIFIED_AUDIT_TRAIL
```

Ini yang kita pilih untuk lab.

Keuntungannya:

```text
Simple
Easy to understand
Easy to troubleshoot
Lower audit volume
PDB isolation
```

---

## Approach B — CDB-wide Collection

```text
ORCLCDB
 │
 ▼
CDB_UNIFIED_AUDIT_TRAIL
 │
 ├── CDB$ROOT
 ├── PDB1
 ├── PDB2
 └── ...
 │
 ▼
AVDF
```

Lebih cocok apabila banyak PDB perlu dikoleksi secara terpusat.

Untuk environment training ini:

```text
1 CDB
1 PDB
```

maka kita gunakan:

```text
PDB target
+
UNIFIED_AUDIT_TRAIL
```

---

# PART G

# Prepare Dedicated AVDF Target Account

Audit Vault membutuhkan database account ketika AVDF perlu mengakses database target untuk audit collection dan fungsi management tertentu.

Jangan gunakan:

```text
SYS
SYSTEM
HR
```

sebagai AVDF service account.

Kita buat dedicated account.

---

# Lab 29 — Create AVDF Collection User

Switch kembali:

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Check:

```sql
SHOW CON_NAME
```

Expected:

```text
PDB1
```

Buat account:

```sql
CREATE USER avdfcollect
IDENTIFIED BY "Oracle#AVDF26";
```

Expected:

```text
User created.
```

---

# Lab 30 — Verify AVDF Account

Jalankan:

```sql
COLUMN username FORMAT A20
COLUMN account_status FORMAT A20
COLUMN profile FORMAT A20

SELECT username,
       account_status,
       profile
FROM   dba_users
WHERE  username = 'AVDFCOLLECT';
```

Expected:

```text
USERNAME             ACCOUNT_STATUS       PROFILE
-------------------- -------------------- --------------------
AVDFCOLLECT          OPEN                 DEFAULT
```

---

# Important: Do NOT Manually Guess the Required Grants

Pada titik ini:

```text
AVDFCOLLECT exists
```

tetapi belum memiliki AVDF target privileges.

Jangan melakukan sesuatu seperti:

```text
GRANT DBA TO AVDFCOLLECT;
```

atau:

```text
GRANT SELECT ANY DICTIONARY TO AVDFCOLLECT;
```

hanya untuk "membuatnya bekerja".

Oracle AVDF menyediakan target setup scripts yang menetapkan privileges sesuai kebutuhan produk.

---

# PART H

# AVDF Target Setup Script

Bagian berikut dijalankan setelah Anda memiliki Audit Vault Server.

Dari Audit Vault Server:

```text
Targets
  ↓
Target Setup Script
  ↓
Download
```

Salah satu script penting adalah:

```text
oracle_user_setup.sql
```

Untuk standard audit collection dan audit policy management, Oracle menyediakan mode:

```text
SETUP
```

Command nantinya adalah:

```sql
@oracle_user_setup.sql AVDFCOLLECT SETUP
```

---

# Lab 31 — Run Target Setup Script

**Jalankan section ini hanya jika file `oracle_user_setup.sql` sudah diperoleh dari Audit Vault Server.**

Misalkan file disimpan di:

```text
/home/oracle/avdf_setup/oracle_user_setup.sql
```

Masuk:

```bash
sqlplus / as sysdba
```

Kemudian:

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Expected:

```text
Session altered.
```

Run:

```sql
@/home/oracle/avdf_setup/oracle_user_setup.sql AVDFCOLLECT SETUP
```

Script akan memberikan privileges yang diperlukan oleh AVDF untuk mode `SETUP`.

Output persis dapat berbeda antar release AVDF.

Yang penting script selesai tanpa `ORA-` error.

---

# Lab 32 — Inspect Granted Roles

Setelah script selesai:

```sql
COLUMN granted_role FORMAT A35

SELECT granted_role
FROM   dba_role_privs
WHERE  grantee = 'AVDFCOLLECT'
ORDER  BY granted_role;
```

Kemudian:

```sql
COLUMN privilege FORMAT A40

SELECT privilege
FROM   dba_sys_privs
WHERE  grantee = 'AVDFCOLLECT'
ORDER  BY privilege;
```

Jangan membandingkan output dengan daftar grant statis dari versi AVDF lain.

Oracle dapat mengubah privilege requirements berdasarkan release.

Yang menjadi authoritative source adalah:

```text
oracle_user_setup.sql
```

yang berasal dari Audit Vault Server Anda sendiri.

---

# Lab 33 — Test AVDF Account Login

Setelah setup script dijalankan:

```bash
sqlplus -L 'avdfcollect/Oracle#AVDF26@//192.168.56.26:1521/PDB1'
```

Expected:

```text
Connected to:
Oracle AI Database 26ai Enterprise Edition
```

Test:

```sql
SELECT SYS_CONTEXT('USERENV','SESSION_USER') session_user,
       SYS_CONTEXT('USERENV','CON_NAME') con_name
FROM   dual;
```

Expected:

```text
SESSION_USER    CON_NAME
--------------- ----------
AVDFCOLLECT     PDB1
```

---

# PART I

# Build the AVDF Target Registration Worksheet

Sebelum melakukan registration di Audit Vault Server, kumpulkan parameter berikut.

---

# Lab 34 — Get Database Host Name

Dari OS:

```bash
hostname
```

Contoh:

```text
db26ai
```

Lebih penting untuk lab ini adalah IP:

```text
192.168.56.26
```

---

# Lab 35 — Get Database Service

Sebagai SYS:

```sql
SHOW PARAMETER service_names
```

dan:

```sql
SELECT name
FROM   v$services
ORDER  BY name;
```

Cari service:

```text
PDB1
```

---

# Lab 36 — Build JDBC Connect String

Untuk environment kita:

```text
Host    : 192.168.56.26
Port    : 1521
Service : PDB1
```

maka JDBC URL:

```text
jdbc:oracle:thin:@//192.168.56.26:1521/PDB1
```

---

# Lab 37 — Final Registration Worksheet

Gunakan parameter berikut nanti pada Audit Vault Server:

```text
Target Name
===========
PDB1_26AI


Target Type
===========
Oracle Database


Database Host
=============
192.168.56.26


Port
====
1521


Service
=======
PDB1


JDBC Connect String
===================
jdbc:oracle:thin:@//192.168.56.26:1521/PDB1


Target Database User
====================
AVDFCOLLECT


Audit Trail Type
================
TABLE


Audit Trail Location
====================
UNIFIED_AUDIT_TRAIL


Preferred Training Collection
=============================
Agentless Collection
```

---

# PART J

# Register the Target on Audit Vault Server

Section ini tidak dijalankan pada database VM.

Ia dilakukan pada:

```text
Audit Vault Server
```

---

# Lab 38 — Register Target Using AVDF Console

Login ke Audit Vault Server sebagai administrator.

Masuk:

```text
Targets
```

Register target baru.

Gunakan:

```text
Name:
PDB1_26AI

Type:
Oracle Database

Host:
192.168.56.26

Port:
1521

Service:
PDB1

Connection:
jdbc:oracle:thin:@//192.168.56.26:1521/PDB1

Credential:
AVDFCOLLECT
```

Masukkan password:

```text
Oracle#AVDF26
```

saat AVDF memintanya.

---

# Lab 39 — Registration Using AVCLI

Alternatif CLI dari Audit Vault Server:

```text
REGISTER SECURED TARGET PDB1_26AI
OF SECURED TARGET TYPE "Oracle Database"
AT jdbc:oracle:thin:@//192.168.56.26:1521/PDB1
AUTHENTICATED BY AVDFCOLLECT;
```

AVCLI kemudian meminta password target user.

Masukkan password:

```text
Oracle#AVDF26
```

Contoh konsep hasil:

```text
Secured target PDB1_26AI registered successfully.
```

---

# Lab 40 — Verify Registered Targets

Di AVCLI:

```text
LIST SECURED TARGET;
```

Expected terdapat:

```text
PDB1_26AI
```

---

# PART K

# Agent-Based versus Agentless Audit Collection

AVDF mendukung dua pendekatan utama untuk Oracle table audit trail.

---

## Agent-Based

```text
Oracle DB
    │
    ▼
Audit Vault Agent
    │
    ▼
Audit Vault Server
```

Agent di-install pada host yang dapat mengakses target.

Keuntungan:

```text
traditional AVDF architecture
scalable collection architecture
local collection capability
```

---

## Agentless

```text
Oracle DB
    │
    │ JDBC
    ▼
Audit Vault Server
Agentless Collection Service
```

Tidak perlu install Audit Vault Agent pada database host.

Untuk lab sederhana dengan satu Oracle Database:

```text
Agentless
```

adalah pilihan yang sangat nyaman.

Oracle AVDF mendukung agentless collection untuk Oracle Database table trails, termasuk `UNIFIED_AUDIT_TRAIL`.

---

# Lab 41 — Configure Agentless Audit Trail

Pada AVDF Console:

```text
Targets
  ↓
PDB1_26AI
  ↓
Audit Data Collection
  ↓
Add
```

Isi:

```text
Audit Trail Type:
TABLE

Trail Location:
UNIFIED_AUDIT_TRAIL

Collection:
Agentless Collection
```

Save.

---

# Lab 42 — Start Collection Using AVCLI

Alternatif menggunakan AVCLI:

```text
START COLLECTION FOR SECURED TARGET PDB1_26AI
USING HOST 'agentless collection'
FROM TABLE UNIFIED_AUDIT_TRAIL;
```

Secara konsep status bergerak:

```text
START_REQUESTED
      ↓
STARTING
      ↓
RUNNING
```

atau ketika tidak ada backlog:

```text
IDLE
```

`IDLE` tidak otomatis berarti error.

Bisa berarti collector sudah tidak memiliki audit record baru yang perlu diproses.

---

# Lab 43 — Check Audit Trail Status

AVCLI:

```text
LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

Contoh conceptual output:

```text
AUDIT_TRAIL_TYPE : TABLE
HOST             : agentless collection
LOCATION         : UNIFIED_AUDIT_TRAIL
STATUS           : RUNNING
```

atau:

```text
STATUS : IDLE
```

Yang tidak diinginkan adalah:

```text
STOPPED_ERROR
```

---

# PART L

# End-to-End Collection Test

Setelah AVDF collection aktif, kita melakukan test nyata.

---

# Lab 44 — Record Current Time

Pada database:

```sql
SELECT TO_CHAR(SYSTIMESTAMP,
               'YYYY-MM-DD HH24:MI:SS TZH:TZM')
       AS test_start
FROM dual;
```

Contoh:

```text
TEST_START
-----------------------------
2026-09-13 16:14:21 +07:00
```

Catat waktunya.

---

# Lab 45 — Generate New Activity

Login:

```bash
sqlplus -L 'avdf_demo/Oracle#26Lab1@//192.168.56.26:1521/PDB1'
```

Jalankan:

```sql
SELECT COUNT(*)
FROM   hr.employees;
```

Expected:

```text
  COUNT(*)
----------
       107
```

Kemudian:

```sql
SELECT employee_id,
       first_name,
       last_name,
       department_id
FROM   hr.employees
WHERE  department_id = 90;
```

Contoh:

```text
EMPLOYEE_ID FIRST_NAME LAST_NAME DEPARTMENT_ID
----------- ---------- --------- -------------
100         Steven     King                 90
101         Neena      Kochhar              90
102         Lex        De Haan              90
```

Exit:

```sql
EXIT
```

---

# Lab 46 — Verify Locally First

Sebagai SYS:

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code
FROM   unified_audit_trail
WHERE  dbusername = 'AVDF_DEMO'
ORDER  BY event_timestamp DESC
FETCH FIRST 10 ROWS ONLY;
```

Kita harus melihat event baru.

Ini adalah troubleshooting principle yang sangat penting:

```text
Jika record tidak ada di Oracle Database,
AVDF tidak mungkin mengkoleksinya.
```

Urutan troubleshooting harus:

```text
1. Was the action audited?

2. Is the audit record in UNIFIED_AUDIT_TRAIL?

3. Can AVDF connect to the target?

4. Is the trail running?

5. Has AVDF collected the record?

6. Is the record visible in AVDF reports?
```

---

# Lab 47 — Verify in Audit Vault

Pada Audit Vault Server, buka Activity/Audit report sesuai release AVDF.

Filter:

```text
Target:
PDB1_26AI

Database User:
AVDF_DEMO

Object:
HR.EMPLOYEES
```

Anda harus dapat menemukan activity yang berasal dari:

```text
UNIFIED_AUDIT_TRAIL
```

Oracle Database.

---

# PART M

# Understanding the End-to-End Architecture

Pada akhir Day 1, peserta harus mampu menjelaskan diagram berikut.

```text
                Client
                  │
                  │ SQL
                  ▼
       ┌─────────────────────┐
       │ Oracle AI DB 26ai   │
       │                     │
       │      PDB1           │
       │        │            │
       │        ▼            │
       │ Unified Auditing    │
       │        │            │
       │        ▼            │
       │ UNIFIED_AUDIT_TRAIL │
       └─────────┬───────────┘
                 │
                 │ JDBC audit collection
                 │
                 ▼
       ┌─────────────────────┐
       │ Audit Vault Server  │
       │                     │
       │ Collect             │
       │ Normalize           │
       │ Store               │
       │ Monitor             │
       │ Report              │
       │ Alert               │
       └─────────────────────┘
```

Dalam configuration training kita:

```text
Target
------
PDB1_26AI


Target Address
--------------
192.168.56.26


Port
----
1521


Service
-------
PDB1


Audit Source
------------
UNIFIED_AUDIT_TRAIL


Collection
----------
TABLE trail


Collection Method
-----------------
Agentless


AVDF Target Account
-------------------
AVDFCOLLECT
```

---

# PART N

# Troubleshooting Exercises

---

# Lab 48 — Scenario: AVDF Cannot Connect to PDB1

Dari database server sendiri, test:

```bash
sqlplus -L 'avdfcollect/Oracle#AVDF26@//192.168.56.26:1521/PDB1'
```

Jika berhasil:

```text
database listener
+
service
+
credentials
```

secara lokal valid.

Jika gagal:

```text
ORA-01017
```

periksa password.

Jika:

```text
ORA-12514
```

periksa service registration.

Jika:

```text
ORA-12541
```

periksa listener.

---

# Lab 49 — Check Listener Again

```bash
lsnrctl status
```

Pastikan listener:

```text
RUNNING
```

dan PDB1 service ada.

---

# Lab 50 — Check PDB State

```bash
sqlplus / as sysdba
```

Kemudian:

```sql
SHOW PDBS
```

Expected:

```text
PDB1 READ WRITE
```

---

# Lab 51 — Check Target User Status

```sql
ALTER SESSION SET CONTAINER=PDB1;

SELECT username,
       account_status,
       expiry_date
FROM   dba_users
WHERE  username='AVDFCOLLECT';
```

Expected:

```text
AVDFCOLLECT OPEN
```

Jika:

```text
LOCKED
```

unlock:

```sql
ALTER USER avdfcollect ACCOUNT UNLOCK;
```

---

# Lab 52 — Check Audit Source

```sql
SELECT COUNT(*)
FROM   unified_audit_trail;
```

Jika query menghasilkan rows, source tersedia.

---

# Lab 53 — Check Specific Test Event

```sql
SELECT COUNT(*)
FROM   unified_audit_trail
WHERE  dbusername='AVDF_DEMO';
```

Jika hasil:

```text
0
```

maka masalahnya belum ada hubungannya dengan AVDF.

Periksa audit policy terlebih dahulu.

---

# Lab 54 — Verify Audit Policy

```sql
SELECT policy_name,
       entity_name,
       success,
       failure
FROM   audit_unified_enabled_policies
WHERE  policy_name LIKE 'AVDF_DAY1%';
```

Expected terdapat:

```text
AVDF_DAY1_HR_ACCESS
AVDF_DAY1_LOGIN
```

---

# PART O

# Day 1 Challenge

Tanpa melihat command sebelumnya, peserta harus melakukan investigasi berikut.

Scenario:

```text
Security team melaporkan adanya akses terhadap HR.EMPLOYEES.
```

Temukan:

```text
Who?
When?
From where?
Using which client?
What SQL?
Which object?
Successful or failed?
Which audit policy captured it?
```

Gunakan query:

```sql
SET LINESIZE 300
SET LONG 2000

COLUMN event_time FORMAT A19
COLUMN dbusername FORMAT A15
COLUMN action_name FORMAT A15
COLUMN userhost FORMAT A20
COLUMN client_program_name FORMAT A25
COLUMN object_schema FORMAT A12
COLUMN object_name FORMAT A20
COLUMN policy FORMAT A25
COLUMN sql_text FORMAT A80

SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       userhost,
       client_program_name,
       object_schema,
       object_name,
       return_code,
       unified_audit_policies policy,
       DBMS_LOB.SUBSTR(sql_text,80,1) sql_text
FROM   unified_audit_trail
WHERE  object_schema='HR'
AND    object_name='EMPLOYEES'
ORDER  BY event_timestamp DESC;
```

Contoh:

```text
EVENT_TIME          DBUSERNAME ACTION_NAME USERHOST CLIENT_PROGRAM_NAME OBJECT_SCHEMA OBJECT_NAME RETURN_CODE
------------------- ---------- ----------- -------- ------------------- ------------- ----------- -----------
2026-09-13 16:14:33 AVDF_DEMO  SELECT      db26ai   sqlplus             HR            EMPLOYEES            0
```

Peserta harus dapat menjelaskan:

```text
User     : AVDF_DEMO
Action   : SELECT
Object   : HR.EMPLOYEES
Result   : SUCCESS
Client   : SQL*Plus
Source   : database host/client shown in USERHOST
Policy   : AVDF_DAY1_HR_ACCESS
```

---

# PART P

# Day 1 Review Questions

## Question 1

Apakah Audit Vault menghasilkan Oracle audit records?

**Answer:**

Tidak.

Oracle Database menghasilkan audit records.

Audit Vault kemudian melakukan collection dan centralization.

---

## Question 2

Untuk Oracle AI Database 26ai, audit source yang kita gunakan?

**Answer:**

```text
UNIFIED_AUDIT_TRAIL
```

---

## Question 3

Dalam lab ini apa secured target-nya?

**Answer:**

```text
PDB1
```

yang diregister sebagai:

```text
PDB1_26AI
```

---

## Question 4

Apa connection string yang akan dipakai AVDF?

**Answer:**

```text
jdbc:oracle:thin:@//192.168.56.26:1521/PDB1
```

---

## Question 5

Apakah AVDF sebaiknya menggunakan SYS sebagai target account?

**Answer:**

Tidak.

Kita menggunakan dedicated account:

```text
AVDFCOLLECT
```

dan privileges diberikan melalui Oracle AVDF target setup script.

---

## Question 6

Apa fungsi:

```text
oracle_user_setup.sql AVDFCOLLECT SETUP
```

?

**Answer:**

Menyiapkan privileges AVDF target user untuk fungsi collection/audit policy management yang sesuai dengan mode `SETUP`.

---

## Question 7

Apa perbedaan:

```text
UNIFIED_AUDIT_TRAIL
```

dan:

```text
CDB_UNIFIED_AUDIT_TRAIL
```

?

**Answer:**

`UNIFIED_AUDIT_TRAIL` pada PDB digunakan untuk melihat audit records pada container tersebut.

`CDB_UNIFIED_AUDIT_TRAIL` dari CDB root dapat digunakan untuk melihat audit records lintas container sesuai visibility dan konfigurasi multitenant.

---

## Question 8

Mengapa lab menggunakan agentless collection?

**Answer:**

Karena environment hanya memiliki satu target Oracle Database dan table audit trail, sehingga agentless collection menyederhanakan topology training.

---

# PART Q

# Day 1 Final Checkpoint

Pada akhir hari, database harus mempunyai:

```text
PDB1
  OPEN READ WRITE

HR
  EMPLOYEES = 107 rows

AVDF_DEMO
  OPEN

AVDFCOLLECT
  OPEN

AVDF_DAY1_HR_ACCESS
  ENABLED

AVDF_DAY1_LOGIN
  ENABLED
```

Check semuanya:

```sql
ALTER SESSION SET CONTAINER=PDB1;

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

Policies:

```sql
SELECT policy_name,
       entity_name,
       success,
       failure
FROM   audit_unified_enabled_policies
WHERE  policy_name LIKE 'AVDF_DAY1%'
ORDER  BY policy_name;
```

Expected kurang lebih:

```text
POLICY_NAME                  ENTITY_NAME SUCCESS FAILURE
---------------------------- ----------- ------- -------
AVDF_DAY1_HR_ACCESS          AVDF_DEMO   YES     YES
AVDF_DAY1_LOGIN              ALL USERS   YES     YES
```

Audit events:

```sql
SELECT dbusername,
       action_name,
       object_schema,
       object_name,
       return_code
FROM   unified_audit_trail
WHERE  dbusername='AVDF_DEMO'
ORDER  BY event_timestamp DESC
FETCH FIRST 20 ROWS ONLY;
```

Harus terlihat:

```text
LOGON
LOGOFF
SELECT HR.EMPLOYEES
```

dan setidaknya satu:

```text
LOGON
RETURN_CODE = 1017
```

dari failed authentication test.

---

# PART R

# Optional Cleanup

**Jangan jalankan bagian ini apabila environment akan digunakan untuk Day 2.**

Disable policies:

```sql
NOAUDIT POLICY avdf_day1_hr_access BY avdf_demo;
NOAUDIT POLICY avdf_day1_login;
```

Drop policies:

```sql
DROP AUDIT POLICY avdf_day1_hr_access;
DROP AUDIT POLICY avdf_day1_login;
```

Drop training user:

```sql
DROP USER avdf_demo CASCADE;
```

Untuk `AVDFCOLLECT`, apabila account sudah dikonfigurasi menggunakan AVDF target setup scripts dan masih akan digunakan pada hari berikutnya:

```text
JANGAN DROP.
```

Kita akan membutuhkannya lagi.

---

# Day 1 Architecture Summary

Pada akhir Day 1 peserta seharusnya memahami keseluruhan alur ini:

```text
                    USER / APPLICATION
                           │
                           │ SQL
                           ▼
                 Oracle AI Database 26ai
                 ┌──────────────────────┐
                 │        PDB1          │
                 │                      │
                 │  Unified Auditing    │
                 │         │            │
                 │         ▼            │
                 │ UNIFIED_AUDIT_TRAIL  │
                 └──────────┬───────────┘
                            │
                            │ AVDF collection
                            │
                  ┌─────────┴─────────┐
                  │                   │
              Agent-based        Agentless
                  │                   │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Audit Vault       │
                  │ Server            │
                  │                   │
                  │ Centralize        │
                  │ Monitor           │
                  │ Investigate       │
                  │ Report            │
                  │ Alert             │
                  └───────────────────┘
```

## Day 1 Main Takeaway

Audit Vault bukan pengganti Unified Auditing.

Hubungannya adalah:

```text
Unified Auditing
      │
      │ produces
      ▼
Audit Records
      │
      │ collected by
      ▼
Audit Vault
      │
      ├── Centralize
      ├── Monitor
      ├── Analyze
      ├── Report
      └── Retain
```

Dengan environment training kita:

```text
Oracle AI Database 26ai
PDB1
192.168.56.26:1521/PDB1
        │
        ▼
UNIFIED_AUDIT_TRAIL
        │
        ▼
AVDF Agentless Collection
        │
        ▼
Audit Vault Server
```

Ini menjadi fondasi untuk materi AVDF berikutnya.
