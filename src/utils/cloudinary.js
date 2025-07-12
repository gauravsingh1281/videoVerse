import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload the file on cloudinary
    const uploadResponse = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // success msg
    console.log("file has been successfully uploaded", uploadResponse.url);
    return uploadResponse;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove locally saved temp file on upload failed.
    return null;
  }
};

export { uploadOnCloudinary };
