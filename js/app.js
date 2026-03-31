// ======================== MAIN APPLICATION ========================

let headerComponent;
let sidebarComponent;
let playerComponent;
let fullscreenManager;
let gestureControls;

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

// ======================== SERVICE WORKER REGISTRATION ========================
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered with scope:', registration.scope);
            
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
            console.error('Service Worker registration failed:', error);
            return false;
        }
    }
    console.log('Service Worker not supported');
    return false;
}

// Load channels from JSON
async function loadChannelsFromJson() {
    try {
        const response = await fetch('./channels.json');
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

// Initialize Firebase Chat features
function initFirebaseFeatures() {
    setTimeout(() => {
        if (typeof initFirebaseChat === 'function') {
            try {
                initFirebaseChat();
                console.log("Firebase Chat initialized successfully");
            } catch (error) {
                console.error("Failed to initialize Firebase Chat:", error);
            }
        } else {
            console.warn("Firebase Chat not available. Running without chat features.");
        }
    }, 1000);
}

// Initialize application
async function initApp() {
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
    
    // Initialize Firebase features
    initFirebaseFeatures();
    
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
    
    const pwaStatus = window.pwaInstaller.getInstallStatus();
    console.log(`📱 PWA Status: ${pwaStatus.isInstalled ? 'Installed' : 'Not Installed'}, Can Install: ${pwaStatus.canInstall}`);
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log("App hidden - notifications will still work");
    } else {
        console.log("App visible - refreshing UI");
        if (sidebarComponent) {
            sidebarComponent.renderChannelList();
        }
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    showError("Connection restored! 🎉");
    console.log("App is online");
    
    if (playerComponent && playerComponent.currentChannel) {
        setTimeout(() => {
            playerComponent.playChannel(playerComponent.currentChannel);
        }, 1000);
    }
});

window.addEventListener('offline', () => {
    showError("You're offline. Check your internet connection.");
    console.log("App is offline");
});

// Handle before unload
window.addEventListener('beforeunload', () => {
    if (window.firebaseChat && window.firebaseChat.destroy) {
        window.firebaseChat.destroy();
    }
    
    if (gestureControls && gestureControls.destroy) {
        gestureControls.destroy();
    }
    
    if (fullscreenManager && fullscreenManager.destroy) {
        fullscreenManager.destroy();
    }
    
    if (window.channelSwitchTimeout) {
        clearTimeout(window.channelSwitchTimeout);
    }
});

// Start application
initApp().catch(err => {
    console.error("Init error:", err);
    showError("Failed to initialize app: " + err.message);
});
