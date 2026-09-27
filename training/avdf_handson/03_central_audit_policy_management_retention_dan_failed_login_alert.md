# SCENARIO 03
# CENTRAL AUDIT POLICY MANAGEMENT, RETENTION, DAN FAILED LOGIN ALERT

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 03 of 12.
> Expected output is intentionally omitted.

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 03 — Central Audit Policy Management, Retention dan Failed Login Alert
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 03
```

---

## Step 1 — Create Day 2 Users

SQL*Plus:

**[SQL*PLUS]**

```sql
ALTER SESSION SET CONTAINER=PDB1;

CREATE USER avdf_d2_app
IDENTIFIED BY "Oracle#D2App26";

CREATE USER avdf_d2_reader
IDENTIFIED BY "Oracle#D2Read26";

GRANT CREATE SESSION, CREATE TABLE
TO avdf_d2_app;

GRANT CREATE SESSION
TO avdf_d2_reader;
```

---

## Step 2 — Create Sensitive Dataset

Connect as application owner:

**[OS TERMINAL]**

```bash
sqlplus -L 'avdf_d2_app/Oracle#D2App26@//192.168.56.26:1521/PDB1'
```

Create:

**[SQL*PLUS]**

```sql
CREATE TABLE customer_secure
(
    customer_id    NUMBER PRIMARY KEY,
    customer_name  VARCHAR2(100),
    city           VARCHAR2(50),
    credit_limit   NUMBER,
    account_status VARCHAR2(20)
);
```

Insert:

**[SQL*PLUS]**

```sql
INSERT INTO customer_secure VALUES
(1,'Budi Santoso','Jakarta',50000000,'ACTIVE');

INSERT INTO customer_secure VALUES
(2,'Siti Aminah','Bandung',35000000,'ACTIVE');

INSERT INTO customer_secure VALUES
(3,'Andi Wijaya','Surabaya',75000000,'ACTIVE');

INSERT INTO customer_secure VALUES
(4,'Rina Putri','Depok',25000000,'ACTIVE');

INSERT INTO customer_secure VALUES
(5,'Dewi Lestari','Bogor',60000000,'SUSPENDED');

COMMIT;
```

---

## Step 3 — Grant Reader Access

SYS:

**[SQL*PLUS]**

```sql
GRANT SELECT, UPDATE
ON avdf_d2_app.customer_secure
TO avdf_d2_reader;
```

---

## Step 4 — Create Day 2 Audit Policies

**[SQL*PLUS]**

```sql
CREATE AUDIT POLICY avdf_d2_sensitive_access
  ACTIONS SELECT, UPDATE
  ON avdf_d2_app.customer_secure;
```

Create schema policy:

**[SQL*PLUS]**

```sql
CREATE AUDIT POLICY avdf_d2_schema_changes
  ACTIONS CREATE TABLE, ALTER TABLE, DROP TABLE;
```

---

## Step 5 — Retrieve Audit Policies

AVCLI:

**[AVCLI]**

```text
RETRIEVE AUDIT POLICIES FROM TARGET PDB1_26AI;
```

---

## Step 6 — Verify Retrieval Job

Web:

**[REFERENCE / CONCEPT]**

```text
Settings
    ↓
Jobs
```

---

## Step 7 — Inspect Audit Policies

Login Auditor:

**[REFERENCE / CONCEPT]**

```text
Policies
    ↓
Audit Policies
```

Verify custom policies are visible:

```text
AVDF_D2_SENSITIVE_ACCESS
AVDF_D2_SCHEMA_CHANGES
```

---

## Step 8 — Provision Policies

Enable Day 2 policies through console or provisioning control.

---

## Step 9 — Create Retention Policy

Administrator:

**[REFERENCE / CONCEPT]**

```text
Data Retention
    ↓
Create
```

Create:

```text
Name          : LAB_3M_ONLINE
Online Months : 3
Archive       : 0
```

Apply to:

```text
PDB1_26AI
```

AVCLI verification:

**[AVCLI]**

```text
SHOW RETENTION POLICY
FOR TARGET PDB1_26AI;
```

---

## Step 10 — Create Failed Login Alert

Auditor:

**[REFERENCE / CONCEPT]**

```text
Policies
    ↓
Alert Policies
    ↓
Create
```

Configure:

```text
Name        : LAB_FAILED_LOGIN
Type        : Oracle Database
Severity    : Critical
Threshold   : 3
Duration    : 5 minutes
Group By    : USER_NAME
Target      : PDB1_26AI

Condition:
upper(:EVENT_STATUS)='FAILURE'
AND upper(:EVENT)='LOGON'
```

---

## Step 11 — Trigger Three Failed Logins

OS Terminal:

**[OS TERMINAL]**

```bash
for i in 1 2 3
do
  echo "Attempt $i"
  sqlplus -L -s 'avdf_d2_reader/WrongPassword@//192.168.56.26:1521/PDB1' <<'EOF'
EXIT
EOF
done
```

---

## Step 12 — Investigate Alert

Navigate:

**[WEB CONSOLE]**

```text
Alerts
```

Click:

**[WEB CONSOLE]**

```text
Investigate
```

Inspect:

**[WEB CONSOLE]**

```text
Event Time
User
Event
Status
Return Code
Client Host
Client IP
Client Program
```

---

## Step 13 — Alert Workflow

Change:

**[REFERENCE / CONCEPT]**

```text
New
  ↓
Open
  ↓
Acknowledged
  ↓
Closed
```

Use buttons:

```text
Open
Acknowledge
Close
```

---
