# SCENARIO 07
# SENSITIVE DATA, ROW COUNT, EXFILTRATION SIGNAL, DAN ALERT

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 07 of 12.
> Expected output is intentionally omitted.

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 07 — Sensitive Data, Row Count, Exfiltration Signal dan Alert
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 07
```

---

## Step 1 — Known SQL

Connect:

**[OS TERMINAL]**

```bash
sqlplus -L 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1'
```

Run:

**[SQL*PLUS]**

```sql
SELECT customer_name,
       credit_limit
FROM avdf_d2_app.customer_secure
WHERE customer_id=1;
```

Firewall expected:

---

## Step 2 — Same Pattern, Different Literal

**[SQL*PLUS]**

```sql
SELECT customer_name,
       credit_limit
FROM avdf_d2_app.customer_secure
WHERE customer_id=5;
```

Should remain same baseline cluster pattern.

---

## Step 3 — Sensitive Full-Table Read

**[SQL*PLUS]**

```sql
SELECT *
FROM avdf_d2_app.customer_secure;
```

Firewall event should show:

---

## Step 4 — Sensitive UPDATE

**[SQL*PLUS]**

```sql
UPDATE avdf_d2_app.customer_secure
SET account_status='REVIEW'
WHERE customer_id=1;

ROLLBACK;
```

Network evidence remains even though transaction is rolled back.

---

## Step 5 — Generate Default Rule Activity

Run:

**[SQL*PLUS]**

```sql
SELECT SYSDATE
FROM dual;
```

If not in baseline and no earlier specific rule matches:

```text
DEFAULT_RULE
Action   : Alert
Severity : Moderate
```

---

## Step 6 — Create Row Count Alert

Policies:

**[REFERENCE / CONCEPT]**

```text
Alert Policies
    ↓
Create
```

Name:

```text
LAB_D4_LARGE_RESULT
```

Configure:

```text
Severity : Critical
Target   : PDB1_26AI
User     : AVDF_D2_READER
Object   : CUSTOMER_SECURE

Condition:
upper(:USER)='AVDF_D2_READER'
AND :ROW_COUNT > 3
```

Important v0.8 threshold:

```text
ROW_COUNT > 3
```

---

## Step 7 — Trigger Large Result

Run again:

**[SQL*PLUS]**

```sql
SELECT *
FROM avdf_d2_app.customer_secure;
```

---

## Step 8 — Verify Large Result Alert

Navigate:

**[WEB CONSOLE]**

```text
Alerts
```

---

## Step 9 — Repeated Query Frequency Test

Run multiple small queries:

**[OS TERMINAL]**

```bash
for i in 1 2 3 4 5 6 7 8 9 10
do
sqlplus -L -s 'avdf_d2_reader/Oracle#D2Read26@//192.168.56.26:1521/PDB1' <<'EOF'
SELECT COUNT(*)
FROM avdf_d2_app.customer_secure;
EXIT
EOF
done
```

Use Reports to observe repeated traffic frequency.

---
