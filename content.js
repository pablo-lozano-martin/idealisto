console.log("idealisto: Content script loaded.");

function extractListingDetails(title) {
    const details = {
        calle: 'Dirección desconocida',
        numero: '',
        barrio: '',
        ciudad: ''
    };
    if (!title) return details;

    const parts = title.split(',').map(part => part.trim());
    // Example: ["Piso en calle de Caravaca", "9", "Lavapiés-Embajadores", "Madrid"]

    if (parts.length > 0) {
        let streetPart = parts[0];
        // Remove initial type description
        streetPart = streetPart.replace(/^(Piso|Estudio|Apartamento|Casa|Chalet)\s+en\s+/i, '');
        // Remove common street type prefixes
        streetPart = streetPart.replace(/^(calle|plaza|paseo|avenida|ronda|travesía)\s+(de|del|la|los|las)\s+/i, '');
        streetPart = streetPart.replace(/^(calle|plaza|paseo|avenida|ronda|travesía)\s+/i, '');
        details.calle = streetPart || details.calle; // Assign extracted street name
    }
    if (parts.length > 1 && /^\d+$/.test(parts[1])) { // Check if the second part is purely a number
        details.numero = parts[1];
    }
    if (parts.length > 2) {
        // Assume the last part is the city and the second to last is the neighborhood
        details.ciudad = parts[parts.length - 1];
        if (parts.length > 3 || (parts.length === 3 && !details.numero)) { // If number wasn't found, 3rd part is likely neighborhood
             details.barrio = parts[parts.length - 2];
        } else if (parts.length === 3 && details.numero) { // If number was found, 3rd part is neighborhood
             details.barrio = parts[2];
        }
    } else if (parts.length === 2 && !details.numero) {
        // If only two parts and the second isn't a number, it might be the city or neighborhood
        // Heuristic: If it contains typical neighborhood separators or known city names, assume city. This is less reliable.
         details.ciudad = parts[1]; // Less certain, could be neighborhood
    }


    console.log("idealisto: Extracted Details:", details);
    return details;
}

function addClickListener(button) {
    button.addEventListener('click', (event) => {
        console.log("idealisto: 'Ver teléfono' button clicked.");
        const listingElement = button.closest('article.item');
        if (!listingElement) {
            console.error("idealisto: Could not find parent listing element.");
            return;
        }

        const itemLink = listingElement.querySelector('a.item-link');
        const listingDetails = extractListingDetails(itemLink ? itemLink.title : ''); // Capture details once
        const toolbarElement = listingElement.querySelector('.item-toolbar');
        
        if (!toolbarElement) {
            console.error("idealisto: Could not find toolbar element.");
            return;
        }

        console.log(`idealisto: Extracted Street Name: ${listingDetails.calle}`);

        // Use MutationObserver to wait for the phone number link to appear
        const observer = new MutationObserver((mutationsList, observer) => {
            try {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        const phoneLink = toolbarElement.querySelector('a._mobilePhone');
                        if (phoneLink && phoneLink.href) {
                            const phoneNumberRaw = phoneLink.href.replace('tel:', '').trim();
                            // Basic cleaning: remove spaces, assume +34 if not present internationally
                            let phoneNumber = phoneNumberRaw.replace(/\s+/g, '');
                            if (!phoneNumber.startsWith('+') && phoneNumber.length >= 9) {
                                // Simple check for Spanish numbers, might need refinement
                                if (phoneNumber.startsWith('6') || phoneNumber.startsWith('7') || phoneNumber.startsWith('9')) {
                                    phoneNumber = '+34' + phoneNumber;
                                }
                            }

                            console.log(`idealisto: Phone number revealed: ${phoneNumber}`);

                            try {
                                // --- Action 1: Send message immediately on reveal ---
                                chrome.runtime.sendMessage({
                                    action: "openWhatsApp",
                                    phone: phoneNumber,
                                    details: listingDetails // Use details captured earlier
                                });
                            } catch (messagingError) {
                                console.error("idealisto: Error sending message to background script:", messagingError);
                            }

                            // --- Action 2: Add listener for clicks *on the revealed number* ---
                            try {
                                // Check if listener already added to prevent duplicates
                                if (!phoneLink.dataset.idealistoListenerAdded) {
                                    phoneLink.addEventListener('click', (phoneLinkEvent) => {
                                        phoneLinkEvent.preventDefault(); // Prevent default 'tel:' action
                                        console.log(`idealisto: Revealed phone number link clicked: ${phoneNumber}`);

                                        // Send message again when the link itself is clicked
                                        chrome.runtime.sendMessage({
                                            action: "openWhatsApp",
                                            phone: phoneNumber, // Use the same number
                                            details: listingDetails // Use the same details
                                        });
                                    });
                                    phoneLink.dataset.idealistoListenerAdded = 'true'; // Mark as listener added
                                    console.log("idealisto: Click listener added to revealed phone link.");
                                }
                            } catch (listenerError) {
                                console.error("idealisto: Error adding click listener to phone link:", listenerError);
                            }

                            observer.disconnect(); // Stop observing once found and listener added
                            return;
                        }
                    }
                }
            } catch (observerError) {
                console.error("idealisto: Error in mutation observer:", observerError);
                observer.disconnect(); // Ensure we disconnect on error
            }
        });

        // Start observing the toolbar for changes
        try {
            observer.observe(toolbarElement, { childList: true, subtree: true });
            console.log("idealisto: Observer started for phone number.");
        } catch (observeError) {
            console.error("idealisto: Error setting up observer:", observeError);
        }
    });
}

// Initialize only if we're on a relevant page
function initializePage() {
    try {
        // Check if we're on a search results page with listings
        const phoneButtons = document.querySelectorAll('button.see-phones-btn');
        if (phoneButtons.length > 0) {
            console.log(`idealisto: Found ${phoneButtons.length} 'Ver teléfono' buttons.`);
            phoneButtons.forEach(addClickListener);
            
            // Set up observation for dynamic content only on search results pages
            const listingContainer = document.querySelector('.items-container');
            if (listingContainer) {
                const dynamicContentObserver = new MutationObserver((mutationsList) => {
                    try {
                        for (const mutation of mutationsList) {
                            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                                mutation.addedNodes.forEach(node => {
                                    // Check if the added node is an article item or contains one
                                    if (node.nodeType === Node.ELEMENT_NODE) {
                                        const newButtons = node.querySelectorAll ? node.querySelectorAll('button.see-phones-btn') : [];
                                        if (newButtons.length > 0) {
                                            console.log(`idealisto: Found ${newButtons.length} new buttons in dynamic content.`);
                                            newButtons.forEach(addClickListener);
                                        }
                                        // If the node itself is the button
                                        if (node.matches && node.matches('button.see-phones-btn')) {
                                            console.log(`idealisto: Found 1 new button directly.`);
                                            addClickListener(node);
                                        }
                                    }
                                });
                            }
                        }
                    } catch (mutationError) {
                        console.error("idealisto: Error handling dynamic content:", mutationError);
                    }
                });

                dynamicContentObserver.observe(listingContainer, { childList: true, subtree: true });
                console.log("idealisto: Observer started for dynamic content.");
            } else {
                console.log("idealisto: No listing container found, skipping dynamic content observation.");
            }
        } else {
            console.log("idealisto: No 'Ver teléfono' buttons found on this page.");
        }
    } catch (error) {
        console.error("idealisto: Error during initialization:", error);
    }
}

// Wait for the page to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
