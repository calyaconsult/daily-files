const ALLOWED_EXTENSIONS = new Set(['.txt', '.md', '.html']);
const PROD_DIRECTORY = /^ccch\/[^/]+[_/]production\//;
/**
    Der aktuelle Regex stammt von https://www.perplexity.ai/search/91d96d05-f204-4c0e-b7f7-afd68ad91966
    und ersetzt den Regex, den ChatGPT Sol vorgeschlagen hatte:
   /(^|[\\/])production[^\\/]*([\\/]|$)/i;
*/

// Sprache für Datums- und Zahlenformate
const LOCALE = 'de-CH';

// Pfad zur Dateiliste (relativ zu index.html)
const DATA_URL = 'data/files.json';

// Basis für die Links auf die Dateien. '/' = Links beziehen sich auf die Wurzel des Servers.
// Bei GitHub Pages als Projektseite (benutzer.github.io/datei-archiv-browser/)
// muss hier z. B. '/datei-archiv-browser/' stehen.
const LINK_BASE = '/';

const numberFormat = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

// Gruppierte Daten, werden von render() gefüllt und von logAccu() ausgegeben.
let groupedData = {};

/**
 * Wandelt Windows- oder URL-Pfade in einen URL-tauglichen Pfad um.
 * Jedes Pfadsegment wird einzeln kodiert, damit die Schrägstriche erhalten bleiben.
 */
function toUrlPath(filePath = '') {
    return String(filePath)
        .replace(/\\/g, '/')
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
}

function toDisplayPath(filePath = '') {
    return String(filePath).replace(/\\/g, '/');
}

function formatNumber(value) {
    return numberFormat.format(value);
}

function formatFileCount(count) {
    return `${count} ${count === 1 ? 'Datei' : 'Dateien'}`;
}

function parseDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function getDateKey(dateString) {
    const match = String(dateString).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

function formatDate(dateString) {
    const date = parseDate(dateString);

    if (!date) {
        return 'Unbekanntes Datum';
    }

    return date.toLocaleDateString(LOCALE, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    const match = String(dateString).match(/[T ](\d{2}:\d{2}(?::\d{2})?)/);

    if (match) {
        return match[1];
    }

    const date = parseDate(dateString);

    return date
        ? date.toLocaleTimeString(LOCALE, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
          })
        : '';
}

function groupByDayAndExtension(data) {
    const grouped = {};

    data.forEach(item => {
        const extension = String(item.extension || '').toLowerCase();
        const dateKey = getDateKey(item.lastMod);

        if (!ALLOWED_EXTENSIONS.has(extension) || !dateKey) {
            return;
        }

        if (!grouped[dateKey]) {
            grouped[dateKey] = {
                date: item.lastMod,
                extensions: {}
            };
        }

        if (!grouped[dateKey].extensions[extension]) {
            grouped[dateKey].extensions[extension] = [];
        }

        grouped[dateKey].extensions[extension].push(item);
    });

    // ISO-Datumsschlüssel lassen sich alphabetisch sortieren (neueste zuerst).
    return Object.fromEntries(
        Object.entries(grouped).sort(([dateA], [dateB]) =>
            dateB.localeCompare(dateA)
        )
    );
}

function getExtensionClass(extension) {
    const classes = {
        '.html': 'ext-html',
        '.md': 'ext-md',
        '.txt': 'ext-txt'
    };

    return classes[extension] || 'ext-txt';
}

function createElement(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function createFileItem(file) {
    const item = createElement('div', 'file-item');

    const details = document.createElement('div');
    details.appendChild(
        createElement('div', 'file-name', file.name || 'Unbenannte Datei')
    );

    const pathContainer = createElement('div', 'file-path');
    const displayPath = toDisplayPath(file.path);
    const isProductionFile =
        PROD_DIRECTORY.test(String(file.path || '')) &&
        /\.html$/.test(String(file.name || ''));

    if (isProductionFile) {
        const pathText = createElement('span', 'prod', displayPath);
        pathText.title = 'Produktionsverzeichnis – Link deaktiviert';
        pathContainer.appendChild(pathText);
    } else {
        const link = createElement('a', 'std', displayPath);
        link.href = `${LINK_BASE}${toUrlPath(file.path)}`;
        pathContainer.appendChild(link);
    }

    details.appendChild(pathContainer);

    const metadata = createElement('div', 'file-meta');
    metadata.appendChild(createElement('div', 'file-tag', file.tag || ''));
    metadata.appendChild(
        createElement('div', 'file-time', formatTime(file.lastMod))
    );

    const size = Number(file.sizeKB);
    metadata.appendChild(
        createElement(
            'div',
            'file-size',
            `${formatNumber(Number.isFinite(size) ? size : 0)} KB`
        )
    );

    item.append(details, metadata);

    return item;
}

function createExtensionGroup(extension, files) {
    const group = createElement('div', 'extension-group');

    const header = createElement('div', 'extension-header');
    header.tabIndex = 0;
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', 'true');

    const toggleButton = createElement('button', 'toggle-btn', '▼');
    toggleButton.type = 'button';
    toggleButton.tabIndex = -1;
    toggleButton.setAttribute(
        'aria-label',
        `${extension}-Dateien ein- oder ausklappen`
    );

    const icon = createElement(
        'div',
        `extension-icon ${getExtensionClass(extension)}`,
        extension.replace('.', '')
    );

    const fileCountLabel = formatFileCount(files.length);

    header.append(
        toggleButton,
        icon,
        createElement('span', '', `${extension} (${fileCountLabel})`)
    );

    const fileList = createElement('div', 'file-list');

    files.forEach(file => {
        fileList.appendChild(createFileItem(file));
    });

    group.append(header, fileList);

    return group;
}

function toggleGroup(header) {
    const button = header.querySelector('.toggle-btn');
    const fileList = header.nextElementSibling;
    const isCollapsed = fileList.classList.toggle('hidden');

    button.classList.toggle('collapsed', isCollapsed);
    header.setAttribute('aria-expanded', String(!isCollapsed));
}

function showEmptyState(content) {
    content.innerHTML = `
        <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg"
                 fill="none"
                 viewBox="0 0 24 24"
                 stroke="currentColor"
                 aria-hidden="true">
                <path stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                </path>
            </svg>
            <h3>Keine Dateien gefunden</h3>
            <p>Es wurden keine Dateien mit den Endungen .txt, .md oder .html gefunden.</p>
        </div>
    `;
}

function showLoadError(content, error) {
    console.error(`${DATA_URL} konnte nicht geladen werden:`, error);

    const hint =
        location.protocol === 'file:'
            ? 'Bitte die Seite über einen lokalen Webserver öffnen, z. B. mit «python -m http.server».'
            : '';

    content.innerHTML = `
        <div class="empty-state">
            <h3>Dateien konnten nicht geladen werden</h3>
            <p>Die Datei ${DATA_URL} konnte nicht geladen werden. ${hint}</p>
        </div>
    `;
}

/**
 * Ergänzung: zeigt Dateinamen an, die mehrfach vorkommen (Element #duplicates).
 */
function showDuplicates(grouped) {
    const element = document.getElementById('duplicates');

    if (!element) {
        return;
    }

    const counts = new Map();

    Object.values(grouped).forEach(dayData => {
        Object.values(dayData.extensions).forEach(files => {
            files.forEach(file => {
                const name = file.name || '';
                counts.set(name, (counts.get(name) || 0) + 1);
            });
        });
    });

    const duplicates = [...counts]
        .filter(([name, count]) => name && count > 1)
        .sort((a, b) => b[1] - a[1]);

    if (duplicates.length === 0) {
        element.textContent = '';
        return;
    }

    const MAX_SHOWN = 10;
    const list = duplicates
        .slice(0, MAX_SHOWN)
        .map(([name, count]) => `${name} (${count}×)`)
        .join(', ');
    const rest =
        duplicates.length > MAX_SHOWN
            ? ` … und ${duplicates.length - MAX_SHOWN} weitere`
            : '';

    element.textContent = `⚠️ Doppelte Dateinamen: ${list}${rest}`;
}

/**
 * Ergänzung: Button «Daten als JSON» (onclick="logAccu();" in index.html).
 * Gibt die gruppierten Daten in der Konsole aus und lädt sie als Datei herunter.
 */
function logAccu() {
    const json = JSON.stringify(groupedData, null, 2);
    console.log(json);

    const url = URL.createObjectURL(
        new Blob([json], { type: 'application/json' })
    );
    const link = document.createElement('a');

    link.href = url;
    link.download = 'datei-archiv.json';
    link.target = '_self';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function render() {
    const content = document.getElementById('content');
    const totalFilesElement = document.getElementById('totalFiles');
    const totalDaysElement = document.getElementById('totalDays');
    const totalSizeElement = document.getElementById('totalSize');

    if (
        !content ||
        !totalFilesElement ||
        !totalDaysElement ||
        !totalSizeElement
    ) {
        console.error('Ein oder mehrere benötigte HTML-Elemente fehlen.');
        return;
    }

    content.replaceChildren();

    try {
        const response = await fetch(DATA_URL, {
            headers: {
                Accept: 'application/json'
            },
            cache: 'no-cache'
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new TypeError(`${DATA_URL} muss ein JSON-Array enthalten.`);
        }

        const grouped = groupByDayAndExtension(data);
        groupedData = grouped;
        showDuplicates(grouped);

        let totalFiles = 0;
        let totalSizeKB = 0;

        Object.values(grouped).forEach(dayData => {
            const daySection = createElement('section', 'day-section');

            let dayFileCount = 0;
            let daySizeKB = 0;

            const extensionGroups = Object.entries(dayData.extensions).sort(
                ([extensionA], [extensionB]) =>
                    extensionA.localeCompare(extensionB)
            );

            extensionGroups.forEach(([extension, files]) => {
                files.forEach(file => {
                    const size = Number(file.sizeKB);

                    totalFiles++;
                    dayFileCount++;

                    if (Number.isFinite(size)) {
                        totalSizeKB += size;
                        daySizeKB += size;
                    }
                });
            });

            const dayHeader = createElement('div', 'day-header');
            dayHeader.append(
                createElement('span', '', formatDate(dayData.date)),
                createElement(
                    'span',
                    'date-badge',
                    `${formatFileCount(dayFileCount)} • ${formatNumber(daySizeKB)} KB`
                )
            );

            daySection.appendChild(dayHeader);

            extensionGroups.forEach(([extension, files]) => {
                daySection.appendChild(
                    createExtensionGroup(extension, files)
                );
            });

            content.appendChild(daySection);
        });

        totalFilesElement.textContent = String(totalFiles);
        totalDaysElement.textContent = String(Object.keys(grouped).length);
        totalSizeElement.textContent = formatNumber(totalSizeKB / 1024);

        if (totalFiles === 0) {
            showEmptyState(content);
        }
    } catch (error) {
        totalFilesElement.textContent = '0';
        totalDaysElement.textContent = '0';
        totalSizeElement.textContent = formatNumber(0);

        showLoadError(content, error);
    }
}

// Klicks auf Endungsgruppen per Event Delegation behandeln.
document.addEventListener('click', event => {
    const header = event.target.closest('.extension-header');

    if (header) {
        toggleGroup(header);
    }
});

// Endungsgruppen per Tastatur bedienbar machen (Enter / Leertaste).
document.addEventListener('keydown', event => {
    const header = event.target.closest('.extension-header');

    if (header && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        toggleGroup(header);
    }
});

document.addEventListener('DOMContentLoaded', render);
