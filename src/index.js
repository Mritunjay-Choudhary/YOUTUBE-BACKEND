import "dotenv/config";
// import { configDotenv } from "dotenv";
// configDotenv();

import mongoose from "mongoose";
import connectDB from "./db/index.js";

connectDB()
.then(() =>{
    app.listen(process.env.PORT || 8000, () =>{
        console.log(`Server is Listening on port ${process.env.PORT}`);
        
    })

})
.catch((error) =>{
    console.log("Mongo DB Connection Failed", error);
    
})