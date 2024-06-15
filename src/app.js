import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

const sizeLimit = "16kb";
app.use(express.json({ limit: sizeLimit }));
app.use(express.urlencoded({ extended: true, sizeLimit }));
app.use(express.static("public"));
app.use(cookieParser());

export { app };
