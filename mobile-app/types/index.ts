export type MemberStatus = 'pending' | 'active' | 'suspended' | 'rejected';
export type Gender = 'male' | 'female' | 'other';
export type EventStatus = 'draft' | 'published' | 'closed' | 'cancelled';
export type NewsStatus = 'draft' | 'published' | 'archived';
export type ApplicationStatus = 'applied' | 'cancelled';

export interface User {
  id: string;
  email: string;
  full_name: string;
  profile_image_url?: string;
  gender?: Gender;
  birth_date?: string;
  company_name?: string;
  district?: string;
  status_id: string;
  expo_push_token?: string;
  terms_agreed: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberStatus {
  id: string;
  name: string;
  description?: string;
}

export type CircleCategory = 'district' | 'club';

export interface Circle {
  id: string;
  name: string;
  category: CircleCategory;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface News {
  id: string;
  title: string;
  body: string;
  thumbnail_url?: string;
  status_id: string;
  publish_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  body: string;
  thumbnail_url?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  capacity?: number;
  cancel_deadline?: string;
  status_id: string;
  publish_at?: string;
  allow_guest: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}


export interface EventApplication {
  id: string;
  event_id: string;
  user_id: string;
  status: ApplicationStatus;
  applied_at: string;
  cancelled_at?: string;
}

export interface GuestApplication {
  id: string;
  event_id: string;
  email: string;
  full_name: string;
  company_name?: string;
  job_title?: string;
  status: ApplicationStatus;
  applied_at: string;
  cancelled_at?: string;
}

export interface EventTag {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface EventWithApplication extends Event {
  hasApplied?: boolean;
  tags?: EventTag[];
}