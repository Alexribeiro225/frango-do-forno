# Tasks
- [x] Route main-site orders to the registered store and prevent master fulfillment.
- [x] Separate master management from store operations; main-site checkout reached the user's kitchen, master has no fulfillment view, fixtures removed.
- [x] Connect each account's public storefront and order destination without sharing other stores' data.
- [x] Verify public checkout and receipt in the registered account's kitchen; signed-in ownership and cross-store rejection passed, temporary fixtures removed.
- [x] Isolate each customer's operational data so new accounts start empty without changing existing store records.
- [x] Add protected master user deletion with confirmation.
- [x] Test ownership and deletion protections and verify the dashboard.
- [x] Allow registration without checkout and reserve payment for after the 15-day trial.
- [x] Test the trial/payment decision and verify registration and plans screens (14 tests pass; live signup confirmation and external payment were not exercised).