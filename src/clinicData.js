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

  /** Filled after TREATMENT_CATEGORIES — 2 doctors per category per branch. */
  const doctors = [];

  const managers = [
    {
      id: 'mgr-ksa',
      name: 'Ahmed Al-Faisal',
      email: 'ahmed.ksa@erc-demo.com',
      phone: '+966 55 100 2001',
      role: 'Clinic Manager',
      status: 'active',
      branchId: 'br-riyadh',
      employeeId: 'CM-2001',
      joinedAt: '2024-01-15',
      patientsThisMonth: 278,
      appointmentsToday: 22,
      staffCount: 11,
      rating: 4.7,
    },
    {
      id: 'mgr-dubai',
      name: 'Omar Hassan',
      email: 'omar.dubai@erc-demo.com',
      phone: '+971 50 100 2002',
      role: 'Clinic Manager',
      status: 'active',
      branchId: 'br-dubai',
      employeeId: 'CM-2002',
      joinedAt: '2024-02-10',
      patientsThisMonth: 312,
      appointmentsToday: 28,
      staffCount: 14,
      rating: 4.8,
    },
    {
      id: 'mgr-oman',
      name: 'Khalid Al-Balushi',
      email: 'khalid.oman@erc-demo.com',
      phone: '+968 92 100 2003',
      role: 'Clinic Manager',
      status: 'active',
      branchId: 'br-muscat',
      employeeId: 'CM-2003',
      joinedAt: '2024-03-22',
      patientsThisMonth: 190,
      appointmentsToday: 16,
      staffCount: 9,
      rating: 4.6,
    },
    {
      id: 'mgr-usa',
      name: 'James Anderson',
      email: 'james.usa@erc-demo.com',
      phone: '+1 212 555 2004',
      role: 'Clinic Manager',
      status: 'active',
      branchId: 'br-nyc',
      employeeId: 'CM-2004',
      joinedAt: '2024-04-05',
      patientsThisMonth: 164,
      appointmentsToday: 14,
      staffCount: 8,
      rating: 4.5,
    },
    {
      id: 'mgr-pk',
      name: 'Hamza Khan',
      email: 'hamza.pk@erc-demo.com',
      phone: '+92 300 555 2005',
      role: 'Clinic Manager',
      status: 'active',
      branchId: 'br-lahore',
      employeeId: 'CM-2005',
      joinedAt: '2024-05-18',
      patientsThisMonth: 210,
      appointmentsToday: 18,
      staffCount: 10,
      rating: 4.6,
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
      doctorId: 'doc-2',
      doctorSpecialty: 'Hair Specialist',
      branchId: 'br-dubai',
      branch: 'Dubai Branch',
      paymentStatus: 'Not Paid',
      depositRequired: 'AED 100',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'Patient requested the earliest available morning slot.',
    },
    {
      id: 'req-dubai-2',
      appointmentId: 'APT-1025',
      patient: 'Maaz',
      patientId: 'PT-2102',
      patientPhone: '+971 50 XXX XXXX',
      treatment: 'Laser Treatment',
      department: 'Laser',
      duration: '30 Min',
      treatmentPrice: 'AED 600',
      requestedDate: daysFrom(today, 2),
      requestedTime: '09:30 AM',
      doctor: 'Dr. Sarah Malik',
      doctorId: 'doc-2',
      doctorSpecialty: 'Hair Specialist',
      branchId: 'br-dubai',
      branch: 'Dubai Branch',
      paymentStatus: 'Not Paid',
      depositRequired: 'AED 100',
      status: 'approved',
      requestedAt: daysFrom(today, -1),
      note: 'Confirmed morning slot.',
    },
    {
      id: 'req-dubai-3',
      appointmentId: 'APT-1026',
      patient: 'Maaz',
      patientId: 'PT-2102',
      patientPhone: '+971 50 XXX XXXX',
      treatment: 'Laser Treatment',
      department: 'Laser',
      duration: '45 Min',
      treatmentPrice: 'AED 650',
      requestedDate: daysFrom(today, 3),
      requestedTime: '09:30 AM',
      doctor: 'Dr. Sarah Malik',
      doctorId: 'doc-2',
      doctorSpecialty: 'Hair Specialist',
      branchId: 'br-dubai',
      branch: 'Dubai Branch',
      paymentStatus: 'Not Paid',
      depositRequired: 'AED 100',
      status: 'approved',
      requestedAt: daysFrom(today, -1),
      note: 'Follow-up laser session.',
    },
    {
      id: 'req-dubai-4',
      appointmentId: 'APT-1027',
      patient: 'Maaz',
      patientId: 'PT-2102',
      patientPhone: '+971 50 XXX XXXX',
      treatment: 'Laser Treatment',
      department: 'Laser',
      duration: '30 Min',
      treatmentPrice: 'AED 600',
      requestedDate: daysFrom(today, 1),
      requestedTime: '11:00 AM',
      doctor: 'Dr. Ali Khan',
      doctorId: 'doc-1',
      doctorSpecialty: 'Dermatologist',
      branchId: 'br-dubai',
      branch: 'Dubai Branch',
      paymentStatus: 'Not Paid',
      depositRequired: 'AED 100',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'Dermatology consult pending approval.',
    },
    {
      id: 'req-dubai-5',
      appointmentId: 'APT-1028',
      patient: 'Sara Ali',
      patientId: 'PT-2105',
      patientPhone: '+971 50 XXX XXXX',
      treatment: 'Hair Treatment',
      department: 'Hair',
      duration: '60 Min',
      treatmentPrice: 'AED 800',
      requestedDate: daysFrom(today, 4),
      requestedTime: '02:00 PM',
      doctor: 'Dr. Sarah Malik',
      doctorId: 'doc-2',
      doctorSpecialty: 'Hair Specialist',
      branchId: 'br-dubai',
      branch: 'Dubai Branch',
      paymentStatus: 'Not Paid',
      depositRequired: 'AED 150',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'Hair treatment request.',
    },
    {
      id: 'req-dubai-6',
      appointmentId: 'APT-1029',
      patient: 'Omar Khan',
      patientId: 'PT-2108',
      patientPhone: '+971 55 XXX XXXX',
      treatment: 'Laser Treatment',
      department: 'Laser',
      duration: '30 Min',
      treatmentPrice: 'AED 600',
      requestedDate: daysFrom(today, 5),
      requestedTime: '04:00 PM',
      doctor: 'Dr. Sarah Malik',
      doctorId: 'doc-2',
      doctorSpecialty: 'Hair Specialist',
      branchId: 'br-dubai',
      branch: 'Dubai Branch',
      paymentStatus: 'Paid',
      depositRequired: 'AED 100',
      status: 'approved',
      requestedAt: daysFrom(today, -2),
      note: 'Deposit paid and approved.',
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
      doctorId: 'doc-3',
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
      doctorId: 'doc-3c',
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
      doctorId: 'doc-3b',
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
      doctorId: 'doc-3',
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
    {
      id: 'req-muscat-1',
      appointmentId: 'APT-3301',
      patient: 'Fatima Al Lawati',
      patientId: 'PT-3301',
      patientPhone: '+968 92 XXX XXXX',
      treatment: 'Dental Cleaning',
      department: 'Dental',
      duration: '40 Min',
      treatmentPrice: 'OMR 45',
      requestedDate: daysFrom(today, 1),
      requestedTime: '11:00 AM',
      doctor: 'Dr. Hassan Reza',
      doctorId: 'doc-4',
      doctorSpecialty: 'Dentist',
      branchId: 'br-muscat',
      branch: 'Muscat Royal Clinic',
      paymentStatus: 'Not Paid',
      depositRequired: 'OMR 10',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'Pending clinic manager approval.',
    },
    {
      id: 'req-nyc-1',
      appointmentId: 'APT-4401',
      patient: 'Sophia Martinez',
      patientId: 'PT-4401',
      patientPhone: '+1 212 XXX XXXX',
      treatment: 'Laser Treatment',
      department: 'Laser',
      duration: '45 Min',
      treatmentPrice: 'USD 220',
      requestedDate: daysFrom(today, 1),
      requestedTime: '10:30 AM',
      doctor: 'Dr. Michael Brooks',
      doctorId: 'doc-nyc-2',
      doctorSpecialty: 'Laser Specialist',
      branchId: 'br-nyc',
      branch: 'New York Royal Clinic',
      paymentStatus: 'Not Paid',
      depositRequired: 'USD 50',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'New patient laser request.',
    },
    {
      id: 'req-nyc-2',
      appointmentId: 'APT-4402',
      patient: 'Daniel Reed',
      patientId: 'PT-4402',
      patientPhone: '+1 917 XXX XXXX',
      treatment: 'Dermatology Consultation',
      department: 'Dermatology',
      duration: '30 Min',
      treatmentPrice: 'USD 180',
      requestedDate: daysFrom(today, 2),
      requestedTime: '02:00 PM',
      doctor: 'Dr. Emily Carter',
      doctorId: 'doc-nyc-1',
      doctorSpecialty: 'Dermatologist',
      branchId: 'br-nyc',
      branch: 'New York Royal Clinic',
      paymentStatus: 'Not Paid',
      depositRequired: 'USD 40',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'Consultation awaiting approval.',
    },
    {
      id: 'req-lahore-1',
      appointmentId: 'APT-5501',
      patient: 'Sana Iqbal',
      patientId: 'PT-5501',
      patientPhone: '+92 300 XXX XXXX',
      treatment: 'Hair Treatment',
      department: 'Hair Restoration',
      duration: '60 Min',
      treatmentPrice: 'PKR 18,000',
      requestedDate: daysFrom(today, 1),
      requestedTime: '12:00 PM',
      doctor: 'Dr. Bilal Ahmed',
      doctorId: 'doc-pk-2',
      doctorSpecialty: 'Hair Specialist',
      branchId: 'br-lahore',
      branch: 'Lahore Royal Clinic',
      paymentStatus: 'Not Paid',
      depositRequired: 'PKR 3,000',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'Hair treatment pending approval.',
    },
    {
      id: 'req-lahore-2',
      appointmentId: 'APT-5502',
      patient: 'Usman Raza',
      patientId: 'PT-5502',
      patientPhone: '+92 321 XXX XXXX',
      treatment: 'Dermatology Consultation',
      department: 'Dermatology',
      duration: '30 Min',
      treatmentPrice: 'PKR 6,500',
      requestedDate: daysFrom(today, 2),
      requestedTime: '03:30 PM',
      doctor: 'Dr. Ayesha Malik',
      doctorId: 'doc-pk-1',
      doctorSpecialty: 'Dermatologist',
      branchId: 'br-lahore',
      branch: 'Lahore Royal Clinic',
      paymentStatus: 'Not Paid',
      depositRequired: 'PKR 1,500',
      status: 'pending',
      requestedAt: daysFrom(today, 0),
      note: 'Dermatology consult request.',
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

  /** Clinic-manager Treatments catalog (region currency + category chips). */
  const TREATMENT_CATEGORIES = [
    'Plastic Surgery',
    'Cosmetic Injectables',
    'Laser Treatments',
    'Skincare',
    'Dermatologists',
    'Hair Transplant',
    'Dental Treatments',
    'Weight Loss',
    'Gynecology',
    'Regenerative',
    'Physiotherapist',
    'Home Healthcare',
    'Intimate Surgery',
  ];

  /** Specialty + display names — 2 doctors seeded per category on every branch. */
  const CATEGORY_DOCTOR_PROFILES = [
    {
      category: 'Plastic Surgery',
      specialty: 'Plastic Surgeon',
      names: ['Dr. Omar Rashid', 'Dr. Hana Farouk'],
    },
    {
      category: 'Cosmetic Injectables',
      specialty: 'Injectables Specialist',
      names: ['Dr. Maya Quinn', 'Dr. Felix Navarro'],
    },
    {
      category: 'Laser Treatments',
      specialty: 'Laser Specialist',
      names: ['Dr. Nora Ahmed', 'Dr. Adam Keller'],
    },
    {
      category: 'Skincare',
      specialty: 'Skincare Specialist',
      names: ['Dr. Lina Costa', 'Dr. Priya Shah'],
    },
    {
      category: 'Dermatologists',
      specialty: 'Dermatologist',
      names: ['Dr. Layla Hassan', 'Dr. Ali Khan'],
    },
    {
      category: 'Hair Transplant',
      specialty: 'Hair Specialist',
      names: ['Dr. Yusuf Alharbi', 'Dr. Sarah Malik'],
    },
    {
      category: 'Dental Treatments',
      specialty: 'Dentist',
      names: ['Dr. Hassan Reza', 'Dr. Elena Rossi'],
    },
    {
      category: 'Weight Loss',
      specialty: 'Weight Loss Specialist',
      names: ['Dr. Samir Nabil', 'Dr. Claire Bennett'],
    },
    {
      category: 'Gynecology',
      specialty: 'Gynecologist',
      names: ['Dr. Amira Saleh', 'Dr. Nadine Brooks'],
    },
    {
      category: 'Regenerative',
      specialty: 'Regenerative Specialist',
      names: ['Dr. Victor Lang', 'Dr. Iman Qureshi'],
    },
    {
      category: 'Physiotherapist',
      specialty: 'Physiotherapist',
      names: ['Dr. Tom Hughes', 'Dr. Sofia Mendes'],
    },
    {
      category: 'Home Healthcare',
      specialty: 'Home Care Specialist',
      names: ['Dr. Grace Miller', 'Dr. Ravi Patel'],
    },
    {
      category: 'Intimate Surgery',
      specialty: 'Intimate Surgery Specialist',
      names: ['Dr. Camille Dubois', 'Dr. Julian Hart'],
    },
  ];

  const BRANCH_CONTACT = {
    'br-dubai': { phone: '+971 50', emailDomain: 'dubai' },
    'br-riyadh': { phone: '+966 55', emailDomain: 'riyadh' },
    'br-muscat': { phone: '+968 92', emailDomain: 'muscat' },
    'br-nyc': { phone: '+1 212', emailDomain: 'nyc' },
    'br-lahore': { phone: '+92 300', emailDomain: 'lahore' },
  };

  function categorySlug(category) {
    return String(category || 'general')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function seedTreatmentCategoryDoctors() {
    doctors.length = 0;
    let phoneSeq = 2200;
    branches.forEach((branch) => {
      const contact = BRANCH_CONTACT[branch.id] || { phone: '+971 50', emailDomain: branch.city || 'clinic' };
      CATEGORY_DOCTOR_PROFILES.forEach((profile) => {
        profile.names.forEach((name, index) => {
          phoneSeq += 1;
          const slug = categorySlug(profile.category);
          const emailName = String(name)
            .replace(/^dr\.?\s+/i, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '.');
          doctors.push({
            id: `doc-${branch.id.replace(/^br-/, '')}-${slug}-${index + 1}`,
            name,
            specialty: profile.specialty,
            specialtyCategory: profile.category,
            photo: null,
            photoKey: 'treatmentdoctor',
            imageKey: 'treatmentdoctor',
            status: 'active',
            contact: {
              phone: `${contact.phone} ${String(phoneSeq).slice(-3)} ${String(1000 + index).slice(-4)}`,
              email: `${emailName}.${contact.emailDomain}@enfieldroyal.com`,
            },
            availability: 'Available',
            schedule: {
              start: index === 0 ? '09:00 AM' : '10:00 AM',
              end: index === 0 ? '05:00 PM' : '06:00 PM',
            },
            weeklySchedule: null,
            consults: 24 + index * 7 + (slug.length % 5),
            score: 86 + index * 3,
            branchId: branch.id,
            joinedAt: '2024-03-15',
          });
        });
      });
    });
  }

  seedTreatmentCategoryDoctors();

  const REGION_CURRENCY = {
    UAE: 'AED',
    KSA: 'SAR',
    Oman: 'OMR',
    Pakistan: 'PKR',
    USA: 'USD',
  };

  const treatmentCatalog = [
    { id: 'tx-laser-hair', name: 'Laser Hair Removal', category: 'Laser Treatments', durationMin: 30, basePrice: 500, status: 'active' },
    { id: 'tx-laser-skin', name: 'Laser Skin Resurfacing', category: 'Laser Treatments', durationMin: 45, basePrice: 750, status: 'active' },
    { id: 'tx-laser-pigment', name: 'Pigmentation Laser', category: 'Laser Treatments', durationMin: 40, basePrice: 650, status: 'active' },
    { id: 'tx-botox', name: 'Botox Session', category: 'Cosmetic Injectables', durationMin: 25, basePrice: 900, status: 'active' },
    { id: 'tx-filler', name: 'Dermal Fillers', category: 'Cosmetic Injectables', durationMin: 35, basePrice: 1200, status: 'active' },
    { id: 'tx-rhino', name: 'Rhinoplasty Consult', category: 'Plastic Surgery', durationMin: 60, basePrice: 1500, status: 'active' },
    { id: 'tx-lipo', name: 'Liposuction Review', category: 'Plastic Surgery', durationMin: 50, basePrice: 1800, status: 'active' },
    { id: 'tx-facial', name: 'Hydra Facial', category: 'Skincare', durationMin: 40, basePrice: 350, status: 'active' },
    { id: 'tx-peel', name: 'Chemical Peel', category: 'Skincare', durationMin: 30, basePrice: 280, status: 'active' },
    { id: 'tx-derm-consult', name: 'Dermatology Consultation', category: 'Dermatologists', durationMin: 30, basePrice: 400, status: 'active' },
    { id: 'tx-acne', name: 'Acne Treatment Plan', category: 'Dermatologists', durationMin: 35, basePrice: 450, status: 'active' },
    { id: 'tx-hair-fuse', name: 'Hair Transplant Session', category: 'Hair Transplant', durationMin: 120, basePrice: 4500, status: 'active' },
    { id: 'tx-prp-hair', name: 'PRP Hair Therapy', category: 'Hair Transplant', durationMin: 45, basePrice: 800, status: 'active' },
    { id: 'tx-dental-clean', name: 'Dental Cleaning', category: 'Dental Treatments', durationMin: 40, basePrice: 300, status: 'active' },
    { id: 'tx-whitening', name: 'Teeth Whitening', category: 'Dental Treatments', durationMin: 50, basePrice: 550, status: 'active' },
    { id: 'tx-weight', name: 'Weight Loss Program', category: 'Weight Loss', durationMin: 45, basePrice: 600, status: 'active' },
    { id: 'tx-gyn', name: 'Gynecology Consult', category: 'Gynecology', durationMin: 30, basePrice: 420, status: 'active' },
    { id: 'tx-stem', name: 'Stem Cell Therapy', category: 'Regenerative', durationMin: 60, basePrice: 2200, status: 'active' },
    { id: 'tx-physio', name: 'Physiotherapy Session', category: 'Physiotherapist', durationMin: 45, basePrice: 250, status: 'active' },
    { id: 'tx-home', name: 'Home Care Visit', category: 'Home Healthcare', durationMin: 60, basePrice: 320, status: 'active' },
    { id: 'tx-intimate', name: 'Intimate Surgery Consult', category: 'Intimate Surgery', durationMin: 40, basePrice: 1100, status: 'active' },
  ];

  /** Manager-created treatments (branch-scoped, absolute price). */
  const customTreatments = [];
  /** Soft-deleted treatment ids per branch (`branchId:treatmentId`). */
  const deletedTreatmentKeys = new Set();

  function treatmentDeleteKey(branchId, id) {
    return `${branchId}:${id}`;
  }

  function regionPriceFactor(region) {
    if (region === 'KSA') return 1.05;
    if (region === 'Oman') return 0.1;
    if (region === 'Pakistan') return 75;
    if (region === 'USA') return 0.27;
    return 1;
  }

  function normalizeRegionKey(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'UAE';
    if (raw.includes('ksa') || raw.includes('saudi')) return 'KSA';
    if (raw.includes('oman') || raw === 'om') return 'Oman';
    if (raw.includes('pakistan') || raw === 'pk') return 'Pakistan';
    if (raw.includes('usa') || raw.includes('united states') || raw === 'us') return 'USA';
    if (raw.includes('uae') || raw.includes('emirates') || raw.includes('dubai')) return 'UAE';
    return (
      Object.keys(REGION_CURRENCY).find((key) => key.toLowerCase() === raw) || 'UAE'
    );
  }

  function matchTreatmentCatalog(needle) {
    const text = String(needle || '').trim().toLowerCase();
    if (!text) return treatmentCatalog[0];
    return (
      treatmentCatalog.find((row) => String(row.name).toLowerCase() === text) ||
      treatmentCatalog.find((row) => text.includes(String(row.name).toLowerCase())) ||
      treatmentCatalog.find((row) => String(row.name).toLowerCase().includes(text)) ||
      treatmentCatalog.find((row) => {
        const category = String(row.category || '').toLowerCase();
        return (
          category === text ||
          category.includes(text) ||
          text.includes(category) ||
          text.includes(category.split(' ')[0])
        );
      }) ||
      treatmentCatalog[0]
    );
  }

  function localizePatientAppointment(apt, branch, catalog) {
    const region = normalizeRegionKey(branch?.region || apt.region || 'UAE');
    const currency = REGION_CURRENCY[region] || 'AED';
    const matched = matchTreatmentCatalog(apt.treatment || apt.category || catalog?.category);
    const basePrice = Number(apt.basePrice != null ? apt.basePrice : matched?.basePrice) || 500;
    const price =
      apt.price != null && Number.isFinite(Number(apt.price)) && apt.currency === currency
        ? Number(apt.price)
        : Math.round(basePrice * regionPriceFactor(region));
    const unit = apt.unit || apt.session || 'Per Session';
    const durationMin = apt.durationMinutes || matched?.durationMin || parseDurationMinutes(apt.duration) || 30;
    return {
      treatment: matched?.name || apt.treatment || catalog?.category || 'Treatment',
      department: apt.department || matched?.category || 'Clinic',
      duration: apt.duration || `${durationMin} Minutes`,
      durationMinutes: durationMin,
      basePrice,
      price,
      currency,
      unit,
      priceLabel: `${currency} ${Number(price).toLocaleString('en-US')} ${unit}`,
      region,
    };
  }

  function parseDurationMinutes(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.round(value));
    const raw = String(value || '').trim();
    const match = raw.match(/(\d+)/);
    return match ? Math.max(1, Number(match[1])) : 30;
  }

  function parseSessionCount(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.round(value));
    const match = String(value || '').match(/(\d+)/);
    return match ? Math.max(1, Number(match[1])) : 12;
  }

  function departmentShortLabel(category) {
    const raw = String(category || 'Treatment').trim();
    return raw.split(/\s+/)[0] || 'Treatment';
  }

  const MAX_TREATMENT_DOCTORS = 8;

  function doctorMatchesCategory(doctor, category) {
    if (!doctor || !category) return false;
    const cat = String(category).trim().toLowerCase();
    if (String(doctor.specialtyCategory || '').trim().toLowerCase() === cat) return true;
    const needle = cat.replace(/treatments?/g, '').trim();
    const first = needle.split(/\s+/)[0] || needle;
    const hay = `${doctor.specialty || ''} ${doctor.specialtyCategory || ''} ${doctor.name || ''}`.toLowerCase();
    if (first && hay.includes(first)) return true;
    if (needle.includes('dermatolog') && hay.includes('dermatolog')) return true;
    if (needle.includes('hair') && hay.includes('hair')) return true;
    if (needle.includes('dental') && (hay.includes('dental') || hay.includes('dentist'))) return true;
    if (needle.includes('physio') && hay.includes('physio')) return true;
    if (needle.includes('inject') && hay.includes('inject')) return true;
    if (needle.includes('plastic') && hay.includes('plastic')) return true;
    if (needle.includes('skincare') && hay.includes('skincare')) return true;
    if (needle.includes('weight') && hay.includes('weight')) return true;
    if (needle.includes('gynecol') && hay.includes('gynecol')) return true;
    if (needle.includes('regenerat') && hay.includes('regenerat')) return true;
    if (needle.includes('home') && hay.includes('home')) return true;
    if (needle.includes('intimate') && hay.includes('intimate')) return true;
    if (needle.includes('laser') && hay.includes('laser')) return true;
    return false;
  }

  function categoryDoctorIdsForBranch(branchId, category) {
    return doctors
      .filter(
        (doctor) =>
          doctor.branchId === branchId &&
          doctor.status !== 'inactive' &&
          doctorMatchesCategory(doctor, category)
      )
      .map((doctor) => doctor.id);
  }

  function treatmentsProvidedByDoctor(doctor, branchId) {
    if (!doctor?.id) return [];
    const isDeleted = (id) => deletedTreatmentKeys.has(treatmentDeleteKey(branchId, id));
    const rows = [
      ...customTreatments.filter(
        (treatment) => treatment.branchId === branchId && !isDeleted(treatment.id)
      ),
      ...treatmentCatalog.filter((treatment) => !isDeleted(treatment.id)),
    ];
    const byId = [];
    const bySpecialty = [];
    for (const treatment of rows) {
      const summary = {
        id: treatment.id,
        name: treatment.name,
        category: treatment.category || treatment.department || '',
        department: treatment.department || treatment.category || '',
        departmentLabel: departmentShortLabel(treatment.department || treatment.category),
        duration: treatment.duration || null,
        durationMin: treatment.durationMin || parseDurationMinutes(treatment.duration),
      };
      const assigned =
        Array.isArray(treatment.doctorIds) &&
        treatment.doctorIds.map(String).includes(String(doctor.id));
      if (assigned) {
        byId.push(summary);
        continue;
      }
      if (doctorMatchesCategory(doctor, treatment.category || treatment.department)) {
        bySpecialty.push(summary);
      }
    }

    const picked = byId.length ? byId : bySpecialty;
    const seen = new Set();
    return picked.filter((row) => {
      const key = String(row.id || row.name).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }

  function doctorsForTreatment(branchId, category, doctorIds = null) {
    const clinic = branchById(branchId);
    const specialtyFallback = departmentShortLabel(category);
    const branchDocs = doctors.filter(
      (doctor) => doctor.branchId === branchId && doctor.status !== 'inactive'
    );
    const byId = new Map(doctors.map((doctor) => [doctor.id, doctor]));
    const ordered = [];
    const seen = new Set();

    const preferredIds = Array.isArray(doctorIds)
      ? doctorIds.map((id) => String(id)).filter(Boolean)
      : [];
    for (const id of preferredIds) {
      const doctor = byId.get(id);
      if (!doctor || doctor.status === 'inactive' || seen.has(doctor.id)) continue;
      seen.add(doctor.id);
      ordered.push(doctor);
      if (ordered.length >= MAX_TREATMENT_DOCTORS) break;
    }

    // Auto-fill with every doctor that matches this treatment category
    if (!preferredIds.length) {
      const matched = branchDocs.filter((doctor) => doctorMatchesCategory(doctor, category));
      for (const doctor of matched) {
        if (seen.has(doctor.id)) continue;
        seen.add(doctor.id);
        ordered.push(doctor);
        if (ordered.length >= MAX_TREATMENT_DOCTORS) break;
      }
    }

    return ordered.slice(0, MAX_TREATMENT_DOCTORS).map((doctor) => ({
      ...doctor,
      clinic: clinic?.name || null,
      branchName: clinic?.name || null,
      branch: clinic?.name || null,
      specialtyLabel: doctor.specialty || `${specialtyFallback} Treatment`,
      photo: doctor.photo || doctor.photoUrl || doctor.imageUri || null,
      photoKey: doctor.photoKey || doctor.imageKey || null,
      treatments: treatmentsProvidedByDoctor(doctor, branchId),
    }));
  }

  function formatTreatmentItem(treatment, branchId) {
    const branch = branchById(branchId);
    const region = branch?.region || treatment.region || 'UAE';
    const currency = treatment.currency || REGION_CURRENCY[region] || 'AED';
    const durationMin = treatment.durationMin || parseDurationMinutes(treatment.duration);
    const category = treatment.category || treatment.department || 'Skincare';
    const department = treatment.department || treatment.category || 'Skincare';
    const sessions = treatment.sessions != null
      ? parseSessionCount(treatment.sessions)
      : parseSessionCount(treatment.sessionCount || treatment.session);
    const explicitIds = Array.isArray(treatment.doctorIds)
      ? treatment.doctorIds.map((id) => String(id)).filter(Boolean)
      : [];
    const doctorIds = explicitIds.length
      ? explicitIds
      : categoryDoctorIdsForBranch(branchId, category).slice(0, MAX_TREATMENT_DOCTORS);
    const price =
      treatment.price != null
        ? Number(treatment.price)
        : Math.round((treatment.basePrice || 0) * regionPriceFactor(region));
    return {
      id: treatment.id,
      name: treatment.name,
      description: treatment.description || '',
      category,
      department,
      departmentLabel: departmentShortLabel(department || category),
      departmentTitle: `${departmentShortLabel(department || category)} Department`,
      durationMin,
      duration: treatment.duration || `${durationMin} Minutes`,
      durationLabel: `${durationMin} min`,
      price,
      currency,
      priceLabel: `${currency} ${Number(price).toLocaleString('en-US')}`,
      unit: treatment.unit || treatment.session || 'Per Session',
      session: treatment.session || treatment.unit || 'Per Session',
      sessions,
      status: treatment.status || 'active',
      branchId,
      region,
      imageKey: treatment.imageKey || 'treatmentimage',
      imageUri: treatment.imageUri || null,
      createdAt: treatment.createdAt || null,
      custom: Boolean(treatment.custom),
      doctorIds,
      doctors: doctorsForTreatment(branchId, category, doctorIds),
    };
  }

  const attention = [
    {
      id: 'att-1',
      title: 'Refund Spike Detected',
      time: '5 hr ago',
      clock: '10:52 AM',
      body: 'Dubai Branch: 18 refunds requested (~3.8× normal pace).',
      detail: 'Reviewed by Admin for unusual refund pace.',
      type: 'refund',
      status: 'acknowledged',
      branchId: 'br-dubai',
      branchName: 'Dubai Branch',
    },
    {
      id: 'att-2',
      title: 'Booking Drop Detected',
      time: '5 hr ago',
      clock: '09:18 AM',
      body: 'New York Branch booking volume fell below the alert threshold.',
      detail: 'Booking volume fell below the configured alert threshold.',
      type: 'booking',
      status: 'unread',
      branchId: 'br-nyc',
      branchName: 'New York Branch',
    },
    {
      id: 'att-3',
      title: '3 Approvals Pending',
      time: '5 hr ago',
      clock: '08:40 AM',
      body: 'Clinic manager account requests requiring regional admin review.',
      detail: 'New manager account awaiting approval.',
      type: 'accountRequests',
      status: 'action',
      branchId: null,
      branchName: 'Regional',
    },
  ];

  const managerAlertsSeed = [
    {
      id: 'malert-1',
      title: 'Refund Spike',
      clock: '10:52 AM',
      time: 'Today',
      body: 'Unusual refund pace detected at this branch.',
      detail: '18 refunds requested (~3.8× normal pace).',
      type: 'refund',
      status: 'unread',
      actionNeeded: true,
      resolvedAction: null,
      investigation: {
        headline: 'Refund Spike',
        subtitle: 'Unusual Refund Spike activity detected',
        metricLabel: 'Refund Spike',
        metricValue: 18,
        paceLabel: 'Normal pace',
        paceValue: '3.8x',
        statusLabel: 'Needs Investigation',
        performance: {
          normalLabel: 'Normal Refunds',
          normal: 5,
          currentLabel: 'Current Refunds',
          current: 18,
          changeLabel: 'Increase',
          change: '+260%',
        },
        related: ['Recent refund requests', 'Recent booking activity'],
      },
      requestDetail: {
        kind: 'refund',
        code: 'RF-1048',
        label: 'Booking Re-schedule',
        status: 'Pending',
        submittedAt: '08 Oct 2026 - 10:30 AM',
        rescheduleDate: '12/03/26',
        rescheduleTime: '09:30 AM',
        originalDate: '10/03/26',
        originalTime: '10:30 AM',
        patientName: 'Maaz',
        bookingReference: 'APT-1024 · Laser Treatment · Dr. Sarah Malik',
        paymentMethod: 'Card · TXN-88421',
        activity: [
          {
            id: 'a1',
            title: 'Date request submitted',
            subtitle: '08 Oct 2026 - 10:30 AM · Clinic Manager',
            state: 'done',
          },
          {
            id: 'a2',
            title: 'Awaiting Regional Admin decision',
            subtitle: 'Pending authorisation',
            state: 'pending',
          },
        ],
      },
    },
    {
      id: 'malert-2',
      title: 'Booking Drop',
      clock: '10:32 AM',
      time: 'Today',
      body: 'Unusual Booking Drop activity detected',
      detail: 'Investigate schedule and staffing coverage.',
      type: 'booking',
      status: 'unread',
      actionNeeded: true,
      resolvedAction: null,
      investigation: {
        headline: 'Booking Drop',
        subtitle: 'Unusual Booking Drop activity detected',
        metricLabel: 'Booking Drop',
        metricValue: 18,
        paceLabel: 'Normal pace',
        paceValue: '3.8x',
        statusLabel: 'Needs Investigation',
        performance: {
          normalLabel: 'Normal Booking',
          normal: 5,
          currentLabel: 'Current Booking',
          current: 18,
          changeLabel: 'Increase',
          change: '+260%',
        },
        related: ['Recent Booking requests', 'Recent booking activity'],
      },
      requestDetail: {
        kind: 'reschedule',
        code: 'RF-1048',
        label: 'Booking Re schedule',
        status: 'Pending',
        submittedAt: '06 Oct 2026 - 10:30 AM',
        rescheduleDate: '12/03/26',
        rescheduleTime: '09:30 AM',
        originalDate: '10/03/26',
        originalTime: '10:30 AM',
        patientName: 'Maaz',
        bookingReference: 'APT-1024 · Laser Treatment · Dr. Sarah Malik',
        paymentMethod: 'Card · TXN-88421',
        activity: [
          {
            id: 'a1',
            title: 'Date request submitted',
            subtitle: '06 Oct 2026 - 10:30 AM · Clinic Manager',
            state: 'done',
          },
          {
            id: 'a2',
            title: 'Awaiting Regional Admin decision',
            subtitle: 'Pending authorisation',
            state: 'pending',
          },
        ],
      },
    },
    {
      id: 'malert-3',
      title: 'Clinic Manager Request',
      clock: '08:40 AM',
      time: 'Today',
      body: 'Bookings increased by 21%. New appointment request awaiting approval.',
      detail: 'Review the incoming appointment request.',
      type: 'accountRequests',
      status: 'action',
      actionNeeded: true,
      primaryAction: 'Review Request',
      requestId: 'req-1',
      resolvedAction: null,
    },
    {
      id: 'malert-4',
      title: 'Capacity Near Limit',
      clock: 'Yesterday',
      time: 'Yesterday',
      body: 'Branch utilisation is approaching its configured capacity limit.',
      detail: 'Consider opening extra slots this week.',
      type: 'capacity',
      status: 'read',
      actionNeeded: false,
      resolvedAction: null,
    },
  ];

  /** Doctor → manager schedule / leave requests (mutable for approve/decline). */
  const doctorScheduleRequests = [];

  const patientsCatalog = [
    {
      id: 'PT-2848',
      name: 'Ayesha Khan',
      category: 'Laser Treatment',
      consults: 12,
      phone: '+971 50 XXX XXXX',
      email: 'ayesha@royalclinic.com',
      dateOfBirth: '11/11/1995',
      status: 'Registered Patient',
    },
    {
      id: 'PT-3001',
      name: 'Maaz Don',
      category: 'Hair Transplant',
      consults: 42,
      phone: '+971 55 XXX XXXX',
      email: 'maaz@royalclinic.com',
      dateOfBirth: '04/12/1990',
      status: 'Registered Patient',
    },
    {
      id: 'PT-3002',
      name: 'Sataish',
      category: 'Laser Treatment',
      consults: 28,
      phone: '+971 52 XXX XXXX',
      email: 'sataish@royalclinic.com',
      dateOfBirth: '08/03/1992',
      status: 'Registered Patient',
    },
    {
      id: 'PT-3003',
      name: 'Dleep',
      category: 'Acne',
      consults: 16,
      phone: '+971 54 XXX XXXX',
      email: 'dleep@royalclinic.com',
      dateOfBirth: '01/15/1988',
      status: 'Registered Patient',
    },
    {
      id: 'PT-3004',
      name: 'Rajinder',
      category: 'Mummy Makeover',
      consults: 11,
      phone: '+971 56 XXX XXXX',
      email: 'rajinder@royalclinic.com',
      dateOfBirth: '09/20/1985',
      status: 'Registered Patient',
    },
    {
      id: 'PT-3005',
      name: 'Ahsan Jamal',
      category: 'Hair Transplant',
      consults: 36,
      phone: '+971 50 XXX 2061',
      email: 'ahsan@royalclinic.com',
      dateOfBirth: '02/28/1987',
      status: 'Registered Patient',
    },
    {
      id: 'PT-3006',
      name: 'Sara Ahmed',
      category: 'Laser Treatment',
      consults: 22,
      phone: '+971 55 XXX 2070',
      email: 'sara@royalclinic.com',
      dateOfBirth: '07/07/1993',
      status: 'Registered Patient',
    },
    {
      id: 'PT-3007',
      name: 'Nora Malik',
      category: 'Acne',
      consults: 9,
      phone: '+971 52 XXX XXXX',
      email: 'nora@royalclinic.com',
      dateOfBirth: '03/11/1996',
      status: 'Registered Patient',
    },
    {
      id: 'PT-3008',
      name: 'Khalid Mansour',
      category: 'Laser Treatment',
      consults: 18,
      phone: '+971 54 XXX 2110',
      email: 'khalid@royalclinic.com',
      dateOfBirth: '12/01/1989',
      status: 'Registered Patient',
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
      doctors: doctors
        .filter((d) => d.status !== 'inactive')
        .map((d) => {
          const branch = branchById(d.branchId);
          return {
            ...d,
            clinic: branch
              ? { id: branch.id, name: branch.name, city: branch.city, region: branch.region }
              : d.clinic || null,
            branchName: branch?.name || null,
            branch: branch?.name || null,
          };
        })
        .sort(
          (a, b) =>
            Number(b.consults || 0) - Number(a.consults || 0) ||
            String(a.name || '').localeCompare(String(b.name || ''))
        ),
      managerPreview: managers.filter((m) => m.status === 'active').map(enrichManager),
      appointmentRequests: appointmentRequests.map((request) => ({
        ...request,
        status: String(request.status || 'pending').toLowerCase(),
        requestedTime: request.requestedTime || 'Time pending',
        requestedDate: request.requestedDate || today,
        branch: branchById(request.branchId)?.name || request.branch || null,
      })),
    };
  }

  function getManagerDashboard(branchId) {
    const branch = enrichBranch(branchById(branchId));
    if (!branch) return null;
    const branchAppointments = scopedAppointments(branchId);
    let branchDoctors = doctors
      .filter((doctor) => doctor.branchId === branchId && doctor.status !== 'inactive')
      .map((doctor) => ({ ...doctor, clinic: branch.name }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    // New / empty clinics still get a paint-ready roster so manager home is never blank.
    if (!branchDoctors.length) {
      branchDoctors = [
        {
          id: `${branchId}-doc-1`,
          name: 'Dr. Assigned Specialist',
          specialty: 'Dermatologist',
          consults: 24,
          score: 88,
          clinic: branch.name,
          status: 'active',
          branchId,
        },
        {
          id: `${branchId}-doc-2`,
          name: 'Dr. Clinic Lead',
          specialty: 'Laser Specialist',
          consults: 20,
          score: 86,
          clinic: branch.name,
          status: 'active',
          branchId,
        },
      ];
    }

    const period = today.slice(0, 7);
    const treatmentNames = [
      ...new Set([
        ...branchAppointments.map((item) => item.treatment).filter(Boolean),
        ...treatmentQuotas.filter((item) => item.period === period).map((item) => item.name),
        'Laser Treatment',
        'Hair Treatment',
        'Dermatology Consultation',
      ]),
    ];
    const treatments = treatmentNames
      .map((name) => {
        const quota = treatmentQuotas.find((item) => item.name === name && item.period === period);
        const sessions = branchAppointments.filter((item) => item.treatment === name).length;
        const target = quota?.quota || (sessions ? Math.max(sessions * 8, 40) : 80);
        return {
          id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name,
          period,
          sessions,
          quota: target,
          progress: target ? Math.min(1, sessions / target) : 0,
          remaining: Math.max(0, target - sessions),
          quotaConfigured: true,
        };
      })
      .sort((a, b) => b.sessions - a.sessions);
    const branchRequests = appointmentRequests.filter((request) => request.branchId === branchId);
    let pendingRequests = branchRequests.filter((request) => request.status === 'pending');

    if (!pendingRequests.length) {
      pendingRequests = [
        {
          id: `req-${branchId}-seed-1`,
          appointmentId: `APT-${branchId}-1`,
          patient: 'New Patient',
          treatment: 'Laser Treatment',
          requestedDate: today,
          requestedTime: '10:00 AM',
          doctor: branchDoctors[0]?.name || 'Assigned Doctor',
          doctorId: branchDoctors[0]?.id || null,
          branchId,
          branch: branch.name,
          status: 'pending',
        },
        {
          id: `req-${branchId}-seed-2`,
          appointmentId: `APT-${branchId}-2`,
          patient: 'Follow-up Patient',
          treatment: 'Dermatology Consultation',
          requestedDate: today,
          requestedTime: '02:30 PM',
          doctor: branchDoctors[1]?.name || branchDoctors[0]?.name || 'Assigned Doctor',
          doctorId: branchDoctors[1]?.id || branchDoctors[0]?.id || null,
          branchId,
          branch: branch.name,
          status: 'pending',
        },
      ];
    }

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
      const items = scopedAppointments(branchId).map((apt) => {
        const doctor =
          doctors.find(
            (row) =>
              row.branchId === branchId &&
              (row.id === apt.doctorId ||
                String(row.name || '').toLowerCase() === String(apt.doctor || '').toLowerCase())
          ) || null;
        return {
          ...apt,
          scheduleDate: apt.scheduleDate || doctor?.scheduleDate || doctor?.schedule?.date || null,
          doctorScheduleDate: doctor?.scheduleDate || doctor?.schedule?.date || null,
        };
      });
      return { stats: scopedAppointmentStats(branchId), items };
    },
    getManagerAppointment(id, branchId) {
      const items = this.listManagerAppointments(branchId).items || [];
      return items.find((a) => a.id === id || a.code === id) || null;
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
      return {
        items: doctors
          .filter((doctor) => doctor.branchId === branchId && doctor.status !== 'inactive')
          .map((doctor) => this.formatManagerDoctor(doctor, branchId)),
      };
    },
    buildManagerPatientDetail(branchId, patientId, seed = null, regionOverride = null) {
      const branch = branchById(branchId);
      const region = normalizeRegionKey(regionOverride || branch?.region || 'UAE');
      const currency = REGION_CURRENCY[region] || 'AED';
      const regionBranch = {
        ...branch,
        region,
        name: branch?.name || branch?.city || `${region} Clinic`,
        city: branch?.city || region,
      };
      const scoped = scopedAppointments(branchId);
      const catalog = patientsCatalog.find((row) => String(row.id) === String(patientId)) || seed;
      const byName = catalog?.name ? String(catalog.name).toLowerCase() : '';
      const defaultTx = matchTreatmentCatalog(catalog?.category || catalog?.treatment);

      let appointments = scoped.filter(
        (apt) =>
          String(apt.patientId || '') === String(patientId) ||
          (byName && String(apt.patient || '').toLowerCase() === byName)
      );

      // Demo appointments so Patient Detail always has testable Upcoming / Completed cards.
      if (!appointments.length && catalog) {
        appointments = [
          {
            id: `${patientId}-up-1`,
            code: 'APT-UP-01',
            patient: catalog.name,
            patientId,
            treatment: defaultTx?.name || catalog.category || 'Laser Hair Removal',
            department: defaultTx?.category || 'Laser',
            duration: `${defaultTx?.durationMin || 30} Minutes`,
            basePrice: defaultTx?.basePrice || 500,
            status: 'upcoming',
            date: daysFrom(today, 2),
            time: '09:30 AM',
            doctor: 'Dr. Sarah Malik',
            branchId,
          },
          {
            id: `${patientId}-up-2`,
            code: 'APT-UP-02',
            patient: catalog.name,
            patientId,
            treatment: defaultTx?.name || catalog.category || 'Laser Hair Removal',
            department: defaultTx?.category || 'Laser',
            duration: `${defaultTx?.durationMin || 30} Minutes`,
            basePrice: defaultTx?.basePrice || 500,
            status: 'upcoming',
            date: daysFrom(today, 5),
            time: '11:00 AM',
            doctor: 'Dr. Ali Khan',
            branchId,
          },
          {
            id: `${patientId}-done-1`,
            code: 'APT-DN-01',
            patient: catalog.name,
            patientId,
            treatment: defaultTx?.name || catalog.category || 'Laser Hair Removal',
            department: defaultTx?.category || 'Laser',
            duration: `${defaultTx?.durationMin || 30} Minutes`,
            basePrice: defaultTx?.basePrice || 500,
            status: 'completed',
            date: daysFrom(today, -7),
            time: '10:00 AM',
            doctor: 'Dr. Sarah Malik',
            branchId,
          },
          {
            id: `${patientId}-done-2`,
            code: 'APT-DN-02',
            patient: catalog.name,
            patientId,
            treatment: defaultTx?.name || catalog.category || 'Laser Hair Removal',
            department: defaultTx?.category || 'Laser',
            duration: `${defaultTx?.durationMin || 30} Minutes`,
            basePrice: defaultTx?.basePrice || 500,
            status: 'completed',
            date: daysFrom(today, -14),
            time: '02:00 PM',
            doctor: 'Dr. Ali Khan',
            branchId,
          },
          {
            id: `${patientId}-done-3`,
            code: 'APT-DN-03',
            patient: catalog.name,
            patientId,
            treatment: defaultTx?.name || catalog.category || 'Laser Hair Removal',
            department: defaultTx?.category || 'Laser',
            duration: `${defaultTx?.durationMin || 30} Minutes`,
            basePrice: defaultTx?.basePrice || 500,
            status: 'completed',
            date: daysFrom(today, -21),
            time: '04:00 PM',
            doctor: 'Dr. Sarah Malik',
            branchId,
          },
        ];
      }

      const mapped = appointments.map((apt) => {
        const localized = localizePatientAppointment(apt, regionBranch, catalog);
        const dateValue = apt.date || null;
        const parsedDate = dateValue ? new Date(`${dateValue}T00:00:00`) : null;
        const dayLabel =
          parsedDate && !Number.isNaN(parsedDate.getTime())
            ? parsedDate.toLocaleDateString('en-US', { weekday: 'long' })
            : null;
        return {
          id: apt.id,
          code: apt.code || apt.id,
          treatment: localized.treatment,
          department: localized.department,
          duration: localized.duration,
          durationMinutes: localized.durationMinutes,
          basePrice: localized.basePrice,
          price: localized.price,
          currency: localized.currency,
          unit: localized.unit,
          priceLabel: localized.priceLabel,
          region: localized.region,
          status: String(apt.status || 'upcoming').toLowerCase(),
          date: dateValue,
          day: dayLabel,
          dayLabel,
          time: apt.time || null,
          doctor: apt.doctor || null,
          doctorSpecialty: apt.doctorSpecialty || localized.department || 'Specialist',
          patient: apt.patient || catalog?.name || 'Patient',
          patientId: apt.patientId || catalog?.id || patientId,
          clinic: apt.clinic || regionBranch.name,
          branch: apt.branch || regionBranch.name,
          contactLabel: apt.contactLabel || catalog?.phone || 'View if permission allows',
          bookingDate: apt.bookingDate || apt.date || null,
          paymentStatus:
            apt.paymentStatus ||
            (String(apt.status).toLowerCase() === 'completed' ? 'paid' : 'pending'),
          title: apt.title || null,
        };
      });

      const upcoming = mapped.filter((apt) => apt.status === 'upcoming');
      const completed = mapped.filter((apt) => apt.status === 'completed');
      const total = mapped.length || Number(catalog?.consults) || 0;

      return {
        id: catalog?.id || patientId,
        name: catalog?.name || 'Patient',
        category: catalog?.category || 'General',
        treatment: defaultTx?.name || catalog?.category || 'Treatment',
        status: catalog?.status || 'Registered Patient',
        phone: catalog?.phone || '+971 50 XXX XXXX',
        email: catalog?.email || 'patient@royalclinic.com',
        dateOfBirth: catalog?.dateOfBirth || '11/11/1995',
        branchId,
        branchName: regionBranch.name,
        region,
        currency,
        photo: catalog?.photo || null,
        consults: Number(catalog?.consults) || total,
        stats: {
          total: total || Number(catalog?.consults) || 0,
          completed: completed.length,
          upcoming: upcoming.length,
        },
        upcoming,
        completed,
      };
    },
    listManagerPatients(branchId) {
      const branch = branchById(branchId);
      const scoped = scopedAppointments(branchId);
      const byId = new Map();

      for (const row of patientsCatalog) {
        byId.set(row.id, {
          ...row,
          branchId,
          branchName: branch?.name || null,
          treatment: row.category,
        });
      }

      for (const apt of scoped) {
        const id = apt.patientId || `PT-${apt.id}`;
        const prev = byId.get(id);
        byId.set(id, {
          id,
          name: apt.patient || prev?.name || 'Patient',
          category: apt.treatment || apt.department || prev?.category || 'General',
          treatment: apt.treatment || prev?.treatment || 'Treatment',
          consults: (prev?.consults || 0) + 1,
          phone: prev?.phone || '+971 50 XXX XXXX',
          email: prev?.email || 'patient@royalclinic.com',
          dateOfBirth: prev?.dateOfBirth || '11/11/1995',
          status: prev?.status || 'Registered Patient',
          branchId,
          branchName: branch?.name || apt.clinic || null,
          lastVisit: apt.date || null,
          doctor: apt.doctor || null,
        });
      }

      const items = Array.from(byId.values()).sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
      const categories = [
        'All',
        ...Array.from(new Set(items.map((item) => item.category).filter(Boolean))),
      ];

      return {
        categories,
        currency: REGION_CURRENCY[branch?.region] || 'AED',
        region: branch?.region || null,
        branch: branch
          ? { id: branch.id, name: branch.name, city: branch.city, region: branch.region }
          : null,
        items,
      };
    },
    getManagerPatient(branchId, patientId, regionOverride = null) {
      const listed = this.listManagerPatients(branchId).items || [];
      const seed = listed.find((row) => String(row.id) === String(patientId)) || null;
      if (!seed && !patientsCatalog.find((row) => String(row.id) === String(patientId))) {
        return null;
      }
      return this.buildManagerPatientDetail(branchId, patientId, seed, regionOverride);
    },
    hydrateManagerAlert(alert, branchId) {
      const branch = branchById(branchId);
      const branchName = branch?.name || 'Assigned Branch';
      const region = branch?.region || null;
      const regionLabel = region ? `${branchName}, ${region}` : branchName;
      const pendingRequest = appointmentRequests.find(
        (request) => request.branchId === branchId && String(request.status).toLowerCase() === 'pending'
      );
      const requestDetail = alert.requestDetail
        ? {
            ...alert.requestDetail,
            branchName,
            region,
            regionLabel,
            patientName: alert.requestDetail.patientName || pendingRequest?.patient || 'Maaz',
            bookingReference:
              alert.requestDetail.bookingReference ||
              (pendingRequest
                ? `${pendingRequest.appointmentId || pendingRequest.id} · ${pendingRequest.treatment} · ${pendingRequest.doctor}`
                : 'APT-1024 · Laser Treatment · Dr. Sarah Malik'),
            paymentMethod: alert.requestDetail.paymentMethod || 'Card · TXN-88421',
            activity: alert.requestDetail.activity || [
              {
                id: 'a1',
                title: 'Date request submitted',
                subtitle: `${alert.requestDetail.submittedAt || 'Today'} · Clinic Manager`,
                state: 'done',
              },
              {
                id: 'a2',
                title: 'Awaiting Regional Admin decision',
                subtitle: 'Pending authorisation',
                state: 'pending',
              },
            ],
          }
        : null;
      return {
        ...alert,
        branchId,
        branchName,
        region,
        regionLabel,
        detectedLabel: `${alert.time || 'Today'}, ${alert.clock || ''}`.trim(),
        investigation: alert.investigation
          ? {
              ...alert.investigation,
              branchName,
              region,
            }
          : null,
        requestDetail,
        requestId:
          alert.primaryAction === 'Review Request'
            ? pendingRequest?.id || alert.requestId || null
            : alert.requestId || null,
      };
    },
    listManagerAlerts(branchId) {
      const branch = branchById(branchId);
      const items = managerAlertsSeed
        .filter((alert) => {
          // Doctor schedule/leave requests must reach every clinic manager in realtime.
          if (alert.type === 'doctor_schedule') return true;
          return !alert.targetBranchId || alert.targetBranchId === branchId;
        })
        .map((alert) => this.hydrateManagerAlert(alert, branchId));
      const unread = items.filter((item) => item.status === 'unread').length;
      const actionNeeded = items.filter((item) => item.actionNeeded).length;
      return {
        stats: {
          all: items.length,
          unread,
          actionNeeded,
        },
        filters: ['All', 'Unread', 'Action Required'],
        region: branch?.region || null,
        branch: branch
          ? { id: branch.id, name: branch.name, city: branch.city, region: branch.region }
          : null,
        items,
      };
    },
    getManagerAlert(branchId, id) {
      const alert = managerAlertsSeed.find((item) => item.id === id);
      if (!alert) return null;
      return this.hydrateManagerAlert(alert, branchId);
    },
    updateManagerAlert(branchId, id, input = {}) {
      const alert = managerAlertsSeed.find((item) => item.id === id);
      if (!alert) return null;

      const action = String(input.action || '').toLowerCase();
      if (action === 'investigate') {
        alert.status = 'acknowledged';
        alert.actionNeeded = true;
        alert.resolvedAction = 'investigate';
        alert.body = alert.body || alert.detail || 'Alert marked for investigation.';
        // Keep mock status copy so Investigate screen matches design while testing.
        if (alert.investigation && !alert.investigation.statusLabel) {
          alert.investigation = {
            ...alert.investigation,
            statusLabel: 'Needs Investigation',
          };
        }
      } else if (action === 'decline' || action === 'decline_reschedule') {
        alert.status = 'declined';
        alert.actionNeeded = false;
        alert.resolvedAction = 'decline';
        alert.primaryAction = null;
        alert.decision = {
          action: 'decline',
          preferTime: input.preferTime || null,
          reason: input.reason || null,
          decidedAt: new Date().toISOString(),
        };
        if (alert.requestDetail) {
          alert.requestDetail = { ...alert.requestDetail, status: 'Declined' };
        }
        if (alert.type === 'doctor_schedule' && alert.scheduleRequestId) {
          this.resolveDoctorScheduleRequest(alert.scheduleRequestId, 'declined', input);
        }
      } else if (action === 'approve_reschedule' || action === 'approve') {
        alert.status = 'reviewed';
        alert.actionNeeded = false;
        alert.resolvedAction = 'approve';
        alert.primaryAction = null;
        alert.decision = {
          action: 'approve',
          decidedAt: new Date().toISOString(),
        };
        if (alert.requestDetail) {
          alert.requestDetail = { ...alert.requestDetail, status: 'Approved' };
        }
        if (alert.type === 'doctor_schedule' && alert.scheduleRequestId) {
          this.resolveDoctorScheduleRequest(alert.scheduleRequestId, 'approved', input);
        }
      } else if (action === 'review') {
        alert.status = 'reviewed';
        alert.actionNeeded = false;
        alert.resolvedAction = 'review';
        alert.primaryAction = null;
      } else {
        if (input.status) alert.status = String(input.status).toLowerCase();
        if (typeof input.actionNeeded === 'boolean') alert.actionNeeded = input.actionNeeded;
        if (input.resolvedAction != null) alert.resolvedAction = input.resolvedAction;
        if (input.primaryAction === null) alert.primaryAction = null;
      }

      alert.updatedAt = new Date().toISOString();
      return this.hydrateManagerAlert(alert, branchId);
    },
    buildDefaultWeeklySchedule(schedule) {
      const start = schedule?.start || '09:00 AM';
      const end = schedule?.end || '05:00 PM';
      const keys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      return keys.reduce((acc, key, index) => {
        acc[key] = {
          enabled: index < 5,
          start,
          end,
        };
        return acc;
      }, {});
    },
    formatManagerDoctor(doctor, branchId) {
      const clinic = branchById(branchId || doctor?.branchId);
      if (!doctor) return null;
      const clinicInfo = clinic
        ? { id: clinic.id, name: clinic.name, city: clinic.city, region: clinic.region }
        : null;
      const weeklySchedule =
        doctor.weeklySchedule && typeof doctor.weeklySchedule === 'object'
          ? doctor.weeklySchedule
          : this.buildDefaultWeeklySchedule(doctor.schedule);
      const weekdayKeys = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const todayKey = weekdayKeys[new Date().getDay()];
      const todayHours = weeklySchedule[todayKey]?.enabled
        ? weeklySchedule[todayKey]
        : null;
      const schedule = {
        start: todayHours?.start || doctor.schedule?.start || '09:00 AM',
        end: todayHours?.end || doctor.schedule?.end || '05:00 PM',
        date: doctor.schedule?.date || doctor.scheduleDate || null,
      };
      const workingDays = [
        { key: 'monday', label: 'Monday' },
        { key: 'tuesday', label: 'Tuesday' },
        { key: 'wednesday', label: 'Wednesday' },
        { key: 'thursday', label: 'Thursday' },
        { key: 'friday', label: 'Friday' },
        { key: 'saturday', label: 'Saturday' },
        { key: 'sunday', label: 'Sunday' },
      ]
        .filter((day) => weeklySchedule[day.key]?.enabled)
        .map((day) => ({
          key: day.key,
          label: day.label,
          start: weeklySchedule[day.key].start,
          end: weeklySchedule[day.key].end,
        }));
      const todayAppointments = appointments
        .filter(
          (apt) =>
            apt.date === today &&
            (apt.doctorId === doctor.id ||
              String(apt.doctor || '').toLowerCase() === String(doctor.name || '').toLowerCase())
        )
        .map((apt) => ({
          id: apt.id,
          treatment: apt.treatment || 'Consultation',
          time: apt.time || schedule.start,
          status: apt.status || 'upcoming',
          patient: apt.patient || 'Patient',
        }));
      const treatments = treatmentsProvidedByDoctor(doctor, clinic?.id || branchId);
      return {
        ...doctor,
        clinic: clinicInfo,
        branchName: clinic?.name || doctor.branchName || null,
        branch: clinic?.name || doctor.branch || null,
        schedule,
        weeklySchedule,
        workingDays,
        todayHours: todayHours
          ? { start: todayHours.start, end: todayHours.end, working: true }
          : { start: null, end: null, working: false },
        todayAppointments,
        treatments,
        treatmentList: treatments,
        availability: doctor.availability || (todayHours ? 'Available' : 'Unavailable'),
      };
    },
    getDoctor(id) {
      const doctor = doctors.find((item) => item.id === id || item.code === id);
      return this.formatManagerDoctor(doctor, doctor?.branchId);
    },
    getAppointmentRequest(id) {
      const request = appointmentRequests.find((item) => item.id === id);
      if (!request) return null;
      return {
        ...request,
        status: String(request.status || 'pending').toLowerCase(),
        requestedTime: request.requestedTime || 'Time pending',
        requestedDate: request.requestedDate || today,
        branch: branchById(request.branchId)?.name || request.branch || null,
      };
    },
    getManagerDoctor(id, branchId) {
      const doctor =
        doctors.find((item) => item.id === id && item.branchId === branchId) ||
        doctors.find((item) => item.id === id);
      if (!doctor) return null;
      if (branchId && doctor.branchId && doctor.branchId !== branchId) return null;
      return this.formatManagerDoctor(doctor, doctor.branchId || branchId);
    },
    createManagerDoctor(branchId, input) {
      const clinic = branchById(branchId);
      if (!clinic) return null;
      const scheduleDate =
        input.scheduleDate || input.schedule?.date || new Date().toISOString().slice(0, 10);
      const schedule = {
        ...(input.schedule || { start: '09:00 AM', end: '05:00 PM' }),
        date: scheduleDate,
      };
      const doctor = {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: input.name,
        specialty: input.specialty,
        photo: input.photo || null,
        status: input.status || 'active',
        contact: input.contact || { phone: '', email: '' },
        availability: input.availability || 'Available',
        schedule,
        scheduleDate,
        weeklySchedule: input.weeklySchedule || null,
        consults: 0,
        score: 0,
        branchId,
      };
      doctors.push(doctor);
      return this.formatManagerDoctor(doctor, branchId);
    },
    updateManagerDoctor(id, branchId, input) {
      const clinic = branchById(branchId);
      const doctor = doctors.find((item) => item.id === id && item.branchId === branchId);
      if (!clinic || !doctor) return null;
      const scheduleDate =
        input.scheduleDate !== undefined
          ? input.scheduleDate
          : input.schedule?.date || doctor.scheduleDate || doctor.schedule?.date || null;
      const schedule = {
        ...(input.schedule || doctor.schedule || { start: '09:00 AM', end: '05:00 PM' }),
        date: scheduleDate,
      };
      Object.assign(doctor, {
        name: input.name,
        specialty: input.specialty,
        photo: input.photo || null,
        status: input.status || doctor.status,
        contact: input.contact || doctor.contact,
        availability: input.availability || doctor.availability,
        schedule,
        scheduleDate,
        weeklySchedule:
          input.weeklySchedule !== undefined ? input.weeklySchedule : doctor.weeklySchedule,
      });
      return this.formatManagerDoctor(doctor, branchId);
    },
    deactivateManagerDoctor(id, branchId) {
      const doctor = doctors.find((item) => item.id === id && item.branchId === branchId);
      if (!doctor) return null;
      doctor.status = 'inactive';
      doctor.availability = 'Unavailable';
      return doctor;
    },
    listManagerTreatments(branchId) {
      const branch = branchById(branchId);
      const region = branch?.region || 'UAE';
      const currency = REGION_CURRENCY[region] || 'AED';
      const isDeleted = (id) => deletedTreatmentKeys.has(treatmentDeleteKey(branchId, id));

      const customItems = customTreatments
        .filter((treatment) => treatment.branchId === branchId && !isDeleted(treatment.id))
        .map((treatment) => formatTreatmentItem(treatment, branchId));
      const overriddenIds = new Set(customItems.map((item) => item.id));
      const catalogItems = treatmentCatalog
        .filter((treatment) => !isDeleted(treatment.id) && !overriddenIds.has(treatment.id))
        .map((treatment) => formatTreatmentItem(treatment, branchId));

      return {
        categories: ['All', ...TREATMENT_CATEGORIES],
        departments: TREATMENT_CATEGORIES,
        currency,
        region,
        branch: branch
          ? { id: branch.id, name: branch.name, city: branch.city, region: branch.region }
          : null,
        items: [...customItems, ...catalogItems],
      };
    },
    getManagerTreatment(id, branchId) {
      if (deletedTreatmentKeys.has(treatmentDeleteKey(branchId, id))) return null;
      const custom = customTreatments.find(
        (item) => item.id === id && item.branchId === branchId
      );
      if (custom) return formatTreatmentItem(custom, branchId);
      const treatment = treatmentCatalog.find((item) => item.id === id);
      if (!treatment) return null;
      return formatTreatmentItem(treatment, branchId);
    },
    createManagerTreatment(branchId, input = {}) {
      const branch = branchById(branchId);
      if (!branch) return null;

      const name = String(input.name || '').trim();
      const description = String(input.description || '').trim();
      const department = String(input.department || input.category || '').trim();
      const category = TREATMENT_CATEGORIES.includes(department)
        ? department
        : department || 'Skincare';
      const durationMin =
        input.durationMin != null && Number.isFinite(Number(input.durationMin))
          ? Math.max(1, Math.round(Number(input.durationMin)))
          : parseDurationMinutes(input.duration || input.durationMin);
      const price = Number(input.price);
      const session = String(input.session || input.unit || 'Per Session').trim() || 'Per Session';
      const sessions = parseSessionCount(input.sessions != null ? input.sessions : session);
      const currency = REGION_CURRENCY[branch.region] || 'AED';

      if (!name) {
        const error = new Error('Treatment name is required.');
        error.code = 'INVALID_TREATMENT';
        throw error;
      }
      if (!Number.isFinite(price) || price < 0) {
        const error = new Error('Enter a valid treatment price.');
        error.code = 'INVALID_TREATMENT';
        throw error;
      }

      const durationText = String(input.duration || '').trim() || `${durationMin} Minutes`;
      const created = {
        id: `tx-custom-${Date.now()}`,
        branchId,
        name,
        description,
        category,
        department: category,
        durationMin,
        duration: durationText,
        price,
        currency,
        unit: session,
        session,
        sessions,
        status: 'active',
        region: branch.region,
        imageKey: 'treatmentdetail',
        imageUri: input.imageUri ? String(input.imageUri) : null,
        custom: true,
        createdAt: new Date().toISOString(),
      };
      customTreatments.unshift(created);
      return formatTreatmentItem(created, branchId);
    },
    updateManagerTreatment(branchId, id, input = {}) {
      const branch = branchById(branchId);
      if (!branch) return null;
      if (deletedTreatmentKeys.has(treatmentDeleteKey(branchId, id))) return null;

      let index = customTreatments.findIndex(
        (item) => item.id === id && item.branchId === branchId
      );
      if (index < 0) {
        const catalog = treatmentCatalog.find((item) => item.id === id);
        if (!catalog) {
          const error = new Error('Treatment not found.');
          error.code = 'INVALID_TREATMENT';
          throw error;
        }
        customTreatments.unshift({
          ...catalog,
          branchId,
          price:
            catalog.price != null
              ? Number(catalog.price)
              : Math.round((catalog.basePrice || 0) * regionPriceFactor(branch.region)),
          currency: REGION_CURRENCY[branch.region] || 'AED',
          duration: catalog.duration || `${catalog.durationMin || 30} Minutes`,
          durationMin: catalog.durationMin || 30,
          session: 'Per Session',
          unit: 'Per Session',
          sessions: 12,
          description: catalog.description || '',
          custom: true,
          region: branch.region,
          createdAt: new Date().toISOString(),
        });
        index = 0;
      }
      const current = customTreatments[index];
      const name = String(input.name != null ? input.name : current.name || '').trim();
      const description = String(
        input.description != null ? input.description : current.description || ''
      ).trim();
      const department = String(
        input.department || input.category || current.department || current.category || ''
      ).trim();
      const category = TREATMENT_CATEGORIES.includes(department)
        ? department
        : department || current.category || 'Skincare';
      const durationMin =
        input.durationMin != null && Number.isFinite(Number(input.durationMin))
          ? Math.max(1, Math.round(Number(input.durationMin)))
          : parseDurationMinutes(
              input.duration != null ? input.duration : current.duration || current.durationMin
            );
      const durationText =
        String(input.duration != null ? input.duration : current.duration || '').trim() ||
        `${durationMin} Minutes`;
      const price = Number(input.price != null ? input.price : current.price);
      const session =
        String(input.session || input.unit || current.session || current.unit || 'Per Session').trim() ||
        'Per Session';
      const sessions = parseSessionCount(
        input.sessions != null ? input.sessions : current.sessions != null ? current.sessions : session
      );

      if (!name) {
        const error = new Error('Treatment name is required.');
        error.code = 'INVALID_TREATMENT';
        throw error;
      }
      if (!Number.isFinite(price) || price < 0) {
        const error = new Error('Enter a valid treatment price.');
        error.code = 'INVALID_TREATMENT';
        throw error;
      }

      const doctorIds = Array.isArray(input.doctorIds)
        ? input.doctorIds.map((id) => String(id)).filter(Boolean).slice(0, MAX_TREATMENT_DOCTORS)
        : Array.isArray(current.doctorIds)
          ? current.doctorIds
          : undefined;

      const updated = {
        ...current,
        name,
        description,
        category,
        department: category,
        durationMin,
        duration: durationText,
        price,
        unit: session,
        session,
        sessions,
        ...(doctorIds ? { doctorIds } : {}),
        imageUri:
          input.imageUri !== undefined
            ? input.imageUri
              ? String(input.imageUri)
              : null
            : current.imageUri || null,
        updatedAt: new Date().toISOString(),
      };
      customTreatments[index] = updated;
      return formatTreatmentItem(updated, branchId);
    },
    deleteManagerTreatment(branchId, id) {
      const existing = this.getManagerTreatment(id, branchId);
      if (!existing) return null;
      const index = customTreatments.findIndex(
        (item) => item.id === id && item.branchId === branchId
      );
      if (index >= 0) customTreatments.splice(index, 1);
      deletedTreatmentKeys.add(treatmentDeleteKey(branchId, id));
      return existing;
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
    createDoctorScheduleRequest(input = {}) {
      const now = new Date();
      const clock = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const id = `dsr-${Date.now()}`;
      const alertId = `malert-dsr-${Date.now()}`;
      const mode = String(input.mode || 'hours').toLowerCase() === 'leave' ? 'leave' : 'hours';
      const branchId = input.branchId || 'br-dubai';
      const doctorName = String(input.doctorName || 'Doctor').trim() || 'Doctor';
      const preferDay = input.preferDay || null;
      const preferTime = input.preferTime || null;
      const reason = String(input.reason || '').trim();
      const title = mode === 'leave' ? 'Doctor Leave Request' : 'Doctor Schedule Change';
      const body =
        mode === 'leave'
          ? `${doctorName} requested leave${preferDay ? ` for ${preferDay}` : ''}${
              preferTime ? ` at ${preferTime}` : ''
            }.`
          : `${doctorName} requested updated working hours${preferDay ? ` (prefer ${preferDay}` : ''}${
              preferTime ? ` · ${preferTime})` : preferDay ? ')' : ''
            }.`;

      const request = {
        id,
        alertId,
        mode,
        status: 'pending',
        doctorUid: input.doctorUid || null,
        doctorName,
        branchId,
        preferDay,
        preferTime,
        reason,
        weeklySchedule: input.weeklySchedule || null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        decidedAt: null,
        decisionNote: null,
      };
      doctorScheduleRequests.unshift(request);

      managerAlertsSeed.unshift({
        id: alertId,
        title,
        clock,
        time: 'Today',
        body,
        detail: reason || 'Review and approve or decline this doctor request.',
        type: 'doctor_schedule',
        status: 'unread',
        actionNeeded: true,
        primaryAction: null,
        resolvedAction: null,
        targetBranchId: branchId,
        scheduleRequestId: id,
        doctorUid: request.doctorUid,
        doctorName,
        preferDay,
        preferTime,
        reason,
        mode,
      });

      return { request, alert: this.hydrateManagerAlert(managerAlertsSeed[0], branchId) };
    },
    listDoctorScheduleRequests({ doctorUid, branchId } = {}) {
      return doctorScheduleRequests.filter((item) => {
        if (doctorUid && item.doctorUid && item.doctorUid !== doctorUid) return false;
        if (branchId && item.branchId && item.branchId !== branchId) return false;
        return true;
      });
    },
    getDoctorScheduleRequest(id) {
      return doctorScheduleRequests.find((item) => item.id === id) || null;
    },
    resolveDoctorScheduleRequest(id, status, input = {}) {
      const request = doctorScheduleRequests.find((item) => item.id === id);
      if (!request) return null;
      const nextStatus = status === 'approved' ? 'approved' : 'declined';
      request.status = nextStatus;
      request.updatedAt = new Date().toISOString();
      request.decidedAt = request.updatedAt;
      request.decisionNote = input.reason || input.note || null;
      return request;
    },
  };
}

module.exports = { createClinicStore };
