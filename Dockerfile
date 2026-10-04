FROM node:24-bookworm-slim AS js-runtime
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000 CLIPSTREAM_HOST=0.0.0.0 CLIPSTREAM_DOWNLOAD_DIR=/data/downloads
WORKDIR /app
COPY --from=js-runtime /usr/local/bin/node /usr/local/bin/node
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
COPY requirements.lock .
RUN pip install --no-cache-dir -r requirements.lock
COPY app.py ./
COPY static ./static
RUN mkdir -p /data/downloads && useradd --create-home --uid 10001 clipstream && chown -R clipstream:clipstream /app /data
USER clipstream
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('PORT','8000')+'/api/health', timeout=3)" || exit 1
CMD ["sh", "-c", "exec python -m uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
