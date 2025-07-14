// src/components/VideoList.js
import React, { useState } from 'react';
import './VideoList.css';

// Simple arrow icons for toggle and dropdowns
const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;

const VideoList = ({
  videos,
  onSelectVideo,
  selectedVideoId,
  onShowUploadForm,
  searchTerm,
  onSearchChange,
  currentView,
  onSetView,
  uniqueCategories,
  categorySearchTerm,
  onCategorySearchChange,
  onSelectCategory, // This now handles category selection/deselection
  selectedCategory,
  sortOrder,
  onToggleSortOrder,
  isLoading,
  allVideos,
  // Removed isSidebarCollapsed, onToggleSidebar
  setSelectedVideo,
  setShowCategoryGallery
}) => {
  // State to manage which category dropdown is open
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Toggle category dropdown and handle category selection/deselection
  const handleCategoryClick = (category) => {
    // If the clicked category is already expanded, collapse it
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      // Expand the clicked category
      setExpandedCategory(category);
    }
    // Call the parent's onSelectCategory to manage main content view
    onSelectCategory(category); // This function in App.js will now handle toggling selectedCategory state
  };

  // Sort videos for dropdown (by serial number or upload date)
  const sortVideosForDropdown = (videoList) => {
    return [...videoList].sort((a, b) => {
      let comparison = 0;
      if (a.serialNumber && b.serialNumber) {
        comparison = a.serialNumber - b.serialNumber;
      } else if (a.serialNumber) {
        comparison = -1; // Videos with serial numbers come before those without
      } else if (b.serialNumber) {
        comparison = 1;
      } else {
        // Fallback to upload date if no serial number
        const dateA = new Date(a.uploadDate);
        const dateB = new Date(b.uploadDate);
        comparison = dateA.getTime() - dateB.getTime();
      }
      // Always sort ascending for dropdown for sequential view
      return comparison;
    });
  };

  return (
    <div className="video-list">
      <div className="list-header">
        <h2 className="sidebar-title">
          My Clips
          {/* Removed sidebar-toggle-button */}
        </h2>
        <button className="upload-button" onClick={onShowUploadForm}>
          Upload New Video
        </button>
      </div>

      <>
        <div className="view-toggle">
          <button
            className={`toggle-button ${currentView === 'videos' ? 'active' : ''}`}
            onClick={() => {
              onSetView('videos'); // This will now clear selectedCategory in App.js
              setExpandedCategory(null); // Collapse any open category dropdown
            }}
          >
            Videos
          </button>
          <button
            className={`toggle-button ${currentView === 'categories' ? 'active' : ''}`}
            onClick={() => {
              onSetView('categories');
              // No need to clear selectedCategory here, as handleCategoryClick will manage it
            }}
          >
            Categories
          </button>
        </div>

        <div className="search-sort-container">
          <input
            type="text"
            placeholder={`Search ${currentView === 'videos' ? 'videos' : 'categories'}...`}
            value={currentView === 'videos' ? searchTerm : categorySearchTerm}
            onChange={(e) => (currentView === 'videos' ? onSearchChange(e.target.value) : onCategorySearchChange(e.target.value))}
            className="search-input"
          />
          {currentView === 'videos' && (
            <button className="sort-button" onClick={onToggleSortOrder}>
              {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          currentView === 'videos' ? (
            <ul className="video-list-ul">
              {videos.length > 0 ? (
                videos.map(video => (
                  <li
                    key={video.id}
                    className={selectedVideoId === video.id ? 'active' : ''}
                    onClick={() => onSelectVideo(video)}
                  >
                    <span className="video-item-icon">▶</span>
                    <div className="video-item-details">
                      <span className="video-item-title">{video.title}</span>
                      {video.serialNumber && <span className="video-serial-number">S.N.: {video.serialNumber}</span>}
                      <span className="video-upload-date">{new Date(video.uploadDate).toLocaleDateString()}</span>
                    </div>
                    <span className="video-category-tag">{video.category}</span>
                  </li>
                ))
              ) : (
                <p className="no-results">No videos found. Try adjusting your search or upload a new video!</p>
              )}
            </ul>
          ) : (
            <ul className="category-list-ul">
              {uniqueCategories.length > 0 ? (
                uniqueCategories.map(category => (
                  <li
                    key={category}
                    className={selectedCategory === category ? 'active' : ''}
                    onClick={() => handleCategoryClick(category)}
                  >
                    <span className="category-icon">📁</span>
                    <span className="category-name">{category}</span>
                    <span className="category-toggle-icon">
                      {expandedCategory === category ? <ChevronDown /> : <ChevronRight />}
                    </span>
                  </li>
                ))
              ) : (
                <p className="no-results">No categories found. Upload a video to create one!</p>
              )}

              {/* Dropdown for videos within the expanded category */}
              {expandedCategory && (
                <ul className="category-videos-dropdown">
                  {sortVideosForDropdown(allVideos.filter(video => video.category === expandedCategory)).map(video => (
                    <li
                      key={video.id}
                      className={selectedVideoId === video.id ? 'active' : ''}
                      onClick={() => onSelectVideo(video)}
                    >
                      <span className="dropdown-video-title">{video.title}</span>
                      {video.serialNumber && <span className="dropdown-video-sn">S.N.: {video.serialNumber}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </ul>
          )
        )}
      </>
    </div>
  );
};

export default VideoList;