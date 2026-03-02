export type Routine = {
  id: number;
  section: string;
  time: string;
  activity: string;
  duration: string;
  notes: string;
};

export const routineData: Routine[] = [
  // 🏠 HOME DAYS (Feb 18–23)
  { id: 1, section: "Home", time: "7:00 AM", activity: "Wake up, fresh up", duration: "30 mins", notes: "No snooze" },
  { id: 2, section: "Home", time: "7:30 AM", activity: "Light exercise", duration: "15 mins", notes: "Stretching" },
  { id: 3, section: "Home", time: "7:45 AM", activity: "Breakfast", duration: "15 mins", notes: "Energy meal" },
  { id: 4, section: "Home", time: "8:00 AM", activity: "🔥 CODING SESSION 1", duration: "3 hours", notes: "React learning" },
  { id: 5, section: "Home", time: "11:00 AM", activity: "Break", duration: "15 mins", notes: "Walk" },
  { id: 6, section: "Home", time: "11:15 AM", activity: "🔥 CODING SESSION 2", duration: "1.75 hours", notes: "Practice" },
  { id: 7, section: "Home", time: "1:00 PM", activity: "Lunch", duration: "45 mins", notes: "Rest" },
  { id: 8, section: "Home", time: "2:00 PM", activity: "College study", duration: "1.5 hours", notes: "Assignments" },
  { id: 9, section: "Home", time: "4:00 PM", activity: "🔥 CODING SESSION 3", duration: "2 hours", notes: "Project work" },
  { id: 10, section: "Home", time: "6:30 PM", activity: "🔥 CODING SESSION 4", duration: "2 hours", notes: "Push limits" },
  { id: 11, section: "Home", time: "10:30 PM", activity: "😴 Sleep", duration: "8.5 hours", notes: "Recovery" },
  

  // 🏨 HOSTEL NO CLASS
  { id: 12, section: "Hostel - No Class", time: "7:00 AM", activity: "Wake up", duration: "45 mins", notes: "Queue bathroom" },
  { id: 13, section: "Hostel - No Class", time: "8:30 AM", activity: "🔥 CODING SESSION 1 (Library)", duration: "3 hours", notes: "Quiet focus" },
  { id: 14, section: "Hostel - No Class", time: "11:45 AM", activity: "🔥 CODING SESSION 2", duration: "2 hours", notes: "Continue building" },
  { id: 15, section: "Hostel - No Class", time: "4:00 PM", activity: "🔥 CODING SESSION 3", duration: "2.5 hours", notes: "Lab coding" },
  { id: 16, section: "Hostel - No Class", time: "7:00 PM", activity: "🔥 CODING SESSION 4", duration: "2 hours", notes: "Final push" },
  { id: 17, section: "Hostel - No Class", time: "11:00 PM", activity: "😴 Sleep", duration: "8 hours", notes: "Protect sleep" },

  // 🎓 HOSTEL WITH CLASS
  { id: 18, section: "Hostel - With Class", time: "7:00 AM", activity: "Wake up", duration: "45 mins", notes: "Morning rush" },
  { id: 19, section: "Hostel - With Class", time: "8:30 AM", activity: "📚 Classes", duration: "7.5 hours", notes: "8:30 AM - 4 PM" },
  { id: 20, section: "Hostel - With Class", time: "5:15 PM", activity: "🔥 CODING SESSION 1 (Library)", duration: "2.5 hours", notes: "Focus time" },
  { id: 21, section: "Hostel - With Class", time: "8:45 PM", activity: "🔥 CODING SESSION 2", duration: "2 hours", notes: "Night coding" },
  { id: 22, section: "Hostel - With Class", time: "11:30 PM", activity: "😴 Sleep", duration: "7.5 hours", notes: "Protect sleep" }
];