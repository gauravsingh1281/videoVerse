import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJwt = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "").trim();
    if (!token) throw new apiError(401, "Unauthorized request");
    const decodedTokenData = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const foundUser = await User.findById(decodedTokenData?._id).select(
      "-password -refreshToken"
    );
    if (!foundUser) throw new apiError(401, "Invalid Access Token");
    req.user = foundUser;
    next();
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid access token");
  }
});
