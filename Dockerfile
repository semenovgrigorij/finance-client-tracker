FROM ghcr.io/puppeteer/puppeteer:21.3.8

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .

CMD ["node", "server.js"]