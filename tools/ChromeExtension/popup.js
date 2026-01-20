const API_URL = 'http://localhost:5000';
let updateInterval;

// Statistics Management
function getDownloadStats() {
    const stats = localStorage.getItem('downloadStats');
    if (stats) {
        return JSON.parse(stats);
    }
    return {
        totalDownloads: 0,
        todayDownloads: 0,
        lastDownloadDate: new Date().toISOString().split('T')[0]
    };
}

function saveDownloadStats(stats) {
    localStorage.setItem('downloadStats', JSON.stringify(stats));
}

function incrementDownloadStats() {
    const stats = getDownloadStats();
    const today = new Date().toISOString().split('T')[0];

    // Reset today's count if it's a new day
    if (stats.lastDownloadDate !== today) {
        stats.todayDownloads = 0;
        stats.lastDownloadDate = today;
    }

    stats.totalDownloads++;
    stats.todayDownloads++;
    saveDownloadStats(stats);

    // Update UI immediately
    document.getElementById('totalDownloads').textContent = stats.totalDownloads;
    document.getElementById('todayDownloads').textContent = stats.todayDownloads;
}

function updateStatsDisplay() {
    const stats = getDownloadStats();
    const today = new Date().toISOString().split('T')[0];

    // Reset today's count if viewing on a new day
    if (stats.lastDownloadDate !== today) {
        stats.todayDownloads = 0;
        stats.lastDownloadDate = today;
        saveDownloadStats(stats);
    }

    document.getElementById('totalDownloads').textContent = stats.totalDownloads;
    document.getElementById('todayDownloads').textContent = stats.todayDownloads;
}

async function syncStatsFromBackend() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        if (response.ok) {
            const backendStats = await response.json();

            // Sync backend stats to localStorage
            const localStats = {
                totalDownloads: backendStats.total_downloads || 0,
                todayDownloads: backendStats.today_downloads || 0,
                lastDownloadDate: backendStats.last_download_date || new Date().toISOString().split('T')[0]
            };

            saveDownloadStats(localStats);

            // Update display
            document.getElementById('totalDownloads').textContent = localStats.totalDownloads;
            document.getElementById('todayDownloads').textContent = localStats.todayDownloads;
        }
    } catch (e) {
        // If backend is unavailable, use localStorage
        console.log('Backend stats unavailable, using localStorage');
        updateStatsDisplay();
    }
}


// Tab Switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Update tab buttons
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(targetTab).classList.add('active');
    });
});

// Download Current Tab
document.getElementById('sendTab').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const downloadType = document.getElementById('downloadType').value;
    const statusEl = document.getElementById('downloadStatus');

    if (tab && tab.url) {
        statusEl.style.display = 'block';
        statusEl.className = 'status-message';
        statusEl.textContent = 'Sending...';

        try {
            const response = await fetch(`${API_URL}/add_download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: tab.url, type: downloadType })
            });

            if (response.ok) {
                statusEl.className = 'status-message success';
                statusEl.textContent = '✅ Added to queue!';
                setTimeout(() => statusEl.style.display = 'none', 2000);
            } else {
                statusEl.className = 'status-message error';
                statusEl.textContent = '❌ Error';
            }
        } catch (e) {
            statusEl.className = 'status-message error';
            statusEl.textContent = '❌ Connection Failed. Is the app running?';
        }
    }
});

// Queue Updates
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec === 0) return '0 KB/s';
    return formatBytes(bytesPerSec) + '/s';
}

function formatTime(seconds) {
    if (!seconds || seconds === 0) return '--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

async function updateQueueStatus() {
    try {
        // Get status
        const statusRes = await fetch(`${API_URL}/status`);
        const status = await statusRes.json();

        document.getElementById('pendingCount').textContent = status.pending || 0;
        document.getElementById('activeCount').textContent = status.active || 0;
        document.getElementById('completedCount').textContent = status.completed || 0;
        document.getElementById('failedCount').textContent = status.failed || 0;

        // Sync statistics from backend
        await syncStatsFromBackend();

        // Get active downloads
        const downloadsRes = await fetch(`${API_URL}/downloads`);
        const downloadsData = await downloadsRes.json();
        const downloads = downloadsData.downloads || [];

        // Check for completed downloads (for notifications)
        const previousDownloads = JSON.parse(localStorage.getItem('activeDownloads') || '[]');
        const currentUrls = downloads.map(d => d.url);

        previousDownloads.forEach(prev => {
            if (!currentUrls.includes(prev.url) && prev.progress < 100) {
                // Download completed - increment stats
                incrementDownloadStats();

                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'logo.ico',
                    title: 'Download Complete!',
                    message: `${prev.title} has been downloaded successfully.`,
                    priority: 2
                });
            }
        });

        // Save current downloads to localStorage
        localStorage.setItem('activeDownloads', JSON.stringify(downloads));

        // Calculate total speed and update Download tab
        let totalSpeed = 0;
        downloads.forEach(d => totalSpeed += d.speed || 0);
        document.getElementById('currentSpeedDownload').textContent = formatSpeed(totalSpeed);

        // Display in Download tab
        const downloadTabContainer = document.getElementById('activeDownloadsInTab');
        const downloadSection = document.getElementById('activeDownloadsSection');

        if (downloads.length === 0) {
            downloadSection.style.display = 'none';
        } else {
            downloadSection.style.display = 'block';
            downloadTabContainer.innerHTML = downloads.map(d => `
        <div class="download-item">
          <div class="title">${d.title || 'Fetching info...'}</div>
          <div class="platform">Platform: ${d.platform} | ${formatBytes(d.downloaded_bytes)} / ${formatBytes(d.total_bytes)}</div>
          <div class="speed-info" style="font-size: 11px; color: #a0a0a0; margin: 5px 0;">
            ${formatSpeed(d.speed)} | ETA: ${formatTime(d.eta)}
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${d.progress || 0}%"></div>
          </div>
          <div style="font-size: 11px; color: #667eea; margin-top: 4px;">${d.progress || 0}%</div>
        </div>
      `).join('');
        }
    } catch (e) {
        console.error('Failed to update queue:', e);
    }
}

function startQueueUpdates() {
    updateQueueStatus();
    updateInterval = setInterval(updateQueueStatus, 500); // 500ms for very smooth updates
}

function stopQueueUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
}

// Settings
async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        const settings = await response.json();

        document.getElementById('qualitySetting').value = settings.download_quality || 'best';
        document.getElementById('videoFormat').value = settings.video_format || 'mp4';
        document.getElementById('audioFormat').value = settings.audio_format || 'mp3';
        document.getElementById('maxConcurrent').value = settings.max_concurrent || 3;
        document.getElementById('useBrowserDownloadDir').checked = settings.use_browser_download_dir !== false;
        document.getElementById('downloadLocation').value = settings.download_dir || 'N/A';

        // Save to localStorage
        localStorage.setItem('downloaderSettings', JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to load settings:', e);
        // Load from localStorage if server is down
        const cached = localStorage.getItem('downloaderSettings');
        if (cached) {
            const settings = JSON.parse(cached);
            document.getElementById('qualitySetting').value = settings.download_quality || 'best';
            document.getElementById('videoFormat').value = settings.video_format || 'mp4';
            document.getElementById('audioFormat').value = settings.audio_format || 'mp3';
            document.getElementById('maxConcurrent').value = settings.max_concurrent || 3;
        }
    }
}

document.getElementById('saveSettings').addEventListener('click', async () => {
    const statusEl = document.getElementById('settingsStatus');
    const quality = document.getElementById('qualitySetting').value;
    const videoFormat = document.getElementById('videoFormat').value;
    const audioFormat = document.getElementById('audioFormat').value;
    const maxConcurrent = parseInt(document.getElementById('maxConcurrent').value);
    const useBrowserDownloadDir = document.getElementById('useBrowserDownloadDir').checked;

    statusEl.style.display = 'block';
    statusEl.className = 'status-message';
    statusEl.textContent = 'Saving...';

    const settingsData = {
        download_quality: quality,
        video_format: videoFormat,
        audio_format: audioFormat,
        max_concurrent: maxConcurrent,
        use_browser_download_dir: useBrowserDownloadDir
    };

    try {
        const response = await fetch(`${API_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });

        if (response.ok) {
            // Save to localStorage
            localStorage.setItem('downloaderSettings', JSON.stringify(settingsData));
            statusEl.className = 'status-message success';
            statusEl.textContent = '✅ Settings saved!';
            setTimeout(() => statusEl.style.display = 'none', 2000);
        } else {
            statusEl.className = 'status-message error';
            statusEl.textContent = '❌ Failed to save';
        }
    } catch (e) {
        statusEl.className = 'status-message error';
        statusEl.textContent = '❌ Connection failed';
    }
});

// Folder Selection Handler
document.getElementById('useBrowserDownloadDir').addEventListener('change', (e) => {
    const customSection = document.getElementById('customFolderSection');
    if (e.target.checked) {
        customSection.style.display = 'none';
    } else {
        customSection.style.display = 'block';
    }
});

document.getElementById('selectFolderBtn').addEventListener('click', async () => {
    // Note: Chrome extensions can't directly open folder picker
    // We'll use chrome.downloads API to get download path
    try {
        const result = await chrome.downloads.search({ limit: 1, orderBy: ['-startTime'] });
        if (result && result.length > 0) {
            const path = result[0].filename;
            const folderPath = path.substring(0, path.lastIndexOf('\\'));
            document.getElementById('customDownloadLocation').value = folderPath;

            // Show info message
            const statusEl = document.getElementById('settingsStatus');
            statusEl.style.display = 'block';
            statusEl.className = 'status-message';
            statusEl.textContent = 'ℹ️ Note: Download location is managed by your browser settings';
            setTimeout(() => statusEl.style.display = 'none', 4000);
        }
    } catch (e) {
        console.error('Could not access download path:', e);
    }
});

// Initialize
loadSettings();
syncStatsFromBackend();

// Check Update Button
document.getElementById('checkUpdateBtn').addEventListener('click', async () => {
    const btn = document.getElementById('checkUpdateBtn');
    const originalText = btn.innerHTML;

    btn.innerHTML = '⏳'; // Loading spinner substitute
    btn.disabled = true;

    const statusEl = document.getElementById('settingsStatus'); // Reusing settings status for feedback if visible, or alert
    // Better to use a toast or alert, or reuse a status element. 
    // Let's create a temporary notification or use the status-message in settings if we can see it, 
    // but the button is in the header.

    try {
        const response = await fetch(`${API_URL}/check_update`);
        const result = await response.json();

        if (result.status === 'updated') {
            btn.innerHTML = '✅';
            alert(`🚀 Updated to v${result.new_version}! App is restarting...`);
        } else if (result.status === 'uptodate') {
            btn.innerHTML = '✅';
            setTimeout(() => btn.innerHTML = originalText, 2000);
            // Optional: alert(`App is up to date (v${result.version})`);
        } else {
            btn.innerHTML = '❌';
            alert(`Error: ${result.message}`);
        }
    } catch (e) {
        btn.innerHTML = '❌';
        alert('Could not connect to downloader app.');
        console.error(e);
    } finally {
        setTimeout(() => {
            if (btn.innerText !== '✅') btn.innerHTML = originalText;
            btn.disabled = false;
        }, 3000);
    }
});

// Start queue updates immediately (for Download tab progress)
startQueueUpdates();
