// src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import VideoList from './components/VideoList';
import VideoPlayer from './components/VideoPlayer';
import EditVideoModal from './components/EditVideoModal';
import CategoryVideoGallery from './components/CategoryVideoGallery';
import {
  openDatabase,
  addVideo,
  updateVideo,
  getAllVideoMetadata,
  getVideoBlob,
  deleteVideo,
} from './utils/indexedDb';
import './App.css'; // Ensure App.css is imported

function App() {
  const [videos, setVideos] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [categories, setCategories] = useState([]); // Categories derived dynamically from videos

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [view, setView] = useState('videos'); // 'videos' or 'categories'
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState(null);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [videoToDeleteId, setVideoToDeleteId] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryGallery, setShowCategoryGallery] = useState(false);

  const [sortOrder, setSortOrder] = useState('newest');
  const [isLoading, setIsLoading] = useState(true);

  const blobUrlMap = useRef(new Map());
  const [isAdminView, setIsAdminView] = useState(true); // Changed to true by default for testing

  // Function to load videos from IndexedDB and manage blob URLs
  const loadVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      await openDatabase();

      const metadata = await getAllVideoMetadata();

      const currentBlobUrlMap = blobUrlMap.current;
      currentBlobUrlMap.forEach(url => URL.revokeObjectURL(url));
      currentBlobUrlMap.clear();

      const videosWithUrls = await Promise.all(metadata.map(async (meta) => {
        if (meta.fileId) {
          try {
            const blob = await getVideoBlob(meta.fileId);
            if (blob && blob.size > 0 && blob.type) {
              const url = URL.createObjectURL(blob);
              currentBlobUrlMap.set(meta.id, url);
              return { ...meta, fileUrl: url, fileType: blob.type };
            } else {
              console.warn(`App.js: Blob for video ID ${meta.id} is invalid or missing type. Metadata:`, meta, "Retrieved Blob:", blob);
              return { ...meta, fileUrl: undefined, fileType: undefined };
            }
          } catch (blobError) {
            console.error(`App.js: Error fetching blob for video ID ${meta.id}:`, blobError);
            return { ...meta, fileUrl: undefined, fileType: undefined };
          }
        }
        return { ...meta, fileUrl: undefined, fileType: undefined };
      }));

      setVideos(videosWithUrls);

      const uniqueCategories = [...new Set(videosWithUrls.map(video => video.category).filter(Boolean))];
      setCategories(uniqueCategories.map(name => ({ id: name, name: name })));

      let newSelectedVideo = null;
      const lastSelectedVideoId = localStorage.getItem('lastSelectedVideoId');

      if (lastSelectedVideoId) {
        newSelectedVideo = videosWithUrls.find(v => v.id === lastSelectedVideoId);
      }

      if (!newSelectedVideo && videosWithUrls.length > 0) {
        newSelectedVideo = videosWithUrls[0];
      }

      setSelectedVideo(prevSelected => {
        if (prevSelected && newSelectedVideo && prevSelected.id === newSelectedVideo.id) {
          return prevSelected;
        }
        return newSelectedVideo;
      });

      const lastSelectedCategory = localStorage.getItem('lastSelectedCategory');
      const lastCurrentView = localStorage.getItem('lastCurrentView');

      if (lastCurrentView) {
        setView(lastCurrentView);
      }
      if (lastSelectedCategory && uniqueCategories.includes(lastSelectedCategory)) {
        setSelectedCategory(lastSelectedCategory);
        setShowCategoryGallery(true);
      } else {
        setShowCategoryGallery(false);
      }

    } catch (error) {
      console.error("App.js: Error loading videos from IndexedDB:", error);
      console.log("Failed to load videos. Please check console.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data load on component mount and cleanup on unmount
  useEffect(() => {
    loadVideos();

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentBlobUrlMap = blobUrlMap.current;
      currentBlobUrlMap.forEach(url => URL.revokeObjectURL(url));
      currentBlobUrlMap.clear();
      console.log("App.js: Revoked all blob URLs on unmount.");
    };
  }, [loadVideos]);

  // Save last selected state to localStorage
  useEffect(() => {
    if (selectedVideo) {
      localStorage.setItem('lastSelectedVideoId', selectedVideo.id);
      localStorage.removeItem('lastSelectedCategory');
    } else if (selectedCategory && view === 'categories' && showCategoryGallery) {
      localStorage.setItem('lastSelectedCategory', selectedCategory);
      localStorage.removeItem('lastSelectedVideoId');
    } else {
      localStorage.removeItem('lastSelectedVideoId');
      localStorage.removeItem('lastSelectedCategory');
    }
    localStorage.setItem('lastCurrentView', view);
  }, [selectedVideo, selectedCategory, view, showCategoryGallery]);


  // handleAddVideo and handleUpdateVideo combined into handleSaveVideo for EditVideoModal
  const handleSaveVideo = async (videoMetadata, videoFile) => {
    setIsLoading(true);
    try {
      if (videoMetadata.id) {
        // Find the existing video to preserve its original uploadDate
        const existingVideo = videos.find(v => v.id === videoMetadata.id);
        const fileTypeToPass = videoFile ? videoFile.type : existingVideo?.fileType;

        // Ensure uploadDate is preserved from the existing video if not provided by metadata
        const finalVideoMetadata = {
          ...videoMetadata,
          uploadDate: existingVideo ? existingVideo.uploadDate : videoMetadata.uploadDate // Preserve existing date
        };

        await updateVideo(finalVideoMetadata, videoFile, fileTypeToPass);
        console.log(`App.js: Video updated. ID: ${videoMetadata.id}`);
      } else {
        if (!videoFile) {
          console.log("Please upload a video file for a new video.");
          setIsLoading(false);
          return;
        }
        // For new videos, uploadDate is set in EditVideoModal to new Date().toISOString()
        await addVideo(videoMetadata, videoFile);
        console.log(`App.js: New video added.`);
      }
      setIsEditModalOpen(false);
      setVideoToEdit(null);
      loadVideos();
    } catch (error) {
      console.error("App.js: Error saving video:", error);
      console.log("Failed to save video. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to open the EditVideoModal for new upload or editing
  const handleOpenEditModal = useCallback((video = null) => {
    const normalizedVideo = video ? {
      ...video,
      serialNumber: video.serialNumber ? String(video.serialNumber) : ''
    } : null;
    setVideoToEdit(normalizedVideo);
    setIsEditModalOpen(true);
    setShowCategoryGallery(false);
    setSelectedVideo(null);
  }, []);

  // Function to close the EditVideoModal
  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setVideoToEdit(null);
  }, []);

  // Function to initiate delete (show confirmation modal)
  const handleDeleteVideoClick = useCallback((videoIdToDelete) => {
    setVideoToDeleteId(videoIdToDelete);
    setShowConfirmation(true);
  }, []);

  // Function to confirm and perform deletion
  const confirmDeleteVideo = useCallback(async () => {
    if (!videoToDeleteId) return;

    setIsLoading(true);
    try {
      const videoToDelete = videos.find(v => v.id === videoToDeleteId);
      if (videoToDelete) {
        console.log(`App.js: Found video to delete in state. Calling deleteVideo from IndexedDB utility. Video:`, videoToDelete);
        await deleteVideo(videoToDeleteId, videoToDelete.fileId);

        if (blobUrlMap.current.has(videoToDeleteId)) {
          URL.revokeObjectURL(blobUrlMap.current.get(videoToDeleteId));
          blobUrlMap.current.delete(videoToDeleteId);
          console.log(`App.js: Revoked blob URL for deleted video ID ${videoToDeleteId}.`);
        }
      } else {
        console.warn(`App.js: Video with ID ${videoToDeleteId} not found in state, but attempting IndexedDB delete anyway.`);
        await deleteVideo(videoToDeleteId, null);
      }

      loadVideos();

      setSelectedVideo(prevSelected => {
        if (prevSelected && prevSelected.id === videoToDeleteId) {
          return null;
        }
        return prevSelected;
      });

      setShowConfirmation(false);
      setVideoToDeleteId(null);
    } catch (error) {
      console.error("App.js: Error deleting video:", error);
      console.log("Failed to delete video. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [videos, videoToDeleteId, loadVideos]);

  // Function to cancel delete operation
  const cancelDeleteVideo = useCallback(() => {
    setShowConfirmation(false);
    setVideoToDeleteId(null);
  }, []);


  const sortVideos = useCallback((videoList) => {
    return [...videoList].sort((a, b) => {
      let comparison = 0;
      const snA = parseInt(a.serialNumber);
      const snB = parseInt(b.serialNumber);

      if (!isNaN(snA) && !isNaN(snB)) {
        comparison = snA - snB;
      } else if (!isNaN(snA)) {
        comparison = -1;
      } else if (!isNaN(snB)) {
        comparison = 1;
      } else {
        const dateA = new Date(a.uploadDate);
        const dateB = new Date(b.uploadDate);
        comparison = dateA.getTime() - dateB.getTime();
      }
      return sortOrder === 'newest' ? -comparison : comparison;
    });
  }, [sortOrder]);

  const getSidebarDisplayedVideos = useCallback(() => {
    let videosToDisplay = [];

    if (view === 'videos') {
      videosToDisplay = [...videos];
      if (searchTerm) {
        videosToDisplay = videosToDisplay.filter(video =>
          video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          video.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (video.description && video.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (video.serialNumber && video.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
    } else if (view === 'categories') {
      if (selectedCategory) {
        videosToDisplay = videos.filter(video => video.category === selectedCategory);
      } else {
        videosToDisplay = [];
      }
    }

    return sortVideos(videosToDisplay);
  }, [view, videos, searchTerm, selectedCategory, sortVideos]);

  const sidebarDisplayedVideos = getSidebarDisplayedVideos();

  const getFilteredCategories = useCallback(() => {
    const allCategories = [...new Set(videos.map(video => video.category).filter(Boolean))];
    const distinctCategories = [...new Set(allCategories)].sort((a, b) => a.localeCompare(b));
    return distinctCategories;
  }, [videos]);

  const filteredCategories = getFilteredCategories();

  const handleSelectCategory = useCallback((category) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setShowCategoryGallery(false);
      setSelectedVideo(null);
    } else {
      setSelectedCategory(category);
      setShowCategoryGallery(true);
      setSelectedVideo(null);
      setIsEditModalOpen(false);
    }
  }, [selectedCategory, setSelectedCategory, setShowCategoryGallery, setSelectedVideo, setIsEditModalOpen]);

  const handleSelectVideoFromGallery = useCallback((video) => {
    setSelectedVideo(video);
    setShowCategoryGallery(false);
    setIsEditModalOpen(false);
  }, [setSelectedVideo, setShowCategoryGallery, setIsEditModalOpen]);

  const handleSetView = useCallback((newView) => {
    setView(newView);
    if (newView === 'videos') {
      setSelectedCategory(null);
      setShowCategoryGallery(false);
    } else {
      if (!selectedCategory) {
        setShowCategoryGallery(false);
      }
    }
    setSelectedVideo(null);
    setIsEditModalOpen(false);
  }, [setView, setSelectedCategory, setShowCategoryGallery, setSelectedVideo, setIsEditModalOpen, selectedCategory]);


  return (
    <div className="app-container">
      <header className="app-header">
        <h1>VidVault</h1>
        {/* Admin View Toggle Switch - Using CSS Classes */}
        <label className="admin-toggle-label">
          <span>Admin View</span>
          <div className="admin-toggle-switch">
            <input
              type="checkbox"
              checked={isAdminView}
              onChange={() => setIsAdminView(prev => !prev)}
            />
            <span className="admin-toggle-slider"></span>
          </div>
        </label>
      </header>

      <div className="content-area">
        <aside className="sidebar">
          <VideoList
            videos={sidebarDisplayedVideos}
            onSelectVideo={handleSelectVideoFromGallery}
            selectedVideoId={selectedVideo ? selectedVideo.id : null}
            onShowUploadForm={() => handleOpenEditModal(null)}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            currentView={view}
            onSetView={handleSetView}
            uniqueCategories={filteredCategories.map(name => ({ id: name, name: name }))}
            onSelectCategory={handleSelectCategory}
            selectedCategory={selectedCategory}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            isLoading={isLoading}
            allVideos={videos}
            setSelectedVideo={setSelectedVideo}
            setShowCategoryGallery={setShowCategoryGallery}
            isAdminView={isAdminView}
          />
        </aside>

        <main className="main-content">
          {isLoading ? (
            <div className="loading-spinner">Loading videos...</div>
          ) : isEditModalOpen ? (
            <EditVideoModal
              video={videoToEdit}
              categories={filteredCategories.map(name => ({ id: name, name: name }))}
              onSave={handleSaveVideo}
              onClose={handleCloseEditModal}
            />
          ) : showCategoryGallery && selectedCategory ? (
            <CategoryVideoGallery
              category={selectedCategory}
              videos={videos.filter(v => v.category === selectedCategory)}
              onSelectVideo={handleSelectVideoFromGallery}
              onDeleteVideo={handleDeleteVideoClick}
              onEditVideo={handleOpenEditModal}
              isAdminView={isAdminView}
              currentView={view} 
            />
          ) : (
            <VideoPlayer
              video={selectedVideo}
              onDeleteVideo={handleDeleteVideoClick}
              onEditVideo={handleOpenEditModal}
              isAdminView={isAdminView}
              currentView={view} 
            />
          )}
        </main>
      </div>

      {showConfirmation && (
        <div className="confirmation-modal-overlay">
          <div className="confirmation-modal">
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete this video? This action cannot be undone.</p>
            <div className="confirmation-buttons">
              <button
                onClick={confirmDeleteVideo}
                className="button-base button-danger"
              >
                Delete
              </button>
              <button
                onClick={cancelDeleteVideo}
                className="button-base button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;