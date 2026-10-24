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
      catalog_products: {
        Row: { id: string; sku: string | null; name: string; description: string | null; official_url: string; status: string | null; currency: string; weight: string | null; has_options: boolean; rating: Json | null; available: boolean; out_of_stock: boolean; source_store_id: string; source_collected_at: string; source_updated_at: string | null; source_payload: Json; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["catalog_products"]["Row"]> & Pick<Database["public"]["Tables"]["catalog_products"]["Row"], "id" | "name" | "official_url" | "source_store_id" | "source_collected_at">;
        Update: Partial<Database["public"]["Tables"]["catalog_products"]["Insert"]>;
        Relationships: [];
      };
      catalog_categories: {
        Row: { id: string; name: string; source_store_id: string; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["catalog_categories"]["Row"]> & Pick<Database["public"]["Tables"]["catalog_categories"]["Row"], "id" | "name" | "source_store_id">;
        Update: Partial<Database["public"]["Tables"]["catalog_categories"]["Insert"]>;
        Relationships: [];
      };
      catalog_product_categories: {
        Row: { product_id: string; category_id: string; observed_at: string };
        Insert: Database["public"]["Tables"]["catalog_product_categories"]["Row"];
        Update: Partial<Database["public"]["Tables"]["catalog_product_categories"]["Row"]>;
        Relationships: [];
      };
      catalog_product_prices: {
        Row: { id: number; product_id: string; price: number | null; regular_price: number | null; sale_price: number | null; currency: string; observed_at: string; source: string; is_current: boolean };
        Insert: Omit<Database["public"]["Tables"]["catalog_product_prices"]["Row"], "id"> & { id?: number };
        Update: Partial<Database["public"]["Tables"]["catalog_product_prices"]["Insert"]>;
        Relationships: [];
      };
      catalog_product_images: {
        Row: { id: number; product_id: string; url: string; original_url: string | null; kind: string; sort_order: number; is_current: boolean; observed_at: string };
        Insert: Omit<Database["public"]["Tables"]["catalog_product_images"]["Row"], "id"> & { id?: number };
        Update: Partial<Database["public"]["Tables"]["catalog_product_images"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
