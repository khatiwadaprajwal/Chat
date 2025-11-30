import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// Helper: Delete local file safely
const deleteLocalFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("🗑️ Deleted local file:", filePath);
    }
  } catch (error) {
    console.error("Error deleting local file:", error);
  }
};

// ✅ Upload profile picture to Cloudinary
export const uploadProfilePicture = async (filePath) => {
  try {
    console.log("📁 Uploading file:", filePath);

    // ✅ Check if file exists before uploading
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // ✅ Check file size
    const stats = fs.statSync(filePath);
    console.log("📊 File size:", (stats.size / 1024).toFixed(2), "KB");

    const result = await cloudinary.uploader.upload(filePath, {
      folder: "chatapp_profiles",
      transformation: [
        { width: 500, height: 500, crop: "fill", gravity: "face" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    console.log("✅ Cloudinary upload successful:", result.secure_url);

    // Delete local file after successful upload
    deleteLocalFile(filePath);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    // Delete local file even if upload fails
    deleteLocalFile(filePath);
    
    // ✅ Better error logging
    console.error("❌ Cloudinary upload error:", {
      message: error.message,
      name: error.name,
      http_code: error.http_code,
      error: error
    });
    
    // ✅ Throw with proper error message
    const errorMessage = 
      error.message || 
      error.error?.message || 
      (error.http_code ? `HTTP Error ${error.http_code}` : null) ||
      "Unknown Cloudinary error";
    
    throw new Error(`Cloudinary upload failed: ${errorMessage}`);
  }
};

// ✅ Upload chat/message image
export const uploadChatImage = async (filePath) => {
  try {
    console.log("📁 Uploading chat image:", filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder: "chatapp_messages",
      transformation: [
        { width: 1200, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    console.log("✅ Chat image uploaded:", result.secure_url);
    deleteLocalFile(filePath);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    deleteLocalFile(filePath);
    
    console.error("❌ Chat image upload error:", error);
    
    const errorMessage = 
      error.message || 
      error.error?.message || 
      "Unknown Cloudinary error";
    
    throw new Error(`Cloudinary upload failed: ${errorMessage}`);
  }
};

// ✅ Delete image from Cloudinary
export const deleteCloudinaryImage = async (imageUrl) => {
  try {
    if (!imageUrl) return { success: false };

    // Extract public_id from URL
    const urlParts = imageUrl.split("/");
    const filename = urlParts[urlParts.length - 1].split(".")[0];
    const folder = urlParts[urlParts.length - 2];
    const publicId = `${folder}/${filename}`;

    console.log("🗑️ Deleting from Cloudinary:", publicId);

    const result = await cloudinary.uploader.destroy(publicId);

    console.log("✅ Cloudinary delete result:", result);

    return {
      success: result.result === "ok",
      publicId,
    };
  } catch (error) {
    console.error("❌ Cloudinary deletion error:", error);
    return { success: false, error: error.message };
  }
};

// ✅ Upload multiple images
export const uploadMultipleImages = async (filePaths) => {
  try {
    console.log("📁 Uploading multiple images:", filePaths.length);

    const uploadPromises = filePaths.map((filePath) =>
      cloudinary.uploader.upload(filePath, {
        folder: "chatapp_gallery",
        transformation: [
          { width: 1200, crop: "limit" },
          { quality: "auto" },
        ],
      })
    );

    const results = await Promise.all(uploadPromises);

    // Delete all local files
    filePaths.forEach((filePath) => deleteLocalFile(filePath));

    console.log("✅ Multiple images uploaded:", results.length);

    return {
      success: true,
      images: results.map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
      })),
    };
  } catch (error) {
    // Clean up all local files on error
    filePaths.forEach((filePath) => deleteLocalFile(filePath));
    
    console.error("❌ Multiple upload error:", error);
    
    const errorMessage = 
      error.message || 
      error.error?.message || 
      "Unknown Cloudinary error";
    
    throw new Error(`Multiple upload failed: ${errorMessage}`);
  }
};
