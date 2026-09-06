/**
 * Admin Controller
 * ================
 * All admin operations: dashboard, create tests, add questions, view results.
 */

const Test     = require('../models/Test');
const College  = require('../models/College');
const Question = require('../models/Question');
const Result   = require('../models/Result');
const User     = require('../models/User');
const { generateTestCode } = require('../utils/codeGenerator');

// ── GET /admin/dashboard ──────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const [testCount, studentCount, resultCount, recentResults] = await Promise.all([
      Test.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'student' }),
      Result.countDocuments({}),
      Result.find({}).sort({ submittedAt: -1 }).limit(5)
            .populate('studentId', 'email name')
            .populate('testId', 'title domain')
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard — APARAITECH',
      stats: { testCount, studentCount, resultCount },
      recentResults
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    req.flash('error_msg', 'Failed to load dashboard.');
    res.redirect('/login');
  }
};

// ── GET /admin/tests ──────────────────────────────────
exports.getTests = async (req, res) => {
  try {
    const tests = await Test.find({}).sort({ createdAt: -1 });

    // Get question counts for each test
    const testsWithCounts = await Promise.all(tests.map(async (test) => {
      const qCount = await Question.countDocuments({ testId: test._id });
      const rCount = await Result.countDocuments({ testId: test._id });
      return { ...test.toObject(), questionCount: qCount, resultCount: rCount };
    }));

    res.render('admin/tests', {
      title: 'Manage Tests — APARAITECH Admin',
      tests: testsWithCounts
    });
  } catch (err) {
    console.error('Get tests error:', err.message);
    req.flash('error_msg', 'Failed to load tests.');
    res.redirect('/admin/dashboard');
  }
};

// ── GET /admin/tests/create ───────────────────────────
exports.getCreateTest = (req, res) => {
  res.render('admin/create-test', {
    title: 'Create Test — APARAITECH Admin'
  });
};

// ── POST /admin/tests/create ──────────────────────────
exports.postCreateTest = async (req, res) => {
  try {
    const { title, domain, duration, totalMarks, passingMarks, questionLimit, instructions,
            isScheduled, scheduledStart, scheduledEnd } = req.body;

    // Validation
    if (!title || !domain || !duration || !totalMarks) {
      req.flash('error_msg', 'Please fill all required fields.');
      return res.redirect('/admin/tests/create');
    }

    const scheduled = isScheduled === 'on';
    if (scheduled && (!scheduledStart || !scheduledEnd)) {
      req.flash('error_msg', 'Please set both start and end time for the scheduled window.');
      return res.redirect('/admin/tests/create');
    }
    if (scheduled && new Date(scheduledStart) >= new Date(scheduledEnd)) {
      req.flash('error_msg', 'End time must be after start time.');
      return res.redirect('/admin/tests/create');
    }

    // Generate unique test code (retry if collision)
    let code, exists;
    do {
      code   = generateTestCode();
      exists = await Test.findOne({ code });
    } while (exists);

    const test = await Test.create({
      title: title.trim(),
      domain,
      duration: parseInt(duration),
      totalMarks: parseInt(totalMarks),
      passingMarks: parseInt(passingMarks) || 0,
      questionLimit: parseInt(questionLimit) || 0,
      instructions: instructions?.trim() || '',
      code,
      createdBy: req.session.user._id,
      isScheduled: scheduled,
      scheduledStart: scheduled ? new Date(scheduledStart) : null,
      scheduledEnd:   scheduled ? new Date(scheduledEnd)   : null
    });

    req.flash('success_msg', `Test created! Code: <strong>${code}</strong>. Now add questions.`);
    res.redirect(`/admin/tests/${test._id}/questions`);

  } catch (err) {
    console.error('Create test error:', err.message);
    req.flash('error_msg', 'Failed to create test. Please try again.');
    res.redirect('/admin/tests/create');
  }
};

// ── GET /admin/tests/:id/questions ───────────────────
exports.getAddQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      req.flash('error_msg', 'Test not found.');
      return res.redirect('/admin/tests');
    }

    const questions = await Question.find({ testId: test._id }).sort({ createdAt: 1 });

    res.render('admin/add-questions', {
      title: `Add Questions — ${test.title}`,
      test,
      questions
    });
  } catch (err) {
    console.error('Get questions error:', err.message);
    req.flash('error_msg', 'Failed to load questions page.');
    res.redirect('/admin/tests');
  }
};

// ── POST /admin/tests/:id/questions ──────────────────
exports.postAddQuestion = async (req, res) => {
  try {
    const { question, optA, optB, optC, optD, correctAnswer, marks, explanation } = req.body;

    if (!question || !optA || !optB || !optC || !optD || correctAnswer === undefined) {
      req.flash('error_msg', 'All question fields are required.');
      return res.redirect(`/admin/tests/${req.params.id}/questions`);
    }

    await Question.create({
      testId:        req.params.id,
      question:      question.trim(),
      options:       [optA.trim(), optB.trim(), optC.trim(), optD.trim()],
      correctAnswer: parseInt(correctAnswer), // 0-3 index
      marks:         parseInt(marks) || 1,
      explanation:   explanation?.trim() || ''
    });

    req.flash('success_msg', 'Question added successfully!');
    res.redirect(`/admin/tests/${req.params.id}/questions`);

  } catch (err) {
    console.error('Add question error:', err.message);
    req.flash('error_msg', 'Failed to add question.');
    res.redirect(`/admin/tests/${req.params.id}/questions`);
  }
};

// ── DELETE /admin/questions/:id ───────────────────────
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Question deleted.');
    res.redirect(`/admin/tests/${question.testId}/questions`);
  } catch (err) {
    req.flash('error_msg', 'Failed to delete question.');
    res.redirect('/admin/tests');
  }
};

// ── GET /admin/tests/:id/toggle ───────────────────────
exports.toggleTestStatus = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    test.isActive = !test.isActive;
    await test.save();
    req.flash('success_msg', `Test ${test.isActive ? 'activated' : 'deactivated'}.`);
    res.redirect('/admin/tests');
  } catch (err) {
    req.flash('error_msg', 'Failed to update test status.');
    res.redirect('/admin/tests');
  }
};

// ── GET /admin/results ────────────────────────────────
exports.getAllResults = async (req, res) => {
  try {
    const { testId, search } = req.query;
    const filter = {};
    if (testId) filter.testId = testId;
    if (search) filter.studentEmail = { $regex: search, $options: 'i' };

    const [results, tests] = await Promise.all([
      Result.find(filter).sort({ submittedAt: -1 })
            .populate('testId', 'title domain code'),
      Test.find({}, 'title _id')
    ]);

    res.render('admin/results', {
      title: 'All Results — APARAITECH Admin',
      results,
      tests,
      selectedTest: testId || '',
      search: search || ''
    });
  } catch (err) {
    console.error('Get results error:', err.message);
    req.flash('error_msg', 'Failed to load results.');
    res.redirect('/admin/dashboard');
  }
};

// ── GET /admin/results/:id ────────────────────────────
exports.getResultDetail = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) {
      req.flash('error_msg', 'Result not found.');
      return res.redirect('/admin/results');
    }

    res.render('admin/result-detail', {
      title: `Result Detail — ${result.studentEmail}`,
      result
    });
  } catch (err) {
    console.error('Result detail error:', err.message);
    req.flash('error_msg', 'Failed to load result details.');
    res.redirect('/admin/results');
  }
};

// ── DELETE /admin/tests/:id ───────────────────────────
exports.deleteTest = async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    await Question.deleteMany({ testId: req.params.id });
    await Result.deleteMany({ testId: req.params.id });
    req.flash('success_msg', 'Test and all related data deleted.');
    res.redirect('/admin/tests');
  } catch (err) {
    req.flash('error_msg', 'Failed to delete test.');
    res.redirect('/admin/tests');
  }
};

// ── GET /admin/users ──────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { role: 'student' };
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { collegeName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    // Get result count per user
    const usersWithStats = await Promise.all(users.map(async (u) => {
      const attempts = await Result.countDocuments({ studentEmail: u.email });
      return { ...u.toObject(), attempts };
    }));

    res.render('admin/users', {
      title: 'Manage Users — APARAITECH Admin',
      users: usersWithStats,
      search: search || ''
    });
  } catch (err) {
    console.error('Get users error:', err.message);
    req.flash('error_msg', 'Failed to load users.');
    res.redirect('/admin/dashboard');
  }
};

// ── POST /admin/users/delete-all ─────────────────────
exports.deleteAllUsers = async (req, res) => {
  try {
    await User.deleteMany({ role: 'student' });
    await Result.deleteMany({});
    req.flash('success_msg', 'All students and their results have been deleted.');
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Delete all users error:', err.message);
    req.flash('error_msg', 'Failed to delete all users.');
    res.redirect('/admin/users');
  }
};

// ── POST /admin/users/:id/delete ──────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') {
      req.flash('error_msg', 'User not found or cannot delete admin.');
      return res.redirect('/admin/users');
    }
    await User.findByIdAndDelete(req.params.id);
    await Result.deleteMany({ studentEmail: user.email });
    req.flash('success_msg', `User ${user.email} and their results deleted.`);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Delete user error:', err.message);
    req.flash('error_msg', 'Failed to delete user.');
    res.redirect('/admin/users');
  }
};

// ── GET /admin/results/download ───────────────────────
exports.downloadResults = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { testId } = req.query;
    const filter = {};
    if (testId) filter.testId = testId;

    const results = await Result.find(filter).sort({ percentage: -1 });

    const rows = results.map((r, i) => ({
      Rank: i + 1,
      'Student Name': r.studentName || '',
      'Email': r.studentEmail || '',
      'Test': r.testTitle || '',
      'Domain': r.testDomain || '',
      'Score': `${r.score}/${r.totalMarks}`,
      'Percentage': `${r.percentage.toFixed(1)}%`,
      'Status': r.isPassed ? 'Passed' : 'Failed',
      'Correct': r.correctCount,
      'Incorrect': r.incorrectCount,
      'Unattempted': r.unattempted,
      'Tab Switches': r.tabSwitchCount,
      'Date': new Date(r.submittedAt).toLocaleDateString('en-IN')
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      {wch:6},{wch:20},{wch:28},{wch:25},{wch:15},
      {wch:10},{wch:12},{wch:10},{wch:10},{wch:10},
      {wch:12},{wch:14},{wch:14}
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = testId ? `results-${testId}.xlsx` : 'all-results.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);

  } catch (err) {
    console.error('Download results error:', err.message);
    req.flash('error_msg', 'Failed to download results.');
    res.redirect('/admin/results');
  }
};

// ── GET /admin/results/topscores ──────────────────────
exports.getTopScores = async (req, res) => {
  try {
    const { testId } = req.query;
    const filter = {};
    if (testId) filter.testId = testId;

    const [topResults, tests] = await Promise.all([
      Result.find(filter).sort({ percentage: -1, score: -1 }).limit(20),
      Test.find({}, 'title _id')
    ]);

    // Group by test for test-wise stats
    const testStats = await Result.aggregate([
      ...(testId ? [{ $match: { testId: require('mongoose').Types.ObjectId.createFromHexString(testId) } }] : []),
      {
        $group: {
          _id: '$testId',
          testTitle: { $first: '$testTitle' },
          testDomain: { $first: '$testDomain' },
          totalAttempts: { $sum: 1 },
          avgScore: { $avg: '$percentage' },
          highestScore: { $max: '$percentage' },
          lowestScore: { $min: '$percentage' },
          passCount: { $sum: { $cond: ['$isPassed', 1, 0] } }
        }
      },
      { $sort: { totalAttempts: -1 } }
    ]);

    res.render('admin/topscores', {
      title: 'Top Scores — APARAITECH Admin',
      topResults,
      testStats,
      tests,
      selectedTest: testId || ''
    });
  } catch (err) {
    console.error('Top scores error:', err.message);
    req.flash('error_msg', 'Failed to load top scores.');
    res.redirect('/admin/results');
  }
};

// ── GET /admin/colleges ───────────────────────────────
exports.getColleges = async (req, res) => {
  try {
    const colleges = await College.find({}).sort({ name: 1 });
    const collegesWithStats = await Promise.all(colleges.map(async (c) => {
      const studentCount = await User.countDocuments({ collegeId: c._id, role: 'student' });
      const resultCount  = await Result.countDocuments({ collegeId: c._id });
      return { ...c.toObject(), studentCount, resultCount };
    }));
    res.render('admin/colleges', {
      title: 'Manage Colleges — APARAITECH Admin',
      colleges: collegesWithStats
    });
  } catch (err) {
    console.error('Get colleges error:', err.message);
    req.flash('error_msg', 'Failed to load colleges.');
    res.redirect('/admin/dashboard');
  }
};

// ── POST /admin/colleges/add ──────────────────────────
exports.addCollege = async (req, res) => {
  try {
    const { name, code, address, contactEmail } = req.body;
    if (!name) {
      req.flash('error_msg', 'College name is required.');
      return res.redirect('/admin/colleges');
    }
    const existing = await College.findOne({ name: name.trim() });
    if (existing) {
      req.flash('error_msg', 'College already exists.');
      return res.redirect('/admin/colleges');
    }
    await College.create({
      name: name.trim(),
      code: code?.trim().toUpperCase() || name.trim().substring(0, 6).toUpperCase(),
      address: address?.trim() || '',
      contactEmail: contactEmail?.trim() || ''
    });
    req.flash('success_msg', `College "${name}" added successfully!`);
    res.redirect('/admin/colleges');
  } catch (err) {
    console.error('Add college error:', err.message);
    req.flash('error_msg', 'Failed to add college.');
    res.redirect('/admin/colleges');
  }
};

// ── POST /admin/colleges/:id/delete ──────────────────
exports.deleteCollege = async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) {
      req.flash('error_msg', 'College not found.');
      return res.redirect('/admin/colleges');
    }
    // Unlink students from this college
    await User.updateMany({ collegeId: req.params.id }, { collegeId: null, collegeName: '' });
    await College.findByIdAndDelete(req.params.id);
    req.flash('success_msg', `College "${college.name}" deleted.`);
    res.redirect('/admin/colleges');
  } catch (err) {
    req.flash('error_msg', 'Failed to delete college.');
    res.redirect('/admin/colleges');
  }
};

// ── GET /admin/colleges/:id/report ───────────────────
exports.getCollegeReport = async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) {
      req.flash('error_msg', 'College not found.');
      return res.redirect('/admin/colleges');
    }

    const Enrollment        = require('../models/Enrollment');
    const Workshop          = require('../models/Workshop');
    const AttendanceSession = require('../models/AttendanceSession');
    const AttendanceRecord  = require('../models/AttendanceRecord');

    const [students, results, tests] = await Promise.all([
      User.find({ collegeId: college._id, role: 'student' }).sort({ name: 1 }),
      Result.find({ collegeId: college._id }).sort({ submittedAt: -1 }),
      Test.find({}, 'title _id')
    ]);

    // Test-wise stats for this college
    const testStats = await Result.aggregate([
      { $match: { collegeId: college._id } },
      { $group: {
        _id: '$testId',
        testTitle:     { $first: '$testTitle' },
        totalAttempts: { $sum: 1 },
        avgScore:      { $avg: '$percentage' },
        highestScore:  { $max: '$percentage' },
        passCount:     { $sum: { $cond: ['$isPassed', 1, 0] } }
      }},
      { $sort: { totalAttempts: -1 } }
    ]);

    // ── Workshop revenue & enrollment data ────────────────
    // Enrollments from students of this college
    const studentIds = students.map(s => s._id);
    const enrollments = await Enrollment.find({
      studentId: { $in: studentIds },
      paymentStatus: { $in: ['paid', 'free'] }
    });

    // Group enrollments by workshopId
    const workshopEnrollMap = {};
    enrollments.forEach(e => {
      const wid = e.workshopId.toString();
      if (!workshopEnrollMap[wid]) {
        workshopEnrollMap[wid] = { enrollCount: 0, revenue: 0, studentIds: [] };
      }
      workshopEnrollMap[wid].enrollCount++;
      workshopEnrollMap[wid].revenue += (e.fee || 0);
      workshopEnrollMap[wid].studentIds.push(e.studentId.toString());
    });

    const enrolledWorkshopIds = Object.keys(workshopEnrollMap);
    const workshops = await Workshop.find({ _id: { $in: enrolledWorkshopIds } }).sort({ startDate: -1 });

    // Per-workshop attendance stats for this college's students
    const workshopStats = await Promise.all(workshops.map(async w => {
      const wid = w._id.toString();
      const info = workshopEnrollMap[wid] || { enrollCount: 0, revenue: 0, studentIds: [] };

      // Total sessions for this workshop
      const totalSessions = await AttendanceSession.countDocuments({ workshopId: w._id });

      // Attendance records by college students
      const presentRecords = await AttendanceRecord.countDocuments({
        workshopId: w._id,
        studentId: { $in: info.studentIds.map(id => require('mongoose').Types.ObjectId.createFromHexString(id)) }
      });

      // Max possible = enrolled students × sessions
      const maxPossible = info.enrollCount * totalSessions;
      const attendancePct = maxPossible > 0 ? Math.round(presentRecords / maxPossible * 100) : null;

      return {
        workshop:      w,
        enrollCount:   info.enrollCount,
        revenue:       info.revenue,
        totalSessions,
        presentRecords,
        maxPossible,
        attendancePct
      };
    }));

    // Revenue summary
    const totalRevenue     = workshopStats.reduce((a, w) => a + w.revenue, 0);
    const totalEnrollments = workshopStats.reduce((a, w) => a + w.enrollCount, 0);

    res.render('admin/college-report', {
      title: `${college.name} — Report`,
      college,
      students,
      results,
      testStats,
      tests,
      workshopStats,
      totalRevenue,
      totalEnrollments
    });
  } catch (err) {
    console.error('College report error:', err.message);
    req.flash('error_msg', 'Failed to load college report.');
    res.redirect('/admin/colleges');
  }
};

// ── GET /admin/colleges/:id/download ─────────────────
exports.downloadCollegeReport = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const Enrollment        = require('../models/Enrollment');
    const Workshop          = require('../models/Workshop');
    const AttendanceSession = require('../models/AttendanceSession');
    const AttendanceRecord  = require('../models/AttendanceRecord');

    const college = await College.findById(req.params.id);
    if (!college) return res.redirect('/admin/colleges');

    const students = await User.find({ collegeId: college._id, role: 'student' });
    const results  = await Result.find({ collegeId: college._id }).sort({ percentage: -1 });

    // ── Sheet 1: Test Results ────────────────────────────
    const resultRows = results.map((r, i) => ({
      Rank:           i + 1,
      'Student Name': r.studentName || '',
      'Email':        r.studentEmail || '',
      'Test':         r.testTitle || '',
      'Domain':       r.testDomain || '',
      'Score':        `${r.score}/${r.totalMarks}`,
      'Percentage':   `${r.percentage.toFixed(1)}%`,
      'Status':       r.isPassed ? 'Passed' : 'Failed',
      'Correct':      r.correctCount,
      'Incorrect':    r.incorrectCount,
      'Skipped':      r.unattempted,
      'Date':         new Date(r.submittedAt).toLocaleDateString('en-IN')
    }));

    // ── Sheet 2: Workshop Revenue ────────────────────────
    const studentIds = students.map(s => s._id);
    const enrollments = await Enrollment.find({
      studentId: { $in: studentIds },
      paymentStatus: { $in: ['paid', 'free'] }
    });
    const workshopIds = [...new Set(enrollments.map(e => e.workshopId.toString()))];
    const workshops   = await Workshop.find({ _id: { $in: workshopIds } }).sort({ startDate: -1 });

    const revenueRows = workshops.map((w, i) => {
      const wEnrolls = enrollments.filter(e => e.workshopId.toString() === w._id.toString());
      const revenue  = wEnrolls.reduce((a, e) => a + (e.fee || 0), 0);
      const free     = wEnrolls.filter(e => e.paymentStatus === 'free').length;
      const paid     = wEnrolls.filter(e => e.paymentStatus === 'paid').length;
      return {
        '#':           i + 1,
        'Workshop':    w.title,
        'Start Date':  new Date(w.startDate).toLocaleDateString('en-IN'),
        'End Date':    new Date(w.endDate).toLocaleDateString('en-IN'),
        'Fee (₹)':     w.isFree ? 0 : w.fee,
        'Enrolled':    wEnrolls.length,
        'Free':        free,
        'Paid':        paid,
        'Revenue (₹)': revenue
      };
    });
    // Totals row
    if (revenueRows.length > 0) {
      revenueRows.push({
        '#': '',
        'Workshop': 'TOTAL',
        'Start Date': '', 'End Date': '', 'Fee (₹)': '',
        'Enrolled':    enrollments.length,
        'Free':        enrollments.filter(e => e.paymentStatus === 'free').length,
        'Paid':        enrollments.filter(e => e.paymentStatus === 'paid').length,
        'Revenue (₹)': enrollments.reduce((a, e) => a + (e.fee || 0), 0)
      });
    }

    // ── Sheet 3: Attendance per workshop ────────────────
    const attendanceRows = [];
    for (const w of workshops) {
      const sessions = await AttendanceSession.find({ workshopId: w._id }).sort({ createdAt: 1 });
      const wEnrolls = enrollments.filter(e => e.workshopId.toString() === w._id.toString());
      for (const s of sessions) {
        const records = await AttendanceRecord.find({
          sessionId: s._id,
          studentId: { $in: studentIds }
        });
        const presentIds = new Set(records.map(r => r.studentId.toString()));
        for (const enroll of wEnrolls) {
          const isPresent = presentIds.has(enroll.studentId.toString());
          attendanceRows.push({
            'Workshop':    w.title,
            'Session':     s.sessionLabel,
            'Date':        new Date(s.createdAt).toLocaleDateString('en-IN'),
            'Student':     enroll.studentName || '',
            'Email':       enroll.studentEmail || '',
            'Status':      isPresent ? 'Present' : 'Absent',
            'Marked At':   isPresent
              ? records.find(r => r.studentId.toString() === enroll.studentId.toString())
                       ?.markedAt?.toLocaleTimeString('en-IN') || ''
              : ''
          });
        }
      }
    }

    // ── Build workbook ───────────────────────────────────
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(resultRows);
    ws1['!cols'] = [{wch:6},{wch:20},{wch:28},{wch:22},{wch:15},{wch:10},{wch:12},{wch:10},{wch:10},{wch:10},{wch:10},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws1, 'Test Results');

    if (revenueRows.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(revenueRows);
      ws2['!cols'] = [{wch:4},{wch:30},{wch:14},{wch:14},{wch:10},{wch:10},{wch:8},{wch:8},{wch:14}];
      XLSX.utils.book_append_sheet(wb, ws2, 'Workshop Revenue');
    }

    if (attendanceRows.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(attendanceRows);
      ws3['!cols'] = [{wch:28},{wch:20},{wch:14},{wch:20},{wch:28},{wch:10},{wch:12}];
      XLSX.utils.book_append_sheet(wb, ws3, 'Attendance');
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${college.name}-full-report.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('Download college report error:', err.message);
    req.flash('error_msg', 'Failed to download report.');
    res.redirect('/admin/colleges');
  }
};

// ── POST /admin/results/:id/reset ─────────────────────
exports.resetStudentTest = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);

    if (!result) {
      req.flash('error_msg', 'Result not found.');
      return res.redirect('/admin/results');
    }

    const email    = result.studentEmail;
    const testTitle = result.testTitle;

    await Result.findByIdAndDelete(req.params.id);

    req.flash('success_msg', `Result for ${email} on "${testTitle}" has been deleted. They can now retake the test.`);
    res.redirect('/admin/results');

  } catch (err) {
    console.error('Reset test error:', err.message);
    req.flash('error_msg', 'Failed to reset test. Please try again.');
    res.redirect('/admin/results');
  }
};

// ── GET /admin/tests/:id/edit ─────────────────────────
exports.getEditTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      req.flash('error_msg', 'Test not found.');
      return res.redirect('/admin/tests');
    }
    res.render('admin/edit-test', { title: `Edit Test — ${test.title}`, test });
  } catch (err) {
    req.flash('error_msg', 'Failed to load test.');
    res.redirect('/admin/tests');
  }
};

// ── POST /admin/tests/:id/edit ────────────────────────
exports.postEditTest = async (req, res) => {
  try {
    const { title, domain, duration, totalMarks, passingMarks, questionLimit, instructions,
            isScheduled, scheduledStart, scheduledEnd } = req.body;

    if (!title || !domain || !duration || !totalMarks) {
      req.flash('error_msg', 'Please fill all required fields.');
      return res.redirect(`/admin/tests/${req.params.id}/edit`);
    }

    const scheduled = isScheduled === 'on';
    if (scheduled && (!scheduledStart || !scheduledEnd)) {
      req.flash('error_msg', 'Please set both start and end time for the scheduled window.');
      return res.redirect(`/admin/tests/${req.params.id}/edit`);
    }
    if (scheduled && new Date(scheduledStart) >= new Date(scheduledEnd)) {
      req.flash('error_msg', 'End time must be after start time.');
      return res.redirect(`/admin/tests/${req.params.id}/edit`);
    }

    await Test.findByIdAndUpdate(req.params.id, {
      title:          title.trim(),
      domain,
      duration:       parseInt(duration),
      totalMarks:     parseInt(totalMarks),
      passingMarks:   parseInt(passingMarks) || 0,
      questionLimit:  parseInt(questionLimit) || 0,
      instructions:   instructions?.trim() || '',
      isScheduled:    scheduled,
      scheduledStart: scheduled ? new Date(scheduledStart) : null,
      scheduledEnd:   scheduled ? new Date(scheduledEnd)   : null
    });

    req.flash('success_msg', 'Test updated successfully.');
    res.redirect('/admin/tests');
  } catch (err) {
    console.error('Edit test error:', err.message);
    req.flash('error_msg', 'Failed to update test.');
    res.redirect(`/admin/tests/${req.params.id}/edit`);
  }
};

// ── GET /admin/questions/:id/edit ─────────────────────
exports.getEditQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      req.flash('error_msg', 'Question not found.');
      return res.redirect('/admin/tests');
    }
    const test = await Test.findById(question.testId);
    res.render('admin/edit-question', { title: 'Edit Question', question, test });
  } catch (err) {
    req.flash('error_msg', 'Failed to load question.');
    res.redirect('/admin/tests');
  }
};

// ── POST /admin/questions/:id/edit ────────────────────
exports.postEditQuestion = async (req, res) => {
  try {
    const { question, optA, optB, optC, optD, correctAnswer, marks, explanation } = req.body;

    if (!question || !optA || !optB || !optC || !optD || correctAnswer === undefined) {
      req.flash('error_msg', 'All question fields are required.');
      return res.redirect(`/admin/questions/${req.params.id}/edit`);
    }

    const updated = await Question.findByIdAndUpdate(req.params.id, {
      question:      question.trim(),
      options:       [optA.trim(), optB.trim(), optC.trim(), optD.trim()],
      correctAnswer: parseInt(correctAnswer),
      marks:         parseInt(marks) || 1,
      explanation:   explanation?.trim() || ''
    }, { new: true });

    req.flash('success_msg', 'Question updated successfully.');
    res.redirect(`/admin/tests/${updated.testId}/questions`);
  } catch (err) {
    console.error('Edit question error:', err.message);
    req.flash('error_msg', 'Failed to update question.');
    res.redirect(`/admin/questions/${req.params.id}/edit`);
  }
};

// ── GET /admin/announce ───────────────────────────────
exports.getAnnounce = async (req, res) => {
  try {
    const colleges = await College.find({ isActive: true }).sort({ name: 1 });
    const studentCount = await User.countDocuments({ role: 'student' });
    res.render('admin/announce', {
      title: 'Send Announcement — APARAITECH Admin',
      colleges,
      studentCount
    });
  } catch (err) {
    console.error('Announce page error:', err.message);
    req.flash('error_msg', 'Failed to load announcement page.');
    res.redirect('/admin/dashboard');
  }
};

// ── POST /admin/announce ──────────────────────────────
exports.postAnnounce = async (req, res) => {
  try {
    const { subject, message, audience, collegeId } = req.body;
    const { sendAnnouncementEmail } = require('../services/emailService');

    if (!subject?.trim() || !message?.trim()) {
      req.flash('error_msg', 'Subject and message are required.');
      return res.redirect('/admin/announce');
    }

    // Build recipient list
    const filter = { role: 'student' };
    if (audience === 'college' && collegeId) {
      filter.collegeId = collegeId;
    }

    const students = await User.find(filter, 'email').lean();
    const emails = students.map(s => s.email).filter(Boolean);

    if (emails.length === 0) {
      req.flash('error_msg', 'No students found for the selected audience.');
      return res.redirect('/admin/announce');
    }

    // Send async — don't block the response
    sendAnnouncementEmail(emails, subject.trim(), message.trim(), req.session.user.name)
      .then(({ sent, failed, total }) => {
        console.log(`Announcement: ${sent}/${total} sent, ${failed} failed`);
      })
      .catch(err => console.error('Announcement error:', err.message));

    req.flash('success_msg', `Announcement queued for ${emails.length} student(s). Emails are being sent in the background.`);
    res.redirect('/admin/announce');

  } catch (err) {
    console.error('Post announce error:', err.message);
    req.flash('error_msg', 'Failed to send announcement.');
    res.redirect('/admin/announce');
  }
};

// ── WA Template: GET /admin/users/wa-template ─────────
// Returns saved template as JSON (used by frontend)
let _waTemplate = 'Hi {name}, this is a message from APARAITECH. Please contact us for more information.';

exports.getWaTemplate = (req, res) => {
  res.json({ template: _waTemplate });
};

// ── WA Template: POST /admin/users/wa-template ────────
exports.saveWaTemplate = (req, res) => {
  const { template } = req.body;
  if (template && template.trim()) {
    _waTemplate = template.trim();
    req.flash('success_msg', 'WhatsApp message template saved!');
  }
  res.redirect('/admin/users');
};

// ── POST /admin/tests/:id/import-questions ────────────
exports.importQuestions = async (req, res) => {
  try {
    const { parseExcelQuestions } = require('../utils/excelImport');
    const testId = req.params.id;

    const test = await Test.findById(testId);
    if (!test) {
      req.flash('error_msg', 'Test not found.');
      return res.redirect('/admin/tests');
    }

    if (!req.file) {
      req.flash('error_msg', 'Please upload an Excel file (.xlsx or .xls).');
      return res.redirect(`/admin/tests/${testId}/questions`);
    }

    const { questions, errors } = parseExcelQuestions(req.file.buffer);

    if (questions.length === 0) {
      req.flash('error_msg', `No valid questions found. ${errors.join(' ')}`);
      return res.redirect(`/admin/tests/${testId}/questions`);
    }

    await Question.insertMany(questions.map(q => ({ testId, ...q })));

    const successMsg = `${questions.length} question(s) imported successfully.` +
      (errors.length ? ` (${errors.length} row(s) skipped: ${errors.join(' ')})` : '');

    req.flash('success_msg', successMsg);
    res.redirect(`/admin/tests/${testId}/questions`);

  } catch (err) {
    console.error('Import questions error:', err.message);
    req.flash('error_msg', 'Failed to import questions. Make sure the file format is correct.');
    res.redirect(`/admin/tests/${req.params.id}/questions`);
  }
};
