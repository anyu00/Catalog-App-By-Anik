# 👥 Account Management System Guide

## 🎯 Overview
Your app has a **two-tier user management system**:
1. **Firebase Auth** - Handles login/password authentication
2. **Firebase Realtime DB** - Stores user profiles and permissions

---

## 📊 Current Account System

### **Where Accounts Are Stored:**

#### 1️⃣ **Firebase Authentication** (Backend)
- Location: Firebase Console → Authentication → Users
- Stores: Email, Password (hashed), UID
- Not directly editable in your app (security)

#### 2️⃣ **Firebase Realtime Database** (Your App)
```
/Users/{uid}/
├── email: "admin@example.com"
├── role: "admin"
├── displayName: "Admin User"
├── createdAt: "2025-12-15T10:00:00Z"
├── lastLogin: "2025-12-15T14:30:00Z"
├── isActive: true
└── permissions: {
    ├── manageCatalog: {create: true, read: true, update: true, delete: true}
    ├── placeOrder: {create: true, read: true, update: true, delete: true}
    ├── analytics: {read: true}
    └── ...
}
```

---

## 🔑 Test Accounts (Pre-configured)

| Email | Password | Role | Access | Where Created |
|-------|----------|------|--------|---------------|
| **admin@example.com** | password123 | Admin | All 9 tabs | Firebase Auth (pre-created) |
| **user@example.com** | password123 | User | Limited tabs | Firebase Auth (pre-created) |

Both accounts are **already set up** in your Firebase project. You can log in with them directly.

---

## 🖥️ How to Manage Accounts (Admin Panel)

### **📍 Location:**
1. Login as admin (admin@example.com / password123)
2. Click "Settings" tab (top right nav) or "管理者パネル" (sidebar)
3. You'll see the **Admin Panel - User Management**

### **What You Can See:** 

#### **LEFT SIDE: Users List Table**
```
┌─────────────────────────────────────────┐
│ UID   │ Email          │ Role  │ Active │
├─────────────────────────────────────────┤
│ abc12 │ admin@example  │ admin │ Yes    │
│ def34 │ user@example   │ user  │ Yes    │
└─────────────────────────────────────────┘
```

**Columns:**
- **UID** - First 8 chars of Firebase UID
- **Email** - User's email address
- **Role** - "admin" or "user"
- **Active** - Yes/No (is account active)
- **Actions** - Select & Deactivate buttons

#### **RIGHT SIDE: User Details & Permissions Editor**
When you click "Select" on a user:
- Shows selected user's email
- Edit Role: admin / user
- Active checkbox
- Permission matrix (detailed below)
- Buttons: Save, Deactivate

---

## 🔐 Current CRUD Operations

### **✅ CREATE - Add New User**

**2-Step Process:**

**STEP 1: Create in Firebase Auth (Outside your app)**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Authentication → Users → Add User
4. Enter email & password → Create User
5. Firebase generates a **UID**
6. Copy the UID

**STEP 2: Create DB Record (In your app)**
1. In Admin Panel, scroll to "Create / Register User Record"
2. Paste Auth UID (from Firebase Console)
3. Enter Email
4. Enter Display Name
5. Click "Add User Record"
6. Done! User now appears in Users List

**Example:**
```
Auth UID:     abc123def456
Email:        newuser@company.com
Display Name: John Doe
```

---

### **✅ READ - View All Account Details**

All user accounts are displayed in the Users List table. Click "Select" to see:
- Email address
- Current role
- Active status
- All permissions (create/read/update/delete for each feature)

---

### **✅ UPDATE - Edit User Account**

1. Click "Select" on user in the list
2. Edit these fields:
   - **Role**: Change from "user" → "admin"
   - **Active**: Uncheck to deactivate account
   - **Permissions**: Check/uncheck individual permissions
3. Click "Save"
4. Changes applied immediately

**What You Can Update:**
- Role (user ↔ admin)
- Active status (yes ↔ no)
- Individual permissions for each tab:
  - manageCatalog (create/read/update/delete)
  - placeOrder (create/read/update/delete)
  - catalogEntries (create/read/update/delete)
  - orderEntries (create/read/update/delete)
  - stockCalendar (read)
  - movementHistory (read)
  - auditLog (read)
  - analytics (read)
  - adminPanel (full access)

---

### **❌ DELETE - Remove User Account**

**Option 1: Soft Delete (Recommended)**
1. Click "Select" on user
2. Click "Deactivate"
3. Confirm dialog
4. User account is deactivated (not deleted from DB)
5. User can no longer login

**Option 2: Hard Delete (Permanent)**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Authentication → Select user → Delete (removes from Auth)
3. Realtime DB → Users → Delete user record (removes from DB)

**Why Soft Delete is Better:**
- Preserves audit trail & history
- Can reactivate later
- No data loss
- Compliant with regulations

---

## 🏗️ Data Structure & Permissions

### **All Available Permissions:**

```javascript
{
    manageCatalog: { create: true, read: true, update: true, delete: true },
    placeOrder: { create: true, read: true, update: true, delete: true },
    catalogEntries: { create: true, read: true, update: true, delete: true },
    orderEntries: { create: true, read: true, update: true, delete: true },
    stockCalendar: { read: true },
    movementHistory: { read: true },
    auditLog: { read: true },
    analytics: { read: true },
    adminPanel: { create: true, read: true, update: true, delete: true }
}
```

### **Default Permissions:**

**Admin Role** (Full Access):
- ✅ All 9 tabs with all CRUD permissions
- ✅ Can manage users
- ✅ Can view all data

**User Role** (Limited Access):
- ✅ Place Order - create/read/update/delete
- ✅ Inventory - read only
- ✅ Orders - read only
- ✅ Calendar - read only
- ✅ Movement History - read only
- ✅ Audit Log - read only
- ❌ Cannot manage users
- ❌ Limited analytics

---

## 📝 Example: Create a Manager Account

Let's create a "manager@company.com" account with moderate permissions:

### **Step 1: Firebase Auth**
1. Firebase Console → Authentication
2. Click "Add user"
3. Email: `manager@company.com`
4. Password: (set a secure password)
5. Create → Copy the UID (e.g., `xyz789abc123`)

### **Step 2: Add DB Record**
1. In app, go to Admin Panel
2. Paste UID: `xyz789abc123`
3. Email: `manager@company.com`
4. Name: `Manager`
5. Click "Add User Record"

### **Step 3: Set Permissions**
1. Click "Select" to edit the manager
2. Change Role to "user" (or keep it)
3. **Check these permissions:**
   - manageCatalog: create, read, update (no delete)
   - placeOrder: create, read, update
   - catalogEntries: read
   - orderEntries: read
   - analytics: read
   - **Uncheck:** adminPanel, stockCalendar (optional)
4. Click "Save"

✅ **Done!** Manager can now login and access their permitted features.

---

## 🔄 Permission Matrix

This is what you see when editing a user:

```
Feature                Permissions
────────────────────────────────────
manageCatalog      [✓]Create [✓]Read [✓]Update [✓]Delete
placeOrder         [✓]Create [✓]Read [✓]Update [✓]Delete
catalogEntries     [ ]Create [✓]Read [ ]Update [ ]Delete
orderEntries       [ ]Create [✓]Read [ ]Update [ ]Delete
stockCalendar      [✓]Read
movementHistory    [✓]Read
auditLog           [✓]Read
analytics          [✓]Read
adminPanel         [ ]Create [ ]Read [ ]Update [ ]Delete
```

Each feature can have independent CRUD permissions.

---

## 🔑 Admin vs User Roles

### **Admin (`role: "admin")`**
- Full CRUD on all tabs
- Can manage users (create/edit/delete)
- Can see admin panel
- Can edit any user's permissions
- Can view audit logs

### **User (`role: "user")`**
- Limited CRUD based on permissions
- Cannot see admin panel (tab hidden)
- Can only view own profile
- Cannot manage other users
- Can view limited audit logs

---

## 📊 Current Accounts in Your App

### **Pre-configured Accounts:**

```
Account 1:
├── Email: admin@example.com
├── Password: password123
├── Role: admin (you can verify in Admin Panel)
└── Access: All 9 tabs

Account 2:
├── Email: user@example.com
├── Password: password123
├── Role: user (you can verify in Admin Panel)
└── Access: Limited tabs (Place Order, Orders, Calendar, etc)
```

**To see them:**
1. Login as admin
2. Go to Settings / Admin Panel
3. You'll see both accounts in the Users List

---

## 🚀 Quick Actions

### **How to Reset a User Password?**
Firebase doesn't let admins reset passwords from the app. You must:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Authentication → Click user → Change password
3. Or have user click "Forgot Password" on login page

### **How to Change Someone's Role?**
1. Admin Panel → Select user → Change Role dropdown
2. Click Save
3. Changes take effect immediately (they need to refresh page)

### **How to Disable Access Temporarily?**
1. Admin Panel → Select user
2. Uncheck "Active" checkbox
3. Click Save
4. User can no longer login

### **How to See Who Did What?**
1. Click "Audit Log" tab
2. See all actions (add catalog, delete order, etc) with timestamps and user info
3. Export to CSV if needed

---

## ⚠️ Known Limitations

1. **Cannot reset passwords from app** - Must use Firebase Console
2. **Cannot bulk-create users** - Must do one at a time (can be improved)
3. **Cannot send invitation emails** - Would need email service (optional feature)
4. **Auth UID needed for new users** - Users can't self-signup (by design for security)

---

## 🎯 Future Improvements (Recommendations)

1. **Self-Service Password Reset** - Users can reset own password
2. **Bulk User Import** - CSV upload to create multiple users
3. **Email Invitations** - Send signup link to new users
4. **User Roles with Templates** - Pre-made roles (Admin, Manager, Viewer)
5. **Two-Factor Authentication** - Extra security layer
6. **User Activity Dashboard** - See who's active, last login, etc

---

## 📞 Quick Reference

| Task | Steps |
|------|-------|
| **View all users** | Settings → Users List table |
| **Create user** | Firebase Console (Auth) → Copy UID → App (DB Record) |
| **Change role** | Select user → Role dropdown → Save |
| **Deactivate** | Select user → Uncheck Active → Save |
| **Set permissions** | Select user → Check/uncheck permissions → Save |
| **Delete (hard)** | Firebase Console (not in app) |
| **Delete (soft)** | Admin Panel → Deactivate button |
| **Reset password** | Firebase Console → Change password |

---

**Need help with a specific task?** Let me know! 🚀
