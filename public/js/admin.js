/**
 * Reel Save Admin Portal Client Logic - IndraNex-Technologies
 * Developed by Ayush Kumar Chaurasiya
 * Handles VIP Key generation, live telemetry stream, platform toggles, and security limits.
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');
  const userDisplay = document.getElementById('userDisplay');
  const roleBadge = document.getElementById('roleBadge');

  const navButtons = document.querySelectorAll('.admin-nav-item button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // VIP Key Generator Elements
  const generateVipKeyBtn = document.getElementById('generateVipKeyBtn');
  const vipUserHandle = document.getElementById('vipUserHandle');
  const generatedKeyBox = document.getElementById('generatedKeyBox');
  const displayVipKey = document.getElementById('displayVipKey');

  let adminToken = localStorage.getItem('reelsave_admin_token');

  // Check initial login state
  if (adminToken) {
    try {
      const payload = JSON.parse(atob(adminToken));
      if (payload.expiresAt > Date.now()) {
        loginModal.style.display = 'none';
        userDisplay.textContent = payload.username || 'Ayush Kumar';
        roleBadge.textContent = payload.role || 'Super Admin';
        loadDashboard();
        loadSettings();
      } else {
        doLogout();
      }
    } catch (e) {
      doLogout();
    }
  }

  // Handle Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';

    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value;

    try {
      const res = await fetch('/api/v1/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication rejected');
      }

      localStorage.setItem('reelsave_admin_token', data.data.token);
      adminToken = data.data.token;
      userDisplay.textContent = data.data.username || 'Ayush Kumar';
      roleBadge.textContent = data.data.role || 'Super Admin';
      loginModal.style.display = 'none';

      loadDashboard();
      loadSettings();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.style.display = 'block';
    }
  });

  // Handle Logout
  logoutBtn.addEventListener('click', () => {
    doLogout();
  });

  function doLogout() {
    localStorage.removeItem('reelsave_admin_token');
    adminToken = null;
    loginModal.style.display = 'flex';
  }

  // Tab Switching
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      const targetPane = document.getElementById(`tab-${btn.dataset.tab}`);
      if (targetPane) {
        targetPane.style.display = 'block';
      }
    });
  });

  // VIP Key Generator Handler
  if (generateVipKeyBtn) {
    generateVipKeyBtn.addEventListener('click', () => {
      const handle = (vipUserHandle.value || 'USER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const generatedKey = `VIP-${handle ? handle.slice(0, 4) : 'PRO'}-${randomSuffix}`;
      
      displayVipKey.value = generatedKey;
      generatedKeyBox.style.display = 'block';
    });
  }

  // Load Dashboard Data
  async function loadDashboard() {
    if (!adminToken) return;

    try {
      const res = await fetch('/api/v1/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (res.status === 401) {
        doLogout();
        return;
      }

      const data = await res.json();
      if (data.success) {
        document.getElementById('statRequests').textContent = data.data.stats.totalRequests.toLocaleString();
        document.getElementById('statSuccess').textContent = data.data.stats.successRate;
        document.getElementById('statLatency').textContent = `${data.data.stats.avgLatencyMs} ms`;
        document.getElementById('statBlocked').textContent = data.data.stats.activeBlockedIps;

        renderTable(data.data.recentRequests);
      }
    } catch (e) {
      console.warn('Dashboard load error:', e.message);
    }
  }

  function renderTable(requests) {
    const tbody = document.getElementById('requestTableBody');
    if (!requests || requests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No recorded extraction events yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = requests.map(r => `
      <tr>
        <td>${new Date(r.timestamp).toLocaleTimeString()}</td>
        <td><span class="media-badge">${r.platform || 'General'}</span></td>
        <td><span class="${r.status === 'success' ? 'badge-success' : 'badge-fail'}">${(r.status || 'OK').toUpperCase()}</span></td>
        <td><code>${r.ipHash || 'anon'}</code></td>
        <td>${r.executionTimeMs || 0}ms</td>
      </tr>
    `).join('');
  }

  // Load Settings
  async function loadSettings() {
    if (!adminToken) return;

    try {
      const res = await fetch('/api/v1/admin/settings', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      const data = await res.json();
      if (data.success && data.data) {
        const s = data.data;
        document.getElementById('toggleInstagram').checked = s.instagramEnabled !== false;
        document.getElementById('toggleFacebook').checked = s.facebookEnabled !== false;
        document.getElementById('toggleMaintenance').checked = Boolean(s.maintenanceMode);
        document.getElementById('toggleAdsense').checked = s.adsenseEnabled !== false;
        document.getElementById('adsensePubId').value = s.adsensePublisherId || '';
        document.getElementById('adsenseSlotTop').value = s.adsenseSlotTop || '';
        document.getElementById('rateLimitPerMin').value = s.rateLimitPerMin || 30;
      }
    } catch (e) {
      console.warn('Settings load error:', e.message);
    }
  }

  // Save Settings Handlers
  async function saveSettings(payload) {
    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save: ' + (data.error || 'Server error'));
      }
    } catch (e) {
      alert('Error saving settings: ' + e.message);
    }
  }

  document.getElementById('savePlatformSettings').addEventListener('click', () => {
    saveSettings({
      instagramEnabled: document.getElementById('toggleInstagram').checked,
      facebookEnabled: document.getElementById('toggleFacebook').checked,
      maintenanceMode: document.getElementById('toggleMaintenance').checked
    });
  });

  document.getElementById('saveAdSettings').addEventListener('click', () => {
    saveSettings({
      adsenseEnabled: document.getElementById('toggleAdsense').checked,
      adsensePublisherId: document.getElementById('adsensePubId').value.trim(),
      adsenseSlotTop: document.getElementById('adsenseSlotTop').value.trim()
    });
  });

  document.getElementById('saveSecuritySettings').addEventListener('click', () => {
    saveSettings({
      rateLimitPerMin: parseInt(document.getElementById('rateLimitPerMin').value, 10) || 30
    });
  });
});
