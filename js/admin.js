// Admin Panel Logic
// Manage Users and Permissions (client-side management of DB records)

import { db } from './firebase-config.js';
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getUserProfile, updateUserProfile, createUserProfile, createUserAccount, getCurrentUser } from './auth.js';
import { functionsClient } from './firebase-config.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js';
import { getUserPermissions, getFormattedPermissions, updateUserPermissions, getDefaultUserPermissions, getAdminPermissions } from './permissions.js';

let currentSelectedUid = null;

export function initAdminPanel() {
  const refreshBtn = document.getElementById('refreshUsersBtn');
  const createBtn = document.getElementById('createUserRecordBtn');
  const clearBtn = document.getElementById('clearNewUserBtn');
  const saveBtn = document.getElementById('saveUserBtn');
  const deactivateBtn = document.getElementById('deactivateUserBtn');

  if (refreshBtn) refreshBtn.addEventListener('click', fetchAndRenderUsers);
  // Toggle dev-mode create-auth box
  const toggleCreateAuthBtn = document.getElementById('toggleCreateAuthUserBtn');
  const createAuthBox = document.getElementById('createAuthUserBox');
  const createAuthBtn = document.getElementById('createAuthUserBtn');
  const cancelCreateAuthBtn = document.getElementById('cancelCreateAuthBtn');

  if (toggleCreateAuthBtn && createAuthBox) {
    toggleCreateAuthBtn.addEventListener('click', () => {
      createAuthBox.style.display = createAuthBox.style.display === 'none' ? 'block' : 'none';
    });
  }
  if (createAuthBtn) createAuthBtn.addEventListener('click', handleCreateAuthUser);
  if (cancelCreateAuthBtn && createAuthBox) cancelCreateAuthBtn.addEventListener('click', () => createAuthBox.style.display = 'none');
  if (createBtn) createBtn.addEventListener('click', handleCreateUserRecord);
  if (clearBtn) clearBtn.addEventListener('click', () => {
    document.getElementById('newUserUid').value = '';
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserDisplayName').value = '';
  });

  if (saveBtn) saveBtn.addEventListener('click', handleSaveUser);
  if (deactivateBtn) deactivateBtn.addEventListener('click', handleDeactivateUser);

  // Initial load
  fetchAndRenderUsers();
}

async function fetchAndRenderUsers() {
  try {
    const usersRef = ref(db, 'Users/');
    const snapshot = await get(usersRef);
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';

    if (!snapshot.exists()) {
      tbody.innerHTML = '<tr><td colspan="5">No users found</td></tr>';
      return;
    }

    const users = snapshot.val();
    Object.keys(users).forEach(uid => {
      const u = users[uid];
      const tr = document.createElement('tr');

      const tdUid = document.createElement('td'); tdUid.textContent = uid.slice(0,8);
      const tdEmail = document.createElement('td'); tdEmail.textContent = u.email || '';
      const tdRole = document.createElement('td'); tdRole.textContent = u.role || 'user';
      const tdActive = document.createElement('td'); tdActive.textContent = u.isActive === false ? 'No' : 'Yes';
      const tdActions = document.createElement('td');

      const selectBtn = document.createElement('button');
      selectBtn.className = 'btn btn-sm btn-outline-primary';
      selectBtn.textContent = 'Select';
      selectBtn.addEventListener('click', () => selectUser(uid));

      const softBtn = document.createElement('button');
      softBtn.className = 'btn btn-sm btn-outline-danger';
      softBtn.style.marginLeft = '6px';
      softBtn.textContent = 'Deactivate';
      softBtn.addEventListener('click', async () => {
        if (!confirm('Deactivate this user?')) return;
        await updateUserProfile(uid, { isActive: false });
        await writeAuditLog('deactivate_user', uid, { note: 'Deactivated by admin' });
        showNotification('User deactivated', 'success');
        fetchAndRenderUsers();
      });

      tdActions.appendChild(selectBtn);
      tdActions.appendChild(softBtn);

      tr.appendChild(tdUid);
      tr.appendChild(tdEmail);
      tr.appendChild(tdRole);
      tr.appendChild(tdActive);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    showNotification('Failed to load users', 'error');
  }
}

async function selectUser(uid) {
  currentSelectedUid = uid;
  const profile = await getUserProfile(uid);
  document.getElementById('selUserEmail').textContent = profile?.email || uid;
  document.getElementById('selUserRole').value = profile?.role || 'user';
  document.getElementById('selUserActive').checked = profile?.isActive !== false;

  // Load permissions and render editor
  const formatted = await getFormattedPermissions(uid);
  renderPermissionsEditor(formatted || getDefaultUserPermissions());
}

function renderPermissionsEditor(formattedPermissions) {
  const container = document.getElementById('permissionsEditor');
  container.innerHTML = '';

  Object.keys(formattedPermissions).forEach(key => {
    const p = formattedPermissions[key];
    const section = document.createElement('div');
    section.style.borderBottom = '1px solid #eee';
    section.style.padding = '8px 0';

    const title = document.createElement('div');
    title.innerHTML = `<strong>${p.label || key}</strong>`;
    section.appendChild(title);

    // Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.gap = '8px';
    actionsDiv.style.marginTop = '6px';

    ['create','read','update','delete'].forEach(action => {
      if (action in p) {
        const id = `perm_${key}_${action}`;
        const wrapper = document.createElement('label');
        wrapper.style.marginRight = '8px';
        wrapper.style.fontSize = '13px';
        wrapper.innerHTML = `<input type="checkbox" id="${id}" ${p[action] ? 'checked' : ''}> ${action}`;
        actionsDiv.appendChild(wrapper);
      }
    });

    section.appendChild(actionsDiv);
    container.appendChild(section);
  });
}

async function handleSaveUser() {
  if (!currentSelectedUid) {
    alert('Select a user first');
    return;
  }

  const role = document.getElementById('selUserRole').value;
  const isActive = document.getElementById('selUserActive').checked;

  try {
    await updateUserProfile(currentSelectedUid, { role, isActive });

    // Build permissions object from editor
    const container = document.getElementById('permissionsEditor');
    const newPerms = {};

    Array.from(container.children).forEach(section => {
      const strong = section.querySelector('strong');
      if (!strong) return;
      const key = strong.textContent;
      // map label back to key: assume keys match labels or use dataset; for safety, try to find id prefixes
      // Our formattedPermissions used keys as property names; since we displayed p.label, we need to reconstruct keys differently.
      // Simpler approach: read ids of inputs inside section
      const inputs = section.querySelectorAll('input[id^="perm_"]');
      if (!inputs.length) return;
      // Extract page key from id like perm_manageCatalog_create
      const pageKey = inputs[0].id.split('_')[1];
      newPerms[pageKey] = {};
      inputs.forEach(inp => {
        const parts = inp.id.split('_');
        const action = parts[2];
        newPerms[pageKey][action] = inp.checked;
      });
    });

    // If role is admin, grant full admin permissions; otherwise merge with defaults to ensure all keys exist
    let permsToSave = newPerms;
    if (role === 'admin') {
      permsToSave = getAdminPermissions();
    } else {
      const defaults = getDefaultUserPermissions();
      // Ensure all pages exist; use edited values when provided
      permsToSave = { ...defaults };
      Object.keys(newPerms).forEach(k => {
        permsToSave[k] = { ...(permsToSave[k] || {}), ...(newPerms[k] || {}) };
      });
    }

    await updateUserPermissions(currentSelectedUid, permsToSave);
    await writeAuditLog('update_permissions', currentSelectedUid, { role, isActive, permissions: permsToSave });
    showNotification('User saved', 'success');
    fetchAndRenderUsers();
  } catch (error) {
    console.error('Save user error:', error);
    showNotification('Failed to save user', 'error');
  }
}

async function handleDeactivateUser() {
  if (!currentSelectedUid) {
    alert('Select a user first');
    return;
  }
  if (!confirm('Are you sure you want to deactivate this user?')) return;
  try {
    await updateUserProfile(currentSelectedUid, { isActive: false });
    await writeAuditLog('deactivate_user', currentSelectedUid, { note: 'Deactivated by admin (panel)' });
    showNotification('User deactivated', 'success');
    fetchAndRenderUsers();
  } catch (error) {
    console.error('Deactivate error:', error);
    showNotification('Failed to deactivate', 'error');
  }
}

async function handleCreateUserRecord() {
  const uid = document.getElementById('newUserUid').value.trim();
  const email = document.getElementById('newUserEmail').value.trim();
  const displayName = document.getElementById('newUserDisplayName').value.trim();

  if (!uid || !email) {
    alert('Please provide Auth UID and email');
    return;
  }

  try {
    await createUserProfile(uid, email, displayName || '', 'user');
    // Set default permissions
    const defaultPerms = getDefaultUserPermissions();
    await updateUserPermissions(uid, defaultPerms);
    showNotification('User record added. Make sure the Auth account exists in Firebase.', 'success');
    document.getElementById('newUserUid').value = '';
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserDisplayName').value = '';
    fetchAndRenderUsers();
  } catch (error) {
    console.error('Create user record error:', error);
    showNotification('Failed to create user record', 'error');
  }
}

// Dev-mode: create Auth account and DB profile
async function handleCreateAuthUser() {
  const email = document.getElementById('createAuthEmail').value.trim();
  const password = document.getElementById('createAuthPassword').value;
  const displayName = document.getElementById('createAuthDisplayName').value.trim();
  const role = document.getElementById('createAuthRole').value || 'user';

  if (!email || !password) {
    alert('Email and password are required');
    return;
  }

  try {
    // Use secure callable function if available
    let createdUid = null;
    try {
      const createUserCallable = httpsCallable(functionsClient, 'createUserSecure');
      const res = await createUserCallable({ email, password, displayName, role });
      createdUid = res.data.uid;
    } catch (fnErr) {
      console.warn('Callable function failed, falling back to client SDK create:', fnErr);
      // Fallback to client SDK (dev-only)
      createdUid = await createUserAccount(email, password, displayName || '', role);
    }

    // Save default or admin perms (if callable already set them this is idempotent)
    const perms = role === 'admin' ? getAdminPermissions() : getDefaultUserPermissions();
    await updateUserPermissions(createdUid, perms);
    // Set the quick-paste field so admin can find the record
    const newUidField = document.getElementById('newUserUid');
    if (newUidField) newUidField.value = createdUid;
    await writeAuditLog('create_auth_user', createdUid, { email, role });
    showNotification('Auth user created and DB record added', 'success');
    fetchAndRenderUsers();
  } catch (error) {
    console.error('Create auth user error:', error);
    showNotification('Failed to create auth user: ' + (error.message || error), 'error');
  }
}

async function writeAuditLog(action, targetUid, details = {}) {
  try {
    const actor = getCurrentUser();
    const logId = Date.now() + '_' + (targetUid || 'unknown') + '_' + Math.random().toString(36).slice(2,6);
    const logRef = ref(db, `AuditLogs/${logId}`);
    await set(logRef, {
      action,
      actorUid: actor?.uid || null,
      actorEmail: actor?.email || null,
      targetUid: targetUid || null,
      details: details || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#fee' : type === 'success' ? '#efe' : '#eef'};
      color: ${type === 'error' ? '#c33' : type === 'success' ? '#3c3' : '#33c'};
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      z-index: 10000;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}

// Auto-init when this module is loaded (if admin tab exists)
document.addEventListener('DOMContentLoaded', () => {
  const adminTab = document.getElementById('tab-adminPanel');
  if (adminTab) {
    initAdminPanel();
  }
});
