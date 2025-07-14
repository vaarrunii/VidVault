// src/components/VideoList.js
import React from 'react';
import './VideoList.css';

function VideoList({
  videos,
  onSelectVideo,
  selectedVideoId,
  onShowUploadForm,
  searchTerm,
  onSearchChange,
  currentView,
  onSetView,
  uniqueCategories,
  categorySearchTerm, // NEW PROP
  onCategorySearchChange, // NEW PROP
  onSelectCategory, // Now triggers gallery view
  selectedCategory,
  sortOrder,
  onToggleSortOrder
}) {
  return (
    <div className="video-list">
      <div className="list-header">
        <h2>My Clips</h2>
        <button className="upload-button" onClick={onShowUploadForm}>
          Upload New Video
        </button>
      </div>

      <div className="view-toggle">
        <button
          className={`toggle-button ${currentView === 'videos' ? 'active' : ''}`}
          onClick={() => { onSetView('videos'); onSelectCategory(null); }} // Clear category selection for sidebar video list
        >
          Videos
        </button>
        <button
          className={`toggle-button ${currentView === 'categories' ? 'active' : ''}`}
          onClick={() => { onSetView('categories'); onSelectCategory(null); }} // Clear category selection for category list
        >
          Categories
        </button>
      </div>

      {currentView === 'videos' && (
        <>
          <div className="search-sort-container">
            <input
              type="text"
              placeholder="Search by title, category, or description..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <button className="sort-button" onClick={onToggleSortOrder}>
              {sortOrder === 'newest' ? '↓ Newest' : '↑ Oldest'}
            </button>
          </div>
          <ul>
            {videos.length > 0 ? (
              videos.map(video => (
                <li
                  key={video.id}
                  className={video.id === selectedVideoId ? 'active' : ''}
                  onClick={() => onSelectVideo(video)} // This still selects a single video for player
                >
                  <span className="video-item-icon">▶</span>
                  <div className="video-item-details">
                    <span className="video-item-title">{video.title}</span>
                    {video.serialNumber && <span className="video-serial-number">S.N.: {video.serialNumber}</span>}
                    {video.uploadDate && (
                      <span className="video-upload-date">
                        {new Date(video.uploadDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <span className="video-category-tag">{video.category}</span>
                </li>
              ))
            ) : (
              <p className="no-results">
                No videos found. {selectedCategory ? `in category "${selectedCategory}"` : ''}
              </p>
            )}
          </ul>
        </>
      )}

      {currentView === 'categories' && (
        <>
          {/* NEW: Category Search Bar */}
          <input
            type="text"
            placeholder="Search categories..."
            className="search-input category-search-input" // Added class for specific styling
            value={categorySearchTerm}
            onChange={(e) => onCategorySearchChange(e.target.value)}
          />
          <ul className="category-list">
            {uniqueCategories.length > 0 ? (
              uniqueCategories.map(category => (
                <li
                  key={category}
                  className={category === selectedCategory ? 'active' : ''}
                  onClick={() => onSelectCategory(category)} // NEW: This now triggers the gallery view on the right
                >
                  <span className="category-icon">📁</span>
                  <span className="category-name">{category}</span>
                </li>
              ))
            ) : (
              <p className="no-results">No categories found. Upload a video to create one!</p>
            )}
          </ul>
        </>
      )}
    </div>
  );
}

export default VideoList;