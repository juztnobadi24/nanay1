// ======================== MAIN APPLICATION ========================

let headerComponent;
let sidebarComponent;
let playerComponent;
let fullscreenManager;
let gestureControls;

// Configure Shaka player for better DRM support
function configureShakaPolyfills() {
    if (typeof shaka !== 'undefined') {
        try {
            // Install polyfills for older browsers
            if (shaka.polyfill && shaka.polyfill.installAll) {
                shaka.polyfill.installAll();
                console.log("✅ Shaka polyfills installed");
            }
            
            // Set default DRM configuration
            if (shaka.Player && shaka.Player.prototype.configure) {
                console.log("✅ Shaka Player available for DRM streams");
            }
        } catch (error) {
            console.warn("Shaka polyfill error:", error);
        }
    }
}

// Load channels from JSON
async function loadChannelsFromJson() {
    try {
        const response = await fetch('./channels.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const jsonData = await response.json();
        
        // Process channels - add IDs and ensure stream URLs are valid
        window.channelsData = jsonData.map((ch, index) => ({ 
            ...ch, 
            id: index + 1,
            type: ch.type || (ch.category === "Radio" ? "Radio" : "TV"),
            // Flag if channel has DRM
            hasDrm: !!(ch.drm && (Object.keys(ch.drm).length > 0))
        }));
        
        console.log(`✅ Loaded ${window.channelsData.length} channels from JSON`);
        console.log(`   - TV Channels: ${window.channelsData.filter(ch => ch.type === "TV").length}`);
        console.log(`   - Radio Stations: ${window.channelsData.filter(ch => ch.type === "Radio").length}`);
        console.log(`   - DRM Protected: ${window.channelsData.filter(ch => ch.hasDrm).length}`);
        
        // Check for channels with potential expired tokens
        const expiredWarning = window.channelsData.filter(ch => {
            return ch.streamUrl && (ch.streamUrl.includes('AuthInfo') || ch.streamUrl.includes('Expires='));
        });
        if (expiredWarning.length > 0) {
            console.warn(`⚠️ ${expiredWarning.length} channels have auth tokens that may expire`);
        }
        
        return true;
    } catch (err) {
        console.warn("Fetch failed, using fallback sample", err);
        const fallbackSample = [
            { "name": "Kapamilya Channel", "type": "TV", "category": "Entertainment", "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
            { "name": "GMA 7", "type": "TV", "category": "Entertainment", "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
            { "name": "CNN International", "type": "TV", "category": "News", "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
            { "name": "Radio Sample 1", "type": "Radio", "category": "Music", "streamUrl": "https://icecast.radio.com/stream.mp3" }
        ];
        window.channelsData = fallbackSample.map((ch, index) => ({ ...ch, id: index + 1, hasDrm: false }));
        showError("Loaded sample channels. Please ensure channels.json is in the same folder.");
        return true;
    }
}

// Mode change handler
function onModeChange(mode) {
    window.currentMode = mode;
    
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
    
    console.log(`Mode changed to: ${mode}`);
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

// Channel select handler - PLAYS CHANNEL AUTOMATICALLY with retry logic
async function onChannelSelect(channel) {
    if (!playerComponent) return;
    
    console.log("Selected channel:", channel.name, channel.hasDrm ? "(DRM Protected)" : "");
    
    // Prevent rapid switching
    if (window.isSwitchingChannel) {
        console.log("Already switching channel, ignoring...");
        return;
    }
    
    window.isSwitchingChannel = true;
    
    // Show loading indicator in player
    if (playerComponent.videoContainer) {
        playerComponent.videoContainer.style.opacity = '0.8';
    }
    
    try {
        // Play the channel with retry for DRM streams
        let success = await playerComponent.playChannel(channel);
        
        // If first attempt fails and channel has DRM, try once more with a small delay
        if (!success && channel.hasDrm) {
            console.log("First attempt failed, retrying DRM stream...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            success = await playerComponent.playChannel(channel);
        }
        
        if (success) {
            console.log("Channel playing successfully:", channel.name);
        } else {
            console.error("Failed to play channel:", channel.name);
            
            // Provide more helpful error message based on channel type
            let errorMsg = `Failed to play ${channel.name}. `;
            if (channel.hasDrm) {
                errorMsg += "This channel uses DRM protection. Make sure you're using a compatible browser (Chrome, Edge, or Firefox) and try again.";
            } else if (channel.streamUrl.includes('AuthInfo')) {
                errorMsg += "The stream URL may have expired. Please refresh the page and try again.";
            } else {
                errorMsg += "Check your internet connection and try again.";
            }
            showError(errorMsg);
        }
    } catch (error) {
        console.error("Error playing channel:", error);
        let errorMsg = `Error playing ${channel.name}: `;
        
        if (error.message.includes('LICENSE') || error.message.includes('DRM')) {
            errorMsg += "DRM license error. Please ensure your browser supports Widevine DRM.";
        } else if (error.message.includes('NETWORK')) {
            errorMsg += "Network error. Check your internet connection.";
        } else {
            errorMsg += error.message;
        }
        showError(errorMsg);
    } finally {
        // Reset loading flag and restore opacity
        setTimeout(() => {
            window.isSwitchingChannel = false;
            if (playerComponent.videoContainer) {
                playerComponent.videoContainer.style.opacity = '1';
            }
        }, 1000);
    }
}

// Initialize Firebase Chat features
function initFirebaseFeatures() {
    // Wait for DOM and Firebase to be ready
    setTimeout(() => {
        // Check if Firebase is available and initialized
        if (typeof initFirebaseChat === 'function') {
            try {
                initFirebaseChat();
                console.log("✅ Firebase Chat initialized successfully");
            } catch (error) {
                console.error("Failed to initialize Firebase Chat:", error);
            }
        } else {
            console.warn("Firebase Chat not available. Running without chat features.");
        }
    }, 1000);
}

// Check browser compatibility for DRM
function checkBrowserCompatibility() {
    const ua = navigator.userAgent;
    const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua);
    const isEdge = /Edg/.test(ua);
    const isFirefox = /Firefox/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    
    let drmSupport = "Unknown";
    let widevineSupport = false;
    
    // Check for Widevine (Chrome/Edge/Firefox)
    if (isChrome || isEdge) {
        widevineSupport = true;
        drmSupport = "Widevine supported";
    } else if (isFirefox) {
        widevineSupport = true;
        drmSupport = "Widevine supported (may need to enable in settings)";
    } else if (isSafari) {
        drmSupport = "FairPlay supported";
        widevineSupport = false;
    }
    
    console.log("Browser Compatibility:");
    console.log(`  - Browser: ${isChrome ? 'Chrome' : isEdge ? 'Edge' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Other'}`);
    console.log(`  - DRM Support: ${drmSupport}`);
    console.log(`  - Widevine: ${widevineSupport ? '✅ Yes' : '❌ No'}`);
    
    return { widevineSupport, drmSupport, browser: isChrome ? 'chrome' : isEdge ? 'edge' : isFirefox ? 'firefox' : isSafari ? 'safari' : 'other' };
}

// Initialize application
async function initApp() {
    console.log("🚀 Initializing JUZT IPTV App...");
    
    // Check browser compatibility for DRM
    const browserInfo = checkBrowserCompatibility();
    
    // Configure Shaka polyfills
    configureShakaPolyfills();
    
    // Create components
    headerComponent = new HeaderComponent();
    sidebarComponent = new SidebarComponent();
    playerComponent = new PlayerComponent();
    
    // Store sidebar reference globally for player to use
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
    
    // Get video container and player elements
    const videoContainer = document.getElementById('videoContainer');
    const videoPlayer = document.getElementById('videoPlayer');
    const sidebar = document.getElementById('channelSidebar');
    const header = document.getElementById('appHeader');
    
    // Initialize Fullscreen Manager
    fullscreenManager = new FullscreenManager();
    if (videoContainer && videoPlayer) {
        fullscreenManager.init(videoContainer, videoPlayer, sidebar, header);
    }
    
    // Initialize Gesture Controls (brightness & volume)
    if (videoPlayer && videoContainer) {
        gestureControls = new GestureControls(videoPlayer, videoContainer);
    }
    
    // Start in TV mode
    onModeChange("tv");
    
    // Initialize Firebase features (chat & notifications)
    initFirebaseFeatures();
    
    // Log app initialization complete
    console.log("✅ JUZT IPTV App Initialized Successfully");
    console.log(`📺 Total Channels: ${window.channelsData.length}`);
    console.log(`📺 TV Channels: ${window.channelsData.filter(ch => ch.type === "TV").length}`);
    console.log(`🎵 Radio Stations: ${window.channelsData.filter(ch => ch.type === "Radio").length}`);
    console.log(`🔒 DRM Protected: ${window.channelsData.filter(ch => ch.hasDrm).length}`);
    
    // Show DRM warning if needed
    if (window.channelsData.some(ch => ch.hasDrm) && !browserInfo.widevineSupport) {
        console.warn("⚠️ Some channels require Widevine DRM which may not be fully supported in this browser");
        // Don't show error, just console warning - let it try anyway
    }
    
    // Auto-select first channel (optional)
    const firstChannel = window.channelsData.find(ch => ch.type === "TV");
    if (firstChannel) {
        console.log("Auto-playing first channel:", firstChannel.name);
        setTimeout(() => {
            onChannelSelect(firstChannel);
        }, 1000);
    }
}

// Handle page visibility changes (for notifications)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log("App hidden - background mode");
    } else {
        console.log("App visible - refreshing UI");
        // Refresh channel list if needed
        if (sidebarComponent) {
            sidebarComponent.renderChannelList();
        }
        // Clear any pending notifications
        if (window.firebaseChat) {
            const badge = document.querySelector('.message-badge');
            if (badge && document.hasFocus()) {
                window.firebaseChat.unreadCount = 0;
                window.firebaseChat.updateBadge();
            }
        }
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    showError("Connection restored! 🎉");
    console.log("App is online");
    
    // Reload current channel if offline mode was active
    if (playerComponent && playerComponent.currentChannel) {
        setTimeout(() => {
            console.log("Reloading current channel after reconnection...");
            playerComponent.playChannel(playerComponent.currentChannel);
        }, 1000);
    }
});

window.addEventListener('offline', () => {
    showError("You're offline. Check your internet connection.");
    console.log("App is offline");
});

// Handle before unload to clean up
window.addEventListener('beforeunload', () => {
    console.log("Cleaning up app resources...");
    // Clean up Firebase listeners if needed
    if (window.firebaseChat && window.firebaseChat.destroy) {
        window.firebaseChat.destroy();
    }
    
    // Clean up gesture controls
    if (gestureControls && gestureControls.destroy) {
        gestureControls.destroy();
    }
    
    // Clean up fullscreen manager
    if (fullscreenManager && fullscreenManager.destroy) {
        fullscreenManager.destroy();
    }
    
    // Clean up players
    if (playerComponent && playerComponent.destroyPlayers) {
        playerComponent.destroyPlayers();
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    if (event.reason && event.reason.message) {
        if (event.reason.message.includes('DRM') || event.reason.message.includes('license')) {
            console.warn("DRM-related error - this may be due to browser restrictions");
        }
    }
});

// Start application with error handling
initApp().catch(err => {
    console.error("Fatal init error:", err);
    showError("Failed to initialize app: " + err.message);
    
    // Try to recover by showing a fallback UI
    if (document.getElementById('playerArea')) {
        document.getElementById('playerArea').innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f97316;"></i>
                <h3>Failed to initialize player</h3>
                <p>Please refresh the page to try again.</p>
                <button onclick="location.reload()" style="background: #f97316; border: none; padding: 8px 20px; border-radius: 8px; color: white; cursor: pointer; margin-top: 1rem;">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        `;
    }
});
