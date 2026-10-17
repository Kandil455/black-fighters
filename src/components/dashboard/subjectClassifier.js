import {
  Stethoscope,
  Pill,
  HeartPulse,
  Microscope,
  Brain,
  Dna,
  Activity,
  FlaskConical,
  Code2,
  Calculator,
  BookOpen,
  GraduationCap,
} from "lucide-react";

export const SUBJECT_META = {
  medicine: {
    key: "medicine",
    label: "باطنة وطب عام (Internal Medicine)",
    labelEn: "Internal Medicine",
    icon: Stethoscope,
  },
  pharmacology: {
    key: "pharmacology",
    label: "فارماكولوجي وأدوية (Pharmacology)",
    labelEn: "Pharmacology",
    icon: Pill,
  },
  cardiology: {
    key: "cardiology",
    label: "القلب والأوعية (Cardiology)",
    labelEn: "Cardiology",
    icon: HeartPulse,
  },
  pathology: {
    key: "pathology",
    label: "باثولوجي وأمراض (Pathology)",
    labelEn: "Pathology",
    icon: Microscope,
  },
  neurology: {
    key: "neurology",
    label: "مخ وأعصاب وفسيولوجي (Neuro & Physio)",
    labelEn: "Neurology & Physiology",
    icon: Brain,
  },
  biochemistry: {
    key: "biochemistry",
    label: "كيمياء حيوية وجينات (Biochemistry)",
    labelEn: "Biochemistry & Genetics",
    icon: Dna,
  },
  surgery: {
    key: "surgery",
    label: "جراحة وطوارئ (Surgery & ER)",
    labelEn: "Surgery & Emergency",
    icon: Activity,
  },
  microbiology: {
    key: "microbiology",
    label: "ميكروبيولوجي ومناعة (Microbiology)",
    labelEn: "Microbiology & Immunology",
    icon: FlaskConical,
  },
  cs: {
    key: "cs",
    label: "علوم حاسب وبرمجة (Computer Science)",
    labelEn: "Computer Science",
    icon: Code2,
  },
  math: {
    key: "math",
    label: "رياضيات وهندسة (Math & Engineering)",
    labelEn: "Math & Engineering",
    icon: Calculator,
  },
  general: {
    key: "general",
    label: "محاضرات ومقررات عامة",
    labelEn: "General Lectures",
    icon: GraduationCap,
  },
};

const KEYWORD_RULES = [
  {
    key: "pharmacology",
    regex: /pharma|drug|dose|aspirin|receptor|antibiotic|فارما|أدوية|دواء|علاج/i,
  },
  {
    key: "cardiology",
    regex: /cardio|heart|ecg|arrhythmia|hypertension|blood pressure|قلب|أوعية|ضغط الدم/i,
  },
  {
    key: "pathology",
    regex: /patho|tumor|cancer|inflammation|necrosis|باثولوجي|أورام|التهاب/i,
  },
  {
    key: "neurology",
    regex: /neuro|brain|nerve|synapse|physio|عصب|مخ|فسيولوجي/i,
  },
  {
    key: "biochemistry",
    regex: /biochem|enzyme|metabolism|dna|rna|protein|كيمياء|إنزيم|أحماض|جينات/i,
  },
  {
    key: "surgery",
    regex: /surg|trauma|fracture|emergency|anatom|جراح|طوارئ|تشريح|كسور/i,
  },
  {
    key: "microbiology",
    regex: /micro|bacteria|virus|fung|immun|بكتيريا|فيروس|مناعة|ميكرو/i,
  },
  {
    key: "medicine",
    regex: /medicin|clinical|patient|diagnosis|syndrome|باطن|تشخيص|إكلينيكي|طب/i,
  },
  {
    key: "cs",
    regex: /algorithm|software|python|javascript|database|network|برمجة|خوارزميات|حاسب|شبكات/i,
  },
  {
    key: "math",
    regex: /calculus|algebra|physics|mechanics|رياضيات|فيزياء|تفاضل|هندسة/i,
  },
];

export function classifyCourseSubject(course) {
  if (!course) return "general";
  const explicit = String(course.subject_override || course.subject || "").trim().toLowerCase();
  if (explicit && SUBJECT_META[explicit]) {
    return explicit;
  }
  const haystack = `${course.title || ""} ${course.description || ""} ${course.subject || ""}`;
  for (const rule of KEYWORD_RULES) {
    if (rule.regex.test(haystack)) {
      return rule.key;
    }
  }
  return "general";
}

export function getSubjectMeta(course) {
  const key = classifyCourseSubject(course);
  return (
    SUBJECT_META[key] || {
      key: "general",
      label: course?.subject || "محاضرات عامة",
      labelEn: course?.subject || "General Lectures",
      icon: BookOpen,
    }
  );
}

export function groupCoursesBySubject(courses = []) {
  const map = new Map();
  for (const course of courses) {
    const meta = getSubjectMeta(course);
    if (!map.has(meta.key)) {
      map.set(meta.key, {
        key: meta.key,
        label: meta.label,
        labelEn: meta.labelEn || meta.label,
        icon: meta.icon,
        meta,
        courses: [],
      });
    }
    map.get(meta.key).courses.push(course);
  }
  return Array.from(map.values());
}
