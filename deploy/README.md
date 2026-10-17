# 公网服务器部署

这是给**服务器/云主机**用的部署方式，不是给每个用户本地安装。

## 前提

- 一台有公网 IP 的 Linux 服务器（2 GB 内存起）
- 一个域名，A/AAAA 记录指向服务器
- 安装 Docker + Docker Compose
- 服务器开放 80/443（Caddy 自动申请 HTTPS）

## 启动

```bash
cp deploy/.env.example .env
# 编辑 .env：DOMAIN、STUDYDESK_PUBLIC_URL
docker compose up -d --build
docker compose logs -f caddy
```

打开：

```text
https://你的域名
```

Caddy 会自动申请 Let's Encrypt 证书；首次可能需要 1 分钟。

## 数据

- SQLite、上传附件、账号：Docker volume `studydesk-data`
- 备份：

```bash
docker run --rm -v studydesk-studydesk-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/studydesk-data.tar.gz -C /data .
```

（实际 volume 名以 `docker volume ls` 为准。）

## AI

应用通过设置页配置 OpenAI 兼容接口。  
Ollama 不建议塞进同一个容器；可以：

- 在宿主机运行 Ollama，容器通过 `host.docker.internal:11434` 访问（Windows/Mac）
- 在另一台机器运行 Ollama，配置局域网/内网地址
- 或使用云端兼容 API

本地 Ollama 只适合小规模内测；公开服务建议限制额度或使用专用模型服务。

## 公网安全

- 必须使用 HTTPS（Caddy 已处理）
- 建议设置 `STUDYDESK_PIN` 作为额外入口密码
- 注册已有限流；公开服务还应加：
  - 邮箱/邀请码
  - AI 与上传额度
  - 监控、备份、日志
- 不要把 SQLite 文件或 `.env` 提交到 Git
