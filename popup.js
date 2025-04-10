document.addEventListener('DOMContentLoaded', () => {
    const messageTemplateTextarea = document.getElementById('messageTemplate');
    const saveButton = document.getElementById('saveButton');
    const sizeCycleButton = document.getElementById('sizeCycleButton');
    const powerButton = document.getElementById('powerButton');
    const infoToggleButton = document.getElementById('infoToggleButton');
    const infoPanel = document.getElementById('infoPanel'); // Get reference to info panel
    const sizeSelectorButtons = document.querySelectorAll('.size-selector button');
    const defaultTemplate = "Hola! Vi tu anuncio en Idealista para la propiedad en {calle}, {numero} ({barrio}, {ciudad}). ¿Sigue disponible?";
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
        const elementsToToggle = [
            messageTemplateTextarea,
            saveButton,
            sizeCycleButton,
            infoToggleButton // Removed document.getElementById('infoButton')
        ];

        if (isEnabled) {
            document.body.classList.remove('app-disabled');
            powerButton.classList.remove('off');
            powerButton.title = 'Desactivar extensión';
            elementsToToggle.forEach(el => el && el.removeAttribute('disabled')); // Re-enable elements visually if needed (CSS handles pointer events)
            infoPanel.classList.remove('visible'); // Ensure panel is hidden initially when enabled
        } else {
            document.body.classList.add('app-disabled');
            powerButton.classList.add('off');
            powerButton.title = 'Activar extensión';
            elementsToToggle.forEach(el => el && el.setAttribute('disabled', 'true')); // Disable elements visually if needed (CSS handles pointer events)
            infoPanel.classList.remove('visible'); // Hide panel when disabling
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

    // Handle info toggle button click
    infoToggleButton.addEventListener('click', () => {
        console.log('Información button clicked.');
        infoPanel.classList.toggle('visible'); // Toggle visibility class
    });
});
