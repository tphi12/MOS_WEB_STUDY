const database = db.getSiblingDB("mos_web_study");

const legacyQuestionPoints = {
  "q-layout-1": 15,
  "q-format-1": 20,
  "q-table-1": 20,
  "q-reference-1": 25,
  "q-graphic-1": 20,
  "q-review-1": 20,
  "q-mailmerge-1": 25,
};

database.blueprints.updateMany({}, { $set: { mosScaleMin: 0, mosScaleMax: 100 } });

for (const [id, points] of Object.entries(legacyQuestionPoints)) {
  database.questions.updateOne({ id }, { $set: { points } });
}

database.questions.updateMany({ id: /^mcq-/ }, { $set: { points: 5 } });

const questionPoints = new Map(database.questions.find({}, { id: 1, points: 1 }).toArray().map((question) => [question.id, question.points ?? 0]));
let updatedAttempts = 0;

for (const attempt of database.attempts.find({}).toArray()) {
  const totalPoints = (attempt.questionIds ?? []).reduce((total, questionId) => total + (questionPoints.get(questionId) ?? 0), 0);
  const rawScore = (attempt.answers ?? []).reduce(
    (total, answer) => total + (answer.isCorrect ? questionPoints.get(answer.questionId) ?? 0 : 0),
    0,
  );
  const mosScore = totalPoints === 0 ? 0 : Math.round(Math.max(0, Math.min(1, rawScore / totalPoints)) * 100);

  database.attempts.updateOne({ id: attempt.id }, { $set: { rawScore, mosScore } });
  updatedAttempts += 1;
}

printjson({
  ok: 1,
  migration: "score-scale-100",
  blueprints: database.blueprints.countDocuments(),
  questions: database.questions.countDocuments(),
  updatedAttempts,
});
