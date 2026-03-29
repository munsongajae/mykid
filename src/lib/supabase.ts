import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Supabase가 실제로 연결되어 있는지 확인
export const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && url !== 'your_supabase_project_url' && key && key !== 'your_supabase_anon_key');
};

export type Schedule = {
  id: string;
  child: 'jeum' | 'eum';
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  category: 'school' | 'afterschool' | 'academy' | 'etc';
  color?: string;
  date: string; // YYYY-MM-DD
  created_at?: string;
  preparations?: string[];
  group_id?: string;
};



export type FileArchive = {
  id: string;
  child: 'jeum' | 'eum' | 'both';
  title: string;
  file_url: string;
  file_type: 'image' | 'pdf';
  description?: string;
  created_at?: string;
};
