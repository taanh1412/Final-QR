// Configuration and State
const CONFIG_KEYS = {
    AUTH_TOKEN: 'qr_scanner_auth_token',
    USER_DATA: 'qr_scanner_user_data',
    CAMERA_ID: 'qr_scanner_camera_id'
};

let html5QrcodeScanner = null;
let isScanning = false;
let currentUser = null;

// DOM Elements
const elements = {
    loginPage: document.getElementById('loginPage'),
    mainApp: document.getElementById('mainApp'),
    loginForm: document.getElementById('loginForm'),
    loginIdentifier: document.getElementById('loginIdentifier'),
    loginPassword: document.getElementById('loginPassword'),
    loginError: document.getElementById('loginError'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    userInfo: document.getElementById('userInfo'),
    settingsPanel: document.getElementById('settingsPanel'),
    settingsBtn: document.getElementById('settingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
    cameraSelect: document.getElementById('cameraSelect'),
    startScanBtn: document.getElementById('startScanBtn'),
    stopScanBtn: document.getElementById('stopScanBtn'),
    statusMessage: document.getElementById('statusMessage'),
    resultSection: document.getElementById('resultSection'),
    resultIcon: document.getElementById('resultIcon'),
    resultTitle: document.getElementById('resultTitle'),
    resultDetails: document.getElementById('resultDetails'),
    scanNextBtn: document.getElementById('scanNextBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    scannerWrapper: document.getElementById('scannerWrapper')
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAuthentication();
    loadCameras();
});

// Check if user is already authenticated
function checkAuthentication() {
    const token = localStorage.getItem(CONFIG_KEYS.AUTH_TOKEN);
    const userData = localStorage.getItem(CONFIG_KEYS.USER_DATA);

    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            // Verify user has librarian or admin role
            if (currentUser.role === 'librarian' || currentUser.role === 'admin') {
                showMainApp();
                return;
            } else {
                // Not a librarian, clear and show login
                logout();
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            logout();
        }
    }

    showLoginPage();
}

// Show login page
function showLoginPage() {
    elements.loginPage.style.display = 'flex';
    elements.mainApp.style.display = 'none';
}

// Show main app
function showMainApp() {
    elements.loginPage.style.display = 'none';
    elements.mainApp.style.display = 'block';

    // Update user info display
    if (currentUser) {
        elements.userInfo.textContent = `${currentUser.username} (${currentUser.role})`;
    }
}

// Setup event listeners
function setupEventListeners() {
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutBtn.addEventListener('click', logout);
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.cancelSettingsBtn.addEventListener('click', closeSettings);
    elements.startScanBtn.addEventListener('click', startScanning);
    elements.stopScanBtn.addEventListener('click', stopScanning);
    elements.scanNextBtn.addEventListener('click', resetScanner);
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const identifier = elements.loginIdentifier.value.trim();
    const password = elements.loginPassword.value;

    if (!identifier || !password) {
        showLoginError('Please enter both email/username and password');
        return;
    }

    elements.loginBtn.disabled = true;
    elements.loginBtn.textContent = 'Signing in...';
    hideLoginError();

    try {
        const response = await fetch(`${CONFIG.API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identifier: identifier,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Check if 2FA is required
        if (data.requires_2fa) {
            showLoginError('2FA is not supported in this app. Please use the main application.');
            return;
        }

        // Check if user is librarian or admin
        if (data.user.role !== 'librarian' && data.user.role !== 'admin') {
            showLoginError('Access denied. Only librarians and admins can use this app.');
            return;
        }

        // Store auth data
        currentUser = data.user;
        localStorage.setItem(CONFIG_KEYS.AUTH_TOKEN, data.token);
        localStorage.setItem(CONFIG_KEYS.USER_DATA, JSON.stringify(data.user));

        // Show main app
        showMainApp();

        // Clear form
        elements.loginForm.reset();

    } catch (error) {
        console.error('Login error:', error);
        showLoginError(error.message);
    } finally {
        elements.loginBtn.disabled = false;
        elements.loginBtn.textContent = 'Sign In';
    }
}

// Logout
function logout() {
    localStorage.removeItem(CONFIG_KEYS.AUTH_TOKEN);
    localStorage.removeItem(CONFIG_KEYS.USER_DATA);
    currentUser = null;

    // Stop scanner if running
    if (isScanning) {
        stopScanning();
    }

    showLoginPage();
    elements.loginForm.reset();
}

// Show/hide login error
function showLoginError(message) {
    elements.loginError.textContent = message;
    elements.loginError.style.display = 'block';
}

function hideLoginError() {
    elements.loginError.style.display = 'none';
}

// Save camera settings
function saveSettings() {
    const cameraId = elements.cameraSelect.value;

    if (cameraId) {
        localStorage.setItem(CONFIG_KEYS.CAMERA_ID, cameraId);
    }

    closeSettings();
    showStatus('Camera settings saved', 'success');
}

// Load available cameras
async function loadCameras() {
    try {
        const devices = await Html5Qrcode.getCameras();
        elements.cameraSelect.innerHTML = '<option value="">Select camera...</option>';

        devices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = device.label || `Camera ${index + 1}`;
            elements.cameraSelect.appendChild(option);
        });

        // Select saved camera or default to first camera
        const savedCameraId = localStorage.getItem(CONFIG_KEYS.CAMERA_ID);
        if (savedCameraId) {
            elements.cameraSelect.value = savedCameraId;
        } else if (devices.length > 0) {
            elements.cameraSelect.value = devices[0].id;
        }
    } catch (error) {
        console.error('Error loading cameras:', error);
    }
}

// Settings panel controls
function openSettings() {
    elements.settingsPanel.classList.add('active');
}

function closeSettings() {
    elements.settingsPanel.classList.remove('active');
}

// Start QR code scanning
async function startScanning() {
    const cameraId = elements.cameraSelect.value || localStorage.getItem(CONFIG_KEYS.CAMERA_ID);

    if (!cameraId) {
        showStatus('Please select a camera in settings', 'error');
        openSettings();
        return;
    }

    try {
        isScanning = true;
        elements.startScanBtn.style.display = 'none';
        elements.stopScanBtn.style.display = 'inline-flex';
        showStatus('Camera starting...', 'info');

        html5QrcodeScanner = new Html5Qrcode("qr-reader");

        await html5QrcodeScanner.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            onScanSuccess,
            onScanError
        );

        showStatus('Scanning for QR codes...', 'success');
    } catch (error) {
        console.error('Scanner error:', error);
        showStatus('Failed to start camera: ' + error.message, 'error');
        resetScannerUI();
    }
}

// Stop QR code scanning
async function stopScanning() {
    if (html5QrcodeScanner && isScanning) {
        try {
            await html5QrcodeScanner.stop();
            html5QrcodeScanner.clear();
            isScanning = false;
            resetScannerUI();
            showStatus('Camera stopped', 'info');
        } catch (error) {
            console.error('Error stopping scanner:', error);
        }
    }
}

// Reset scanner UI
function resetScannerUI() {
    elements.startScanBtn.style.display = 'inline-flex';
    elements.stopScanBtn.style.display = 'none';
    isScanning = false;
}

// Handle successful QR code scan
function onScanSuccess(decodedText, decodedResult) {
    console.log('QR Code scanned:', decodedText);

    // Stop scanning to prevent multiple scans
    stopScanning();

    // Process the barcode
    processCheckIn(decodedText);
}

// Handle scan errors (usually just no QR code in view)
function onScanError(error) {
    // Silently ignore - this fires constantly when no QR code is visible
}

// Process book check-in
async function processCheckIn(barcode) {
    const authToken = localStorage.getItem(CONFIG_KEYS.AUTH_TOKEN);

    if (!authToken) {
        showStatus('Not authenticated. Please log in again.', 'error');
        logout();
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${CONFIG.API_URL}/api/lendings/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                book_item_barcode: barcode
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // Check if unauthorized
            if (response.status === 401 || response.status === 403) {
                showStatus('Session expired. Please log in again.', 'error');
                logout();
                return;
            }
            throw new Error(data.message || 'Check-in failed');
        }

        showCheckInResult(true, barcode, data);
    } catch (error) {
        console.error('Check-in error:', error);
        showCheckInResult(false, barcode, { error: error.message });
    } finally {
        showLoading(false);
    }
}

// Show check-in result
function showCheckInResult(success, barcode, data) {
    elements.scannerWrapper.style.display = 'none';
    elements.resultSection.style.display = 'block';

    if (success) {
        elements.resultIcon.className = 'result-icon success';
        elements.resultIcon.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"></circle>
                <path d="M8 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round"></path>
            </svg>
        `;
        elements.resultTitle.textContent = '✅ Book Checked In Successfully';

        let detailsHTML = `
            <p><strong>Barcode:</strong> <span>${barcode}</span></p>
            <p><strong>Status:</strong> <span style="color: var(--success)">Returned</span></p>
        `;

        if (data.fine_created) {
            detailsHTML += `
                <p style="color: var(--warning); margin-top: 1rem;">
                    ⚠️ <strong>Overdue fine created</strong>
                </p>
            `;
        }

        elements.resultDetails.innerHTML = detailsHTML;
    } else {
        elements.resultIcon.className = 'result-icon error';
        elements.resultIcon.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"></circle>
                <path d="M8 8l8 8M16 8l-8 8" stroke="white" stroke-width="2" stroke-linecap="round"></path>
            </svg>
        `;
        elements.resultTitle.textContent = '❌ Check-In Failed';
        elements.resultDetails.innerHTML = `
            <p><strong>Barcode:</strong> <span>${barcode}</span></p>
            <p><strong>Error:</strong> <span style="color: var(--error)">${data.error}</span></p>
        `;
    }
}

// Reset scanner for next scan
function resetScanner() {
    elements.scannerWrapper.style.display = 'block';
    elements.resultSection.style.display = 'none';
    showStatus('Ready to scan. Click "Start Camera" to begin', 'success');
}

// Show status message
function showStatus(message, type = 'info') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
}

// Show/hide loading overlay
function showLoading(show) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}
