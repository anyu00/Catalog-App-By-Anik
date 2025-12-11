const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Admin SDK
try {
  admin.initializeApp();
} catch (e) {
  // ignore if already initialized in emulator
}

const db = admin.database();

// Callable function to create a user securely (requires authentication and admin role)
exports.createUserSecure = functions.https.onCall(async (data, context) => {
  // Only authenticated users can call
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Request has no valid auth context.');
  }

  const callerUid = context.auth.uid;

  // Check that caller is admin in DB
  const callerSnapshot = await db.ref(`Users/${callerUid}`).get();
  const callerRole = callerSnapshot.exists() ? callerSnapshot.val().role : null;
  if (callerRole !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can create users.');
  }

  const { email, password, displayName = '', role = 'user' } = data || {};
  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and password are required.');
  }

  try {
    // Create Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: false,
      disabled: false
    });

    // Create DB profile
    await db.ref(`Users/${userRecord.uid}`).set({
      email,
      displayName,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    });

    // Default permissions for admin or user
    const defaultPerms = role === 'admin' ? {
      manageCatalog: { create: true, read: true, update: true, delete: true },
      placeOrder: { create: true, read: true, update: true, delete: true },
      catalogEntries: { create: true, read: true, update: true, delete: true },
      orderEntries: { create: true, read: true, update: true, delete: true },
      reports: { read: true },
      stockCalendar: { read: true },
      analytics: { read: true },
      userManagement: { create: true, read: true, update: true, delete: true }
    } : {
      manageCatalog: { create: false, read: true, update: false, delete: false },
      placeOrder: { create: true, read: true, update: false, delete: false },
      catalogEntries: { create: false, read: true, update: false, delete: false },
      orderEntries: { create: false, read: true, update: false, delete: false },
      reports: { read: true },
      stockCalendar: { read: true },
      analytics: { read: false },
      userManagement: { create: false, read: false, update: false, delete: false }
    };

    await db.ref(`UserPermissions/${userRecord.uid}`).set(defaultPerms);

    // Write audit log
    const logId = `${Date.now()}_${userRecord.uid}`;
    await db.ref(`AuditLogs/${logId}`).set({
      action: 'create_auth_user',
      actorUid: callerUid,
      targetUid: userRecord.uid,
      details: { email, role },
      timestamp: new Date().toISOString()
    });

    return { uid: userRecord.uid };
  } catch (error) {
    console.error('createUserSecure error', error);
    throw new functions.https.HttpsError('internal', 'Failed to create user: ' + (error.message || error));
  }
});

// Callable function to delete (soft-delete) a user and optionally disable Auth
exports.deactivateUserSecure = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Request has no valid auth context.');
  }

  const callerUid = context.auth.uid;
  const callerSnapshot = await db.ref(`Users/${callerUid}`).get();
  const callerRole = callerSnapshot.exists() ? callerSnapshot.val().role : null;
  if (callerRole !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can deactivate users.');
  }

  const { targetUid, disableAuth = false } = data || {};
  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUid is required');
  }

  try {
    await db.ref(`Users/${targetUid}`).update({ isActive: false, updatedAt: new Date().toISOString() });
    await db.ref(`AuditLogs/${Date.now()}_${targetUid}`).set({
      action: 'deactivate_user',
      actorUid: callerUid,
      targetUid,
      details: { disableAuth },
      timestamp: new Date().toISOString()
    });

    if (disableAuth) {
      await admin.auth().updateUser(targetUid, { disabled: true });
    }

    return { success: true };
  } catch (error) {
    console.error('deactivateUserSecure error', error);
    throw new functions.https.HttpsError('internal', 'Failed to deactivate user: ' + (error.message || error));
  }
});
