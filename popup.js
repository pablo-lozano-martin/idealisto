document.addEventListener('DOMContentLoaded', () => {
    const messageTemplateTextarea = document.getElementById('messageTemplate');
    const saveButton = document.getElementById('saveButton');
    const sizeCycleButton = document.getElementById('sizeCycleButton');
    const powerButton = document.getElementById('powerButton');
    const sizeSelectorButtons = document.querySelectorAll('.size-selector button');
    const defaultTemplate = "Hola, vi tu anuncio en Idealista para la propiedad en {calle}, {numero} ({barrio}, {ciudad}). ¿Sigue disponible?";
    const defaultSize = 'medium';
    const sizeCycle = ['medium', 'larger', 'smaller'];
    const sizeLabels = {
        'medium': '1x',
        'larger': '2x',
        'smaller': '0.5x'
    };

    // Function to apply size and update button text
    function applySize(size) {
        document.body.dataset.size = size;
        sizeCycleButton.textContent = sizeLabels[size] || '1x';
        sizeSelectorButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === size);
        });
    }

    // Function to update UI based on extension enabled/disabled state
    function updatePowerState(isEnabled) {
        if (isEnabled) {
            document.body.classList.remove('app-disabled');
            powerButton.classList.remove('off');
            powerButton.title = 'Desactivar extensión';
        } else {
            document.body.classList.add('app-disabled');
            powerButton.classList.add('off');
            powerButton.title = 'Activar extensión';
        }
    }

    // Load saved template
    chrome.storage.sync.get(['messageTemplate'], (result) => {
        messageTemplateTextarea.value = result.messageTemplate || defaultTemplate;
    });

    // Load saved size or use default
    chrome.storage.sync.get(['popupSize'], (result) => {
        const loadedSize = result.popupSize || defaultSize;
        applySize(sizeCycle.includes(loadedSize) ? loadedSize : defaultSize);
    });

    // Load enabled state (default to enabled if not set)
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
        const isEnabled = result.extensionEnabled !== false; // Default to true if undefined
        updatePowerState(isEnabled);
    });

    // Save template on button click
    saveButton.addEventListener('click', () => {
        const template = messageTemplateTextarea.value;
        chrome.storage.sync.set({ messageTemplate: template }, () => {
            saveButton.textContent = '¡Guardado!';
            setTimeout(() => {
                saveButton.textContent = 'Guardar Plantilla';
            }, 1500);
            console.log('Message template saved.');
        });
    });

    // Handle power button click
    powerButton.addEventListener('click', () => {
        const isCurrentlyEnabled = !document.body.classList.contains('app-disabled');
        const newState = !isCurrentlyEnabled;
        
        updatePowerState(newState);
        
        // Save state to chrome.storage
        chrome.storage.sync.set({ extensionEnabled: newState }, () => {
            console.log(`Extension ${newState ? 'enabled' : 'disabled'}`);
        });
    });

    // Handle size selection
    sizeSelectorButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newSize = button.dataset.size;
            applySize(newSize);
            chrome.storage.sync.set({ popupSize: newSize }, () => {
                console.log(`Popup size saved: ${newSize}`);
            });
        });
    });

    // Handle size cycle button click
    sizeCycleButton.addEventListener('click', () => {
        const currentSize = document.body.dataset.size || defaultSize;
        const currentIndex = sizeCycle.indexOf(currentSize);
        const nextIndex = (currentIndex + 1) % sizeCycle.length; // Loop back to the start
        const newSize = sizeCycle[nextIndex];

        applySize(newSize);
        chrome.storage.sync.set({ popupSize: newSize }, () => {
            console.log(`Popup size saved: ${newSize}`);
        });
    });
});
