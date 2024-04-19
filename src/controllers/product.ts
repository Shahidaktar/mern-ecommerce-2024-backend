import { Request } from "express";
import { TryCatch } from "../middlewares/error.js";
import {
  BaseQuery,
  NewProductRequestBody,
  SearchRequestQuery,
} from "../types/types.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { rm } from "fs";
import { invalidateCache, validateCache } from "../utils/features.js";

export const newProduct = TryCatch(
  async (req: Request<{}, {}, NewProductRequestBody>, res, next) => {
    const { name, price, stock, category } = req.body;
    const photo = req.file;
    if (!photo) return next(new ErrorHandler("Please add Photo", 400));

    if (!name || !price || !stock || !category) {
      rm(photo.path, () => console.log("deleted"));
      return next(new ErrorHandler("Please enter all Fields", 400));
    }
    await Product.create({
      name,
      price,
      stock,
      category: category.toLowerCase(),
      photo: photo.path,
    });

    invalidateCache({ product: true, admin: true });

    return res.status(201).json({
      success: true,
      message: "Product created Successfully",
    });
  }
);

export const getLatestProducts = TryCatch(async (req, res, next) => {
  const key = "latest-products";
  const data = await validateCache({ product: true, key });
  return res.status(200).json({
    success: true,
    data,
  });
});

export const getAllCategories = TryCatch(async (req, res, next) => {
  const key = "categories";
  const data = await validateCache({ product: true, key });
  return res.status(200).json({
    success: true,
    data,
  });
});

export const getAdminProducts = TryCatch(async (req, res, next) => {
  const key = "admin-products";
  const data = await validateCache({ product: true, key });
  return res.status(200).json({
    success: true,
    data,
  });
});

export const getSingleProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const key = `product-${id}`;
  const data = await validateCache({
    product: true,
    key,
    productId: String(id),
  });
  if (!data) return next(new ErrorHandler("Product not Found", 404));
  return res.status(200).json({
    success: true,
    data,
  });
});

export const updateProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const { name, price, stock, category } = req.body;
  const photo = req.file;
  const product = await Product.findById(id);
  if (!product) return next(new ErrorHandler("Product not Found", 404));

  if (photo) {
    rm(product.photo!, () => console.log("old photo deleted"));
    product.photo = photo.path;
  }

  if (name) product.name = name;
  if (category) product.category = category;
  if (price) product.price = price;
  if (stock) product.stock = stock;

  await product.save();

  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product updated Successfully",
  });
});

export const deleteProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) return next(new ErrorHandler("Product not Found", 404));
  rm(product.photo!, () => console.log("product photo deleted"));
  await product.deleteOne();
  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });
  return res.status(200).json({
    success: true,
    message: "Product deleted Successfully",
  });
});

export const getAllProducts = TryCatch(
  async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {
    const { search, sort, category, price } = req.query;

    const page = Number(req.query.page) || 1;

    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = (page - 1) * limit;

    const baseQuery: BaseQuery = {};

    if (search)
      baseQuery.name = {
        $regex: search,
        $options: "i",
      };

    if (price)
      baseQuery.price = {
        $lte: Number(price),
      };

    if (category) baseQuery.category = category;

    const productPromise = Product.find(baseQuery)
      .sort(sort && { price: sort === "asc" ? 1 : -1 })
      .limit(limit)
      .skip(skip);

    const [products, filteredOnlyProduct] = await Promise.all([
      productPromise,
      Product.find(baseQuery),
    ]);

    const totalPage = Math.ceil(filteredOnlyProduct.length / limit);

    return res.status(200).json({
      success: true,
      products,
      totalPage,
    });
  }
);
