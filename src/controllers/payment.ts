import { stripe } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Coupon } from "../models/coupon.js";
import ErrorHandler from "../utils/utility-class.js";

export const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { amount, name, address } = req.body;
  if (!amount) return next(new ErrorHandler("Please Enter Amount", 400));

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Number(amount) * 100,
    currency: "inr",
    description: "anything",
    shipping: {
      name,
      address,
    },
    statement_descriptor_suffix: "Payment using Stripe",
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return res.status(201).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
  });
});

export const createCouponCode = TryCatch(async (req, res, next) => {
  const { code, amount } = req.body;
  if (!code || !amount)
    return next(new ErrorHandler("Please Enter All Fields", 400));
  await Coupon.create({ code, amount });
  return res.status(201).json({
    success: true,
    message: "Coupon Code created Successfully",
  });
});

export const allCoupons = TryCatch(async (req, res, next) => {
  const coupons = await Coupon.find({});
  return res.status(200).json({
    success: true,
    coupons,
  });
});

export const applyDiscount = TryCatch(async (req, res, next) => {
  const { code } = req.query;
  const coupon = await Coupon.findOne({ code });
  if (!coupon) return next(new ErrorHandler("Invalid Coupon Code", 400));
  return res.status(200).json({
    success: true,
    discount: coupon.amount,
  });
});

export const deleteCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const coupon = await Coupon.findById(id);
  if (!coupon) return next(new ErrorHandler("Coupon Not Found", 404));
  await coupon.deleteOne();
  return res.status(200).json({
    success: true,
    message: "Coupon Code deleted Successfully",
  });
});
