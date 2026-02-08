# Contributing to Shadow Orders

Thank you for your interest in contributing to Shadow Orders! This document provides guidelines and instructions for contributing to the project.

## Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/Shadow-Orders.git
cd Shadow-Orders
```

2. **Install dependencies**
```bash
# Frontend
cd frontend && npm install

# Keeper service  
cd keeper && npm install

# Smart contracts
cd contracts && forge install
```

3. **Configure environment**
   - Copy `.env.example` to `.env` in each directory
   - Fill in required values (see README for details)

## Testing

### Smart Contracts
```bash
cd contracts
forge test
```

### Frontend
```bash
cd frontend
npm run build
npm run lint
```

## Code Style

- Use consistent formatting (run `forge fmt` for Solidity, `npm run format` for TypeScript)
- Add comments for complex logic
- Write descriptive commit messages

## Commit Message Convention

We follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `chore:` Maintenance tasks
- `config:` Configuration updates

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear commits
3. Test thoroughly
4. Submit PR with description of changes

## Questions?

Open an issue or reach out to the team!
