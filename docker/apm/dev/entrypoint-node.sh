#!/bin/bash

# Install node dependencies if node_modules is missing
if [ -d "/opt/apm/node-service" ] && [ ! -d "/opt/apm/node-service/node_modules" ]; then
    echo "Installing node dependencies for node-service..."
    cd /opt/apm/node-service && npm install
fi

exec "$@"
