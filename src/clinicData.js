/**
 * Clinic domain store (seed + query helpers).
 * Swap persistence later (Firestore/Postgres) without changing route shapes.
 */

function daysFrom(base, offset) {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function createClinicStore(options = {}) {
  const today = options.today || new Date().toISOString().slice(0, 10);

  const branches = [
    {
      id: 'br-dubai',
      name: 'Dubai Enfield Royal Clinic',
      city: 'Dubai',
      region: 'UAE',
      address: 'Sheikh Zayed Rd',
      bookings: 109,
      growth: 32.2,
      progress: 81.3,
      status: 'active',
      bookingsToday: 42,
      capacityNote:
        'Near the configured capacity threshold. Capacity uses available appointment slots.',
    },
    {
      id: 'br-riyadh',
      name: 'Riyadh Royal Clinic',
      city: 'Riyadh',
      region: 'KSA',
      address: 'King Fahd Rd',
      bookings: 98,
      growth: 12.4,
      progress: 74.0,
      status: 'active',
      bookingsToday: 31,
    },
    {
      id: 'br-muscat',
      name: 'Muscat Royal Clinic',
      city: 'Muscat',
      region: 'Oman',
      address: 'Qurum',
      bookings: 87,
      growth: 8.1,
      progress: 68.5,
      status: 'active',
      bookingsToday: 22,
    },
    {
      id: 'br-lahore',
      name: 'Lahore Royal Clinic',
      city: 'Lahore',
      region: 'Pakistan',
      address: 'MM Alam Rd',
      bookings: 76,
      growth: 5.0,
      progress: 61.2,
      status: 'active',
      bookingsToday: 18,
    },
    {
      id: 'br-nyc',
      name: 'New York Royal Clinic',
      city: 'New York',
      region: 'USA',
      address: '5th Avenue',
      bookings: 54,
      growth: -4.3,
      progress: 42.0,
      status: 'attention',
      bookingsToday: 11,
    },
  ];

  const doctors = [
    {
      id: 'doc-1',
      name: 'Dr. Ali Khan',
      specialty: 'Dermatologist',
      consults: 48,
      score: 94,
      branchId: 'br-dubai',
    },
    {
      id: 'doc-2',
      name: 'Dr. Sarah Malik',
      specialty: 'Hair Specialist',
      consults: 42,
      score: 92,
      branchId: 'br-dubai',
    },
    {
      id: 'doc-3',
      name: 'Dr. Nora Ahmed',
      specialty: 'Laser Specialist',
      consults: 36,
      score: 88,
      branchId: 'br-riyadh',
    },
    {
      id: 'doc-3b',
      name: 'Dr. Layla Hassan',
      specialty: 'Dermatologist',
      consults: 41,
      score: 91,
      branchId: 'br-riyadh',
    },
    {
      id: 'doc-3c',
      name: 'Dr. Yusuf Alharbi',
      specialty: 'Hair Specialist',
      consults: 33,
      score: 87,
      branchId: 'br-riyadh',
    },
    {
      id: 'doc-4',
      name: 'Dr. Hassan Reza',
      specialty: 'Dentist',
      consults: 29,
      score: 85,
      branchId: 'br-muscat',
    },
  ];

  const managers = [
    {
      id: 'mgr-1',
      name: 'Fatima Al Hashemi',
      email: 'fatima.manager@enfieldroyal.com',
      phone: '+971 50 123 4567',
      role: 'Clinic Manager',
      status: 'active',
      branchId: 'br-dubai',
      employeeId: 'CM-1001',
      joinedAt: '2024-03-12',
      patientsThisMonth: 312,
      appointmentsToday: 28,
      staffCount: 14,
      rating: 4.8,
    },
    {
      id: 'mgr-2',
      name: 'Omar Al Rashid',
      email: 'omar.manager@enfieldroyal.com',
      phone: '+966 55 987 6543',
      role: 'Clinic Manager',
      status: 'active',
      branchId: 'br-riyadh',
      employeeId: 'CM-1002',
      joinedAt: '2023-11-02',
      patientsThisMonth: 278,
      appointmentsToday: 22,
      staffCount: 11,
      rating: 4.6,
    },
    {
      id: 'mgr-3',
      name: 'Aisha Al Balushi',
      email: 'aisha.manager@enfieldroyal.com',
      phone: '+968 92 111 2233',
      role: 'Clinic Manager',
      status: 'active',
      branchId: 'br-muscat',
      employeeId: 'CM-1003',
      joinedAt: '2024-07-18',
      patientsThisMonth: 190,
      appointmentsToday: 16,
      staffCount: 9,
      rating: 4.5,
    },
    {
      id: 'mgr-4',
      name: 'Hassan Raza',
      email: 'hassan.manager@enfieldroyal.com',
      phone: '+92 300 555 7788',
      role: 'Clinic Manager',
      status: 'invited',
      branchId: 'br-lahore',
      employeeId: 'CM-1004',
      joinedAt: '2026-09-01',
      patientsThisMonth: 0,
      appointmentsToday: 0,
      staffCount: 7,
      rating: null,
    },
    {
      id: 'mgr-5',
      name: 'Elena Vargas',
      email: 'elena.manager@enfieldroyal.com',
      phone: '+1 212 555 0199',
      role: 'Clinic Manager',
      status: 'inactive',
      branchId: 'br-nyc',
      employeeId: 'CM-1005',
      joinedAt: '2022-05-20',
      patientsThisMonth: 64,
      appointmentsToday: 4,
      staffCount: 8,
      rating: 4.1,
    },
  ];

  const appointments = [
    {
      id: 'apt-1',
      patient: 'Ahsan Jamal',
      patientId: 'PT-2061',
      code: 'APT-0001',
      treatment: 'Hair Treatment',
      department: 'Hair Restoration',
      time: '09:00 AM',
      endTime: '09:45 AM',
      doctor: 'Dr. Sarah Malik',
      doctorSpecialty: 'Hair Specialist',
      clinic: 'Dubai Clinic',
      branchId: 'br-dubai',
      status: 'canceled',
      paymentStatus: 'refunded',
      date: daysFrom(today, -2),
      bookingDate: daysFrom(today, -6),
    },
    {
      id: 'apt-2',
      patient: 'Patient B',
      patientId: 'PT-2064',
      code: 'APT-1043',
      treatment: 'Dermatology Consultation',
      department: 'Dermatology',
      time: '11:00 AM',
      endTime: '11:45 AM',
      doctor: 'Dr. Ali Khan',
      doctorSpecialty: 'Dermatologist',
      clinic: 'Dubai Clinic',
      branchId: 'br-dubai',
      status: 'upcoming',
      paymentStatus: 'paid',
      date: daysFrom(today, 0),
      bookingDate: daysFrom(today, -3),
    },
    {
      id: 'apt-3',
      patient: 'Sara Ahmed',
      patientId: 'PT-2070',
      code: 'APT-0003',
      treatment: 'Laser Treatment',
      department: 'Laser',
      time: '09:00 AM',
      endTime: '09:45 AM',
      doctor: 'Dr. Nora Ahmed',
      doctorSpecialty: 'Laser Specialist',
      clinic: 'Riyadh Clinic',
      branchId: 'br-riyadh',
      status: 'completed',
      paymentStatus: 'paid',
      date: daysFrom(today, -3),
      bookingDate: daysFrom(today, -8),
    },
    {
      id: 'apt-3b',
      patient: 'Khalid Mansour',
      patientId: 'PT-2110',
      code: 'APT-0110',
      treatment: 'Laser Treatment',
      department: 'Laser',
      time: '10:00 AM',
      endTime: '10:45 AM',
      doctor: 'Dr. Nora Ahmed',
      doctorSpecialty: 'Laser Specialist',
      clinic: 'Riyadh Clinic',
      branchId: 'br-riyadh',
      status: 'upcoming',
      paymentStatus: 'paid',
      date: daysFrom(today, 0),
      bookingDate: daysFrom(today, -2),
    },
    {
      id: 'apt-3c',
      patient: 'Maha Alotaibi',
      patientId: 'PT-2111',
      code: 'APT-0111',
      treatment: 'Dermatology Consultation',
      department: 'Dermatology',
      time: '11:30 AM',
      endTime: '12:15 PM',
      doctor: 'Dr. Layla Hassan',
      doctorSpecialty: 'Dermatologist',
      clinic: 'Riyadh Clinic',
      branchId: 'br-riyadh',
      status: 'upcoming',
      paymentStatus: 'paid',
      date: daysFrom(today, 0),
      bookingDate: daysFrom(today, -1),
    },
    {
      id: 'apt-3d',
      patient: 'Noura Saleh',
      patientId: 'PT-2112',
      code: 'APT-0112',
      treatment: 'Hair Treatment',
      department: 'Hair Restoration',
      time: '01:00 PM',
      endTime: '01:45 PM',
      doctor: 'Dr. Yusuf Alharbi',
      doctorSpecialty: 'Hair Specialist',
      clinic: 'Riyadh Clinic',
      branchId: 'br-riyadh',
      status: 'completed',
      paymentStatus: 'paid',
      date: daysFrom(today, -1),
      bookingDate: daysFrom(today, -5),
    },
    {
      id: 'apt-3e',
      patient: 'Faisal Nasser',
      patientId: 'PT-2113',
      code: 'APT-0113',
      treatment: 'Hair Treatment',
      department: 'Hair Restoration',
      time: '03:00 PM',
      endTime: '03:45 PM',
      doctor: 'Dr. Yusuf Alharbi',
      doctorSpecialty: 'Hair Specialist',
      clinic: 'Riyadh Clinic',
      branchId: 'br-riyadh',
      status: 'upcoming',
      paymentStatus: 'pending',
      date: daysFrom(today, 1),
      bookingDate: daysFrom(today, -2),
    },
    {
      id: 'apt-3f',
      patient: 'Reem Abdullah',
      patientId: 'PT-2114',
      code: 'APT-0114',
      treatment: 'Dermatology Consultation',
      department: 'Dermatology',
      time: '04:00 PM',
      endTime: '04:45 PM',
      doctor: 'Dr. Layla Hassan',
      doctorSpecialty: 'Dermatologist',
      clinic: 'Riyadh Clinic',
      branchId: 'br-riyadh',
      status: 'canceled',
      paymentStatus: 'refunded',
      date: daysFrom(today, -2),
      bookingDate: daysFrom(today, -6),
    },
    {
      id: 'apt-4',
      patient: 'Ahsan Jamal',
      patientId: 'PT-2061',
      code: 'APT-0004',
      treatment: 'Hair Treatment',
      department: 'Hair Restoration',
      time: '10:30 AM',
      endTime: '11:15 AM',
      doctor: 'Dr. Sarah Malik',
      doctorSpecialty: 'Hair Specialist',
      clinic: 'Dubai Clinic',
      branchId: 'br-dubai',
      status: 'upcoming',
      paymentStatus: 'pending',
      date: daysFrom(today, 1),
      bookingDate: daysFrom(today, -4),
    },
    {
      id: 'apt-5',
      patient: 'Omar Khan',
      patientId: 'PT-2088',
      code: 'APT-0005',
      treatment: 'Dermatology Consultation',
      department: 'Dermatology',
      time: '11:00 AM',
      endTime: '11:45 AM',
      doctor: 'Dr. Ali Khan',
      doctorSpecialty: 'Dermatologist',
      clinic: 'Abu Dhabi Clinic',
      branchId: 'br-dubai',
      status: 'upcoming',
      paymentStatus: 'paid',
      date: daysFrom(today, 2),
      bookingDate: daysFrom(today, -1),
    },
    {
      id: 'apt-6',
      patient: 'Ahsan Jamal',
      patientId: 'PT-2061',
      code: 'APT-0006',
      treatment: 'Hair Treatment',
      department: 'Hair Restoration',
      time: '01:00 PM',
      endTime: '01:45 PM',
      doctor: 'Dr. Sarah Malik',
      doctorSpecialty: 'Hair Specialist',
      clinic: 'Dubai Clinic',
      branchId: 'br-dubai',
      status: 'completed',
      paymentStatus: 'paid',
      date: daysFrom(today, -8),
      bookingDate: daysFrom(today, -13),
    },
    {
      id: 'apt-7',
      patient: 'Lina Farooq',
      patientId: 'PT-2091',
      code: 'APT-0007',
      treatment: 'Dental Checkup',
      department: 'Dental',
      time: '02:30 PM',
      endTime: '03:15 PM',
      doctor: 'Dr. Hassan Reza',
      doctorSpecialty: 'Dentist',
      clinic: 'Muscat Clinic',
      branchId: 'br-muscat',
      status: 'completed',
      paymentStatus: 'paid',
      date: daysFrom(today, -7),
      bookingDate: daysFrom(today, -11),
    },
  ];

  const appointmentRequests = [
    {
      id: 'req-1',
      appointmentId: 'APT-1024',
      patient: 'Maaz',
      patientId: 'PT-2102',
      patientPhone: '+971 50 XXX XXXX',
      treatment: 'Laser Treatment',
      department: 'Laser',
      duration: '30 Min',
      treatmentPrice: 'AED 600',
      requestedDate: daysFrom(today, 1),
      requestedTime: '09:30 AM',
      doctor: 'Dr. Sarah Malik',
      doctorSpecialty: 'Laser Specialist',
      branchId: 'br-dubai',
      branch: 'Dubai Branch',
      paymentStatus: 'Not Paid',
      depositRequired: 'AED 100',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'Patient requested the earliest available morning slot.',
    },
    {
      id: 'req-riyadh-1',
      appointmentId: 'APT-2201',
      patient: 'Amina Al Saud',
      patientId: 'PT-2201',
      patientPhone: '+966 55 XXX XXXX',
      treatment: 'Laser Treatment',
      department: 'Laser',
      duration: '45 Min',
      treatmentPrice: 'SAR 750',
      requestedDate: daysFrom(today, 1),
      requestedTime: '10:00 AM',
      doctor: 'Dr. Nora Ahmed',
      doctorSpecialty: 'Laser Specialist',
      branchId: 'br-riyadh',
      branch: 'Riyadh Royal Clinic',
      paymentStatus: 'Not Paid',
      depositRequired: 'SAR 150',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'Patient prefers a morning laser slot for approval.',
    },
    {
      id: 'req-riyadh-2',
      appointmentId: 'APT-2202',
      patient: 'Hassan Almutairi',
      patientId: 'PT-2202',
      patientPhone: '+966 50 XXX XXXX',
      treatment: 'Hair Treatment',
      department: 'Hair Restoration',
      duration: '60 Min',
      treatmentPrice: 'SAR 900',
      requestedDate: daysFrom(today, 2),
      requestedTime: '02:30 PM',
      doctor: 'Dr. Yusuf Alharbi',
      doctorSpecialty: 'Hair Specialist',
      branchId: 'br-riyadh',
      branch: 'Riyadh Royal Clinic',
      paymentStatus: 'Not Paid',
      depositRequired: 'SAR 200',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'Needs clinic manager approval before deposit.',
    },
    {
      id: 'req-riyadh-3',
      appointmentId: 'APT-2203',
      patient: 'Sara Alqahtani',
      patientId: 'PT-2203',
      patientPhone: '+966 54 XXX XXXX',
      treatment: 'Dermatology Consultation',
      department: 'Dermatology',
      duration: '30 Min',
      treatmentPrice: 'SAR 400',
      requestedDate: daysFrom(today, 1),
      requestedTime: '04:00 PM',
      doctor: 'Dr. Layla Hassan',
      doctorSpecialty: 'Dermatologist',
      branchId: 'br-riyadh',
      branch: 'Riyadh Royal Clinic',
      paymentStatus: 'Not Paid',
      depositRequired: 'SAR 100',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'Follow-up consultation awaiting approval.',
    },
    {
      id: 'req-riyadh-4',
      appointmentId: 'APT-2204',
      patient: 'Omar Fahad',
      patientId: 'PT-2204',
      patientPhone: '+966 56 XXX XXXX',
      treatment: 'Laser Treatment',
      department: 'Laser',
      duration: '30 Min',
      treatmentPrice: 'SAR 650',
      requestedDate: daysFrom(today, -1),
      requestedTime: '11:00 AM',
      doctor: 'Dr. Nora Ahmed',
      doctorSpecialty: 'Laser Specialist',
      branchId: 'br-riyadh',
      branch: 'Riyadh Royal Clinic',
      paymentStatus: 'Paid',
      depositRequired: 'SAR 150',
      status: 'approved',
      requestedAt: daysFrom(today, -2),
      reviewedAt: daysFrom(today, -1),
      note: 'Approved by clinic manager.',
    },
    {
      id: 'req-riyadh-5',
      appointmentId: 'APT-2205',
      patient: 'Lina Alharbi',
      patientId: 'PT-2205',
      patientPhone: '+966 58 XXX XXXX',
      treatment: 'Hair Treatment',
      department: 'Hair Restoration',
      duration: '60 Min',
      treatmentPrice: 'SAR 900',
      requestedDate: daysFrom(today, 3),
      requestedTime: '01:00 PM',
      doctor: 'Dr. Yusuf Alharbi',
      doctorSpecialty: 'Hair Specialist',
      branchId: 'br-riyadh',
      branch: 'Riyadh Royal Clinic',
      paymentStatus: 'Not Paid',
      depositRequired: 'SAR 200',
      status: 'rescheduled',
      requestedAt: daysFrom(today, -3),
      reviewedAt: daysFrom(today, -1),
      note: 'Patient asked for a later afternoon slot.',
    },
  ];

  const quotaPeriod = today.slice(0, 7);
  const treatmentQuotas = [
    {
      id: 'laser-treatment',
      name: 'Laser Treatment',
      period: quotaPeriod,
      quota: 124,
    },
    {
      id: 'hair-treatment',
      name: 'Hair Treatment',
      period: quotaPeriod,
      quota: 100,
    },
    {
      id: 'dermatology-consultation',
      name: 'Dermatology Consultation',
      period: quotaPeriod,
      quota: 80,
    },
  ];

  const attention = [
    {
      id: 'att-1',
      title: 'Refund Spike Detected',
      time: '5 hr ago',
      body: 'Dubai Branch: 18 refunds requested (~3.8× normal pace).',
      type: 'refund',
      branchId: 'br-dubai',
    },
    {
      id: 'att-2',
      title: 'Booking Drop Detected',
      time: '5 hr ago',
      body: 'New York Branch booking volume fell below the alert threshold.',
      type: 'booking',
      branchId: 'br-nyc',
    },
    {
      id: 'att-3',
      title: '3 Approvals Pending',
      time: '5 hr ago',
      body: 'Clinic manager account requests requiring regional admin review.',
      type: 'accountRequests',
      branchId: null,
    },
  ];

  function countByStatus(list, status) {
    return list.filter((a) => a.status === status).length;
  }

  function pctChange(current, previous) {
    if (!previous) return current ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  function appointmentStats() {
    const todayCount = appointments.filter((a) => a.date === today).length;
    const upcoming = countByStatus(appointments, 'upcoming');
    const completed = countByStatus(appointments, 'completed');
    const canceled = countByStatus(appointments, 'canceled');
    return [
      {
        id: 'today',
        icon: 'calendar-outline',
        value: String(todayCount).padStart(2, '0'),
        label: "Today's Appointments",
        change: pctChange(todayCount, Math.max(1, todayCount - 1)),
      },
      {
        id: 'upcoming',
        icon: 'calendar-outline',
        value: String(upcoming).padStart(2, '0'),
        label: 'Upcoming',
        change: pctChange(upcoming, Math.max(1, upcoming + 2)),
      },
      {
        id: 'completed',
        icon: 'calendar-outline',
        value: String(completed).padStart(2, '0'),
        label: 'Completed visits',
        change: pctChange(completed, Math.max(1, completed + 1)),
      },
      {
        id: 'canceled',
        icon: 'calendar-outline',
        value: String(canceled).padStart(2, '0'),
        label: 'Canceled bookings',
        change: pctChange(canceled, Math.max(1, canceled - 1)),
      },
    ];
  }

  function scopedAppointments(branchId) {
    return appointments.filter((appointment) => appointment.branchId === branchId);
  }

  function scopedAppointmentStats(branchId) {
    const items = scopedAppointments(branchId);
    const todayCount = items.filter((a) => a.date === today).length;
    const upcoming = countByStatus(items, 'upcoming');
    const completed = countByStatus(items, 'completed');
    const canceled = countByStatus(items, 'canceled');
    return [
      {
        id: 'today',
        icon: 'calendar-outline',
        value: String(todayCount).padStart(2, '0'),
        label: "Today's Appointments",
        change: 0,
      },
      {
        id: 'upcoming',
        icon: 'time-outline',
        value: String(upcoming).padStart(2, '0'),
        label: 'Upcoming Appointments',
        change: 0,
      },
      {
        id: 'completed',
        icon: 'checkmark-circle-outline',
        value: String(completed).padStart(2, '0'),
        label: 'Completed Visits',
        change: 0,
      },
      {
        id: 'canceled',
        icon: 'close-circle-outline',
        value: String(canceled).padStart(2, '0'),
        label: 'Canceled Bookings',
        change: 0,
      },
    ];
  }

  function homeStats() {
    const appt = appointmentStats();
    return [
      {
        id: 'appointments',
        icon: 'calendar-outline',
        value: appt[0].value,
        label: "Today's Appointments",
      },
      {
        id: 'upcoming',
        icon: 'time-outline',
        value: appt[1].value,
        label: 'Upcoming Appointments',
      },
      {
        id: 'canceled',
        icon: 'document-text-outline',
        value: appt[3].value,
        label: 'Canceled Approvals',
      },
      {
        id: 'alerts',
        icon: 'notifications-outline',
        value: String(attention.length).padStart(2, '0'),
        label: 'Clinic Alerts',
      },
    ];
  }

  function branchById(id) {
    return branches.find((b) => b.id === id) || null;
  }

  function enrichBranch(branch) {
    if (!branch) return null;
    const nearLimit = (branch.progress || 0) >= 75;
    const branchAppts = appointments.filter((a) => a.branchId === branch.id);
    return {
      ...branch,
      stats: [
        {
          id: 'today',
          icon: 'calendar-outline',
          value: String(branch.bookingsToday ?? 0).padStart(2, '0'),
          label: "Today's Appointments",
          change: branch.growth,
        },
        {
          id: 'upcoming',
          icon: 'time-outline',
          value: String(countByStatus(branchAppts, 'upcoming')).padStart(2, '0'),
          label: 'Upcoming',
          change: -8.2,
        },
        {
          id: 'completed',
          icon: 'checkmark-circle-outline',
          value: String(countByStatus(branchAppts, 'completed')).padStart(2, '0'),
          label: 'Completed Visits',
          change: -3.2,
        },
        {
          id: 'canceled',
          icon: 'close-circle-outline',
          value: String(countByStatus(branchAppts, 'canceled')).padStart(2, '0'),
          label: 'Canceled Bookings',
          change: 10.2,
        },
      ],
      capacity: Math.round(branch.progress || 0),
      capacityNote:
        branch.capacityNote ||
        'Capacity should use the ERC-defined measure, such as available appointment slots.',
      thresholds: [
        {
          id: 'capacity',
          icon: 'trending-up-outline',
          title: 'Capacity Threshold',
          status: nearLimit ? 'Near Limit' : 'Normal',
          tone: nearLimit ? 'warn' : 'ok',
          body: nearLimit
            ? 'Branch utilisation is approaching its configured capacity limit.'
            : 'Branch utilisation is within the configured capacity limit.',
        },
        {
          id: 'revenue',
          icon: 'ellipse-outline',
          title: 'Revenue Threshold',
          status: 'Normal',
          tone: 'ok',
          body: 'No revenue threshold alert currently shown.',
        },
      ],
      alerts: attention.filter((a) => a.branchId === branch.id),
    };
  }

  function enrichManager(manager) {
    if (!manager) return null;
    const branch = branchById(manager.branchId);
    return {
      ...manager,
      clinic: branch
        ? {
            id: branch.id,
            name: branch.name,
            city: branch.city,
            region: branch.region,
            address: branch.address,
          }
        : null,
    };
  }

  function managerStats() {
    const total = managers.length;
    const active = managers.filter((m) => m.status === 'active').length;
    const invited = managers.filter((m) => m.status === 'invited').length;
    const inactive = managers.filter((m) => m.status === 'inactive').length;
    return {
      total,
      active,
      invited,
      inactive,
      cards: [
        { id: 'total', label: 'Total', value: String(total).padStart(2, '0'), sub: 'All Clinics' },
        {
          id: 'active',
          label: 'Active',
          value: String(active).padStart(2, '0'),
          sub: total ? `${Math.round((active / total) * 100)}% Of Total` : '0%',
        },
        {
          id: 'pending',
          label: 'Pending',
          value: String(invited).padStart(2, '0'),
          sub: total ? `${Math.round((invited / total) * 100)}% Of Total` : '0%',
        },
      ],
    };
  }

  function getDashboard() {
    const leaderboard = [...branches]
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5)
      .map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        value: b.bookings,
        quota: Math.round(b.progress),
        progress: Math.min(1, (b.progress || 0) / 100),
        city: b.city,
        region: b.region,
      }));

    return {
      stats: homeStats(),
      attention,
      branches: leaderboard,
      doctors: doctors.map((d) => ({
        ...d,
        clinic: branchById(d.branchId)?.name || null,
      })),
      managerPreview: managers.filter((m) => m.status === 'active').slice(0, 3).map(enrichManager),
    };
  }

  function getManagerDashboard(branchId) {
    const branch = enrichBranch(branchById(branchId));
    if (!branch) return null;
    const branchAppointments = scopedAppointments(branchId);
    const branchDoctors = doctors
      .filter((doctor) => doctor.branchId === branchId)
      .map((doctor) => ({ ...doctor, clinic: branch.name }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    const period = today.slice(0, 7);
    const treatments = [...new Set(branchAppointments.map((item) => item.treatment))]
      .map((name) => {
        const quota = treatmentQuotas.find((item) => item.name === name && item.period === period);
        const sessions = branchAppointments.filter((item) => item.treatment === name).length;
        const target = quota?.quota || 0;
        return {
          id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name,
          period,
          sessions,
          quota: target,
          progress: target ? Math.min(1, sessions / target) : 0,
          remaining: Math.max(0, target - sessions),
          quotaConfigured: Boolean(quota),
        };
      })
      .sort((a, b) => b.sessions - a.sessions);
    const branchRequests = appointmentRequests.filter((request) => request.branchId === branchId);
    const pendingRequests = branchRequests.filter((request) => request.status === 'pending');
    const branchManagers = managers.filter((manager) => manager.branchId === branchId);

    return {
      clinic: {
        id: branch.id,
        name: branch.name,
        city: branch.city,
        region: branch.region,
        address: branch.address,
        status: branch.status,
      },
      stats: scopedAppointmentStats(branchId),
      appointments: branchAppointments.slice(0, 5),
      appointmentRequests: pendingRequests,
      pendingApprovals: pendingRequests.length,
      doctors: branchDoctors,
      treatments,
      doctorsOnRoster: branchDoctors.length,
      managers: branchManagers.map(enrichManager),
      alerts: branch.alerts,
    };
  }

  return {
    getDashboard,
    listAppointments() {
      return { stats: appointmentStats(), items: appointments };
    },
    getAppointment(id) {
      return appointments.find((a) => a.id === id || a.code === id) || null;
    },
    getManagerDashboard,
    listManagerAppointments(branchId) {
      const items = scopedAppointments(branchId);
      return { stats: scopedAppointmentStats(branchId), items };
    },
    getManagerAppointment(id, branchId) {
      return (
        scopedAppointments(branchId).find((a) => a.id === id || a.code === id) || null
      );
    },
    listManagerAppointmentRequests(branchId) {
      const items = appointmentRequests
        .filter((request) => request.branchId === branchId)
        .map((request) => ({
          ...request,
          status: String(request.status || 'pending').toLowerCase(),
          requestedTime: request.requestedTime || 'Time pending',
          requestedDate: request.requestedDate || today,
        }))
        .sort((a, b) => {
          const dateCmp = String(a.requestedDate).localeCompare(String(b.requestedDate));
          if (dateCmp !== 0) return dateCmp;
          return String(a.requestedTime).localeCompare(String(b.requestedTime));
        });

      const counts = { all: items.length, pending: 0, approved: 0, rescheduled: 0, rejected: 0 };
      for (const item of items) {
        if (counts[item.status] != null) counts[item.status] += 1;
      }

      return { items, counts };
    },
    getManagerAppointmentRequest(id, branchId) {
      return appointmentRequests.find(
        (request) => request.id === id && request.branchId === branchId
      ) || null;
    },
    updateManagerAppointmentRequest(id, branchId, update) {
      const request = appointmentRequests.find(
        (item) => item.id === id && item.branchId === branchId
      );
      if (!request) return null;
      Object.assign(request, update);
      if (update.status) {
        request.status = String(update.status).toLowerCase();
      }
      return { ...request };
    },
    listManagerDoctors(branchId) {
      const clinic = branchById(branchId);
      return {
        items: doctors
          .filter((doctor) => doctor.branchId === branchId)
          .map((doctor) => ({ ...doctor, clinic: clinic?.name || null })),
      };
    },
    listManagerTreatments(branchId) {
      const items = scopedAppointments(branchId);
      const grouped = new Map();
      for (const appointment of items) {
        const current = grouped.get(appointment.treatment) || {
          id: appointment.treatment.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: appointment.treatment,
          department: appointment.department,
          appointments: 0,
        };
        current.appointments += 1;
        grouped.set(appointment.treatment, current);
      }
      return { items: [...grouped.values()] };
    },
    listBranches() {
      return { items: branches };
    },
    getBranch(id) {
      return enrichBranch(branchById(id));
    },
    listManagers() {
      return {
        stats: managerStats(),
        items: managers.map(enrichManager),
      };
    },
    getManager(id) {
      return enrichManager(managers.find((m) => m.id === id || m.employeeId === id));
    },
  };
}

module.exports = { createClinicStore };
