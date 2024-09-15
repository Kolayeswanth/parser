// supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://uzbyaiuyazzuhrwqvqvp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6YnlhaXV5YXp6dWhyd3F2cXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU2NDI4MjEsImV4cCI6MjA0MTIxODgyMX0.D39M_eT2QZZCGfwBx1CWD6nrwxjd37hbvbcNq_E6H_8');

module.exports = { supabase };