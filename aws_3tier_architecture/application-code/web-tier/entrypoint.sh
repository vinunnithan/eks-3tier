#!/bin/sh
set -e
RESOLVER_IP=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf)
sed "s/RESOLVER_IP/$RESOLVER_IP/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'