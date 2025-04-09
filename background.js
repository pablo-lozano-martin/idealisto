chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openWhatsApp") {
        console.log("idealisto: Received message to open WhatsApp.", request);
        
        // Check if extension is enabled
        chrome.storage.sync.get(['extensionEnabled'], (result) => {
            // Default to enabled if setting doesn't exist
            const isEnabled = result.extensionEnabled !== false;
            
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

            const defaultTemplate = "Hola, vi tu anuncio en Idealista para la propiedad en {calle}, {numero} ({barrio}, {ciudad}). ¿Sigue disponible?";
            const details = request.details || {};

            chrome.storage.sync.get(['messageTemplate'], (result) => {
                const template = result.messageTemplate || defaultTemplate;

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

                console.log(`idealisto: Opening URL: ${whatsappUrl}`);
                chrome.tabs.create({ url: whatsappUrl });
            });
        });
        
        return true;
    }
});

console.log("idealisto: Background script loaded.");
