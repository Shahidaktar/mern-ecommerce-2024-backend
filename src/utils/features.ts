import mongoose from "mongoose";
import {
  InvalidateCacheProps,
  OrderItemType,
  ValidateCacheProps,
} from "../types/types.js";
import { myCache } from "../app.js";
import { Product } from "../models/product.js";
import { Order } from "../models/order.js";

export const connectDB = (uri: string) => {
  mongoose
    .connect(uri, {
      dbName: "Ecommerce_2024",
    })
    .then((c) => console.log(`DB Connected to ${c.connection.host}`))
    .catch((e) => console.log(e));
};

export const validateCache = async ({
  product,
  key,
  order,
  productId,
  userId,
  orderId,
  admin,
  stats,
}: ValidateCacheProps) => {
  if (product) {
    let data;
    if (myCache.has(key!)) data = JSON.parse(myCache.get(key!) as string);
    else {
      if (key === "latest-products")
        data = await Product.find({}).sort({ createdAt: -1 }).limit(5);

      if (key === "categories") data = await Product.distinct("category");

      if (key === "admin-products") data = await Product.find({});

      if (key === `product-${productId}`)
        data = await Product.findById(productId);

      myCache.set(key!, JSON.stringify(data));
    }
    return data;
  }
  if (order) {
    let data;
    if (myCache.has(key!)) data = JSON.parse(myCache.get(key!) as string);
    else {
      if (key === `myOrders-${userId}`)
        data = await Order.find({ user: userId });

      if (key === "all-orders")
        data = await Order.find().populate("user", "name");

      if (key === `order-${orderId}`)
        data = await Order.findById(orderId).populate("user", "name");

      myCache.set(key!, JSON.stringify(data));
    }
    return data;
  }
  if (admin) {
    let data;
    if (myCache.has(key!)) data = JSON.parse(myCache.get(key!) as string);
    else {
      data = stats;
      myCache.set(key!, JSON.stringify(data));
    }
    return data;
  }
};

export const invalidateCache = ({
  product,
  order,
  admin,
  productId,
  userId,
  orderId,
}: InvalidateCacheProps) => {
  if (product) {
    const productKeys: string[] = [
      "latest-products",
      "categories",
      "admin-products",
    ];
    if (typeof productId === "string") productKeys.push(`product-${productId}`);

    if (typeof productId === "object")
      productId.forEach((i) => productKeys.push(`product-${i}`));

    myCache.del(productKeys);
  }
  if (order) {
    const orderKeys: string[] = [
      "all-orders",
      `myOrders-${userId}`,
      `order-${orderId}`,
    ];

    myCache.del(orderKeys);
  }
  if (admin) {
    const adminKey: string = "admin-stats";
    myCache.del(adminKey);
  }
};

export const reduceStock = async (orderitems: OrderItemType[]) => {
  for (let i = 0; i < orderitems.length; i++) {
    const order = orderitems[i];
    const product = await Product.findById(order.productId);
    if (!product) throw new Error("Product Not Found");
    product.stock -= order.quantity;
    await product.save();
  }
};

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
  if (lastMonth === 0) return thisMonth * 100;
  const percent = (thisMonth / lastMonth) * 100;
  return Number(percent.toFixed(0));
};
