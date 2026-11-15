FROM mcr.microsoft.com/playwright:v1.63.0-noble

ARG UID=1000
ARG GID=1000

# Pre-create node_modules as the host user so the named volume mounted over it
# inherits that ownership instead of root's.
RUN mkdir -p /app/node_modules && chown -R ${UID}:${GID} /app

ENV HOME=/tmp
WORKDIR /app
