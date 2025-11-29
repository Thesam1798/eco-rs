# CI Runner Docker Image

Custom Docker image for running CI/CD workflows for the EcoIndex Analyzer project.

## Contents

- **Ubuntu 22.04** base
- **Node.js 22** with corepack
- **pnpm 9** (via corepack)
- **Rust stable** with rustfmt and clippy
- **Pre-compiled Tauri dependencies** (faster CI builds)
- **Tauri system dependencies**:
  - build-essential
  - libwebkit2gtk-4.1-dev
  - libappindicator3-dev
  - librsvg2-dev
  - patchelf
  - libfuse2

## Usage

The image is automatically used by CI workflows when running on the `linux-x64-docker` runner.

### Manual build

```bash
docker build -t ghcr.io/thesam1798/eco-rs/ci-runner:latest .docker/
```

### Manual push

```bash
docker push ghcr.io/thesam1798/eco-rs/ci-runner:latest
```

## Rebuilding

The image is automatically rebuilt:

- When files in `.docker/` change (push to main/master)
- When `src-tauri/Cargo.toml` or `src-tauri/Cargo.lock` change (to update pre-compiled deps)
- Weekly on Sunday at 00:00 UTC (for security updates)
- Manually via workflow_dispatch

## Version Updates

To update Node.js, pnpm, or Rust versions, modify the `ARG` values in the Dockerfile:

```dockerfile
ARG NODE_VERSION=22
ARG PNPM_VERSION=9
ARG RUST_VERSION=stable
```
