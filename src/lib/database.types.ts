// Minimale, handgeschreven types voor V1.
// Bij echte deploy: regenereer via `supabase gen types typescript --project-id ... > database.types.ts`.

export type Role = "coach" | "member";
export type Protocol = "frontline" | "backline" | "rotation" | "lateral" | "recovery";
export type CheckinCadence = "daily" | "weekly";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  phone: string | null;
  checkin_cadence: CheckinCadence;
  program_start_date: string | null;
  program_end_date: string | null;
  sportbit_member_id: string | null;
  created_at: string;
};

export type Exercise = {
  id: string;
  protocol: Protocol;
  hierarchy_level: number;
  title: string;
  description: string | null;
  bunny_video_id: string | null;
  test_instructions: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type HomeworkAssignment = {
  id: string;
  member_id: string;
  assigned_by: string | null;
  notes: string | null;
  is_active: boolean;
  assigned_at: string;
};

export type HomeworkExercise = {
  assignment_id: string;
  exercise_id: string;
  position: number;
  coach_notes: string | null;
};

export type ExerciseCompletion = {
  id: string;
  member_id: string;
  exercise_id: string;
  completed_at: string;
};

export type Checkin = {
  id: string;
  member_id: string;
  for_date: string;
  complaint_severity: number | null;
  energy: number | null;
  soreness: number | null;
  fatigue: number | null;
  note: string | null;
  created_at: string;
};

export type EvaluationSlot = {
  id: string;
  coach_id: string;
  starts_at: string;
  ends_at: string;
  is_published: boolean;
  created_at: string;
};

export type EvaluationBooking = {
  id: string;
  slot_id: string;
  member_id: string;
  booked_at: string;
};

export type Evaluation = {
  id: string;
  member_id: string;
  coach_id: string;
  booking_id: string | null;
  conducted_at: string | null;
  report_text: string | null;
  published_at: string | null;
  created_at: string;
};

export type EvaluationMedia = {
  id: string;
  evaluation_id: string;
  storage_path: string;
  kind: "photo" | "video";
  uploaded_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
};

// V1: losse Database-type zodat we niet vastlopen op Supabase's strikte generics
// op alle .insert / .update / .upsert calls. Sterke types via `supabase gen types
// typescript` zodra het Supabase-project draait — verving deze ook.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
