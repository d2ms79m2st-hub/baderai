export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          role: string;
          created_at: string;
          updated_at: string;
          last_signed_in: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
          last_signed_in?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      chat_messages: {
        Row: { id: number; user_id: string; session_key: string; role: string; content: string; source_status: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["chat_messages"]["Row"], "id" | "created_at"> & { id?: number; created_at?: string; source_status?: string };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [];
      };
      human_requests: {
        Row: { id: number; user_id: string; session_key: string; summary: string; status: string; created_at: string; updated_at: string };
        Insert: Omit<Database["public"]["Tables"]["human_requests"]["Row"], "id" | "created_at" | "updated_at"> & { id?: number; created_at?: string; updated_at?: string; status?: string };
        Update: Partial<Database["public"]["Tables"]["human_requests"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
