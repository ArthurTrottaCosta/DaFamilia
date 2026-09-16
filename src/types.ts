export type Category = "Casa" | "Saúde" | "Serviços" | "Família" | "Outros";
export type Group = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};
export type Member = {
  group_id: string;
  user_id: string;
  display_name: string;
  role: "owner" | "admin" | "member";
};
export type Contact = {
  id: string;
  group_id: string;
  name: string;
  phone: string;
  category: Category;
  specialty: string;
  recommended_by: string;
  notes: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};
export type Appointment = {
  id: string;
  group_id: string;
  title: string;
  starts_at: string;
  contact_id: string | null;
  assigned_to: string | null;
  notes: string;
  created_by: string | null;
};
export type Interaction = {
  id: string;
  group_id: string;
  contact_id: string;
  note: string;
  amount: number | null;
  created_at: string;
  created_by: string | null;
};
export type Nudge = {
  id: string;
  group_id: string;
  contact_id: string;
  from_user: string;
  to_user: string;
  action: "call" | "whatsapp";
  seen_at: string | null;
  created_at: string;
};
export type Invite = {
  id: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};
export type FamilyData = {
  contacts: Contact[];
  members: Member[];
  appointments: Appointment[];
  interactions: Interaction[];
  nudges: Nudge[];
};
export type ContactInput = Pick<
  Contact,
  | "name"
  | "phone"
  | "category"
  | "specialty"
  | "recommended_by"
  | "notes"
  | "pinned"
>;
export const categories: Category[] = [
  "Casa",
  "Saúde",
  "Serviços",
  "Família",
  "Outros",
];
