import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const tempDirectory = path.resolve("public/temp");
fs.mkdirSync(tempDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, tempDirectory)
    },
    filename: function (req, file, cb){
        cb(null, `${randomUUID()}${path.extname(file.originalname)}`)
    }
})

export const upload = multer({storage})
