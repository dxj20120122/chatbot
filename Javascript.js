// 全局变量
let knowledgeFiles = {}; // 数据库文件映射
let questionIndex = [];  // 问题索引（包含问题和对应数据库文件）
let loadedKnowledgeBases = {}; // 已加载的数据库缓存
let allQuestions = []; // 所有问题列表

// DOM元素
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const menuBtn = document.getElementById('menu-btn');
const menuPopup = document.getElementById('menu-popup');
const closeBtn = document.getElementById('close-btn');
const questionsList = document.getElementById('questions-list');
const knowledgeStatusList = document.getElementById('knowledge-status-list');

// 从外部JSON加载数据库列表
async function loadKnowledgeList() {
    try {
        const response = await fetch('knowledgelist.json');
        const data = await response.json();
        knowledgeFiles = data.knowledgeFiles;
        return knowledgeFiles;
    } catch (error) {
        console.error('加载数据库列表失败:', error);
        // 返回默认数据库列表
        return {
            "deepseek数据集": "knowledge.json",
            "日常对话数据集": "dialogue_knowledge.json"
        };
    }
}

// 构建问题索引（只加载问题，不加载答案）
async function buildQuestionIndex() {
    // 清空索引
    questionIndex = [];
    allQuestions = [];
    
    // 获取数据库列表
    const knowledgeFiles = await loadKnowledgeList();
    
    // 清空状态列表
    knowledgeStatusList.innerHTML = '';
    
    // 更新欢迎消息
    updateWelcomeMessage(`正在构建问题索引...`);
    
    // 加载每个数据库的问题
    const promises = Object.entries(knowledgeFiles).map(async ([name, file]) => {
        try {
            const response = await fetch(file);
            const data = await response.json();
            
            // 提取问题并添加到索引
            data.forEach((item, itemIndex) => {
                item.questions.forEach(question => {
                    questionIndex.push({
                        question: question,
                        file: file,
                        index: itemIndex,
                        source: name
                    });
                    
                    allQuestions.push({
                        text: question,
                        source: name
                    });
                });
            });
            
            // 添加数据库状态
            addKnowledgeStatus(name, true, data.length);
            return true;
        } catch (error) {
            console.error(`加载数据库 ${name} (${file}) 的问题失败:`, error);
            addKnowledgeStatus(name, false, 0, error.message);
            return false;
        }
    });
    
    // 等待所有加载完成
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r).length;
    
    // 更新欢迎消息
    updateWelcomeMessage(`索引构建完成！共 ${allQuestions.length} 个问题`);
    
    // 填充问题列表
    populateQuestionsList();
}

// 添加数据库状态项
function addKnowledgeStatus(name, success, count, errorMsg) {
    const item = document.createElement('div');
    item.className = `knowledge-item ${success ? '' : 'knowledge-error'}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'knowledge-name';
    nameSpan.textContent = name;
    
    const countSpan = document.createElement('span');
    countSpan.className = 'knowledge-count';
    countSpan.textContent = `${count} 条`;
    
    item.appendChild(nameSpan);
    item.appendChild(countSpan);
    
    if (!success) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = errorMsg || '加载失败';
        item.appendChild(errorDiv);
    }
    
    knowledgeStatusList.appendChild(item);
}

// 更新欢迎消息
function updateWelcomeMessage(message) {
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.innerHTML = `
            <h3>你好！我是SimpleAI智能助手</h3>
            <p>${message}</p>
        `;
    }
}

// 填充问题列表
function populateQuestionsList() {
    const randomQuestions = getRandomQuestions();
    questionsList.innerHTML = '';
    
    randomQuestions.forEach(q => {
        const div = document.createElement('div');
        div.className = 'question-item';
        div.innerHTML = `
            <div class="question-text">${q.text}</div>
            <div class="question-source">来自: ${q.source}</div>
        `;
        div.addEventListener('click', () => {
            userInput.value = q.text;
            menuPopup.classList.remove('show');
            userInput.focus();
        });
        questionsList.appendChild(div);
    });
    
    // 添加状态消息
    const statusMsg = document.createElement('div');
    statusMsg.className = 'status-message';
    statusMsg.textContent = `已加载 ${randomQuestions.length} 个问题 (共 ${allQuestions.length} 个)`;
    questionsList.appendChild(statusMsg);
}

// 随机选择100个问题
function getRandomQuestions() {
    if (allQuestions.length <= 100) return [...allQuestions];
    
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 100);
}

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
    setTimeout(async () => {
        try {
            hideTypingIndicator();
            const response = await getAIResponse(message);
            // 模拟打字机效果
            simulateTyping(response);
        } catch (error) {
            console.error('获取AI响应失败:', error);
            addBotMessage("抱歉，处理您的请求时出错了。请稍后再试。");
        }
    }, 800 + Math.random() * 800);
}

// 获取数据库条目（按需加载答案）
async function getKnowledgeItem(file, index) {
    // 检查是否已加载该数据库
    if (!loadedKnowledgeBases[file]) {
        
        try {
            // 加载数据库文件
            const response = await fetch(file);
            const data = await response.json();
            
            // 缓存数据库
            loadedKnowledgeBases[file] = data;
            
            // 移除临时消息
            if (chatMessages.lastChild && 
                chatMessages.lastChild.textContent.includes('正在加载数据库内容')) {
                chatMessages.removeChild(chatMessages.lastChild);
            }
            
            // 返回请求的条目
            return data[index];
        } catch (error) {
            console.error(`加载数据库文件 ${file} 失败:`, error);
            throw new Error(`无法加载数据库内容: ${error.message}`);
        }
    }
    
    // 如果已加载，直接返回条目
    return loadedKnowledgeBases[file][index];
}

// 获取AI响应
async function getAIResponse(userInput) {
    const input = userInput.toLowerCase();

    // 1. 精确匹配
    const exactMatch = questionIndex.find(item => 
        item.question.toLowerCase() === input
    );

    if (exactMatch) {
        try {
            const item = await getKnowledgeItem(exactMatch.file, exactMatch.index);
            
            if (Array.isArray(item.answers) && item.answers.length > 0) {
                const randomIndex = Math.floor(Math.random() * item.answers.length);
                return item.answers[randomIndex];
            }
            return item.answer || "抱歉，这个知识点没有预设答案。";
        } catch (error) {
            console.error("获取精确匹配响应时出错:", error);
            return `处理请求时出错: ${error.message}`;
        }
    }

    // 2. 模糊匹配 - 使用更先进的字符串相似度算法
    const fuzzyMatches = [];
    for (const item of questionIndex) {
        const similarity = calculateSimilarity(input, item.question.toLowerCase());
        if (similarity > 0.65) { // 提高了相似度阈值
            fuzzyMatches.push({
                item,
                similarity
            });
        }
    }

    if (fuzzyMatches.length > 0) {
        // 按相似度排序并选择最佳匹配
        fuzzyMatches.sort((a, b) => b.similarity - a.similarity);
        const bestMatch = fuzzyMatches[0].item;
        
        try {
            const item = await getKnowledgeItem(bestMatch.file, bestMatch.index);
            
            let response = "";
            if (Array.isArray(item.answers) && item.answers.length > 0) {
                const randomIndex = Math.floor(Math.random() * item.answers.length);
                response = item.answers[randomIndex];
            } else {
                response = item.answer || "抱歉，这个知识点没有预设答案。";
            }
            
            // 添加模糊匹配提示
            return `${response}`;
        } catch (error) {
            console.error("获取模糊匹配响应时出错:", error);
            return `处理请求时出错: ${error.message}`;
        }
    }

    // 3. 关键词匹配
    const keywordThreshold = 0.4; // 关键词匹配的最低分数
    const keywordMatches = [];
    
    for (const item of questionIndex) {
        // 使用TF-IDF或其他关键词提取方法可能会更好，这里简化处理
        const keywords = extractKeywords(item.question.toLowerCase());
        const inputKeywords = extractKeywords(input);
        
        let matchScore = 0;
        for (const kw of inputKeywords) {
            if (keywords.includes(kw)) {
                matchScore += 1/keywords.length;
            }
        }
        
        if (matchScore >= keywordThreshold) {
            keywordMatches.push({
                item,
                score: matchScore
            });
        }
    }

    if (keywordMatches.length > 0) {
        // 按匹配分数排序并选择最佳匹配
        keywordMatches.sort((a, b) => b.score - a.score);
        const bestMatch = keywordMatches[0].item;
        
        try {
            const item = await getKnowledgeItem(bestMatch.file, bestMatch.index);
            
            let response = "";
            if (Array.isArray(item.answers) && item.answers.length > 0) {
                const randomIndex = Math.floor(Math.random() * item.answers.length);
                response = item.answers[randomIndex];
            } else {
                response = item.answer || "抱歉，这个知识点没有预设答案。";
            }
            
            // 添加关键词匹配提示
            return `${response}`;
        } catch (error) {
            console.error("获取关键词匹配响应时出错:", error);
            return `处理请求时出错: ${error.message}`;
        }
    }

    // 4. 默认回复 - 增加更多上下文感知的回复选项
    const contextAwareResponses = [
        {
            condition: () => input.includes("怎么") || input.includes("如何"),
            response: "您似乎在询问某个操作或方法。虽然我目前没有直接答案，但通常可以尝试以下步骤：1. 明确目标；2. 收集相关信息；3. 制定计划；4. 逐步实施。需要更具体的建议吗？"
        },
        {
            condition: () => input.includes("为什么"),
            response: "您正在探索某个原因或原理。这类问题通常可以从多个角度分析：直接原因、根本原因、相关因素等。我可以尝试提供一般性解释，但更深入的答案可能需要专业知识。"
        },
        {
            condition: () => input.includes("是什么"),
            response: "您在询问某个概念或事物的定义。这类问题通常有标准答案，但具体含义可能因上下文而异。可以提供更多背景信息吗？"
        },
        {
            condition: () => input.includes("推荐") || input.includes("建议"),
            response: "您似乎在寻找建议。通常需要考虑您的具体需求、预算、使用场景等因素才能提供合适的建议。可以分享更多细节吗？"
        }
    ];

    // 尝试匹配上下文感知回复
    for (const option of contextAwareResponses) {
        if (option.condition()) {
            return option.response;
        }
    }

    // 5. 通用默认回复
    const defaultResponses = [
        "这是一个有趣的问题！根据我的分析，这个问题可能需要更具体的上下文。您可以提供更多细节吗？",
        "我正在查阅相关资料...目前没有完全匹配的答案，但根据类似问题，我可以提供一些建议。",
        "这个问题很有深度！虽然我当前没有直接答案，但根据相关领域的信息，我可以提供一些见解。",
        "感谢您的提问！我正在优化我的回答以更好地满足您的需求。能否提供更多背景信息？",
        "您的问题触发了我对新知识的学习机制，我会尽快补充这方面的信息。",
        "这个问题很有启发性！为了给您更准确的回答，我需要了解更多上下文。",
        "这看起来是一个需要多方面考虑的问题。您可以尝试从不同角度描述它，我会尽力帮助您。",
        "我正在处理您的请求...这可能需要一些时间来分析。同时，您提供的信息越详细，我越能给出有价值的回答。"
    ];
    const randomIndex = Math.floor(Math.random() * defaultResponses.length);
    return defaultResponses[randomIndex];
}

// 辅助函数：提取关键词（简化版）
function extractKeywords(text) {
    // 这里使用简单的基于正则表达式的关键词提取
    // 实际应用中可以使用更高级的NLP库或算法
    return text.match(/\b\w+\b/g) || [];
}

// 辅助函数：计算字符串相似度（改进版）
function calculateSimilarity(s1, s2) {
    // 使用改进的Jaccard相似度结合Levenshtein距离
    const set1 = new Set(s1.split(''));
    const set2 = new Set(s2.split(''));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    const jaccardSimilarity = intersection.size / union.size;
    
    const levDistance = levenshteinDistance(s1, s2);
    const levSimilarity = 1 - (levDistance / Math.max(s1.length, s2.length));
    
    // 结合两种相似度算法的结果
    return (jaccardSimilarity + levSimilarity) / 2;
}

// 模拟打字效果
function simulateTyping(text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot-message');
    chatMessages.appendChild(messageDiv);

    let i = 0;
    const speed = 10 + Math.random() * 10;

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

// 添加AI消息
function addBotMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot-message');
    messageDiv.innerHTML = formatMessage(text) +
        `<span class="message-time">${getCurrentTime()}</span>`;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// 格式化消息内容
function formatMessage(text) {
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    text = text.replace(/```([\s\S]*?)```/g, function (match, code) {
        return '<pre><code>' + escapeHtml(code) + '</code></pre>';
    });

    text = text.replace(/`([^`]+)`/g, function (match, code) {
        return '<code>' + escapeHtml(code) + '</code>';
    });

    text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
        .replace(/^###### (.*$)/gm, '<h6>$1</h6>');

    text = text.replace(/^(\s*[-*+] .*(\n\s*[-*+] .*)*)/gm, function (match) {
        const items = match.trim().split('\n');
        const htmlItems = items.map(item =>
            '<li>' + item.replace(/^\s*[-*+]\s/, '').trim() + '</li>'
        ).join('');
        return '<ul>' + htmlItems + '</ul>';
    });

    text = text.replace(/^(\s*\d+\. .*(\n\s*\d+\. .*)*)/gm, function (match) {
        const items = match.trim().split('\n');
        const htmlItems = items.map(item =>
            '<li>' + item.replace(/^\s*\d+\.\s/, '').trim() + '</li>'
        ).join('');
        return '<ol>' + htmlItems + '</ol>';
    });

    text = text.replace(/^> (.*(\n> .*)*)/gm, function (match) {
        const lines = match.split('\n');
        const content = lines.map(line =>
            line.replace(/^>\s?/, '').trim()
        ).join('<br>');
        return '<blockquote>' + content + '</blockquote>';
    });

    text = text.replace(/^(-\s*-\s*-|_\s*_\s*_|\*\s*\*\s*\*)\s*$/gm, '<hr>');

    text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');

    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');

    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

    text = text.replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^(?!<)(.*)$/gm, '<p>$1</p>');

    return text;
}

// 获取当前时间
function getCurrentTime() {
    return `⚪`;
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

// 计算字符串相似度
function calculateSimilarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (shorter.length === 0) return 0.0;

    const distance = levenshteinDistance(s1, s2);
    return (longer.length - distance) / parseFloat(longer.length);
}

// Levenshtein距离算法
function levenshteinDistance(s, t) {
    if (s.length === 0) return t.length;
    if (t.length === 0) return s.length;

    const matrix = [];

    for (let i = 0; i <= t.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= s.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= t.length; i++) {
        for (let j = 1; j <= s.length; j++) {
            const cost = t.charAt(i - 1) === s.charAt(j - 1) ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[t.length][s.length];
}

// 显示问题菜单
function showQuestionMenu() {
    menuPopup.classList.add('show');
}

// 事件监听
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

menuBtn.addEventListener('click', showQuestionMenu);
closeBtn.addEventListener('click', () => {
    menuPopup.classList.remove('show');
});

// 点击外部关闭菜单
document.addEventListener('click', (e) => {
    if (!menuPopup.contains(e.target) && !menuBtn.contains(e.target)) {
        menuPopup.classList.remove('show');
    }
});

// 初始加载
document.addEventListener('DOMContentLoaded', () => {
    userInput.focus();
    buildQuestionIndex();
});