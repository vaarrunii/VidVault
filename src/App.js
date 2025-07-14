// src/App.js
// src/App.js
import React, { useState, useEffect, useRef } from 'react'; // Corrected syntax
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
  const [selectedCategory, setSelectedCategory] = useState(null); // Null means no category selected
  const [sortOrder, setSortOrder] = useState('newest');
  const [showCategoryGallery, setShowCategoryGallery] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
            if (blob && blob.size > 0 && blob.type) {
              const url = URL.createObjectURL(blob);
              console.log(`App.js: Created blob URL for video ID ${meta.id}: ${url} (size: ${blob.size}, type: ${blob.type})`);
              blobUrlMap.current.set(meta.id, url);
              return { ...meta, fileUrl: url, fileType: blob.type };
            } else {
              console.warn(`App.js: Blob for video ID ${meta.id} is invalid or missing type. Metadata:`, meta, "Retrieved Blob:", blob);
              return { ...meta, fileUrl: undefined, fileType: undefined };
            }
          }
          return meta;
        }));
        setVideos(videosWithUrls);

        // Try to restore last selected video/category from localStorage
        const lastSelectedVideoId = localStorage.getItem('lastSelectedVideoId');
        const lastSelectedCategory = localStorage.getItem('lastSelectedCategory');

        if (lastSelectedVideoId) {
          const videoToSelect = videosWithUrls.find(v => v.id === lastSelectedVideoId);
          if (videoToSelect) {
            setSelectedVideo(videoToSelect);
            setShowCategoryGallery(false);
            setCurrentView('videos'); // Ensure view is 'videos' if a specific video was selected
          }
        } else if (lastSelectedCategory) {
          setSelectedCategory(lastSelectedCategory);
          setShowCategoryGallery(true);
          setCurrentView('categories'); // Ensure view is 'categories' if a category was selected
        } else {
          // Default to 'categories' view if nothing was previously selected
          setCurrentView('categories');
          setShowCategoryGallery(false); // Start with no gallery open, just categories list
        }

      } catch (error) {
        console.error("App.js: Error loading videos from IndexedDB:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVideos();

    const currentBlobUrlMap = blobUrlMap.current;

    return () => {
      currentBlobUrlMap.forEach(url => URL.revokeObjectURL(url));
      console.log("App.js: Revoked all blob URLs on unmount.");
    };
  }, []);

  // Save last selected state to localStorage
  useEffect(() => {
    if (selectedVideo) {
      localStorage.setItem('lastSelectedVideoId', selectedVideo.id);
      localStorage.removeItem('lastSelectedCategory');
    } else if (selectedCategory && currentView === 'categories' && showCategoryGallery) {
      localStorage.setItem('lastSelectedCategory', selectedCategory);
      localStorage.removeItem('lastSelectedVideoId');
    } else {
      localStorage.removeItem('lastSelectedVideoId');
      localStorage.removeItem('lastSelectedCategory');
    }
    localStorage.setItem('lastCurrentView', currentView);
  }, [selectedVideo, selectedCategory, currentView, showCategoryGallery]);


  const handleAddVideo = async (newVideoMetadata, videoFile) => {
    setIsLoading(true);
    try {
      const addedVideo = await addVideo(newVideoMetadata, videoFile);
      const newUrl = URL.createObjectURL(videoFile);
      console.log(`App.js: Added video. Created new blob URL for video ID ${addedVideo.id}: ${newUrl} (size: ${videoFile.size}, type: ${videoFile.type})`);
      blobUrlMap.current.set(addedVideo.id, newUrl);
      const videoWithUrl = { ...addedVideo, fileUrl: newUrl, fileType: videoFile.type };
      setVideos(prevVideos => [...prevVideos, videoWithUrl]);
      setSelectedVideo(videoWithUrl);
      setShowForm(false);
      setEditingVideo(null);
      setShowCategoryGallery(false);
      setCurrentView('videos'); // Switch to videos view after upload
    } catch (error) {
      console.error("App.js: Error adding video:", error);
      alert("Failed to add video. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateVideo = async (updatedVideoMetadata, newVideoFile) => {
    setIsLoading(true);
    try {
      // Find the current version of the video from the state to preserve its existing fileUrl/fileType
      const existingVideoInState = videos.find(v => v.id === updatedVideoMetadata.id);

      // Revoke old blob URL if a new file is provided for update
      if (newVideoFile && updatedVideoMetadata.id && blobUrlMap.current.has(updatedVideoMetadata.id)) {
        URL.revokeObjectURL(blobUrlMap.current.get(updatedVideoMetadata.id));
        blobUrlMap.current.delete(updatedVideoMetadata.id);
        console.log(`App.js: Revoked old blob URL for video ID ${updatedVideoMetadata.id}.`);
      }

      // Determine the fileType to pass to updateVideo utility
      // If a new file is provided, use its type. Otherwise, use the existing type from metadata.
      const fileTypeToPass = newVideoFile ? newVideoFile.type : updatedVideoMetadata.fileType;

      // Call the IndexedDB update function
      const updatedVideoFromDb = await updateVideo(updatedVideoMetadata, newVideoFile, fileTypeToPass);

      let finalVideoObjectForState = { ...updatedVideoFromDb };

      if (newVideoFile) {
        // If a new file was provided, create a new blob URL for it
        const newUrl = URL.createObjectURL(newVideoFile);
        console.log(`App.js: Updated video. Created new blob URL for video ID ${updatedVideoFromDb.id}: ${newUrl} (size: ${newVideoFile.size}, type: ${newVideoFile.type})`);
        blobUrlMap.current.set(updatedVideoFromDb.id, newUrl);
        finalVideoObjectForState.fileUrl = newUrl;
        finalVideoObjectForState.fileType = newVideoFile.type;
      } else {
        // If no new file was provided, try to preserve the existing fileUrl and fileType from state
        // This is crucial for videos that were already loaded and had a valid fileUrl
        if (existingVideoInState && existingVideoInState.fileUrl) {
          finalVideoObjectForState.fileUrl = existingVideoInState.fileUrl;
          finalVideoObjectForState.fileType = existingVideoInState.fileType;
          console.log(`App.js: Updated video metadata only. Preserving existing blob URL for video ID ${updatedVideoFromDb.id}.`);
        } else if (updatedVideoFromDb.fileId) {
          // If no new file, but there's a fileId from DB (e.g., after initial load or re-upload)
          // and no existing fileUrl in state, try to retrieve the blob
          const existingBlob = await getVideoBlob(updatedVideoFromDb.fileId);
          if (existingBlob && existingBlob.size > 0 && existingBlob.type) {
            const existingUrl = URL.createObjectURL(existingBlob);
            console.log(`App.js: Updated video. Recreated existing blob URL for video ID ${updatedVideoFromDb.id}: ${existingUrl} (size: ${existingBlob.size}, type: ${existingBlob.type})`);
            blobUrlMap.current.set(updatedVideoFromDb.id, existingUrl);
            finalVideoObjectForState.fileUrl = existingUrl;
            finalVideoObjectForState.fileType = existingBlob.type;
          } else {
            console.warn(`App.js: Blob for video ID ${updatedVideoFromDb.id} with fileId ${updatedVideoFromDb.fileId} is invalid or missing during update. Setting fileUrl to undefined.`);
            finalVideoObjectForState.fileUrl = undefined;
            finalVideoObjectForState.fileType = undefined;
          }
        } else {
           console.warn(`App.js: No fileId present in metadata for video ID ${updatedVideoFromDb.id} and no new file. Setting fileUrl to undefined.`);
           finalVideoObjectForState.fileUrl = undefined;
           finalVideoObjectForState.fileType = undefined;
        }
      }

      setVideos(prevVideos => prevVideos.map(video =>
        video.id === finalVideoObjectForState.id ? finalVideoObjectForState : video
      ));
      setSelectedVideo(finalVideoObjectForState);
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
        await deleteVideo(videoIdToDelete, videoToDelete.fileId);

        if (blobUrlMap.current.has(videoIdToDelete)) {
          URL.revokeObjectURL(blobUrlMap.current.get(videoIdToDelete));
          blobUrlMap.current.delete(videoIdToDelete);
          console.log(`App.js: Revoked blob URL for deleted video ID ${videoIdToDelete}.`);
        }
      } else {
        console.warn(`App.js: Video with ID ${videoIdToDelete} not found in state, but attempting IndexedDB delete anyway.`);
        await deleteVideo(videoIdToDelete, null);
      }


      setVideos(prevVideos => {
        const updatedVideos = prevVideos.filter(video => video.id !== videoIdToDelete);
        if (selectedVideo && selectedVideo.id === videoIdToDelete) {
          setSelectedVideo(null);
          console.log(`App.js: Deselected video as it was the one being deleted.`);
        }
        // If the deleted video was the last in its category, ensure category is unselected
        if (selectedCategory && !updatedVideos.some(v => v.category === selectedCategory)) {
          setSelectedCategory(null);
          setShowCategoryGallery(false); // Hide gallery if category is empty
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
    let videosToDisplay = [];

    if (currentView === 'videos') {
      videosToDisplay = [...videos];
      if (searchTerm) {
        videosToDisplay = videosToDisplay.filter(video =>
          video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          video.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (video.description && video.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
    } else if (currentView === 'categories') {
      if (selectedCategory) {
        videosToDisplay = videos.filter(video => video.category === selectedCategory);
      } else {
        videosToDisplay = [];
      }
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
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setShowCategoryGallery(false);
      setSelectedVideo(null);
    } else {
      setSelectedCategory(category);
      setShowCategoryGallery(true);
      setSelectedVideo(null);
      setShowForm(false);
    }
  };

  const handleSelectVideoFromGallery = (video) => {
    setSelectedVideo(video);
    setShowCategoryGallery(false);
    setShowForm(false);
  };

  const handleSetView = (view) => {
    setCurrentView(view);
    if (view === 'videos') {
      setSelectedCategory(null);
      setShowCategoryGallery(false);
    } else { // view === 'categories'
      if (!selectedCategory) {
        setShowCategoryGallery(false);
      }
    }
    setSelectedVideo(null);
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
            onSetView={handleSetView}
            uniqueCategories={filteredCategories}
            categorySearchTerm={categorySearchTerm}
            onCategorySearchChange={setCategorySearchTerm}
            onSelectCategory={handleShowCategoryGallery}
            selectedCategory={selectedCategory}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            isLoading={isLoading}
            allVideos={videos}
            setSelectedVideo={setSelectedVideo}
            setShowCategoryGallery={setShowCategoryGallery}
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