/** Shared demo clinic-manager accounts used by seed + login fallback. */

const DEMO_PASSWORD = '123456';

const DEMO_MANAGERS = [
  {
    name: 'Abiha',
    email: 'itx.abiha.official@gmail.com',
    password: 'KHANabiha&0987',
    branchId: 'br-riyadh',
    region: 'KSA',
    primary: true,
  },
  {
    name: 'Ahmed Al-Faisal',
    email: 'ahmed.ksa@erc-demo.com',
    password: DEMO_PASSWORD,
    branchId: 'br-riyadh',
    region: 'KSA',
  },
  {
    name: 'Omar Hassan',
    email: 'omar.dubai@erc-demo.com',
    password: DEMO_PASSWORD,
    branchId: 'br-dubai',
    region: 'UAE',
  },
  {
    name: 'Khalid Al-Balushi',
    email: 'khalid.oman@erc-demo.com',
    password: DEMO_PASSWORD,
    branchId: 'br-muscat',
    region: 'Oman',
  },
  {
    name: 'James Anderson',
    email: 'james.usa@erc-demo.com',
    password: DEMO_PASSWORD,
    branchId: 'br-nyc',
    region: 'USA',
  },
  {
    name: 'Hamza Khan',
    email: 'hamza.pk@erc-demo.com',
    password: DEMO_PASSWORD,
    branchId: 'br-lahore',
    region: 'Pakistan',
  },
];

function findDemoManager(email) {
  const key = String(email || '')
    .trim()
    .toLowerCase();
  return DEMO_MANAGERS.find((item) => item.email === key) || null;
}

function demoPasswordFor(manager) {
  return manager?.password || DEMO_PASSWORD;
}

module.exports = { DEMO_PASSWORD, DEMO_MANAGERS, findDemoManager, demoPasswordFor };
