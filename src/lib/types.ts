export type Role = 'member' | 'teen' | 'gabbai' | 'admin';

export interface Member {
  id: string;
  auth_user_id: string;
  phone: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: Role;
  is_teen: boolean;
  neighborhood: string | null;
  date_of_birth: string | null;
  member_since_hebrew_year: string | null;
  active: boolean;
  can_be_called: boolean;
  needs_ride_default: boolean;
  offers_ride_default: boolean;
  ride_capacity: number;
  notif_commit_reminder: boolean;
  notif_red_alert: boolean;
  notif_ride_request: boolean;
  notif_rewards: boolean;
}

export type MinyanType = 'shacharit' | 'mincha_maariv';

export interface Minyan {
  id: string;
  service_date: string;
  minyan_type: MinyanType;
  start_time: string;
  display_time: string;
  hebrew_date: string | null;
  is_shabbat_or_yomtov: boolean;
  yomtov_name: string | null;
  threshold: number;
  notes: string | null;
}

export interface UpcomingMinyan extends Minyan {
  yes_count: number;
  maybe_count: number;
  no_count: number;
  needs_ride_count: number;
  has_dedication: boolean;
  dedication: Dedication | null;
}

export interface Dedication {
  id: string;
  minyan_id: string | null;
  dedication_type: 'memory' | 'honor' | 'refuah' | 'anniversary' | 'other';
  dedication_text: string;
  sponsor_display_name: string | null;
  is_yahrzeit: boolean;
  hebrew_date: string | null;
}

export type CommitStatus = 'yes' | 'no' | 'maybe';

export interface Commitment {
  id: string;
  member_id: string;
  minyan_id: string;
  status: CommitStatus;
  needs_ride: boolean;
  responded_at: string;
}

export interface Attendance {
  id: string;
  member_id: string;
  minyan_id: string;
  checked_in_at: string;
  checked_in_by: 'self' | 'gabbai';
  points_awarded: number;
  was_rescue: boolean;
  was_sponsored_minyan: boolean;
}

export interface RewardsConfig {
  points_per_minyan: number;
  points_per_sponsored_bonus: number;
  points_per_rescue: number;
  points_per_streak_7: number;
  points_per_streak_30: number;
  point_to_cents: number;
  monthly_prize_1_cents: number;
  monthly_prize_2_cents: number;
  monthly_prize_3_cents: number;
  quarterly_prize_cents: number;
  streak_30_bonus_cents: number;
  min_redemption_points: number;
}

export interface PoolState {
  balance_cents: number;
  total_sponsors: number;
  total_contributed_cents: number;
  total_paid_out_cents: number;
}

export interface LeaderboardRow {
  id: string;
  first_name: string;
  last_name: string;
  points_this_month: number;
  minyanim_this_month: number;
}
