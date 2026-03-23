// ======================== FULLSCREEN MANAGER ========================

class FullscreenManager {
    constructor() {
        this.videoContainer = null;
        this.videoPlayer = null;
        this.isFullscreen = false;
        this.sidebar = null;
        this.header = null;
        this.originalLayout = null;
        this.orientationHandler = this.handleOrientationChange.bind(this);
        this.settingsModal = null;
        this.isWebsiteFullscreen = false; // Track website fullscreen state
        this.lastOrientation = null;
        this.exitFullscreenTimeout = null;
    }
    
    init(videoContainer, videoPlayer, sidebar, header, settingsModal) {
        this.videoContainer = videoContainer;
        this.videoPlayer = videoPlayer;
        this.sidebar = sidebar;
        this.header = header;
        this.settingsModal = settingsModal;
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', this.orientationHandler);
        window.addEventListener('resize', this.orientationHandler);
        
        // Listen for fullscreen change events
        document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('mozfullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('MSFullscreenChange', this.handleFullscreenChange.bind(this));
        
        // Add double-click to fullscreen on video container
        if (this.videoContainer) {
            this.videoContainer.addEventListener('dblclick', () => this.toggleFullscreen());
        }
        
        // Initial check for orientation
        setTimeout(() => this.handleOrientationChange(), 100);
    }
    
    handleOrientationChange() {
        // Clear any pending exit timeout
        if (this.exitFullscreenTimeout) {
            clearTimeout(this.exitFullscreenTimeout);
        }
        
        setTimeout(() => {
            this.checkAndApplyFullscreen();
        }, 100);
    }
    
    checkAndApplyFullscreen() {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isLandscape = window.innerWidth > window.innerHeight;
        
        // Get user settings
        const autoFullscreen = localStorage.getItem('autoFullscreen') === 'true';
        const mobileFullscreenPortrait = localStorage.getItem('mobileFullscreenPortrait') !== 'false';
        
        if (!isMobile) return;
        
        console.log(`Orientation: ${isLandscape ? 'Landscape' : 'Portrait'}, AutoFullscreen: ${autoFullscreen}, PortraitFullscreen: ${mobileFullscreenPortrait}`);
        
        if (isLandscape) {
            // LANDSCAPE MODE: Video fullscreen
            if (autoFullscreen && !this.isFullscreen) {
                // Exit website fullscreen first if active
                if (this.isWebsiteFullscreen) {
                    this.exitWebsiteFullscreen();
                }
                this.enterVideoFullscreen();
            } else if (!autoFullscreen && (this.isFullscreen || this.isWebsiteFullscreen)) {
                this.exitFullscreen();
            }
        } else {
            // PORTRAIT MODE: Website fullscreen (entire app)
            if (mobileFullscreenPortrait && !this.isWebsiteFullscreen) {
                // Ensure video fullscreen is off first
                if (this.isFullscreen) {
                    this.exitVideoFullscreen();
                }
                this.enterWebsiteFullscreen();
            } else if (!mobileFullscreenPortrait && this.isWebsiteFullscreen) {
                this.exitWebsiteFullscreen();
            }
        }
    }
    
    enterVideoFullscreen() {
        if (!this.videoContainer) return;
        
        const element = this.videoContainer;
        
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(err => {
                console.log("Video fullscreen failed:", err);
            });
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        
        // Store original layout before fullscreen
        this.originalLayout = {
            sidebarDisplay: this.sidebar ? this.sidebar.style.display : null,
            headerDisplay: this.header ? this.header.style.display : null
        };
        
        // Hide sidebar and header in video fullscreen
        if (this.sidebar) this.sidebar.style.display = 'none';
        if (this.header) this.header.style.display = 'none';
        
        // Make video container take full space
        if (this.videoContainer) {
            this.videoContainer.style.position = 'fixed';
            this.videoContainer.style.top = '0';
            this.videoContainer.style.left = '0';
            this.videoContainer.style.width = '100%';
            this.videoContainer.style.height = '100%';
            this.videoContainer.style.zIndex = '9999';
            this.videoContainer.style.borderRadius = '0';
        }
        
        if (this.videoPlayer) {
            this.videoPlayer.style.objectFit = 'contain';
        }
        
        this.isFullscreen = true;
        this.isWebsiteFullscreen = false;
        
        console.log("Entered video fullscreen (landscape mode)");
    }
    
    exitVideoFullscreen() {
        if (!this.isFullscreen) return;
        
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        // Restore layout
        this.restoreVideoLayout();
        this.isFullscreen = false;
        
        console.log("Exited video fullscreen");
    }
    
    enterWebsiteFullscreen() {
        if (this.isWebsiteFullscreen) return;
        
        const element = document.documentElement; // Full website
        
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(err => {
                console.log("Website fullscreen failed:", err);
            });
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        
        this.isWebsiteFullscreen = true;
        this.isFullscreen = false;
        document.body.classList.add('website-fullscreen');
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('websiteFullscreenChange', { 
            detail: { isFullscreen: true } 
        }));
        
        console.log("Entered website fullscreen (portrait mode)");
    }
    
    exitWebsiteFullscreen() {
        if (!this.isWebsiteFullscreen) return;
        
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        this.isWebsiteFullscreen = false;
        document.body.classList.remove('website-fullscreen');
        
        window.dispatchEvent(new CustomEvent('websiteFullscreenChange', { 
            detail: { isFullscreen: false } 
        }));
        
        console.log("Exited website fullscreen");
    }
    
    handleFullscreenChange() {
        // Check if we're in fullscreen mode
        const isCurrentlyFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
        
        if (!isCurrentlyFullscreen) {
            // Exited fullscreen - check what mode we should be in based on orientation
            this.exitFullscreenTimeout = setTimeout(() => {
                this.checkAndApplyFullscreen();
                this.exitFullscreenTimeout = null;
            }, 100);
        } else {
            // Entered fullscreen - check if it's video or website fullscreen
            const isVideoFullscreen = document.fullscreenElement === this.videoContainer ||
                                      document.webkitFullscreenElement === this.videoContainer ||
                                      document.mozFullScreenElement === this.videoContainer;
            
            if (!isVideoFullscreen) {
                // Website fullscreen
                this.isWebsiteFullscreen = true;
                this.isFullscreen = false;
                document.body.classList.add('website-fullscreen');
            } else {
                // Video fullscreen
                this.isFullscreen = true;
                this.isWebsiteFullscreen = false;
            }
        }
    }
    
    restoreVideoLayout() {
        // Restore sidebar and header
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        
        // Restore video container
        if (this.videoContainer) {
            this.videoContainer.style.position = '';
            this.videoContainer.style.top = '';
            this.videoContainer.style.left = '';
            this.videoContainer.style.width = '';
            this.videoContainer.style.height = '';
            this.videoContainer.style.zIndex = '';
            this.videoContainer.style.borderRadius = '';
        }
        
        // Trigger a resize to refresh layout
        window.dispatchEvent(new Event('resize'));
    }
    
    exitFullscreen() {
        if (this.exitFullscreenTimeout) {
            clearTimeout(this.exitFullscreenTimeout);
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
        
        this.restoreVideoLayout();
        this.isFullscreen = false;
        this.isWebsiteFullscreen = false;
        document.body.classList.remove('website-fullscreen');
        
        console.log("Exited all fullscreen modes");
        
        // Re-apply correct mode based on orientation
        setTimeout(() => {
            this.checkAndApplyFullscreen();
        }, 200);
    }
    
    toggleFullscreen() {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (isMobile && isLandscape) {
            // In landscape, toggle video fullscreen
            if (this.isFullscreen) {
                this.exitVideoFullscreen();
            } else {
                // Exit website fullscreen first if active
                if (this.isWebsiteFullscreen) {
                    this.exitWebsiteFullscreen();
                }
                this.enterVideoFullscreen();
            }
        } else if (isMobile && !isLandscape) {
            // In portrait, toggle website fullscreen
            if (this.isWebsiteFullscreen) {
                this.exitWebsiteFullscreen();
            } else {
                this.enterWebsiteFullscreen();
            }
        } else {
            // Desktop: toggle video fullscreen
            if (this.isFullscreen) {
                this.exitVideoFullscreen();
            } else {
                this.enterVideoFullscreen();
            }
        }
    }
    
    destroy() {
        if (this.exitFullscreenTimeout) {
            clearTimeout(this.exitFullscreenTimeout);
        }
        window.removeEventListener('orientationchange', this.orientationHandler);
        window.removeEventListener('resize', this.orientationHandler);
    }
}

window.FullscreenManager = FullscreenManager;
