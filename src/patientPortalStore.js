/**
 * Patient portal domain store.
 *
 * Working data is held in memory for fast, synchronous reads and written
 * through to Redis after every change, so appointments and document metadata
 * survive server restarts. The HTTP contract is independent of this storage so
 * it can later move to Firestore/Postgres without touching the app.
 *
 * The catalog (treatments, doctors, clinics, regions, banners) is seed data
 * today; it is exposed through `catalog()` so an admin editor can replace it
 * later without changing any patient screen.
 */

const CLINICS = require('./patientClinicsSeed.json');

const TREATMENTS = [
  {
    id: 'laser-hair-removal',
    category: 'laser',
    name: 'Laser Hair Removal',
    department: 'Laser',
    description: 'A tailored laser plan for smoother, clearer-looking skin.',
    durationMin: 30,
    price: 600,
    sessions: 6,
    featured: true,
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

const CATEGORIES = [
  { id: 'laser', label: 'Laser\nTreatments', section: 'Laser Treatments' },
  { id: 'hair', label: 'Hair Prp', section: 'Hair PRP' },
  { id: 'fillers', label: 'Dermal\nFillers', section: 'Dermal Fillers' },
  { id: 'facelift', label: 'Facelift', section: 'Facelift' },
];

// `treatmentId` makes the banner's call to action open that treatment.
const BANNERS = [
  {
    id: 'promo-1',
    eyebrow: 'Exclusive Beauty Deals',
    title: 'Save Up To 40%',
    body: 'Discover exclusive offers and experience the beauty you deserve.',
    cta: 'Book Now',
    imageKey: 'patientcard',
    treatmentId: 'laser-hair-removal',
  },
  {
    id: 'promo-2',
    eyebrow: 'New Season Offers',
    title: 'Glow With Confidence',
    body: 'Book premium skincare treatments with specialists at your clinic.',
    cta: 'Book Now',
    imageKey: 'patientcard',
    treatmentId: 'laser-rejuvenation',
  },
  {
    id: 'promo-3',
    eyebrow: 'Member Privileges',
    title: 'Priority Booking',
    body: 'Reserve preferred slots faster and manage follow-ups in one place.',
    cta: 'Book Now',
    imageKey: 'patientcard',
    treatmentId: null,
  },
];

// Regional pricing: price shown = base price x factor, in the region currency.
const REGIONS = [
  { key: 'UAE', currency: 'AED', factor: 1, flag: '🇦🇪' },
  { key: 'KSA', currency: 'SAR', factor: 1.05, flag: '🇸🇦' },
  { key: 'Oman', currency: 'OMR', factor: 0.1, flag: '🇴🇲' },
  { key: 'Pakistan', currency: 'PKR', factor: 75, flag: '🇵🇰' },
  { key: 'USA', currency: 'USD', factor: 0.27, flag: '🇺🇸' },
];

const ACTIVE_STATUSES = ['pending', 'upcoming'];
const SNAPSHOT_KEY = 'patient-portal:v1';

function isoDate(value) {
  const next = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : '';
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isPastDate(value) {
  const date = isoDate(value);
  return Boolean(date && date < todayKey());
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

// Start of a "09:00 AM" slot on an ISO date, as a Date.
function slotStart(date, time) {
  const match = String(time).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match || !isoDate(date)) return null;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, hours, Number(match[2]));
}

// Policy shown to patients: no cancelling / rescheduling inside 5 hours of the visit.
const CHANGE_WINDOW_HOURS = 5;

function bookingError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function createPatientPortalStore({ redis } = {}) {
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

  // ── Persistence (write-through snapshot) ───────────────────────────────────
  let writeChain = Promise.resolve();

  function snapshot() {
    return JSON.stringify({
      appointments: Object.fromEntries(appointmentsByPatient),
      documents: Object.fromEntries(documentsByPatient),
    });
  }

  function persist() {
    if (!redis || typeof redis.set !== 'function') return writeChain;
    const body = snapshot();
    writeChain = writeChain
      .then(() => redis.set(SNAPSHOT_KEY, body))
      .catch((error) => {
        console.error(`[patient-portal] could not persist: ${error.message}`);
      });
    return writeChain;
  }

  const ready = (async () => {
    if (!redis || typeof redis.get !== 'function') return;
    try {
      const raw = await redis.get(SNAPSHOT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      for (const [uid, list] of Object.entries(data.appointments || {})) {
        appointmentsByPatient.set(uid, Array.isArray(list) ? list : []);
      }
      for (const [uid, list] of Object.entries(data.documents || {})) {
        documentsByPatient.set(uid, Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error(`[patient-portal] could not load saved data: ${error.message}`);
    }
  })();

  // ── Rules ──────────────────────────────────────────────────────────────────
  function availableSlots(doctorId, date) {
    const doctor = DOCTORS.find((item) => item.id === doctorId);
    if (!doctor || !isoDate(date) || isPastDate(date)) return [];
    const weekday = new Date(`${date}T00:00:00`).getDay();
    if (!doctor.workingDays.includes(weekday)) return [];
    const reserved = [...appointmentsByPatient.values()]
      .flat()
      .filter((item) => item.doctorId === doctorId && item.date === date && item.status !== 'canceled')
      .map((item) => item.time);
    const now = Date.now();
    return SLOTS.filter((slot) => {
      if (reserved.includes(slot)) return false;
      // Today: hide times that have already started.
      const start = slotStart(date, slot);
      return !start || start.getTime() > now;
    });
  }

  function assertChangeAllowed(item, verb) {
    const start = slotStart(item.date, item.time);
    if (start && start.getTime() - Date.now() < CHANGE_WINDOW_HOURS * 3600 * 1000) {
      throw bookingError(
        'INVALID_STATUS',
        `This appointment is within ${CHANGE_WINDOW_HOURS} hours, so it can no longer be ${verb} in the app. Please call the clinic.`
      );
    }
  }

  function patientHasSlot(uid, date, time, ignoreId) {
    return appointments(uid).some(
      (item) =>
        item.id !== ignoreId &&
        item.date === date &&
        item.time === time &&
        ACTIVE_STATUSES.includes(item.status)
    );
  }

  function popularTreatments() {
    const counts = new Map();
    for (const list of appointmentsByPatient.values()) {
      for (const apt of list) {
        if (!apt?.treatmentId || apt.status === 'canceled') continue;
        counts.set(apt.treatmentId, (counts.get(apt.treatmentId) || 0) + 1);
      }
    }
    const ranked = TREATMENTS
      .map((item) => ({ ...item, bookingCount: counts.get(item.id) || 0 }))
      .sort((a, b) => {
        if (b.bookingCount !== a.bookingCount) return b.bookingCount - a.bookingCount;
        return String(a.name).localeCompare(String(b.name));
      });
    // Prefer treatments patients actually book; if none yet, keep catalog order.
    const booked = ranked.filter((item) => item.bookingCount > 0);
    return booked.length ? booked : ranked;
  }

  function withDocument(uid, item) {
    const doc = documents(uid).find((entry) => entry.appointmentId === item.id);
    return {
      ...item,
      document: doc ? { id: doc.id, name: doc.name, mimeType: doc.mimeType, size: doc.size || 0 } : null,
    };
  }

  /**
   * Treatment plans that still need attention for this patient:
   *  - "due": sessions are left but nothing is booked
   *  - "upcoming": the next session is already booked
   */
  function followUps(uid) {
    const today = todayKey();
    const byTreatment = new Map();
    for (const apt of appointments(uid)) {
      if (!apt.treatmentId) continue;
      if (!byTreatment.has(apt.treatmentId)) byTreatment.set(apt.treatmentId, []);
      byTreatment.get(apt.treatmentId).push(apt);
    }
    const items = [];
    for (const [treatmentId, list] of byTreatment) {
      const treatment = TREATMENTS.find((entry) => entry.id === treatmentId);
      const total = Number(treatment?.sessions || Math.max(...list.map((a) => Number(a.sessions) || 1)));
      const completed = list.filter((a) => a.status === 'completed');
      const next = list
        .filter((a) => ACTIVE_STATUSES.includes(a.status) && a.date >= today)
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0] || null;
      const last = completed.slice().sort((a, b) => b.date.localeCompare(a.date))[0] || null;
      let status = null;
      if (next) status = 'upcoming';
      else if (completed.length > 0 && completed.length < total) status = 'due';
      if (!status) continue;
      const anchor = next || last || list[0];
      items.push({
        treatmentId,
        treatment: anchor.treatment,
        department: anchor.department,
        doctorId: anchor.doctorId,
        doctorName: anchor.doctorName,
        basePrice: anchor.basePrice,
        sessions: total,
        completed: completed.length,
        status,
        next: next ? withDocument(uid, next) : null,
        lastVisit: last ? last.date : null,
      });
    }
    const rank = { due: 0, upcoming: 1 };
    return items.sort((a, b) => {
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      return String(a.next?.date || '').localeCompare(String(b.next?.date || ''));
    });
  }

  return {
    ready,
    flush: () => writeChain,
    catalog() {
      return {
        treatments: TREATMENTS,
        doctors: DOCTORS,
        categories: CATEGORIES,
        banners: BANNERS,
        clinics: CLINICS,
        regions: REGIONS,
        popular: popularTreatments(),
      };
    },
    availability(doctorId, date) {
      return { slots: availableSlots(doctorId, date) };
    },
    listAppointments(uid) {
      return appointments(uid)
        .slice()
        .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
        .map((item) => withDocument(uid, item));
    },
    followUps,
    listDocuments(uid) {
      return documents(uid).slice();
    },
    getDocument(uid, id) {
      return documents(uid).find((entry) => entry.id === id) || null;
    },
    addDocument(uid, { appointmentId, name, mimeType, size }) {
      const appointment = appointments(uid).find((entry) => entry.id === appointmentId);
      if (!appointment) throw bookingError('NOT_FOUND', 'Appointment not found.');
      const list = documents(uid);
      // One attachment per appointment: a new upload replaces the old one.
      const replaced = list.filter((entry) => entry.appointmentId === appointmentId).map((entry) => entry.id);
      const kept = list.filter((entry) => entry.appointmentId !== appointmentId);
      const doc = {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        appointmentId,
        name: String(name || 'Document').slice(0, 160),
        mimeType: String(mimeType || ''),
        size: Number(size) || 0,
        uploadedAt: new Date().toISOString(),
      };
      documentsByPatient.set(uid, [doc, ...kept]);
      persist();
      return { doc, replaced };
    },
    createAppointment(uid, profile, input = {}) {
      const treatment = TREATMENTS.find((item) => item.id === input.treatmentId);
      const doctor = DOCTORS.find((item) => item.id === input.doctorId);
      const date = isoDate(input.date);
      const time = String(input.time || '').trim();
      if (!treatment || !doctor || !date || !time || doctor.department !== treatment.department) {
        throw bookingError('INVALID_BOOKING', 'Choose a treatment, eligible doctor, date and available time.');
      }
      if (isPastDate(date)) {
        throw bookingError('INVALID_BOOKING', 'Please choose today or a future date.');
      }
      if (!availableSlots(doctor.id, date).includes(time)) {
        throw bookingError('SLOT_UNAVAILABLE', 'This time is no longer available. Please choose another slot.');
      }
      if (patientHasSlot(uid, date, time)) {
        throw bookingError('SLOT_UNAVAILABLE', 'You already have an appointment at this time.');
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
      persist();
      return withDocument(uid, item);
    },
    updateAppointment(uid, id, input = {}) {
      const item = appointments(uid).find((entry) => entry.id === id);
      if (!item) return null;
      const action = String(input.action || '').toLowerCase();
      if (action === 'cancel') {
        if (['completed', 'canceled'].includes(item.status)) {
          throw bookingError('INVALID_STATUS', 'This appointment cannot be cancelled.');
        }
        assertChangeAllowed(item, 'cancelled');
        item.status = 'canceled';
        item.cancelReason = String(input.reason || '').trim();
      } else if (action === 'reschedule') {
        if (['completed', 'canceled'].includes(item.status)) {
          throw bookingError('INVALID_STATUS', 'This appointment cannot be rescheduled.');
        }
        assertChangeAllowed(item, 'rescheduled');
        const date = isoDate(input.date);
        const time = String(input.time || '').trim();
        if (isPastDate(date)) {
          throw bookingError('SLOT_UNAVAILABLE', 'Please choose today or a future date.');
        }
        if (!date || !time || !availableSlots(item.doctorId, date).includes(time)) {
          throw bookingError('SLOT_UNAVAILABLE', 'Choose an available date and time.');
        }
        if (patientHasSlot(uid, date, time, item.id)) {
          throw bookingError('SLOT_UNAVAILABLE', 'You already have an appointment at this time.');
        }
        item.date = date;
        item.dateLabel = toDateLabel(date);
        item.time = time;
        item.endTime = endTime(time, item.durationMinutes);
        item.status = 'pending';
        item.rescheduleReason = String(input.reason || '').trim();
      } else {
        throw bookingError('INVALID_ACTION', 'Unsupported appointment action.');
      }
      item.updatedAt = new Date().toISOString();
      persist();
      return withDocument(uid, item);
    },
  };
}

module.exports = { createPatientPortalStore };
