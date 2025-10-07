// Update user DID display
function updateUserDid(publicKey) {
  if (!didTextElement || !copyDidBtn) return;
  
  // Format the DID - "did:mata:[publicKey]"
  const fullDid = `did:mata:${publicKey}`;
  
  // For display, we truncate the middle to show only first 8 and last 8 chars
  const truncatedDid = publicKey.length > 16 
    ? `did:mata:${publicKey.slice(0, 8)}...${publicKey.slice(-8)}`
    : fullDid;
  
  // Store the full DID for copy operation
  copyDidBtn.dataset.did = fullDid;
  
  // Update the display text
  didTextElement.textContent = truncatedDid;
  
  // Show the DID elements
  didTextElement.style.display = 'block';
  copyDidBtn.style.display = 'inline-flex';
}

// Handle copy DID button click
function handleCopyDid() {
  if (!copyDidBtn) return;
  
  const didToCopy = copyDidBtn.dataset.did;
  if (!didToCopy) return;
  
  // Copy to clipboard
  navigator.clipboard.writeText(didToCopy).then(() => {
    // Show success state
    if (copyIcon && checkIcon) {
      copyIcon.style.display = 'none';
      checkIcon.style.display = 'block';
      
      // Reset after 2 seconds
      setTimeout(() => {
        copyIcon.style.display = 'block';
        checkIcon.style.display = 'none';
      }, 2000);
    }
  }).catch(err => {
    console.error('Could not copy DID: ', err);
  });
}