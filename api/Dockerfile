# Backend imajı — LibreOffice dahil (yazdir.js DOCX -> PDF çevirir).
# Build context REPO KÖKÜ olmalı (templates/ imaja kopyalanır):
#   docker build -f api/Dockerfile .
FROM node:22-slim

# libreoffice-writer: headless DOCX->PDF; fonts-liberation (Times/Arial
# muadili) + fonts-crosextra-carlito (Calibri muadili): şablon fontları
# Word'dekiyle aynı metriklerde render edilsin
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer fonts-liberation fonts-crosextra-carlito fontconfig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/api
COPY api/package*.json ./
RUN npm install --omit=dev
COPY api/ ./
COPY templates/ /app/templates/

ENV NODE_ENV=production \
    LIBREOFFICE_PATH=soffice \
    TEMPLATES_DIR=/app/templates

EXPOSE 3000
CMD ["node", "server.js"]
