# DAY 3 HANDS-ON LAB

# Oracle Database Firewall — Network Monitoring, Host Monitor, Monitoring Points & SQL Activity Investigation

---

# 1. Environment

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

Existing AVDF target from previous days:

```text
Target Name : PDB1_26AI
Target IP   : 192.168.56.26
Port        : 1521
Service     : PDB1
```

---

# 2. Additional Day 3 Infrastructure

Day 3 membutuhkan komponen:

```text
Audit Vault Server
Database Firewall
Oracle Database Target
```

Karena IP Database Firewall Anda belum diberikan, contoh di lab menggunakan:

```text
Database Firewall Name : DBFW1
Database Firewall IP   : 192.168.56.27
Database Firewall NIC  : eth0
```

**Sesuaikan `DBFW1`, `192.168.56.27`, dan `eth0` dengan environment AVDF Anda.**

Database tetap:

```text
192.168.56.26:1521/PDB1
```

---

# 3. Recommended Training Topology

Untuk training kita gunakan:

```text
                    Audit Vault Server
                           │
                           │
                           │ management/events
                           ▼
                  ┌─────────────────┐
                  │ Database        │
                  │ Firewall DBFW1  │
                  └────────▲────────┘
                           │
                           │ Host Monitor traffic
                           │
                 ┌─────────┴─────────┐
                 │                   │
                 │ Oracle Linux 9.8  │
                 │                   │
                 │ ORCLCDB           │
                 │   └── PDB1        │
                 │                   │
                 │ Audit Vault Agent │
                 │ Host Monitor      │
                 └────────▲──────────┘
                          │
                          │ SQL
                          │
                       Client
```

---

# 4. Day 3 Learning Objectives

Pada akhir Day 3 peserta mampu:

1. Menjelaskan perbedaan Audit Vault dan Database Firewall.
2. Menjelaskan konsep Database Activity Monitoring.
3. Menjelaskan mode deployment Database Firewall.
4. Memahami hubungan terminology lama DAM/DPE dengan AVDF 20.
5. Mengidentifikasi database network traffic.
6. Memverifikasi listener dan database service.
7. Mengidentifikasi NIC database server.
8. Register Database Firewall ke Audit Vault Server.
9. Memeriksa status Database Firewall.
10. Memasang Host Monitor Agent.
11. Membuat Database Firewall monitoring point.
12. Menggunakan mode Monitoring (Host Monitor).
13. Membuat NETWORK audit trail.
14. Menghasilkan SQL traffic.
15. Memastikan SQL terlihat oleh Database Firewall.
16. Memahami database response monitoring.
17. Membedakan native audit event dan network audit event.
18. Melakukan basic network SQL investigation.
19. Troubleshoot Host Monitor.
20. Troubleshoot Database Firewall monitoring point.

---

# 5. Day 3 Schedule

| Waktu       | Materi                         |
| ----------- | ------------------------------ |
| 09:00–09:30 | Database Firewall Concepts     |
| 09:30–10:15 | Networking Fundamentals        |
| 10:15–11:00 | Deployment Models              |
| 11:00–12:00 | Validate Target Networking     |
| 13:00–13:45 | Register Database Firewall     |
| 13:45–14:30 | Install Host Monitor           |
| 14:30–15:15 | Configure Monitoring Point     |
| 15:15–16:00 | Generate SQL Traffic           |
| 16:00–16:30 | Network Activity Investigation |
| 16:30–17:00 | Troubleshooting Challenge      |

---

# PART A

# Understanding Database Firewall

---

# Lab 1 — Audit Vault versus Database Firewall

Audit Vault bekerja terutama terhadap:

```text
audit records
```

Contoh:

```text
UNIFIED_AUDIT_TRAIL
```

Database Firewall bekerja terhadap:

```text
database network traffic
```

Perbandingan:

```text
AUDIT VAULT

Database
   │
   ▼
Audit Records
   │
   ▼
Audit Vault
```

versus:

```text
DATABASE FIREWALL

Client
   │
   │ SQL traffic
   ▼
Network
   │
   ▼
Database Firewall
   │
   ▼
Analysis
```

Keduanya kemudian dikonsolidasikan melalui Audit Vault Server.

---

# Lab 2 — Understand DAM and DPE

Silabus lama menggunakan terminology:

```text
DAM
Database Activity Monitoring
```

dan:

```text
DPE
Database Policy Enforcement
```

Secara sederhana:

```text
DAM
===
Monitor
Detect
Log
Alert
Report
```

Sedangkan:

```text
DPE
===
Monitor
Detect
Enforce
Block / Substitute
```

Karena course ini adalah:

```text
Detective Controls
```

fokus utama Day 3 adalah:

```text
DAM
```

---

# Lab 3 — Modern AVDF Deployment Modes

AVDF 20 menggunakan tiga deployment mode utama:

```text
1. Monitoring (Host Monitor)

2. Monitoring (Out-of-Band)

3. Monitoring / Blocking (Proxy)
```

Perbandingan:

| Mode         | Monitor | Alert | Block | Butuh traffic redirect |
| ------------ | ------: | ----: | ----: | ---------------------: |
| Host Monitor |     YES |   YES |    NO |                     NO |
| Out-of-Band  |     YES |   YES |    NO |           traffic copy |
| Proxy        |     YES |   YES |   YES |                    YES |

Untuk Day 3:

```text
PRIMARY LAB MODE
================
Monitoring (Host Monitor)
```

---

# PART B

# Understanding Host Monitor Architecture

---

# Lab 4 — Host Monitor Data Flow

Arsitektur:

```text
Client
   │
   │ SQL
   ▼
Oracle Database Server
   │
   ├── Oracle Listener
   │
   ├── Database
   │
   ├── Audit Vault Agent
   │
   └── Host Monitor
          │
          │ captured SQL traffic
          ▼
     Database Firewall
          │
          ▼
     Audit Vault Server
```

Host Monitor mengobservasi traffic pada NIC database host.

---

# Lab 5 — Why Host Monitor Is Ideal for This Lab

Kita tidak membutuhkan:

```text
SPAN switch
network TAP
traffic replicator
client proxy reconfiguration
```

sehingga topology virtual training lebih sederhana.

---

# PART C

# Validate Database Network Configuration

---

# Lab 6 — Login to Database Server

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
echo $ORACLE_HOME
echo $ORACLE_SID
```

Expected:

```text
/opt/oracle/product/26ai/dbhome_1
ORCLCDB
```

---

# Lab 7 — Identify Hostname

```bash
hostname
```

Contoh:

```text
db26ai
```

Get FQDN:

```bash
hostname -f
```

Contoh:

```text
db26ai.localdomain
```

---

# Lab 8 — Identify NIC

```bash
ip -br addr
```

Contoh:

```text
lo               UNKNOWN        127.0.0.1/8 ::1/128
enp0s3           UP             192.168.56.26/24
```

Catat interface yang memiliki:

```text
192.168.56.26
```

Contoh:

```text
DB NIC = enp0s3
```

---

# Lab 9 — Detailed NIC Information

```bash
ip addr show
```

Contoh:

```text
2: enp0s3: <BROADCAST,MULTICAST,UP,LOWER_UP>
    inet 192.168.56.26/24 brd 192.168.56.255
```

---

# Lab 10 — Check Routing

```bash
ip route
```

Contoh:

```text
default via 192.168.56.1 dev enp0s3
192.168.56.0/24 dev enp0s3 proto kernel scope link src 192.168.56.26
```

---

# Lab 11 — Verify Listener

```bash
lsnrctl status
```

Cari:

```text
HOST=192.168.56.26
PORT=1521
```

dan:

```text
Service "pdb1"
```

---

# Lab 12 — Verify Port 1521

```bash
ss -lntp | grep 1521
```

Contoh:

```text
LISTEN 0 128 0.0.0.0:1521 0.0.0.0:*
```

atau:

```text
LISTEN 0 128 192.168.56.26:1521 0.0.0.0:*
```

---

# Lab 13 — Verify Database Service

```bash
sqlplus -L system/oracle@//192.168.56.26:1521/PDB1
```

Expected:

```text
Connected to:
Oracle AI Database 26ai Enterprise Edition
```

Run:

```sql
SELECT SYS_CONTEXT('USERENV','SERVICE_NAME') service_name
FROM dual;
```

Expected:

```text
SERVICE_NAME
------------------------------
PDB1
```

Exit:

```sql
EXIT
```

---

# PART D

# Review Current Day 1/2 AVDF Target

---

# Lab 14 — Check Secured Target

On Audit Vault Server:

```text
avcli> LIST SECURED TARGET;
```

Expected terdapat:

```text
PDB1_26AI
```

---

# Lab 15 — Check Audit Trail

```text
avcli> LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

Expected:

```text
TABLE
UNIFIED_AUDIT_TRAIL
RUNNING
```

atau:

```text
IDLE
```

Ini adalah **native audit collection**.

Day 3 nanti menambahkan jalur kedua:

```text
NETWORK
```

---

# PART E

# Register Database Firewall

---

# Lab 16 — Check Existing Database Firewalls

Audit Vault Server:

```text
avcli> LIST FIREWALL;
```

Jika belum ada, output dapat kosong.

---

# Lab 17 — Obtain Database Firewall Certificate Fingerprint

Pada Database Firewall appliance:

```bash
openssl x509 \
  -in /usr/local/dbfw/etc/ca.crt \
  -noout \
  -fingerprint \
  -sha256
```

Contoh:

```text
sha256 Fingerprint=9A:21:7C:...
```

Catat fingerprint ini.

---

# Lab 18 — Register Database Firewall from Console

Login ke Audit Vault Server.

Masuk:

```text
Database Firewalls
    ↓
Register
```

Isi:

```text
Name:
DBFW1

IP Address:
192.168.56.27

SHA-256 Fingerprint:
<fingerprint dari Lab 17>
```

Save.

---

# Lab 19 — Alternative Registration with AVCLI

Jika certificate prerequisites sudah selesai, AVCLI registration syntax:

```text
avcli> REGISTER FIREWALL DBFW1 WITH IP 192.168.56.27;
```

Expected conceptual result:

```text
Database Firewall DBFW1 registered.
```

---

# Lab 20 — Verify Firewall

```text
avcli> LIST FIREWALL;
```

Expected terdapat:

```text
DBFW1
```

---

# Lab 21 — Check Firewall Status

```text
avcli> SHOW STATUS FOR FIREWALL DBFW1;
```

Expected secara konsep:

```text
DBFW1
Status : RUNNING
```

Detail aktual tergantung release.

---

# PART F

# Verify Connectivity

---

# Lab 22 — Database Server to Database Firewall

Dari database host:

```bash
ping -c 4 192.168.56.27
```

Expected:

```text
4 packets transmitted, 4 received, 0% packet loss
```

Catatan:

Jika ICMP diblok, ping gagal belum tentu berarti AVDF connectivity gagal.

---

# Lab 23 — Test TCP Reachability

Jika `nc` tersedia:

```bash
nc -vz 192.168.56.27 2051
```

Port aktual dapat berbeda sesuai Host Monitor channel yang dipilih oleh AVDF.

Untuk Host Monitor, pastikan network firewall antara database host dan Database Firewall tidak memblokir range komunikasi yang dibutuhkan AVDF.

---

# Lab 24 — Check firewalld

```bash
sudo systemctl status firewalld --no-pager
```

Contoh:

```text
Active: active (running)
```

Display current rules:

```bash
sudo firewall-cmd --list-all
```

Jangan membuka port secara sembarang jika environment mempunyai firewall policy khusus.

---

# PART G

# Verify Audit Vault Agent

Host Monitor membutuhkan Audit Vault Agent.

---

# Lab 25 — Locate Audit Vault Agent

Jika Day 2 menggunakan:

```text
/home/oracle/avdf_agent
```

check:

```bash
ls -ld /home/oracle/avdf_agent
```

Expected:

```text
drwxr-xr-x ... /home/oracle/avdf_agent
```

---

# Lab 26 — Check Agent Status

```bash
cd /home/oracle/avdf_agent/bin
./agentctl status
```

Expected:

```text
RUNNING
```

Jika stopped:

```bash
./agentctl start
```

Check lagi:

```bash
./agentctl status
```

---

# PART H

# Install Host Monitor Agent

Host Monitor di Linux dipasang terpisah dari Audit Vault Agent.

Installation harus dilakukan sebagai:

```text
root
```

pada directory yang dimiliki root.

---

# Lab 27 — Create Host Monitor Installation Directory

Login root:

```bash
sudo -i
```

Buat:

```bash
mkdir -p /usr/local/avdf_hm
```

Check:

```bash
ls -ld /usr/local/avdf_hm
```

Expected owner:

```text
root root
```

---

# Lab 28 — Download Host Monitor Package

Dari Audit Vault Server Console:

```text
Agents
   ↓
Downloads
```

Download package Linux x86-64 Host Monitor.

Nama file dapat berbentuk:

```text
agent-linux-x86-64-hmon-one.zip
```

Copy ke:

```text
/usr/local/
```

---

# Lab 29 — Verify Package

```bash
ls -lh /usr/local/*hmon*.zip
```

Contoh:

```text
-rw-r--r-- 1 root root ... agent-linux-x86-64-hmon-one.zip
```

---

# Lab 30 — Unzip Host Monitor

```bash
cd /usr/local
unzip agent-linux-x86-64-hmon-one.zip
```

Expected membuat:

```text
/usr/local/hm
```

Check:

```bash
ls -l /usr/local/hm
```

Harus terdapat:

```text
hostmonsetup
```

---

# Lab 31 — Check Permissions

```bash
chmod u+x /usr/local/hm/hostmonsetup
```

Check:

```bash
ls -l /usr/local/hm/hostmonsetup
```

---

# Lab 32 — Install Host Monitor

Jika Audit Vault Agent dipasang oleh OS user:

```text
oracle
```

dan group:

```text
oinstall
```

jalankan:

```bash
/usr/local/hm/hostmonsetup install \
  agentuser=oracle \
  agentgroup=oinstall
```

Contoh conceptual output:

```text
Installing Host Monitor...
Host Monitor installation completed successfully.
```

Actual output bergantung AVDF release.

---

# Lab 33 — Verify Installation Files

```bash
find /usr/local/hm -maxdepth 2 -type f | head
```

Expected terdapat Host Monitor binaries/configuration.

---

# PART I

# Create Database Firewall Monitoring Point

Terminologi modern:

```text
Database Firewall Monitoring Point
```

Terminologi yang dipakai pada silabus lama:

```text
Enforcement Point
```

Untuk training sekarang kita gunakan:

```text
Monitoring Point
```

---

# Lab 34 — Verify Firewall NIC

Pada Audit Vault Server console:

```text
Database Firewalls
    ↓
DBFW1
```

lihat daftar NIC.

Misalnya:

```text
eth0
```

NIC untuk Host Monitor harus mempunyai IP address.

---

# Lab 35 — Create Monitoring Point from AVCLI

Untuk target:

```text
PDB1_26AI
```

Firewall:

```text
DBFW1
```

Mode:

```text
Monitoring_Host_Monitor
```

Target:

```text
192.168.56.26:1521:PDB1
```

command:

```text
avcli> CREATE DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI
USING FIREWALL DBFW1
WITH MODE Monitoring_Host_Monitor
NETWORK INTERFACE CARD eth0
ADD ADDRESS 192.168.56.26:1521:PDB1;
```

Expected:

```text
Database Firewall monitoring point created.
```

---

# Lab 36 — Verify Monitoring Point

```text
avcli> LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

Expected conceptually:

```text
Target     : PDB1_26AI
Firewall   : DBFW1
Mode       : Monitoring_Host_Monitor
Address    : 192.168.56.26:1521:PDB1
```

---

# Lab 37 — Verify by Firewall

```text
avcli> LIST DATABASE FIREWALL MONITOR
FOR FIREWALL DBFW1;
```

Harus terlihat:

```text
PDB1_26AI
```

---

# Lab 38 — Start Monitoring Point

Jika belum running:

```text
avcli> START DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI
USING FIREWALL DBFW1;
```

Expected:

```text
Monitoring point started.
```

---

# PART J

# Configure Host Monitor NETWORK Trail

Host Monitor memiliki dua jalur konseptual:

```text
Host Monitor
    ↓
Database Firewall
```

dan:

```text
NETWORK trail
    ↓
Audit Vault Server
```

---

# Lab 39 — Add NETWORK Audit Trail

Audit Vault Server Console:

```text
Targets
   ↓
PDB1_26AI
   ↓
Audit Data Collection
   ↓
Add
```

Set:

```text
Audit Trail Type:
NETWORK

Host:
database host / Audit Vault Agent host
```

Save.

---

# Lab 40 — Verify Network Trail

```text
avcli> LIST TRAIL FOR SECURED TARGET PDB1_26AI;
```

Sekarang dapat terlihat dua jenis trail:

```text
TABLE
UNIFIED_AUDIT_TRAIL
```

dan:

```text
NETWORK
```

Conceptual output:

```text
AUDIT_TRAIL_TYPE   LOCATION              STATUS
------------------ --------------------- ----------
TABLE              UNIFIED_AUDIT_TRAIL   IDLE
NETWORK                                  COLLECTING
```

---

# PART K

# Generate Database Network Traffic

Sekarang kita mulai menghasilkan traffic yang dapat dilihat oleh Database Firewall.

---

# Lab 41 — Baseline Login

Dari client/database server:

```bash
sqlplus -L hr/oracle@//192.168.56.26:1521/PDB1
```

Run:

```sql
SELECT USER FROM dual;
```

Expected:

```text
USER
------------------------------
HR
```

---

# Lab 42 — Simple SELECT

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

---

# Lab 43 — Read Application Data

```sql
SELECT employee_id,
       first_name,
       last_name,
       department_id
FROM   employees
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

---

# Lab 44 — Aggregate Query

```sql
SELECT department_id,
       COUNT(*) employee_count,
       ROUND(AVG(salary),2) avg_salary
FROM   employees
GROUP BY department_id
ORDER BY department_id;
```

---

# Lab 45 — Different SQL Shapes

Run:

```sql
SELECT employee_id,
       last_name,
       salary
FROM   employees
WHERE  salary > 10000;
```

Kemudian:

```sql
SELECT employee_id,
       last_name
FROM   employees
WHERE  last_name LIKE 'K%';
```

Kemudian:

```sql
SELECT job_id,
       COUNT(*)
FROM   employees
GROUP BY job_id;
```

Exit:

```sql
EXIT
```

---

# PART L

# Generate DDL Traffic

Connect:

```bash
sqlplus -L 'avdf_d2_app/Oracle#D2App26@//192.168.56.26:1521/PDB1'
```

Create table:

```sql
CREATE TABLE dfw_test
(
    id          NUMBER,
    description VARCHAR2(100)
);
```

Expected:

```text
Table created.
```

Insert:

```sql
INSERT INTO dfw_test
VALUES (1,'Database Firewall Test');
```

Expected:

```text
1 row created.
```

Commit:

```sql
COMMIT;
```

Update:

```sql
UPDATE dfw_test
SET description='Database Firewall Day 3'
WHERE id=1;
```

Expected:

```text
1 row updated.
```

Rollback:

```sql
ROLLBACK;
```

Drop:

```sql
DROP TABLE dfw_test PURGE;
```

Expected:

```text
Table dropped.
```

Exit.

---

# PART M

# Generate Failed SQL

Login sebagai reader:

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

Run valid query:

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

Sekarang invalid object:

```sql
SELECT *
FROM table_does_not_exist;
```

Expected:

```text
ORA-00942: table or view "AVDF_D2_READER"."TABLE_DOES_NOT_EXIST" does not exist
```

Attempt unauthorized DDL:

```sql
CREATE TABLE unauthorized_test
(
    id NUMBER
);
```

Expected:

```text
ORA-01031: insufficient privileges
```

Exit:

```sql
EXIT
```

---

# PART N

# Database Response Monitoring

Database Firewall dapat dikonfigurasi untuk melihat database response terhadap SQL.

Contohnya:

```text
SQL
 ↓
Database
 ↓
ORA-00942
```

atau:

```text
SQL
 ↓
Database
 ↓
ORA-01031
```

---

# Lab 46 — Enable Database Response Monitoring

AVCLI:

```text
avcli> ALTER DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI
USING FIREWALL DBFW1
SET DATABASE_RESPONSE=TRUE FULL_ERROR_MESSAGE=TRUE;
```

Verify:

```text
avcli> LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

---

# Lab 47 — Generate Response Errors Again

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

Run:

```sql
SELECT *
FROM definitely_missing_table;
```

Expected:

```text
ORA-00942
```

Run:

```sql
DROP TABLE avdf_d2_app.customer_secure;
```

Expected:

```text
ORA-01031: insufficient privileges
```

Exit.

---

# PART O

# Inspect Database Firewall Activity

Login Audit Vault Server as auditor.

Navigate:

```text
Reports
   ↓
Activity Reports
```

Filter:

```text
Target = PDB1_26AI
```

---

# Lab 48 — Find HR SQL Activity

Filter:

```text
User = HR
```

Look for:

```text
SELECT employees
```

and SQL containing:

```text
DEPARTMENT_ID
SALARY
JOB_ID
```

---

# Lab 49 — Find DDL Activity

Filter:

```text
User = AVDF_D2_APP
```

Search events:

```text
CREATE TABLE
INSERT
UPDATE
DROP TABLE
```

---

# Lab 50 — Find Failed SQL

Filter:

```text
User = AVDF_D2_READER
```

Look for SQL involving:

```text
TABLE_DOES_NOT_EXIST
DEFINITELY_MISSING_TABLE
```

If response monitoring is active, inspect:

```text
database response
error code
full error message
```

---

# PART P

# Compare Native Audit and Network Monitoring

Ini salah satu lab terpenting Day 3.

Untuk query yang sama:

```text
SELECT *
FROM AVDF_D2_APP.CUSTOMER_SECURE
```

ada dua possible evidence sources.

Native auditing:

```text
Oracle Database
    ↓
UNIFIED_AUDIT_TRAIL
    ↓
Audit Vault
```

Network monitoring:

```text
SQL network traffic
    ↓
Host Monitor
    ↓
Database Firewall
    ↓
Audit Vault
```

---

# Lab 51 — Query Native Audit Record

SYS:

```bash
sqlplus / as sysdba
```

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Query:

```sql
SET LINES 250
SET LONG 2000

COLUMN event_time FORMAT A19
COLUMN dbusername FORMAT A20
COLUMN action_name FORMAT A20
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
FETCH FIRST 20 ROWS ONLY;
```

---

# Lab 52 — Compare with Database Firewall Report

Pada AVDF report cari user:

```text
AVDF_D2_READER
```

Bandingkan:

```text
Native Audit
vs
Network Activity
```

Perhatikan bahwa dua mechanism tersebut berasal dari sumber berbeda.

---

# PART Q

# Understanding What Host Monitor Can See

Host Monitor sangat berguna karena traffic berasal dari database server NIC.

Traffic remote client:

```text
Client
   ↓
NIC
   ↓
Database
```

dapat dimonitor.

Pada supported configuration, Host Monitor juga dirancang untuk menangkap beberapa local connection scenarios.

---

# PART R

# Detecting Suspicious Patterns

Sekarang generate activity yang terlihat tidak normal.

---

# Lab 53 — Repeated Sensitive SELECT

```bash
for i in 1 2 3 4 5
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
5
5
```

---

# Lab 54 — Multiple SQL Shapes

Login:

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

Run:

```sql
SELECT customer_name
FROM avdf_d2_app.customer_secure;
```

```sql
SELECT customer_name,
       credit_limit
FROM avdf_d2_app.customer_secure
WHERE credit_limit > 30000000;
```

```sql
SELECT customer_id,
       account_status
FROM avdf_d2_app.customer_secure;
```

Exit.

---

# PART S

# Monitoring Point Operations

---

# Lab 55 — Stop Monitoring Point

AVCLI:

```text
avcli> STOP DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI
USING FIREWALL DBFW1;
```

Expected:

```text
Monitoring point stopped.
```

---

# Lab 56 — Verify

```text
avcli> LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

Confirm status indicates stopped/suspended.

---

# Lab 57 — Generate SQL While Stopped

```bash
sqlplus -L hr/oracle@//192.168.56.26:1521/PDB1
```

```sql
SELECT COUNT(*)
FROM employees;
```

Exit.

---

# Lab 58 — Start Monitoring Again

```text
avcli> START DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI
USING FIREWALL DBFW1;
```

Expected:

```text
Monitoring point started.
```

---

# Lab 59 — Generate SQL After Restart

```bash
sqlplus -L hr/oracle@//192.168.56.26:1521/PDB1
```

```sql
SELECT COUNT(*)
FROM departments;
```

Exit.

Compare report timing.

Ini menunjukkan bahwa monitoring point benar-benar merupakan component aktif dalam SQL network monitoring path.

---

# PART T

# Host Monitor Status Verification

---

# Lab 60 — Check Audit Vault Agent

As oracle:

```bash
cd /home/oracle/avdf_agent/bin
./agentctl status
```

Expected:

```text
RUNNING
```

---

# Lab 61 — Check Host Monitor from Console

Audit Vault Server:

```text
Agents
   ↓
Agent Hosts
```

Cari host database.

Perhatikan:

```text
Host Monitor Status
Host Monitor Details
```

Expected:

```text
Installed / Running
```

---

# Lab 62 — Check NETWORK Trail

Audit Vault Server:

```text
Targets
   ↓
Audit Trails
```

Filter:

```text
Target = PDB1_26AI
Trail Type = NETWORK
```

Expected:

```text
Collecting
```

atau:

```text
Idle
```

---

# PART U

# Network Troubleshooting

---

# Lab 63 — Verify Listener Address Again

```bash
lsnrctl status
```

Pastikan monitoring point menggunakan address yang benar:

```text
192.168.56.26
1521
PDB1
```

---

# Lab 64 — Verify NIC Address

```bash
ip -br addr
```

Contoh:

```text
enp0s3 UP 192.168.56.26/24
```

---

# Lab 65 — Check Active Database Connections

Saat client terkoneksi:

```bash
ss -tn | grep ':1521'
```

Contoh:

```text
ESTAB ... 192.168.56.26:1521 ... client-ip:xxxxx
```

---

# Lab 66 — Generate Persistent Session

Terminal 1:

```bash
sqlplus hr/oracle@//192.168.56.26:1521/PDB1
```

Biarkan session terbuka.

Terminal 2:

```bash
ss -tn | grep 1521
```

Perhatikan connection state:

```text
ESTAB
```

---

# Lab 67 — Database Listener Verification

```bash
ps -ef | grep [t]nslsnr
```

Contoh:

```text
oracle ... /opt/oracle/product/26ai/dbhome_1/bin/tnslsnr LISTENER
```

---

# PART V

# Troubleshooting Monitoring Point

---

# Scenario 1

# Monitoring Point Exists but No SQL Activity

Checklist:

```text
1. Is Database Firewall running?
2. Is monitoring point running?
3. Is Host Monitor installed?
4. Is Audit Vault Agent running?
5. Is NETWORK trail active?
6. Is target address correct?
7. Is port 1521 correct?
8. Is target service PDB1 correct?
9. Is Database Firewall reachable?
10. Is client generating network SQL?
```

---

# Lab 68 — Check Firewall

```text
avcli> SHOW STATUS FOR FIREWALL DBFW1;
```

---

# Lab 69 — Check Monitoring Point

```text
avcli> LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

---

# Lab 70 — Check Agent

```bash
/home/oracle/avdf_agent/bin/agentctl status
```

---

# Lab 71 — Check Target Connectivity

```bash
sqlplus -L system/oracle@//192.168.56.26:1521/PDB1
```

---

# Scenario 2

# Wrong Target Address

Suppose monitoring point contains:

```text
192.168.56.26:1522:PDB1
```

but listener is:

```text
1521
```

Host Monitor will not correctly associate the traffic.

Correct monitoring point address.

---

# Lab 72 — Add Correct Address

Example:

```text
avcli> ALTER DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI
USING FIREWALL DBFW1
SET ADD_ADDRESS=192.168.56.26:1521:PDB1;
```

Use caution if another address is already configured.

---

# PART W

# Database Response Monitoring Challenge

Scenario:

```text
A user repeatedly executes SQL against objects that do not exist.
```

Generate:

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

Run:

```sql
SELECT * FROM secret_payroll;
```

Expected:

```text
ORA-00942
```

Run:

```sql
SELECT * FROM admin_passwords;
```

Expected:

```text
ORA-00942
```

Run:

```sql
SELECT * FROM credit_cards;
```

Expected:

```text
ORA-00942
```

Exit.

Peserta harus menemukan:

```text
User
SQL
Target
Client
Timestamp
Database response
```

di Database Firewall reporting.

---

# PART X

# Detective Control Incident Scenario

Scenario:

Security team melihat bahwa application account:

```text
AVDF_D2_READER
```

melakukan activity tidak biasa.

Normal behavior:

```text
SELECT CUSTOMER_SECURE
```

Tetapi kemudian ditemukan:

```text
SELECT missing objects
CREATE TABLE attempts
DROP TABLE attempts
Repeated sensitive reads
```

---

# Lab 73 — Build Timeline from Network Events

Cari user:

```text
AVDF_D2_READER
```

Sort:

```text
Event Time ASC
```

Contoh timeline:

```text
15:21:03 LOGIN
15:21:11 SELECT CUSTOMER_SECURE
15:21:20 SELECT SECRET_PAYROLL        FAILURE
15:21:25 SELECT ADMIN_PASSWORDS       FAILURE
15:21:31 CREATE TABLE                 FAILURE
15:21:40 SELECT CUSTOMER_SECURE
15:21:44 SELECT CUSTOMER_SECURE
```

---

# Lab 74 — Compare with Unified Audit Trail

SYS:

```sql
SELECT TO_CHAR(event_timestamp,
               'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code
FROM unified_audit_trail
WHERE dbusername='AVDF_D2_READER'
ORDER BY event_timestamp;
```

Bandingkan dengan Database Firewall activity.

---

# PART Y

# Understanding Out-of-Band Mode

Tidak perlu dikonfigurasi pada lab utama.

Arsitektur:

```text
Client
  │
  ├───────────────────────► Database
  │
  │
  │ copy via SPAN/TAP
  ▼
Database Firewall
```

Database Firewall hanya menerima copy traffic.

Keuntungan:

```text
No application connection change
No firewall in SQL path
No added database latency
```

Keterbatasan:

```text
Cannot block
Cannot substitute SQL
Requires network traffic duplication
```

Untuk detective controls, mode ini sangat relevan.

---

# PART Z

# Understanding Proxy Mode

Mode proxy:

```text
Client
   │
   ▼
Database Firewall
   │
   ▼
Database
```

Client harus connect ke:

```text
Database Firewall
```

bukan langsung ke database.

Mode ini dapat:

```text
Monitor
Alert
Block
Substitute
```

Karena course kita adalah:

```text
Detective Controls
```

Day 3 hanya membahas proxy secara konsep.

Blocking akan bukan fokus hands-on.

---

# PART AA

# Legacy Inline Mode Note

Silabus asli menyebut:

```text
inline
out-of-band
proxy
```

Pada AVDF modern:

```text
inline bridge
```

sudah bukan deployment mode yang digunakan.

Untuk AVDF 20 gunakan:

```text
Monitoring (Out-of-Band)
Monitoring (Host Monitor)
Monitoring / Blocking (Proxy)
```

Ini penting agar peserta memahami perbedaan dokumentasi lama dengan implementasi AVDF modern.

---

# PART AB

# Native Network Encryption / Database Interrogation

Silabus lama menggunakan istilah:

```text
Database Interrogation
```

Pada AVDF modern, feature ini berkaitan dengan kemampuan monitoring:

```text
Native Network Encrypted Traffic
```

Untuk Oracle Database target.

Jika Native Network Encryption digunakan, Database Firewall membutuhkan configuration tambahan agar dapat memahami traffic tersebut.

Untuk Day 3:

```text
concept + demonstration only
```

kecuali environment Anda sudah menggunakan Oracle Native Network Encryption.

---

# PART AC

# Check Whether SQL*Net Encryption Is Configured

Database host:

```bash
grep -Ei \
'SQLNET.ENCRYPTION|SQLNET.CRYPTO|SSL|WALLET' \
$ORACLE_HOME/network/admin/sqlnet.ora
```

Jika tidak ada output, kemungkinan tidak ada explicit NNE setting dalam file tersebut.

Jangan mengubah encryption configuration hanya demi Day 3.

---

# PART AD

# Day 3 Investigation Query Pack

Native Audit — Login:

```sql
SELECT TO_CHAR(event_timestamp,'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       return_code,
       userhost
FROM unified_audit_trail
WHERE action_name='LOGON'
ORDER BY event_timestamp DESC
FETCH FIRST 30 ROWS ONLY;
```

---

Native Audit — Sensitive Objects:

```sql
SELECT TO_CHAR(event_timestamp,'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_schema,
       object_name,
       return_code
FROM unified_audit_trail
WHERE object_name='CUSTOMER_SECURE'
ORDER BY event_timestamp DESC;
```

---

Native Audit — Failures:

```sql
SELECT TO_CHAR(event_timestamp,'YYYY-MM-DD HH24:MI:SS') event_time,
       dbusername,
       action_name,
       object_name,
       return_code,
       DBMS_LOB.SUBSTR(sql_text,100,1) sql_text
FROM unified_audit_trail
WHERE return_code <> 0
ORDER BY event_timestamp DESC
FETCH FIRST 30 ROWS ONLY;
```

---

# PART AE

# Day 3 Final Architecture

Pada akhir Day 3 peserta harus memahami dua independent detective data channels:

```text
                         Oracle Database
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
       Native Auditing                   Network Traffic
              │                                 │
              ▼                                 ▼
   UNIFIED_AUDIT_TRAIL                  Host Monitor
              │                                 │
              │                                 ▼
              │                         Database Firewall
              │                                 │
              └──────────────┬──────────────────┘
                             ▼
                      Audit Vault Server
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
             Reports       Alerts     Investigation
```

---

# PART AF

# Day 3 Checkpoint

Peserta harus dapat menjawab:

## 1. Apa perbedaan Audit Vault dan Database Firewall?

Audit Vault:

```text
collects audit records
```

Database Firewall:

```text
monitors database network SQL traffic
```

---

## 2. Apa mode Day 3?

```text
Monitoring (Host Monitor)
```

---

## 3. Apakah mode ini dapat block SQL?

```text
NO
```

Ia digunakan untuk:

```text
monitor
log
alert
investigate
```

---

## 4. Apa secured target?

```text
PDB1_26AI
```

---

## 5. Apa database connection?

```text
192.168.56.26:1521:PDB1
```

---

## 6. Apa nama firewall pada contoh lab?

```text
DBFW1
```

---

## 7. Apa fungsi monitoring point?

Menghubungkan:

```text
Target
+
Database Firewall
+
Deployment Mode
+
Target Network Address
```

---

## 8. Apa fungsi Host Monitor?

Capture database SQL network traffic dari database host dan mengirimkannya ke Database Firewall.

---

# PART AG

# Day 3 Final Technical Checklist

Database:

```text
ORCLCDB       OPEN
PDB1          READ WRITE
Listener      RUNNING
Port          1521
Service       PDB1
```

AVDF:

```text
PDB1_26AI     Registered
DBFW1         Registered
```

Monitoring:

```text
Mode          Monitoring_Host_Monitor
Target        PDB1_26AI
Address       192.168.56.26:1521:PDB1
```

Agents:

```text
Audit Vault Agent    RUNNING
Host Monitor         INSTALLED/RUNNING
```

Audit trails:

```text
TABLE
UNIFIED_AUDIT_TRAIL

NETWORK
Host Monitor / Database Firewall
```

Reports:

```text
SQL Activity Visible
Login Activity Visible
DDL Activity Visible
Failed SQL Visible
```

---

# PART AH

# Optional Cleanup

**Jangan cleanup jika akan melanjutkan ke Day 4.**

Day 4 membutuhkan:

```text
DBFW1
Monitoring Point
NETWORK Trail
AVDF_D2_APP
AVDF_D2_READER
CUSTOMER_SECURE
```

Jika benar-benar ingin stop monitoring:

```text
avcli> STOP DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI
USING FIREWALL DBFW1;
```

Jangan langsung drop monitoring point karena akan digunakan lagi.

---

# PART AI

# Day 3 Main Takeaway

Day 1:

```text
Database
 ↓
Unified Audit
 ↓
Audit Vault
```

Day 2:

```text
Audit Vault
 ↓
Policies
Alerts
Reports
Investigation
```

Day 3:

```text
Database Network Traffic
 ↓
Host Monitor
 ↓
Database Firewall
 ↓
Audit Vault
 ↓
Network Activity Investigation
```

Sehingga sekarang peserta mempunyai dua bentuk detective evidence:

```text
DATABASE EVIDENCE
+
NETWORK EVIDENCE
```

yang dapat dikorelasikan untuk menjawab:

```text
Who?
What SQL?
When?
From where?
Against which database?
Against which object?
Was the SQL successful?
What did the database return?
Was this normal activity?
```

---

# Day 3 Final Learning Flow

```text
CLIENT SQL
    │
    ▼
DATABASE LISTENER
    │
    ├──────────────────────┐
    │                      │
    ▼                      ▼
DATABASE EXECUTION     HOST MONITOR
    │                      │
    ▼                      ▼
UNIFIED AUDIT         DATABASE FIREWALL
    │                      │
    └──────────┬───────────┘
               ▼
        AUDIT VAULT SERVER
               │
        ┌──────┼──────┐
        ▼      ▼      ▼
      MONITOR ALERT REPORT
               │
               ▼
          INVESTIGATE
```

Day 3 tetap merupakan **Detective Control Lab**.

Database Firewall digunakan untuk:

```text
MONITOR
DETECT
LOG
ALERT
INVESTIGATE
```

bukan sebagai exercise utama untuk:

```text
BLOCK
```

Beberapa detail modern yang penting: Oracle AVDF 20 memang mendefinisikan **Monitoring (Host Monitor)** dan **Monitoring (Out-of-Band)** sebagai mode monitoring/alerting tanpa kemampuan block/substitute, sementara **Monitoring/Blocking (Proxy)** menambahkan enforcement. ([Oracle Documentation][1]) Host Monitor membutuhkan Audit Vault Agent dan Host Monitor Agent pada database host, kemudian membuat monitoring point dan `NETWORK` trail. ([Oracle Documentation][2])

Command AVCLI pada lab juga mengikuti syntax current AVDF: `REGISTER FIREWALL`, `CREATE/LIST/START/STOP DATABASE FIREWALL MONITOR`, dan address target menggunakan format `IP:port:service`. ([Oracle Documentation][3])

Dan perbedaan dengan silabus lama memang perlu ditekankan kepada peserta: **inline bridge mode lama sudah desupported pada AVDF 20**, sehingga jangan mencoba memaksakan topology 2017 secara literal. ([Oracle Documentation][4])

Day 4 berikutnya paling natural masuk ke **Database Firewall policies, SQL profiles/allowlists, monitoring privileged/sensitive activity, alerts, policy deployment, serta reporting**, tetap dengan mode monitoring agar identitas course tetap murni *Detective Controls*.

[1]: https://docs.oracle.com/en/database/oracle/audit-vault-database-firewall/20/sigcc/img_text/dbfw_deployments.html?utm_source=chatgpt.com "Oracle Audit Vault and Database Firewall Concepts Guide"
[2]: https://docs.oracle.com/en/database/oracle/database-security-central/sigad/installing-and-enabling-host-monitor-agent.html?utm_source=chatgpt.com "Installing and Enabling the Host Monitor Agent"
[3]: https://docs.oracle.com/en/database/oracle/audit-vault-database-firewall/20/sigad/avcli_commands.html "AVCLI Commands Reference"
[4]: https://docs.oracle.com/en/database/oracle/audit-vault-database-firewall/20/sigig/update.html?utm_source=chatgpt.com "Upgrading Oracle Audit Vault and Database Firewall from Release 12.2 to Release 20"
