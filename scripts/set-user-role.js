const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const config = require('../src/config');
const { loadServiceAccount } = require('../src/users');

const [email, role, branchIdArg] = process.argv.slice(2);
const allowedRoles = new Set(['admin', 'clinic_manager', 'doctor']);

if (!email || !allowedRoles.has(role) || (role === 'clinic_manager' && !branchIdArg)) {
  console.error(
    'Usage: node scripts/set-user-role.js <email> <admin|clinic_manager|doctor> [branchId]'
  );
  process.exit(1);
}

async function main() {
  const app = getApps()[0] || initializeApp({ credential: cert(loadServiceAccount(config.firebase)) });
  const auth = getAuth(app);
  const user = await auth.getUserByEmail(email);
  const existingClaims = user.customClaims || {};
  const branchId =
    role === 'clinic_manager' || role === 'doctor' ? branchIdArg || 'br-dubai' : null;
  const claims = {
    ...existingClaims,
    role,
    branchId,
    clinicId: branchId,
    region: role === 'doctor' ? 'UAE' : existingClaims.region || null,
  };

  const updates = {};
  if (role === 'doctor') {
    updates.displayName = user.displayName || 'Dr Zeeshan Forward';
  }
  if (Object.keys(updates).length) {
    await auth.updateUser(user.uid, updates);
  }

  await auth.setCustomUserClaims(user.uid, claims);
  console.log(
    `Updated role for ${user.email || email}: ${role}${branchId ? ` (${branchId})` : ''}`
  );
  console.log('The user must sign in again to receive the updated claims.');
}

main().catch((error) => {
  console.error(`[set-user-role] ${error.message}`);
  process.exit(1);
});
