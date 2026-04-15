/**
 * Student Controller
 * ==================
 * Handles student test flow: dashboard, enter code, take test, submit, view results.
 */

const Test     = require('../models/Test');
const Question = require('../models/Question');
const Result   = require('../models/Result');
const User     = require('../models/User');
const { shuffleQuestionsAndOptions } = require('../utils/shuffle');
const Workshop   = require('../models/Workshop');
const Enrollment = require('../models/Enrollment');
const { sendResultEmail } = require('../services/emailService');
const { generateResultPDF } = require('../services/pdfService');

// ── GET /student/dashboard ────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);

    const AttendanceSession = require('../models/AttendanceSession');
    const AttendanceRecord  = require('../models/AttendanceRecord');

    const [results, newWorkshops, enrollments] = await Promise.all([
      Result.find({
        $or: [
          { studentId: req.session.user._id },
          { studentEmail: req.session.user.email }
        ]
      }).sort({ submittedAt: -1 }).populate('testId', 'title domain'),

      // New workshops in last 7 days for student's college
      Workshop.find({
        isActive: true,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        $or: [
          { collegeId: null },
          { collegeName: '' },
          ...(user?.collegeId ? [{ collegeId: user.collegeId }] : [])
        ]
      }).sort({ createdAt: -1 }).limit(3),

      // Student's enrolled workshops
      Enrollment.find({
        studentId: req.session.user._id,
        paymentStatus: { $in: ['paid', 'free'] }
      }).sort({ enrolledAt: -1 })
    ]);

    const enrolledIds = new Set(enrollments.map(e => e.workshopId.toString()));
    const unenrolledNew = newWorkshops.filter(w => !enrolledIds.has(w._id.toString()));

    // Fetch full workshop docs + attendance stats for enrolled workshops
    const workshopIds = enrollments.map(e => e.workshopId);
    const workshops   = await Workshop.find({ _id: { $in: workshopIds } });
    const workshopMap = {};
    workshops.forEach(w => { workshopMap[w._id.toString()] = w; });

    const enrolledWorkshops = await Promise.all(enrollments.map(async e => {
      const w = workshopMap[e.workshopId.toString()];
      if (!w) return null;

      const [totalSessions, markedSessions, openSessions] = await Promise.all([
        AttendanceSession.countDocuments({ workshopId: w._id }),
        AttendanceRecord.countDocuments({ workshopId: w._id, studentId: req.session.user._id }),
        AttendanceSession.find({ workshopId: w._id, isOpen: true })
      ]);

      return {
        workshop:       w,
        fee:            e.fee,
        paymentStatus:  e.paymentStatus,
        enrolledAt:     e.enrolledAt,
        totalSessions,
        markedSessions,
        attendancePct:  totalSessions > 0 ? Math.round(markedSessions / totalSessions * 100) : null,
        openSessions,
        hasOpenSession: openSessions.length > 0
      };
    }));

    const activeEnrolledWorkshops = enrolledWorkshops
      .filter(Boolean)
      .sort((a, b) => (b.hasOpenSession ? 1 : 0) - (a.hasOpenSession ? 1 : 0));

    res.render('student/dashboard', {
      title: 'Student Dashboard — APARAITECH',
      user,
      results,
      newWorkshops: unenrolledNew,
      enrolledWorkshops: activeEnrolledWorkshops
    });
  } catch (err) {
    console.error('Student dashboard error:', err.message);
    req.flash('error_msg', 'Failed to load dashboard.');
    res.redirect('/login');
  }
};

// ── GET /student/profile ──────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);

    // Test results
    const results = await Result.find({
      $or: [
        { studentId: req.session.user._id },
        { studentEmail: req.session.user.email }
      ]
    }).sort({ submittedAt: -1 });

    // Workshop enrollments with workshop details
    const enrollments = await Enrollment.find({
      studentId: req.session.user._id,
      paymentStatus: { $in: ['paid', 'free'] }
    }).sort({ enrolledAt: -1 });

    const workshopIds = enrollments.map(e => e.workshopId);
    const workshops   = await Workshop.find({ _id: { $in: workshopIds } });
    const workshopMap = {};
    workshops.forEach(w => { workshopMap[w._id.toString()] = w; });

    // Attendance per workshop
    const AttendanceSession = require('../models/AttendanceSession');
    const AttendanceRecord  = require('../models/AttendanceRecord');

    const enrollmentsWithAttendance = await Promise.all(enrollments.map(async (e) => {
      const wid = e.workshopId.toString();
      const totalSessions  = await AttendanceSession.countDocuments({ workshopId: e.workshopId });
      const markedSessions = await AttendanceRecord.countDocuments({
        workshopId: e.workshopId,
        studentId: req.session.user._id
      });

      // Task submissions for this workshop
      const TaskSubmission = require('../models/TaskSubmission');
      const StudyMaterial  = require('../models/StudyMaterial');
      const totalTasks  = await StudyMaterial.countDocuments({ workshopId: e.workshopId, isTask: true });
      const doneTasksCount  = await TaskSubmission.countDocuments({
        workshopId: e.workshopId,
        studentId: req.session.user._id
      });

      return {
        ...e.toObject(),
        workshop: workshopMap[wid] || null,
        totalSessions,
        markedSessions,
        attendancePct: totalSessions > 0 ? Math.round(markedSessions / totalSessions * 100) : null,
        totalTasks,
        doneTasksCount
      };
    }));

    // Computed test stats
    const testStats = {
      total:   results.length,
      passed:  results.filter(r => r.isPassed).length,
      failed:  results.filter(r => !r.isPassed).length,
      avgPct:  results.length > 0
                 ? (results.reduce((a, r) => a + r.percentage, 0) / results.length).toFixed(1)
                 : null,
      bestPct: results.length > 0
                 ? Math.max(...results.map(r => r.percentage)).toFixed(1)
                 : null
    };

    res.render('student/profile', {
      title: 'My Profile — APARAITECH',
      user,
      results,
      testStats,
      enrollments: enrollmentsWithAttendance
    });
  } catch (err) {
    console.error('Profile error:', err.message);
    req.flash('error_msg', 'Failed to load profile.');
    res.redirect('/student/dashboard');
  }
};

// ── POST /student/profile ─────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.session.user._id,
      { name: name?.trim() || '' },
      { new: true }
    );
    req.session.user.name = user.name;
    req.flash('success_msg', 'Profile updated successfully!');
    res.redirect('/student/profile');
  } catch (err) {
    req.flash('error_msg', 'Failed to update profile.');
    res.redirect('/student/profile');
  }
};

// ── GET /student/enter-code ───────────────────────────
exports.getEnterCode = (req, res) => {
  res.render('student/enter-code', { title: 'Enter Test Code — APARAITECH' });
};

// ── POST /student/enter-code ──────────────────────────
exports.postEnterCode = async (req, res) => {
  try {
    const code = req.body.code?.toUpperCase().trim();

    if (!code || code.length !== 6) {
      req.flash('error_msg', 'Please enter a valid 6-character test code.');
      return res.redirect('/student/enter-code');
    }

    const test = await Test.findOne({ code, isActive: true });
    if (!test) {
      req.flash('error_msg', 'Invalid or inactive test code. Please check with your admin.');
      return res.redirect('/student/enter-code');
    }

    // ── Time window check ──────────────────────────────
    if (test.isScheduled) {
      const now = new Date();
      if (now < test.scheduledStart) {
        const startsIn = test.scheduledStart.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        req.flash('error_msg', `This test is not open yet. It starts on ${startsIn}.`);
        return res.redirect('/student/enter-code');
      }
      if (now > test.scheduledEnd) {
        req.flash('error_msg', 'This test window has closed. You can no longer attempt this test.');
        return res.redirect('/student/enter-code');
      }
    }

    // Check if student already attempted this test
    const existingResult = await Result.findOne({
      studentId: req.session.user._id,
      testId: test._id
    });

    if (existingResult) {
      req.flash('error_msg', 'You have already attempted this test. Check your results.');
      return res.redirect('/student/dashboard');
    }

    // Check if enough questions exist
    const qCount = await Question.countDocuments({ testId: test._id });
    if (qCount === 0) {
      req.flash('error_msg', 'This test has no questions yet. Please contact admin.');
      return res.redirect('/student/enter-code');
    }

    res.redirect(`/student/test/${test._id}/instructions`);

  } catch (err) {
    console.error('Enter code error:', err.message);
    req.flash('error_msg', 'Something went wrong. Please try again.');
    res.redirect('/student/enter-code');
  }
};

// ── GET /student/test/:id/instructions ───────────────
exports.getInstructions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test || !test.isActive) {
      req.flash('error_msg', 'Test not found or inactive.');
      return res.redirect('/student/enter-code');
    }

    // Time window check
    if (test.isScheduled) {
      const now = new Date();
      if (now < test.scheduledStart) {
        const startsIn = test.scheduledStart.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        req.flash('error_msg', `This test has not started yet. It opens on ${startsIn}.`);
        return res.redirect('/student/enter-code');
      }
      if (now > test.scheduledEnd) {
        req.flash('error_msg', 'This test window has closed.');
        return res.redirect('/student/enter-code');
      }
    }

    // Block if already attempted
    const existing = await Result.findOne({ studentId: req.session.user._id, testId: test._id });
    if (existing) {
      req.flash('error_msg', 'You already attempted this test.');
      return res.redirect('/student/dashboard');
    }

    const qCount = await Question.countDocuments({ testId: test._id });
    const actualQuestions = test.questionLimit > 0
      ? Math.min(test.questionLimit, qCount)
      : qCount;

    res.render('student/instructions', {
      title: `Instructions — ${test.title}`,
      test,
      questionCount: actualQuestions
    });
  } catch (err) {
    req.flash('error_msg', 'Failed to load instructions.');
    res.redirect('/student/enter-code');
  }
};

// ── GET /student/test/:id/start ───────────────────────
exports.startTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test || !test.isActive) {
      req.flash('error_msg', 'Test not found or inactive.');
      return res.redirect('/student/enter-code');
    }

    // Time window check
    if (test.isScheduled) {
      const now = new Date();
      if (now < test.scheduledStart || now > test.scheduledEnd) {
        req.flash('error_msg', 'This test is outside its allowed time window.');
        return res.redirect('/student/enter-code');
      }
    }

    // Block if already submitted
    const existing = await Result.findOne({ studentId: req.session.user._id, testId: test._id });
    if (existing) {
      req.flash('error_msg', 'You already attempted this test.');
      return res.redirect('/student/dashboard');
    }

    // ── REFRESH FIX: Reuse existing session if same test ──
    const existingSession = req.session.activeTest;
    if (existingSession && existingSession.testId === test._id.toString()) {
      // Same test already in session — reuse stored question order (no reshuffle)
      const storedQuestions = existingSession.questions;
      const timeElapsed = Math.floor((Date.now() - existingSession.startTime) / 1000);
      const durationSeconds = Math.max(0, test.duration * 60 - timeElapsed);

      console.log(`♻️  Restoring test session for ${req.session.user.email}, time left: ${durationSeconds}s`);

      return res.render('student/test', {
        title: `${test.title} — APARAITECH`,
        test,
        questions: storedQuestions,
        durationSeconds // Pass remaining time to frontend
      });
    }

    // ── NEW SESSION: Fetch and shuffle questions ───────────
    const rawQuestions = await Question.find({ testId: test._id });
    const shuffledQuestions = shuffleQuestionsAndOptions(rawQuestions, test.questionLimit);

    if (shuffledQuestions.length === 0) {
      req.flash('error_msg', 'No questions found for this test.');
      return res.redirect('/student/enter-code');
    }

    // Store shuffled questions in session for submission verification
    req.session.activeTest = {
      testId:    test._id.toString(),
      startTime: Date.now(),
      questions: shuffledQuestions.map(q => ({
        _id:           q._id.toString(),
        question:      q.question,
        options:       q.options,
        correctAnswer: q.correctAnswer,
        marks:         q.marks || 1,
        explanation:   q.explanation || ''
      }))
    };

    res.render('student/test', {
      title: `${test.title} — APARAITECH`,
      test,
      questions: shuffledQuestions,
      durationSeconds: test.duration * 60
    });
  } catch (err) {
    console.error('Start test error:', err.message);
    req.flash('error_msg', 'Failed to start test.');
    res.redirect('/student/enter-code');
  }
};

// ── POST /student/test/:id/submit ─────────────────────
exports.submitTest = async (req, res) => {
  try {
    const testId = req.params.id;
    const activeTest = req.session.activeTest;

    // Validate active test session
    if (!activeTest || activeTest.testId !== testId) {
      return res.status(400).json({ error: 'Invalid test session. Please start again.' });
    }

    // Block double submission
    const existing = await Result.findOne({
      studentId: req.session.user._id,
      testId
    });
    if (existing) {
      return res.json({ redirect: `/student/results/${existing._id}` });
    }

    const { answers: submittedAnswers, timeTaken, tabSwitchCount } = req.body;
    const parsedAnswers = typeof submittedAnswers === 'string'
      ? JSON.parse(submittedAnswers)
      : submittedAnswers || {};

    const test = await Test.findById(testId);
    const storedQuestions = activeTest.questions;

    let score = 0;
    let correctCount   = 0;
    let incorrectCount = 0;
    let unattempted    = 0;

    // Build detailed answers array
    const detailedAnswers = storedQuestions.map(q => {
      const selected = parseInt(parsedAnswers[q._id]);
      const isAnswered = !isNaN(selected) && selected >= 0 && selected <= 3;
      const isCorrect  = isAnswered && selected === q.correctAnswer;
      const awarded    = isCorrect ? (q.marks || 1) : 0;

      if (!isAnswered)     unattempted++;
      else if (isCorrect)  correctCount++;
      else                 incorrectCount++;

      score += awarded;

      return {
        questionId:     q._id,
        questionText:   q.question,
        options:        q.options,
        selectedOption: isAnswered ? selected : -1,
        correctOption:  q.correctAnswer,
        isCorrect,
        marksAwarded:   awarded,
        explanation:    q.explanation || ''
      };
    });

    const totalMarks = test.totalMarks;
    const percentage = totalMarks > 0 ? parseFloat(((score / totalMarks) * 100).toFixed(2)) : 0;
    const isPassed   = percentage >= (test.passingMarks > 0 ? (test.passingMarks / totalMarks * 100) : 40);

    const studentUser = await User.findById(req.session.user._id);

    // Save result
    const result = await Result.create({
      studentId:     req.session.user._id,
      testId,
      studentName:   studentUser?.name || '',
      studentEmail:  req.session.user.email,
      collegeId:     studentUser?.collegeId || null,
      collegeName:   studentUser?.collegeName || '',
      testTitle:     test.title,
      testDomain:    test.domain,
      score,
      totalMarks,
      percentage,
      isPassed,
      correctCount,
      incorrectCount,
      unattempted,
      answers:       detailedAnswers,
      timeTaken:     parseInt(timeTaken) || 0,
      tabSwitchCount: parseInt(tabSwitchCount) || 0,
      submittedAt:   new Date()
    });

    // Clear active test session
    req.session.activeTest = null;

    // Send result email (non-blocking)
    sendResultEmail(result).catch(err => console.error('Email error:', err));

    // Mark email as sent (optimistically)
    Result.findByIdAndUpdate(result._id, { emailSent: true }).catch(() => {});

    return res.json({ redirect: `/student/results/${result._id}` });

  } catch (err) {
    console.error('Submit test error:', err.message);
    return res.status(500).json({ error: 'Submission failed. Please contact admin.' });
  }
};

// ── GET /student/results/:id ──────────────────────────
exports.getResult = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);

    if (!result) {
      req.flash('error_msg', 'Result not found.');
      return res.redirect('/student/dashboard');
    }

    // Allow access by studentId OR studentEmail (fallback for migrated users)
    const ownedById    = result.studentId && result.studentId.toString() === req.session.user._id;
    const ownedByEmail = result.studentEmail === req.session.user.email;

    if (!ownedById && !ownedByEmail) {
      req.flash('error_msg', 'Access denied.');
      return res.redirect('/student/dashboard');
    }

    res.render('student/result', {
      title: `Result — ${result.testTitle}`,
      result
    });
  } catch (err) {
    console.error('Get result error:', err.message);
    req.flash('error_msg', 'Failed to load result.');
    res.redirect('/student/dashboard');
  }
};

// ── GET /student/results/:id/pdf ──────────────────────
exports.downloadResultPDF = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);

    if (!result || result.studentId.toString() !== req.session.user._id) {
      return res.status(403).send('Access denied.');
    }

    await generateResultPDF(result, res);
  } catch (err) {
    console.error('PDF generation error:', err.message);
    res.status(500).send('PDF generation failed. Please try again.');
  }
};

// ── GET /student/results/:id/pdf (admin) ─────────────
exports.adminDownloadPDF = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).send('Result not found.');
    await generateResultPDF(result, res);
  } catch (err) {
    console.error('Admin PDF error:', err.message);
    res.status(500).send('PDF generation failed.');
  }
};
