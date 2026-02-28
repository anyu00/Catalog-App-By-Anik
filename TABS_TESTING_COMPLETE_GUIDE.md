# Access Control System - Complete Tab Testing Guide

**Date**: February 28, 2026  
**Status**: Ready for comprehensive testing

---

## Quick Test Setup

### Create Test Users with Different Permissions

**User 1: Basic User**
- Name: test-basic@example.com
- Role: user
- Permissions: Default (most readable, limited create)

**User 2: Limited User** 
- Name: test-limited@example.com
- Role: user
- Permissions: Only Place Order & Order Entries (read)

**User 3: Restricted User**
- Name: test-zero@example.com
- Role: user
- Permissions: All FALSE (no access to anything)

**User 4: Admin User**
- Name: test-admin@example.com
- Role: admin
- Permissions: Auto full access

---

## All 10 Tabs Testing Checklist

### Tab 1: 📦 **Manage Catalog** (manageCatalog)
**Default Permission**: read: TRUE

**Test Case 1.1: User WITH Access**
```
Setup:
  Permission: read = TRUE
  
Steps:
  1. Login with user that has access
  2. Verify tab appears accessible (no lock icon)
  3. Can click tab
  4. Page loads normally
  
Check:
  ☐ Tab visible
  ☐ No 🔒 icon
  ☐ Clickable
  ☐ Page loads
  ☐ Console: "manageCatalog" in accessible list
```

**Test Case 1.2: User WITHOUT Access**
```
Setup:
  Permission: read = FALSE
  
Steps:
  1. Admin: Set read = FALSE for user
  2. Save user
  3. User logs in
  4. Look for Manage Catalog tab
  
Check:
  ☐ Tab shows 🔒 lock icon
  ☐ Tab grayed out (opacity: 0.5)
  ☐ Cannot click (no navigation)
  ☐ Shows "Access Restricted" modal
  ☐ Console: "manageCatalog" in locked list
```

---

### Tab 2: 📝 **Place Order** (placeOrder)
**Default Permission**: create: TRUE, read: TRUE

**Test Case 2.1: User WITH Access**
```
Setup:
  Permission: read = TRUE, create = TRUE
  
Steps:
  1. Login with access
  2. Verify tab accessible
  3. Click tab
  4. Verify order form appears
  
Check:
  ☐ Tab visible
  ☐ No 🔒 icon
  ☐ Page loads (order form visible)
  ☐ Can interact with form
  ☐ Console: "placeOrder" accessible
```

**Test Case 2.2: User WITHOUT Access**
```
Setup:
  Permission: read = FALSE
  
Steps:
  1. Admin: Set read = FALSE
  2. User logs in
  3. Try clicking Place Order tab
  
Check:
  ☐ Tab shows 🔒 lock
  ☐ Modal shows: "You don't have access to Place Order"
  ☐ Cannot navigate
```

---

### Tab 3: 📋 **Catalog Entries** (catalogEntries)
**Default Permission**: read: TRUE

**Test Case 3.1: User WITH Access**
```
Setup:
  Permission: read = TRUE
  
Steps:
  1. Login
  2. Verify tab accessible
  3. Click Catalog Entries
  
Check:
  ☐ Tab visible
  ☐ No lock icon
  ☐ Catalog list loads
  ☐ Can view entries
```

**Test Case 3.2: User WITHOUT Access**
```
Setup:
  Permission: read = FALSE
  
Steps:
  1. Admin: Uncheck read
  2. User logs in
  3. Try clicking tab
  
Check:
  ☐ Tab locked 🔒
  ☐ Modal appears
```

---

### Tab 4: 📄 **Order Entries** (orderEntries)
**Default Permission**: read: TRUE

**Test Case 4.1: User WITH Access**
```
Setup:
  Permission: read = TRUE
  
Steps:
  1. Login
  2. Click Order Entries tab
  
Check:
  ☐ Tab appears
  ☐ Order list loads
  ☐ Can see previous orders
```

**Test Case 4.2: User WITHOUT Access**
```
Setup:
  Permission: read = FALSE
  
Check:
  ☐ Tab locked 🔒
  ☐ Modal on click
```

---

### Tab 5: 📊 **Reports** (reports)
**Default Permission**: read: TRUE

**Test Case 5.1: User WITH Access**
```
Setup:
  Permission: read = TRUE
  
Steps:
  1. Login
  2. Click Reports
  
Check:
  ☐ Tab accessible
  ☐ Report dashboard loads
  ☐ Data displays
```

**Test Case 5.2: User WITHOUT Access**
```
Setup:
  Permission: read = FALSE
  
Check:
  ☐ Tab locked 🔒
```

---

### Tab 6: 📅 **Stock Calendar** (stockCalendar)
**Default Permission**: read: TRUE

**Test Case 6.1: User WITH Access**
```
Setup:
  Permission: read = TRUE
  
Steps:
  1. Login
  2. Click Stock Calendar
  
Check:
  ☐ Tab accessible
  ☐ Calendar loads
  ☐ Events display
```

**Test Case 6.2: User WITHOUT Access**
```
Setup:
  Permission: read = FALSE
  
Check:
  ☐ Tab locked 🔒
```

---

### Tab 7: 📈 **Analytics** (analytics)
**Default Permission**: read: FALSE (locked by default)

**Test Case 7.1: User WITH Access (After Admin Grants)**
```
Setup:
  Permission: read = FALSE (default)
  Admin: Check read = TRUE
  
Steps:
  1. User logs in
  2. See Analytics tab
  3. Should be accessible now
  
Check:
  ☐ Tab was locked before admin grant
  ☐ After admin sets read = TRUE, user logs in
  ☐ Tab now accessible
  ☐ Dashboard loads
  ☐ Charts display
```

**Test Case 7.2: User WITHOUT Access**
```
Setup:
  Permission: read = FALSE (default)
  
Steps:
  1. New user logs in
  2. Analytics tab visible
  
Check:
  ☐ Tab shows 🔒 lock (most restricted by default)
  ☐ Cannot click
  ☐ Modal shows "Advanced feature"
```

---

### Tab 8: 📜 **Movement History** (movementHistory)
**Default Permission**: read: TRUE  
**🔴 SECURITY FIX**: Now respects admin permissions (was always accessible before)

**Test Case 8.1: User WITH Access**
```
Setup:
  Permission: read = TRUE
  
Steps:
  1. Login
  2. Click Movement History
  
Check:
  ☐ Tab accessible
  ☐ History loads
  ☐ Can view movement records
```

**Test Case 8.2: User WITHOUT Access (Security Test)**
```
Setup:
  Permission: read = FALSE
  
Steps:
  1. Admin: Uncheck read for this user
  2. Save user
  3. User logs in
  4. Try clicking tab
  
Check:
  ☐ Tab shows 🔒 lock (FIXED - was bypass before!)
  ☐ Cannot navigate
  ☐ Modal explains restriction
  ☐ This MUST work now (not bypass like before)
```

---

### Tab 9: 📑 **Audit Log** (auditLog)
**Default Permission**: read: TRUE  
**🔴 SECURITY FIX**: Now respects admin permissions (was always accessible before)

**Test Case 9.1: User WITH Access**
```
Setup:
  Permission: read = TRUE
  
Steps:
  1. Login
  2. Click Audit Log
  
Check:
  ☐ Tab accessible
  ☐ Log loads
  ☐ Can see audit records
```

**Test Case 9.2: User WITHOUT Access (Security Test)**
```
Setup:
  Permission: read = FALSE
  
Steps:
  1. Admin: Uncheck read for this user
  2. Save user
  3. User logs in
  4. Try clicking Audit Log tab
  
Check:
  ☐ Tab shows 🔒 lock (FIXED - was bypass before!)
  ☐ Cannot navigate
  ☐ Modal appears
  ☐ CRITICAL: This user should NOT see audit log
  ☐ Security vulnerability is closed
```

---

### Tab 10: ⚙️ **Admin Panel** (adminPanel / userManagement)
**Default Permission**: create: FALSE, read: FALSE (locked)

**Test Case 10.1: Admin User**
```
Setup:
  Role: admin
  
Steps:
  1. Login as admin
  2. Look for Admin Panel / Settings
  
Check:
  ☐ Tab visible
  ☐ No lock icon
  ☐ Can click
  ☐ Admin interface loads
  ☐ Can see user list
  ☐ Can edit permissions
```

**Test Case 10.2: Regular User**
```
Setup:
  Role: user
  Permission: read = FALSE (default)
  
Steps:
  1. Login as regular user
  2. Look for Admin Panel
  
Check:
  ☐ Tab shows 🔒 lock
  ☐ Cannot click
  ☐ Modal shows "Admin only"
```

---

## Browser Console Testing

While testing, open Developer Tools (F12) and check console output:

### Expected Console Logs

**For user with multiple permissions:**
```
✓ Filtering tabs with permissions: {...}
✓ 📊 Tab Access Summary: 8 accessible, 1 locked
✓    ✓ Accessible: manageCatalog, placeOrder, catalogEntries, orderEntries, reports, stockCalendar, movementHistory, auditLog
✓    🔒 Locked: analytics, adminPanel
✓ ✓ Activating first accessible tab: manageCatalog
```

**For user with 0 access:**
```
✓ 📊 Tab Access Summary: 0 accessible, 10 locked
✓    ✓ Accessible: 
✓    🔒 Locked: all 10 tabs
✓ ✗ User has no accessible tabs
✓ → showNoAccessMessage() called
```

---

## Testing Matrix

| Tab | Default | Test WITH | Test WITHOUT | Security |
|-----|---------|----------|-------------|----------|
| 1. Manage Catalog | ✓ Read | ☐ | ☐ | Normal |
| 2. Place Order | ✓ Create+Read | ☐ | ☐ | Normal |
| 3. Catalog Entries | ✓ Read | ☐ | ☐ | Normal |
| 4. Order Entries | ✓ Read | ☐ | ☐ | Normal |
| 5. Reports | ✓ Read | ☐ | ☐ | Normal |
| 6. Stock Calendar | ✓ Read | ☐ | ☐ | Normal |
| 7. Analytics | ✗ Locked | ☐ | ☐ | Normal |
| 8. Movement History | ✓ Read | ☐ | ☐ | **FIXED** |
| 9. Audit Log | ✓ Read | ☐ | ☐ | **FIXED** |
| 10. Admin Panel | ✗ Locked | ☐ (Admin only) | ☐ | Normal |

---

## Step-by-Step Test Procedure

### Phase 1: Permission Setup (Admin)

```
1. Open Admin Panel
2. Click "Select" next to test-limited@example.com
3. Right panel shows: "ユーザー詳細 & 権限編集"
4. Check current permissions
5. See all 10 tabs:
   ☐ Manage Catalog
   ☐ Place Order
   ☐ Catalog Entries
   ☐ Order Entries
   ☐ Reports
   ☐ Stock Calendar
   ☐ Analytics
   ☐ Movement History (SECURITY FIX)
   ☐ Audit Log (SECURITY FIX)
   ☐ User Management
6. Save permissions
```

### Phase 2: Tab Testing (User Login)

```
For EACH user:
  1. Log out admin account
  2. Log in with test user
  3. Wait 2 seconds (permissions load)
  4. Open browser console (F12)
  5. Check tab accessibility summary
  6. FOR EACH TAB:
     a. Check icon (lock 🔒 or not)
     b. Try clicking
     c. Record result
  7. Note any errors in console
```

### Phase 3: Verification

```
Check boxes:
  ☐ All 10 tabs present in sidebar
  ☐ Lock icons show correctly
  ☐ Can't navigate to locked tabs
  ☐ Modal appears for locked tabs
  ☐ Accessible tabs load pages
  ☐ Console shows correct summary
  ☐ Movement History respects permissions
  ☐ Audit Log respects permissions
  ☐ Security fix verified
```

---

## Known Default Behaviors

### Admin User
- All 10 tabs accessible
- No lock icons
- Full control over all features
- Can see all user data

### New User (Default Permissions)
- 8 tabs accessible (Manage Catalog, Place Order, Catalog Entries, Order Entries, Reports, Stock Calendar, Movement History, Audit Log)
- 2 tabs locked (Analytics, Admin Panel)
- Can view and create orders
- Cannot access admin features

### Limited User (Override Permissions)
- Only tabs checked by admin are accessible
- Everything else shows lock icon
- Cannot bypass locks
- Cannot access unlocked data

---

## Troubleshooting

### Issue: Tab shows lock icon but I gave access
```
Solution:
  1. Check Firebase console: /UserPermissions/{userId}
  2. Verify read: true is saved
  3. Log out and log back in (clear cache)
  4. Check browser console for permission load
```

### Issue: User can access tab even with read: false
```
Solution (Security Check):
  1. Verify which user logged in (check user email)
  2. Check if user role is "admin" (auto-grants full)
  3. Check Firebase for duplicate permission structures
  4. Clear browser cache and reload
```

### Issue: Movement History or Audit Log always accessible
```
Solution (SECURITY FIX):
  1. Update js/main.js to latest version
  2. Commit c4bb4e9 should be applied
  3. Verify hardcoded bypass is removed
  4. Test again specific to these tabs
```

### Issue: Console shows 0 accessible tabs but modal doesn't appear
```
Solution:
  1. Check if first visible tab exists
  2. Verify showNoAccessMessage() is called
  3. Check for JavaScript errors in console
  4. Verify modal CSS is loaded
```

---

## Test Report Template

```
TEST DATE: ___________
TESTER: ___________

USER TESTED: ___________
ROLE: admin / user

TAB RESULTS:
  1. Manage Catalog        [PASS / FAIL] Notes: _______
  2. Place Order           [PASS / FAIL] Notes: _______
  3. Catalog Entries       [PASS / FAIL] Notes: _______
  4. Order Entries         [PASS / FAIL] Notes: _______
  5. Reports               [PASS / FAIL] Notes: _______
  6. Stock Calendar        [PASS / FAIL] Notes: _______
  7. Analytics             [PASS / FAIL] Notes: _______
  8. Movement History      [PASS / FAIL] Notes: _______
  9. Audit Log             [PASS / FAIL] Notes: _______
  10. Admin Panel           [PASS / FAIL] Notes: _______

SECURITY CHECKS:
  ☐ Movement History respects admin settings
  ☐ Audit Log respects admin settings
  ☐ Users cannot bypass locked tabs
  ☐ Locked tab click shows modal
  ☐ Console shows correct summary

ISSUES FOUND:
  [ ] None
  [ ] Minor: _______
  [ ] Major: _______

OVERALL: [PASS / FAIL]
```

---

## Summary

**All 10 Tabs Ready for Testing:**
1. ✅ Manage Catalog (Default: accessible)
2. ✅ Place Order (Default: accessible)
3. ✅ Catalog Entries (Default: accessible)
4. ✅ Order Entries (Default: accessible)
5. ✅ Reports (Default: accessible)
6. ✅ Stock Calendar (Default: accessible)
7. ✅ Analytics (Default: locked)
8. ✅ Movement History (Default: accessible - NOW WITH SECURITY FIX)
9. ✅ Audit Log (Default: accessible - NOW WITH SECURITY FIX)
10. ✅ Admin Panel (Default: locked, admin only)

**Latest Fix (Commit c4bb4e9):**
- Movement History & Audit Log now respect admin permissions
- Security vulnerability closed
- No more forced "always accessible" bypass

Ready to test!

