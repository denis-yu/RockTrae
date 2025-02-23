const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const app = express();

require('dotenv').config();

app.use(cors());
app.use(express.json());

// 添加静态文件服务
app.use(express.static(path.join(__dirname, '../frontend')));

// 根路由处理
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.post('/chat', async (req, res) => {
    try {
        console.log('Received request:', req.body);

        // 检查 API 密钥是否存在
        if (!process.env.API_KEY) {
            throw new Error('API key is not configured');
        }

        const response = await axios({
            method: 'post',
            url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            data: {
                model: "deepseek-r1-250120",
                messages: req.body.messages,
                temperature: 0.6,
                stream: false
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.API_KEY.trim()}`  // 确保 API 密钥没有多余的空格
            },
            timeout: 60000
        });

        // 如果响应中包含错误信息
        if (response.data && response.data.error) {
            throw new Error(response.data.error.message || 'API request failed');
        }

        // 添加剩余 token 信息
        const responseData = {
            ...response.data,
            remaining_tokens: 100000 - (response.data.usage?.total_tokens || 0) // 假设总限额为 100000
        };

        res.json(responseData);
    } catch (error) {
        console.error('Detailed Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        res.status(500).json({
            error: '请求失败',
            message: error.message,
            details: error.response?.data
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});