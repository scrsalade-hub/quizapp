FROM node:20-alpine

WORKDIR /app

# backend deps
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# backend source + seed + env example
COPY server.js db.js auth.js shuffle.js validateQuiz.js ./
COPY seed ./seed

# pre-built frontend + admin apps (dist folders are committed)
COPY frontend/dist ./frontend/dist
COPY admin/dist ./admin/dist

ENV PORT=4000
# MONGODB_URL, ADMIN_PASSWORD and JWT_SECRET must be provided at runtime
# (see .env.example). Do not bake secrets into the image.

EXPOSE 4000

CMD ["node", "server.js"]
