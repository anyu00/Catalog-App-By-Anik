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

// ===== SAVE FCM TOKEN FOR PUSH NOTIFICATIONS =====
exports.saveFCMToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Request has no valid auth context.');
  }

  const { token } = data || {};
  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'FCM token is required.');
  }

  try {
    const uid = context.auth.uid;
    const email = context.auth.token.email;
    
    // Save FCM token in database
    await db.ref(`AdminTokens/${uid}`).set({
      fcmToken: token,
      email: email,
      savedAt: new Date().toISOString(),
      deviceInfo: data.deviceInfo || 'unknown'
    });

    console.log(`FCM token saved for admin: ${email}`);
    return { success: true, message: 'FCM token saved successfully' };
  } catch (error) {
    console.error('saveFCMToken error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to save FCM token: ' + (error.message || error));
  }
});

// ===== LISTEN FOR NEW ORDERS AND SEND PUSH NOTIFICATIONS =====
exports.notifyAdminsOfNewOrder = functions.database
  .ref('Orders/{orderId}')
  .onCreate(async (snapshot, context) => {
    try {
      const newOrder = snapshot.val();
      
      // Only notify for actual new orders (skip if Fulfilled field exists on creation)
      if (!newOrder || !newOrder.CatalogName) {
        console.log('Invalid order data, skipping notification');
        return;
      }

      console.log('New order received:', newOrder);

      // Get all admin FCM tokens
      const tokensSnapshot = await db.ref('AdminTokens').get();
      if (!tokensSnapshot.exists()) {
        console.log('No admin tokens found');
        return;
      } 

      const adminTokens = tokensSnapshot.val();
      const tokens = Object.values(adminTokens).map(t => t.fcmToken).filter(t => t);

      if (tokens.length === 0) {
        console.log('No valid FCM tokens found');
        return;
      }

      // Prepare notification payload
      const message = {
        notification: {
          title: '📦 新しい注文が来ました!',
          body: `${newOrder.CatalogName} - 数量: ${newOrder.OrderQuantity}`,
          icon: '/manifest-icon.png'
        },
        data: {
          catalogName: newOrder.CatalogName,
          orderQuantity: String(newOrder.OrderQuantity),
          requesterDepartment: newOrder.RequesterDepartment || '',
          requester: newOrder.Requester || 'Unknown',
          requesterAddress: newOrder.RequesterAddress || '',
          message: newOrder.Message || '',
          orderDate: newOrder.OrderDate || '',
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        webpush: {
          notification: {
            title: '📦 新しい注文が来ました!',
            body: `${newOrder.CatalogName} - 数量: ${newOrder.OrderQuantity} (発注: ${newOrder.Requester || 'N/A'})`,
            icon: '/manifest-icon.png',
            badge: '/manifest-badge.png',
            sound: '/notification-sound.mp3',
            tag: 'new-order',
            requireInteraction: true
          },
          fcmOptions: {
            link: '/index.html?tab=orderEntries'
          }
        }
      };

      // Send to all admin tokens 
      const responses = await Promise.all(
        tokens.map(token =>
          admin.messaging().send({
            ...message,
            token: token
          }).catch(error => {
            console.error(`Failed to send to token ${token}:`, error);
            // If token is invalid, remove it
            if (error.code === 'messaging/invalid-registration-token' || 
                error.code === 'messaging/registration-token-not-registered') {
              return db.ref(`AdminTokens`).get().then(snap => {
                if (snap.exists()) {
                  const tokens = snap.val();
                  for (const [key, val] of Object.entries(tokens)) {
                    if (val.fcmToken === token) {
                      return db.ref(`AdminTokens/${key}`).remove();
                    }
                  }
                }
              });
            }
            return null;
          })
        )
      );

      const successCount = responses.filter(r => r !== null && r !== undefined).length;
      console.log(`Notification sent to ${successCount} admins`);

      return { notificationsSent: successCount };
    } catch (error) {
      console.error('notifyAdminsOfNewOrder error:', error);
    }
  });

