# SCENARIO 04
# AUDIT VAULT AGENT, HOST MONITOR, DATABASE FIREWALL

> AVDF Training Simulator v0.8 — Student Edition.
> Sequence: 04 of 12.
> Expected output is intentionally omitted.

## Starting checkpoint — Simulator v0.8

**[WEB CONSOLE]**

```text
TRAINING
    ↓
Instructor / Trainer
    ↓
Start Scenario 04 — Audit Vault Agent, Host Monitor, Database Firewall
```

Pastikan indikator:

```text
Current training checkpoint
```

menampilkan:

```text
Start Scenario 04
```

---

## Step 1 — Register Database Host

Administrator:

**[WEB CONSOLE]**

```text
Agents
```

Register:

**[WEB CONSOLE]**

```text
Host Name  : db26ai
IP Address : 192.168.56.26
```

---

## Step 2 — Download Agent

Use:

```text
Download Agent
```

OS path concept:

```text
/home/oracle/agent.jar
```

---

## Step 3 — Install Agent

Use Install.

Get activation key.

Activate.

---

## Step 4 — Verify Agent from OS

**[OS TERMINAL]**

```bash
cd /home/oracle/avdf_agent/bin
./agentctl status
```

---

## Step 5 — Download Host Monitor

Administrator Agent page:

```text
Download Host Monitor
```

---

## Step 6 — Install Host Monitor

Use Install Host Monitor.

---

## Step 7 — Register DBFW1

Navigate:

**[WEB CONSOLE]**

```text
Database Firewalls
```

Register:

**[WEB CONSOLE]**

```text
Name        : DBFW1
IP          : 192.168.56.27
NIC         : eth0
Fingerprint : training SHA-256 fingerprint
```

AVCLI:

**[AVCLI]**

```text
LIST FIREWALL;
```

---

## Step 8 — Create Monitoring Point

AVCLI:

**[AVCLI]**

```text
CREATE DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI
USING FIREWALL DBFW1;
```

Important v0.8 behavior:

**[REFERENCE / CONCEPT]**

```text
new monitoring point
    ↓
Stopped
```

It is not automatically Running.

---

## Step 9 — Verify Monitoring Point

**[AVCLI]**

```text
LIST DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

---

## Step 10 — Start Monitoring Point

**[AVCLI]**

```text
START DATABASE FIREWALL MONITOR
FOR TARGET PDB1_26AI;
```

Verify:

```text
Status : Running
```

---

## Step 11 — Add NETWORK Trail

Web:

**[REFERENCE / CONCEPT]**

```text
Targets
    ↓
Audit Trails
    ↓
Add NETWORK Trail
```

---
