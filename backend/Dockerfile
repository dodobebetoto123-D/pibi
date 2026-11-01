FROM node:24-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npx -y typescript@5.8.3 -p tsconfig.json

# DB 파일 영속화용 볼륨 (Railway 등에서 /app/data 마운트)
VOLUME ["/app/data"]
ENV DB_PATH=/app/data/data.db
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
