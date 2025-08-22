// Global variables
let player = null;
let songsData = {};
let currentSong = null;
let isPlaying = false;
let offsetTime = null;
let chordInterval = null;
let currentChordIndex = -1;
let selectedChordIndex = -1;

// Initialize when YouTube API is ready
function onYouTubeIframeAPIReady() {
    console.log('YouTube API Ready');
    initializeApp();
}

// Initialize the application
function initializeApp() {
    setupEventListeners();
    // Start with the import screen - no auto loading of songs.json
    showScreen('importScreen');
    console.log('App initialized successfully');
}

// Show specific screen and hide others
function showScreen(screenId) {
    // Hide all screens
    document.getElementById('importScreen').style.display = 'none';
    document.getElementById('songSelectionScreen').style.display = 'none';
    document.getElementById('playerScreen').style.display = 'none';
    
    // Show requested screen
    document.getElementById(screenId).style.display = 'flex';
}

// Load songs data from JSON file - now only called after user imports file
function loadSongsDataFromFile(jsonData) {
    try {
        songsData = JSON.parse(jsonData);
        console.log('Songs data loaded:', songsData);
        renderSongList();
        showScreen('songSelectionScreen');
    } catch (error) {
        console.error('Error parsing JSON data:', error);
        alert('Error parsing JSON file. Please check the file format.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Initial import button
    document.getElementById('initialImportBtn').addEventListener('click', () => {
        document.getElementById('jsonFileInput').click();
    });
    
    // Back to import button
    document.getElementById('backToImportBtn').addEventListener('click', () => {
        document.getElementById('jsonFileInput').click();
    });
    
    // Back to song selection button
    document.getElementById('backToSongsBtn').addEventListener('click', () => {
        showScreen('songSelectionScreen');
    });
    
    // File input change
    document.getElementById('jsonFileInput').addEventListener('change', handleFileImport);
    
    // Play button (now used for setting offset)
    document.getElementById('playPauseBtn').addEventListener('click', setOffset);
    
    // Pause button
    document.getElementById('pauseBtn').addEventListener('click', togglePlayPause);
    
    // Reset offset button
    document.getElementById('resetOffsetBtn').addEventListener('click', handleResetOffset);
    
    // Save button
    document.getElementById('saveBtn').addEventListener('click', handleSave);
    
    // Chord edit controls
    document.getElementById('deleteChordBtn').addEventListener('click', handleDeleteChord);
    document.getElementById('addChordBtn').addEventListener('click', handleAddChord);
}

// Render song list
function renderSongList() {
    const songList = document.getElementById('songList');
    songList.innerHTML = '';
    
    Object.keys(songsData).forEach(songKey => {
        const song = songsData[songKey];
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.innerHTML = `
            <h4>${song.name}</h4>
            <p>Key: ${song.key} | BPM: ${song.bpm}</p>
        `;
        songItem.addEventListener('click', () => selectSong(songKey, songItem));
        songList.appendChild(songItem);
    });
}

// Select a song
function selectSong(songKey, songElement) {
    if (!songsData[songKey]) return;
    
    // Update active song in list
    document.querySelectorAll('.song-item').forEach(item => item.classList.remove('active'));
    if (songElement) {
        songElement.classList.add('active');
    }
    
    currentSong = { key: songKey, ...songsData[songKey] };
    
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
    if (!currentSong || !currentSong.youtube) return;
    
    const videoId = extractVideoId(currentSong.youtube);
    if (!videoId) {
        console.error('Invalid YouTube URL:', currentSong.youtube);
        return;
    }
    
    if (player) {
        player.loadVideoById(videoId);
    } else {
        player = new YT.Player('youtubePlayer', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'modestbranding': 1,
                'rel': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }
}

// Extract video ID from YouTube URL
function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// YouTube player ready callback
function onPlayerReady(event) {
    console.log('YouTube player ready');
}

// YouTube player state change callback
function onPlayerStateChange(event) {
    // Handle manual play/pause from YouTube controls
    if (event.data === YT.PlayerState.PLAYING && !isPlaying && offsetTime !== null) {
        startChordProgression();
    } else if (event.data === YT.PlayerState.PAUSED && isPlaying) {
        pauseChordProgression();
    }
}

// Set offset time (now directly called by play button)
function setOffset() {
    if (!currentSong || !player) {
        alert('Please select a song first.');
        return;
    }
    
    const currentTime = player.getCurrentTime();
    offsetTime = currentTime;
    
    document.getElementById('offsetDisplay').textContent = `Offset: ${formatTime(offsetTime)}`;
    document.getElementById('resetOffsetBtn').style.display = 'inline-block';
    
    // Start playing
    startChordProgression();
    
    console.log('Offset set to:', offsetTime);
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
}

// Start chord progression
function startChordProgression() {
    if (!currentSong || offsetTime === null) return;
    
    isPlaying = true;
    document.getElementById('playPauseBtn').textContent = '⏸️';
    
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
    document.getElementById('playPauseBtn').textContent = '▶️';
    
    if (chordInterval) {
        clearInterval(chordInterval);
        chordInterval = null;
    }
    
    console.log('Chord progression paused');
}

// Update active chord
function updateActiveChord(index) {
    if (index === currentChordIndex) return;
    
    // Remove previous active chord
    if (currentChordIndex >= 0) {
        const prevChord = document.querySelector(`[data-chord-index="${currentChordIndex}"]`);
        if (prevChord) {
            prevChord.classList.remove('active');
        }
    }
    
    // Add active class to current chord
    currentChordIndex = index;
    const currentChord = document.querySelector(`[data-chord-index="${index}"]`);
    if (currentChord) {
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
    currentChordIndex = -1;
    selectedChordIndex = -1;
    
    document.getElementById('offsetDisplay').textContent = 'Offset: Not set';
    document.getElementById('resetOffsetBtn').style.display = 'none';
    document.getElementById('playPauseBtn').textContent = '▶️';
    document.getElementById('chordEditControls').style.display = 'none';
    
    // Remove all active and selected classes
    document.querySelectorAll('.chord-box').forEach(box => {
        box.classList.remove('active', 'selected');
    });
}

// Handle reset offset
function handleResetOffset() {
    resetPlayerState();
    console.log('Offset reset');
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
    
    // Clear existing content
    chordTrack.innerHTML = '';
    console.log('Cleared chord track');
    
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
    // Remove previous selection
    if (selectedChordIndex >= 0) {
        const prevSelected = document.querySelector(`[data-chord-index="${selectedChordIndex}"]`);
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }
    }
    
    // Select new chord
    selectedChordIndex = index;
    const selectedChord = document.querySelector(`[data-chord-index="${index}"]`);
    if (selectedChord) {
        selectedChord.classList.add('selected');
    }
    
    // Show edit controls
    document.getElementById('chordEditControls').style.display = 'flex';
    
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
        alert('Vui lòng chọn một hợp âm để xóa.');
        return;
    }
    
    if (currentSong.chords.length <= 1) {
        alert('Không thể xóa hợp âm cuối cùng.');
        return;
    }
    
    // Remove chord from arrays (this connects the chord after to the chord before)
    currentSong.chords.splice(selectedChordIndex, 1);
    songsData[currentSong.key].chords.splice(selectedChordIndex, 1);
    
    // Re-render chord track
    renderChordTrack();
    
    // Reset selection and hide controls
    selectedChordIndex = -1;
    document.getElementById('chordEditControls').style.display = 'none';
    
    console.log('Deleted chord at index', selectedChordIndex);
}

// Handle add chord
function handleAddChord() {
    console.log('handleAddChord called!'); // Debug line
    
    if (selectedChordIndex < 0 || !currentSong) {
        alert('Vui lòng chọn một hợp âm để thêm hợp âm mới vào trước đó.');
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
    document.getElementById('chordEditControls').style.display = 'none';
    
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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // If YouTube API is already loaded, initialize
    if (window.YT && window.YT.Player) {
        initializeApp();
    }
    // Otherwise, onYouTubeIframeAPIReady will be called
});
