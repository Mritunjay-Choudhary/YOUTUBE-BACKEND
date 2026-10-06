import { v2 as cloudinary} from "cloudinary";
import fs from "node:fs"

// Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 
    });
    
const uploadOncloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        return response;

    } catch (error) {
        console.error("Cloudinary upload error:", error);
        return null;
    } finally {
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
    }
}

const deleteCloudinaryAsset = async (publicId, resourceType = "image") => {
    if (!publicId) return null;
    return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

export { uploadOncloudinary, deleteCloudinaryAsset }
