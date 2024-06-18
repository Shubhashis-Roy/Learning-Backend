import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { fullname, email, username, password } = req.body;
  console.log("email", email);

  // validation - not empty
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw ApiErrors(400, "All fileds are required");
  }

  // check if user already exits: username, email
  const exitedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (exitedUser) {
    throw new ApiErrors(409, "User with email or username already exists.");
  }

  // upload them to cloudinary, avatar
  // create user obj - create entry in db
  // remove password & refresh token from res
  // check for user creation
  // return responce
});

export { registerUser };
