/**
 * Workshop Controller
 * ===================
 * Admin: create/manage workshops, upload materials, review tasks
 * Student: browse, enroll, pay, access materials, submit tasks
 */

const Workshop       = require('../models/Workshop');
const Enrollment     = require('../models/Enrollment');
const StudyMaterial  = require('../models/StudyMaterial');
const TaskSubmission = require('../models/TaskSubmission');
const College        = require('../models/College');
const User           = require('../models/User');
const Razorpay       = require('razorpay');
const crypto         = require('crypto');
const { sendReceiptEmail }    = require('../services/emailService');
const { generateReceiptPDF }  = require('../services/pdfService');

// Razorpay instance (lazy)
function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// ═══════════════════════════════════════════════════
// ADMIN CONTROLLERS
// ═══════════════════════════════════════════════════

// GET /admin/workshops
exports.adminGetWorkshops = async (req, res) => {
  try {
    const workshops = await Workshop.find({}).sort({ startDate: -1 });
    const withStats = await Promise.all(workshops.map(async w => {
      const enrollCount = await Enrollment.countDocuments({ workshopId: w._id, paymentStatus: { $in: ['paid','free'] } });
      return { ...w.toObject(), enrollCount };
    }));
    res.render('admin/workshops', { title: 'Manage Workshops', workshops: withStats });
  } catch (err) {
    req.flash('error_msg', 'Failed to load workshops.');
    res.redirect('/admin/dashboard');
  }
};

// GET /admin/workshops/create
exports.adminGetCreateWorkshop = async (req, res) => {
  const colleges = await College.find({ isActive: true }).sort({ name: 1 });
  res.render('admin/workshop-create', { title: 'Create Workshop', colleges });
};

// POST /admin/workshops/create
exports.adminPostCreateWorkshop = async (req, res) => {
  try {
    const { title, description, instructor, collegeId, fee, isFree, startDate, endDate, startTime, endTime, venue, maxSeats, tags } = req.body;
    let collegeName = '';
    if (collegeId) {
      const college = await College.findById(collegeId);
      collegeName = college?.name || '';
    }
    await Workshop.create({
      title: title.trim(),
      description: description?.trim() || '',
      instructor: instructor?.trim() || 'APARAITECH',
      collegeId: collegeId || null,
      collegeName,
      fee: isFree === 'on' ? 0 : parseFloat(fee) || 0,
      isFree: isFree === 'on',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime: startTime || '10:00',
      endTime: endTime || '17:00',
      venue: venue?.trim() || '',
      maxSeats: parseInt(maxSeats) || 100,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
    });
    req.flash('success_msg', `Workshop "${title}" created!`);
    res.redirect('/admin/workshops');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to create workshop.');
    res.redirect('/admin/workshops/create');
  }
};

// GET /admin/workshops/:id
exports.adminGetWorkshopDetail = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) { req.flash('error_msg', 'Workshop not found.'); return res.redirect('/admin/workshops'); }

    const AttendanceSession = require('../models/AttendanceSession');
    const AttendanceRecord  = require('../models/AttendanceRecord');

    const [enrollments, materials, totalSessions] = await Promise.all([
      Enrollment.find({ workshopId: workshop._id, paymentStatus: { $in: ['paid','free'] } }).sort({ enrolledAt: -1 }),
      StudyMaterial.find({ workshopId: workshop._id }).sort({ order: 1, createdAt: 1 }),
      AttendanceSession.countDocuments({ workshopId: workshop._id })
    ]);

    // Attach attendance count + % to each enrollment
    const enrollmentsWithAtt = await Promise.all(enrollments.map(async e => {
      const marked = await AttendanceRecord.countDocuments({
        workshopId: workshop._id,
        studentId:  e.studentId
      });
      return {
        ...e.toObject(),
        markedSessions: marked,
        totalSessions,
        attendancePct: totalSessions > 0 ? Math.round(marked / totalSessions * 100) : null
      };
    }));

    res.render('admin/workshop-detail', {
      title: workshop.title,
      workshop,
      enrollments: enrollmentsWithAtt,
      materials,
      totalSessions
    });
  } catch (err) {
    req.flash('error_msg', 'Failed to load workshop.');
    res.redirect('/admin/workshops');
  }
};

// POST /admin/workshops/:id/material
exports.adminAddMaterial = async (req, res) => {
  try {
    const { title, description, type, content, fileUrl, isTask, taskDeadline, order } = req.body;
    await StudyMaterial.create({
      workshopId: req.params.id,
      title: title.trim(),
      description: description?.trim() || '',
      type: type || 'notes',
      content: content?.trim() || '',
      fileUrl: fileUrl?.trim() || '',
      isTask: isTask === 'on',
      taskDeadline: taskDeadline ? new Date(taskDeadline) : null,
      order: parseInt(order) || 0,
      uploadedBy: req.session.user?.name || 'Admin'
    });
    req.flash('success_msg', 'Material added!');
    res.redirect(`/admin/workshops/${req.params.id}`);
  } catch (err) {
    req.flash('error_msg', 'Failed to add material.');
    res.redirect(`/admin/workshops/${req.params.id}`);
  }
};

// POST /admin/workshops/:id/delete
exports.adminDeleteWorkshop = async (req, res) => {
  try {
    await Workshop.findByIdAndDelete(req.params.id);
    await Enrollment.deleteMany({ workshopId: req.params.id });
    await StudyMaterial.deleteMany({ workshopId: req.params.id });
    req.flash('success_msg', 'Workshop deleted.');
    res.redirect('/admin/workshops');
  } catch (err) {
    req.flash('error_msg', 'Failed to delete workshop.');
    res.redirect('/admin/workshops');
  }
};

// GET /admin/workshops/:id/submissions
exports.adminGetSubmissions = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    const submissions = await TaskSubmission.find({ workshopId: req.params.id }).sort({ submittedAt: -1 });
    const materials   = await StudyMaterial.find({ workshopId: req.params.id, isTask: true });
    res.render('admin/workshop-submissions', { title: 'Task Submissions', workshop, submissions, materials });
  } catch (err) {
    req.flash('error_msg', 'Failed to load submissions.');
    res.redirect('/admin/workshops');
  }
};

// POST /admin/submissions/:id/review
exports.adminReviewSubmission = async (req, res) => {
  try {
    const { status, feedback, grade, workshopId } = req.body;
    await TaskSubmission.findByIdAndUpdate(req.params.id, { status, feedback, grade });
    req.flash('success_msg', 'Submission reviewed!');
    res.redirect(`/admin/workshops/${workshopId}/submissions`);
  } catch (err) {
    req.flash('error_msg', 'Failed to review submission.');
    res.redirect('/admin/workshops');
  }
};

// GET /admin/workshops/:id/download (Excel of enrollments)
exports.adminDownloadEnrollments = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const workshop = await Workshop.findById(req.params.id);
    const enrollments = await Enrollment.find({ workshopId: req.params.id }).sort({ enrolledAt: -1 });
    const rows = enrollments.map((e, i) => ({
      '#': i+1,
      'Name': e.studentName || '',
      'Email': e.studentEmail || '',
      'College': e.collegeName || '',
      'Fee': e.fee,
      'Payment': e.paymentStatus,
      'Payment ID': e.paymentId || '',
      'Enrolled At': new Date(e.enrolledAt).toLocaleDateString('en-IN')
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:4},{wch:20},{wch:28},{wch:22},{wch:8},{wch:10},{wch:24},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws, 'Enrollments');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${workshop.title}-enrollments.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    req.flash('error_msg', 'Failed to download.');
    res.redirect('/admin/workshops');
  }
};

// ═══════════════════════════════════════════════════
// STUDENT CONTROLLERS
// ═══════════════════════════════════════════════════

// GET /student/workshops
exports.studentGetWorkshops = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    // Show workshops for student's college + all-college workshops
    const query = {
      isActive: true,
      $or: [
        { collegeId: null },
        { collegeName: '' }
      ]
    };
    if (user.collegeId) {
      query.$or.push({ collegeId: user.collegeId });
    }

    const workshops = await Workshop.find(query).sort({ startDate: 1 });

    // Check which ones student is enrolled in
    const enrollments = await Enrollment.find({
      studentId: req.session.user._id,
      paymentStatus: { $in: ['paid', 'free'] }
    });
    const enrolledIds = new Set(enrollments.map(e => e.workshopId.toString()));

    const workshopsWithStatus = workshops.map(w => ({
      ...w.toObject(),
      isEnrolled: enrolledIds.has(w._id.toString()),
      seatsLeft: w.maxSeats - w.enrolledCount
    }));

    // Check for new workshops (created in last 7 days) for alert
    const newWorkshops = workshopsWithStatus.filter(w => {
      const daysSince = (Date.now() - new Date(w.createdAt)) / (1000 * 60 * 60 * 24);
      return daysSince <= 7 && !w.isEnrolled;
    });

    res.render('student/workshops', {
      title: 'Workshops — APARAITECH',
      workshops: workshopsWithStatus,
      newWorkshops,
      razorpayKey: process.env.RAZORPAY_KEY_ID || ''
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load workshops.');
    res.redirect('/student/dashboard');
  }
};

// POST /student/workshops/:id/create-order (Razorpay)
exports.createOrder = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    // Check already enrolled
    const existing = await Enrollment.findOne({
      workshopId: workshop._id,
      studentId: req.session.user._id,
      paymentStatus: { $in: ['paid','free'] }
    });
    if (existing) return res.json({ alreadyEnrolled: true });

    // Free workshop — enroll directly
    if (workshop.isFree || workshop.fee === 0) {
      const user = await User.findById(req.session.user._id);
      const enrollment = await Enrollment.findOneAndUpdate(
        { workshopId: workshop._id, studentId: req.session.user._id },
        {
          workshopTitle: workshop.title,
          studentName:   user.name,
          studentEmail:  user.email,
          collegeName:   user.collegeName || '',
          collegeId:     user.collegeId || null,
          fee: 0,
          paymentStatus: 'free',
          enrolledAt: new Date()
        },
        { upsert: true, new: true }
      );
      await Workshop.findByIdAndUpdate(workshop._id, { $inc: { enrolledCount: 1 } });

      // Send receipt email async
      sendReceiptEmail({ enrollment, workshop, student: user }).catch(err =>
        console.error('Receipt email error:', err.message)
      );

      return res.json({ free: true, redirect: `/student/workshops/${workshop._id}` });
    }

    // Paid workshop — create Razorpay order
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(workshop.fee * 100), // paise
      currency: 'INR',
      receipt: `ws_${workshop._id}_${req.session.user._id}`.substring(0, 40),
      notes: {
        workshopId: workshop._id.toString(),
        studentId:  req.session.user._id.toString(),
        workshop:   workshop.title
      }
    });

    // Save pending enrollment
    const user = await User.findById(req.session.user._id);
    await Enrollment.findOneAndUpdate(
      { workshopId: workshop._id, studentId: req.session.user._id },
      {
        workshopTitle: workshop.title,
        studentName:   user.name,
        studentEmail:  user.email,
        collegeName:   user.collegeName || '',
        collegeId:     user.collegeId || null,
        fee: workshop.fee,
        paymentStatus: 'pending',
        orderId: order.id
      },
      { upsert: true, new: true }
    );

    res.json({
      orderId:   order.id,
      amount:    order.amount,
      currency:  order.currency,
      key:       process.env.RAZORPAY_KEY_ID,
      name:      'APARAITECH',
      description: workshop.title,
      workshopId: workshop._id
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Payment failed. Try again.' });
  }
};

// POST /student/workshops/verify-payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, workshopId } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed.' });
    }

    // Update enrollment
    const enrollment = await Enrollment.findOneAndUpdate(
      { workshopId, studentId: req.session.user._id },
      { paymentStatus: 'paid', paymentId: razorpay_payment_id },
      { new: true }
    );
    await Workshop.findByIdAndUpdate(workshopId, { $inc: { enrolledCount: 1 } });

    // Send receipt email async
    const [workshop, student] = await Promise.all([
      Workshop.findById(workshopId),
      User.findById(req.session.user._id)
    ]);
    sendReceiptEmail({ enrollment, workshop, student }).catch(err =>
      console.error('Receipt email error:', err.message)
    );

    res.json({ success: true, redirect: `/student/workshops/${workshopId}` });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
};

// GET /student/workshops/:id/receipt
exports.downloadReceipt = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      workshopId: req.params.id,
      studentId:  req.session.user._id,
      paymentStatus: { $in: ['paid', 'free'] }
    });
    if (!enrollment) {
      req.flash('error_msg', 'No enrollment found.');
      return res.redirect(`/student/workshops/${req.params.id}`);
    }
    const [workshop, student] = await Promise.all([
      Workshop.findById(req.params.id),
      User.findById(req.session.user._id)
    ]);
    generateReceiptPDF(res, { enrollment, workshop, student });
  } catch (err) {
    console.error('Receipt download error:', err.message);
    req.flash('error_msg', 'Failed to generate receipt.');
    res.redirect(`/student/workshops/${req.params.id}`);
  }
};

// GET /student/workshops/:id
exports.studentGetWorkshopRoom = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) { req.flash('error_msg', 'Workshop not found.'); return res.redirect('/student/workshops'); }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      workshopId: workshop._id,
      studentId:  req.session.user._id,
      paymentStatus: { $in: ['paid','free'] }
    });
    if (!enrollment) {
      req.flash('error_msg', 'Please enroll in this workshop first.');
      return res.redirect('/student/workshops');
    }

    const materials = await StudyMaterial.find({ workshopId: workshop._id }).sort({ order: 1, createdAt: 1 });

    // Get student's task submissions
    const submissions = await TaskSubmission.find({
      workshopId: workshop._id,
      studentId: req.session.user._id
    });
    const submittedTaskIds = new Set(submissions.map(s => s.materialId.toString()));

    // Attendance data
    const { getStudentAttendanceData } = require('./attendanceController');
    const { openSessions, allSessions, markedIds } = await getStudentAttendanceData(
      workshop._id, req.session.user._id
    );

    res.render('student/workshop-room', {
      title: workshop.title,
      workshop,
      materials,
      submittedTaskIds,
      submissions,
      openSessions,
      allSessions,
      markedIds
    });
  } catch (err) {
    req.flash('error_msg', 'Failed to load workshop.');
    res.redirect('/student/workshops');
  }
};

// POST /student/workshops/:workshopId/tasks/:materialId/submit
exports.submitTask = async (req, res) => {
  try {
    const { submissionText, fileUrl } = req.body;
    const { workshopId, materialId } = req.params;
    const user = await User.findById(req.session.user._id);

    await TaskSubmission.findOneAndUpdate(
      { materialId, studentId: req.session.user._id },
      {
        workshopId,
        studentName:  user.name,
        studentEmail: user.email,
        submissionText: submissionText?.trim() || '',
        fileUrl: fileUrl?.trim() || '',
        status: 'submitted',
        submittedAt: new Date()
      },
      { upsert: true, new: true }
    );

    req.flash('success_msg', 'Task submitted successfully!');
    res.redirect(`/student/workshops/${workshopId}`);
  } catch (err) {
    req.flash('error_msg', 'Failed to submit task.');
    res.redirect(`/student/workshops/${workshopId}`);
  }
};
