import express from "express";
import { adminOnly } from "../middlewares/auth.js";
import { getDashboardStats } from "../controllers/dashboard.js";


const app = express.Router();

app.get("/stats",adminOnly,getDashboardStats);


export default app;