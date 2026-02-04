{
  description = "TEI Dialogue Editor - A web-based tool for annotating dialogue in TEI XML novels";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    fenix.url = "github:nix-community/fenix";
    fenix.inputs.nixpkgs.follows = "nixpkgs";
    playwright.url = "github:pietdevries94/playwright-web-flake";
    playwright.inputs.nixpkgs.follows = "nixpkgs";
    pre-commit-hooks.url = "github:cachix/pre-commit-hooks.nix";
    pre-commit-hooks.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      fenix,
      playwright,
      pre-commit-hooks,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        overlay = final: prev: {
          inherit (playwright.packages.${system}) playwright-test playwright-driver;
        };
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ overlay ];
        };
        rustToolchain = fenix.packages.${system}.stable.toolchain;
        wasmTargets = fenix.packages.${system}.targets.wasm32-unknown-unknown.stable.toolchain;

        # Pre-commit hooks configuration
        pre-commit-check = pre-commit-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            eslint = {
              enable = true;
              entry = "bun run lint";
              passes = 3;
              files = "\\.(jsx?|tsx?|cts?|mts?)$";
            };
            prettier = {
              enable = false; # Enable if you add Prettier
              entry = "bun prettier --check";
              files = "\\.(jsx?|tsx?|css|md|json)$";
            };
            trailing-whitespace = {
              enable = true;
            };
            end-of-file-fixer = {
              enable = true;
            };
          };
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            nodePackages.npm
            bun
            git
            wasm-pack
          ] ++ pre-commit-check.enabledPackages;

          shellHook = ''
            # Run pre-commit checks
            ${pre-commit-check.shellHook}

            # Override nixpkgs rust with fenix toolchains
            export PATH="${rustToolchain}/bin:${wasmTargets}/bin:$PATH"
            # Explicitly set RUSTC and CARGO to ensure fenix versions are used
            export RUSTC="${rustToolchain}/bin/rustc"
            export CARGO="${rustToolchain}/bin/cargo"

            export LD_LIBRARY_PATH=''$LD_LIBRARY_PATH:${pkgs.libglvnd}/lib:${pkgs.stdenv.cc.cc.lib}/lib:${pkgs.glib.out}/lib
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
            export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"

            echo "🔧 TEI Dialogue Editor Development Environment"
            echo "Node.js version: $(node --version)"
            echo "npm version: $(npm --version)"
            echo "Bun version: $(bun --version)"
            echo "Rust version: $(rustc --version)"
            echo ""
            echo "Package Management:"
            echo "  bun install    - Install dependencies (faster)"
            echo "  npm install    - Alternative: Install dependencies"
            echo ""
            echo "Development:"
            echo "  bun run dev    - Start development server (faster)"
            echo "  npm run dev    - Alternative: Start development server"
            echo "  bun run build  - Build for production"
            echo "  bun test       - Run tests"
            echo ""
            echo "Corpus Analysis:"
            echo "  bun run corpus:all     - Setup, analyze & split corpora (recommended)"
            echo "  bun run corpus:setup   - Clone/update corpus repositories"
            echo "  bun run corpus:analyze - Analyze TEI corpora"
            echo "  bun run corpus:split   - Generate train/val/test splits"
            echo ""
            echo "E2E Testing:"
            echo "  npm run test:e2e - Run Playwright tests"
            echo ""
            echo "Pre-commit hooks installed (run on 'nix develop')"
          '';
        };
        };

        packages.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            nodePackages.npm
            bun
            rustToolchain
            wasm-pack
          ];
        };

        packages.tei-dialogue-editor = pkgs.stdenv.mkDerivation {
          pname = "tei-dialogue-editor";
          version = "0.1.0";
          src = ./.;

          buildInputs = with pkgs; [
            nodejs
            nodePackages.npm
            bun
          ];

          buildPhase = ''
            bun install
            bun run build
          '';

          installPhase = ''
            mkdir -p $out
            cp -r .next $out/
            cp -r public $out/
            cp -r components $out/
            cp -r lib $out/
            cp -r pages $out/
            cp -r styles $out/
            cp package.json $out/
            cp next.config.js $out/
          '';
        };
      }
    );
}
