// src/components/CategoryVideoGallery.js
import React from 'react';
import './CategoryVideoGallery.css';

const CategoryVideoGallery = ({ category, videos, onSelectVideo, onDeleteVideo }) => { // onDeleteVideo prop is still here but not used for the button
  if (!videos || videos.length === 0) {
    return (
      <div className="category-gallery-placeholder">
        <p>No videos found in the "{category}" category yet.</p>
        <p className="small-text">Upload a new video and assign it to this category!</p>
      </div>
    );
  }

  return (
    <div className="category-gallery-container">
      <h2 className="gallery-title">Videos in "{category}"</h2>
      <div className="category-gallery">
        {videos.map(video => (
          <div key={video.id} className="gallery-video-card">
            {/*
            // Delete button functionality commented out as requested.
            // To re-enable, uncomment this block and the corresponding CSS in CategoryVideoGallery.css
            <button
              className="gallery-delete-button"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click from triggering
                onDeleteVideo(video.id);
              }}
              title="Delete Video"
            >
              &times; // Simple 'x' icon
            </button>
            */}

            <div className="video-thumbnail" onClick={() => onSelectVideo(video)}>
              {video.fileUrl && video.fileType ? (
                <video src={video.fileUrl} type={video.fileType} />
              ) : (
                <div className="thumbnail-placeholder">
                  <span className="icon">🎬</span> {/* Movie clapper emoji */}
                  <p>No Preview</p>
                </div>
              )}
            </div>
            <div className="gallery-video-info" onClick={() => onSelectVideo(video)}>
              <h3 className="gallery-video-title">{video.title}</h3>
              {/* Added description with potential overflow ellipsis */}
              <p className="gallery-video-description">{video.description || 'No description available.'}</p>
              <p className="gallery-video-meta">Uploaded: {new Date(video.uploadDate).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryVideoGallery;