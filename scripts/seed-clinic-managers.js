/**
 * Create / update the 5 demo clinic managers in Firebase Auth with
 * clinic_manager role + branchId claims so each logs into only their region.
 *
 * Usage:
 *   node scripts/seed-clinic-managers.js
 *   node scripts/seed-clinic-managers.js Demo1234!
 */
require('dotenv').config({ quiet: true });

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const config = require('../src/config');
const { loadServiceAccount } = require('../src/users');
const { DEMO_MANAGERS, DEMO_PASSWORD } = require('../src/demoManagers');

const password = process.argv[2] || DEMO_PASSWORD;

async function upsertManager(auth, manager, nextPassword) {
  let user;
  try {
    user = await auth.getUserByEmail(manager.email);
    await auth.updateUser(user.uid, {
      displayName: manager.name,
      password: nextPassword,
      disabled: false,
      emailVerified: true,
    });
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({
      email: manager.email,
      password: nextPassword,
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

  return user.uid;
}

async function main() {
  const app =
    getApps()[0] || initializeApp({ credential: cert(loadServiceAccount(config.firebase)) });
  const auth = getAuth(app);

  console.log(`Seeding ${DEMO_MANAGERS.length} clinic managers (password: ${password})`);
  for (const manager of DEMO_MANAGERS) {
    const uid = await upsertManager(auth, manager, password);
    console.log(
      `✓ ${manager.name} <${manager.email}> → ${manager.region} (${manager.branchId}) uid=${uid}`
    );
  }
  console.log('\nDone. Sign in from the app with email + that password.');
  console.log('Each manager only receives data for their assigned branchId.');
}

main().catch((error) => {
  console.error(`[seed-clinic-managers] ${error.message}`);
  process.exit(1);
});
