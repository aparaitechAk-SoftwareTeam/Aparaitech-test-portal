/**
 * Attendance Controller
 * =====================
 * Admin: create session, open/close attendance window, view report
 * Student: mark attendance using token while session is open
 */

const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord  = require('../models/AttendanceRecord');
const Workshop          = require('../models/Workshop');
const Enrollment        = require('../models/Enrollment');
const User              = require('../models/User');
const crypto            = require('crypto');

function genToken() {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-char e.g. "A3F9C1"
}

// ═══════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════

// GET /admin/workshops/:id/attendance
exports.adminGetAttendance = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) { req.flash('error_msg', 'Workshop not found.'); return res.redirect('/admin/workshops'); }

    const sessions = await AttendanceSession.find({ workshopId: workshop._id }).sort({ createdAt: -1 });

    // For each session get count of records
    const sessionsWithCount = await Promise.all(sessions.map(async s => {
      const count = await AttendanceRecord.countDocuments({ sessionId: s._id });
      return { ...s.toObject(), presentCount: count };
    }));

    const enrolledCount = await Enrollment.countDocuments({
      workshopId: workshop._id,
      paymentStatus: { $in: ['paid', 'free'] }
    });

    res.render('admin/workshop-attendance', {
      title: `Attendance — ${workshop.title}`,
      workshop,
      sessions: sessionsWithCount,
      enrolledCount
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load attendance.');
    res.redirect('/admin/workshops');
  }
};

// POST /admin/workshops/:id/attendance/create
exports.adminCreateSession = async (req, res) => {
  try {
    const { sessionLabel } = req.body;
    const token = genToken();
    await AttendanceSession.create({
      workshopId:   req.params.id,
      sessionLabel: sessionLabel?.trim() || `Session ${Date.now()}`,
      token,
      isOpen:       false,
      createdBy:    req.session.user?.name || 'Admin'
    });
    req.flash('success_msg', `Session created with token: ${token}`);
    res.redirect(`/admin/workshops/${req.params.id}/attendance`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to create session.');
    res.redirect(`/admin/workshops/${req.params.id}/attendance`);
  }
};

// POST /admin/attendance/:sessionId/open
exports.adminOpenSession = async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.sessionId);
    await AttendanceSession.findByIdAndUpdate(req.params.sessionId, {
      isOpen: true, openedAt: new Date(), closedAt: null
    });
    req.flash('success_msg', 'Attendance window opened! Students can now mark attendance.');
    res.redirect(`/admin/workshops/${session.workshopId}/attendance`);
  } catch (err) {
    req.flash('error_msg', 'Failed to open session.');
    res.redirect('/admin/workshops');
  }
};

// POST /admin/attendance/:sessionId/close
exports.adminCloseSession = async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.sessionId);
    await AttendanceSession.findByIdAndUpdate(req.params.sessionId, {
      isOpen: false, closedAt: new Date()
    });
    req.flash('success_msg', 'Attendance window closed.');
    res.redirect(`/admin/workshops/${session.workshopId}/attendance`);
  } catch (err) {
    req.flash('error_msg', 'Failed to close session.');
    res.redirect('/admin/workshops');
  }
};

// GET /admin/attendance/:sessionId/report
exports.adminSessionReport = async (req, res) => {
  try {
    const session  = await AttendanceSession.findById(req.params.sessionId);
    const workshop = await Workshop.findById(session.workshopId);
    const records  = await AttendanceRecord.find({ sessionId: session._id }).sort({ markedAt: 1 });

    // All enrolled students for absent list
    const enrollments = await Enrollment.find({
      workshopId: session.workshopId,
      paymentStatus: { $in: ['paid', 'free'] }
    });
    const presentIds = new Set(records.map(r => r.studentId.toString()));
    const absent = enrollments.filter(e => !presentIds.has(e.studentId.toString()));

    res.render('admin/attendance-report', {
      title: `Report — ${session.sessionLabel}`,
      session,
      workshop,
      records,
      absent,
      enrolledCount: enrollments.length
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load report.');
    res.redirect('/admin/workshops');
  }
};

// GET /admin/attendance/:sessionId/download  (Excel)
exports.adminDownloadAttendance = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const session  = await AttendanceSession.findById(req.params.sessionId);
    const workshop = await Workshop.findById(session.workshopId);
    const records  = await AttendanceRecord.find({ sessionId: session._id }).sort({ markedAt: 1 });

    const enrollments = await Enrollment.find({
      workshopId: session.workshopId,
      paymentStatus: { $in: ['paid', 'free'] }
    });
    const presentIds = new Set(records.map(r => r.studentId.toString()));

    const rows = enrollments.map((e, i) => ({
      '#': i + 1,
      'Name':    e.studentName || '',
      'Email':   e.studentEmail || '',
      'College': e.collegeName || '',
      'Status':  presentIds.has(e.studentId.toString()) ? 'Present' : 'Absent',
      'Time':    presentIds.has(e.studentId.toString())
                   ? records.find(r => r.studentId.toString() === e.studentId.toString())?.markedAt?.toLocaleTimeString('en-IN') || ''
                   : ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:4},{wch:22},{wch:28},{wch:22},{wch:10},{wch:12}];
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${workshop.title}-${session.sessionLabel}-attendance.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    req.flash('error_msg', 'Failed to download.');
    res.redirect('/admin/workshops');
  }
};

// ═══════════════════════════════════════════════
// STUDENT
// ═══════════════════════════════════════════════

// POST /student/workshops/:workshopId/attendance/mark
exports.studentMarkAttendance = async (req, res) => {
  try {
    const { token } = req.body;
    const { workshopId } = req.params;

    // Verify enrollment
    const enrollment = await Enrollment.findOne({
      workshopId,
      studentId: req.session.user._id,
      paymentStatus: { $in: ['paid', 'free'] }
    });
    if (!enrollment) {
      req.flash('error_msg', 'You are not enrolled in this workshop.');
      return res.redirect('/student/workshops');
    }

    // Find open session by token
    const session = await AttendanceSession.findOne({
      workshopId,
      token: token?.trim().toUpperCase(),
      isOpen: true
    });
    if (!session) {
      req.flash('error_msg', 'Invalid token or attendance window is closed.');
      return res.redirect(`/student/workshops/${workshopId}`);
    }

    // Already marked?
    const existing = await AttendanceRecord.findOne({
      sessionId: session._id,
      studentId: req.session.user._id
    });
    if (existing) {
      req.flash('success_msg', 'You have already marked attendance for this session.');
      return res.redirect(`/student/workshops/${workshopId}`);
    }

    // Mark
    const user = await User.findById(req.session.user._id);
    await AttendanceRecord.create({
      sessionId:    session._id,
      workshopId,
      studentId:    req.session.user._id,
      studentName:  user.name,
      studentEmail: user.email,
      collegeName:  user.collegeName || ''
    });

    req.flash('success_msg', `Attendance marked for "${session.sessionLabel}"!`);
    res.redirect(`/student/workshops/${workshopId}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to mark attendance. Please try again.');
    res.redirect(`/student/workshops/${req.params.workshopId}`);
  }
};

// Data for student workshop room: open sessions + student's marked sessions
exports.getStudentAttendanceData = async (workshopId, studentId) => {
  const openSessions   = await AttendanceSession.find({ workshopId, isOpen: true });
  const allSessions    = await AttendanceSession.find({ workshopId }).sort({ createdAt: -1 });
  const myRecords      = await AttendanceRecord.find({ workshopId, studentId });
  const markedIds      = new Set(myRecords.map(r => r.sessionId.toString()));
  return { openSessions, allSessions, markedIds };
};
