export type User = {
  id: number;
  google_id: string;
  email: string;
  name: string;
  picture: string;
};

export type Session = {
  id: string;
  user_id: number;
  expires_at: Date;
};

export interface ChapterIndexItem {
  chapter: number;
  title: string;
}

export type Conversation = {
  id: number;
  user_id: number;
  original_content: string;
  user_background: string;
  created_at: Date;
};

export type ChapterIndexItemDB = {
  id: number;
  conversation_id: number;
  chapter_number: number;
  title: string;
  generated_content: string | null;
};

export type Message = {
  id: number;
  conversation_id: number;
  sender: "user" | "ai";
  content: string;
  created_at: Date;
};
