#!/usr/bin/env bash
# Quick test of gource installation
cd "$(dirname "$0")/.."
nix run nixpkgs#gource -- --help | head -20
