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
      // Ensure user profile exists in database
      const uid = userCredential.user.uid;
      const userRef = ref(db, `Users/${uid}`);
      return get(userRef).then(snapshot => {
        if (!snapshot.exists()) {
          // Create profile if it doesn't exist
          const role = email === 'admin@example.com' ? 'admin' : 'user';
          return createUserProfile(uid, email, email.split('@')[0], role);
        }
        return userCredential;
      });
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
 * @returns {Promise} User creation promise
 */
export function createUserAccount(email, password, displayName, role = 'user') {
  // This function creates a user but should only be called by admins
  // In a real app, this would be done via a Cloud Function for security
  return createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      const uid = userCredential.user.uid;
      return createUserProfile(uid, email, displayName, role).then(() => uid);
    })
    .catch(error => {
      console.error('Error creating user account:', error.message);
      throw error;
    });
}
