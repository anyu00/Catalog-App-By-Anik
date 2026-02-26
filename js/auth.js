// Authentication Module
// Handles login, signup, logout, and session management with Firebase Auth

import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { ref, set, get, update } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User's display name
 * @returns {Promise} Firebase user credential promise
 */
export function signupUser(email, password, displayName) {
  return createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      // Create user profile in database
      return createUserProfile(userCredential.user.uid, email, displayName, 'user');
    })
    .catch(error => {
      console.error('Signup error:', error.message);
      throw error;
    });
}

/**
 * Sign in user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} Firebase user credential promise
 */
export function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      // Ensure user profile exists and is complete in database
      const uid = userCredential.user.uid;
      const userRef = ref(db, `Users/${uid}`);
      const isAdminEmail = email === 'admin@example.com';
      const role = isAdminEmail ? 'admin' : 'user';
      const displayName = email.split('@')[0];
      
      return get(userRef).then(snapshot => {
        const userData = snapshot.exists() ? snapshot.val() : {};
        
        // Check if profile is incomplete (missing critical fields)
        const isIncomplete = !userData.email || !userData.role || !userData.displayName;
        
        if (!snapshot.exists() || isIncomplete) {
          // Create or update with complete profile
          return set(userRef, {
            email,
            displayName,
            role,
            isActive: userData.isActive !== undefined ? userData.isActive : true,
            createdAt: userData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          });
        } else {
          // Profile exists and is complete - just update lastLogin
          return update(userRef, {
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }).then(() => userCredential);
    })
    .catch(error => {
      console.error('Login error:', error.message);
      throw error;
    });
}

/**
 * Sign out the current user
 * @returns {Promise} Sign out promise
 */
export function logoutUser() {
  return signOut(auth)
    .catch(error => {
      console.error('Logout error:', error.message);
      throw error;
    });
}

/**
 * Get the currently logged-in user
 * @returns {Object} Current user object or null
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Check if a user is authenticated
 * @returns {boolean} True if user is logged in
 */
export function isUserLoggedIn() {
  return auth.currentUser !== null;
}

/**
 * Listen for authentication state changes
 * @param {Function} callback - Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Create a user profile in the database
 * @param {string} userId - Firebase user ID
 * @param {string} email - User email
 * @param {string} displayName - User display name
 * @param {string} role - User role ('admin' or 'user')
 * @returns {Promise} Set operation promise
 */
export function createUserProfile(userId, email, displayName, role = 'user') {
  const userRef = ref(db, `Users/${userId}`);
  return set(userRef, {
    email,
    displayName,
    role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true
  });
}

/**
 * Get user profile from database
 * @param {string} userId - Firebase user ID
 * @returns {Promise} User profile object
 */
export function getUserProfile(userId) {
  const userRef = ref(db, `Users/${userId}`);
  return get(userRef)
    .then(snapshot => {
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        console.log('User profile not found');
        return null;
      }
    })
    .catch(error => {
      console.error('Error fetching user profile:', error.message);
      throw error;
    });
}

/**
 * Update user profile
 * @param {string} userId - Firebase user ID
 * @param {Object} updates - Profile updates object
 * @returns {Promise} Update operation promise
 */
export function updateUserProfile(userId, updates) {
  const userRef = ref(db, `Users/${userId}`);
  return update(userRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  })
    .catch(error => {
      console.error('Error updating user profile:', error.message);
      throw error;
    });
}

/**
 * Update last login timestamp
 * @param {string} userId - Firebase user ID
 * @returns {Promise} Update operation promise
 */
export function updateLastLogin(userId) {
  return updateUserProfile(userId, {
    lastLogin: new Date().toISOString()
  });
}

/**
 * Create a new user account (Admin only)
 * @param {string} email - New user email
 * @param {string} password - New user password
 * @param {string} displayName - New user display name
 * @param {string} role - User role ('admin' or 'user')
 * @param {string} locationId - Associated location ID
 * @returns {Promise} User creation promise
 */
export function createUserAccount(email, password, displayName, role = 'user', locationId = null) {
  // This function creates a user but should only be called by admins
  // In a real app, this would be done via a Cloud Function for security
  return createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      const uid = userCredential.user.uid;
      const profile = {
        email,
        displayName,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };
      if (locationId) {
        profile.locationId = locationId;
      }
      const userRef = ref(db, `Users/${uid}`);
      return set(userRef, profile).then(() => uid);
    })
    .catch(error => {
      console.error('Error creating user account:', error.message);
      throw error;
    });
}

/**
 * Get user's assigned location
 * @param {string} userId - Firebase user ID
 * @returns {Promise} Location ID or null
 */
export function getUserLocation(userId) {
  return getUserProfile(userId)
    .then(profile => profile?.locationId || null)
    .catch(error => {
      console.error('Error getting user location:', error);
      return null;
    });
}

/**
 * Set user's selected address (location or custom)
 * @param {string} userId - Firebase user ID
 * @param {string} addressType - 'location' or 'custom'
 * @param {string} addressValue - Location ID (if location) or custom address (if custom)
 * @returns {Promise} Update operation promise
 */
export function setUserSelectedAddress(userId, addressType, addressValue) {
  return updateUserProfile(userId, {
    selectedAddressType: addressType,
    selectedAddressValue: addressValue
  })
    .catch(error => {
      console.error('Error setting user address:', error);
      throw error;
    });
}

/**
 * Get user's selected address
 * @param {string} userId - Firebase user ID
 * @returns {Promise} {type: 'location'|'custom', value: string}
 */
export function getUserSelectedAddress(userId) {
  return getUserProfile(userId)
    .then(profile => ({
      type: profile?.selectedAddressType || 'location',
      value: profile?.selectedAddressValue || profile?.locationId || null
    }))
    .catch(error => {
      console.error('Error getting user address:', error);
      return { type: 'location', value: null };
    });
}

