// 保存配置到 storage
async function saveConfig() {
  const token = document.getElementById('githubToken').value.trim();
  const gistId = document.getElementById('gistId').value.trim();
  const filename = document.getElementById('filename').value.trim() || 'bookmarks.json';
  
  if (!token) {
    showStatus('请输入 GitHub Token', 'error');
    return;
  }
  
  await chrome.storage.local.set({ githubToken: token, gistId, filename });
  showStatus('配置已保存', 'success');
}

// 从 storage 加载配置
async function loadConfig() {
  const result = await chrome.storage.local.get(['githubToken', 'gistId', 'filename']);
  if (result.githubToken) {
    document.getElementById('githubToken').value = result.githubToken;
  }
  if (result.gistId) {
    document.getElementById('gistId').value = result.gistId;
  }
  if (result.filename) {
    document.getElementById('filename').value = result.filename;
  }
}

// 显示状态消息
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;
  
  if (type === 'loading') {
    statusEl.innerHTML = `<span class="loading-spinner">⏳</span> ${message}`;
  }
}

// 隐藏状态消息
function hideStatus() {
  const statusEl = document.getElementById('status');
  statusEl.className = 'status';
}

// 移除字符串中的 emoji
function removeEmoji(str) {
  if (!str) return str;
  // 匹配 emoji 的正则表达式（包括大部分常用 emoji）
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  return str.replace(emojiRegex, '').trim();
}

// 递归移除书签树中的所有 emoji
function removeEmojiFromBookmarks(node) {
  if (!node) return node;
  
  // 创建副本以避免修改原始数据
  const newNode = { ...node };
  
  // 移除标题中的 emoji
  if (newNode.title) {
    newNode.title = removeEmoji(newNode.title);
  }
  
  // 递归处理子节点
  if (newNode.children) {
    newNode.children = newNode.children.map(child => removeEmojiFromBookmarks(child));
  }
  
  return newNode;
}

// 获取所有书签（只获取书签栏内容）
async function getAllBookmarks() {
  const bookmarkTree = await chrome.bookmarks.getTree();
  const root = bookmarkTree[0];
  
  // 查找书签栏
  let bookmarkBar = null;
  if (root.children) {
    for (const child of root.children) {
      if (child.id === '1' || child.title === '书签栏' || child.title === 'Bookmarks bar') {
        bookmarkBar = child;
        break;
      }
    }
  }
  
  // 返回书签栏内容，如果没有找到则返回根节点
  return bookmarkBar || root;
}

// 将书签树转换为 JSON 字符串
function bookmarksToJson(bookmarkNode) {
  return JSON.stringify(bookmarkNode);
}

// 上传书签到 Gist
async function uploadToGist() {
  const token = document.getElementById('githubToken').value.trim();
  let gistId = document.getElementById('gistId').value.trim();
  const filename = document.getElementById('filename').value.trim() || 'bookmarks.json';
  
  if (!token) {
    showStatus('请先保存 GitHub Token', 'error');
    return;
  }
  
  if (!filename) {
    showStatus('请输入文件名', 'error');
    return;
  }
  
  showStatus('正在获取书签...', 'loading');

  try {
    let bookmarks = await getAllBookmarks();
    
    // 移除 emoji
    bookmarks = removeEmojiFromBookmarks(bookmarks);
    
    const content = bookmarksToJson(bookmarks);
    
    showStatus('正在上传到 Gist...', 'loading');
    
    const url = gistId 
      ? `https://api.github.com/gists/${gistId}`
      : 'https://api.github.com/gists';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        description: 'Chrome Bookmarks Backup',
        public: false,
        files: {
          [filename]: {
            content: content
          }
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '上传失败');
    }
    
    const result = await response.json();

    // 保存 Gist ID
    await chrome.storage.local.set({ gistId: result.id });
    document.getElementById('gistId').value = result.id;

    // 隐藏叹号徽章
    chrome.runtime.sendMessage({ action: 'hideBadge' });

    showStatus(`上传成功！Gist ID: ${result.id}`, 'success');
  } catch (error) {
    showStatus(`上传失败：${error.message}`, 'error');
  }
}

// 从 Gist 下载书签
async function downloadFromGist() {
  const token = document.getElementById('githubToken').value.trim();
  const gistId = document.getElementById('gistId').value.trim();
  const filename = document.getElementById('filename').value.trim() || 'bookmarks.json';
  
  if (!token) {
    showStatus('请先保存 GitHub Token', 'error');
    return;
  }
  
  if (!gistId) {
    showStatus('请输入 Gist ID', 'error');
    return;
  }
  
  if (!filename) {
    showStatus('请输入文件名', 'error');
    return;
  }
  
  showStatus('正在从 Gist 下载...', 'loading');
  
  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '下载失败');
    }
    
    const result = await response.json();
    const file = result.files[filename];
    
    if (!file) {
      const availableFiles = Object.keys(result.files).join(', ');
      throw new Error(`文件 "${filename}" 不存在。可用文件：${availableFiles}`);
    }
    
    const content = file.content;
    const bookmarks = JSON.parse(content);

    showStatus('正在清空书签栏...', 'loading');

    // 清空书签栏
    await clearBookmarksBar();

    showStatus('正在导入书签...', 'loading');

    // 获取书签栏 ID
    const bookmarkBarId = await getBookmarkBarId();

    // 导入书签（从根节点的子节点开始导入）
    if (bookmarks.children) {
      for (const child of bookmarks.children) {
        await importBookmarks(child, bookmarkBarId);
      }
    } else {
      await importBookmarks(bookmarks, bookmarkBarId);
    }

    // 隐藏叹号徽章
    chrome.runtime.sendMessage({ action: 'hideBadge' });

    showStatus('书签同步成功！', 'success');
  } catch (error) {
    showStatus(`下载失败：${error.message}`, 'error');
  }
}

// 获取书签栏 ID
async function getBookmarkBarId() {
  const bookmarkTree = await chrome.bookmarks.getTree();
  const root = bookmarkTree[0];
  
  // 查找书签栏（通常是第一个子节点，或者 id 为 '1'）
  if (root.children) {
    for (const child of root.children) {
      // 书签栏通常是 "Bookmarks bar" 或 id 为 '1'
      if (child.id === '1' || child.title === '书签栏' || child.title === 'Bookmarks bar') {
        return child.id;
      }
    }
    // 如果找不到，返回第一个子节点
    return root.children[0].id;
  }
  
  throw new Error('找不到书签栏');
}

// 递归导入书签
async function importBookmarks(node, parentId) {
  if (!node) return null;

  // 跳过系统文件夹（书签栏、其他书签、移动设备书签）
  const systemTitles = ['书签栏', 'Bookmarks bar', '其他书签', 'Other bookmarks', '移动设备书签', 'Mobile bookmarks'];
  if (node.title && systemTitles.includes(node.title)) {
    // 直接导入系统文件夹的子节点，跳过系统文件夹本身
    if (node.children) {
      for (const child of node.children) {
        await importBookmarks(child, parentId);
      }
    }
    return null;
  }

  try {
    if (node.url) {
      // 这是书签链接
      return await chrome.bookmarks.create({
        parentId: parentId,
        title: node.title || '',
        url: node.url
      });
    } else {
      // 这是文件夹
      const newFolder = await chrome.bookmarks.create({
        parentId: parentId,
        title: node.title || '未命名文件夹'
      });

      // 递归导入子节点
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          await importBookmarks(child, newFolder.id);
        }
      }

      return newFolder;
    }
  } catch (error) {
    console.error('导入书签失败:', error, node);
    throw error;
  }
}

// 清空书签栏
async function clearBookmarksBar() {
  const bookmarkTree = await chrome.bookmarks.getTree();
  const root = bookmarkTree[0];
  
  // 查找书签栏
  if (root.children) {
    for (const child of root.children) {
      if (child.id === '1' || child.title === '书签栏' || child.title === 'Bookmarks bar') {
        // 只删除书签栏内的子项目，不删除书签栏本身
        if (child.children) {
          for (const item of child.children) {
            await chrome.bookmarks.removeTree(item.id);
          }
        }
        return;
      }
    }
  }
}

// 清空所有书签（带确认）
async function clearAllBookmarks() {
  if (!confirm('⚠️ 确定要清空书签栏中的所有书签吗？\n\n此操作不可恢复，请谨慎操作！')) {
    return;
  }
  
  showStatus('正在清空书签栏...', 'loading');
  
  try {
    await clearBookmarksBar();
    // 清空后隐藏叹号（因为已经同步了"清空"这个状态）
    chrome.runtime.sendMessage({ action: 'hideBadge' });
    showStatus('书签栏已清空', 'success');
  } catch (error) {
    showStatus(`清空失败：${error.message}`, 'error');
  }
}

// 测试 GitHub 连接
async function testConnection() {
  const token = document.getElementById('githubToken').value.trim();
  
  if (!token) {
    showStatus('请输入 GitHub Token', 'error');
    return;
  }
  
  showStatus('正在测试连接...', 'loading');
  
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '连接失败');
    }
    
    const user = await response.json();
    showStatus(`连接成功！欢迎，${user.login || user.name || 'GitHub 用户'}`, 'success');
  } catch (error) {
    showStatus(`连接失败：${error.message}`, 'error');
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  
  document.getElementById('saveToken').addEventListener('click', saveConfig);
  document.getElementById('testConnection').addEventListener('click', testConnection);
  document.getElementById('uploadBtn').addEventListener('click', uploadToGist);
  document.getElementById('downloadBtn').addEventListener('click', downloadFromGist);
  document.getElementById('clearBtn').addEventListener('click', clearAllBookmarks);
});
