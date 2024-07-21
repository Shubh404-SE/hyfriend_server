import getPrismaInstance from "../utils/PrismaClient.js";
import fs from "fs";

export const addMessage = async (req, res, next)=>{
    try{
        const prisma = getPrismaInstance();
        const {message, from, to} = req.body;
        const getUser = onlineUsers.get(to); // check for online user

        // add message to sender(from) - reciever(to)
        if(message && from && to){
            const newMessage = await prisma.messages.create({
                data:{
                    message, 
                    sender:{connect:{id:parseInt(from)}},
                    reciever:{connect:{id:parseInt(to)}},
                    messageStatus:getUser?"delivered":"sent",
                },
                include:{sender:true, reciever:true},
            });
            return res.status(201).send({message:newMessage});
        }
        return res.status(400).send("From, to and message is required");
    }catch(err){
        next(err);
    }
}


export const getMessages = async (req, res, next)=>{
    try{
        const prisma = getPrismaInstance();
        const {from, to} = req.params;
        
        // add to sender and reciever and for reciever and sender
        const messages = await prisma.messages.findMany({
            where:{
                OR:[
                    {
                        senderId:parseInt(from),
                        recieverId:parseInt(to),
                    },
                    {
                        senderId:parseInt(to),
                        recieverId:parseInt(from),
                    }
                ],
            },
            orderBy:{
                id:"asc",
            }
        });

        // find all unread messages whose message status is not "read" yet
        const unreadMessages = [];

        messages.forEach((message, index)=>{
            if(message.messageStatus!=="read" && message.senderId === parseInt(to)){
                messages[index].messageStatus ="read";
                unreadMessages.push(message.id);
            }
        });

        // update all unread messages to read
        await prisma.messages.updateMany({
            where:{
                id:{in:unreadMessages}
            },
            data:{
                messageStatus:"read"
            }
        });
        
        return res.status(200).json({messages})
    }catch(err){
        next(err);
    }
}


export const addImageMessage = async(req, res, next) =>{
    try{
        if(req.file){
            // set unique filename
            const date = Date.now();
            let fileName = "uploads/images/" + date + req.file.originalname;
            fs.renameSync(req.file.path, fileName);

            const prisma = getPrismaInstance();
            const {from, to} = req.query;

            // store in database
            if(from && to){
                const message = await prisma.messages.create({
                    data:{
                        message:fileName,
                        sender:{connect:{id:parseInt(from)}},
                        reciever:{connect:{id:parseInt(to)}},
                        type:"image",
                    },
                });
                return res.status(201).json({message});
            }
            return res.status(400).send("from, to is required");
        }
        return res.status(400).send("Image is required");
    }catch(err){
        next(err);
    }
}


export const addAudioMessage = async(req, res, next) =>{
    try{
        if(req.file){
            // set unique filename
            const date = Date.now();
            let fileName = "uploads/recordings/" + date + req.file.originalname;
            fs.renameSync(req.file.path, fileName);

            const prisma = getPrismaInstance();
            const {from, to} = req.query;

            // store in database
            if(from && to){
                const message = await prisma.messages.create({
                    data:{
                        message:fileName,
                        sender:{connect:{id:parseInt(from)}},
                        reciever:{connect:{id:parseInt(to)}},
                        type:"audio",
                    },
                });
                return res.status(201).json({message});
            }
            return res.status(400).send("from, to is required");
        }
        return res.status(400).send("Audio is required");
    }catch(err){
        next(err);
    }
}

export const getInitialContactsWithMessages = async(req, res, next)=>{
    try{
        const userId = parseInt(req.params.from);
        console.log(userId);
        const prisma = getPrismaInstance();
        const user = await prisma.user.findUnique({
            where:{id:userId},
            include:{
                sentMessages:{
                    include:{reciever:true, sender:true},
                    orderBy:{createdAt:"desc"},
                },
                recieverMessages:{
                    include:{reciever:true, sender:true},
                    orderBy:{createdAt:"desc"},
                } 
            }
        });

        // console.log(user);
        
        const messages = [...user.sentMessages, ...user.recieverMessages]
        messages.sort((a, b)=>b.createdAt.getTime()<a.createdAt.getTime());

        // console.log(messages);

        const users = new Map();  // users map
        const messageStatusChange = [];

        messages.forEach((msg)=>{
            const isSender = msg.senderId === userId;
            const calculatedId = isSender? msg.recieverId:msg.senderId;

            if(msg.messageStatus === "sent"){
                messageStatusChange.push(msg.id); // adding all new sent messages into messageStatusChange list.
            }

            if(!users.get(calculatedId)){ // if reciever user not in users list then create a new user with required details
                const {id, type, message, messageStatus, createdAt, recieverId, senderId} = msg;
                let user = {  // default user
                    messageId:id, 
                    type, 
                    message, 
                    messageStatus, 
                    createdAt, 
                    senderId, 
                    recieverId,
                };

                if(isSender){ // if message is sent by sender
                    user = { // in user we need reciever detailes + if message is sent by sender then his unread messages will be zero
                        ...user,
                        ...msg.reciever,
                        totalUnreadMessages:0, 
                    };
                }else{ // if reciever recieving message
                    user={ // user will have sender and here need to check unread message because it is reciever..
                        ...user,
                        ...msg.sender,
                        totalUnreadMessages: messageStatus !== "read" ? 1:0,
                    }
                }

                users.set(calculatedId, {...user}); // new user set
            }else if(msg.messageStatus !=="read" && !isSender){ // check reciever user and read status
                const user = users.get(calculatedId);
                users.set(calculatedId, { // counting only unread messages
                    ...user,
                    totalUnreadMessages: user.totalUnreadMessages+1,
                });
            }
        });

        if(messageStatusChange.length){
            await await prisma.messages.updateMany({
                where:{
                    id:{in:messageStatusChange},
                },
                data:{
                    messageStatus:"delivered",
                },
            });
        }

        return res.status(200).json({
            users:Array.from(users.values()),
            onlineUsers: Array.from(onlineUsers.keys()),
        });


    }catch(err){
        next(err);
    }
}