const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createClinicStore } = require('../src/clinicData');

describe('clinicData store', () => {
  const clinic = createClinicStore({ today: '2026-10-20' });

  it('returns dashboard with dynamic stats', () => {
    const dash = clinic.getDashboard();
    assert.ok(dash.stats.length >= 4);
    assert.ok(dash.branches.length > 0);
    assert.ok(dash.doctors.length > 0);
    assert.ok(dash.managerPreview.length > 0);
  });

  it('lists appointments with computed stats', () => {
    const { stats, items } = clinic.listAppointments();
    assert.ok(items.length > 0);
    assert.equal(stats.find((s) => s.id === 'upcoming').value.length, 2);
  });

  it('enriches branch detail from appointments', () => {
    const branch = clinic.getBranch('br-dubai');
    assert.ok(branch);
    assert.ok(branch.stats.length === 4);
    assert.equal(branch.city, 'Dubai');
  });

  it('lists and details clinic managers', () => {
    const { stats, items } = clinic.listManagers();
    assert.ok(stats.total >= 1);
    assert.ok(items.every((m) => m.clinic === null || m.clinic.name));
    const one = clinic.getManager('mgr-1');
    assert.equal(one.clinic.id, 'br-dubai');
  });
});
