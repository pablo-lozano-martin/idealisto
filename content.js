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
        console.log("idealisto: 'Ver teléfono' clicked.");
        const listingElement = button.closest('article.item');
        if (!listingElement) {
            console.error("idealisto: Could not find parent listing element.");
            return;
        }

        const itemLink = listingElement.querySelector('a.item-link');
        const listingDetails = extractListingDetails(itemLink ? itemLink.title : ''); // Use updated function
        const toolbarElement = listingElement.querySelector('.item-toolbar');

        console.log(`idealisto: Extracted Street Name: ${listingDetails.calle}`);

        // Use MutationObserver to wait for the phone number link to appear
        const observer = new MutationObserver((mutationsList, observer) => {
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

                        console.log(`idealisto: Extracted Phone: ${phoneNumber}`);

                        // Send data to background script
                        chrome.runtime.sendMessage({
                            action: "openWhatsApp",
                            phone: phoneNumber,
                            details: listingDetails // Send the whole details object
                        });

                        observer.disconnect(); // Stop observing once found
                        return;
                    }
                }
            }
        });

        // Start observing the toolbar for changes
        if (toolbarElement) {
            observer.observe(toolbarElement, { childList: true, subtree: true });
            console.log("idealisto: Observer started for phone number.");
        } else {
             console.error("idealisto: Could not find toolbar element to observe.");
        }

        // Optional: Prevent default button behavior if necessary, though Idealista's JS likely handles the display toggle.
        // event.stopPropagation();
        // event.preventDefault();
    });
}

// Find all "Ver teléfono" buttons and add listeners
const phoneButtons = document.querySelectorAll('button.see-phones-btn');
console.log(`idealisto: Found ${phoneButtons.length} 'Ver teléfono' buttons.`);
phoneButtons.forEach(addClickListener);

// --- Handle dynamically loaded content (e.g., infinite scroll) ---
// Observe the main container for new listing items being added
const listingContainer = document.querySelector('.items-container'); // Adjust selector if needed

if (listingContainer) {
    const dynamicContentObserver = new MutationObserver((mutationsList) => {
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
    });

    dynamicContentObserver.observe(listingContainer, { childList: true, subtree: true });
    console.log("idealisto: Observer started for dynamic content.");
} else {
    console.warn("idealisto: Could not find listing container for dynamic content observation.");
}
