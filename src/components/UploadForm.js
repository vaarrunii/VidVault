// src/components/UploadForm.js
import React, { useState, useEffect } from 'react';
import './UploadForm.css';

const generateId = () => Math.random().toString(36).substr(2, 9);

const UploadForm = ({ onAddVideo, onUpdateVideo, onCancel, initialVideoData }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [videoFile, setVideoFile] = useState(null); // This will hold the actual File object
  const [fileError, setFileError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (initialVideoData) {
      setIsEditing(true);
      setTitle(initialVideoData.title || '');
      setCategory(initialVideoData.category || '');
      setDescription(initialVideoData.description || '');
      setSerialNumber(initialVideoData.serialNumber || '');
      setVideoFile(null); // Clear videoFile state on edit load, user must re-select if they want to change the file
      setFileError('');
    } else {
      setIsEditing(false);
      setTitle('');
      setCategory('');
      setDescription('');
      setSerialNumber('');
      setVideoFile(null);
      setFileError('');
    }
  }, [initialVideoData]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setFileError('Please select a valid video file.');
        setVideoFile(null);
        return;
      }
      setFileError('');
      setVideoFile(file); // Store the raw File object directly
      console.log("UploadForm: File selected:", file.name, "Type:", file.type);
    } else {
      setFileError('No file selected.');
      setVideoFile(null);
      console.log("UploadForm: No file selected.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFileError('');

    if (!title.trim() || !category.trim()) {
      alert('Please enter a Title and Category.'); // Reverting to alert
      return;
    }

    let videoMetadata = {
      id: initialVideoData ? initialVideoData.id : generateId(),
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      serialNumber: serialNumber ? parseInt(serialNumber, 10) : null,
      uploadDate: initialVideoData ? initialVideoData.uploadDate : new Date().toISOString(),
      fileName: videoFile ? videoFile.name : (initialVideoData ? initialVideoData.fileName : null),
      // fileType will be added by App.js based on videoFile.type before passing to IndexedDB
    };

    if (isEditing) {
      onUpdateVideo(videoMetadata, videoFile);
    } else {
      if (!videoFile) { // File is required for new uploads
        setFileError('Please select a video file to upload.');
        alert('Please select a video file to upload.'); // Reverting to alert
        return;
      }
      onAddVideo(videoMetadata, videoFile);
    }
  };

  return (
    <div className="upload-form-container">
      <h2>{isEditing ? 'Edit Video Details' : 'Upload New Video to VidVault'}</h2>
      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label htmlFor="title">Video Title:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., My Epic Vacation Highlights"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Travel, Vlogs, Education"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="serialNumber">Serial Number (Optional):</label>
          <input
            type="number"
            id="serialNumber"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="e.g., 1, 2, 3 (for custom sorting)"
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description (Optional):</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your video..."
            rows="3"
          ></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="videoFile">{isEditing ? 'Update Video File (Optional):' : 'Select Video File:'}</label>
          <input
            type="file"
            id="videoFile"
            accept="video/*"
            onChange={handleFileChange}
            required={!isEditing} // Required only for new uploads
          />
          {fileError && <p className="file-error">{fileError}</p>}
          {videoFile && <p className="file-info">Selected: {videoFile.name}</p>}
          {isEditing && !videoFile && initialVideoData.fileName && (
            <p className="file-info">Current file: {initialVideoData.fileName}</p>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="submit-button">
            {isEditing ? 'Save Changes' : 'Upload Video'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadForm;