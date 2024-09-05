import dotenv from "dotenv";
import { Sequelize } from "sequelize";
dotenv.config();
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
});

sequelize
  .authenticate()
  .then(() => console.log("Connection has been established successfully."))
  .catch((err) => console.error("Unable to connect to the database:", err));

export default sequelize;
