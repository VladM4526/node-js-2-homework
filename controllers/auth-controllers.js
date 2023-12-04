import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";

import { ctrlWrapper } from "../decorators/index.js";

import { HttpError } from "../helpers/index.js";

const { JWT_SECRET } = process.env;

const signup = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    throw HttpError(409, "Email already exist");
  }
  const hashPass = await bcrypt.hash(password, 5);
  const newUser = await User.create({ ...req.body, password: hashPass });

  res.status(201).json({
    user: {
      email: newUser.email,
      password: newUser.password,
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
      email: user.email,
      password: user.password,
      token,
    },
  });
};

const getCurrent = async (req, res) => {
  const { email, password } = req.user;

  res.json({
    user: {
      email: email,
      password: password,
    },
  });
};

const signout = async (req, res) => {
  const { id } = res.user;
  await User.findByIdAndUpdate(id, { token: "" });

  res.json({
    message: "Signout success",
  });
};

export default {
  signup: ctrlWrapper(signup),
  signin: ctrlWrapper(signin),
  getCurrent: ctrlWrapper(getCurrent),
  signout: ctrlWrapper(signout),
};
