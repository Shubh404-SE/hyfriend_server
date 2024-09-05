import User from './User.js';
import Chat from './Chat.js';
import ChatUser from './ChatUser.js';
import Message from './Message.js';
import MessageReaction from './MessageReaction.js';

// Define relationships

// User <-> ChatUser
User.hasMany(ChatUser, { foreignKey: 'userId' });
ChatUser.belongsTo(User, { foreignKey: 'userId' });

// User <-> ChatUser (as Chat User)
User.hasMany(ChatUser, { foreignKey: 'chatUserId' });
ChatUser.belongsTo(User, { foreignKey: 'chatUserId' });

// Chat <-> Message
Chat.hasMany(Message, { foreignKey: 'chatId' });
Message.belongsTo(Chat, { foreignKey: 'chatId' });

// User <-> Message
User.hasMany(Message, { foreignKey: 'senderId' });
Message.belongsTo(User, { foreignKey: 'senderId' });

// Message <-> Message (Self-referencing for replies)
Message.belongsTo(Message, { as: 'replyToMessage', foreignKey: 'replyToMessageId' });

// User <-> Message (for replies)
Message.belongsTo(User, { as: 'replyToUser', foreignKey: 'replyToUserId' });

// Message <-> MessageReaction
Message.hasMany(MessageReaction, { foreignKey: 'messageId' });
MessageReaction.belongsTo(Message, { foreignKey: 'messageId' });

// User <-> MessageReaction
User.hasMany(MessageReaction, { foreignKey: 'userId' });
MessageReaction.belongsTo(User, { foreignKey: 'userId' });

export { User, Chat, ChatUser, Message, MessageReaction };
