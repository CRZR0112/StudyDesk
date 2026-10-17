FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173
ENV STUDYDESK_DATA_DIR=/app/data

COPY package.json ./
COPY server ./server
COPY public ./public
COPY scripts ./scripts
COPY README.md ./

RUN mkdir -p /app/data/uploads
EXPOSE 4173
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
