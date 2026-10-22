FROM golang:1.25-alpine AS build
WORKDIR /app
COPY worker/go.mod worker/go.sum ./
RUN go mod download
COPY worker/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /judge-worker ./cmd/worker

FROM docker:29-cli
WORKDIR /app
COPY --from=build /judge-worker /usr/local/bin/judge-worker
COPY worker/entrypoint.sh /usr/local/bin/judge-entrypoint
COPY Dockerfile.cpp Dockerfile.python /opt/judge-sandbox/
RUN chmod +x /usr/local/bin/judge-entrypoint
ENTRYPOINT ["judge-entrypoint"]
