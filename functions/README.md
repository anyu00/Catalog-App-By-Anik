# Cloud Functions (Admin SDK) - Secure User Management

This folder contains example Firebase Cloud Functions for secure user creation and deactivation using the Admin SDK.

Important: Do NOT use client-side Admin SDK operations in production. Use these callable functions and secure them with Firebase Authentication and Database rules.

Quick deploy:

1. Install Firebase CLI and login:

```powershell
npm install -g firebase-tools
firebase login
```

2. From this `functions` folder install dependencies and deploy:

```powershell
cd functions
npm install
firebase deploy --only functions
```

3. After deploy, the functions `createUserSecure` and `deactivateUserSecure` are available as callable functions. Use the Firebase client SDK (`getFunctions` + `httpsCallable`) to call them from the Admin UI.

Development (Emulator):

```powershell
cd functions
npm install
firebase emulators:start --only functions
```

Client example (callable):

```javascript
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js';

const functions = getFunctions();
const createUser = httpsCallable(functions, 'createUserSecure');

createUser({ email: 'user@example.com', password: 'Temp1234!', displayName: 'User', role: 'user' })
  .then(res => console.log('Created', res.data.uid))
  .catch(err => console.error(err));
```

Security: Ensure only admin users in your Realtime Database (e.g., `Users/{uid}.role === 'admin'`) can successfully call these functions. The functions check the caller's DB role before executing.
