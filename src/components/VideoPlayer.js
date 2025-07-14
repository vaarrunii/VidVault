// src/components/VideoPlayer.js
import React, { useEffect, useRef } from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ video, onDeleteVideo, onEditVideo }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    // If a video is selected, try to load and play it.
    // This effect will re-run if 'video' prop changes.
    if (video && video.fileUrl) {
      if (videoRef.current) {
        videoRef.current.load(); // Reload the video source
        // No autoplay here to prevent NotSupportedError. User can click play.
      }
    }
  }, [video]); // Re-run effect when 'video' object changes

  const handleVideoError = (e) => {
    console.error("Video playback error:", e.target.error.code, e.target.error.message);
    alert("Video playback failed. The video file might be corrupted or unsupported."); // Reverting to alert
  };

  if (!video) {
    return (
      <div className="video-player-placeholder">
        <p>Select a video from the list or upload a new one to start playing!</p>
      </div>
    );
  }

  // Determine if the video is playable (has a valid fileUrl and fileType)
  const isPlayable = video.fileUrl && video.fileType;

  return (
    <div className="video-player">
      <div className="video-header-actions">
        <h2>{video.title}</h2>
        <div className="player-action-buttons">
          {/* Edit button is only shown if the video is playable, as editing without a file is complex */}
          {isPlayable && (
            <button className="edit-video-button" onClick={() => onEditVideo(video)}>Edit</button>
          )}
          {/* Delete button is always shown if a video is selected, regardless of playability */}
          <button className="delete-video-button" onClick={() => onDeleteVideo(video.id)}>Delete</button>
        </div>
      </div>
      <p className="video-category-detail">Category: {video.category}</p>

      {isPlayable ? (
        <div className="video-embed-container">
          <video controls ref={videoRef} onError={handleVideoError}>
            <source src={video.fileUrl} type={video.fileType} />
            Your browser does not support the video tag.
          </video>
        </div>
      ) : (
        <div className="video-player-placeholder video-error-placeholder">
          <p>Error: Video file not found or could not be loaded.</p>
          <p className="small-text">This video's file data is missing or corrupted. Please delete it and re-upload if needed.</p>
        </div>
      )}

      <div className="video-description-container">
        {video.description ? (
          <p className="video-description">{video.description}</p>
        ) : (
          <p className="video-description" style={{ fontStyle: 'italic', color: 'var(--color-text-light)' }}>No description provided for this video.</p>
        )}
        <p className="video-meta-info">Uploaded: {new Date(video.uploadDate).toLocaleString()}</p>
        {video.serialNumber && <p className="video-meta-info">Serial Number: {video.serialNumber}</p>}
      </div>
    </div>
  );
};

export default VideoPlayer;