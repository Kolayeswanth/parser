const { ipcRenderer } = require('electron');

let currentPath = '';
let files = [];
let expandedFolders = {};

function fetchFiles(path) {
    console.log('Fetching files for path:', path);
    ipcRenderer.invoke('explore-directory', path)
        .then(result => {
            if (result.error) {
                console.error('Error fetching files:', result.error);
            } else {
                files = result.files;
                renderFileTree();
                updateCurrentPath();
            }
        })
        .catch(error => {
            console.error('Error fetching files:', error);
        });
}

function handleItemClick(item) {
    if (item.isDirectory) {
        const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
        currentPath = newPath;
        expandedFolders[newPath] = !expandedFolders[newPath];
        fetchFiles(newPath);
    } else if (isImageFile(item.name)) {
        const imagePath = currentPath ? `${currentPath}/${item.name}` : item.name;
        console.log('Attempting to open image:', imagePath);
        ipcRenderer.invoke('open-image', imagePath)
            .then(result => {
                if (result.error) {
                    console.error('Error opening image:', result.error);
                } else {
                    console.log('Image opened successfully');
                }
            })
            .catch(error => {
                console.error('Error invoking open-image:', error);
            });
    }
}

// Helper function to check if the file is an image
function isImageFile(fileName) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

function updateCurrentPath() {
    const currentPathElement = document.getElementById('currentPath');
    currentPathElement.innerText = `Current Path: ${currentPath || '/'}`;
}

function renderFileTree() {
    const fileExplorer = document.getElementById('fileExplorer');
    fileExplorer.innerHTML = '';

    function createFileItem(item, basePath = '') {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'file-item';
        itemDiv.onclick = () => handleItemClick(item);

        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.textContent = item.isDirectory 
            ? (expandedFolders[`${basePath}/${item.name}`] ? '▼' : '▶') 
            : '📄';
        itemDiv.appendChild(icon);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name;
        itemDiv.appendChild(nameSpan);

        return itemDiv;
    }

    function renderItems(items, container, basePath = '') {
        items.forEach(item => {
            const itemDiv = createFileItem(item, basePath);
            container.appendChild(itemDiv);

            if (item.isDirectory && expandedFolders[`${basePath}/${item.name}`]) {
                const folderContents = document.createElement('div');
                folderContents.className = 'folder-contents';
                renderItems(item.children || [], folderContents, `${basePath}/${item.name}`);
                container.appendChild(folderContents);
            }
        });
    }

    renderItems(files, fileExplorer);
}
console.log('files.js loaded');
// Initial load
fetchFiles(currentPath);
