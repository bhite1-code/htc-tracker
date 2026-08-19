// sync.js

const firebaseConfig = {
  apiKey: "AIzaSyAqEAqcWGoALZICJ5wGpChW8P1D6q0BbeQ",
  authDomain: "htc-tracker.firebaseapp.com",
  projectId: "htc-tracker",
  storageBucket: "htc-tracker.firebasestorage.app",
  messagingSenderId: "417299376489",
  appId: "1:417299376489:web:fffc335e460c22716035f8"
};

// 1. Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. Enable Offline Persistence (The Dead Zone Failsafe!)
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    console.warn("Offline persistence error:", err.code);
});

// 3. Connect to our single "Source of Truth" document
const raceDocRef = db.collection('race_data').doc('htc_2026_state');

// Helper to easily update the new UI Sync Status
function updateSyncStatus(msg) {
    const el = document.getElementById('syncStatus');
    if (el) el.innerText = msg;
}

// 4. The Cloud Listener: Pulls data instantly when the other van updates it
raceDocRef.onSnapshot((doc) => {
    if (doc.exists) {
        const cloudState = doc.data();
        
        // Only override local data if the cloud has a NEWER timestamp
        if (!engine.state.lastUpdated || cloudState.lastUpdated > engine.state.lastUpdated) {
             engine.state.actuals = cloudState.actuals || {};
             engine.state.paces = cloudState.paces || {};
             engine.state.currentLeg = cloudState.currentLeg || 1;
             engine.state.raceStarted = cloudState.raceStarted || false;
             engine.state.lastUpdated = cloudState.lastUpdated;
             
             // Save the new cloud math to local storage
             localStorage.setItem('htc_state', JSON.stringify(engine.state));
             
             // Force the UI to re-render the active screen
             if (window.renderView && document.querySelector('.view.active')) {
                 window.renderView(document.querySelector('.view.active').id);
             }
             
             const timeStr = new Date(cloudState.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
             updateSyncStatus(`☁️ Last Sync: ${timeStr}`);
             console.log("📥 Cloud Sync Received & Interface Updated!");
        }
    }
}, (error) => {
    updateSyncStatus(`📡 Offline (Queuing updates)`);
});

// 5. The Cloud Pusher: Sends local updates to Firebase
function pushToCloud() {
    engine.state.lastUpdated = Date.now(); // Stamp it so the other van knows it's new
    
    updateSyncStatus(`📡 Syncing...`);
    
    // Set 'merge: true' so we don't accidentally delete fields we didn't touch
    raceDocRef.set({
        actuals: engine.state.actuals,
        paces: engine.state.paces,
        currentLeg: engine.state.currentLeg,
        raceStarted: engine.state.raceStarted,
        lastUpdated: engine.state.lastUpdated
    }, { merge: true })
    .then(() => {
        const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        updateSyncStatus(`☁️ Last Sync: ${timeStr}`);
        console.log("☁️ Sync Pushed to Cloud");
    })
    .catch(err => {
        updateSyncStatus(`📡 Offline (Saved to outbox)`);
        console.log("📡 Saved offline. Will sync when connection returns.");
    });
}

// 6. Hijack the Engine: Automatically push to cloud whenever a time is logged!
const originalSaveState = engine.saveState.bind(engine);
engine.saveState = function() {
    originalSaveState(); // Still save to local storage immediately
    pushToCloud();       // Then quietly send it to Firebase in the background
};

// Handle Browser Network Events
window.addEventListener('online', () => updateSyncStatus(`📡 Reconnecting...`));
window.addEventListener('offline', () => updateSyncStatus(`📡 Offline (Saved to outbox)`));