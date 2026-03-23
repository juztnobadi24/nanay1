// ======================== MAIN APPLICATION ========================

let headerComponent;
let sidebarComponent;
let playerComponent;
let fullscreenManager;
let gestureControls;

// Load channels from JSON
async function loadChannelsFromJson() {
    try {
        const response = await fetch('./channels.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const jsonData = await response.json();
        window.channelsData = jsonData.map((ch, index) => ({ 
            ...ch, 
            id: index + 1,
            type: ch.type || (ch.category === "Radio" ? "Radio" : "TV")
        }));
        
        const hasRadio = window.channelsData.some(ch => ch.type === "Radio");
        if (!hasRadio) {
            const radioSamples = [
                { name: "Heart FM", type: "Radio", category: "Music", streamUrl: "https://icecast.radio.com/heartfm.mp3", id: window.channelsData.length + 1 },
                { name: "News Radio", type: "Radio", category: "News", streamUrl: "https://icecast.radio.com/news.mp3", id: window.channelsData.length + 2 },
                { name: "Classic Rock Radio", type: "Radio", category: "Music", streamUrl: "https://icecast.radio.com/rock.mp3", id: window.channelsData.length + 3 }
            ];
            window.channelsData = [...window.channelsData, ...radioSamples];
        }
        
        return true;
    } catch (err) {
        console.warn("fetch failed, using fallback sample", err);
        const fallbackSample = [
            { "name": "Kapamilya Channel", "type": "TV", "category": "Entertainment", "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
            { "name": "GMA 7", "type": "TV", "category": "Entertainment", "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
            { "name": "CNN International", "type": "TV", "category": "News", "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
            { "name": "Radio Sample 1", "type": "Radio", "category": "Music", "streamUrl": "https://icecast.radio.com/stream.mp3" },
            { "name": "Radio Sample 2", "type": "Radio", "category": "News", "streamUrl": "https://icecast.radio.com/stream2.mp3" }
        ];
        window.channelsData = fallbackSample.map((ch, index) => ({ ...ch, id: index + 1 }));
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

// Channel select handler - PLAYS CHANNEL AUTOMATICALLY
async function onChannelSelect(channel) {
    if (!playerComponent) return;
    
    console.log("Selected channel:", channel.name);
    
    // Hide address bar on channel selection
    hideAddressBar();
    
    // Prevent rapid switching
    if (window.isSwitchingChannel) {
        console.log("Already switching channel, ignoring...");
        return;
    }
    
    window.isSwitchingChannel = true;
    
    try {
        // Play the channel
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
        // Reset switching flag after a delay
        setTimeout(() => {
            window.isSwitchingChannel = false;
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
                console.log("Firebase Chat initialized successfully");
            } catch (error) {
                console.error("Failed to initialize Firebase Chat:", error);
            }
        } else {
            console.warn("Firebase Chat not available. Running without chat features.");
        }
    }, 1000);
}

// Function to hide browser address bar on mobile - AGGRESSIVE VERSION
function hideAddressBar() {
    // Force scroll to top to trigger address bar hiding
    window.scrollTo(0, 0);
    
    // Also try to scroll the document element
    if (document.documentElement) {
        document.documentElement.scrollTop = 0;
    }
    
    // Also try to scroll the body
    if (document.body) {
        document.body.scrollTop = 0;
    }
    
    // For iOS, need additional measures
    if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
        setTimeout(() => {
            window.scrollTo(0, 0);
            if (document.documentElement) document.documentElement.scrollTop = 0;
            if (document.body) document.body.scrollTop = 0;
        }, 10);
        
        setTimeout(() => {
            window.scrollTo(0, 0);
            window.dispatchEvent(new Event('scroll'));
        }, 50);
        
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    }
    
    // For Android, multiple attempts
    if (navigator.userAgent.match(/Android/i)) {
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 10);
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 50);
    }
}

// Setup address bar hiding on ALL user interactions - COMPREHENSIVE
function setupHideAddressBar() {
    console.log("Setting up aggressive address bar hiding on ALL interactions...");
    
    // Hide immediately on load
    hideAddressBar();
    
    // Hide multiple times after load to ensure it's hidden
    setTimeout(hideAddressBar, 100);
    setTimeout(hideAddressBar, 300);
    setTimeout(hideAddressBar, 500);
    setTimeout(hideAddressBar, 1000);
    setTimeout(hideAddressBar, 2000);
    setTimeout(hideAddressBar, 3000);
    
    // Complete list of all possible user interaction events
    const allEvents = [
        // Touch events
        'touchstart', 'touchmove', 'touchend', 'touchcancel',
        // Mouse events
        'mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 
        'mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'wheel',
        // Keyboard events
        'keydown', 'keyup', 'keypress',
        // Form events
        'focus', 'blur', 'change', 'input', 'submit', 'reset',
        // Drag events
        'dragstart', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'drop',
        // Scroll and resize
        'scroll', 'resize',
        // Gesture events
        'gesturestart', 'gesturechange', 'gestureend',
        // Device orientation
        'orientationchange',
        // Page visibility
        'pageshow', 'pagehide',
        // Loading events
        'load', 'DOMContentLoaded',
        // Animation events
        'animationstart', 'animationend', 'animationiteration',
        // Transition events
        'transitionstart', 'transitionend', 'transitionrun',
        // Media events
        'play', 'pause', 'volumechange', 'timeupdate', 'seeking', 'seeked',
        // Fullscreen events
        'fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'
    ];
    
    // Add event listeners to window
    allEvents.forEach(event => {
        window.addEventListener(event, hideAddressBar, { passive: false, capture: true });
    });
    
    // Add event listeners to document
    allEvents.forEach(event => {
        document.addEventListener(event, hideAddressBar, { passive: false, capture: true });
    });
    
    // Add event listeners to document body
    allEvents.forEach(event => {
        if (document.body) {
            document.body.addEventListener(event, hideAddressBar, { passive: false, capture: true });
        }
    });
    
    // Monitor the app container
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        allEvents.forEach(event => {
            appContainer.addEventListener(event, hideAddressBar, { passive: false, capture: true });
        });
    }
    
    // Monitor the video container
    const videoContainer = document.getElementById('videoContainer');
    if (videoContainer) {
        allEvents.forEach(event => {
            videoContainer.addEventListener(event, hideAddressBar, { passive: false, capture: true });
        });
    }
    
    // Monitor the video player
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        allEvents.forEach(event => {
            videoPlayer.addEventListener(event, hideAddressBar, { passive: false, capture: true });
        });
    }
    
    // Monitor the sidebar
    const sidebar = document.getElementById('channelSidebar');
    if (sidebar) {
        allEvents.forEach(event => {
            sidebar.addEventListener(event, hideAddressBar, { passive: false, capture: true });
        });
    }
    
    // Monitor the header
    const header = document.getElementById('appHeader');
    if (header) {
        allEvents.forEach(event => {
            header.addEventListener(event, hideAddressBar, { passive: false, capture: true });
        });
    }
    
    // Monitor DOM mutations to capture dynamically added elements
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Add event listeners to new elements
                        allEvents.forEach(event => {
                            node.addEventListener(event, hideAddressBar, { passive: false, capture: true });
                        });
                    }
                });
            }
        });
        // Also hide address bar on any DOM change
        hideAddressBar();
    });
    
    observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        characterData: true 
    });
    
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            hideAddressBar();
            setTimeout(hideAddressBar, 50);
            setTimeout(hideAddressBar, 100);
        }
    });
    
    // Handle focus events
    window.addEventListener('focus', () => {
        hideAddressBar();
        setTimeout(hideAddressBar, 50);
    });
    
    // Periodic check every 500ms to ensure address bar stays hidden
    let lastScrollPosition = window.scrollY;
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            // If scrolled down, immediately scroll back up
            if (window.scrollY > 0 || document.documentElement.scrollTop > 0 || document.body.scrollTop > 0) {
                hideAddressBar();
            } else {
                // Even if at top, force a tiny scroll to keep address bar hidden
                window.scrollTo(0, 0);
            }
        }
    }, 500);
    
    // Special scroll handler to prevent address bar from showing
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (window.scrollY > 5) {
                hideAddressBar();
            }
        }, 10);
        hideAddressBar();
    }, { passive: false, capture: true });
    
    // Handle fullscreen changes
    const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'];
    fullscreenEvents.forEach(event => {
        document.addEventListener(event, () => {
            setTimeout(hideAddressBar, 50);
            setTimeout(hideAddressBar, 100);
            setTimeout(hideAddressBar, 200);
        });
    });
    
    // Also capture all clicks globally
    document.addEventListener('click', hideAddressBar, { capture: true });
    document.addEventListener('touchstart', hideAddressBar, { capture: true });
    
    console.log("✅ Address bar hiding enabled - will hide on EVERY interaction");
}

// Also expose hideAddressBar globally
window.hideAddressBar = hideAddressBar;

// Initialize application
async function initApp() {
    console.log("Initializing JUZT IPTV App...");
    
    // First, setup address bar hiding (before anything else)
    setupHideAddressBar();
    
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
    
    // Initialize Fullscreen Manager
    const videoContainer = document.getElementById('videoContainer');
    const videoPlayer = document.getElementById('videoPlayer');
    const sidebar = document.getElementById('channelSidebar');
    const header = document.getElementById('appHeader');
    
    fullscreenManager = new FullscreenManager();
    fullscreenManager.init(videoContainer, videoPlayer, sidebar, header);
    
    // Initialize Gesture Controls (brightness & volume)
    if (videoPlayer && videoContainer) {
        gestureControls = new GestureControls(videoPlayer, videoContainer);
    }
    
    // Start in TV mode
    onModeChange("tv");
    
    // Initialize Firebase features (chat & notifications)
    initFirebaseFeatures();
    
    // Force check orientation after a short delay to ensure layout is ready
    setTimeout(() => {
        if (fullscreenManager) {
            fullscreenManager.checkAndApplyFullscreen();
        }
        // Also hide address bar again after layout settles
        hideAddressBar();
    }, 1000);
    
    // Also listen for video play to trigger fullscreen check and hide address bar
    if (playerComponent && playerComponent.videoPlayer) {
        playerComponent.videoPlayer.addEventListener('play', () => {
            setTimeout(() => {
                if (fullscreenManager) {
                    fullscreenManager.checkAndApplyFullscreen();
                }
                hideAddressBar();
            }, 200);
        });
        
        // Also hide address bar when video is clicked/tapped
        playerComponent.videoPlayer.addEventListener('click', hideAddressBar);
        playerComponent.videoPlayer.addEventListener('touchstart', hideAddressBar);
        playerComponent.videoPlayer.addEventListener('touchmove', hideAddressBar);
        playerComponent.videoPlayer.addEventListener('touchend', hideAddressBar);
        
        // Hide address bar on video volume/slider changes
        playerComponent.videoPlayer.addEventListener('volumechange', hideAddressBar);
        playerComponent.videoPlayer.addEventListener('seeking', hideAddressBar);
        playerComponent.videoPlayer.addEventListener('seeked', hideAddressBar);
    }
    
    // Hide address bar after any modal closes
    const modalObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const modal = mutation.target;
                if (modal.classList && !modal.classList.contains('show')) {
                    setTimeout(hideAddressBar, 100);
                    setTimeout(hideAddressBar, 200);
                }
            }
        });
    });
    
    // Observe modals for class changes
    const checkForModals = setInterval(() => {
        const modals = ['chatModal', 'notificationsModal', 'settingsModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && !modal._observed) {
                modalObserver.observe(modal, { attributes: true });
                modal._observed = true;
            }
        });
    }, 1000);
    
    // Also hide address bar when page becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(hideAddressBar, 100);
            setTimeout(hideAddressBar, 200);
        }
    });
    
    // Hide address bar on any input focus
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            setTimeout(hideAddressBar, 100);
        }
        hideAddressBar();
    });
    
    // Log app initialization
    console.log("✅ JUZT IPTV App Initialized");
    console.log(`📺 Loaded ${window.channelsData.length} channels`);
    console.log(`📺 TV Channels: ${window.channelsData.filter(ch => ch.type === "TV").length}`);
    console.log(`🎵 Radio Stations: ${window.channelsData.filter(ch => ch.type === "Radio").length}`);
    console.log("📍 Address bar will hide on EVERY interaction");
}

// Handle page visibility changes (for notifications)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log("App hidden - notifications will still work");
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
        // Hide address bar when becoming visible again
        setTimeout(hideAddressBar, 100);
        setTimeout(hideAddressBar, 200);
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    showError("Connection restored! 🎉");
    console.log("App is online");
    
    // Reload current channel if offline mode was active
    if (playerComponent && playerComponent.currentChannel) {
        setTimeout(() => {
            playerComponent.playChannel(playerComponent.currentChannel);
        }, 1000);
    }
    
    // Hide address bar
    hideAddressBar();
});

window.addEventListener('offline', () => {
    showError("You're offline. Check your internet connection.");
    console.log("App is offline");
});

// Handle before unload to clean up
window.addEventListener('beforeunload', () => {
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
});

// Start application
initApp().catch(err => {
    console.error("Init error:", err);
    showError("Failed to initialize app: " + err.message);
});
