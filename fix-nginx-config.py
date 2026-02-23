#!/usr/bin/env python3
"""Rewrite nginx config with ticket image cache block."""

config = r'''server {
    listen 80;
    server_name kolo.cd www.kolo.cd 158.220.108.42;

    root /var/www/kolo/client/dist;
    index index.html;

    # Proxy Firebase auth handler for custom authDomain
    location /__/ {
        proxy_pass https://kolo-26.firebaseapp.com;
        proxy_set_header Host kolo-26.firebaseapp.com;
        proxy_ssl_server_name on;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Ticket images - short cache for easy updates
    location ~* ticket-.*\.png$ {
        expires 1h;
        add_header Cache-Control "no-cache";
        try_files $uri =404;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
}

server {
    listen 443 ssl;
    server_name kolo.cd www.kolo.cd;

    ssl_certificate /etc/ssl/certs/kolo-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/kolo-selfsigned.key;

    root /var/www/kolo/client/dist;
    index index.html;

    # Proxy Firebase auth handler for custom authDomain
    location /__/ {
        proxy_pass https://kolo-26.firebaseapp.com;
        proxy_set_header Host kolo-26.firebaseapp.com;
        proxy_ssl_server_name on;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Ticket images - short cache for easy updates
    location ~* ticket-.*\.png$ {
        expires 1h;
        add_header Cache-Control "no-cache";
        try_files $uri =404;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
}
'''

with open('/etc/nginx/sites-enabled/kolo', 'w') as f:
    f.write(config)

print('Nginx config written successfully')
