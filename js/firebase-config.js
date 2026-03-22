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
        
        // Initialize Firestore
        firestore = firebase.firestore(firebaseApp);
        console.log("✅ Firestore initialized");
        
        // Initialize Analytics
        if (firebase.analytics) {
            analytics = firebase.analytics(firebaseApp);
            console.log("✅ Analytics initialized");
        }
        
        // Enable offline persistence for better performance
        firestore.enablePersistence()
            .then(() => console.log("✅ Firestore persistence enabled"))
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn("⚠️ Firestore persistence failed: multiple tabs open");
                } else if (err.code === 'unimplemented') {
                    console.warn("⚠️ Firestore persistence not supported in this browser");
                }
            });
        
        // Set global variables
        window.firebaseApp = firebaseApp;
        window.firestore = firestore;
        window.firebaseAnalytics = analytics;
        
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
        
        // Wait for SDK to load
        console.log("Waiting for Firebase SDK to load...");
        let attempts = 0;
        const maxAttempts = 30; // 15 seconds max
        
        const checkSDK = setInterval(() => {
            attempts++;
            console.log(`Checking for Firebase SDK... attempt ${attempts}/${maxAttempts}`);
            
            if (isFirebaseSDKLoaded()) {
                clearInterval(checkSDK);
                console.log("Firebase SDK loaded!");
                const success = initializeFirebase();
                resolve(success);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkSDK);
                console.error("Firebase SDK failed to load after maximum attempts");
                resolve(false);
            }
        }, 500);
    });
}

// Export for use in other modules
window.firebaseApp = firebaseApp;
window.firestore = firestore;
window.firebaseAnalytics = analytics;
window.initFirebase = initFirebase;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initFirebase().catch(console.error);
    });
} else {
    initFirebase().catch(console.error);
}
