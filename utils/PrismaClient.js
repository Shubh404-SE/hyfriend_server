import {PrismaClient} from "@prisma/client"

function getPrismaInstance() {
    let prismaImstance = null;
    if(!prismaImstance){
        prismaImstance = new PrismaClient();
    }
    return prismaImstance;
}

export default getPrismaInstance;