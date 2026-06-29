FROM node:20-bookworm-slim AS build

WORKDIR /app

ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM=sistema-centralizado
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID=proyecto-test
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID
ARG VITE_KEYCLOAK_ACCESS_ROLE=
ENV VITE_KEYCLOAK_ACCESS_ROLE=$VITE_KEYCLOAK_ACCESS_ROLE

COPY package*.json ./
RUN npm ci --include=dev --strict-ssl=false

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
