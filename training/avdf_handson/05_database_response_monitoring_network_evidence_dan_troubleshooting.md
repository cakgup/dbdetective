# SCENARIO 05
# DATABASE RESPONSE MONITORING, NETWORK EVIDENCE, DAN TROUBLESHOOTING

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 05 of 12.
> Expected output is intentionally omitted.

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 05 — Database Response Monitoring, Network Evidence dan Troubleshooting
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 05
```

---

## Step 1 — Verify Full Channel Health

Check:

```text
Audit Vault Agent : RUNNING
Host Monitor      : RUNNING
DBFW1             : RUNNING
Monitoring Point  : Running
NETWORK Trail     : configured
```

---

## Step 2 — Enable Database Response Monitoring

AVCLI:

**[AVCLI]**

```text
ALTER DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI
USING FIREWALL DBFW1
SET DATABASE_RESPONSE=TRUE FULL_ERROR_MESSAGE=TRUE;
```

Verify:

**[AVCLI]**

```text
LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

---

## Step 3 — Generate Successful SQL

Connect:

**[OS TERMINAL]**

```bash
sqlplus -L 'hr/oracle@//192.168.56.26:1521/PDB1'
```

Run:

**[SQL*PLUS]**

```sql
SELECT COUNT(*)
FROM employees;
```

---

## Step 4 — Generate Failed SQL

Run:

**[SQL*PLUS]**

```sql
SELECT *
FROM table_does_not_exist;
```

Run another failure:

**[SQL*PLUS]**

```sql
DROP TABLE avdf_d2_app.customer_secure;
```

If user lacks privilege, expected:

---

## Step 5 — Inspect Firewall Evidence

Navigate:

**[REFERENCE / CONCEPT]**

```text
Reports
    ↓
Database Firewall Reports
    ↓
Monitored Activity
```

Inspect event fields:

```text
User
Client IP
Client Host
Client Program
Command Class
Object
SQL Text
Monitoring Point
Network Connection
Error Code
Error Message
Action Taken
Threat Severity
```

---

## Step 6 — Compare Native vs Network Evidence

For same SQL activity:

**[REFERENCE / CONCEPT]**

```text
Unified Audit
    ↓
native database evidence

Database Firewall
    ↓
network SQL evidence
```

---

## Step 7 — Stop Monitoring Point

AVCLI:

**[AVCLI]**

```text
STOP DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

Generate:

**[SQL*PLUS]**

```sql
SELECT COUNT(*)
FROM hr.employees;
```

Database query still succeeds.

---

## Step 8 — Start Monitoring Again

**[AVCLI]**

```text
START DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

Repeat SELECT.

Expected network event reappears.

---

## Step 9 — Inject Wrong Monitoring Address

Instructor:

AVCLI:

**[AVCLI]**

```text
LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

Observe incorrect address.

Fix:

**[AVCLI]**

```text
ALTER DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI
USING FIREWALL DBFW1
SET ADD_ADDRESS=192.168.56.26:1521:PDB1;
```

---

## Step 10 — Inject DBFW Network Failure

Instructor:

```text
Break DBFW Network
```

Check OS:

**[OS TERMINAL]**

```bash
ping -c 4 192.168.56.27
```

Then:

**[OS TERMINAL]**

```bash
nc -vz 192.168.56.27 2051
```

Diagnose failure.

Clear:

```text
Clear Failures
```

---
