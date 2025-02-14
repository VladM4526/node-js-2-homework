import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import gravatar from "gravatar";
import User from "../models/User.js";
import { ctrlWrapper } from "../decorators/index.js";
import { HttpError } from "../helpers/index.js";
import "dotenv/config";
import Jimp from "jimp";
import fs from "fs/promises";
import path from "path";
const avatarPath = path.resolve("public", "avatars");

const { JWT_SECRET } = process.env;

const signup = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  const avatarURL = gravatar.url(email);
  if (user) {
    throw HttpError(409, "Email already exist");
  }
  const hashPass = await bcrypt.hash(password, 5);
  const newUser = await User.create({
    ...req.body,
    password: hashPass,
    avatarURL,
  });

  res.status(201).json({
    user: {
      email: newUser.email,
      password: newUser.password,
      avatarURL,
    },
  });
};

const signin = async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw HttpError(401, "Email or password is wrong");
  }

  const passwordCompare = await bcrypt.compare(password, user.password);

  if (!passwordCompare) {
    throw HttpError(401, "Email or password is wrong");
  }

  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "23h" });
  await User.findByIdAndUpdate(user._id, { token });
  res.json({
    user: {
      token,
    },
  });
};

const getCurrent = async (req, res) => {
  const { email, avatarURL } = res.user;

  res.json({
    user: {
      email,
      avatarURL,
    },
  });
};

const signout = async (req, res) => {
  const { _id } = res.user;
  await User.findByIdAndUpdate(_id, { token: "" });

  res.json({
    message: "Signout success",
  });
};

const updAvatar = async (req, res, next) => {
  if (res.file) {
    throw HttpError(400, "The avatar file is empty");
  }
  const { _id } = res.user;
  const { path: oldPath, filename } = req.file;
  const resizeAvatar = await Jimp.read(oldPath);
  await resizeAvatar.cover(250, 250).writeAsync(oldPath);
  const addUserFilename = `${_id}_${filename}`;
  const newPath = path.join(avatarPath, addUserFilename);
  await fs.rename(oldPath, newPath);
  const avatarURL = path.join("avatars", addUserFilename);
  await User.findByIdAndUpdate(_id, { avatarURL });
  res.status(200).json({ avatarURL });
};

export default {
  signup: ctrlWrapper(signup),
  signin: ctrlWrapper(signin),
  getCurrent: ctrlWrapper(getCurrent),
  signout: ctrlWrapper(signout),
  updAvatar: ctrlWrapper(updAvatar),
};
