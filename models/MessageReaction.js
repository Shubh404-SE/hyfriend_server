import { DataTypes } from "sequelize";
import sequelize from "../utils/Database.js";
import Message from "./Message.js";
import User from "./User.js";

const MessageReaction = sequelize.define(
  "MessageReaction",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    messageId: {
      type: DataTypes.INTEGER,
      references: {
        model: Message,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    reaction: {
      type: DataTypes.STRING(50),
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    uniqueKeys: {
      message_user_unique: {
        fields: ["messageId", "userId"],
      },
    },
    
    timestamps: false, // Default behavior is true
  },
);

export default MessageReaction;
