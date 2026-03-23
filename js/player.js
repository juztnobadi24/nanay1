// ======================== PLAYER COMPONENT ========================

class PlayerComponent {
    constructor() {
        this.container = document.getElementById("playerArea");
        this.videoPlayer = null;
        this.currentChannelNameSpan = null;
        this.drmNoticeSpan = null;
        this.errorMessageDiv = null;
        this.videoContainer = null;
        
        this.shakaPlayer = null;
        this.hlsPlayer = null;
        this.isShakaInitialized = false;
        this.currentChannel = null;
        this.isLoading = false;
        
        // Track current player type
        this.currentPlayerType = null;
        
        // Retry count for failed loads
        this.retryCount = 0;
        this.maxRetries = 2;
        
        // Proxy endpoint detection
        this.proxyEndpoint = this.detectProxyEndpoint();
    }
    
    detectProxyEndpoint() {
        // Check if we're on Vercel (api folder) or traditional hosting (proxy.php)
        const isVercel = window.location.hostname.includes('vercel.app') || 
                         window.location.hostname.includes('now.sh');
        
        if (isVercel) {
            return '/api/proxy';
        } else {
            return '/proxy.php';
        }
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="video-container" id="videoContainer">
                <video id="videoPlayer" playsinline disablePictureInPicture autoplay></video>
            </div>
            <div class="error-message" id="errorMessage"></div>
        `;
        
        this.videoPlayer = document.getElementById("videoPlayer");
        this.errorMessageDiv = document.getElementById("errorMessage");
        this.videoContainer = document.getElementById("videoContainer");
        
        // Remove controls from video player
        if (this.videoPlayer) {
            this.videoPlayer.removeAttribute("controls");
            this.videoPlayer.controls = false;
            this.videoPlayer.autoplay = true;
        }
        
        window.domElements = {
            ...window.domElements,
            videoPlayer: this.videoPlayer,
            errorMessage: this.errorMessageDiv
        };
    }
    
    async destroyPlayers() {
        this.isLoading = false;
        this.retryCount = 0;
        
        // Stop and clear video element
        if (this.videoPlayer) {
            try {
                this.videoPlayer.pause();
                this.videoPlayer.removeAttribute("src");
                this.videoPlayer.load();
            } catch (e) {
                console.warn("Error clearing video:", e);
            }
        }
        
        // Destroy Shaka player
        if (this.shakaPlayer) {
            try {
                await this.shakaPlayer.destroy();
            } catch (e) {
                console.warn("Error destroying Shaka player:", e);
            }
            this.shakaPlayer = null;
        }
        
        // Destroy HLS player
        if (this.hlsPlayer) {
            try {
                this.hlsPlayer.destroy();
            } catch (e) {
                console.warn("Error destroying HLS player:", e);
            }
            this.hlsPlayer = null;
        }
        
        this.isShakaInitialized = false;
        this.currentPlayerType = null;
    }
    
    async initShaka() {
        if (this.shakaPlayer) return this.shakaPlayer;
        
        if (typeof shaka !== "undefined") {
            this.shakaPlayer = new shaka.Player(this.videoPlayer);
            
            // Configure Shaka for better error handling and DRM support
            await this.shakaPlayer.configure({
                drm: {
                    servers: {},
                    clearKeys: {},
                    retryParameters: { 
                        maxAttempts: 3,
                        baseDelay: 1000,
                        backoffFactor: 2
                    },
                    advanced: {},
                    initDataTransform: (initData, initDataType, drmInfo) => {
                        console.log("DRM init data:", initDataType);
                        return initData;
                    }
                },
                streaming: {
                    rebufferingGoal: 2,
                    bufferingGoal: 10,
                    retryParameters: { 
                        maxAttempts: 3,
                        baseDelay: 1000,
                        backoffFactor: 2
                    },
                    lowLatencyMode: false,
                    ignoreTextStreamFailures: true,
                    alwaysStreamText: false,
                    startAtSegmentBoundary: true,
                    failureCallback: (error) => {
                        console.warn("Streaming failure:", error);
                    }
                },
                manifest: {
                    dash: {
                        ignoreSuggestedPresentationDelay: true,
                        ignoreMinBufferTime: true,
                        autoCorrectDrift: true,
                        clockSyncUri: null
                    },
                    retryParameters: {
                        maxAttempts: 3,
                        baseDelay: 1000,
                        backoffFactor: 2
                    }
                },
                networking: {
                    retryParameters: {
                        maxAttempts: 3,
                        baseDelay: 1000,
                        backoffFactor: 2,
                        timeout: 10000
                    }
                },
                abr: {
                    enabled: true,
                    defaultBandwidthEstimate: 1e6,
                    switchInterval: 2
                }
            });
            
            // Add error handler with specific handling for Error 3014
            this.shakaPlayer.addEventListener("error", (event) => {
                const error = event.detail;
                console.error("Shaka error details:", error);
                
                let errorMsg = "Playback error";
                let shouldRetry = false;
                
                // Handle specific error codes
                if (error && error.code) {
                    switch(error.code) {
                        case 3014: // MANIFEST_ERROR
                            errorMsg = "Stream manifest error (3014) - The stream may have expired or is temporarily unavailable";
                            shouldRetry = true;
                            break;
                        case 1001: // NETWORK_ERROR
                            errorMsg = "Network error - Check your internet connection";
                            shouldRetry = true;
                            break;
                        case 6001: // DRM_ERROR
                            errorMsg = "DRM license error - This stream requires DRM protection";
                            break;
                        case 1002: // NETWORK_ERROR with timeout
                            errorMsg = "Connection timeout - The server is taking too long to respond";
                            shouldRetry = true;
                            break;
                        default:
                            if (error.message) {
                                if (error.message.includes("LICENSE")) {
                                    errorMsg = "DRM license error";
                                } else if (error.message.includes("MANIFEST")) {
                                    errorMsg = "Cannot load stream manifest";
                                    shouldRetry = true;
                                } else {
                                    errorMsg = error.message;
                                }
                            }
                    }
                }
                
                // Auto-retry for recoverable errors
                if (shouldRetry && this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    console.log(`Retrying stream (${this.retryCount}/${this.maxRetries})...`);
                    setTimeout(() => {
                        if (this.currentChannel) {
                            this.playChannel(this.currentChannel);
                        }
                    }, 2000);
                } else {
                    showError(errorMsg);
                }
            });
            
            this.isShakaInitialized = true;
            return this.shakaPlayer;
        }
        return null;
    }
    
    // Helper to parse DRM config from various formats
    parseDrmConfig(drmConfig) {
        if (!drmConfig) return { clearKeys: {}, servers: {} };
        
        const result = { clearKeys: {}, servers: {} };
        
        // Handle array format with keys
        if (drmConfig.keys && Array.isArray(drmConfig.keys)) {
            drmConfig.keys.forEach(key => {
                if (key.kid && key.k) {
                    let kid = key.kid;
                    if (kid.length === 32 && !kid.includes('-')) {
                        kid = `${kid.substring(0, 8)}-${kid.substring(8, 12)}-${kid.substring(12, 16)}-${kid.substring(16, 20)}-${kid.substring(20, 32)}`;
                    }
                    result.clearKeys[kid] = key.k;
                }
            });
        } 
        // Handle object format with kid:key pairs
        else if (typeof drmConfig === 'object') {
            for (const [kid, key] of Object.entries(drmConfig)) {
                if (kid && key && typeof key === 'string') {
                    let formattedKid = kid;
                    if (formattedKid.length === 32 && !formattedKid.includes('-')) {
                        formattedKid = `${formattedKid.substring(0, 8)}-${formattedKid.substring(8, 12)}-${formattedKid.substring(12, 16)}-${formattedKid.substring(16, 20)}-${formattedKid.substring(20, 32)}`;
                    }
                    result.clearKeys[formattedKid] = key;
                }
            }
        }
        
        return result;
    }
    
    // Check if URL is likely expired or invalid
    isUrlExpired(url) {
        if (!url) return true;
        
        // Check for AuthInfo parameter which may contain timestamp
        const authMatch = url.match(/AuthInfo=([^&]+)/);
        if (authMatch) {
            console.log("URL contains AuthInfo token");
            return false;
        }
        
        // Check for expired or malformed URLs
        if (url.includes('expired') || url.includes('invalid')) {
            return true;
        }
        
        return false;
    }
    
    // Get proxied URL for external streams
    getProxiedUrl(originalUrl) {
        // If it's already a relative URL or proxy URL, return as is
        if (originalUrl.startsWith('/') || 
            originalUrl.startsWith('http://localhost') || 
            originalUrl.includes('/api/') ||
            originalUrl.includes('proxy.php')) {
            return originalUrl;
        }
        
        // Don't proxy if it's a local file
        if (originalUrl.startsWith('blob:') || originalUrl.startsWith('data:')) {
            return originalUrl;
        }
        
        // Use the proxy for external URLs
        console.log("Using proxy for URL:", originalUrl.substring(0, 80) + "...");
        return `${this.proxyEndpoint}?url=${encodeURIComponent(originalUrl)}`;
    }
    
    // Try to clean/fix URL if possible
    cleanUrl(url) {
        if (!url) return url;
        
        // Remove any tracking parameters that might cause issues
        try {
            const urlObj = new URL(url);
            // Keep only essential parameters for DASH streams
            const essentialParams = ['AuthInfo', 'version', 'virtualDomain', 'programid', 'contentid', 'videoid'];
            const params = new URLSearchParams();
            
            essentialParams.forEach(param => {
                if (urlObj.searchParams.has(param)) {
                    params.set(param, urlObj.searchParams.get(param));
                }
            });
            
            const cleanedUrl = `${urlObj.origin}${urlObj.pathname}?${params.toString()}`;
            console.log("Cleaned URL:", cleanedUrl.substring(0, 100) + "...");
            return cleanedUrl;
        } catch (e) {
            return url;
        }
    }
    
    async loadStream(url, drmConfig = null, headers = null) {
        // Convert to proxied URL if it's external
        let streamUrl = url;
        
        // Check if it's an external URL that needs proxying
        if (url.startsWith('http://') || url.startsWith('https://')) {
            // Don't proxy if it's already using our proxy
            if (!url.includes('/api/proxy') && !url.includes('proxy.php')) {
                // Don't proxy localhost or internal domains
                if (!url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes(window.location.hostname)) {
                    streamUrl = this.getProxiedUrl(url);
                }
            }
        }
        
        console.log("Loading stream:", streamUrl.substring(0, 100) + "...");
        
        // Clear any existing players first
        await this.destroyPlayers();
        
        const isDash = streamUrl.includes(".mpd") || streamUrl.includes("manifest.mpd");
        const isHls = streamUrl.includes(".m3u8");
        
        // For DASH streams
        if (isDash) {
            console.log("Loading DASH stream");
            
            // Try to clean the URL
            const cleanedUrl = this.cleanUrl(streamUrl);
            
            const player = await this.initShaka();
            if (!player) {
                throw new Error("Shaka Player not loaded");
            }
            
            // Parse and apply DRM configuration
            if (drmConfig) {
                const drmSettings = this.parseDrmConfig(drmConfig);
                console.log("Applying DRM config:", Object.keys(drmSettings.clearKeys).length, "keys");
                
                try {
                    await player.configure({ 
                        drm: {
                            clearKeys: drmSettings.clearKeys,
                            servers: drmSettings.servers
                        } 
                    });
                } catch (configError) {
                    console.warn("DRM config error:", configError);
                }
            } else {
                await player.configure({ drm: { clearKeys: {} } });
            }
            
            // Set up networking filters for headers and CORS
            if (player.getNetworkingEngine) {
                const netEngine = player.getNetworkingEngine();
                if (netEngine) {
                    netEngine.registerRequestFilter((type, request) => {
                        if (headers && headers["User-Agent"]) {
                            request.headers["User-Agent"] = headers["User-Agent"];
                        }
                        if (headers && headers["Referer"]) {
                            request.headers["Referer"] = headers["Referer"];
                        }
                        if (headers && headers["Origin"]) {
                            request.headers["Origin"] = headers["Origin"];
                        }
                        request.headers["Accept"] = "*/*";
                    });
                }
            }
            
            try {
                // Load with timeout
                const loadPromise = player.load(cleanedUrl);
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("Load timeout")), 15000);
                });
                
                await Promise.race([loadPromise, timeoutPromise]);
                console.log("DASH stream loaded successfully");
                
                // Auto-play
                setTimeout(() => {
                    if (this.videoPlayer && this.videoPlayer.paused) {
                        this.videoPlayer.play().catch(e => console.log("Auto-play blocked:", e.message));
                    }
                }, 100);
                
                this.currentPlayerType = 'dash';
                this.retryCount = 0;
                return true;
                
            } catch (loadError) {
                console.error("DASH load error:", loadError);
                
                // Try alternative approach - load without DRM config
                if (drmConfig && this.retryCount === 0) {
                    console.log("Attempting to load without DRM config...");
                    try {
                        await player.configure({ drm: { clearKeys: {} } });
                        await player.load(cleanedUrl);
                        console.log("DASH loaded without DRM config");
                        this.currentPlayerType = 'dash';
                        return true;
                    } catch (noDrmError) {
                        console.warn("No DRM attempt also failed");
                    }
                }
                
                // Try HLS fallback if available
                if (streamUrl.replace('.mpd', '.m3u8') !== streamUrl) {
                    const hlsUrl = streamUrl.replace('.mpd', '.m3u8');
                    console.log("Trying HLS fallback:", hlsUrl);
                    try {
                        return await this.loadHlsStream(hlsUrl, headers);
                    } catch (hlsError) {
                        console.warn("HLS fallback failed:", hlsError);
                    }
                }
                
                throw loadError;
            }
        } 
        // For HLS streams
        else if (isHls) {
            return this.loadHlsStream(streamUrl, headers);
        }
        // For direct audio/video streams
        else {
            console.log("Loading direct stream");
            this.videoPlayer.src = streamUrl;
            
            if (headers && headers["User-Agent"]) {
                this.videoPlayer.setAttribute('crossorigin', 'anonymous');
            }
            
            try {
                await this.videoPlayer.play();
                this.currentPlayerType = 'direct';
                this.retryCount = 0;
                return true;
            } catch (playError) {
                console.error("Direct stream error:", playError);
                throw new Error("Cannot play stream: " + playError.message);
            }
        }
    }
    
    async loadHlsStream(url, headers = null) {
        console.log("Loading HLS stream");
        
        // Clean HLS URL
        const cleanedUrl = this.cleanUrl(url);
        
        if (Hls && Hls.isSupported()) {
            return new Promise((resolve, reject) => {
                let resolved = false;
                
                this.hlsPlayer = new Hls({
                    enableWorker: true,
                    lowLatencyMode: false,
                    autoStartLoad: true,
                    startPosition: -1,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    maxBufferSize: 60 * 1000 * 1000,
                    debug: false,
                    xhrSetup: (xhr, url) => {
                        if (headers && headers["User-Agent"]) {
                            xhr.setRequestHeader("User-Agent", headers["User-Agent"]);
                        }
                        if (headers && headers["Referer"]) {
                            xhr.setRequestHeader("Referer", headers["Referer"]);
                        }
                        if (headers && headers["Origin"]) {
                            xhr.setRequestHeader("Origin", headers["Origin"]);
                        }
                        xhr.withCredentials = false;
                    }
                });
                
                this.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (!resolved) {
                        resolved = true;
                        this.videoPlayer.play()
                            .then(() => {
                                console.log("HLS playback started");
                                this.retryCount = 0;
                                resolve(true);
                            })
                            .catch(e => {
                                console.warn("Autoplay blocked:", e);
                                resolve(true);
                            });
                    }
                });
                
                this.hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
                    console.error("HLS Error:", data);
                    
                    if (!data.fatal) {
                        return;
                    }
                    
                    if (!resolved) {
                        resolved = true;
                        
                        if (this.videoPlayer.canPlayType("application/vnd.apple.mpegurl")) {
                            console.log("Falling back to native HLS");
                            this.videoPlayer.src = cleanedUrl;
                            this.videoPlayer.play()
                                .then(() => {
                                    this.currentPlayerType = 'hls-native';
                                    resolve(true);
                                })
                                .catch(() => {
                                    reject(new Error("Native HLS failed"));
                                });
                        } else {
                            reject(new Error(data.details || "HLS stream error"));
                        }
                    }
                });
                
                this.hlsPlayer.loadSource(cleanedUrl);
                this.hlsPlayer.attachMedia(this.videoPlayer);
                
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        console.log("HLS timeout, attempting fallback");
                        if (this.videoPlayer.canPlayType("application/vnd.apple.mpegurl")) {
                            this.videoPlayer.src = cleanedUrl;
                            this.videoPlayer.play()
                                .then(() => {
                                    this.currentPlayerType = 'hls-native';
                                    resolve(true);
                                })
                                .catch(() => {
                                    resolve(true);
                                });
                        } else {
                            resolve(true);
                        }
                    }
                }, 15000);
            });
        } 
        else if (this.videoPlayer.canPlayType("application/vnd.apple.mpegurl")) {
            console.log("Using native HLS support");
            this.videoPlayer.src = cleanedUrl;
            await this.videoPlayer.play();
            this.currentPlayerType = 'hls-native';
            this.retryCount = 0;
            return true;
        } else {
            throw new Error("HLS not supported in this browser");
        }
    }
    
    async playChannel(channel) {
        if (!channel || !channel.streamUrl) {
            showError("Invalid channel: missing stream URL");
            return false;
        }
        
        if (this.isLoading) {
            console.log("Already loading a channel, skipping...");
            return false;
        }
        
        this.isLoading = true;
        
        try {
            console.log("Switching to channel:", channel.name);
            this.currentChannel = channel;
            
            if (this.drmNoticeSpan) {
                this.drmNoticeSpan.innerHTML = '';
            }
            
            let drmConfig = null;
            let headers = null;
            if (channel.drm) drmConfig = channel.drm;
            if (channel.headers) headers = channel.headers;
            
            if (this.isUrlExpired(channel.streamUrl)) {
                console.warn("URL may have expired tokens");
            }
            
            const success = await this.loadStream(channel.streamUrl, drmConfig, headers);
            
            if (success) {
                window.activeChannelId = channel.id;
                console.log("Channel playing successfully:", channel.name);
                
                if (window.sidebarComponent) {
                    window.sidebarComponent.updateActiveChannel(channel.id);
                }
            } else {
                console.error("Failed to play channel:", channel.name);
                showError(`Failed to play ${channel.name}. Stream may be unavailable.`);
            }
            
            return success;
        } catch (error) {
            console.error("Error in playChannel:", error);
            
            if (error.message && error.message.includes("MANIFEST")) {
                showError(`Cannot load stream: The manifest file is invalid or expired. Please try refreshing the page.`);
            } else {
                showError(`Error playing ${channel.name}: ${error.message || "Unknown error"}`);
            }
            
            return false;
        } finally {
            setTimeout(() => {
                this.isLoading = false;
            }, 500);
        }
    }
    
    updateModeUI(mode) {
        if (this.videoContainer) {
            if (mode === "tv") {
                this.videoContainer.style.background = "#000";
            } else {
                this.videoContainer.style.background = "linear-gradient(135deg, #1a1f2e 0%, #0f1222 100%)";
            }
        }
    }
}

window.PlayerComponent = PlayerComponent;
