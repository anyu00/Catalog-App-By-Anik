// Authentication Page Handler
// Manages login.html and signup.html form submissions

import { loginUser, signupUser } from './auth.js';

// ============================================
// Login Page Logic
// ============================================

const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Hide previous errors
    hideError(loginError);

    // Get input values
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    // Validate inputs
    if (!email || !password) {
      showError(loginError, 'Please enter both email and password');
      return;
    }

    try {
      // Show loading state
      setButtonLoading(loginBtn, true);

      // Attempt login
      await loginUser(email, password);

      // Show success message
      showSuccess(loginError, 'Login successful! Redirecting...');

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } catch (error) {
      // Handle specific Firebase errors (with debug logging)
      console.error('Login error raw:', error);
      let errorMessage = 'Login failed. Please try again.';

      if (error && error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error && error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error && error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error && error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Try again later.';
      }

      // Show the message plus the Firebase error code for debugging
      const code = error && error.code ? error.code : 'unknown';
      showError(loginError, `${errorMessage} (${code})`);
    } finally {
      setButtonLoading(loginBtn, false);
    }
  });

  // Show demo info
  if (document.getElementById('demoInfo')) {
    document.getElementById('demoInfo').classList.add('show');
  }
}

// ============================================
// Signup Page Logic  
// ============================================

const signupForm = document.getElementById('signupForm');
const signupEmail = document.getElementById('signupEmail');
const displayName = document.getElementById('displayName');
const signupPassword = document.getElementById('signupPassword');
const confirmPassword = document.getElementById('confirmPassword');
const signupError = document.getElementById('signupError');
const signupSuccess = document.getElementById('signupSuccess');
const signupBtn = document.getElementById('signupBtn');

if (signupForm) {
  // Signup is disabled - users must be created by admin
  // Form remains disabled by default, shown for reference only
  showInfo(signupSuccess, 'User registration is disabled. Contact an administrator to create an account.');
}

// ============================================
// Helper Functions
// ============================================

/**
 * Show error message
 */
function showError(element, message) {
  if (!element) return;

  element.textContent = message;
  element.classList.remove('success-message');
  element.classList.add('error-message', 'show');
}

/**
 * Show success message
 */
function showSuccess(element, message) {
  if (!element) return;

  element.textContent = message;
  element.classList.remove('error-message');
  element.classList.add('success-message', 'show');
}

/**
 * Show info message
 */
function showInfo(element, message) {
  if (!element) return;

  element.textContent = message;
  element.classList.remove('error-message', 'success-message');
  element.classList.add('info-message', 'show');
}

/**
 * Hide error message
 */
function hideError(element) {
  if (!element) return;
  element.classList.remove('show');
}

/**
 * Set button loading state
 */
function setButtonLoading(button, isLoading) {
  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.classList.add('loading');
    button.textContent = 'Loading...';
  } else {
    button.disabled = false;
    button.classList.remove('loading');
    button.textContent = button.id === 'loginBtn' ? 'Login' : 'Sign Up';
  }
}

/**
 * Validate password confirmation
 */
function validatePasswordMatch() {
  if (!signupPassword.value || !confirmPassword.value) return true;

  if (signupPassword.value !== confirmPassword.value) {
    showError(signupError, 'Passwords do not match');
    return false;
  }

  hideError(signupError);
  return true;
}

/**
 * Real-time password validation
 */
if (confirmPassword) {
  confirmPassword.addEventListener('input', validatePasswordMatch);
  signupPassword.addEventListener('input', validatePasswordMatch);
}

/**
 * Redirect if already logged in
 */
import { isUserLoggedIn } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  if (isUserLoggedIn()) {
    // User is already logged in, redirect to dashboard
    window.location.href = 'index.html';
  }
});
