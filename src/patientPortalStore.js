/**
 * Patient portal domain store.
 *
 * The HTTP contract is intentionally independent from the manager dashboard
 * store so it can be moved to Firestore/Postgres without changing the app.
 * This development implementation keeps data for the lifetime of the server.
 */

const CATALOG = [
  {
    id: 'laser-hair-removal',
    category: 'laser',
    name: 'Laser Hair Removal',
    department: 'Laser',
    description: 'A tailored laser plan for smoother, clearer-looking skin.',
    durationMin: 30,
    price: 600,
    sessions: 6,
  },
  {
    id: 'laser-rejuvenation',
    category: 'laser',
    name: 'Laser Skin Rejuvenation',
    department: 'Laser',
    description: 'Target tone, texture and pigmentation with specialist laser care.',
    durationMin: 45,
    price: 750,
    sessions: 4,
  },
  {
    id: 'hair-prp',
    category: 'hair',
    name: 'Hair PRP',
    department: 'Hair',
    description: 'Support healthier, fuller-looking hair with PRP treatment.',
    durationMin: 45,
    price: 800,
    sessions: 4,
  },
  {
    id: 'dermal-fillers',
    category: 'fillers',
    name: 'Dermal Fillers',
    department: 'Injectables',
    description: 'A clinician-led injectable plan tailored to your natural features.',
    durationMin: 40,
    price: 900,
    sessions: 1,
  },
  {
    id: 'facelift-consultation',
    category: 'facelift',
    name: 'Facelift Consultation',
    department: 'Plastic Surgery',
    description: 'Explore surgical and non-surgical rejuvenation options safely.',
    durationMin: 60,
    price: 500,
    sessions: 1,
  },
];

const DOCTORS = [
  { id: 'dr-ahmed-khan', name: 'Dr. Ahmed Khan', department: 'Laser', specialty: 'Laser Specialist', workingDays: [1, 2, 3, 4, 5, 6] },
  { id: 'dr-sarah-malik', name: 'Dr. Sarah Malik', department: 'Laser', specialty: 'Laser Specialist', workingDays: [1, 2, 4, 5, 6] },
  { id: 'dr-yusuf-alharbi', name: 'Dr. Yusuf Alharbi', department: 'Hair', specialty: 'Hair Specialist', workingDays: [2, 3, 4, 5, 6] },
  { id: 'dr-maya-quinn', name: 'Dr. Maya Quinn', department: 'Injectables', specialty: 'Injectables Specialist', workingDays: [1, 3, 4, 5, 6] },
  { id: 'dr-hana-farouk', name: 'Dr. Hana Farouk', department: 'Plastic Surgery', specialty: 'Plastic Surgeon', workingDays: [1, 2, 3, 5, 6] },
];

const SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

function isoDate(value) {
  const next = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : '';
}

function toDateLabel(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  });
}

function endTime(start, durationMin) {
  const match = String(start).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '';
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  const total = hours * 60 + Number(match[2]) + Number(durationMin || 30);
  const nextHours = Math.floor(total / 60) % 24;
  const suffix = nextHours >= 12 ? 'PM' : 'AM';
  const displayHours = nextHours % 12 || 12;
  return `${displayHours}:${String(total % 60).padStart(2, '0')} ${suffix}`;
}

function createPatientPortalStore() {
  const appointmentsByPatient = new Map();
  const documentsByPatient = new Map();

  function appointments(uid) {
    if (!appointmentsByPatient.has(uid)) appointmentsByPatient.set(uid, []);
    return appointmentsByPatient.get(uid);
  }

  function documents(uid) {
    if (!documentsByPatient.has(uid)) documentsByPatient.set(uid, []);
    return documentsByPatient.get(uid);
  }

  function availableSlots(doctorId, date) {
    const doctor = DOCTORS.find((item) => item.id === doctorId);
    if (!doctor || !isoDate(date)) return [];
    const weekday = new Date(`${date}T00:00:00`).getDay();
    if (!doctor.workingDays.includes(weekday)) return [];
    const reserved = [...appointmentsByPatient.values()]
      .flat()
      .filter((item) => item.doctorId === doctorId && item.date === date && !['canceled'].includes(item.status))
      .map((item) => item.time);
    return SLOTS.filter((slot) => !reserved.includes(slot));
  }

  return {
    catalog() {
      return { treatments: CATALOG, doctors: DOCTORS };
    },
    availability(doctorId, date) {
      return { slots: availableSlots(doctorId, date) };
    },
    listAppointments(uid) {
      return appointments(uid).slice().sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
    },
    listDocuments(uid) {
      return documents(uid).slice();
    },
    createAppointment(uid, profile, input = {}) {
      const treatment = CATALOG.find((item) => item.id === input.treatmentId);
      const doctor = DOCTORS.find((item) => item.id === input.doctorId);
      const date = isoDate(input.date);
      const time = String(input.time || '').trim();
      if (!treatment || !doctor || !date || !time || doctor.department !== treatment.department) {
        const error = new Error('Choose a treatment, eligible doctor, date and available time.');
        error.code = 'INVALID_BOOKING';
        throw error;
      }
      if (!availableSlots(doctor.id, date).includes(time)) {
        const error = new Error('This time is no longer available. Please choose another slot.');
        error.code = 'SLOT_UNAVAILABLE';
        throw error;
      }
      const now = new Date().toISOString();
      const item = {
        id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        requestId: `APT-${String(Date.now()).slice(-6)}`,
        patientUid: uid,
        patientName: String(profile?.name || input.fullName || 'Patient').trim(),
        treatmentId: treatment.id,
        treatment: treatment.name,
        department: treatment.department,
        duration: `${treatment.durationMin} Min`,
        durationMinutes: treatment.durationMin,
        basePrice: treatment.price,
        sessions: treatment.sessions,
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty,
        date,
        dateLabel: toDateLabel(date),
        time,
        endTime: endTime(time, treatment.durationMin),
        status: 'pending',
        notes: String(input.notes || '').trim(),
        branchId: String(input.branchId || ''),
        createdAt: now,
        updatedAt: now,
      };
      appointments(uid).unshift(item);
      if (input.document?.name) {
        documents(uid).unshift({
          id: `doc-${Date.now()}`,
          appointmentId: item.id,
          name: String(input.document.name),
          mimeType: String(input.document.mimeType || ''),
          uploadedAt: now,
        });
      }
      return item;
    },
    updateAppointment(uid, id, input = {}) {
      const item = appointments(uid).find((entry) => entry.id === id);
      if (!item) return null;
      const action = String(input.action || '').toLowerCase();
      if (action === 'cancel') {
        if (['completed', 'canceled'].includes(item.status)) {
          const error = new Error('This appointment cannot be cancelled.');
          error.code = 'INVALID_STATUS';
          throw error;
        }
        item.status = 'canceled';
        item.cancelReason = String(input.reason || '').trim();
      } else if (action === 'reschedule') {
        const date = isoDate(input.date);
        const time = String(input.time || '').trim();
        if (!date || !time || !availableSlots(item.doctorId, date).includes(time)) {
          const error = new Error('Choose an available date and time.');
          error.code = 'SLOT_UNAVAILABLE';
          throw error;
        }
        item.date = date;
        item.dateLabel = toDateLabel(date);
        item.time = time;
        item.endTime = endTime(time, item.durationMinutes);
        item.status = 'pending';
        item.rescheduleReason = String(input.reason || '').trim();
      } else {
        const error = new Error('Unsupported appointment action.');
        error.code = 'INVALID_ACTION';
        throw error;
      }
      item.updatedAt = new Date().toISOString();
      return item;
    },
  };
}

module.exports = { createPatientPortalStore };
