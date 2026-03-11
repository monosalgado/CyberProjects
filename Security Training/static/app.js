let sessionId = null;
let currentScore = 0;

// Hardcoded logic for scenarios to determine correctness on the frontend before sending to backend
// In a production app, the backend might handle exact validation, but this keeps the API simple.
const SCENARIOS = {
    'phishing': {
        'email_1': { correctAction: 'report', explanation: "The sender domain 'servicedesk-itt.com' is a lookalike domain, and the link points to an IP address instead of a secure corporate portal." }
    },
    'browsing': {
        'login_1': { correctAction: 'close', explanation: "The login URL was missing HTTPS and was misspelled 'googledrive-login.com'. This is a classic credential harvesting page." }
    }
};

document.getElementById('btn-start').addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    if (!username) {
        alert("Please enter a name to begin.");
        return;
    }

    try {
        const res = await fetch('/api/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        sessionId = data.session_id;
        
        // Update UI
        document.getElementById('display-name').textContent = username;
        document.getElementById('user-info').classList.remove('hidden');
        
        switchView('view-intro', 'view-phishing');
    } catch (err) {
        console.error("Failed to start session:", err);
        alert("Error connecting to training server.");
    }
});

async function submitAnswer(moduleId, scenarioId, userAction, defaultIsCorrect) {
    if (!sessionId) return;

    // Determine correctness based on local map
    const scenario = SCENARIOS[moduleId]?.[scenarioId];
    const isCorrect = scenario ? (scenario.correctAction === userAction) : defaultIsCorrect;

    if (isCorrect) currentScore += 50; // simple visual score bump
    document.getElementById('current-score').textContent = currentScore;

    try {
        await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                module_id: moduleId,
                scenario_id: scenarioId,
                user_answer: userAction,
                is_correct: isCorrect
            })
        });

        // Routing logic
        if (moduleId === 'phishing') {
            switchView('view-phishing', 'view-browser');
        } else if (moduleId === 'browsing') {
            await finishTraining();
        }
    } catch (err) {
        console.error("Failed to submit answer:", err);
    }
}

async function finishTraining() {
    switchView('view-browser', 'view-results');
    
    try {
        const res = await fetch(`/api/results/${sessionId}`);
        const data = await res.json();
        
        document.getElementById('final-score').textContent = data.score;
        
        const feedbackMsg = document.getElementById('feedback-message');
        if (data.score === 100) {
            feedbackMsg.textContent = "Excellent work! You demonstrated perfect awareness of modern cyber threats.";
        } else if (data.score > 0) {
            feedbackMsg.textContent = "Good effort, but there is room for improvement. Review your mistakes below.";
        } else {
            feedbackMsg.textContent = "You fell for the simulated attacks! Please review the educational feedback below carefully.";
        }
        
        // Populate breakdown
        const list = document.getElementById('results-list');
        list.innerHTML = '';
        
        data.responses.forEach(r => {
            const li = document.createElement('li');
            li.className = r.is_correct ? 'correct' : 'incorrect';
            
            const scenarioInfo = SCENARIOS[r.module_id]?.[r.scenario_id];
            const explanation = scenarioInfo ? scenarioInfo.explanation : "No further details available.";
            
            const statusIcon = r.is_correct ? '✅' : '❌';
            const actionText = r.is_correct ? 'Correctly Identified' : 'Missed Threat';
            
            li.innerHTML = `
                <div class="res-title">${statusIcon} Module: ${r.module_id.toUpperCase()} - ${actionText}</div>
                <div class="res-desc">
                    <strong>Your Action:</strong> ${r.user_answer}<br>
                    <strong>Feedback:</strong> ${explanation}
                </div>
            `;
            list.appendChild(li);
        });

    } catch (err) {
        console.error("Failed to load results:", err);
    }
}

function switchView(hideId, showId) {
    document.getElementById(hideId).classList.remove('active');
    setTimeout(() => {
        document.getElementById(hideId).classList.add('hidden');
        const showEl = document.getElementById(showId);
        showEl.classList.remove('hidden');
        // trigger reflow for animation
        void showEl.offsetWidth; 
        showEl.classList.add('active');
    }, 300); // match CSS fade out if we had one, or just quick swap
}
