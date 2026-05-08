import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    videoUrl:{
   type:String
    },
    isFree:{
        type:Boolean,
        default:false
    },
    course:{
        type: mongoose.Schema.Types.ObjectId ,
        ref:"Course",
        required:true
    }
},{timestamps:true})

export default mongoose.models.Lesson|| mongoose.model("Lesson",lessonSchema)