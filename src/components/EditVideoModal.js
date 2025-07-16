// src/components/EditVideoModal.js
import React, { useState, useEffect, useRef } from 'react';
import './EditVideoModal.css'; // Ensure this CSS file exists for modal-specific styles

const EditVideoModal = ({ video, categories, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [currentFileId, setCurrentFileId] = useState(null);
  const fileInputRef = useRef(null); // Ref for the hidden file input

  useEffect(() => {
    if (video) {
      setTitle(video.title || '');
      setDescription(video.description || '');
      setCategory(video.category || '');
      setSerialNumber(video.serialNumber ? String(video.serialNumber) : '');
      setCurrentFileId(video.fileId || null);
      setVideoFile(null); // Clear file input when editing an existing video
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear actual file input
      }
    } else {
      // For new video upload
      setTitle('');
      setDescription('');
      setCategory('');
      setSerialNumber('');
      setVideoFile(null);
      setCurrentFileId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear actual file input
      }
    }
  }, [video]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      console.log("Title is required.");
      return;
    }
    if (!category.trim()) {
      console.log("Category is required.");
      return;
    }
    if (!video && !videoFile) { // If adding new video, file is mandatory
      console.log("Video file is required for new uploads.");
      return;
    }

    const videoMetadata = {
      id: video ? video.id : undefined,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      serialNumber: serialNumber.trim(),
      uploadDate: video ? video.uploadDate : new Date().toISOString(),
      fileId: video ? video.fileId : undefined,
      fileType: video ? video.fileType : undefined
    };

    onSave(videoMetadata, videoFile);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
    } else {
      setVideoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear input if invalid file
      }
      console.log("Please select a valid video file.");
    }
  };

  return (
    <div className="edit-video-modal-overlay">
      <div className="edit-video-modal">
        <h2>{video ? 'Edit Video' : 'Upload New Video'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title:</label>
            <input
              type="text"
              id="title"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
            ></textarea>
          </div>
          <div className="form-group">
            <label htmlFor="category">Category:</label>
            <input
              type="text"
              id="category"
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="category-options"
              required
            />
            <datalist id="category-options">
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label htmlFor="serialNumber">Serial Number (Optional):</label>
            <input
              type="text"
              id="serialNumber"
              className="form-input"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="videoFile">{video ? 'Upload New Video File (Optional):' : 'Upload Video File:'}</label>
            <div className="file-input-wrapper"> {/* Wrapper for custom file input */}
              <input
                type="file"
                id="videoFile"
                accept="video/*"
                onChange={handleFileChange}
                required={!video}
                ref={fileInputRef}
                className="hidden-file-input"
              />
              <label htmlFor="videoFile" className="custom-file-upload-button button-base button-primary">
                Choose File
              </label>
              <span className="file-name-display">
                {videoFile ? videoFile.name : (currentFileId ? `Current: ${currentFileId.substring(0, 8)}...` : 'No file selected')}
              </span>
            </div>
          </div>
          <div className="modal-actions">
            <button type="submit" className="button-base button-success">
              {video ? 'Save Changes' : 'Upload Video'}
            </button>
            <button type="button" onClick={onClose} className="button-base button-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVideoModal;