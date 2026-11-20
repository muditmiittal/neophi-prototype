FROM node:24-slim
WORKDIR /app
COPY server ./server
COPY dist ./dist
ENV NODE_ENV=production
RUN mkdir /data && chown node /data
USER node
CMD ["node", "server/index.mjs"]
