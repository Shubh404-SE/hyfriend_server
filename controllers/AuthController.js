// authController.js
import { query } from "../postgres/db.js";
import { generateToken04 } from "../utils/TokenGenerator.js";

export const checkUser = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ message: "Email is required", status: false });
    }

    const queryText = `
      SELECT * FROM "User" WHERE email = $1;
    `;
    const { rows } = await query(queryText, [email]);

    if (rows.length === 0) {
      return res.json({ message: "User not found!", status: false });
    } else if (rows[0].onboard) {
      return res.json({ message: "User found", status: true, data: rows[0] });
    } else {
      return res.json({ message: "User found", status: false, data: rows[0] });
    }
  } catch (err) {
    next(err);
  }
};

export const onBoardUser = async (req, res, next) => {
  try {
    const { email, name, lg, imgUrl: profilePicture, about } = req.body;
    if (!email || !name || !profilePicture) {
      return res.send("Email, Name and image are required");
    }

    const queryText = `
      UPDATE "User"
      SET name = $1,
      "profilePicture" = $2,
      about = $3,
      onboard = $4,
      langauge = $5
      WHERE email = $6
      RETURNING *;
    `;
    const values = [name, profilePicture, about, true, lg ? lg : "English", email];
    const { rows } = await query(queryText, values);

    return res.json({ message: "success", status: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

export const signupUser = async (req, res, next) => {
  console.log(req.body);
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.send("Email, Name and image are required");
    }

    // // check user if already exist
    // const checkUser = `
    //   SELECT * FROM "User" WHERE email = $1;
    // `;
    // const { userRow } = await query(checkUser, [email]);

    // if (userRow.length === 0) {
    // if no user then create one
    const queryText = `
      INSERT INTO "User" (email, name)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const values = [email, name];
    const { rows } = await query(queryText, values);

    return res.json({
      message: "User created successfully",
      status: true,
      data: rows[0],
    });
    // } else {
    //   return res.json({ message: "User already exist !!", status: false });
    // }
  } catch (err) {
    next(err);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const queryText = `
      SELECT id, email, name, "profilePicture", langauge, about FROM "User"
      ORDER BY name ASC;
    `;
    const { rows: users } = await query(queryText);

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
