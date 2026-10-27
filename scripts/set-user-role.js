const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const config = require('../src/config');
const { loadServiceAccount } = require('../src/users');

const [email, role, branchId] = process.argv.slice(2);
const allowedRoles = new Set(['admin', 'clinic_manager']);

if (!email || !allowedRoles.has(role) || (role === 'clinic_manager' && !branchId)) {
  console.error(
    'Usage: node scripts/set-user-role.js <email> <admin|clinic_manager> [branchId]'
  );
  process.exit(1);
}

async function main() {
  const app = getApps()[0] || initializeApp({ credential: cert(loadServiceAccount(config.firebase)) });
  const auth = getAuth(app);
  const user = await auth.getUserByEmail(email);
  const existingClaims = user.customClaims || {};
  const claims = {
    ...existingClaims,
    role,
    branchId: role === 'clinic_manager' ? branchId : null,
    clinicId: role === 'clinic_manager' ? branchId : null,
  };

  await auth.setCustomUserClaims(user.uid, claims);
  console.log(`Updated role for ${user.email || email}: ${role}${branchId ? ` (${branchId})` : ''}`);
  console.log('The user must sign in again to receive the updated claims.');
}

main().catch((error) => {
  console.error(`[set-user-role] ${error.message}`);
  process.exit(1);
});
