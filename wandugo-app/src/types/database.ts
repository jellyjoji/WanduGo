export type PostCategory =
  | "jobs"
  | "community"
  | "marketplace"
  | "housing"
  | "events"
  | "tips"
  | "buy-sell"
  | "group-buy";

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: PostCategory;
          lat: number;
          lng: number;
          location_text: string;
          created_at: string;
          author_name: string;
          session_id: string;
          price: number | null;
          image_url: string | null;
          likes: number;
        };
        Insert: {
          title: string;
          content: string;
          category: PostCategory;
          lat: number;
          lng: number;
          location_text: string;
          author_name: string;
          session_id: string;
          price?: number | null;
          image_url?: string | null;
        };
        Update: {
          title?: string;
          content?: string;
          category?: PostCategory;
          lat?: number;
          lng?: number;
          location_text?: string;
          author_name?: string;
          session_id?: string;
          price?: number | null;
          image_url?: string | null;
          likes?: number;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          content: string;
          created_at: string;
          session_id: string;
          author_name: string;
        };
        Insert: {
          post_id: string;
          content: string;
          session_id: string;
          author_name: string;
        };
        Update: {
          content?: string;
          author_name?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          content: string;
          created_at: string;
          session_id: string;
          author_name: string;
          type: "text" | "image" | "location";
        };
        Insert: {
          chat_id: string;
          content: string;
          session_id: string;
          author_name: string;
          type: "text" | "image" | "location";
        };
        Update: {
          content?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          name: string | null;
          is_group: boolean;
          created_at: string;
          post_id: string | null;
        };
        Insert: {
          name?: string | null;
          is_group?: boolean;
          post_id?: string | null;
        };
        Update: {
          name?: string | null;
          is_group?: boolean;
        };
      };
      chat_members: {
        Row: {
          id: string;
          chat_id: string;
          session_id: string;
          author_name: string;
          joined_at: string;
        };
        Insert: {
          chat_id: string;
          session_id: string;
          author_name: string;
        };
        Update: {
          author_name?: string;
        };
      };
      profiles: {
        Row: {
          session_id: string;
          name: string;
          bio: string;
          photo_url: string | null;
          location_text: string;
          lat: number | null;
          lng: number | null;
          rating: number;
          created_at: string;
        };
        Insert: {
          session_id: string;
          name: string;
          bio: string;
          photo_url?: string | null;
          location_text: string;
          lat?: number | null;
          lng?: number | null;
        };
        Update: {
          name?: string;
          bio?: string;
          photo_url?: string | null;
          location_text?: string;
          lat?: number | null;
          lng?: number | null;
          rating?: number;
        };
      };
      notifications: {
        Row: {
          id: string;
          session_id: string;
          type: "comment" | "like" | "application" | "system";
          content: string;
          post_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          session_id: string;
          type: "comment" | "like" | "application" | "system";
          content: string;
          post_id?: string | null;
        };
        Update: {
          read?: boolean;
          content?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Chat = Database["public"]["Tables"]["chats"]["Row"];
export type ChatMember = Database["public"]["Tables"]["chat_members"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
