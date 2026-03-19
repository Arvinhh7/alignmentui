/**
 * Supabase client configuration
 * Handles cases where environment variables may not be set (static export)
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (typeof window === 'undefined') {
    if (!supabaseUrl || !supabaseAnonKey) return null;
  }

  if (!supabase && supabaseUrl && supabaseAnonKey) {
    // Use default PKCE flow — the standard for static exports.
    // detectSessionInUrl handles OAuth code exchange automatically in the browser.
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',         // Explicit PKCE — prevents one-time tokens being consumed by email scanners
        detectSessionInUrl: true,  // Auto-exchange ?code= param on page load
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabase;
};

export { supabase };

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  domain?: string;
  keywords: string[];
  industry?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Mention {
  id: string;
  brand_id: string;
  platform: 'chatgpt' | 'perplexity' | 'gemini' | 'claude' | 'grok';
  prompt_used: string;
  response_text: string;
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentiment_score: number;
  position?: number;
  position_score: number;
  citation_url?: string;
  created_at: string;
}

export interface DailyStats {
  id: string;
  brand_id: string;
  date: string;
  mention_count: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  citation_count: number;
  aigvr_score: number;
  created_at: string;
}

export interface Prompt {
  id: string;
  template: string;
  category: 'info_cognition' | 'solution_explore' | 'comparison_decision' | 'action_choice' | 'recommendation' | 'comparison' | 'information' | 'review' | 'howto';
  description?: string;
  is_active: boolean;
  created_at: string;
}
