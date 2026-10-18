const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function uploadImage(filePath) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'products',
      allowed_formats: ALLOWED_FORMATS,
      transformation: [{ quality: 'auto' }],
      secure: true,
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    if (error.http_code === 400) {
      throw new ApiError(400, 'Invalid image file type. Allowed: jpg, jpeg, png, webp, avif');
    }
    throw new ApiError(500, 'Image upload to Cloudinary failed');
  }
}

async function uploadBuffer(buffer, mimetype) {
  const format = mimetype.split('/')[1];
  if (!ALLOWED_FORMATS.includes(format)) {
    throw new ApiError(400, 'Invalid image file type. Allowed: jpg, jpeg, png, webp, avif');
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'products',
          allowed_formats: ALLOWED_FORMATS,
          transformation: [{ quality: 'auto' }],
          secure: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(buffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    if (error.http_code === 400) {
      throw new ApiError(400, 'Invalid image file type. Allowed: jpg, jpeg, png, webp, avif');
    }
    throw new ApiError(500, 'Image upload to Cloudinary failed');
  }
}

async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new ApiError(500, 'Failed to delete image from Cloudinary');
  }
}

async function deleteImages(publicIds) {
  const valid = publicIds.filter(Boolean);
  if (valid.length === 0) return;
  try {
    await cloudinary.api.delete_resources(valid);
  } catch (error) {
    throw new ApiError(500, 'Failed to delete images from Cloudinary');
  }
}

function isCloudinaryUrl(url) {
  return typeof url === 'string' && url.includes('cloudinary.com');
}

module.exports = {
  uploadImage,
  uploadBuffer,
  deleteImage,
  deleteImages,
  isCloudinaryUrl,
  ALLOWED_FORMATS,
  MAX_FILE_SIZE,
};
