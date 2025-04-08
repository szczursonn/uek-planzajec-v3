FROM node:23-alpine3.20 AS frontend-builder
WORKDIR /app

RUN apk add git

COPY . ./
WORKDIR /app/frontend
RUN npm install
RUN npm run build

FROM golang:1.24.2-alpine AS backend-builder
WORKDIR /app

RUN apk add git

COPY . ./
WORKDIR /app/backend
RUN go mod download
RUN go generate ./...

COPY --from=frontend-builder /app/frontend/dist internal/server/static
RUN go build -o app

FROM scratch
WORKDIR /app

COPY --from=backend-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=backend-builder /app/backend/app ./

CMD [ "./app" ]