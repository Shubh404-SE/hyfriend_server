import { DataTypes } from "sequelize";
import sequelize from "../utils/Database.js";
import User from "./User.js";
import Message from "./Message.js";
import Chat from "./Chat.js";

const ChatUser = sequelize.define(
  "ChatUser",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    chatId: {
      type: DataTypes.INTEGER,
      references: {
        model: Chat,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    lastMessageId: {
      type: DataTypes.INTEGER,
      references: {
        model: Message,
        key: "id",
      },
      onDelete: "SET NULL",
    },
    unreadMessageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isMuted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    uniqueKeys: {
      user_chat_unique: {
        fields: ["userId", "chatId"],
      },
    },
    timestamps: false, // Default behavior is true
  },
);

export default ChatUser;
