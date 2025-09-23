// This file is for potential future Supabase realtime features
// Currently using the database through the Express API
export const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// For future implementation of realtime features
// import { createClient } from '@supabase/supabase-js'
// export const supabase = createClient(supabaseUrl, supabaseAnonKey)
