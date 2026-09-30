import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/User.model.js";
import {uploadOncloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) =>{
    //get user details from frontend
    //validaton - not empty
    //check if user already exist : username, email
    //check for image and avatar, upload them to cloudinary
    //create user object - create entry in db
    //remove password and refresh token field from resposne
    // check for user creation
    //return response

    const {fullName, email, username, password}= req.body
    // console.log(("email:", email));

    if([fullName, email, username, password].some((field) => field?.trim() === ""))
       {
        throw new ApiError(400, "All fields are required")
       }

    const existedUser = await User.findOne({ $or:[{username}, {email}] })
    if(existedUser){
        throw new ApiError(409, "User Already Exist")
    }
    // console.log("REQ.BODY:", req.body);
    // console.log("REQ.FILES:", req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath =req.files.coverImage[0].path
    }


    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOncloudinary(avatarLocalPath)
    // console.log("cloudinary avatar result:", avatar);
    
    const coverImage = await uploadOncloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url  || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while regestering the user")
    }

    return res.status(201).json(new ApiResponse(200,createdUser, "User Regsitered Successfully"))





})

export {registerUser}