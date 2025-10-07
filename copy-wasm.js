// Script to copy and process WebAssembly files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source directories
const wasmSourceDir = path.resolve(__dirname, 'crate', 'pkg');
// Public directory (for development)
const publicDir = path.resolve(__dirname, 'client', 'public');

// Create directories if they don't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Function to convert ES module to IIFE
function convertToIIFE(jsContent) {
  // Fix the URL import for WebAssembly in browsers
  jsContent = jsContent.replace(
    /new URL\('([^']+)', import\.meta\.url\)/g, 
    "new URL('$1', document.baseURI)"
  );

  // Remove any import statements as they'll be handled differently
  jsContent = jsContent.replace(/import[^;]*;/g, '');
  
  // Replace export functions with regular functions
  jsContent = jsContent.replace(/export function/g, 'function');
  
  // Replace export class with regular class
  jsContent = jsContent.replace(/export class/g, 'class');
  
  // Replace export default function with function
  jsContent = jsContent.replace(/export default function/g, 'function');
  
  // Remove export statements
  jsContent = jsContent.replace(/export \{[^}]*\};/g, '');
  jsContent = jsContent.replace(/export default [^;]*;/g, '');
  
  // Ensure wasm_bindgen is assigned properly
  jsContent = jsContent.replace(/__wbg_init/g, 'wasm_bindgen');
  
  // Wrap the code in an IIFE
  return `
(function() {
  ${jsContent}
  
  // Export to global scope
  if (typeof window !== 'undefined') {
    window.wasm_bindgen = wasm_bindgen;
    window.mata_auth_wasm = {
      wasm_main,
      generate_keypair,
      derive_key,
      encrypt_private_key,
      decrypt_private_key,
      KeyPair,
      // These functions may not exist in the WASM module yet
      generate_random_key: typeof generate_random_key !== 'undefined' ? generate_random_key : null,
      vault_encrypt_data: typeof vault_encrypt_data !== 'undefined' ? vault_encrypt_data : null,
      vault_decrypt_data: typeof vault_decrypt_data !== 'undefined' ? vault_decrypt_data : null
    };
  }
})();
`;
}

// Copy and process WASM files
const wasmFiles = [
  'mata_auth_wasm_bg.wasm',
  'mata_auth_wasm.js'
];

wasmFiles.forEach(file => {
  const sourcePath = path.join(wasmSourceDir, file);
  const destPath = path.join(publicDir, file);
  
  if (fs.existsSync(sourcePath)) {
    if (file.endsWith('.js')) {
      // Process JS file
      const content = fs.readFileSync(sourcePath, 'utf8');
      const processedContent = convertToIIFE(content);
      fs.writeFileSync(destPath, processedContent);
      console.log(`Processed and copied ${file} to ${destPath}`);
    } else {
      // Copy WASM file as-is
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${file} to ${destPath}`);
    }
  } else {
    console.error(`Source file not found: ${sourcePath}`);
  }
});

console.log('WebAssembly files processed and copied successfully');