FROM nginx:alpine

# Copy static assets to nginx's serve directory
COPY . /usr/share/nginx/html

# Cloud Run expects the container to listen on $PORT (default 8080). 
# We update the nginx default config to listen on 8080 instead of 80.
RUN sed -i 's/listen  *80;/listen 8080;/g' /etc/nginx/conf.d/default.conf

EXPOSE 8080
