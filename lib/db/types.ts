export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_users: {
        Row: {
          active: boolean;
          created_at: string;
          display_name: string | null;
          email: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          display_name?: string | null;
          email: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          active?: boolean;
          created_at?: string;
          display_name?: string | null;
          email?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor_user_id: string | null;
          after: Json | null;
          before: Json | null;
          entity: string;
          entity_id: string | null;
          id: number;
          occurred_at: string;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: number;
          occurred_at?: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: number;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      beaches: {
        Row: {
          active: boolean;
          blurb: string | null;
          center: unknown;
          city_id: string;
          created_at: string;
          hero_image: string | null;
          id: string;
          name: string;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
        };
        Insert: {
          active?: boolean;
          blurb?: string | null;
          center: unknown;
          city_id: string;
          created_at?: string;
          hero_image?: string | null;
          id?: string;
          name: string;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
        };
        Update: {
          active?: boolean;
          blurb?: string | null;
          center?: unknown;
          city_id?: string;
          created_at?: string;
          hero_image?: string | null;
          id?: string;
          name?: string;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "beaches_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          created_at: string;
          ends_at: string | null;
          id: string;
          name: string;
          partner_id: string | null;
          slug: string;
          starts_at: string | null;
        };
        Insert: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          name: string;
          partner_id?: string | null;
          slug: string;
          starts_at?: string | null;
        };
        Update: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          name?: string;
          partner_id?: string | null;
          slug?: string;
          starts_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      cities: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          name: string;
          region_id: string;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          timezone: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          region_id: string;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          timezone: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          region_id?: string;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          timezone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cities_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      countries: {
        Row: {
          active: boolean;
          created_at: string;
          currency: string;
          id: string;
          iso2: string;
          name: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          currency: string;
          id?: string;
          iso2: string;
          name: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          currency?: string;
          id?: string;
          iso2?: string;
          name?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          marketing_opt_in: boolean;
          name: string | null;
          phone: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          marketing_opt_in?: boolean;
          name?: string | null;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          marketing_opt_in?: boolean;
          name?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      customization_groups: {
        Row: {
          id: string;
          input_type: Database["public"]["Enums"]["customization_input_type"];
          key: string;
          label: string;
          max_length: number | null;
          max_select: number;
          min_select: number;
          price_delta_cents: number;
          required: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          input_type: Database["public"]["Enums"]["customization_input_type"];
          key: string;
          label: string;
          max_length?: number | null;
          max_select?: number;
          min_select?: number;
          price_delta_cents?: number;
          required?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          input_type?: Database["public"]["Enums"]["customization_input_type"];
          key?: string;
          label?: string;
          max_length?: number | null;
          max_select?: number;
          min_select?: number;
          price_delta_cents?: number;
          required?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      customization_options: {
        Row: {
          active: boolean;
          group_id: string;
          id: string;
          label: string;
          price_delta_cents: number;
          sort_order: number;
          value: string;
        };
        Insert: {
          active?: boolean;
          group_id: string;
          id?: string;
          label: string;
          price_delta_cents?: number;
          sort_order?: number;
          value: string;
        };
        Update: {
          active?: boolean;
          group_id?: string;
          id?: string;
          label?: string;
          price_delta_cents?: number;
          sort_order?: number;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customization_options_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "customization_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_zones: {
        Row: {
          access_notes: string | null;
          active: boolean;
          beach_id: string;
          created_at: string;
          delivery_fee_cents: number;
          eta_max_minutes: number;
          eta_min_minutes: number;
          id: string;
          name: string;
          operating_hours: NonNullable<Json>;
          pause_reason: string | null;
          pause_until: string | null;
          polygon: unknown;
          priority: number;
          requires_property_permission: boolean;
          route_factor: number;
          service_status: Database["public"]["Enums"]["zone_service_status"];
        };
        Insert: {
          access_notes?: string | null;
          active?: boolean;
          beach_id: string;
          created_at?: string;
          delivery_fee_cents?: number;
          eta_max_minutes: number;
          eta_min_minutes: number;
          id?: string;
          name: string;
          operating_hours?: NonNullable<Json>;
          pause_reason?: string | null;
          pause_until?: string | null;
          polygon: unknown;
          priority?: number;
          requires_property_permission?: boolean;
          route_factor?: number;
          service_status?: Database["public"]["Enums"]["zone_service_status"];
        };
        Update: {
          access_notes?: string | null;
          active?: boolean;
          beach_id?: string;
          created_at?: string;
          delivery_fee_cents?: number;
          eta_max_minutes?: number;
          eta_min_minutes?: number;
          id?: string;
          name?: string;
          operating_hours?: NonNullable<Json>;
          pause_reason?: string | null;
          pause_until?: string | null;
          polygon?: unknown;
          priority?: number;
          requires_property_permission?: boolean;
          route_factor?: number;
          service_status?: Database["public"]["Enums"]["zone_service_status"];
        };
        Relationships: [
          {
            foreignKeyName: "delivery_zones_beach_id_fkey";
            columns: ["beach_id"];
            isOneToOne: false;
            referencedRelation: "beaches";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory: {
        Row: {
          id: string;
          prep_point_id: string;
          qty_available: number;
          qty_reserved: number;
          sku: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prep_point_id: string;
          qty_available?: number;
          qty_reserved?: number;
          sku: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prep_point_id?: string;
          qty_available?: number;
          qty_reserved?: number;
          sku?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_prep_point_id_fkey";
            columns: ["prep_point_id"];
            isOneToOne: false;
            referencedRelation: "prep_points";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_sku_fkey";
            columns: ["sku"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["sku"];
          },
        ];
      };
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"];
          created_at: string;
          error: string | null;
          id: string;
          order_id: string | null;
          provider_ref: string | null;
          recipient: string;
          sent_at: string | null;
          status: string;
          template: string;
        };
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"];
          created_at?: string;
          error?: string | null;
          id?: string;
          order_id?: string | null;
          provider_ref?: string | null;
          recipient: string;
          sent_at?: string | null;
          status?: string;
          template: string;
        };
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"];
          created_at?: string;
          error?: string | null;
          id?: string;
          order_id?: string | null;
          provider_ref?: string | null;
          recipient?: string;
          sent_at?: string | null;
          status?: string;
          template?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_at_risk";
            referencedColumns: ["order_id"];
          },
        ];
      };
      order_assignments: {
        Row: {
          assigned_at: string;
          delivered_occurred_at: string | null;
          delivered_recorded_at: string | null;
          id: string;
          order_id: string;
          picked_up_at: string | null;
          release_reason: Database["public"]["Enums"]["assignment_release_reason"] | null;
          released_at: string | null;
          runner_id: string;
        };
        Insert: {
          assigned_at?: string;
          delivered_occurred_at?: string | null;
          delivered_recorded_at?: string | null;
          id?: string;
          order_id: string;
          picked_up_at?: string | null;
          release_reason?: Database["public"]["Enums"]["assignment_release_reason"] | null;
          released_at?: string | null;
          runner_id: string;
        };
        Update: {
          assigned_at?: string;
          delivered_occurred_at?: string | null;
          delivered_recorded_at?: string | null;
          id?: string;
          order_id?: string;
          picked_up_at?: string | null;
          release_reason?: Database["public"]["Enums"]["assignment_release_reason"] | null;
          released_at?: string | null;
          runner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_assignments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_at_risk";
            referencedColumns: ["order_id"];
          },
          {
            foreignKeyName: "order_assignments_runner_id_fkey";
            columns: ["runner_id"];
            isOneToOne: false;
            referencedRelation: "runners";
            referencedColumns: ["id"];
          },
        ];
      };
      order_events: {
        Row: {
          actor_id: string | null;
          actor_type: Database["public"]["Enums"]["actor_type"] | null;
          from_value: string | null;
          id: number;
          meta: NonNullable<Json>;
          occurred_at: string;
          order_id: string;
          reason: string | null;
          to_value: string;
          track: string;
        };
        Insert: {
          actor_id?: string | null;
          actor_type?: Database["public"]["Enums"]["actor_type"] | null;
          from_value?: string | null;
          id?: number;
          meta?: NonNullable<Json>;
          occurred_at?: string;
          order_id: string;
          reason?: string | null;
          to_value: string;
          track: string;
        };
        Update: {
          actor_id?: string | null;
          actor_type?: Database["public"]["Enums"]["actor_type"] | null;
          from_value?: string | null;
          id?: number;
          meta?: NonNullable<Json>;
          occurred_at?: string;
          order_id?: string;
          reason?: string | null;
          to_value?: string;
          track?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_at_risk";
            referencedColumns: ["order_id"];
          },
        ];
      };
      order_item_customizations: {
        Row: {
          group_id: string | null;
          id: string;
          label_snapshot: string;
          option_id: string | null;
          order_item_id: string;
          price_delta_cents: number;
          text_value: string | null;
        };
        Insert: {
          group_id?: string | null;
          id?: string;
          label_snapshot: string;
          option_id?: string | null;
          order_item_id: string;
          price_delta_cents?: number;
          text_value?: string | null;
        };
        Update: {
          group_id?: string | null;
          id?: string;
          label_snapshot?: string;
          option_id?: string | null;
          order_item_id?: string;
          price_delta_cents?: number;
          text_value?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_customizations_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "customization_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_item_customizations_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "customization_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_item_customizations_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          line_total_cents: number;
          name_snapshot: string;
          order_id: string;
          product_id: string | null;
          qty: number;
          unit_price_cents: number;
        };
        Insert: {
          id?: string;
          line_total_cents: number;
          name_snapshot: string;
          order_id: string;
          product_id?: string | null;
          qty: number;
          unit_price_cents: number;
        };
        Update: {
          id?: string;
          line_total_cents?: number;
          name_snapshot?: string;
          order_id?: string;
          product_id?: string | null;
          qty?: number;
          unit_price_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_at_risk";
            referencedColumns: ["order_id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_locations: {
        Row: {
          accuracy_m: number | null;
          captured_at: string;
          id: string;
          order_id: string;
          point: unknown;
          source: Database["public"]["Enums"]["location_source"];
        };
        Insert: {
          accuracy_m?: number | null;
          captured_at?: string;
          id?: string;
          order_id: string;
          point: unknown;
          source?: Database["public"]["Enums"]["location_source"];
        };
        Update: {
          accuracy_m?: number | null;
          captured_at?: string;
          id?: string;
          order_id?: string;
          point?: unknown;
          source?: Database["public"]["Enums"]["location_source"];
        };
        Relationships: [
          {
            foreignKeyName: "order_locations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_locations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_at_risk";
            referencedColumns: ["order_id"];
          },
        ];
      };
      order_offers: {
        Row: {
          expires_at: string;
          id: string;
          offered_at: string;
          order_id: string;
          responded_at: string | null;
          response: Database["public"]["Enums"]["offer_response"] | null;
          runner_id: string;
        };
        Insert: {
          expires_at: string;
          id?: string;
          offered_at?: string;
          order_id: string;
          responded_at?: string | null;
          response?: Database["public"]["Enums"]["offer_response"] | null;
          runner_id: string;
        };
        Update: {
          expires_at?: string;
          id?: string;
          offered_at?: string;
          order_id?: string;
          responded_at?: string | null;
          response?: Database["public"]["Enums"]["offer_response"] | null;
          runner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_offers_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_offers_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_at_risk";
            referencedColumns: ["order_id"];
          },
          {
            foreignKeyName: "order_offers_runner_id_fkey";
            columns: ["runner_id"];
            isOneToOne: false;
            referencedRelation: "runners";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          accept_deadline_at: string | null;
          amount_captured_cents: number;
          amount_refunded_cents: number;
          arriving_announced_at: string | null;
          beach_id: string;
          campaign_id: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: Database["public"]["Enums"]["actor_type"] | null;
          cash_collected_cents: number;
          client_idempotency_key: string;
          collected_by_runner_id: string | null;
          contact_attempts: number;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string;
          currency: string;
          customer_description: string | null;
          customer_id: string | null;
          customization_cents: number;
          delivered_at: string | null;
          delivery_code: string;
          delivery_fee_cents: number;
          delivery_note: string | null;
          delivery_photo_url: string | null;
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"];
          id: string;
          landmark_text: string | null;
          order_number: number;
          partner_id: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          placed_at: string;
          prep_point_id: string | null;
          prep_ready_at: string | null;
          prep_started_at: string | null;
          prep_status: Database["public"]["Enums"]["prep_status"];
          promised_eta_max_at: string | null;
          promised_eta_min_at: string | null;
          qr_code_id: string | null;
          quote_id: string | null;
          scheduled_for: string | null;
          subtotal_cents: number;
          tax_cents: number;
          tip_cents: number;
          total_cents: number;
          track_expires_at: string | null;
          track_token_hash: string;
          undeliverable_resolution: Database["public"]["Enums"]["undeliverable_resolution"] | null;
          updated_at: string;
          zone_id: string;
        };
        Insert: {
          accept_deadline_at?: string | null;
          amount_captured_cents?: number;
          amount_refunded_cents?: number;
          arriving_announced_at?: string | null;
          beach_id: string;
          campaign_id?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: Database["public"]["Enums"]["actor_type"] | null;
          cash_collected_cents?: number;
          client_idempotency_key: string;
          collected_by_runner_id?: string | null;
          contact_attempts?: number;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          currency?: string;
          customer_description?: string | null;
          customer_id?: string | null;
          customization_cents?: number;
          delivered_at?: string | null;
          delivery_code?: string;
          delivery_fee_cents?: number;
          delivery_note?: string | null;
          delivery_photo_url?: string | null;
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"];
          id?: string;
          landmark_text?: string | null;
          order_number?: number;
          partner_id?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          placed_at?: string;
          prep_point_id?: string | null;
          prep_ready_at?: string | null;
          prep_started_at?: string | null;
          prep_status?: Database["public"]["Enums"]["prep_status"];
          promised_eta_max_at?: string | null;
          promised_eta_min_at?: string | null;
          qr_code_id?: string | null;
          quote_id?: string | null;
          scheduled_for?: string | null;
          subtotal_cents?: number;
          tax_cents?: number;
          tip_cents?: number;
          total_cents?: number;
          track_expires_at?: string | null;
          track_token_hash: string;
          undeliverable_resolution?: Database["public"]["Enums"]["undeliverable_resolution"] | null;
          updated_at?: string;
          zone_id: string;
        };
        Update: {
          accept_deadline_at?: string | null;
          amount_captured_cents?: number;
          amount_refunded_cents?: number;
          arriving_announced_at?: string | null;
          beach_id?: string;
          campaign_id?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: Database["public"]["Enums"]["actor_type"] | null;
          cash_collected_cents?: number;
          client_idempotency_key?: string;
          collected_by_runner_id?: string | null;
          contact_attempts?: number;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          currency?: string;
          customer_description?: string | null;
          customer_id?: string | null;
          customization_cents?: number;
          delivered_at?: string | null;
          delivery_code?: string;
          delivery_fee_cents?: number;
          delivery_note?: string | null;
          delivery_photo_url?: string | null;
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"];
          id?: string;
          landmark_text?: string | null;
          order_number?: number;
          partner_id?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          placed_at?: string;
          prep_point_id?: string | null;
          prep_ready_at?: string | null;
          prep_started_at?: string | null;
          prep_status?: Database["public"]["Enums"]["prep_status"];
          promised_eta_max_at?: string | null;
          promised_eta_min_at?: string | null;
          qr_code_id?: string | null;
          quote_id?: string | null;
          scheduled_for?: string | null;
          subtotal_cents?: number;
          tax_cents?: number;
          tip_cents?: number;
          total_cents?: number;
          track_expires_at?: string | null;
          track_token_hash?: string;
          undeliverable_resolution?: Database["public"]["Enums"]["undeliverable_resolution"] | null;
          updated_at?: string;
          zone_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_beach_id_fkey";
            columns: ["beach_id"];
            isOneToOne: false;
            referencedRelation: "beaches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_campaign_fk";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_collected_by_runner_fk";
            columns: ["collected_by_runner_id"];
            isOneToOne: false;
            referencedRelation: "runners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_partner_fk";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_prep_point_id_fkey";
            columns: ["prep_point_id"];
            isOneToOne: false;
            referencedRelation: "prep_points";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_qr_code_fk";
            columns: ["qr_code_id"];
            isOneToOne: false;
            referencedRelation: "qr_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_users: {
        Row: {
          partner_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          partner_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          partner_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_users_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_users_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      partners: {
        Row: {
          beach_id: string | null;
          commission_rate_bps: number;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          id: string;
          name: string;
          status: Database["public"]["Enums"]["partner_status"];
          type: Database["public"]["Enums"]["partner_type"];
        };
        Insert: {
          beach_id?: string | null;
          commission_rate_bps?: number;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          status?: Database["public"]["Enums"]["partner_status"];
          type: Database["public"]["Enums"]["partner_type"];
        };
        Update: {
          beach_id?: string | null;
          commission_rate_bps?: number;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          status?: Database["public"]["Enums"]["partner_status"];
          type?: Database["public"]["Enums"]["partner_type"];
        };
        Relationships: [
          {
            foreignKeyName: "partners_beach_id_fkey";
            columns: ["beach_id"];
            isOneToOne: false;
            referencedRelation: "beaches";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          environment: string;
          id: string;
          order_id: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_capture_id: string | null;
          provider_ref: string | null;
          raw: NonNullable<Json>;
          settled_at: string | null;
          status: Database["public"]["Enums"]["payment_record_status"];
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          environment: string;
          id?: string;
          order_id: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_capture_id?: string | null;
          provider_ref?: string | null;
          raw?: NonNullable<Json>;
          settled_at?: string | null;
          status?: Database["public"]["Enums"]["payment_record_status"];
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          environment?: string;
          id?: string;
          order_id?: string;
          provider?: Database["public"]["Enums"]["payment_provider"];
          provider_capture_id?: string | null;
          provider_ref?: string | null;
          raw?: NonNullable<Json>;
          settled_at?: string | null;
          status?: Database["public"]["Enums"]["payment_record_status"];
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_at_risk";
            referencedColumns: ["order_id"];
          },
        ];
      };
      prep_points: {
        Row: {
          active: boolean;
          beach_id: string;
          created_at: string;
          id: string;
          location: unknown;
          name: string;
        };
        Insert: {
          active?: boolean;
          beach_id: string;
          created_at?: string;
          id?: string;
          location: unknown;
          name: string;
        };
        Update: {
          active?: boolean;
          beach_id?: string;
          created_at?: string;
          id?: string;
          location?: unknown;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prep_points_beach_id_fkey";
            columns: ["beach_id"];
            isOneToOne: false;
            referencedRelation: "beaches";
            referencedColumns: ["id"];
          },
        ];
      };
      product_availability: {
        Row: {
          active: boolean;
          beach_id: string | null;
          id: string;
          price_override_cents: number | null;
          product_id: string;
          zone_id: string | null;
        };
        Insert: {
          active?: boolean;
          beach_id?: string | null;
          id?: string;
          price_override_cents?: number | null;
          product_id: string;
          zone_id?: string | null;
        };
        Update: {
          active?: boolean;
          beach_id?: string | null;
          id?: string;
          price_override_cents?: number | null;
          product_id?: string;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_availability_beach_id_fkey";
            columns: ["beach_id"];
            isOneToOne: false;
            referencedRelation: "beaches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_availability_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_availability_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      product_customization_groups: {
        Row: {
          group_id: string;
          product_id: string;
          required: boolean;
          sort_order: number;
        };
        Insert: {
          group_id: string;
          product_id: string;
          required?: boolean;
          sort_order?: number;
        };
        Update: {
          group_id?: string;
          product_id?: string;
          required?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_customization_groups_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "customization_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_customization_groups_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          base_price_cents: number;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          image: string | null;
          name: string;
          sku: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          active?: boolean;
          base_price_cents: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          image?: string | null;
          name: string;
          sku: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          active?: boolean;
          base_price_cents?: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          image?: string | null;
          name?: string;
          sku?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      qr_codes: {
        Row: {
          active: boolean;
          beach_id: string | null;
          campaign_id: string | null;
          code: string;
          created_at: string;
          id: string;
          partner_id: string | null;
          placement_label: string | null;
        };
        Insert: {
          active?: boolean;
          beach_id?: string | null;
          campaign_id?: string | null;
          code: string;
          created_at?: string;
          id?: string;
          partner_id?: string | null;
          placement_label?: string | null;
        };
        Update: {
          active?: boolean;
          beach_id?: string | null;
          campaign_id?: string | null;
          code?: string;
          created_at?: string;
          id?: string;
          partner_id?: string | null;
          placement_label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "qr_codes_beach_id_fkey";
            columns: ["beach_id"];
            isOneToOne: false;
            referencedRelation: "beaches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_codes_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_codes_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          created_at: string;
          currency: string;
          expires_at: string;
          id: string;
          payload: NonNullable<Json>;
          total_cents: number;
          zone_id: string | null;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          expires_at: string;
          id?: string;
          payload: NonNullable<Json>;
          total_cents: number;
          zone_id?: string | null;
        };
        Update: {
          created_at?: string;
          currency?: string;
          expires_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          total_cents?: number;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      refunds: {
        Row: {
          actor_user_id: string | null;
          amount_cents: number;
          created_at: string;
          id: string;
          payment_id: string;
          provider_refund_id: string | null;
          reason: string | null;
          status: Database["public"]["Enums"]["refund_status"];
        };
        Insert: {
          actor_user_id?: string | null;
          amount_cents: number;
          created_at?: string;
          id?: string;
          payment_id: string;
          provider_refund_id?: string | null;
          reason?: string | null;
          status?: Database["public"]["Enums"]["refund_status"];
        };
        Update: {
          actor_user_id?: string | null;
          amount_cents?: number;
          created_at?: string;
          id?: string;
          payment_id?: string;
          provider_refund_id?: string | null;
          reason?: string | null;
          status?: Database["public"]["Enums"]["refund_status"];
        };
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      regions: {
        Row: {
          country_id: string;
          created_at: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          country_id: string;
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          country_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "regions_country_id_fkey";
            columns: ["country_id"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          order_id: string;
          photo_url: string | null;
          published: boolean;
          rating: number;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          order_id: string;
          photo_url?: string | null;
          published?: boolean;
          rating: number;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          order_id?: string;
          photo_url?: string | null;
          published?: boolean;
          rating?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders_at_risk";
            referencedColumns: ["order_id"];
          },
        ];
      };
      runner_locations: {
        Row: {
          accuracy_m: number | null;
          assignment_id: string;
          captured_at: string;
          id: string;
          point: unknown;
          runner_id: string;
        };
        Insert: {
          accuracy_m?: number | null;
          assignment_id: string;
          captured_at?: string;
          id?: string;
          point: unknown;
          runner_id: string;
        };
        Update: {
          accuracy_m?: number | null;
          assignment_id?: string;
          captured_at?: string;
          id?: string;
          point?: unknown;
          runner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "runner_locations_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "order_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runner_locations_runner_id_fkey";
            columns: ["runner_id"];
            isOneToOne: false;
            referencedRelation: "runners";
            referencedColumns: ["id"];
          },
        ];
      };
      runners: {
        Row: {
          active: boolean;
          created_at: string;
          device_last_seen_at: string | null;
          home_beach_id: string | null;
          id: string;
          max_concurrent_orders: number;
          name: string;
          phone: string | null;
          shift_status: Database["public"]["Enums"]["runner_shift_status"];
          user_id: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          device_last_seen_at?: string | null;
          home_beach_id?: string | null;
          id?: string;
          max_concurrent_orders?: number;
          name: string;
          phone?: string | null;
          shift_status?: Database["public"]["Enums"]["runner_shift_status"];
          user_id?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          device_last_seen_at?: string | null;
          home_beach_id?: string | null;
          id?: string;
          max_concurrent_orders?: number;
          name?: string;
          phone?: string | null;
          shift_status?: Database["public"]["Enums"]["runner_shift_status"];
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "runners_home_beach_id_fkey";
            columns: ["home_beach_id"];
            isOneToOne: false;
            referencedRelation: "beaches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runners_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      shift_cash: {
        Row: {
          collected_cents: number;
          currency: string;
          dropped_cents: number;
          float_start_cents: number;
          shift_id: string;
          updated_at: string;
        };
        Insert: {
          collected_cents?: number;
          currency?: string;
          dropped_cents?: number;
          float_start_cents?: number;
          shift_id: string;
          updated_at?: string;
        };
        Update: {
          collected_cents?: number;
          currency?: string;
          dropped_cents?: number;
          float_start_cents?: number;
          shift_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shift_cash_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: true;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      shifts: {
        Row: {
          beach_id: string;
          end_requested_at: string | null;
          ended_at: string | null;
          id: string;
          runner_id: string;
          started_at: string;
          zone_id: string | null;
        };
        Insert: {
          beach_id: string;
          end_requested_at?: string | null;
          ended_at?: string | null;
          id?: string;
          runner_id: string;
          started_at?: string;
          zone_id?: string | null;
        };
        Update: {
          beach_id?: string;
          end_requested_at?: string | null;
          ended_at?: string | null;
          id?: string;
          runner_id?: string;
          started_at?: string;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shifts_beach_id_fkey";
            columns: ["beach_id"];
            isOneToOne: false;
            referencedRelation: "beaches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shifts_runner_id_fkey";
            columns: ["runner_id"];
            isOneToOne: false;
            referencedRelation: "runners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shifts_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          error: string | null;
          id: string;
          payload: NonNullable<Json>;
          processed_at: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_event_id: string;
          received_at: string;
          type: string;
        };
        Insert: {
          error?: string | null;
          id?: string;
          payload: NonNullable<Json>;
          processed_at?: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_event_id: string;
          received_at?: string;
          type: string;
        };
        Update: {
          error?: string | null;
          id?: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          provider?: Database["public"]["Enums"]["payment_provider"];
          provider_event_id?: string;
          received_at?: string;
          type?: string;
        };
        Relationships: [];
      };
      zone_demand_requests: {
        Row: {
          accuracy_m: number | null;
          created_at: string;
          email: string | null;
          guessed_location_label: string | null;
          id: string;
          point: unknown;
          user_agent: string | null;
        };
        Insert: {
          accuracy_m?: number | null;
          created_at?: string;
          email?: string | null;
          guessed_location_label?: string | null;
          id?: string;
          point?: unknown;
          user_agent?: string | null;
        };
        Update: {
          accuracy_m?: number | null;
          created_at?: string;
          email?: string | null;
          guessed_location_label?: string | null;
          id?: string;
          point?: unknown;
          user_agent?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      orders_at_risk: {
        Row: {
          beach_id: string | null;
          device_last_seen_at: string | null;
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"] | null;
          order_id: string | null;
          order_number: number | null;
          risk_reason: string | null;
          runner_id: string | null;
          zone_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_assignments_runner_id_fkey";
            columns: ["runner_id"];
            isOneToOne: false;
            referencedRelation: "runners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_beach_id_fkey";
            columns: ["beach_id"];
            isOneToOne: false;
            referencedRelation: "beaches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      runner_locations_geo: {
        Row: {
          accuracy_m: number | null;
          assignment_id: string | null;
          captured_at: string | null;
          id: string | null;
          lat: number | null;
          lng: number | null;
          runner_id: string | null;
        };
        Insert: {
          accuracy_m?: number | null;
          assignment_id?: string | null;
          captured_at?: string | null;
          id?: string | null;
          lat?: never;
          lng?: never;
          runner_id?: string | null;
        };
        Update: {
          accuracy_m?: number | null;
          assignment_id?: string | null;
          captured_at?: string | null;
          id?: string | null;
          lat?: never;
          lng?: never;
          runner_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "runner_locations_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "order_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runner_locations_runner_id_fkey";
            columns: ["runner_id"];
            isOneToOne: false;
            referencedRelation: "runners";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      accept_order_offer: {
        Args: { p_offer_id: string; p_runner_id: string };
        Returns: Database["public"]["Enums"]["accept_offer_result"];
      };
      beach_lnglat: {
        Args: { p_beach_id: string };
        Returns: {
          lat: number;
          lng: number;
        }[];
      };
      current_app_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      current_runner_id: { Args: Record<PropertyKey, never>; Returns: string };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      nearest_prep_point_distance_m: {
        Args: { p_beach_id: string; p_lat: number; p_lng: number };
        Returns: number;
      };
      promote_scheduled_orders: { Args: Record<PropertyKey, never>; Returns: string[] };
      runner_distance_to_point: {
        Args: { p_lat: number; p_lng: number; p_max_age_s?: number; p_runner_id: string };
        Returns: number;
      };
      truncate_stale_order_locations: { Args: Record<PropertyKey, never>; Returns: number };
      zones_covering_point: {
        Args: { p_lat: number; p_lng: number };
        Returns: {
          access_notes: string | null;
          active: boolean;
          beach_id: string;
          created_at: string;
          delivery_fee_cents: number;
          eta_max_minutes: number;
          eta_min_minutes: number;
          id: string;
          name: string;
          operating_hours: NonNullable<Json>;
          pause_reason: string | null;
          pause_until: string | null;
          polygon: unknown;
          priority: number;
          requires_property_permission: boolean;
          route_factor: number;
          service_status: Database["public"]["Enums"]["zone_service_status"];
        }[];
        SetofOptions: {
          from: "*";
          to: "delivery_zones";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      zones_near_point: {
        Args: { p_lat: number; p_lng: number; p_meters: number };
        Returns: {
          access_notes: string | null;
          active: boolean;
          beach_id: string;
          created_at: string;
          delivery_fee_cents: number;
          eta_max_minutes: number;
          eta_min_minutes: number;
          id: string;
          name: string;
          operating_hours: NonNullable<Json>;
          pause_reason: string | null;
          pause_until: string | null;
          polygon: unknown;
          priority: number;
          requires_property_permission: boolean;
          route_factor: number;
          service_status: Database["public"]["Enums"]["zone_service_status"];
        }[];
        SetofOptions: {
          from: "*";
          to: "delivery_zones";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      accept_offer_result:
        | "ACCEPTED"
        | "OFFER_NOT_FOUND"
        | "OFFER_ALREADY_RESOLVED"
        | "OFFER_EXPIRED"
        | "ORDER_NOT_AWAITING_RUNNER"
        | "RUNNER_AT_CAPACITY"
        | "LOST_RACE";
      actor_type: "CUSTOMER" | "OPS" | "RUNNER" | "SYSTEM";
      app_role: "ADMIN" | "OPS" | "RUNNER" | "PARTNER";
      assignment_release_reason:
        | "COMPLETED"
        | "RUNNER_DROPPED"
        | "OPS_REASSIGNED"
        | "ORDER_CANCELLED"
        | "STALE";
      customization_input_type: "TEXT" | "SELECT" | "MULTISELECT" | "BOOLEAN";
      fulfillment_status:
        | "PLACED"
        | "AWAITING_RUNNER"
        | "ASSIGNED"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "UNDELIVERABLE"
        | "CANCELLED"
        | "EXPIRED";
      location_source: "CHECKOUT" | "CUSTOMER_MOVED" | "OPS_CORRECTED";
      notification_channel: "EMAIL" | "SMS" | "WHATSAPP" | "PUSH";
      offer_response: "ACCEPTED" | "DECLINED" | "EXPIRED";
      partner_status: "PROSPECT" | "ACTIVE" | "PAUSED" | "ENDED";
      partner_type: "HOTEL" | "RESORT" | "TOUR_OPERATOR" | "RESTAURANT" | "EVENT_PLANNER" | "OTHER";
      payment_provider: "paypal" | "stripe" | "cash" | "mock";
      payment_record_status:
        | "INITIATED"
        | "PENDING"
        | "CAPTURED"
        | "FAILED"
        | "CANCELLED"
        | "ABANDONED";
      payment_status:
        | "UNPAID"
        | "AUTHORIZED"
        | "CAPTURED"
        | "PARTIALLY_REFUNDED"
        | "REFUNDED"
        | "FAILED"
        | "VOIDED"
        | "CASH_DUE"
        | "CASH_COLLECTED";
      prep_status: "NOT_STARTED" | "IN_PROGRESS" | "READY" | "FAILED";
      refund_status: "PENDING" | "SUCCEEDED" | "FAILED";
      runner_shift_status: "OFF_SHIFT" | "AVAILABLE" | "BUSY" | "ON_BREAK";
      undeliverable_resolution: "RETRIED" | "REFUNDED" | "FORFEITED" | "DISPOSED";
      zone_service_status: "OPEN" | "PAUSED" | "CLOSED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      accept_offer_result: [
        "ACCEPTED",
        "OFFER_NOT_FOUND",
        "OFFER_ALREADY_RESOLVED",
        "OFFER_EXPIRED",
        "ORDER_NOT_AWAITING_RUNNER",
        "RUNNER_AT_CAPACITY",
        "LOST_RACE",
      ],
      actor_type: ["CUSTOMER", "OPS", "RUNNER", "SYSTEM"],
      app_role: ["ADMIN", "OPS", "RUNNER", "PARTNER"],
      assignment_release_reason: [
        "COMPLETED",
        "RUNNER_DROPPED",
        "OPS_REASSIGNED",
        "ORDER_CANCELLED",
        "STALE",
      ],
      customization_input_type: ["TEXT", "SELECT", "MULTISELECT", "BOOLEAN"],
      fulfillment_status: [
        "PLACED",
        "AWAITING_RUNNER",
        "ASSIGNED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "UNDELIVERABLE",
        "CANCELLED",
        "EXPIRED",
      ],
      location_source: ["CHECKOUT", "CUSTOMER_MOVED", "OPS_CORRECTED"],
      notification_channel: ["EMAIL", "SMS", "WHATSAPP", "PUSH"],
      offer_response: ["ACCEPTED", "DECLINED", "EXPIRED"],
      partner_status: ["PROSPECT", "ACTIVE", "PAUSED", "ENDED"],
      partner_type: ["HOTEL", "RESORT", "TOUR_OPERATOR", "RESTAURANT", "EVENT_PLANNER", "OTHER"],
      payment_provider: ["paypal", "stripe", "cash", "mock"],
      payment_record_status: [
        "INITIATED",
        "PENDING",
        "CAPTURED",
        "FAILED",
        "CANCELLED",
        "ABANDONED",
      ],
      payment_status: [
        "UNPAID",
        "AUTHORIZED",
        "CAPTURED",
        "PARTIALLY_REFUNDED",
        "REFUNDED",
        "FAILED",
        "VOIDED",
        "CASH_DUE",
        "CASH_COLLECTED",
      ],
      prep_status: ["NOT_STARTED", "IN_PROGRESS", "READY", "FAILED"],
      refund_status: ["PENDING", "SUCCEEDED", "FAILED"],
      runner_shift_status: ["OFF_SHIFT", "AVAILABLE", "BUSY", "ON_BREAK"],
      undeliverable_resolution: ["RETRIED", "REFUNDED", "FORFEITED", "DISPOSED"],
      zone_service_status: ["OPEN", "PAUSED", "CLOSED"],
    },
  },
} as const;
