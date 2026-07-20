# Sprint 4 Phase 1: Workbook Analysis Package

## Status and Authority

Phase 1 analysis artifact for Product Owner review.

This package documents the current Excel Pricing Tool exactly as inspected. It does
not authorize Phase 2, does not change the workbook, and does not redefine pricing
methodology. Findings labeled **Current workbook behavior** describe what Excel does
today. Findings labeled **Recommendation** are proposed platform behavior and require
Product Owner approval before calculation code is written.

Authoritative source:

- File: `reference/Cotarion_Pricing_Tool.xlsx`
- SHA-256: `E7EEC1924B9CE79ACFCF1F1199A50B4C21C14980E8074D7CFFFCEC0212144A18`
- File size: 11,988,773 bytes
- Workbook modified timestamp: 2026-07-15 14:38:11 -05:00
- Analysis date: 2026-07-17
- Analysis method: Microsoft Excel desktop calculation engine, workbook opened
  read-only, with no saved changes

The Sprint 4 calculation boundary is project pricing. Retainer, AOP, profit-share,
and hybrid-payment logic is inventoried only where it intersects the workbook, and
remains deferred to Sprint 7.

## Executive Findings

The workbook contains a coherent core project-pricing method:

1. Select predefined services and quantities.
2. Multiply quantity by catalog price for each line.
3. Add configured complexity increments to a base multiplier of `1.00`.
4. Apply that multiplier to the service subtotal.
5. Apply one selected client discount to the complexity-adjusted amount.
6. Display the final project price as USD currency.

The core formula is:

`final project price = service subtotal × (1 + sum of complexity increments) × (1 - selected discount rate)`

The current workbook does not explicitly round the project calculations. It retains
Excel numeric precision and formats displayed currency to two decimal places.

The analysis also found material workbook defects or inconsistencies that must not be
silently copied into the platform:

- The project subtotal sums `F10:F13`, although service rows 10 through 14 are
  visibly selectable and formulas also exist through row 15. A service entered on
  row 14 is priced on that line but omitted from the final total.
- Every complexity selector uses the Business Size validation list, so five of the
  six factor rows cannot select their intended choices through the dropdown.
- Service dropdowns for rows 10 through 14 all reference the category-filtered list
  for row 10. Additional helper formulas use mismatched row references and one
  currently returns `#SPILL!`.
- Category and service are not cross-validated by the price formula. A service can be
  paired with an unrelated category and still receive its catalog price.
- Quantity has no effective validation. Negative, zero, fractional, or blank
  quantities are accepted.
- The `Discount_Eligible` service column contains category names rather than a
  boolean or eligibility code, and project discount formulas do not consult it.
- `CALC_Totals` checks `Pricing_Console!B7` for Project mode, while the Engagement
  Mode input is `B6`.
- Several retainer inputs share the same term validation list despite representing
  different concepts. This is outside Sprint 4 but is a confirmed workbook defect.
- The Pricing Console used range extends to row 1,048,563, apparently because of
  residual formatting rather than business data.

Product Owner decisions are therefore required before Phase 2. The recommended
baseline preserves the intended methodology and catalog values, while treating the
mechanical spreadsheet defects separately rather than defining them as business
rules.

## 1. Workbook Inventory

The workbook contains 11 worksheets. No worksheet or workbook structure is
protected. Cells are generally marked as locked, but locking has no effect while the
worksheets remain unprotected.

| # | Worksheet | Visibility | Used range | Formula cells | Constant cells | Purpose |
|---:|---|---|---|---:|---:|---|
| 1 | `Pricing_Console` | Visible | `A1:AB1048563` | 42 | 48 | Primary data-entry and calculation screen |
| 2 | `DATA_Services` | Hidden | `A1:I30` | 29 | 241 | Project Service Catalog and client-facing text |
| 3 | `DATA_RetainerScope` | Hidden | `A1:D10` | 0 | 40 | Deferred retainer scope text |
| 4 | `DATA_Discounts` | Hidden | `A1:F4` | 0 | 24 | Discount definitions |
| 5 | `DATA_Complexity` | Hidden | `A1:D18` | 0 | 72 | Complexity factors and increments |
| 6 | `DATA_Retainer` | Hidden | `A1:F4` | 0 | 20 | Deferred retainer prices and term discounts |
| 7 | `CALC_Totals` | Hidden | `A1:B16` | 15 | 17 | Calculation/output bridge |
| 8 | `Proposal_Client_Data` | Hidden | `A2:H43` | 22 | 33 | Proposal presentation data |
| 9 | `Proposal_Client_View` | Visible | `B1:K45` | 81 | 91 | Print-oriented proposal view |
| 10 | `Contract_Client_Data` | Hidden | `A1:H34` | 9 | 93 | Agreement presentation data |
| 11 | `Contract_Client_View` | Visible | `A1:I119` | 278 | 81 | Print-oriented agreement view |

The inflated `Pricing_Console` used range is not evidence of one million pricing
records. Its meaningful project-pricing content is concentrated in the top 54 rows,
with helper formulas in columns Y through AB.

### Hidden Sheet Inventory

There are eight normally hidden worksheets:

- `DATA_Services`
- `DATA_RetainerScope`
- `DATA_Discounts`
- `DATA_Complexity`
- `DATA_Retainer`
- `CALC_Totals`
- `Proposal_Client_Data`
- `Contract_Client_Data`

There are no `VeryHidden` worksheets. The four visible/hidden output sheets for
proposals and contracts exceed Sprint 4 output scope: Sprint 4 requires an internal,
print-ready review and does not generate or store proposal PDFs or agreements.

### Excel Table Inventory

| Table name | Worksheet | Range | Finding |
|---|---|---|---|
| `DATA_Services` | `DATA_Services` | `A1:I30` | Valid catalog table |
| `DATA_Discounts` | `DATA_Discounts` | `A1:F4` | Valid discount table |
| `DATA_Complexity` | `DATA_Complexity` | `A1:D18` | Valid complexity table |
| `Table9` | `DATA_Retainer` | `A1:C4` | Deferred; generic table name |

`DATA_RetainerScope` and the term-discount portion of `DATA_Retainer` are plain
ranges, not Excel tables.

## 2. Named Range Inventory

The workbook has no business-oriented workbook-level named ranges.

| Name | Visibility | Refers to | Assessment |
|---|---|---|---|
| `_xlfn._LONGTEXT` | Hidden | `=#NAME?` | Excel compatibility/internal name |
| `_xlfn._xlws.FILTER` | Hidden | `=#NAME?` | Excel compatibility/internal name |
| `_xlfn.ANCHORARRAY` | Hidden | `=#NAME?` | Excel compatibility/internal name |
| `_xlfn.IFERROR` | Hidden | `=#NAME?` | Excel compatibility/internal name |
| `_xlfn.UNIQUE` | Hidden | `=#NAME?` | Excel compatibility/internal name |
| `_xlfn.XLOOKUP` | Hidden | `=#NAME?` | Excel compatibility/internal name |
| `Contract_Client_Data!Print_Area` | Visible | `A1:H34` | Sheet print area |
| `Proposal_Client_View!Print_Area` | Visible | `B1:I47` | Sheet print area |

The `_xlfn` entries should not become Pricing Configuration fields. They reflect
Excel function compatibility metadata, not business logic.

## 3. Input Inventory

### Project-Pricing Inputs

| Input | Workbook cell(s) | Current control | Required/optional in workbook | Current behavior |
|---|---|---|---|---|
| Business name | `B2` | Free text | Optional | Passed to outputs |
| Primary contact | `B3` | Free text | Optional | Passed to outputs |
| Email | `B4` | Free text | Optional | Passed to outputs |
| Engagement mode | `B6` | List: Project, Retainer, Hybrid | Optional | Selects downstream presentation behavior |
| Service category | `B10:B14` | List of five categories | Optional | Intended to filter services; not used in price lookup |
| Service | `C10:C14` | Dynamic-list validation | Optional | Exact client label drives price lookup |
| Quantity | `D10:D14` | Unvalidated numeric cell | Optional; row 10 defaults to 1 | Multiplied directly by unit price |
| Business Size | `B17` | Dropdown | Optional | Selected term maps to an increment |
| Multi-Location | `B18` | Incorrect shared dropdown | Optional | Blank acts as zero |
| Multi-Department | `B19` | Incorrect shared dropdown | Optional | Blank acts as zero |
| Condition Severity | `B20` | Incorrect shared dropdown | Optional | Blank acts as zero |
| Industry Severity | `B21` | Incorrect shared dropdown | Optional | Blank acts as zero |
| Urgency / Timeline | `B22` | Incorrect shared dropdown | Optional | Blank acts as zero |
| Client discount | `B42` | List: None, Pro Bono / Volunteer, Nonprofit, Veteran-Owned | Optional | One selection; blank/None maps to 0% |

Formulas also exist in `E15:F15`, but row 15 has no complete visible input structure
or validation. Rows 10 through 14 appear to be the intended five service rows.

### Deferred Inputs Present in the Workbook

The workbook also contains Retainer Term, Retainer Level, Retainer Type, adjusted
operating profit inputs, and hybrid/profit-share calculations. They are explicitly
outside Sprint 4 and must not enter the Sprint 4 Pricing Configuration.

## 4. Output Inventory

### Direct Project-Pricing Outputs

| Output | Cell | Formula/meaning |
|---|---|---|
| Unit price | `E10:E15` | Catalog price found by service client label |
| Line total | `F10:F15` | Quantity × unit price |
| Factor increments | `C17:C22` | Lookup of selected complexity term |
| Combined complexity multiplier | `C23` | `1 + SUM(C17:C22)` |
| Selected discount rate | `B43` | Lookup of discount percentage |
| Base project subtotal | `B47` | `SUM(F10:F13)` |
| Complexity-adjusted subtotal | `B48` | `B47 × C23` |
| Project discount amount | `B49` | `B48 × B43` |
| Final project total | `B50` | `B48 - B49` |

### Downstream Output Flow

`CALC_Totals` exposes the client fields, engagement type, final project total,
discount amount, and deferred payment-model totals. `Proposal_Client_Data` then
builds:

- Client and primary contact
- Proposal date using `TODAY()`
- Engagement overview
- Selected service names and proposal descriptions
- Project investment
- Adjusted project investment
- Estimated engagement value
- Amount due now

`Proposal_Client_View` formats those values as a client-facing proposal.
`Contract_Client_Data` and `Contract_Client_View` format agreement data and terms.
These views establish useful historical context, but Proposal Builder is Sprint 5
and agreements are not included in Sprint 4.

## 5. Service Catalog Inventory

The workbook contains 29 predefined project services across five categories. Every
row has `Pricing_Model = Project` and USD is implied by formatting, not stored in the
catalog.

| Order | Service code | Category | Client label | Base price |
|---:|---|---|---|---:|
| 1 | `DIAG – Business Strategy Session` | Diagnostics | Business Strategy Session | $250 |
| 2 | `DIAG – Client Experience Diagnostic` | Diagnostics | Client Experience Diagnostic | $350 |
| 3 | `DIAG – Operational Efficiency Diagnostic` | Diagnostics | Operational Efficiency Diagnostic | $350 |
| 4 | `CORE – Business Launch & Foundation Package` | Core Packages | Business Launch & Foundation Package | $3,000 |
| 5 | `CORE – Operations Optimization Package` | Core Packages | Operations Optimization Package | $6,500 |
| 6 | `CORE – Leadership & Team Excellence Package` | Core Packages | Leadership & Team Excellence Package | $4,500 |
| 7 | `CORE – Client Experience & Growth Package` | Core Packages | Client Experience & Growth Package | $5,000 |
| 8 | `TRAIN – Associate Client Experience Training Basic (2 hours)` | Training Programs | Associate Client Experience Training Basic (2 hours) | $400 |
| 9 | `TRAIN – Associate Client Experience Extended Half-Day` | Training Programs | Associate Client Experience Extended Half-Day | $900 |
| 10 | `TRAIN – Associate Client Experience Extended Full-Day` | Training Programs | Associate Client Experience Extended Full-Day | $1,500 |
| 11 | `TRAIN – Sales Skill Development Training Basic (2 hours)` | Training Programs | Sales Skill Development Training Basic (2 hours) | $450 |
| 12 | `TRAIN – Sales Skill Development Extended Half-Day` | Training Programs | Sales Skill Development Extended Half-Day | $1,000 |
| 13 | `TRAIN – Sales Skill Development Extended Full-Day` | Training Programs | Sales Skill Development Extended Full-Day | $1,800 |
| 14 | `TRAIN – Manager & Leadership Training Basic (2 hours)` | Training Programs | Manager & Leadership Training Basic (2 hours) | $500 |
| 15 | `TRAIN – Manager & Leadership Extended Half-Day` | Training Programs | Manager & Leadership Extended Half-Day | $1,200 |
| 16 | `TRAIN – Manager & Leadership Extended Full-Day` | Training Programs | Manager & Leadership Extended Full-Day | $2,000 |
| 17 | `COACH – Team Coaching Basic (60 minutes)` | Coaching Programs | Team Coaching Basic (60 minutes) | $250 |
| 18 | `COACH – Team Coaching Extended Half-Day` | Coaching Programs | Team Coaching Extended Half-Day | $600 |
| 19 | `COACH – Team Coaching Extended Full-Day` | Coaching Programs | Team Coaching Extended Full-Day | $1,000 |
| 20 | `COACH – Team Coaching – 3 Session Bundle (60 minutes each)` | Coaching Programs | Team Coaching – 3 Session Bundle (60 minutes each) | $600 |
| 21 | `COACH – Team Coaching – 5 Session Bundle (60 minutes each)` | Coaching Programs | Team Coaching – 5 Session Bundle (60 minutes each) | $1,000 |
| 22 | `COACH – Process Coaching Session (60 minutes)` | Coaching Programs | Process Coaching Session (60 minutes) | $300 |
| 23 | `COACH – Advanced Process Coaching Session (90 minutes)` | Coaching Programs | Advanced Process Coaching Session (90 minutes) | $450 |
| 24 | `ADDON – Simple SOP` | Add-Ons | Simple SOP | $75 |
| 25 | `ADDON – Complex SOP` | Add-Ons | Complex SOP | $150 |
| 26 | `ADDON – Simple Workflow` | Add-Ons | Simple Workflow | $300 |
| 27 | `ADDON – Complex Workflow` | Add-Ons | Complex Workflow | $500 |
| 28 | `ADDON – 1-Week Extension` | Add-Ons | 1-Week Extension | $300 |
| 29 | `ADDON – 1-Month Support` | Add-Ons | 1-Month Support | $900 |

### Catalog Field Inventory

The source table columns are:

- `Service_Code`
- `Category`
- `Client_Label`
- `Base_Price`
- `Pricing_Model`
- `Discount_Eligible`
- `Category_Service`
- `Scope_Text`
- `Proposal_Description`

Every service has long-form scope text and a shorter proposal description. These
texts should be carried into the seed without editorial changes only after the
Product Owner approves them. They are not pricing calculations.

### Catalog Findings

- `Discount_Eligible` contains the service category (for example, `Diagnostics` or
  `Core Packages`), not a boolean or discount policy.
- `Category_Service` duplicates category and client label into a single string.
- Service code values use a typographic en dash and descriptive text rather than a
  compact stable code.
- The Business Launch package and Operational Efficiency Diagnostic have the same
  short proposal description in the source. This appears to be duplicated text and
  should be reviewed.
- All services are implicitly active; there is no active/inactive field.
- Currency is implied rather than explicit.

## 6. Complexity Inventory

The workbook defines six additive complexity factors and 17 non-zero choices.
Blank means no increment. There are no explicit Standard choices in the table.

| Factor | Option | Increment | Effective multiplier if selected alone |
|---|---|---:|---:|
| Business Size | 6–15 people | 0.10 | 1.10 |
| Business Size | 16–40 people | 0.20 | 1.20 |
| Business Size | 41+ people | 0.30 | 1.30 |
| Multi-Location | 2–3 locations | 0.10 | 1.10 |
| Multi-Location | 4–7 locations | 0.20 | 1.20 |
| Multi-Location | 8+ locations | 0.30 | 1.30 |
| Multi-Department | 3–4 departments | 0.10 | 1.10 |
| Multi-Department | 5–7 departments | 0.20 | 1.20 |
| Multi-Department | 8+ departments | 0.30 | 1.30 |
| Condition Severity | Noticeable Operational Issues | 0.15 | 1.15 |
| Condition Severity | Severe Dysfunction | 0.25 | 1.25 |
| Condition Severity | Crisis Condition | 0.40 | 1.40 |
| Industry Severity | Moderate Complexity Industries | 0.10 | 1.10 |
| Industry Severity | High Complexity Industries | 0.20 | 1.20 |
| Industry Severity | Very High Complexity Industries | 0.30 | 1.30 |
| Urgency / Timeline | Accelerated Timeline | 0.20 | 1.20 |
| Urgency / Timeline | Urgent / Critical Timeline | 0.35 | 1.35 |

**Current workbook behavior:** increments combine additively:

`combined multiplier = 1.00 + increment 1 + increment 2 + ...`

They do not multiply each other. For example, `0.10 + 0.10 + 0.25` produces
`1.45`, not `1.5125`.

The maximum configured combination is `2.95`:

`1 + 0.30 + 0.30 + 0.30 + 0.40 + 0.30 + 0.35`.

The workbook does not enforce one choice per factor through formula semantics; it
merely exposes one cell per factor. Lookup is based only on option text, so option
labels must remain globally unique.

## 7. Discount Inventory

| Discount | Eligible Product | Rate | Fixed retainer | Profit-share/hybrid | Description present |
|---|---|---:|---|---|---|
| Pro Bono / Volunteer | All | 100% | Yes | No | Yes |
| Nonprofit | All | 10% | Yes | No | Yes |
| Veteran-Owned | All | 10% | Yes | No | Yes |

The console adds `None` as a UI choice; it is not a row in `DATA_Discounts`.

**Current project behavior:**

- Only one client discount cell exists, so standard discounts do not stack.
- Blank and None both produce 0%.
- The discount applies after complexity to the entire adjusted project subtotal.
- The service catalog's `Discount_Eligible` field is ignored.
- The `Eligible Product` and payment-model eligibility fields are ignored by the
  project formula.
- A 100% Pro Bono / Volunteer selection reduces the final project total to $0.
- There is no manual percentage entry and no manual price override.

Term discounts are defined as 0% for 3 months, 5% for 6 months, and 10% for 12
months, but they are applied only in deferred retainer formulas. No term discount
participates in `B47:B50`, the project-pricing chain. The evidence therefore
supports excluding term discounts from Sprint 4.

## 8. Rounding and Precision Inventory

### Current Workbook Behavior

- Service prices are whole-dollar source values.
- Quantity is stored as an unrestricted Excel number.
- Line totals use direct multiplication with no `ROUND`.
- Complexity uses direct addition and multiplication with no `ROUND`.
- Project discount uses direct multiplication with no `ROUND`.
- Final project total uses subtraction with no `ROUND`.
- Currency cells display two decimal places.
- Percentage cells display percentage formatting, but underlying decimal precision
  is not explicitly constrained.
- Excel uses binary floating-point numeric behavior.

Observed case: quantity `1/3` × $250 produces an underlying
`83.3333333333333`, displayed as `$83.33`. The stored/calculated value is not
rounded to cents.

### Recommendation Requiring Approval

Use decimal arithmetic in the platform, explicitly store USD, and round money to
two decimal places using one approved midpoint rule. The Product Owner must decide
whether to:

1. round each line total before subtotaling;
2. round only the final project total;
3. round complexity adjustment and discount amounts at intermediate steps; and
4. permit fractional quantities and, if so, to how many decimal places.

No rounding policy should be inferred from display formatting alone.

## 9. Formula Dependency Map

### Primary Project-Pricing Chain

```text
DATA_Services.Client_Label + Base_Price
    -> selected service C10:C15
    -> unit price E10:E15

quantity D10:D15 + unit price E10:E15
    -> line total F10:F15
    -> base subtotal B47 (currently only F10:F13)

DATA_Complexity.Term + Multiplier
    -> selected factor terms B17:B22
    -> factor increments C17:C22
    -> combined multiplier C23 = 1 + SUM(increments)

base subtotal B47 × combined multiplier C23
    -> adjusted subtotal B48

DATA_Discounts.Discount Type + Discount %
    -> selected discount B42
    -> discount rate B43

adjusted subtotal B48 × discount rate B43
    -> discount amount B49

adjusted subtotal B48 - discount amount B49
    -> final project total B50
```

### Downstream Presentation Chain

```text
Pricing_Console client fields + B50 + B49
    -> CALC_Totals
    -> Proposal_Client_Data
    -> Proposal_Client_View

Pricing_Console / CALC_Totals
    -> Contract_Client_Data
    -> Contract_Client_View
```

The proposal service list independently filters `Pricing_Console!C10:C14`, then
looks up `DATA_Services!I:I` for proposal descriptions. As a result, a row-14
service can appear in the proposal even though it is omitted from the project total.
That is a material cross-output inconsistency.

### Exact Project Formulas

```text
unit price       = XLOOKUP(selected client label, catalog client label, base price)
line total       = quantity × unit price
complexity       = 1 + SUM(selected increments)
base subtotal    = SUM(F10:F13)
adjusted subtotal= base subtotal × complexity
discount amount  = adjusted subtotal × discount rate
final total      = adjusted subtotal - discount amount
```

## 10. Manual Process Inventory

The workbook contains no workflow instructions, audit log, approval state, version
history, immutable snapshot, or record ownership. The following process is inferred
from sheet layout and formulas and requires Product Owner confirmation:

1. Open the shared workbook.
2. Enter business name, primary contact, email, and engagement mode.
3. Select a category and service for each desired line.
4. Enter a quantity.
5. Select applicable complexity choices.
6. Select one client discount or None.
7. Review the base subtotal, adjusted subtotal, discount, and final total.
8. Open the proposal view to review or print client-facing content.
9. Open the contract view to review or print agreement content.
10. Save/copy/rename the workbook outside any controlled record model if history is
    needed.

Manual risks include accidental formula edits, stale copied workbooks, no client or
company isolation, no immutable estimate number, no explicit configuration version,
no snapshot action, no durable project status, and no traceable approval.

Sprint 4 replaces these record-management weaknesses with Client-linked Pricing
Projects and explicit Save Version behavior, but must not introduce proposal or
agreement generation.

## 11. Workbook Assumptions

The workbook appears to assume:

- All prices are USD.
- All catalog services use project pricing.
- Client label is unique and stable enough to serve as a lookup key.
- Option text is unique across complexity factors.
- Blank complexity means Standard/no added complexity.
- Complexity increments add rather than compound.
- One client discount applies to the entire adjusted project subtotal.
- Client discounts do not stack.
- Service quantities default conceptually to one, although only the first row has a
  visible default.
- Users select only valid, positive quantities.
- Users do not choose a service inconsistent with its category.
- Users do not use the fifth priced row in a way that requires it to reach totals.
- Displayed two-decimal currency is sufficient even when underlying values contain
  more precision.
- Users have a compatible Excel version supporting `XLOOKUP`, `FILTER`, `UNIQUE`,
  and spill ranges.
- Proposal and agreement content can be generated from the current mutable sheet
  state.
- Workbook copies, filenames, or external handling provide any needed history.

Several of these are fragile technical assumptions rather than approved business
rules.

## 12. Pricing Validation Matrix

These scenarios were executed with the workbook open read-only in Microsoft Excel.
No workbook changes were saved.

| ID | Scenario | Inputs | Current Excel result | Assessment |
|---|---|---|---:|---|
| PV-01 | One service, Standard complexity, no discount | Business Strategy Session × 1 | $250.00 | Baseline passes |
| PV-02 | Quantity multiplication | Operations Optimization Package × 2 | $13,000.00 | Passes |
| PV-03 | Additive combined complexity | $250 service; 10% size + 10% locations + 25% condition | $362.50; multiplier 1.45 | Confirms additive rule |
| PV-04 | Nonprofit discount | $6,500 service; 10% | $5,850.00; discount $650.00 | Passes |
| PV-05 | Pro Bono / Volunteer | $6,500 service; 100% | $0.00; discount $6,500.00 | Passes formula; policy approval needed |
| PV-06 | Fifth visible service row only | Simple SOP in row 14 | Line $75.00; final $0.00 | Defect: line omitted from subtotal |
| PV-07 | Fourth plus fifth rows | $250 in row 13; $75 in row 14 | Final $250.00 | Defect: row 14 omitted |
| PV-08 | Fractional quantity | Business Strategy Session × 1/3 | Underlying $83.3333333333333; display $83.33 | Rounding policy unresolved |
| PV-09 | Category/service mismatch | Add-Ons + Operations Optimization Package | $6,500.00 | Defect: mismatch accepted |
| PV-10 | Negative quantity | Business Strategy Session × -1 | -$250.00 | Defect: invalid quantity accepted |

### Required Platform Validation Cases After Approval

The following become calculation fixtures only after the Product Owner decides the
open questions:

- Every approved service at quantity 1
- Minimum and maximum allowed quantity
- Fractional quantity behavior
- Standard complexity
- Every individual complexity option
- Maximum combined complexity
- Each discount
- Discount plus complexity calculation order
- Zero, blank, negative, and excessive quantity rejection
- Unknown/inactive service rejection
- Category/service consistency
- Currency fixed to USD
- Approved cent-rounding boundaries, including half-cent cases
- Snapshot parity with the mutable draft at Save Version time

## 13. Initial Service Catalog Seed Recommendation

### Proposed Baseline

Seed the 29 inventoried services in the displayed order, subject to explicit Product
Owner approval. Each seed record should include:

- Stable internal identifier generated by the application
- Company ownership
- Stable approved service code
- Business-facing service name from `Client_Label`
- Category
- Base price
- Explicit currency `USD`
- Pricing model fixed to project pricing for Sprint 4
- Long scope text from `Scope_Text`
- Short description from `Proposal_Description`
- Active status
- Display order
- Creation/update metadata

The initial import should preserve workbook names, descriptions, and prices verbatim
until the Product Owner approves editorial corrections. The platform should not use
the mutable client label as its relational key.

### Recommended Intentional Normalization

Subject to approval:

- Replace typographic, descriptive workbook codes with immutable compact service
  codes while retaining the workbook code as source metadata.
- Represent category as controlled data.
- Replace the malformed `Discount_Eligible` value with an explicit approved
  eligibility policy.
- Store currency explicitly as USD.
- Mark all approved initial services active.
- Preserve catalog ordering.
- Do not build Service Catalog management UI until Sprint 6.

## 14. Initial Pricing Configuration Recommendation

Create one immutable, company-scoped baseline configuration version provisionally
identified as `PROJECT-PRICING-1`. The final identifier and effective date require
approval.

Proposed contents:

- Currency: `USD`
- Methodology: project pricing only
- Quantity rule: Product Owner decision required
- Line calculation: quantity × catalog unit price
- Complexity factors: the six inventoried factors
- Complexity options: the 17 inventoried non-zero options
- Standard option: explicit 0.00 increment for every factor
- Combination rule: additive increments on a 1.00 base
- Discount choices: None, Pro Bono / Volunteer, Nonprofit, Veteran-Owned
- Discount stacking: prohibited
- Discount order: after complexity adjustment
- Term discount: excluded from project pricing
- Manual price/discount override: prohibited
- Rounding: Product Owner decision required
- Engine version: separate immutable identifier established in Phase 2
- Configuration snapshot: referenced by every immutable Pricing Project version

This recommendation interprets blank complexity as an explicit Standard option and
includes all valid service lines in a subtotal. Those are proposed improvements to
the platform experience, not claims about literal workbook mechanics.

## 15. Logic Quality Inventory

### Apparently Defective

1. `B47 = SUM(F10:F13)` excludes row 14 despite the input and proposal range
   extending through row 14.
2. Complexity validation for `B17:B22` repeats only Business Size choices.
3. Service validation for `C10:C14` points to the same spill range, based on row
   10's category.
4. Helper filters reference inconsistent category rows; `Z10` currently reports
   `#SPILL!`.
5. Category/service mismatches are accepted.
6. Negative and fractional quantities are accepted without rules.
7. `CALC_Totals!B6:B8`, `B10`, and `B13` test `Pricing_Console!B7`, while the
   Engagement Mode is in `B6`.
8. Retainer Term, Level, and Type inputs share a term-only validation list.
9. The proposal can list a row-14 service that the project total excludes.
10. `Contract_Client_View!A33` contains an apparently malformed/repeated nested
    formula string and requires separate review before any later agreement work.

### Duplicated or Redundant

- `Category_Service` duplicates category and client label.
- `Discount_Eligible` duplicates category rather than expressing eligibility.
- Proposal and contract data/view sheets repeat calculation/output mappings.
- Project totals are mapped through multiple presentation sheets.
- Business Launch and Operational Efficiency Diagnostic appear to share the same
  short proposal description.
- Formulas exist on row 15 even though the designed service-entry range appears to
  end at row 14.

### Obsolete or Outside Sprint 4

- Retainer, AOP, profit-share, and hybrid-payment formulas
- `DATA_RetainerScope`
- Retainer prices and term discounts
- Contract presentation sheets
- Proposal generation sheets for Sprint 4 purposes
- Compatibility names beginning `_xlfn`
- Excess formatted rows in `Pricing_Console`

“Outside Sprint 4” does not mean deleted. It means these elements are not inputs to
the Sprint 4 calculation engine.

### Inconsistent or Fragile

- Currency is format-only rather than stored data.
- Lookup keys are business-facing text.
- Standard complexity is represented by blank rather than an explicit option.
- The maximum number of service lines is unclear: subtotal supports four, proposal
  supports five, and formulas exist for six.
- Catalog eligibility metadata does not match calculation behavior.
- Sheet protection is absent.
- Dynamic-array behavior depends on Excel version and available spill space.
- No formula or presentation version is recorded with an output.

## 16. Recommended Improvements, Separate from Current Behavior

These improvements must not be treated as approved until the Product Owner decides
the corresponding questions:

- Use immutable service identifiers rather than labels for lookups.
- Allow a dynamic number of service lines, all included in totals.
- Enforce positive quantities with approved scale and upper bounds.
- Make Standard an explicit option for every complexity factor.
- Enforce one configured option per factor.
- Enforce service/category consistency through catalog relationships.
- Store USD explicitly.
- Use approved decimal and rounding rules.
- Model discount eligibility explicitly and validate it.
- Exclude term discounts from project pricing.
- Store Pricing Configuration and engine versions with immutable snapshots.
- Generate internal review from a saved immutable snapshot or clearly identified
  draft state, according to the approved Sprint 4 workflow.
- Keep proposal and agreement generation out of Sprint 4.

## 17. Product Owner Decision Register

Every item below requires an explicit decision before the affected Phase 2 contract
or later calculation behavior is finalized.

### Service Catalog

1. Approve all 29 service names and prices as the production baseline.
2. Approve the five categories and their ordering.
3. Approve each workbook service code, or authorize normalized immutable codes.
4. Approve the long scope and short proposal description for every service.
5. Decide whether the duplicated Business Launch short description is an error and
   provide approved replacement text if needed.
6. Confirm that all 29 services are active at launch.
7. Define project discount eligibility by service: all services, selected services,
   selected categories, or another policy.
8. Confirm whether add-ons may be selected without a core service.
9. Confirm whether the Service Catalog has a display-order requirement beyond the
   workbook order.

### Service Lines and Quantity

10. Confirm that Pricing Projects may contain an unlimited/dynamic number of service
    lines rather than the workbook's inconsistent four/five/six-row limits.
11. Confirm whether the same service may appear more than once or must be merged.
12. Define minimum and maximum quantity.
13. Decide whether quantity must be a whole number.
14. If fractional quantities are allowed, approve their decimal scale.
15. Define blank and zero quantity behavior.

### Complexity

16. Approve the six factors, 17 non-zero options, labels, increments, and ordering.
17. Confirm additive combination on a 1.00 base.
18. Confirm explicit Standard options with 0.00 increment for all six factors.
19. Define the Standard labels/bands omitted by the workbook, such as business size
    below 6 people, one location, and fewer than 3 departments.
20. Confirm whether all six factors are required on every Pricing Project.
21. Confirm whether a maximum combined multiplier should be enforced.
22. Confirm whether Industry Severity is independent of the Client's controlled
    Industry field and who selects it.
23. Confirm whether complexity selections need internal notes or evidence.

### Discounts

24. Approve None, Pro Bono / Volunteer 100%, Nonprofit 10%, and Veteran-Owned 10%.
25. Confirm that only one standard client discount may apply.
26. Confirm discounts apply after complexity to the entire adjusted subtotal.
27. Confirm whether Pro Bono / Volunteer may produce a $0 Pricing Project and
    whether additional authorization is required.
28. Define evidence/eligibility requirements for Nonprofit and Veteran-Owned.
29. Confirm term discounts are excluded from Sprint 4 project pricing.
30. Confirm there are no service-level exclusions from client discounts, or approve
    the exclusions.

### Rounding and Money

31. Approve decimal rather than binary floating-point arithmetic.
32. Approve the money rounding mode, including midpoint behavior.
33. Approve whether line totals round to cents before subtotaling.
34. Approve whether the complexity adjustment rounds before discount calculation.
35. Approve whether the discount amount rounds before final subtraction.
36. Approve percentage and multiplier storage precision.
37. Confirm that USD-only values may never be converted in Sprint 4.

### Workflow and Historical Fidelity

38. Confirm that the literal row-14 omission is a workbook defect and must not be
    preserved as methodology.
39. Confirm that invalid dropdowns, category mismatches, negative quantities, and
    malformed downstream formulas are defects rather than business rules.
40. Confirm that Proposal/Contract workbook outputs are reference-only in Sprint 4.
41. Confirm whether the internal review shows both base and adjusted subtotals,
    complexity detail, discount detail, and final price.
42. Confirm whether internal review uses the current draft or requires a saved
    immutable version.
43. Approve the initial Pricing Configuration identifier, version, effective date,
    and activation mechanism.
44. Confirm whether configuration is seeded identically per Company or initially
    global with company-owned copies, consistent with the approved company-scoping
    architecture.
45. Identify the business owner who may approve future service/configuration
    changes when Sprint 6 is implemented.

## 18. Phase 1 Exit Recommendation

Phase 1 documentation is complete, but Phase 2 should not begin until the Product
Owner:

- resolves or explicitly defers the decision register;
- approves the initial Service Catalog baseline;
- approves the initial Pricing Configuration methodology;
- approves quantity and rounding rules; and
- confirms which observed workbook defects must be corrected rather than preserved.

No workbook behavior has been changed, and no application implementation has begun.
