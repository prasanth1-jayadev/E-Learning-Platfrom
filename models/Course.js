import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  description: {
    type: String,
    required: true,
    maxlength: 2000
  },

  category: {
    type: String,
    required: true,
    enum: ['Development', 'Design', 'Business', 'Marketing', 'Science', 'Mathematics', 'Language', 'Other'],
    default: 'Other'
  },

  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },

  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  discountPrice: {
    type: Number,
    min: 0,
    default: null
  },

  thumbnail: {
    type: String,
    default: null
  },

  tutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    required: true
  },

  lessons: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    videoUrl: {
      type: String,
      default: ''
    },
    duration: {
      type: Number,
      default: 0
    },
    order: {
      type: Number,
      default: 0
    }
  }],

  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  reviewCount: {
    type: Number,
    default: 0
  },

  isPublished: {
    type: Boolean,
    default: false
  },

  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  }

}, {
  timestamps: true
});

courseSchema.index({ tutor: 1, status: 1 });
courseSchema.index({ category: 1, isPublished: 1 });

courseSchema.virtual('studentCount').get(function() {
  return this.enrolledStudents.length;
});

courseSchema.virtual('lessonCount').get(function() {
  return this.lessons.length;
});

export default mongoose.model('Course', courseSchema);