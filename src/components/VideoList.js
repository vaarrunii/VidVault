// src/components/VideoList.js
import React, { useState } from 'react';
import './VideoList.css';

// Simple arrow icons for toggle and dropdowns (still used for dropdown videos)
const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;

// Folder Icon (Minimalist Filled Folder)
const FolderIcon = ({ color = "currentColor", size = "18" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor" /* Changed to fill for a solid icon */
    stroke="none" /* Removed stroke */
    strokeWidth="0" /* Set stroke-width to 0 as it's filled */
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Path for the Minimalist Filled Folder icon */}
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

// Play Icon SVG (Option H: Sharply Pointed Filled Play)
const PlayIcon = ({ color = "currentColor", size = "16" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor" /* Changed to fill for a solid icon */
    stroke="none" /* Removed stroke */
  >
    {/* Option H: Sharply Pointed Filled Play */}
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

// Search Icon (Magnifying Glass)
const SearchIcon = ({ color = "currentColor", size = "20" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

// Sort Arrow Icon (Up/Down) - This icon will be used for the Instagram-like sorting
const SortArrowIcon = ({ direction = 'down', size = '16' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`sort-arrow ${direction === 'up' ? 'rotate-180' : ''}`}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);


const VideoList = ({
  videos, // This prop is now less critical as allVideos is the source of truth for filtering
  onSelectVideo,
  selectedVideoId,
  onShowUploadForm,
  searchTerm, // This prop is no longer directly used for filtering within VideoList
  onSearchChange, // This prop is no longer directly used for filtering within VideoList
  currentView,
  onSetView,
  uniqueCategories, // This prop is now less critical as filterContent generates categories
  categorySearchTerm, // This prop is no longer directly used for filtering within VideoList
  onCategorySearchChange, // This prop is no longer directly used for filtering within VideoList
  onSelectCategory,
  selectedCategory,
  sortOrder,
  onToggleSortOrder,
  isLoading,
  allVideos, // This is the primary source of unfiltered videos
  setSelectedVideo,
  setShowCategoryGallery,
  isAdminView
}) => {
  // State to manage which category dropdown is open
  const [expandedCategory, setExpandedCategory] = useState(null);
  // State to control the visibility and expansion of the global search input
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  // State for the global search input value
  const [globalSearchInput, setGlobalSearchInput] = useState('');

  // Function to handle global search input change
  const handleGlobalSearchChange = (e) => {
    setGlobalSearchInput(e.target.value);
  };

  // Function to clear global search and collapse the input
  const toggleSearchExpansion = () => {
    if (isSearchExpanded) {
      setGlobalSearchInput(''); // Clear input when collapsing
    }
    setIsSearchExpanded(!isSearchExpanded);
  };

  // Filter videos and categories based on the global search input
  const filterContent = (term) => {
    if (!term) {
      // If no search term, return all original videos and categories
      return {
        filteredVideos: allVideos,
        filteredCategories: [...new Set(allVideos.map(video => video.category))] // Re-derive unique categories from allVideos
      };
    }

    const lowerCaseTerm = term.toLowerCase();

    // Filter videos based on title or category
    const videosFiltered = allVideos.filter(video =>
      video.title.toLowerCase().includes(lowerCaseTerm) ||
      video.category.toLowerCase().includes(lowerCaseTerm)
    );

    // Get unique categories from the filtered videos
    const categoriesFiltered = [...new Set(videosFiltered.map(video => video.category))];

    return { filteredVideos: videosFiltered, filteredCategories: categoriesFiltered };
  };

  // Apply filtering based on the current global search input
  const { filteredVideos, filteredCategories } = filterContent(globalSearchInput);


  // Sort videos for dropdown (always by uploadDate, then apply sortOrder)
  const sortVideosForDropdown = (videoList, currentSortOrder) => {
    return [...videoList].sort((a, b) => {
      const dateA = new Date(a.uploadDate);
      const dateB = new Date(b.uploadDate);
      let comparison = dateA.getTime() - dateB.getTime(); // Default to oldest first

      if (currentSortOrder === 'newest') {
        comparison *= -1; // Reverse for newest first
      }
      return comparison;
    });
  };

  // Toggle category dropdown and handle category selection/deselection
  const handleCategoryClick = (category) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
    }
    onSelectCategory(category); // Keep this to notify parent if needed
  };


  return (
    <div className="video-list">
      <div className="list-header">
        <h2 className="sidebar-title">
          My Clips
        </h2>
        {/* Conditional rendering for search input or search toggle button */}
        {isSearchExpanded ? (
          <div className="global-search-input-container">
            <input
              type="text" /* Explicitly set type to text */
              placeholder="Search..." /* Updated placeholder text */
              className="global-search-input-expanded"
              value={globalSearchInput}
              onChange={handleGlobalSearchChange}
              autoFocus // Automatically focus when expanded
            />
            {/* Search icon acts as the toggle to collapse */}
            <button className="search-toggle-button" onClick={toggleSearchExpansion}>
              <SearchIcon />
            </button>
          </div>
        ) : (
          <button className="search-toggle-button" onClick={toggleSearchExpansion}>
            <SearchIcon />
          </button>
        )}

        {isAdminView && ( // Always show upload button in admin view
          <button className="upload-button" onClick={onShowUploadForm}>
            Upload New Video
          </button>
        )}
      </div>

      <>
        {/* Only show view toggle if search is not expanded or search input is empty */}
        {/* The view toggle should always be visible, regardless of search expansion,
            but the search results will override the display area when active. */}
        <div className="view-toggle-container"> {/* This container centers the toggle group */}
          <div className="view-toggle">
            <button
              className={`toggle-button ${currentView === 'videos' ? 'active' : ''}`}
              onClick={() => {
                onSetView('videos');
                setExpandedCategory(null);
              }}
            >
              Videos
            </button>
            <button
              className={`toggle-button ${currentView === 'categories' ? 'active' : ''}`}
              onClick={() => {
                onSetView('categories');
              }}
            >
              Categories
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <div className="video-list-scroll-wrapper">
            {globalSearchInput !== '' ? ( // If there's any search input, show filtered results
              // Display global search results directly in the list area
              <ul className="global-filtered-results-ul">
                {filteredVideos.length > 0 ? ( // Use filteredVideos here
                  sortVideosForDropdown(filteredVideos, sortOrder).map(video => (
                    <li
                      key={video.id}
                      className={selectedVideoId === video.id ? 'active' : ''}
                      onClick={() => onSelectVideo(video)}
                    >
                      <div className="global-search-item-main-content"> {/* Added wrapper for content */}
                        <span className="global-search-result-title">{video.title}</span>
                        <div className="global-search-result-meta-row"> {/* Added meta row */}
                          <span className="global-search-result-type">Type: {video.category}</span>
                          <span className="global-search-result-date-added">Date Added: {new Date(video.uploadDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {/* Use PlayIcon here instead of "View" text */}
                      <button className="video-view-button">
                        <PlayIcon />
                      </button>
                    </li>
                  ))
                ) : (
                  <p className="no-results">No results found for "{globalSearchInput}"</p>
                )}
              </ul>
            ) : (
              // Original video/category lists when no search input
              currentView === 'videos' ? (
                <>
                  {/* Instagram-like sorting indicator below the Videos list */}
                  <div className="sort-indicator-container" onClick={onToggleSortOrder}>
                    <span className="sort-indicator-text">
                      Sorted by {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                    </span>
                    <SortArrowIcon direction={sortOrder === 'newest' ? 'down' : 'up'} />
                  </div>
                  <ul className="video-list-ul">
                    {sortVideosForDropdown(allVideos, sortOrder).length > 0 ? ( // Use allVideos here when no search
                      sortVideosForDropdown(allVideos, sortOrder).map(video => (
                        <li
                          key={video.id}
                          className={selectedVideoId === video.id ? 'active' : ''}
                          onClick={() => onSelectVideo(video)}
                        >
                          <div className="video-item-main-content">
                            <span className="video-item-title">{video.title}</span>
                            <div className="video-item-meta-row">
                              <span className="video-item-type">Type: {video.category}</span>
                              <span className="video-item-date-added">Date Added: {new Date(video.uploadDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {video.category === 'New' && (
                            <span className="video-status-tag active">Active</span>
                          )}
                          {/* Use PlayIcon here instead of "View" text */}
                          <button className="video-view-button">
                            <PlayIcon />
                          </button>
                        </li>
                      ))
                    ) : (
                      <p className="no-results">No videos found. Try adjusting your search or upload a new video!</p>
                    )}
                  </ul>
                </>
              ) : (
                <ul className="category-list-ul">
                  {filteredCategories.length > 0 ? ( // Use filteredCategories here even when no search (will be all unique categories)
                    filteredCategories.map((category) => (
                      <React.Fragment key={category}>
                        <li
                          key={category}
                          className={selectedCategory === category ? 'active' : ''}
                          onClick={() => handleCategoryClick(category)}
                        >
                          <span className="category-icon">
                            <FolderIcon />
                          </span>
                          <span className="category-name">{category}</span>
                        </li>
                        {expandedCategory === category && (
                          <ul className="category-videos-dropdown">
                            {sortVideosForDropdown(allVideos.filter(video => video.category === expandedCategory), sortOrder)
                              .map((video) => {
                                const isVideoActive = selectedVideoId === video.id;
                                return (
                                  <li
                                    key={video.id}
                                    className={isVideoActive ? 'active' : ''}
                                    onClick={() => onSelectVideo(video)}
                                  >
                                    <div className="dropdown-video-details">
                                      <span className="dropdown-video-title">{video.title}</span>
                                    </div>
                                    <span className="dropdown-play-icon">
                                      <PlayIcon />
                                    </span>
                                  </li>
                                );
                              })}
                          </ul>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <p className="no-results">No categories found. Upload a video to create one!</p>
                  )}
                </ul>
              )
            )}
          </div>
        )}
      </>
    </div>
  );
};

export default VideoList;