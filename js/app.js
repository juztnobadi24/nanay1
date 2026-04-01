// ======================== VERSION MANAGEMENT ========================
const APP_VERSION = '2.0.0'; // Update this version number with each release
const STORAGE_VERSION_KEY = 'juzt_app_version';

// Check and handle version updates
function checkAppVersion() {
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    
    if (!storedVersion || storedVersion !== APP_VERSION) {
        console.log(`Version update: ${storedVersion || 'none'} -> ${APP_VERSION}`);
        
        // Store new version
        localStorage.setItem(STORAGE_VERSION_KEY, APP_VERSION);
        
        // Optional: Show update message
        if (storedVersion) {
            setTimeout(() => {
                if (window.showToast) {
                    window.showToast(`App updated to version ${APP_VERSION}! 🎉`);
                }
            }, 1000);
        }
        
        // Clear any old caches if needed
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    if (cacheName.includes('juzt') || cacheName.includes('iptv')) {
                        console.log('Clearing old cache:', cacheName);
                        caches.delete(cacheName);
                    }
                });
            });
        }
        
        return true;
    }
    return false;
}

// ======================== MAIN APPLICATION ========================

let headerComponent;
let sidebarComponent;
let playerComponent;
let fullscreenManager;
let gestureControls;
let firebaseChatInstance;

// ======================== PWA INSTALLER CLASS ========================
class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isInstalling = false;
        this.installButton = null;
        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log('PWA install prompt available');
            this.updateInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.isInstalled = true;
            this.deferredPrompt = null;
            this.updateInstallButton();
            if (window.showToast) {
                window.showToast('JUZT installed successfully! 🎉');
            }
        });
    }

    async promptInstall() {
        if (!this.deferredPrompt || this.isInstalling) {
            console.log('No install prompt available or installation in progress');
            return false;
        }

        this.isInstalling = true;
        
        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                this.isInstalled = true;
            } else {
                console.log('User dismissed the install prompt');
            }
            
            this.deferredPrompt = null;
            return outcome === 'accepted';
        } catch (error) {
            console.error('Error showing install prompt:', error);
            return false;
        } finally {
            this.isInstalling = false;
            this.updateInstallButton();
        }
    }

    updateInstallButton() {
        const installBtn = document.getElementById('installAppBtn');
        if (!installBtn) return;
        
        const canInstall = this.deferredPrompt !== null && !this.isInstalled;
        
        if (canInstall) {
            installBtn.style.display = 'flex';
        } else {
            installBtn.style.display = 'none';
        }
    }

    getInstallStatus() {
        return {
            canInstall: this.deferredPrompt !== null,
            isInstalled: this.isInstalled
        };
    }
}

// Add/modify these sections in app.js

// ======================== SERVICE WORKER REGISTRATION ========================
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            // Check if sw.js exists before registering
            const swResponse = await fetch('/sw.js', { method: 'HEAD' });
            if (!swResponse.ok) {
                console.log('Service worker not found, skipping registration');
                return false;
            }
            
            const registration = await navigator.serviceWorker.register(`/sw.js?v=${APP_VERSION}`);
            console.log('Service Worker registered with scope:', registration.scope);
            
            // Check for updates periodically
            setInterval(() => {
                if (navigator.onLine) {
                    registration.update().catch(e => console.log('Update check:', e));
                }
            }, 3600000); // Check every hour
            
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('Service Worker update found!');
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('New Service Worker available, refresh to update');
                        if (window.showToast) {
                            window.showToast('Update available! Refresh to get latest version.', 5000);
                        }
                    }
                });
            });
            
            return true;
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
            return false;
        }
    }
    console.log('Service Worker not supported');
    return false;
}

// ======================== INITIALIZE FIREBASE FEATURES ========================
async function initFirebaseFeatures() {
    // Wait for Firebase to be ready with timeout
    let retries = 0;
    const maxRetries = 20;
    let ready = false;
    
    while (!window.firestore && retries < maxRetries && !ready) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
        if (window.firestore) ready = true;
    }
    
    if (window.firestore) {
        try {
            firebaseChatInstance = initFirebaseChat();
            console.log("Firebase Chat initialized successfully");
            
            // Request notification permission after user interaction
            const requestNotificationPermission = () => {
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            };
            
            // Request after first user interaction
            document.addEventListener('click', requestNotificationPermission, { once: true });
            document.addEventListener('touchstart', requestNotificationPermission, { once: true });
        } catch (error) {
            console.warn("Failed to initialize Firebase Chat:", error);
            firebaseChatInstance = null;
        }
    } else {
        console.warn("Firestore not available after waiting, chat features disabled");
        firebaseChatInstance = null;
    }
}
// Load channels from JSON
async function loadChannelsFromJson() {
    try {
        // Add version parameter to bypass cache
        const response = await fetch(`./channels.json?v=${APP_VERSION}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const jsonData = await response.json();
        window.channelsData = jsonData.map((ch, index) => ({ 
            ...ch, 
            id: index + 1,
            type: ch.type || (ch.category === "Radio" ? "Radio" : 
                   ch.category === "Movies" ? "Movies" : "TV")
        }));
        
        // Add sample channels if needed
        const hasTV = window.channelsData.some(ch => ch.type === "TV");
        const hasRadio = window.channelsData.some(ch => ch.type === "Radio");
        const hasMovies = window.channelsData.some(ch => ch.type === "Movies");
        
        if (!hasTV) {
            const tvSamples = [
                { name: "Sample TV 1", type: "TV", category: "Entertainment", streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", id: window.channelsData.length + 1 },
                { name: "Sample TV 2", type: "TV", category: "News", streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", id: window.channelsData.length + 2 }
            ];
            window.channelsData = [...window.channelsData, ...tvSamples];
        }
        
        if (!hasRadio) {
            const radioSamples = [
                { name: "Heart FM", type: "Radio", category: "Music", streamUrl: "https://icecast.radio.com/heartfm.mp3", id: window.channelsData.length + 1 },
                { name: "News Radio", type: "Radio", category: "News", streamUrl: "https://icecast.radio.com/news.mp3", id: window.channelsData.length + 2 }
            ];
            window.channelsData = [...window.channelsData, ...radioSamples];
        }
        
        if (!hasMovies) {
            const moviesSamples = [
                { name: "Action Movies", type: "Movies", category: "Movies", streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", id: window.channelsData.length + 1, isEmbed: false },
                { name: "Classic Movies", type: "Movies", category: "Movies", streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", id: window.channelsData.length + 2, isEmbed: false }
            ];
            window.channelsData = [...window.channelsData, ...moviesSamples];
        }
        
        return true;
    } catch (err) {
        console.warn("fetch failed, using fallback sample", err);
        const fallbackSample = [
            { "name": "Kapamilya Channel", "type": "TV", "category": "Entertainment", "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", id: 1 },
            { "name": "GMA 7", "type": "TV", "category": "Entertainment", "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", id: 2 },
            { "name": "CNN International", "type": "TV", "category": "News", "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", id: 3 },
            { "name": "Radio Sample 1", "type": "Radio", "category": "Music", "streamUrl": "https://icecast.radio.com/stream.mp3", id: 4 },
            { "name": "Radio Sample 2", "type": "Radio", "category": "News", "streamUrl": "https://icecast.radio.com/stream2.mp3", id: 5 },
            { "name": "Action Movies", "type": "Movies", "category": "Movies", "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", id: 6 },
            { "name": "Classic Movies", "type": "Movies", "category": "Movies", "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", id: 7 }
        ];
        window.channelsData = fallbackSample;
        showError("Loaded sample channels. Please ensure channels.json is in the same folder.");
        return true;
    }
}

// Mode change handler - Supports TV, Radio, and Movies
function onModeChange(mode) {
    window.currentMode = mode;
    console.log(`Mode changed to: ${mode}`);
    
    // Update header UI
    if (headerComponent) headerComponent.updateModeUI(mode);
    
    // Update player UI
    if (playerComponent) playerComponent.updateModeUI(mode);
    
    // Reset filters
    window.currentCategory = "all";
    window.currentFilter = "all";
    window.searchQuery = "";
    
    // Update sidebar
    if (sidebarComponent) {
        sidebarComponent.resetFilters();
        sidebarComponent.updateCategoriesDropdown();
        sidebarComponent.renderChannelList();
    }
}

// Filter change handler
function onFilterChange() {
    if (sidebarComponent) {
        sidebarComponent.renderChannelList();
    }
}

// Category change handler
function onCategoryChange() {
    if (sidebarComponent) {
        sidebarComponent.renderChannelList();
    }
}

// Search change handler
function onSearchChange() {
    if (sidebarComponent) {
        sidebarComponent.renderChannelList();
    }
}

// Global channel switching lock
window.isSwitchingChannel = false;
window.channelSwitchTimeout = null;

// Channel select handler - PLAYS CHANNEL AUTOMATICALLY
async function onChannelSelect(channel) {
    if (!playerComponent) return;
    
    console.log("Selected channel:", channel.name, "Type:", channel.type);
    
    // Prevent rapid switching
    if (window.isSwitchingChannel) {
        console.log("Already switching channel, waiting...");
        await new Promise(resolve => {
            const checkLock = setInterval(() => {
                if (!window.isSwitchingChannel) {
                    clearInterval(checkLock);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(checkLock);
                console.log("Lock timeout, forcing clear...");
                window.isSwitchingChannel = false;
                if (window.channelSwitchTimeout) clearTimeout(window.channelSwitchTimeout);
                resolve();
            }, 3000);
        });
        console.log("Lock cleared, playing channel...");
    }
    
    window.isSwitchingChannel = true;
    
    if (window.channelSwitchTimeout) {
        clearTimeout(window.channelSwitchTimeout);
    }
    
    try {
        await playerComponent.destroyPlayers();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const success = await playerComponent.playChannel(channel);
        
        if (success) {
            console.log("Channel playing successfully:", channel.name);
        } else {
            console.error("Failed to play channel:", channel.name);
            showError(`Failed to play ${channel.name}. Check stream URL.`);
        }
    } catch (error) {
        console.error("Error playing channel:", error);
        showError(`Error playing ${channel.name}: ${error.message}`);
    } finally {
        window.channelSwitchTimeout = setTimeout(() => {
            window.isSwitchingChannel = false;
            window.channelSwitchTimeout = null;
        }, 2000);
    }
}

// Initialize Firebase Chat
async function initFirebaseFeatures() {
    // Wait for Firebase to be ready
    if (typeof initFirebaseChat === 'function') {
        try {
            // Wait for Firebase SDK to be ready
            let retries = 0;
            const maxRetries = 10;
            
            while (!window.firestore && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }
            
            if (window.firestore) {
                firebaseChatInstance = initFirebaseChat();
                console.log("Firebase Chat initialized successfully");
                
                // Request notification permission after user interaction
                const requestNotificationPermission = () => {
                    if ('Notification' in window && Notification.permission === 'default') {
                        Notification.requestPermission();
                    }
                };
                
                // Request after first user interaction
                document.addEventListener('click', requestNotificationPermission, { once: true });
                document.addEventListener('touchstart', requestNotificationPermission, { once: true });
            } else {
                console.warn("Firestore not available, chat features disabled");
            }
        } catch (error) {
            console.error("Failed to initialize Firebase Chat:", error);
        }
    } else {
        console.log("Firebase chat module not loaded yet, will retry...");
        // Retry after a delay
        setTimeout(() => initFirebaseFeatures(), 2000);
    }
}

// Check for network connectivity and handle offline mode
function setupNetworkHandlers() {
    window.addEventListener('online', () => {
        console.log('App is online');
        if (window.showToast) {
            window.showToast('Connection restored! 🎉');
        }
        
        // Reload channels when coming back online
        if (window.channelsData) {
            loadChannelsFromJson().then(() => {
                if (sidebarComponent) {
                    sidebarComponent.updateCategoriesDropdown();
                    sidebarComponent.renderChannelList();
                }
            });
        }
        
        // Retry playing current channel if needed
        if (playerComponent && playerComponent.currentChannel) {
            setTimeout(() => {
                playerComponent.playChannel(playerComponent.currentChannel);
            }, 1000);
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('App is offline');
        if (window.showToast) {
            window.showToast('You are offline. Check your internet connection.', 5000);
        }
    });
}

// Initialize application
async function initApp() {
    // Check version first
    const versionUpdated = checkAppVersion();
    if (versionUpdated) {
        console.log(`App version ${APP_VERSION} initialized`);
    }
    
    console.log("Initializing JUZT IPTV App...");
    
    // Create components
    headerComponent = new HeaderComponent();
    sidebarComponent = new SidebarComponent();
    playerComponent = new PlayerComponent();
    
    window.sidebarComponent = sidebarComponent;
    
    // Render components
    headerComponent.render();
    sidebarComponent.render();
    playerComponent.render();
    
    // Set global callbacks
    window.onModeChange = onModeChange;
    window.onFilterChange = onFilterChange;
    window.onCategoryChange = onCategoryChange;
    window.onSearchChange = onSearchChange;
    window.onChannelSelect = onChannelSelect;
    
    // Load channels
    await loadChannelsFromJson();
    
    if (window.channelsData.length === 0) {
        showError("No channels loaded. Check data source.");
        return;
    }
    
    // Build categories dropdown
    sidebarComponent.updateCategoriesDropdown();
    
    // Initialize Fullscreen Manager
    const videoContainer = document.getElementById('videoContainer');
    const videoPlayer = document.getElementById('videoPlayer');
    const sidebar = document.getElementById('channelSidebar');
    const header = document.getElementById('appHeader');
    
    fullscreenManager = new FullscreenManager();
    fullscreenManager.init(videoContainer, videoPlayer, sidebar, header);
    
    // Initialize Gesture Controls
    if (videoPlayer && videoContainer) {
        gestureControls = new GestureControls(videoPlayer, videoContainer);
    }
    
    // Start in TV mode
    onModeChange("tv");
    
    // Register Service Worker for PWA
    await registerServiceWorker();
    
    // Initialize PWA Installer
    window.pwaInstaller = new PWAInstaller();
    
    // Initialize Firebase features (chat and announcements)
    await initFirebaseFeatures();
    
    // Setup network handlers
    setupNetworkHandlers();
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
        console.log("Orientation changed - manual fullscreen only");
    });
    
    // Listen for video play events
    if (playerComponent && playerComponent.videoPlayer) {
        playerComponent.videoPlayer.addEventListener('play', () => {
            console.log("Video playing");
        });
    }
    
    // Log app initialization
    console.log("✅ JUZT IPTV App Initialized");
    console.log(`📺 Loaded ${window.channelsData.length} channels`);
    console.log(`📺 TV Channels: ${window.channelsData.filter(ch => ch.type === "TV").length}`);
    console.log(`🎵 Radio Stations: ${window.channelsData.filter(ch => ch.type === "Radio").length}`);
    console.log(`🎬 Movies: ${window.channelsData.filter(ch => ch.type === "Movies").length}`);
    console.log(`📱 App Version: ${APP_VERSION}`);
    
    const pwaStatus = window.pwaInstaller.getInstallStatus();
    console.log(`📱 PWA Status: ${pwaStatus.isInstalled ? 'Installed' : 'Not Installed'}, Can Install: ${pwaStatus.canInstall}`);
    
    // Hide splash screen if still visible
    const splashElement = document.getElementById('splashScreen');
    if (splashElement && splashElement.style.opacity !== '0') {
        setTimeout(() => {
            if (splashElement) {
                splashElement.classList.add('fade-out');
                setTimeout(() => {
                    if (splashElement && splashElement.parentNode) {
                        splashElement.remove();
                    }
                    document.body.classList.remove('splash-active');
                }, 500);
            }
        }, 500);
    }
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log("App hidden - background state");
    } else {
        console.log("App visible - refreshing UI");
        if (sidebarComponent) {
            sidebarComponent.renderChannelList();
        }
        // Check for updates when returning to page
        if (window.navigator && window.navigator.serviceWorker) {
            window.navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                    registration.update();
                }
            });
        }
    }
});

// Handle before unload
window.addEventListener('beforeunload', () => {
    if (gestureControls && gestureControls.destroy) {
        gestureControls.destroy();
    }
    
    if (fullscreenManager && fullscreenManager.destroy) {
        fullscreenManager.destroy();
    }
    
    if (window.channelSwitchTimeout) {
        clearTimeout(window.channelSwitchTimeout);
    }
    
    // Clean up Firebase if needed
    if (firebaseChatInstance && firebaseChatInstance.destroy) {
        firebaseChatInstance.destroy();
    }
});

// Start application
initApp().catch(err => {
    console.error("Init error:", err);
    showError("Failed to initialize app: " + err.message);
});

// ======================== CACHE CLEAR UTILITY ========================
window.clearAppCache = async function() {
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => {
                    console.log('Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
            console.log('All caches cleared');
            
            // Clear version storage to force full reload
            localStorage.removeItem(STORAGE_VERSION_KEY);
            
            if (window.showToast) {
                window.showToast('Cache cleared! Refreshing...');
            }
            
            setTimeout(() => {
                window.location.reload(true);
            }, 1000);
            
            return true;
        } catch (error) {
            console.error('Error clearing cache:', error);
            if (window.showToast) {
                window.showToast('Failed to clear cache');
            }
            return false;
        }
    }
    return false;
};

// ======================== FORCE REFRESH UTILITY ========================
window.forceRefresh = function() {
    localStorage.removeItem(STORAGE_VERSION_KEY);
    window.location.reload(true);
};

// ======================== EXPORT FIREBASE CHAT INSTANCE ========================
window.getFirebaseChat = function() {
    return firebaseChatInstance;
};

// Log version on console
console.log(`%cJUZT IPTV v${APP_VERSION}`, 'color: #f97316; font-size: 14px; font-weight: bold;');
console.log('%c🔥 Firebase Chat & Announcements ready', 'color: #9aa2bf; font-size: 12px;');
console.log('%c💬 Admin password: JUZT_ADMIN_2026', 'color: #9aa2bf; font-size: 12px;');
