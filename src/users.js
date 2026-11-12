const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { findDemoManager, demoPasswordFor } = require('./demoManagers');

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
  if (role === 'doctor' || role === 'clinic_doctor' || role === 'physician') {
    return 'doctor';
  }
  if (role === 'patient' || role === 'clinic_patient') {
    return 'patient';
  }
  // Keep unknown roles empty so requireRole(...) stays strict for staff routes.
  return '';
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
      const email = String(decoded.email || '').trim().toLowerCase();
      let role = normalizeRole(decoded.role || decoded['https://enfieldroyalclinic.com/role']);
      let branchId = decoded.branchId || decoded.clinicId || null;
      let region = decoded.region || null;
      let name = decoded.name || decoded.displayName || '';

      // Demo doctor account: allow schedule APIs even before custom claims are set.
      if (!role && email === 'ercdoctor@gmail.com') {
        role = 'doctor';
      }
      if (role === 'doctor' && !branchId) {
        branchId = 'br-dubai';
        region = region || 'UAE';
        name = name || 'Dr Zeeshan Forward';
      }

      return {
        uid: decoded.uid,
        email: decoded.email || '',
        role,
        clinicId: decoded.clinicId || decoded.branchId || branchId,
        branchId,
        region,
        name,
      };
    },
    /**
     * Public patient self-registration only.
     * Staff (admin / clinic_manager / doctor) cannot be created through this path.
     */
    async createPatientAccount({ email, password, fullName }) {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const nextPassword = String(password || '');
      const name = String(fullName || '').trim();

      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        const error = new Error('Enter a valid email address.');
        error.code = 'INVALID_EMAIL';
        throw error;
      }
      if (name.length < 2) {
        const error = new Error('Enter your full name.');
        error.code = 'INVALID_NAME';
        throw error;
      }
      if (nextPassword.length < 8 || !/[A-Za-z]/.test(nextPassword) || !/\d/.test(nextPassword)) {
        const error = new Error('Use at least 8 characters with a letter and a number.');
        error.code = 'WEAK_PASSWORD';
        throw error;
      }

      try {
        const existing = await auth.getUserByEmail(normalizedEmail);
        const existingRole = normalizeRole(existing.customClaims?.role);
        if (existingRole && existingRole !== 'patient') {
          const error = new Error(
            'This email is already registered for staff access. Sign in instead.'
          );
          error.code = 'EMAIL_STAFF';
          throw error;
        }
        const error = new Error('An account with this email already exists. Sign in instead.');
        error.code = 'EMAIL_EXISTS';
        throw error;
      } catch (error) {
        if (error?.code && error.code !== 'auth/user-not-found') throw error;
      }

      const user = await auth.createUser({
        email: normalizedEmail,
        password: nextPassword,
        displayName: name,
        emailVerified: false,
        disabled: false,
      });

      await auth.setCustomUserClaims(user.uid, {
        role: 'patient',
      });

      const customToken = await auth.createCustomToken(user.uid, {
        role: 'patient',
      });

      return {
        customToken,
        uid: user.uid,
        email: normalizedEmail,
        name,
        role: 'patient',
      };
    },
    /**
     * Guarantees a demo clinic-manager can sign in with their known password.
     * Upserts Auth user, claims, password, then returns a custom token.
     */
    async ensureDemoManagerLogin(email, password) {
      const manager = findDemoManager(email);
      if (!manager) {
        const error = new Error('Not a demo clinic manager account.');
        error.code = 'DEMO_UNKNOWN';
        throw error;
      }
      const expectedPassword = demoPasswordFor(manager);
      if (String(password || '') !== expectedPassword) {
        const error = new Error('Email or password is incorrect.');
        error.code = 'DEMO_BAD_PASSWORD';
        throw error;
      }

      let user;
      try {
        user = await auth.getUserByEmail(manager.email);
        await auth.updateUser(user.uid, {
          displayName: manager.name,
          password: expectedPassword,
          disabled: false,
          emailVerified: true,
        });
      } catch (error) {
        if (error?.code !== 'auth/user-not-found') throw error;
        user = await auth.createUser({
          email: manager.email,
          password: expectedPassword,
          displayName: manager.name,
          emailVerified: true,
          disabled: false,
        });
      }

      const existingClaims = user.customClaims || {};
      await auth.setCustomUserClaims(user.uid, {
        ...existingClaims,
        role: 'clinic_manager',
        branchId: manager.branchId,
        clinicId: manager.branchId,
        region: manager.region,
      });

      const customToken = await auth.createCustomToken(user.uid, {
        role: 'clinic_manager',
        branchId: manager.branchId,
        clinicId: manager.branchId,
        region: manager.region,
      });

      return {
        customToken,
        email: manager.email,
        name: manager.name,
        branchId: manager.branchId,
        region: manager.region,
        role: 'clinic_manager',
      };
    },
  };
}

module.exports = { createFirebaseUsers, loadServiceAccount, normalizeRole };
