export function applySlots(container, content) {
    const slotElements = container.querySelectorAll('slot');
    for (const slotElement of slotElements) {
        const name = slotElement.name;
        const slotContents = content.querySelectorAll(`[slot="${name}"]`);
        if (slotContents.length > 0) {
            const parent = slotElement.parentNode;
            slotContents.forEach((slotContent) => {
                // Create temporary node to parse the outerHTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = slotContent.outerHTML;
                const children = Array.from(tempDiv.children);
                children.forEach((child) => parent.insertBefore(child, slotElement));
                slotContent.remove();
            });
        }
    }
    // Remove all slot elements after processing
    slotElements.forEach((slot) => slot.remove());
    return content;
}
