{pkgs}: {
  deps = [
    pkgs.imagemagick
    pkgs.unzip
    pkgs.zip
    pkgs.wasm-bindgen-cli
    pkgs.openssl
    pkgs.pkg-config
    pkgs.rustc
    pkgs.wasm-pack
    pkgs.postgresql
  ];
}
