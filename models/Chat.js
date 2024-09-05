import { DataTypes } from "sequelize";
import sequelize from "../utils/Database.js";

const Chat = sequelize.define(
  "Chat",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING(50),
      defaultValue: "direct",
    },
    name: {
      type: DataTypes.STRING(255),
    },
  },
  {
    timestamps: false, // Default behavior is true
  }
);

export default Chat;
