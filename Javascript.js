
// 加载知识库
let knowledgeBase = [];

// 从JSON文件加载知识库
fetch('knowledge.json')
    .then(response => response.json())
    .then(data => {
        knowledgeBase = data;
        // 初始欢迎消息已通过HTML添加
    })
    .catch(error => {
        console.error('加载知识库失败:', error);
        addBotMessage("系统初始化失败，无法加载知识库。");
    });

// DOM元素
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

// 发送消息函数
function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;

    addUserMessage(message);
    userInput.value = '';
    userInput.focus();

    // 显示"正在输入"指示器
    showTypingIndicator();

    // 模拟AI思考时间
    setTimeout(() => {
        hideTypingIndicator();
        const response = getAIResponse(message);
        // 模拟打字机效果
        simulateTyping(response);
    }, 800 + Math.random() * 800); // 随机延迟0.8-1.6秒
}

// 模拟打字效果
function simulateTyping(text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot-message');
    chatMessages.appendChild(messageDiv);

    let i = 0;
    const speed = Math.random() * 100; // 随机打字速度

    function typeWriter() {
        if (i < text.length) {
            messageDiv.innerHTML = formatMessage(text.substring(0, i + 1)) +
                `<span class="typing-cursor"></span><span class="message-time">${getCurrentTime()}</span>`;
            i++;
            setTimeout(typeWriter, speed);
            scrollToBottom();
        } else {
            // 打字完成后移除光标
            messageDiv.innerHTML = formatMessage(text) +
                `<span class="message-time">${getCurrentTime()}</span>`;
        }
    }

    typeWriter();
}

// 添加用户消息
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'user-message');
    messageDiv.innerHTML = formatMessage(text) +
        `<span class="message-time">${getCurrentTime()}</span>`;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// 添加AI消息（直接显示，不使用打字效果）
function addBotMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot-message');
    messageDiv.innerHTML = formatMessage(text) +
        `<span class="message-time">${getCurrentTime()}</span>`;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}
// 格式化消息内容（简单Markdown支持）
function formatMessage(text) {
    // 辅助函数：转义 HTML 特殊字符
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 1. 先处理代码块（多行代码）
    text = text.replace(/```([\s\S]*?)```/g, function (match, code) {
        return '<pre><code>' + escapeHtml(code) + '</code></pre>';
    });

    // 2. 处理单行代码
    text = text.replace(/`([^`]+)`/g, function (match, code) {
        return '<code>' + escapeHtml(code) + '</code>';
    });

    // 3. 处理标题 (h1-h6)
    text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
        .replace(/^###### (.*$)/gm, '<h6>$1</h6>');

    // 4. 处理无序列表
    text = text.replace(/^(\s*[-*+] .*(\n\s*[-*+] .*)*)/gm, function (match) {
        const items = match.trim().split('\n');
        const htmlItems = items.map(item =>
            '<li>' + item.replace(/^\s*[-*+]\s/, '').trim() + '</li>'
        ).join('');
        return '<ul>' + htmlItems + '</ul>';
    });

    // 5. 处理有序列表
    text = text.replace(/^(\s*\d+\. .*(\n\s*\d+\. .*)*)/gm, function (match) {
        const items = match.trim().split('\n');
        const htmlItems = items.map(item =>
            '<li>' + item.replace(/^\s*\d+\.\s/, '').trim() + '</li>'
        ).join('');
        return '<ol>' + htmlItems + '</ol>';
    });

    // 6. 处理引用块
    text = text.replace(/^> (.*(\n> .*)*)/gm, function (match) {
        const lines = match.split('\n');
        const content = lines.map(line =>
            line.replace(/^>\s?/, '').trim()
        ).join('<br>');
        return '<blockquote>' + content + '</blockquote>';
    });

    // 7. 处理水平线
    text = text.replace(/^(-\s*-\s*-|_\s*_\s*_|\*\s*\*\s*\*)\s*$/gm, '<hr>');

    // 8. 处理图片
    text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');

    // 9. 处理粗体
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 10. 处理斜体
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 11. 处理删除线
    text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // 12. 处理链接
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 13. 处理换行（保留段落结构）
    text = text.replace(/\n\n+/g, '</p><p>')  // 多个空行为段落分隔
        .replace(/\n/g, '<br>')       // 单换行转为 <br>
        .replace(/^(?!<)(.*)$/gm, '<p>$1</p>'); // 包装未处理的文本

    return text;
}

// 获取当前时间
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `⚪`;// 省略 `${hours}:${minutes}`;
}

// 显示"正在输入"指示器
function showTypingIndicator() {
    typingIndicator.style.display = 'block';
    scrollToBottom();
}

// 隐藏"正在输入"指示器
function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

// 滚动到底部
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 获取AI响应
function getAIResponse(userInput) {
    // 转换为小写以便比较
    const input = userInput.toLowerCase();

    // 1. 首先尝试精确匹配
    for (const item of knowledgeBase) {
        if (item.questions.some(q => q.toLowerCase() === input)) {
            // 随机选择一个回答
            if (item.answers && item.answers.length > 0) {
                const randomIndex = Math.floor(Math.random() * item.answers.length);
                return item.answers[randomIndex];
            }
            return item.answer; // 兼容旧格式
        }
    }

    // 2. 如果没有精确匹配，尝试模糊匹配
    const fuzzyMatches = [];
    for (const item of knowledgeBase) {
        for (const question of item.questions) {
            const similarity = calculateSimilarity(input, question.toLowerCase());
            if (similarity > 0.5) { // 相似度阈值设为0.5
                fuzzyMatches.push({
                    item,
                    similarity
                });
            }
        }
    }

    // 如果有模糊匹配结果，返回相似度最高的
    if (fuzzyMatches.length > 0) {
        fuzzyMatches.sort((a, b) => b.similarity - a.similarity);
        const matchedItem = fuzzyMatches[0].item;

        // 随机选择一个回答
        let response = "";
        if (matchedItem.answers && matchedItem.answers.length > 0) {
            const randomIndex = Math.floor(Math.random() * matchedItem.answers.length);
            response = matchedItem.answers[randomIndex];
        } else {
            response = matchedItem.answer; // 兼容旧格式
        }

        return `您是在问关于"${matchedItem.questions[0]}"吗？${response}`;
    }

    // 3. 如果都没有匹配，返回默认回复
    const defaultResponses = [
        "这是一个有趣的问题！让我思考一下...根据我的分析，这个问题涉及到多个方面。建议您可以提供更多细节，我会尽力给出更准确的回答。",
        "我正在查阅相关资料...看起来这个问题需要更深入的分析。您能具体说明您想了解什么方面吗？",
        "这个问题很有深度！目前我的知识库中没有完全匹配的答案，但根据相关领域的信息，我可以提供一些见解...",
        "我正在处理您的请求...这可能需要一些时间。同时，您可以考虑以下相关信息：[提供一些相关主题的链接或建议]",
        "感谢您的提问！我正在优化我的回答以更好地满足您的需求。请稍等..."
    ];
    const randomIndex = Math.floor(Math.random() * defaultResponses.length);
    return defaultResponses[randomIndex];
}

// 计算字符串相似度 (使用Levenshtein距离)
function calculateSimilarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    // 如果较短字符串为空，相似度为0
    if (shorter.length === 0) return 0.0;

    // 计算编辑距离
    const distance = levenshteinDistance(s1, s2);

    // 计算相似度
    return (longer.length - distance) / parseFloat(longer.length);
}

// Levenshtein距离算法
function levenshteinDistance(s, t) {
    if (s.length === 0) return t.length;
    if (t.length === 0) return s.length;

    const matrix = [];

    // 初始化矩阵
    for (let i = 0; i <= t.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= s.length; j++) {
        matrix[0][j] = j;
    }

    // 填充矩阵
    for (let i = 1; i <= t.length; i++) {
        for (let j = 1; j <= s.length; j++) {
            const cost = t.charAt(i - 1) === s.charAt(j - 1) ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,    // 删除
                matrix[i][j - 1] + 1,    // 插入
                matrix[i - 1][j - 1] + cost  // 替换
            );
        }
    }

    return matrix[t.length][s.length];
}

// 插入建议问题
function insertSuggestion(text) {
    userInput.value = text;
    userInput.focus();
}

// 事件监听
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 初始加载动画
document.addEventListener('DOMContentLoaded', () => {
    userInput.focus();
});