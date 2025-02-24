const mongoose = require("mongoose");

const classroomJoinSchema = new mongoose.Schema(
  {
    classroomId: {
      type: mongoose.Schema.ObjectId, // refernce to classroom model
      ref: "Classroom", // model name to refer to
      require: true,
    },
    studentEmail: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    classOwnerEmail: {
      type: String, // Email of the class owner
      required: true,
    },
  },
  { timestamps: true }
);

const ClassroomJoin = mongoose.model("ClassroomJoin", classroomJoinSchema);

module.exports = ClassroomJoin;
