// Global variables
let player = null;
let songsData = {};
let currentSong = null;
let isPlaying = false;
let offsetTime = null;
let chordInterval = null;
let currentChordIndex = -1;
let selectedChordIndex = -1;
let currentEditingSongKey = null;
let offsetSet = false; // Track if offset has been set

// Initialize when YouTube API is ready
function onYouTubeIframeAPIReady() {
    console.log('YouTube API Ready');
    initializeApp();
}

// Initialize the application
function initializeApp() {
    setupEventListeners();
    // Start with the welcome screen
    showScreen('welcomeScreen');
    console.log('App initialized successfully');
}

// Show specific screen and hide others
function showScreen(screenId) {
    // Hide all screens
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    
    const playerScreen = document.getElementById('playerScreen');
    if (playerScreen) playerScreen.style.display = 'none';
    
    // Show requested screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.style.display = 'flex';
}

// Load songs data from JSON file - now only called after user imports file
function loadSongsDataFromFile(jsonData) {
    try {
        songsData = JSON.parse(jsonData);
        console.log('Songs data loaded:', songsData);
        renderSongList();
        
        // If user is on welcome screen and has imported songs, stay on welcome screen
        // If user has imported songs, they can click on them in sidebar
    } catch (error) {
        console.error('Error parsing JSON data:', error);
        alert('Error parsing JSON file. Please check the file format.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Import button in sidebar
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('jsonFileInput').click();
    });
    
    // Get Started button
    document.getElementById('getStartedBtn').addEventListener('click', () => {
        document.getElementById('jsonFileInput').click();
    });
    
    // File input change
    document.getElementById('jsonFileInput').addEventListener('change', handleFileImport);
    
    // Play/Pause button - dual functionality
    document.getElementById('playPauseBtn').addEventListener('click', handlePlayPauseClick);
    
    // Reset offset button
    document.getElementById('resetOffsetBtn').addEventListener('click', handleResetOffset);
    
    // Save button
    document.getElementById('saveBtn').addEventListener('click', handleSave);
    
    // Chord edit controls
    document.getElementById('deleteChordBtn').addEventListener('click', handleDeleteChord);
    document.getElementById('addChordBtn').addEventListener('click', handleAddChord);
    
    // YouTube URL preview controls
    document.getElementById('youtubeUrlInput').addEventListener('input', handleYouTubeUrlInput);
    document.getElementById('applyUrlBtn').addEventListener('click', applyYouTubeUrl);
    document.getElementById('cancelUrlBtn').addEventListener('click', cancelYouTubeUrlEdit);
}

// Show/hide no songs message
function showNoSongsMessage() {
    const noSongsMessage = document.getElementById('noSongsMessage');
    
    if (!noSongsMessage) {
        console.error('noSongsMessage element not found');
        return;
    }
    
    if (Object.keys(songsData).length === 0) {
        noSongsMessage.style.display = 'block';
    } else {
        noSongsMessage.style.display = 'none';
    }
}

// Render song list
function renderSongList() {
    const songList = document.getElementById('songList');
    const noSongsMessage = document.getElementById('noSongsMessage');
    
    if (!songList) {
        console.error('songList element not found');
        return;
    }
    
    // Clear previous songs but keep no-songs message
    const songItems = songList.querySelectorAll('.song-item');
    songItems.forEach(item => item.remove());
    
    if (Object.keys(songsData).length === 0) {
        if (noSongsMessage) {
            noSongsMessage.style.display = 'block';
        }
        return;
    }
    
    if (noSongsMessage) {
        noSongsMessage.style.display = 'none';
    }
    
    Object.keys(songsData).forEach(songKey => {
        const song = songsData[songKey];
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        
        const youtubeDisplay = song.youtube ? 
            `<div class="youtube-url" title="${song.youtube}">${song.youtube}</div>` : 
            '<div class="youtube-url" style="color: #999;">No YouTube URL</div>';
            
        songItem.innerHTML = `
            <h4>${song.name}</h4>
            <p>Key: ${song.key} | BPM: ${song.bpm}</p>
            ${youtubeDisplay}
            <button class="edit-url-btn" onclick="editYouTubeUrl('${songKey}', event)">Edit URL</button>
        `;
        songItem.addEventListener('click', (e) => {
            // Don't select song if clicking on edit button
            if (!e.target.classList.contains('edit-url-btn')) {
                selectSong(songKey, songItem);
            }
        });
        songList.appendChild(songItem);
    });
}

// Select a song
function selectSong(songKey, songElement) {
    if (!songsData[songKey]) {
        console.error('Song not found:', songKey);
        return;
    }
    
    console.log('Selecting song:', songKey);
    
    // Update active song in list
    document.querySelectorAll('.song-item').forEach(item => item.classList.remove('active'));
    if (songElement) {
        songElement.classList.add('active');
    }
    
    currentSong = { key: songKey, ...songsData[songKey] };
    
    // Update song title in header
    const titleElement = document.getElementById('currentSongTitle');
    if (titleElement) {
        titleElement.textContent = currentSong.name || songKey;
    }
    
    // Initialize YouTube player
    initializeYouTubePlayer();
    
    // Render chord track
    renderChordTrack();
    
    // Reset states
    resetPlayerState();
    
    // Show player screen
    showScreen('playerScreen');
    
    console.log('Selected song:', currentSong);
}

// Initialize YouTube player
function initializeYouTubePlayer() {
    if (!currentSong || !currentSong.youtube) {
        console.log('No currentSong or YouTube URL available');
        return;
    }
    
    const videoId = extractVideoId(currentSong.youtube);
    console.log('Extracted video ID:', videoId, 'from URL:', currentSong.youtube);
    
    if (!videoId) {
        console.error('Invalid YouTube URL:', currentSong.youtube);
        alert('Invalid YouTube URL. Please check the video link.');
        return;
    }
    
    // Wait for YouTube API to be ready
    if (!window.YT || !window.YT.Player) {
        console.log('YouTube API not ready yet, waiting...');
        setTimeout(() => initializeYouTubePlayer(), 500);
        return;
    }
    
    try {
        if (player && typeof player.loadVideoById === 'function') {
            console.log('Loading new video in existing player:', videoId);
            player.loadVideoById(videoId);
        } else {
            console.log('Creating new YouTube player for video:', videoId);
            player = new YT.Player('youtubePlayer', {
                height: '480', // Standard YouTube height for 854px width
                width: '854',  // Standard YouTube width
                videoId: videoId,
                host: 'https://www.youtube.com',
                playerVars: {
                    'playsinline': 1,
                    'controls': 1,
                    'modestbranding': 1,
                    'rel': 0,
                    'enablejsapi': 1,
                    'origin': window.location.origin,
                    'fs': 1, // Allow fullscreen
                    'cc_load_policy': 0, // Don't show captions by default
                    'iv_load_policy': 3, // Hide annotations
                    'disablekb': 0 // Enable keyboard controls
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange,
                    'onError': onPlayerError
                }
            });
        }
    } catch (error) {
        console.error('Error creating YouTube player:', error);
        alert('Error loading YouTube player: ' + error.message);
    }
}

// Extract video ID from YouTube URL
function extractVideoId(url) {
    if (!url) return null;
    
    console.log('Extracting video ID from URL:', url);
    
    const value = url.trim();
    
    // If it's already an 11-char ID (letters, numbers, _ or -)
    const idMatch = value.match(/^[a-zA-Z0-9_-]{11}$/);
    if (idMatch) return idMatch[0];

    try {
        // Try parsing as URL
        const u = new URL(value);
        
        // Handle youtu.be format
        if (/youtu\.be$/.test(u.hostname)) {
            const maybe = u.pathname.split('/').filter(Boolean).shift();
            if (maybe && /^[a-zA-Z0-9_-]{11}$/.test(maybe)) return maybe;
        }
        
        // Handle youtube.com format
        if (/(youtube\.com)$/.test(u.hostname)) {
            // Standard watch URL: v param
            const v = u.searchParams.get('v');
            if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
            
            // Shorts URL: /shorts/ID
            const parts = u.pathname.split('/').filter(Boolean);
            const idx = parts.indexOf('shorts');
            if (idx !== -1 && parts[idx+1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx+1])) return parts[idx+1];
            
            // Embed URL: /embed/ID
            const eidx = parts.indexOf('embed');
            if (eidx !== -1 && parts[eidx+1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[eidx+1])) return parts[eidx+1];
        }
    } catch {}

    console.error('Could not extract video ID from URL:', url);
    return null;
}

// YouTube player ready callback
function onPlayerReady(event) {
    console.log('YouTube player ready');
    // Optionally start playing or perform other actions
}

// YouTube player state change callback
function onPlayerStateChange(event) {
    console.log('Player state changed:', event.data);
    
    // Handle manual play/pause from YouTube controls
    if (event.data === YT.PlayerState.PLAYING && !isPlaying && offsetTime !== null) {
        startChordProgression();
    } else if (event.data === YT.PlayerState.PAUSED && isPlaying) {
        pauseChordProgression();
    }
}

// YouTube player error callback
function onPlayerError(event) {
    console.error('YouTube player error:', event.data);
    
    let errorMessage = 'YouTube player error: ';
    switch (event.data) {
        case 2:
            errorMessage += 'Invalid video ID or video not found.';
            break;
        case 5:
            errorMessage += 'HTML5 player error.';
            break;
        case 100:
            errorMessage += 'Video not found or has been removed.';
            break;
        case 101:
        case 150:
            errorMessage += 'Video cannot be played in embedded players.';
            break;
        case 153:
            errorMessage += 'Missing HTTP Referer header or API Client identification.';
            break;
        default:
            errorMessage += 'Unknown error (code: ' + event.data + ')';
    }
    
    alert(errorMessage);
}

// Handle Play/Pause button click - dual functionality
function handlePlayPauseClick() {
    if (!currentSong || !player) {
        alert('Please select a song first.');
        return;
    }
    
    if (!offsetSet) {
        // First click: Set offset and start playing
        setOffset();
    } else {
        // Subsequent clicks: Toggle play/pause
        togglePlayPause();
    }
}

// Set offset time (called on first play button click)
function setOffset() {
    // Set offset to 0 and start video from beginning
    offsetTime = 0;
    offsetSet = true;
    
    // Seek to beginning of video
    player.seekTo(0, true);
    
    const offsetDisplay = document.getElementById('offsetDisplay');
    if (offsetDisplay) {
        offsetDisplay.textContent = `Offset: ${formatTime(offsetTime)}`;
    }
    
    const resetOffsetBtn = document.getElementById('resetOffsetBtn');
    if (resetOffsetBtn) {
        resetOffsetBtn.style.display = 'inline-block';
    }
    
    // Update button appearance
    updatePlayPauseButton();
    
    // Start playing the video and chord progression
    player.playVideo();
    startChordProgression();
    
    console.log('Offset set to:', offsetTime, 'and video started from beginning');
}

// Toggle play/pause
function togglePlayPause() {
    if (isPlaying) {
        pauseChordProgression();
        player.pauseVideo();
    } else {
        startChordProgression();
        player.playVideo();
    }
    updatePlayPauseButton();
}

// Update Play/Pause button appearance
function updatePlayPauseButton() {
    const btn = document.getElementById('playPauseBtn');
    
    if (!offsetSet) {
        // Before offset is set
        btn.textContent = '⏯️';
        btn.title = 'Set offset and start playing';
    } else if (isPlaying) {
        // Currently playing
        btn.textContent = '⏸️';
        btn.title = 'Pause';
    } else {
        // Paused (after offset set)
        btn.textContent = '▶️';
        btn.title = 'Play';
    }
}

// Start chord progression
function startChordProgression() {
    if (!currentSong || offsetTime === null) return;
    
    isPlaying = true;
    updatePlayPauseButton();
    
    // Calculate beat duration in milliseconds
    const beatDuration = (60 / currentSong.bpm) * 1000;
    
    // Update chord progression based on current time
    chordInterval = setInterval(() => {
        if (!player) return;
        
        const currentTime = player.getCurrentTime();
        const elapsedTime = currentTime - offsetTime;
        const chordIndex = Math.floor(elapsedTime / (beatDuration / 1000));
        
        if (chordIndex >= 0 && chordIndex < currentSong.chords.length) {
            updateActiveChord(chordIndex);
        } else if (chordIndex >= currentSong.chords.length) {
            // Song ended
            pauseChordProgression();
            player.pauseVideo();
        }
    }, 100); // Update every 100ms for smooth animation
    
    console.log('Chord progression started');
}

// Pause chord progression
function pauseChordProgression() {
    isPlaying = false;
    updatePlayPauseButton();
    
    if (chordInterval) {
        clearInterval(chordInterval);
        chordInterval = null;
    }
    
    console.log('Chord progression paused');
}

// Update active chord
function updateActiveChord(index) {
    if (index === currentChordIndex) return;
    
    const prevChordIndex = currentChordIndex;
    let isChordChange = false;
    
    // Check if this is a chord change (different chord value)
    if (prevChordIndex >= 0 && currentSong && currentSong.chords) {
        const prevChordValue = currentSong.chords[prevChordIndex];
        const currentChordValue = currentSong.chords[index];
        if (prevChordValue && currentChordValue && prevChordValue !== currentChordValue) {
            isChordChange = true;
        }
    }
    
    // Remove previous active chord
    if (currentChordIndex >= 0) {
        const prevChord = document.querySelector(`[data-chord-index="${currentChordIndex}"]`);
        if (prevChord) {
            prevChord.classList.remove('active', 'chord-transition', 'different-chord');
        }
    }
    
    // Add active class to current chord
    currentChordIndex = index;
    const currentChord = document.querySelector(`[data-chord-index="${index}"]`);
    if (currentChord) {
        if (isChordChange) {
            // Add transition effect for chord changes
            currentChord.classList.add('chord-transition');
            
            // Remove transition class after animation completes
            setTimeout(() => {
                if (currentChord.classList.contains('chord-transition')) {
                    currentChord.classList.remove('chord-transition');
                }
            }, 500);
        }
        
        currentChord.classList.add('active');
        
        // Scroll into view
        currentChord.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    }
}

// Reset player state
function resetPlayerState() {
    pauseChordProgression();
    offsetTime = null;
    offsetSet = false;
    currentChordIndex = -1;
    selectedChordIndex = -1;
    
    const offsetDisplay = document.getElementById('offsetDisplay');
    if (offsetDisplay) {
        offsetDisplay.textContent = 'Offset: Not set';
    }
    
    const resetOffsetBtn = document.getElementById('resetOffsetBtn');
    if (resetOffsetBtn) {
        resetOffsetBtn.style.display = 'none';
    }
    
    const chordEditControls = document.getElementById('chordEditControls');
    if (chordEditControls) {
        chordEditControls.style.display = 'none';
    }
    
    // Update button appearance
    updatePlayPauseButton();
    
    // Remove all active, selected, and transition classes
    document.querySelectorAll('.chord-box').forEach(box => {
        box.classList.remove('active', 'selected', 'chord-transition', 'different-chord');
    });
}

function handleResetOffset() {
    if (!currentSong || !player) {
        alert('Please select a song first.');
        return;
    }
    
    // Stop current chord progression
    pauseChordProgression();
    
    // Set new offset at current video time
    const currentTime = player.getCurrentTime();
    offsetTime = currentTime;
    offsetSet = true; // Important: keep offset as set
    
    // Pause the video at current time
    player.pauseVideo();
    
    // Update offset display
    const offsetDisplay = document.getElementById('offsetDisplay');
    if (offsetDisplay) {
        offsetDisplay.textContent = `Offset: ${formatTime(offsetTime)}`;
    }
    
    // Keep reset button visible since offset is still set
    const resetOffsetBtn = document.getElementById('resetOffsetBtn');
    if (resetOffsetBtn) {
        resetOffsetBtn.style.display = 'inline-block';
    }
    
    // Reset chord progression state but keep offset
    currentChordIndex = -1;
    selectedChordIndex = -1;
    
    // Remove all active, selected, and transition classes
    document.querySelectorAll('.chord-box').forEach(box => {
        box.classList.remove('active', 'selected', 'chord-transition', 'different-chord');
    });
    
    // Hide chord edit controls
    const chordEditControls = document.getElementById('chordEditControls');
    if (chordEditControls) {
        chordEditControls.style.display = 'none';
    }
    
    // Update button appearance (will show play button since video is paused)
    updatePlayPauseButton();
    
    console.log('Offset reset to current time:', offsetTime, 'and video paused');
    
    // Show success notification
    showToast(`Offset reset to ${formatTime(offsetTime)} and video paused`, 'success');
}

// Render chord track
function renderChordTrack() {
    console.log('renderChordTrack called');
    if (!currentSong) {
        console.log('No currentSong found');
        return;
    }
    
    console.log('Rendering chords:', currentSong.chords.length, 'total chords');
    console.log('First 10 chords:', JSON.stringify(currentSong.chords.slice(0, 10)));
    
    const chordTrack = document.getElementById('chordTrack');
    if (!chordTrack) {
        console.error('Could not find chordTrack element!');
        return;
    }
    
    // Clear existing content and reset selection state
    chordTrack.innerHTML = '';
    console.log('Cleared chord track');
    
    // If selectedChordIndex is now out of bounds, reset it
    if (selectedChordIndex >= currentSong.chords.length) {
        console.log('Resetting selectedChordIndex from', selectedChordIndex, 'to -1 (out of bounds)');
        selectedChordIndex = -1;
        const chordEditControls = document.getElementById('chordEditControls');
        if (chordEditControls) {
            chordEditControls.style.display = 'none';
        }
    }
    
    currentSong.chords.forEach((chord, index) => {
        const chordBox = document.createElement('div');
        chordBox.className = 'chord-box';
        chordBox.setAttribute('data-chord-index', index);
        
        // Create text display
        const chordText = document.createElement('span');
        chordText.textContent = chord;
        chordText.className = 'chord-text';
        chordBox.appendChild(chordText);
        
        // Add click event for selection and seeking
        chordBox.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Chord clicked:', index, chord);
            selectChord(index);
            seekToChord(index);
        });
        
        // Add double-click event for editing
        chordBox.addEventListener('dblclick', (e) => {
            e.preventDefault();
            console.log('Chord double-clicked for editing:', index, chord);
            startEditingChord(chordBox, index);
        });
        
        chordTrack.appendChild(chordBox);
    });
    
    console.log('Finished rendering', currentSong.chords.length, 'chord boxes');
    
    // Verify DOM was updated
    const renderedBoxes = chordTrack.querySelectorAll('.chord-box');
    console.log('Actual chord boxes in DOM:', renderedBoxes.length);
    
    // Restore selection if still valid
    if (selectedChordIndex >= 0 && selectedChordIndex < currentSong.chords.length) {
        const selectedChord = document.querySelector(`[data-chord-index="${selectedChordIndex}"]`);
        if (selectedChord) {
            selectedChord.classList.add('selected');
            const chordEditControls = document.getElementById('chordEditControls');
            if (chordEditControls) {
                chordEditControls.style.display = 'flex';
            }
            console.log('Restored selection to index:', selectedChordIndex);
        }
    }
}

// Start editing a chord
function startEditingChord(chordBox, index) {
    const chordText = chordBox.querySelector('.chord-text');
    const currentText = chordText.textContent;
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'chord-input';
    
    // Replace text with input
    chordBox.removeChild(chordText);
    chordBox.appendChild(input);
    input.focus();
    input.select();
    
    // Handle save on blur or enter
    const saveEdit = () => {
        const newValue = input.value.trim() || 'N';
        updateChord(index, newValue);
        
        // Replace input with text
        chordBox.removeChild(input);
        const newChordText = document.createElement('span');
        newChordText.textContent = newValue;
        newChordText.className = 'chord-text';
        chordBox.appendChild(newChordText);
    };
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            // Cancel editing
            chordBox.removeChild(input);
            chordBox.appendChild(chordText);
        }
    });
}

// Select a chord for editing
function selectChord(index) {
    console.log('selectChord called with index:', index);
    
    // Validate index
    if (index < 0 || !currentSong || index >= currentSong.chords.length) {
        console.error('Invalid chord index:', index, 'Song length:', currentSong?.chords?.length);
        return;
    }
    
    // Remove previous selection
    if (selectedChordIndex >= 0) {
        const prevSelected = document.querySelector(`[data-chord-index="${selectedChordIndex}"]`);
        if (prevSelected) {
            prevSelected.classList.remove('selected');
            console.log('Removed selection from index:', selectedChordIndex);
        }
    }
    
    // Select new chord
    selectedChordIndex = index;
    const selectedChord = document.querySelector(`[data-chord-index="${index}"]`);
    if (selectedChord) {
        selectedChord.classList.add('selected');
        console.log('Added selection to index:', index);
    } else {
        console.error('Could not find chord element with index:', index);
    }
    
    // Show edit controls
    const chordEditControls = document.getElementById('chordEditControls');
    if (chordEditControls) {
        chordEditControls.style.display = 'flex';
    }
    
    console.log('Selected chord:', index, currentSong.chords[index]);
}

// Seek to specific chord time
function seekToChord(index) {
    if (!player || offsetTime === null) return;
    
    const beatDuration = 60 / currentSong.bpm;
    const chordTime = offsetTime + (index * beatDuration);
    
    player.seekTo(chordTime, true);
    console.log('Seeked to chord', index, 'at time', chordTime);
}

// Update chord value
function updateChord(index, newValue) {
    if (!currentSong || index < 0 || index >= currentSong.chords.length) return;
    
    currentSong.chords[index] = newValue;
    songsData[currentSong.key].chords[index] = newValue;
    
    console.log('Updated chord', index, 'to', newValue);
}

// Handle delete chord
function handleDeleteChord() {
    if (selectedChordIndex < 0 || !currentSong) {
        alert('Please select a chord to delete.');
        return;
    }
    
    if (currentSong.chords.length <= 1) {
        alert('Cannot delete the last chord.');
        return;
    }
    
    // Store the index before deletion for logging
    const deletedIndex = selectedChordIndex;
    const deletedChord = currentSong.chords[selectedChordIndex];
    
    console.log('Deleting chord:', deletedChord, 'at index', deletedIndex);
    console.log('Chords before delete:', JSON.stringify(currentSong.chords.slice(Math.max(0, deletedIndex - 2), deletedIndex + 3)));
    
    // Remove chord from arrays (this connects the chord after to the chord before)
    currentSong.chords.splice(selectedChordIndex, 1);
    
    // Safely update the songsData
    if (currentSong.key && songsData[currentSong.key] && songsData[currentSong.key].chords) {
        songsData[currentSong.key].chords.splice(selectedChordIndex, 1);
    } else {
        console.error('Cannot update songsData - key or chords missing');
        console.log('currentSong.key:', currentSong.key);
        console.log('songsData keys:', Object.keys(songsData));
    }
    
    console.log('Chords after delete:', JSON.stringify(currentSong.chords.slice(Math.max(0, deletedIndex - 2), deletedIndex + 2)));
    
    // Re-render chord track
    renderChordTrack();
    
    // Reset selection and hide controls
    selectedChordIndex = -1;
    const chordEditControls = document.getElementById('chordEditControls');
    if (chordEditControls) {
        chordEditControls.style.display = 'none';
    }
    
    console.log('Successfully deleted chord', deletedChord, 'at index', deletedIndex);
    
    // Show success notification
    showToast(`Chord "${deletedChord}" deleted successfully!`, 'success');
}

// Handle add chord
function handleAddChord() {
    console.log('handleAddChord called!'); // Debug line
    
    if (selectedChordIndex < 0 || !currentSong) {
        alert('Please select a chord to add a new chord before it.');
        return;
    }
    
    console.log('Adding chord at index:', selectedChordIndex);
    console.log('Current chords before add:', JSON.stringify(currentSong.chords.slice(0, 10))); // Show first 10 chords
    
    // Insert new chord between the previous chord and the current selected chord
    // This means inserting at the current index, pushing the selected chord forward
    const newChord = 'N';
    const insertIndex = selectedChordIndex;
    
    // Update both arrays with safety checks
    console.log('currentSong.key:', currentSong.key);
    console.log('songsData[currentSong.key] exists:', !!songsData[currentSong.key]);
    
    currentSong.chords.splice(insertIndex, 0, newChord);
    
    // Safely update the songsData
    if (currentSong.key && songsData[currentSong.key] && songsData[currentSong.key].chords) {
        songsData[currentSong.key].chords.splice(insertIndex, 0, newChord);
    } else {
        console.error('Cannot update songsData - key or chords missing');
        console.log('currentSong.key:', currentSong.key);
        console.log('songsData keys:', Object.keys(songsData));
    }
    
    console.log('Current chords after add:', JSON.stringify(currentSong.chords.slice(insertIndex - 2, insertIndex + 3))); // Show surrounding chords
    
    // Ensure currentSong is in sync with songsData
    if (currentSong.key && songsData[currentSong.key]) {
        currentSong.chords = songsData[currentSong.key].chords;
        console.log('Synced currentSong with songsData');
    }
    
    // Re-render chord track completely
    renderChordTrack();
    
    // Clear previous selection
    selectedChordIndex = -1;
    const chordEditControls = document.getElementById('chordEditControls');
    if (chordEditControls) {
        chordEditControls.style.display = 'none';
    }
    
    // Wait for DOM to update, then select and edit the new chord
    setTimeout(() => {
        console.log('Attempting to select new chord at index:', insertIndex);
        
        // Double check that the chord was rendered
        const allChordBoxes = document.querySelectorAll('.chord-box');
        console.log('Total chord boxes after render:', allChordBoxes.length);
        console.log('Expected chord count:', currentSong.chords.length);
        
        if (allChordBoxes.length > insertIndex) {
            selectChord(insertIndex);
            
            // Start editing the new chord
            setTimeout(() => {
                const newChordBox = document.querySelector(`[data-chord-index="${insertIndex}"]`);
                console.log('Found new chord box for editing:', newChordBox);
                if (newChordBox) {
                    console.log('Starting edit for new chord');
                    startEditingChord(newChordBox, insertIndex);
                } else {
                    console.error('Could not find chord box to edit!');
                }
            }, 50);
        } else {
            console.error('Not enough chord boxes rendered!');
        }
    }, 100);
    
    console.log('Finished adding chord "N" at index', insertIndex);
}

// Handle file import
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Reset the file input so the same file can be selected again
            document.getElementById('jsonFileInput').value = '';
            
            // Parse and load the JSON data
            const importedData = JSON.parse(e.target.result);
            songsData = importedData;
            
            // Render song list and show song selection screen
            renderSongList();
            showScreen('songSelectionScreen');
            
            console.log('Songs imported successfully:', songsData);
        } catch (error) {
            alert('Error importing file: ' + error.message);
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
}

// Handle save
function handleSave() {
    if (Object.keys(songsData).length === 0) {
        alert('No data to save.');
        return;
    }
    
    const dataStr = JSON.stringify(songsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'songs.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('Songs saved');
}

// Utility function to format time
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Test YouTube video embedding
function testYouTubeVideo() {
    console.log('Testing YouTube video embedding...');
    
    if (!window.YT || !window.YT.Player) {
        console.error('YouTube API not loaded');
        return;
    }
    
    // Test with a simple video ID
    const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll - a video that should always work
    
    try {
        const testPlayer = new YT.Player('youtubePlayer', {
            height: '360',
            width: '640',
            videoId: testVideoId,
            playerVars: {
                'controls': 1,
                'enablejsapi': 1,
                'origin': window.location.origin
            },
            events: {
                'onReady': function(event) {
                    console.log('Test YouTube player ready!');
                },
                'onError': function(event) {
                    console.error('Test YouTube player error:', event.data);
                }
            }
        });
        
        console.log('Test player created successfully');
    } catch (error) {
        console.error('Error creating test player:', error);
    }
}

// YouTube URL editing functions
function editYouTubeUrl(songKey, event) {
    event.stopPropagation();
    
    currentEditingSongKey = songKey;
    const song = songsData[songKey];
    
    // Show preview section
    const youtubePreviewSection = document.getElementById('youtubePreviewSection');
    if (youtubePreviewSection) {
        youtubePreviewSection.style.display = 'block';
    }
    
    // Pre-fill input with current URL
    const youtubeUrlInput = document.getElementById('youtubeUrlInput');
    if (youtubeUrlInput) {
        youtubeUrlInput.value = song.youtube || '';
        
        // Focus on input
        youtubeUrlInput.focus();
    }
    
    // If there's already a URL, show preview
    if (song.youtube) {
        updateYouTubePreview(song.youtube);
    } else {
        clearYouTubePreview();
    }
}

function handleYouTubeUrlInput(event) {
    const url = event.target.value.trim();
    if (url) {
        // Debounce the preview update
        clearTimeout(handleYouTubeUrlInput.timeout);
        handleYouTubeUrlInput.timeout = setTimeout(() => {
            updateYouTubePreview(url);
        }, 500);
    } else {
        clearYouTubePreview();
    }
}

function updateYouTubePreview(url) {
    const videoId = extractVideoId(url);
    const previewContainer = document.getElementById('youtubePreview');
    
    if (videoId) {
        const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0`;
        previewContainer.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
    } else {
        previewContainer.innerHTML = '<div class="placeholder">Invalid YouTube URL or Video ID</div>';
    }
}

function clearYouTubePreview() {
    const previewContainer = document.getElementById('youtubePreview');
    previewContainer.innerHTML = '<div class="placeholder">Enter a YouTube URL or Video ID to see preview</div>';
}

function applyYouTubeUrl() {
    if (!currentEditingSongKey) return;
    
    const newUrl = document.getElementById('youtubeUrlInput').value.trim();
    const videoId = extractVideoId(newUrl);
    
    if (newUrl && !videoId) {
        alert('Please enter a valid YouTube URL or Video ID');
        return;
    }
    
    // Update the song data
    if (newUrl) {
        // Always store as embed URL for consistency
        songsData[currentEditingSongKey].youtube = `https://www.youtube.com/embed/${videoId}`;
    } else {
        // Remove URL if empty
        delete songsData[currentEditingSongKey].youtube;
    }
    
    // Re-render song list to show updated URL
    renderSongList();
    
    // Hide preview section
    cancelYouTubeUrlEdit();
    
    console.log('Updated YouTube URL for song:', currentEditingSongKey);
}

function cancelYouTubeUrlEdit() {
    const youtubePreviewSection = document.getElementById('youtubePreviewSection');
    if (youtubePreviewSection) {
        youtubePreviewSection.style.display = 'none';
    }
    
    const youtubeUrlInput = document.getElementById('youtubeUrlInput');
    if (youtubeUrlInput) {
        youtubeUrlInput.value = '';
    }
    
    clearYouTubePreview();
    currentEditingSongKey = null;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    // If YouTube API is already loaded, initialize
    if (window.YT && window.YT.Player) {
        console.log('YouTube API already available, initializing app');
        initializeApp();
    } else {
        console.log('Waiting for YouTube API to load...');
    }
    // Otherwise, onYouTubeIframeAPIReady will be called
});

// Show toast notification
function showToast(message, type = 'success') {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Show with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}