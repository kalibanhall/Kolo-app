import React, { useState, useRef } from 'react';
import api from '../services/api';

export const ImageUpload = ({
  onUploadComplete,
  folder = 'kolo',
  maxSize = 5,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  buttonText = 'Télécharger une image',
  multiple = false,
  currentImage = null,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      setError(`Format non supporté. Utilisez: ${acceptedFormats.map(f => f.split('/')[1]).join(', ')}`);
      return false;
    }

    // Check file size (in MB)
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setError(`Fichier trop volumineux. Maximum: ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError('');

    if (multiple) {
      handleMultipleUpload(Array.from(files));
    } else {
      const file = files[0];
      if (validateFile(file)) {
        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload
        handleUpload(file);
      }
    }
  };

  const handleUpload = async (file) => {
    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', folder);

      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setPreview(response.data.data.url);
        if (onUploadComplete) {
          onUploadComplete(response.data.data);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Erreur lors du téléchargement');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleMultipleUpload = async (files) => {
    try {
      setUploading(true);
      setError('');

      // Validate all files
      const validFiles = files.filter(validateFile);
      if (validFiles.length === 0) return;

      const formData = new FormData();
      validFiles.forEach((file) => {
        formData.append('images', file);
      });
      formData.append('folder', folder);

      const response = await api.post('/upload/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && onUploadComplete) {
        onUploadComplete(response.data.data);
      }
    } catch (err) {
      console.error('Multiple upload error:', err);
      setError(err.response?.data?.message || 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!preview || !preview.includes('cloudinary.com')) return;

    try {
      // Extract public_id from Cloudinary URL
      const urlParts = preview.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
      const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ''); // Remove extension
      const encodedPublicId = publicId.replace(/\//g, '_');

      await api.delete(`/upload/image/${encodedPublicId}`);
      setPreview(null);
      setError('');
      if (onUploadComplete) {
        onUploadComplete(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      {preview && !multiple && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-gray-300"
          />
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors shadow-lg"
            title="Supprimer l'image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileSelect}
          multiple={multiple}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            uploading
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Téléchargement...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>{buttonText}</span>
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 mt-2">
          Formats acceptés: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} · Max: {maxSize}MB
          {multiple && ' · Sélection multiple autorisée'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
