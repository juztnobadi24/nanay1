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
function showToast(message, duration = 3000) {
    // Remove existing toast
    const existingToast = document.querySelector('.juzt-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'juzt-toast';
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${escapeHtml(message)}</span>
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
        font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
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
            showToast('Cache cleared successfully! Refresh to reload.');
            return true;
        } catch (error) {
            console.error('Error clearing cache:', error);
            showToast('Failed to clear cache');
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
