import "dotenv/config";
// import { configDotenv } from "dotenv";
// configDotenv();

import mongoose from "mongoose";
import connectDB from "./db/index.js";

connectDB();