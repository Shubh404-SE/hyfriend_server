import { DataTypes } from "sequelize";
import sequelize from "../utils/Database.js";
import Chat from "./Chat.js";
import User from "./User.js";

const Message = sequelize.define(
  "Message",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    chatId: {
      type: DataTypes.INTEGER,
      references: {
        model: Chat,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    senderId: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    type: {
      type: DataTypes.STRING(50),
      defaultValue: "text",
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    messageStatus: {
      type: DataTypes.STRING(50),
      defaultValue: "sent",
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    seenAt: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    replyToMessageId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Messages", // Self-referencing foreign key
        key: "id",
      },
      onDelete: "SET NULL",
      defaultValue: null,
    },
    replyToUserId: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "SET NULL",
      defaultValue: null,
    },
    isDeletedForEveryone: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deletedForUsers: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
  },
  {
    timestamps: false, // Default behavior is true
  }
);

export default Message;
