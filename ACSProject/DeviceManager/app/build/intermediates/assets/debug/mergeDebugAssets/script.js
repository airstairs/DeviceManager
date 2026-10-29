let allAttrs = [];

const save = () => {
  const devices = [...document.querySelectorAll('.device-list-item')].filter(d => d.id !== 'no-device').map(dev => ({
    name: dev.querySelector('.dev-name')?.textContent || '',
    checks: [...dev.querySelectorAll('.device-attrs input[type="checkbox"]')].map(c => c.checked)
  }));
  localStorage.setItem('dm_data', JSON.stringify({ allAttrs, devices }));
};

function ensureModalElements() {
  if (!document.getElementById('customModalStyles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'customModalStyles';
    styleEl.textContent = `
      .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); backdrop-filter: blur(2px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
      .modal-overlay.hidden, .modal-input.hidden, .modal-btn.hidden { display: none !important; }
      .modal-box { background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); width: 90%; max-width: 360px; text-align: center; font-family: 'Segoe UI', Roboto, sans-serif; }
      .modal-box h3 { margin: 0 0 12px 0; font-size: 1.1rem; color: #202124; }
      .modal-input { width: 100%; padding: 8px 12px; margin-bottom: 16px; box-sizing: border-box; border: 1px solid #c5c8ce; border-radius: 6px; font-size: 0.95rem; outline: none; }
      .modal-input:focus { border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.2); }
      .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
      .modal-btn { padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.9rem; border: 1px solid #c5c8ce; }
      .modal-btn.primary { background-color: #1a73e8; color: white; border-color: #1a73e8; }
      .modal-btn.secondary { background-color: #f1f3f5; color: #333; }
      .modal-btn:hover { opacity: 0.9; }
    `;
    document.head.appendChild(styleEl);
  }

  if (!document.getElementById('modalOverlay')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="modalOverlay" class="modal-overlay hidden">
        <div class="modal-box">
          <h3 id="modalMessage">Message</h3>
          <input type="text" id="modalInput" class="modal-input hidden" placeholder="Enter value...">
          <div class="modal-actions">
            <button id="modalCancelBtn" class="modal-btn secondary hidden">Cancel</button>
            <button id="modalConfirmBtn" class="modal-btn primary">OK</button>
          </div>
        </div>
      </div>
    `);
  }
}

function showModal({ message, showInput = false, placeholder = '', showCancel = false }) {
  ensureModalElements();
  return new Promise((resolve) => {
    const overlay = document.getElementById('modalOverlay');
    const msgEl = document.getElementById('modalMessage');
    const inputEl = document.getElementById('modalInput');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');

    msgEl.textContent = message;
    inputEl.value = '';
    inputEl.placeholder = placeholder;
    inputEl.classList.toggle('hidden', !showInput);
    cancelBtn.classList.toggle('hidden', !showCancel);
    overlay.classList.remove('hidden');
    if (showInput) setTimeout(() => inputEl.focus(), 50);

    const cleanup = () => {
      overlay.classList.add('hidden');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      inputEl.removeEventListener('keydown', onKeyDown);
    };
    const onConfirm = () => { cleanup(); resolve(showInput ? inputEl.value.trim() : true); };
    const onCancel = () => { cleanup(); resolve(showInput ? null : false); };
    const onKeyDown = (e) => {
      if (e.key === 'Enter') onConfirm();
      if (e.key === 'Escape' && showCancel) onCancel();
    };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    inputEl.addEventListener('keydown', onKeyDown);
  });
}

function updateParentCheck(item) {
  const attrs = item.querySelectorAll('input[type="checkbox"]');
  const checked = item.querySelectorAll('input[type="checkbox"]:checked');
  const span = item.querySelector('.parent-check');
  const isComplete = (attrs.length > 0 && attrs.length === checked.length);
  if (span) span.textContent = isComplete ? '[X]' : '';
  item.classList.toggle('completed', isComplete);
}

function createDeviceElement(name, checkedStates = []) {
  document.getElementById('no-device')?.remove();
  const newDiv = document.createElement('div');
  newDiv.className = 'device-list-item';
  newDiv.innerHTML = `<p style="margin:0;"><span class="dev-name">${name}</span><span class="parent-check" style="color: #137333; font-weight: bold;"></span></p>`;

  const attrDiv = document.createElement('div');
  attrDiv.className = 'device-attrs';
  attrDiv.style.display = 'none';

  allAttrs.forEach((attrName, idx) => {
    const checked = checkedStates[idx] ? 'checked' : '';
    attrDiv.innerHTML += `<label style="display:block; margin-bottom:4px;"><input type="checkbox" ${checked}> ${attrName}</label>`;
  });
  attrDiv.innerHTML += `<button class="add-attr" style="margin-top:6px; padding:4px 8px; font-size:0.85rem;">Add Attribute</button>`;
  newDiv.append(attrDiv);

  newDiv.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    const isExpanded = attrDiv.style.display === 'block';
    document.querySelectorAll('.device-attrs').forEach(d => d.style.display = 'none');
    document.querySelectorAll('.device-list-item').forEach(i => i.classList.remove('active'));
    if (!isExpanded) {
      attrDiv.style.display = 'block';
      newDiv.classList.add('active');
    }
  });

  attrDiv.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (e.target.closest('.add-attr')) {
      const attrName = await showModal({ message: 'Enter attribute name:', showInput: true, placeholder: 'Attribute name', showCancel: true });
      if (!attrName) return;
      allAttrs.push(attrName);
      document.querySelectorAll('.device-list-item').forEach(dev => {
        const container = dev.querySelector('.device-attrs');
        const btn = container?.querySelector('.add-attr');
        if (container && btn) {
          const label = document.createElement('label');
          label.style.cssText = 'display:block; margin-bottom:4px;';
          label.innerHTML = `<input type="checkbox"> ${attrName}`;
          container.insertBefore(label, btn);
          updateParentCheck(dev);
        }
      });
      save();
    } else if (e.target.type === 'checkbox') {
      updateParentCheck(newDiv);
      save();
    }
  });

  document.querySelector('.device-list').appendChild(newDiv);
  updateParentCheck(newDiv);
  save();
}

document.getElementById('newDeviceButton').addEventListener('click', () => {
  const input = document.getElementById('setDeviceNameInput');
  const text = input.value.trim();
  if (!text) return;
  createDeviceElement(text);
  input.value = '';
});

// Updated Export handler to use AndroidBridge when running inside the WebView
document.getElementById('exportButton').onclick = () => {
  const devices = [...document.querySelectorAll('.device-list-item')].filter(d => d.id !== 'no-device').map(dev => ({
    name: dev.querySelector('.dev-name')?.textContent || '',
    checks: [...dev.querySelectorAll('.device-attrs input[type="checkbox"]')].map(c => c.checked)
  }));
  const exportJsonString = JSON.stringify({ allAttrs, devices });

  if (window.AndroidBridge) {
    window.AndroidBridge.exportData(exportJsonString);
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportJsonString], { type: 'text/plain' }));
    a.download = 'devicemanager_export.dme';
    a.click();
  }
};

document.getElementById('importButton').onclick = () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.dme';
  fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const data = JSON.parse(evt.target.result);
        allAttrs = data.allAttrs || [];
        document.querySelector('.device-list').innerHTML = '';
        if (!data.devices || !data.devices.length) {
          document.querySelector('.device-list').innerHTML = '<div class="device-list-item" id="no-device"><p style="color: #5f6368; margin: 0;">No devices</p></div>';
        } else {
          data.devices.forEach(d => createDeviceElement(d.name, d.checks));
        }
        save();
      } catch (err) {
        await showModal({ message: 'Invalid .dme file', showCancel: false });
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
};

document.getElementById('deleteAllButton').onclick = async () => {
  if (await showModal({ message: 'Are you sure you want to delete all devices?', showCancel: true })) {
    allAttrs = [];
    document.querySelector('.device-list').innerHTML = '<div class="device-list-item" id="no-device"><p style="color: #5f6368; margin: 0;">No devices</p></div>';
    localStorage.removeItem('dm_data');
  }
};

// Load saved data on page load
(() => {
  const raw = localStorage.getItem('dm_data');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data?.devices?.length) {
      allAttrs = data.allAttrs || [];
      document.querySelector('.device-list').innerHTML = '';
      data.devices.forEach(d => createDeviceElement(d.name, d.checks));
    }
  } catch (e) {}
})();
