# Phase 1 Testing Guide - Authentication System

## Overview

This document provides step-by-step instructions to test the newly implemented Role-Based Access Control (RBAC) authentication system.

---

## 🔧 Setup Before Testing

### 1. Disable Auth Mode (Development Only)

Since Firebase Authentication requires valid user accounts, the first test will use **manual account creation** through Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **catalog-13aa0**
3. Navigate to: **Authentication > Sign-in method > Email/Password**
4. Enable Email/Password provider if not already enabled

### 2. Create Test Accounts

Create two test accounts in Firebase Console:

**Account 1 - Admin:**
- Email: `admin@example.com`
- Password: `password123`

**Account 2 - Regular User:**
- Email: `user@example.com`
- Password: `password123`

Then manually set their roles in Realtime Database:

**In Firebase Console > Realtime Database:**

```
Users/
├── [admin-uid]/
│   ├── email: "admin@example.com"
│   ├── displayName: "Admin User"
│   ├── role: "admin"
│   ├── createdAt: "2025-12-01T..."
│   └── isActive: true
│
└── [user-uid]/
    ├── email: "user@example.com"
    ├── displayName: "Regular User"
    ├── role: "user"
    ├── createdAt: "2025-12-01T..."
    └── isActive: true
```

Replace `[admin-uid]` and `[user-uid]` with the actual UIDs from Firebase Auth console.

---

## ✅ Test Scenarios

### Test 1: Login with Admin Account

**Steps:**
1. Navigate to `login.html`
2. Enter email: `admin@example.com`
3. Enter password: `password123`
4. Click "Login" button

**Expected Results:**
- ✅ Login succeeds
- ✅ Redirected to `index.html` (dashboard)
- ✅ Shows all 7 tabs visible
- ✅ Shows "Admin User" with 👨‍💼 icon in sidebar
- ✅ Can see logout button in sidebar

---

### Test 2: Login with Regular User Account

**Steps:**
1. Logout (click logout button)
2. Navigate to `login.html`
3. Enter email: `user@example.com`
4. Enter password: `password123`
5. Click "Login" button

**Expected Results:**
- ✅ Login succeeds
- ✅ Redirected to `index.html`
- ✅ Shows limited tabs (based on default permissions)
- ✅ Shows "User" with 👤 icon in sidebar

---

### Test 3: Invalid Login

**Steps:**
1. Try login with wrong email or password
2. Example: `wrong@example.com` / `wrongpass`

**Expected Results:**
- ✅ Login fails
- ✅ Error message displayed: "No account found with this email" or "Incorrect password"
- ✅ User stays on login page

---

### Test 4: Session Persistence

**Steps:**
1. Login as admin
2. Refresh page (Ctrl+R or Cmd+R)
3. Check if still logged in

**Expected Results:**
- ✅ Still logged in
- ✅ No redirect to login page
- ✅ User info still displayed in sidebar

---

### Test 5: Logout Functionality

**Steps:**
1. Login as admin
2. Click logout button (sign-out icon in sidebar)
3. Confirm logout in popup

**Expected Results:**
- ✅ Logged out successfully
- ✅ Redirected to `login.html`
- ✅ Session cleared
- ✅ Cannot access dashboard without re-logging in

---

### Test 6: Unauthenticated Access Prevention

**Steps:**
1. Logout
2. Try to directly access `index.html` without login

**Expected Results:**
- ✅ Automatic redirect to `login.html`
- ✅ Cannot bypass login

---

### Test 7: Permission-Based Tab Filtering

**After setting up permissions in next phase:**

1. Login as regular user
2. Compare tabs shown vs. admin

**Expected Results:**
- ✅ Admin sees all 7 tabs
- ✅ Regular user sees only assigned tabs
- ✅ Unauthorized tabs are hidden (display: none)

---

## 🐛 Troubleshooting

### Issue: Login page shows but nothing happens on submit

**Solutions:**
1. Check browser console (F12 > Console) for errors
2. Verify Firebase config in `firebase-config.js`
3. Ensure Firebase Authentication is enabled in Firebase Console

### Issue: Redirects to login even after login

**Solutions:**
1. Check that user profile exists in `Users/` path in Realtime Database
2. Verify user UID matches Firebase Auth UID
3. Check browser's localStorage is not blocked

### Issue: User info not showing in sidebar

**Solutions:**
1. Check that email field exists in user profile
2. Verify permission fetch is not failing
3. Check browser console for permission fetch errors

### Issue: Tabs not filtering based on permissions

**Solutions:**
1. Ensure permissions are set in database
2. Check that permission object structure matches expected format
3. Verify `canUserAction()` function is working (check console logs)

---

## 📋 Manual Testing Checklist

- [ ] Admin login works
- [ ] User login works
- [ ] Wrong credentials show error
- [ ] Session persists after refresh
- [ ] Logout works and clears session
- [ ] Direct access to dashboard redirects to login
- [ ] User info displays in sidebar
- [ ] Admin sees all tabs
- [ ] Regular user sees filtered tabs
- [ ] No console errors

---

## 🚀 Next Steps

Once Phase 1 testing is complete:

1. **Phase 2: Admin Panel**
   - Create admin dashboard for user management
   - Implement user creation form
   - Implement permission editor

2. **Phase 3: Permission Management**
   - Create UI for per-page per-action permission assignment
   - Implement database updates for permissions

3. **Phase 4: Permission Enforcement**
   - Add permission checks to CRUD operations
   - Disable buttons based on permissions
   - Add toast notifications for denied actions

---

## 📝 Notes

- Demo account emails are shown on login page for testing purposes
- Remove demo info before production deployment
- Passwords should be stronger in production
- Consider implementing "Forgot Password" functionality later

