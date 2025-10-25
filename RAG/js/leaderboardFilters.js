// Global variables
let tableData = {};
const activeFilters = new Set(['gptmini']);
let sortState = {
    'Accuracy': { column: 'Average', direction: 'desc' },
    'Reasoning': { column: 'Average', direction: 'desc' },
    'WithoutRAG': { column: 'Average', direction: 'desc' }
};

// Load data from JSON and initialize tables
async function loadTableData() {
    try {
        const response = await fetch('https://deep-polyu.github.io/RAG/data/leaderboards.json');
        tableData = await response.json();
        console.log('>',tableData.leaderboards,tableData.leaderboards[0])
        initializeTables();
        setupEventListeners();
        updateTable();
    } catch (error) {
        console.error('Error loading table data:', error);
    }
}

// Initialize all tables with data
function initializeTables() {
    // Accuracy table
    renderTable('Accuracy', tableData.leaderboards[0].results, [
        'Rank', 'name', 'Average', 'Trueorfalse', 'Multichoice', 'Multiselect', 'Fillinblank', 'Openended', 
        'Tokencost', 'Timecost', 'Organization', 'retrievaltime', 'date', 'site'
    ]);

    // Reasoning table
    renderTable('Reasoning', tableData.leaderboards[1].results, [
        'Rank', 'name', 'Average', 'Trueorfalse', 'Multichoice', 'Multiselect', 'Fillinblank', 'Openended', 
        'Tokencost', 'Timecost', 'Organization', 'retrievaltime', 'date', 'site'
    ]);

    // WithoutRAG table
    renderTable('WithoutRAG', tableData.leaderboards[2].results, [
        'Rank', 'name', 'Average', 'Reasoning', 'Trueorfalse', 'Multichoice', 'Multiselect', 'Fillinblank', 'Openended', 'site'
    ]);
}

// Render a specific table
function renderTable(tableType, data, columns) {
    const tbody = document.querySelector(`#leaderboard-${tableType} tbody`);
    const thead = document.querySelector(`#leaderboard-${tableType} thead`);
    if (!tbody || !thead) return;

    tbody.innerHTML = '';
    
    // Add sort indicators to table headers
    const headerRow = thead.querySelector('tr');
    headerRow.innerHTML = '';
    
    columns.forEach(column => {
        const th = document.createElement('th');
        th.className = 'sortable';
        
        // Map internal column names to display names
        const displayNames = {
            'name': 'Model',
            'Trueorfalse': 'TF',
            'Multichoice': 'MC',
            'Multiselect': 'MS',
            'Fillinblank': 'FB',
            'Openended': 'OE',
            'Tokencost': 'Token cost',
            'Timecost': 'Time cost',
            'retrievaltime': 'Retrieval time',
            'date': 'Date',
            'site': 'Site'
        };
        
        const displayName = displayNames[column] || column;
        
        // Create sortable header with indicator
        if (column !== 'site' && column !== 'Site') {
            th.innerHTML = `
                <div class="sortable-header" data-column="${column}">
                    ${displayName}
                    <span class="sort-indicator">
                        <i class="fas fa-sort"></i>
                        <i class="fas fa-sort-up" style="display: none;"></i>
                        <i class="fas fa-sort-down" style="display: none;"></i>
                    </span>
                </div>
            `;
            th.querySelector('.sortable-header').addEventListener('click', () => sortTable(tableType, column));
        } else {
            th.textContent = displayName;
        }
        
        headerRow.appendChild(th);
    });

    // Sort data before rendering
    const sortedData = sortData(data, sortState[tableType].column, sortState[tableType].direction);
    
    sortedData.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // Set data attributes for filtering
        row.setAttribute('data-graphrag', item.graphrag);
        row.setAttribute('index', index + 1);
        row.setAttribute('data-gptmini', item.gptmini);
        row.setAttribute('data-tags', item.tags);

        // Create cells for each column
        columns.forEach(column => {
            const cell = document.createElement('td');
            
            if (column === 'Rank') {
                const rankSpan = document.createElement('span');
                rankSpan.className = 'number fw-medium text-primary';
                rankSpan.textContent = index + 1; // Dynamic rank based on sorted position
                cell.appendChild(rankSpan);
            } else if (column === 'name') {
                const modelDiv = document.createElement('div');
                modelDiv.className = 'flex items-center gap-1 name ';
                
                const modelName = document.createElement('span');
                modelName.className = 'model-name font-mono fw-medium';
                modelName.textContent = item[column];
                
                modelDiv.appendChild(modelName);
                cell.appendChild(modelDiv);
            } else if (column === 'site') {
                cell.className = 'centered-text text-center';
                if (item[column]) {
                    const link = document.createElement('a');
                    link.href = item[column];
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-external-link-alt';
                    
                    link.appendChild(icon);
                    cell.appendChild(link);
                }
            } else {
                const valueSpan = document.createElement('span');
                valueSpan.className = 'number fw-medium text-primary';
                valueSpan.textContent = item[column] || '-';
                cell.appendChild(valueSpan);
            }
            
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    // Update sort indicators
    updateSortIndicators(tableType);

    // Add no results row
    const noResultsRow = document.createElement('tr');
    noResultsRow.className = 'no-results';
    noResultsRow.style.display = 'none';
    noResultsRow.innerHTML = `<td colspan="${columns.length}" class="text-center">No entries match the selected filters. Try adjusting your filters.</td>`;
    tbody.appendChild(noResultsRow);
}

// Sort table data
function sortData(data, column, direction) {
    return [...data].sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        
        // Handle numeric values
        if (column !== 'name' && column !== 'site' && column !== 'date') {
            aValue = parseFloat(aValue) || 0;
            bValue = parseFloat(bValue) || 0;
        }
        
        // Handle string values
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }
        
        if (direction === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
    });
}

// Sort table function
function sortTable(tableType, column) {
    const currentSort = sortState[tableType];
    
    if (currentSort.column === column) {
        // Toggle direction if same column
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, default to descending for numeric, ascending for text
        currentSort.column = column;
        currentSort.direction = (column === 'name' || column === 'date') ? 'asc' : 'desc';
    }
    
    // Re-render the table with new sort
    const tableConfigs = {
        'Accuracy': { data: tableData.leaderboards[0].results, columns: ['Rank', 'name', 'Average', 'Trueorfalse', 'Multichoice', 'Multiselect', 'Fillinblank', 'Openended', 'Tokencost', 'Timecost', 'Organization', 'retrievaltime', 'date', 'site'] },
        'Reasoning': { data: tableData.leaderboards[1].results, columns: ['Rank', 'name', 'Average', 'Trueorfalse', 'Multichoice', 'Multiselect', 'Fillinblank', 'Openended', 'Tokencost', 'Timecost', 'Organization', 'retrievaltime', 'date', 'site'] },
        'WithoutRAG': { data: tableData.leaderboards[2].results, columns: ['Rank', 'name', 'Average', 'Reasoning', 'Trueorfalse', 'Multichoice', 'Multiselect', 'Fillinblank', 'Openended', 'site'] }
    };
    
    renderTable(tableType, tableConfigs[tableType].data, tableConfigs[tableType].columns);
    updateTable(); // Re-apply filters after sorting
}

// Update sort indicators
function updateSortIndicators(tableType) {
    const table = document.querySelector(`#leaderboard-${tableType}`);
    if (!table) return;
    
    const headers = table.querySelectorAll('.sortable-header');
    const currentSort = sortState[tableType];
    
    headers.forEach(header => {
        const column = header.getAttribute('data-column');
        const sortIndicator = header.querySelector('.sort-indicator');
        const sortIcon = sortIndicator.querySelector('.fa-sort');
        const sortUpIcon = sortIndicator.querySelector('.fa-sort-up');
        const sortDownIcon = sortIndicator.querySelector('.fa-sort-down');
        
        // Reset all indicators
        sortIcon.style.display = 'inline';
        sortUpIcon.style.display = 'none';
        sortDownIcon.style.display = 'none';
        header.classList.remove('sort-asc', 'sort-desc');
        
        // Set current sort indicator
        if (column === currentSort.column) {
            sortIcon.style.display = 'none';
            if (currentSort.direction === 'asc') {
                sortUpIcon.style.display = 'inline';
                header.classList.add('sort-asc');
            } else {
                sortDownIcon.style.display = 'inline';
                header.classList.add('sort-desc');
            }
        }
    });
}

// Table Update Logic
function updateTable() {
    const leaderboards = document.querySelectorAll('.tabcontent');
    const selectedTags = getSelectedTags();
    const multiselect = document.getElementById('tag-multiselect');
    const allTagsSelected = multiselect ? (selectedTags.length === multiselect.querySelectorAll('.tag-checkbox:not([value="All"])').length) : true;

    leaderboards.forEach(leaderboard => {
        if (leaderboard.style.display !== 'block') return;
        
        const tableRows = leaderboard.querySelectorAll('.data-table tbody tr:not(.no-results)');
        let visibleRowCount = 0;
        
        tableRows.forEach((row, index) => {
            let showRow = true;
            
            // Check filters
            for (const filter of activeFilters) {
                if (row.getAttribute(`data-${filter}`) !== 'true') {
                    showRow = false;
                    break;
                }
            }
            
            // Check tag filter
            if (showRow && !allTagsSelected) {
                const rowTags = (row.getAttribute('data-tags') || '').split(',').map(t => t.trim()).filter(Boolean);
                if (!rowTags.some(tag => selectedTags.includes(tag))) {
                    showRow = false;
                }
            }
            
            // Toggle row visibility and update rank
            row.style.display = showRow ? '' : 'none';
            if (showRow) {
                visibleRowCount++;
                // Update rank number
                const rankCell = row.querySelector('td:first-child .number');
                if (rankCell) {
                    rankCell.textContent = visibleRowCount;
                }
            }
        });
        
        const noResultsMessage = leaderboard.querySelector('.no-results');
        if (visibleRowCount === 0 && (activeFilters.size > 0 || !allTagsSelected)) {
            noResultsMessage.style.display = 'table-row';
        } else {
            noResultsMessage.style.display = 'none';
        }
    });
}

// Filter management
function updateActiveFilters(filter, isChecked) {
    if (isChecked) {
        activeFilters.add(filter);
    } else {
        activeFilters.delete(filter);
    }
    updateTable();
}

// Tag selection functions
function getSelectedTags() {
    const multiselect = document.getElementById('tag-multiselect');
    if (!multiselect) return [];
    const checkboxes = multiselect.querySelectorAll('.tag-checkbox:not([value="All"])');
    return Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
}

function updateTagSelection() {
    const multiselect = document.getElementById('tag-multiselect');
    const checkboxes = multiselect.querySelectorAll('.tag-checkbox:not([value="All"])');
    const checked = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    
    const selected = multiselect.querySelector('.multiselect-selected');
    selected.innerHTML = '';
    
    if (checked.length === 0) {
        selected.innerHTML = '<span class="multiselect-placeholder">Select tags...</span>';
    } else if (checked.length === checkboxes.length) {
        selected.innerHTML = '<span class="multiselect-badge">(All Tags Selected)</span>';
        multiselect.querySelector('.tag-checkbox[value="All"]').checked = true;
    } else {
        checked.forEach(tag => {
            const badge = document.createElement('span');
            badge.className = 'multiselect-badge';
            badge.textContent = tag;
            
            const removeBtn = document.createElement('span');
            removeBtn.className = 'multiselect-badge-remove';
            removeBtn.textContent = '×';
            removeBtn.style.marginLeft = '0.5em';
            removeBtn.style.cursor = 'pointer';
            removeBtn.onclick = function(e) {
                e.stopPropagation();
                const cb = Array.from(multiselect.querySelectorAll('.tag-checkbox')).find(cb => cb.value === tag);
                if (cb) {
                    cb.checked = false;
                    updateTagSelection();
                    updateTable();
                }
            };
            
            badge.appendChild(removeBtn);
            selected.appendChild(badge);
        });
        multiselect.querySelector('.tag-checkbox[value="All"]').checked = false;
    }
    updateTable();
}

function toggleAllTags(allCb) {
    const checkboxes = document.querySelectorAll('.tag-checkbox:not([value="All"])');
    checkboxes.forEach(cb => cb.checked = allCb.checked);
    updateTagSelection();
}

function filterTagOptions(input) {
    const filter = input.value.toLowerCase();
    const multiselect = document.getElementById('tag-multiselect');
    const opts = multiselect.querySelectorAll('.multiselect-option');
    
    opts.forEach(opt => {
        if (opt.textContent.toLowerCase().includes(filter) || opt.querySelector('input').value === 'All') {
            opt.style.display = '';
        } else {
            opt.style.display = 'none';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Filter checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        const filter = checkbox.getAttribute('data-filter');
        checkbox.checked = activeFilters.has(filter);
        
        checkbox.addEventListener('change', function() {
            const filter = this.getAttribute('data-filter');
            updateActiveFilters(filter, this.checked);
        });
    });

    // Tab switching
    document.querySelectorAll('.tablinks').forEach(tab => {
        tab.addEventListener('click', function() {
            setTimeout(updateTable, 0);
        });
    });

    // Multi-select dropdown
    const multiselect = document.getElementById('tag-multiselect');
    if (multiselect) {
        const selected = multiselect.querySelector('.multiselect-selected');
        const options = multiselect.querySelector('.multiselect-options');

        selected.addEventListener('click', function(e) {
            multiselect.classList.toggle('open');
            options.style.display = multiselect.classList.contains('open') ? 'block' : 'none';
        });

        document.addEventListener('click', function(e) {
            if (!multiselect.contains(e.target)) {
                multiselect.classList.remove('open');
                options.style.display = 'none';
            }
        });

        // Initial selection
        updateTagSelection();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadTableData();
});