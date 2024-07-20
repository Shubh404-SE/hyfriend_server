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