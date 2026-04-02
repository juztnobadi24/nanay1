// ======================== SLIDESHOW COMPONENT ========================
// Handles slideshow functionality for the player area when no channel is playing

class SlideshowComponent {
    constructor() {
        this.container = null;
        this.slideshowContainer = null;
        this.slideshowSlides = null;
        this.slideshowDots = null;
        this.slideshowImages = [];
        this.currentSlideIndex = 0;
        this.originalSlideIndex = 0;
        this.slideshowInterval = null;
        this.slideshowEnabled = true;
        this.isSlideshowActive = true;  // Start active by default
        this.slideshowDuration = 5000;  // 5 seconds
        this.totalSlides = 0;
        this.slideshowInitialized = false;
        this.touchStartX = 0;
        this.isPaused = false;
        
        // Bind methods
        this.nextSlide = this.nextSlide.bind(this);
        this.prevSlide = this.prevSlide.bind(this);
        this.goToSlide = this.goToSlide.bind(this);
        this.startSlideshow = this.startSlideshow.bind(this);
        this.stopSlideshow = this.stopSlideshow.bind(this);
        this.pauseSlideshow = this.pauseSlideshow.bind(this);
        this.resumeSlideshow = this.resumeSlideshow.bind(this);
        this.showSlideshow = this.showSlideshow.bind(this);
        this.hideSlideshow = this.hideSlideshow.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
    }
    
    
    // Initialize slideshow with default images
    init(containerElement) {
        this.container = containerElement;
        
        // Define default slideshow images with channel links
        this.slideshowImages = [
            {
                image: "sdtv.jpg",
                title: "Sdtv Network",
                channelName: "Sdtv Network",
                channelType: "TV"
            },
            {
                image: "https://image.tmdb.org/t/p/original/vDQb06miaaW7C2GUPeMNDmyqWec.jpg",
                title: "The Prince of Egypt",
                channelName: "The Prince of Egypt (1998)",
                channelType: "Movies",
                isMoviesCollection: true
            },
            {
                image: "https://images.angelstudios.com/image/upload/q_auto,w_930,h_523,f_webp,c_scale/v1762380415/studio-app/catalog/2e4f0d11-1b19-4e6b-b8c1-a961c938fe2f",
                title: "David",
                channelName: "David (2025)",
                channelType: "Movies",
                isMoviesCollection: true
            },
            {
                image: "https://static1.colliderimages.com/wordpress/wp-content/uploads/2021/11/best-kids-family-movies-hbo-max.jpg",
                title: "HBO Family",
                channelName: "HBO Family",
                channelType: "TV"
            },
            {
                image: "https://i0.wp.com/anitrendz.net/news/wp-content/uploads/2019/01/Aniplus_Asia_Winter_2019_Simulcast.png",
                title: "AniPlus",
                channelName: "AniPlus",
                channelType: "TV"
            },
            {
                image: "https://library.sportingnews.com/styles/twitter_card_120x120/s3/2023-10/GFX-1143%20NBA%20TV%20schedule%20FTR.jpg?itok=B1xtr2Cl",
                title: "NBA TV",
                channelName: "NBA TV",
                channelType: "TV"
            },
            {
                image: "https://cdn-images-3.listennotes.com/podcasts/barangay-love-stories-barangay-ls-971-RKoFbLgJBxS-vTnha6cPKXt.1400x1400.jpg",
                title: "97.1 Barangay LS",
                channelName: "97.1 Barangay LS",
                channelType: "Radio",
                isRadioCollection: true
            },
            {
                image: "https://m.media-amazon.com/images/I/81DNOVqynxL.jpg",
                title: "Kartoon Channel HD",
                channelName: "Kartoon Channel HD",
                channelType: "TV"
            }
        ];
        
        this.totalSlides = this.slideshowImages.length;
        this.render();
        this.attachEvents();
        this.slideshowInitialized = true;
        
        // IMPORTANT: Start slideshow auto-play after a short delay
        setTimeout(() => {
            if (this.isSlideshowActive && this.slideshowEnabled) {
                this.startSlideshow();
                console.log("Slideshow auto-play started with", this.totalSlides, "slides, interval:", this.slideshowDuration, "ms");
            }
        }, 500);
        
        console.log("Slideshow component initialized with", this.totalSlides, "slides");
    }
    
    // Render slideshow HTML
    render() {
        if (!this.container) return;
        
        // Check if slideshow container already exists
        let existingContainer = this.container.querySelector('#slideshowContainer');
        if (existingContainer) {
            this.slideshowContainer = existingContainer;
            this.slideshowSlides = this.slideshowContainer.querySelector('#slideshowSlides');
            this.slideshowDots = this.slideshowContainer.querySelector('#slideshowDots');
            this.updateSlideshowContent();
            return;
        }
        
        // Create slideshow container
        const slideshowHTML = `
            <div class="slideshow-container" id="slideshowContainer" style="display: flex;">
                <div class="slideshow-wrapper" id="slideshowWrapper">
                    <div class="slideshow-slides" id="slideshowSlides"></div>
                    <button class="slideshow-prev" id="slideshowPrevBtn"><i class="fas fa-chevron-left"></i></button>
                    <button class="slideshow-next" id="slideshowNextBtn"><i class="fas fa-chevron-right"></i></button>
                    <div class="slideshow-dots" id="slideshowDots"></div>
                </div>
            </div>
        `;
        
        this.container.insertAdjacentHTML('beforeend', slideshowHTML);
        this.slideshowContainer = document.getElementById('slideshowContainer');
        this.slideshowSlides = document.getElementById('slideshowSlides');
        this.slideshowDots = document.getElementById('slideshowDots');
        
        this.updateSlideshowContent();
    }
    
    // Update slideshow content (images and dots)
    updateSlideshowContent() {
        if (!this.slideshowSlides || !this.slideshowDots) return;
        
        // Create array for infinite loop by duplicating slides
        const infiniteImages = [...this.slideshowImages, ...this.slideshowImages, ...this.slideshowImages];
        
        // Render slides
        let slidesHtml = '';
        let dotsHtml = '';
        
        // Create dots for original images
        this.slideshowImages.forEach((slide, index) => {
            dotsHtml += `
                <div class="slideshow-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>
            `;
        });
        
        // Create slides with duplicate images for infinite loop
        infiniteImages.forEach((slide, idx) => {
            const originalIndex = idx % this.slideshowImages.length;
            slidesHtml += `
                <div class="slideshow-slide" data-index="${originalIndex}" 
                     data-channel="${slide.channelName || ''}" 
                     data-channel-type="${slide.channelType || 'TV'}"
                     data-is-radio="${slide.isRadioCollection || false}" 
                     data-is-movies="${slide.isMoviesCollection || false}">
                    <img src="${slide.image}" alt="${slide.title}" class="slideshow-image" loading="lazy">
                    <div class="slideshow-caption">
                        <h3>${this.escapeHtml(slide.title)}</h3>
                        <p>Click to play</p>
                    </div>
                </div>
            `;
        });
        
        this.slideshowSlides.innerHTML = slidesHtml;
        this.slideshowDots.innerHTML = dotsHtml;
        
        // Set initial position to the middle set
        const startPosition = -(this.slideshowImages.length * 100);
        this.slideshowSlides.style.transform = `translateX(${startPosition}%)`;
        this.currentSlideIndex = this.slideshowImages.length;
        this.originalSlideIndex = 0;
        
        // Update active dot
        this.updateActiveDot(0);
    }
    
    escapeHtml(str) {
        if (!str) return "";
        return str.replace(/[&<>]/g, function(m) {
            if (m === "&") return "&amp;";
            if (m === "<") return "&lt;";
            if (m === ">") return "&gt;";
            return m;
        });
    }
    
    // Attach event listeners
    attachEvents() {
        if (!this.slideshowContainer) return;
        
        // Navigation buttons
        const prevBtn = document.getElementById("slideshowPrevBtn");
        const nextBtn = document.getElementById("slideshowNextBtn");
        
        if (prevBtn) {
            prevBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.prevSlide();
                this.resetSlideshowTimer();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.nextSlide();
                this.resetSlideshowTimer();
            });
        }
        
        // Hover events to pause/resume
        this.slideshowContainer.addEventListener("mouseenter", this.handleMouseEnter);
        this.slideshowContainer.addEventListener("mouseleave", this.handleMouseLeave);
        
        // Touch events for mobile swipe
        this.slideshowContainer.addEventListener("touchstart", this.handleTouchStart);
        this.slideshowContainer.addEventListener("touchend", this.handleTouchEnd);
        
        // Click events on slides
        this.slideshowSlides.addEventListener('click', (e) => {
            const slide = e.target.closest('.slideshow-slide');
            if (slide) {
                this.handleSlideClick(slide);
            }
        });
        
        // Dot click events
        this.slideshowDots.addEventListener('click', (e) => {
            const dot = e.target.closest('.slideshow-dot');
            if (dot && dot.dataset.index !== undefined) {
                e.stopPropagation();
                const index = parseInt(dot.dataset.index);
                this.goToSlide(index);
                this.resetSlideshowTimer();
            }
        });
    }
    
    // Handle slide click to play channel
    handleSlideClick(slide) {
        const originalIndex = parseInt(slide.dataset.index);
        const channelName = slide.dataset.channel;
        const channelType = slide.dataset.channelType;
        const isRadio = slide.dataset.isRadio === 'true';
        const isMovies = slide.dataset.isMovies === 'true';
        
        if (channelName && typeof window.onChannelSelect === 'function') {
            // Find channel in channels data
            const channel = window.channelsData?.find(ch => ch.name === channelName);
            if (channel) {
                window.onChannelSelect(channel);
            }
        } else if (isRadio && typeof window.onModeChange === 'function') {
            window.onModeChange('radio');
        } else if (isMovies && typeof window.onModeChange === 'function') {
            window.onModeChange('movies');
        }
    }
    
    // Handle touch start for swipe detection
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
    }
    
    // Handle touch end for swipe detection
    handleTouchEnd(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = this.touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                this.nextSlide();
            } else {
                this.prevSlide();
            }
            this.resetSlideshowTimer();
        }
    }
    
    // Handle mouse enter (pause slideshow)
    handleMouseEnter() {
        this.pauseSlideshow();
    }
    
    // Handle mouse leave (resume slideshow)
    handleMouseLeave() {
        this.resumeSlideshow();
    }
    
    // Update active slide position with animation
    updateActiveSlide(index) {
        if (!this.slideshowSlides) return;
        
        const position = -(index * 100);
        
        this.slideshowSlides.style.transition = 'transform 0.5s ease-in-out';
        this.slideshowSlides.style.transform = `translateX(${position}%)`;
        
        setTimeout(() => {
            // Handle infinite loop wrapping
            if (index >= this.slideshowImages.length * 2) {
                this.slideshowSlides.style.transition = 'none';
                const resetPosition = -(this.slideshowImages.length * 100);
                this.slideshowSlides.style.transform = `translateX(${resetPosition}%)`;
                this.currentSlideIndex = this.slideshowImages.length;
                // Force reflow
                this.slideshowSlides.offsetHeight;
                this.slideshowSlides.style.transition = 'transform 0.5s ease-in-out';
            } else if (index < this.slideshowImages.length) {
                this.slideshowSlides.style.transition = 'none';
                const resetPosition = -(this.slideshowImages.length * 2 * 100);
                this.slideshowSlides.style.transform = `translateX(${resetPosition}%)`;
                this.currentSlideIndex = this.slideshowImages.length * 2;
                // Force reflow
                this.slideshowSlides.offsetHeight;
                this.slideshowSlides.style.transition = 'transform 0.5s ease-in-out';
            } else {
                this.currentSlideIndex = index;
            }
        }, 500);
        
        const originalIndex = index % this.slideshowImages.length;
        this.originalSlideIndex = originalIndex;
        this.updateActiveDot(originalIndex);
    }
    
    // Update active dot indicator
    updateActiveDot(originalIndex) {
        if (!this.slideshowDots) return;
        
        const dots = this.slideshowDots.querySelectorAll('.slideshow-dot');
        dots.forEach((dot, i) => {
            if (i === originalIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    // Start slideshow auto-play
    startSlideshow() {
        // Clear any existing interval
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
        
        // Don't start if inactive or paused
        if (!this.isSlideshowActive || !this.slideshowEnabled || this.isPaused) {
            console.log("Slideshow not starting - active:", this.isSlideshowActive, "enabled:", this.slideshowEnabled, "paused:", this.isPaused);
            return;
        }
        
        // Start new interval
        this.slideshowInterval = setInterval(() => {
            // Only auto-slide if slideshow is visible and not paused
            if (this.isSlideshowActive && this.slideshowEnabled && !this.isPaused && 
                this.slideshowContainer && this.slideshowContainer.style.display !== 'none') {
                console.log("Auto-sliding to next slide...");
                this.nextSlide();
            }
        }, this.slideshowDuration);
        
        console.log("Slideshow auto-play started with interval:", this.slideshowDuration, "ms");
    }
    
    // Stop slideshow completely
    stopSlideshow() {
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
        this.isSlideshowActive = false;
        this.slideshowEnabled = false;
        console.log("Slideshow stopped");
    }
    
    // Pause slideshow (temporary)
    pauseSlideshow() {
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
        this.isPaused = true;
        console.log("Slideshow paused");
    }
    
    // Resume slideshow from paused state
    resumeSlideshow() {
        if (!this.isSlideshowActive || !this.slideshowEnabled) {
            console.log("Cannot resume - slideshow not active");
            return;
        }
        
        this.isPaused = false;
        this.startSlideshow();
        console.log("Slideshow resumed");
    }
    
    // Reset slideshow timer after user interaction
    resetSlideshowTimer() {
        if (!this.isSlideshowActive || !this.slideshowEnabled || this.isPaused) return;
        
        // Restart the timer
        this.startSlideshow();
    }
    
    // Go to next slide
    nextSlide() {
        let nextIndex = this.currentSlideIndex + 1;
        this.updateActiveSlide(nextIndex);
    }
    
    // Go to previous slide
    prevSlide() {
        let prevIndex = this.currentSlideIndex - 1;
        this.updateActiveSlide(prevIndex);
    }
    
    // Go to specific slide by original index
    goToSlide(originalIndex) {
        const targetIndex = this.currentSlideIndex + (originalIndex - (this.currentSlideIndex % this.slideshowImages.length));
        this.updateActiveSlide(targetIndex);
    }
    
    // Show slideshow (hide video player)
    showSlideshow() {
        if (this.slideshowContainer) {
            this.slideshowContainer.style.display = 'flex';
            this.isSlideshowActive = true;
            this.slideshowEnabled = true;
            this.isPaused = false;
            this.startSlideshow();
            console.log("Slideshow shown and auto-play started");
        }
        
        // Hide video player if it exists
        const videoPlayer = document.getElementById('videoPlayer');
        if (videoPlayer) {
            videoPlayer.style.display = 'none';
        }
        
        // Hide radio logo if it exists
        const radioLogoContainer = document.getElementById('radioLogoContainer');
        if (radioLogoContainer) {
            radioLogoContainer.style.display = 'none';
        }
    }
    
    // Hide slideshow (show video player)
    hideSlideshow() {
        if (this.slideshowContainer) {
            this.slideshowContainer.style.display = 'none';
            this.isSlideshowActive = false;
            this.pauseSlideshow();
            console.log("Slideshow hidden and paused");
        }
        
        // Show video player if it exists
        const videoPlayer = document.getElementById('videoPlayer');
        if (videoPlayer) {
            videoPlayer.style.display = '';
        }
    }
    
    // Check if slideshow is visible
    isVisible() {
        return this.slideshowContainer && this.slideshowContainer.style.display !== 'none';
    }
    
    // Set custom slideshow images
    setImages(images) {
        if (images && Array.isArray(images) && images.length > 0) {
            const wasActive = this.isSlideshowActive;
            this.slideshowImages = images;
            this.totalSlides = images.length;
            this.updateSlideshowContent();
            
            // Reset position
            const startPosition = -(this.slideshowImages.length * 100);
            this.slideshowSlides.style.transform = `translateX(${startPosition}%)`;
            this.currentSlideIndex = this.slideshowImages.length;
            this.originalSlideIndex = 0;
            this.updateActiveDot(0);
            
            if (wasActive) {
                this.startSlideshow();
            }
            console.log("Slideshow images updated, total:", this.totalSlides);
        }
    }
    
    // Add a single slide
    addSlide(image, title, channelName, channelType = 'TV') {
        const wasActive = this.isSlideshowActive;
        
        this.slideshowImages.push({
            image: image,
            title: title,
            channelName: channelName,
            channelType: channelType
        });
        
        this.totalSlides = this.slideshowImages.length;
        this.updateSlideshowContent();
        
        if (wasActive) {
            this.startSlideshow();
        }
        console.log("Slide added, total:", this.totalSlides);
    }
    
    // Set slideshow duration
    setDuration(durationMs) {
        this.slideshowDuration = durationMs;
        if (this.isSlideshowActive && !this.isPaused) {
            this.startSlideshow();
        }
        console.log("Slideshow duration set to:", durationMs, "ms");
    }
    
    // Destroy slideshow and clean up
    destroy() {
        // Stop slideshow
        this.stopSlideshow();
        
        // Remove event listeners
        if (this.slideshowContainer) {
            this.slideshowContainer.removeEventListener("mouseenter", this.handleMouseEnter);
            this.slideshowContainer.removeEventListener("mouseleave", this.handleMouseLeave);
            this.slideshowContainer.removeEventListener("touchstart", this.handleTouchStart);
            this.slideshowContainer.removeEventListener("touchend", this.handleTouchEnd);
        }
        
        // Remove slideshow container
        if (this.slideshowContainer && this.slideshowContainer.parentNode) {
            this.slideshowContainer.remove();
        }
        
        // Clear references
        this.container = null;
        this.slideshowContainer = null;
        this.slideshowSlides = null;
        this.slideshowDots = null;
        this.slideshowInitialized = false;
        
        console.log("Slideshow component destroyed");
    }
}

// Export for global use
window.SlideshowComponent = SlideshowComponent;
