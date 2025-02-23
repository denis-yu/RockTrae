document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');

    let conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    let currentConversation = {
        id: Date.now(),
        messages: [{
            role: "system",
            content: "你是一位专业的Life Coach，通过对话帮助用户进行个人成长和发展。请给出具体、可行的建议。"
        }]
    };

    function updateHistory() {
        chatHistory.innerHTML = '';
        conversations.forEach(conv => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            const firstUserMessage = conv.messages.find(m => m.role === 'user');
            historyItem.textContent = firstUserMessage ? firstUserMessage.content.substring(0, 20) + '...' : '新对话';
            historyItem.onclick = () => loadConversation(conv);
            chatHistory.appendChild(historyItem);
        });
    }

    function loadConversation(conv) {
        currentConversation = conv;
        chatMessages.innerHTML = '';
        conv.messages.forEach(msg => {
            if (msg.role !== 'system') {
                appendMessage(msg.role, msg.content);
            }
        });
    }

    function formatAssistantResponse(content) {
        const lines = content.split('\n');
        let formattedContent = '';
        let inList = false;
        
        lines.forEach(line => {
            if (line.match(/^\d+\./)) {
                if (!inList) {
                    formattedContent += '<ol>';
                    inList = true;
                }
                formattedContent += `<li>${line.replace(/^\d+\./, '').trim()}</li>`;
            } else {
                if (inList) {
                    formattedContent += '</ol>';
                    inList = false;
                }
                formattedContent += line + '\n';
            }
        });
        
        if (inList) {
            formattedContent += '</ol>';
        }
        
        return formattedContent;
    }

    function appendMessage(role, content, tokenInfo = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const actionDiv = document.createElement('div');
        actionDiv.className = 'message-actions';
        
        // 复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = '复制内容';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(content);
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => copyBtn.innerHTML = '<i class="fas fa-copy"></i>', 2000);
        };
        
        // 分享按钮
        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
        shareBtn.title = '分享对话';
        shareBtn.onclick = () => {
            const shareData = {
                title: 'AI Life Coach 对话',
                text: content,
                url: `${window.location.origin}?msg=${encodeURIComponent(JSON.stringify({role, content}))}`
            };
            
            if (navigator.share) {
                navigator.share(shareData);
            } else {
                navigator.clipboard.writeText(shareData.url);
                shareBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>', 2000);
            }
        };
        
        actionDiv.appendChild(copyBtn);
        actionDiv.appendChild(shareBtn);
    
        // 添加 Token 信息
        if (tokenInfo && role === 'assistant') {
            const tokenInfoDiv = document.createElement('div');
            tokenInfoDiv.className = 'token-info';
            tokenInfoDiv.innerHTML = `
                <i class="fas fa-coins"></i>
                <span>已用: ${tokenInfo.used} / 剩余: ${tokenInfo.remaining}</span>
            `;
            actionDiv.appendChild(tokenInfoDiv);
        }
        
        if (role === 'assistant') {
            contentDiv.innerHTML = formatAssistantResponse(content);
        } else {
            contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(actionDiv);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        userInput.value = '';
        userInput.disabled = true;
        sendBtn.disabled = true;

        appendMessage('user', userMessage);
        currentConversation.messages.push({ role: "user", content: userMessage });

        try {
            const response = await fetch('http://localhost:3000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: currentConversation.messages })
            });

            if (!response.ok) throw new Error('网络请求失败');

            const data = await response.json();
            console.log('API Response:', data); // 添加调试日志
            
            const aiResponse = data.choices[0].message.content;
            
            // 添加 token 信息
            appendMessage('assistant', aiResponse, {
                used: data.usage?.total_tokens || 0,
                remaining: data.remaining_tokens || '未知'
            });

            currentConversation.messages.push({ role: "assistant", content: aiResponse });

            const existingIndex = conversations.findIndex(c => c.id === currentConversation.id);
            if (existingIndex >= 0) {
                conversations[existingIndex] = currentConversation;
            } else {
                conversations.unshift(currentConversation);
            }
            localStorage.setItem('conversations', JSON.stringify(conversations));
            updateHistory();

        } catch (error) {
            console.error('Error:', error);
            appendMessage('error', '发生错误，请稍后重试');
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
        }
    }

    // 处理URL参数中的分享消息
    const urlParams = new URLSearchParams(window.location.search);
    const sharedMsg = urlParams.get('msg');
    if (sharedMsg) {
        try {
            const { role, content } = JSON.parse(decodeURIComponent(sharedMsg));
            appendMessage(role, content);
        } catch (e) {
            console.error('Invalid shared message');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 初始化历史记录
    updateHistory();
});