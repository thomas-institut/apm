#!/bin/bash

# Install node dependencies if node_modules is missing
if [ -d "/opt/apm/typesetting-service" ] && [ ! -d "/opt/apm/typesetting-service/node_modules" ]; then
    echo "Installing node dependencies for typesetting-service..."
    cd /opt/apm/typesetting-service && npm install
fi

exec "$@"
