document.addEventListener('DOMContentLoaded', () => {

// DEFINITIVE MASTER LIST OF ALL MEMBERS
    const MASTER_MEMBER_LIST = [
        { name: "Francois du Plessis", gender: "M", guest: false, committee: "Chairman", isPaused: false },
        { name: "Franco da Silva", gender: "M", guest: false, committee: "Vice Chairman", isPaused: false },
        { name: "Rene da Silva", gender: "F", guest: false, committee: "Treasurer", isPaused: false },
        { name: "Deirdre du Plessis", gender: "F", guest: false, committee: "Secretary", isPaused: false },
        { name: "Reinier du Plessis", gender: "M", guest: false, committee: "Maintenance", isPaused: false },
        { name: "Lehan van Aswegen", gender: "M", guest: false, committee: "Committee Social", isPaused: false },
        { name: "Dave Bester", gender: "M", guest: false, committee: "Committee Social", isPaused: false },
        { name: "Raymond Jasi", gender: "M", guest: false, committee: "Committee", isPaused: false },
        { name: "Rosco Dredge", gender: "M", guest: false, isPaused: false },
        { name: "Claire Dredge", gender: "F", guest: false, isPaused: false },
        { name: "Karla Agenbag", gender: "F", guest: false, isPaused: false },
        { name: "Justin Hammann", gender: "M", guest: false, isPaused: false },
        { name: "Carin Venter", gender: "F", guest: false, isPaused: false },
        { name: "Ivan Erasmus", gender: "M", guest: false, isPaused: false },
        { name: "Reece Erasmus", gender: "M", guest: false, isPaused: false },
        { name: "Jan Erasmus", gender: "M", guest: false, isPaused: false },
        { name: "Lusanda Chirwa", gender: "F", guest: false, isPaused: false },
        { name: "Simon Smith", gender: "M", guest: false, isPaused: false },
        { name: "Peter Jones", gender: "M", guest: false, isPaused: false },
        { name: "Mary Jane", gender: "F", guest: false, isPaused: false },
        { name: "John Doe", gender: "M", guest: false, isPaused: false },
        { name: "Sarah Connor", gender: "F", guest: false, isPaused: false },
        { name: "Mike Williams", gender: "M", guest: false, isPaused: false },
        { name: "Linda Green", gender: "F", guest: false, isPaused: false },
        { name: "Tom Harris", gender: "M", guest: false, isPaused: false },
        { name: "Patricia King", gender: "F", guest: false, isPaused: false },
        { name: "David Wright", gender: "M", guest: false, isPaused: false },
        { name: "Susan Hill", gender: "F", guest: false, isPaused: false }
    ];
    
    // Define the preferred court hierarchy
    const COURT_HIERARCHY = ['B', 'C', 'D', 'A', 'E'];

    // --- STATE MANAGEMENT ---
    let state = {
        clubMembers: [...MASTER_MEMBER_LIST].sort((a, b) => a.name.localeCompare(b.name)),
        availablePlayers: [],
        courts: [
            // ADD isCollapsed: false to each court object
            { id: 'A', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false },
            { id: 'B', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false },
            { id: 'C', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false },
            { id: 'D', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false },
            { id: 'E', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false },
        ],
        courtSettings: {
            visibleCourts: ['A', 'B', 'C', 'D', 'E']
        },

        mobileControls: {
            isSummaryExpanded: true,
            isPlayersExpanded: true,
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
        selectedAlertSound: 'Alert1.mp3', // Default sound
        // NEW NOTIFICATION CONTROL STATES
        notificationControls: {
            isMuted: false,        // Mute All Sounds
            isMinimized: false,    // Minimize Notifications (Only initial alert)
            isTTSDisabled: false   // Turn Off Speech Only
        },
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
            "To be a great champion you must believe you are the best. If you are not, pretend you are.", "The pain you feel today will be the strength you feel tomorrow.",
            "If it doesn’t challenge you, it won’t change you.", "Victory is sweetest when you’ve known defeat.",
            "What seems hard now will one day be your warm-up.", "I've failed over and over and over again in my life. And that is why I succeed.",
            "Tennis is life.", "Keep calm and play tennis.",
            "Tennis: the only place where love means nothing.", "I play each point as if it were the last point of the match.",
            "Never give up on a dream just because of the time it will take to accomplish it.", "It's not the will to win that matters—everyone has that. It's the will to prepare to win that matters.",
            "Pressure is a privilege.", "One point at a time.",
            "Control the controllables.", "Tennis requires agility, mental and physical.",
            "My backhand is my weapon.", "A perfect volley is a work of art.",
            "There's no place like the court.", "Tennis is a dance between two players."
        ],
        // NEW ADMIN COURT MANAGEMENT STATE
        adminCourtManagement: {
            mode: 'card1_select_court', // card1_select_court, card2_remove_players, card3_add_players
            courtId: null,
            // The list of players currently on court (Card 2) after initialization, excluding temporary removals.
            currentCourtPlayers: [], 
            // Players marked for removal from the court on Card 2 (will go to bottom of queue on confirm)
            removedPlayers: [], 
            // Players selected to be added to the court on Card 3 (consumed from available queue on confirm)
            addedPlayers: [] 
        }
        

    };

    // NEW/ADJUSTED STATE VARIABLES FOR ALERT SCHEDULING
    let alertScheduleTime = 0; // Timestamp of the next alert fire time
    let currentAudio = null; // Track the currently playing audio object
    // Tracks the state of the alert cycle: 'initial_check' -> '2_min_countdown' -> '5_min_repeat'
    let alertState = 'initial_check'; 
    // NEW: Announcement Queue System
    let announcementQueue = [];
    let isAnnouncementPlaying = false;


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
    const reorderLogBackBtn = document.getElementById('reorder-log-back-btn'); // NEW ELEMENT
    let tempPlayerOrder = [];

    // SOUND SELECTION ELEMENTS
    const selectSoundBtn = document.getElementById('select-sound-btn');
    const soundSelectionModal = document.getElementById('sound-selection-modal');
    const soundSelectionList = document.getElementById('sound-selection-list');
    const soundConfirmBtn = document.getElementById('sound-confirm-btn');
    const soundCancelBtn = document.getElementById('sound-cancel-btn');
    const alertSounds = Array.from({ length: 17 }, (_, i) => `Alert${i + 1}.mp3`);
    let tempSelectedSound = ''; // Temporary selection in the modal
    
    // NEW ELEMENTS: Notification Control Buttons
    const muteBtn = document.getElementById('mute-btn');
    const minimizeNotificationsBtn = document.getElementById('minimize-notifications-btn');
    const noSpeechBtn = document.getElementById('no-speech-btn');
    let alertStatusDisplay; 

    // NEW ELEMENTS: Admin Court Player Management (REFACTORED)
    const manageCourtPlayersBtn = document.getElementById('manage-court-players-btn');
    const manageCourtPlayersModal = document.getElementById('manage-court-players-modal');
    const courtListForManagement = document.getElementById('court-list-for-management'); // Card 1
    const removePlayersList = document.getElementById('remove-players-list'); // Card 2 - Players currently on court
    const addPlayersList = document.getElementById('add-players-list'); // Card 3 - Available players to add
    const managePlayersCloseBtn = document.getElementById('manage-players-close-btn'); 
    const managePlayersBackBtn = document.getElementById('manage-players-back-btn');
    const managePlayersAddBtn = document.getElementById('manage-players-add-btn'); 
    const managePlayersConfirmBtn = document.getElementById('manage-players-confirm-btn'); // Card 3 Confirm
    // NEW: Reference to the modal-actions div for setting the data-card-mode
    const manageModalActions = manageCourtPlayersModal.querySelector('.modal-actions'); 
    
    // --- DYNAMIC HEIGHT FUNCTION ---
    function setPlayerListHeight() {
        const courtGridEl = document.getElementById('court-grid');
        const referenceCard = courtGridEl.querySelector('.court-card, .summary-card');
        const courtGridStyles = window.getComputedStyle(courtGridEl);
        // Determine the number of columns currently being used by the grid.
        const courtColumnCount = courtGridStyles.gridTemplateColumns.split(' ').length;
        
        // If no reference card is found, or if the layout is stacked (1 column or fewer than 2), 
        // set height to auto and exit.
        if (!referenceCard || courtColumnCount < 2) {
            availablePlayersSection.style.height = 'auto';
            return;
        }

        // Measure the actual height of the court grid container.
        // This accurately captures the total space of all cards + gaps now that CSS forces equal rows.
        const totalHeight = courtGridEl.offsetHeight; 
        
        // Set the available players section height to match.
        availablePlayersSection.style.height = `${totalHeight}px`;
    }

    // --- CORE FUNCTIONS ---
    function getAllKnownPlayers() { const playersOnCourt = state.courts.flatMap(court => court.players); const allPlayers = [ ...state.clubMembers, ...state.availablePlayers, ...playersOnCourt ]; const uniquePlayers = Array.from(new Map(allPlayers.map(p => [p.name, p])).values()); state.gameHistory.forEach(game => { [...game.teams.team1, ...game.teams.team2].forEach(name => { if (!uniquePlayers.some(p => p.name === name)) { uniquePlayers.push({ name: name, gender: '?', guest: true }); } }); }); return uniquePlayers; }
    function getPlayerByName(name) { 
        let player = state.availablePlayers.find(p => p.name === name); 
        if (player) return player; 
        player = MASTER_MEMBER_LIST.find(p => p.name === name); 
        if (player) return player; 
        for (const court of state.courts) { 
            player = court.players.find(p => p.name === name); 
            if (player) return player; 
        } 
        return { name: name, gender: '?', guest: true, isPaused: false }; 
    }
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
            state.selectedAlertSound = state.selectedAlertSound || 'Alert1.mp3';
            
            // Initialize new mobile controls
            if (!state.mobileControls) {
                state.mobileControls = { isSummaryExpanded: true, isPlayersExpanded: true };
            }
            
            // Ensure the new notification state exists on load
            if (!state.notificationControls) {
                state.notificationControls = {
                    isMuted: false,        
                    isMinimized: false,    
                    isTTSDisabled: false
                };
            }

            // Ensure the new adminCourtManagement state exists on load
            if (!state.adminCourtManagement) {
                state.adminCourtManagement = {
                    mode: 'card1_select_court',
                    courtId: null,
                    currentCourtPlayers: [], 
                    removedPlayers: [], 
                    addedPlayers: [] 
                };
            }
            
            const ensurePlayerObjects = (playerList, defaultList) => { return playerList.map(player => { if (typeof player === 'string') { const defaultPlayer = defaultList.find(p => p.name === player); return defaultPlayer || { name: player, gender: '?', guest: true }; } return player; }); };
            const checkedInNames = new Set(getPlayerNames(state.availablePlayers));
            state.courts.forEach(court => court.players.forEach(p => checkedInNames.add(p.name)));
            state.clubMembers = MASTER_MEMBER_LIST.filter(p => !checkedInNames.has(p.name));
            state.clubMembers.sort((a,b) => a.name.localeCompare(b.name));
            state.availablePlayers = ensurePlayerObjects(state.availablePlayers, MASTER_MEMBER_LIST);
            state.availablePlayers.forEach(p => p.isPaused = p.isPaused || false);
            state.courts.forEach(court => {
                // FIXED: Ensure becameAvailableAt is set on old state data for consistency
                if (court.status === 'available' && court.becameAvailableAt === undefined) {
                    court.becameAvailableAt = Date.now();
                }
                // Initialize court-specific collapse state
                court.isCollapsed = court.isCollapsed === undefined ? false : court.isCollapsed;

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

    function updateHeaderClock(){ 
        const date = new Date();
        const weekday = date.toLocaleDateString("en-ZA", { weekday: "long" });
        const day = String(date.getDate()).padStart(2, '0');

        // Format time to hh:mm AM/PM
        let time = date.toLocaleTimeString("en-US", {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        // Convert to lowercase and remove the space (e.g., "09:05 AM" -> "09:05am")
        time = time.replace(' ', '').toLowerCase();

        headerClock.textContent = `${weekday} ${day}, ${time}`; 
    }

    function updateOverlaySpacers() {
        const headerLogo = document.getElementById('header-logo');
        const leftSpacer = document.getElementById('left-spacer');
        const rightSpacer = document.getElementById('right-spacer');

        if (!headerLogo || !leftSpacer || !rightSpacer) return;

        // Get the logo's width
        const logoWidth = headerLogo.offsetWidth;

        // Apply the logo's width to both the left and right spacers
        leftSpacer.style.width = `${logoWidth}px`;
        rightSpacer.style.width = `${logoWidth}px`;
    }

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

 /**
     * Translates a WMO weather code into a display icon.
     * @param {number} code The WMO weather code from the API.
     * @param {boolean} isDay Whether it is currently daytime (defaults to true).
     * @returns {string} An emoji character representing the weather.
     */
    function getWeatherIcon(code, isDay = true) {
        switch (code) {
            case 0: return isDay ? '☀️' : '🌙'; // Clear sky
            case 1: return '🌤️'; // Mainly clear
            case 2: return '⛅️'; // Partly cloudy
            case 3: return '☁️'; // Overcast
            case 45: case 48: return '🌫️'; // Fog
            case 51: case 53: case 55: return '🌦️'; // Drizzle
            case 56: case 57: return '🥶'; // Freezing Drizzle
            case 61: case 63: case 65: return '🌧️'; // Rain
            case 66: case 67: return '🥶'; // Freezing Rain
            case 71: case 73: case 75: return '🌨️'; // Snow fall
            case 77: return '❄️'; // Snow grains
            case 80: case 81: case 82: return '⛈️'; // Rain showers
            case 85: case 86: return '🌨️'; // Snow showers
            case 95: case 96: case 99: return '🌩️'; // Thunderstorm
            default: return '🤷';
        }
    }

    /**
     * Fetches and displays the weather forecast for Eldoraigne, Centurion.
     * Animates between high temp, low temp, and dew point with corresponding icons.
     */
    async function fetchWeather() {
        const weatherDisplay = document.getElementById('weather-display');
        if (!weatherDisplay) return;

        const lat = -25.8417;
        const lon = 28.1593;
        
        // MODIFIED: Fetch daily stats and hourly data for specific weather codes and dew point
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&hourly=weathercode,dewpoint_2m&timezone=auto`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                weatherDisplay.textContent = 'Weather unavailable';
                return;
            }
            const data = await response.json();
            
            // --- Extract Data ---
            const now = new Date();
            const currentHour = now.getHours();

            // Daily Stats
            const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
            const minTemp = Math.round(data.daily.temperature_2m_min[0]);
            
            // Hourly Stats for Icons & Dew Point
            const morningWeatherCode = data.hourly.weathercode[9]; // Weather at 9 AM
            const afternoonWeatherCode = data.hourly.weathercode[15]; // Weather at 3 PM
            const dewPoint = Math.round(data.hourly.dewpoint_2m[currentHour]); // Dew point for the current hour

            // Get Icons
            const morningIcon = getWeatherIcon(morningWeatherCode);
            const afternoonIcon = getWeatherIcon(afternoonWeatherCode);
            const dewPointIcon = '💧'; // Droplet icon

            // --- Create HTML Structure ---
            weatherDisplay.innerHTML = `
                <div id="icon-fader">
                    <span class="weather-icon icon-max is-visible">${afternoonIcon}</span>
                    <span class="weather-icon icon-min">${morningIcon}</span>
                    <span class="weather-icon icon-dew">${dewPointIcon}</span>
                </div>
                <div id="temp-fader">
                    <span class="temp-max is-visible">${maxTemp}°C</span>
                    <span class="temp-min">${minTemp}°C</span>
                    <span class="temp-dew">${dewPoint}°C</span>
                </div>
            `;

            // --- Start Animation Cycle ---
            const elements = {
                icons: [
                    weatherDisplay.querySelector('.icon-max'),
                    weatherDisplay.querySelector('.icon-min'),
                    weatherDisplay.querySelector('.icon-dew')
                ],
                temps: [
                    weatherDisplay.querySelector('.temp-max'),
                    weatherDisplay.querySelector('.temp-min'),
                    weatherDisplay.querySelector('.temp-dew')
                ]
            };
            
            let currentState = 0; // 0 = Max, 1 = Min, 2 = Dew
            const totalStates = 3;

            const animate = () => {
                const nextState = (currentState + 1) % totalStates;

                const iconToHide = elements.icons[currentState];
                const tempToHide = elements.temps[currentState];
                
                const iconToShow = elements.icons[nextState];
                const tempToShow = elements.temps[nextState];

                // 1. After a delay, fade out the current elements
                setTimeout(() => {
                    iconToHide.classList.remove('is-visible');
                    tempToHide.classList.remove('is-visible');
                }, 4500); // Start fade-out at 4.5s

                // 2. At the 5s mark, fade in the new elements
                setTimeout(() => {
                    iconToShow.classList.add('is-visible');
                    tempToShow.classList.add('is-visible');
                    currentState = nextState; // Update the state for the next cycle
                }, 5000); // This creates the 0.5s gap
            };
            
            setInterval(animate, 5000); // Run this sequence every 5 seconds

        } catch (error) {
            console.error('Failed to fetch weather:', error);
            weatherDisplay.textContent = 'Weather unavailable';
        }
    }
    
    function updateAlertStatusTimer() {
        if (!alertStatusDisplay) return;

        // Check current conditions
        const hasEnoughPlayers = state.availablePlayers.length >= 4;
        const isAnyCourtAvailable = findNextAvailableCourtId();
        
        alertStatusDisplay.classList.remove('hidden');

        if (!hasEnoughPlayers) {
            alertStatusDisplay.innerHTML = `<span class="timer-value">(${state.availablePlayers.length}/4)</span><span class="timer-label">Waiting for players</span>`;
            return;
        }

        if (!isAnyCourtAvailable) {
            alertStatusDisplay.innerHTML = `<span class="timer-value">Waiting</span><span class="timer-label">for courts...</span>`;
            return;
        }

        if (alertScheduleTime === 0) {
             alertStatusDisplay.innerHTML = `<span class="timer-value">Initializing</span><span class="timer-label">timer...</span>`;
             return;
        }
        
        const remainingMs = alertScheduleTime - Date.now();
        
        if (remainingMs <= 0) {
            alertStatusDisplay.innerHTML = `<span class="timer-value">Alert Due!</span><span class="timer-label">Next game ready</span>`; 
            return;
        }

        const remainingSeconds = Math.floor(remainingMs / 1000);
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;

        // MODIFIED: Create two spans to mirror the "On Duty" HTML structure
        alertStatusDisplay.innerHTML = `<span class="timer-value">${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}</span><span class="timer-label">Next alert in</span>`;
    }

    function dynamicallyCenterHeaderTitle() {
        const headerLogo = document.getElementById('header-logo');
        const headerTitle = document.querySelector('.header-title');
        const headerButtons = document.querySelector('.header-buttons');

        if (!headerLogo || !headerTitle || !headerButtons) return;

        // Get the actual rendered width of the side elements
        const logoWidth = headerLogo.offsetWidth;
        const buttonsWidth = headerButtons.offsetWidth;

        // Calculate the difference and amplify it by a factor of 3 based on feedback
        const widthDifference = (logoWidth - buttonsWidth) * 3;

        // Apply padding to the title to offset the difference
        // If the logo is wider (positive difference), add padding to the right to shift text left
        // If the buttons are wider (negative difference), add padding to the left to shift text right
        headerTitle.style.paddingRight = widthDifference > 0 ? `${widthDifference}px` : '0';
        headerTitle.style.paddingLeft = widthDifference < 0 ? `${-widthDifference}px` : '0';
    }

    function calculatePlayerPlaytime() { const stats = calculatePlayerStats(); const now = Date.now(); state.courts.forEach(court => { if (court.status === 'in_progress' && court.gameStartTime) { const elapsed = Date.now() - court.gameStartTime; court.players.forEach(player => { const name = player.name; stats[name] = stats[name] || { played: 0, won: 0, totalDurationMs: 0 }; stats[name].totalDurationMs += elapsed; }); } }); return stats; }

    function createCourtCard(court) {
        const requiredPlayers = state.selection.gameMode === "doubles" ? 4 : 2;
        const playersSelected = state.selection.players.length;
        const selectionComplete = playersSelected === requiredPlayers; // This line determines readiness
        const isSelectableForOverlay = selectionComplete && court.status === 'available'; 
        const isSelected = court.id === state.selection.courtId;
        
        // Determine initial icon and class based on court state
        const isCollapsed = court.isCollapsed;
        const bodyClass = isCollapsed ? 'is-collapsed' : '';
        const iconClass = isCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up';
        
        const courtCard = document.createElement('div');
        // APPLY isCollapsed CLASS TO THE MAIN CARD
        courtCard.className = `court-card status-${court.status} ${isSelected ? 'selected' : ''} ${isSelectableForOverlay ? 'selectable' : ''} ${bodyClass}`;
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
            // ADDED is-ready CLASS
            const readyClass = selectionComplete ? 'is-ready' : ''; 
            overlayHTML = `
                <div class="confirmation-overlay">
                    <button class="court-confirm-btn cancel" data-action="cancel-selection">Cancel</button>
                    <button class="court-confirm-btn confirm ${readyClass}" data-action="confirm-selection">Confirm</button>
                </div>
            `;
        } else if (isSelectableForOverlay) { 
            overlayHTML = `
                <div class="court-selection-overlay">
                    <button class="court-confirm-btn select-court" data-action="select-court-action">SELECT<br>COURT ${court.id}</button>
                </div>
            `;
        }
        else if (court.status === 'selecting_teams') {
            overlayHTML = `
                <div class="team-selection-overlay">
                    <button class="court-confirm-btn randomize" data-action="randomize-teams">Randomize Teams</button>
                    <button class="court-confirm-btn choose" data-action="choose-teams">Choose Teams</button>
                </div>
            `;
        } else if (court.status === 'game_pending') {
            overlayHTML = `
                <div class="game-action-overlay">
                    <button class="court-confirm-btn select-court" data-action="start-game">START MATCH</button>
                </div>
            `;
        } else if (court.status === 'in_progress') {
            const ballClass = court.isNewGame ? 'animate-in' : 'visible';

            overlayHTML = `
                <div class="game-action-overlay">
                    <button class="court-confirm-btn end-game-ball ${ballClass}" data-action="end-game">END<br>MATCH</button>
                </div>
            `;
        }

        courtCard.innerHTML = `
            <div class="card-header header-status-${court.status}">
                <h3>Court ${court.id}</h3>
                ${timerHTML}
                <div class="header-controls">
                    <span class="status-tag">${statusText}</span>
                    <button class="settings-btn summary-toggle-btn" data-court-id="${court.id}" data-card-type="court" title="Toggle Details">
                        <i class="mdi ${iconClass}"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="court-inner">
                    <div class="center-service-line"></div>
                    ${playerSpotsHTML}
                    ${overlayHTML} 
                </div>
                ${cancelBtnHTML}
            </div>`;
        
        return courtCard;
    }

    // NEW FUNCTION: Calculate the players with the highest stats overall
    function calculateStarPlayers() {
        const stats = calculatePlayerStats();
        const allPlayers = getAllKnownPlayers();
        
        let bestMaleWP = { name: null, wp: -1 };
        let bestFemaleWP = { name: null, wp: -1 };
        let mostTimePlayed = { name: null, duration: -1 };

        for (const name in stats) {
            const playerStats = stats[name];
            const playerObj = allPlayers.find(p => p.name === name);
            if (!playerObj || playerStats.played === 0) continue;

            const winPercentage = playerStats.won / playerStats.played;
            
            // 1. Check for Win Percentage Leader (Crown)
            if (playerObj.gender === 'M') {
                if (winPercentage > bestMaleWP.wp) {
                    bestMaleWP = { name: name, wp: winPercentage };
                }
            } else if (playerObj.gender === 'F') {
                if (winPercentage > bestFemaleWP.wp) {
                    bestFemaleWP = { name: name, wp: winPercentage };
                }
            }

            // 2. Check for Time Played Leader (Stopwatch)
            if (playerStats.totalDurationMs > mostTimePlayed.duration) {
                mostTimePlayed = { name: name, duration: playerStats.totalDurationMs };
            }
        }
        
        return {
            bestMaleWP: bestMaleWP.name,
            bestFemaleWP: bestFemaleWP.name,
            mostTimePlayed: mostTimePlayed.name
        };
    }
    // END NEW FUNCTION

    function createSummaryCard() {
        const total = totalPlayersAtClub();
        const available = state.availablePlayers.length;
        const onCourt = total - available;
        const availableCourtsCount = state.courts.filter(
            c => state.courtSettings.visibleCourts.includes(c.id) && c.status === 'available'
        ).length;
        const totalVisibleCourts = state.courtSettings.visibleCourts.length;
        const onDutyName = state.onDuty === 'None' ? 'Nobody' : state.onDuty;
        
        // Determine initial icon and class based on state
        const isExpanded = state.mobileControls.isSummaryExpanded;
        const bodyClass = isExpanded ? '' : 'is-collapsed';
        const iconClass = isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down';

        return `
            <div class="summary-card ${bodyClass}">
                <div class="card-header">
                    <h3>Information</h3>
                    <div class="header-controls">
                        <button class="settings-btn summary-toggle-btn" data-card-type="summary" title="Toggle Details">
                            <i class="mdi ${iconClass}"></i>
                        </button>
                        <button class="settings-btn" id="notify-now-btn" title="Force Notification Now">📢</button>
                        <button class="settings-btn" id="settings-btn" title="Admin Settings">⚙️</button>
                    </div>
                </div>
                <div class="card-body summary-body">
                    <div class="on-duty-section">
                        <div class="duty-info-container">
                            <button id="call-duty-btn" class="duty-image-placeholder" title="Call On-Duty Member">
                                <i class="mdi mdi-phone duty-icon"></i>
                                <span class="duty-text">PRESS</span>
                            </button>
                            <div class="duty-info">
                                <p class="duty-name">${onDutyName}</p>
                                <p class="duty-label">Is On Duty. Call Me!</p>
                            </div>
                        </div>
                        <span id="alert-status-display"></span>
                    </div>

                    <div class="summary-stats">
                        <p>Total Players: <strong style="float: right;">${total}</strong></p>
                        <p>Available Queue: <strong style="float: right; color: var(--confirm-color);">${available}</strong></p>
                        <p>On Court: <strong style="float: right; color: var(--cancel-color);">${onCourt}</strong></p>
                        <p>Available Courts: <strong style="float: right;">${availableCourtsCount} / ${totalVisibleCourts}</strong></p>
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

    // --- ADDED HELPER FUNCTION ---
    function createPlayerListItem(player, index, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, isSpecialCase = false, sliceEnd = 8, specialHighlightIndex = -1, isSelector = false, inGroup = false) {
        const li = document.createElement("li");
        const playerName = player.name;
        
        let statusText = player.guest ? 'Guest' : 'Member';
        let priorityText = '';
        let priorityClass = '';

        if (playerName === state.onDuty) {
            priorityText = 'Low Priority';
            priorityClass = 'player-priority';
        }

        let iconHtml = '';
        if (playerName === starPlayers.bestMaleWP || playerName === starPlayers.bestFemaleWP) {
            iconHtml += '<span style="color: gold; margin-left: 5px;">🏆</span>';
        }
        if (playerName === starPlayers.mostTimePlayed) {
            iconHtml += '<span style="color: #007bff; margin-left: 5px;">⏱️</span>';
        }
        
        // NEW: Pause/Play icon logic
        const isPaused = player.isPaused;
        const pauseIcon = isPaused ? 'mdi-play' : 'mdi-pause';
        const pauseAction = isPaused ? 'resume' : 'pause';

        const playtime = playerStats[playerName] ? formatDuration(playerStats[playerName].totalDurationMs) : '00h00m';
        
        li.innerHTML = `
            <div class="player-details">
                <div class="player-name-container">
                    <span class="player-name">${playerName}</span>
                    ${iconHtml}
                </div>
                ${priorityText ? `<span class="${priorityClass}">${priorityText}</span>` : `<span class="player-status">${statusText}</span>`}
            </div>
            <div class="player-stats">
                <button class="pause-toggle-btn" data-player-name="${playerName}" data-action="${pauseAction}" title="${isPaused ? 'Resume Game Play' : 'Pause Game Play'}">
                    <i class="mdi ${pauseIcon}"></i>
                </button>
                <div class="gender-container gender-${player.gender}">
                    <span class="player-gender">${player.gender}</span>
                </div>
                <span class="player-playtime">${playtime}</span>
            </div>
        `;
        li.dataset.playerName = playerName;

        // NEW: Add paused class
        if (player.isPaused) {
            li.classList.add("paused-player");
        }
        
        // --- REMOVED: Redundant lone-gender-highlight class check (now handled by structure) ---

        const isSelected = selectedPlayerNames.includes(playerName);
        if (isSelected) {
            li.classList.add("selected");
        } else {
            const isSelectionFull = selectedPlayerNames.length === requiredPlayers;
            let isDisabled = false;

            // This is the key logic that determines who is selectable
            if (isSpecialCase) {
                // In special case, only players outside the shortened slice end are disabled
                if (index >= sliceEnd) {
                    isDisabled = true;
                }
            } else {
                // In the normal case, a player is disabled if their index is outside the top 8.
                if (index >= sliceEnd) { 
                    isDisabled = true;
                }
            }

            // ADDED: Pause state overrides all other selection status, making it disabled for selection
            if (player.isPaused) {
                isDisabled = true;
            }
            
            // --- CRITICAL FIX: Explicitly re-enable the special highlighted player ---
            if (index === specialHighlightIndex) {
                isDisabled = false; 
            }
            
            if (isSelectionFull || isDisabled) {
                li.classList.add("disabled");
            }
        }
        
        // RENDER FIX: Add first-player class only to the item that should have the green box style (the actual selector)
        if (isSelector) {
            li.classList.add("first-player");
        } 
        
        // The player at index 0 must have the class for CSS to target it structurally, then remove it if not the selector.
        if (index === 0) { 
            li.classList.add("first-player");
        }
        
        if (!isSelector) { // Functional removal of green border/animation if not the selector
            li.classList.remove("first-player");
        }
        
        return li;
    }

    function handleOnDutyChange(e) {
        state.onDuty = e.target.value;
        saveState();
        enforceDutyPosition(); // --- ADDED LINE ---
        render();
    }

    function render(){
        const {gameMode, players: selectedPlayerNames, courtId: selectedCourtId} = state.selection;
        const requiredPlayers = gameMode === "doubles" ? 4 : 2;
        const playerStats = calculatePlayerPlaytime();
        const onDutyPlayer = state.onDuty; 
        
        const starPlayers = calculateStarPlayers(); 
        
        availablePlayersList.innerHTML = "";
        
        // --- LOGIC TO DETERMINE SELECTOR (GREEN BOX) START INDEX ---
        let sliceStart = 0;
        let selectorPlayer = state.availablePlayers[0];
        
        if (selectorPlayer && selectorPlayer.isPaused) {
            const firstUnpausedIndex = state.availablePlayers.findIndex(p => !p.isPaused);
            if (firstUnpausedIndex > 0) {
                sliceStart = firstUnpausedIndex;
                selectorPlayer = state.availablePlayers[sliceStart];
            } else {
                selectorPlayer = null;
            }
        }
        
        const renderQueue = state.availablePlayers;
        
        if (renderQueue.length === 0 && selectedPlayerNames.length === 0){
            const li = document.createElement("li");
            li.className = "waiting-message";
            li.textContent = totalPlayersAtClub() > 0 ? "All players are on court." : "Waiting For Players To Check In...";
            availablePlayersList.appendChild(li);
        } else {
            // --- CORE LOGIC: EXPANSION, IMBALANCE, and SLICE END (FIXED) ---
            let isSpecialCase = false;
            let selectableGroupBaseSize = 7; 
            let specialHighlightIndex = -1;
            let nextPlayerSliceEnd = renderQueue.length; 

            const playersAfterSelector = renderQueue.slice(sliceStart + 1);
            
            // Collect the first 8 available (unpaused) players after the selector
            const firstEightUnpaused = [];
            for (const player of playersAfterSelector) {
                if (!player.isPaused) {
                    firstEightUnpaused.push(player);
                }
                if (firstEightUnpaused.length === 8) break; 
            }

            // Check the first 7 available slots for imbalance
            const availableInSelectableRange = firstEightUnpaused.slice(0, selectableGroupBaseSize); 

            if (availableInSelectableRange.length === selectableGroupBaseSize) {
                const selectorGender = selectorPlayer ? selectorPlayer.gender : null;
                
                const isImbalanced = availableInSelectableRange.every(p => p.gender !== selectorGender);

                if (isImbalanced) {
                    // Imbalance detected. The orange box must be shortened to exclude the 7th available player initially.
                    
                    // 1. Find the 7th available player (e.g., David Wright). This is the player to be excluded.
                    const seventhAvailablePlayer = availableInSelectableRange[selectableGroupBaseSize - 1];
                    
                    // 2. Find the absolute index of the 7th available player in the full queue.
                    let searchStartIndex = renderQueue.findIndex(p => p.name === seventhAvailablePlayer.name);
                    
                    // Initial assumption: shorten the orange group to the player BEFORE the 7th.
                    nextPlayerSliceEnd = searchStartIndex; 
                    isSpecialCase = true;
                    
                    // 3. Find the first available player of the selector's gender to highlight.
                    const searchPool = renderQueue.slice(searchStartIndex); 
                    const foundPlayerIndexInSearchPool = searchPool.findIndex(p => p.gender === selectorGender && !p.isPaused);

                    if (foundPlayerIndexInSearchPool !== -1) {
                        specialHighlightIndex = searchStartIndex + foundPlayerIndexInSearchPool;
                    } else {
                        // CRITICAL FIX: No suitable player found after the initial 7. 
                        // Revert the orange group to include the full 7 players (index after the 7th player).
                        nextPlayerSliceEnd = searchStartIndex + 1; // Index of the player AFTER the 7th
                        isSpecialCase = false;
                        specialHighlightIndex = -1; // Ensure no player is highlighted
                    }
                } else {
                    // Normal case: No imbalance. The orange box ends after the 7th available player.
                    const seventhAvailablePlayer = availableInSelectableRange[selectableGroupBaseSize - 1];
                    nextPlayerSliceEnd = renderQueue.findIndex(p => p.name === seventhAvailablePlayer.name) + 1;
                }
            } else {
                nextPlayerSliceEnd = renderQueue.length;
            }
            // --- END CORE LOGIC ---

            if (renderQueue.length > 0) {
                
                // 1. Render all players BEFORE the selector (paused players at the front).
                const playersBeforeSelector = renderQueue.slice(0, sliceStart);
                playersBeforeSelector.forEach((player, index) => {
                    const li = createPlayerListItem(player, index, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, isSpecialCase, nextPlayerSliceEnd, specialHighlightIndex, false, false);
                    availablePlayersList.appendChild(li);
                });

                // 2. Render the actual SELECTOR player (the green box).
                if (selectorPlayer) {
                    const selectorIndex = sliceStart;
                    const liSelector = createPlayerListItem(selectorPlayer, selectorIndex, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, isSpecialCase, nextPlayerSliceEnd, specialHighlightIndex, true, false); 
                    availablePlayersList.appendChild(liSelector);
                }

                // 3. Render the main orange group (starts immediately AFTER the selector).
                const orangeGroupPlayers = renderQueue.slice(sliceStart + 1, nextPlayerSliceEnd);
                if (orangeGroupPlayers.length > 0) {
                    const groupDiv = document.createElement('div');
                    groupDiv.className = 'next-players-group';
                    orangeGroupPlayers.forEach((player, index) => {
                        const playerIndex = sliceStart + 1 + index;
                        const playerLi = createPlayerListItem(player, playerIndex, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, isSpecialCase, nextPlayerSliceEnd, specialHighlightIndex, false, true);
                        groupDiv.appendChild(playerLi);
                    });
                    availablePlayersList.appendChild(groupDiv);
                }
                
                // 4. Render ALL remaining players sequentially (FIXED ORDER).
                const playersAfterOrangeGroup = renderQueue.slice(nextPlayerSliceEnd);

                playersAfterOrangeGroup.forEach((player, index) => {
                    const playerIndex = nextPlayerSliceEnd + index; // Absolute index in renderQueue
                    const playerLi = createPlayerListItem(player, playerIndex, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, isSpecialCase, nextPlayerSliceEnd, specialHighlightIndex, false, false);
                    
                    // If this player is the specially highlighted player, wrap them.
                    if (playerIndex === specialHighlightIndex) {
                        const groupDiv = document.createElement('div');
                        groupDiv.className = 'next-players-group';
                        groupDiv.appendChild(playerLi);
                        availablePlayersList.appendChild(groupDiv);
                    } else {
                        // Otherwise, append the player item as normal.
                        availablePlayersList.appendChild(playerLi);
                    }
                });
                
            }
        }
        
        if (renderQueue.length > 0 && renderQueue.length < 4) {
            const li = document.createElement("li");
            li.textContent = "Waiting For More Players...";
            li.className = "waiting-message";
            availablePlayersList.appendChild(li);
        }
        
        // --- UPDATE AVAILABLE PLAYERS COLLAPSE STATE ---
        const playersToggleIcon = document.querySelector('#players-toggle-btn i');
        if (playersToggleIcon) {
            const isExpanded = state.mobileControls.isPlayersExpanded;
            playersToggleIcon.className = `mdi ${isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'}`;
        }
        availablePlayersSection.classList.toggle('is-collapsed', !state.mobileControls.isPlayersExpanded);
        
        
        courtGrid.innerHTML = "";
        
        courtGrid.insertAdjacentHTML('afterbegin', createSummaryCard());

        alertStatusDisplay = document.getElementById('alert-status-display');
        
        state.courts.filter(court => state.courtSettings.visibleCourts.includes(court.id)).forEach(court => {
            const card = createCourtCard(court);
            courtGrid.appendChild(card);
        });
        
        const courtInSetup = state.courts.find(c => c.status === "selecting_teams" || c.status === "game_pending");
        const courtSelectingTeams = state.courts.find(c => c.status === "selecting_teams");
        const courtGamePending = state.courts.find(c => c.status === "game_pending");
        const firstAvailablePlayer = selectorPlayer ? selectorPlayer.name : null; 
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
            infoBarText.textContent = `${firstAvailablePlayer.split(' ')[0]}, please select players for a game.`;
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
        modeDoublesBtn.disabled = renderQueue.length < 4;

        availablePlayersSection.classList.toggle("locked", !!courtInSetup || (selectedPlayerNames.length === 0 && allCourtsBusy));
        initSummaryCardElements();

        setTimeout(setPlayerListHeight, 0);
    }

    // NEW FUNCTION: Resets collapse state when screen is wide (desktop/tablet)
    function resetCollapseOnResize() {
        // Breakpoint for switching from stacked to two-column layout
        const DESKTOP_BREAKPOINT = 900; 

        // We only need to reset the state if the window is wider than the mobile/stacked breakpoint
        if (window.innerWidth > DESKTOP_BREAKPOINT) {
            let stateChanged = false;

            if (!state.mobileControls.isSummaryExpanded) {
                state.mobileControls.isSummaryExpanded = true;
                stateChanged = true;
            }

            if (!state.mobileControls.isPlayersExpanded) {
                state.mobileControls.isPlayersExpanded = true;
                stateChanged = true;
            }

            state.courts.forEach(court => {
                if (court.isCollapsed) {
                    court.isCollapsed = false;
                    stateChanged = true;
                }
            });

            if (stateChanged) {
                // Save the state immediately and re-render the UI
                saveState();
                render();
            }
        }
    }
    
    // UTILITY: Finds the ID of the first available and visible court based on hierarchy
    function findNextAvailableCourtId() {
        for (const id of COURT_HIERARCHY) {
            const court = state.courts.find(c => c.id === id);
            // Check if court exists, is visible, and is available
            if (court && state.courtSettings.visibleCourts.includes(id) && court.status === 'available') {
                return id;
            }
        }
        return null;
    }

    function handleCourtGridClick(e){
    const courtCard = e.target.closest(".court-card");
    if (!courtCard) return;

    const action = e.target.dataset.action;
    const courtId = courtCard.dataset.courtId;

    // --- Explicit Action Handlers ---

    // These actions are on the team selection overlay
    if (action === 'randomize-teams') {
        handleRandomizeTeams(courtId);
        return;
    }
    if (action === 'choose-teams') {
        handleChooseTeams(courtId);
        return;
    }

    // These actions handle other game states
    if (action === 'cancel-game-setup') {
        handleCancelGame(courtId);
        return;
    }
    if (action === 'start-game') {
        handleStartGame(courtId);
        return;
    }
    if (action === 'end-game') {
    const button = e.target.closest('.end-game-ball');
    if (button) {
        // This is the fix: Remove the class that made it appear
        button.classList.remove('animate-in');
        
        // Now, add the class that makes it disappear
        button.classList.add('hide-anim');

        setTimeout(() => {
            // After the animation, call the original function to open the modal
            handleEndGame(courtId);
        }, 1500); // 1.5-second delay for the hitWinner animation
    } else {
        // Fallback if the button can't be found
        handleEndGame(courtId);
    }
    return;
}
    
    // This is the main action to select a court and immediately set it up
    if (action === 'select-court-action') {
    const clickedButton = e.target.closest('.court-confirm-btn');
    if (!clickedButton) return;

    // Get all the selectable tennis ball buttons currently on screen
    const allSelectableButtons = document.querySelectorAll('.court-card.selectable .court-confirm-btn.select-court');

    // 1. Animate the SELECTED ball using the spin animation
    clickedButton.classList.remove('serve-in'); // Remove the serve-in class to avoid conflicts
    clickedButton.classList.add('hide-anim'); // This triggers bounceSelect

    // 2. Animate the OTHER balls sequentially using the hitWinner animation
    let delay = 0;
    allSelectableButtons.forEach(button => {
        if (button !== clickedButton) {
            setTimeout(() => {
                button.classList.remove('serve-in');
                button.classList.add('serve-out');
            }, delay);
            delay += 200; // Stagger the fly-off animation
        }
    });

    // 3. After the main animation is done, proceed with the game logic
    setTimeout(() => {
        const { players: selectedPlayerNames, gameMode } = state.selection;
        const requiredPlayers = gameMode === "doubles" ? 4 : 2;

        if (selectedPlayerNames.length !== requiredPlayers || !courtId) return;

        const court = state.courts.find(c => c.id === courtId);
        const selectedPlayerObjects = selectedPlayerNames.map(name => getPlayerByName(name));

        court.queueSnapshot = JSON.parse(JSON.stringify(state.availablePlayers));
        court.players = [...selectedPlayerObjects];
        court.gameMode = gameMode;

        if (gameMode === 'doubles') {
            court.status = "selecting_teams";
            court.teams.team1 = [];
            court.teams.team2 = [];
        } else {
            court.teams.team1 = [selectedPlayerObjects[0]];
            court.teams.team2 = [selectedPlayerObjects[1]];
            court.status = "game_pending";
            court.autoStartTimeTarget = Date.now() + 60000;
            court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000);
        }

        state.availablePlayers = state.availablePlayers.filter(p => !selectedPlayerNames.includes(p.name));
        state.selection = { gameMode: state.selection.gameMode, players: [], courtId: null };

        updateGameModeBasedOnPlayerCount();
        enforceDutyPosition();
        render();
        saveState();

    }, 2000); // Wait 2 seconds for the bounceSelect animation to finish
    
    return;
}
}
    
    function formatDuration(ms) { if (ms === 0) return "00h00m"; const totalMinutes = Math.floor(ms / 60000); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; return `${String(hours).padStart(2, "0")}h${String(minutes).padStart(2, "0")}m`; }
    function calculatePlayerStats(){
        const stats = {};
        state.gameHistory.forEach(game => {
            const allPlayers = [...game.teams.team1, ...game.teams.team2];
            const [hStr, mStr] = game.duration.split('h').map(s => s.replace('m', ''));
            const gameDuration = (parseInt(hStr, 10) * 3600000) + (parseInt(mStr, 10) * 60000);

            allPlayers.forEach(player => {
                stats[player] = stats[player] || { played: 0, won: 0, totalDurationMs: 0 };
                stats[player].totalDurationMs += gameDuration;
            });

            if (game.winner !== 'skipped') {
                const winnerTeam = game.winner === "team1" ? game.teams.team1 : game.teams.team2;
                if (game.score) {
                    const loserTeam = game.winner === "team1" ? game.teams.team2 : game.teams.team1;
                    const winnerScore = game.score.team1 > game.score.team2 ? game.score.team1 : game.score.team2;
                    const loserScore = game.score.team1 > game.score.team2 ? game.score.team2 : game.score.team1;
                    allPlayers.forEach(player => {
                        if (winnerTeam.includes(player)) {
                            stats[player].played += winnerScore + loserScore;
                            stats[player].won += winnerScore;
                        } else if (loserTeam.includes(player)) {
                            stats[player].played += winnerScore + loserScore;
                            stats[player].won += loserScore;
                        }
                    });
                } else {
                    allPlayers.forEach(player => {
                        stats[player].played += 1;
                        if (winnerTeam.includes(player)) {
                            stats[player].won += 1;
                        }
                    });
                }
            }
        });
        return stats;
    }
    function formatWinPercentage(played, won){ return played === 0 ? "N/A" : `${Math.round(won / played * 100)}%`; }

// ADD NEW FUNCTION: Pause/Resume game play click handler
    function handlePauseToggleClick(e) {
        const button = e.target.closest(".pause-toggle-btn");
        // We know button exists because it was checked in handlePlayerClick
        
        const playerName = button.dataset.playerName;
        const action = button.dataset.action; // 'pause' or 'resume'
        const playerObj = state.availablePlayers.find(p => p.name === playerName);

        if (!playerObj) return;

        const verb = action === 'pause' ? 'pause' : 'resume';
        const message = action === 'pause' 
            ? `Are you sure you want to pause your game play? You will remain in position #${state.availablePlayers.indexOf(playerObj) + 1} until you resume.` 
            : `Are you sure you want to resume your game play? You will be immediately restored to position #${state.availablePlayers.indexOf(playerObj) + 1}.`;

        cancelConfirmModal.querySelector("h3").textContent = `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`;
        cancelConfirmModal.querySelector("p").textContent = message;
        modalBtnYesConfirm.textContent = verb.charAt(0).toUpperCase() + verb.slice(1);
        modalBtnNo.textContent = "Close";
        
        cancelConfirmModal.dataset.mode = "pauseToggle";
        cancelConfirmModal.dataset.player = playerName;
        cancelConfirmModal.dataset.verb = action;

        cancelConfirmModal.classList.remove("hidden");
    }

// ADD NEW FUNCTION: Pause/Resume game play click handler (IMMEDIATE ACTION)
    function handlePauseToggleClick(e) {
        const button = e.target.closest(".pause-toggle-btn");
        if (!button) return;
        
        const playerName = button.dataset.playerName;
        const action = button.dataset.action;
        const playerObj = state.availablePlayers.find(p => p.name === playerName);

        if (playerObj) {
            // IMMEDIATE ACTION: Toggle the paused state
            playerObj.isPaused = (action === 'pause');
            
            // Re-run necessary updates
            updateGameModeBasedOnPlayerCount();
            enforceDutyPosition();
            render();
            saveState();
            checkAndPlayAlert(false);
        }
    }

    function handleSort(key) { if (state.statsFilter.sortKey === key) { state.statsFilter.sortOrder = state.statsFilter.sortOrder === 'asc' ? 'desc' : 'asc'; } else { state.statsFilter.sortKey = key; state.statsFilter.sortOrder = key === 'name' ? 'asc' : 'desc'; } renderHistory(); saveState(); }
    function renderHistory(){
        const stats = calculatePlayerStats();
        const allKnownPlayers = getAllKnownPlayers();
        
        historyList.innerHTML = "";
        document.querySelector("#history-page h3").textContent = state.historyViewMode === "games" ? "Game History" : "Player Stats";
        historyToggleViewBtn.textContent = state.historyViewMode === "games" ? "Show Player Stats" : "Show Game History";
        historyToggleViewBtn.classList.toggle("secondary", state.historyViewMode === "stats");
        
        if (state.historyViewMode === "stats") {
            let playersWithStats = Object.keys(stats).filter(name => {
                const playerObj = allKnownPlayers.find(p => p.name === name);
                if (!playerObj) return true;
                if (state.statsFilter.gender === 'all') return true;
                return playerObj.gender === 'M' || playerObj.gender === 'F';
            });

            playersWithStats.sort((a, b) => {
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

            // --- MODIFIED VARIABLE ---
            const genderFilterHTML = `
                <div class="gender-selector" style="justify-content: center; margin-bottom: 1rem;">
                    <div class="radio-group">
                        <label> <input type="radio" name="stats-gender-filter" value="all" ${state.statsFilter.gender === 'all' ? 'checked' : ''}> All </label>
                        <label> <input type="radio" name="stats-gender-filter" value="M" ${state.statsFilter.gender === 'M' ? 'checked' : ''}> Male </label>
                        <label> <input type="radio" name="stats-gender-filter" value="F" ${state.statsFilter.gender === 'F' ? 'checked' : ''}> Female </label>
                    </div>
                </div>
            `;
            
            if (playersWithStats.length === 0) {
                historyList.innerHTML = genderFilterHTML + '<p style="text-align: center; color: #6c757d;">No completed games with stats to display.</p>';
            } else {
                const getSortIcon = (key) => {
                    if (state.statsFilter.sortKey !== key) return '';
                    return state.statsFilter.sortOrder === 'asc' ? ' 🔼' : ' 🔽';
                };

                let tableHTML = `
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

                playersWithStats.forEach(name => {
                    const playerStats = stats[name];
                    const playerObj = allKnownPlayers.find(p => p.name === name);
                    const genderDisplay = playerObj ? playerObj.gender : '?';
                    tableHTML += `
                        <div class="history-teams" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding: 0.8rem 1rem; color: var(--dark-text);">
                            <span style="flex-grow: 1;">${name} <span style="font-style: italic; color: #aaa;">(${genderDisplay})</span></span>
                            <span style="display: flex; gap: 2rem; font-weight: 500; flex-shrink: 0;">
                                <span style="min-width: 90px; text-align: right;">${formatDuration(playerStats.totalDurationMs)}</span>
                                <span style="min-width: 140px; text-align: right;">${playerStats.won}/${playerStats.played} (${formatWinPercentage(playerStats.played, playerStats.won)})</span>
                            </span>
                        </div>
                    `;
                });
                historyList.innerHTML = `<div style="padding: 0.5rem 0;">${genderFilterHTML}${tableHTML}</div>`;
            }

            document.querySelectorAll('input[name="stats-gender-filter"]').forEach(radio => radio.addEventListener('change', handleStatsFilterChange));
            document.querySelectorAll('.sort-btn').forEach(btn => btn.addEventListener('click', handleSortClick));

        } else { // --- GAME HISTORY VIEW (CORRECTED) ---
            if (state.gameHistory.length === 0) {
                historyList.innerHTML = '<p style="text-align: center; color: #6c757d;">No games have been completed yet.</p>';
            } else {
                let headerHTML = `
                    <div class="history-item" style="border-bottom: 2px solid var(--primary-blue); font-weight: bold; background-color: #f8f9fa;">
                        <div class="history-details" style="margin-bottom: 0;">
                            <span class="game-time-cell">Time</span>
                            <span>Game / Duration</span>
                            <span class="score-cell">Score</span>
                        </div>
                    </div>
                `;
                
                let gamesHTML = [...state.gameHistory].reverse().map(game => {
                    const endTime = new Date(game.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    const isResultSkipped = game.winner === 'skipped';
                    const isScoreSkipped = game.score === null && !isResultSkipped;
                    const isTeam1Winner = game.winner === "team1";
                    
                    let scoreDisplay;
                    if (isResultSkipped) {
                        scoreDisplay = 'Result Skipped';
                    } else if (isScoreSkipped) {
                        scoreDisplay = 'Scores Skipped';
                    } else {
                        scoreDisplay = `${game.score.team1} - ${game.score.team2}`;
                        if (game.score.tiebreak1 !== null) {
                            scoreDisplay += ` (${game.score.tiebreak1}-${game.score.tiebreak2})`;
                        }
                    }

                    const team1Players = game.teams.team1.join(" & ");
                    const team2Players = game.teams.team2.join(" & ");
                    
                    const team1Class = isResultSkipped ? '' : (isTeam1Winner ? 'winner' : 'loser');
                    const team2Class = isResultSkipped ? '' : (isTeam1Winner ? 'loser' : 'winner');

                    return `
                        <div class="history-item">
                            <div class="history-details">
                                <span class="game-time-cell">${endTime}</span>
                                <span>Court ${game.court} - ${game.duration}</span>
                                <span class="score-cell">${scoreDisplay}</span>
                            </div>
                            <div class="history-teams">
                                <p class="${team1Class}">Team 1: ${team1Players}</p>
                                <p class="${team2Class}">Team 2: ${team2Players}</p>
                            </div>
                        </div>
                    `;
                }).join('');
                
                historyList.innerHTML = headerHTML + gamesHTML;
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

    function handleStatsFilterChange(e) { state.statsFilter.gender = e.target.value; saveState(); renderHistory(); }
    function handleSortClick(e) { const key = e.target.dataset.sortKey; if (key) { handleSort(key); } }
    
    // Player selection and game setup functions (no alert calls here)
    function handleCancelSelection(){ state.selection.players = []; state.selection.courtId = null; render(); saveState(); }
    function handleModeChange(mode){ state.selection.gameMode = mode; state.selection.players = []; state.selection.courtId = null; render(); saveState(); }
    function handlePlayerClick(e){
    // 1. Check for the Pause button click first
    const pauseButton = e.target.closest(".pause-toggle-btn");
    if (pauseButton) {
        handlePauseToggleClick(pauseButton);
        return;
    }
    
    const li = e.target.closest("li");
    
    let firstAvailablePlayer = state.availablePlayers[0] ? state.availablePlayers[0].name : null;
    if (state.availablePlayers[0] && state.availablePlayers[0].isPaused) {
        const firstUnpaused = state.availablePlayers.find(p => !p.isPaused);
        firstAvailablePlayer = firstUnpaused ? firstUnpaused.name : null;
    }
    
    if (li && li.dataset.playerName === firstAvailablePlayer) return; 
    if (!li || li.classList.contains("disabled") || li.classList.contains("waiting-message") || state.availablePlayers.length === 0) return;
    
    const playerName = li.dataset.playerName; 
    const {players: selectedPlayerNames, gameMode} = state.selection; 
    const requiredPlayers = gameMode === "doubles" ? 4 : 2; 

    // Player selection logic (no changes here)
    if (selectedPlayerNames.length === 0) { 
        if (playerName !== firstAvailablePlayer) { 
            selectedPlayerNames.push(firstAvailablePlayer, playerName); 
        } else { 
            selectedPlayerNames.push(playerName); 
        } 
    } else { 
        if (selectedPlayerNames.includes(playerName)) { 
            selectedPlayerNames.splice(selectedPlayerNames.indexOf(playerName), 1); 
            if (selectedPlayerNames.length === 1) { 
                state.selection.players = []; 
            } 
        } else if (selectedPlayerNames.length < requiredPlayers) { 
            selectedPlayerNames.push(playerName); 
        } 
    }

    // First, render the UI to add the '.selectable' class to the courts
    render(); 
    saveState();

    // NEW LOGIC: If selection is now complete, trigger the sequential animation
    if (state.selection.players.length === requiredPlayers) {
        const selectableCourts = document.querySelectorAll('.court-card.selectable .court-confirm-btn.select-court');
        selectableCourts.forEach((button, index) => {
            setTimeout(() => {
                button.classList.add('serve-in');
            }, index * 200); // Stagger each animation by 200ms
        });
    }
}
    function handleConfirmSelection(){
        const {players: selectedPlayerNames, courtId, gameMode} = state.selection;
        const requiredPlayers = gameMode === "doubles" ? 4 : 2;
        if (selectedPlayerNames.length !== requiredPlayers || !courtId) return;
        const court = state.courts.find(c => c.id === courtId);
        const selectedPlayerObjects = selectedPlayerNames.map(name => getPlayerByName(name));
        
        // --- Stores a snapshot of the entire queue before modification ---
        court.queueSnapshot = JSON.parse(JSON.stringify(state.availablePlayers));

        court.players = [...selectedPlayerObjects];
        court.gameMode = gameMode;
        if (gameMode === 'doubles') {
            court.status = "selecting_teams";
            court.teams.team1 = [];
            court.teams.team2 = [];
        } else {
            court.teams.team1 = [selectedPlayerObjects[0]];
            court.teams.team2 = [selectedPlayerObjects[1]];
            court.status = "game_pending";
            court.autoStartTimeTarget = Date.now() + 60000;
            court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000);
        }
        state.availablePlayers = state.availablePlayers.filter(p => !selectedPlayerNames.includes(p.name));
        state.selection = {gameMode: state.selection.gameMode, players: [], courtId: null};
        updateGameModeBasedOnPlayerCount();
        enforceDutyPosition();
        render();
        saveState();
    }
    function handleRandomizeTeams(courtId){ const court = state.courts.find(c => c.id === courtId); let players = [...court.players].sort(() => 0.5 - Math.random()); court.teams.team1 = [players[0], players[1]]; court.teams.team2 = [players[2], players[3]]; court.status = "game_pending"; court.autoStartTimeTarget = Date.now() + 60000; court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000); render(); saveState(); }
    //function handleChooseTeams(courtId){ chooseTeamsModal.classList.remove("hidden"); modalPlayerList.innerHTML = ""; const court = state.courts.find(c => c.id === courtId); court.players.forEach(player => { const div = document.createElement("div"); div.className = "modal-player"; div.textContent = player.name; div.dataset.player = player.name; modalPlayerList.appendChild(div); }); chooseTeamsModal.dataset.courtId = courtId; }
    function handleChooseTeams(courtId){ 
        chooseTeamsModal.classList.remove("hidden"); 
        
        // Clear and reset the modal list
        modalPlayerList.innerHTML = ""; 
        modalPlayerList.classList.remove('two-row-grid');
        
        // FIX: Update button text immediately upon showing modal
        document.getElementById('modal-confirm-teams-btn').textContent = "Confirm";
        document.getElementById('modal-cancel-btn').textContent = "Close";
        
        const court = state.courts.find(c => c.id === courtId);
        
        // Set up the player list in a two-row grid style
        if (court && court.players.length === 4) {
            modalPlayerList.classList.add('two-row-grid'); // Add new class for layout
            
            court.players.forEach(player => { 
                const div = document.createElement("div"); 
                div.className = "modal-player"; 
                div.textContent = player.name; 
                div.dataset.player = player.name; 
                modalPlayerList.appendChild(div); 
            }); 
            chooseTeamsModal.dataset.courtId = courtId; 
        }
        
        // Reset confirmation button state
        modalConfirmBtn.disabled = true; 
        modalConfirmBtn.classList.remove('modal-confirm-ready');
        
        // Add event listener to handle visual readiness
        modalPlayerList.addEventListener('click', () => {
            const selectedCount = modalPlayerList.querySelectorAll(".selected").length;
            if (selectedCount === 2) {
                modalConfirmBtn.disabled = false;
                modalConfirmBtn.classList.add('modal-confirm-ready');
            } else {
                modalConfirmBtn.disabled = true;
                modalConfirmBtn.classList.remove('modal-confirm-ready');
            }
        });
    }
    function handleModalPlayerClick(e){ if (e.target.classList.contains("modal-player")){ const selectedCount = modalPlayerList.querySelectorAll(".selected").length; if (e.target.classList.contains("selected")){ e.target.classList.remove("selected"); } else if (selectedCount < 2) { e.target.classList.add("selected"); } } }
    function handleModalConfirm(){ const courtId = chooseTeamsModal.dataset.courtId; const court = state.courts.find(c => c.id === courtId); const team1Names = Array.from(modalPlayerList.querySelectorAll(".selected")).map(el => el.dataset.player); if (team1Names.length === 2) { const team1Players = team1Names.map(name => getPlayerByName(name)); const team2Players = court.players.filter(player => !team1Names.includes(player.name)); court.teams.team1 = team1Players; court.teams.team2 = team2Players; court.status = "game_pending"; chooseTeamsModal.classList.add("hidden"); court.autoStartTimeTarget = Date.now() + 60000; court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000); render(); saveState(); } else { alert("Please select exactly 2 players for Team 1."); } }
    function handleStartGame(courtId){
        const court = state.courts.find(c => c.id === courtId);
        if (!court) return;

        const courtCardEl = document.querySelector(`.court-card[data-court-id="${courtId}"]`);
        const startButton = courtCardEl ? courtCardEl.querySelector('[data-action="start-game"]') : null;

        if (startButton) {
            startButton.classList.add('start-game-hop');
        }

        setTimeout(() => {
            if(court.autoStartTimer) {
                clearTimeout(court.autoStartTimer);
                court.autoStartTimer = null;
            }
            court.status = "in_progress";
            court.gameStartTime = Date.now();
            court.autoStartTimeTarget = null;
            court.isNewGame = true; // Flag that this is the first render for this game

            render(); // This will render the card with the animation class

            court.isNewGame = false; // Immediately remove the flag for all future renders
            saveState(); // Save the final state

            resetAlertSchedule();
            checkAndPlayAlert(false);
        }, 2000); // Wait for the "start-game-hop" animation to finish
    }

    function handleStartGame(courtId){
        const court = state.courts.find(c => c.id === courtId);
        if (!court) return;

        const courtCardEl = document.querySelector(`.court-card[data-court-id="${courtId}"]`);
        const startButton = courtCardEl ? courtCardEl.querySelector('[data-action="start-game"]') : null;

        if (startButton) {
            startButton.classList.add('start-game-hop');
        }

        setTimeout(() => {
            if(court.autoStartTimer) {
                clearTimeout(court.autoStartTimer);
                court.autoStartTimer = null;
            }
            court.status = "in_progress";
            court.gameStartTime = Date.now();
            court.autoStartTimeTarget = null;
            court.isNewGame = true; 

            // --- NEW GAME START ANNOUNCEMENT LOGIC ---
            const team1Names = getPlayerNames(court.teams.team1);
            const team2Names = getPlayerNames(court.teams.team2);
            let announcementMessage;
            
            const formatTeamNames = (names) => {
                if (names.length === 1) return names[0];
                if (names.length === 2) return `${names[0]} and ${names[1]}`;
                // For social tennis matches with 3+ in a team (e.g., in a 3v3 match)
                return names.slice(0, -1).join(', ') + ` and ${names.slice(-1)[0]}`;
            };

            if (court.gameMode === 'singles') {
                // Singles format: Player A and Player B are on Court X.
                announcementMessage = `${team1Names[0]} and ${team2Names[0]} ....are on Court ${court.id}.... Lekker Speel!`;
            } else if (court.gameMode === 'doubles') {
                // Doubles format: its player w & playerx vs player y & player z on Court X... Lekker Speel!
                const team1String = formatTeamNames(team1Names);
                const team2String = formatTeamNames(team2Names);
                
                announcementMessage = `It's team ${team1String} versus team ${team2String} ....on Court ${court.id}.... Lekker Speel!`;
            } else {
                // Fallback for other player counts/modes
                const playerNames = getPlayerNames(court.players);
                const namesList = playerNames.join(' and ');
                announcementMessage = `${namesList} are on Court ${court.id}. Game in progress!`;
            }
            
            // Announce the players and court
            playAlertSound(announcementMessage, null);
            // --- END NEW GAME START ANNOUNCEMENT LOGIC --


            render(); 

            court.isNewGame = false;
            saveState();

            resetAlertSchedule();
            checkAndPlayAlert(false);
        }, 2000); // Wait for the "start-game-hop" animation to finish
    }


    function handleEndGame(courtId){
        const court = state.courts.find(c => c.id === courtId);
        if(!court) return;
        
        endGameModal.dataset.courtId = courtId;
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
        
        // Reset and hide sections
        scoreSection.classList.add('hidden');
        tieBreakerArea.classList.add('hidden');
        winningScoreInput.value = '';
        losingScoreInput.value = '';
        winnerTiebreakInput.value = '';
        loserTiebreakInput.value = '';
        endGameModal.removeAttribute('data-winner');
        
        // --- MODIFIED LOGIC ---
        const skipBtn = document.getElementById('end-game-skip-btn');
        
        // Initial state: Button skips the entire result
        skipBtn.textContent = 'Skip Result';
        skipBtn.dataset.action = 'skip-result';

        endGameTeams.querySelectorAll('.team-selection').forEach(el => {
            el.addEventListener('click', (e) => {
                const selectedTeam = e.currentTarget.dataset.team;
                endGameModal.dataset.winner = selectedTeam;

                endGameTeams.querySelectorAll('.team-selection').forEach(teamEl => {
                    teamEl.classList.toggle('winner', teamEl.dataset.team === selectedTeam);
                    teamEl.classList.toggle('loser', teamEl.dataset.team !== selectedTeam);
                });
                
                // When winner is selected, button's function changes
                scoreSection.classList.remove('hidden');
                skipBtn.textContent = 'Skip Scores';
                skipBtn.dataset.action = 'skip-scores';
                validateEndGameForm();
            });
        });

        validateEndGameForm();
        endGameModal.classList.remove("hidden");
    }

    function handleCancelGame(courtId){ 
        cancelConfirmModal.querySelector("h3").textContent = "Confirm Cancellation"; 
        cancelConfirmModal.querySelector("p").textContent = "Are you sure you want to cancel this game? Players will be returned to their original queue positions."; 
        modalBtnYesConfirm.textContent = "Confirm"; // Standardized Text
        modalBtnNo.textContent = "Close";      // Standardized Text
        cancelConfirmModal.dataset.mode = "cancelGame"; 
        cancelConfirmModal.dataset.courtId = courtId; 
        cancelConfirmModal.classList.remove("hidden"); 
    }
    
    // FIX 1: Add checkAndPlayAlert(false) to trigger re-evaluation after game cancellation
    function executeGameCancellation(){
        const courtId = cancelConfirmModal.dataset.courtId;
        if (!courtId) return;
        const court = state.courts.find(c => c.id === courtId);
        if (court) {
            if(court.autoStartTimer) clearTimeout(court.autoStartTimer);
            
            // --- If a queue snapshot exists, restore it. This is the "undo" action. ---
            if (court.queueSnapshot) {
                state.availablePlayers = court.queueSnapshot;
            } else {
                // Fallback for older data: return current on-court players to the front.
                const playersToRequeue = court.players.filter(p => !p.guest);
                state.availablePlayers = [...playersToRequeue, ...state.availablePlayers];
            }
            
            court.becameAvailableAt = Date.now();
            
            court.status = "available";
            court.players = [];
            court.teams = {team1:[], team2:[]};
            court.gameMode = null;
            court.autoStartTimer = null;
            court.gameStartTime = null;
            court.queueSnapshot = null; // Clear the snapshot after use
            cancelConfirmModal.classList.add("hidden");
            updateGameModeBasedOnPlayerCount();
            enforceDutyPosition(); // Re-check fairness rule on the restored list
            render();
            saveState();
            checkAndPlayAlert(false);
        }
    }
    
    function executePlayerCheckIn(){
        const playerToCheckInName = cancelConfirmModal.dataset.player;
        if (playerToCheckInName) {
            const playerObject = state.clubMembers.find(p => p.name === playerToCheckInName);
            if (playerObject) {
                state.availablePlayers.push(playerObject);
                state.clubMembers = state.clubMembers.filter(p => p.name !== playerToCheckInName);
            }
            cancelConfirmModal.classList.add("hidden");
            populateCheckInModal(); // Repopulate the list
            checkInModal.classList.remove("hidden"); // Show the list again
            updateGameModeBasedOnPlayerCount();
            enforceDutyPosition(); // --- ADDED LINE ---
            render();
            saveState();
            checkAndPlayAlert(false);
        }
    }

    function executePlayerCheckOut(){
        const playerToCheckOutName = cancelConfirmModal.dataset.player;
        if (playerToCheckOutName) {
            const playerObject = state.availablePlayers.find(p => p.name === playerToCheckOutName);
            if (playerObject && !playerObject.guest) { // Only add back non-guests
                state.clubMembers.push(playerObject);
                state.clubMembers.sort((a, b) => a.name.localeCompare(b.name));
            }
            state.availablePlayers = state.availablePlayers.filter(p => p.name !== playerToCheckOutName);
            
            cancelConfirmModal.classList.add("hidden");
            populateCheckOutModal(); // Repopulate the list
            checkOutModal.classList.remove("hidden"); // Show the list again
            updateGameModeBasedOnPlayerCount();
            render();
            saveState();
        }
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

        // THIS IS THE FIX: All players, including guests, are now returned to the queue.
        const playersToRequeue = [...winningPlayers, ...losingPlayers];
        state.availablePlayers.push(...playersToRequeue); 

        court.becameAvailableAt = Date.now();

        const nextAvailableCourtId = findNextAvailableCourtId();
        const firstPlayerName = state.availablePlayers[0] ? state.availablePlayers[0].name : 'The next players';

        const openCourtMessage = nextAvailableCourtId 
            ? `Attention, ${firstPlayerName}. Please come and select your match. Court ${nextAvailableCourtId} is available.`
            : `Attention, ${firstPlayerName}. Please come and select your match. A court is now available.`;

        playAlertSound(openCourtMessage);

        resetCourtAfterGame(courtId);
        endGameModal.classList.add("hidden");
        checkAndPlayAlert(false);
    }

    function confirmSkipResult() {
        const courtId = endGameModal.dataset.courtId;
        const court = state.courts.find(c => c.id === courtId);
        if (!court) return;

        const team1Names = getPlayerNames(court.teams.team1);
        const team2Names = getPlayerNames(court.teams.team2);

        const newGame = {
            id: Date.now(),
            court: court.id,
            startTime: court.gameStartTime,
            endTime: Date.now(),
            duration: document.getElementById(`timer-${court.id}`).textContent,
            teams: { team1: team1Names, team2: team2Names },
            score: null,
            winner: 'skipped'
        };
        state.gameHistory.push(newGame);

        const playersToRequeue = [...court.players].filter(p => !p.guest);
        state.availablePlayers.push(...playersToRequeue);

        // --- THIS IS THE MISSING ANNOUNCEMENT LOGIC ---
        const nextAvailableCourtId = findNextAvailableCourtId();
        const firstPlayerName = state.availablePlayers[0] ? state.availablePlayers[0].name : 'The next players';
        const openCourtMessage = nextAvailableCourtId 
            ? `Attention, ${firstPlayerName}. Please come and select your match. Court ${nextAvailableCourtId} is available.`
            : `Attention, ${firstPlayerName}. Please come and select your match. A court is now available.`;
        playAlertSound(openCourtMessage);
        // --- END OF LOGIC ---

        resetCourtAfterGame(court.id);
        endGameModal.classList.add("hidden");
        checkAndPlayAlert(false);
    }

    function confirmSkipScores() {
        const courtId = endGameModal.dataset.courtId;
        const court = state.courts.find(c => c.id === courtId);
        const winnerValue = endGameModal.dataset.winner;

        if (!court || !winnerValue) return;

        const team1Names = getPlayerNames(court.teams.team1);
        const team2Names = getPlayerNames(court.teams.team2);

        const newGame = {
            id: Date.now(),
            court: court.id,
            startTime: court.gameStartTime,
            endTime: Date.now(),
            duration: document.getElementById(`timer-${court.id}`).textContent,
            teams: { team1: team1Names, team2: team2Names },
            score: null,
            winner: winnerValue
        };
        state.gameHistory.push(newGame);

        const winningPlayers = winnerValue === "team1" ? court.teams.team1 : court.teams.team2;
        const losingPlayers = winnerValue === "team1" ? court.teams.team2 : court.teams.team1;
        
        const playersToRequeue = [...winningPlayers, ...losingPlayers].filter(p => !p.guest);
        state.availablePlayers.push(...playersToRequeue);

        // --- THIS IS THE MISSING ANNOUNCEMENT LOGIC ---
        const nextAvailableCourtId = findNextAvailableCourtId();
        const firstPlayerName = state.availablePlayers[0] ? state.availablePlayers[0].name : 'The next players';
        const openCourtMessage = nextAvailableCourtId 
            ? `Attention, ${firstPlayerName}. Please come and select your match. Court ${nextAvailableCourtId} is available.`
            : `Attention, ${firstPlayerName}. Please come and select your match. A court is now available.`;
        playAlertSound(openCourtMessage);
        // --- END OF LOGIC ---

        resetCourtAfterGame(court.id);
        endGameModal.classList.add("hidden");
        checkAndPlayAlert(false);
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

    // NOTE: Score validation logic is correct for standard tennis rules (6-0 to 6-4, 7-5, 7-6 + tiebreak).
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
            if (winScore === 6 && loseScore >= 0 && loseScore <= 4) scoresValid = true;
            if (winScore === 7 && loseScore === 5) scoresValid = true;
            if (winScore === 7 && loseScore === 6) scoresValid = true;
        }
        if (!scoresValid) {
            endGameConfirmBtn.disabled = true;
            return;
        }
        let tiebreakValid = true;
        if (!tieBreakerArea.classList.contains('hidden')) {
            const tbWinnerVal = winnerTiebreakInput.value;
            const tbLoserVal = loserTiebreakInput.value;
            if (tbWinnerVal === '' || tbLoserVal === '') {
                tiebreakValid = false;
            } else {
                const numTbWinner = parseInt(tbWinnerVal, 10);
                const numTbLoser = parseInt(tbLoserVal, 10);
                // THIS IS THE FIX: Correctly validates all valid tie-break scores.
                tiebreakValid = (numTbWinner >= 7 && (numTbWinner - numTbLoser) >= 2);
            }
        }
        const isReady = winnerSelected && scoresValid && tiebreakValid;
        endGameConfirmBtn.disabled = !isReady;
        endGameConfirmBtn.style.backgroundColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)';
        endGameConfirmBtn.style.borderColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)';
    }

 
    
    /**
     * Helper to configure a SpeechSynthesisUtterance object with voice settings.
     * @param {string} message The message for the utterance.
     * @returns {SpeechSynthesisUtterance|null} Configured utterance object or null if not supported.
     */
    function getUtterance(message) {
        if (!('speechSynthesis' in window)) return null;

        const utterance = new SpeechSynthesisUtterance(message);
        
        // TTS VOICE SELECTION (Prioritizing clear English, checking for SA English)
        const voices = window.speechSynthesis.getVoices();
        // THIS IS THE LINE THAT SELECTS THE en-ZA VOICE
        let preferredVoice = voices.find(voice => voice.lang === 'en-ZA');

        // This part is a fallback in case an en-ZA voice is not found
        if (!preferredVoice) {
            preferredVoice = voices.find(voice => voice.lang.startsWith('en-') && voice.name.includes('Google'));
        }
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        
        return utterance;
    }


    /**
     * Executes the Text-to-Speech call for a single, independent message.
     * This function immediately cancels any existing speech before speaking.
     * @param {string} message The message to be spoken.
     */
    function playCustomTTS(message) {
         // NEW: Check if all notifications are muted OR if TTS is disabled
         if (state.notificationControls.isMuted || state.notificationControls.isTTSDisabled) return;

         const utterance = getUtterance(message);
         if (utterance) {
             // Ensure no pending TTS is running before starting the new one
             if (window.speechSynthesis.speaking) {
                 window.speechSynthesis.cancel();
             }
             window.speechSynthesis.speak(utterance);
         }
    }
    
// NEW FUNCTION: Function that handles the actual sound + TTS sequence for a single item
function _playAnnouncementSequence(item, callback) {
    isAnnouncementPlaying = true;
    const { msg1, msg2, soundFile } = item;
    
    const playSequencedTTS = (msg1, msg2, onDone) => {
        if (state.notificationControls.isTTSDisabled) return onDone();

        if (!msg1 && !msg2) return onDone();

        const utterance1 = getUtterance(msg1 || msg2); 
        if (!utterance1) return onDone();

        utterance1.onend = () => {
            if (msg1 && msg2) {
                const utterance2 = getUtterance(msg2);
                if (utterance2) {
                    utterance2.onend = onDone; // Call final callback after the second message
                    window.speechSynthesis.speak(utterance2);
                } else {
                    onDone();
                }
            } else {
                onDone(); // Done after the first message
            }
        };

        // Ensure no pending TTS is running before starting the new sequence.
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        window.speechSynthesis.speak(utterance1);
    };

    if (state.notificationControls.isTTSDisabled) {
        // If TTS is disabled, we only worry about the audio playing, then call back.
        if (!soundFile) return callback();
    }
    
    // Stop previous sound
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    // CRITICAL FIX: Cancel any existing speech NOW before starting audio/TTS.
    if (window.speechSynthesis.speaking) {
         window.speechSynthesis.cancel();
    }
    
    if (!soundFile) {
        playSequencedTTS(msg1, msg2, callback);
        return;
    }

    // NEW LOGIC: If a sound is about to play for this item, suppress the sound
    // for all subsequent announcements currently waiting in the queue.
    announcementQueue.forEach(queuedItem => {
        queuedItem.soundFile = null;
    });

    const audioPath = `source/${soundFile}`;
    currentAudio = new Audio(audioPath);
    
    // Wait for sound to finish, then start TTS sequence
    currentAudio.addEventListener('playing', function onSoundPlaying() {
        currentAudio.removeEventListener('playing', onSoundPlaying);
        
        currentAudio.addEventListener('ended', function onSoundEnd() {
            currentAudio.removeEventListener('ended', onSoundEnd);
            // Play sequenced TTS, passing the main callback as the final onDone
            playSequencedTTS(msg1, msg2, callback); 
        });
    });

    currentAudio.play().catch(error => {
        console.error(`Error playing alert sound ${audioPath}: `, error);
        // Fallback: Play sequenced TTS immediately if sound fails
        playSequencedTTS(msg1, msg2, callback);
    });
}

// NEW FUNCTION: Function that processes the queue
function processAnnouncementQueue() {
    if (announcementQueue.length === 0) {
        isAnnouncementPlaying = false;
        return;
    }

    // NEW LOGIC: Prepend the alert tone if a sequence is starting.
    if (!isAnnouncementPlaying) {
        isAnnouncementPlaying = true; // Mark as playing NOW to prevent rapid subsequent calls from getting here.
        
        const firstTTSItem = announcementQueue[0];
        
        // If the first item doesn't have an override sound (e.g., CommitteeCall.mp3 was passed)
        if (!firstTTSItem.soundFile) {
            // Prepend a tone-only item using the standard selected alert sound.
            announcementQueue.unshift({
                msg1: null,
                msg2: null,
                soundFile: state.selectedAlertSound 
            });
        } 
    }

    const nextItem = announcementQueue.shift(); // Get the next item
    
    // Play the item, and when it's done, process the next item in the queue
    _playAnnouncementSequence(nextItem, processAnnouncementQueue);
}

// PUBLIC INTERFACE (Replaces old playAlertSound)
function playAlertSound(courtMessage = null, dutyMessage = null, soundFileNameOverride = null) {
    
    // Check if all notifications are muted
    if (state.notificationControls.isMuted) return; 

    // 1. Add the new announcement to the queue
    announcementQueue.push({
        msg1: courtMessage,
        msg2: dutyMessage,
        // CRITICAL: Standard alerts are now TTS-only. Sound is only included if it is an OVERRIDE (e.g., CommitteeCall)
        soundFile: soundFileNameOverride || null
    });

    // 2. Start the queue processor if it's not already running
    if (!isAnnouncementPlaying) {
        processAnnouncementQueue();
    }
}

// PUBLIC INTERFACE (Replaces old playCustomTTS)
function playCustomTTS(message) {
     // Check if all notifications are muted OR if TTS is disabled
     if (state.notificationControls.isMuted || state.notificationControls.isTTSDisabled) return;

     const utterance = getUtterance(message);
     if (utterance) {
         // Push to queue with no sound and no second message, preserving the null sound file for TTS-only announcements
         playAlertSound(message, null, null);
     }
}

    // NEW HELPER FUNCTION: Finds the name of the first available, non-paused player
    function getFirstAvailablePlayerName() {
        const selectorPlayer = state.availablePlayers.find(p => !p.isPaused);
        return selectorPlayer ? selectorPlayer.name : null;
    }

    // UPDATED FUNCTION: Logic maintains alertScheduleTime unless overridden or conditions are missed.
    // @param {boolean} forceCheck - If true, triggers the alert/sound/TTS immediately and resets the timer.
    function checkAndPlayAlert(forceCheck = false) {
        const availablePlayerCount = state.availablePlayers.length;
        const TWO_MINUTES_MS = 2 * 60 * 1000;
        const FIVE_MINUTES_MS = 5 * 60 * 1000;
        const now = Date.now();

        const hasEnoughPlayers = availablePlayerCount >= 4;
        const availableCourtId = findNextAvailableCourtId();
        const conditionMet = hasEnoughPlayers && availableCourtId;
        
        // Use the new helper function to get the correct selector's name
        const firstPlayerName = getFirstAvailablePlayerName(); 

        if (!conditionMet || !firstPlayerName) { // Ensure there is a player to announce
            return;
        }

        // The announcement is now correctly constructed using the first non-paused player's name
        const courtMessage = `Attention, ${firstPlayerName.split(' ')[0]}. Please come and select your match. Court ${availableCourtId} is available.`;

        if (alertState === 'initial_check' || forceCheck) {
            if (forceCheck) {
                playAlertSound(courtMessage);
                if (state.notificationControls.isMinimized) {
                    alertScheduleTime = 0;
                    alertState = 'initial_check';
                } else {
                    alertScheduleTime = now + FIVE_MINUTES_MS;
                    alertState = '5_min_repeat';
                }
            } else {
                alertScheduleTime = now + TWO_MINUTES_MS;
                alertState = '2_min_countdown';
            }
            return;
        }

        if (now >= alertScheduleTime) {
            playAlertSound(courtMessage);
            if (state.notificationControls.isMinimized) {
                alertScheduleTime = 0;
                alertState = 'initial_check';
            } else {
                alertScheduleTime = now + FIVE_MINUTES_MS;
                alertState = '5_min_repeat';
            }
        }
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

    // NEW FUNCTION: Calculate rolling admin passcode
    function getAdminPasscode() {
        // Calculate the day of the month as DD
        const today = new Date();
        const dayOfMonth = String(today.getDate()).padStart(2, '0');
        return `0308${dayOfMonth}`;
    }

    function handleAdminLogin() { showKeypad(null, { mode: 'admin', maxLength: 6, title: 'Enter Admin Passcode (0308DD)' }); }
    function checkAdminPasscode() {
        // --- MODIFIED LINE: Read from the hidden dataset value, not the display text ---
        const enteredCode = keypadDisplay.dataset.hiddenValue;
        const expectedCode = getAdminPasscode();
        
        if (enteredCode === expectedCode) {
            hideKeypad();
            showAdminModal();
        } else {
            const keypadContent = customKeypadModal.querySelector('.keypad-content');
            keypadContent.classList.add('shake');
            setTimeout(() => {
                keypadContent.classList.remove('shake');
                keypadDisplay.textContent = '';
                // Clear the hidden value as well
                if (keypadDisplay.dataset.hiddenValue) {
                    keypadDisplay.dataset.hiddenValue = '';
                }
                if(activeInput) activeInput.value = '';
                keypadConfirmBtn.disabled = true;
            }, 820);
        }
    }
    
    function handleNotifyNow() {
        const availablePlayerCount = state.availablePlayers.length;
        const hasEnoughPlayers = availablePlayerCount >= 4;
        const isAnyCourtAvailable = findNextAvailableCourtId();

        cancelConfirmModal.querySelector("h3").textContent = "Confirm Announcement";
        modalBtnYesConfirm.textContent = "Confirm";
        modalBtnNo.textContent = "Close";

        if (!hasEnoughPlayers) {
            cancelConfirmModal.querySelector("p").textContent = "There are not enough players for a doubles match. Announce to waiting players?";
            cancelConfirmModal.dataset.mode = "forceAnnouncementNotEnoughPlayers";
            cancelConfirmModal.classList.remove("hidden");
            return;
        }

        if (!isAnyCourtAvailable) {
            // This is a hard stop, so a simple alert is appropriate.
            alert("Notification cannot be sent: No courts are available.");
            return;
        }

        // This is the standard case where everything is ready.
        cancelConfirmModal.querySelector("p").textContent = "Are you sure you want to force a player announcement now?";
        cancelConfirmModal.dataset.mode = "forceAnnouncement";
        cancelConfirmModal.classList.remove("hidden");
    }

    function initSummaryCardElements() {
        // 1. Re-bind the settings button listener
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.removeEventListener('click', handleAdminLogin); // Prevent multiple bindings
            settingsBtn.addEventListener('click', handleAdminLogin);
        }

        // 2. REVISED LISTENER BINDING for the notify button
        const notifyNowBtn = document.getElementById('notify-now-btn');
        if (notifyNowBtn) {
            // Ensure any previous listener is removed before adding the new one
            notifyNowBtn.removeEventListener('click', handleNotifyNow);
            notifyNowBtn.addEventListener('click', handleNotifyNow);
        }

        // 3. ADDED LISTENER for the new call duty button
        const callDutyBtn = document.getElementById('call-duty-btn');
        if (callDutyBtn) {
            callDutyBtn.removeEventListener('click', handleCallDuty);
            callDutyBtn.addEventListener('click', handleCallDuty);
        }
        
        // 4. Re-start the quote rotator
        initQuoteRotator();
    }
    
    // NEW FUNCTION: Updates the icons on the sound selection modal based on state
    function updateNotificationIcons() {
        // Ensure buttons exist before querying for icons
        if (!muteBtn || !minimizeNotificationsBtn || !noSpeechBtn) return;
        
        const muteIcon = muteBtn.querySelector('i');
        const minimizeIcon = minimizeNotificationsBtn.querySelector('i');
        const noSpeechIcon = noSpeechBtn.querySelector('i');

        if (muteIcon) muteIcon.className = state.notificationControls.isMuted ? 'mdi mdi-volume-off' : 'mdi mdi-volume-high';
        if (minimizeIcon) minimizeIcon.className = state.notificationControls.isMinimized ? 'mdi mdi-arrow-collapse-vertical' : 'mdi mdi-arrow-expand-vertical';
        if (noSpeechIcon) noSpeechIcon.className = state.notificationControls.isTTSDisabled ? 'mdi mdi-microphone-off' : 'mdi mdi-microphone-message';
    }

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

    // FIX 5: Add checkAndPlayAlert(false) to trigger re-evaluation after court visibility change
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
        checkAndPlayAlert(false); // Re-evaluate logic immediately
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
                <span class="reorder-position" data-player-name="${player.name}" data-current-index="${index}">${index + 1}</span>
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
        const positionEl = e.target.closest('.reorder-position');

        if (button) {
            const playerName = button.dataset.playerName;
            const direction = button.dataset.direction;
            const currentIndex = tempPlayerOrder.findIndex(p => p.name === playerName);
            if (currentIndex === -1) return;
            let newIndex = currentIndex;
            if (direction === 'up' && currentIndex > 0) {
                newIndex = currentIndex - 1;
            } else if (direction === 'down' && currentIndex < tempPlayerOrder.length - 1) {
                newIndex = currentIndex + 1;
            }
            
            if (newIndex !== currentIndex) {
                const [playerToMove] = tempPlayerOrder.splice(currentIndex, 1);
                tempPlayerOrder.splice(newIndex, 0, playerToMove);
                // Note: We don't need to log the swap here, it will be logged when the position is changed.
            }
            renderReorderList();
        } else if (positionEl) {
            showKeypad(positionEl, {
                title: `Set new position for ${positionEl.dataset.playerName}`,
                maxLength: 2
            });
        }
    }
    
    // NEW FUNCTION: Sound selection modal logic
    function handleSoundSelectionModal() {
        tempSelectedSound = state.selectedAlertSound;
        updateNotificationIcons(); // Ensure icons reflect current state
        renderSoundList();
        adminSettingsModal.classList.add('hidden');
        soundSelectionModal.classList.remove('hidden');
    }

    // NEW FUNCTION: Render the sound list
    function renderSoundList() {
        soundSelectionList.innerHTML = '';
        alertSounds.forEach(soundFile => {
            const li = document.createElement('li');
            li.className = 'sound-selection-item';
            const isSelected = soundFile === tempSelectedSound;
            
            // Extract the number from the filename for display
            const displayName = soundFile.replace('.mp3', '').replace('Alert', 'Alert ');

            li.innerHTML = `
                <label class="sound-selection-label">
                    <input type="radio" name="alertSound" value="${soundFile}" ${isSelected ? 'checked' : ''}>
                    ${displayName}
                </label>
                <button class="sound-preview-btn" data-sound-file="${soundFile}">▶</button>
            `;
            soundSelectionList.appendChild(li);
        });

        // Set initial state of confirm button
        soundConfirmBtn.disabled = !tempSelectedSound;
        soundConfirmBtn.style.backgroundColor = tempSelectedSound ? 'var(--confirm-color)' : 'var(--inactive-color)';
        soundConfirmBtn.style.borderColor = tempSelectedSound ? 'var(--confirm-color)' : 'var(--inactive-color)';
    }

    // NEW FUNCTION: Handle radio button selection in sound modal
    function handleSoundSelection(e) {
        if (e.target.type === 'radio' && e.target.name === 'alertSound') {
            tempSelectedSound = e.target.value;
            soundConfirmBtn.disabled = false;
            soundConfirmBtn.style.backgroundColor = 'var(--confirm-color)';
            soundConfirmBtn.style.borderColor = 'var(--confirm-color)';
        }
    }

    // NEW FUNCTION: Handle sound preview button click
    function handleSoundPreview(e) {
        const button = e.target.closest('.sound-preview-btn');
        if (!button) return;
        const soundFile = button.dataset.soundFile;
        
        // FIX: Stop previous sound before playing the new one
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        const audioPath = `source/${soundFile}`;
        currentAudio = new Audio(audioPath);
        
        currentAudio.play().catch(error => {
            console.warn(`Could not play audio from source/${soundFile}. Error: `, error);
            // Optional: alert(`Preview for ${soundFile} failed. Check file existence in the 'source' directory.`);
        });
    }

    // NEW FUNCTION: Confirm and save sound selection
    function confirmSoundSelection() {
        state.selectedAlertSound = tempSelectedSound;
        saveState();
        soundSelectionModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');
    }

    // NEW FUNCTION: Cancel sound selection
    function cancelSoundSelection() {
        soundSelectionModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');
    }

    function resetAlertSchedule() {
        alertScheduleTime = 0;
        alertState = 'initial_check';
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

    // --- ADMIN MANAGEMENT FUNCTIONS (REFACTORED FOR 3-CARD FLOW) ---

    // Card 1: Court Selection View
    function showCourtSelectionCard() {
        const { adminCourtManagement } = state;
        
        // Reset temporary state and mode
        adminCourtManagement.mode = 'card1_select_court';
        adminCourtManagement.courtId = null;
        adminCourtManagement.currentCourtPlayers = [];
        adminCourtManagement.removedPlayers = [];
        adminCourtManagement.addedPlayers = [];
        
        document.getElementById('manage-court-players-instructions').textContent = "Select a court with an active game.";
        
        // Set data attribute for CSS
        manageModalActions.dataset.cardMode = 'card1';

        // Show Card 1 list, hide Card 2 & 3 lists
        courtListForManagement.classList.remove('hidden');
        removePlayersList.classList.add('hidden');
        addPlayersList.classList.add('hidden');

        // Button visibility for Card 1
        managePlayersBackBtn.classList.add('hidden');
        managePlayersAddBtn.classList.add('hidden');
        managePlayersConfirmBtn.classList.add('hidden');
        managePlayersCloseBtn.textContent = 'Close';
        
        courtListForManagement.innerHTML = '';
        const activeCourts = state.courts.filter(c => c.status === 'in_progress' && state.courtSettings.visibleCourts.includes(c.id));

        if (activeCourts.length === 0) {
            courtListForManagement.innerHTML = '<li style="justify-content: center; color: #6c757d;">No games are currently in progress on visible courts.</li>';
        } else {
            activeCourts.forEach(court => {
                const li = document.createElement('li');
                li.className = 'court-select-item';
                const playerNames = getPlayerNames(court.players).map(name => name.split(' ')[0]).join(' / ');
                li.innerHTML = `
                    <span style="flex-grow: 1;">Court ${court.id}</span>
                    <span style="margin-right: 1rem; color: #6c757d; font-size: 0.9em;">(${playerNames})</span>
                    <span class="action-icon add" data-court-id="${court.id}" data-action="select-court" style="font-size: 1.2rem;">&gt;</span>
                `;
                courtListForManagement.appendChild(li);
            });
        }

        adminSettingsModal.classList.add('hidden');
        manageCourtPlayersModal.classList.remove('hidden');
    }

    // Original entry point, now just calls Card 1 function
    function showManageCourtPlayersModal() {
        // First, check if there are any pending additions from a previous unfinished session (shouldn't happen with handleManageClose but good safeguard)
        const { addedPlayers } = state.adminCourtManagement;
        if (addedPlayers.length > 0) {
            state.availablePlayers = [...addedPlayers, ...state.availablePlayers];
            state.adminCourtManagement.addedPlayers = [];
        }
        showCourtSelectionCard();
    }

    // Card 2: Remove Player View
    function showRemovePlayerCard(courtId) {
        const court = state.courts.find(c => c.id === courtId);
        if (!court || court.status !== 'in_progress') {
            return showCourtSelectionCard();
        }
        
        const { adminCourtManagement } = state;
        
        // Initialize/switch to Card 2 mode
        adminCourtManagement.mode = 'card2_remove_players';
        adminCourtManagement.courtId = courtId;
        
        // If coming from Card 1 (no players loaded yet), set the initial list
        if (adminCourtManagement.currentCourtPlayers.length === 0) {
            // Deep copy of player objects to manipulate locally
            adminCourtManagement.currentCourtPlayers = JSON.parse(JSON.stringify(court.players));
        }
        
        document.getElementById('manage-court-players-instructions').textContent = `Court ${courtId}: Remove players from the game.`;
        
        // Set data attribute for CSS
        manageModalActions.dataset.cardMode = 'card2';

        // Hide all lists except Card 2 list
        courtListForManagement.classList.add('hidden');
        removePlayersList.classList.remove('hidden');
        addPlayersList.classList.add('hidden');
        
        // Button visibility for Card 2
        managePlayersBackBtn.classList.remove('hidden'); // Back to Card 1
        managePlayersAddBtn.classList.remove('hidden'); // Go to Card 3
        managePlayersConfirmBtn.classList.add('hidden');
        managePlayersCloseBtn.textContent = 'Close'; 
        
        // Enable/Disable Add Player button based on changes
        const hasChanges = adminCourtManagement.removedPlayers.length > 0 || adminCourtManagement.addedPlayers.length > 0;
        managePlayersAddBtn.disabled = !hasChanges;
        managePlayersAddBtn.style.backgroundColor = hasChanges ? 'var(--confirm-color)' : 'var(--neutral-color)';
        
        renderRemovePlayersList(courtId);
    }

    function renderRemovePlayersList(courtId) {
        const { currentCourtPlayers, removedPlayers } = state.adminCourtManagement;
        
        removePlayersList.innerHTML = '';
        
        // 1. Render players still on the court (currentCourtPlayers - removedPlayers)
        // Find which players are on court (currentCourtPlayers) but NOT in the removed list
        const playersOnCourt = currentCourtPlayers.filter(p => !removedPlayers.some(rp => rp.name === p.name));

        if (playersOnCourt.length === 0 && removedPlayers.length === 0) {
             removePlayersList.innerHTML = '<li style="justify-content: center; color: var(--cancel-color);">No players remaining. Must add players or go back.</li>';
        } else {
            playersOnCourt.forEach(player => {
                const li = document.createElement('li');
                const displayName = player.guest ? `${player.name} (Guest)` : player.name;
                li.innerHTML = `
                    <span style="flex-grow: 1;">${displayName}</span>
                    <span style="margin-right: 1rem; color: #6c757d;">${player.gender}</span>
                    <span class="action-icon remove" data-player="${player.name}" data-court-id="${courtId}" data-action="remove-player-temp" title="Remove Player">&times;</span>
                `;
                removePlayersList.appendChild(li);
            });
        }
        
        // 2. Render temporary removed players in the main list.
        if (removedPlayers.length > 0) {
            removePlayersList.innerHTML += '<li style="justify-content: center; background-color: #f0f0f0; margin-top: 1rem; color: var(--dark-text); font-weight: 500;">Removed Players (Click '+' to return to court):</li>';
            removedPlayers.forEach(player => {
                const li = document.createElement('li');
                li.style.backgroundColor = '#fbe9eb';
                const displayName = player.guest ? `${player.name} (Guest)` : player.name;
                li.innerHTML = `
                    <span style="flex-grow: 1; color: var(--cancel-color); font-weight: 500;">${displayName}</span>
                    <span class="action-icon add" data-player="${player.name}" data-court-id="${courtId}" data-action="return-player-temp" title="Keep on Court">+</span>
                `;
                removePlayersList.appendChild(li);
            });
        }
    }

    // Card 3: Add Player View
    function showAddPlayerCard(courtId) {
        const { adminCourtManagement } = state;

        // Switch to Card 3 mode
        adminCourtManagement.mode = 'card3_add_players';
        
        document.getElementById('manage-court-players-instructions').textContent = `Court ${courtId}: Select player(s) to add (Max 7 available).`;
        
        // Set data attribute for CSS
        manageModalActions.dataset.cardMode = 'card3';

        // Hide all lists except Card 3 list
        courtListForManagement.classList.add('hidden');
        removePlayersList.classList.add('hidden');
        addPlayersList.classList.remove('hidden');
        
        // Button visibility for Card 3
        managePlayersBackBtn.classList.remove('hidden'); // Back to Card 2
        managePlayersAddBtn.classList.add('hidden');
        managePlayersConfirmBtn.classList.remove('hidden'); // Confirm button is here
        managePlayersCloseBtn.textContent = 'Close'; 

        renderAddPlayersList(courtId);
    }

    function renderAddPlayersList(courtId) {
        const { addedPlayers, removedPlayers } = state.adminCourtManagement;
        addPlayersList.innerHTML = '';
        
        // Get available players, excluding those already marked to be added (addedPlayers)
        const availableForAdding = state.availablePlayers
            .filter(p => !addedPlayers.some(ap => ap.name === p.name))
            .slice(0, 7); // First 7 or less
            
        if (availableForAdding.length === 0 && addedPlayers.length === 0) {
            addPlayersList.innerHTML = '<li style="justify-content: center; color: #6c757d;">No players are currently available to add.</li>';
        } else {
            availableForAdding.forEach(player => {
                const li = document.createElement('li');
                const displayName = player.guest ? `${player.name} (Guest)` : player.name;
                li.innerHTML = `
                    <span style="flex-grow: 1;">${displayName}</span>
                    <span style="margin-right: 1rem; color: #6c757d;">${player.gender}</span>
                    <span class="action-icon add" data-player="${player.name}" data-court-id="${courtId}" data-action="add-player-temp" title="Add Player">+</span>
                `;
                addPlayersList.appendChild(li);
            });
            
            // Show already added players at the bottom of the list for visual confirmation
            if (addedPlayers.length > 0) {
                addPlayersList.innerHTML += '<li style="justify-content: center; background-color: #f0f0f0; margin-top: 1rem; color: var(--dark-text); font-weight: 500;">Players to be Added: Click ' + '&#215;' + ' to undo.</li>';
                addedPlayers.forEach(player => {
                    const li = document.createElement('li');
                    li.style.backgroundColor = 'var(--light-blue)';
                    const displayName = player.guest ? `${player.name} (Guest)` : player.name;
                    li.innerHTML = `
                        <span style="flex-grow: 1; color: var(--primary-blue); font-weight: 500;">${displayName}</span>
                        <span class="action-icon remove" data-player="${player.name}" data-court-id="${courtId}" data-action="undo-add-player-temp" title="Remove from Add List">&times;</span>
                    `;
                    addPlayersList.appendChild(li);
                });
            }
        }
        
        // Confirm button is only enabled if there's at least one added player OR one removed player
        const hasChanges = addedPlayers.length > 0 || removedPlayers.length > 0;
        managePlayersConfirmBtn.disabled = !hasChanges;
        managePlayersConfirmBtn.style.backgroundColor = hasChanges ? 'var(--confirm-color)' : 'var(--inactive-color)';
        managePlayersConfirmBtn.style.borderColor = hasChanges ? 'var(--confirm-color)' : 'var(--inactive-color)';
    }

    // --- Navigation/Action Handlers ---

    // Handles Close button on Card 1, 2, or 3
    function handleManageClose() {
        // 1. Return any temporarily added players to the front of the queue
        const { addedPlayers } = state.adminCourtManagement;
        if (addedPlayers.length > 0) {
            state.availablePlayers = [...addedPlayers, ...state.availablePlayers];
        }
        
        // 2. Clear temp state and close modal
        state.adminCourtManagement = {
            mode: 'card1_select_court',
            courtId: null,
            currentCourtPlayers: [], 
            removedPlayers: [], 
            addedPlayers: [] 
        };
        
        manageCourtPlayersModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');
        updateGameModeBasedOnPlayerCount();
        render();
        saveState();
        checkAndPlayAlert(false);
    }

    // Handles Back button on Card 2 (to Card 1) or Card 3 (to Card 2)
    function handleManageBack() {
        const { mode, courtId, addedPlayers } = state.adminCourtManagement;
        
        if (mode === 'card2_remove_players') {
            // Back from Card 2 to Card 1 (Discard removals, return additions)
            // Additions are returned to the front of the queue on close/back, then state is reset.
            if (addedPlayers.length > 0) {
                state.availablePlayers = [...addedPlayers, ...state.availablePlayers];
            }
            showCourtSelectionCard();
            
        } else if (mode === 'card3_add_players') {
            // Back from Card 3 to Card 2 (Discard additions)
            if (addedPlayers.length > 0) {
                state.availablePlayers = [...addedPlayers, ...state.availablePlayers];
            }
            state.adminCourtManagement.addedPlayers = []; // Clear added players in temp state
            showRemovePlayerCard(courtId);
        }
        updateGameModeBasedOnPlayerCount();
        render();
        saveState();
        checkAndPlayAlert(false);
    }

    // Handles Confirm button on Card 3 (Final Save)
    function handleManageConfirm() {
        const { courtId, currentCourtPlayers, removedPlayers, addedPlayers } = state.adminCourtManagement;
        const court = state.courts.find(c => c.id === courtId);
        if (!court || court.status !== 'in_progress') {
            return handleManageClose();
        }
        
        let newCourtPlayers = currentCourtPlayers.filter(p => !removedPlayers.some(rp => rp.name === p.name));
        newCourtPlayers = [...newCourtPlayers, ...addedPlayers];
        
        const newGameMode = newCourtPlayers.length === 2 ? 'singles' : 'doubles';
        const removedCount = removedPlayers.length;
        const removedNames = removedPlayers.map(p => p.name).join(' and ');
        const addedNames = addedPlayers.map(p => p.name).join(' and ');
        const newPlayerCount = newCourtPlayers.length;

        let rosterChangeAnnouncement = '';
        let finalAnnouncement;

        if (newCourtPlayers.length < 2) {
            // Cancellation is handled in the if block below
        } else if (removedPlayers.length > 0 && addedPlayers.length > 0) {
            const removedSubjectVerb = removedCount === 1 ? 'was' : 'were';
            rosterChangeAnnouncement = `Attention on Court ${courtId}: Player substitution complete. ${removedNames} ${removedSubjectVerb} replaced by ${addedNames}.`;
        } else if (removedPlayers.length > 0) {
            if (newPlayerCount === 2) {
                rosterChangeAnnouncement = `Attention on Court ${courtId}: Game simplified to singles. ${removedNames} have left the court.`;
            } else {
                rosterChangeAnnouncement = `Attention on Court ${courtId}: ${removedNames} have left the court. The match continues with ${newPlayerCount} players.`;
            }
        } else if (addedPlayers.length > 0) {
            rosterChangeAnnouncement = `Attention on Court ${courtId}: ${addedNames} have joined the game.`;
        } else {
            return handleManageClose();
        }

        if (newCourtPlayers.length < 2) {
            if(court.autoStartTimer) clearTimeout(court.autoStartTimer);
            
            const originalPlayers = court.players.filter(p => !p.guest);
            state.availablePlayers = [...originalPlayers, ...state.availablePlayers];

            court.becameAvailableAt = Date.now();
            court.status = "available";
            court.players = [];
            court.teams = {team1:[], team2:[]};
            court.gameMode = null;
            court.gameStartTime = null;
            
            finalAnnouncement = `Attention on court: Game on Court ${courtId} has been cancelled due to insufficient players.`;

        } else {
            court.gameMode = newGameMode;
            court.players = newCourtPlayers;
            
            if (newGameMode === 'singles') {
                court.teams.team1 = [newCourtPlayers[0]];
                court.teams.team2 = [newCourtPlayers[1]];
            } else {
                const teamSize = Math.ceil(newCourtPlayers.length / 2);
                court.teams.team1 = newCourtPlayers.slice(0, teamSize);
                court.teams.team2 = newCourtPlayers.slice(teamSize);
            }
            
            finalAnnouncement = rosterChangeAnnouncement;
        }
        
        playCustomTTS(finalAnnouncement);
        
        const membersToRequeue = removedPlayers.filter(p => !p.guest); 
        state.availablePlayers.push(...membersToRequeue);
        
        state.adminCourtManagement = {
            mode: 'card1_select_court',
            courtId: null,
            currentCourtPlayers: [], 
            removedPlayers: [], 
            addedPlayers: [] 
        };
        
        manageCourtPlayersModal.classList.add('hidden');
        updateGameModeBasedOnPlayerCount();
        enforceDutyPosition();
        render();
        saveState();
        
        resetAlertSchedule();
        checkAndPlayAlert(false);
    }

    function handleOnDutyChange(e) { state.onDuty = e.target.value; saveState(); render(); }
    
    // MODIFIED: Logic updated to use hiddenValue for masking
    function handleKeypadClick(e) {
        const key = e.target.dataset.key;
        let displayValue;
        const mode = keypadConfig.mode;

        // On confirm, decide what action to take based on the mode
        if (e.target.id === 'keypad-confirm-btn') {
            if (e.target.disabled) return;

            if (mode === 'admin') {
                checkAdminPasscode();
                return;
            } else if (mode === 'reset') {
                checkResetPasscode();
                return;
            } else if (activeInput && activeInput.classList.contains('reorder-position')) {
                handleReorderPositionChange(keypadDisplay.textContent);
            } else if (activeInput) {
                activeInput.dispatchEvent(new Event('input'));
            }

            hideKeypad();
            return;
        }

        // Determine the current value based on the mode
        displayValue = (mode === 'admin' || mode === 'reset') ? (keypadDisplay.dataset.hiddenValue || '') : keypadDisplay.textContent;

        // Process the key press
        if (key === 'backspace') {
            displayValue = displayValue.slice(0, -1);
        } else if (key === 'clear') {
            displayValue = '';
        } else if (/[0-9]/.test(key)) {
            if (keypadConfig.maxLength && displayValue.length >= keypadConfig.maxLength) {
                return;
            }
            displayValue += key;
        }

        // Update the display and any linked input value
        if (mode === 'admin' || mode === 'reset') {
            keypadDisplay.dataset.hiddenValue = displayValue;
            keypadDisplay.textContent = '*'.repeat(displayValue.length);
        } else {
            keypadDisplay.textContent = displayValue;
            if (activeInput && !activeInput.classList.contains('reorder-position')) {
                activeInput.value = displayValue;
            }
        }

        // Enable or disable the 'Done' button
        keypadConfirmBtn.disabled = displayValue.length === 0;
    }


    // MODIFIED: Added data-mode to display and adjusted placeholder logic for admin mode
    function showKeypad(input, config = {}) {
        activeInput = input;
        keypadConfig = config;
        const mode = config.mode;

        // Reset display for all modes
        keypadDisplay.textContent = '';
        delete keypadDisplay.dataset.hiddenValue;

        // Configure based on mode
        if (mode === 'admin' || mode === 'reset') {
            keypadDisplay.setAttribute('data-mode', mode);
            keypadDisplay.setAttribute('data-placeholder', config.title || 'Enter PIN');
            keypadCancelBtn.classList.remove('hidden');
            keypadConfirmBtn.classList.remove('wide-full');
            keypadConfirmBtn.classList.add('wide-half');
        } else { // Default mode for scores, reordering, etc.
            keypadDisplay.removeAttribute('data-mode');
            if (config.title) {
                keypadDisplay.setAttribute('data-placeholder', config.title);
            } else {
                keypadDisplay.removeAttribute('data-placeholder');
            }
            keypadDisplay.textContent = activeInput ? activeInput.value : '';
            if (activeInput) activeInput.value = '';
            
            keypadCancelBtn.classList.add('hidden');
            keypadConfirmBtn.classList.remove('wide-half');
            keypadConfirmBtn.classList.add('wide-full');
        }

        // Show modal and set initial button state
        customKeypadModal.classList.remove('hidden');
        keypadConfirmBtn.disabled = keypadDisplay.textContent.length === 0;
    }

    function hideKeypad() { customKeypadModal.classList.add('hidden'); keypadConfig = {}; activeInput = null; }
    function wireScoreInputToKeypad(input) { input.readOnly = true; input.addEventListener('focus', (e) => { e.preventDefault(); if (activeInput !== e.target) { e.target.select(); } }); input.addEventListener('click', (e) => { showKeypad(e.target); e.target.select(); }); }
    const QWERTY_LAYOUT = [ ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'], ['Z', 'X', 'C', 'V', 'B', 'N', 'M'] ];
    function generateAlphaKeypad() { alphaKeypadGrid.innerHTML = ''; const displayValue = alphaKeypadDisplay.textContent; const lastChar = displayValue.slice(-1); QWERTY_LAYOUT.forEach((row, index) => { const rowDiv = document.createElement('div'); rowDiv.className = `key-row-${index + 1}`; row.forEach(key => { const button = document.createElement('button'); button.className = 'keypad-btn'; button.dataset.key = key; let char = key; if (displayValue.length === 0 || displayValue.slice(-1) === ' ') { char = key.toUpperCase(); } else { char = key.toLowerCase(); } button.textContent = char; rowDiv.appendChild(button); }); alphaKeypadGrid.appendChild(rowDiv); }); const lastRowDiv = document.createElement('div'); lastRowDiv.className = `key-row-4`; const spaceBtn = document.createElement('button'); spaceBtn.className = 'keypad-btn wide-control control'; spaceBtn.dataset.key = 'space'; spaceBtn.textContent = 'Space'; lastRowDiv.appendChild(spaceBtn); const backspace = document.createElement('button'); backspace.className = 'keypad-btn control'; backspace.dataset.key = 'backspace'; backspace.textContent = '⌫'; lastRowDiv.appendChild(backspace); const done = document.createElement('button'); done.className = 'keypad-btn wide-control confirm'; done.id = 'alpha-keypad-confirm-btn'; done.textContent = 'Done'; lastRowDiv.appendChild(done); alphaKeypadGrid.appendChild(lastRowDiv); document.querySelectorAll('#custom-alpha-keypad-modal .keypad-btn').forEach(button => { button.removeEventListener('click', handleAlphaKeypadClick); button.addEventListener('click', handleAlphaKeypadClick); }); }
    function handleAlphaKeypadClick(e) { const key = e.target.dataset.key; let displayValue = alphaKeypadDisplay.textContent; if (!activeAlphaInput) return; if (key === 'backspace') { displayValue = displayValue.slice(0, -1); } else if (key === 'space') { if (displayValue.length > 0 && displayValue.slice(-1) !== ' ') { displayValue += ' '; } } else if (e.target.id === 'alpha-keypad-confirm-btn') { hideAlphaKeypad(); return; } else { let char = key; if (displayValue.length === 0 || displayValue.slice(-1) === ' ') { char = key.toUpperCase(); } else { char = key.toLowerCase(); } displayValue += char; } alphaKeypadDisplay.textContent = displayValue; activeAlphaInput.value = displayValue; generateAlphaKeypad(); validateGuestForm(); }
    function showAlphaKeypad(input) { activeAlphaInput = input; alphaKeypadDisplay.textContent = activeAlphaInput.value; generateAlphaKeypad(); customAlphaKeypadModal.classList.remove('hidden'); guestNameModal.classList.add('hidden'); }
    function hideAlphaKeypad() { customAlphaKeypadModal.classList.add('hidden'); guestNameModal.classList.remove('hidden'); activeAlphaInput = null; validateGuestForm(); }
    function validateGuestForm() { const name = guestNameInput.value.trim(); const surname = guestSurnameInput.value.trim(); const isReady = (name.length > 0 && surname.length > 0); guestConfirmBtn.disabled = !isReady; guestConfirmBtn.style.backgroundColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)'; guestConfirmBtn.style.borderColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)'; }
    function handleGuestCheckIn() {
        const firstName = guestNameInput.value.trim();
        const lastName = guestSurnameInput.value.trim();
        const gender = document.querySelector('input[name="guest-gender"]:checked').value;
        
        // --- MODIFIED: Read the player type from the new radio buttons ---
        const playerType = document.querySelector('input[name="player-type"]:checked').value;
        const isGuest = playerType === 'guest';
        // --- END MODIFICATION ---

        if (!firstName || !lastName) return;
        
        const formatCase = (str) => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const formattedPlayerName = `${formatCase(firstName)} ${formatCase(lastName)}`;
        
        // --- MODIFIED: Use the isGuest variable to set the player's status ---
        const newPlayer = { name: formattedPlayerName, gender: gender, guest: isGuest };
        
        if (!state.availablePlayers.some(p => p.name === newPlayer.name)) {
            state.availablePlayers.push(newPlayer);
        }
        
        guestNameModal.classList.add('hidden');
        checkInModal.classList.remove('hidden'); // Return to the check-in list
        populateCheckInModal(); // Refresh the member list in the background
        
        // Reset the form for the next use
        guestNameInput.value = '';
        guestSurnameInput.value = '';
        guestConfirmBtn.disabled = true;
        document.querySelector('input[name="player-type"][value="guest"]').checked = true; // Default back to Guest

        updateGameModeBasedOnPlayerCount();
        render();
        saveState();
    }
    function resetConfirmModal(){ 
        setTimeout(() => { 
            cancelConfirmModal.querySelector("h3").textContent = "Confirm Action"; 
            cancelConfirmModal.querySelector("p").textContent = "Are you sure?"; 
            modalBtnYesConfirm.textContent = "Confirm"; // Standardized Text
            modalBtnNo.textContent = "Close";         // Standardized Text
        }, 300); 
    }
    function populateCheckInModal(){ checkInList.innerHTML = ""; if (state.clubMembers.length === 0){ const li = document.createElement("li"); li.textContent = "All club members are currently checked in."; li.style.justifyContent = "center"; checkInList.appendChild(li); } else { state.clubMembers.forEach(player => { const li = document.createElement("li"); const displayName = player.guest ? `${player.name} (Guest)` : player.name; li.innerHTML = ` <span style="flex-grow: 1;">${displayName}</span> <span style="margin-right: 1rem; color: #6c757d;">${player.gender}</span> <span class="action-icon add" data-player="${player.name}">+</span> `; checkInList.appendChild(li); }); } }
    function populateCheckOutModal(){ checkOutList.innerHTML = ""; if (state.availablePlayers.length === 0){ const li = document.createElement("li"); li.textContent = "There are no players currently checked in."; li.style.justifyContent = "center"; checkOutList.appendChild(li); } else { state.availablePlayers.forEach(player => { const li = document.createElement("li"); const displayName = player.guest ? `${player.name} (Guest)` : player.name; li.innerHTML = ` <span style="flex-grow: 1;">${displayName}</span> <span style="margin-right: 1rem; color: #6c757d;">${player.gender}</span> <span class="action-icon remove" data-player="${player.name}">&times;</span> `; checkOutList.appendChild(li); }); } }


// NEW, DECOUPLED FUNCTION: Handles only the Committee Call announcement sequence
    function playUntimedCall(ttsMessage) {
        // 1. Check if all notifications are muted or TTS is disabled
        if (state.notificationControls.isMuted || state.notificationControls.isTTSDisabled) return;

        const utterance = getUtterance(ttsMessage);
        if (!utterance) return;
        
        // 2. CRITICAL FIX: Cancel any existing speech NOW before starting audio/TTS.
        if (window.speechSynthesis.speaking) {
             window.speechSynthesis.cancel();
        }
        
        // 3. Stop previous audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        // 4. Create new audio object
        const customAudio = new Audio('source/CommitteeCall.mp3');

        // --- DEFINITIVE FIX: Use the 'playing' event to reliably attach the 'ended' listener ---
        
        // Stage 1: Attach listener for when audio STARTs playing
        customAudio.addEventListener('playing', function onSoundPlaying() {
            customAudio.removeEventListener('playing', onSoundPlaying);
            
            // Stage 2: Only now attach the listener for when the audio ENDS
            customAudio.addEventListener('ended', function onSoundEnd() {
                customAudio.removeEventListener('ended', onSoundEnd);
                
                // Play TTS only AFTER the audio ends
                window.speechSynthesis.speak(utterance); 
            });
        });

        // 5. Play the sound (no promise chain)
        customAudio.play().catch(error => {
            console.error(`Error playing custom sound: `, error);
            // Fallback: Play TTS immediately if sound fails
            window.speechSynthesis.speak(utterance);
        });
    }
    function handleCallDuty() {
        cancelConfirmModal.querySelector("h3").textContent = "Confirm Call";
        cancelConfirmModal.querySelector("p").textContent = "Are you sure you want to call the committee member on duty?";
        modalBtnYesConfirm.textContent = "Confirm"; // Standardized Text
        modalBtnNo.textContent = "Close";      // Standardized Text
        cancelConfirmModal.dataset.mode = "callDuty";
        cancelConfirmModal.classList.remove("hidden");
    }

    function executeCallDuty() {
        const onDutyName = state.onDuty;
        let isPlaying = false;
        if (onDutyName !== 'None') {
            isPlaying = state.courts.some(court => court.players.some(p => p.name === onDutyName));
        }

        let ttsMessage;
        if (onDutyName === 'None' || isPlaying) {
            // User's preferred general message
            ttsMessage = "Committee member required. Please report to your station for assistance."; 
        } else {
            // Targeted message
            const firstName = onDutyName.split(' ')[0];
            ttsMessage = `${firstName}, please report to your station for assistance.`;
        }
        
        // 1. Synchronous Fix: Reset the main alert timer schedule. 
        //resetAlertSchedule(); // <-- COMMENTED OUT AS REQUESTED
        
        // 2. Use the main system's stable alert function (playAlertSound), 
        //    passing the special sound name as an override.
        playAlertSound(ttsMessage, null, 'CommitteeCall.mp3'); // <-- NEW, CORRECT CALL
        
        // 3. Close modal
        cancelConfirmModal.classList.add("hidden");
    }

    // ADD NEW FUNCTION: Execute the actual pause/resume state change
    function executePauseToggle() {
        const playerName = cancelConfirmModal.dataset.player;
        const verb = cancelConfirmModal.dataset.verb;
        const playerObj = state.availablePlayers.find(p => p.name === playerName);

        if (playerObj) {
            
            // --- 1. DETERMINE CURRENT SELECTOR NAME ---
            const currentSelectorName = getFirstAvailablePlayerName(); 
            
            // Save the current state of the flag for logic in Step 2
            const wasPlayerHoldingSwapFlag = playerObj.isHoldingDutySwap;
            const isPlayerPausing = (verb === 'pause');
            
            // --- 2. PERFORM UNDO SWAP (ON RESUME, IF THEY CAUSED THE SWAP) ---
            if (verb === 'resume' && wasPlayerHoldingSwapFlag) {
                
                const cmIndex = state.availablePlayers.findIndex(p => p.name === state.onDuty);
                const playerAtPos2Index = 1;

                // If CM is somewhere in the queue (index > 1)
                if (cmIndex > playerAtPos2Index) {
                    // Swap the CM (from cmIndex) with the player currently at Position #2 (index 1).
                    const playerToSwapWith = state.availablePlayers[playerAtPos2Index];

                    state.availablePlayers[playerAtPos2Index] = state.availablePlayers[cmIndex]; // CM moves to #2
                    state.availablePlayers[cmIndex] = playerToSwapWith;                           // Old #2 moves to CM's old spot
                }
                
                // Clear the flag regardless of whether the swap was successful, as the player is unpaused
                playerObj.isHoldingDutySwap = false;
            }
            
            // --- 3. APPLY PAUSE STATE ---
            playerObj.isPaused = isPlayerPausing;

            // --- 4. SET SWAP FLAG (If pausing, set flag on the now-paused player) ---
            // Set flag only if the player is pausing and they were the effective selector
            if (verb === 'pause') {
                const firstActiveIndex = state.availablePlayers.findIndex(p => !p.isPaused);
                if (firstActiveIndex === state.availablePlayers.indexOf(playerObj)) {
                    playerObj.isHoldingDutySwap = true;
                } else {
                    playerObj.isHoldingDutySwap = false;
                }
            }
            
            // --- 5. ENFORCE ORDER/DUTY NOW (The main duty logic runs after resume is processed) ---
            enforceDutyPosition();

            // --- 6. CONSTRUCT MESSAGES ---
            const fullName = playerObj.name;
            let firstMessage = '';
            let secondMessage = null;

            if (playerObj.isPaused) {
                firstMessage = `${fullName} is now taking a well-deserved break.`;
                
                // Only play the second announcement if the player being paused was the current active selector.
                if (playerName === currentSelectorName) {
                    const nextSelectorName = getFirstAvailablePlayerName(); 
                    if (nextSelectorName) {
                        secondMessage = `${nextSelectorName}, please select players for a game.`; 
                    }
                }
            } else {
                firstMessage = `${fullName} is back on court and ready to play.`;
            }
            
            // --- 7. PLAY SEQUENCED ALERT ---
            playAlertSound(firstMessage, secondMessage); 

            cancelConfirmModal.classList.add("hidden");
            updateGameModeBasedOnPlayerCount();
            render();
            saveState();
            checkAndPlayAlert(false);
        }
    }

    function handlePauseToggleClick(button) {
        // We use the button element passed directly from the main click handler
        const playerName = button.dataset.playerName;
        const action = button.dataset.action; // 'pause' or 'resume'
        const playerObj = state.availablePlayers.find(p => p.name === playerName);

        if (!playerObj) return;

        const verb = action === 'pause' ? 'pause' : 'resume';
        const message = action === 'pause' 
            ? `Are you sure you want to pause your game play? You will remain in position #${state.availablePlayers.indexOf(playerObj) + 1} until you resume.` 
            : `Are you sure you want to resume your game play? You will be immediately restored to position #${state.availablePlayers.indexOf(playerObj) + 1}.`;

        cancelConfirmModal.querySelector("h3").textContent = `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`;
        cancelConfirmModal.querySelector("p").textContent = message;
        modalBtnYesConfirm.textContent = verb.charAt(0).toUpperCase() + verb.slice(1);
        modalBtnNo.textContent = "Close";
        
        cancelConfirmModal.dataset.mode = "pauseToggle";
        cancelConfirmModal.dataset.player = playerName;
        cancelConfirmModal.dataset.verb = action;

        cancelConfirmModal.classList.remove("hidden");
    }

    // --- ADDED FUNCTION ---
    function enforceDutyPosition() {
        if (state.availablePlayers.length < 2 || state.onDuty === 'None') {
            return;
        }

        const players = state.availablePlayers;
        
        // Find the index of the player who is currently the ACTIVE selector (first non-paused player)
        const firstActiveIndex = players.findIndex(p => !p.isPaused);
        
        // If no active players exist, or the CM is not the active player, exit.
        if (firstActiveIndex === -1 || players[firstActiveIndex].name !== state.onDuty) {
            return;
        }
        
        // --- CM IS THE EFFECTIVE SELECTOR (players[firstActiveIndex]) ---
        
        // Find the index of the FIRST suitable (available, non-paused, non-duty) player to swap with.
        // Start searching immediately after the CM's position.
        const targetSwapIndex = players.findIndex((p, index) => 
            index > firstActiveIndex &&         // Must be after the CM
            !p.isPaused &&                      // Must be available/unpaused
            p.name !== state.onDuty             // Must not be the CM (safety check)
        );

        // If a suitable player is found, perform the swap.
        if (targetSwapIndex !== -1) {
            const cmPlayer = players[firstActiveIndex];
            const targetPlayer = players[targetSwapIndex];
            
            // Perform the clean swap
            [players[firstActiveIndex], players[targetSwapIndex]] = [targetPlayer, cmPlayer];
        }
    }

    // --- ADDED FUNCTION ---
    function handleReorderPositionChange(newPositionStr) {
        if (!activeInput || !activeInput.dataset.playerName) return;

        const playerName = activeInput.dataset.playerName;
        const oldIndex = parseInt(activeInput.dataset.currentIndex, 10);
        const newIndex = parseInt(newPositionStr, 10) - 1;

        if (isNaN(newIndex) || newIndex < 0 || newIndex >= tempPlayerOrder.length) {
            alert(`Invalid position. Please enter a number between 1 and ${tempPlayerOrder.length}.`);
            return;
        }

        const [playerToMove] = tempPlayerOrder.splice(oldIndex, 1);
        tempPlayerOrder.splice(newIndex, 0, playerToMove);

        logPlayerSwap(playerName, oldIndex, newIndex);
        renderReorderList();
    }

    // --- ADDED FUNCTION ---
    function confirmSkipScores() {
        const courtId = endGameModal.dataset.courtId;
        const court = state.courts.find(c => c.id === courtId);
        const winnerValue = endGameModal.dataset.winner;

        if (!court || !winnerValue) return;

        const team1Names = getPlayerNames(court.teams.team1);
        const team2Names = getPlayerNames(court.teams.team2);

        const newGame = {
            id: Date.now(),
            court: court.id,
            startTime: court.gameStartTime,
            endTime: Date.now(),
            duration: document.getElementById(`timer-${court.id}`).textContent,
            teams: { team1: team1Names, team2: team2Names },
            score: null,
            winner: winnerValue
        };
        state.gameHistory.push(newGame);

        const winningPlayers = winnerValue === "team1" ? court.teams.team1 : court.teams.team2;
        const losingPlayers = winnerValue === "team1" ? court.teams.team2 : court.teams.team1;
        
        const playersToRequeue = [...winningPlayers, ...losingPlayers].filter(p => !p.guest);
        state.availablePlayers.push(...playersToRequeue);

        // Reset the court and close modal
        resetCourtAfterGame(court.id);
        endGameModal.classList.add("hidden");
        checkAndPlayAlert(false);
    }
    
    // --- ADDED HELPER FUNCTION ---
    function resetCourtAfterGame(courtId) {
        const court = state.courts.find(c => c.id === courtId);
        if (!court) return;
        
        court.status = "available";
        court.players = [];
        court.teams = {team1:[], team2:[]};
        court.gameMode = null;
        court.gameStartTime = null;
        court.queueSnapshot = null;
        
        updateGameModeBasedOnPlayerCount();
        enforceDutyPosition();
        render();
        saveState();
    }

    function confirmSkipResult() {
        const courtId = endGameModal.dataset.courtId;
        const court = state.courts.find(c => c.id === courtId);
        if (!court) return;

        const team1Names = getPlayerNames(court.teams.team1);
        const team2Names = getPlayerNames(court.teams.team2);

        const newGame = {
            id: Date.now(),
            court: court.id,
            startTime: court.gameStartTime,
            endTime: Date.now(),
            duration: document.getElementById(`timer-${court.id}`).textContent,
            teams: { team1: team1Names, team2: team2Names },
            score: null,
            winner: 'skipped'
        };
        state.gameHistory.push(newGame);

        const playersToRequeue = [...court.players].filter(p => !p.guest);
        state.availablePlayers.push(...playersToRequeue);

        // Reset the court and close modal
        resetCourtAfterGame(court.id);
        endGameModal.classList.add("hidden");
        checkAndPlayAlert(false);
    }

     // --- ADDED FUNCTION ---
    function handleSkipButtonClick() {
        const skipBtn = document.getElementById('end-game-skip-btn');
        const action = skipBtn.dataset.action;
        const courtId = endGameModal.dataset.courtId;
        const court = state.courts.find(c => c.id === courtId);
        if (!court) return;

        const team1Names = getPlayerNames(court.teams.team1);
        const team2Names = getPlayerNames(court.teams.team2);
        let playersToRequeue = [];

        const newGame = {
            id: Date.now(),
            court: court.id,
            startTime: court.gameStartTime,
            endTime: Date.now(),
            duration: document.getElementById(`timer-${court.id}`).textContent,
            teams: { team1: team1Names, team2: team2Names },
            score: null,
            winner: 'skipped'
        };

        if (action === 'skip-scores') {
            const winnerValue = endGameModal.dataset.winner;
            if (!winnerValue) return;

            newGame.winner = winnerValue;
            const winningPlayers = winnerValue === "team1" ? court.teams.team1 : court.teams.team2;
            const losingPlayers = winnerValue === "team1" ? court.teams.team2 : court.teams.team1;
            // THIS IS THE FIX: All players are returned.
            playersToRequeue = [...winningPlayers, ...losingPlayers];

        } else { // This handles 'skip-result'
            // THIS IS THE FIX: All players are returned.
            playersToRequeue = [...court.players];
        }

        state.gameHistory.push(newGame);
        state.availablePlayers.push(...playersToRequeue);

        const nextAvailableCourtId = findNextAvailableCourtId();
        const firstPlayerName = state.availablePlayers[0] ? state.availablePlayers[0].name : 'The next players';
        const openCourtMessage = nextAvailableCourtId 
            ? `Attention, ${firstPlayerName}. Please come and select your match. Court ${nextAvailableCourtId} is available.`
            : `Attention, ${firstPlayerName}. Please come and select your match. A court is now available.`;

        playAlertSound(openCourtMessage);

        resetCourtAfterGame(court.id);
        endGameModal.classList.add("hidden");
        checkAndPlayAlert(false);
    }

        // --- ADDED FUNCTION ---
    // Triggers the keypad for the reset confirmation
    function handleResetAppClick() {
        showKeypad(null, {
            mode: 'reset', // A new, special mode for the keypad
            maxLength: 5,
            title: 'Enter Reset PIN'
        });
    }

    // --- ADDED FUNCTION ---
    // Checks the entered PIN against the hardcoded value
    function checkResetPasscode() {
        const enteredCode = keypadDisplay.dataset.hiddenValue;
        const expectedCode = "30221"; // The hardcoded reset PIN

        if (enteredCode === expectedCode) {
            // If correct, show a final confirmation before resetting
            hideKeypad();
            cancelConfirmModal.querySelector("h3").textContent = "Final Confirmation";
            cancelConfirmModal.querySelector("p").textContent = "WARNING: This will erase all game history and check out all players. Are you absolutely sure?";
            modalBtnYesConfirm.textContent = "Yes, Reset";
            modalBtnNo.textContent = "Cancel";
            cancelConfirmModal.dataset.mode = "executeReset";
            cancelConfirmModal.classList.remove("hidden");
        } else {
            // If incorrect, shake the keypad and clear it
            const keypadContent = customKeypadModal.querySelector('.keypad-content');
            keypadContent.classList.add('shake');
            setTimeout(() => {
                keypadContent.classList.remove('shake');
                keypadDisplay.textContent = '';
                if (keypadDisplay.dataset.hiddenValue) {
                    keypadDisplay.dataset.hiddenValue = '';
                }
                keypadConfirmBtn.disabled = true;
            }, 820);
        }
    }

    // --- ADDED FUNCTION ---
    // The core function that resets the application state
    function executeAppReset() {
        // Reset all player locations
        state.clubMembers = [...MASTER_MEMBER_LIST].sort((a, b) => a.name.localeCompare(b.name));
        state.availablePlayers = [];

        // Reset all court states
        state.courts.forEach(court => {
            court.status = 'available';
            court.players = [];
            court.teams = { team1: [], team2: [] };
            court.autoStartTimer = null;
            court.gameMode = null;
            court.gameStartTime = null;
            court.autoStartTimeTarget = null;
            court.becameAvailableAt = Date.now();
            court.queueSnapshot = null;
        });

        // Clear all history
        state.gameHistory = [];
        state.reorderHistory = [];

        // Reset other relevant states
        state.onDuty = 'None';
        state.selection = { gameMode: 'doubles', players: [], courtId: null };
        
        // Close all modals
        adminSettingsModal.classList.add('hidden');
        cancelConfirmModal.classList.add('hidden');

        // Save the new, clean state and re-render the UI
        saveState();
        render();
        alert("Application has been reset.");
    }

    // --- INITIALIZATION ---
    loadState();
    updateGameModeBasedOnPlayerCount();
    render();
    updateNotificationIcons(); // NEW: Initial icon update
    fetchWeather();

    
    // START 1-second timers for display updates
    setInterval(() => {
        updateTimers();
        updateAlertStatusTimer();
    }, 1000);
    
    // Start repeating check for alert condition every 10 seconds to ensure alert logic is executed on time
    const LOGIC_CHECK_INTERVAL_MS = 10 * 1000; // 10 seconds
    
    // Run initial check immediately (to kick off the scheduling if conditions are met)
    checkAndPlayAlert(false);
    
    // Start repeating check
    setInterval(checkAndPlayAlert, LOGIC_CHECK_INTERVAL_MS);


// BIND ALL INITIAL DOM LISTENERS
    
    updateOverlaySpacers();
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
    
    document.getElementById('end-game-skip-btn').addEventListener('click', handleSkipButtonClick);
    document.getElementById('reset-app-btn').addEventListener('click', handleResetAppClick);

    // ADDED GLOBAL CLICK LISTENER FOR ALL CARD TOGGLES
    document.addEventListener('click', (e) => {
        const toggleButton = e.target.closest('.summary-toggle-btn');
        if (!toggleButton) return;

        const cardType = toggleButton.dataset.cardType;
        const courtId = toggleButton.dataset.courtId;

        if (cardType === 'summary') {
            state.mobileControls.isSummaryExpanded = !state.mobileControls.isSummaryExpanded;
        } else if (cardType === 'players') {
            state.mobileControls.isPlayersExpanded = !state.mobileControls.isPlayersExpanded;
        } else if (cardType === 'court' && courtId) {
            const court = state.courts.find(c => c.id === courtId);
            if (court) {
                court.isCollapsed = !court.isCollapsed;
            }
        }
        
        saveState();
        render();
    });

    // ADDED WINDOW RESIZE LISTENER FOR AUTOMATIC EXPANSION
    window.addEventListener('resize', resetCollapseOnResize);

    // MODIFIED: Restored listener to show confirmation modal for Check-in
    checkInList.addEventListener("click",e=>{
        if(e.target.classList.contains("add")){
            const playerName=e.target.dataset.player;
            const player = getPlayerByName(playerName); 
            cancelConfirmModal.querySelector("h3").textContent="Confirm Check In";
            cancelConfirmModal.querySelector("p").textContent=`Are you sure you want to check in ${playerName.split(' ')[0]} (${player.gender})?`;
            modalBtnYesConfirm.textContent="Confirm"; // Standardized Text
            modalBtnNo.textContent = "Close";      // Standardized Text
            cancelConfirmModal.dataset.mode="checkInPlayer";
            cancelConfirmModal.dataset.player=playerName;
            cancelConfirmModal.classList.remove("hidden")
        }
    });

    checkOutBtn.addEventListener("click",()=>{populateCheckOutModal(),checkOutModal.classList.remove("hidden")});
    checkOutCloseBtn.addEventListener("click",()=>checkOutModal.classList.add("hidden"));
    
    // MODIFIED: Restored listener to show confirmation modal for Check-out
    checkOutList.addEventListener("click",e=>{
        if(e.target.classList.contains("remove")){
            const playerName=e.target.dataset.player;
            const player = getPlayerByName(playerName); 
            cancelConfirmModal.querySelector("h3").textContent="Confirm Check Out";
            cancelConfirmModal.querySelector("p").textContent=`Are you sure you want to check out ${playerName.split(' ')[0]} (${player.gender})?`;
            modalBtnYesConfirm.textContent="Confirm"; // Standardized Text
            modalBtnNo.textContent = "Close";      // Standardized Text
            cancelConfirmModal.dataset.mode="checkOutPlayer";
            cancelConfirmModal.dataset.player=playerName;
            cancelConfirmModal.classList.remove("hidden")
        }
    });

    endGameCancelBtn.addEventListener("click", () => {
        const courtId = endGameModal.dataset.courtId;
        if (courtId) {
            const courtCardEl = document.querySelector(`.court-card[data-court-id="${courtId}"]`);
            const button = courtCardEl ? courtCardEl.querySelector('.end-game-ball') : null;
            if (button) {
                // This is the fix: Reset the button's state and re-animate it
                
                // 1. Remove any existing animation classes to reset the button
                button.classList.remove('hide-anim', 'animate-in');
                
                // 2. Use a tiny delay to force the browser to re-apply the animation
                setTimeout(() => {
                    button.classList.add('animate-in');
                }, 50);
            }
        }
        endGameModal.classList.add("hidden");
    });
    endGameConfirmBtn.addEventListener("click",confirmEndGame);
    
    // MODIFIED: No button now handles closing and restoring the correct modal
    modalBtnNo.addEventListener("click",()=>{ 
        cancelConfirmModal.classList.add("hidden"); 
        
        // Re-open check-in/out modals if that was the action that triggered the confirmation
        if (cancelConfirmModal.dataset.mode === "checkInPlayer") checkInModal.classList.remove("hidden"); 
        if (cancelConfirmModal.dataset.mode === "checkOutPlayer") checkOutModal.classList.remove("hidden"); 
        
        resetConfirmModal(); 
    });
    
    // MODIFIED: Yes button now handles check-in/out and the force announcement
    // MODIFIED: Yes button now handles check-in/out and the force announcement
    modalBtnYesConfirm.addEventListener("click",()=>{
    const mode = cancelConfirmModal.dataset.mode;

    if (mode === "checkOutPlayer") {
        executePlayerCheckOut();
    } else if (mode === "checkInPlayer") {
        executePlayerCheckIn();
    } else if (mode === "cancelGame") {
        executeGameCancellation();
    } else if (mode === "callDuty") {
        executeCallDuty();
    } else if (mode === "executeReset") {
        executeAppReset();
    } else if (mode === "pauseToggle") {
        executePauseToggle();
    } 
    
    else if (mode === "forceAnnouncement") {
        cancelConfirmModal.classList.add("hidden"); 
        checkAndPlayAlert(true);
    } else if (mode === "forceAnnouncementNotEnoughPlayers") {
        
        const now = Date.now();
        const FIVE_MINUTES_MS = 5 * 60 * 1000;
        
        if (state.notificationControls.isMinimized) {
            alertScheduleTime = 0; 
            alertState = 'initial_check'; 
        } else {
            alertScheduleTime = now + FIVE_MINUTES_MS;
            alertState = '5_min_repeat';
        }
        
        const availablePlayerCount = state.availablePlayers.length;
        const playerNames = state.availablePlayers.map(p => p.name).join(' and ');
        const playersNeeded = 4 - availablePlayerCount;
        const pluralS = playersNeeded > 1 ? 's' : '';
        let message = `Attention ${playerNames}, we are waiting for ${playersNeeded} more player${pluralS} before we can start a match.`;
        if (availablePlayerCount >= 2) {
            message += " or start a singles game in the meantime.";
        }
        playAlertSound(message); 

        cancelConfirmModal.classList.add("hidden"); 
    }

    resetConfirmModal();
});
    
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
        adminSettingsModal.classList.remove('hidden');
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
        
        // --- ANNOUNCEMENT: Admin action confirmation ---
        playAlertSound("Players have been re-ordered by the Admin.", null); 
        // --- END ANNOUNCEMENT ---

        enforceDutyPosition();

        reorderPlayersModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');
        tempPlayerOrder = [];
        render();
        saveState();
    });

    viewReorderLogBtn.addEventListener('click', () => {
        renderReorderHistory();
        adminSettingsModal.classList.add('hidden');
        reorderLogModal.classList.remove('hidden');
    });

    reorderLogBackBtn.addEventListener('click', () => {
        reorderLogModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');
    });

    // EVENT LISTENERS FOR SOUND SELECTION
    selectSoundBtn.addEventListener('click', handleSoundSelectionModal);
    soundSelectionList.addEventListener('change', handleSoundSelection);
    soundSelectionList.addEventListener('click', handleSoundPreview);
    soundConfirmBtn.addEventListener('click', confirmSoundSelection);
    soundCancelBtn.addEventListener('click', cancelSoundSelection);
    
    // EVENT LISTENERS FOR NOTIFICATION CONTROLS
    muteBtn.addEventListener('click', () => {
        state.notificationControls.isMuted = !state.notificationControls.isMuted;
        if (state.notificationControls.isMuted) {
             state.notificationControls.isTTSDisabled = true; // Mute implies TTS disabled
        }
        saveState();
        updateNotificationIcons();
        checkAndPlayAlert(false);
    });

    minimizeNotificationsBtn.addEventListener('click', () => {
        state.notificationControls.isMinimized = !state.notificationControls.isMinimized;
        // If minimizing, reset the alert timer to initial check state
        if (state.notificationControls.isMinimized) {
            resetAlertSchedule();
        }
        saveState();
        updateNotificationIcons();
        checkAndPlayAlert(false);
    });

    noSpeechBtn.addEventListener('click', () => {
        state.notificationControls.isTTSDisabled = !state.notificationControls.isTTSDisabled;
        // If TTS is disabled, we cannot be globally muted (unless actively pressed Mute)
        if (!state.notificationControls.isTTSDisabled && state.notificationControls.isMuted) {
             state.notificationControls.isMuted = false;
        }
        saveState();
        updateNotificationIcons();
    });

    // EVENT LISTENERS FOR ADMIN COURT MANAGEMENT
    manageCourtPlayersBtn.addEventListener('click', showManageCourtPlayersModal);
    managePlayersCloseBtn.addEventListener('click', handleManageClose);
    managePlayersBackBtn.addEventListener('click', handleManageBack);
    managePlayersConfirmBtn.addEventListener('click', handleManageConfirm);
    
    managePlayersAddBtn.addEventListener('click', () => {
        const { removedPlayers, addedPlayers, courtId } = state.adminCourtManagement;
        const hasChanges = removedPlayers.length > 0 || addedPlayers.length > 0;
        if (hasChanges) {
            showAddPlayerCard(courtId);
        }
    });

    manageCourtPlayersModal.addEventListener('click', (e) => {
        const target = e.target.closest('.action-icon');
        if (!target) return;

        const courtId = target.dataset.courtId;
        const action = target.dataset.action;
        const playerName = target.dataset.player;
        const { adminCourtManagement } = state;

        if (action === 'select-court') {
            showRemovePlayerCard(courtId);
        } else if (action === 'remove-player-temp') {
            const playerObject = adminCourtManagement.currentCourtPlayers.find(p => p.name === playerName);
            if (playerObject && !adminCourtManagement.removedPlayers.some(p => p.name === playerName)) {
                adminCourtManagement.removedPlayers.push(playerObject);
                showRemovePlayerCard(adminCourtManagement.courtId);
            }
        } else if (action === 'return-player-temp') {
            adminCourtManagement.removedPlayers = adminCourtManagement.removedPlayers.filter(p => p.name !== playerName);
            showRemovePlayerCard(adminCourtManagement.courtId);
        } else if (action === 'add-player-temp') {
            const playerObject = state.availablePlayers.find(p => p.name === playerName);
            if (playerObject) {
                state.availablePlayers = state.availablePlayers.filter(p => p.name !== playerName);
                adminCourtManagement.addedPlayers.push(playerObject);
                renderAddPlayersList(adminCourtManagement.courtId);
            }
        } else if (action === 'undo-add-player-temp') {
            const playerObject = adminCourtManagement.addedPlayers.find(p => p.name === playerName);
            if (playerObject) {
                adminCourtManagement.addedPlayers = adminCourtManagement.addedPlayers.filter(p => p.name !== playerName);
                state.availablePlayers = [playerObject, ...state.availablePlayers]; 
                renderAddPlayersList(adminCourtManagement.courtId);
            }
        }
        updateGameModeBasedOnPlayerCount();
        saveState();
    });
});