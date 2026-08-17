// Sample Data for SSC Virtual Board
// In production, this would come from a backend API or database

export const officers = [
  {
    id: 1,
    name: "Maria Santos",
    position: "President",
    course: "BS Computer Science",
    yearLevel: "4th Year",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    email: "maria.santos@school.edu.ph",
    quote: "Together, we rise as one student body."
  },
  {
    id: 2,
    name: "Juan Dela Cruz",
    position: "Vice President - Internal",
    course: "BS Business Administration",
    yearLevel: "3rd Year",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    email: "juan.delacruz@school.edu.ph",
    quote: "Service above self."
  },
  {
    id: 3,
    name: "Ana Reyes",
    position: "Vice President - External",
    course: "BS Psychology",
    yearLevel: "4th Year",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
    email: "ana.reyes@school.edu.ph",
    quote: "Building bridges beyond borders."
  },
  {
    id: 4,
    name: "Carlos Garcia",
    position: "Secretary General",
    course: "BS Accountancy",
    yearLevel: "3rd Year",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    email: "carlos.garcia@school.edu.ph",
    quote: "Excellence in documentation."
  },
  {
    id: 5,
    name: "Patricia Lim",
    position: "Treasurer",
    course: "BS Accountancy",
    yearLevel: "4th Year",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
    email: "patricia.lim@school.edu.ph",
    quote: "Transparency in every peso."
  },
  {
    id: 6,
    name: "Miguel Torres",
    position: "Auditor",
    course: "BS Management",
    yearLevel: "3rd Year",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
    email: "miguel.torres@school.edu.ph",
    quote: "Accountability at its finest."
  },
  {
    id: 7,
    name: "Jessica Cruz",
    position: "Public Relations Officer",
    course: "AB Communication",
    yearLevel: "3rd Year",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400",
    email: "jessica.cruz@school.edu.ph",
    quote: "Your voice is our message."
  },
  {
    id: 8,
    name: "Daniel Ramos",
    position: "Business Manager",
    course: "BS Entrepreneurship",
    yearLevel: "4th Year",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400",
    email: "daniel.ramos@school.edu.ph",
    quote: "Innovative solutions for student needs."
  }
];

export const announcements = [
  {
    id: 1,
    title: "General Assembly Meeting",
    category: "Admin Announcements",
    date: "2026-02-10",
    content: "All students are invited to attend the General Assembly Meeting scheduled for February 10, 2026 at the University Gymnasium. Attendance is mandatory for all class officers.",
    isPinned: true
  },
  {
    id: 2,
    title: "CHED Scholarship Application Open",
    category: "Vacancies for Scholarships",
    date: "2026-02-08",
    content: "The CHED Merit Scholarship Program is now accepting applications for the second semester. Interested students must maintain a GWA of 1.5 or better.",
    isPinned: true
  },
  {
    id: 3,
    title: "School ID Claiming Schedule",
    category: "ID/UNIFORM",
    date: "2026-02-05",
    content: "Students may claim their school IDs at the Registrar's Office from February 5-15, 2026. Please bring your official receipt and one valid ID.",
    isPinned: false
  },
  {
    id: 4,
    title: "Deadline Extension for Project Submissions",
    category: "Leniencies",
    date: "2026-02-03",
    content: "Due to the recent weather disturbances, the deadline for all major project submissions has been extended by one week.",
    isPinned: false
  },
  {
    id: 5,
    title: "Campus Health Advisory",
    category: "Advisory",
    date: "2026-02-01",
    content: "The school clinic reminds everyone to practice proper hygiene. Free flu vaccines will be available at the clinic starting next week.",
    isPinned: false
  },
  {
    id: 6,
    title: "Student Government Scholarship",
    category: "Vacancies for Scholarships",
    date: "2026-01-28",
    content: "The SSC is offering 10 scholarship slots for deserving students. Criteria include academic excellence, leadership, and community involvement.",
    isPinned: false
  }
];

export const memorandumOrders = [
  {
    id: 1,
    number: "MO-2026-001",
    title: "Implementation of New Attendance Policy",
    date: "2026-02-01",
    effectiveDate: "2026-02-15",
    description: "This memorandum outlines the new attendance policy requiring biometric verification for all students."
  },
  {
    id: 2,
    number: "MO-2026-002",
    title: "Guidelines for Campus Events",
    date: "2026-01-25",
    effectiveDate: "2026-02-01",
    description: "Updated guidelines for organizing and conducting campus events, including required permits and safety protocols."
  },
  {
    id: 3,
    number: "MO-2026-003",
    title: "Library Operating Hours Extension",
    date: "2026-01-20",
    effectiveDate: "2026-01-25",
    description: "The library will now operate extended hours from 7:00 AM to 10:00 PM on weekdays during the examination period."
  },
  {
    id: 4,
    number: "MO-2026-004",
    title: "Dress Code Reminder",
    date: "2026-01-15",
    effectiveDate: "2026-01-15",
    description: "All students are reminded to follow the prescribed dress code. Proper uniform must be worn during class days."
  }
];

export const calendarEvents = [
  {
    id: 1,
    title: "General Assembly",
    date: "2026-02-10",
    time: "9:00 AM - 12:00 PM",
    location: "University Gymnasium",
    description: "First semester general assembly for all students",
    status: "approved",
    category: "Assembly"
  },
  {
    id: 2,
    title: "Leadership Training Workshop",
    date: "2026-02-15",
    time: "8:00 AM - 5:00 PM",
    location: "Conference Hall",
    description: "Leadership development training for all council officers",
    status: "approved",
    category: "Training"
  },
  {
    id: 3,
    title: "Blood Donation Drive",
    date: "2026-02-20",
    time: "8:00 AM - 4:00 PM",
    location: "Student Center",
    description: "In partnership with Philippine Red Cross",
    status: "pending",
    category: "Outreach"
  },
  {
    id: 4,
    title: "Intramurals Opening",
    date: "2026-03-01",
    time: "7:00 AM",
    location: "Sports Complex",
    description: "Annual intramural sports competition opening ceremony",
    status: "planned",
    category: "Sports"
  },
  {
    id: 5,
    title: "Foundation Day Celebration",
    date: "2026-03-15",
    time: "All Day",
    location: "Entire Campus",
    description: "School foundation day celebration with various activities",
    status: "planned",
    category: "Celebration"
  },
  {
    id: 6,
    title: "Environmental Clean-up",
    date: "2026-02-25",
    time: "6:00 AM - 10:00 AM",
    location: "Campus Grounds",
    description: "Monthly environmental awareness activity",
    status: "approved",
    category: "Outreach"
  }
];

export const resolutions = [
  {
    id: 1,
    number: "RES-2026-001",
    title: "Establishment of Student Emergency Fund",
    date: "2026-01-15",
    status: "Approved",
    description: "Resolution to establish an emergency fund for students facing financial difficulties.",
    votesFor: 12,
    votesAgainst: 0,
    abstain: 1
  },
  {
    id: 2,
    number: "RES-2026-002",
    title: "Request for Additional Study Areas",
    date: "2026-01-20",
    status: "Approved",
    description: "Resolution requesting the administration to provide additional study areas in campus buildings.",
    votesFor: 11,
    votesAgainst: 1,
    abstain: 1
  },
  {
    id: 3,
    number: "RES-2026-003",
    title: "Extended Library Hours During Finals",
    date: "2026-01-25",
    status: "Approved",
    description: "Resolution to extend library operating hours during examination periods.",
    votesFor: 13,
    votesAgainst: 0,
    abstain: 0
  },
  {
    id: 4,
    number: "RES-2026-004",
    title: "Student Discount Program with Local Establishments",
    date: "2026-02-01",
    status: "Pending",
    description: "Resolution to partner with local businesses for student discount programs.",
    votesFor: 10,
    votesAgainst: 2,
    abstain: 1
  }
];

export const minutesOfMeeting = [
  {
    id: 1,
    title: "Regular Meeting - January 2026",
    date: "2026-01-10",
    attendees: 13,
    location: "SSC Office",
    agenda: ["Budget allocation for first semester", "Planning for Leadership Training", "Committee updates"],
    summary: "The council discussed and approved the budget allocation for the first semester activities."
  },
  {
    id: 2,
    title: "Special Meeting - Emergency Fund",
    date: "2026-01-15",
    attendees: 12,
    location: "Conference Room A",
    agenda: ["Emergency Fund proposal", "Criteria for beneficiaries", "Fund management"],
    summary: "Special meeting to discuss and finalize the Student Emergency Fund program."
  },
  {
    id: 3,
    title: "Regular Meeting - February 2026",
    date: "2026-02-05",
    attendees: 11,
    location: "SSC Office",
    agenda: ["General Assembly preparation", "Activity updates", "Financial report"],
    summary: "Discussion focused on the upcoming General Assembly and activity preparations."
  }
];

export const narrativeReports = [
  {
    id: 1,
    title: "Leadership Training Workshop 2025",
    date: "2025-11-20",
    event: "Annual Leadership Training",
    participants: 150,
    summary: "Successfully conducted the annual leadership training with participants from all departments."
  },
  {
    id: 2,
    title: "Christmas Charity Drive 2025",
    date: "2025-12-15",
    event: "Charity Drive",
    participants: 200,
    summary: "Collected and distributed care packages to 50 families in partnership with local barangay."
  },
  {
    id: 3,
    title: "Freshmen Orientation Program",
    date: "2025-08-10",
    event: "Orientation",
    participants: 500,
    summary: "Welcomed incoming freshmen with comprehensive orientation on student services and activities."
  }
];

export const accomplishments = [
  {
    id: 1,
    title: "Student Emergency Fund Launch",
    date: "2026-01-20",
    category: "Service",
    status: "Completed",
    description: "Successfully established and launched the Student Emergency Fund program."
  },
  {
    id: 2,
    title: "Extended Library Hours",
    date: "2026-01-28",
    category: "Advocacy",
    status: "Completed",
    description: "Secured approval for extended library hours during examination periods."
  },
  {
    id: 3,
    title: "Blood Donation Drive Planning",
    date: "2026-02-01",
    category: "Outreach",
    status: "In Progress",
    description: "Coordinating with Philippine Red Cross for the upcoming blood donation drive."
  },
  {
    id: 4,
    title: "Student Discount Program",
    date: "2026-02-05",
    category: "Partnership",
    status: "In Progress",
    description: "Negotiating partnerships with local establishments for student discounts."
  },
  {
    id: 5,
    title: "Leadership Training",
    date: "2026-02-15",
    category: "Training",
    status: "Upcoming",
    description: "Preparing leadership training workshop for all organization officers."
  }
];

export const requestLetterTypes = [
  {
    id: 1,
    type: "Borrowing of Equipment",
    description: "Request to borrow SSC equipment such as sound system, tables, chairs, etc.",
    requirements: ["Letter of request", "Event details", "Return date commitment"]
  },
  {
    id: 2,
    type: "Venue Reservation",
    description: "Request to use SSC-managed venues for events and activities.",
    requirements: ["Letter of request", "Event proposal", "Schedule preference"]
  },
  {
    id: 3,
    type: "Financial Assistance",
    description: "Request for financial support for student activities and competitions.",
    requirements: ["Letter of request", "Activity proposal", "Budget breakdown"]
  },
  {
    id: 4,
    type: "Certificate Request",
    description: "Request for certificates of recognition or participation.",
    requirements: ["Letter of request", "Event details", "List of recipients"]
  },
  {
    id: 5,
    type: "Partnership Request",
    description: "Request for SSC partnership or collaboration on projects.",
    requirements: ["Letter of request", "Project proposal", "Expected outcomes"]
  }
];

export const missionVision = {
  mission: "To serve as the voice of the students, advocating for student rights and welfare while fostering a culture of excellence, integrity, and service. We commit to providing transparent governance, promoting student engagement, and creating meaningful opportunities for personal and academic growth at PSU Urdaneta City Campus.",
  vision: "A united, empowered, and progressive student community where every voice is heard, every concern is addressed, and every student has the opportunity to reach their full potential.",
  coreValues: [
    { title: "Integrity", description: "We uphold honesty and transparency in all our actions and decisions." },
    { title: "Service", description: "We dedicate ourselves to serving the needs of our fellow students." },
    { title: "Excellence", description: "We strive for the highest standards in everything we do." },
    { title: "Unity", description: "We work together as one body for the common good of all students." },
    { title: "Innovation", description: "We embrace new ideas and approaches to better serve our constituents." }
  ],
  goals: [
    "Strengthen student representation in university governance",
    "Enhance student services and welfare programs",
    "Foster academic excellence through support programs",
    "Build partnerships for student development opportunities",
    "Promote transparency and accountability in student government"
  ]
};

export const contactInfo = {
  office: "PSU Urdaneta City Campus, San Vicente West, Urdaneta City, Pangasinan",
  email: "ssc.urdanetacampus@psu.edu.ph",
  phone: "(075) 568-2361",
  officeHours: "Monday - Friday, 8:00 AM - 5:00 PM",
  socialMedia: {
    facebook: "@PSUurdanetaSSC",
    twitter: "@PSUurdanetaSSC",
    instagram: "@PSUurdanetaSSC"
  }
};

export const programOptions = [
  { name: "Bachelor of Science in Information Technology", years: 4 },
  { name: "Bachelor of Science in Secondary Education major in Science", years: 4 },
  { name: "Bachelor of Science in Secondary Education major in Filipino", years: 4 },
  { name: "Bachelor of Science in Early Childhood Education", years: 4 },
  { name: "Bachelor of Arts in English Language", years: 4 },
  { name: "Bachelor of Science in Civil Engineering", years: 4 },
  { name: "Bachelor of Science in Computer Engineering major in Embedded System", years: 4 },
  { name: "Bachelor of Science in Computer Engineering major in System and Network Administration", years: 4 },
  { name: "Bachelor of Science in Mechanical Engineering", years: 4 },
  { name: "Bachelor of Science in Electrical Engineering", years: 4 },
  { name: "Bachelor of Science in Mathematics major in Computer Information Technology", years: 4 },
  { name: "Bachelor of Science in Mathematics major in Statistics", years: 4 },
  { name: "Bachelor of Science in Mathematics major in Pure Mathematics", years: 4 },
  { name: "Bachelor of Science in Architecture", years: 5 }
];
