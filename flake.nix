{
  description = "TEI Dialogue Editor - A web-based tool for annotating dialogue in TEI XML novels";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    fenix.url = "github:nix-community/fenix";
    fenix.inputs.nixpkgs.follows = "nixpkgs";
    playwright.url = "github:pietdevries94/playwright-web-flake";
    playwright.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      fenix,
      playwright,
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
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            nodePackages.npm
            git
            wasm-pack
          ];

          shellHook = ''
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
            echo "Rust version: $(rustc --version)"
            echo ""
            echo "Available commands:"
            echo "  npm install    - Install dependencies"
            echo "  npm run dev    - Start development server"
            echo "  npm test       - Run tests"
            echo "  npm run build  - Build for production"
            echo ""
            echo "WASM Build:"
            echo "  cd pattern-engine && wasm-pack build --target web --out-dir ../public/wasm"
            echo ""
          '';
        };

        packages.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            nodePackages.npm
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
          ];

          buildPhase = ''
            npm install
            npm run build
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
