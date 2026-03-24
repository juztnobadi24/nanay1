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
        
        // Fullscreen button elements
        this.fullscreenBtn = null;
        this.fullscreenTimeout = null;
        this.isFullscreenBtnVisible = false;
        
        // Popout video elements
        this.popoutPlayer = null;
        this.popoutContainer = null;
        this.isPopoutActive = false;
        this.originalParent = null;
        this.originalNextSibling = null;
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="video-container" id="videoContainer">
                <video id="videoPlayer" playsinline disablePictureInPicture autoplay></video>
                <button class="fullscreen-toggle-btn" id="fullscreenToggleBtn">
                    <i class="fas fa-expand"></i>
                </button>
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
        
        // Setup fullscreen button
        this.setupFullscreenButton();
        
        window.domElements = {
            ...window.domElements,
            videoPlayer: this.videoPlayer,
            errorMessage: this.errorMessageDiv
        };
    }
    
    setupFullscreenButton() {
        this.fullscreenBtn = document.getElementById('fullscreenToggleBtn');
        if (!this.fullscreenBtn) return;
        
        // Initially hide the button
        this.hideFullscreenButton();
        
        // Add click event to toggle popout fullscreen
        this.fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePopoutFullscreen();
        });
        
        // Show button when video container is touched/clicked
        if (this.videoContainer) {
            this.videoContainer.addEventListener('click', (e) => {
                // Don't hide if clicking the button itself
                if (e.target === this.fullscreenBtn || this.fullscreenBtn.contains(e.target)) {
                    return;
                }
                this.showFullscreenButton();
            });
            
            this.videoContainer.addEventListener('touchstart', (e) => {
                // Don't hide if touching the button itself
                if (e.target === this.fullscreenBtn || this.fullscreenBtn.contains(e.target)) {
                    return;
                }
                this.showFullscreenButton();
            });
        }
        
        // Also show button when video player is clicked/touched
        if (this.videoPlayer) {
            this.videoPlayer.addEventListener('click', () => {
                this.showFullscreenButton();
            });
            
            this.videoPlayer.addEventListener('touchstart', () => {
                this.showFullscreenButton();
            });
        }
    }
    
    showFullscreenButton() {
        if (!this.fullscreenBtn) return;
        
        // Clear existing timeout
        if (this.fullscreenTimeout) {
            clearTimeout(this.fullscreenTimeout);
        }
        
        // Show button
        this.fullscreenBtn.classList.add('show');
        this.isFullscreenBtnVisible = true;
        
        // Hide after 3 seconds
        this.fullscreenTimeout = setTimeout(() => {
            this.hideFullscreenButton();
        }, 3000);
    }
    
    hideFullscreenButton() {
        if (!this.fullscreenBtn) return;
        
        this.fullscreenBtn.classList.remove('show');
        this.isFullscreenBtnVisible = false;
        
        if (this.fullscreenTimeout) {
            clearTimeout(this.fullscreenTimeout);
            this.fullscreenTimeout = null;
        }
    }
    
    async togglePopoutFullscreen() {
        if (this.isPopoutActive) {
            await this.closePopoutPlayer();
        } else {
            await this.openPopoutPlayer();
        }
    }
    
    async openPopoutPlayer() {
        if (!this.videoPlayer || !this.videoContainer) {
            console.error("No video player to popout");
            return;
        }
        
        console.log("Opening popout fullscreen player...");
        
        // Save current playback state
        const currentTime = this.videoPlayer.currentTime;
        const isPlaying = !this.videoPlayer.paused;
        const currentSrc = this.videoPlayer.src;
        
        // Store original parent for restoration
        this.originalParent = this.videoContainer.parentNode;
        this.originalNextSibling = this.videoContainer.nextSibling;
        
        // Create popout container
        this.popoutContainer = document.createElement('div');
        this.popoutContainer.className = 'popout-video-container';
        this.popoutContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            animation: fadeIn 0.3s ease;
        `;
        
        // Create video wrapper
        const videoWrapper = document.createElement('div');
        videoWrapper.className = 'popout-video-wrapper';
        videoWrapper.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
        `;
        
        // Move video container to popout
        videoWrapper.appendChild(this.videoContainer);
        this.popoutContainer.appendChild(videoWrapper);
        
        // Create control bar
        const controlBar = document.createElement('div');
        controlBar.className = 'popout-control-bar';
        controlBar.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 0;
            right: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            padding: 12px 20px;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            z-index: 10001;
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: 60px;
            width: fit-content;
            margin: 0 auto;
            left: 50%;
            transform: translateX(-50%);
        `;
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        `;
        closeBtn.onclick = () => this.closePopoutPlayer();
        
        // Play/Pause button
        const playPauseBtn = document.createElement('button');
        playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        playPauseBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        `;
        playPauseBtn.onclick = () => {
            if (this.videoPlayer.paused) {
                this.videoPlayer.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                this.videoPlayer.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        };
        
        // Exit fullscreen button (to return to normal)
        const exitFullscreenBtn = document.createElement('button');
        exitFullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        exitFullscreenBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        `;
        exitFullscreenBtn.onclick = () => this.closePopoutPlayer();
        
        controlBar.appendChild(playPauseBtn);
        controlBar.appendChild(exitFullscreenBtn);
        controlBar.appendChild(closeBtn);
        
        this.popoutContainer.appendChild(controlBar);
        
        // Show control bar on tap/click
        let controlTimeout;
        const showControls = () => {
            controlBar.style.opacity = '1';
            clearTimeout(controlTimeout);
            controlTimeout = setTimeout(() => {
                controlBar.style.opacity = '0';
            }, 3000);
        };
        
        this.popoutContainer.addEventListener('click', showControls);
        this.popoutContainer.addEventListener('touchstart', showControls);
        
        // Add to body
        document.body.appendChild(this.popoutContainer);
        
        // Update video container styles for fullscreen
        this.videoContainer.style.cssText = `
            width: 100%;
            height: 100%;
            border-radius: 0;
            aspect-ratio: auto;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        this.videoPlayer.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
        `;
        
        // Try to lock orientation to landscape
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(err => {
                console.log("Orientation lock failed:", err);
            });
        }
        
        // Restore video state
        if (currentSrc) {
            this.videoPlayer.currentTime = currentTime;
            if (isPlaying) {
                await this.videoPlayer.play().catch(e => console.log("Play failed:", e));
            }
        }
        
        this.isPopoutActive = true;
        this.updateFullscreenButtonIcon(true);
        
        // Show controls initially
        showControls();
        
        // Add animation keyframes if not exists
        if (!document.querySelector('#popout-animation-style')) {
            const style = document.createElement('style');
            style.id = 'popout-animation-style';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    async closePopoutPlayer() {
        if (!this.isPopoutActive) return;
        
        console.log("Closing popout fullscreen player...");
        
        // Save current state
        const currentTime = this.videoPlayer.currentTime;
        const isPlaying = !this.videoPlayer.paused;
        
        // Restore video container to original position
        if (this.originalParent) {
            if (this.originalNextSibling) {
                this.originalParent.insertBefore(this.videoContainer, this.originalNextSibling);
            } else {
                this.originalParent.appendChild(this.videoContainer);
            }
        }
        
        // Reset video container styles
        this.videoContainer.style.cssText = '';
        this.videoPlayer.style.cssText = '';
        
        // Restore original classes
        this.videoContainer.classList.add('video-container');
        
        // Remove popout container
        if (this.popoutContainer) {
            this.popoutContainer.remove();
            this.popoutContainer = null;
        }
        
        // Unlock orientation
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
        
        // Restore video state
        this.videoPlayer.currentTime = currentTime;
        if (isPlaying) {
            await this.videoPlayer.play().catch(e => console.log("Play failed:", e));
        }
        
        this.isPopoutActive = false;
        this.updateFullscreenButtonIcon(false);
        
        // Show the button briefly after closing
        this.showFullscreenButton();
    }
    
    updateFullscreenButtonIcon(isFullscreen = null) {
        if (!this.fullscreenBtn) return;
        
        const active = isFullscreen !== null ? isFullscreen : this.isPopoutActive;
        
        if (active) {
            this.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            this.fullscreenBtn.title = 'Exit Fullscreen';
        } else {
            this.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            this.fullscreenBtn.title = 'Enter Fullscreen';
        }
    }
    
    async destroyPlayers() {
        this.isLoading = false;
        
        // Close popout if active
        if (this.isPopoutActive) {
            await this.closePopoutPlayer();
        }
        
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
