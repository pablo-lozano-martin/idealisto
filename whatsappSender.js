(function() {
    console.log("idealisto: whatsappSender.js injected.");

    // More specific selectors for WhatsApp Web
    const sendButtonSelector = 'button span[data-icon="send"]';
    const inputSelector = 'div[contenteditable="true"][data-tab="10"]';
    const conversationLoadedSelector = 'div.two, div._2Ts6i._3RGKj'; // Main conversation container

    const maxAttempts = 40; // Try for 20 seconds (40 * 500ms)
    let attempts = 0;
    let messageSent = false; // Flag to prevent double-sending
    
    console.log("idealisto: Waiting for WhatsApp Web to load conversation...");
    
    // Function to check if the input has content
    const hasContent = (input) => {
        if (!input) return false;
        // Check if the input has any text content
        return input.textContent.trim().length > 0;
    };
    
    // Function to send message using button click OR keyboard event, but not both
    const sendMessage = (input) => {
        if (messageSent) {
            console.log("idealisto: Message already sent. Preventing duplicate send.");
            return;
        }
        
        // Focus on input field first
        input.focus();
        
        // First try to use the send button
        const sendButton = document.querySelector(sendButtonSelector)?.closest('button');
        if (sendButton && !sendButton.disabled) {
            console.log("idealisto: Clicking send button...");
            sendButton.click();
            messageSent = true;
            return;
        }
        
        // Only if button click failed, try keyboard event as fallback
        console.log("idealisto: Send button not available. Using keyboard event instead...");
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        input.dispatchEvent(enterEvent);
        messageSent = true;
    };

    const intervalId = setInterval(() => {
        attempts++;
        
        // First verify conversation is loaded
        const conversationLoaded = document.querySelector(conversationLoadedSelector);
        if (!conversationLoaded) {
            console.log(`idealisto: WhatsApp conversation not loaded yet. Waiting... (${attempts}/${maxAttempts})`);
            if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                console.warn("idealisto: WhatsApp conversation did not load in time. Please send message manually.");
            }
            return;
        }
        
        // Now check for input field and content
        const inputField = document.querySelector(inputSelector);
        if (!inputField) {
            console.log(`idealisto: Input field not found. Waiting... (${attempts}/${maxAttempts})`);
            return;
        }
        
        // Check if message is loaded in input field
        if (hasContent(inputField)) {
            console.log("idealisto: Message detected in input field. Attempting to send...");
            
            // Small delay to ensure WhatsApp UI is ready
            setTimeout(() => {
                if (!messageSent) {  // Extra check to prevent duplicate sends
                    sendMessage(inputField);
                    console.log("idealisto: Message send attempt completed.");
                }
            }, 800);
            
            clearInterval(intervalId);
        } else {
            console.log(`idealisto: Waiting for message to appear in input field... (${attempts}/${maxAttempts})`);
            if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                console.warn("idealisto: Message did not appear in input field. Please send message manually.");
            }
        }
    }, 500); // Check every 500ms
})();
