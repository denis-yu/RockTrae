const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // 处理 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理根路径请求
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        });
        return;
    }

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/generate-names') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            const { englishName } = JSON.parse(body);

            const prompt = `作为一个专业的中文取名专家，请为英文名"${englishName}"生成3个有趣的中文名。
要求：
1. 名字要体现中国传统文化特色
2. 要理解英文名的含义，并在中文名中巧妙体现
3. 可以适当加入一些现代元素或梗
4. 每个名字都要提供详细的中英文解释和使用背景

请用JSON格式返回，格式如下：
[
    {
        "chinese": "中文名1",
        "meaning": "中文寓意",
        "cultural_explanation": "文化解释",
        "english_explanation": "英文解释"
    },
    ...
]`;

            const requestData = JSON.stringify({
                model: "deepseek-r1-250120",
                messages: [
                    { role: "system", content: "你是一个专业的中文取名专家，擅长为外国人起富有创意的中文名。" },
                    { role: "user", content: prompt }
                ]
            });

            const options = {
                hostname: 'ark.cn-beijing.volces.com',
                path: '/api/v3/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 97b4f3e0-74bd-433d-af65-9bbac0eb8fd2'
                },
                timeout: 60000
            };

            const apiReq = https.request(options, (apiRes) => {
                let data = '';

                apiRes.on('data', (chunk) => {
                    data += chunk;
                });

                apiRes.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        const contentStr = response.choices[0].message.content;
                        
                        // 提取 JSON 部分
                        const match = contentStr.match(/```json\n([\s\S]*?)\n```/);
                        if (!match) {
                            throw new Error('无法找到有效的 JSON 数据');
                        }
                        
                        // 解析提取出的 JSON 字符串
                        const content = JSON.parse(match[1]);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            content: content
                        }));
                    } catch (error) {
                        console.error('API响应解析错误:', error);
                        console.error('原始响应:', data);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: '处理响应失败' }));
                    }
                });
            });

            apiReq.on('error', (error) => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '调用 API 失败' }));
            });

            apiReq.write(requestData);
            apiReq.end();
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});