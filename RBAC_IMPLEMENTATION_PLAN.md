# Role-Based Access Control Implementation Plan

## 📋 Executive Summary

Implement a **two-tier permission system** with **Admin** and **User** roles using Firebase Authentication + Realtime Database. Admins control page access and CRUD permissions; Users access only assigned pages/actions.

---

## 🎯 System Architecture

### Three Main Components

1. **Firebase Authentication** - User login/signup with email/password
2. **User Roles Database** - Store user role (admin/user) and permissions
3. **Permission Access Control** - Enforce rules at UI level (future: Cloud Rules)

---

## 📊 Database Schema

### Current Structure (UNCHANGED)
```
Catalogs/ (existing)
└─ [catalog entries]

Orders/ (existing)
└─ [order entries]
```

### New Structure (ADD THESE)
```
Users/
└─ {userId}/
    ├─ email: "user@example.com"
    ├─ displayName: "John Doe"
    ├─ role: "admin" | "user"
    ├─ createdAt: "2025-12-01T..."
    └─ permissions: {}  (see below)

Roles/
├─ admin/
│   ├─ canCreate: true
│   ├─ canRead: true
│   ├─ canUpdate: true
│   ├─ canDelete: true
│   └─ manageUsers: true
│
└─ user/
    ├─ canCreate: false
    ├─ canRead: false
    ├─ canUpdate: false
    ├─ canDelete: false
    └─ manageUsers: false

UserPermissions/
└─ {userId}/
    ├─ manageCatalog: { create: true, read: true, update: false, delete: false }
    ├─ placeOrder: { create: true, read: true, update: false, delete: false }
    ├─ catalogEntries: { create: false, read: true, update: false, delete: false }
    ├─ orderEntries: { create: false, read: true, update: false, delete: false }
    ├─ reports: { read: true }
    ├─ stockCalendar: { read: true }
    └─ analytics: { read: true }
```

---

## 🔐 Roles Definition

### **ADMIN Role**
```javascript
{
  role: "admin",
  permissions: {
    "manageCatalog": { create: true, read: true, update: true, delete: true },
    "placeOrder": { create: true, read: true, update: true, delete: true },
    "catalogEntries": { create: true, read: true, update: true, delete: true },
    "orderEntries": { create: true, read: true, update: true, delete: true },
    "reports": { read: true },
    "stockCalendar": { read: true },
    "analytics": { read: true },
    "userManagement": { create: true, read: true, update: true, delete: true }
  }
}
```

### **USER Role** (Customizable per user)
```javascript
{
  role: "user",
  permissions: {
    "manageCatalog": { create: false, read: true, update: false, delete: false },
    "placeOrder": { create: true, read: true, update: false, delete: false },
    "catalogEntries": { create: false, read: true, update: false, delete: false },
    "orderEntries": { create: false, read: true, update: false, delete: false },
    "reports": { read: true },
    "stockCalendar": { read: true },
    "analytics": { read: false }
  }
}
```

---

## 🔄 User Workflow

### **Admin Workflow**
```
Login → Admin Dashboard
  ├─ See all 7 tabs with full CRUD
  ├─ User Management Panel (new)
  │   ├─ Create User Account
  │   │   ├─ Email
  │   │   ├─ Password
  │   │   ├─ Display Name
  │   │   └─ Set Initial Permissions
  │   │
  │   ├─ Edit User Permissions
  │   │   ├─ Select User
  │   │   ├─ Check/Uncheck per-page CRUD
  │   │   └─ Save
  │   │
  │   ├─ Delete User Account
  │   └─ View User Activity Log
  │
  └─ Normal Operations (full access to all pages)
```

### **User Workflow**
```
Login → User Dashboard
  └─ See only assigned pages
      └─ Can only perform allowed actions
          ├─ Read-only: View data
          ├─ Create: Add new entries
          ├─ Update: Edit existing entries
          └─ Delete: Remove entries
```

---

## 📁 Implementation Plan (Step by Step)

### **Phase 1: Authentication Setup** (Files to Create/Modify)

#### 1.1 `js/auth.js` (NEW)
**Handles login/signup**
```javascript
// Export functions:
- loginUser(email, password)
- signupUser(email, password, displayName)
- logoutUser()
- getCurrentUser()
- onAuthStateChanged(callback)
```

**Implementation:**
```javascript
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const auth = getAuth(app);

export function signupUser(email, password, displayName) {
  return createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      // Create user profile in database
      return createUserProfile(userCredential.user.uid, email, displayName);
    });
}

export function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logoutUser() {
  return signOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, callback);
}

function createUserProfile(userId, email, displayName) {
  const userRef = ref(db, `Users/${userId}`);
  return set(userRef, {
    email,
    displayName,
    role: "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}
```

#### 1.2 `js/permissions.js` (NEW)
**Handles permission checks**
```javascript
// Export functions:
- getUserPermissions(userId)
- canUserAction(userId, page, action)
- isAdmin(userId)
- updateUserPermissions(userId, permissions)
```

---

### **Phase 2: UI Components** (Files to Create)

#### 2.1 `login.html` (NEW)
**Standalone login page**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Catalog Management</title>
  <link rel="stylesheet" href="css/auth.css">
</head>
<body>
  <div class="auth-container">
    <div class="auth-card">
      <h1>Login</h1>
      
      <form id="loginForm">
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="loginEmail" required>
        </div>
        
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="loginPassword" required>
        </div>
        
        <button type="submit" class="btn-primary">Login</button>
        <p class="error-message" id="loginError"></p>
      </form>
      
      <p class="toggle-auth">
        Don't have account? <a href="signup.html">Sign Up</a>
      </p>
    </div>
  </div>
  
  <script type="module" src="js/auth-page.js"></script>
</body>
</html>
```

#### 2.2 `signup.html` (NEW)
**Signup form page**
```html
<!-- Similar to login.html but for signup -->
```

#### 2.3 `admin-panel.html` (NEW)
**Admin user management interface**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Admin Panel - User Management</title>
  <link rel="stylesheet" href="css/styles.css">
  <link rel="stylesheet" href="css/admin-panel.css">
</head>
<body>
  <!-- Admin can:
       1. View all users
       2. Create new user accounts
       3. Edit user permissions per page
       4. Delete users
       5. View user activity logs
  -->
  
  <div class="admin-panel">
    <!-- User Management Section -->
    <div class="users-section">
      <h2>User Accounts</h2>
      <button id="createUserBtn">+ Create User</button>
      <table id="usersTable">...</table>
    </div>
    
    <!-- Permission Editor Section -->
    <div class="permissions-section">
      <h2>Edit User Permissions</h2>
      <select id="userSelect">...</select>
      <div id="permissionsEditor">
        <!-- Checkboxes for each page's CRUD actions -->
      </div>
    </div>
  </div>
  
  <script type="module" src="js/admin-panel.js"></script>
</body>
</html>
```

#### 2.4 `css/auth.css` (NEW)
**Styling for login/signup pages**

---

### **Phase 3: Logic Implementation** (Files to Modify)

#### 3.1 Modify `index.html`
**Add:**
- Logout button in topbar
- Check if user logged in
- Show/hide tabs based on permissions
- Redirect to login if not authenticated

#### 3.2 Modify `js/main.js`
**Add at top:**
```javascript
import { onAuthStateChanged, getCurrentUser, logoutUser } from './auth.js';
import { canUserAction, getUserPermissions } from './permissions.js';

// Check auth state on page load
onAuthStateChanged(async (user) => {
  if (!user) {
    // Redirect to login
    window.location.href = 'login.html';
    return;
  }
  
  // Store current user
  window.currentUser = user;
  
  // Get user permissions
  const permissions = await getUserPermissions(user.uid);
  window.currentUserPermissions = permissions;
  
  // Show/hide tabs based on permissions
  filterTabsByPermissions(permissions);
  
  // Initialize app normally
  initApp();
});

// Add logout handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await logoutUser();
  window.location.href = 'login.html';
});

// Function to show/hide tabs
function filterTabsByPermissions(permissions) {
  const tabs = {
    'manageCatalog': 'manageCatalog',
    'placeOrder': 'placeOrder',
    'catalogEntries': 'catalogEntries',
    'orderEntries': 'orderEntries',
    'reports': 'reports',
    'stockCalendar': 'stockCalendar',
    'analytics': 'analytics'
  };
  
  Object.entries(tabs).forEach(([tabId, permissionKey]) => {
    const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (permissions[permissionKey]?.read) {
      tabBtn.style.display = 'block';
    } else {
      tabBtn.style.display = 'none';
    }
  });
}
```

#### 3.3 Modify `js/firebase-utils.js`
**Add permission checks before CRUD:**
```javascript
// Before saveCatalog:
export async function saveCatalog(catalogId, catalogData) {
  const userId = getCurrentUser()?.uid;
  if (!userId) throw new Error('User not authenticated');
  
  const canCreate = await canUserAction(userId, 'manageCatalog', 'create');
  if (!canCreate) throw new Error('Permission denied: Cannot create catalog');
  
  // ... existing code ...
}

// Similar for update, delete operations
```

---

### **Phase 4: Database Security Rules** (Setup in Firebase)

#### 4.1 Firebase Realtime Database Rules
```javascript
{
  "rules": {
    "Catalogs": {
      "$catalogId": {
        ".read": "root.child('Users').child(auth.uid).child('role').val() !== null",
        ".write": "root.child('Users').child(auth.uid).child('permissions').child('manageCatalog').child('create').val() === true"
      }
    },
    "Orders": {
      "$orderId": {
        ".read": "root.child('Users').child(auth.uid).child('role').val() !== null",
        ".write": "root.child('Users').child(auth.uid).child('permissions').child('placeOrder').child('create').val() === true"
      }
    },
    "Users": {
      "$uid": {
        ".read": "auth.uid === $uid || root.child('Users').child(auth.uid).child('role').val() === 'admin'",
        ".write": "auth.uid === $uid || root.child('Users').child(auth.uid).child('role').val() === 'admin'"
      }
    },
    "UserPermissions": {
      "$uid": {
        ".read": "auth.uid === $uid || root.child('Users').child(auth.uid).child('role').val() === 'admin'",
        ".write": "root.child('Users').child(auth.uid).child('role').val() === 'admin'"
      }
    }
  }
}
```

---

## 📋 File Structure After Implementation

```
Basics/
├── index.html (main app - modified)
├── login.html (NEW)
├── signup.html (NEW)
├── admin-panel.html (NEW)
│
├── css/
│   ├── styles.css (existing)
│   ├── auth.css (NEW)
│   └── admin-panel.css (NEW)
│
├── js/
│   ├── main.js (modified)
│   ├── auth.js (NEW)
│   ├── permissions.js (NEW)
│   ├── auth-page.js (NEW)
│   ├── admin-panel.js (NEW)
│   ├── firebase-config.js (modified to include Auth)
│   └── firebase-utils.js (modified for permissions)
│
└── [other files]
```

---

## 🔄 User Flow Diagrams

### Admin User Flow
```
1. Visit app → login.html
2. Login with admin credentials
3. Redirected to dashboard
4. Can see: All 7 tabs + Admin Panel link
5. Admin Panel: Manage users & permissions
6. Go back: Full CRUD on all pages
```

### Regular User Flow
```
1. Visit app → login.html
2. Login with user credentials
3. Redirected to dashboard
4. Can see: Only assigned tabs
5. Each tab shows: Only permitted actions
6. Try unauthorized action → Error popup
```

---

## 🔑 Key Features

### Login/Signup (Phase 1)
✅ Email/password authentication
✅ Account creation by admin
✅ Logout functionality
✅ Session persistence

### Admin Panel (Phase 2)
✅ Create user accounts
✅ Assign initial permissions
✅ Edit user permissions per tab
✅ Delete user accounts
✅ View user list with roles

### Permission Enforcement (Phase 3)
✅ UI-level filtering (tabs visible/hidden)
✅ Button disabling (create/edit/delete hidden)
✅ Server-side validation (Firebase Rules)
✅ Permission check before API calls

### User Experience
✅ Automatic logout on session expire
✅ Toast notifications for permission errors
✅ Clear visual indicators (disabled buttons)
✅ Responsive on mobile

---

## 🚀 Implementation Order

### Week 1: Core Auth
1. Add Firebase Auth to config
2. Create `auth.js`
3. Create `login.html` + `signup.html`
4. Create `auth-page.js`
5. Test login/signup flow

### Week 2: Permissions
1. Create `permissions.js`
2. Modify `firebase-utils.js` with checks
3. Modify `main.js` to filter tabs
4. Create default permission templates

### Week 3: Admin Panel
1. Create `admin-panel.html`
2. Create `admin-panel.js`
3. Add user management features
4. Test admin workflows

### Week 4: Security & Polish
1. Implement Firebase Security Rules
2. Add error handling & notifications
3. Test all user scenarios
4. Documentation & deployment

---

## 💾 Data Examples

### Creating Admin User (First Time Setup)
```javascript
// Admin created manually in Firebase Console
Users/
└─ admin123/
    ├─ email: "admin@company.com"
    ├─ displayName: "Admin User"
    ├─ role: "admin"
    ├─ createdAt: "2025-12-01T10:00:00Z"
    └─ permissions: {} (empty, uses admin defaults)
```

### Creating Regular User (via Admin Panel)
```javascript
// Admin creates user through UI
Users/
└─ user456/
    ├─ email: "sales@company.com"
    ├─ displayName: "Sales Rep"
    ├─ role: "user"
    ├─ createdAt: "2025-12-02T14:30:00Z"
    └─ permissions: {}

UserPermissions/
└─ user456/
    ├─ manageCatalog: { create: false, read: true, update: false, delete: false }
    ├─ placeOrder: { create: true, read: true, update: false, delete: false }
    ├─ catalogEntries: { create: false, read: true, update: false, delete: false }
    ├─ orderEntries: { create: false, read: true, update: false, delete: false }
    ├─ reports: { read: true }
    ├─ stockCalendar: { read: true }
    └─ analytics: { read: false }
```

---

## ⚠️ Security Considerations

1. **Client-Side Checks** (current)
   - Filter UI based on permissions
   - Prevent button clicks

2. **Server-Side Rules** (essential)
   - Firebase Security Rules validate all writes
   - Prevent direct database manipulation

3. **Session Management**
   - Firebase handles token refresh automatically
   - Implement idle timeout for extra security

4. **Password Security**
   - Firebase handles password hashing
   - Require strong passwords (8+ chars, mix of types)

5. **Activity Logging** (future)
   - Log all CRUD operations
   - Track user actions for audit trail

---

## 🎯 Summary

**This plan provides:**

✅ **Two-tier access control** - Admin (full) vs User (limited)
✅ **Flexible permissions** - Admin can customize per user/page
✅ **Firebase-native** - Uses Auth + Realtime DB (no external tools)
✅ **User-friendly** - Simple login/signup, clear UI feedback
✅ **Secure** - Client & server-side validation
✅ **Scalable** - Easy to add more roles/permissions later

**Next Steps:** Confirm this plan, then I'll implement Phase 1 (Authentication) first.

---

## ❓ Questions Before Implementation

1. Should users change their own passwords?
2. Should there be activity logging?
3. Do you want email verification for new signups?
4. Should password reset functionality exist?
5. Any branding/styling preferences for auth pages?
6. Should admin be able to reset user passwords?

