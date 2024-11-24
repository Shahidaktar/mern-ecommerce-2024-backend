import multer from "multer";
import cloudinary from "../utils/features.js";

export const uploadFile = async (filepath: any) => {
  try {
    const res = await cloudinary.uploader.upload(filepath);
    return res;
  } catch (error: any) {
    console.log(error.message);
  }
};

export const singleUpload = multer({
  storage: multer.diskStorage({}),
  limits: { fileSize: 500000 },
}).single("photo");
