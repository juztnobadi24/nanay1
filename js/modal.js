// ======================== SETTINGS MODAL ========================

class SettingsModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.deviceInfo = this.getDeviceInfo();
        this.qualityPreference = localStorage.getItem('qualityPreference') || 'auto';
    }
    
    getDeviceInfo() {
        const ua = navigator.userAgent;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Detect device type
        let deviceType = 'Unknown';
        let isMobile = false;
        let isTablet = false;
        
        if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
            isMobile = true;
            if (/iPad|Tablet/i.test(ua) || (screenWidth >= 768 && screenWidth <= 1024)) {
                deviceType = 'Tablet';
                isTablet = true;
                isMobile = false;
            } else {
                deviceType = 'Mobile Phone';
            }
        } else {
            deviceType = 'Desktop / Laptop';
        }
        
        // Detect OS
        let os = 'Unknown';
        if (/Windows/i.test(ua)) os = 'Windows';
        else if (/Mac/i.test(ua)) os = 'macOS';
        else if (/Linux/i.test(ua)) os = 'Linux';
        else if (/Android/i.test(ua)) os = 'Android';
        else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
        
        // Detect Browser
        let browser = 'Unknown';
        if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
        else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Google Chrome';
        else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
        else if (/Opera|OPR/i.test(ua)) browser = 'Opera';
        
        return {
            deviceType,
            os,
            browser,
            screenSize: `${screen.width} x ${screen.height}`,
            isMobile,
            isTablet,
            isDesktop: !isMobile && !isTablet
        };
    }
    
    createModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('settingsModal');
        if (existingModal) existingModal.remove();
        
        const modalHTML = `
            <div id="settingsModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-cog"></i> Settings</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="device-info">
                            <h4><i class="fas fa-mobile-alt"></i> Device Information</h4>
                            <div class="info-row">
                                <span class="info-label">Device Type:</span>
                                <span class="info-value" id="deviceType">${this.deviceInfo.deviceType}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Operating System:</span>
                                <span class="info-value" id="deviceOS">${this.deviceInfo.os}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Browser:</span>
                                <span class="info-value" id="deviceBrowser">${this.deviceInfo.browser}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Screen Resolution:</span>
                                <span class="info-value" id="screenSize">${this.deviceInfo.screenSize}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Viewport:</span>
                                <span class="info-value" id="viewportSize">${window.innerWidth} x ${window.innerHeight}</span>
                            </div>
                        </div>
                        
                        <!-- PWA Install Section -->
                        <div class="settings-section" id="installSection">
                            <h4><i class="fas fa-download"></i> Install App</h4>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Install JUZT as App</div>
                                    <div class="setting-description">Install this app on your device for quick access and offline support</div>
                                </div>
                                <button id="installAppBtn" class="install-app-btn">
                                    <i class="fas fa-download"></i> Install
                                </button>
                            </div>
                            <div class="info-note" id="installNote">
                                <i class="fas fa-info-circle"></i>
                                <span>Install JUZT on your home screen for the best experience. Works offline for cached content and gives you a native app feel.</span>
                            </div>
                        </div>
                        
                        <div class="settings-section">
                            <h4><i class="fas fa-sliders-h"></i> Display Settings</h4>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Video Quality</div>
                                    <div class="setting-description">Preferred video quality for streaming</div>
                                </div>
                                <select id="qualitySelect" class="setting-select">
                                    <option value="auto" ${this.qualityPreference === 'auto' ? 'selected' : ''}>Auto</option>
                                    <option value="1080p" ${this.qualityPreference === '1080p' ? 'selected' : ''}>1080p (Full HD)</option>
                                    <option value="720p" ${this.qualityPreference === '720p' ? 'selected' : ''}>720p (HD)</option>
                                    <option value="480p" ${this.qualityPreference === '480p' ? 'selected' : ''}>480p (SD)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="info-note">
                            <i class="fas fa-info-circle"></i> 
                            <span>
                                <strong>Auto Fullscreen:</strong> Video automatically enters fullscreen when rotating to landscape on mobile devices.
                            </span>
                        </div>
                        
                        <button id="applySettingsBtn" class="settings-btn">
                            <i class="fas fa-check"></i> Apply Settings
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('settingsModal');
        this.attachEvents();
    }
    
    attachEvents() {
        if (!this.modal) return;
        
        // Close button
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
        
        // Apply button
        const applyBtn = document.getElementById('applySettingsBtn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applySettings());
        }
        
        // Install button
        const installBtn = document.getElementById('installAppBtn');
        if (installBtn) {
            installBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (window.pwaInstaller) {
                    installBtn.disabled = true;
                    const originalHtml = installBtn.innerHTML;
                    installBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Installing...';
                    
                    const installed = await window.pwaInstaller.promptInstall();
                    
                    if (installed) {
                        installBtn.innerHTML = '<i class="fas fa-check"></i> Installed!';
                        setTimeout(() => {
                            this.close();
                        }, 1500);
                    } else {
                        installBtn.innerHTML = originalHtml;
                        installBtn.disabled = false;
                    }
                }
            });
        }
        
        // Listen for window resize to update viewport size
        window.addEventListener('resize', () => {
            if (this.isOpen) {
                const viewportSpan = document.getElementById('viewportSize');
                if (viewportSpan) {
                    viewportSpan.textContent = `${window.innerWidth} x ${window.innerHeight}`;
                }
                const screenSizeSpan = document.getElementById('screenSize');
                if (screenSizeSpan) {
                    screenSizeSpan.textContent = `${screen.width} x ${screen.height}`;
                }
            }
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
        
        // Listen for install status updates
        window.addEventListener('beforeinstallprompt', () => {
            this.updateInstallButton();
        });
        
        window.addEventListener('appinstalled', () => {
            this.updateInstallButton();
        });
    }
    
    updateInstallButton() {
        const installBtn = document.getElementById('installAppBtn');
        if (installBtn && window.pwaInstaller) {
            const status = window.pwaInstaller.getInstallStatus();
            if (status.canInstall) {
                installBtn.style.display = 'flex';
                installBtn.disabled = false;
                installBtn.innerHTML = '<i class="fas fa-download"></i> Install';
            } else if (status.isInstalled) {
                installBtn.style.display = 'none';
            } else {
                installBtn.style.display = 'flex';
                installBtn.disabled = false;
                installBtn.innerHTML = '<i class="fas fa-download"></i> Install';
            }
        }
    }
    
    open() {
        if (!this.modal) this.createModal();
        this.modal.classList.add('show');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        // Update install button visibility
        setTimeout(() => {
            this.updateInstallButton();
        }, 100);
    }
    
    close() {
        if (this.modal) {
            this.modal.classList.remove('show');
            this.isOpen = false;
            document.body.style.overflow = '';
        }
    }
    
    applySettings() {
        const qualitySelect = document.getElementById('qualitySelect');
        
        if (qualitySelect) {
            this.qualityPreference = qualitySelect.value;
            localStorage.setItem('qualityPreference', this.qualityPreference);
        }
        
        // Show success message
        let message = `Settings applied! Video quality set to: ${this.qualityPreference.toUpperCase()}`;
        this.showToast(message);
        
        // Close modal after a short delay
        setTimeout(() => {
            this.close();
        }, 1500);
    }
    
    showToast(message) {
        // Remove existing toast
        const existingToast = document.querySelector('.settings-toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'settings-toast';
        toast.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f97316;
            color: white;
            padding: 10px 20px;
            border-radius: 40px;
            font-size: 0.9rem;
            font-weight: 500;
            z-index: 1001;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    getSettings() {
        return {
            qualityPreference: this.qualityPreference,
            deviceInfo: this.deviceInfo
        };
    }
}

window.SettingsModal = SettingsModal;
