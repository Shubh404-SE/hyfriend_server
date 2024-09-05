// authController.js
import User from "../models/User.js";
import { generateToken04 } from "../utils/TokenGenerator.js";

export const checkUser = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ message: "Email is required", status: false });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.json({ message: "User not found!", status: false });
    } else if (user.onboard) {
      return res.json({ message: "User found", status: true, data: user });
    } else {
      return res.json({ message: "User found", status: false, data: user });
    }
  } catch (err) {
    next(err);
  }
};

export const onBoardUser = async (req, res, next) => {
  try {
    const { email, name, imgUrl: profilePicture, about } = req.body;
    if (!email || !name || !profilePicture) {
      return res.send("Email, Name and image are required");
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    user.name = name;
    user.profilePicture = profilePicture;
    user.about = about;
    user.onboard = true;

    await user.save();

    return res.json({ message: "Success", status: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const signupUser = async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.send("Email and Name are required");
    }

    const [user, created] = await User.findOrCreate({
      where: { email },
      defaults: { name }
    });

    if (!created) {
      return res.json({ message: "User already exists!", status: false });
    }

    return res.json({
      message: "User created successfully",
      status: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'name', 'profilePicture', 'about'],
      order: [['name', 'ASC']],
    });

    const usersGroupByInitialLetter = {};

    users.forEach((user) => {
      const initialLetter = user.name.charAt(0).toUpperCase();
      if (!usersGroupByInitialLetter[initialLetter]) {
        usersGroupByInitialLetter[initialLetter] = [];
      }
      usersGroupByInitialLetter[initialLetter].push(user);
    });

    return res.status(200).send({ users: usersGroupByInitialLetter });
  } catch (err) {
    next(err);
  }
};
export const generateToken = (req, res, next) => {
  try {
    const appId = parseInt(process.env.ZEGO_APP_ID);
    const searverSecret = process.env.ZEGO_SERVER_ID;
    const userId = req.params.userId;
    const effectiveTime = 3600;
    const payload = "";

    if (appId && searverSecret && userId) {
      const token = generateToken04(
        appId,
        userId,
        searverSecret,
        effectiveTime,
        payload
      );
      res.status(200).json({ token });
    } else {
      res.status(400).send("User id, app id, and server id are required");
    }
  } catch (err) {
    next(err);
  }
};
