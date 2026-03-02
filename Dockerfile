FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy site files
COPY docs/ /usr/share/nginx/html/

EXPOSE 8090

CMD ["nginx", "-g", "daemon off;"]
