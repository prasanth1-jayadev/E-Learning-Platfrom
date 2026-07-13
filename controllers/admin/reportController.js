import Report from '../../models/Report.js';
import Course from '../../models/Course.js';
import * as adminService from '../../service/adminService.js';

export const getReportsDashboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalReports = await Report.countDocuments();
    const reports = await Report.find()
      .populate('userId', 'fullName email')
      .populate({
        path: 'courseId',
        select: 'title tutor reportCount isListed',
        populate: { path: 'tutor', select: 'fullName email' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalReports / limit);
    const pendingCount = await adminService.getPendingTutorApplications().then(tutors => tutors.length);

    res.render('admin/reports', {
      reports,
      currentPage: 'reports',
      pendingCount,
      pagination: {
        currentPage: page,
        totalPages,
        totalReports,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page + 1,
        prevPage: page - 1
      }
    });
  } catch (error) {
    console.error("Fetch reports error:", error);
    res.redirect('/admin/dashboard');
  }
};

export const updateCourseModerationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isListed, unlistingReason } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    course.isListed = isListed;
    if (!isListed) {
      course.unlistingReason = unlistingReason || 'Violated content guidelines';
      // If unlisting, update associated reports to 'Action Taken'
      await Report.updateMany({ courseId: id }, { status: 'Action Taken' });
    } else {
      course.unlistingReason = null;
      // If relisting, update associated reports to 'Reviewed'
      await Report.updateMany({ courseId: id }, { status: 'Reviewed' });
    }
    await course.save();

    res.json({
      success: true,
      message: `Course has been ${isListed ? 'listed' : 'unlisted'} successfully.`,
      isListed: course.isListed
    });
  } catch (error) {
    console.error("Moderation status update error:", error);
    res.status(500).json({ success: false, message: 'Failed to update moderation status' });
  }
};
