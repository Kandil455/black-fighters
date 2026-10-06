import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json } from "./_shared/http.mjs";
import { quizzesData } from "./quizzes-data.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: "OK"
    };
  }

  try {
    const user = await requireUser(event);
    
    // Batch commit
    const batch = adminDb.batch();
    
    for (const quiz of quizzesData) {
      const docRef = adminDb.collection("quizzes").doc();
      batch.set(docRef, {
        ...quiz,
        owner_id: user.uid,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        source_type: "text",
        status: "completed",
        type: "mcq",
        title: quiz.title || "ENT Lecture",
        is_public: false
      });
    }
    
    await batch.commit();
    
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify({ success: true, message: `Seeded ${quizzesData.length} quizzes successfully!` })
    };
  } catch (error) {
    return handleError(error);
  }
}
