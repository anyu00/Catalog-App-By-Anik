// Permissions Module
// Handles role-based access control and permission checking

import { db } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

/**
 * Get user permissions from database
 * @param {string} userId - Firebase user ID
 * @returns {Promise} User permissions object
 */
export async function getUserPermissions(userId) {
  try {
    // First, get user role
    const userRef = ref(db, `Users/${userId}`);
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
      console.log('User not found');
      return null;
    }

    const userRole = userSnapshot.val().role;
    console.log('User role:', userRole);

    // If admin, return full permissions
    if (userRole === 'admin') {
      const adminPerms = getAdminPermissions();
      console.log('Admin permissions granted:', adminPerms);
      return adminPerms;
    }

    // If user, fetch custom permissions
    const permRef = ref(db, `UserPermissions/${userId}`);
    const permSnapshot = await get(permRef);

    if (permSnapshot.exists()) {
      console.log('Custom permissions found:', permSnapshot.val());
      return permSnapshot.val();
    } else {
      // Return default user permissions if none exist
      console.log('No custom permissions, using defaults');
      return getDefaultUserPermissions();
    }
  } catch (error) {
    console.error('Error fetching user permissions:', error.message);
    return null;
  }
}

/**
 * Get default admin permissions (full access)
 * @returns {Object} Admin permissions object
 */
export function getAdminPermissions() {
  return {
    manageCatalog: { create: true, read: true, update: true, delete: true },
    placeOrder: { create: true, read: true, update: true, delete: true },
    catalogEntries: { create: true, read: true, update: true, delete: true },
    orderEntries: { create: true, read: true, update: true, delete: true },
    reports: { read: true },
    stockCalendar: { read: true },
    analytics: { read: true },
    movementHistory: { read: true },
    auditLog: { read: true },
    userManagement: { create: true, read: true, update: true, delete: true }
  };
}

/**
 * Get default user permissions (read-only on most pages)
 * @returns {Object} Default user permissions object
 */
export function getDefaultUserPermissions() {
  return {
    manageCatalog: { create: false, read: true, update: false, delete: false },
    placeOrder: { create: true, read: true, update: false, delete: false },
    catalogEntries: { create: false, read: true, update: false, delete: false },
    orderEntries: { create: false, read: true, update: false, delete: false },
    reports: { read: true },
    stockCalendar: { read: true },
    analytics: { read: false },
    movementHistory: { read: true },
    auditLog: { read: true },
    userManagement: { create: false, read: false, update: false, delete: false }
  };
}

/**
 * Check if user can perform a specific action on a page
 * @param {string} userId - Firebase user ID
 * @param {string} pageName - Page/feature name (e.g., 'manageCatalog')
 * @param {string} action - Action type ('create', 'read', 'update', 'delete')
 * @returns {Promise} True if user has permission, false otherwise
 */
export async function canUserAction(userId, pageName, action) {
  try {
    const permissions = await getUserPermissions(userId);

    if (!permissions) {
      console.warn(`No permissions found for user ${userId}`);
      return false;
    }

    // Check if page permissions exist
    if (!permissions[pageName]) {
      console.warn(`No permissions for page ${pageName}`);
      return false;
    }

    // Check if action is allowed
    const isAllowed = permissions[pageName][action] === true;
    return isAllowed;
  } catch (error) {
    console.error('Error checking user action permission:', error.message);
    return false;
  }
}

/**
 * Check if user has read access to a page
 * @param {string} userId - Firebase user ID
 * @param {string} pageName - Page name
 * @returns {Promise} True if user can read the page
 */
export async function canUserRead(userId, pageName) {
  return canUserAction(userId, pageName, 'read');
}

/**
 * Check if user has create access to a page
 * @param {string} userId - Firebase user ID
 * @param {string} pageName - Page name
 * @returns {Promise} True if user can create
 */
export async function canUserCreate(userId, pageName) {
  return canUserAction(userId, pageName, 'create');
}

/**
 * Check if user has update access to a page
 * @param {string} userId - Firebase user ID
 * @param {string} pageName - Page name
 * @returns {Promise} True if user can update
 */
export async function canUserUpdate(userId, pageName) {
  return canUserAction(userId, pageName, 'update');
}

/**
 * Check if user has delete access to a page
 * @param {string} userId - Firebase user ID
 * @param {string} pageName - Page name
 * @returns {Promise} True if user can delete
 */
export async function canUserDelete(userId, pageName) {
  return canUserAction(userId, pageName, 'delete');
}

/**
 * Check if user is an admin
 * @param {string} userId - Firebase user ID
 * @returns {Promise} True if user is admin
 */
export async function isAdmin(userId) {
  try {
    const userRef = ref(db, `Users/${userId}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      return false;
    }

    return snapshot.val().role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error.message);
    return false;
  }
}

/**
 * Update user permissions (Admin only)
 * @param {string} userId - Firebase user ID to update
 * @param {Object} permissions - New permissions object
 * @returns {Promise} Update operation promise
 */
export async function updateUserPermissions(userId, permissions) {
  try {
    const permRef = ref(db, `UserPermissions/${userId}`);
    const { set } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
    return set(permRef, permissions);
  } catch (error) {
    console.error('Error updating user permissions:', error.message);
    throw error;
  }
}

/**
 * Get accessible pages for a user
 * @param {string} userId - Firebase user ID
 * @returns {Promise} Array of page names user can access
 */
export async function getUserAccessiblePages(userId) {
  try {
    const permissions = await getUserPermissions(userId);

    if (!permissions) {
      return [];
    }

    // Filter pages where user has read access
    const accessiblePages = Object.keys(permissions).filter(page => {
      return permissions[page].read === true;
    });

    return accessiblePages;
  } catch (error) {
    console.error('Error getting user accessible pages:', error.message);
    return [];
  }
}

/**
 * Get full permissions object with readable format
 * @param {string} userId - Firebase user ID
 * @returns {Promise} Formatted permissions with labels
 */
export async function getFormattedPermissions(userId) {
  try {
    const permissions = await getUserPermissions(userId);

    if (!permissions) {
      return null;
    }

    const formatted = {
      manageCatalog: {
        label: 'Manage Catalog',
        create: permissions.manageCatalog?.create || false,
        read: permissions.manageCatalog?.read || false,
        update: permissions.manageCatalog?.update || false,
        delete: permissions.manageCatalog?.delete || false
      },
      placeOrder: {
        label: 'Place Order',
        create: permissions.placeOrder?.create || false,
        read: permissions.placeOrder?.read || false,
        update: permissions.placeOrder?.update || false,
        delete: permissions.placeOrder?.delete || false
      },
      catalogEntries: {
        label: 'Catalog Entries',
        create: permissions.catalogEntries?.create || false,
        read: permissions.catalogEntries?.read || false,
        update: permissions.catalogEntries?.update || false,
        delete: permissions.catalogEntries?.delete || false
      },
      orderEntries: {
        label: 'Order Entries',
        create: permissions.orderEntries?.create || false,
        read: permissions.orderEntries?.read || false,
        update: permissions.orderEntries?.update || false,
        delete: permissions.orderEntries?.delete || false
      },
      reports: {
        label: 'Reports',
        create: false,
        read: permissions.reports?.read || false,
        update: false,
        delete: false
      },
      stockCalendar: {
        label: 'Stock Calendar',
        create: false,
        read: permissions.stockCalendar?.read || false,
        update: false,
        delete: false
      },
      analytics: {
        label: 'Analytics',
        create: false,
        read: permissions.analytics?.read || false,
        update: false,
        delete: false
      }
      ,
      userManagement: {
        label: 'User Management',
        create: permissions.userManagement?.create || false,
        read: permissions.userManagement?.read || false,
        update: permissions.userManagement?.update || false,
        delete: permissions.userManagement?.delete || false
      },
      movementHistory: {
        label: 'Movement History',
        create: false,
        read: permissions.movementHistory?.read || false,
        update: false,
        delete: false
      },
      auditLog: {
        label: 'Audit Log',
        create: false,
        read: permissions.auditLog?.read || false,
        update: false,
        delete: false
      }
    };

    return formatted;
  } catch (error) {
    console.error('Error formatting permissions:', error.message);
    return null;
  }
}
