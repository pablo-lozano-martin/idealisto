chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openWhatsApp") {
        console.log("idealisto: Received message to open WhatsApp.", request);

        // Check if extension is enabled
        chrome.storage.sync.get(['extensionEnabled'], (resultEnabled) => {
            // Default to enabled if setting doesn't exist
            const isEnabled = resultEnabled.extensionEnabled !== false;

            if (!isEnabled) {
                console.log("idealisto: Extension is disabled. Not opening WhatsApp.");
                return;
            }

            // Extension is enabled, continue with normal processing

            // Check if the number looks like a Spanish landline (+34 9xx xxx xxx)
            if (request.phone && request.phone.startsWith('+349')) {
                console.warn(`idealisto: Phone number ${request.phone} appears to be a landline. WhatsApp link will not be opened.`);
                return;
            }

            const defaultTemplate = "Hola! Vi tu anuncio en Idealista para la propiedad en {calle}, {numero} ({barrio}, {ciudad}). ¿Sigue disponible?";
            const details = request.details || {};

            chrome.storage.sync.get(['messageTemplate'], (resultTemplate) => {
                const template = resultTemplate.messageTemplate || defaultTemplate;

                // Replace all placeholders
                let message = template;
                message = message.replace('{calle}', details.calle || 'Dirección desconocida');
                message = message.replace('{numero}', details.numero || '');
                message = message.replace('{barrio}', details.barrio || '');
                message = message.replace('{ciudad}', details.ciudad || '');

                // Clean up potential extra commas or spaces if parts are missing
                message = message.replace(/,\s*,/g, ',');
                message = message.replace(/\(\s*,/g, '(');
                message = message.replace(/,\s*\)/g, ')');
                message = message.replace(/\(\s*\)/g, '');
                message = message.replace(/,\s*$/g, '');
                message = message.replace(/\s{2,}/g, ' ');

                const encodedMessage = encodeURIComponent(message.trim());
                const whatsappUrl = `https://web.whatsapp.com/send?phone=${request.phone}&text=${encodedMessage}`;

                console.log(`idealisto: Preparing to open URL: ${whatsappUrl}`);

                // Function to inject the sender script
                const injectSenderScript = (tabId) => {
                    console.log(`idealisto: Attempting to inject sender script into tab ${tabId}`);
                    setTimeout(() => { // Add a small delay before injecting
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            files: ['whatsappSender.js']
                        }).then(() => {
                            console.log("idealisto: Injected whatsappSender.js successfully.");
                        }).catch(err => {
                            console.error("idealisto: Failed to inject whatsappSender.js:", err);
                        });
                    }, 3000); // Increased wait to 3 seconds after tab update/creation signal
                };

                // Check if a WhatsApp Web tab is already open
                chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, (tabs) => {
                    if (tabs.length > 0) {
                        // WhatsApp tab exists, update it
                        const tabId = tabs[0].id;
                        console.log(`idealisto: Found existing WhatsApp tab (ID: ${tabId}). Updating URL.`);
                        chrome.tabs.update(tabId, { url: whatsappUrl, active: true }, (tab) => {
                            if (chrome.runtime.lastError) {
                                console.error("idealisto: Error updating tab:", chrome.runtime.lastError.message);
                                return;
                            }
                            if (tab) {
                                chrome.windows.update(tab.windowId, { focused: true });
                                // Inject script after update
                                injectSenderScript(tab.id);
                            } else {
                                console.warn("idealisto: Tab update callback did not return a tab object.");
                                // Fallback: try injecting anyway if tabId is known
                                injectSenderScript(tabId);
                            }
                        });
                    } else {
                        // No WhatsApp tab found, create a new one
                        console.log("idealisto: No existing WhatsApp tab found. Creating new tab.");
                        chrome.tabs.create({ url: whatsappUrl }, (tab) => {
                             if (chrome.runtime.lastError) {
                                console.error("idealisto: Error creating tab:", chrome.runtime.lastError.message);
                                return;
                            }
                            if (tab) {
                                // Inject script after creation
                                injectSenderScript(tab.id);
                            } else {
                                 console.error("idealisto: Tab creation callback did not return a tab object.");
                            }
                        });
                    }
                });
            });
        });

        return true; // Indicate asynchronous response
    }
});

console.log("idealisto: Background script loaded.");
