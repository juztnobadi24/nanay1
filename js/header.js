// ======================== HEADER COMPONENT ========================

class HeaderComponent {
    constructor() {
        this.container = document.getElementById("appHeader");
        this.currentMode = "tv";
        this.settingsModal = null;
        this.menuOpen = false;
        this.activeButton = null;
        this.modalCheckInterval = null;
        this.firebaseChat = null;
    }
    
    hideAddressBar() {
        window.scrollTo(0, 1);
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
                <img src="juztlogoicon2.webp" alt="JUZT" class="logo-image">
                <h1>JUZT</h1>
            </div>
            <div class="header-controls">
                <!-- Glass Toggle for TV/Radio/Movies - Icons Only -->
                <div class="glass-radio-group">
                    <input type="radio" name="media-mode" id="glass-tv" value="tv" checked>
                    <label for="glass-tv">
                        <i class="fas fa-tv"></i>
                    </label>
                    
                    <input type="radio" name="media-mode" id="glass-radio" value="radio">
                    <label for="glass-radio">
                        <i class="fas fa-headphones"></i>
                    </label>
                    
                    <input type="radio" name="media-mode" id="glass-movies" value="movies">
                    <label for="glass-movies">
                        <i class="fas fa-film"></i>
                    </label>
                    
                    <div class="glass-glider"></div>
                </div>
                
                <!-- Theme Toggle Button -->
                <button class="theme-toggle-btn" id="themeToggleBtn" title="Toggle Light/Dark Mode">
                    <i class="fas fa-moon"></i>
                </button>
                
                <!-- Hamburger Menu Button -->
                <div class="hamburger" id="hamburgerBtn">
                    <svg viewBox="0 0 32 32">
                        <path class="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
                        <path class="line" d="M7 16 27 16"></path>
                    </svg>
                </div>
                
                <!-- Dropdown Menu -->
                <div class="dropdown-menu-icons" id="dropdownMenu">
                    <button class="icon-btn dropdown-item" id="profileBtn" title="Profile">
                        <svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        </svg>
                        <span class="dropdown-label">Profile</span>
                    </button>
                    <button class="icon-btn dropdown-item" id="announcementsBtn" title="Announcements">
                        <svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 11h18M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            <path d="M12 16v3" stroke="currentColor" stroke-width="1.5"/>
                        </svg>
                        <span class="dropdown-label">Announcements</span>
                    </button>
                    <button class="icon-btn dropdown-item" id="chatBtn" title="Live Chat">
                        <svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        </svg>
                        <span class="dropdown-label">Live Chat</span>
                    </button>
                    <button class="icon-btn dropdown-item" id="settingsBtn" title="Settings">
                        <svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21.9,10.59,20,8.69V6a2,2,0,0,0-2-2H15.31l-1.9-1.9a2,2,0,0,0-2.82,0L8.69,4H6A2,2,0,0,0,4,6V8.69l-1.9,1.9a2,2,0,0,0,0,2.82L4,15.31V18a2,2,0,0,0,2,2H8.69l1.9,1.9a2,2,0,0,0,2.82,0l1.9-1.9H18a2,2,0,0,0,2-2V15.31l1.9-1.9A2,2,0,0,0,21.9,10.59ZM12,16a4,4,0,1,1,4-4A4,4,0,0,1,12,16Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        </svg>
                        <span class="dropdown-label">Settings</span>
                    </button>
                </div>
            </div>
        `;
        
        this.addBadgeStyles();
        this.attachEvents();
        this.initTheme();
        
        // Initialize Firebase Chat after DOM is ready
        setTimeout(() => {
            if (typeof initFirebaseChat === 'function') {
                this.firebaseChat = initFirebaseChat();
            }
        }, 500);
    }
    
    addBadgeStyles() {
        if (document.getElementById('badge-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'badge-styles';
        style.textContent = `
            .dropdown-item {
                position: relative;
                transition: all 0.2s ease;
            }
            
            .dropdown-item.active {
                background: rgba(249, 115, 22, 0.15);
                color: var(--accent);
            }
            
            .dropdown-item.active .icon-svg {
                color: var(--accent);
            }
            
            .dropdown-item.active .dropdown-label {
                color: var(--accent);
            }
        `;
        document.head.appendChild(style);
    }
    
    initTheme() {
        // Get saved theme from localStorage or system preference
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        let theme = savedTheme;
        if (!theme) {
            theme = systemPrefersDark ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeIcon(theme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                this.updateThemeIcon(newTheme);
            }
        });
    }
    
    updateThemeIcon(theme) {
        const themeBtn = document.getElementById('themeToggleBtn');
        if (!themeBtn) return;
        
        const icon = themeBtn.querySelector('i');
        if (icon) {
            if (theme === 'dark') {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        }
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
        
        // Show toast notification
        if (window.showToast) {
            const themeName = newTheme === 'dark' ? 'Dark Mode' : 'Light Mode';
            window.showToast(themeName);
        }
        
        console.log(`Theme changed to: ${newTheme} mode`);
    }
    
    removeActiveFromIcons() {
        const profileBtn = document.getElementById('profileBtn');
        const announcementsBtn = document.getElementById('announcementsBtn');
        const chatBtn = document.getElementById('chatBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        
        if (profileBtn) profileBtn.classList.remove('active');
        if (announcementsBtn) announcementsBtn.classList.remove('active');
        if (chatBtn) chatBtn.classList.remove('active');
        if (settingsBtn) settingsBtn.classList.remove('active');
        
        // Clear any existing interval
        if (this.modalCheckInterval) {
            clearInterval(this.modalCheckInterval);
            this.modalCheckInterval = null;
        }
    }
    
    startModalCheck(button, modalCheckFunction) {
        // Clear any existing interval
        if (this.modalCheckInterval) {
            clearInterval(this.modalCheckInterval);
            this.modalCheckInterval = null;
        }
        
        // Check modal status periodically
        this.modalCheckInterval = setInterval(() => {
            if (modalCheckFunction()) {
                button.classList.remove('active');
                clearInterval(this.modalCheckInterval);
                this.modalCheckInterval = null;
            }
        }, 100);
    }
    
    attachEvents() {
        // Get toggle radio inputs
        const tvRadio = document.getElementById("glass-tv");
        const radioRadio = document.getElementById("glass-radio");
        const moviesRadio = document.getElementById("glass-movies");
        const hamburgerBtn = document.getElementById("hamburgerBtn");
        const dropdownMenu = document.getElementById("dropdownMenu");
        
        // TV mode handler
        if (tvRadio) {
            tvRadio.addEventListener("change", () => {
                if (tvRadio.checked && window.currentMode !== "tv") {
                    this.hideAddressBar();
                    if (typeof window.onModeChange === "function") {
                        window.onModeChange("tv");
                    }
                }
            });
        }
        
        // Radio mode handler
        if (radioRadio) {
            radioRadio.addEventListener("change", () => {
                if (radioRadio.checked && window.currentMode !== "radio") {
                    this.hideAddressBar();
                    if (typeof window.onModeChange === "function") {
                        window.onModeChange("radio");
                    }
                }
            });
        }
        
        // Movies mode handler
        if (moviesRadio) {
            moviesRadio.addEventListener("change", () => {
                if (moviesRadio.checked && window.currentMode !== "movies") {
                    this.hideAddressBar();
                    if (typeof window.onModeChange === "function") {
                        window.onModeChange("movies");
                    }
                }
            });
        }
        
        // Theme toggle button
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                this.hideAddressBar();
                this.toggleTheme();
            });
        }
        
        // Function to open dropdown
        const openDropdown = () => {
            hamburgerBtn.classList.add("active");
            dropdownMenu.classList.add("show");
            this.menuOpen = true;
        };
        
        // Function to close dropdown
        const closeDropdown = () => {
            hamburgerBtn.classList.remove("active");
            dropdownMenu.classList.remove("show");
            this.menuOpen = false;
        };
        
        // Toggle dropdown function
        const toggleDropdown = () => {
            if (this.menuOpen) {
                closeDropdown();
            } else {
                openDropdown();
            }
        };
        
        // Hamburger button click handler
        if (hamburgerBtn) {
            hamburgerBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.hideAddressBar();
                toggleDropdown();
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (this.menuOpen && hamburgerBtn && !hamburgerBtn.contains(e.target) && 
                dropdownMenu && !dropdownMenu.contains(e.target)) {
                closeDropdown();
            }
        });
        
        // Prevent clicks inside dropdown from closing it
        if (dropdownMenu) {
            dropdownMenu.addEventListener("click", (e) => {
                e.stopPropagation();
            });
        }
        
        // Profile button (first)
        const profileBtn = document.getElementById("profileBtn");
        if (profileBtn) {
            profileBtn.addEventListener("click", () => {
                this.hideAddressBar();
                this.removeActiveFromIcons();
                profileBtn.classList.add('active');
                closeDropdown();
                
                if (this.firebaseChat) {
                    this.firebaseChat.openProfile();
                } else if (typeof initFirebaseChat === 'function') {
                    this.firebaseChat = initFirebaseChat();
                    setTimeout(() => {
                        if (this.firebaseChat) this.firebaseChat.openProfile();
                    }, 500);
                }
                
                this.startModalCheck(profileBtn, () => this.firebaseChat && !this.firebaseChat.profileModal?.classList.contains('show'));
            });
        }
        
        // Announcements button (second)
        const announcementsBtn = document.getElementById("announcementsBtn");
        if (announcementsBtn) {
            announcementsBtn.addEventListener("click", () => {
                this.hideAddressBar();
                this.removeActiveFromIcons();
                announcementsBtn.classList.add('active');
                closeDropdown();
                
                if (this.firebaseChat) {
                    this.firebaseChat.openAnnouncements();
                } else if (typeof initFirebaseChat === 'function') {
                    this.firebaseChat = initFirebaseChat();
                    setTimeout(() => {
                        if (this.firebaseChat) this.firebaseChat.openAnnouncements();
                    }, 500);
                }
                
                this.startModalCheck(announcementsBtn, () => this.firebaseChat && !this.firebaseChat.announcementsModal?.classList.contains('show'));
            });
        }
        
        // Chat button (third)
        const chatBtn = document.getElementById("chatBtn");
        if (chatBtn) {
            chatBtn.addEventListener("click", () => {
                this.hideAddressBar();
                this.removeActiveFromIcons();
                chatBtn.classList.add('active');
                closeDropdown();
                
                if (this.firebaseChat) {
                    this.firebaseChat.openChat();
                } else if (typeof initFirebaseChat === 'function') {
                    this.firebaseChat = initFirebaseChat();
                    setTimeout(() => {
                        if (this.firebaseChat) this.firebaseChat.openChat();
                    }, 500);
                }
                
                this.startModalCheck(chatBtn, () => this.firebaseChat && !this.firebaseChat.chatModal?.classList.contains('show'));
            });
        }
        
        // Settings button (fourth)
        const settingsBtn = document.getElementById("settingsBtn");
        if (settingsBtn) {
            settingsBtn.addEventListener("click", () => {
                this.hideAddressBar();
                this.removeActiveFromIcons();
                settingsBtn.classList.add('active');
                closeDropdown();
                
                if (!this.settingsModal) {
                    this.settingsModal = new SettingsModal();
                    this.settingsModal.createModal();
                }
                this.settingsModal.open();
                
                this.startModalCheck(settingsBtn, () => this.settingsModal && !this.settingsModal.isOpen);
            });
        }
        
        if (this.container) {
            this.container.addEventListener('click', () => this.hideAddressBar());
            this.container.addEventListener('touchstart', () => this.hideAddressBar());
        }
    }
    
    updateModeUI(mode) {
        this.currentMode = mode;
        
        // Update radio buttons based on mode
        const tvRadio = document.getElementById("glass-tv");
        const radioRadio = document.getElementById("glass-radio");
        const moviesRadio = document.getElementById("glass-movies");
        
        if (mode === "tv" && tvRadio && !tvRadio.checked) {
            tvRadio.checked = true;
        } else if (mode === "radio" && radioRadio && !radioRadio.checked) {
            radioRadio.checked = true;
        } else if (mode === "movies" && moviesRadio && !moviesRadio.checked) {
            moviesRadio.checked = true;
        }
        
        this.hideAddressBar();
    }
}

window.HeaderComponent = HeaderComponent;

