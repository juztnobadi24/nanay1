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
    }
    
    async initShaka() {
        if (this.shakaPlayer) return this.shakaPlayer;
        if (typeof shaka !== "undefined") {
            this.shakaPlayer = new shaka.Player(this.videoPlayer);
            await this.shakaPlayer.configure({
                drm: {
                    servers: {},
                    clearKeys: {},
                    retryParameters: { maxAttempts: 3 }
                },
                streaming: {
                    rebufferingGoal: 2,
                    bufferingGoal: 10,
                    retryParameters: { maxAttempts: 3 }
                }
            });
            this.shakaPlayer.addEventListener("error", (event) => {
                console.error("Shaka error", event.detail);
                showError("Playback error: " + (event.detail?.message || "DRM or stream issue"));
            });
            this.isShakaInitialized = true;
            return this.shakaPlayer;
        }
        return null;
    }
    
    async loadStream(url, drmConfig = null, headers = null) {
        console.log("Loading stream:", url);
        
        // Clear any existing players first
        await this.destroyPlayers();
        
        const isDash = url.includes(".mpd") || url.includes("manifest.mpd");
        const isHls = url.includes(".m3u8");
        
        try {
            if (isDash) {
                console.log("Loading DASH stream");
                const player = await this.initShaka();
                if (!player) throw new Error("Shaka Player not loaded");
                
                if (drmConfig) {
                    const drmObj = {};
                    if (drmConfig.keys && Array.isArray(drmConfig.keys)) {
                        const clearKeys = {};
                        drmConfig.keys.forEach(key => {
                            if (key.kid && key.k) clearKeys[key.kid] = key.k;
                        });
                        drmObj.clearKeys = clearKeys;
                    } else if (typeof drmConfig === "object") {
                        const clearKeys = {};
                        for (const [kid, key] of Object.entries(drmConfig)) {
                            clearKeys[kid] = key;
                        }
                        drmObj.clearKeys = clearKeys;
                    }
                    await player.configure({ drm: drmObj });
                } else {
                    await player.configure({ drm: { clearKeys: {} } });
                }
                
                await player.load(url);
                
                // Force play
                setTimeout(() => {
                    if (this.videoPlayer && !this.videoPlayer.paused) {
                        this.videoPlayer.play().catch(e => console.warn("Play attempt:", e));
                    }
                }, 100);
                
                return true;
            } 
            else if (isHls) {
                console.log("Loading HLS stream");
                if (Hls.isSupported()) {
                    return new Promise((resolve, reject) => {
                        this.hlsPlayer = new Hls({
                            enableWorker: true,
                            lowLatencyMode: true,
                            autoStartLoad: true,
                            startPosition: -1,
                            xhrSetup: (xhr, url) => {
                                if (headers && headers["User-Agent"]) {
                                    xhr.setRequestHeader("User-Agent", headers["User-Agent"]);
                                }
                            }
                        });
                        
                        let resolved = false;
                        
                        this.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
                            if (!resolved) {
                                resolved = true;
                                this.videoPlayer.play()
                                    .then(() => {
                                        console.log("HLS playback started");
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
                            if (data.fatal && !resolved) {
                                resolved = true;
                                reject(new Error(data.details || "HLS stream error"));
                            }
                        });
                        
                        this.hlsPlayer.loadSource(url);
                        this.hlsPlayer.attachMedia(this.videoPlayer);
                        
                        // Fallback timeout
                        setTimeout(() => {
                            if (!resolved) {
                                resolved = true;
                                this.videoPlayer.play()
                                    .then(() => {
                                        console.log("HLS playback started (timeout fallback)");
                                        resolve(true);
                                    })
                                    .catch(e => {
                                        console.warn("Timeout play attempt:", e);
                                        resolve(true);
                                    });
                            }
                        }, 5000);
                    });
                } 
                else if (this.videoPlayer.canPlayType("application/vnd.apple.mpegurl")) {
                    this.videoPlayer.src = url;
                    await this.videoPlayer.play();
                    return true;
                } else {
                    throw new Error("HLS not supported in this browser");
                }
            }
            else {
                console.log("Loading direct stream (MP3/audio)");
                this.videoPlayer.src = url;
                await this.videoPlayer.play();
                return true;
            }
        } catch (err) {
            console.error("loadStream error:", err);
            showError(`Cannot play stream: ${err.message || "unknown error"}`);
            return false;
        }
    }
    
    async playChannel(channel) {
        if (!channel || !channel.streamUrl) {
            showError("Invalid channel: missing stream URL");
            return false;
        }
        
        // Prevent multiple simultaneous loads
        if (this.isLoading) {
            console.log("Already loading a channel, skipping...");
            return false;
        }
        
        this.isLoading = true;
        
        try {
            console.log("Switching to channel:", channel.name);
            this.currentChannel = channel;
            
            // Clear DRM notice if it exists (not used anymore)
            if (this.drmNoticeSpan) {
                this.drmNoticeSpan.innerHTML = '';
            }
            
            // Get DRM config and headers
            let drmConfig = null;
            let headers = null;
            if (channel.drm) drmConfig = channel.drm;
            if (channel.headers) headers = channel.headers;
            
            // Load and play the stream
            const success = await this.loadStream(channel.streamUrl, drmConfig, headers);
            
            if (success) {
                window.activeChannelId = channel.id;
                console.log("Channel playing successfully:", channel.name);
                
                // Update sidebar active state
                if (window.sidebarComponent) {
                    window.sidebarComponent.updateActiveChannel(channel.id);
                }
            } else {
                console.error("Failed to play channel:", channel.name);
            }
            
            return success;
        } catch (error) {
            console.error("Error in playChannel:", error);
            showError(`Error playing ${channel.name}: ${error.message}`);
            return false;
        } finally {
            // Reset loading flag after a delay
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
