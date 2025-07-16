// src/components/VideoPlayer.js
import React, { useRef, useEffect, useState } from 'react';
import './VideoPlayer.css'; // Ensure this CSS file exists

const VideoPlayer = ({ video, onDeleteVideo, onEditVideo, isAdminView }) => { // Added isAdminView prop
  const videoRef = useRef(null);
  const [videoPlaybackError, setVideoPlaybackError] = useState(false);

  useEffect(() => {
    setVideoPlaybackError(false);

    if (video && video.fileUrl && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(error => {
        console.warn("VideoPlayer: Autoplay prevented or failed:", error);
      });
    }
  }, [video]);

  const handleVideoError = () => {
    console.error("VideoPlayer: Error loading video source or during playback.");
    setVideoPlaybackError(true);
  };

  // --- Conditional Rendering for different states ---

  // 1. No video selected yet
  if (!video) {
    return (
      <div className="video-player-placeholder">
        <p>Select a video from the sidebar to play.</p>
        <p>Or click "Upload New Video" to get started!</p>
      </div>
    );
  }

  // 2. Video selected, but fileUrl is missing (data integrity issue)
  if (!video.fileUrl) {
    return (
      <div className="video-player-placeholder video-error-placeholder">
        <p>Error: Video file not found or could not be loaded.</p>
        <p className="small-text">This video's file might be missing or corrupted in your local storage.</p>
        <p className="small-text">Please try editing the video and re-uploading the file.</p>
        {isAdminView && ( // Only show buttons if admin
          <div className="player-action-buttons">
            <button className="action-button-edit" onClick={() => onEditVideo(video)}>Edit Video</button>
            <button className="action-button-delete" onClick={() => onDeleteVideo(video.id)}>Delete Video</button>
          </div>
        )}
      </div>
    );
  }

  // 3. Video selected and fileUrl is present, but a playback error occurred
  if (videoPlaybackError) {
    return (
      <div className="video-player">
        <div className="video-header-actions">
          <h2>{video.title || 'Untitled Video'}</h2>
          {isAdminView && ( // Only show buttons if admin
            <div className="player-action-buttons">
              <button className="action-button-edit" onClick={() => onEditVideo(video)}>Edit</button>
              <button className="action-button-delete" onClick={() => onDeleteVideo(video.id)}>Delete</button>
            </div>
          )}
        </div>
        <p className="video-category-detail">Category: {video.category || 'Uncategorized'}</p>
        <div className="video-embed-container">
          <div className="video-error-placeholder">
            <p>Error: Could not play video.</p>
            <p className="small-text">The video file may be corrupted or in an unsupported format.</p>
            <p className="small-text">Try re-uploading or selecting a different video.</p>
          </div>
        </div>
        {video.description && (
          <div className="video-description-container">
            <p className="video-description">{video.description}</p>
          </div>
        )}
        <p className="video-meta-info">Uploaded: {video.uploadDate ? new Date(video.uploadDate).toLocaleDateString() : 'N/A'}</p>
        {video.serialNumber && <p className="video-meta-info">Serial Number: {video.serialNumber}</p>}
      </div>
    );
  }

  // 4. Video selected, fileUrl present, no playback error - render the video
  return (
    <div className="video-player">
      <div className="video-header-actions">
        <h2>{video.title || 'Untitled Video'}</h2>
        {isAdminView && ( // Only show buttons if admin
          <div className="player-action-buttons">
            <button className="action-button-edit" onClick={() => onEditVideo(video)}>Edit</button>
            <button className="action-button-delete" onClick={() => onDeleteVideo(video.id)}>Delete</button>
          </div>
        )}
      </div>
      <p className="video-category-detail">Category: {video.category || 'Uncategorized'}</p>

      <div className="video-embed-container">
        <video
          ref={videoRef}
          controls
          autoPlay
          onError={handleVideoError}
          key={video.fileUrl}
        >
          <source src={video.fileUrl} type={video.fileType || 'video/mp4'} />
          Your browser does not support the video tag.
        </video>
      </div>

      {video.description && (
        <div className="video-description-container">
          <p className="video-description">{video.description}</p>
        </div>
      )}
      <p className="video-meta-info">Uploaded: {video.uploadDate ? new Date(video.uploadDate).toLocaleDateString() : 'N/A'}</p>
      {video.serialNumber && <p className="video-meta-info">Serial Number: {video.serialNumber}</p>}
    </div>
  );
};

export default VideoPlayer;