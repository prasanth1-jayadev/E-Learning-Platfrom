import Tutor from '../../models/Tutor.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';

const getTutors = async (req, res) => {
  try {
    const user = req.session.userId
      ? await User.findById(req.session.userId)
      : null;

    const search = req.query.search || "";
    const sort = req.query.sort || "newest";

    const filter = {
      approvalStatus: "approved",
    };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { bio: { $regex: search, $options: "i" } },
        { subjects: { $regex: search, $options: "i" } },
      ];
    }

    let sortQuery = {};

    switch (sort) {
      case "name-az":
        sortQuery = { fullName: 1 };
        break;
      case "name-za":
        sortQuery = { fullName: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    const tutors = await Tutor.find(filter)
      .select("fullName email bio subjects phone avatar")
      .sort(sortQuery)
      .lean();

    const tutorsWithData = await Promise.all(
      tutors.map(async (tutor) => {
        const courses = await Course.find({
          tutor: tutor._id,
          isPublished: true,
        })
          .select("rating reviewCount")
          .lean();

        let totalReviews = 0;
        let totalRatingPoints = 0;

        courses.forEach((course) => {
          const reviewCount = course.reviewCount || 0;
          const rating = course.rating || 0;

          totalReviews += reviewCount;
          totalRatingPoints += rating * reviewCount;
        });

        const overallRating =
          totalReviews > 0
            ? parseFloat((totalRatingPoints / totalReviews).toFixed(1))
            : 0;

        return {
          ...tutor,
          rating: overallRating,
          reviewCount: totalReviews,
          courseCount: courses.length,
          profileImage: tutor.avatar,
          bio:
            tutor.bio ||
            "Experienced tutor specializing in various subjects.",
        };
      })
    );

    if (sort === "rating-high") {
      tutorsWithData.sort((a, b) => b.rating - a.rating);
    } else if (sort === "rating-low") {
      tutorsWithData.sort((a, b) => a.rating - b.rating);
    }

    res.render("user/tutors", {
      tutors: tutorsWithData,
      search,
      sort,
      user,
      currentPage: "tutors",
    });
  } catch (error) {
    console.error(error);
    res.render("user/tutors", {
      tutors: [],
      search: "",
      sort: "newest",
      user: null,
      currentPage: "tutors",
    });
  }
};

const getTutorDetail = async (req, res) => {
  try {
    const user = req.session.userId
      ? await User.findById(req.session.userId)
      : null;

    const tutor = await Tutor.findById(req.params.id).lean();

    if (!tutor) {
      return res.redirect("/user/tutors");
    }

    const courses = await Course.find({
      tutor: req.params.id,
      isPublished: true,
    })
      .select(
        "title description price thumbnail lessons rating reviewCount"
      )
      .lean();

    let totalReviews = 0;
    let totalRatingPoints = 0;

    courses.forEach((course) => {
      const reviewCount = course.reviewCount || 0;
      const rating = course.rating || 0;

      totalReviews += reviewCount;
      totalRatingPoints += rating * reviewCount;
    });

    const overallRating =
      totalReviews > 0
        ? parseFloat((totalRatingPoints / totalReviews).toFixed(1))
        : 0;

    const coursesWithStatus = courses.map((course) => {
      const isPurchased =
        user &&
        user.enrolledCourses &&
        user.enrolledCourses.some(
          (cId) => cId.toString() === course._id.toString()
        );

      return {
        ...course,
        isPurchased: !!isPurchased,
      };
    });

    res.render("user/tutor-detail", {
      tutor: {
        ...tutor,
        rating: overallRating,
        reviewCount: totalReviews,
      },
      courses: coursesWithStatus,
      user,
      currentPage: "tutors",
    });
  } catch (error) {
    console.error("Get tutor detail error:", error);
    res.redirect("/user/tutors");
  }
};

export {
  getTutors,
  getTutorDetail
};
