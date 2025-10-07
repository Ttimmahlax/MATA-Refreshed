#!/bin/bash

# Get the version from versionConfig.js
VERSION=$(grep "EXTENSION_VERSION = '" ./chrome-extension/versionConfig.js | cut -d "'" -f 2)
SOURCE_DIR="./chrome-extension"
OUTPUT_PATH="./public/mata-extension-fixed-v${VERSION}.zip"

echo "Building MATA extension v$VERSION..."

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Source directory $SOURCE_DIR not found!"
  exit 1
fi

# Make sure manifest.json has the right version
echo "Ensuring manifest.json has version $VERSION..."
sed -i "s/\"version\": \"[0-9.]*\"/\"version\": \"$VERSION\"/g" "$SOURCE_DIR/manifest.json"

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Copy files to temporary directory
cp -r "$SOURCE_DIR"/* "$TEMP_DIR"/
echo "Copied extension files to temporary directory"

# Move to the temporary directory to create zip
cd "$TEMP_DIR"

# Create the zip file
echo "Creating ZIP file..."
zip -r extension.zip ./*
echo "ZIP file created"

# Move the zip file to the output path
cd -
mv "$TEMP_DIR/extension.zip" "$OUTPUT_PATH"
echo "Moved ZIP file to $OUTPUT_PATH"

# Clean up temporary directory
rm -rf "$TEMP_DIR"
echo "Cleaned up temporary directory"

echo "Successfully created extension ZIP at: $OUTPUT_PATH"
echo "Extension version: $VERSION"