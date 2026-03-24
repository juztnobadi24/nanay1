// ======================== FIREBASE CHAT & NOTIFICATIONS ========================
// Using Firestore with device-based user identification

class FirebaseChat {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.chatModal = null;
        this.notificationsModal = null;
        this.messagesCollection = null;
        this.notificationsCollection = null;
        this.usersCollection = null;
        this.globalNotificationsCollection = null;
        this.messageListener = null;
        this.notificationListener = null;
        this.globalNotificationListener = null;
        this.unreadCount = 0;
        this.notifications = [];
        this.isInitialized = false;
        this.initPromise = null;
        
        // User identification
        this.userId = null;
        this.userName = null;
        this.userIP = null;
        this.deviceId = null;
        this.isAdmin = false;
        
        // Persistence keys
        this.LAST_MESSAGE_VIEW_KEY = 'juzt_last_message_view';
        this.LAST_NOTIFICATION_VIEW_KEY = 'juzt_last_notification_view';
        this.READ_NOTIFICATIONS_KEY = 'juzt_read_notifications';
        
        // Admin fixed name
        this.ADMIN_NAME = "Juzt (Admin)";
        this.ADMIN_ID = "admin_juzt";
        this.ADMIN_SECRET = "Juzt";
        
        this.init();
    }
    
    async init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = new Promise(async (resolve) => {
            console.log("Initializing Firebase Chat...");
            
            // Wait for Firebase to initialize
            if (window.initFirebase) {
                const firebaseReady = await window.initFirebase();
                if (!firebaseReady) {
                    console.error("Firebase failed to initialize");
                    this.mockMode = true;
                    this.userName = "Guest";
                    this.userId = "guest";
                    this.isInitialized = false;
                    resolve(false);
                    return;
                }
            }
            
            // Wait a bit for Firestore to be set
            await new Promise(r => setTimeout(r, 500));
            
            // Check if Firestore is available
            if (window.firestore) {
                this.db = window.firestore;
                this.mockMode = false;
                console.log("✅ Firestore is available");
                
                try {
                    await this.setupCollections();
                    await this.getUserIP();
                    this.getOrCreateDeviceId();
                    await this.identifyUser();
                    await this.loadExistingNotifications();
                    this.loadLastViewTimes();
                    this.setupListeners();
                    this.createBadge();
                    this.createNotificationBadge();
                    this.isInitialized = true;
                    console.log("✅ Firebase Chat initialized successfully");
                    resolve(true);
                } catch (error) {
                    console.error("Error setting up chat:", error);
                    this.mockMode = true;
                    this.userName = "Guest";
                    this.userId = "guest";
                    this.isInitialized = false;
                    resolve(false);
                }
            } else {
                console.error("❌ Firestore not available");
                this.mockMode = true;
                this.userName = "Guest";
                this.userId = "guest";
                this.isInitialized = false;
                resolve(false);
            }
        });
        
        return this.initPromise;
    }
    
    loadLastViewTimes() {
        // Load last message view timestamp
        const lastMessageView = localStorage.getItem(this.LAST_MESSAGE_VIEW_KEY);
        if (lastMessageView) {
            this.lastMessageViewTime = parseInt(lastMessageView);
        } else {
            this.lastMessageViewTime = Date.now();
            localStorage.setItem(this.LAST_MESSAGE_VIEW_KEY, this.lastMessageViewTime.toString());
        }
        
        // Load last notification view timestamp
        const lastNotificationView = localStorage.getItem(this.LAST_NOTIFICATION_VIEW_KEY);
        if (lastNotificationView) {
            this.lastNotificationViewTime = parseInt(lastNotificationView);
        } else {
            this.lastNotificationViewTime = Date.now();
            localStorage.setItem(this.LAST_NOTIFICATION_VIEW_KEY, this.lastNotificationViewTime.toString());
        }
        
        // Load read notifications set
        const readNotifications = localStorage.getItem(this.READ_NOTIFICATIONS_KEY);
        if (readNotifications) {
            this.readNotificationsSet = new Set(JSON.parse(readNotifications));
        } else {
            this.readNotificationsSet = new Set();
        }
        
        console.log("Loaded last view times:", {
            lastMessageView: new Date(this.lastMessageViewTime).toLocaleString(),
            lastNotificationView: new Date(this.lastNotificationViewTime).toLocaleString(),
            readCount: this.readNotificationsSet.size
        });
    }
    
    saveLastMessageViewTime() {
        this.lastMessageViewTime = Date.now();
        localStorage.setItem(this.LAST_MESSAGE_VIEW_KEY, this.lastMessageViewTime.toString());
    }
    
    saveLastNotificationViewTime() {
        this.lastNotificationViewTime = Date.now();
        localStorage.setItem(this.LAST_NOTIFICATION_VIEW_KEY, this.lastNotificationViewTime.toString());
    }
    
    saveReadNotification(notificationId) {
        this.readNotificationsSet.add(notificationId);
        localStorage.setItem(this.READ_NOTIFICATIONS_KEY, JSON.stringify([...this.readNotificationsSet]));
    }
    
    isNotificationRead(notificationId) {
        return this.readNotificationsSet.has(notificationId);
    }
    
    async setupCollections() {
        if (!this.db) return;
        
        try {
            this.messagesCollection = this.db.collection('chat_messages');
            this.notificationsCollection = this.db.collection('notifications');
            this.usersCollection = this.db.collection('users');
            this.globalNotificationsCollection = this.db.collection('global_notifications');
            console.log("✅ Firestore collections references created");
            
            const testQuery = await this.messagesCollection.limit(1).get();
            console.log("✅ Firestore connection test successful!");
            
        } catch (error) {
            console.error("❌ Error setting up Firestore collections:", error);
            throw error;
        }
    }
    
    async loadExistingNotifications() {
        if (!this.mockMode && this.notificationsCollection && this.userId) {
            try {
                console.log("📥 Loading existing notifications for user:", this.userName);
                
                const userNotifications = await this.notificationsCollection
                    .where('userId', '==', this.userId)
                    .get();
                
                if (userNotifications.empty) {
                    console.log("No existing notifications found for user, checking global notifications...");
                    
                    const globalNotifications = await this.globalNotificationsCollection
                        .orderBy('timestamp', 'desc')
                        .limit(100)
                        .get();
                    
                    if (!globalNotifications.empty) {
                        console.log(`📥 Found ${globalNotifications.size} global notifications to load for new user`);
                        
                        const batch = this.db.batch();
                        const newNotifications = [];
                        
                        globalNotifications.forEach(doc => {
                            const globalNotif = doc.data();
                            const userNotification = {
                                title: globalNotif.title,
                                message: globalNotif.message,
                                type: globalNotif.type,
                                userId: this.userId,
                                userName: this.userName,
                                isAdminNotification: true,
                                timestamp: globalNotif.timestamp,
                                timestampMs: globalNotif.timestampMs,
                                read: false,
                                notificationId: globalNotif.notificationId,
                                isGlobal: true
                            };
                            
                            const newDocRef = this.notificationsCollection.doc();
                            batch.set(newDocRef, userNotification);
                            newNotifications.push({...userNotification, id: newDocRef.id});
                        });
                        
                        await batch.commit();
                        console.log(`✅ Loaded ${newNotifications.length} notifications for new user`);
                        
                        newNotifications.forEach(notif => {
                            this.notifications.push(notif);
                        });
                        this.notifications.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
                        this.updateNotificationBadge();
                    }
                } else {
                    console.log(`✅ User already has ${userNotifications.size} notifications`);
                    userNotifications.forEach(doc => {
                        const notif = doc.data();
                        notif.id = doc.id;
                        this.notifications.push(notif);
                    });
                    this.notifications.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
                    this.updateNotificationBadge();
                }
            } catch (error) {
                console.error("Error loading existing notifications:", error);
                if (error.code === 'failed-precondition' && error.message.includes('index')) {
                    console.warn("⚠️ Firestore index required. Loading notifications without ordering...");
                    await this.loadNotificationsWithoutOrdering();
                }
            }
        }
    }
    
    async loadNotificationsWithoutOrdering() {
        try {
            const snapshot = await this.notificationsCollection
                .where('userId', '==', this.userId)
                .get();
            
            snapshot.forEach(doc => {
                const notif = doc.data();
                notif.id = doc.id;
                if (!this.notifications.some(n => n.id === notif.id)) {
                    this.notifications.push(notif);
                }
            });
            this.notifications.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
            this.updateNotificationBadge();
            console.log(`✅ Loaded ${this.notifications.length} notifications without index`);
        } catch (error) {
            console.error("Error loading notifications without ordering:", error);
        }
    }
    
    async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            this.userIP = data.ip;
            console.log("User IP:", this.userIP);
        } catch (error) {
            console.error("Error getting IP:", error);
            this.userIP = 'unknown_' + Math.random().toString(36).substr(2, 6);
        }
    }
    
    getOrCreateDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        
        if (!deviceId) {
            const userAgent = navigator.userAgent;
            const language = navigator.language;
            const platform = navigator.platform;
            const screenResolution = `${screen.width}x${screen.height}`;
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            const fingerprint = `${userAgent}|${language}|${platform}|${screenResolution}|${timezone}|${Date.now()}|${Math.random()}`;
            
            let hash = 0;
            for (let i = 0; i < fingerprint.length; i++) {
                const char = fingerprint.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            
            deviceId = Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
            localStorage.setItem('device_id', deviceId);
            console.log("Generated new device ID:", deviceId);
        } else {
            console.log("Using existing device ID:", deviceId);
        }
        
        this.deviceId = deviceId;
        return deviceId;
    }
    
    checkUrlForAdmin() {
        const urlParams = new URLSearchParams(window.location.search);
        const adminKey = urlParams.get('admin');
        
        if (adminKey === this.ADMIN_SECRET) {
            console.log("✅ Admin access granted via URL parameter");
            return true;
        }
        
        const savedAdminSession = localStorage.getItem('admin_session');
        if (savedAdminSession === 'true') {
            console.log("✅ Admin access granted via saved session");
            return true;
        }
        
        return false;
    }
    
    saveAdminSession() {
        localStorage.setItem('admin_session', 'true');
        const expiry = Date.now() + (24 * 60 * 60 * 1000);
        localStorage.setItem('admin_session_expiry', expiry);
    }
    
    clearAdminSession() {
        localStorage.removeItem('admin_session');
        localStorage.removeItem('admin_session_expiry');
        localStorage.removeItem('isAdmin');
    }
    
    checkAdminSessionExpiry() {
        const expiry = localStorage.getItem('admin_session_expiry');
        if (expiry && Date.now() > parseInt(expiry)) {
            this.clearAdminSession();
            return false;
        }
        return true;
    }
    
    async identifyUser() {
        const isAdminFromUrl = this.checkUrlForAdmin();
        
        if (isAdminFromUrl) {
            this.saveAdminSession();
            this.isAdmin = true;
            this.userId = this.ADMIN_ID;
            this.userName = this.ADMIN_NAME;
            
            localStorage.setItem('chat_userId', this.userId);
            localStorage.setItem('chat_userName', this.userName);
            localStorage.setItem('isAdmin', 'true');
            
            console.log("👑 Admin user identified:", this.userName);
            return;
        }
        
        const hasValidAdminSession = localStorage.getItem('admin_session') === 'true' && this.checkAdminSessionExpiry();
        
        if (hasValidAdminSession) {
            this.isAdmin = true;
            this.userId = this.ADMIN_ID;
            this.userName = this.ADMIN_NAME;
            
            localStorage.setItem('chat_userId', this.userId);
            localStorage.setItem('chat_userName', this.userName);
            localStorage.setItem('isAdmin', 'true');
            
            console.log("👑 Admin user identified from session:", this.userName);
            return;
        }
        
        if (!this.userIP || !this.deviceId) return;
        
        const uniqueDeviceId = `${this.userIP}_${this.deviceId}`;
        
        if (!this.mockMode && this.usersCollection) {
            try {
                const userQuery = await this.usersCollection
                    .where('uniqueDeviceId', '==', uniqueDeviceId)
                    .limit(1)
                    .get();
                
                if (!userQuery.empty) {
                    const userDoc = userQuery.docs[0];
                    this.userId = userDoc.id;
                    this.userName = userDoc.data().name;
                    console.log("👤 Existing user found:", this.userName, "Device ID:", this.deviceId);
                    
                    await this.usersCollection.doc(this.userId).update({
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                        deviceId: this.deviceId,
                        lastSeenIP: this.userIP
                    });
                } else {
                    this.userName = this.generateRandomName();
                    this.userId = uniqueDeviceId.replace(/[.]/g, '_');
                    
                    await this.usersCollection.doc(this.userId).set({
                        ip: this.userIP,
                        deviceId: this.deviceId,
                        uniqueDeviceId: uniqueDeviceId,
                        name: this.userName,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                        lastSeenIP: this.userIP
                    });
                    console.log("🆕 New user created:", this.userName, "Device ID:", this.deviceId);
                }
            } catch (error) {
                console.error("Error identifying user:", error);
                this.userName = this.generateRandomName();
                this.userId = `user_${this.deviceId}`;
            }
        } else {
            this.userName = this.generateRandomName();
            this.userId = `user_${this.deviceId}`;
        }
        
        localStorage.setItem('chat_userId', this.userId);
        localStorage.setItem('chat_userName', this.userName);
        localStorage.setItem('isAdmin', 'false');
        localStorage.setItem('device_id', this.deviceId);
        
        console.log("👤 Regular user identified:", {
            id: this.userId,
            name: this.userName,
            ip: this.userIP,
            deviceId: this.deviceId,
            uniqueId: uniqueDeviceId
        });
    }
    
    generateRandomName() {
        const adjectives = [
            'Happy', 'Smart', 'Bright', 'Swift', 'Brave', 'Calm', 'Wise', 'Bold',
            'Kind', 'Cool', 'Fast', 'Nice', 'Pure', 'True', 'Real', 'Epic',
            'Lucky', 'Wild', 'Mighty', 'Noble', 'Silly', 'Funny', 'Crazy', 'Clever',
            'Jolly', 'Keen', 'Lively', 'Merry', 'Quiet', 'Radiant', 'Silent', 'Tidy',
            'Vivid', 'Witty', 'Zealous', 'Able', 'Cute', 'Dear', 'Fair', 'Good'
        ];
        const nouns = [
            'Viewer', 'Watcher', 'Fan', 'User', 'Guest', 'Friend', 'Buddy', 'Pal',
            'Star', 'Hero', 'Champ', 'Pro', 'Ace', 'Lord', 'King', 'Queen',
            'Panda', 'Tiger', 'Eagle', 'Wolf', 'Fox', 'Bear', 'Lion', 'Hawk',
            'Owl', 'Hawk', 'Falcon', 'Phoenix', 'Dragon', 'Unicorn', 'Wizard', 'Knight',
            'Ranger', 'Hunter', 'Scout', 'Voyager', 'Traveler', 'Dreamer', 'Seeker'
        ];
        
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNum = Math.floor(Math.random() * 100);
        
        return `${randomAdj}${randomNoun}${randomNum}`;
    }
    
    setupListeners() {
        if (this.messagesCollection) {
            try {
                this.messageListener = this.messagesCollection
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .onSnapshot((snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            if (change.type === 'added') {
                                const message = change.doc.data();
                                message.id = change.doc.id;
                                console.log("📨 New message received:", message.text);
                                this.onNewMessage(message);
                            }
                        });
                    });
                console.log("✅ Message listener attached");
            } catch (error) {
                console.error("❌ Error attaching message listener:", error);
            }
        }
        
        if (this.notificationsCollection) {
            try {
                this.notificationListener = this.notificationsCollection
                    .where('userId', '==', this.userId)
                    .onSnapshot((snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            if (change.type === 'added') {
                                const notification = change.doc.data();
                                notification.id = change.doc.id;
                                // Check if notification is already marked as read from localStorage
                                const isRead = this.isNotificationRead(notification.id);
                                if (!isRead && !notification.read) {
                                    console.log("🔔 New notification received:", notification.title);
                                    this.onNewNotification(notification);
                                } else if (isRead) {
                                    // Mark as read in Firestore if it was read in localStorage
                                    this.markNotificationAsRead(notification.id);
                                }
                            } else if (change.type === 'modified') {
                                const notification = change.doc.data();
                                notification.id = change.doc.id;
                                const index = this.notifications.findIndex(n => n.id === notification.id);
                                if (index !== -1) {
                                    this.notifications[index].read = notification.read;
                                    this.updateNotificationBadge();
                                }
                            }
                        });
                    });
                console.log("✅ Notification listener attached (simplified query)");
            } catch (error) {
                console.error("❌ Error attaching notification listener:", error);
                if (error.code === 'failed-precondition' && error.message.includes('index')) {
                    console.warn("⚠️ Firestore index required for notifications. Please create the index.");
                    this.loadNotificationsWithoutListener();
                }
            }
        }
        
        if (this.globalNotificationsCollection && !this.isAdmin) {
            try {
                this.globalNotificationListener = this.globalNotificationsCollection
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .onSnapshot((snapshot) => {
                        snapshot.docChanges().forEach(async (change) => {
                            if (change.type === 'added') {
                                const globalNotification = change.doc.data();
                                const alreadyReceived = this.notifications.some(
                                    n => n.notificationId === globalNotification.notificationId
                                );
                                
                                if (!alreadyReceived && globalNotification.notificationId) {
                                    console.log("🌍 New global notification received, creating personal copy...");
                                    await this.createNotificationForUser(globalNotification);
                                }
                            }
                        });
                    });
                console.log("✅ Global notification listener attached");
            } catch (error) {
                console.error("❌ Error attaching global notification listener:", error);
            }
        }
        
        this.updateUserLastSeen();
    }
    
    async loadNotificationsWithoutListener() {
        try {
            console.log("📥 Loading notifications without real-time listener...");
            const snapshot = await this.notificationsCollection
                .where('userId', '==', this.userId)
                .get();
            
            snapshot.forEach(doc => {
                const notif = doc.data();
                notif.id = doc.id;
                if (!this.notifications.some(n => n.id === notif.id)) {
                    this.notifications.push(notif);
                }
            });
            this.notifications.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
            this.updateNotificationBadge();
            console.log(`✅ Loaded ${this.notifications.length} notifications`);
        } catch (error) {
            console.error("Error loading notifications:", error);
        }
    }
    
    async createNotificationForUser(globalNotification) {
        if (!this.notificationsCollection) return;
        
        const userNotification = {
            title: globalNotification.title,
            message: globalNotification.message,
            type: globalNotification.type,
            userId: this.userId,
            userName: this.userName,
            isAdminNotification: true,
            timestamp: globalNotification.timestamp,
            timestampMs: globalNotification.timestampMs,
            read: false,
            notificationId: globalNotification.notificationId,
            isGlobal: true
        };
        
        try {
            const docRef = await this.notificationsCollection.add(userNotification);
            console.log("📢 Global notification received and saved for user:", this.userName);
            
            userNotification.id = docRef.id;
            this.onNewNotification(userNotification);
        } catch (error) {
            console.error("Error saving global notification for user:", error);
        }
    }
    
    async updateUserLastSeen() {
        if (!this.mockMode && this.usersCollection && this.userId && !this.isAdmin) {
            try {
                await this.usersCollection.doc(this.userId).update({
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                // Silently fail
            }
        }
        
        setTimeout(() => this.updateUserLastSeen(), 30000);
    }
    
    onNewMessage(message) {
        const event = new CustomEvent('newChatMessage', { 
            detail: {
                ...message,
                isAdmin: message.userId === this.ADMIN_ID
            }
        });
        window.dispatchEvent(event);
        
        // Check if message is newer than last view time
        const messageTime = message.timestampMs || (message.timestamp?.toMillis?.() || Date.now());
        if (message.userId !== this.userId && messageTime > this.lastMessageViewTime) {
            this.unreadCount++;
            this.updateBadge();
        }
        
        if (message.userId !== this.userId && !document.hasFocus()) {
            this.playNotificationSound();
        }
    }
    
    onNewNotification(notification) {
        const exists = this.notifications.some(n => n.id === notification.id);
        if (!exists) {
            this.notifications.unshift(notification);
            this.notifications.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
            
            // Check if notification is newer than last view time
            const notifTime = notification.timestampMs || (notification.timestamp?.toMillis?.() || Date.now());
            if (notifTime > this.lastNotificationViewTime && !this.isNotificationRead(notification.id)) {
                this.updateBadge();
                this.updateNotificationBadge();
                this.showBrowserNotification(notification);
                
                const event = new CustomEvent('newNotification', { detail: notification });
                window.dispatchEvent(event);
                this.playNotificationSound();
            }
        }
    }
    
    playNotificationSound() {
        try {
            const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
            audio.volume = 0.3;
            audio.play().catch(e => console.log("Audio play failed:", e));
        } catch (e) {}
    }
    
    showBrowserNotification(notification) {
        if (!("Notification" in window)) return;
        
        if (Notification.permission === "granted") {
            new Notification(notification.title, {
                body: notification.message,
                icon: "https://via.placeholder.com/64?text=JUZT",
                tag: notification.id
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }
    
    createBadge() {
        const messageBtn = document.getElementById('messageBtn');
        if (messageBtn && !messageBtn.querySelector('.message-badge')) {
            messageBtn.style.position = 'relative';
            const badge = document.createElement('span');
            badge.className = 'message-badge';
            messageBtn.appendChild(badge);
            this.updateBadge();
            console.log("✅ Message badge created");
        }
    }
    
    createNotificationBadge() {
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn && !notificationBtn.querySelector('.notification-badge')) {
            notificationBtn.style.position = 'relative';
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            notificationBtn.appendChild(badge);
            this.updateNotificationBadge();
            console.log("✅ Notification badge created");
        }
    }
    
    updateBadge() {
        const badge = document.querySelector('.message-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.classList.add('show');
                badge.classList.add('pulse');
                setTimeout(() => badge.classList.remove('pulse'), 500);
            } else {
                badge.classList.remove('show');
            }
        }
    }
    
    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            // Count unread notifications (not marked as read and newer than last view)
            const unreadCount = this.notifications.filter(n => {
                const notifTime = n.timestampMs || (n.timestamp?.toMillis?.() || 0);
                const isNewer = notifTime > this.lastNotificationViewTime;
                const isRead = this.isNotificationRead(n.id) || n.read;
                return isNewer && !isRead;
            }).length;
            
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.add('show');
                badge.classList.add('pulse');
                setTimeout(() => badge.classList.remove('pulse'), 500);
            } else {
                badge.classList.remove('show');
            }
        }
    }
    
    resetUnreadCount() {
        this.unreadCount = 0;
        this.saveLastMessageViewTime();
        this.updateBadge();
    }
    
    async sendMessage(messageText) {
        if (!messageText.trim()) return false;
        
        if (!this.isInitialized) {
            console.log("⏳ Waiting for chat initialization...");
            await this.initPromise;
        }
        
        if (!this.isInitialized || this.mockMode) {
            console.log("❌ Chat not ready - message not sent");
            return false;
        }
        
        console.log("📤 Sending message:", messageText);
        
        const message = {
            text: messageText.trim(),
            userId: this.userId,
            userName: this.userName,
            isAdmin: this.isAdmin,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            timestampMs: Date.now(),
            ip: this.userIP,
            deviceId: this.deviceId
        };
        
        if (this.messagesCollection) {
            try {
                const docRef = await this.messagesCollection.add(message);
                console.log("✅ Message sent to Firestore! ID:", docRef.id);
                return true;
            } catch (error) {
                console.error("❌ Error sending message:", error);
                return false;
            }
        } else {
            console.log("❌ Messages collection not available");
            return false;
        }
    }
    
    async sendAdminNotification(title, message, type = 'info', targetAll = true) {
        if (!this.isAdmin) {
            console.log("Only admin can send notifications");
            return false;
        }
        
        targetAll = true;
        
        const notification = {
            title: title,
            message: message,
            type: type,
            userId: 'admin',
            userName: this.ADMIN_NAME,
            isAdminNotification: true,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            timestampMs: Date.now(),
            read: false,
            targetAll: targetAll,
            notificationId: Date.now()
        };
        
        if (!this.mockMode && this.globalNotificationsCollection) {
            try {
                await this.globalNotificationsCollection.add(notification);
                console.log("📢 Admin notification saved to global collection");
                
                const adminPersonalNotif = {
                    ...notification,
                    userId: this.ADMIN_ID,
                    userName: this.ADMIN_NAME
                };
                const docRef = await this.notificationsCollection.add(adminPersonalNotif);
                adminPersonalNotif.id = docRef.id;
                this.onNewNotification(adminPersonalNotif);
                
                return true;
            } catch (error) {
                console.error("Error sending admin notification:", error);
                return false;
            }
        } else {
            console.log("Mock mode - notification not sent");
            return false;
        }
    }
    
    async getAllNotifications() {
        if (!this.isAdmin) return [];
        
        if (!this.mockMode && this.notificationsCollection) {
            try {
                const snapshot = await this.notificationsCollection.get();
                
                const notifications = [];
                snapshot.forEach(doc => {
                    notifications.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                notifications.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
                return notifications;
            } catch (error) {
                console.error("Error getting all notifications:", error);
                return [];
            }
        }
        return [];
    }
    
    async deleteNotification(notificationId) {
        if (!this.isAdmin) return false;
        
        if (!this.mockMode && this.notificationsCollection) {
            try {
                await this.notificationsCollection.doc(notificationId).delete();
                console.log("Notification deleted");
                return true;
            } catch (error) {
                console.error("Error deleting notification:", error);
                return false;
            }
        }
        return false;
    }
    
    async clearNotifications() {
        if (!this.isAdmin) return false;
        
        if (!this.mockMode && this.notificationsCollection) {
            try {
                const snapshot = await this.notificationsCollection.get();
                const batch = this.db.batch();
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log("All notifications cleared");
                
                this.notifications = [];
                this.updateBadge();
                this.updateNotificationBadge();
                
                return true;
            } catch (error) {
                console.error("Error clearing notifications:", error);
                return false;
            }
        }
        return false;
    }
    
    async markNotificationAsRead(notificationId) {
        // Save to localStorage first
        this.saveReadNotification(notificationId);
        
        // Update in Firestore
        if (!this.mockMode && this.notificationsCollection) {
            try {
                await this.notificationsCollection.doc(notificationId).update({ read: true });
            } catch (error) {
                console.error("Error marking notification as read:", error);
            }
        }
        
        // Update local array
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            this.notifications[index].read = true;
            this.updateNotificationBadge();
        }
    }
    
    async getMessages(callback) {
        if (!this.isInitialized) {
            console.log("⏳ Waiting for initialization...");
            await this.initPromise;
        }
        
        if (!this.isInitialized || this.mockMode || !this.messagesCollection) {
            console.log("❌ Cannot fetch messages - chat not ready");
            callback([]);
            return;
        }
        
        try {
            console.log("📥 Fetching messages from Firestore...");
            const snapshot = await this.messagesCollection
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();
            
            const messages = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                messages.push({
                    id: doc.id,
                    ...data
                });
            });
            
            const sortedMessages = messages.reverse();
            console.log(`✅ Fetched ${sortedMessages.length} messages`);
            callback(sortedMessages);
        } catch (error) {
            console.error("❌ Error getting messages:", error);
            callback([]);
        }
    }
    
    getNotifications() {
        return this.notifications;
    }
    
    getUnreadCount() {
        return this.unreadCount;
    }
    
    getUserInfo() {
        return {
            id: this.userId || "guest",
            name: this.userName || "Guest",
            ip: this.userIP,
            deviceId: this.deviceId,
            isAdmin: this.isAdmin || false
        };
    }
    
    logoutAdmin() {
        if (this.isAdmin) {
            this.clearAdminSession();
            window.location.href = window.location.pathname;
        }
    }
    
    destroy() {
        if (this.messageListener) {
            this.messageListener();
        }
        if (this.notificationListener) {
            this.notificationListener();
        }
        if (this.globalNotificationListener) {
            this.globalNotificationListener();
        }
    }
}

// Chat UI Component
class ChatUI {
    constructor(chatService) {
        this.chatService = chatService;
        this.modal = null;
        this.isOpen = false;
        this.messages = [];
    }
    
    createModal() {
        const existingModal = document.getElementById('chatModal');
        if (existingModal) existingModal.remove();
        
        const userInfo = this.chatService.getUserInfo();
        
        const modalHTML = `
            <div id="chatModal" class="modal chat-modal">
                <div class="modal-content" style="padding: 0;">
                    <div class="chat-container">
                        <div class="chat-header">
                            <h3><i class="fas fa-comments"></i> JUZT Community Chat</h3>
                            <button class="chat-close">&times;</button>
                        </div>
                        <div class="chat-user-info">
                            <div class="user-info-left">
                                <i class="fas fa-user-circle"></i>
                                <span>You are: <strong>${escapeHtml(userInfo.name)}</strong></span>
                            </div>
                            <div class="user-info-right">
                                ${userInfo.isAdmin ? '<span class="admin-badge"><i class="fas fa-crown"></i> Admin</span>' : ''}
                                ${userInfo.isAdmin ? '<button class="logout-admin-btn" id="logoutAdminBtn"><i class="fas fa-sign-out-alt"></i> Logout</button>' : ''}
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
        this.modal = document.getElementById('chatModal');
        this.attachEvents();
        this.loadMessages();
    }
    
    attachEvents() {
        if (!this.modal) return;
        
        const closeBtn = this.modal.querySelector('.chat-close');
        const sendBtn = document.getElementById('chatSendBtn');
        const chatInput = document.getElementById('chatInput');
        const logoutBtn = document.getElementById('logoutAdminBtn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.chatService.logoutAdmin();
            });
        }
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
        
        window.addEventListener('newChatMessage', (event) => {
            this.addMessage(event.detail);
        });
    }
    
    async loadMessages() {
        if (!this.chatService) return;
        
        this.chatService.getMessages((messages) => {
            this.messages = messages;
            this.renderMessages();
        });
    }
    
    renderMessages() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        
        if (this.messages.length === 0) {
            messagesContainer.innerHTML = '<div class="chat-status">No messages yet. Be the first to say something!</div>';
            return;
        }
        
        let html = '';
        this.messages.forEach(message => {
            const isOwn = message.userId === this.chatService.userId;
            const isAdminMsg = message.isAdmin || message.userId === this.chatService.ADMIN_ID;
            const avatar = message.userName ? message.userName.charAt(0).toUpperCase() : '?';
            const time = this.formatTime(message.timestampMs || message.timestamp);
            
            html += `
                <div class="chat-message ${isOwn ? 'own' : ''} ${isAdminMsg ? 'admin' : ''}">
                    <div class="message-avatar" style="${isAdminMsg ? 'background: linear-gradient(135deg, #f97316, #ea580c);' : ''}">
                        ${isAdminMsg ? '<i class="fas fa-crown" style="font-size: 0.7rem;"></i>' : escapeHtml(avatar)}
                    </div>
                    <div class="message-bubble">
                        <div class="message-sender">
                            ${escapeHtml(message.userName || 'Anonymous')}
                            ${isAdminMsg ? '<span class="admin-tag"><i class="fas fa-check-circle"></i> Admin</span>' : ''}
                        </div>
                        <div class="message-text">${escapeHtml(message.text)}</div>
                        <div class="message-time">${time}</div>
                    </div>
                </div>
            `;
        });
        
        messagesContainer.innerHTML = html;
        this.scrollToBottom();
    }
    
    addMessage(message) {
        this.messages.push(message);
        if (this.messages.length > 100) {
            this.messages = this.messages.slice(-100);
        }
        this.renderMessages();
    }
    
    async sendMessage() {
        const input = document.getElementById('chatInput');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        const sent = await this.chatService.sendMessage(message);
        if (sent) {
            input.value = '';
            input.focus();
        }
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    formatTime(timestamp) {
        if (!timestamp) return 'Just now';
        
        let date;
        if (typeof timestamp === 'object' && timestamp.toDate) {
            date = timestamp.toDate();
        } else if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        } else if (typeof timestamp === 'number') {
            date = new Date(timestamp);
        } else {
            return 'Just now';
        }
        
        const now = new Date();
        const diff = now - date;
        
        if (isNaN(diff)) return 'Just now';
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return date.toLocaleDateString();
    }
    
    open() {
        if (!this.modal) this.createModal();
        this.modal.classList.add('show');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        // Reset unread count and save view time when opening chat
        if (this.chatService) {
            this.chatService.resetUnreadCount();
        }
        
        setTimeout(() => this.scrollToBottom(), 100);
    }
    
    close() {
        if (this.modal) {
            this.modal.classList.remove('show');
            this.isOpen = false;
            document.body.style.overflow = '';
        }
    }
}

// Notifications UI Component
class NotificationsUI {
    constructor(chatService) {
        this.chatService = chatService;
        this.modal = null;
        this.isOpen = false;
        this.isAdminMode = false;
        this.composeModal = null;
        this.notifications = [];
    }
    
    createModal() {
        const existingModal = document.getElementById('notificationsModal');
        if (existingModal) existingModal.remove();
        
        const userInfo = this.chatService.getUserInfo();
        this.isAdminMode = userInfo.isAdmin;
        
        const modalHTML = `
            <div id="notificationsModal" class="modal notifications-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-bell"></i> Notifications</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 0;">
                        <div class="notifications-container">
                            <div class="notifications-header" style="padding: 1rem 1.5rem 0 1.5rem;">
                                <div class="notifications-header-left">
                                    <h4><i class="fas fa-history"></i> Recent Notifications</h4>
                                </div>
                                <div class="notifications-header-right">
                                    ${this.isAdminMode ? `
                                        <button class="compose-notification-btn" id="composeNotificationBtn">
                                            <i class="fas fa-plus"></i> New Notification
                                        </button>
                                    ` : ''}
                                    ${this.isAdminMode ? `
                                        <button class="notification-clear-btn" id="clearNotificationsBtn">
                                            <i class="fas fa-trash-alt"></i> Clear All
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="notifications-list" id="notificationsList">
                                <div class="notifications-empty">
                                    <i class="fas fa-bell-slash"></i>
                                    <p>No notifications yet</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('notificationsModal');
        this.attachEvents();
        this.renderNotifications();
    }
    
    attachEvents() {
        if (!this.modal) return;
        
        const closeBtn = this.modal.querySelector('.modal-close');
        const clearBtn = document.getElementById('clearNotificationsBtn');
        const composeBtn = document.getElementById('composeNotificationBtn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        if (clearBtn && this.isAdminMode) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Delete all notifications? This action cannot be undone.')) {
                    this.chatService.clearNotifications();
                    this.renderNotifications();
                }
            });
        }
        
        if (composeBtn && this.isAdminMode) {
            composeBtn.addEventListener('click', () => this.openComposeModal());
        }
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
        
        window.addEventListener('newNotification', () => {
            if (this.isOpen) this.renderNotifications();
        });
        
        window.addEventListener('notificationsCleared', () => {
            this.renderNotifications();
        });
    }
    
    openComposeModal() {
        const existingCompose = document.getElementById('composeNotificationModal');
        if (existingCompose) existingCompose.remove();
        
        const composeHTML = `
            <div id="composeNotificationModal" class="modal compose-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-bullhorn"></i> Send Notification to All Users</h3>
                        <button class="modal-close compose-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="compose-form">
                            <div class="form-group">
                                <label><i class="fas fa-tag"></i> Title</label>
                                <input type="text" id="notificationTitle" class="form-input" placeholder="Enter notification title...">
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-envelope"></i> Message</label>
                                <textarea id="notificationMessage" class="form-textarea" rows="4" placeholder="Enter notification message..."></textarea>
                            </div>
                            <div class="info-note">
                                <i class="fas fa-globe"></i>
                                <span>This notification will be sent to ALL users (current and future visitors)</span>
                            </div>
                            <div class="compose-actions">
                                <button class="btn-cancel" id="cancelComposeBtn">Cancel</button>
                                <button class="btn-send" id="sendNotificationBtn">
                                    <i class="fas fa-paper-plane"></i> Send to All Users
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', composeHTML);
        this.composeModal = document.getElementById('composeNotificationModal');
        
        const closeCompose = this.composeModal.querySelector('.compose-close');
        const cancelBtn = document.getElementById('cancelComposeBtn');
        const sendBtn = document.getElementById('sendNotificationBtn');
        
        if (closeCompose) {
            closeCompose.addEventListener('click', () => this.closeComposeModal());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeComposeModal());
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendNotification());
        }
        
        this.composeModal.addEventListener('click', (e) => {
            if (e.target === this.composeModal) this.closeComposeModal();
        });
        
        this.composeModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeComposeModal() {
        if (this.composeModal) {
            this.composeModal.classList.remove('show');
            setTimeout(() => {
                if (this.composeModal) this.composeModal.remove();
                this.composeModal = null;
                document.body.style.overflow = '';
            }, 300);
        }
    }
    
    async sendNotification() {
        const title = document.getElementById('notificationTitle')?.value.trim();
        const message = document.getElementById('notificationMessage')?.value.trim();
        
        if (!title) {
            alert('Please enter a title');
            return;
        }
        
        if (!message) {
            alert('Please enter a message');
            return;
        }
        
        const sendBtn = document.getElementById('sendNotificationBtn');
        const originalText = sendBtn.innerHTML;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Sending to all users...';
        sendBtn.disabled = true;
        
        try {
            const sent = await this.chatService.sendAdminNotification(title, message, 'info', true);
            
            if (sent) {
                alert('✅ Notification sent to all users successfully!');
                this.closeComposeModal();
                setTimeout(() => this.renderNotifications(), 1000);
            } else {
                alert('❌ Failed to send notification. Please try again.');
            }
        } catch (error) {
            console.error("Error sending notification:", error);
            alert('Error sending notification: ' + error.message);
        } finally {
            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
        }
    }
    
    async renderNotifications() {
        const listContainer = document.getElementById('notificationsList');
        if (!listContainer) return;
        
        let notifications;
        if (this.isAdminMode) {
            notifications = await this.chatService.getAllNotifications();
            const uniqueNotifications = new Map();
            notifications.forEach(notif => {
                const key = `${notif.timestampMs}_${notif.title}`;
                if (!uniqueNotifications.has(key)) {
                    uniqueNotifications.set(key, notif);
                }
            });
            notifications = Array.from(uniqueNotifications.values());
            notifications.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
        } else {
            notifications = this.chatService.getNotifications();
        }
        
        this.notifications = notifications;
        
        if (!notifications || notifications.length === 0) {
            listContainer.innerHTML = `
                <div class="notifications-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        notifications.forEach(notification => {
            const time = this.formatTime(notification.timestampMs || notification.timestamp);
            const isAdminNotif = notification.isAdminNotification || notification.userId === 'admin';
            const isRead = this.chatService.isNotificationRead(notification.id) || notification.read;
            
            html += `
                <div class="notification-item ${!isRead ? 'unread' : ''} ${isAdminNotif ? 'admin-notif' : ''}" data-id="${notification.id}">
                    <div class="notification-icon" style="${isAdminNotif ? 'background: linear-gradient(135deg, #f97316, #ea580c);' : ''}">
                        <i class="fas ${isAdminNotif ? 'fa-crown' : 'fa-bell'}" style="${isAdminNotif ? 'color: white;' : ''}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">
                            ${escapeHtml(notification.title)}
                            ${isAdminNotif ? '<span class="admin-notif-badge"><i class="fas fa-crown"></i> Admin</span>' : ''}
                        </div>
                        <div class="notification-message">${escapeHtml(notification.message)}</div>
                        <div class="notification-time">
                            <i class="far fa-clock"></i> ${time}
                        </div>
                    </div>
                    ${this.isAdminMode ? `
                        <button class="notification-delete-btn" data-id="${notification.id}" title="Delete notification">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
        
        listContainer.querySelectorAll('.notification-item').forEach(item => {
            const id = item.dataset.id;
            if (id && item.classList.contains('unread')) {
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.notification-delete-btn')) return;
                    this.chatService.markNotificationAsRead(id);
                    item.classList.remove('unread');
                    this.chatService.updateNotificationBadge();
                    this.renderNotifications();
                });
            }
        });
        
        if (this.isAdminMode) {
            listContainer.querySelectorAll('.notification-delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    if (id && confirm('Delete this notification?')) {
                        await this.chatService.deleteNotification(id);
                        this.renderNotifications();
                    }
                });
            });
        }
    }
    
    formatTime(timestamp) {
        if (!timestamp) return 'Just now';
        
        let date;
        if (typeof timestamp === 'object' && timestamp.toDate) {
            date = timestamp.toDate();
        } else if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        } else if (typeof timestamp === 'number') {
            date = new Date(timestamp);
        } else {
            return 'Just now';
        }
        
        const now = new Date();
        const diff = now - date;
        
        if (isNaN(diff)) return 'Just now';
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        return date.toLocaleDateString();
    }
    
    open() {
        if (!this.modal) this.createModal();
        this.modal.classList.add('show');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        this.renderNotifications();
        
        // Save last view time when opening notifications
        if (this.chatService) {
            this.chatService.saveLastNotificationViewTime();
            this.chatService.updateNotificationBadge();
            
            // Mark all current notifications as read
            this.notifications.forEach(notification => {
                if (!this.chatService.isNotificationRead(notification.id)) {
                    this.chatService.markNotificationAsRead(notification.id);
                }
            });
        }
    }
    
    close() {
        if (this.modal) {
            this.modal.classList.remove('show');
            this.isOpen = false;
            document.body.style.overflow = '';
        }
    }
}

// Initialize Firebase Chat
window.firebaseChat = null;
window.chatUI = null;
window.notificationsUI = null;

async function initFirebaseChat() {
    try {
        console.log("Starting Firebase Chat initialization...");
        window.firebaseChat = new FirebaseChat();
        
        await window.firebaseChat.initPromise;
        
        window.chatUI = new ChatUI(window.firebaseChat);
        window.notificationsUI = new NotificationsUI(window.firebaseChat);
        
        const messageBtn = document.getElementById('messageBtn');
        const notificationBtn = document.getElementById('notificationBtn');
        
        if (messageBtn) {
            const newMessageBtn = messageBtn.cloneNode(true);
            messageBtn.parentNode.replaceChild(newMessageBtn, messageBtn);
            
            newMessageBtn.addEventListener('click', () => {
                if (window.chatUI) window.chatUI.open();
            });
        }
        
        if (notificationBtn) {
            const newNotificationBtn = notificationBtn.cloneNode(true);
            notificationBtn.parentNode.replaceChild(newNotificationBtn, notificationBtn);
            
            newNotificationBtn.addEventListener('click', () => {
                if (window.notificationsUI) window.notificationsUI.open();
            });
        }
        
        console.log("✅ Firebase Chat UI initialized");
        
        const userInfo = window.firebaseChat.getUserInfo();
        if (userInfo.isAdmin) {
            console.log("%c👑 Admin Mode Active", "color: #f97316; font-size: 14px; font-weight: bold;");
            console.log("%cYou are logged in as: Juzt (Admin)", "color: #f97316;");
            console.log("%cTo send notifications, click the bell icon and press 'New Notification'", "color: #9aa2bf;");
        } else {
            console.log("%c👤 Logged in as: " + userInfo.name, "color: #9aa2bf;");
            console.log("%c🆔 Device ID: " + (userInfo.deviceId ? userInfo.deviceId : "unknown"), "color: #9aa2bf;");
        }
        
    } catch (error) {
        console.error("❌ Error initializing Firebase Chat:", error);
    }
}

window.initFirebaseChat = initFirebaseChat;
