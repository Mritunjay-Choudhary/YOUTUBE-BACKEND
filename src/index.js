import "dotenv/config";
// import mongoose from "mongoose";
import {app} from "./app.js"
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