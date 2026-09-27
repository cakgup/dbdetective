# SCENARIO 10
# STORED PROCEDURE AUDITING

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 10 of 12.
> Expected output is intentionally omitted.

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 10 — Stored Procedure Auditing
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 10
```

---

## Step 1 — Grant SPA Setup Privileges

SYS:

**[SQL*PLUS]**

```sql
ALTER SESSION SET CONTAINER=PDB1;

@/home/oracle/avdf_setup/oracle_user_setup.sql AVDFCOLLECT SPA
```

---

## Step 2 — Create Procedure

Connect as application owner:

**[OS TERMINAL]**

```bash
sqlplus -L 'avdf_d2_app/Oracle#D2App26@//192.168.56.26:1521/PDB1'
```

Create example:

**[SQL*PLUS]**

```sql
CREATE OR REPLACE PROCEDURE show_customer_count
AS
  l_count NUMBER;
BEGIN
  SELECT COUNT(*)
  INTO   l_count
  FROM   customer_secure;

  DBMS_OUTPUT.PUT_LINE('CUSTOMERS=' || l_count);
END;
/
```

---

## Step 3 — Execute Procedure

**[SQL*PLUS]**

```sql
SET SERVEROUTPUT ON

BEGIN
  show_customer_count;
END;
/
```

---

## Step 4 — Verify Procedure Exists

**[SQL*PLUS]**

```sql
SELECT object_name,
       object_type,
       status
FROM user_objects
WHERE object_name='SHOW_CUSTOMER_COUNT';
```

---

## Step 5 — Enable Stored Procedure Retrieval

Reports:

**[WEB CONSOLE]**

```text
Stored Procedure Changes
```

Click:

**[WEB CONSOLE]**

```text
Enable Retrieval
```

---

## Step 6 — Retrieve First State

Click:

**[WEB CONSOLE]**

```text
Retrieve Now
```

Stored Procedure report should show initial state / creation.

---

## Step 7 — Modify Procedure

Reconnect application owner.

Run:

**[SQL*PLUS]**

```sql
CREATE OR REPLACE PROCEDURE show_customer_count
AS
  l_count NUMBER;
BEGIN
  SELECT COUNT(*)
  INTO   l_count
  FROM   customer_secure;

  DBMS_OUTPUT.PUT_LINE('CURRENT CUSTOMER COUNT=' || l_count);
END;
/
```

---

## Step 8 — Retrieve Again

Reports:

**[WEB CONSOLE]**

```text
Stored Procedure Changes
    ↓
Retrieve Now
```

---

## Step 9 — Interpretation

Stored Procedure Auditing answers:

---
