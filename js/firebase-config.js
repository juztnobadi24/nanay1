// ======================== FIREBASE CONFIGURATION ========================
// Using Firebase Firestore only

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBhO-7m-x6Vm3Gjbv08IpFGxkUZMJX3hbY",
    authDomain: "juztwebtv.firebaseapp.com",
    projectId: "juztwebtv",
    storageBucket: "juztwebtv.firebasestorage.app",
    messagingSenderId: "971428896392",
    appId: "1:971428896392:web:ef2f81ebf56a00bda2c93d",
    measurementId: "G-LSC3ZHMCMZ"
};

// Global Firebase instances
let firebaseApp = null;
let firestore = null;
let analytics = null;

// Function to check if Firebase SDK is loaded
function isFirebaseSDKLoaded() {
    return typeof firebase !== 'undefined' && typeof firebase.firestore === 'function';
}

// Initialize Firebase - called when SDK is ready
function initializeFirebase() {
    try {
        console.log("Initializing Firebase with config:", firebaseConfig);
        
        // Initialize Firebase app if not already initialized
        if (firebase.apps.length === 0) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            console.log("✅ Firebase app initialized");
        } else {
            firebaseApp = firebase.apps[0];
            console.log("✅ Using existing Firebase app");
        }
        
        // Initialize Firestore with settings to handle offline
        firestore = firebase.firestore(firebaseApp);
        
        // Enable offline persistence and retry settings
        firestore.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            ignoreUndefinedProperties: true,
            experimentalForceLongPolling: true,  // Helps with connection issues
            merge: true
        });
        
        console.log("✅ Firestore initialized");
        
        // Initialize Analytics
        if (firebase.analytics) {
            analytics = firebase.analytics(firebaseApp);
            console.log("✅ Analytics initialized");
        }
        
        // Test Firestore connection with proper error handling
        setTimeout(async () => {
            try {
                const testRef = firestore.collection('test').doc('connection');
                await testRef.set({ 
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    test: true 
                }, { merge: true });
                console.log("✅ Firestore connection test successful");
                // Clean up test document
                setTimeout(() => testRef.delete().catch(e => console.log("Test cleanup:", e)), 1000);
            } catch (err) {
                console.warn("⚠️ Firestore connection test failed:", err.message);
                // Don't treat as fatal - we'll retry later
            }
        }, 1000);
        
        // Set global variables
        window.firebaseApp = firebaseApp;
        window.firestore = firestore;
        window.firebaseAnalytics = analytics;
        
        // Dispatch event that Firebase is ready
        window.dispatchEvent(new CustomEvent('firebase-ready'));
        
        return true;
    } catch (error) {
        console.error("❌ Firebase initialization error:", error);
        return false;
    }
}

// Wait for Firebase SDK to load and initialize
function initFirebase() {
    return new Promise((resolve) => {
        // If already initialized, resolve immediately
        if (window.firestore) {
            console.log("Firebase already initialized");
            resolve(true);
            return;
        }
        
        // Check if SDK is already loaded
        if (isFirebaseSDKLoaded()) {
            const success = initializeFirebase();
            resolve(success);
            return;
        }
        
        // Wait for SDK to load with timeout
        console.log("Waiting for Firebase SDK to load...");
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds max (500ms * 20)
        let timeoutId;
        
        const checkSDK = setInterval(() => {
            attempts++;
            
            if (isFirebaseSDKLoaded()) {
                clearInterval(checkSDK);
                clearTimeout(timeoutId);
                console.log("Firebase SDK loaded!");
                const success = initializeFirebase();
                resolve(success);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkSDK);
                clearTimeout(timeoutId);
                console.warn("Firebase SDK failed to load after maximum attempts");
                // Don't fail completely - allow app to work without Firebase
                resolve(false);
            }
        }, 500);
        
        // Overall timeout
        timeoutId = setTimeout(() => {
            clearInterval(checkSDK);
            console.warn("Firebase initialization timeout");
            resolve(false);
        }, 15000);
    });
}

// Export for use in other modules
window.firebaseApp = firebaseApp;
window.firestore = firestore;
window.firebaseAnalytics = analytics;
window.initFirebase = initFirebase;

// Auto-initialize when DOM is ready - but don't block app loading
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize in background, don't wait for it
        initFirebase().catch(console.error);
    });
} else {
    // Initialize in background
    setTimeout(() => initFirebase().catch(console.error), 100);
}
