#!/bin/bash

# Development script for Film Recipe Wizard
# This ensures NODE_ENV is set to development and includes Jest testing

echo "Starting Film Recipe Wizard in development mode with Jest testing..."
echo "NODE_ENV will be set to 'development'"
echo "Jest tests will run in watch mode"
echo "Dev tools should open automatically"
echo ""

# Set NODE_ENV to development
export NODE_ENV=development

# Run the development command with tests
npm run dev:test
