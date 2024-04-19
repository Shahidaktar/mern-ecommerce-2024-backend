import { Request } from "express";
import { TryCatch } from "../middlewares/error.js";
import { NewOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import ErrorHandler from "../utils/utility-class.js";
import {
  invalidateCache,
  reduceStock,
  validateCache,
} from "../utils/features.js";

export const myOrders = TryCatch(async (req, res, next) => {
  const { id } = req.query;
  const key = `myOrders-${id}`;
  const data = await validateCache({
    order: true,
    userId: String(id),
    key,
    product: false,
  });

  return res.status(200).json({
    success: true,
    data,
  });
});

export const allOrders = TryCatch(async (req, res, next) => {
  const key = "all-orders";
  const data = await validateCache({
    order: true,
    key,
    product: false,
  });
  return res.status(200).json({
    success: true,
    data,
  });
});

export const newOrder = TryCatch(
  async (req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const {
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    } = req.body;

    if (!shippingInfo || !orderItems || !user || !subtotal || !tax || !total)
      return next(new ErrorHandler("Please enter all Fields", 400));

    const order = await Order.create({
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    });

    await reduceStock(orderItems);

    invalidateCache({
      product: true,
      order: true,
      userId: String(user),
      productId: order.orderItems.map((i) => String(i._id)),
      admin: true,
    });

    return res.status(201).json({
      success: true,
      message: "Order Placed Successfully",
    });
  }
);

export const getSingleOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const key = `order-${id}`;
  const data = await validateCache({
    order: true,
    orderId: String(id),
    key,
    product: false,
  });

  if (!data) return next(new ErrorHandler("Order Not Found", 404));

  return res.status(200).json({
    success: true,
    data,
  });
});

export const processOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) return next(new ErrorHandler("Order Not Found", 404));
  switch (order.status) {
    case "Processing":
      order.status = "Shipped";
      break;
    case "Shipped":
      order.status = "Delivered";
      break;
    default:
      order.status = "Delivered";
      break;
  }

  await order.save();

  invalidateCache({
    product: false,
    order: true,
    orderId: String(order._id),
    userId: order.user,
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Order Processed Successfully",
  });
});

export const deleteOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) return next(new ErrorHandler("Order Not Found", 404));
  await order.deleteOne();
  invalidateCache({
    product: false,
    order: true,
    orderId: String(order._id),
    userId: order.user,
    admin: true,
  });
  return res.status(200).json({
    success: true,
    message: "Order Deleted Successfully",
  });
});
