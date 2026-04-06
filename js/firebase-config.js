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
let firebaseInitPromise = null;
let firebaseInitResolved = false;

// Function to check if Firebase SDK is loaded
function isFirebaseSDKLoaded() {
    return typeof firebase !== 'undefined' && typeof firebase.firestore === 'function';
}

// Initialize Firebase - called when SDK is ready
function initializeFirebase() {
    try {
        console.log("Initializing Firebase with config...");
        
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
        
        // Test Firestore connection
        const testRef = firestore.collection('test').doc('connection');
        testRef.set({ timestamp: firebase.firestore.FieldValue.serverTimestamp() })
            .then(() => {
                console.log("✅ Firestore connection test successful");
                testRef.delete().catch(e => console.log("Test cleanup:", e));
            })
            .catch((err) => {
                console.error("❌ Firestore connection test failed:", err);
            });
        
        // Set global variables
        window.firebaseApp = firebaseApp;
        window.firestore = firestore;
        window.firebaseAnalytics = analytics;
        window.firebaseInitialized = true;
        
        return true;
    } catch (error) {
        console.error("❌ Firebase initialization error:", error);
        return false;
    }
}

// Wait for Firebase SDK to load and initialize - returns Promise
function initFirebase() {
    // Return existing promise if already initializing
    if (firebaseInitPromise) {
        return firebaseInitPromise;
    }
    
    firebaseInitPromise = new Promise((resolve) => {
        // If already initialized, resolve immediately
        if (window.firestore && firebaseInitResolved) {
            console.log("Firebase already initialized");
            resolve(true);
            return;
        }
        
        // Check if SDK is already loaded
        if (isFirebaseSDKLoaded()) {
            const success = initializeFirebase();
            firebaseInitResolved = true;
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
                firebaseInitResolved = true;
                resolve(success);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkSDK);
                console.error("Firebase SDK failed to load after maximum attempts");
                firebaseInitResolved = true;
                resolve(false);
            }
        }, 500);
    });
    
    return firebaseInitPromise;
}

// Function to get Firestore instance (waits for init)
async function getFirestore() {
    await initFirebase();
    return window.firestore;
}

// Function to check if Firebase is ready
function isFirebaseReady() {
    return !!(window.firestore && window.firebaseInitialized);
}

// Export for use in other modules
window.firebaseApp = firebaseApp;
window.firestore = firestore;
window.firebaseAnalytics = analytics;
window.initFirebase = initFirebase;
window.getFirestore = getFirestore;
window.isFirebaseReady = isFirebaseReady;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initFirebase().catch(console.error);
    });
} else {
    initFirebase().catch(console.error);
}
