#!/bin/bash

# Script to create nito-skeleton repository on GitHub and push code
# Run this after creating the repo on GitHub

set -e

echo "🚀 Setting up nito-skeleton repository..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Add all files
echo "➕ Adding files to git..."
git add .

# First commit
echo "💾 Creating initial commit..."
git commit -m "feat: initial nito-skeleton with NestJS, Drizzle, JWT auth

Features:
- JWT authentication with refresh tokens
- PostgreSQL + Drizzle ORM
- Fastify + Swagger
- Health checks with Terminus
- Docker + docker-compose
- Environment validation with Joi
- Global exception handling"

# Instructions for GitHub
echo ""
echo "✅ Local repository ready!"
echo ""
echo "Next steps:"
echo "1. Go to https://github.com/new"
echo "2. Create repository: mouzotech/nito-skeleton"
echo "3. Set it as a Template Repository (Settings → General → Template repository ✓)"
echo "4. Run these commands:"
echo ""
echo "   git remote add origin https://github.com/mouzotech/nito-skeleton.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "📚 After pushing, users can:"
echo "   - Click 'Use this template' on GitHub"
echo "   - Or: nest new -c mouzotech/nito-skeleton my-project"
