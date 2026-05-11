#!/bin/bash

# Install node dependencies if node_modules is missing in the www directory
if [ -d "/opt/apm/www" ] && [ ! -d "/opt/apm/www/node_modules" ]; then
    echo "Installing node dependencies for www..."
    cd /opt/apm/www && npm install
fi

exec "$@"
