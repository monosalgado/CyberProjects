let lastTotalLogs = 0;
let lastTotalAlerts = 0;
let knownLogIds = new Set();
let knownAlertIds = new Set();

async function fetchData() {
    try {
        const statsRes = await fetch('/api/stats');
        const stats = await statsRes.json();
        
        document.getElementById('total-logs').textContent = stats.total_logs.toLocaleString();
        document.getElementById('total-alerts').textContent = stats.total_alerts.toLocaleString();
        
        // Fetch logs
        const logsRes = await fetch('/api/logs?limit=50');
        const logs = await logsRes.json();
        updateLogsTable(logs);
        
        // Fetch alerts
        const alertsRes = await fetch('/api/alerts?limit=20');
        const alerts = await alertsRes.json();
        updateAlertsTable(alerts);
        
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function updateLogsTable(logs) {
    const tbody = document.getElementById('logs-body');
    // Save current scroll position
    const container = tbody.parentElement.parentElement;
    const isScrolledToTop = container.scrollTop === 0;

    tbody.innerHTML = ''; // Rebuild for simplicity
    
    logs.forEach(log => {
        const tr = document.createElement('tr');
        if (!knownLogIds.has(log.id)) {
            tr.classList.add('row-enter');
            knownLogIds.add(log.id);
        }
        
        let statusClass = '';
        if (log.status >= 200 && log.status < 300) statusClass = 'status-200';
        else if (log.status === 403) statusClass = 'status-403';
        else if (log.status === 404) statusClass = 'status-404';
        else if (log.status >= 500) statusClass = 'status-500';

        tr.innerHTML = `
            <td style="color: var(--text-secondary); white-space: nowrap;">${log.timestamp.split(" ")[0]}</td>
            <td><span class="${statusClass}">${log.status}</span></td>
            <td><strong style="color: var(--accent-cyan);">${log.method}</strong></td>
            <td style="word-break: break-all;">${escapeHTML(log.url)}</td>
            <td style="color: var(--text-secondary);">${log.ip_address}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateAlertsTable(alerts) {
    const tbody = document.getElementById('alerts-body');
    
    // We rebuild table because it's a small dataset (limit 20)
    tbody.innerHTML = '';
    
    if (alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No active threats detected.</td></tr>';
        return;
    }
    
    alerts.forEach(alert => {
        const tr = document.createElement('tr');
        if (!knownAlertIds.has(alert.id)) {
            tr.classList.add('alert-enter');
            knownAlertIds.add(alert.id);
        }
        
        tr.innerHTML = `
            <td style="color: var(--text-secondary); white-space: nowrap;">${alert.timestamp.split(" ")[0]}</td>
            <td style="color: var(--accent-red); font-weight: 600;">${alert.rule_name}</td>
            <td style="font-family: monospace; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">${alert.source_ip}</td>
            <td>${escapeHTML(alert.description)}</td>
        `;
        
        // Add click listener for modal
        tr.addEventListener('click', () => {
            openModal(alert);
        });
        
        tbody.appendChild(tr);
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// --- Modal Logic ---
const modal = document.getElementById("alert-modal");
const spanClose = document.getElementsByClassName("close-modal")[0];

function openModal(alert) {
    document.getElementById("modal-rule").textContent = alert.rule_name;
    document.getElementById("modal-ip").textContent = alert.source_ip;
    document.getElementById("modal-desc").textContent = alert.description;
    document.getElementById("modal-alert-id").value = alert.id;
    modal.style.display = "flex";
}

spanClose.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

document.getElementById("btn-dismiss").addEventListener("click", async () => {
    const alertId = document.getElementById("modal-alert-id").value;
    try {
        await fetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
        modal.style.display = "none";
        fetchData(); // Immediately refresh dashboard
    } catch (err) {
        console.error("Failed to dismiss alert", err);
    }
});

document.getElementById("btn-ban").addEventListener("click", async () => {
    const ip = document.getElementById("modal-ip").textContent;
    const alertId = document.getElementById("modal-alert-id").value;
    const rule = document.getElementById("modal-rule").textContent;
    try {
        // First ban IP
        await fetch('/api/ips/ban', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip_address: ip, reason: `Banned due to rule: ${rule}` })
        });
        
        // Then resolve this specific alert
        await fetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
        
        modal.style.display = "none";
        fetchData();
        alert(`Successfully banned IP: ${ip}`);
    } catch (err) {
        console.error("Failed to ban IP", err);
    }
});

// Initial fetch
fetchData();

// Poll every 1 seconds
setInterval(fetchData, 1000);
