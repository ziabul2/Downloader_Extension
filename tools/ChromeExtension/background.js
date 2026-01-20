// Create Context Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "download-with-zim",
    title: "Download with ZIM Downloader",
    contexts: ["link", "page", "video", "audio"]
  });
});

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "download-with-zim") {
    const url = info.linkUrl || info.pageUrl;
    sendToDownloader(url);
  }
});

// Function to send URL to local Python server
function sendToDownloader(url) {
  fetch('http://localhost:5000/add_download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: url })
  })
  .then(response => {
    if (response.ok) {
      showNotification("✅ Sent to Downloader!");
    } else {
      showNotification("❌ Error sending to Downloader");
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showNotification("❌ Could not connect to Downloader (Is it running?)");
  });
}

function showNotification(message) {
    // Simple alert doesn't work well in service workers, using basic notification if possible or just logging
    // For V3, we can't use alert(). We could use chrome.notifications but that requires permission.
    // For simplicity, we'll just log to console.
    console.log(message);
}
