import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteCloudinaryAsset,
  uploadOncloudinary,
} from "../utils/cloudinary.js";

const validVideoId = (id) => mongoose.Types.ObjectId.isValid(id);
const isOwner = (video, user) => {
  const ownerId = video.owner?._id || video.owner;
  return Boolean(user && ownerId?.toString() === user._id.toString());
};

const createVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const videoPath = req.files?.videoFile?.[0]?.path;
  const thumbnailPath = req.files?.thumbnail?.[0]?.path;
  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    !description.trim()
  ) {
    throw new ApiError(400, "Title and description are required");
  }
  if (!videoPath || !thumbnailPath)
    throw new ApiError(400, "Video and thumbnail files are required");

  const [videoAsset, thumbnailAsset] = await Promise.all([
    uploadOncloudinary(videoPath),
    uploadOncloudinary(thumbnailPath),
  ]);
  if (
    !videoAsset?.url ||
    !videoAsset?.public_id ||
    !thumbnailAsset?.url ||
    !thumbnailAsset?.public_id
  ) {
    if (videoAsset?.public_id)
      await deleteCloudinaryAsset(videoAsset.public_id, "video").catch(
        () => {}
      );
    if (thumbnailAsset?.public_id)
      await deleteCloudinaryAsset(thumbnailAsset.public_id).catch(() => {});
    throw new ApiError(502, "Could not upload video and thumbnail");
  }

  try {
    const video = await Video.create({
      videoFile: { url: videoAsset.url, public_id: videoAsset.public_id },
      thumbnail: {
        url: thumbnailAsset.url,
        public_id: thumbnailAsset.public_id,
      },
      title: title.trim(),
      description: description.trim(),
      duration: videoAsset.duration || 0,
      owner: req.user._id,
      isPublished: false,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, video, "Video uploaded successfully"));
  } catch (error) {
    await Promise.allSettled([
      deleteCloudinaryAsset(videoAsset.public_id, "video"),
      deleteCloudinaryAsset(thumbnailAsset.public_id),
    ]);
    throw error;
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!validVideoId(videoId)) throw new ApiError(400, "Invalid video ID");
  const video = await Video.findById(videoId).populate(
    "owner",
    "username fullName avatar"
  );
  if (!video) throw new ApiError(404, "Video not found");
  if (!video.isPublished && !isOwner(video, req.user))
    throw new ApiError(404, "Video not found");
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const getAllVideos = asyncHandler(async (req, res) => {
  const filter = req.user
    ? { $or: [{ isPublished: true }, { owner: req.user._id }] }
    : { isPublished: true };
  const videos = await Video.find(filter)
    .populate("owner", "username fullName avatar")
    .sort({ createdAt: -1 });
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const updateVideoDetails = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!validVideoId(videoId)) throw new ApiError(400, "Invalid video ID");
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");
  if (!isOwner(video, req.user))
    throw new ApiError(403, "You do not own this video");
  const { title, description } = req.body;
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim())
      throw new ApiError(400, "Title cannot be empty");
    video.title = title.trim();
  }
  if (description !== undefined) {
    if (typeof description !== "string" || !description.trim())
      throw new ApiError(400, "Description cannot be empty");
    video.description = description.trim();
  }
  await video.save();
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video details updated successfully"));
});

const updateVideoThumbnail = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!validVideoId(videoId)) throw new ApiError(400, "Invalid video ID");
  const localPath = req.file?.path;
  if (!localPath) throw new ApiError(400, "Thumbnail file is required");
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");
  if (!isOwner(video, req.user))
    throw new ApiError(403, "You do not own this video");

  const replacement = await uploadOncloudinary(localPath);
  if (!replacement?.url || !replacement?.public_id)
    throw new ApiError(502, "Could not upload thumbnail");
  const previousPublicId = video.thumbnail.public_id;
  video.thumbnail = { url: replacement.url, public_id: replacement.public_id };
  try {
    await video.save();
  } catch (error) {
    await deleteCloudinaryAsset(replacement.public_id).catch(() => {});
    throw error;
  }
  if (previousPublicId)
    await deleteCloudinaryAsset(previousPublicId).catch((error) =>
      console.error("Could not delete previous thumbnail:", error)
    );
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Thumbnail updated successfully"));
});

const updateVideoFile = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!validVideoId(videoId)) throw new ApiError(400, "Invalid video ID");
  const localPath = req.file?.path;
  if (!localPath) throw new ApiError(400, "Video file is required");
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");
  if (!isOwner(video, req.user))
    throw new ApiError(403, "You do not own this video");

  const replacement = await uploadOncloudinary(localPath);
  if (!replacement?.url || !replacement?.public_id)
    throw new ApiError(502, "Could not upload video");
  const previousPublicId = video.videoFile.public_id;
  video.videoFile = { url: replacement.url, public_id: replacement.public_id };
  if (replacement.duration) video.duration = replacement.duration;
  try {
    await video.save();
  } catch (error) {
    await deleteCloudinaryAsset(replacement.public_id, "video").catch(() => {});
    throw error;
  }
  if (previousPublicId)
    await deleteCloudinaryAsset(previousPublicId, "video").catch((error) =>
      console.error("Could not delete previous video:", error)
    );
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video file updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!validVideoId(videoId)) throw new ApiError(400, "Invalid video ID");
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");
  if (!isOwner(video, req.user))
    throw new ApiError(403, "You do not own this video");
  await Video.deleteOne({ _id: video._id });
  const cleanup = await Promise.allSettled([
    deleteCloudinaryAsset(video.videoFile.public_id, "video"),
    deleteCloudinaryAsset(video.thumbnail.public_id),
  ]);
  const cleanupComplete = cleanup.every(
    (result) =>
      result.status === "fulfilled" &&
      (!result.value?.result ||
        result.value.result === "ok" ||
        result.value.result === "not found")
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { video, cloudinaryCleanupComplete: cleanupComplete },
        "Video deleted successfully"
      )
    );
});

const setVideoPublication = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!validVideoId(videoId)) throw new ApiError(400, "Invalid video ID");
  if (typeof req.body.isPublished !== "boolean")
    throw new ApiError(400, "isPublished must be a boolean");
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");
  if (!isOwner(video, req.user))
    throw new ApiError(403, "You do not own this video");
  video.isPublished = req.body.isPublished;
  await video.save();
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        video,
        video.isPublished
          ? "Video published successfully"
          : "Video unpublished successfully"
      )
    );
});

export {
  createVideo,
  getVideoById,
  getAllVideos,
  updateVideoDetails,
  updateVideoThumbnail,
  updateVideoFile,
  deleteVideo,
  setVideoPublication,
};
