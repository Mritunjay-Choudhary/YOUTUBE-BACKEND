import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/User.model.js";
import {uploadOncloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const generateAccessAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}

        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access and Refresh Token")
    }
}





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

const loginUser = asyncHandler(async (req, res) =>{
    const {email,username, password} = req.body 
    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }
    const user = await User.findOne({
        $or:[{username}, {email}]
    })
    if(!user){
        throw new ApiError(404, "User not found")
    }
    const isPasswordValid = await user.isPasswordCorrect (password)

    if(!isPasswordValid){
        throw new ApiError(401, "Incorrect Password")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User Logged In Successfully")
    )

})

const logoutUser = asyncHandler(async(req, res) =>{
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
          returnDocument: "after"
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{}, "User Logged Out Successfylly"))

})

export {registerUser, loginUser, logoutUser}