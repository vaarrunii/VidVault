// src/components/CategoryVideoGallery.js
import React from 'react';
import './CategoryVideoGallery.css'; // Ensure this CSS file exists for modal-specific styles

const CategoryVideoGallery = ({ category, videos, onSelectVideo, onDeleteVideo, onEditVideo, isAdminView, currentView }) => {
  if (!category || !videos || videos.length === 0) {
    return (
      <div className="category-gallery-placeholder">
        <p>No videos found for this category.</p>
        <p>Try uploading a new video and assigning it to "{category}"!</p>
      </div>
    );
  }

  // Sort videos by serial number
  const sortedVideos = [...videos].sort((a, b) => {
    // Convert serialNumber to a number for proper numerical sorting
    const snA = parseInt(a.serialNumber, 10);
    const snB = parseInt(b.serialNumber, 10);

    // Handle cases where serialNumber might be missing or not a valid number
    if (isNaN(snA) && isNaN(snB)) return 0; // Both invalid, maintain original order
    if (isNaN(snA)) return 1; // a is invalid, b comes first
    if (isNaN(snB)) return -1; // b is invalid, a comes first

    return snA - snB; // Sort numerically in ascending order
  });

  return (
    <div className="category-gallery-container">
      <h2 className="gallery-title">Videos in {category}</h2>
      <div className="category-gallery">
        {sortedVideos.map(video => ( // Use sortedVideos here
          <div key={video.id} className="gallery-video-card" onClick={() => onSelectVideo(video)}>
            <div className="video-thumbnail">
              {video.fileUrl && video.fileType ? (
                <video src={video.fileUrl} type={video.fileType} muted />
              ) : (
                <div className="thumbnail-placeholder">
                  <span className="icon">🎬</span>
                  <p>No Preview</p>
                </div>
              )}
            </div>
            <div className="gallery-video-info">
              <h3 className="gallery-video-title">{video.title}</h3>
              {video.description && <p className="gallery-video-description">{video.description}</p>}
              <p className="gallery-video-meta">Uploaded: {new Date(video.uploadDate).toLocaleDateString()}</p>
              {video.serialNumber && <p className="gallery-video-meta">S.N.: {video.serialNumber}</p>}
            </div>
            {/* The Edit and Delete buttons are intentionally not rendered in the Category Video Gallery,
                as per your previous instruction. They will only be available in the main VideoPlayer view. */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryVideoGallery;