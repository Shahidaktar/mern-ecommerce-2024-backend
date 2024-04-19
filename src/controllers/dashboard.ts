import { TryCatch } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { calculatePercentage, validateCache } from "../utils/features.js";

export const getDashboardStats = TryCatch(async (req, res, next) => {
  let stats = {};

  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const thisMonth = {
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end: today,
  };

  const lastMonth = {
    start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
    end: new Date(today.getFullYear(), today.getMonth(), 0),
  };

  const thisMonthProductsPromise = Product.find({
    createdAt: {
      $gte: thisMonth.start,
      $lte: thisMonth.end,
    },
  });

  const lastMonthProductsPromise = Product.find({
    createdAt: {
      $gte: lastMonth.start,
      $lte: lastMonth.end,
    },
  });

  const thisMonthUsersPromise = User.find({
    createdAt: {
      $gte: thisMonth.start,
      $lte: thisMonth.end,
    },
  });

  const lastMonthUsersPromise = User.find({
    createdAt: {
      $gte: lastMonth.start,
      $lte: lastMonth.end,
    },
  });

  const thisMonthOrdersPromise = Order.find({
    createdAt: {
      $gte: thisMonth.start,
      $lte: thisMonth.end,
    },
  });

  const lastMonthOrdersPromise = Order.find({
    createdAt: {
      $gte: lastMonth.start,
      $lte: lastMonth.end,
    },
  });

  const lastSixMonthOrdersPromise = Order.find({
    createdAt: {
      $gte: sixMonthsAgo,
      $lte: today,
    },
  });

  const latestTransactionsPromise = Order.find({})
    .select(["orderItems", "discount", "total", "status"])
    .limit(4);

  const [
    thisMonthProducts,
    thisMonthUsers,
    thisMonthOrders,
    lastMonthProducts,
    lastMonthUsers,
    lastMonthOrders,
    productsCount,
    usersCount,
    allOrders,
    lastSixMonthOrders,
    categories,
    femaleUsersCount,
    latestTransactions,
  ] = await Promise.all([
    thisMonthProductsPromise,
    thisMonthUsersPromise,
    thisMonthOrdersPromise,
    lastMonthProductsPromise,
    lastMonthUsersPromise,
    lastMonthOrdersPromise,
    Product.countDocuments(),
    User.countDocuments(),
    Order.find({}).select("total"),
    lastSixMonthOrdersPromise,
    Product.distinct("category"),
    User.countDocuments({ gender: "female" }),
    latestTransactionsPromise,
  ]);

  const thisMonthRevenue = thisMonthOrders.reduce(
    (total, order) => total + (order.total || 0),
    0
  );

  const lastMonthRevenue = lastMonthOrders.reduce(
    (total, order) => total + (order.total || 0),
    0
  );

  const changePercent = {
    revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
    product: calculatePercentage(
      thisMonthProducts.length,
      lastMonthProducts.length
    ),
    user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
    order: calculatePercentage(thisMonthOrders.length, lastMonthOrders.length),
  };

  const revenue = allOrders.reduce(
    (total, order) => total + (order.total || 0),
    0
  );

  const count = {
    revenue,
    product: productsCount,
    user: usersCount,
    order: allOrders.length,
  };

  const orderMonthCounts = new Array(6).fill(0);
  const orderMonthRevenue = new Array(6).fill(0);

  lastSixMonthOrders.forEach((order) => {
    const creationDate = order.createdAt;
    const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
    if (monthDiff < 6) {
      orderMonthCounts[6 - monthDiff - 1] += 1;
      orderMonthRevenue[6 - monthDiff - 1] += order.total;
    }
  });

  const categoriesCountPromise = categories.map((category) =>
    Product.countDocuments({ category })
  );
  const categoriesCount = await Promise.all(categoriesCountPromise);

  const categoryCount: Record<string, number>[] = [];

  categories.forEach((category, i) => {
    categoryCount.push({
      [category]: Math.round((categoriesCount[i] / productsCount) * 100),
    });
  });

  const userRatio = {
    male: usersCount - femaleUsersCount,
    female: femaleUsersCount,
  };

  const modifiedLatestTransactions = latestTransactions.map((i) => ({
    _id: i._id,
    discount: i.discount,
    amount: i.total,
    quantity: i.orderItems.length, //total: i.orderItems.reduce((total,item)=>(total+item.quantity!),0) real quantity of orderItems
    status: i.status,
  }));

  stats = {
    categoryCount,
    changePercent,
    count,
    chart: {
      order: orderMonthCounts,
      revenue: orderMonthRevenue,
    },
    userRatio,
    latestTransactions: modifiedLatestTransactions,
  };
  const key = "admin-stats";
  const data = await validateCache({ admin: true, stats, key });

  return res.status(200).json({
    success: true,
    data,
  });
});
