export type Role =
  | 'citizen'
  | 'inspector'
  | 'district'
  | 'hq'
  | 'contractor'
  | 'vendor'
  | 'instructor';
export type Permission =
  | 'submit'
  | 'case'
  | 'weights'
  | 'checkout'
  | 'eventAttendance'
  | 'redeemCoupon'
  | 'product'
  | 'settle'
  | 'course'
  | 'attendance'
  | 'survey'
  | 'integration';
export type User = { id: Role; name: string; role: Role; district: string };
export type Status =
  | 'new'
  | 'review'
  | 'assigned'
  | 'progress'
  | 'inspection'
  | 'rework'
  | 'approved'
  | 'rejected'
  | 'merged';
export type Revision = {
  id: string;
  district: string;
  at: string;
  weights: [number, number, number];
};
export type Score = { revision: Revision; values: [number, number, number] };
export type Project = {
  worker: Role;
  inspector: Role;
  method: 'internal' | 'direct' | 'tender' | 'volunteer';
  price: number;
};
export type Inspection = {
  quality: number;
  checklist: string;
  location: string;
  at: string;
  photo: string;
};
export type Attachment = { name: string; data: string };
export type MediaRef = { id: string; mime: string; name: string; size: number };
export type CivicCase = {
  id: string;
  kind: 'report' | 'idea';
  title: string;
  category: string;
  district: string;
  owner: Role;
  description: string;
  location: string;
  date: string;
  photo: string;
  status: Status;
  media?: MediaRef;
  volunteer?: {
    reward: number;
    task?: string;
    proof?: { media: MediaRef; note: string };
  };
  score?: Score;
  project?: Project;
  inspections: Inspection[];
  mergedInto?: string;
  votes: Role[];
  confirmed: boolean;
  evidence: string[];
  events: {
    at: string;
    status: Status;
    note: string;
    by: Role;
    document?: Attachment;
  }[];
};
export type Transaction = {
  key: string;
  owner: Role;
  amount: number;
  rate: number;
  at: string;
  label: string;
};
export type CouponKind = 'parking' | 'shahrvand';
export type Product = {
  id: string;
  name: string;
  kind: 'digital' | 'physical';
  icon: string;
  price: number;
  stock: number;
  vendor: Role;
  district: string;
  topup?: number;
  coupon?: CouponKind;
};
export type Order = {
  id: string;
  buyer: Role;
  lines: { product: Product; quantity: number }[];
  cara: number;
  toman: number;
  rate: number;
  at: string;
  settledAt?: string;
};
export type CouponUse = { couponId: string; location: string; at: string };
export type EventAttendance = {
  event: string;
  citizen: Role;
  approvedAt?: string;
};
export type Course = {
  id: string;
  title: string;
  mode: 'online' | 'local';
  instructor: Role;
  district: string;
  venue: string;
  date: string;
  code: string;
  reward: number;
  lesson: string;
};
export type Attendance = {
  course: string;
  user: Role;
  attended: boolean;
  approved: boolean;
  passed: boolean;
};
export type CivicActivity =
  | 'reportValidated'
  | 'ideaApproved'
  | 'caseVoted'
  | 'qualityConfirmed'
  | 'courseCompleted'
  | 'surveyAnswered'
  | 'eventAttended'
  | 'issueSolved';
export type ProgressEntry = {
  citizen: Role;
  event: CivicActivity | 'weeklyQuest' | 'civicMission';
  source: string;
  xp: number;
  at: string;
  day: string;
};
export type State = {
  cases: CivicCase[];
  revisions: Revision[];
  ledger: Transaction[];
  products: Product[];
  orders: Order[];
  courses: Course[];
  attendance: Attendance[];
  rate: number;
  couponsUsed?: CouponUse[];
  eventAttendance?: EventAttendance[];
  categories: string[];
  fraud: { id: string; note: string; reviewed: boolean }[];
  imports: string[];
  disabled: Role[];
  blocked?: Partial<Record<Role, Permission[]>>;
  progression?: { entries: ProgressEntry[]; rankingOptIn: boolean };
  survey?: { answer: string; at: string };
};
