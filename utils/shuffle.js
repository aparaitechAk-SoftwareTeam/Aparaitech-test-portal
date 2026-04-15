/**
 * Shuffle Utility - Fisher-Yates Algorithm
 * =========================================
 * Randomizes arrays without bias.
 * Used for shuffling questions and answer options.
 */

/**
 * Fisher-Yates shuffle — O(n) time, in-place
 * @param {Array} array - The array to shuffle
 * @returns {Array} - A new shuffled array (original unchanged)
 */
function fisherYatesShuffle(array) {
  // Create a copy to avoid mutating the original array
  const arr = [...array];
  
  for (let i = arr.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));
    
    // Swap arr[i] with arr[j]
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  return arr;
}

/**
 * Shuffle questions and also shuffle each question's options.
 * Returns a new array where:
 * - Questions are in random order
 * - Options within each question are shuffled
 * - The correct answer index is updated to match new option positions
 *
 * @param {Array} questions - Array of question documents from MongoDB
 * @param {Number} limit - Max number of questions (0 = all)
 * @returns {Array} - Shuffled questions ready for the student
 */
function shuffleQuestionsAndOptions(questions, limit = 0) {
  // Step 1: Shuffle question order
  let shuffled = fisherYatesShuffle(questions);
  
  // Step 2: Apply question limit if specified
  if (limit > 0 && limit < shuffled.length) {
    shuffled = shuffled.slice(0, limit);
  }
  
  // Step 3: For each question, shuffle the options and track new correct answer index
  return shuffled.map(q => {
    const originalOptions = [...q.options];
    const originalCorrect = q.correctAnswer; // index 0-3
    
    // Create indexed options so we can track the correct one after shuffle
    const indexed = originalOptions.map((opt, idx) => ({ opt, idx }));
    const shuffledIndexed = fisherYatesShuffle(indexed);
    
    // Find the new position of the correct answer
    const newCorrectIndex = shuffledIndexed.findIndex(item => item.idx === originalCorrect);
    
    return {
      _id: q._id,
      question: q.question,
      options: shuffledIndexed.map(item => item.opt), // shuffled options
      correctAnswer: newCorrectIndex,                  // updated correct index
      marks: q.marks || 1,
      explanation: q.explanation || ''
    };
  });
}

module.exports = { fisherYatesShuffle, shuffleQuestionsAndOptions };
