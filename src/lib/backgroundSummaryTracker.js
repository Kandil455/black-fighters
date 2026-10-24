/**
 * Global Background Summary Job Tracker
 * Allows summary generation started in CreateCourse to continue running in the background
 * if the student navigates to Dashboard, Quizzes, Leaderboard, or any other page.
 */

let currentJobState = {
  active: false,
  completed: false,
  error: "",
  fileName: "",
  statusText: "",
  progress: 0,
  agentIndex: 0,
  preview: null,
  courseId: null,
};

const listeners = new Set();

function notify() {
  const snapshot = { ...currentJobState };
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {}
  });
}

export const backgroundSummaryTracker = {
  getState() {
    return { ...currentJobState };
  },
  subscribe(listener) {
    listeners.add(listener);
    listener({ ...currentJobState });
    return () => listeners.delete(listener);
  },
  startJob({ fileName, statusText = "جاري تجهيز التلخيص الذكي..." }) {
    currentJobState = {
      active: true,
      completed: false,
      error: "",
      fileName: fileName || "ملف جديد",
      statusText,
      progress: 5,
      agentIndex: 0,
      preview: null,
      courseId: null,
    };
    notify();
  },
  updateJob(partial) {
    currentJobState = {
      ...currentJobState,
      ...partial,
    };
    notify();
  },
  completeJob(preview) {
    if (preview) {
      try {
        localStorage.setItem("bf_create_course_preview_draft", JSON.stringify(preview));
      } catch {}
    }
    currentJobState = {
      ...currentJobState,
      active: false,
      completed: true,
      progress: 100,
      statusText: "اكتمل التلخيص وجاهز للعرض! 🎉",
      preview,
      courseId: preview?.courseId || currentJobState.courseId || null,
    };
    notify();
  },
  failJob(errorMsg) {
    currentJobState = {
      ...currentJobState,
      active: false,
      completed: false,
      error: errorMsg || "تعذر إكمال التلخيص",
      progress: 0,
    };
    notify();
  },
  clearJob() {
    currentJobState = {
      active: false,
      completed: false,
      error: "",
      fileName: "",
      statusText: "",
      progress: 0,
      agentIndex: 0,
      preview: null,
      courseId: null,
    };
    notify();
  },
};
