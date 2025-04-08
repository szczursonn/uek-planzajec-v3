FROM node:24.4-alpine3.21 AS frontend-builder
WORKDIR /app

RUN apk add git

COPY . ./
WORKDIR /app/frontend
RUN npm install
RUN npm run build

FROM golang:1.24.5-alpine AS backend-builder
WORKDIR /app

COPY . ./
WORKDIR /app/backend
RUN go mod download

COPY --from=frontend-builder /app/frontend/dist internal/server/static
RUN go build -o app cmd/app/app.go

FROM scratch
WORKDIR /app

COPY --from=backend-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=backend-builder /app/backend/app ./

CMD [ "./app" ]