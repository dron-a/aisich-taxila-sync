// content.js
// Safe for public distribution - No sensitive phone numbers included
const DUMMY_FALLBACK_NUMBER = ""; 

// Remove active modal
function removeSyncModal() {
  const existing = document.getElementById('taxila-sync-modal-overlay');
  if (existing) existing.remove();
}

// Helper to retrieve saved bot number (Dual-layer: Chrome sync + localStorage fallback)
async function getStoredBotNumber() {
  // 1. Try Chrome Storage API (if permission granted in manifest)
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    try {
      const data = await chrome.storage.sync.get(["aisich_bot_number"]);
      if (data && data.aisich_bot_number) return data.aisich_bot_number;
    } catch (e) {}
  }

  // 2. Fail-safe: Use browser localStorage (works natively with ZERO manifest permissions)
  try {
    const localVal = localStorage.getItem("aisich_bot_number");
    if (localVal) return localVal;
  } catch (e) {}

  return DUMMY_FALLBACK_NUMBER;
}

// Helper to persist bot number
async function setStoredBotNumber(rawNumber) {
  const cleanNumber = rawNumber.replace(/\D/g, ""); // Strip +, spaces, dashes

  // 1. Save to Chrome Storage API (if available)
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    try {
      await chrome.storage.sync.set({ aisich_bot_number: cleanNumber });
    } catch (e) {}
  }

  // 2. Fail-safe: Always save to domain localStorage
  try {
    localStorage.setItem("aisich_bot_number", cleanNumber);
  } catch (e) {}

  return cleanNumber;
}

// Base Overlay Builder
function createBaseModal() {
  removeSyncModal();

  const overlay = document.createElement('div');
  overlay.id = 'taxila-sync-modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.72); z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
  `;

  const card = document.createElement('div');
  card.id = 'taxila-sync-card';
  card.style.cssText = `
    background: #111827; color: #ffffff; padding: 24px;
    border-radius: 14px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    max-width: 380px; max-height: 92vh; overflow-y: auto; width: 92%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    text-align: center; border: 1px solid #374151; position: relative;
    box-sizing: border-box;
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.onclick = (e) => { if (e.target === overlay) removeSyncModal(); };
  return { overlay, card };
}

// View 1: Prompt user for Bot Phone Number
function showConfigPrompt(token, userid, isEditing = false) {
  const { card } = createBaseModal();

  card.innerHTML = `
    <button id="taxila-x-btn" style="position:absolute; top:12px; right:14px; background:transparent; border:none; color:#9ca3af; font-size:18px; cursor:pointer;">✕</button>
    <div style="font-size:18px; font-weight:700; color:#38bdf8; margin-bottom:6px;">⚙️ AISICH Bot Setup</div>
    <p style="font-size:12px; color:#9ca3af; margin:0 0 16px; line-height:1.4;">
      ${isEditing ? 'Update the WhatsApp bot phone number below:' : 'Please enter the AISICH WhatsApp bot number shared in your course group to continue:'}
    </p>

    <div style="text-align:left; margin-bottom:14px;">
      <label style="font-size:11px; font-weight:600; color:#d1d5db; display:block; margin-bottom:4px;">Bot Number (with Country Code)</label>
      <input 
        type="tel" 
        id="taxila-bot-input" 
        placeholder="e.g. 916375648516" 
        style="width:100%; padding:10px; font-size:13px; background:#1f2937; color:#ffffff; border:1px solid #4b5563; border-radius:6px; outline:none; box-sizing:border-box;"
      />
      <span style="font-size:10px; color:#6b7280; margin-top:3px; display:block;">Digits only. Country code included (e.g. 91 for India).</span>
    </div>

    <button id="taxila-save-btn" style="width:100%; background:#25d366; color:#ffffff; border:none; padding:10px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; margin-bottom:8px;">
      Save & Continue
    </button>
  `;

  document.getElementById('taxila-x-btn').onclick = removeSyncModal;

  const saveBtn = document.getElementById('taxila-save-btn');
  const botInput = document.getElementById('taxila-bot-input');
  botInput.focus();

  saveBtn.onclick = async () => {
    const rawVal = botInput.value.trim();
    const cleanNumber = rawVal.replace(/\D/g, "");

    if (cleanNumber.length < 10) {
      alert("Please enter a valid phone number including country code (min 10 digits).");
      return;
    }

    await setStoredBotNumber(cleanNumber);
    // Continue immediately to the QR display modal
    renderActiveSyncModal(token, userid, cleanNumber);
  };
}

// View 2: Main Sync Modal (QR + WhatsApp Launch + Copy Button)
function renderActiveSyncModal(token, userid, botNumber) {
  const { card } = createBaseModal();

  const msg = `!sync_taxila ${token} ${userid}`;
  const waUrl = `https://wa.me/${botNumber}?text=${encodeURIComponent(msg)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(waUrl)}`;
  const fallbackQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(waUrl)}&size=160`;

  card.innerHTML = `
    <button id="taxila-x-btn" style="position:absolute; top:12px; right:14px; background:transparent; border:none; color:#9ca3af; font-size:18px; cursor:pointer;">✕</button>
    <div style="font-size:18px; font-weight:700; color:#10b981; margin-bottom:4px;">✅ Token Generated!</div>
    <p style="font-size:12px; color:#9ca3af; margin:0 0 14px; line-height:1.4;">
      Scan the QR code with your phone camera to open WhatsApp directly:
    </p>

    <!-- Phone QR Display -->
    <div style="display:flex; justify-content:center; align-items:center; margin-bottom:8px;">
      <div style="background:#ffffff; padding:10px; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:inline-block; min-width:150px; min-height:150px;">
        <img id="taxila-phone-qr" src="${qrUrl}" alt="WhatsApp QR Code" style="display:block; width:150px; height:150px; border-radius:4px;" />
      </div>
    </div>
    <div style="font-size:11px; color:#6ee7b7; font-weight:600; margin-bottom:14px;">
      📷 Point phone camera & tap "Open in WhatsApp"
    </div>

    <!-- Web Link -->
    <a href="${waUrl}" target="_blank" style="display:block; background:#25d366; color:#ffffff; text-decoration:none; padding:10px; border-radius:8px; font-weight:700; font-size:13px; margin-bottom:12px;">
      💬 Open in WhatsApp Web
    </a>

    <!-- Manual Code Fallback -->
    <div style="font-size:11px; color:#9ca3af; margin-bottom:4px; text-align:left; font-weight:600;">Manual Command:</div>
    <div style="display:flex; gap:6px; margin-bottom:14px;">
      <input type="text" readonly value="${msg}" id="taxila-token-input" style="flex:1; padding:7px 9px; font-size:11px; background:#1f2937; color:#f3f4f6; border:1px solid #4b5563; border-radius:6px; text-align:left; font-family:monospace; outline:none; user-select:all;">
      <button id="taxila-copy-btn" style="background:#374151; color:#ffffff; border:none; padding:7px 12px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; white-space:nowrap;">
        📋 Copy
      </button>
    </div>

    <!-- Footer Settings & Dismiss -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
      <button id="taxila-change-num-btn" style="background:transparent; border:none; color:#60a5fa; font-size:11px; cursor:pointer; text-decoration:underline; padding:0;">
        ⚙️ Change Bot Number
      </button>
      <button id="taxila-dismiss-btn" style="background:#1f2937; color:#9ca3af; border:1px solid #374151; padding:6px 12px; border-radius:6px; font-size:11px; cursor:pointer;">
        Dismiss
      </button>
    </div>
  `;

  // Fallback for QR image CDN
  const qrImg = document.getElementById('taxila-phone-qr');
  qrImg.onerror = () => { if (qrImg.src !== fallbackQrUrl) qrImg.src = fallbackQrUrl; };

  document.getElementById('taxila-x-btn').onclick = removeSyncModal;
  document.getElementById('taxila-dismiss-btn').onclick = removeSyncModal;

  // Allow student to change bot number at any time
  document.getElementById('taxila-change-num-btn').onclick = () => {
    showConfigPrompt(token, userid, true);
  };

  // Copy button handler
  const copyBtn = document.getElementById('taxila-copy-btn');
  copyBtn.onclick = async () => {
    const input = document.getElementById('taxila-token-input');
    input.select();
    await navigator.clipboard.writeText(input.value);
    copyBtn.innerText = '✅ Copied!';
    copyBtn.style.background = '#059669';
    setTimeout(() => {
      copyBtn.innerText = '📋 Copy';
      copyBtn.style.background = '#374151';
    }, 2000);
  };
}

// Main Modal Dispatcher
async function showSyncModal(token, userid) {
  const botNumber = await getStoredBotNumber();
  
  if (!botNumber || botNumber.trim() === "" || botNumber === DUMMY_FALLBACK_NUMBER) {
    // If not set yet, prompt the user for the number first
    showConfigPrompt(token, userid, false);
  } else {
    // Already configured; render the full sync card
    renderActiveSyncModal(token, userid, botNumber);
  }
}

// Watch DOM for Taxila's native QR code
const observer = new MutationObserver(() => {
  const img = document.querySelector('#qrcode img');
  if (!img || document.getElementById('taxila-sync-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'taxila-sync-btn';
  btn.innerText = '⚡ Sync with Aisich';
  btn.style.cssText = `
    display: block; margin: 16px auto; padding: 12px 20px;
    background: #25D366; color: #ffffff; font-size: 14px; font-weight: 700;
    border: none; border-radius: 8px; cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2); transition: background 0.2s, opacity 0.2s;
  `;

  btn.onmouseover = () => { if (!btn.disabled) btn.style.background = '#1da851'; };
  btn.onmouseout = () => { if (!btn.disabled) btn.style.background = '#25D366'; };

  btn.onclick = async () => {
    btn.disabled = true;
    btn.innerText = '⏳ Generating token...';
    btn.style.opacity = '0.7';
    btn.style.cursor = 'not-allowed';

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const pad = 30;
      canvas.width = (img.naturalWidth || img.width) + pad * 2;
      canvas.height = (img.naturalHeight || img.height) + pad * 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad);

      let rawUrl = null;

      // 1. Try Native BarcodeDetector (Supported on macOS, Android, ChromeOS)
      if ('BarcodeDetector' in window) {
        try {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(canvas);
          if (barcodes.length > 0) {
            rawUrl = barcodes[0].rawValue;
          }
        } catch (detectorErr) {
          console.warn('Native BarcodeDetector failed, falling back to jsQR:', detectorErr);
        }
      }

      // 2. Universal Fallback using bundled jsQR (Works on Windows, Linux, Brave, etc.)
      if (!rawUrl && typeof jsQR !== 'undefined') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
        if (qrCode && qrCode.data) {
          rawUrl = qrCode.data;
        }
      }

      if (!rawUrl) {
        throw new Error('Could not decode QR code. Please ensure the QR code has fully rendered.');
      }

      const qrloginkey = rawUrl.match(/qrlogin=([a-f0-9]+)/)?.[1];
      const userid = parseInt(rawUrl.match(/userid=(\d+)/)?.[1], 10);

      if (!qrloginkey || isNaN(userid)) {
        throw new Error('Extracted data is invalid or missing qrloginkey.');
      }

      const res = await fetch('/lib/ajax/service-nologin.php?info=tool_mobile_get_tokens_for_qr_login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          index: 0,
          methodname: 'tool_mobile_get_tokens_for_qr_login',
          args: { qrloginkey, userid }
        }])
      });

      const data = await res.json();
      const token = data[0]?.data?.token;

      if (!token) {
        const errMsg = data[0]?.exception?.message || 'Server rejected key';
        throw new Error(errMsg);
      }

      showSyncModal(token, userid);

    } catch (err) {
      alert('Sync Error: ' + err.message + '\n\nFix: If expired, refresh Taxila (Cmd+R or Ctrl+R) to get a new QR code.');
    } finally {
      btn.disabled = false;
      btn.innerText = '⚡ Sync with Aisich';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  };

  img.parentElement.appendChild(btn);
});

observer.observe(document.body, { childList: true, subtree: true });