// ======================== PLAYER COMPONENT ========================

class PlayerComponent {
    constructor() {
        this.container = document.getElementById("playerArea");
        this.videoPlayer = null;
        this.currentChannelNameSpan = null;
        this.drmNoticeSpan = null;
        this.errorMessageDiv = null;
        this.videoContainer = null;
        this.radioLogoContainer = null;
        this.radioLogoImg = null;
        
        this.shakaPlayer = null;
        this.hlsPlayer = null;
        this.isShakaInitialized = false;
        this.currentChannel = null;
        this.isLoading = false;
        this.loadRetryCount = 0;
        this.maxRetries = 2;
        this.loaderOverlay = null;
        
        // Fullscreen button elements
        this.fullscreenBtn = null;
        this.fullscreenTimeout = null;
        this.isFullscreenBtnVisible = false;
        this.isFullscreen = false;
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="video-container" id="videoContainer">
                <video id="videoPlayer" playsinline disablePictureInPicture autoplay></video>
                <div class="radio-logo-container" id="radioLogoContainer" style="display: none;">
                    <img id="radioLogoImg" class="radio-logo" alt="Radio Logo">
                </div>
                <button class="fullscreen-toggle-btn" id="fullscreenToggleBtn">
                    <i class="fas fa-expand"></i>
                </button>
            </div>
            <div class="error-message" id="errorMessage"></div>
        `;
        
        this.videoPlayer = document.getElementById("videoPlayer");
        this.errorMessageDiv = document.getElementById("errorMessage");
        this.videoContainer = document.getElementById("videoContainer");
        this.radioLogoContainer = document.getElementById("radioLogoContainer");
        this.radioLogoImg = document.getElementById("radioLogoImg");
        
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
    
    showRadioLogo(channel) {
        if (!this.radioLogoContainer || !this.radioLogoImg) return;
        
        // Check if it's a radio channel
        const isRadio = channel.type === "Radio";
        
        if (!isRadio) {
            // Hide logo for TV channels
            this.radioLogoContainer.style.display = 'none';
            if (this.videoPlayer) {
                this.videoPlayer.style.opacity = '1';
            }
            return;
        }
        
        // Try to get logo from multiple sources
        let logoUrl = null;
        
        // Priority 1: logo from channel object
        if (channel.logo) {
            logoUrl = channel.logo;
        }
        // Priority 2: logoLocal (if you have local logos)
        else if (channel.logoLocal) {
            logoUrl = `images/${channel.logoLocal}.webp`;
        }
        // Priority 3: fallback to default radio logo
        else {
            logoUrl = 'https://via.placeholder.com/200x200/1a1e2c/f97316?text=📻';
        }
        
        // Set logo image
        this.radioLogoImg.src = logoUrl;
        this.radioLogoImg.alt = channel.name;
        
        // Handle image load error
        this.radioLogoImg.onerror = () => {
            this.radioLogoImg.src = 'https://via.placeholder.com/200x200/1a1e2c/f97316?text=📻';
            this.radioLogoImg.alt = 'Radio';
        };
        
        // Show logo container
        this.radioLogoContainer.style.display = 'flex';
        
        // Add station name overlay
        let stationNameElem = this.radioLogoContainer.querySelector('.station-name');
        if (!stationNameElem) {
            stationNameElem = document.createElement('div');
            stationNameElem.className = 'station-name';
            this.radioLogoContainer.appendChild(stationNameElem);
        }
        stationNameElem.textContent = channel.name;
        
        // Fade out video player for radio (optional)
        if (this.videoPlayer) {
            this.videoPlayer.style.opacity = '0.3';
        }
    }
    
    hideRadioLogo() {
        if (this.radioLogoContainer) {
            this.radioLogoContainer.style.display = 'none';
        }
        if (this.videoPlayer) {
            this.videoPlayer.style.opacity = '1';
        }
    }
    
    setupFullscreenButton() {
        this.fullscreenBtn = document.getElementById('fullscreenToggleBtn');
        if (!this.fullscreenBtn) return;
        
        // Initially hide the button
        this.hideFullscreenButton();
        
        // Add click event to toggle fullscreen
        this.fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.toggleFullscreen();
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
        
        // Listen for fullscreen change events to update button icon
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.onFullscreenChange());
    }
    
    onFullscreenChange() {
        const isFullscreen = !!(document.fullscreenElement || 
                                document.webkitFullscreenElement || 
                                document.mozFullScreenElement);
        
        this.isFullscreen = isFullscreen;
        
        if (this.fullscreenBtn) {
            if (isFullscreen) {
                this.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                this.fullscreenBtn.title = 'Exit Fullscreen';
            } else {
                this.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                this.fullscreenBtn.title = 'Enter Fullscreen';
            }
        }
        
        // Show button briefly after fullscreen change
        this.showFullscreenButton();
        
        console.log("Fullscreen changed:", isFullscreen ? "Entered" : "Exited");
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
    
    toggleFullscreen() {
        if (!this.videoContainer) return;
        
        const isFullscreen = !!(document.fullscreenElement || 
                                document.webkitFullscreenElement || 
                                document.mozFullScreenElement);
        
        console.log("Toggle fullscreen - currently:", isFullscreen ? "Fullscreen" : "Not fullscreen");
        
        if (isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }
    
    enterFullscreen() {
        if (!this.videoContainer) return;
        
        console.log("Attempting to enter fullscreen...");
        
        const element = this.videoContainer;
        
        // Try all possible fullscreen methods
        const requestFullscreen = () => {
            if (element.requestFullscreen) {
                return element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                return element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                return element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                return element.msRequestFullscreen();
            }
            return Promise.reject("Fullscreen not supported");
        };
        
        // Request fullscreen
        requestFullscreen().then(() => {
            console.log("Fullscreen entered successfully");
            
            // Try to lock orientation to landscape after entering fullscreen
            setTimeout(() => {
                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape').catch(err => {
                        console.log("Orientation lock failed:", err);
                    });
                } else if (screen.lockOrientation) {
                    screen.lockOrientation('landscape').catch(err => {
                        console.log("Orientation lock failed:", err);
                    });
                }
            }, 100);
            
        }).catch(err => {
            console.error("Fullscreen request failed:", err);
            
            // Fallback: Try to use the video element directly
            if (this.videoPlayer && this.videoPlayer.requestFullscreen) {
                console.log("Trying fallback on video element...");
                this.videoPlayer.requestFullscreen().catch(e => {
                    console.error("Video element fullscreen also failed:", e);
                    // Don't show error, just log
                });
            }
        });
        
        // Update button icon will be handled by onFullscreenChange event
    }
    
    exitFullscreen() {
        console.log("Attempting to exit fullscreen...");
        
        // Try all possible exit fullscreen methods
        const exitFullscreen = () => {
            if (document.exitFullscreen) {
                return document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                return document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                return document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                return document.msExitFullscreen();
            }
            return Promise.reject("Exit fullscreen not supported");
        };
        
        exitFullscreen().then(() => {
            console.log("Fullscreen exited successfully");
            
            // Unlock orientation
            setTimeout(() => {
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                } else if (screen.unlockOrientation) {
                    screen.unlockOrientation();
                }
            }, 100);
            
        }).catch(err => {
            console.error("Exit fullscreen failed:", err);
        });
        
        // Update button icon will be handled by onFullscreenChange event
    }
    
    async destroyPlayers() {
        this.isLoading = false;
        
        // Hide loader when destroying
        this.hideLoader();
        
        // Exit fullscreen if active
        if (this.isFullscreen) {
            this.exitFullscreen();
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
                // Don't show error message, just log
            });
            this.isShakaInitialized = true;
            return this.shakaPlayer;
        }
        return null;
    }
    
    showError(msg) {
        // Don't show error messages for loading failures
        // Just log them
        console.error(msg);
        
        // Hide loader if showing
        this.hideLoader();
    }
    
    showLoader(message = "Loading stream...") {
        // Remove existing loader if any
        this.hideLoader();
        
        // Create loader overlay
        this.loaderOverlay = document.createElement('div');
        this.loaderOverlay.className = 'loader-overlay';
        this.loaderOverlay.innerHTML = `
            <div class="loader">
                <div class="loader-text">${message}</div>
            </div>
        `;
        
        if (this.videoContainer) {
            this.videoContainer.style.position = 'relative';
            this.videoContainer.appendChild(this.loaderOverlay);
        }
    }
    
    hideLoader() {
        if (this.loaderOverlay && this.loaderOverlay.parentNode) {
            this.loaderOverlay.remove();
            this.loaderOverlay = null;
        }
    }
    
    updateLoaderMessage(message) {
        if (this.loaderOverlay) {
            const loaderText = this.loaderOverlay.querySelector('.loader-text');
            if (loaderText) {
                loaderText.textContent = message;
            }
        }
    }
    
    async loadStream(url, drmConfig = null, headers = null, isRetry = false) {
        console.log("Loading stream:", url);
        
        // Clear any existing players first
        await this.destroyPlayers();
        
        const isDash = url.includes(".mpd") || url.includes("manifest.mpd");
        const isHls = url.includes(".m3u8");
        
        // Show loader with appropriate message
        if (isRetry) {
            this.updateLoaderMessage(`Retrying (${this.loadRetryCount}/${this.maxRetries})...`);
        } else {
            this.showLoader("Loading stream...");
        }
        
        // Set a timeout for the entire load operation
        const loadTimeout = setTimeout(() => {
            console.warn("Stream load timeout for:", url);
            if (!isRetry && this.loadRetryCount < this.maxRetries) {
                this.loadRetryCount++;
                console.log(`Retrying stream load (${this.loadRetryCount}/${this.maxRetries})...`);
                this.updateLoaderMessage(`Timeout, retrying (${this.loadRetryCount}/${this.maxRetries})...`);
                this.loadStream(url, drmConfig, headers, true);
            } else if (this.loadRetryCount >= this.maxRetries) {
                this.hideLoader();
                console.error("Failed to load stream after multiple attempts");
                // Don't show error message
            }
        }, 15000);
        
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
                
                setTimeout(() => {
                    if (this.videoPlayer && !this.videoPlayer.paused) {
                        this.videoPlayer.play().catch(e => console.warn("Play attempt:", e));
                    }
                }, 100);
                
                clearTimeout(loadTimeout);
                this.loadRetryCount = 0;
                this.hideLoader();
                return true;
            } 
            else if (isHls) {
                console.log("Loading HLS stream");
                if (Hls.isSupported()) {
                    return new Promise((resolve, reject) => {
                        let resolved = false;
                        let timeoutId = null;
                        
                        this.hlsPlayer = new Hls({
                            enableWorker: true,
                            lowLatencyMode: true,
                            autoStartLoad: true,
                            startPosition: -1,
                            manifestLoadTimeOut: 15000,
                            manifestLoadingTimeOut: 15000,
                            levelLoadingTimeOut: 15000,
                            fragLoadingTimeOut: 15000,
                            xhrSetup: (xhr, url) => {
                                if (headers && headers["User-Agent"]) {
                                    xhr.setRequestHeader("User-Agent", headers["User-Agent"]);
                                }
                            }
                        });
                        
                        this.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
                            if (!resolved) {
                                resolved = true;
                                if (timeoutId) clearTimeout(timeoutId);
                                clearTimeout(loadTimeout);
                                this.videoPlayer.play()
                                    .then(() => {
                                        console.log("HLS playback started");
                                        this.loadRetryCount = 0;
                                        this.hideLoader();
                                        resolve(true);
                                    })
                                    .catch(e => {
                                        console.warn("Autoplay blocked:", e);
                                        this.loadRetryCount = 0;
                                        this.hideLoader();
                                        resolve(true);
                                    });
                            }
                        });
                        
                        this.hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
                            console.error("HLS Error:", data);
                            if (data.fatal && !resolved) {
                                if (data.type === 'networkError' && !isRetry && this.loadRetryCount < this.maxRetries) {
                                    // Retry network errors
                                    resolved = true;
                                    if (timeoutId) clearTimeout(timeoutId);
                                    clearTimeout(loadTimeout);
                                    this.loadRetryCount++;
                                    console.log(`Retrying HLS stream (${this.loadRetryCount}/${this.maxRetries})...`);
                                    this.updateLoaderMessage(`Network error, retrying (${this.loadRetryCount}/${this.maxRetries})...`);
                                    setTimeout(() => {
                                        this.loadStream(url, drmConfig, headers, true)
                                            .then(resolve)
                                            .catch(reject);
                                    }, 2000);
                                } else if (data.type !== 'networkError') {
                                    resolved = true;
                                    if (timeoutId) clearTimeout(timeoutId);
                                    clearTimeout(loadTimeout);
                                    this.hideLoader();
                                    reject(new Error(data.details || "HLS stream error"));
                                }
                            }
                        });
                        
                        // Set a timeout for the manifest loading
                        timeoutId = setTimeout(() => {
                            if (!resolved) {
                                resolved = true;
                                clearTimeout(loadTimeout);
                                if (!isRetry && this.loadRetryCount < this.maxRetries) {
                                    this.loadRetryCount++;
                                    console.log(`Manifest timeout, retrying (${this.loadRetryCount}/${this.maxRetries})...`);
                                    this.updateLoaderMessage(`Loading timeout, retrying (${this.loadRetryCount}/${this.maxRetries})...`);
                                    this.loadStream(url, drmConfig, headers, true)
                                        .then(resolve)
                                        .catch(reject);
                                } else {
                                    console.warn("HLS manifest load timeout");
                                    this.hideLoader();
                                    reject(new Error("Stream load timeout"));
                                }
                            }
                        }, 10000);
                        
                        this.hlsPlayer.loadSource(url);
                        this.hlsPlayer.attachMedia(this.videoPlayer);
                    });
                } 
                else if (this.videoPlayer.canPlayType("application/vnd.apple.mpegurl")) {
                    this.videoPlayer.src = url;
                    await this.videoPlayer.play();
                    clearTimeout(loadTimeout);
                    this.loadRetryCount = 0;
                    this.hideLoader();
                    return true;
                } else {
                    throw new Error("HLS not supported in this browser");
                }
            }
            else {
                console.log("Loading direct stream (MP3/audio)");
                this.videoPlayer.src = url;
                await this.videoPlayer.play();
                clearTimeout(loadTimeout);
                this.loadRetryCount = 0;
                this.hideLoader();
                return true;
            }
        } catch (err) {
            clearTimeout(loadTimeout);
            console.error("loadStream error:", err);
            
            // Auto retry on error
            if (!isRetry && this.loadRetryCount < this.maxRetries) {
                this.loadRetryCount++;
                console.log(`Retrying after error (${this.loadRetryCount}/${this.maxRetries})...`);
                this.updateLoaderMessage(`Error, retrying (${this.loadRetryCount}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.loadStream(url, drmConfig, headers, true);
            }
            
            this.hideLoader();
            // Don't show error message to user, just log
            console.error(`Cannot play stream: ${err.message || "unknown error"}`);
            return false;
        }
    }
    
    async playChannel(channel) {
        if (!channel || !channel.streamUrl) {
            console.error("Invalid channel: missing stream URL");
            return false;
        }
        
        // Prevent multiple simultaneous loads
        if (this.isLoading) {
            console.log("Already loading a channel, waiting...");
            // Wait for current load to finish
            await new Promise(resolve => {
                const checkLoad = setInterval(() => {
                    if (!this.isLoading) {
                        clearInterval(checkLoad);
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(checkLoad);
                    resolve();
                }, 3000);
            });
        }
        
        this.isLoading = true;
        this.loadRetryCount = 0;
        
        // Show loader immediately
        this.showLoader("Loading channel...");
        
        // Show or hide radio logo based on channel type
        if (channel.type === "Radio") {
            this.showRadioLogo(channel);
        } else {
            this.hideRadioLogo();
        }
        
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
                // Hide radio logo on failure
                this.hideRadioLogo();
            }
            
            return success;
        } catch (error) {
            console.error("Error in playChannel:", error);
            this.hideRadioLogo();
            this.hideLoader();
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
                this.hideRadioLogo();
            } else {
                this.videoContainer.style.background = "linear-gradient(135deg, #1a1f2e 0%, #0f1222 100%)";
                // If there's a current channel playing that's radio, show its logo
                if (this.currentChannel && this.currentChannel.type === "Radio") {
                    this.showRadioLogo(this.currentChannel);
                }
            }
        }
    }
}

window.PlayerComponent = PlayerComponent;
