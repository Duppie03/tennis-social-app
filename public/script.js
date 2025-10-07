document.addEventListener('DOMContentLoaded', () => {

    // DEFINITIVE MASTER LIST OF ALL MEMBERS
    const MASTER_MEMBER_LIST = [
        { name: "Francois du Plessis", gender: "M", guest: false, committee: "Chairman" },
        { name: "Franco da Silva", gender: "M", guest: false, committee: "Vice Chairman" },
        { name: "Rene da Silva", gender: "F", guest: false, committee: "Treasurer" },
        { name: "Deirdre du Plessis", gender: "F", guest: false, committee: "Secretary" },
        { name: "Reinier du Plessis", gender: "M", guest: false, committee: "Maintenance" },
        { name: "Lehan van Aswegen", gender: "M", guest: false, committee: "Committee Social" },
        { name: "Dave Bester", gender: "M", guest: false, committee: "Committee Social" },
        { name: "Raymond Jasi", gender: "M", guest: false, committee: "Committee" },
        { name: "Rosco Dredge", gender: "M", guest: false },
        { name: "Claire Dredge", gender: "F", guest: false },
        { name: "Karla Agenbag", gender: "F", guest: false },
        { name: "Justin Hammann", gender: "M", guest: false },
        { name: "Carin Venter", gender: "F", guest: false },
        { name: "Ivan Erasmus", gender: "M", guest: false },
        { name: "Reece Erasmus", gender: "M", guest: false },
        { name: "Jan Erasmus", gender: "M", guest: false },
        { name: "Lusanda Chirwa", gender: "F", guest: false },
        { name: "Simon Smith", gender: "M", guest: false },
        { name: "Peter Jones", gender: "M", guest: false },
        { name: "Mary Jane", gender: "F", guest: false },
        { name: "John Doe", gender: "M", guest: false },
        { name: "Sarah Connor", gender: "F", guest: false },
        { name: "Mike Williams", gender: "M", guest: false },
        { name: "Linda Green", gender: "F", guest: false },
        { name: "Tom Harris", gender: "M", guest: false },
        { name: "Patricia King", gender: "F", guest: false },
        { name: "David Wright", gender: "M", guest: false },
        { name: "Susan Hill", gender: "F", guest: false }
    ];
    
    // --- STATE MANAGEMENT ---
    let state = {
        clubMembers: [...MASTER_MEMBER_LIST].sort((a, b) => a.name.localeCompare(b.name)),
        availablePlayers: [],
        courts: [
            { id: 'A', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null },
            { id: 'B', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null },
            { id: 'C', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null },
            { id: 'D', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null },
            { id: 'E', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null },
        ],
        courtSettings: {
            visibleCourts: ['A', 'B', 'C', 'D', 'E']
        },
        selection: {
            gameMode: 'doubles',
            players: [],
            courtId: null
        },
        gameHistory: [],
        reorderHistory: [],
        historyViewMode: 'games',
        statsFilter: {
            gender: 'all',
            sortKey: 'totalDurationMs',
            sortOrder: 'desc'
        },
        onDuty: 'None',
        currentQuoteIndex: 0,
        tennisQuotes: [
            "You only live once, but you get to serve twice.", "Tennis is a perfect combination of violent action taking place in an atmosphere of total tranquility.",
            "The serve is the only shot you have 100% control over.", "Losing is not my enemy, fear of losing is my enemy.",
            "My motto is: I'm alive, so I have to live it.", "Tennis uses the language of life. Advantage, service, fault, break, love.",
            "It's one-on-one out there, man. There ain't no hiding.", "The fifth set is not about tennis, it's about nerves.",
            "What is the single most important quality in a tennis champion? I would have to say desire.", "Success is a journey, not a destination.",
            "If you can keep your head when all about you are losing theirs, it's just possible you haven't grasped the situation.", "I fear no one, but I respect everyone.",
            "Tennis is mostly mental. You win or lose the match before you even go out there.", "A champion is afraid of losing. Everyone else is afraid of winning.",
            "The difference between involvement and commitment is like ham and eggs. The chicken is involved; the pig is committed.", "You've got to get to the stage in life where going for it is more important than winning or losing.",
            "I'm not the best, but I'm capable of beating the best on any given day.", "When you do something best in life, you don't really want to give that up.",
            "The mark of a great champion is to be able to win when you are not playing your best.", "Every point is a new opportunity.",
            "Just go out there and do what you have to do.", "Tennis is a game of inches. And sometimes, those inches are in your head.",
            "It’s not whether you get knocked down, it’s whether you get up.", "Hard work beats talent when talent doesn't work hard.",
            "Don't practice until you get it right. Practice until you can't get it wrong.", "Play each point like your life depends on it.",
            "Champions keep playing until they get it right.", "I never look back, I look forward.",
            "The harder the battle, the sweeter the victory.", "You are never a loser until you quit trying.",
            "To be a great champion you must believe you are the best. If you’re not, pretend you are.", "The pain you feel today will be the strength you feel tomorrow.",
            "If it doesn’t challenge you, it won’t change you.", "Victory is sweetest when you’ve known defeat.",
            "What seems hard now will one day be your warm-up.", "I've failed over and over and over again in my life. And that is why I succeed.",
            "Tennis is life.", "Keep calm and play tennis.",
            "Tennis: the only place where love means nothing.", "I play each point as if it were the last point of the match.",
            "Never give up on a dream just because of the time it will take to accomplish it.", "It's not the will to win that matters—everyone has that. It's the will to prepare to win that matters.",
            "Pressure is a privilege.", "One point at a time.",
            "Control the controllables.", "Tennis requires agility, mental and physical.",
            "My backhand is my weapon.", "A perfect volley is a work of art.",
            "There's no place like the court.", "Tennis is a dance between two players."
        ]
    };

    // --- DOM ELEMENTS ---
    const headerClock = document.getElementById('header-clock');
    const availablePlayersSection = document.getElementById('availablePlayersSection');
    const availablePlayersList = document.getElementById('availablePlayersList');
    const courtGrid = document.getElementById('court-grid');
    const infoBar = document.getElementById('info-bar');
    const infoBarText = document.getElementById('info-bar-text');
    const modeDoublesBtn = document.getElementById('mode-doubles');
    const modeSinglesBtn = document.getElementById('mode-singles');
    const chooseTeamsModal = document.getElementById('choose-teams-modal');
    const modalPlayerList = document.getElementById('modal-player-list');
    const modalConfirmBtn = document.getElementById('modal-confirm-teams-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const cancelConfirmModal = document.getElementById('cancel-confirm-modal');
    const modalBtnYesConfirm = document.getElementById('modal-btn-yes-confirm');
    const modalBtnNo = document.getElementById('modal-btn-no');
    const checkInModal = document.getElementById('check-in-modal');
    const checkInList = document.getElementById('check-in-list');
    const checkInCancelBtn = document.getElementById('check-in-cancel-btn');
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutModal = document.getElementById('check-out-modal');
    const checkOutList = document.getElementById('check-out-list');
    const checkOutBtn = document.getElementById('checkOutBtn');
    const checkOutCloseBtn = document.getElementById('check-out-cancel-btn');
    const historyBtn = document.getElementById('historyBtn');
    const historyPage = document.getElementById('history-page');
    const historyList = document.getElementById('history-list');
    const historyToggleViewBtn = document.getElementById('history-toggle-view');
    const historyCloseBtn = document.getElementById('history-close-btn');
    const endGameModal = document.getElementById('end-game-modal');
    const endGameTeams = document.getElementById('end-game-teams');
    const endGameConfirmBtn = document.getElementById('end-game-confirm-btn');
    const endGameCancelBtn = document.getElementById('end-game-cancel-btn');
    const tieBreakerArea = document.getElementById('tie-breaker-area');
    const scoreSection = document.getElementById('score-section');
    const winningScoreInput = document.getElementById('winning-score');
    const losingScoreInput = document.getElementById('losing-score');
    const winnerTiebreakInput = document.getElementById('winner-tiebreak');
    const loserTiebreakInput = document.getElementById('loser-tiebreak');
    const endGameTimestamp = document.getElementById('end-game-timestamp');
    
    // KEYPAD ELEMENTS AND STATE
    const customKeypadModal = document.getElementById('custom-keypad-modal');
    const keypadDisplay = document.getElementById('keypad-display');
    const keypadButtons = customKeypadModal.querySelectorAll('.keypad-btn');
    const keypadConfirmBtn = document.getElementById('keypad-confirm-btn');
    const keypadCancelBtn = document.getElementById('keypad-cancel-btn');
    let activeInput = null;
    let keypadConfig = {};

    // GUEST/ALPHA KEYPAD ELEMENTS
    const addGuestBtn = document.getElementById('add-guest-btn');
    const guestNameModal = document.getElementById('guest-name-modal');
    const guestNameInput = document.getElementById('guest-name-input');
    const guestSurnameInput = document.getElementById('guest-surname-input');
    const guestGenderRadios = document.querySelectorAll('input[name="guest-gender"]');
    const guestConfirmBtn = document.getElementById('guest-confirm-btn');
    const guestCancelBtn = document.getElementById('guest-cancel-btn');
    
    const customAlphaKeypadModal = document.getElementById('custom-alpha-keypad-modal');
    const alphaKeypadDisplay = document.getElementById('alpha-keypad-display');
    const alphaKeypadGrid = document.getElementById('alpha-keypad-grid');
    let activeAlphaInput = null;

    // ADMIN MODAL ELEMENTS
    const adminSettingsModal = document.getElementById('admin-settings-modal');
    const committeeMemberList = document.getElementById('committee-member-list');
    const courtAvailabilityList = document.getElementById('court-availability-list');
    const adminCloseBtn = document.getElementById('admin-close-btn');
    const reorderPlayersModal = document.getElementById('reorder-players-modal');
    const reorderPlayersList = document.getElementById('reorder-players-list');
    const reorderPlayersBtn = document.getElementById('reorder-players-btn');
    const reorderSaveBtn = document.getElementById('reorder-save-btn');
    const reorderCancelBtn = document.getElementById('reorder-cancel-btn');
    const reorderLogModal = document.getElementById('reorder-log-modal');
    const reorderHistoryList = document.getElementById('reorder-history-list');
    const viewReorderLogBtn = document.getElementById('view-reorder-log-btn');
    const reorderLogCloseBtn = document.getElementById('reorder-log-close-btn');
    let tempPlayerOrder = [];

    // --- DYNAMIC HEIGHT FUNCTION ---
    function setPlayerListHeight() {
        const referenceCard = courtGrid.querySelector('.court-card, .summary-card');
        if (!referenceCard) {
            availablePlayersSection.style.height = 'auto';
            return;
        }
        const courtGridStyles = window.getComputedStyle(courtGrid);
        const cardHeight = referenceCard.offsetHeight;
        const gridGap = parseFloat(courtGridStyles.gap);
        const totalHeight = (cardHeight * 2) + gridGap;
        availablePlayersSection.style.height = `${totalHeight}px`;
    }

    // --- CORE FUNCTIONS ---
    function getAllKnownPlayers() { const playersOnCourt = state.courts.flatMap(court => court.players); const allPlayers = [ ...state.clubMembers, ...state.availablePlayers, ...playersOnCourt ]; const uniquePlayers = Array.from(new Map(allPlayers.map(p => [p.name, p])).values()); state.gameHistory.forEach(game => { [...game.teams.team1, ...game.teams.team2].forEach(name => { if (!uniquePlayers.some(p => p.name === name)) { uniquePlayers.push({ name: name, gender: '?', guest: true }); } }); }); return uniquePlayers; }
    function getPlayerByName(name) { let player = state.availablePlayers.find(p => p.name === name); if (player) return player; player = MASTER_MEMBER_LIST.find(p => p.name === name); if (player) return player; for (const court of state.courts) { player = court.players.find(p => p.name === name); if (player) return player; } return { name: name, gender: '?', guest: true }; }
    function getPlayerNames(playerObjects) { return playerObjects.map(p => p.name); }
    function totalPlayersAtClub(){ let total = state.availablePlayers.length; state.courts.forEach(court => { if (court.players) { total += court.players.length; } }); return total; }
    function saveState(){ localStorage.setItem("tennisSocialAppState", JSON.stringify(state)); }
    function loadState(){
        const savedState = localStorage.getItem("tennisSocialAppState");
        if (savedState) {
            const loaded = JSON.parse(savedState);
            state = { ...state, ...loaded };

            if (!state.courtSettings) {
                state.courtSettings = {
                    visibleCourts: ['A', 'B', 'C', 'D', 'E']
                };
            }
            
            state.gameHistory = state.gameHistory || [];
            state.reorderHistory = state.reorderHistory || [];
            state.statsFilter = state.statsFilter || { gender: 'all', sortKey: 'totalDurationMs', sortOrder: 'desc' };
            const ensurePlayerObjects = (playerList, defaultList) => { return playerList.map(player => { if (typeof player === 'string') { const defaultPlayer = defaultList.find(p => p.name === player); return defaultPlayer || { name: player, gender: '?', guest: true }; } return player; }); };
            const checkedInNames = new Set(getPlayerNames(state.availablePlayers));
            state.courts.forEach(court => court.players.forEach(p => checkedInNames.add(p.name)));
            state.clubMembers = MASTER_MEMBER_LIST.filter(p => !checkedInNames.has(p.name));
            state.clubMembers.sort((a,b) => a.name.localeCompare(b.name));
            state.availablePlayers = ensurePlayerObjects(state.availablePlayers, MASTER_MEMBER_LIST);
            state.courts.forEach(court => {
                court.players = ensurePlayerObjects(court.players, MASTER_MEMBER_LIST);
                court.teams.team1 = ensurePlayerObjects(court.teams.team1, MASTER_MEMBER_LIST);
                court.teams.team2 = ensurePlayerObjects(court.teams.team2, MASTER_MEMBER_LIST);
                if (court.status === "game_pending" && court.autoStartTimeTarget) {
                    const delay = court.autoStartTimeTarget - Date.now();
                    if (delay > 0) {
                        court.autoStartTimer = setTimeout(() => handleStartGame(court.id), delay);
                    } else {
                        handleStartGame(court.id);
                    }
                }
            });
        }
    }
    function updateHeaderClock(){ const date = new Date(); const weekday = date.toLocaleDateString("en-ZA", { weekday: "long" }); const time = date.toLocaleTimeString("en-ZA", { hour: "numeric", minute: "2-digit" }); headerClock.textContent = `${weekday}, ${time}`; }
    function updateTimers(){
        updateHeaderClock();
        state.courts.forEach(court => {
            const timerEl = document.getElementById(`timer-${court.id}`);
            if (timerEl) {
                if (court.status === 'in_progress' && court.gameStartTime) {
                    const elapsed = Date.now() - court.gameStartTime;
                    const hours = Math.floor(elapsed / 3600000);
                    const minutes = Math.floor((elapsed % 3600000) / 60000);
                    timerEl.textContent = `${String(hours).padStart(2, "0")}h${String(minutes).padStart(2, "0")}m`;
                } else if (court.status === 'game_pending' && court.autoStartTimeTarget) {
                    const remaining = court.autoStartTimeTarget - Date.now();
                    if (remaining < 0) return timerEl.textContent = "00:00";
                    const minutes = Math.floor(remaining / 60000);
                    const seconds = Math.floor((remaining % 60000) / 1000);
                    timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
                }
            }
        });
    }
    function calculatePlayerPlaytime() { const stats = calculatePlayerStats(); const now = Date.now(); state.courts.forEach(court => { if (court.status === 'in_progress' && court.gameStartTime) { const elapsed = now - court.gameStartTime; court.players.forEach(player => { const name = player.name; stats[name] = stats[name] || { played: 0, won: 0, totalDurationMs: 0 }; stats[name].totalDurationMs += elapsed; }); } }); return stats; }

    function createCourtCard(court) {
        const isSelectable = state.selection.players.length > 0 && court.status === 'available';
        const isSelected = court.id === state.selection.courtId;
        
        const courtCard = document.createElement('div');
        courtCard.className = `court-card status-${court.status} ${isSelected ? 'selected' : ''} ${isSelectable ? 'selectable' : ''}`;
        courtCard.dataset.courtId = court.id;
        
        let cancelBtnHTML = '';
        if (court.status !== 'available' && !isSelected) {
            cancelBtnHTML = `<button class="cancel-game-btn on-court" title="Cancel Game" data-action="cancel-game-setup">X</button>`;
        }

        let timerHTML = '';
        if (court.status === 'in_progress' || court.status === 'game_pending') {
            timerHTML = `<span class="game-timer" id="timer-${court.id}">00:00</span>`;
        }
        
        const statusText = isSelected ? 'SELECTED' : court.status.replace(/_/g, ' ');

        const formatName = (playerObj) => playerObj ? playerObj.name.split(' ').join('<br>') : '';
        let playerSpotsHTML = '';
        if (court.gameMode === 'singles') {
            playerSpotsHTML = `
                <div class="player-spot single-player top-row"><span>${formatName(court.teams.team1[0])}</span></div>
                <div class="player-spot single-player bottom-row"><span>${formatName(court.teams.team2[0])}</span></div>
            `;
        } else {
            playerSpotsHTML = `
                <div class="player-spot top-row" data-player-pos="top-left"><span>${formatName(court.teams.team1[0])}</span></div>
                <div class="player-spot top-row" data-player-pos="top-right"><span>${formatName(court.teams.team1[1])}</span></div>
                <div class="player-spot bottom-row" data-player-pos="bottom-left"><span>${formatName(court.teams.team2[0])}</span></div>
                <div class="player-spot bottom-row" data-player-pos="bottom-right"><span>${formatName(court.teams.team2[1])}</span></div>
            `;
        }

        let overlayHTML = '';
        if (isSelected) {
            overlayHTML = `
                <div class="confirmation-overlay">
                    <button class="court-confirm-btn cancel" data-action="cancel-selection">Cancel</button>
                    <button class="court-confirm-btn confirm" data-action="confirm-selection">Confirm</button>
                </div>
            `;
        } else if (court.status === 'selecting_teams') {
            overlayHTML = `
                <div class="team-selection-overlay">
                    <button class="court-confirm-btn randomize" data-action="randomize-teams">Randomize Teams</button>
                    <button class="court-confirm-btn choose" data-action="choose-teams">Choose Teams</button>
                </div>
            `;
        } else if (court.status === 'game_pending') {
            overlayHTML = `
                <div class="game-action-overlay">
                    <button class="court-confirm-btn confirm" data-action="start-game">Start Game</button>
                </div>
            `;
        } else if (court.status === 'in_progress') {
            overlayHTML = `
                <div class="game-action-overlay">
                    <button class="court-confirm-btn cancel" data-action="end-game">End Game</button>
                </div>
            `;
        }

        courtCard.innerHTML = `
            <div class="card-header header-status-${court.status}">
                <h3>Court ${court.id}</h3>
                ${timerHTML}
                <div class="header-controls">
                    <span class="status-tag">${statusText}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="court-inner">
                    <div class="center-service-line"></div>
                    ${playerSpotsHTML}
                </div>
                ${overlayHTML}
                ${cancelBtnHTML}
            </div>`;
        
        return courtCard;
    }

    function createSummaryCard() {
        const total = totalPlayersAtClub();
        const available = state.availablePlayers.length;
        const onCourt = total - available;
        const courtsInPlay = state.courts.filter(c => c.status !== 'available' && state.courtSettings.visibleCourts.includes(c.id)).length;
        const totalCourts = state.courtSettings.visibleCourts.length;
        
        const onDutyName = state.onDuty === 'None' ? 'Nobody' : state.onDuty;

        return `
            <div class="summary-card">
                <div class="card-header">
                    <h3>Information</h3>
                    <div class="header-controls">
                         <button class="settings-btn" id="settings-btn" title="Admin Settings">⚙️</button>
                    </div>
                </div>
                <div class="card-body summary-body">
                    <div class="on-duty-section">
                        <div class="duty-image-placeholder">🎾</div>
                        <div class="duty-info">
                            <p class="duty-name">${onDutyName}</p>
                            <p class="duty-label">Is On Duty</p>
                        </div>
                    </div>

                    <div class="summary-stats">
                        <p>Total Players: <strong style="float: right;">${total}</strong></p>
                        <p>Available Queue: <strong style="float: right; color: var(--confirm-color);">${available}</strong></p>
                        <p>On Court: <strong style="float: right; color: var(--cancel-color);">${onCourt}</strong></p>
                        <p>Courts Used: <strong style="float: right;">${courtsInPlay} / ${totalCourts}</strong></p>
                    </div>

                    <div class="quote-section">
                        <p id="quote-text" class="quote-text"></p>
                    </div>
                </div>
            </div>
        `;
    }

    function updateGameModeBasedOnPlayerCount() {
        const availableCount = state.availablePlayers.length;
        let newMode = state.selection.gameMode;
        let modeChanged = false;
        
        if (availableCount < 4) {
            newMode = 'singles';
        } else if (availableCount >= 4) {
            newMode = 'doubles';
        }

        if (newMode !== state.selection.gameMode) {
            state.selection.gameMode = newMode;
            modeChanged = true;
        }

        const requiredPlayers = newMode === 'doubles' ? 4 : 2;
        if (modeChanged || state.selection.players.length > requiredPlayers) {
            state.selection.players = [];
            state.selection.courtId = null;
        }
    }
    
    function render(){
        const {gameMode, players: selectedPlayerNames, courtId: selectedCourtId} = state.selection;
        const requiredPlayers = gameMode === "doubles" ? 4 : 2;
        const playerStats = calculatePlayerPlaytime();
        
        availablePlayersList.innerHTML = "";
        
        if (state.availablePlayers.length === 0 && selectedPlayerNames.length === 0){
            const li = document.createElement("li");
            li.className = "waiting-message";
            li.textContent = totalPlayersAtClub() > 0 ? "All players are on court." : "Waiting For Players To Check In...";
            availablePlayersList.appendChild(li);
        } else {
            state.availablePlayers.forEach((player, index) => {
                const li = document.createElement("li");
                const playerName = player.name;
                
                const playtime = playerStats[playerName] ? formatDuration(playerStats[playerName].totalDurationMs) : '00h00m';
                
                li.innerHTML = `
                    <div style="flex-grow: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;">${playerName}</div>
                    <div style="font-weight: normal; margin-right: 1rem; flex-shrink: 0; width: 25px; text-align: center;">${player.gender}</div>
                    <div style="font-size: 0.9em; color: #6c757d; flex-shrink: 0;">${playtime}</div>
                `;
                li.dataset.playerName = playerName;

                if (index === 0) li.classList.add("first-player");

                const isSelected = selectedPlayerNames.includes(playerName);

                if (isSelected) {
                    li.classList.add("selected");
                } else {
                    const isSelectionFull = selectedPlayerNames.length === requiredPlayers;
                    const isOutsideTop8 = index >= 8;

                    if (isSelectionFull || isOutsideTop8) {
                        li.classList.add("disabled");
                    }
                }
                
                availablePlayersList.appendChild(li);
            });
        }
        
        if (state.availablePlayers.length > 0 && state.availablePlayers.length < 4) {
            const li = document.createElement("li");
            li.textContent = "Waiting For More Players...";
            li.className = "waiting-message";
            availablePlayersList.appendChild(li);
        }
        
        courtGrid.innerHTML = "";
        
        courtGrid.insertAdjacentHTML('afterbegin', createSummaryCard());
        
        state.courts.filter(court => state.courtSettings.visibleCourts.includes(court.id)).forEach(court => {
            const card = createCourtCard(court);
            courtGrid.appendChild(card);
        });
        
        const courtInSetup = state.courts.find(c => c.status === "selecting_teams" || c.status === "game_pending");
        const courtSelectingTeams = state.courts.find(c => c.status === "selecting_teams");
        const courtGamePending = state.courts.find(c => c.status === "game_pending");
        const firstAvailablePlayer = state.availablePlayers[0] ? state.availablePlayers[0].name : null;
        const remainingToSelect = requiredPlayers - selectedPlayerNames.length;
        const allCourtsBusy = state.courts.filter(c => state.courtSettings.visibleCourts.includes(c.id)).every(c => c.status !== "available");

        infoBar.classList.remove("blue-theme", "green-theme", "yellow-theme", "red-theme", "hidden");
        
        if (courtSelectingTeams) {
            infoBar.classList.remove("hidden");
            infoBar.classList.add("yellow-theme");
            infoBarText.textContent = `Court ${courtSelectingTeams.id}: Choose how to form teams on the court card.`;
        } else if (courtGamePending) {
            infoBar.classList.remove("hidden");
            infoBar.classList.add("yellow-theme");
            infoBarText.textContent = `Court ${courtGamePending.id}: Teams are set! Press 'Start Game' on the court card.`;
        } else if (selectedPlayerNames.length === 0 && totalPlayersAtClub() < 2) {
            infoBar.classList.remove("hidden");
            infoBar.classList.add("red-theme");
            infoBarText.textContent = "Waiting For Players To Check In...";
        } else if (selectedPlayerNames.length === 0 && allCourtsBusy) {
            infoBar.classList.remove("hidden");
            infoBar.classList.add("red-theme");
            infoBarText.textContent = "All courts are in use. Please wait for a court to become available.";
        } else if (selectedPlayerNames.length === 0 && firstAvailablePlayer) {
            infoBar.classList.remove("hidden");
            infoBar.classList.add("green-theme");
            infoBarText.textContent = `${firstAvailablePlayer}, please select players for a game.`;
        } else if (selectedPlayerNames.length > 0 && selectedPlayerNames.length < requiredPlayers) {
             infoBar.classList.remove("hidden");
             infoBar.classList.add("green-theme");
             infoBarText.textContent = `Please select ${remainingToSelect} more player(s).`;
        } else if (selectedPlayerNames.length === requiredPlayers && !selectedCourtId) {
             infoBar.classList.remove("hidden");
             infoBar.classList.add("green-theme");
             infoBarText.textContent = "Please select an available court.";
        } else if (selectedPlayerNames.length === requiredPlayers && selectedCourtId) {
             infoBar.classList.remove("hidden");
             infoBar.classList.add("yellow-theme");
             infoBarText.textContent = `Court ${selectedCourtId} selected. Confirm on the court card below.`;
        } else {
            infoBar.classList.add("hidden");
        }
        
        modeDoublesBtn.classList.toggle("active", gameMode === "doubles");
        modeSinglesBtn.classList.toggle("active", gameMode === "singles");
        modeDoublesBtn.disabled = state.availablePlayers.length < 4;

        availablePlayersSection.classList.toggle("locked", !!courtInSetup || (selectedPlayerNames.length === 0 && allCourtsBusy));
        // NEW: Call the function to re-initialize elements on the summary card
        initSummaryCardElements();

        setTimeout(setPlayerListHeight, 0);
    }
    
    function handleCourtGridClick(e){
        const courtCard = e.target.closest(".court-card");
        if (!courtCard) return;

        const action = e.target.dataset.action;
        const courtId = courtCard.dataset.courtId;

        if (action === 'confirm-selection') {
            handleConfirmSelection();
            return;
        }
        if (action === 'cancel-selection') {
            handleCancelSelection();
            return;
        }
        if (action === 'randomize-teams') {
            handleRandomizeTeams(courtId);
            return;
        }
        if (action === 'choose-teams') {
            handleChooseTeams(courtId);
            return;
        }
        if (action === 'cancel-game-setup') {
            handleCancelGame(courtId);
            return;
        }
        if (action === 'start-game') {
            handleStartGame(courtId);
            return;
        }
        if (action === 'end-game') {
            handleEndGame(courtId);
            return;
        }

        const {gameMode, players: selectedPlayerNames} = state.selection;
        const requiredPlayers = gameMode === "doubles" ? 4 : 2;

        if (courtCard.classList.contains("selectable") && selectedPlayerNames.length === requiredPlayers) {
            state.selection.courtId = courtId === state.selection.courtId ? null : courtId;
            render();
            saveState();
        }
    }
    
    function formatDuration(ms) { if (ms === 0) return "00h00m"; const totalMinutes = Math.floor(ms / 60000); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; return `${String(hours).padStart(2, "0")}h${String(minutes).padStart(2, "0")}m`; }
    function calculatePlayerStats(){ const stats = {}; state.gameHistory.forEach(game => { const allPlayers = [...game.teams.team1, ...game.teams.team2]; const winnerTeam = game.winner === "team1" ? game.teams.team1 : game.teams.team2; const loserTeam = game.winner === "team1" ? game.teams.team2 : game.teams.team1; const [hStr, mStr] = game.duration.split('h').map(s => s.replace('m', '')); const gameDuration = (parseInt(hStr, 10) * 3600000) + (parseInt(mStr, 10) * 60000); const winnerScore = game.score.team1 > game.score.team2 ? game.score.team1 : game.score.team2; const loserScore = game.score.team1 > game.score.team2 ? game.score.team2 : game.score.team1; allPlayers.forEach(player => { stats[player] = stats[player] || { played: 0, won: 0, totalDurationMs: 0 }; stats[player].totalDurationMs += gameDuration; if (winnerTeam.includes(player)) { stats[player].played += winnerScore + loserScore; stats[player].won += winnerScore; } else if (loserTeam.includes(player)) { stats[player].played += winnerScore + loserScore; stats[player].won += loserScore; } }); }); return stats; }
    function formatWinPercentage(played, won){ return played === 0 ? "N/A" : `${Math.round(won / played * 100)}%`; }
    function handleSort(key) { if (state.statsFilter.sortKey === key) { state.statsFilter.sortOrder = state.statsFilter.sortOrder === 'asc' ? 'desc' : 'asc'; } else { state.statsFilter.sortKey = key; state.statsFilter.sortOrder = key === 'name' ? 'asc' : 'desc'; } renderHistory(); saveState(); }
    function renderHistory(){ 
        const stats = calculatePlayerStats(); 
        const allKnownPlayers = getAllKnownPlayers(); 
        let players = Object.keys(stats).filter(name => { 
            const playerObj = allKnownPlayers.find(p => p.name === name); 
            if (!playerObj) return true; 
            if (state.statsFilter.gender === 'all') return true; 
            return playerObj.gender === state.statsFilter.gender; 
        }); 
        
        players.sort((a, b) => { 
            const statA = stats[a]; 
            const statB = stats[b]; 
            let compareValue; 
            if (state.statsFilter.sortKey === 'name') { 
                compareValue = a.localeCompare(b); 
            } else if (state.statsFilter.sortKey === 'totalDurationMs') { 
                compareValue = statA.totalDurationMs - statB.totalDurationMs; 
            } else if (state.statsFilter.sortKey === 'winPercentage') { 
                const aWP = statA.played > 0 ? statA.won / statA.played : 0; 
                const bWP = statB.played > 0 ? statB.won / statB.played : 0; 
                compareValue = aWP - bWP; 
            } 
            return state.statsFilter.sortOrder === 'asc' ? compareValue : -compareValue; 
        }); 
        
        historyList.innerHTML = ""; 
        document.querySelector("#history-page h3").textContent = state.historyViewMode === "games" ? "Game History" : "Player Stats"; 
        historyToggleViewBtn.textContent = state.historyViewMode === "games" ? "Show Player Stats" : "Show Game History"; 
        historyToggleViewBtn.classList.toggle("secondary", state.historyViewMode === "stats"); 
        let contentHTML = ""; 
        
        if (state.historyViewMode === "stats") { 
            const genderFilterHTML = ` 
                <div class="gender-selector" style="justify-content: center; margin-bottom: 1rem;"> 
                    <div class="radio-group" style="padding: 0; background: none;"> 
                        <label> <input type="radio" name="stats-gender-filter" value="all" ${state.statsFilter.gender === 'all' ? 'checked' : ''}> All </label> 
                        <label> <input type="radio" name="stats-gender-filter" value="M" ${state.statsFilter.gender === 'M' ? 'checked' : ''}> Male </label> 
                        <label> <input type="radio" name="stats-gender-filter" value="F" ${state.statsFilter.gender === 'F' ? 'checked' : ''}> Female </label> 
                    </div> 
                </div> 
            `; 
            contentHTML += genderFilterHTML; 
            
            const getSortIcon = (key) => { 
                if (state.statsFilter.sortKey !== key) return ''; 
                return state.statsFilter.sortOrder === 'asc' ? ' 🔼' : ' 🔽'; 
            }; 
            
            if (players.length === 0) { 
                contentHTML += '<p style="text-align: center; color: #6c757d;">No completed games match this filter.</p>'; 
            } else { 
                contentHTML += ` 
                    <div class="history-item" style="border-bottom: 2px solid var(--primary-blue); font-weight: bold; background-color: #f8f9fa;"> 
                        <div class="history-details" style="margin-bottom: 0;"> 
                            <button class="action-btn sort-btn" data-sort-key="name" style="flex: 1; min-width: 0; padding: 0.5rem; background: none; color: var(--dark-text); border: none; text-align: left;">Player Name${getSortIcon('name')}</button> 
                            <span style="display: flex; gap: 2rem; flex-shrink: 0;"> 
                                <button class="action-btn sort-btn" data-sort-key="totalDurationMs" style="min-width: 90px; padding: 0.5rem; background: none; color: var(--dark-text); border: none;">Time Played${getSortIcon('totalDurationMs')}</button> 
                                <button class="action-btn sort-btn" data-sort-key="winPercentage" style="min-width: 140px; padding: 0.5rem; background: none; color: var(--dark-text); border: none; text-align: right;">Score (W/P)${getSortIcon('winPercentage')}</button> 
                            </span> 
                        </div> 
                    </div> 
                `; 
                
                players.forEach(player => { 
                    const playerStats = stats[player]; 
                    const playerObj = allKnownPlayers.find(p => p.name === player); 
                    const genderDisplay = playerObj ? playerObj.gender : '?'; 
                    contentHTML += ` 
                        <div class="history-teams" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding: 0.8rem 1rem; color: var(--dark-text);"> 
                            <span style="flex-grow: 1;">${player} <span style="font-style: italic; color: #aaa;">(${genderDisplay})</span></span> 
                            <span style="display: flex; gap: 2rem; font-weight: 500; flex-shrink: 0;"> 
                                <span style="min-width: 90px; text-align: right;">${formatDuration(playerStats.totalDurationMs)}</span> 
                                <span style="min-width: 140px; text-align: right;">${playerStats.won}/${playerStats.played} (${formatWinPercentage(playerStats.played, playerStats.won)})</span> 
                            </span> 
                        </div> 
                    `; 
                }); 
            } 
            
            historyList.innerHTML = `<div style="padding: 0.5rem 0;">${contentHTML}</div>`; 
            document.querySelectorAll('input[name="stats-gender-filter"]').forEach(radio => { 
                radio.removeEventListener('change', handleStatsFilterChange); 
                radio.addEventListener('change', handleStatsFilterChange); 
            }); 
            document.querySelectorAll('.sort-btn').forEach(btn => { 
                btn.removeEventListener('click', handleSortClick); 
                btn.addEventListener('click', handleSortClick); 
            }); 
            
        } else { 
            if (state.gameHistory.length === 0) { 
                historyList.innerHTML = '<p style="text-align: center; color: #6c757d;">No games have been completed yet.</p>'; 
            } else { 
                contentHTML += ` 
                    <div class="history-item" style="border-bottom: 2px solid var(--primary-blue); font-weight: bold; background-color: #f8f9fa;"> 
                        <div class="history-details" style="margin-bottom: 0;"> 
                            <span>Game / Duration</span> 
                            <span>Score / Time</span>
                        </div> 
                    </div> 
                `; 
                
                [...state.gameHistory].reverse().forEach(game => { 
                    const item = document.createElement("div"); 
                    item.className = "history-item"; 

                    // FIX: Format the game's recorded end time for display
                    const endTime = new Date(game.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    const isTeam1Winner = game.winner === "team1"; 
                    const team1Players = game.teams.team1.join(" & "); 
                    const team2Players = game.teams.team2.join(" & "); 
                    let scoreDisplay = `${game.score.team1} - ${game.score.team2}`; 
                    if (game.score.tiebreak1 !== null) { 
                        scoreDisplay += ` (${game.score.tiebreak1}-${game.score.tiebreak2})`; 
                    } 
                    
                    item.innerHTML = ` 
                        <div class="history-details"> 
                            <span>Court ${game.court} - ${game.duration}</span> 
                            <span>${scoreDisplay} @ ${endTime}</span> 
                        </div> 
                        <div class="history-teams"> 
                            <p class="${isTeam1Winner ? "winner" : ""}">Team 1: ${team1Players}</p> 
                            <p class="${isTeam1Winner ? "" : "winner"}">Team 2: ${team2Players}</p> 
                        </div> 
                    `; 
                    historyList.appendChild(item); 
                }); 
                historyList.insertAdjacentHTML('afterbegin', contentHTML); 
            } 
        } 
    }
    function renderReorderHistory() {
        reorderHistoryList.innerHTML = "";
        
        if (state.reorderHistory.length === 0) {
            reorderHistoryList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 2rem;">No queue reorder actions have been logged.</p>';
            return;
        }

        // Iterate through history, newest first
        [...state.reorderHistory].reverse().forEach(entry => {
            const dateTime = new Date(entry.endTime).toLocaleString();
            let playersHtml = '';

            // Iterate through players involved in this session
            for (const [name, log] of Object.entries(entry.players)) {
                // Only display players who actually moved (start position !== current position)
                if (log.startPosition !== log.currentPosition) {
                    playersHtml += `
                        <p style="margin: 0.25rem 0; font-size: 0.95rem; display: flex; justify-content: space-between;">
                            <span style="font-weight: 500;">${name}</span>
                            <span style="color: var(--primary-blue);">Moved from #${log.startPosition + 1} to #${log.currentPosition + 1}</span>
                        </p>
                    `;
                }
            }

            // Only render the entry if at least one player moved
            if (playersHtml) {
                const details = document.createElement('div');
                details.className = 'history-item';
                details.style.textAlign = 'left';
                details.innerHTML = `
                    <div class="history-details" style="margin-bottom: 0.75rem;">
                        <span style="color: var(--primary-blue);">${entry.adminAction} (${dateTime})</span>
                    </div>
                    <div style="padding-left: 1rem;">
                        ${playersHtml}
                    </div>
                `;
                reorderHistoryList.appendChild(details);
            }
        });
    }
    function handleStatsFilterChange(e) { state.statsFilter.gender = e.target.value; renderHistory(); saveState(); }
    function handleSortClick(e) { const key = e.target.dataset.sortKey; if (key) { handleSort(key); } }
    function handleCancelSelection(){ state.selection.players = []; state.selection.courtId = null; render(); saveState(); }
    function handleModeChange(mode){ state.selection.gameMode = mode; state.selection.players = []; state.selection.courtId = null; render(); saveState(); }
    function handlePlayerClick(e){ const li = e.target.closest("li"); if (!li || li.classList.contains("disabled") || li.classList.contains("waiting-message") || state.availablePlayers.length === 0) return; const playerName = li.dataset.playerName; const firstAvailablePlayer = state.availablePlayers[0].name; const {players: selectedPlayerNames, gameMode} = state.selection; const requiredPlayers = gameMode === "doubles" ? 4 : 2; if (selectedPlayerNames.length === 0) { if (playerName !== firstAvailablePlayer) { selectedPlayerNames.push(firstAvailablePlayer, playerName); } else { selectedPlayerNames.push(playerName); } } else { if (selectedPlayerNames.includes(playerName)) { selectedPlayerNames.splice(selectedPlayerNames.indexOf(playerName), 1); if (selectedPlayerNames.length === 1) { state.selection.players = []; } } else if (selectedPlayerNames.length < requiredPlayers) { selectedPlayerNames.push(playerName); } } render(); saveState(); }
    function handleConfirmSelection(){ const {players: selectedPlayerNames, courtId, gameMode} = state.selection; const requiredPlayers = gameMode === "doubles" ? 4 : 2; if (selectedPlayerNames.length !== requiredPlayers || !courtId) return; const court = state.courts.find(c => c.id === courtId); const selectedPlayerObjects = selectedPlayerNames.map(name => getPlayerByName(name)); court.players = [...selectedPlayerObjects]; court.gameMode = gameMode; if (gameMode === 'doubles') { court.status = "selecting_teams"; court.teams.team1 = []; court.teams.team2 = []; } else { court.teams.team1 = [selectedPlayerObjects[0]]; court.teams.team2 = [selectedPlayerObjects[1]]; court.status = "game_pending"; court.autoStartTimeTarget = Date.now() + 60000; court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000); } state.availablePlayers = state.availablePlayers.filter(p => !selectedPlayerNames.includes(p.name)); state.selection = {gameMode: state.selection.gameMode, players: [], courtId: null}; updateGameModeBasedOnPlayerCount(); render(); saveState(); }
    function handleRandomizeTeams(courtId){ const court = state.courts.find(c => c.id === courtId); let players = [...court.players].sort(() => 0.5 - Math.random()); court.teams.team1 = [players[0], players[1]]; court.teams.team2 = [players[2], players[3]]; court.status = "game_pending"; court.autoStartTimeTarget = Date.now() + 60000; court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000); render(); saveState(); }
    function handleChooseTeams(courtId){ chooseTeamsModal.classList.remove("hidden"); modalPlayerList.innerHTML = ""; const court = state.courts.find(c => c.id === courtId); court.players.forEach(player => { const div = document.createElement("div"); div.className = "modal-player"; div.textContent = player.name; div.dataset.player = player.name; modalPlayerList.appendChild(div); }); chooseTeamsModal.dataset.courtId = courtId; }
    function handleModalPlayerClick(e){ if (e.target.classList.contains("modal-player")){ const selectedCount = modalPlayerList.querySelectorAll(".selected").length; if (e.target.classList.contains("selected")){ e.target.classList.remove("selected"); } else if (selectedCount < 2) { e.target.classList.add("selected"); } } }
    function handleModalConfirm(){ const courtId = chooseTeamsModal.dataset.courtId; const court = state.courts.find(c => c.id === courtId); const team1Names = Array.from(modalPlayerList.querySelectorAll(".selected")).map(el => el.dataset.player); if (team1Names.length === 2) { const team1Players = team1Names.map(name => getPlayerByName(name)); const team2Players = court.players.filter(player => !team1Names.includes(player.name)); court.teams.team1 = team1Players; court.teams.team2 = team2Players; court.status = "game_pending"; chooseTeamsModal.classList.add("hidden"); court.autoStartTimeTarget = Date.now() + 60000; court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000); render(); saveState(); } else { alert("Please select exactly 2 players for Team 1."); } }
    function handleStartGame(courtId){ const court = state.courts.find(c => c.id === courtId); if(court.autoStartTimer) { clearTimeout(court.autoStartTimer); court.autoStartTimer = null; } court.status = "in_progress"; court.gameStartTime = Date.now(); court.autoStartTimeTarget = null; render(); saveState(); }
    function handleCancelGame(courtId){ cancelConfirmModal.querySelector("h3").textContent = "Confirm Cancellation"; cancelConfirmModal.querySelector("p").textContent = "Are you sure you want to cancel this game? All players will be returned to the front of the queue."; cancelConfirmModal.dataset.mode = "cancelGame"; cancelConfirmModal.dataset.courtId = courtId; cancelConfirmModal.classList.remove("hidden"); }
    function executeGameCancellation(){ const courtId = cancelConfirmModal.dataset.courtId; if (!courtId) return; const court = state.courts.find(c => c.id === courtId); if (court) { if(court.autoStartTimer) clearTimeout(court.autoStartTimer); state.availablePlayers = [...court.players, ...state.availablePlayers]; court.status = "available"; court.players = []; court.teams = {team1:[], team2:[]}; court.gameMode = null; court.autoStartTimer = null; court.gameStartTime = null; court.autoStartTimeTarget = null; cancelConfirmModal.classList.add("hidden"); updateGameModeBasedOnPlayerCount(); render(); saveState(); } }
    function executePlayerCheckOut(){ const playerToCheckOutName = cancelConfirmModal.dataset.player; if (playerToCheckOutName) { const playerObject = state.availablePlayers.find(p => p.name === playerToCheckOutName); if (playerObject) { state.availablePlayers = state.availablePlayers.filter(p => p.name !== playerToCheckOutName); state.clubMembers.push(playerObject); state.clubMembers.sort((a, b) => a.name.localeCompare(b.name)); } cancelConfirmModal.classList.add("hidden"); populateCheckOutModal(); checkOutModal.classList.remove("hidden"); if (state.availablePlayers.length < 4 && state.selection.gameMode === 'doubles') { state.selection.players = []; state.selection.courtId = null; } updateGameModeBasedOnPlayerCount(); render(); saveState(); } }
    function executePlayerCheckIn(){ const playerToCheckInName = cancelConfirmModal.dataset.player; if (playerToCheckInName) { const playerObject = state.clubMembers.find(p => p.name === playerToCheckInName); if (playerObject) { state.availablePlayers.push(playerObject); state.clubMembers = state.clubMembers.filter(p => p.name !== playerToCheckInName); } cancelConfirmModal.classList.add("hidden"); populateCheckInModal(); checkInModal.classList.remove("hidden"); updateGameModeBasedOnPlayerCount(); render(); saveState(); } }
    
    function handleEndGame(courtId){
        const court = state.courts.find(c => c.id === courtId);
        if(!court) return;
        
        endGameModal.dataset.courtId = courtId;

        // FIX: Capture and display the current date/time when the modal is opened
        const now = new Date();
        const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const formattedDate = now.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
        endGameTimestamp.textContent = `Completed: ${formattedDate} at ${formattedTime}`;

        const team1Names = getPlayerNames(court.teams.team1).join(" & ");
        const team2Names = getPlayerNames(court.teams.team2).join(" & ");
        endGameTeams.innerHTML = `
            <div class="team-selection" data-team="team1">
                <div><strong>Team 1:</strong> ${team1Names}</div>
            </div>
            <div class="team-selection" data-team="team2">
                <div><strong>Team 2:</strong> ${team2Names}</div>
            </div>
        `;
        scoreSection.classList.add('hidden');
        tieBreakerArea.classList.add('hidden');
        winningScoreInput.value = '';
        losingScoreInput.value = '';
        winnerTiebreakInput.value = '';
        loserTiebreakInput.value = '';
        endGameModal.removeAttribute('data-winner');
        endGameTeams.querySelectorAll('.team-selection').forEach(el => {
            el.classList.remove('winner', 'loser');
        });
        endGameTeams.querySelectorAll('.team-selection').forEach(el => {
            el.addEventListener('click', (e) => {
                const selectedTeam = e.currentTarget.dataset.team;
                endGameModal.dataset.winner = selectedTeam;
                endGameTeams.querySelectorAll('.team-selection').forEach(teamEl => {
                    if (teamEl.dataset.team === selectedTeam) {
                        teamEl.classList.add('winner');
                        teamEl.classList.remove('loser');
                    } else {
                        teamEl.classList.add('loser');
                        teamEl.classList.remove('winner');
                    }
                });
                scoreSection.classList.remove('hidden');
                validateEndGameForm();
            });
        });
        validateEndGameForm();
        endGameModal.classList.remove("hidden");
    }

    function checkAndShowTieBreak() {
        const winScore = parseInt(winningScoreInput.value, 10);
        const loseScore = parseInt(losingScoreInput.value, 10);
        if (winScore === 7 && loseScore === 6) {
            tieBreakerArea.classList.remove('hidden');
        } else {
            tieBreakerArea.classList.add('hidden');
            winnerTiebreakInput.value = '';
            loserTiebreakInput.value = '';
        }
    }

    function validateEndGameForm(){
        const winnerSelected = !!endGameModal.dataset.winner;
        if (!winnerSelected) {
            endGameConfirmBtn.disabled = true;
            return;
        }
        const winScoreVal = winningScoreInput.value;
        const loseScoreVal = losingScoreInput.value;
        const winScore = parseInt(winScoreVal, 10);
        const loseScore = parseInt(loseScoreVal, 10);
        let scoresValid = false;
        if (winScoreVal !== '' && loseScoreVal !== '') {
            // Standard win conditions: 6-0 to 6-4
            if (winScore === 6 && loseScore >= 0 && loseScore <= 4) scoresValid = true;
            // Win by two games: 7-5
            if (winScore === 7 && loseScore === 5) scoresValid = true;
            // Tie-break win: 7-6
            if (winScore === 7 && loseScore === 6) scoresValid = true;
        }
        if (!scoresValid) {
            endGameConfirmBtn.disabled = true;
            return;
        }
        let tiebreakValid = true;
        if (!tieBreakerArea.classList.contains('hidden')) {
            const tbWinner = winnerTiebreakInput.value;
            const tbLoser = loserTiebreakInput.value;
            if (tbWinner === '' || tbLoser === '') {
                tiebreakValid = false;
            } else {
                const numTbWinner = parseInt(tbWinner, 10);
                const numTbLoser = parseInt(tbLoser, 10);
                // Tie-break rule: Must win by at least 2 points, and winner must have at least 7 points (e.g., 7-5, 8-6)
                tiebreakValid = (numTbWinner >= 7) && (numTbWinner - numTbLoser >= 2);
            }
        }
        const isReady = winnerSelected && scoresValid && tiebreakValid;
        endGameConfirmBtn.disabled = !isReady;
        endGameConfirmBtn.style.backgroundColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)';
        endGameConfirmBtn.style.borderColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)';
    }

    function confirmEndGame(){
        const courtId = endGameModal.dataset.courtId;
        const court = state.courts.find(c => c.id === courtId);
        const winnerValue = endGameModal.dataset.winner;
        const finalWinningScore = parseInt(winningScoreInput.value, 10);
        const finalLosingScore = parseInt(losingScoreInput.value, 10);
        let score1, score2, tiebreak1 = null, tiebreak2 = null;
        if (winnerValue === 'team1') {
            score1 = finalWinningScore;
            score2 = finalLosingScore;
        } else {
            score1 = finalLosingScore;
            score2 = finalWinningScore;
        }
        if (!tieBreakerArea.classList.contains('hidden')) {
            const finalWinnerTiebreak = parseInt(winnerTiebreakInput.value, 10);
            const finalLoserTiebreak = parseInt(loserTiebreakInput.value, 10);
            if (winnerValue === 'team1') {
                tiebreak1 = finalWinnerTiebreak;
                tiebreak2 = finalLoserTiebreak;
            } else {
                tiebreak1 = finalLoserTiebreak;
                tiebreak2 = finalWinnerTiebreak;
            }
        }
        const team1Names = getPlayerNames(court.teams.team1);
        const team2Names = getPlayerNames(court.teams.team2);
        const newGame = {
            id: Date.now(), court: court.id, startTime: court.gameStartTime, endTime: Date.now(),
            duration: document.getElementById(`timer-${court.id}`).textContent,
            teams: { team1: team1Names, team2: team2Names },
            score: { team1: score1, team2: score2, tiebreak1: tiebreak1, tiebreak2: tiebreak2 },
            winner: winnerValue
        };
        state.gameHistory.push(newGame);
        const winningPlayers = winnerValue === "team1" ? court.teams.team1 : court.teams.team2;
        const losingPlayers = winnerValue === "team1" ? court.teams.team2 : court.teams.team1;
        state.availablePlayers = [...winningPlayers, ...losingPlayers, ...state.availablePlayers];
        court.status = "available";
        court.players = [];
        court.teams = {team1:[], team2:[]};
        court.gameMode = null;
        court.gameStartTime = null;
        endGameModal.classList.add("hidden");
        updateGameModeBasedOnPlayerCount();
        render();
        saveState();
    }
    
    function initQuoteRotator() { 
        const quoteTextEl = document.getElementById('quote-text'); 
        if (!quoteTextEl || quoteTextEl.dataset.initialized === 'true') return; 

        quoteTextEl.textContent = `"${state.tennisQuotes[state.currentQuoteIndex]}"`; 
        
        // Only set the interval once
        if (!window.quoteInterval) {
            window.quoteInterval = setInterval(() => { 
                quoteTextEl.classList.add('fading'); 
                setTimeout(() => { 
                    state.currentQuoteIndex = (state.currentQuoteIndex + 1) % state.tennisQuotes.length; 
                    // Ensure element exists before updating, as it might be destroyed during a render cycle
                    const currentQuoteEl = document.getElementById('quote-text');
                    if (currentQuoteEl) {
                        currentQuoteEl.textContent = `"${state.tennisQuotes[state.currentQuoteIndex]}"`; 
                        currentQuoteEl.classList.remove('fading');
                    }
                }, 1000); 
            }, 12000); 
        }
        quoteTextEl.dataset.initialized = 'true';
    }
    function initSummaryCardElements() {
        // 1. Re-bind the settings button listener
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.removeEventListener('click', handleAdminLogin); // Prevent multiple bindings
            settingsBtn.addEventListener('click', handleAdminLogin);
        }
        // 2. Re-start the quote rotator
        initQuoteRotator();
    }
    function handleAdminLogin() { showKeypad(null, { mode: 'admin', maxLength: 4, title: 'Enter Admin Passcode' }); }
    function checkAdminPasscode() { const enteredCode = keypadDisplay.textContent; if (enteredCode === '0308') { hideKeypad(); showAdminModal(); } else { const keypadContent = customKeypadModal.querySelector('.keypad-content'); keypadContent.classList.add('shake'); setTimeout(() => { keypadContent.classList.remove('shake'); keypadDisplay.textContent = ''; if(activeInput) activeInput.value = ''; keypadConfirmBtn.disabled = true; }, 820); } }
    
    function showAdminModal() {
        const committeeMembers = MASTER_MEMBER_LIST.filter(m => m.committee).sort((a,b) => a.name.localeCompare(b.name));
        const isNoneChecked = state.onDuty === 'None' ? 'checked' : '';
        committeeMemberList.innerHTML = ` <li class="committee-member"> <label> <input type="radio" name="onDutyMember" value="None" ${isNoneChecked}> <div class="member-details"> <span class="member-name">None</span> </div> </label> </li> `;
        committeeMembers.forEach(member => {
            const li = document.createElement('li');
            li.className = 'committee-member';
            const isChecked = member.name === state.onDuty ? 'checked' : '';
            li.innerHTML = ` <label> <input type="radio" name="onDutyMember" value="${member.name}" ${isChecked}> <div class="member-details"> <span class="member-name">${member.name}</span> <span class="member-designation">${member.committee}</span> </div> </label> `;
            committeeMemberList.appendChild(li);
        });
        committeeMemberList.querySelectorAll('input[name="onDutyMember"]').forEach(radio => {
            radio.addEventListener('change', handleOnDutyChange);
        });
        courtAvailabilityList.innerHTML = '';
        state.courts.forEach(court => {
            const li = document.createElement('li');
            li.className = 'court-availability-item';
            const isVisible = state.courtSettings.visibleCourts.includes(court.id);
            li.innerHTML = `
                <label for="court-toggle-${court.id}">Court ${court.id}</label>
                <label class="switch">
                    <input type="checkbox" id="court-toggle-${court.id}" data-court-id="${court.id}" ${isVisible ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            `;
            courtAvailabilityList.appendChild(li);
        });
        courtAvailabilityList.querySelectorAll('input[type="checkbox"]').forEach(toggle => {
            toggle.addEventListener('change', handleCourtVisibilityChange);
        });
        adminSettingsModal.classList.remove('hidden');
    }

    function handleCourtVisibilityChange(e) {
        const courtId = e.target.dataset.courtId;
        const isVisible = e.target.checked;
        if (isVisible) {
            if (!state.courtSettings.visibleCourts.includes(courtId)) {
                state.courtSettings.visibleCourts.push(courtId);
                state.courtSettings.visibleCourts.sort(); 
            }
        } else {
            state.courtSettings.visibleCourts = state.courtSettings.visibleCourts.filter(id => id !== courtId);
        }
        saveState();
        render();
    }
    
    function logPlayerSwap(playerName, oldIndex, newIndex) {
        if (oldIndex === newIndex) return;

        // Initialize sessionLog on tempPlayerOrder if it doesn't exist
        tempPlayerOrder.sessionLog = tempPlayerOrder.sessionLog || {};
        
        let sessionLog = tempPlayerOrder.sessionLog;
        
        // Initialize or get the player's log
        let playerLog = sessionLog[playerName] || { 
            startPosition: oldIndex, 
            currentPosition: oldIndex,
            movements: [] 
        };

        // Record the atomic movement
        playerLog.movements.push({ from: oldIndex, to: newIndex, timestamp: Date.now() });

        // Update the player's final position for this session
        playerLog.currentPosition = newIndex;

        sessionLog[playerName] = playerLog;
        tempPlayerOrder.sessionLog = sessionLog;
    }

    function showReorderModal() {
        if (state.availablePlayers.length < 2) {
            alert("At least two players must be available to reorder the queue.");
            return;
        }
        tempPlayerOrder = [...state.availablePlayers];
        renderReorderList();
        adminSettingsModal.classList.add('hidden');
        reorderPlayersModal.classList.remove('hidden');
    }

    function renderReorderList() {
        reorderPlayersList.innerHTML = "";
        tempPlayerOrder.forEach((player, index) => {
            const li = document.createElement('li');
            const isFirst = index === 0;
            const isLast = index === tempPlayerOrder.length - 1;
            li.innerHTML = `
                <span>${player.name}</span>
                <div class="reorder-controls">
                    <button class="reorder-btn" data-player-name="${player.name}" data-direction="up" ${isFirst ? 'disabled' : ''}>↑</button>
                    <button class="reorder-btn" data-player-name="${player.name}" data-direction="down" ${isLast ? 'disabled' : ''}>↓</button>
                </div>
            `;
            reorderPlayersList.appendChild(li);
        });
    }

    function handleReorderClick(e) {
        const button = e.target.closest('.reorder-btn');
        if (!button) return;
        const playerName = button.dataset.playerName;
        const direction = button.dataset.direction;
        const currentIndex = tempPlayerOrder.findIndex(p => p.name === playerName);
        if (currentIndex === -1) return;
        let newIndex = currentIndex;
        if (direction === 'up' && currentIndex > 0) {
            newIndex = currentIndex - 1;
            [tempPlayerOrder[currentIndex], tempPlayerOrder[newIndex]] = [tempPlayerOrder[newIndex], tempPlayerOrder[currentIndex]];
        } else if (direction === 'down' && currentIndex < tempPlayerOrder.length - 1) {
            newIndex = currentIndex + 1;
            [tempPlayerOrder[currentIndex], tempPlayerOrder[newIndex]] = [tempPlayerOrder[newIndex], tempPlayerOrder[currentIndex]];
        }
        if (newIndex !== currentIndex) {
            logPlayerSwap(playerName, currentIndex, newIndex);
        }
        renderReorderList();
    }
    
    function renderReorderHistory() {
        reorderHistoryList.innerHTML = "";
        
        if (state.reorderHistory.length === 0) {
            reorderHistoryList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 2rem;">No queue reorder actions have been logged.</p>';
            return;
        }

        // Iterate through history, newest first
        [...state.reorderHistory].reverse().forEach(entry => {
            const dateTime = new Date(entry.endTime).toLocaleString();
            let playersHtml = '';

            // Iterate through players involved in this session
            for (const [name, log] of Object.entries(entry.players)) {
                // Only display players who actually moved (start position !== current position)
                if (log.startPosition !== log.currentPosition) {
                    playersHtml += `
                        <p style="margin: 0.25rem 0; font-size: 0.95rem; display: flex; justify-content: space-between;">
                            <span style="font-weight: 500;">${name}</span>
                            <span style="color: var(--primary-blue);">Moved from #${log.startPosition + 1} to #${log.currentPosition + 1}</span>
                        </p>
                    `;
                }
            }

            // Only render the entry if at least one player moved
            if (playersHtml) {
                const details = document.createElement('div');
                details.className = 'history-item';
                details.style.textAlign = 'left';
                details.innerHTML = `
                    <div class="history-details" style="margin-bottom: 0.75rem;">
                        <span style="color: var(--primary-blue);">${entry.adminAction} (${dateTime})</span>
                    </div>
                    <div style="padding-left: 1rem;">
                        ${playersHtml}
                    </div>
                `;
                reorderHistoryList.appendChild(details);
            }
        });
    }

    function handleOnDutyChange(e) { state.onDuty = e.target.value; saveState(); render(); }
    function handleKeypadClick(e) { const key = e.target.dataset.key; let displayValue = keypadDisplay.textContent; if (keypadConfig.mode !== 'admin') { displayValue = displayValue.replace(/^0+/, ''); } if (e.target.id === 'keypad-confirm-btn') { if (e.target.disabled) return; if (keypadConfig.mode === 'admin') { checkAdminPasscode(); } else { hideKeypad(); if (activeInput) activeInput.dispatchEvent(new Event('input')); } return; } if (key === 'backspace') { displayValue = displayValue.slice(0, -1); } else if (key === 'clear') { displayValue = ''; } else if (/[0-9]/.test(key)) { if (keypadConfig.maxLength && displayValue.length >= keypadConfig.maxLength) { return; } if (keypadConfig.mode !== 'admin' && activeInput) { const isTiebreakInput = activeInput.id.includes('tiebreak'); if (!isTiebreakInput) { const newValue = parseInt(displayValue + key, 10); if (newValue > 7) return; } } displayValue += key; } keypadDisplay.textContent = displayValue || ''; if(activeInput) activeInput.value = displayValue; if(activeInput) activeInput.dispatchEvent(new Event('input')); const isConfirmDisabled = keypadConfig.maxLength ? displayValue.length !== keypadConfig.maxLength : displayValue.length === 0; keypadConfirmBtn.disabled = isConfirmDisabled; }
    function showKeypad(input, config = {}) { activeInput = input; keypadConfig = config; keypadDisplay.textContent = activeInput ? activeInput.value : ''; if(activeInput) activeInput.value = ''; if (config.title) { keypadDisplay.setAttribute('data-placeholder', config.title); } else { keypadDisplay.removeAttribute('data-placeholder'); } if (config.mode === 'admin') { keypadCancelBtn.classList.remove('hidden'); keypadConfirmBtn.classList.remove('wide-full'); keypadConfirmBtn.classList.add('wide-half'); } else { keypadCancelBtn.classList.add('hidden'); keypadConfirmBtn.classList.remove('wide-half'); keypadConfirmBtn.classList.add('wide-full'); } customKeypadModal.classList.remove('hidden'); const isConfirmDisabled = keypadConfig.maxLength ? keypadDisplay.textContent.length !== keypadConfig.maxLength : keypadDisplay.textContent.length === 0; keypadConfirmBtn.disabled = isConfirmDisabled; }
    function hideKeypad() { customKeypadModal.classList.add('hidden'); keypadConfig = {}; activeInput = null; }
    function wireScoreInputToKeypad(input) { input.readOnly = true; input.addEventListener('focus', (e) => { e.preventDefault(); if (activeInput !== e.target) { e.target.select(); } }); input.addEventListener('click', (e) => { showKeypad(e.target); e.target.select(); }); }
    const QWERTY_LAYOUT = [ ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'], ['Z', 'X', 'C', 'V', 'B', 'N', 'M'] ];
    function generateAlphaKeypad() { alphaKeypadGrid.innerHTML = ''; const displayValue = alphaKeypadDisplay.textContent; const lastChar = displayValue.slice(-1); QWERTY_LAYOUT.forEach((row, index) => { const rowDiv = document.createElement('div'); rowDiv.className = `key-row-${index + 1}`; row.forEach(key => { const button = document.createElement('button'); button.className = 'keypad-btn'; button.dataset.key = key; let char = key; if (displayValue.length === 0 || lastChar === ' ') { char = key.toUpperCase(); } else { char = key.toLowerCase(); } button.textContent = char; rowDiv.appendChild(button); }); alphaKeypadGrid.appendChild(rowDiv); }); const lastRowDiv = document.createElement('div'); lastRowDiv.className = `key-row-4`; const spaceBtn = document.createElement('button'); spaceBtn.className = 'keypad-btn wide-control control'; spaceBtn.dataset.key = 'space'; spaceBtn.textContent = 'Space'; lastRowDiv.appendChild(spaceBtn); const backspace = document.createElement('button'); backspace.className = 'keypad-btn control'; backspace.dataset.key = 'backspace'; backspace.textContent = '⌫'; lastRowDiv.appendChild(backspace); const done = document.createElement('button'); done.className = 'keypad-btn wide-control confirm'; done.id = 'alpha-keypad-confirm-btn'; done.textContent = 'Done'; lastRowDiv.appendChild(done); alphaKeypadGrid.appendChild(lastRowDiv); document.querySelectorAll('#custom-alpha-keypad-modal .keypad-btn').forEach(button => { button.removeEventListener('click', handleAlphaKeypadClick); button.addEventListener('click', handleAlphaKeypadClick); }); }
    function handleAlphaKeypadClick(e) { const key = e.target.dataset.key; let displayValue = alphaKeypadDisplay.textContent; if (!activeAlphaInput) return; if (key === 'backspace') { displayValue = displayValue.slice(0, -1); } else if (key === 'space') { if (displayValue.length > 0 && displayValue.slice(-1) !== ' ') { displayValue += ' '; } } else if (e.target.id === 'alpha-keypad-confirm-btn') { hideAlphaKeypad(); return; } else { let char = key; if (displayValue.length === 0 || displayValue.slice(-1) === ' ') { char = key.toUpperCase(); } else { char = key.toLowerCase(); } displayValue += char; } alphaKeypadDisplay.textContent = displayValue; activeAlphaInput.value = displayValue; generateAlphaKeypad(); validateGuestForm(); }
    function showAlphaKeypad(input) { activeAlphaInput = input; alphaKeypadDisplay.textContent = activeAlphaInput.value; generateAlphaKeypad(); customAlphaKeypadModal.classList.remove('hidden'); guestNameModal.classList.add('hidden'); }
    function hideAlphaKeypad() { customAlphaKeypadModal.classList.add('hidden'); guestNameModal.classList.remove('hidden'); activeAlphaInput = null; validateGuestForm(); }
    function validateGuestForm() { const name = guestNameInput.value.trim(); const surname = guestSurnameInput.value.trim(); const isReady = (name.length > 0 && surname.length > 0); guestConfirmBtn.disabled = !isReady; guestConfirmBtn.style.backgroundColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)'; guestConfirmBtn.style.borderColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)'; }
    function handleGuestCheckIn() { const firstName = guestNameInput.value.trim(); const lastName = guestSurnameInput.value.trim(); const gender = document.querySelector('input[name="guest-gender"]:checked').value; if (!firstName || !lastName) return; const formatCase = (str) => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); const formattedGuestName = `${formatCase(firstName)} ${formatCase(lastName)}`; const newGuest = { name: formattedGuestName, gender: gender, guest: true }; if (!state.availablePlayers.some(p => p.name === newGuest.name)) { state.availablePlayers.push(newGuest); } guestNameModal.classList.add('hidden'); checkInModal.classList.remove('hidden'); guestNameInput.value = ''; guestSurnameInput.value = ''; guestConfirmBtn.disabled = true; updateGameModeBasedOnPlayerCount(); render(); saveState(); }
    function resetConfirmModal(){ setTimeout(() => { cancelConfirmModal.querySelector("h3").textContent = "Confirm Action"; cancelConfirmModal.querySelector("p").textContent = "Are you sure?"; modalBtnYesConfirm.textContent = "Yes"; }, 300); }
    function populateCheckInModal(){ checkInList.innerHTML = ""; if (state.clubMembers.length === 0){ const li = document.createElement("li"); li.textContent = "All club members are currently checked in."; li.style.justifyContent = "center"; checkInList.appendChild(li); } else { state.clubMembers.forEach(player => { const li = document.createElement("li"); const displayName = player.guest ? `${player.name} (Guest)` : player.name; li.innerHTML = ` <span style="flex-grow: 1;">${displayName}</span> <span style="margin-right: 1rem; color: #6c757d;">${player.gender}</span> <span class="action-icon add" data-player="${player.name}">+</span> `; checkInList.appendChild(li); }); } }
    function populateCheckOutModal(){ checkOutList.innerHTML = ""; if (state.availablePlayers.length === 0){ const li = document.createElement("li"); li.textContent = "There are no players currently checked in."; li.style.justifyContent = "center"; checkOutList.appendChild(li); } else { state.availablePlayers.forEach(player => { const li = document.createElement("li"); const displayName = player.guest ? `${player.name} (Guest)` : player.name; li.innerHTML = ` <span style="flex-grow: 1;">${displayName}</span> <span style="margin-right: 1rem; color: #6c757d;">${player.gender}</span> <span class="action-icon remove" data-player="${player.name}">&times;</span> `; checkOutList.appendChild(li); }); } }

    // --- INITIALIZATION ---
    loadState();
    updateGameModeBasedOnPlayerCount();
    render();
    //initQuoteRotator();
    setInterval(() => {
        updateTimers();
    }, 1000);

    // BIND ALL INITIAL DOM LISTENERS
    
    window.addEventListener('resize', setPlayerListHeight);
    modeDoublesBtn.addEventListener("click",()=>handleModeChange("doubles"));
    modeSinglesBtn.addEventListener("click",()=>handleModeChange("singles"));
    availablePlayersList.addEventListener("click",handlePlayerClick);
    courtGrid.addEventListener("click",handleCourtGridClick);
    modalConfirmBtn.addEventListener("click",handleModalConfirm);
    modalCancelBtn.addEventListener("click",()=>chooseTeamsModal.classList.add("hidden"));
    modalPlayerList.addEventListener("click",handleModalPlayerClick);
    historyBtn.addEventListener("click",()=>{state.historyViewMode='games'; renderHistory(); historyPage.classList.remove("hidden")});
    historyCloseBtn.addEventListener("click",()=>historyPage.classList.add("hidden"));
    historyToggleViewBtn.addEventListener("click",()=>{state.historyViewMode="games"===state.historyViewMode?"stats":"games";renderHistory();saveState()});
    checkInBtn.addEventListener("click",()=>{populateCheckInModal(),checkInModal.classList.remove("hidden")});
    checkInCancelBtn.addEventListener("click",()=>checkInModal.classList.add("hidden"));
    checkInList.addEventListener("click",e=>{if(e.target.classList.contains("add")){const playerName=e.target.dataset.player;const player = getPlayerByName(playerName); checkInModal.classList.add("hidden"); cancelConfirmModal.querySelector("h3").textContent="Confirm Check In",cancelConfirmModal.querySelector("p").textContent=`Are you sure you want to check in ${playerName.split(' ')[0]} (${player.gender})?`,modalBtnYesConfirm.textContent="Yes, Check In",cancelConfirmModal.dataset.mode="checkInPlayer",cancelConfirmModal.dataset.player=playerName,cancelConfirmModal.classList.remove("hidden")}});
    checkOutBtn.addEventListener("click",()=>{populateCheckOutModal(),checkOutModal.classList.remove("hidden")});
    checkOutCloseBtn.addEventListener("click",()=>checkOutModal.classList.add("hidden"));
    checkOutList.addEventListener("click",e=>{if(e.target.classList.contains("remove")){const playerName=e.target.dataset.player;const player = getPlayerByName(playerName); checkOutModal.classList.add("hidden"); cancelConfirmModal.querySelector("h3").textContent="Confirm Check Out",cancelConfirmModal.querySelector("p").textContent=`Are you sure you want to check out ${playerName.split(' ')[0]} (${player.gender})?`,modalBtnYesConfirm.textContent="Yes, Check Out",cancelConfirmModal.dataset.mode="checkOutPlayer",cancelConfirmModal.dataset.player=playerName,cancelConfirmModal.classList.remove("hidden")}});
    endGameCancelBtn.addEventListener("click",()=>endGameModal.classList.add("hidden"));
    endGameConfirmBtn.addEventListener("click",confirmEndGame);
    modalBtnNo.addEventListener("click",()=>{ cancelConfirmModal.classList.add("hidden"); if (cancelConfirmModal.dataset.mode === "checkInPlayer") checkInModal.classList.remove("hidden"); if (cancelConfirmModal.dataset.mode === "checkOutPlayer") checkOutModal.classList.remove("hidden"); resetConfirmModal(); });
    modalBtnYesConfirm.addEventListener("click",()=>{ if (cancelConfirmModal.dataset.mode === "checkOutPlayer") { executePlayerCheckOut(); } else if (cancelConfirmModal.dataset.mode === "checkInPlayer") { executePlayerCheckIn(); } else { executeGameCancellation(); } resetConfirmModal(); });
    
    const scoreInputs = [winningScoreInput, losingScoreInput, winnerTiebreakInput, loserTiebreakInput];
    scoreInputs.forEach(input => {
        wireScoreInputToKeypad(input);
        input.addEventListener("input", () => {
            checkAndShowTieBreak();
            validateEndGameForm();
        });
    });

    keypadButtons.forEach(button => { button.addEventListener('click', handleKeypadClick); });
    keypadCancelBtn.addEventListener('click', hideKeypad);
    addGuestBtn.addEventListener("click",()=>{ checkInModal.classList.add('hidden'); guestNameModal.classList.remove('hidden'); guestNameInput.value = ''; guestSurnameInput.value = ''; document.querySelector('input[name="guest-gender"][value="M"]').checked = true; validateGuestForm(); });
    guestCancelBtn.addEventListener("click",()=>{ guestNameModal.classList.add('hidden'); checkInModal.classList.remove('hidden'); });
    guestConfirmBtn.addEventListener("click", handleGuestCheckIn);
    guestGenderRadios.forEach(radio => radio.addEventListener('change', validateGuestForm));
    const wireNameInputToKeypad = (input) => { input.readOnly = true; input.addEventListener('click', (e) => { showAlphaKeypad(e.target); }); };
    wireNameInputToKeypad(guestNameInput);
    wireNameInputToKeypad(guestSurnameInput);
    adminCloseBtn.addEventListener('click', () => { adminSettingsModal.classList.add('hidden'); });
    reorderPlayersBtn.addEventListener('click', showReorderModal);
    reorderPlayersList.addEventListener('click', handleReorderClick);

    reorderCancelBtn.addEventListener('click', () => {
        reorderPlayersModal.classList.add('hidden');
        tempPlayerOrder = [];
    });

    reorderSaveBtn.addEventListener('click', () => {
        state.availablePlayers = tempPlayerOrder;
        
        if (tempPlayerOrder.sessionLog && Object.keys(tempPlayerOrder.sessionLog).length > 0) {
            const movedPlayers = Object.fromEntries(
                Object.entries(tempPlayerOrder.sessionLog).filter(([name, log]) => log.startPosition !== log.currentPosition)
            );

            if (Object.keys(movedPlayers).length > 0) {
                 const historyEntry = {
                    id: Date.now(),
                    adminAction: 'Queue Reorder',
                    players: movedPlayers,
                    endTime: Date.now()
                };
                state.reorderHistory.push(historyEntry);
            }
        }

        reorderPlayersModal.classList.add('hidden');
        tempPlayerOrder = [];
        render();
        saveState();
    });

    viewReorderLogBtn.addEventListener('click', () => {
        renderReorderHistory();
        adminSettingsModal.classList.add('hidden');
        reorderLogModal.classList.remove('hidden');
    });

    reorderLogCloseBtn.addEventListener('click', () => {
        reorderLogModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');
    });
});