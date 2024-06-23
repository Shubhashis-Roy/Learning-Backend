import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnClouldinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// Only server can set cookie
const setCookieOption = {
  httpOnly: true,
  secure: true,
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // refresh token save on DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiErrors(
      500,
      "Error while generating access and refresh token: ",
      error
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { fullname, email, username, password } = req.body;

  // validation - not empty
  if (
    [fullname, email, username, password].some((field) => field?.trim() === " ")
  ) {
    throw new ApiErrors(400, "All fileds are required");
  }

  // check if user already exits: username, email
  const exitedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (exitedUser) {
    throw new ApiErrors(409, "User with email or username already exists.");
  }

  // upload them to cloudinary, avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (req.files?.coverImage) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiErrors(400, "Avatar file is required.");
  }

  const avatar = await uploadOnClouldinary(avatarLocalPath);
  const coverImage = await uploadOnClouldinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiErrors(400, "Avatar file is required.");
  }

  // create user obj - create entry in db
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // remove password & refresh token from res
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiErrors(
      500,
      "Something went worng while registering the user!"
    );
  }

  // return responce
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successful!"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  const { email, username, password } = req.body;

  // username or email
  if (!username && !email) {
    throw new ApiErrors(400, "User name or password required");
  }

  // if (!(username || email)) {
  //   throw new ApiErrors(400, "User name or password required");
  // }

  // find the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiErrors(400, "User doesn't exits.");
  }

  // check password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiErrors(401, "Invalid user credentisls");
  }

  // access & refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // getting updated userData
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, setCookieOption)
    .cookie("refreshToken", refreshToken, setCookieOption)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { registerToken: undefined } },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("accessToken", setCookieOption)
    .clearCookie("refreshToken", setCookieOption)
    .json(new ApiResponse(200, {}, "Successfully logout"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiErrors(401, "Unauthorize token");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiErrors(401, "Unauthorize token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiErrors(401, "Refresh token expired or used");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken, setCookieOption)
      .cookie("accessToken", refreshToken, setCookieOption)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access Token Refresh"
        )
      );
  } catch (error) {
    throw new ApiErrors(401, error?.message || "Invalid refresh token.");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confPassword } = req.body;

  if (!(newPassword === confPassword)) {
    throw new ApiErrors(
      400,
      "New password and conform password is not matched!"
    );
  }

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiErrors(400, "Invalid old password.");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password change successfully"));
});

const getCurrentUser = asyncHandler(
  asyncHandler(async (req, res) => {
    return res
      .status(200)
      .json(200, req.user, "Current User fetch successfully!");
  })
);

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!(fullname || email)) {
    throw new ApiErrors(400, "Fullname & Email are required");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .ApiResponse(200, updatedUser, "Account details Update successfully.");
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiErrors(400, "Avatar file missing");
  }

  //TODO: delete old image - assignment

  const avatar = await uploadOnClouldinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiErrors(400, "Error while updating avatar");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Avatar image update successfully.")
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiErrors(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscriberCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiErrors(404, "Chanel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully!")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  getUserChannelProfile,
};
