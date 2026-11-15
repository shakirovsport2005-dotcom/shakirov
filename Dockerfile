FROM node:24-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DB_PATH=/data/campus.sqlite
VOLUME /data
EXPOSE 3000
CMD ["node", "server.mjs"]
