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

const DEFAULT_PASSWORD = process.argv[2] || 'Demo1234!';

const MANAGERS = [
  {
    name: 'Ahmed Al-Faisal',
    email: 'ahmed.ksa@erc-demo.com',
    branchId: 'br-riyadh',
    region: 'KSA',
  },
  {
    name: 'Omar Hassan',
    email: 'omar.dubai@erc-demo.com',
    branchId: 'br-dubai',
    region: 'UAE',
  },
  {
    name: 'Khalid Al-Balushi',
    email: 'khalid.oman@erc-demo.com',
    branchId: 'br-muscat',
    region: 'Oman',
  },
  {
    name: 'James Anderson',
    email: 'james.usa@erc-demo.com',
    branchId: 'br-nyc',
    region: 'USA',
  },
  {
    name: 'Hamza Khan',
    email: 'hamza.pk@erc-demo.com',
    branchId: 'br-lahore',
    region: 'Pakistan',
  },
];

async function upsertManager(auth, manager, password) {
  let user;
  try {
    user = await auth.getUserByEmail(manager.email);
    await auth.updateUser(user.uid, {
      displayName: manager.name,
      password,
      disabled: false,
      emailVerified: true,
    });
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({
      email: manager.email,
      password,
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

  console.log(`Seeding ${MANAGERS.length} clinic managers (password: ${DEFAULT_PASSWORD})`);
  for (const manager of MANAGERS) {
    const uid = await upsertManager(auth, manager, DEFAULT_PASSWORD);
    console.log(
      `✓ ${manager.name} <${manager.email}> → ${manager.region} (${manager.branchId}) uid=${uid}`
    );
  }
  console.log('\nDone. Each manager must sign in again to refresh claims.');
  console.log('They only receive data for their assigned branchId.');
}

main().catch((error) => {
  console.error(`[seed-clinic-managers] ${error.message}`);
  process.exit(1);
});
