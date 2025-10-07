import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { EXTENSION_VERSION } from './chrome-extension/versionConfig.js';
import { EXTENSION_FILENAME } from './server/extensionConfig.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = './chrome-extension';
const VERSION = EXTENSION_VERSION; // Import from centralized config
const OUTPUT_PATH = `./public/${EXTENSION_FILENAME}`;

async function createExtensionZip() {
  console.log(`Building MATA extension v${VERSION}...`);
  
  // Create a new JSZip instance
  const zip = new JSZip();
  
  // Read the extension directory
  console.log(`Reading from source directory: ${SOURCE_DIR}`);
  
  // Function to recursively add files to zip
  async function addFilesToZip(currentPath, zipFolder) {
    const files = fs.readdirSync(currentPath);
    
    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        // Create folder in zip and recurse
        const newZipFolder = zipFolder.folder(file);
        await addFilesToZip(filePath, newZipFolder);
      } else {
        // Add file to zip
        const fileContent = fs.readFileSync(filePath);
        zipFolder.file(file, fileContent);
        console.log(`Added file: ${path.relative(SOURCE_DIR, filePath)}`);
      }
    }
  }
  
  // Start adding files to the root of the zip
  await addFilesToZip(SOURCE_DIR, zip);
  
  // Generate the zip file
  console.log(`Generating ZIP file: ${OUTPUT_PATH}`);
  const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
  
  // Write the zip file
  fs.writeFileSync(OUTPUT_PATH, zipContent);
  
  console.log(`Successfully created extension ZIP at: ${OUTPUT_PATH}`);
  console.log(`Extension version: ${VERSION}`);
}

// Run the function
createExtensionZip().catch(err => {
  console.error('Error building extension ZIP:', err);
  process.exit(1);
});