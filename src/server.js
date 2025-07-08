import "dotenv/config";
import express from "express";
import connectDB from "./db/config.js";
const app = express();
const PORT = process.env.PORT || 3000;

connectDB();
app.get("/", (req, res) => {
  res.send("Hello worldd");
});

app.listen(PORT, (req, res) => {
  console.log(`Server has started listening on Port ${PORT}`);
});
