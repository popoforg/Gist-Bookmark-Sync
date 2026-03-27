// 监听书签变化，显示叹号提示
chrome.bookmarks.onCreated.addListener(() => showBadge());
chrome.bookmarks.onRemoved.addListener(() => showBadge());
chrome.bookmarks.onChanged.addListener(() => showBadge());
chrome.bookmarks.onMoved.addListener(() => showBadge());

// 显示叹号徽章
function showBadge() {
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
}

// 隐藏叹号徽章
function hideBadge() {
  chrome.action.setBadgeText({ text: '' });
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'hideBadge') {
    hideBadge();
  } else if (request.action === 'showBadge') {
    showBadge();
  }
  sendResponse({ success: true });
  return true;
});

// 初始化时检查是否有书签
chrome.runtime.onStartup.addListener(() => {
  showBadge();
});

chrome.runtime.onInstalled.addListener(() => {
  showBadge();
});
