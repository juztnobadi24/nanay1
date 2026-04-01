// ======================== FIREBASE CHAT & ANNOUNCEMENTS ========================

class FirebaseChat {
    constructor() {
        this.db = null;
        this.chatModal = null;
        this.announcementsModal = null;
        this.profileModal = null;
        this.currentChannel = null;
        this.messageListener = null;
        this.announcementListener = null;
        this.userId = null;
        this.userName = null;
        this.userOriginalName = null;
        this.userIP = null;
        this.isAdmin = false;
        this.adminPassword = 'JUZT_ADMIN_2026';
        this.messagesCollection = 'chat_messages';
        this.announcementsCollection = 'announcements';
        this.usersCollection = 'users';
        this.isInitialized = false;
        this.firestoreReady = false;
        this.retryListenersTimeout = null;
        this.isOnline = navigator.onLine;
        
        // Setup online/offline handlers
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log("Online - reconnecting Firebase listeners");
            this.reconnectListeners();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log("Offline - Firebase listeners paused");
        });
    }

    async init() {
        console.log("FirebaseChat.init() called");
        
        // Get unique user ID based on IP
        await this.getUserIP();
        this.userId = this.getUserId();
        
        // Generate original name from IP (or stored original)
        this.userOriginalName = this.getOriginalName();
        
        // Check if user was admin before
        this.checkAdminStatus();
        
        // Set current name based on admin status
        if (this.isAdmin) {
            this.userName = 'JUZT';
        } else {
            this.userName = this.userOriginalName;
        }
        
        // Save current name to localStorage
        localStorage.setItem('juzt_user_name', this.userName);
        
        this.isInitialized = true;
        
        console.log("Firebase Chat initialized");
        console.log("User:", this.userName, "Original:", this.userOriginalName, "Admin:", this.isAdmin);
        
        // Initialize Firestore (non-blocking)
        this.initFirestore().catch(err => {
            console.warn("Firestore initialization warning:", err);
        });
        
        return true;
    }

    async waitForFirestore(timeout = 5000) {
        const startTime = Date.now();
        while (!window.firestore && (Date.now() - startTime) < timeout) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (!window.firestore) {
            console.warn("Firestore not available after waiting");
            return false;
        }
        
        // Also wait for Firebase app to be ready
        if (window.firebaseApp) {
            try {
                await window.firebaseApp.firestore().enableNetwork();
            } catch(e) {
                console.warn("Could not enable network:", e);
            }
        }
        
        return true;
    }

    getOriginalName() {
        // Check if we have a stored original name
        let originalName = localStorage.getItem('juzt_original_name');
        
        if (!originalName) {
            // Generate original name from IP
            originalName = this.generateUserNameFromIP();
            localStorage.setItem('juzt_original_name', originalName);
        }
        
        return originalName;
    }

    generateUserNameFromIP() {
        let name;
        
        if (this.userIP && !this.userIP.startsWith('device_')) {
            // Generate name from IP address
            const ipParts = this.userIP.split('.');
            const lastOctet = ipParts[ipParts.length - 1];
            const firstOctet = ipParts[0] || '0';
            
            const prefixes = ['Viewer', 'Watcher', 'Listener', 'Guest', 'User', 'Visitor', 'Fan'];
            const suffixes = ['Blue', 'Red', 'Green', 'Gold', 'Silver', 'Star', 'Moon', 'Sun', 'Sky', 'Ocean'];
            
            const prefixIndex = parseInt(firstOctet) % prefixes.length;
            const suffixIndex = parseInt(lastOctet) % suffixes.length;
            
            name = prefixes[prefixIndex] + suffixes[suffixIndex] + '_' + lastOctet;
        } else {
            // Generate unique name for devices without IP
            const adjectives = ['Happy', 'Cool', 'Smart', 'Fast', 'Kind', 'Brave', 'Calm', 'Wise'];
            const nouns = ['Viewer', 'Fan', 'Watcher', 'Listener', 'Explorer', 'Traveler'];
            const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
            const uniqueNum = Math.floor(Math.random() * 10000);
            name = randomAdj + randomNoun + uniqueNum;
        }
        
        return name;
    }

    async initFirestore() {
        // Wait for Firebase to be ready with shorter timeout
        let retries = 0;
        const maxRetries = 15;
        
        while (!window.firestore && retries < maxRetries) {
            console.log(`Waiting for Firestore... attempt ${retries + 1}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, 300));
            retries++;
        }

        if (!window.firestore) {
            console.warn("Firestore not available - chat features will be limited");
            this.firestoreReady = false;
            return false;
        }

        this.db = window.firestore;
        
        // Enable network with retry
        try {
            if (window.firebaseApp) {
                await window.firebaseApp.firestore().enableNetwork();
            }
        } catch (error) {
            console.warn("Could not enable network:", error);
        }
        
        this.firestoreReady = true;
        console.log("✅ Firestore connected");
        
        // Register user in Firestore (non-blocking)
        this.registerUser().catch(console.warn);
        
        // Start listeners with delay to avoid overwhelming
        setTimeout(() => {
            if (this.isOnline) {
                this.startMessageListener();
                this.startAnnouncementListener();
            }
        }, 500);
        
        return true;
    }

    reconnectListeners() {
        if (!this.firestoreReady) return;
        
        // Clear existing listeners
        if (this.messageListener && typeof this.messageListener === 'function') {
            try {
                this.messageListener();
            } catch(e) {}
            this.messageListener = null;
        }
        
        if (this.announcementListener && typeof this.announcementListener === 'function') {
            try {
                this.announcementListener();
            } catch(e) {}
            this.announcementListener = null;
        }
        
        // Clear retry timeout
        if (this.retryListenersTimeout) {
            clearTimeout(this.retryListenersTimeout);
            this.retryListenersTimeout = null;
        }
        
        // Restart listeners
        setTimeout(() => {
            if (this.isOnline && this.firestoreReady) {
                this.startMessageListener();
                this.startAnnouncementListener();
            }
        }, 500);
    }

    async registerUser() {
        if (!this.db) return;
        
        try {
            const userRef = this.db.collection(this.usersCollection).doc(this.userId);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                await userRef.set({
                    userId: this.userId,
                    name: this.userName,
                    originalName: this.userOriginalName,
                    ip: this.userIP,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isAdmin: this.isAdmin
                });
                console.log("✅ User registered in Firestore");
            } else {
                await userRef.update({
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                    name: this.userName,
                    originalName: this.userOriginalName,
                    isAdmin: this.isAdmin
                });
                console.log("✅ User updated in Firestore");
            }
        } catch (error) {
            console.warn("Error registering user:", error);
        }
    }

    async getUserIP() {
        try {
            const services = [
                'https://api.ipify.org?format=json',
                'https://api.my-ip.io/ip.json',
                'https://ipapi.co/json/'
            ];
            
            for (const service of services) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                    const response = await fetch(service, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    const data = await response.json();
                    this.userIP = data.ip || data.ip_address;
                    if (this.userIP) {
                        console.log("IP detected:", this.userIP);
                        break;
                    }
                } catch (e) {
                    console.log("IP service failed:", service);
                }
            }
            
            if (!this.userIP) {
                let storedIP = localStorage.getItem('juzt_unique_id');
                if (!storedIP) {
                    storedIP = 'device_' + Math.random().toString(36).substr(2, 10) + '_' + Date.now();
                    localStorage.setItem('juzt_unique_id', storedIP);
                }
                this.userIP = storedIP;
                console.log("Using fallback unique ID:", this.userIP);
            }
        } catch (error) {
            console.error("Error getting IP:", error);
            this.userIP = 'device_' + Math.random().toString(36).substr(2, 10);
        }
    }

    getUserId() {
        let id = localStorage.getItem('juzt_user_id');
        if (!id) {
            const ipHash = this.userIP ? this.hashCode(this.userIP) : Math.random().toString(36).substr(2, 9);
            id = 'user_' + ipHash + '_' + Date.now();
            localStorage.setItem('juzt_user_id', id);
        }
        return id;
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    checkAdminStatus() {
        const savedAdmin = localStorage.getItem('juzt_is_admin');
        if (savedAdmin === 'true') {
            this.isAdmin = true;
        } else {
            this.isAdmin = false;
        }
    }

    async adminLogin(password) {
        if (password === this.adminPassword) {
            this.isAdmin = true;
            localStorage.setItem('juzt_is_admin', 'true');
            
            // Change name to JUZT
            this.userName = 'JUZT';
            localStorage.setItem('juzt_user_name', this.userName);
            
            // Update user in Firestore
            if (this.db) {
                try {
                    await this.db.collection(this.usersCollection).doc(this.userId).update({
                        isAdmin: true,
                        name: this.userName
                    });
                } catch (error) {
                    console.error("Error updating admin status:", error);
                }
            }
            
            // Update UI
            this.updateProfileUI();
            this.updateChatUserName();
            
            if (this.announcementsModal && this.announcementsModal.classList.contains('show')) {
                this.updateAnnouncementsModalButtons();
                this.renderAnnouncements();
            }
            
            // Update chat messages display
            this.renderChatMessages();
            
            if (window.showToast) {
                window.showToast("✅ Admin mode activated! Your name is now JUZT.", 4000);
            }
            return true;
        } else if (password !== null) {
            if (window.showToast) {
                window.showToast("❌ Incorrect password", 3000);
            }
            return false;
        }
        return false;
    }

    adminLogout() {
        this.isAdmin = false;
        localStorage.removeItem('juzt_is_admin');
        
        // Revert to original IP-based name
        this.userName = this.userOriginalName;
        localStorage.setItem('juzt_user_name', this.userName);
        
        // Update user in Firestore
        if (this.db) {
            this.db.collection(this.usersCollection).doc(this.userId).update({
                isAdmin: false,
                name: this.userName
            }).catch(console.warn);
        }
        
        // Update UI
        this.updateProfileUI();
        this.updateChatUserName();
        
        if (this.announcementsModal && this.announcementsModal.classList.contains('show')) {
            this.updateAnnouncementsModalButtons();
            this.renderAnnouncements();
        }
        
        // Update chat messages display
        this.renderChatMessages();
        
        if (window.showToast) {
            window.showToast(`👋 Admin mode exited. Your name is now ${this.userName}.`, 4000);
        }
    }

    updateChatUserName() {
        const userInfoSpan = document.querySelector('#chatModal .user-info-left span');
        if (userInfoSpan) {
            userInfoSpan.innerHTML = `You are: <strong>${escapeHtml(this.userName)}</strong>${this.isAdmin ? ' <span class="admin-badge"><i class="fas fa-crown"></i> Admin</span>' : ''}`;
        }
    }

    updateProfileUI() {
        const profileModal = document.getElementById('profileModal');
        if (profileModal && profileModal.classList.contains('show')) {
            this.renderProfileModal();
        }
    }

    updateAnnouncementsModalButtons() {
        const headerRight = document.querySelector('.announcements-header-right');
        if (!headerRight) return;
        
        if (this.isAdmin) {
            headerRight.innerHTML = `
                <button id="composeAnnouncementBtn" class="compose-announcement-btn">
                    <i class="fas fa-plus"></i> New
                </button>
                <button id="clearAnnouncementsBtn" class="clear-announcements-btn">
                    <i class="fas fa-trash-alt"></i> Clear All
                </button>
                <button class="modal-close">&times;</button>
            `;
            
            const composeBtn = document.getElementById('composeAnnouncementBtn');
            const clearBtn = document.getElementById('clearAnnouncementsBtn');
            const closeBtn = headerRight.querySelector('.modal-close');
            
            if (composeBtn) {
                composeBtn.addEventListener('click', () => this.showComposeAnnouncement());
            }
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.confirmClearAnnouncements());
            }
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeAnnouncements());
            }
        } else {
            headerRight.innerHTML = `<button class="modal-close">&times;</button>`;
            const closeBtn = headerRight.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeAnnouncements());
            }
        }
    }

    startMessageListener() {
        if (this.messageListener || !this.db) return;
        
        // Only start listener if we're online
        if (!this.isOnline) {
            console.log("Offline - message listener will start when online");
            return;
        }
        
        const messagesRef = this.db.collection(this.messagesCollection)
            .orderBy('timestamp', 'desc')
            .limit(50);
        
        this.messageListener = messagesRef.onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    message.id = change.doc.id;
                    
                    if (this.chatModal && this.chatModal.classList.contains('show')) {
                        this.renderChatMessages();
                    }
                }
            });
        }, (error) => {
            console.warn("Message listener error:", error.message);
            this.messageListener = null;
            // Retry after delay
            this.retryListenersTimeout = setTimeout(() => {
                if (this.isOnline) {
                    this.startMessageListener();
                }
                this.retryListenersTimeout = null;
            }, 10000);
        });
    }

    startAnnouncementListener() {
        if (this.announcementListener || !this.db) return;
        
        // Only start listener if we're online
        if (!this.isOnline) {
            console.log("Offline - announcement listener will start when online");
            return;
        }
        
        const announcementsRef = this.db.collection(this.announcementsCollection)
            .orderBy('timestamp', 'desc')
            .limit(50);
        
        this.announcementListener = announcementsRef.onSnapshot((snapshot) => {
            console.log("📢 Announcement snapshot received, size:", snapshot.size);
            
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const announcement = change.doc.data();
                    announcement.id = change.doc.id;
                    console.log("📢 New announcement added:", announcement.title);
                    
                    if (this.announcementsModal && this.announcementsModal.classList.contains('show')) {
                        this.renderAnnouncements();
                    }
                } else if (change.type === 'removed') {
                    console.log("📢 Announcement removed:", change.doc.id);
                    if (this.announcementsModal && this.announcementsModal.classList.contains('show')) {
                        this.renderAnnouncements();
                    }
                }
            });
        }, (error) => {
            console.warn("Announcement listener error:", error.message);
            this.announcementListener = null;
            // Retry after delay
            this.retryListenersTimeout = setTimeout(() => {
                if (this.isOnline) {
                    this.startAnnouncementListener();
                }
                this.retryListenersTimeout = null;
            }, 10000);
        });
    }

    async sendMessage(text) {
        if (!text.trim() || !this.db) return false;
        
        try {
            const message = {
                userId: this.userId,
                userName: this.userName,
                text: text.trim(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                isAdmin: this.isAdmin
            };
            
            await this.db.collection(this.messagesCollection).add(message);
            console.log("💬 Message sent successfully");
            
            return true;
        } catch (error) {
            console.warn("Error sending message:", error);
            if (window.showToast && error.code !== 'unavailable') {
                window.showToast("Failed to send message", 3000);
            }
            return false;
        }
    }

    async sendAnnouncement(title, message) {
        console.log("📢 sendAnnouncement called");
        console.log("Admin status:", this.isAdmin);
        
        if (!this.isAdmin) {
            console.error("❌ Not admin - cannot send announcement");
            if (window.showToast) {
                window.showToast("Admin access required to create announcements", 3000);
            }
            return false;
        }
        
        if (!title.trim() || !message.trim()) {
            console.error("❌ Title or message empty");
            if (window.showToast) {
                window.showToast("Please fill in both title and message", 3000);
            }
            return false;
        }
        
        if (!this.db) {
            console.error("❌ Firestore not available");
            if (window.showToast) {
                window.showToast("Database not connected. Please refresh the page.", 3000);
            }
            return false;
        }
        
        try {
            const announcementData = {
                userId: this.userId,
                userName: this.userName,
                title: title.trim(),
                message: message.trim(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                isAdmin: true,
                createdAt: new Date().toISOString()
            };
            
            console.log("📢 Saving announcement to Firestore:", announcementData);
            
            const docRef = await this.db.collection(this.announcementsCollection).add(announcementData);
            console.log("✅ Announcement saved with ID:", docRef.id);
            
            if (window.showToast) {
                window.showToast("✅ Announcement sent successfully!", 3000);
            }
            
            setTimeout(() => {
                this.renderAnnouncements();
            }, 500);
            
            return true;
        } catch (error) {
            console.error("❌ Error sending announcement:", error);
            if (window.showToast) {
                window.showToast("Failed to send announcement: " + error.message, 5000);
            }
            return false;
        }
    }

    async deleteAnnouncement(announcementId) {
        if (!this.isAdmin || !this.db) return false;
        
        try {
            await this.db.collection(this.announcementsCollection).doc(announcementId).delete();
            console.log("📢 Announcement deleted:", announcementId);
            if (window.showToast) {
                window.showToast("Announcement deleted", 3000);
            }
            return true;
        } catch (error) {
            console.error("Error deleting announcement:", error);
            return false;
        }
    }

    async clearAllAnnouncements() {
        if (!this.isAdmin || !this.db) return false;
        
        try {
            const snapshot = await this.db.collection(this.announcementsCollection).get();
            console.log("Clearing", snapshot.size, "announcements");
            
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            
            if (window.showToast) {
                window.showToast("All announcements cleared", 3000);
            }
            return true;
        } catch (error) {
            console.error("Error clearing announcements:", error);
            return false;
        }
    }

    async getMessages() {
        if (!this.db) return [];
        
        try {
            const snapshot = await this.db.collection(this.messagesCollection)
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
            
            const messages = [];
            snapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() });
            });
            
            return messages.reverse();
        } catch (error) {
            console.warn("Error getting messages:", error);
            return [];
        }
    }

    async getAnnouncements() {
        if (!this.db) {
            console.log("No database connection");
            return [];
        }
        
        try {
            console.log("Fetching announcements from Firestore...");
            
            const snapshot = await this.db.collection(this.announcementsCollection)
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
            
            console.log("Announcements snapshot size:", snapshot.size);
            
            const announcements = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                announcements.push({
                    id: doc.id,
                    ...data
                });
            });
            
            console.log("Announcements loaded:", announcements.length);
            return announcements;
        } catch (error) {
            console.warn("Error getting announcements:", error);
            return [];
        }
    }

    openChat() {
        if (!this.chatModal) {
            this.createChatModal();
        }
        
        this.chatModal.classList.add('show');
        this.renderChatMessages();
        this.scrollChatToBottom();
        
        setTimeout(() => {
            const input = this.chatModal.querySelector('.chat-input');
            if (input) input.focus();
        }, 100);
    }

    openAnnouncements() {
        if (!this.announcementsModal) {
            this.createAnnouncementsModal();
        }
        
        this.announcementsModal.classList.add('show');
        this.renderAnnouncements();
    }

    openProfile() {
        console.log("Opening profile modal");
        
        if (!this.profileModal) {
            this.createProfileModal();
        }
        
        this.renderProfileModal();
        this.profileModal.classList.add('show');
    }

    createChatModal() {
        const modalHTML = `
            <div id="chatModal" class="modal chat-modal">
                <div class="modal-content">
                    <div class="chat-container">
                        <div class="chat-header">
                            <h3><i class="fas fa-comments"></i> Live Chat</h3>
                            <button class="chat-close">&times;</button>
                        </div>
                        <div class="chat-user-info">
                            <div class="user-info-left">
                                <i class="fas fa-user"></i>
                                <span>You are: <strong>${escapeHtml(this.userName)}</strong></span>
                                ${this.isAdmin ? '<span class="admin-badge"><i class="fas fa-crown"></i> Admin</span>' : ''}
                            </div>
                        </div>
                        <div class="chat-messages" id="chatMessages">
                            <div class="chat-status">Loading messages...</div>
                        </div>
                        <div class="chat-input-area">
                            <input type="text" class="chat-input" id="chatInput" placeholder="Type a message...">
                            <button class="chat-send-btn" id="chatSendBtn">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.chatModal = document.getElementById('chatModal');
        
        const closeBtn = this.chatModal.querySelector('.chat-close');
        closeBtn.addEventListener('click', () => this.closeChat());
        
        this.chatModal.addEventListener('click', (e) => {
            if (e.target === this.chatModal) this.closeChat();
        });
        
        const sendBtn = document.getElementById('chatSendBtn');
        const chatInput = document.getElementById('chatInput');
        
        sendBtn.addEventListener('click', () => this.sendChatMessage());
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
    }

    createProfileModal() {
        const modalHTML = `
            <div id="profileModal" class="modal profile-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-circle"></i> My Profile</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="profile-avatar">
                            <div class="avatar-large" id="profileAvatar">
                                ${escapeHtml(this.userName.charAt(0).toUpperCase())}
                            </div>
                        </div>
                        
                        <div class="profile-section">
                            <label class="profile-label">
                                <i class="fas fa-user"></i> Display Name
                            </label>
                            <div class="profile-name-display">
                                <span id="profileUserName">${escapeHtml(this.userName)}</span>
                            </div>
                            ${!this.isAdmin ? `<p class="profile-hint">Your unique name is automatically generated based on your device IP address</p>` : '<p class="profile-hint">Admin mode: Your name is set to JUZT</p>'}
                        </div>
                        
                        <div class="profile-section">
                            <label class="profile-label">
                                <i class="fas fa-crown"></i> Admin Access
                            </label>
                            <div id="adminSection" class="admin-section">
                                <div class="admin-login-section">
                                    <p class="profile-hint">${this.isAdmin ? 'You are currently in admin mode' : 'Login as admin to create announcements'}</p>
                                    <div class="admin-login-input-group">
                                        ${!this.isAdmin ? `
                                            <input type="password" id="adminPasswordInput" class="profile-input" placeholder="Enter admin password">
                                            <button id="adminLoginProfileBtn" class="profile-action-btn admin-login-btn">
                                                <i class="fas fa-lock"></i> Login
                                            </button>
                                        ` : `
                                            <button id="logoutAdminProfileBtn" class="profile-action-btn admin-logout">
                                                <i class="fas fa-sign-out-alt"></i> Exit Admin Mode
                                            </button>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.profileModal = document.getElementById('profileModal');
        
        const closeBtn = this.profileModal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeProfile());
        
        this.profileModal.addEventListener('click', (e) => {
            if (e.target === this.profileModal) this.closeProfile();
        });
        
        const adminLoginBtn = document.getElementById('adminLoginProfileBtn');
        if (adminLoginBtn) {
            adminLoginBtn.addEventListener('click', () => {
                const passwordInput = document.getElementById('adminPasswordInput');
                const password = passwordInput ? passwordInput.value : prompt("Enter admin password:");
                if (password) {
                    this.adminLogin(password).then(() => {
                        this.renderProfileModal();
                    });
                }
            });
        }
        
        const logoutAdminBtn = document.getElementById('logoutAdminProfileBtn');
        if (logoutAdminBtn) {
            logoutAdminBtn.addEventListener('click', () => {
                this.adminLogout();
                this.renderProfileModal();
            });
        }
    }

    renderProfileModal() {
        if (!this.profileModal) return;
        
        const avatarDiv = document.getElementById('profileAvatar');
        const userNameSpan = document.getElementById('profileUserName');
        const adminSection = document.getElementById('adminSection');
        
        if (avatarDiv) {
            avatarDiv.textContent = this.userName.charAt(0).toUpperCase();
        }
        
        if (userNameSpan) {
            userNameSpan.textContent = this.userName;
        }
        
        // Update hint text
        const hintParagraph = document.querySelector('.profile-section:first-child .profile-hint');
        if (hintParagraph) {
            if (this.isAdmin) {
                hintParagraph.textContent = 'Admin mode: Your name is set to JUZT';
            } else {
                hintParagraph.textContent = 'Your unique name is automatically generated based on your device IP address';
            }
        }
        
        if (adminSection) {
            if (this.isAdmin) {
                adminSection.innerHTML = `
                    <div class="admin-login-section">
                        <p class="profile-hint">You are currently in admin mode</p>
                        <div class="admin-login-input-group">
                            <button id="logoutAdminProfileBtn" class="profile-action-btn admin-logout">
                                <i class="fas fa-sign-out-alt"></i> Exit Admin Mode
                            </button>
                        </div>
                    </div>
                `;
                
                const logoutAdminBtn = document.getElementById('logoutAdminProfileBtn');
                if (logoutAdminBtn) {
                    logoutAdminBtn.addEventListener('click', () => {
                        this.adminLogout();
                        this.renderProfileModal();
                    });
                }
            } else {
                adminSection.innerHTML = `
                    <div class="admin-login-section">
                        <p class="profile-hint">Login as admin to create announcements</p>
                        <div class="admin-login-input-group">
                            <input type="password" id="adminPasswordInput" class="profile-input" placeholder="Enter admin password">
                            <button id="adminLoginProfileBtn" class="profile-action-btn admin-login-btn">
                                <i class="fas fa-lock"></i> Login
                            </button>
                        </div>
                    </div>
                `;
                
                const adminLoginBtn = document.getElementById('adminLoginProfileBtn');
                if (adminLoginBtn) {
                    adminLoginBtn.addEventListener('click', () => {
                        const passwordInput = document.getElementById('adminPasswordInput');
                        const password = passwordInput ? passwordInput.value : prompt("Enter admin password:");
                        if (password) {
                            this.adminLogin(password).then(() => {
                                this.renderProfileModal();
                            });
                        }
                    });
                }
            }
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        input.disabled = true;
        
        const success = await this.sendMessage(text);
        
        if (success) {
            input.value = '';
            this.scrollChatToBottom();
        }
        
        input.disabled = false;
        input.focus();
    }

    async renderChatMessages() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = `
            <div class="chat-status">
                <i class="fas fa-spinner fa-pulse"></i> Loading messages...
            </div>
        `;
        
        const messages = await this.getMessages();
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="chat-status">
                    <i class="fas fa-comment-dots"></i> No messages yet. Be the first to chat!
                </div>
            `;
            return;
        }
        
        let html = '';
        messages.forEach(msg => {
            const isOwn = msg.userId === this.userId;
            const time = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
            const initial = msg.userName.charAt(0).toUpperCase();
            
            html += `
                <div class="chat-message ${isOwn ? 'own' : ''} ${msg.isAdmin ? 'admin' : ''}">
                    <div class="message-avatar">
                        ${msg.isAdmin ? '<i class="fas fa-crown"></i>' : initial}
                    </div>
                    <div class="message-bubble">
                        <div class="message-sender">
                            ${escapeHtml(msg.userName)}
                            ${msg.isAdmin ? '<span class="admin-tag"><i class="fas fa-crown"></i> Admin</span>' : ''}
                        </div>
                        <div class="message-text">${escapeHtml(msg.text)}</div>
                        <div class="message-time">${time}</div>
                    </div>
                </div>
            `;
        });
        
        messagesContainer.innerHTML = html;
        this.scrollChatToBottom();
    }

    scrollChatToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    closeChat() {
        if (this.chatModal) {
            this.chatModal.classList.remove('show');
        }
    }

    closeProfile() {
        if (this.profileModal) {
            this.profileModal.classList.remove('show');
        }
    }

    createAnnouncementsModal() {
        const modalHTML = `
            <div id="announcementsModal" class="modal announcements-modal">
                <div class="modal-content">
                    <div class="announcements-container">
                        <div class="announcements-header">
                            <div class="announcements-header-left">
                                <h4><i class="fas fa-bullhorn"></i> Announcements</h4>
                            </div>
                            <div class="announcements-header-right">
                                ${this.isAdmin ? `
                                    <button id="composeAnnouncementBtn" class="compose-announcement-btn">
                                        <i class="fas fa-plus"></i> New
                                    </button>
                                    <button id="clearAnnouncementsBtn" class="clear-announcements-btn">
                                        <i class="fas fa-trash-alt"></i> Clear All
                                    </button>
                                ` : ''}
                                <button class="modal-close">&times;</button>
                            </div>
                        </div>
                        <div class="announcements-list" id="announcementsList">
                            <div class="announcements-empty">
                                <i class="fas fa-spinner fa-pulse"></i> Loading announcements...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.announcementsModal = document.getElementById('announcementsModal');
        
        const closeBtn = this.announcementsModal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeAnnouncements());
        
        this.announcementsModal.addEventListener('click', (e) => {
            if (e.target === this.announcementsModal) this.closeAnnouncements();
        });
        
        if (this.isAdmin) {
            const composeBtn = document.getElementById('composeAnnouncementBtn');
            const clearBtn = document.getElementById('clearAnnouncementsBtn');
            
            if (composeBtn) {
                composeBtn.addEventListener('click', () => this.showComposeAnnouncement());
            }
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.confirmClearAnnouncements());
            }
        }
    }

    async renderAnnouncements() {
        const listContainer = document.getElementById('announcementsList');
        if (!listContainer) return;
        
        listContainer.innerHTML = `
            <div class="announcements-empty">
                <i class="fas fa-spinner fa-pulse"></i>
                <p>Loading announcements...</p>
            </div>
        `;
        
        const announcements = await this.getAnnouncements();
        
        if (announcements.length === 0) {
            listContainer.innerHTML = `
                <div class="announcements-empty">
                    <i class="fas fa-bullhorn"></i>
                    <p>No announcements yet</p>
                    ${this.isAdmin ? '<p style="font-size: 0.75rem; margin-top: 8px;">Click "New" to create your first announcement!</p>' : ''}
                </div>
            `;
            return;
        }
        
        let html = '';
        announcements.forEach(ann => {
            const time = ann.timestamp ? new Date(ann.timestamp.toDate()).toLocaleString() : 'Just now';
            
            html += `
                <div class="announcement-item" data-id="${ann.id}">
                    <div class="announcement-icon">
                        <i class="fas fa-bullhorn"></i>
                    </div>
                    <div class="announcement-content">
                        <div class="announcement-title-row">
                            <div class="announcement-title">${escapeHtml(ann.title)}</div>
                        </div>
                        <div class="announcement-message">${escapeHtml(ann.message)}</div>
                        <div class="announcement-date">
                            <i class="far fa-clock"></i> ${time}
                            <span>by ${escapeHtml(ann.userName)}</span>
                            ${ann.isAdmin ? '<i class="fas fa-crown" style="color: var(--accent);"></i>' : ''}
                        </div>
                    </div>
                    ${this.isAdmin ? `
                        <button class="announcement-delete" data-id="${ann.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
        
        if (this.isAdmin) {
            document.querySelectorAll('.announcement-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    if (confirm('Delete this announcement?')) {
                        await this.deleteAnnouncement(id);
                        this.renderAnnouncements();
                    }
                });
            });
        }
    }

    showComposeAnnouncement() {
        if (!this.isAdmin) return;
        
        const modalHTML = `
            <div id="composeAnnouncementModal" class="modal compose-announcement-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-bullhorn"></i> New Announcement</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="composeForm" class="compose-form">
                            <div class="form-group">
                                <label><i class="fas fa-heading"></i> Title</label>
                                <input type="text" id="announcementTitle" class="form-input" placeholder="Enter title..." maxlength="100">
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-comment"></i> Message</label>
                                <textarea id="announcementMessage" class="form-textarea" placeholder="Enter announcement message..." maxlength="500" rows="4"></textarea>
                            </div>
                            <div class="compose-actions">
                                <button type="button" id="cancelComposeBtn" class="btn-cancel">Cancel</button>
                                <button type="submit" id="sendAnnouncementBtn" class="btn-send">
                                    <i class="fas fa-paper-plane"></i> Send
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const composeModal = document.getElementById('composeAnnouncementModal');
        
        const closeModal = () => {
            composeModal.classList.remove('show');
            setTimeout(() => composeModal.remove(), 300);
        };
        
        composeModal.querySelector('.modal-close').addEventListener('click', closeModal);
        composeModal.addEventListener('click', (e) => {
            if (e.target === composeModal) closeModal();
        });
        
        document.getElementById('cancelComposeBtn').addEventListener('click', closeModal);
        
        const form = document.getElementById('composeForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('announcementTitle').value.trim();
            const message = document.getElementById('announcementMessage').value.trim();
            
            if (!title || !message) {
                if (window.showToast) {
                    window.showToast("Please fill in both title and message", 3000);
                }
                return;
            }
            
            const sendBtn = document.getElementById('sendAnnouncementBtn');
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Sending...';
            
            const success = await this.sendAnnouncement(title, message);
            
            if (success) {
                closeModal();
                this.renderAnnouncements();
            }
            
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
        });
        
        composeModal.classList.add('show');
    }

    async confirmClearAnnouncements() {
        if (!this.isAdmin) return;
        
        if (confirm('⚠️ Clear ALL announcements? This cannot be undone.')) {
            await this.clearAllAnnouncements();
            this.renderAnnouncements();
        }
    }

    closeAnnouncements() {
        if (this.announcementsModal) {
            this.announcementsModal.classList.remove('show');
        }
    }
    
    destroy() {
        // Clean up listeners
        if (this.messageListener && typeof this.messageListener === 'function') {
            try {
                this.messageListener();
            } catch(e) {}
            this.messageListener = null;
        }
        
        if (this.announcementListener && typeof this.announcementListener === 'function') {
            try {
                this.announcementListener();
            } catch(e) {}
            this.announcementListener = null;
        }
        
        if (this.retryListenersTimeout) {
            clearTimeout(this.retryListenersTimeout);
            this.retryListenersTimeout = null;
        }
        
        // Remove event listeners
        window.removeEventListener('online', this.reconnectListeners);
        window.removeEventListener('offline', this.reconnectListeners);
    }
}

// Initialize Firebase Chat
let firebaseChat = null;

function initFirebaseChat() {
    if (firebaseChat) return firebaseChat;
    
    firebaseChat = new FirebaseChat();
    firebaseChat.init().catch(console.warn);
    
    return firebaseChat;
}

window.FirebaseChat = FirebaseChat;
window.initFirebaseChat = initFirebaseChat;
