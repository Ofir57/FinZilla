/**
 * Authentication & Cloud Sync Module
 */
const Auth = {
    currentUser: null,
    isInitialized: false,

    /**
     * Initialize auth state listener
     */
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        firebaseAuth.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            this.updateUI();

            if (user) {
                console.log('User signed in:', user.email);
                // Sync data from cloud on login
                await this.syncFromCloud();
            } else {
                console.log('User signed out');
            }
        });
    },

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        try {
            const result = await firebaseAuth.signInWithPopup(googleProvider);
            App.notify(`ברוך הבא, ${result.user.displayName}!`, 'success');
            return result.user;
        } catch (error) {
            console.error('Sign in error:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                App.notify('ההתחברות בוטלה', 'info');
            } else {
                App.notify('שגיאה בהתחברות: ' + error.message, 'error');
            }
            return null;
        }
    },

    /**
     * Sign out
     */
    async signOut() {
        try {
            await firebaseAuth.signOut();
            App.notify('התנתקת בהצלחה', 'success');
        } catch (error) {
            console.error('Sign out error:', error);
            App.notify('שגיאה בהתנתקות', 'error');
        }
    },

    /**
     * Update UI based on auth state
     */
    updateUI() {
        const authBtn = document.getElementById('authBtn');
        const userInfo = document.getElementById('userInfo');
        const syncStatus = document.getElementById('syncStatus');

        if (!authBtn) return;

        if (this.currentUser) {
            // User is signed in
            authBtn.innerHTML = `<span>התנתק</span>`;
            authBtn.onclick = () => this.signOut();
            authBtn.className = 'btn btn-secondary';

            if (userInfo) {
                const photo = this.currentUser.photoURL || '';
                const name = this.currentUser.displayName || this.currentUser.email;
                userInfo.innerHTML = `
                    <div class="user-profile">
                        ${photo ? `<img src="${photo}" alt="profile" class="user-avatar">` : ''}
                        <span class="user-name">${name}</span>
                    </div>
                `;
                userInfo.style.display = 'flex';
            }

            if (syncStatus) {
                syncStatus.innerHTML = '☁️ מסונכרן';
                syncStatus.className = 'sync-status synced';
            }
        } else {
            // User is signed out
            authBtn.innerHTML = `<span>🔐 התחבר עם Google</span>`;
            authBtn.onclick = () => this.signInWithGoogle();
            authBtn.className = 'btn btn-primary';

            if (userInfo) {
                userInfo.style.display = 'none';
            }

            if (syncStatus) {
                syncStatus.innerHTML = '💾 מקומי בלבד';
                syncStatus.className = 'sync-status local';
            }
        }
    },

    /**
     * Save all data to Firestore
     */
    async saveToCloud() {
        if (!this.currentUser) {
            console.log('Not logged in, skipping cloud save');
            return false;
        }

        try {
            const userId = this.currentUser.uid;
            const data = {
                bankAccounts: Storage.getBankAccounts(),
                creditCards: Storage.getCreditCards(),
                stocks: Storage.getStocks(),
                assets: Storage.getAssets(),
                myFunds: Storage.getMyFunds(),
                settings: Storage.getSettings(),
                stockAlerts: Storage.get(Storage.KEYS.STOCK_ALERTS),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdatedBy: this.currentUser.email
            };

            await firebaseDb.collection('users').doc(userId).set(data, { merge: true });
            console.log('Data saved to cloud');

            // Update sync status
            const syncStatus = document.getElementById('syncStatus');
            if (syncStatus) {
                syncStatus.innerHTML = '☁️ נשמר';
                syncStatus.className = 'sync-status synced';
                setTimeout(() => {
                    syncStatus.innerHTML = '☁️ מסונכרן';
                }, 2000);
            }

            return true;
        } catch (error) {
            console.error('Cloud save error:', error);
            App.notify('שגיאה בשמירה לענן', 'error');
            return false;
        }
    },

    /**
     * Load data from Firestore
     */
    async syncFromCloud() {
        if (!this.currentUser) {
            return false;
        }

        try {
            const userId = this.currentUser.uid;
            const doc = await firebaseDb.collection('users').doc(userId).get();

            if (doc.exists) {
                const data = doc.data();
                const localLastUpdate = localStorage.getItem('finance_last_update');
                const cloudLastUpdate = data.lastUpdated?.toDate?.()?.getTime() || 0;
                const localTime = localLastUpdate ? new Date(localLastUpdate).getTime() : 0;

                // Check if cloud data is newer or if this is first sync
                if (cloudLastUpdate > localTime || !localLastUpdate) {
                    // Cloud is newer, update local
                    if (data.bankAccounts) Storage.saveBankAccounts(data.bankAccounts);
                    if (data.creditCards) Storage.saveCreditCards(data.creditCards);
                    if (data.stocks) Storage.saveStocks(data.stocks);
                    if (data.assets) Storage.saveAssets(data.assets);
                    if (data.myFunds) Storage.saveMyFunds(data.myFunds);
                    if (data.settings) Storage.saveSettings(data.settings);
                    if (data.stockAlerts) Storage.set(Storage.KEYS.STOCK_ALERTS, data.stockAlerts);

                    localStorage.setItem('finance_last_update', new Date().toISOString());
                    console.log('Data synced from cloud');
                    App.notify('הנתונים סונכרנו מהענן', 'success');

                    // Refresh current page
                    if (typeof loadStocks === 'function') loadStocks();
                    if (typeof loadWatchlist === 'function') loadWatchlist();

                    return true;
                } else {
                    console.log('Local data is newer, uploading to cloud');
                    await this.saveToCloud();
                }
            } else {
                // No cloud data, save local to cloud
                console.log('No cloud data found, saving local data');
                await this.saveToCloud();
            }

            return true;
        } catch (error) {
            console.error('Cloud sync error:', error);
            App.notify('שגיאה בסנכרון מהענן', 'error');
            return false;
        }
    },

    /**
     * Force sync (manual trigger)
     */
    async forceSync() {
        if (!this.currentUser) {
            App.notify('יש להתחבר קודם', 'warning');
            return;
        }

        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.innerHTML = '🔄 מסנכרן...';
            syncStatus.className = 'sync-status syncing';
        }

        await this.saveToCloud();
        App.notify('הנתונים סונכרנו בהצלחה', 'success');
    }
};

// Auto-save to cloud when data changes (debounced)
let saveTimeout = null;
const originalStorageSet = Storage.set.bind(Storage);
Storage.set = function(key, data) {
    originalStorageSet(key, data);
    localStorage.setItem('finance_last_update', new Date().toISOString());

    // Debounced cloud save
    if (Auth.currentUser) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            Auth.saveToCloud();
        }, 2000); // Wait 2 seconds after last change before syncing
    }
};

// Make available globally
window.Auth = Auth;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be ready
    if (typeof firebase !== 'undefined' && typeof firebaseAuth !== 'undefined') {
        Auth.init();
    }
});
