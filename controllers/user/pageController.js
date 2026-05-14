import User from '../../models/User.js';
import Course from '../../models/Course.js';
import Tutor from '../../models/Tutor.js';

const getLanding = async (req, res) => {
  try {
    const courses = await Course.find({
      status: 'published',
      $nor: [
        { title: 'psychology', category: 'SCIENCE' }
      ]
    })
      .populate('tutor', 'fullName')
      .sort({ createdAt: -1 })
      .limit(8);

    const certifiedTutors = await Tutor.find({
      approvalStatus: 'approved',
      isCertified: true
    })
      .select('fullName avatar bio subjects')
      .lean();

    const tutors = certifiedTutors.sort(() => 0.5 - Math.random());

    res.render('user/landing', { courses, tutors, user: null, currentPage: 'home' });
  } catch (error) {
    console.error('Error loading landing page:', error);
    res.render('user/landing', { courses: [], tutors: [], user: null, currentPage: 'home' });
  }
};



const getHome = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const courses = await Course.find({
      isPublished: true,
      $nor: [
        { title: 'psychology', category: 'SCIENCE' }
      ]
    })
      .populate('tutor', 'fullName')
      .sort({ createdAt: -1 })
      .limit(4);

    const certifiedTutors = await Tutor.find({
      approvalStatus: 'approved',
      isCertified: true
    })
      .select('fullName avatar bio subjects')
      .lean();

    const tutors = certifiedTutors.sort(() => 0.5 - Math.random());

    res.render('user/home', { courses, user, tutors, currentPage: 'home' });

  } catch (error) {
    console.log(error);
    res.render('user/home', { courses: [], user: null, tutors: [], currentPage: 'home' });
  }
};

export {
  getLanding,
  getHome
};
