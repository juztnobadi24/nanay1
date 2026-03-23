// ======================== HEADER COMPONENT ========================

class HeaderComponent {
    constructor() {
        this.container = document.getElementById("appHeader");
        this.modeToggle = null;
        this.toggleLabels = null;
        this.currentMode = "tv";
        this.settingsModal = null;
    }
    
    hideAddressBar() {
        // Function to hide browser address bar
        window.scrollTo(0, 1);
        
        // For iOS, ensure it stays hidden
        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 50);
        }
    }

    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="logo-area">
                <h1><i class="fas fa-tv"></i> JUZT</h1>
            </div>
            <div class="header-icons">
                <div class="mode-toggle-switch" id="modeToggle">
                    <div class="toggle-track">
                        <div class="toggle-thumb"></div>
                    </div>
                    <div class="toggle-labels">
                        <span class="toggle-label tv-label active">TV</span>
                        <span class="toggle-label radio-label">Radio</span>
                    </div>
                </div>
                <button class="icon-btn" id="messageBtn" title="Chat">
                    <svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H8L12 22L16 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <path d="M7 9H17M7 13H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
                <button class="icon-btn" id="notificationBtn" title="Notifications">
                    <svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.1892 14.0608L19.0592 12.1808C18.8092 11.7708 18.5892 10.9808 18.5892 10.5008V8.63078C18.5892 5.00078 15.6392 2.05078 12.0192 2.05078C8.38923 2.06078 5.43923 5.00078 5.43923 8.63078V10.4908C5.43923 10.9708 5.21923 11.7608 4.97923 12.1708L3.84923 14.0508C3.41923 14.7808 3.31923 15.6108 3.58923 16.3308C3.85923 17.0608 4.46923 17.6408 5.26923 17.9008C6.34923 18.2608 7.43923 18.5208 8.54923 18.7108C8.65923 18.7308 8.76923 18.7408 8.87923 18.7608C9.01923 18.7808 9.16923 18.8008 9.31923 18.8208C9.57923 18.8608 9.83923 18.8908 10.1092 18.9108C10.7392 18.9708 11.3792 19.0008 12.0192 19.0008C12.6492 19.0008 13.2792 18.9708 13.8992 18.9108C14.1292 18.8908 14.3592 18.8708 14.5792 18.8408C14.7592 18.8208 14.9392 18.8008 15.1192 18.7708C15.2292 18.7608 15.3392 18.7408 15.4492 18.7208C16.5692 18.5408 17.6792 18.2608 18.7592 17.9008C19.5292 17.6408 20.1192 17.0608 20.3992 16.3208C20.6792 15.5708 20.5992 14.7508 20.1892 14.0608Z" stroke="currentColor" stroke-width="1.2" fill="none"/>
                        <path d="M14.8297 20.01C14.4097 21.17 13.2997 22 11.9997 22C11.2097 22 10.4297 21.68 9.87969 21.11C9.55969 20.81 9.31969 20.41 9.17969 20C9.30969 20.02 9.43969 20.03 9.57969 20.05C9.80969 20.08 10.0497 20.11 10.2897 20.13C10.8597 20.18 11.4397 20.21 12.0197 20.21C12.5897 20.21 13.1597 20.18 13.7197 20.13C13.9297 20.11 14.1397 20.1 14.3397 20.07C14.4997 20.05 14.6597 20.03 14.8297 20.01Z" stroke="currentColor" stroke-width="1.2" fill="none"/>
                    </svg>
                </button>
                <button class="icon-btn" id="settingsBtn" title="Settings">
                    <svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21.9,10.59,20,8.69V6a2,2,0,0,0-2-2H15.31l-1.9-1.9a2,2,0,0,0-2.82,0L8.69,4H6A2,2,0,0,0,4,6V8.69l-1.9,1.9a2,2,0,0,0,0,2.82L4,15.31V18a2,2,0,0,0,2,2H8.69l1.9,1.9a2,2,0,0,0,2.82,0l1.9-1.9H18a2,2,0,0,0,2-2V15.31l1.9-1.9A2,2,0,0,0,21.9,10.59ZM12,16a4,4,0,1,1,4-4A4,4,0,0,1,12,16Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    </svg>
                </button>
            </div>
        `;
        
        this.attachEvents();
    }
    
    attachEvents() {
        this.modeToggle = document.getElementById("modeToggle");
        this.toggleLabels = document.querySelectorAll(".toggle-label");
        
        const messageBtn = document.getElementById("messageBtn");
        const notificationBtn = document.getElementById("notificationBtn");
        const settingsBtn = document.getElementById("settingsBtn");
        
        // Helper function to remove active class from all header icons
        const removeActiveFromIcons = () => {
            [messageBtn, notificationBtn, settingsBtn].forEach(icon => {
                if (icon) icon.classList.remove('active');
            });
        };
        
        // Mode toggle functionality
        if (this.modeToggle) {
            this.modeToggle.addEventListener("click", (e) => {
                this.hideAddressBar();
                if (e.target.classList && e.target.classList.contains("toggle-label")) {
                    return;
                }
                const newMode = window.currentMode === "tv" ? "radio" : "tv";
                if (typeof window.onModeChange === "function") {
                    window.onModeChange(newMode);
                }
            });
        }
        
        // TV/Radio label clicks
        this.toggleLabels.forEach(label => {
            label.addEventListener("click", () => {
                this.hideAddressBar();
                if (label.classList.contains("tv-label") && window.currentMode !== "tv") {
                    if (typeof window.onModeChange === "function") window.onModeChange("tv");
                } else if (label.classList.contains("radio-label") && window.currentMode !== "radio") {
                    if (typeof window.onModeChange === "function") window.onModeChange("radio");
                }
            });
        });
        
        // Message button - Opens chat modal
        if (messageBtn) {
            messageBtn.addEventListener("click", () => {
                this.hideAddressBar();
                removeActiveFromIcons();
                messageBtn.classList.add('active');
                
                // Open chat modal if available
                if (window.chatUI) {
                    window.chatUI.open();
                } else if (window.firebaseChat && window.firebaseChat.isInitialized) {
                    console.log("Opening chat...");
                } else {
                    console.log("Chat not ready yet. Please wait...");
                }
                
                // Remove active class after modal closes (polling)
                const checkModalClose = setInterval(() => {
                    if (window.chatUI && !window.chatUI.isOpen) {
                        messageBtn.classList.remove('active');
                        clearInterval(checkModalClose);
                    }
                }, 100);
            });
        }
        
        // Notification button - Opens notifications modal
        if (notificationBtn) {
            notificationBtn.addEventListener("click", () => {
                this.hideAddressBar();
                removeActiveFromIcons();
                notificationBtn.classList.add('active');
                
                // Open notifications modal if available
                if (window.notificationsUI) {
                    window.notificationsUI.open();
                }
                
                // Remove active class after modal closes
                const checkModalClose = setInterval(() => {
                    if (window.notificationsUI && !window.notificationsUI.isOpen) {
                        notificationBtn.classList.remove('active');
                        clearInterval(checkModalClose);
                    }
                }, 100);
            });
        }
        
        // Settings button
        if (settingsBtn) {
            settingsBtn.addEventListener("click", () => {
                this.hideAddressBar();
                removeActiveFromIcons();
                settingsBtn.classList.add('active');
                
                // Initialize and open settings modal
                if (!this.settingsModal) {
                    this.settingsModal = new SettingsModal();
                    this.settingsModal.createModal();
                }
                this.settingsModal.open();
                
                // Remove active class after modal closes
                const checkModalClose = setInterval(() => {
                    if (!this.settingsModal.isOpen) {
                        settingsBtn.classList.remove('active');
                        clearInterval(checkModalClose);
                    }
                }, 100);
            });
        }
        
        // Also hide address bar on header container click/touch
        if (this.container) {
            this.container.addEventListener('click', () => this.hideAddressBar());
            this.container.addEventListener('touchstart', () => this.hideAddressBar());
        }
    }
    
    updateModeUI(mode) {
        this.currentMode = mode;
        if (this.modeToggle) {
            if (mode === "radio") {
                this.modeToggle.classList.add("radio-mode");
            } else {
                this.modeToggle.classList.remove("radio-mode");
            }
        }
        
        this.toggleLabels.forEach(label => {
            if ((mode === "tv" && label.classList.contains("tv-label")) ||
                (mode === "radio" && label.classList.contains("radio-label"))) {
                label.classList.add("active");
            } else {
                label.classList.remove("active");
            }
        });
        
        // Hide address bar when mode changes
        this.hideAddressBar();
    }
}

window.HeaderComponent = HeaderComponent;
