import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadClouldinary } from "../utils/cloudinary.js";
import { ApiResponce } from "../utils/ApiResponce.js";

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

  const avatar = await uploadClouldinary(avatarLocalPath);
  const coverImage = await uploadClouldinary(coverImageLocalPath);

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
    .json(new ApiResponce(200, createdUser, "User Registered Successful!"));
});

export { registerUser };
