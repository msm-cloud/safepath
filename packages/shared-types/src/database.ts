// PLACEHOLDER — structurally accurate, but hand-written against the
// migrations in supabase/migrations/, not yet generated from a live
// database. Run `pnpm gen:types` (see scripts/gen-types.mjs) against a
// linked or local Supabase project to overwrite this file with the
// authoritative output of `supabase gen types typescript`.
//
// The regenerated file is expected to keep this same shape — a `Database`
// type plus the `Profile` / `Alert` / `GuardianLink` / `EmergencyContact`
// aliases at the bottom — so mobile/ and dashboard/ don't need any code
// changes when it's refreshed.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Database['public']['Enums']['profile_role'];
          full_name: string;
          phone: string | null;
          preferred_language: Database['public']['Enums']['preferred_language'];
          shake_sos_enabled: boolean;
          fake_call_enabled: boolean;
          fake_call_caller_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role: Database['public']['Enums']['profile_role'];
          full_name: string;
          phone?: string | null;
          preferred_language?: Database['public']['Enums']['preferred_language'];
          shake_sos_enabled?: boolean;
          fake_call_enabled?: boolean;
          fake_call_caller_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: Database['public']['Enums']['profile_role'];
          full_name?: string;
          phone?: string | null;
          preferred_language?: Database['public']['Enums']['preferred_language'];
          shake_sos_enabled?: boolean;
          fake_call_enabled?: boolean;
          fake_call_caller_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      guardian_links: {
        Row: {
          id: string;
          user_id: string;
          guardian_id: string | null;
          invite_code: string;
          status: Database['public']['Enums']['guardian_link_status'];
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          guardian_id?: string | null;
          invite_code?: string;
          status?: Database['public']['Enums']['guardian_link_status'];
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          guardian_id?: string | null;
          invite_code?: string;
          status?: Database['public']['Enums']['guardian_link_status'];
          created_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'guardian_links_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guardian_links_guardian_id_fkey';
            columns: ['guardian_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      emergency_contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'emergency_contacts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      alerts: {
        Row: {
          id: string;
          user_id: string;
          status: Database['public']['Enums']['alert_status'];
          trigger_type: Database['public']['Enums']['alert_trigger_type'];
          last_lat: number | null;
          last_lng: number | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: Database['public']['Enums']['alert_status'];
          trigger_type?: Database['public']['Enums']['alert_trigger_type'];
          last_lat?: number | null;
          last_lng?: number | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: Database['public']['Enums']['alert_status'];
          trigger_type?: Database['public']['Enums']['alert_trigger_type'];
          last_lat?: number | null;
          last_lng?: number | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'alerts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      alert_locations: {
        Row: {
          id: string;
          alert_id: string;
          lat: number;
          lng: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          alert_id: string;
          lat: number;
          lng: number;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          alert_id?: string;
          lat?: number;
          lng?: number;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'alert_locations_alert_id_fkey';
            columns: ['alert_id'];
            isOneToOne: false;
            referencedRelation: 'alerts';
            referencedColumns: ['id'];
          },
        ];
      };
      journeys: {
        Row: {
          id: string;
          user_id: string;
          destination_note: string | null;
          expected_arrival_at: string;
          grace_period_minutes: number;
          status: Database['public']['Enums']['journey_status'];
          last_lat: number | null;
          last_lng: number | null;
          notified_at: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          destination_note?: string | null;
          expected_arrival_at: string;
          grace_period_minutes?: number;
          status?: Database['public']['Enums']['journey_status'];
          last_lat?: number | null;
          last_lng?: number | null;
          notified_at?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          destination_note?: string | null;
          expected_arrival_at?: string;
          grace_period_minutes?: number;
          status?: Database['public']['Enums']['journey_status'];
          last_lat?: number | null;
          last_lng?: number | null;
          notified_at?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'journeys_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          expo_push_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_push_token: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expo_push_token?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_invite_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      enforce_guardian_link_update: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      enforce_alert_update_permissions: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      redeem_guardian_invite: {
        Args: { p_invite_code: string };
        Returns: Json;
      };
      check_overdue_journeys: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      normalize_phone: {
        Args: { p_phone: string };
        Returns: string;
      };
      resolve_login_identifier: {
        Args: { identifier: string };
        Returns: string | null;
      };
    };
    Enums: {
      profile_role: 'user' | 'guardian';
      preferred_language: 'bn' | 'en';
      guardian_link_status: 'pending' | 'accepted' | 'revoked';
      alert_status: 'active' | 'resolved' | 'false_alarm';
      alert_trigger_type: 'manual' | 'journey_overdue';
      journey_status: 'active' | 'arrived_safe' | 'alert_triggered' | 'cancelled';
    };
    CompositeTypes: Record<string, never>;
  };
};

// Convenience aliases — the shapes consumed by mobile/ and dashboard/.
// Kept stable across regeneration so app code never has to reach into
// Database['public']['Tables'][...]['Row'] directly.
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Alert = Database['public']['Tables']['alerts']['Row'];
export type GuardianLink = Database['public']['Tables']['guardian_links']['Row'];
export type EmergencyContact = Database['public']['Tables']['emergency_contacts']['Row'];
export type Journey = Database['public']['Tables']['journeys']['Row'];
