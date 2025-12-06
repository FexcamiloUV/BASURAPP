export interface UserProfile {
    id: string;
  email: string;
  name: string;
  password?: string;
  role: 'admin' | 'conductor';
  is_active: boolean;
  last_login?: string;
  created_at: string;
}
