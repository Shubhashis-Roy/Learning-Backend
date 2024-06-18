import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
  //  get user details from frontend
  // validation - not empty
  // check if user already exits: username, email
  // upload them to cloudinary, avatar
  // create user obj - create entry in db
  // remove password & refresh token from res
  // check for user creation
  // return responce
});

export { registerUser };
