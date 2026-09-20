export interface CompletedDate {
  date: string;
  completedBy?: string;
  completedByUsername?: string;
  completedAt?: string;
}

export interface Routine {
  _id: string;
  section: string;
  time: string;
  activity: string;
  duration: string;
  notes: string;
  ownerUsername?: string;
  ownerId?: string;
  isShared?: boolean;
  sharedWith?: string[];
  sharedWithUsernames?: string[];
  completedDates?: CompletedDate[];
}