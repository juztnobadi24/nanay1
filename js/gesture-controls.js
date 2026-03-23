// ======================== GESTURE CONTROLS ========================

class GestureControls {
    constructor(videoElement, videoContainer) {
        this.videoElement = videoElement;
        this.videoContainer = videoContainer;
        
        // State variables
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragStartValue = 0;
        this.dragSide = null; // 'left' for brightness, 'right' for volume
        this.dragStartTime = 0;
        
        // Settings
        this.brightness = localStorage.getItem('videoBrightness') ? parseFloat(localStorage.getItem('videoBrightness')) : 1.0;
        this.volume = localStorage.getItem('videoVolume') ? parseFloat(localStorage.getItem('videoVolume')) : 0.8;
        this.gestureSensitivity = 0.5; // 0.5% per pixel
        
        // UI Elements
        this.overlay = null;
        this.controlIndicator = null;
        
        // Bind methods
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        
        // Initialize
        this.init();
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
    
    init() {
        // Set initial brightness and volume
        this.applyBrightness();
        this.applyVolume();
        
        // Create overlay for gesture detection
        this.createOverlay();
        
        // Attach event listeners
        this.attachEvents();
        
        // Listen for volume changes from other sources
        if (this.videoElement) {
            this.videoElement.addEventListener('volumechange', () => {
                if (!this.isDragging) {
                    this.volume = this.videoElement.volume;
                    localStorage.setItem('videoVolume', this.volume);
                }
            });
        }
        
        // Listen for orientation changes to reposition indicator
        window.addEventListener('resize', () => this.updateIndicatorPosition());
        window.addEventListener('orientationchange', () => setTimeout(() => this.updateIndicatorPosition(), 100));
    }
    
    updateIndicatorPosition() {
        if (this.controlIndicator && this.videoContainer) {
            const rect = this.videoContainer.getBoundingClientRect();
            this.controlIndicator.style.top = `${rect.height / 2}px`;
            this.controlIndicator.style.left = `${rect.width / 2}px`;
        }
    }
    
    getIndicatorSize() {
        // Much smaller sizes for mobile
        const screenWidth = window.innerWidth;
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (screenWidth <= 480) {
            // Very small phones - tiny indicator
            return {
                padding: '4px 12px',
                fontSize: '0.65rem',
                iconSize: '0.85rem',
                borderRadius: '24px',
                gap: '6px'
            };
        } else if (screenWidth <= 640) {
            // Small phones
            return {
                padding: '6px 14px',
                fontSize: '0.7rem',
                iconSize: '0.9rem',
                borderRadius: '28px',
                gap: '6px'
            };
        } else if (screenWidth <= 768) {
            // Medium phones / large phones
            return {
                padding: '8px 16px',
                fontSize: '0.75rem',
                iconSize: '1rem',
                borderRadius: '32px',
                gap: '8px'
            };
        } else {
            // Tablets and desktop
            return {
                padding: '10px 20px',
                fontSize: '0.85rem',
                iconSize: '1.1rem',
                borderRadius: '36px',
                gap: '10px'
            };
        }
    }
    
    createOverlay() {
        // Create transparent overlay for gesture detection
        this.overlay = document.createElement('div');
        this.overlay.className = 'gesture-overlay';
        this.overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 5;
            background: transparent;
            touch-action: none;
        `;
        
        if (this.videoContainer) {
            this.videoContainer.style.position = 'relative';
            this.videoContainer.appendChild(this.overlay);
        }
        
        // Get responsive sizes
        const sizes = this.getIndicatorSize();
        
        // Create control indicator (shows current value) - MUCH SMALLER
        this.controlIndicator = document.createElement('div');
        this.controlIndicator.className = 'control-indicator';
        this.controlIndicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(12px);
            border-radius: ${sizes.borderRadius};
            padding: ${sizes.padding};
            display: flex;
            align-items: center;
            justify-content: center;
            gap: ${sizes.gap};
            z-index: 10;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease;
            pointer-events: none;
            font-size: ${sizes.fontSize};
            font-weight: 500;
            color: white;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
        `;
        
        // Add icon span with specific size
        const iconSpan = document.createElement('span');
        iconSpan.className = 'indicator-icon';
        iconSpan.style.cssText = `
            font-size: ${sizes.iconSize};
            display: inline-flex;
            align-items: center;
            justify-content: center;
        `;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'indicator-text';
        
        this.controlIndicator.appendChild(iconSpan);
        this.controlIndicator.appendChild(textSpan);
        this.videoContainer.appendChild(this.controlIndicator);
        
        // Store references
        this.indicatorIcon = iconSpan;
        this.indicatorText = textSpan;
    }
    
    attachEvents() {
        // Touch events for mobile
        if (this.overlay) {
            this.overlay.addEventListener('touchstart', this.handleTouchStart);
            this.overlay.addEventListener('touchmove', this.handleTouchMove);
            this.overlay.addEventListener('touchend', this.handleTouchEnd);
            
            // Mouse events for desktop
            this.overlay.addEventListener('mousedown', this.handleMouseDown);
            window.addEventListener('mousemove', this.handleMouseMove);
            window.addEventListener('mouseup', this.handleMouseUp);
        }
    }
    
    getDragZone(x, width) {
        // Left 30% = brightness, Right 30% = volume, Middle 40% = no gesture
        const leftZone = width * 0.3;
        const rightZone = width * 0.7; // 70% from left, so right 30% starts at 70%
        
        if (x <= leftZone) {
            return 'left'; // Brightness control
        } else if (x >= rightZone) {
            return 'right'; // Volume control
        } else {
            return 'none'; // No gesture in middle 40%
        }
    }
    
    handleTouchStart(e) {
        // Hide address bar on any touch interaction
        this.hideAddressBar();
        
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.overlay.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const width = rect.width;
        
        // Determine which zone (left 30%, middle 40%, right 30%)
        const zone = this.getDragZone(x, width);
        
        if (zone === 'left') {
            this.dragSide = 'left';
            this.dragStartValue = this.brightness;
            this.showControlIndicator('brightness', this.brightness);
            this.isDragging = true;
        } else if (zone === 'right') {
            this.dragSide = 'right';
            this.dragStartValue = this.volume;
            this.showControlIndicator('volume', this.volume);
            this.isDragging = true;
        } else {
            // Middle zone - no gesture
            this.dragSide = null;
            this.isDragging = false;
            return;
        }
        
        this.dragStartX = touch.clientX;
        this.dragStartY = touch.clientY;
        this.dragStartTime = Date.now();
    }
    
    handleTouchMove(e) {
        // Hide address bar during gesture movement
        this.hideAddressBar();
        
        if (!this.isDragging || !this.dragSide) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaY = this.dragStartY - touch.clientY;
        
        // Calculate new value (sensitivity: 0.5% per pixel, max 100 pixels for full range)
        const deltaValue = deltaY * this.gestureSensitivity / 100;
        let newValue = this.dragStartValue + deltaValue;
        
        // Clamp between 0 and 1
        newValue = Math.max(0, Math.min(1, newValue));
        
        // Apply to appropriate control
        if (this.dragSide === 'left') {
            this.brightness = newValue;
            this.applyBrightness();
            this.updateControlIndicator('brightness', this.brightness);
        } else if (this.dragSide === 'right') {
            this.volume = newValue;
            this.applyVolume();
            this.updateControlIndicator('volume', this.volume);
        }
    }
    
    handleTouchEnd(e) {
        // Hide address bar on touch end
        this.hideAddressBar();
        
        if (!this.isDragging) {
            this.dragSide = null;
            return;
        }
        e.preventDefault();
        
        // Save settings to localStorage
        localStorage.setItem('videoBrightness', this.brightness);
        localStorage.setItem('videoVolume', this.volume);
        
        this.isDragging = false;
        this.dragSide = null;
        
        // Hide indicator after a short delay
        setTimeout(() => {
            if (!this.isDragging) {
                this.hideControlIndicator();
            }
        }, 500);
    }
    
    handleMouseDown(e) {
        // Hide address bar on mouse down
        this.hideAddressBar();
        
        e.preventDefault();
        const rect = this.overlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        
        // Determine which zone (left 30%, middle 40%, right 30%)
        const zone = this.getDragZone(x, width);
        
        if (zone === 'left') {
            this.dragSide = 'left';
            this.dragStartValue = this.brightness;
            this.showControlIndicator('brightness', this.brightness);
            this.isDragging = true;
        } else if (zone === 'right') {
            this.dragSide = 'right';
            this.dragStartValue = this.volume;
            this.showControlIndicator('volume', this.volume);
            this.isDragging = true;
        } else {
            this.dragSide = null;
            this.isDragging = false;
            return;
        }
        
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragStartTime = Date.now();
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || !this.dragSide) return;
        e.preventDefault();
        
        const deltaY = this.dragStartY - e.clientY;
        const deltaValue = deltaY * this.gestureSensitivity / 100;
        let newValue = this.dragStartValue + deltaValue;
        newValue = Math.max(0, Math.min(1, newValue));
        
        if (this.dragSide === 'left') {
            this.brightness = newValue;
            this.applyBrightness();
            this.updateControlIndicator('brightness', this.brightness);
        } else if (this.dragSide === 'right') {
            this.volume = newValue;
            this.applyVolume();
            this.updateControlIndicator('volume', this.volume);
        }
    }
    
    handleMouseUp(e) {
        if (!this.isDragging) {
            this.dragSide = null;
            return;
        }
        
        localStorage.setItem('videoBrightness', this.brightness);
        localStorage.setItem('videoVolume', this.volume);
        
        this.isDragging = false;
        this.dragSide = null;
        
        setTimeout(() => {
            if (!this.isDragging) {
                this.hideControlIndicator();
            }
        }, 500);
    }
    
    applyBrightness() {
        if (this.videoContainer) {
            // Apply brightness filter to video container only, no background color change
            this.videoContainer.style.filter = `brightness(${this.brightness * 100}%)`;
        }
    }
    
    applyVolume() {
        if (this.videoElement) {
            this.videoElement.volume = this.volume;
        }
    }
    
    showControlIndicator(type, value) {
        if (!this.controlIndicator || !this.indicatorIcon || !this.indicatorText) return;
        
        // Update styles based on current screen size (responsive)
        const sizes = this.getIndicatorSize();
        this.controlIndicator.style.padding = sizes.padding;
        this.controlIndicator.style.borderRadius = sizes.borderRadius;
        this.controlIndicator.style.gap = sizes.gap;
        this.controlIndicator.style.fontSize = sizes.fontSize;
        this.indicatorIcon.style.fontSize = sizes.iconSize;
        
        const percentage = Math.round(value * 100);
        let icon = '';
        
        if (type === 'brightness') {
            if (percentage > 70) icon = '☀️';
            else if (percentage > 30) icon = '🌤️';
            else icon = '🌙';
        } else {
            if (percentage > 70) icon = '🔊';
            else if (percentage > 30) icon = '🔉';
            else icon = '🔈';
        }
        
        this.indicatorIcon.textContent = icon;
        this.indicatorText.textContent = `${percentage}%`;
        
        this.controlIndicator.style.opacity = '1';
        this.controlIndicator.style.visibility = 'visible';
    }
    
    updateControlIndicator(type, value) {
        if (!this.controlIndicator || !this.isDragging || !this.indicatorIcon || !this.indicatorText) return;
        
        const percentage = Math.round(value * 100);
        let icon = '';
        
        if (type === 'brightness') {
            if (percentage > 70) icon = '☀️';
            else if (percentage > 30) icon = '🌤️';
            else icon = '🌙';
        } else {
            if (percentage > 70) icon = '🔊';
            else if (percentage > 30) icon = '🔉';
            else icon = '🔈';
        }
        
        this.indicatorIcon.textContent = icon;
        this.indicatorText.textContent = `${percentage}%`;
    }
    
    hideControlIndicator() {
        if (this.controlIndicator) {
            this.controlIndicator.style.opacity = '0';
            this.controlIndicator.style.visibility = 'hidden';
        }
    }
    
    setBrightness(value) {
        this.brightness = Math.max(0, Math.min(1, value));
        this.applyBrightness();
        localStorage.setItem('videoBrightness', this.brightness);
    }
    
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        this.applyVolume();
        localStorage.setItem('videoVolume', this.volume);
    }
    
    getBrightness() {
        return this.brightness;
    }
    
    getVolume() {
        return this.volume;
    }
    
    destroy() {
        // Remove event listeners
        if (this.overlay) {
            this.overlay.removeEventListener('touchstart', this.handleTouchStart);
            this.overlay.removeEventListener('touchmove', this.handleTouchMove);
            this.overlay.removeEventListener('touchend', this.handleTouchEnd);
            this.overlay.removeEventListener('mousedown', this.handleMouseDown);
            this.overlay.remove();
        }
        
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('resize', this.updateIndicatorPosition);
        window.removeEventListener('orientationchange', this.updateIndicatorPosition);
        
        // Remove indicator
        if (this.controlIndicator) {
            this.controlIndicator.remove();
        }
        
        // Reset brightness filter
        if (this.videoContainer) {
            this.videoContainer.style.filter = '';
        }
        
        // Hide address bar on destroy
        this.hideAddressBar();
    }
}

window.GestureControls = GestureControls;
