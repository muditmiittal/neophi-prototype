# Neophi: one container serves the site and the API. No npm install is needed at run time: the server has no dependencies.
# Build the site first (npm run build), then:  gcloud run deploy neophi --source . --region asia-south1 --allow-unauthenticated ...
FROM node:24-slim
WORKDIR /app
COPY server ./server
COPY dist ./dist
ENV NODE_ENV=production
EXPOSE 8080
USER node
CMD ["node", "server/index.mjs"]
