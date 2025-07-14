// src/components/VideoPlayer.js
import React, { useRef, useEffect, useState } from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ video, onDeleteVideo, onEditVideo }) => {
  const videoRef = useRef(null);
  const [videoPlaybackError, setVideoPlaybackError] = useState(false); // Renamed state for clarity

  useEffect(() => {
    // Reset playback error state whenever the video prop changes
    setVideoPlaybackError(false);

    // If a new video is selected and has a fileUrl, attempt to load it
    if (video && video.fileUrl && videoRef.current) {
      videoRef.current.load(); // Force the video element to reload the new source
      videoRef.current.play().catch(error => {
        // Catch autoplay errors (e.g., browser policy)
        console.warn("VideoPlayer: Autoplay prevented or failed:", error);
        // Do not set videoPlaybackError here, as it's not a source error
      });
    }
  }, [video]); // Depend on the video object itself

  // Handle errors that occur during video playback (e.g., unsupported format, network issues)
  const handleVideoError = () => {
    console.error("VideoPlayer: Error loading video source or during playback.");
    setVideoPlaybackError(true); // Set state to show playback error message
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
        <div className="player-action-buttons">
          <button className="edit-video-button" onClick={onEditVideo}>Edit Video</button>
          <button className="delete-video-button" onClick={() => onDeleteVideo(video.id)}>Delete Video</button>
        </div>
      </div>
    );
  }

  // 3. Video selected and fileUrl is present, but a playback error occurred
  if (videoPlaybackError) {
    return (
      <div className="video-player">
        <div className="video-header-actions">
          <h2>{video.title}</h2>
          <div className="player-action-buttons">
            <button className="edit-video-button" onClick={onEditVideo}>Edit</button>
            <button className="delete-video-button" onClick={() => onDeleteVideo(video.id)}>Delete</button>
          </div>
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
        <p className="video-meta-info">Uploaded: {new Date(video.uploadDate).toLocaleDateString()}</p>
        {video.serialNumber && <p className="video-meta-info">Serial Number: {video.serialNumber}</p>}
      </div>
    );
  }

  // 4. Video selected, fileUrl present, no playback error - render the video
  return (
    <div className="video-player">
      <div className="video-header-actions">
        <h2>{video.title}</h2>
        <div className="player-action-buttons">
          <button className="edit-video-button" onClick={onEditVideo}>Edit</button>
          <button className="delete-video-button" onClick={() => onDeleteVideo(video.id)}>Delete</button>
        </div>
      </div>
      <p className="video-category-detail">Category: {video.category || 'Uncategorized'}</p>

      <div className="video-embed-container">
        <video
          ref={videoRef}
          controls
          autoPlay
          onError={handleVideoError}
          // The key prop is crucial here. It forces React to re-mount the video element
          // when video.fileUrl changes, ensuring the browser reloads the new source.
          key={video.fileUrl}
        >
          {/* Use video.fileType for the type attribute for better browser compatibility */}
          <source src={video.fileUrl} type={video.fileType || 'video/mp4'} />
          Your browser does not support the video tag.
        </video>
      </div>

      {video.description && (
        <div className="video-description-container">
          <p className="video-description">{video.description}</p>
        </div>
      )}
      <p className="video-meta-info">Uploaded: {new Date(video.uploadDate).toLocaleDateString()}</p>
      {video.serialNumber && <p className="video-meta-info">Serial Number: {video.serialNumber}</p>}
    </div>
  );
};

export default VideoPlayer;