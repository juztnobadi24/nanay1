// ======================== UTILITY FUNCTIONS ========================

// Global state
window.channelsData = [];
window.filteredChannels = [];
window.activeChannelId = null;
window.currentFilter = "all"; // 'all', 'favorites'
window.currentCategory = "all";
window.searchQuery = "";
window.currentMode = "tv"; // 'tv' or 'radio'
window.favorites = JSON.parse(localStorage.getItem('channelFavorites') || '[]');

// DOM References (will be set by components)
window.domElements = {};

// Helper: escape HTML
function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if (m === "&") return "&amp;";
        if (m === "<") return "&lt;";
        if (m === ">") return "&gt;";
        return m;
    });
}

// Favorite management
function toggleFavorite(channelId) {
    const index = window.favorites.indexOf(channelId);
    if (index === -1) {
        window.favorites.push(channelId);
    } else {
        window.favorites.splice(index, 1);
    }
    localStorage.setItem('channelFavorites', JSON.stringify(window.favorites));
    return index === -1; // returns true if added, false if removed
}

function isFavorite(channelId) {
    return window.favorites.includes(channelId);
}

// Show error message
function showError(msg) {
    if (window.domElements.errorMessage) {
        window.domElements.errorMessage.textContent = msg;
        window.domElements.errorMessage.classList.add("show");
        setTimeout(() => {
            if (window.domElements.errorMessage) {
                window.domElements.errorMessage.classList.remove("show");
            }
        }, 5000);
    } else {
        console.error(msg);
    }
}

// ======================== TOAST NOTIFICATION ========================
let activeToastTimeout = null;
let currentToast = null;

function showToast(message, duration = 3500) {
    // Remove existing toast if any
    if (currentToast && currentToast.parentNode) {
        // Clear existing timeout
        if (activeToastTimeout) {
            clearTimeout(activeToastTimeout);
            activeToastTimeout = null;
        }
        // Remove current toast
        currentToast.remove();
        currentToast = null;
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'juzt-toast';
    
    // Add icon based on message type
    let icon = 'fa-check-circle';
    if (message.toLowerCase().includes('dark')) {
        icon = 'fa-moon';
    } else if (message.toLowerCase().includes('light')) {
        icon = 'fa-sun';
    }
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    // Add to body
    document.body.appendChild(toast);
    currentToast = toast;
    
    // Force reflow to ensure animation works
    toast.offsetHeight;
    
    // Auto remove after exactly 3500ms (3.5 seconds)
    activeToastTimeout = setTimeout(() => {
        if (currentToast && currentToast.parentNode) {
            currentToast.style.opacity = '0';
            currentToast.style.transform = 'translateY(-5px)';
            setTimeout(() => {
                if (currentToast && currentToast.parentNode) {
                    currentToast.remove();
                    currentToast = null;
                }
                activeToastTimeout = null;
            }, 200);
        }
    }, 3500);
}

// ======================== PWA UTILITIES ========================
function isPWAInstalled() {
    // Check if app is running in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;
    return isStandalone;
}

function getPWADisplayMode() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return 'standalone';
    }
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
        return 'fullscreen';
    }
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
        return 'minimal-ui';
    }
    return 'browser';
}

// ======================== CHECK FOR APP UPDATES ========================
function checkForAppUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
                registration.update();
                console.log('Checking for app updates...');
            }
        });
    }
}

// ======================== CLEAR CACHE ========================
async function clearAppCache() {
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
            showToast('Cache cleared successfully! Refresh to reload.', 3500);
            return true;
        } catch (error) {
            console.error('Error clearing cache:', error);
            showToast('Failed to clear cache', 3500);
            return false;
        }
    }
    return false;
}

// Export for global use
window.showToast = showToast;
window.isPWAInstalled = isPWAInstalled;
window.getPWADisplayMode = getPWADisplayMode;
window.checkForAppUpdates = checkForAppUpdates;
window.clearAppCache = clearAppCache;

// Log PWA status on load
console.log(`📱 PWA Display Mode: ${getPWADisplayMode()}`);
console.log(`📱 Installed as PWA: ${isPWAInstalled()}`);

