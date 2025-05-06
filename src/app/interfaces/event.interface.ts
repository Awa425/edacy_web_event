export interface Event {
  id?: number;
  title: string;
  description: string;
  start: string;
  end: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
}
