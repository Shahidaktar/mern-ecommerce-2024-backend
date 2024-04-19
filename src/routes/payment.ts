import express from "express";
import { adminOnly } from "../middlewares/auth.js";
import { allCoupons, applyDiscount, createCouponCode, createPaymentIntent, deleteCoupon } from "../controllers/payment.js";

const app = express.Router();

app.post("/create", createPaymentIntent);

app.get("/discount",applyDiscount)

app.post("/coupon/create",adminOnly, createCouponCode);

app.get("/coupon/all",adminOnly, allCoupons);

app.delete("/coupon/:id",adminOnly, deleteCoupon)


export default app;