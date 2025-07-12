import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./db/config.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
connectDB();

//routes import
import userRouter from "./routes/user.routes.js";

// routes declaration

app.use("/api/v1/users", userRouter);

app.listen(PORT, (req, res) => {
  console.log(`Server has started listening on Port ${PORT}`);
});
