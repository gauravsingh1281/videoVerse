import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const foundUser = await User.findById(userId);
    const accessToken = foundUser.generateAccessToken();
    const refreshToken = foundUser.generateRefreshToken();
    foundUser.refreshToken = refreshToken;
    await foundUser.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};
// register user controller
const registerUser = asyncHandler(async (req, res) => {
  // getting userdata
  const { fullName, email, userName, password } = req.body;
  // validate userdata
  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }
  // check for already registered user
  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    throw new apiError(409, "User with email or username already exists");
  }
  // getting files
  const avatarLocalPath = req?.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req?.files?.coverImage?.[0]?.path;
  if (!avatarLocalPath)
    // avatar file validation
    throw new apiError(400, "Avatar file is required");
  // files upload on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  // avatar file validation cloudinary
  if (!avatar) throw new apiError(400, "Avatar file is required");
  // saving data to db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new apiError(500, "Something went wrong while registering the user");
  }
  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered successfully"));
});

// login user controller
const loginUser = asyncHandler(async (req, res) => {
  const { userName, email, password } = req.body;

  if (!(userName || email))
    throw new apiError(400, "Username or password is required");

  const foundUser = await User.findOne({ $or: [{ userName }, { email }] });
  if (!foundUser) throw new apiError(404, "User does not exist");

  const isPasswordValid = await foundUser.isPasswordCorrect(password);
  if (!isPasswordValid) throw new apiError(401, "Invalid user credientials");
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    foundUser._id
  );
  const loggedInUser = await User.findById(foundUser._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in Successfully"
      )
    );
});

// logout user
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged Out successfully"));
});

// generating new access token using user sent refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const userSentRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!userSentRefreshToken) throw new apiError(401, "Unauthorized request");
  try {
    const decodedUserSentRefreshToken = jwt.verify(
      userSentRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const foundUser = await User.findById(decodedUserSentRefreshToken?._id);
    if (!foundUser) throw new apiError(401, "Invalid refresh token");
    if (userSentRefreshToken !== foundUser?.refreshToken)
      throw new apiError(401, "Refresh token is expired or used");
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(foundUser._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid refresh token");
  }
});
export { registerUser, loginUser, logoutUser, refreshAccessToken };
