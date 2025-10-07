const fs = require('fs');
const path = require('path');

const filePath = './chrome-extension/popup/popup.js';

// Read the file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Fix template literals with proper backticks and commas
  const fixedData = data.replace(
    /console\.(log|error|warn)\(`\[DEBUG v`\s+(.*?)'\s*,\s*(.*?)\);/g, 
    'console.$1(`[DEBUG v${EXTENSION_VERSION}] $2`, $3);'
  );

  // Fix template literals without commas
  const finalData = fixedData.replace(
    /console\.(log|error|warn)\(`\[DEBUG v`\s+(.*?)'\);/g, 
    'console.$1(`[DEBUG v${EXTENSION_VERSION}] $2`);'
  );

  // Write the fixed content back to the file
  fs.writeFile(filePath, finalData, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('File updated successfully');
  });
});
