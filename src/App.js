// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import VideoList from './components/VideoList';
import VideoPlayer from './components/VideoPlayer';
import UploadForm from './components/UploadForm';
import CategoryVideoGallery from './components/CategoryVideoGallery';
import { openDatabase, addVideo, updateVideo, getAllVideoMetadata, getVideoBlob, deleteVideo } from './utils/indexedDb';
import './App.css';

function App() {
  const [videos, setVideos] = useState([]); // Will be populated from IndexedDB
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('categories'); // Default to categories
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortOrder, setSortOrder] = useState('newest');
  const [showCategoryGallery, setShowCategoryGallery] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // New loading state

  // Ref to store blob URLs to revoke them when no longer needed
  const blobUrlMap = useRef(new Map());

  // Initialize IndexedDB and load videos on component mount
  useEffect(() => {
    const loadVideos = async () => {
      setIsLoading(true);
      try {
        await openDatabase(); // Ensure DB is open
        const metadata = await getAllVideoMetadata();
        const videosWithUrls = await Promise.all(metadata.map(async (meta) => {
          if (meta.fileId) {
            const blob = await getVideoBlob(meta.fileId);
            if (blob && blob.size > 0 && blob.type) { // Ensure blob is valid and has a type
              const url = URL.createObjectURL(blob);
              console.log(`App.js: Created blob URL for video ID ${meta.id}: ${url} (size: ${blob.size}, type: ${blob.type})`);
              blobUrlMap.current.set(meta.id, url); // Store URL for revocation
              return { ...meta, fileUrl: url, fileType: blob.type };
            } else {
              console.warn(`App.js: Blob for video ID ${meta.id} is invalid or missing type. Metadata:`, meta, "Retrieved Blob:", blob);
              return { ...meta, fileUrl: undefined, fileType: undefined }; // Mark as unavailable
            }
          }
          return meta; // Return metadata even if no fileId
        }));
        setVideos(videosWithUrls);

        // Try to restore last selected video/category from localStorage
        const lastSelectedVideoId = localStorage.getItem('lastSelectedVideoId');
        const lastSelectedCategory = localStorage.getItem('lastSelectedCategory');
        const lastCurrentView = localStorage.getItem('lastCurrentView');

        if (lastSelectedVideoId) {
          const videoToSelect = videosWithUrls.find(v => v.id === lastSelectedVideoId);
          if (videoToSelect) {
            setSelectedVideo(videoToSelect);
            setShowCategoryGallery(false); // If a specific video is selected, don't show gallery
          }
        } else if (lastSelectedCategory) {
          setSelectedCategory(lastSelectedCategory);
          setShowCategoryGallery(true); // If category was selected, show gallery
        }

        if (lastCurrentView) {
          setCurrentView(lastCurrentView);
        }

      } catch (error) {
        console.error("App.js: Error loading videos from IndexedDB:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVideos();

    // Capture the current value of blobUrlMap.current for cleanup
    const currentBlobUrlMap = blobUrlMap.current;

    // Cleanup: Revoke all blob URLs when the component unmounts
    return () => {
      currentBlobUrlMap.forEach(url => URL.revokeObjectURL(url));
      console.log("App.js: Revoked all blob URLs on unmount.");
    };
  }, []); // Empty dependency array means this runs once on mount

  // Save last selected video/category/view to localStorage
  useEffect(() => {
    if (selectedVideo) {
      localStorage.setItem('lastSelectedVideoId', selectedVideo.id);
      localStorage.removeItem('lastSelectedCategory'); // Clear category if video is selected
    } else if (selectedCategory && currentView === 'categories' && showCategoryGallery) {
      localStorage.setItem('lastSelectedCategory', selectedCategory);
      localStorage.removeItem('lastSelectedVideoId'); // Clear video if category gallery is shown
    } else {
      localStorage.removeItem('lastSelectedVideoId');
      localStorage.removeItem('lastSelectedCategory');
    }
    localStorage.setItem('lastCurrentView', currentView);
  }, [selectedVideo, selectedCategory, currentView, showCategoryGallery]);


  // Handler for adding a new video
  const handleAddVideo = async (newVideoMetadata, videoFile) => {
    setIsLoading(true);
    try {
      // Ensure fileType is part of metadata before adding
      const metadataWithFileType = { ...newVideoMetadata, fileType: videoFile.type };
      const addedVideo = await addVideo(metadataWithFileType, videoFile);
      const newUrl = URL.createObjectURL(videoFile);
      console.log(`App.js: Added video. Created new blob URL for video ID ${addedVideo.id}: ${newUrl} (size: ${videoFile.size}, type: ${videoFile.type})`);
      blobUrlMap.current.set(addedVideo.id, newUrl);
      const videoWithUrl = { ...addedVideo, fileUrl: newUrl, fileType: videoFile.type };
      setVideos(prevVideos => [...prevVideos, videoWithUrl]);
      setSelectedVideo(videoWithUrl);
      setShowForm(false);
      setEditingVideo(null);
      setShowCategoryGallery(false);
    } catch (error) {
      console.error("App.js: Error adding video:", error);
      alert("Failed to add video. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for updating an existing video
  const handleUpdateVideo = async (updatedVideoMetadata, newVideoFile) => {
    setIsLoading(true);
    try {
      // Revoke old blob URL if a new file is provided for update
      if (newVideoFile && updatedVideoMetadata.id && blobUrlMap.current.has(updatedVideoMetadata.id)) {
        URL.revokeObjectURL(blobUrlMap.current.get(updatedVideoMetadata.id));
        blobUrlMap.current.delete(updatedVideoMetadata.id);
        console.log(`App.js: Revoked old blob URL for video ID ${updatedVideoMetadata.id}.`);
      }

      let metadataToUpdate = { ...updatedVideoMetadata };
      if (newVideoFile) {
        metadataToUpdate.fileType = newVideoFile.type; // Update fileType if new file
      }

      const updatedVideo = await updateVideo(metadataToUpdate, newVideoFile);
      let updatedVideoWithUrl = { ...updatedVideo };

      if (newVideoFile) {
        const newUrl = URL.createObjectURL(newVideoFile);
        console.log(`App.js: Updated video. Created new blob URL for video ID ${updatedVideo.id}: ${newUrl} (size: ${newVideoFile.size}, type: ${newVideoFile.type})`);
        blobUrlMap.current.set(updatedVideo.id, newUrl);
        updatedVideoWithUrl.fileUrl = newUrl;
        updatedVideoWithUrl.fileType = newVideoFile.type;
      } else if (updatedVideo.fileId) { // Use updatedVideo.fileId as it might have changed
        // If no new file, but there was an existing blob, recreate its URL
        const existingBlob = await getVideoBlob(updatedVideo.fileId);
        if (existingBlob && existingBlob.size > 0 && existingBlob.type) {
          const existingUrl = URL.createObjectURL(existingBlob);
          console.log(`App.js: Updated video. Recreated existing blob URL for video ID ${updatedVideo.id}: ${existingUrl} (size: ${existingBlob.size}, type: ${existingBlob.type})`);
          blobUrlMap.current.set(updatedVideo.id, existingUrl);
          updatedVideoWithUrl.fileUrl = existingUrl;
          updatedVideoWithUrl.fileType = existingBlob.type;
        } else {
          console.warn(`App.js: No valid existing blob found for video ID ${updatedVideo.id} with fileId ${updatedVideo.fileId}.`);
          updatedVideoWithUrl.fileUrl = undefined; // No valid blob found
          updatedVideoWithUrl.fileType = undefined;
        }
      } else {
         console.warn(`App.js: No fileId present for video ID ${updatedVideo.id}.`);
         updatedVideoWithUrl.fileUrl = undefined; // No fileId, no blob
         updatedVideoWithUrl.fileType = undefined;
      }


      setVideos(prevVideos => prevVideos.map(video =>
        video.id === updatedVideoWithUrl.id ? updatedVideoWithUrl : video
      ));
      setSelectedVideo(updatedVideoWithUrl);
      setShowForm(false);
      setEditingVideo(null);
      setShowCategoryGallery(false);
    } catch (error) {
      console.error("App.js: Error updating video:", error);
      alert("Failed to update video. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for deleting a video
  const handleDeleteVideo = async (videoIdToDelete) => {
    console.log(`App.js: Attempting to delete video with ID: ${videoIdToDelete}`);
    if (!window.confirm(`Are you sure you want to delete this video?`)) {
      console.log(`App.js: Deletion cancelled by user for video ID: ${videoIdToDelete}`);
      return;
    }
    console.log(`App.js: User confirmed deletion for video ID: ${videoIdToDelete}`);
    setIsLoading(true);
    try {
      const videoToDelete = videos.find(v => v.id === videoIdToDelete);
      if (videoToDelete) {
        console.log(`App.js: Found video to delete in state. Calling deleteVideo from IndexedDB utility. Video:`, videoToDelete);
        await deleteVideo(videoIdToDelete, videoToDelete.fileId); // Delete from IndexedDB

        // Revoke blob URL if it exists
        if (blobUrlMap.current.has(videoIdToDelete)) {
          URL.revokeObjectURL(blobUrlMap.current.get(videoIdToDelete));
          blobUrlMap.current.delete(videoIdToDelete);
          console.log(`App.js: Revoked blob URL for deleted video ID ${videoIdToDelete}.`);
        }
      } else {
        console.warn(`App.js: Video with ID ${videoIdToDelete} not found in state, but attempting IndexedDB delete anyway.`);
        await deleteVideo(videoIdToDelete, null); // Try to delete from DB even if not in state
      }


      setVideos(prevVideos => {
        const updatedVideos = prevVideos.filter(video => video.id !== videoIdToDelete);
        if (selectedVideo && selectedVideo.id === videoIdToDelete) {
          setSelectedVideo(null);
          console.log(`App.js: Deselected video as it was the one being deleted.`);
        }
        console.log(`App.js: Video removed from state. New video count: ${updatedVideos.length}`);
        return updatedVideos;
      });
    } catch (error) {
      console.error("App.js: Error deleting video:", error);
      alert("Failed to delete video. Please try again.");
    } finally {
      setIsLoading(false);
      console.log(`App.js: Deletion process finished for video ID: ${videoIdToDelete}.`);
    }
  };

  // Sort videos based on serial number (if present) or upload date
  const sortVideos = (videoList) => {
    return [...videoList].sort((a, b) => {
      let comparison = 0;
      if (a.serialNumber && b.serialNumber) {
        comparison = a.serialNumber - b.serialNumber;
      } else if (a.serialNumber) {
        comparison = -1;
      } else if (b.serialNumber) {
        comparison = 1;
      } else {
        const dateA = new Date(a.uploadDate);
        const dateB = new Date(b.uploadDate);
        comparison = dateA.getTime() - dateB.getTime();
      }
      return sortOrder === 'newest' ? -comparison : comparison;
    });
  };

  const getSidebarDisplayedVideos = () => {
    let videosToDisplay = videos;
    if (currentView === 'videos' && selectedCategory) {
      videosToDisplay = videosToDisplay.filter(video => video.category === selectedCategory);
    }
    if (searchTerm) {
      videosToDisplay = videosToDisplay.filter(video =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (video.description && video.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return sortVideos(videosToDisplay);
  };

  const sidebarDisplayedVideos = getSidebarDisplayedVideos();

  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const getFilteredCategories = () => {
    const allCategories = [...new Set(videos.map(video => video.category))];
    if (categorySearchTerm) {
      return allCategories.filter(cat =>
        cat.toLowerCase().includes(categorySearchTerm.toLowerCase())
      );
    }
    return allCategories;
  };

  const filteredCategories = getFilteredCategories();

  const handleShowCategoryGallery = (category) => {
    setSelectedCategory(category);
    setShowCategoryGallery(true);
    setSelectedVideo(null);
    setShowForm(false);
  };

  const handleSelectVideoFromGallery = (video) => {
    setSelectedVideo(video);
    setShowCategoryGallery(false);
    setShowForm(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>VidVault</h1>
      </header>

      <div className="content-area">
        <aside className="sidebar">
          <VideoList
            videos={sidebarDisplayedVideos}
            onSelectVideo={handleSelectVideoFromGallery}
            selectedVideoId={selectedVideo ? selectedVideo.id : null}
            onShowUploadForm={() => { setShowForm(true); setEditingVideo(null); setShowCategoryGallery(false); setSelectedVideo(null); }}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            currentView={currentView}
            onSetView={setCurrentView}
            uniqueCategories={filteredCategories}
            categorySearchTerm={categorySearchTerm}
            onCategorySearchChange={setCategorySearchTerm}
            onSelectCategory={handleShowCategoryGallery}
            selectedCategory={selectedCategory}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            isLoading={isLoading}
          />
        </aside>

        <main className="main-content">
          {isLoading ? (
            <div className="loading-spinner">Loading videos...</div>
          ) : showForm ? (
            <UploadForm
              onAddVideo={handleAddVideo}
              onUpdateVideo={handleUpdateVideo}
              onCancel={() => { setShowForm(false); setEditingVideo(null); }}
              initialVideoData={editingVideo}
            />
          ) : showCategoryGallery && selectedCategory ? (
            <CategoryVideoGallery
              category={selectedCategory}
              videos={videos.filter(v => v.category === selectedCategory)}
              onSelectVideo={handleSelectVideoFromGallery}
              onDeleteVideo={handleDeleteVideo}
            />
          ) : (
            <VideoPlayer
              video={selectedVideo}
              onDeleteVideo={handleDeleteVideo}
              onEditVideo={() => { setShowForm(true); setEditingVideo(selectedVideo); setShowCategoryGallery(false); }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;