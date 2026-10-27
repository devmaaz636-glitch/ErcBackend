const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

function loadServiceAccount({ serviceAccountPath, serviceAccountJson }) {
  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson);
  }
  if (serviceAccountPath) {
    const fullPath = path.resolve(serviceAccountPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Firebase service account file not found: ${fullPath}`);
    }
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  }
  throw new Error(
    'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_PATH (or FIREBASE_SERVICE_ACCOUNT_JSON).'
  );
}

function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (role === 'admin' || role === 'regional_admin' || role === 'regionaladmin') {
    return 'admin';
  }
  if (role === 'clinic_manager' || role === 'clinicmanager' || role === 'manager') {
    return 'clinic_manager';
  }
  return 'unassigned';
}

// Firebase Auth stays the source of truth for accounts and passwords.
function createFirebaseUsers(firebaseConfig) {
  const app = getApps()[0] || initializeApp({ credential: cert(loadServiceAccount(firebaseConfig)) });
  const auth = getAuth(app);

  return {
    async findByEmail(email) {
      try {
        const user = await auth.getUserByEmail(email);
        return user.disabled ? null : { uid: user.uid, email: user.email };
      } catch (error) {
        if (error?.code === 'auth/user-not-found') return null;
        throw error;
      }
    },
    async setPassword(uid, password) {
      await auth.updateUser(uid, { password });
      // Sign the account out of every other device.
      await auth.revokeRefreshTokens(uid);
    },
    async getUserEmail(uid) {
      const user = await auth.getUser(uid);
      return user.disabled ? null : user.email || null;
    },
    async verifyIdToken(idToken) {
      const decoded = await auth.verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email || '',
        role: normalizeRole(decoded.role || decoded['https://enfieldroyalclinic.com/role']),
        clinicId: decoded.clinicId || decoded.branchId || null,
        branchId: decoded.branchId || decoded.clinicId || null,
        name: decoded.name || '',
      };
    },
  };
}

module.exports = { createFirebaseUsers, loadServiceAccount, normalizeRole };
