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
