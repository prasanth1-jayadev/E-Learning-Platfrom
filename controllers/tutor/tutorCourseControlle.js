const Course = require('../models/Course');

const getTutorCourses = async (req, res) => {
  try {
    const tutorId = req.tutor._id; 

    const courses = await Course.find({ tutor: tutorId });

    console.log(courses);
    
    res.send("Courses fetched successfully");
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  getTutorCourses
};