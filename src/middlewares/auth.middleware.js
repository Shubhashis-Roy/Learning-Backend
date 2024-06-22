import { ApiErrors } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookie?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");

    if (!token) {
      throw new ApiErrors(401, "Unathurizaed requiest");
    }

    const decodedToken = await jwt.verify(token, ACCESS_TOKEN_SECRET);

    const user = User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    if (!decodedToken) {
      throw new ApiErrors(401, "Invalid Access Token");
    }
    next();
  } catch (error) {
    throw new ApiErrors(401, error?.message || "Invalid Access Token");
  }
});
