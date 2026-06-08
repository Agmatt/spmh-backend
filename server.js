// Load environment variables from the .env file
require('dotenv').config();

// Import Fastify and the Supabase Client
const fastify = require('fastify')({ logger: true });
const { createClient } = require('@supabase/supabase-js');

// Register the HTML form parser plugin
fastify.register(require('@fastify/formbody'));

// Initialize the Supabase Connection using your secure credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// --- VALIDATION UTILITY FUNCTIONS ---

// Helper function to validate Kenyan phone formats
const isValidKenyanPhone = (phone) => {
  // Regex matches: +254..., 254..., 07..., or 01... followed by 8 digits
  const phoneRegex = /^(?:\+254|254|0)?(7|1)\d{8}$/;
  return phoneRegex.test(phone.trim());
};

// Helper function to validate basic email structures
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};


 // --- ENDPOINTS & ROUTING ---

// Simple Health Check Route
fastify.get('/', async (request, reply) => {
  return { status: "St. Paul's Backend API is fully connected to Supabase!" };
});

// The core submission endpoint
fastify.post('/api/appointments', async (request, reply) => {
  const {
    fullname,
    phone,
    email,
    department,
    appointment_date,
    appointment_time,
    notes,
  } = request.body;

  // 1. Check for missing mandatory fields
  if (
    !fullname ||
    !phone ||
    !department ||
    !appointment_date ||
    !appointment_time
  ) {
    return reply
      .status(400)
      .send({ error: 'All mandatory fields must be completely filled out.' });
  }

  // 2. Validate Full Name length
  if (fullname.trim().length < 3) {
    return reply
      .status(400)
      .send({ error: 'Full name must be at least 3 characters long.' });
  }

  // 3. Validate Kenyan Phone Number structure
  if (!isValidKenyanPhone(phone)) {
    return reply.status(400).send({
      error: 'Please provide a valid Kenyan phone number (e.g., 0712345678).',
    });
  }

  // 4. Validate Email ONLY if the patient filled it out
  if (email && !isValidEmail(email)) {
    return reply
      .status(400)
      .send({ error: 'The email address format provided is invalid.' });
  }

  // 5. Sanitize text fields slightly to protect against basic script injections
  const cleanFullName = fullname.replace(/[<>]/g, '');
  const cleanNotes = notes ? notes.replace(/[<>]/g, '') : null;

  // --- NOW PROCEED TO SUPABASE INSERTION IF ALL CHECKS PASS ---
  const { data, error } = await supabase.from('appointments').insert([
    {
      fullname: cleanFullName,
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : null,
      department,
      appointment_date,
      appointment_time,
      notes: cleanNotes,
    },
  ]);

  // If Supabase hits a snag...
  if (error) {
    fastify.log.error('Supabase Database Insertion Error:', error);
    return reply
      .status(500)
      .send({ error: 'Failed to log appointment into database.' });
  }

  const frontEndUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
  console.log(`Redirecting patient safely to: ${frontEndUrl}/portal/success`);
  return reply.status(302).redirect(`${frontEndUrl}/portal/success`);
});

// Start up the backend engine
const start = async () => {
  try {
    // Railway assigns a dynamic port via process.env.PORT, default to 3000 locally
    // Setting host to '0.0.0.0' is REQUIRED for cloud deployments
    await fastify.listen({
      port: process.env.PORT || 3000,
      host: '0.0.0.0',
    });
    console.log(`Backend server is running`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();