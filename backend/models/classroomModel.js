const mongoose = require("mongoose");

const ClassroomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // reference to the User model
      required: true,
    },

    description: {
      type: String,
      trim: true,
    },
    students: [String],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post", // reference to Post Collection
      },
    ],
  },
  { timestamps: true }
);

const Classroom = mongoose.model("Classroom", ClassroomSchema);
module.exports = Classroom;
