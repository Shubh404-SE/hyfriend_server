import { DataTypes } from "sequelize";
import sequelize from "../utils/Database.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    profilePicture: {
      type: DataTypes.STRING(255),
      defaultValue: "/default_avatar.png",
    },
    about: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    onboard: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: false, // Default behavior is true
  }
);

export default User;
