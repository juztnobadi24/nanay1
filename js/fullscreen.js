// ======================== FULLSCREEN MANAGER ========================

class FullscreenManager {
    constructor() {
        this.videoContainer = null;
        this.videoPlayer = null;
        this.sidebar = null;
        this.header = null;
        this.isVideoFullscreen = false;
        this.orientationHandler = this.handleOrientationChange.bind(this);
        this.resizeTimer = null;
        this.lastOrientation = null;
    }
    
    init(videoContainer, videoPlayer, sidebar, header) {
        this.videoContainer = videoContainer;
        this.videoPlayer = videoPlayer;
        this.sidebar = sidebar;
        this.header = header;
        
        // Store initial orientation
        this.lastOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', this.orientationHandler);
        window.addEventListener('resize', this.orientationHandler);
        
        // Listen for fullscreen change events
        document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('mozfullscreenchange', this.handleFullscreenChange.bind(this));
        
        // Listen for video play events to handle auto-fullscreen
        if (this.videoPlayer) {
            this.videoPlayer.addEventListener('play', () => {
                console.log("Video playing, checking fullscreen...");
                setTimeout(() => this.checkAndApplyFullscreen(), 100);
            });
            
            // Also check when video loads
            this.videoPlayer.addEventListener('loadeddata', () => {
                console.log("Video loaded, checking fullscreen...");
                setTimeout(() => this.checkAndApplyFullscreen(), 100);
            });
        }
        
        // Check initial orientation after a short delay
        setTimeout(() => this.checkAndApplyFullscreen(), 500);
        
        console.log("Fullscreen Manager initialized");
    }
    
    hideAddressBar() {
        // Function to hide browser address bar
        window.scrollTo(0, 1);
        
        // For iOS, ensure it stays hidden
        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 50);
        }
    }
    
    handleOrientationChange() {
        console.log("Orientation change detected");
        
        // Hide address bar immediately on orientation change
        this.hideAddressBar();
        
        // Clear any pending resize timer
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        
        // Wait for the orientation change to complete and layout to stabilize
        this.resizeTimer = setTimeout(() => {
            this.checkAndApplyFullscreen();
            this.resizeTimer = null;
        }, 200);
    }
    
    checkAndApplyFullscreen() {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        // For desktop, don't auto-fullscreen
        if (!isMobile) {
            console.log("Desktop device - no auto-fullscreen");
            return;
        }
        
        const isLandscape = window.innerWidth > window.innerHeight;
        const currentOrientation = isLandscape ? 'landscape' : 'portrait';
        
        // Log orientation change
        if (this.lastOrientation !== currentOrientation) {
            console.log(`Orientation changed: ${this.lastOrientation} -> ${currentOrientation}`);
            this.lastOrientation = currentOrientation;
        }
        
        // Get user settings - auto fullscreen for landscape only
        const autoFullscreen = localStorage.getItem('autoFullscreen');
        // Default to true for mobile if not set
        const finalAutoFullscreen = autoFullscreen === null ? true : autoFullscreen === 'true';
        
        console.log(`Orientation: ${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'}, AutoFullscreen: ${finalAutoFullscreen}, Currently in fullscreen: ${!!document.fullscreenElement}`);
        
        if (isLandscape) {
            // LANDSCAPE MODE: Go to video fullscreen if enabled
            if (finalAutoFullscreen) {
                // Check if we're already in fullscreen with video
                const isVideoFullscreenNow = document.fullscreenElement === this.videoContainer;
                
                if (!isVideoFullscreenNow) {
                    console.log("LANDSCAPE: Entering video fullscreen...");
                    this.enterVideoFullscreen();
                } else {
                    console.log("LANDSCAPE: Already in video fullscreen");
                }
                
                // If we're in any other fullscreen mode, exit it first
                if (document.fullscreenElement && document.fullscreenElement !== this.videoContainer) {
                    console.log("LANDSCAPE: Exiting other fullscreen mode");
                    this.exitFullscreen();
                    // Re-enter video fullscreen after exit
                    setTimeout(() => {
                        if (finalAutoFullscreen && document.fullscreenElement !== this.videoContainer) {
                            this.enterVideoFullscreen();
                        }
                    }, 100);
                }
            } else {
                // Auto-fullscreen disabled, make sure we're not in fullscreen
                if (document.fullscreenElement) {
                    console.log("LANDSCAPE: Auto-fullscreen disabled, exiting fullscreen");
                    this.exitFullscreen();
                } else {
                    // Even if not in fullscreen, hide address bar
                    this.hideAddressBar();
                }
            }
        } else {
            // PORTRAIT MODE: Exit any fullscreen immediately
            if (document.fullscreenElement) {
                console.log("PORTRAIT: Exiting fullscreen");
                this.exitFullscreen();
            } else {
                // Hide address bar in portrait mode as well
                this.hideAddressBar();
            }
        }
    }
    
    enterVideoFullscreen() {
        if (!this.videoContainer) {
            console.error("Video container not found");
            return;
        }
        
        // Don't enter if already in video fullscreen
        if (document.fullscreenElement === this.videoContainer) {
            console.log("Already in video fullscreen");
            this.isVideoFullscreen = true;
            return;
        }
        
        console.log("Entering video fullscreen...");
        
        // Hide sidebar and header immediately for better UX
        if (this.sidebar) this.sidebar.style.display = 'none';
        if (this.header) this.header.style.display = 'none';
        
        // Add class for styling
        document.body.classList.add('video-fullscreen-mode');
        
        // Scroll to top to hide address bar before entering fullscreen
        this.hideAddressBar();
        
        // Request fullscreen on video container
        const element = this.videoContainer;
        
        const requestFullscreen = () => {
            const fullscreenPromise = element.requestFullscreen ? element.requestFullscreen() :
                                      element.webkitRequestFullscreen ? element.webkitRequestFullscreen() :
                                      element.mozRequestFullScreen ? element.mozRequestFullScreen() :
                                      element.msRequestFullscreen ? element.msRequestFullscreen() : null;
            
            if (fullscreenPromise) {
                fullscreenPromise.then(() => {
                    console.log("Video fullscreen entered successfully");
                    this.isVideoFullscreen = true;
                    
                    // Additional scroll after fullscreen to ensure address bar is hidden
                    setTimeout(() => {
                        this.hideAddressBar();
                    }, 50);
                    
                    // Also hide address bar when touching video in fullscreen
                    if (this.videoContainer) {
                        const hideOnTouch = () => {
                            this.hideAddressBar();
                        };
                        this.videoContainer.addEventListener('touchstart', hideOnTouch);
                        this.videoContainer.addEventListener('click', hideOnTouch);
                        this.videoContainer._hideAddressBarHandler = hideOnTouch;
                    }
                }).catch(err => {
                    console.error("Video fullscreen failed:", err);
                    // Restore UI if fullscreen fails
                    if (this.sidebar) this.sidebar.style.display = '';
                    if (this.header) this.header.style.display = '';
                    document.body.classList.remove('video-fullscreen-mode');
                    this.isVideoFullscreen = false;
                    // Still try to hide address bar
                    this.hideAddressBar();
                });
            } else {
                // Fallback for browsers without Promise support
                this.isVideoFullscreen = true;
                setTimeout(() => {
                    this.hideAddressBar();
                }, 50);
            }
        };
        
        // Small delay to ensure DOM is ready
        setTimeout(requestFullscreen, 50);
    }
    
    exitVideoFullscreen() {
        console.log("Exiting video fullscreen...");
        
        // Remove touch handlers
        if (this.videoContainer && this.videoContainer._hideAddressBarHandler) {
            this.videoContainer.removeEventListener('touchstart', this.videoContainer._hideAddressBarHandler);
            this.videoContainer.removeEventListener('click', this.videoContainer._hideAddressBarHandler);
            delete this.videoContainer._hideAddressBarHandler;
        }
        
        // Exit fullscreen if video container is fullscreen
        if (document.fullscreenElement === this.videoContainer || 
            document.webkitFullscreenElement === this.videoContainer ||
            document.mozFullScreenElement === this.videoContainer) {
            
            const exitFullscreen = () => {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            };
            
            exitFullscreen();
        }
        
        // Restore sidebar and header
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        document.body.classList.remove('video-fullscreen-mode');
        
        this.isVideoFullscreen = false;
        
        // Hide address bar after exiting fullscreen
        setTimeout(() => {
            this.hideAddressBar();
        }, 100);
        
        // After exiting, check if we need to apply any settings
        setTimeout(() => {
            const isLandscape = window.innerWidth > window.innerHeight;
            if (!isLandscape) {
                this.hideAddressBar();
            }
        }, 150);
    }
    
    exitFullscreen() {
        console.log("Exiting fullscreen...");
        
        // Remove touch handlers if any
        if (this.videoContainer && this.videoContainer._hideAddressBarHandler) {
            this.videoContainer.removeEventListener('touchstart', this.videoContainer._hideAddressBarHandler);
            this.videoContainer.removeEventListener('click', this.videoContainer._hideAddressBarHandler);
            delete this.videoContainer._hideAddressBarHandler;
        }
        
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        this.isVideoFullscreen = false;
        
        // Restore UI
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        document.body.classList.remove('video-fullscreen-mode');
        document.body.classList.remove('website-fullscreen');
        
        // Hide address bar after exiting
        setTimeout(() => {
            this.hideAddressBar();
        }, 100);
    }
    
    handleFullscreenChange() {
        const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
        const isFullscreen = !!fsElement;
        
        console.log("Fullscreen change event, isFullscreen:", isFullscreen, "fsElement:", fsElement ? fsElement.tagName : 'none');
        
        if (!isFullscreen) {
            // We exited fullscreen completely
            console.log("Exited fullscreen completely");
            
            this.isVideoFullscreen = false;
            document.body.classList.remove('video-fullscreen-mode');
            document.body.classList.remove('website-fullscreen');
            
            // Restore UI
            if (this.sidebar) this.sidebar.style.display = '';
            if (this.header) this.header.style.display = '';
            
            // Hide address bar after exiting fullscreen
            setTimeout(() => {
                this.hideAddressBar();
            }, 100);
            
            // Check if we need to re-enter based on current orientation
            setTimeout(() => {
                const isLandscape = window.innerWidth > window.innerHeight;
                if (isLandscape) {
                    // If we're in landscape and exited, re-enter video fullscreen
                    console.log("Re-checking fullscreen after exit...");
                    this.checkAndApplyFullscreen();
                } else {
                    // In portrait, just hide address bar
                    this.hideAddressBar();
                }
            }, 100);
        } else {
            // We entered fullscreen on some element
            if (fsElement === this.videoContainer) {
                this.isVideoFullscreen = true;
                console.log("Video is fullscreen");
                
                // Ensure UI is hidden when video is fullscreen
                if (this.sidebar) this.sidebar.style.display = 'none';
                if (this.header) this.header.style.display = 'none';
                
                // Hide address bar immediately when entering video fullscreen
                setTimeout(() => {
                    this.hideAddressBar();
                }, 50);
                
                // Add touch handler to keep address bar hidden while in fullscreen
                if (this.videoContainer && !this.videoContainer._hideAddressBarHandler) {
                    const hideOnTouch = () => {
                        this.hideAddressBar();
                    };
                    this.videoContainer.addEventListener('touchstart', hideOnTouch);
                    this.videoContainer.addEventListener('click', hideOnTouch);
                    this.videoContainer._hideAddressBarHandler = hideOnTouch;
                }
            }
        }
    }
    
    toggleFullscreen() {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (isMobile) {
            if (this.isVideoFullscreen) {
                this.exitVideoFullscreen();
            } else {
                this.enterVideoFullscreen();
            }
        } else {
            // Desktop - toggle website fullscreen (optional)
            if (document.fullscreenElement) {
                this.exitFullscreen();
            } else {
                // For desktop, just do website fullscreen
                const element = document.documentElement;
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                }
            }
        }
        
        // Always hide address bar after toggling
        setTimeout(() => {
            this.hideAddressBar();
        }, 100);
    }
    
    destroy() {
        // Remove touch handlers
        if (this.videoContainer && this.videoContainer._hideAddressBarHandler) {
            this.videoContainer.removeEventListener('touchstart', this.videoContainer._hideAddressBarHandler);
            this.videoContainer.removeEventListener('click', this.videoContainer._hideAddressBarHandler);
            delete this.videoContainer._hideAddressBarHandler;
        }
        
        window.removeEventListener('orientationchange', this.orientationHandler);
        window.removeEventListener('resize', this.orientationHandler);
        
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        
        // Exit any active fullscreen
        if (this.isVideoFullscreen) {
            this.exitFullscreen();
        }
        
        // Restore UI
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        document.body.classList.remove('video-fullscreen-mode');
        document.body.classList.remove('website-fullscreen');
        
        // Hide address bar on destroy
        this.hideAddressBar();
    }
}

window.FullscreenManager = FullscreenManager;
