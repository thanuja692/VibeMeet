import multer from "multer"
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 4 * 1024 * 1024, // App limit: 4 MB
    files: 2,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Please upload a JPG, PNG, WebP, or GIF image."));
    }

    cb(null, true);
  },
});

export const receiveImage = (req, res, next) => {

    upload.fields([{ name: "image", maxCount: 1 }, { name: "teachingImage", maxCount: 1 }])(req, res, (err) => {

        if (err) {
            return res.status(400).json({
                msg: err.message
            })
        }

        req.imageFile = req.files?.image?.[0]
        req.teachingImageFile = req.files?.teachingImage?.[0]
        next()
    })
}
