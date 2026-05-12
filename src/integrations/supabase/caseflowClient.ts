import { createClient } from '@supabase/supabase-js';

const CASEFLOW_URL = 'https://gzeovhwoouoxfenaxsss.supabase.co';
const CASEFLOW_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6ZW92aHdvb3VveGZlbmF4c3NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY1ODUsImV4cCI6MjA5MTM4MjU4NX0.81zMwy3F3B_06VIfaHFXCIzMqUgHptNnCOvVyn3KGyQ';

export const caseflowDb = createClient(CASEFLOW_URL, CASEFLOW_ANON_KEY);