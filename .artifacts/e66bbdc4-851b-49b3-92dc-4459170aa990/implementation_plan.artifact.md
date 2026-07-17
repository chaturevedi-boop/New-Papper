# Implementation Plan - Per-Paper Subscription Dates

Modify the "Add New Customer" workflow to capture specific "From" and "To" dates for every selected newspaper individually, regardless of whether it's a standard subscription or a timed billing ledger.

## User Review Required

> [!IMPORTANT]
> - The date picker will now appear **every time** a newspaper is selected in the "Customer Flats" master data form.
> - Capturing these dates per paper will allow for more granular billing (e.g., a customer subscribing to one paper for the whole month and another for only a week).

## Proposed Changes

### 1. Data Model Updates

#### [MODIFY] [types.ts](file:///C:/Users/Harshit Chaturvedi/StudioProjects/New-Papper/src/types.ts)
- Add `fromDate?: string` and `toDate?: string` to the `Subscription` interface.
- Add `ledgerType`, `fromDate`, and `toDate` to the `Flat` interface to maintain consistency with the registration form metadata.

### 2. Registration Workflow (UI)

#### [MODIFY] [DataMasters.tsx](file:///C:/Users/Harshit Chaturvedi/StudioProjects/New-Papper/src/components/DataMasters.tsx)
- **State Refactor**: Change `flatSelectedPapers` to store objects containing paper IDs and their respective dates: `flatPaperConfigs: { paperId: string, fromDate?: string, toDate?: string }[]`.
- **Interactivity**:
    - When a user clicks a newspaper checkbox, open a modal to select dates for **that specific paper**.
    - If dates are entered, save them to the config for that paper.
    - If "Cancel" is clicked in the date modal, uncheck the paper (or keep it without dates if allowed).
- **Final Submission**: Update `handleAddFlatSubmit` to pass the detailed paper configurations to the parent.

### 3. Application Logic

#### [MODIFY] [App.tsx](file:///C:/Users/Harshit Chaturvedi/StudioProjects/New-Papper/src/App.tsx)
- Update `handleAddFlat` to iterate through the paper configurations and create `Subscription` records with the captured `fromDate` and `toDate`.

### 4. Billing Engine Calculation

#### [MODIFY] [dummyGenerator.ts](file:///C:/Users/Harshit Chaturvedi/StudioProjects/New-Papper/src/data/dummyGenerator.ts)
- Update `calculateBill` function:
    - When iterating through days of the month, check if the current date falls within the `Subscription`'s `fromDate` and `toDate` range (if they exist).
    - Only count delivery/subtotal if the date is valid for that paper.

## Verification Plan

### Manual Verification
1. Navigate to **Master Ledgers** > **4. Customer Flats**.
2. Start adding a new customer.
3. Select "Billing (Timed)" mode.
4. Click on "The Hindu" checkbox.
5. **Verify**: A date picker popup appears immediately for "The Hindu".
6. Enter dates (e.g., 2026-06-01 to 2026-06-15) and confirm.
7. Click on "The Times of India" checkbox.
8. **Verify**: The date picker popup appears again for this specific paper.
9. Enter different dates and confirm.
10. Register the customer.
11. Go to **Billing Engine** and check the invoice for the new customer.
12. **Verify**: The net bill correctly reflects only the days within the specified date ranges for each paper.
