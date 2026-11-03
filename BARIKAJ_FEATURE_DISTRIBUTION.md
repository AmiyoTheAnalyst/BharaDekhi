# BariKaj — Comprehensive Feature Architecture & Project Specification
**Course:** CSE470 | **Project Type:** Individual Comprehensive System | **Scope:** 25 End-to-End System Workflows  
**Author / Sole Developer:** Amiyo

---

## 1. Executive Project Overview
**BariKaj** is a full-stack, enterprise-grade Apartment & Community Samity Management platform designed following the Model-View-Controller (MVC) architectural pattern. The system automates end-to-end building administration, resident billing, guard logistics, procurement approvals, and financial audits.

The project encompasses **25 fully articulated workflows** organized into 4 cohesive architectural subsystems, designed, implemented, and maintained end-to-end by a single developer.

---

## 2. Core Subsystems & Complete Workflow Breakdown

```
+---------------------------------------------------------------------------------------------------+
|                                       BARIKAJ UNIFIED PLATFORM                                    |
+---------------------------------+---------------------------------+-------------------------------+
|  1. Resident & Property Mgmt    |  2. Security & Logistics        |  3. Maintenance & Procurement |
|     (7 Workflows)               |     (6 Workflows)               |     (6 Workflows)             |
+---------------------------------+---------------------------------+-------------------------------+
                                  |
                                  v
+---------------------------------------------------------------------------------------------------+
|                          4. Samity Finance, Petty-Cash & Audit Subsystem                          |
|                                       (6 Workflows)                                               |
+---------------------------------------------------------------------------------------------------+
```

---

### Subsystem 1: Property Configuration, Resident Billing & Facility Monitoring
*Primary Focus: Building hierarchy, tenancy records, utility planning, facility bookings, and heavy equipment monitoring.*

1. **Building Unit & Monthly Service Charge Planning** `[Core]`  
   Dynamic configuration of floors, flat units, square footage, and rule-based monthly service charge matrix calculation.
2. **Flat Occupancy & Owner–Tenant Liability Split Management** `[Core]`  
   Tracking owner vs. tenant residency status, automated allocation of maintenance fees between landlords and tenants.
3. **Common Facility & Rooftop Slot Allocation** `[Core]`  
   Automated conflict-free scheduling and slot reservations for rooftop events, community halls, and common amenities.
4. **Resident Dues Collection & Arrears Verification** `[Core]`  
   Automated monthly invoice generation, digital/cash collection tracking, and real-time ledger arrears calculation.
5. **Move-In / Move-Out Gate Pass & Arrears Hold Control** `[Core]`  
   Enforcement of automated clearance gates; blocks move-out passes if pending service charges or damage dues exist.
6. **Generator Run-Hour Logging & Fuel Anomaly Detection** `[Core]`  
   Tracking generator run hours against diesel consumption logs to detect efficiency dips, fuel leakage, or pilferage.
7. **Scheduled Lift & Pump Preventive Servicing Control** `[Core]`  
   Calendar- and meter-based preventive maintenance scheduling for water pumps and lifts with inspection audit trails.

---

### Subsystem 2: Security Guard Operations, Logistics & Daily Building Inventory
*Primary Focus: Security desk automation, shift scheduling, inventory issuance, and property resource allocation.*

8. **Guard & Maintenance Staff Onboarding & Duty Assignment** `[Core]`  
   Staff profile registry, identity verification records, role assignments, and active gate post allocations.
9. **Guard Shift Roster & Coverage Swap Management** `[Core]`  
   Automated 24/7 guard shift scheduling, attendance logs, and guard-initiated coverage swap request handling.
10. **Consumable & Fuel Issuance to Building Operations** `[Core]`  
    Controlled dispatch of diesel, cleaning supplies, and replacement bulbs from warehouse storage to active staff.
11. **Unclaimed Parking & Storage Slot Reallocation** `[Core]`  
    Auditing idle or unclaimed parking bays and basement storage units with temporary reassignment capabilities.
12. **Shared Building Tool & Equipment Lending** `[Core]`  
    Lending ledger for shared tools (ladders, drills, high-pressure washers) with return condition tracking and deposit holds.
13. **Visitor & Contractor Temporary Access Pass Processing** `[Additional]`  
    Digital check-in kiosk for visitors and delivery personnel with resident verification and time-stamped gate passes.

---

### Subsystem 3: Maintenance Triage, Quotation Benchmarking & Procurement
*Primary Focus: Incident ticketing, vendor selection, multi-tier approvals, delivery audits, and external leasing.*

14. **Maintenance Complaint Triage & Work-Order Requests** `[Core]`  
    Central ticketing portal for residents/guards to file issues with photos, severity ratings, and automated work-order dispatch.
15. **Technician & Vendor Quotation Comparison** `[Core]`  
    Side-by-side comparison matrix for vendor bids, evaluating warranty, material quality, labor cost, and timeline.
16. **Repair & Purchase Authorization** `[Core]`  
    Multi-tier role-based approval engine requiring Samity committee sign-off before funds or work orders are released.
17. **Spare Parts & Diesel Delivery Verification** `[Core]`  
    Three-way matching between purchase orders, physical delivery waybills, and stock intake receipts before invoice approval.
18. **Emergency Breakdown Fast-Track Authorization** `[Additional]`  
    Urgent bypass workflow for critical infrastructure breakdowns (e.g., main water pump failure, lift entrapment).
19. **External Roof/Wall Lease & Telecom Tower Obligation Tracking** `[Additional]`  
    Contract management for rooftop telecom towers, billboard leases, and periodic payment compliance tracking.

---

### Subsystem 4: Samity Finance, Petty-Cash Reconciliation & Audit Closeout
*Primary Focus: Liquidity management, utility settlements, balance sheets, penalty enforcements, and AGM handovers.*

20. **Caretaker Petty Cash Advance Management** `[Core]`  
    Disbursement, threshold tracking, and replenishment of emergency petty cash floats with mandatory receipt scans.
21. **Emergency Repair Expense Reimbursement** `[Core]`  
    Validation and settlement workflow for out-of-pocket expenses incurred by committee members or caretakers during crises.
22. **Vendor & Utility Bill Payment Reconciliation** `[Core]`  
    Reconciliation of DESCO (electricity), WASA (water), and Titash (gas) utility bills against monthly budget allocations.
23. **Monthly Samity Financial Closing & Audit Sheet** `[Core]`  
    Automated monthly reconciliation cross-referencing collections, fuel usage, vendor payments, and cash-in-hand balances.
24. **Common Property Damage & Penalty Resolution** `[Additional]`  
    Incident reporting for property damage, fault determination, repair cost assessment, and automated billing to the liable party.
25. **Annual General Meeting (AGM) Accountability & Handover Review** `[Additional]`  
    Generation of cumulative yearly audit packs, balance sheets, asset registries, and transition documentation for new committees.

---

## 3. End-to-End Architectural Integration Pipeline

Rather than relying on fragmented handoffs, the system operates as a unified, data-driven MVC pipeline:

```
[ Resident Dues & Billing ] ------------+
                                         |
[ Security & Stock Issuance ] ----------+---> [ Unified Data Warehouse & MVC Backend ]
                                         |      - Role-Based Access Control (RBAC)
[ Maintenance & Quotations ] -----------+      - Transactional Database Integrity
                                         |      - Automated Audit Trails
[ Petty Cash & Utilities ] --------------+
                                         |
                                         v
               [ Monthly Financial Closing & AGM Audit Reports ]
```

1. **Resident Management ↔ Operational Clearance:**  
   The Resident Dues engine enforces gate controls—tenants with outstanding liabilities are automatically flagged, preventing the issuance of Move-Out Gate Passes until full clearance.
2. **Operations ↔ Inventory Consistency:**  
   Diesel disbursements logged at the security desk directly feed into the Generator Run-Hour analyzer to flag fuel consumption discrepancies.
3. **Procurement ↔ Warehouse Intake:**  
   Verified deliveries of spare parts automatically replenish inventory counts, updating available stock for maintenance work orders.
4. **Maintenance ↔ Financial Ledger:**  
   Approved technician invoices and fast-track emergency repairs flow straight into the Vendor Reconciliation queue and the Caretaker Petty Cash ledger.
5. **Unified Audit Engine:**  
   Every transaction across all 25 workflows feeds directly into the Monthly Samity Financial Closing module, ensuring complete transparency and zero manual accounting errors for the CSE470 viva.

---

## 4. Single-Developer Scope & Execution Commitment
- **Full Architecture & Implementation:** Sole ownership of database schema design, backend MVC controllers, REST endpoints, UI views, and validation logic.
- **Testing & Quality Assurance:** Comprehensive unit and integration testing across all 25 workflows.
- **Viva Defense:** Complete command of the entire application architecture, database normalization, state machines, and business rules.

