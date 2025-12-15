const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary
 * @param {string} filePath - Path to the file or base64 string
 * @param {string} folder - Cloudinary folder name
 * @param {object} options - Additional upload options
 * @returns {Promise<object>} - Upload result with url and public_id
 */
const uploadImage = async (filePath, folder = 'kolo', options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto:best' },
        { fetch_format: 'auto' }
      ],
      ...options,
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public_id of the image to delete
 * @returns {Promise<object>} - Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result,
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

/**
 * Upload multiple images
 * @param {Array<string>} filePaths - Array of file paths
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<Array>} - Array of upload results
 */
const uploadMultipleImages = async (filePaths, folder = 'kolo') => {
  try {
    const uploadPromises = filePaths.map(filePath => 
      uploadImage(filePath, folder)
    );
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw new Error('Failed to upload multiple images');
  }
};

/**
 * Get optimized image URL with transformations
 * @param {string} publicId - The public_id of the image
 * @param {object} transformations - Transformation options
 * @returns {string} - Transformed image URL
 */
const getOptimizedImageUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, {
    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' },
      ...Object.entries(transformations).map(([key, value]) => ({ [key]: value }))
    ],
  });
};

/**
 * Upload a PDF to Cloudinary
 * @param {Buffer|string} fileData - PDF file buffer or path
 * @param {string} fileName - Name of the file (without extension)
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<object>} - Upload result with url and public_id
 */
const uploadPDF = async (fileData, fileName, folder = 'kolo/invoices') => {
  try {
    const result = await cloudinary.uploader.upload(fileData, {
      folder: folder,
      resource_type: 'raw',
      public_id: fileName,
      format: 'pdf',
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Cloudinary PDF upload error:', error);
    throw new Error('Failed to upload PDF to Cloudinary');
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  uploadMultipleImages,
  uploadPDF,
  getOptimizedImageUrl,
};
