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
