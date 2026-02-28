# Landing Page Behavior - Visual Summary

## Quick Reference: Where Users Land

### Scenario 1: **Default New User** 
```
Permissions:
  ✓ Manage Catalog
  ✓ Place Order
  ✓ Catalog Entries
  ✓ Order Entries
  ✓ Stock Calendar
  ✓ Movement History (always)
  ✓ Audit Log (always)
  🔒 Analytics
  🔒 Admin Panel

Landing: → MANAGE CATALOG (first accessible tab)

Sidebar View:
  [✓] Manage Catalog ← ACTIVE
  [✓] Place Order
  [✓] Catalog Entries
  [✓] Order Entries
  [✓] Stock Calendar
  [✓] Movement History
  [✓] Audit Log
  [🔒] Analytics
  [🔒] Admin Panel
```

---

### Scenario 2: **User with Limited Access** - "Order Entry Only"
```
Permissions:
  🔒 Manage Catalog
  🔒 Place Order
  🔒 Catalog Entries
  ✓ Order Entries
  🔒 Stock Calendar
  ✓ Movement History (always)
  ✓ Audit Log (always)
  🔒 Analytics
  🔒 Admin Panel

Landing: → ORDER ENTRIES (first accessible tab)

Sidebar View:
  [🔒] Manage Catalog
  [🔒] Place Order
  [🔒] Catalog Entries
  [✓] Order Entries ← ACTIVE
  [🔒] Stock Calendar
  [✓] Movement History
  [✓] Audit Log
  [🔒] Analytics
  [🔒] Admin Panel

When user clicks a locked tab:
  Modal: "🔐 Access Restricted - You don't have access to Manage Catalog"
```

---

### Scenario 3: **User with Multiple Limited Accesses**
```
Permissions:
  ✓ Manage Catalog
  ✓ Place Order
  🔒 Catalog Entries
  ✓ Order Entries
  🔒 Stock Calendar
  ✓ Movement History (always)
  ✓ Audit Log (always)
  🔒 Analytics
  🔒 Admin Panel

Landing: → MANAGE CATALOG (first accessible in order)

Sidebar View:
  [✓] Manage Catalog ← ACTIVE
  [✓] Place Order
  [🔒] Catalog Entries
  [✓] Order Entries
  [🔒] Stock Calendar
  [✓] Movement History
  [✓] Audit Log
  [🔒] Analytics
  [🔒] Admin Panel
```

---

### Scenario 4: **Admin User** - Full Access
```
Permissions:
  ✓ Manage Catalog
  ✓ Place Order
  ✓ Catalog Entries
  ✓ Order Entries
  ✓ Stock Calendar
  ✓ Movement History
  ✓ Audit Log
  ✓ Analytics
  ✓ Admin Panel

Landing: → MANAGE CATALOG (first in order)

Sidebar View:
  [✓] Manage Catalog ← ACTIVE
  [✓] Place Order
  [✓] Catalog Entries
  [✓] Order Entries
  [✓] Stock Calendar
  [✓] Movement History
  [✓] Audit Log
  [✓] Analytics
  [✓ Admin Panel
```

---

### Scenario 5: **User with NO Access** - Edge Case
```
Permissions:
  🔒 Manage Catalog
  🔒 Place Order
  🔒 Catalog Entries
  🔒 Order Entries
  🔒 Stock Calendar
  🔒 Movement History (override)
  🔒 Audit Log (override)
  🔒 Analytics
  🔒 Admin Panel

Landing: → NO ACCESS MODAL SHOWN

Screen Display:
  ┌─────────────────────────────────┐
  │  🔐  NO ACCESS                  │
  │                                 │
  │  You don't have access to any   │
  │  sections yet.                  │
  │                                 │
  │  ℹ️  What you need to do:       │
  │  • Contact your administrator  │
  │  • Request permissions         │
  │  • Log out and back in         │
  │                                 │
  │         [Log Out]               │
  └─────────────────────────────────┘

Sidebar View:
  (Blocked - Modal prevents interaction)
```

---

## Tab Accessibility Rules

```
┌─────────────────────────────────────────┐
│ How Tab Access is Determined            │
├─────────────────────────────────────────┤
│                                         │
│ For NORMAL tabs:                        │
│   IF permission.read == TRUE            │
│     → Tab is ACCESSIBLE ✓               │
│   ELSE                                  │
│     → Tab is LOCKED 🔒                  │
│                                         │
│ For SPECIAL tabs (always accessible):   │
│   - Movement History                    │
│   - Audit Log                           │
│   → Always ACCESSIBLE ✓ (if set true)   │
│                                         │
│ For ADMIN role:                         │
│   → ALL tabs ACCESSIBLE ✓               │
│                                         │
└─────────────────────────────────────────┘
```

---

## Landing Page Decision Flow

```
User Logs In
      ↓
Load Permissions
      ↓
Run filterTabsByPermissions()
      ↓
      ├─→ Check Sidebar Buttons (in order)
      │     ├─ manageCatalog
      │     │   ├─ Has read access? → YES ✓    [CLICK THIS & LAND HERE]
      │     │   └─ No read access?  → NO 🔒    [LOCKED, check next]
      │     │
      │     ├─ placeOrder
      │     ├─ catalogEntries
      │     └─ ... continue until first accessible found
      │
      └─→ Result:
            ├─ IF found accessible tab
            │   └─ Click that tab → User lands there
            │
            └─ IF NO accessible tabs found
                └─ Show "No Access" modal
```

---

## Console Output Examples

### Example 1: Multiple tabs accessible
```
Filtering tabs with permissions: {manageCatalog: {create: false, read: true, ...}, ...}
📊 Tab Access Summary: 7 accessible, 2 locked
   ✓ Accessible: manageCatalog, placeOrder, catalogEntries, orderEntries, stockCalendar, movementHistory, auditLog
   🔒 Locked: analytics, adminPanel
✓ Activating first accessible tab: manageCatalog
✓ Application initialized | User: user@example.com
```

### Example 2: Single tab accessible
```
Filtering tabs with permissions: {...}
📊 Tab Access Summary: 3 accessible, 6 locked
   ✓ Accessible: orderEntries, movementHistory, auditLog
   🔒 Locked: manageCatalog, placeOrder, catalogEntries, stockCalendar, analytics, adminPanel
✓ Activating first accessible tab: orderEntries
✓ Application initialized | User: limited@example.com
```

### Example 3: No tabs accessible
```
Filtering tabs with permissions: {...}
📊 Tab Access Summary: 0 accessible, 9 locked
   ✓ Accessible: 
   🔒 Locked: all 9 tabs
✗ User has no accessible tabs
→ showNoAccessMessage() called
```

---

## Permission File Path Reference

**Where permissions are stored:**
```
Firebase Realtime Database
└── /UserPermissions
    └── {userId}
        ├── manageCatalog:    {create: bool, read: bool, update: bool, delete: bool}
        ├── placeOrder:       {create: bool, read: bool, update: bool, delete: bool}
        ├── catalogEntries:   {create: bool, read: bool, update: bool, delete: bool}
        ├── orderEntries:     {create: bool, read: bool, update: bool, delete: bool}
        ├── reports:          {read: bool}
        ├── stockCalendar:    {read: bool}
        ├── analytics:        {read: bool}
        ├── movementHistory:  {read: bool}
        ├── auditLog:         {read: bool}
        └── userManagement:   {create: bool, read: bool, update: bool, delete: bool}
```

**Check via Firebase Console:**
1. Log into https://console.firebase.google.com
2. Select your project
3. Go to Realtime Database
4. Expand `/UserPermissions/{userId}`
5. Look for `analytics: {read: true/false}`

---

## Testing Template

To test a specific scenario:

```javascript
// In browser console (F12):

// 1. Check which tabs are currently accessible
Array.from(document.querySelectorAll('.sidebar-nav-btn:not(.nav-link-btn')).map(btn => ({
  tab: btn.getAttribute('data-tab'),
  locked: btn.classList.contains('tab-locked'),
  display: btn.style.display
}))

// 2. Check current tab
document.querySelector('.sidebar-nav-btn.active')?.getAttribute('data-tab')

// 3. Check user permissions
console.log('Current permissions:', window.currentUser?.permissions)
```

Output example:
```javascript
[
  { tab: "manageCatalog", locked: false, display: "block" },    ← User landed here
  { tab: "placeOrder", locked: false, display: "block" },
  { tab: "catalogEntries", locked: true, display: "block" },     ← Locked
  { tab: "orderEntries", locked: false, display: "block" },
  { tab: "stockCalendar", locked: true, display: "block" },      ← Locked
  { tab: "movementHistory", locked: false, display: "block" },
  { tab: "auditLog", locked: false, display: "block" },
  { tab: "analytics", locked: true, display: "block" },          ← Locked
  { tab: "adminPanel", locked: true, display: "block" }          ← Locked
]
```

