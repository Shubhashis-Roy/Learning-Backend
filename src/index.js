// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    // Handle Error
    app.on("error", (error) => {
      console.log("Not able to connect app");
      throw error;
    });

    // start app
    app.listen(process.env.PORT || 8800, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection FAILED :", err);
  });
