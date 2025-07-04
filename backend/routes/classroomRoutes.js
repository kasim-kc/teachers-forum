const express = require("express");
const Classroom = require("../models/classroomModel");
const User = require("../models/userModel");
const Post = require("../models/postModel");
const ClassroomJoin = require("../models/classroomJoinModel");
const responseFunction = require("../utils/responseFunction");
const authTokenHandler = require("../middlewares/checkAuthToken");
const router = express.Router();
const nodemailer = require("nodemailer");
// const { toast } = require("react-toastify");

const mailer = async (recieveremail, code) => {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.COMPANY_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  let info = await transporter.sendMail({
    from: "Teachers Forum",
    to: recieveremail,
    subject: "OTP for classroom",
    text: "Your OTP is " + code,
    html: "<b>Your OTP is " + code + "</b>",
  });

  console.log("Message sent: %s", info.messageId);
  if (info.messageId) {
    return true;
  }
  return false;
};

router.post("/create", authTokenHandler, async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return responseFunction(
      res,
      400,
      "Classroom name is required",
      null,
      false
    );
  }

  try {
    const newClassroom = new Classroom({
      name,
      description,
      owner: req.userId, // set the owner to current user
    });

    await newClassroom.save();

    return responseFunction(
      res,
      201,
      "Classroom created successfully",
      newClassroom,
      true
    );
  } catch (err) {
    return responseFunction(res, 500, "Internal Server Error", err, false);
  }
});

router.get("/classroomscreatedbyme", authTokenHandler, async (req, res) => {
  try {
    const classrooms = await Classroom.find({ owner: req.userId });

    return responseFunction(
      res,
      200,
      "Classrooms fetched successfully",
      classrooms,
      true
    );
  } catch (err) {
    return responseFunction(res, 500, "Internal Server Error", err, false);
  }
});

router.get("/getclassbyid/:classid", authTokenHandler, async (req, res) => {
  const { classid } = req.params;

  // add one more condition :-> if(classroom.owner == req.userId or classroom.students.includes(id) then only populate)
  try {
    const classroom = await Classroom.findById(classid).populate("posts"); // populate(): Classroom only saves post reference
    //  with help of Ids,  so to display actual content we use populate method
    if (!classroom) {
      return responseFunction(res, 404, "Classroom not found", null, false);
    }

    return responseFunction(
      res,
      200,
      "Classroom fetched successfully",
      classroom,
      true
    );
  } catch (error) {
    return responseFunction(res, 500, "Internal Server Error", error, false);
  }
});

router.post("/addpost", authTokenHandler, async (req, res) => {
  const { title, description, classId } = req.body;

  try {
    const classroom = await Classroom.findById(classId);
    if (!classroom) {
      return res.status(404).json({ message: "Classroom not found" });
    }

    // TODO: if classroom.owner !== req.userId -> not allowed to share a post to this class

    const newPost = new Post({
      title,
      description,
      classId,
      createdBy: req.userId, // req.user comes from requireAuth middleware
    });
    await newPost.save();

    classroom.posts.push(newPost._id);
    await classroom.save();

    res
      .status(201)
      .json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.get("/classrooms/search", async (req, res) => {
  try {
    const term = req.query.term;
    if (!term) {
      return responseFunction(res, 400, "Search term is required", null, false);
    }

    const results = await Classroom.find({
      name: { $regex: new RegExp(term, "i") },
    });

    if (results.length === 0) {
      return responseFunction(res, 404, "Classroom not found", null, false);
    }

    responseFunction(res, 200, "Search results", results, true);
  } catch (err) {
    console.error(err);
    responseFunction(res, 500, "Internal Server Error", err, false);
  }
});

router.post("/request-to-join", async (req, res) => {
  const { classroomId, studentEmail } = req.body;

  if (!classroomId || !studentEmail) {
    return responseFunction(
      res,
      400,
      "Classroom ID and student email are required",
      null,
      false
    );
  }

  try {
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return responseFunction(res, 404, "Classroom not found", null, false);
    }

    const classOwnerId = classroom.owner;

    const classOwner = await User.findById(classOwnerId);
    if (!classOwner) {
      return responseFunction(res, 404, "Class owner not found", null, false);
    }

    const classOwnerEmail = classOwner.email;

    const code = Math.floor(100000 + Math.random() * 900000);
    const isSent = await mailer(classOwnerEmail, code);

    if (!isSent) {
      return responseFunction(res, 500, "Failed to send OTP", null, false);
    }

    const newClassroomJoin = new ClassroomJoin({
      classroomId, //reference to the classroom
      studentEmail, // student email addr.
      code, // OTP code
      classOwnerEmail, // Email of the class owner
    });

    await newClassroomJoin.save();
    return responseFunction(
      res,
      200,
      "OTP sent to the class owner",
      null,
      true
    );
  } catch (err) {
    console.log(err);
    return responseFunction(res, 500, "Internal Server Error", err, false);
  }
});

// OTP SENT TO - TEACHER & saved to DB collection named as - student join

router.post("/verify-otp", authTokenHandler, async (req, res) => {
  const { classroomId, studentEmail, otp } = req.body;

  if (!classroomId || !studentEmail || !otp) {
    return responseFunction(
      res,
      400,
      "Classroom ID, student email and OTP are required",
      null,
      false
    );
  }

  try {
    const joinRequest = await ClassroomJoin.findOne({
      classroomId,
      studentEmail,
      code: otp,
    });

    if (!joinRequest) {
      return responseFunction(
        res,
        400,
        "Invalid OTP or join request not found",
        null,
        false
      );
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return responseFunction(res, 404, "Classroom not found", null, false);
    }

    if (!classroom.students.includes(studentEmail)) {
      classroom.students.push(studentEmail);
      await classroom.save();
    }

    await ClassroomJoin.deleteOne({ _id: joinRequest._id });

    return responseFunction(
      res,
      200,
      "Successfully joined the class",
      null,
      true
    );
  } catch (err) {
    return responseFunction(res, 500, "Internal Server error", err, false);
  }
});

router.get("/classroomsforstudent", authTokenHandler, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return responseFunction(res, 404, "User not found", null, false);
    }

    const studentEmail = user.email;
    const classrooms = await Classroom.find({ students: studentEmail });

    if (classrooms.length === 0) {
      return responseFunction(
        res,
        404,
        "No classrooms found for this student",
        null,
        false
      );
    }

    return responseFunction(
      res,
      200,
      "Classrooms fetched successfully",
      classrooms,
      true
    );
  } catch (err) {
    console.log(err);
    return responseFunction(res, 500, "Internal server error", err, false);
  }
});

module.exports = router;
