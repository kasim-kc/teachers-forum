const express = require("express");
const User = require("../models/userModel");
const Verification = require("../models/verificationModel");
const responseFunction = require("../utils/responseFunction");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const authTokenHandler = require("../middlewares/checkAuthToken");

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

router.get("/", (req, res) => {
  res.json({
    message: "Auth route home",
  });
});

router.post("/sendotp", async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return responseFunction(res, 400, "Email is required", null, false);
  }

  try {
    await Verification.deleteMany({ email: email });
    const code = Math.floor(100000 + Math.random() * 900000);
    const isSent = await mailer(email, code);

    const newVerification = new Verification({
      email: email,
      code: code,
    });

    await newVerification.save();

    if (!isSent) {
      return responseFunction(res, 500, "Internal Server Error", null, false);
    } else {
      return responseFunction(res, 200, "OTP sent successfully", null, true);
    }
  } catch (err) {
    return responseFunction(res, 500, "Internal Server Error", err, false);
  }
});

router.post("/register", async (req, res) => {
  const { name, email, password, otp, role } = req.body;
  if (!name || !email || !password || !otp || !role) {
    return responseFunction(res, 400, "All fields are required", null, false);
  }

  if (password.length < 6) {
    return responseFunction(
      res,
      400,
      "Password should be at least 6 characters long",
      null,
      false
    );
  }
  try {
    let user = await User.findOne({ email });
    let verificationQueue = await Verification.findOne({ email });

    if (user) {
      return responseFunction(res, 400, "User already exists", null, false);
    }

    if (!verificationQueue) {
      return responseFunction(res, 400, "Please send OTP first", null, false);
    }

    const isMatch = await bcrypt.compare(otp, verificationQueue.code);

    if (!isMatch) {
      return responseFunction(res, 400, "Invalid OTP", null, false);
    }

    user = new User({
      name,
      email,
      password,
      role,
    });

    await user.save();
    await Verification.deleteOne({ email });

    const authToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET_KEY,
      { expiresIn: "10d" }
    );

    // setting the cookie to frontend from backend itself
    res.cookie("authToken", authToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    user.password = undefined; //why this?  --> frontend ko nahin pata chalega password..
    return responseFunction(
      res,
      200,
      "Registered successfully",
      { user, authToken, refreshToken },
      true
    );
  } catch (err) {
    return responseFunction(res, 500, "Internal Server Error", err, false);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return responseFunction(res, 400, "Invalid Credentials", null, false);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return responseFunction(res, 400, "Invalid Credentials", null, false);
    }

    const authToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1d" }
    );
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET_KEY,
      { expiresIn: "10d" }
    );

    user.password = undefined;

    res.cookie("authToken", authToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return responseFunction(
      res,
      200,
      "Logged In Successfully",
      { user, authToken, refreshToken },
      true
    );
  } catch (err) {
    console.log(err);
    return responseFunction(res, 500, "Internal server error", err, false);
  }
});

router.get("/checklogin", authTokenHandler, async (req, res, next) => {
  //will only work if the authTokenHandler returns success or ok
  res.json({
    ok: req.ok,
    message: req.message,
    userId: req.userId,
  });
});

router.get("/getuser", authTokenHandler, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("-password"); // password isn't send

    if (!user) {
      return responseFunction(res, 400, "User not found", null, false);
    }

    return responseFunction(res, 200, "User found", user, true);
  } catch (error) {
    return responseFunction(res, 500, "Internal Server Error", error, false);
  }
});

router.get("/logout", authTokenHandler, async (req, res, next) => {
  res.clearCookie("authToken");
  res.clearCookie("refreshToken");
  //clears the cookies in the frontend

  res.json({
    ok: true,
    message: "Logged out successfully",
  });
});

module.exports = router;
