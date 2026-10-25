import { Router } from "express";
import {
  createVideo,
  deleteVideo,
  getAllVideos,
  getVideoById,
  setVideoPublication,
  updateVideoDetails,
  updateVideoFile,
  updateVideoThumbnail,
} from "../controllers/video.controller.js";
import { verifyJWT, optionalJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/")
  .get(optionalJWT, getAllVideos)
  .post(verifyJWT, upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]), createVideo);

router.route("/:videoId")
  .get(optionalJWT, getVideoById)
  .patch(verifyJWT, updateVideoDetails)
  .delete(verifyJWT, deleteVideo);

router.route("/:videoId/thumbnail")
  .patch(verifyJWT, upload.single("thumbnail"), updateVideoThumbnail);

router.route("/:videoId/file")
  .patch(verifyJWT, upload.single("videoFile"), updateVideoFile);

router.route("/:videoId/publish")
  .patch(verifyJWT, setVideoPublication);

export default router;
