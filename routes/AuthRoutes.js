import {Router} from "express";
import { checkUser, generateToken, getAllUsers, onBoardUser, signupUser } from "../controllers/AuthController.js";

const router = Router();
router.post("/check-user", checkUser);
router.post("/onboard-user", onBoardUser);
router.post("/signup-user", signupUser)
router.get('/get-contacts', getAllUsers);
router.get("/generate-token/:userId", generateToken);


export default router;