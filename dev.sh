#!/bin/bash

# Development script for Film Recipe Wizard
# This ensures NODE_ENV is set to development

echo "Starting Film Recipe Wizard in development mode..."
echo "NODE_ENV will be set to 'development'"
echo "Dev tools should open automatically"
echo ""

# Set NODE_ENV to development
export NODE_ENV=development

# Run the development command
npm run dev
