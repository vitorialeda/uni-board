export type Topic = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
};

export type Evaluation = {
  id: string;
  title: string;
  date: string | null;
  grade: number | null;
  maxGrade: number;
  completed: boolean;
};

export type Schedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type DisciplineDetails = {
  id: string;
  name: string;
  description: string | null;
  references: string | null;
  topics: Topic[];
  evaluations: Evaluation[];
  schedules: Schedule[];
};

export type DisciplineUpdateResponse = {
  id: string;
  name: string;
  description: string | null;
  references: string | null;
  schedules: Schedule[];
};
