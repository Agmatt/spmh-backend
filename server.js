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

// Simple Health Check Route
fastify.get('/', async (request, reply) => {
  return { status: "St. Paul's Backend API is fully connected to Supabase!" };
});

// The core submission endpoint
fastify.post('/api/appointments', async (request, reply) => {
  // Extract all the fields your team requested from the incoming form
  const {
    fullname,
    phone,
    email,
    department,
    appointment_date,
    appointment_time,
    notes,
  } = request.body;

  // Insert the data into your Supabase 'appointments' table
  const { data, error } = await supabase.from('appointments').insert([
    {
      fullname,
      phone,
      // Handle optional email field gracefully
      email: email || null,
      department,
      appointment_date,
      appointment_time,
      // Handle optional notes field gracefully
      notes: notes || null,
    },
  ]);

  // If Supabase hits a snag, log the error and notify the server logs
  if (error) {
    fastify.log.error('Supabase Database Insertion Error:', error);
    return reply
      .status(500)
      .send({ error: 'Failed to log appointment into database.' });
  }

  // Success! Redirect the patient back to your Astro frontend success screen
  return reply.redirect('http://localhost:4321/portal/success');
});

// Start up the backend engine
const start = async () => {
  try {
    // Railway assigns a dynamic port via process.env.PORT, default to 3000 locally
    // Setting host to '0.0.0.0' is REQUIRED for cloud deployments
    await fastify.listen({ 
      port: process.env.PORT || 3000, 
      host: '0.0.0.0' 
    });
    console.log(`Backend server is running`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
