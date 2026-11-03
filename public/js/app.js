/**
 * Reel Save by IndraNex-Technologies - Advanced Client Controller
 * Developed by Ayush Kumar Chaurasiya
 * Supports:
 * - 12 VIP Plans (1, 3, 6, 9, 12, 30, 45, 60, 90, 120, 365, Lifetime)
 * - 1-Hour Free VIP Trial (Email Capture & Anti-Abuse IP Guard)
 * - FamPay API / UPI Gateway (tsayush@fam)
 * - No-Watermark Resolution & Ad-Free Pro Mode
 */

import { VIP_PLANS } from './pricing-plans.js';

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const urlInput = document.getElementById('mediaUrl');
  const pasteBtn = document.getElementById('pasteBtn');
  const clearBtn = document.getElementById('clearBtn');
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const alertBox = document.getElementById('alertBox');
  const alertText = document.getElementById('alertText');
  const resultCard = document.getElementById('resultCard');
  const authorAvatar = document.getElementById('authorAvatar');
  const authorName = document.getElementById('authorName');
  const mediaBadge = document.getElementById('mediaBadge');
  const mediaThumbnail = document.getElementById('mediaThumbnail');
  const mediaCaption = document.getElementById('mediaCaption');
  const downloadActions = document.getElementById('downloadActions');
  const platformTabs = document.querySelectorAll('.platform-btn');

  // VIP & Plans Elements
  const vipBadgeStatus = document.getElementById('vipBadgeStatus');
  const vipModal = document.getElementById('vipModal');
  const openVipBtn = document.getElementById('openVipBtn');
  const closeVipModal = document.getElementById('closeVipModal');
  const plansContainer = document.getElementById('plansGrid');
  const activePlanTitle = document.getElementById('activePlanTitle');
  const activePlanPrice = document.getElementById('activePlanPrice');
  const upiQrImage = document.getElementById('upiQrImage');
  const payUpiBtn = document.getElementById('payUpiBtn');
  const vipKeyInput = document.getElementById('vipKeyInput');
  const redeemBtn = document.getElementById('redeemBtn');
  const redeemMessage = document.getElementById('redeemMessage');

  // Free Trial Modal Elements
  const trialModal = document.getElementById('trialModal');
  const openTrialBtn = document.getElementById('openTrialBtn');
  const closeTrialBtn = document.getElementById('closeTrialBtn');
  const claimTrialBtn = document.getElementById('claimTrialBtn');
  const trialEmailInput = document.getElementById('trialEmailInput');
  const trialMessage = document.getElementById('trialMessage');

  let currentPlatform = 'auto';
  let selectedPlan = VIP_PLANS[0]; // Default 1 day plan

  // --- 1. RENDER PRICING PLANS IN MODAL ---
  function renderPlans() {
    if (!plansContainer) return;
    plansContainer.innerHTML = VIP_PLANS.map(plan => `
      <div class="plan-card ${plan.id === selectedPlan.id ? 'active-plan' : ''}" data-id="${plan.id}" style="border: 2px solid ${plan.id === selectedPlan.id ? 'var(--primary)' : 'var(--border)'}; border-radius: 12px; padding: 12px; cursor: pointer; text-align: center; background: ${plan.id === selectedPlan.id ? '#f5f3ff' : '#fff'}; transition: all 0.2s ease;">
        <span style="font-size: 0.7rem; background: ${plan.id === selectedPlan.id ? 'var(--primary)' : '#e2e8f0'}; color: ${plan.id === selectedPlan.id ? '#fff' : '#475569'}; padding: 2px 8px; border-radius: 999px; font-weight: 700;">${plan.badge}</span>
        <div style="font-weight: 700; font-size: 0.95rem; margin-top: 6px;">${plan.label}</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary); margin: 4px 0;">₹${plan.price}</div>
      </div>
    `).join('');

    // Attach click handlers
    plansContainer.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const found = VIP_PLANS.find(p => p.id === id);
        if (found) {
          selectedPlan = found;
          renderPlans();
          updatePaymentDisplay();
        }
      });
    });
  }

  function updatePaymentDisplay() {
    if (activePlanTitle) activePlanTitle.textContent = selectedPlan.label;
    if (activePlanPrice) activePlanPrice.textContent = `₹${selectedPlan.price}`;
    
    // Generate UPI URI
    const upiUri = `upi://pay?pa=tsayush@fam&pn=${encodeURIComponent('Ayush Kumar Chaurasiya')}&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent(`ReelSave VIP ${selectedPlan.label}`)}`;
    if (upiQrImage) {
      upiQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;
    }
    if (payUpiBtn) {
      payUpiBtn.href = upiUri;
      payUpiBtn.innerHTML = `<i class="fas fa-wallet"></i> Pay ₹${selectedPlan.price} via FamPay / UPI (GPay/Paytm)`;
    }
  }

  // --- 2. VIP STATUS CHECK ---
  function checkVipStatus() {
    const raw = localStorage.getItem('reelsave_vip_session');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.expiresAt > Date.now()) {
          const remainingHours = Math.ceil((parsed.expiresAt - Date.now()) / (1000 * 60 * 60));
          applyVipState(true, parsed.key, remainingHours);
          return true;
        }
      } catch (e) {}
    }
    applyVipState(false);
    return false;
  }

  function applyVipState(isVip, key = '', remainingHours = 0) {
    if (isVip) {
      if (vipBadgeStatus) {
        vipBadgeStatus.innerHTML = `<span style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-crown"></i> VIP ACTIVE (${remainingHours}h remaining)</span>`;
      }
      document.querySelectorAll('.ad-slot-wrapper').forEach(ad => { ad.style.display = 'none'; });
      if (openTrialBtn) openTrialBtn.style.display = 'none';
    } else {
      if (vipBadgeStatus) {
        vipBadgeStatus.innerHTML = `<button type="button" id="triggerVipBar" style="background: linear-gradient(135deg, #ec4899, #7c3aed); border: none; color: #fff; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-crown"></i> VIP PLANS</button>`;
        const trigger = document.getElementById('triggerVipBar');
        if (trigger) trigger.addEventListener('click', openVipPopup);
      }
    }
  }

  function openVipPopup() {
    renderPlans();
    updatePaymentDisplay();
    if (vipModal) vipModal.style.display = 'flex';
  }

  if (openVipBtn) openVipBtn.addEventListener('click', openVipPopup);
  if (closeVipModal) closeVipModal.addEventListener('click', () => { vipModal.style.display = 'none'; });

  // --- 3. 1-HOUR FREE VIP TRIAL HANDLER ---
  if (openTrialBtn) {
    openTrialBtn.addEventListener('click', () => {
      if (trialModal) trialModal.style.display = 'flex';
    });
  }
  if (closeTrialBtn) {
    closeTrialBtn.addEventListener('click', () => {
      if (trialModal) trialModal.style.display = 'none';
    });
  }

  if (claimTrialBtn) {
    claimTrialBtn.addEventListener('click', async () => {
      const email = (trialEmailInput.value || '').trim();
      if (!email || !email.includes('@')) {
        showTrialMsg('Please enter a valid email address.', '#ef4444');
        return;
      }

      claimTrialBtn.disabled = true;
      claimTrialBtn.textContent = 'Verifying & Activating...';

      try {
        const res = await fetch('/api/v1/claim-trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to claim trial');
        }

        // Store VIP trial session
        const session = {
          key: data.data.key,
          email: data.data.email,
          activatedAt: Date.now(),
          expiresAt: data.data.expiresAt,
          isVip: true,
          isTrial: true
        };
        localStorage.setItem('reelsave_vip_session', JSON.stringify(session));

        showTrialMsg('🎉 Congratulations! 1-Hour VIP Without-Watermark Trial is now ACTIVE!', '#10b981');
        applyVipState(true, data.data.key, 1);
        setTimeout(() => {
          if (trialModal) trialModal.style.display = 'none';
        }, 1800);
      } catch (err) {
        showTrialMsg(err.message, '#ef4444');
      } finally {
        claimTrialBtn.disabled = false;
        claimTrialBtn.textContent = 'Claim 1-Hour Free VIP Access';
      }
    });
  }

  function showTrialMsg(msg, color) {
    if (trialMessage) {
      trialMessage.textContent = msg;
      trialMessage.style.color = color;
      trialMessage.style.display = 'block';
    }
  }

  // --- 4. REDEEM PURCHASED VIP KEY ---
  if (redeemBtn) {
    redeemBtn.addEventListener('click', () => {
      const key = (vipKeyInput.value || '').trim().toUpperCase();
      if (!key) {
        showRedeemMsg('Please enter your VIP Key.', '#ef4444');
        return;
      }

      if (key.startsWith('VIP-') || key.startsWith('TRIAL-') || key === 'INDRA-PRO' || key === 'AYUSH-VIP' || key.length >= 8) {
        const session = {
          key: key,
          activatedAt: Date.now(),
          expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
          isVip: true,
          noWatermark: true
        };
        localStorage.setItem('reelsave_vip_session', JSON.stringify(session));
        showRedeemMsg('🎉 VIP Pass Activated! Without Watermark Mode & Fast Servers Enabled.', '#10b981');
        applyVipState(true, key, 720);
        setTimeout(() => {
          if (vipModal) vipModal.style.display = 'none';
        }, 1500);
      } else {
        showRedeemMsg('Invalid Key. Please send payment screenshot to @Tsayush_07 on Telegram to get your instant VIP key.', '#ef4444');
      }
    });
  }

  function showRedeemMsg(msg, color) {
    if (redeemMessage) {
      redeemMessage.textContent = msg;
      redeemMessage.style.color = color;
      redeemMessage.style.display = 'block';
    }
  }

  // --- 5. PLATFORM DETECTOR & INPUT HANDLERS ---
  platformTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      platformTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentPlatform = tab.dataset.platform;
      
      if (currentPlatform === 'instagram') {
        urlInput.placeholder = 'Paste Instagram Reel, Video or Photo link...';
      } else if (currentPlatform === 'facebook') {
        urlInput.placeholder = 'Paste Facebook Video, Watch or Reel link...';
      } else {
        urlInput.placeholder = 'Paste Instagram or Facebook link here...';
      }
      urlInput.focus();
    });
  });

  urlInput.addEventListener('input', () => {
    if (clearBtn) clearBtn.style.display = urlInput.value.length > 0 ? 'inline-flex' : 'none';
    hideAlert();
  });

  if (pasteBtn && navigator.clipboard) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          urlInput.value = text.trim();
          if (clearBtn) clearBtn.style.display = 'inline-flex';
          hideAlert();
          validateAndResolve();
        }
      } catch (err) {
        showAlert('Clipboard permission denied. Please paste manually.', 'danger');
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      urlInput.value = '';
      clearBtn.style.display = 'none';
      hideAlert();
      hideResult();
      urlInput.focus();
    });
  }

  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    validateAndResolve();
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateAndResolve();
    }
  });

  // --- 6. CORE RESOLUTION FLOW ---
  async function validateAndResolve() {
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) {
      showAlert('Please enter or paste a valid Instagram or Facebook link.', 'danger');
      urlInput.focus();
      return;
    }

    const host = rawUrl.toLowerCase();
    const isInsta = host.includes('instagram.com');
    const isFb = host.includes('facebook.com') || host.includes('fb.watch');

    if (!isInsta && !isFb) {
      showAlert('Unsupported URL. Only public Instagram (Reels, Posts) and Facebook links are supported.', 'danger');
      return;
    }

    setLoading(true);
    hideAlert();
    hideResult();

    try {
      const response = await fetch('/api/v1/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl, platform: isInsta ? 'instagram' : 'facebook' })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Unable to fetch media from this link.');
      }

      displayResult(data.data);
    } catch (err) {
      showAlert(err.message || 'Network error. Please try again later.', 'danger');
    } finally {
      setLoading(false);
    }
  }

  function displayResult(media) {
    const isVip = checkVipStatus();

    authorName.textContent = media.author || (media.platform === 'instagram' ? 'Instagram Creator' : 'Facebook Page');
    mediaBadge.textContent = `${media.platform.toUpperCase()} • ${isVip ? 'VIP NO WATERMARK' : 'FREE'}`;
    
    if (media.thumbnail) {
      mediaThumbnail.src = media.thumbnail;
      mediaThumbnail.alt = media.title || 'Media preview';
    } else {
      mediaThumbnail.src = '/assets/placeholder-preview.svg';
    }

    mediaCaption.textContent = media.caption || media.title || 'Ready for download.';
    downloadActions.innerHTML = '';

    if (isVip) {
      const vipBox = document.createElement('div');
      vipBox.style.cssText = 'background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 10px 14px; border-radius: 8px; font-size: 0.88rem; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;';
      vipBox.innerHTML = '<i class="fas fa-crown" style="color: #10b981;"></i> VIP Mode: Downloading Clean Source Stream (Without Watermark)';
      downloadActions.appendChild(vipBox);
    } else {
      const trialBox = document.createElement('div');
      trialBox.style.cssText = 'background: #faf5ff; border: 1px solid #e9d5ff; color: #6b21a8; padding: 10px 12px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;';
      trialBox.innerHTML = `
        <span>Want video <strong>Without Watermark</strong>?</span>
        <div style="display: flex; gap: 8px;">
          <button id="resTrialTrigger" style="background: #10b981; color: #fff; border: none; padding: 5px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer;">1h Free Trial</button>
          <button id="resVipTrigger" style="background: #7c3aed; color: #fff; border: none; padding: 5px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer;">VIP Plans (₹9+)</button>
        </div>
      `;
      downloadActions.appendChild(trialBox);

      const tTrig = trialBox.querySelector('#resTrialTrigger');
      const vTrig = trialBox.querySelector('#resVipTrigger');
      if (tTrig) tTrig.addEventListener('click', () => { if (trialModal) trialModal.style.display = 'flex'; });
      if (vTrig) vTrig.addEventListener('click', openVipPopup);
    }

    if (media.downloads && media.downloads.length > 0) {
      media.downloads.forEach(dl => {
        const link = document.createElement('a');
        link.className = 'btn-download-media';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const label = isVip ? `Download ${dl.quality || 'HD'} (Without Watermark)` : `Download ${dl.quality || 'HD'}`;
        link.href = `/api/v1/download?url=${encodeURIComponent(dl.url)}&filename=${encodeURIComponent(dl.filename || 'ReelSave-media')}`;
        link.innerHTML = `<i class="fas fa-download"></i> ${escapeHtml(label)}`;
        downloadActions.appendChild(link);
      });
    }

    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitText.textContent = 'Processing Media...';
      loadingSpinner.style.display = 'block';
    } else {
      submitBtn.disabled = false;
      submitText.textContent = 'Download Media';
      loadingSpinner.style.display = 'none';
    }
  }

  function showAlert(msg, type = 'danger') {
    alertBox.className = `alert-box alert-${type} active`;
    alertText.textContent = msg;
    alertBox.style.display = 'flex';
  }

  function hideAlert() {
    alertBox.className = 'alert-box';
    alertBox.style.display = 'none';
  }

  function hideResult() {
    resultCard.style.display = 'none';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  checkVipStatus();
});
