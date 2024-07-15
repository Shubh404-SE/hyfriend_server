import getPrismaInstance from "../utils/PrismaClient.js";

export const checkUser = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ message: "Email is required", status: false });
    }
    const prisma = getPrismaInstance();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ message: "User not found!", status: false });
    } else {
      return res.json({ message: "User found", status: true, data: user });
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
    const prisma = getPrismaInstance();
    const user = await prisma.user.create({
      data: { email, name, profilePicture, about },
    });
    return res.json({ message: "success", status: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const prisma = getPrismaInstance();
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
        about: true,
      },
    });

    const usersGroupByInitialLetter = {};

    users.forEach((user)=>{
        const initialLetter = user.name.charAt(0).toUpperCase();
        if(!usersGroupByInitialLetter[initialLetter]){
            usersGroupByInitialLetter[initialLetter] = [];
        }
        usersGroupByInitialLetter[initialLetter].push(user);
    });
    return res.status(200).send({users:usersGroupByInitialLetter});
  } catch (err) {
    next(err);
  }
};
