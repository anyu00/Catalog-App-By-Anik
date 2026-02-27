// Admin Panel Logic
// Manage Users and Permissions (client-side management of DB records)

import { db } from './firebase-config.js';
import { ref, get, set, update, onValue } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getUserProfile, updateUserProfile, createUserProfile, createUserAccount, getCurrentUser } from './auth.js';
import { functionsClient } from './firebase-config.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js';
import { getUserPermissions, getFormattedPermissions, updateUserPermissions, getDefaultUserPermissions, getAdminPermissions } from './permissions.js';

// Extract image URL from HTML or plain URL (supports imgbb format)
function extractImageUrl(input) {
    if (!input) return '';
    
    // Plain URL
    if (input.trim().startsWith('http')) {
        return input.trim();
    }
    
    // HTML img tag
    const imgMatch = input.match(/src=["']([^"']+)["']/);
    if (imgMatch && imgMatch[1]) {
        return imgMatch[1].trim();
    }
    
    // HTML anchor tag
    const hrefMatch = input.match(/href=["']([^"']+)["']/);
    if (hrefMatch && hrefMatch[1]) {
        return hrefMatch[1].trim();
    }
    
    return input.trim();
}

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

  // Admin Tab Switching
  const adminTabUsers = document.getElementById('adminTabUsers');
  const adminTabSettings = document.getElementById('adminTabSettings');
  const adminPanelUsers = document.getElementById('adminPanelUsers');
  const adminPanelSettings = document.getElementById('adminPanelSettings');

  if (adminTabUsers && adminTabSettings) {
    adminTabUsers.addEventListener('click', () => {
      adminPanelUsers.style.display = 'block';
      adminPanelSettings.style.display = 'none';
      adminTabUsers.style.borderBottom = '3px solid #2563eb';
      adminTabSettings.style.borderBottom = 'none';
    });
    
    adminTabSettings.addEventListener('click', () => {
      adminPanelUsers.style.display = 'none';
      adminPanelSettings.style.display = 'block';
      adminTabUsers.style.borderBottom = 'none';
      adminTabSettings.style.borderBottom = '3px solid #2563eb';
      loadAnalyticsSettingsUI();
    });
  }

  // Analytics Settings Buttons
  const saveGlobalBtn = document.getElementById('saveGlobalAnalyticsBtn');
  const savePerItemBtn = document.getElementById('savePerItemAnalyticsBtn');
  
  if (saveGlobalBtn) saveGlobalBtn.addEventListener('click', saveGlobalAnalyticsSettings);
  if (savePerItemBtn) savePerItemBtn.addEventListener('click', savePerItemAnalyticsSettings);

  // Catalog Names Management
  const addCatalogNameBtn = document.getElementById('addCatalogNameBtn');
  const newCatalogNameInput = document.getElementById('newCatalogNameInput');
  const catalogNamesListContainer = document.getElementById('catalogNamesListContainer');
  
  if (addCatalogNameBtn) {
    addCatalogNameBtn.addEventListener('click', () => handleAddCatalogName(newCatalogNameInput, catalogNamesListContainer));
  }
  if (newCatalogNameInput) {
    newCatalogNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAddCatalogName(newCatalogNameInput, catalogNamesListContainer);
      }
    });
  }
  
  // Load and display catalog names
  loadAndDisplayCatalogNames(catalogNamesListContainer);
  setupCatalogNamesListener(catalogNamesListContainer);

  // Initial load
  fetchAndRenderUsers();
}

async function loadAnalyticsSettingsUI() {
  try {
    const globalLowInput = document.getElementById('globalLowStockInput');
    const globalHighInput = document.getElementById('globalHighStockInput');
    const globalFastInput = document.getElementById('globalFastMovingInput');
    
    // Check if elements exist before using them
    if (!globalLowInput || !globalHighInput || !globalFastInput) {
      console.log('Analytics settings UI elements not found');
      return;
    }
    
    // Load analytics settings from Firebase
    const settingsRef = ref(db, 'AnalyticsSettings');
    const settingsSnapshot = await get(settingsRef);
    
    let analyticsSettings = {
      globalLowStockThreshold: 5,
      globalHighStockThreshold: 50,
      globalFastMovingDefinition: 10
    };
    
    if (settingsSnapshot.exists()) {
      analyticsSettings = { ...analyticsSettings, ...settingsSnapshot.val() };
    }
    
    globalLowInput.value = analyticsSettings.globalLowStockThreshold;
    globalHighInput.value = analyticsSettings.globalHighStockThreshold;
    globalFastInput.value = analyticsSettings.globalFastMovingDefinition;

    // Load all catalog names for per-item overrides
    const catalogsRef = ref(db, 'Catalogs/');
    const snapshot = await get(catalogsRef);
    const catalogs = snapshot.exists() ? snapshot.val() : {};
    
    const catalogNames = [...new Set(Object.values(catalogs).map(cat => cat.CatalogName))].sort();
    const container = document.getElementById('perItemOverridesContainer');
    if (!container) return; // Element doesn't exist
    
    container.innerHTML = '';
    
    catalogNames.forEach(catalogName => {
      const override = (analyticsSettings.perItemOverrides && analyticsSettings.perItemOverrides[catalogName]) || {};
      const div = document.createElement('div');
      div.style.cssText = 'padding:12px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;';
      div.innerHTML = `
        <div style="font-weight:600;margin-bottom:8px;">${catalogName}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <input type="number" class="form-control item-low-input" data-catalog="${catalogName}" placeholder="低在庫 (override)" value="${override.lowStock ?? ''}" style="font-size:0.9rem;">
          <input type="number" class="form-control item-high-input" data-catalog="${catalogName}" placeholder="高在庫 (override)" value="${override.highStock ?? ''}" style="font-size:0.9rem;">
        </div>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading analytics settings UI:', error);
  }
}

async function saveGlobalAnalyticsSettings() {
  const lowVal = Number(document.getElementById('globalLowStockInput').value);
  const highVal = Number(document.getElementById('globalHighStockInput').value);
  const fastVal = Number(document.getElementById('globalFastMovingInput').value);
  
  try {
    await set(ref(db, 'Settings/Analytics/'), {
      globalLowStockThreshold: lowVal,
      globalHighStockThreshold: highVal,
      globalFastMovingDefinition: fastVal,
      perItemOverrides: analyticsSettings.perItemOverrides || {},
      updatedAt: new Date().toISOString()
    });
    
    analyticsSettings.globalLowStockThreshold = lowVal;
    analyticsSettings.globalHighStockThreshold = highVal;
    analyticsSettings.globalFastMovingDefinition = fastVal;
    
    alert('グローバル設定を保存しました');
    window.analyticsSettingsUpdated = true;
  } catch (error) {
    alert('エラー: ' + error.message);
  }
}

async function savePerItemAnalyticsSettings() {
  const overrides = {};
  
  document.querySelectorAll('[data-catalog]').forEach(input => {
    const catalog = input.getAttribute('data-catalog');
    if (!overrides[catalog]) overrides[catalog] = {};
  });
  
  document.querySelectorAll('.item-low-input').forEach(input => {
    const catalog = input.getAttribute('data-catalog');
    const value = input.value ? Number(input.value) : null;
    if (!overrides[catalog]) overrides[catalog] = {};
    overrides[catalog].lowStock = value;
  });
  
  document.querySelectorAll('.item-high-input').forEach(input => {
    const catalog = input.getAttribute('data-catalog');
    const value = input.value ? Number(input.value) : null;
    if (!overrides[catalog]) overrides[catalog] = {};
    overrides[catalog].highStock = value;
  });
  
  try {
    await set(ref(db, 'Settings/Analytics/'), {
      globalLowStockThreshold: analyticsSettings.globalLowStockThreshold,
      globalHighStockThreshold: analyticsSettings.globalHighStockThreshold,
      globalFastMovingDefinition: analyticsSettings.globalFastMovingDefinition,
      perItemOverrides: overrides,
      updatedAt: new Date().toISOString()
    });
    
    analyticsSettings.perItemOverrides = overrides;
    alert('個別設定を保存しました');
    window.analyticsSettingsUpdated = true;
  } catch (error) {
    alert('エラー: ' + error.message);
  }
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

// ===== CATALOG NAMES MANAGEMENT =====

function renderCatalogNamesFromData(container, names) {
  if (!container) return;

  container.innerHTML = '';

  const nameList = Object.entries(names)
    .filter(([k, v]) => v && typeof v === 'string' && v.trim().length > 0)
    .map(([k, v]) => ({ key: k, name: String(v).trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (nameList.length === 0) {
    container.innerHTML = '<p style="color:#999;">カタログ名がありません</p>';
    return;
  }

  nameList.forEach(({ key, name }) => {
    const div = document.createElement('div');
    div.style.cssText = `padding:10px 12px;background:#f0f9ff;border:1px solid #bfdbfe;border-radius:6px;display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;`;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = String(name);
    nameSpan.style.cssText = 'flex:1;color:#1e293b;font-size:14px;font-weight:500;';

    const editBtn = document.createElement('button');
    editBtn.textContent = '編集';
    editBtn.style.cssText = 'padding:4px 10px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;';
    editBtn.addEventListener('click', () => handleEditCatalogName(key, name, container));

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '削除';
    deleteBtn.style.cssText = 'padding:4px 10px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;';
    deleteBtn.addEventListener('click', () => handleDeleteCatalogName(key, name, container));

    div.appendChild(nameSpan);
    div.appendChild(editBtn);
    div.appendChild(deleteBtn);
    container.appendChild(div);
  });
}

async function loadAndDisplayCatalogNames(container) {
  if (!container) return;

  try {
    const snapshot = await get(ref(db, 'CatalogNames'));
    const names = snapshot.exists() ? snapshot.val() : {};
    renderCatalogNamesFromData(container, names);
  } catch (error) {
    console.error('Error loading catalog names:', error);
    container.innerHTML = '<p style="color:#c33;">エラーが発生しました</p>';
  }
}

function setupCatalogNamesListener(container) {
  if (!container) return;

  const catalogNamesRef = ref(db, 'CatalogNames');
  onValue(catalogNamesRef, (snapshot) => {
    const names = snapshot.exists() ? snapshot.val() : {};
    renderCatalogNamesFromData(container, names);
  }, (error) => {
    console.error('Error listening to catalog names:', error);
  });
}

async function handleAddCatalogName(input, container) {
  const catalogName = input.value.trim();
  
  if (!catalogName) {
    showNotification('カタログ名を入力してください', 'error');
    return;
  }
  
  try {
    console.log('[ADD CATALOG] Starting add:', catalogName);
    
    // Check if name already exists
    const snapshot = await get(ref(db, 'CatalogNames'));
    const names = snapshot.exists() ? snapshot.val() : {};
    console.log('[ADD CATALOG] Existing names:', names);
    
    if (Object.values(names).some(v => v === catalogName)) {
      console.warn('[ADD CATALOG] Name already exists');
      showNotification('このカタログ名は既に存在します', 'error');
      return;
    }
    
    // Add new catalog name
    const newKey = `name_${Date.now()}`;
    console.log('[ADD CATALOG] Writing to Firebase:', newKey, '=', catalogName);
    await set(ref(db, `CatalogNames/${newKey}`), catalogName);
    console.log('[ADD CATALOG] Successfully written to Firebase');
    
    input.value = '';
    await loadAndDisplayCatalogNames(container);
    showNotification('カタログ名を追加しました ✓', 'success');
    
    // Trigger real-time update in place order page
    if (window.renderPlaceOrderProductGrid) {
      window.renderPlaceOrderProductGrid();
    }
  } catch (error) {
    console.error('[ADD CATALOG] ERROR:', error);
    console.error('[ADD CATALOG] Error code:', error.code);
    console.error('[ADD CATALOG] Error message:', error.message);
    showNotification('保存エラー: ' + error.message, 'error');
  }
}

async function handleEditCatalogName(key, oldName, container) {
  const newName = prompt('新しいカタログ名を入力:', oldName);
  
  if (newName === null || newName.trim() === '') {
    return;
  }
  
  const trimmedName = newName.trim();
  if (trimmedName === oldName) {
    return;
  }
  
  try {
    console.log('[EDIT CATALOG] Starting edit:', oldName, '->', trimmedName);
    
    // Check if new name already exists
    const snapshot = await get(ref(db, 'CatalogNames'));
    const names = snapshot.exists() ? snapshot.val() : {};
    
    if (Object.values(names).some((v, idx) => v === trimmedName)) {
      console.warn('[EDIT CATALOG] New name already exists');
      showNotification('このカタログ名は既に存在します', 'error');
      return;
    }
    
    // Update catalog name
    console.log('[EDIT CATALOG] Writing to Firebase:', key, '=', trimmedName);
    await set(ref(db, `CatalogNames/${key}`), trimmedName);
    console.log('[EDIT CATALOG] Successfully updated CatalogNames');
    
    // Update all catalog entries with the old name (if any exist)
    const catalogsRef = ref(db, 'Catalogs');
    const catalogSnapshot = await get(catalogsRef);
    if (catalogSnapshot.exists()) {
      const catalogData = catalogSnapshot.val();
      const updateBatch = {};
      
      Object.entries(catalogData).forEach(([entryKey, entry]) => {
        if (entry && entry.CatalogName === oldName) {
          updateBatch[entryKey] = { ...entry, CatalogName: trimmedName };
        }
      });
      
      if (Object.keys(updateBatch).length > 0) {
        console.log('[EDIT CATALOG] Updating', Object.keys(updateBatch).length, 'catalog entries');
        // Update in batches to avoid Firebase size limits
        const entries = Object.entries(updateBatch);
        for (let i = 0; i < entries.length; i += 500) {
          const batch = Object.fromEntries(entries.slice(i, i + 500));
          await update(catalogsRef, batch);
        }
        console.log('[EDIT CATALOG] Catalog entries updated');
      }
    }
    
    await loadAndDisplayCatalogNames(container);
    showNotification('カタログ名を更新しました ✓', 'success');
    
    // Trigger real-time update in place order page
    if (window.renderPlaceOrderProductGrid) {
      window.renderPlaceOrderProductGrid();
    }
  } catch (error) {
    console.error('[EDIT CATALOG] ERROR:', error);
    console.error('[EDIT CATALOG] Error code:', error.code);
    console.error('[EDIT CATALOG] Error message:', error.message);
    showNotification('編集エラー: ' + error.message, 'error');
  }
}

async function handleDeleteCatalogName(key, name, container) {
  if (!confirm(`「${name}」を削除してもよろしいですか？このカタログに関連するすべてのエントリも削除されます。`)) {
    return;
  }
  
  try {
    console.log('[DELETE CATALOG] Starting delete:', name);
    
    // Delete from CatalogNames
    console.log('[DELETE CATALOG] Deleting from CatalogNames:', key);
    await set(ref(db, `CatalogNames/${key}`), null);
    console.log('[DELETE CATALOG] Deleted from CatalogNames');
    
    // Delete all catalog entries with this name
    const catalogsRef = ref(db, 'Catalogs');
    const catalogSnapshot = await get(catalogsRef);
    if (catalogSnapshot.exists()) {
      const catalogData = catalogSnapshot.val();
      const entriesToDelete = [];
      
      Object.entries(catalogData).forEach(([entryKey, entry]) => {
        if (entry && entry.CatalogName === name) {
          entriesToDelete.push(entryKey);
        }
      });
      
      console.log('[DELETE CATALOG] Found', entriesToDelete.length, 'entries to delete');
      // Delete entries in batches
      for (const entryKey of entriesToDelete) {
        await set(ref(db, `Catalogs/${entryKey}`), null);
      }
      console.log('[DELETE CATALOG] Deleted all related entries');
    }
    
    // Delete image if exists
    try {
      console.log('[DELETE CATALOG] Attempting to delete image:', key);
      await set(ref(db, `CatalogImages/${key}`), null);
    } catch (e) {
      console.log('[DELETE CATALOG] Image delete skipped (not critical)');
    }
    
    await loadAndDisplayCatalogNames(container);
    showNotification('カタログを削除しました ✓', 'success');
    
    // Trigger real-time update in place order page
    if (window.renderPlaceOrderProductGrid) {
      window.renderPlaceOrderProductGrid();
    }
  } catch (error) {
    console.error('[DELETE CATALOG] ERROR:', error);
    console.error('[DELETE CATALOG] Error code:', error.code);
    console.error('[DELETE CATALOG] Error message:', error.message);
    showNotification('削除エラー: ' + error.message, 'error');
  }
}

// ===== CATALOG IMAGE MANAGEMENT =====
async function loadCatalogImageSettings() {
  const container = document.getElementById('catalogImageSettingsContainer');
  if (!container) return;
  
  try {
    const snapshot = await get(ref(db, 'CatalogNames'));
    if (!snapshot.exists()) {
      container.innerHTML = '<p style="color:#999;">カタログアイテムがまだありません</p>';
      return;
    }
    
    // Load catalog images from separate CatalogImages node
    const imagesSnapshot = await get(ref(db, 'CatalogImages'));
    const images = imagesSnapshot.exists() ? imagesSnapshot.val() : {};
    
    const items = snapshot.val();
    let html = '';
    
    Object.entries(items).forEach(([key, item]) => {
      if (!item) return;
      
      const catalogName = item; // CatalogNames are just strings
      const imageUrl = images[key] || ''; // Get image from CatalogImages
      const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      html += `
        <div style="background:#f9f9f9; padding:12px; border-radius:6px; border:1px solid #eee;">
          <label style="font-weight:600; display:block; margin-bottom:8px; font-size:0.95rem;">${catalogName}</label>
          <input type="text" id="img_${safeKey}" class="form-control" placeholder="画像URL（例：https://example.com/image.jpg）" value="${imageUrl}" style="margin-bottom:8px;">
          <small style="color:#999;">外部URLを入力してください。jpg, png, gifなどをサポート</small>
        </div>
      `;
    });
    
    container.innerHTML = html;
  } catch (error) {
    console.error('Error loading catalog image settings:', error);
    container.innerHTML = '<p style="color:#d9534f;">設定の読み込みに失敗しました</p>';
  }
}

async function saveCatalogImages() {
  console.log('=== saveCatalogImages CALLED ===');
  const saveBtn = document.getElementById('saveCatalogImagesBtn');
  
  if (!saveBtn) {
    console.log('Save button not found!');
    return;
  }
  
  try {
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';
    
    const snapshot = await get(ref(db, 'CatalogNames'));
    if (!snapshot.exists()) {
      console.log('No CatalogNames in Firebase');
      return;
    }
    
    const items = snapshot.val();
    const catalogImages = {}; // Separate storage for images
    let updateCount = 0;
    
    Object.entries(items).forEach(([key, item]) => {
      if (!item) return;
      
      const catalogName = typeof item === 'string' ? item : item; // CatalogNames are strings
      const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      const input = document.getElementById(`img_${safeKey}`);
      
      console.log(`Checking input: img_${safeKey}`, input ? 'FOUND' : 'NOT FOUND');
      
      if (input) {
        let imageUrl = input.value.trim();
        console.log(`Input value for ${catalogName}:`, imageUrl);
        
        if (imageUrl) {
          // Extract URL from HTML or plain URL
          imageUrl = extractImageUrl(imageUrl);
          console.log(`After extraction (${catalogName}):`, imageUrl);
          // Store images in separate CatalogImages node
          catalogImages[key] = imageUrl;
          updateCount++;
        }
      }
    });
    
    console.log(`Total updates: ${updateCount}`, catalogImages);
    
    if (updateCount === 0) {
      showNotification('画像URLを入力してください', 'warning');
      saveBtn.disabled = false;
      saveBtn.textContent = '画像設定を保存';
      return;
    }
    
    console.log('Sending update to Firebase at /CatalogImages/...');
    await set(ref(db, 'CatalogImages'), catalogImages);
    console.log('Firebase update successful!');
    showNotification('画像設定を保存しました', 'success');
    
  } catch (error) {
    console.error('Error saving catalog images:', error);
    showNotification('保存に失敗しました: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '画像設定を保存';
  }
}

// Auto-init when this module is loaded (if admin tab exists)
document.addEventListener('DOMContentLoaded', () => {
  const adminTab = document.getElementById('tab-adminPanel');
  if (adminTab) {
    initAdminPanel();
    
    // Add image management button handlers
    const saveImagesBtn = document.getElementById('saveCatalogImagesBtn');
    if (saveImagesBtn) {
      saveImagesBtn.addEventListener('click', saveCatalogImages);
    }
    
    // Load image settings when admin settings tab is shown
    const adminTabSettings = document.getElementById('adminTabSettings');
    if (adminTabSettings) {
      adminTabSettings.addEventListener('click', loadCatalogImageSettings);
      // Also load on first visit
      loadCatalogImageSettings();
    }
  }
});
