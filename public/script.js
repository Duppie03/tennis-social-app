document.addEventListener('DOMContentLoaded', () => {

    let MASTER_MEMBER_LIST = []; // Will be populated from the CSV file

    // --- NEW HELPER FUNCTION TO PARSE CSV DATA ---
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (!lines[0]) return []; // Handle empty file
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i]) continue; // Skip blank lines
            
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length !== headers.length) continue; // Skip malformed lines
            
            const entry = {};

            // --- REPLACE THIS ENTIRE BLOCK ---
            headers.forEach((header, index) => {
                const value = values[index];
                if (!value) return; // Skip if the value is empty

                if (header === 'gender') {
                    // This is the fix: Convert "Male" to "M" and "Female" to "F"
                    entry[header] = value.charAt(0).toUpperCase();
                } else if (header === 'guest' || header === 'isPaused') {
                    entry[header] = (value.toLowerCase() === 'true');
                } else {
                    entry[header] = value;
                }
            });
            // --- END OF REPLACEMENT ---

            if (!entry.name) continue; // Skip entries without a name

            // Add the default values that are not in the CSV
            entry.guest = false;
            entry.isPaused = false;
            result.push(entry);
        }
        return result;
    }

    
    // Define the preferred court hierarchy
    const COURT_HIERARCHY = ['B', 'C', 'D', 'A', 'E'];

    // --- STATE MANAGEMENT ---


    let state = {

        juniorClub: {
            // Master list of all registered parents/children
            parents: [], 
            // Children currently checked into the club (will be returned to queue later)
            activeChildren: [], 
            // History logs check-in sessions for payment tracking
            history: [], // { id, parentId, parentName, childNames: [], date, isPaid }
            
            // --- FIX: Corrected the object structure ---
            statsFilter: { // This is for the History/Payment modal
                parent: 'all',
                paid: 'all', // 'all', 'paid', 'unpaid'
            }, // <-- CORRECTED CLOSING BRACE

            rosterFilter: { // This is for the new Roster modal
                sortKey: 'name',         // 'name' or 'last_checkin'
                sortOrder: 'asc',        // 'asc' or 'desc'
                type: 'all',              // 'all', 'parents', 'children' <-- NEW PROPERTY
 
            },
            // NEW: State for the main check-in list filter
            checkInFilter: {
                displayMode: 'parent', // 'parent' or 'child'
            },

            // NEW STATE FOR DYNAMIC FORM FLOW
            registrationFlow: {
                parentCollapsed: false,
                childrenExpanded: false,
            }
        },

        uiSettings: {
            fontSizeMultiplier: 1.0, // 1.0 is the default (100%)
            displaySizeMultiplier: 1.0 // Add this line
        },

        detailedWeatherView: 'day', // 'day', 'morning', 'afternoon'
        weatherData: null,
        pongAnimationOffset: 0,

        clubMembers: [...MASTER_MEMBER_LIST].sort((a, b) => a.name.localeCompare(b.name)),
        availablePlayers: [],
        courts: [
            // ADD isCollapsed: false to each court object
            { id: 'A', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false, isModeOverlayActive: false, courtMode: 'doubles' },
            { id: 'B', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false, isModeOverlayActive: false, courtMode: 'doubles' },
            { id: 'C', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false, isModeOverlayActive: false, courtMode: 'doubles' },
            { id: 'D', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false, isModeOverlayActive: false, courtMode: 'doubles' },
            { id: 'E', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false, isModeOverlayActive: false, courtMode: 'doubles' },
        ],
        courtSettings: {
            visibleCourts: ['A', 'B', 'C', 'D', 'E'],
            autoAssignModes: true // <-- ADD THIS NEW LINE
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
        guestHistory: [], // NEW: To store guest data
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
        },
        // NEW LIGHT MANAGEMENT STATE (Local RPC Method)
        lightSettings: {
            // Base URL structure for local RPC. The IP will be inserted in sendLightCommand.
            shellyBaseUrl: 'http://<SHELLY_IP>/rpc', 
            // shellyAuthKey is not needed for local RPC and is cleared
            shellyAuthKey: '', 
            courts: { 
                // Each shellyDeviceId is the specific IP of that light controller.
                'A': { id: 'A', label: 'Court A Lights', isManaged: true, isActive: false, shellyDeviceId: '192.168.0.15' },
                'B': { id: 'B', label: 'Court B Lights', isManaged: true, isActive: false, shellyDeviceId: '192.168.0.147' },
                'C': { id: 'C', label: 'Court C Lights', isManaged: true, isActive: false, shellyDeviceId: '192.168.0.130' },
                'D': { id: 'D', label: 'Court D Lights', isManaged: true, isActive: false, shellyDeviceId: '192.168.0.179' },
                // Court E has no light. Set isManaged to false and remove device ID.
                'E': { id: 'E', label: 'Court E Lights', isManaged: false, isActive: false, shellyDeviceId: '' }
            },
            general: {
                // Test Light = Clubhouse
                'clubhouse': { id: 'clubhouse', label: 'Clubhouse Lights', isManaged: true, isActive: false, shellyDeviceId: '192.168.0.100' }
            }
        },
        // NEW BALL MANAGEMENT STATE (ADD THIS BLOCK - Updated to CANS)
        ballManagement: {
            stock: 0, // Total number of CANS
            usedStock: 0, // Total number of USED individual balls
            // History logs the member, category, and number of CANS.
            history: [], // { timestamp, action: 'in' | 'out', category: 'purchase' | 'league' | 'sale', count: CANS, member: name }
            historyFilter: 'all'
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
    // NEW: Admin timer
    let adminSessionActive = false; // NEW: Track admin login state
    let adminSessionTimer = null;   // NEW: Timer for admin session timeout

    // NEW ELEMENTS: Weather Modals
    const currentWeatherModal = document.getElementById('current-weather-modal');
    const detailedWeatherModal = document.getElementById('detailed-weather-modal');
    // JUNIOR CLUB:
    // --- NEW ELEMENTS: Junior Club Modals (Required for listeners and utility calls) ---
    const juniorClubModal = document.getElementById('junior-club-modal');
    const juniorClubList = document.getElementById('junior-club-list');
    const juniorClubCloseBtn = document.getElementById('junior-club-close-btn');
    const newParentBtn = document.getElementById('new-parent-btn');
    const newParentModal = document.getElementById('new-parent-modal');
    const newParentCancelBtn = document.getElementById('new-parent-cancel-btn');
    const newParentConfirmBtn = document.getElementById('new-parent-confirm-btn');
    const parentNameInput = document.getElementById('parent-name-input');
    const parentSurnameInput = document.getElementById('parent-surname-input');
    const childrenContainer = document.getElementById('children-container');
    const addChildBtn = document.getElementById('add-child-btn');
    const parentPhoneInput = document.getElementById('parent-phone-input'); // <-- NEW REFERENCE
    const removeChildSelectionModal = document.getElementById('remove-child-selection-modal');
    const childrenForRemovalList = document.getElementById('children-for-removal-list');
    const removeChildSelectionBackBtn = document.getElementById('remove-child-selection-back-btn');
    const removeChildSelectionConfirmBtn = document.getElementById('remove-child-selection-confirm-btn');

    const childSelectionModal = document.getElementById('child-selection-modal');
    const childSelectionConfirmBtn = document.getElementById('child-selection-confirm-btn');
    const childSelectionBackBtn = document.getElementById('child-selection-back-btn');
    const attendingChildrenList = document.getElementById('attending-children-list');

    const juniorClubHistoryBtn = document.getElementById('junior-club-history-btn');
    const juniorClubStatsModal = document.getElementById('junior-club-stats-modal');
    const juniorClubHistoryList = document.getElementById('junior-club-history-list');
    const juniorClubStatsBackBtn = document.getElementById('junior-club-stats-back-btn');
    const juniorClubStatsDetailsBtn = document.getElementById('junior-club-stats-details-btn');
    const juniorClubDetailModal = document.getElementById('junior-club-detail-modal');
    const detailCloseBtn = document.getElementById('detail-close-btn');
    const detailTogglePaidBtn = document.getElementById('detail-toggle-paid-btn');
    const juniorClubBtn = document.getElementById('junior-club-btn');
    // NEW: Reference to the filter group element
    const juniorClubNameFilterGroup = document.getElementById('junior-club-name-filter-group');
    const removeChildBtn = document.getElementById('remove-child-btn-main');

    // --- NEW ELEMENTS FOR ROSTER MODAL ---
    const juniorClubRosterBtn = document.getElementById('junior-club-roster-btn');
    const juniorClubRosterModal = document.getElementById('junior-club-roster-modal');
    const juniorClubRosterList = document.getElementById('junior-club-roster-list');
    const rosterCloseBtn = document.getElementById('roster-close-btn');
    const rosterTypeFilterGroup = document.getElementById('roster-type-filter-group'); // <-- NEW ELEMENT

    // CRITICAL FIX: Add the missing gender filter element reference
    const rosterGenderFilterGroup = document.getElementById('roster-gender-filter-group');

    // --- NEW ELEMENTS FOR ROSTER DETAIL MODAL ---
    const rosterDetailModal = document.getElementById('roster-detail-modal');
    const rosterDetailTitle = document.getElementById('roster-detail-title');
    const rosterDetailContent = document.getElementById('roster-detail-content');
    const rosterDetailCloseBtn = document.getElementById('roster-detail-close-btn');
    // --- END NEW ELEMENTS ---
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

    // NEW ELEMENTS: Style Editor
    const editStylesBtn = document.getElementById('edit-styles-btn');
    const editStylesModal = document.getElementById('edit-styles-modal');
    const editStylesCloseBtn = document.getElementById('edit-styles-close-btn');
    const fontSizeSlider = document.getElementById('font-size-slider');
    
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


    // NEW ELEMENTS: Ball Management (ADD THIS BLOCK)
    const ballManagementBtn = document.getElementById('ball-management-btn');
    const ballManagementModal = document.getElementById('ball-management-modal');
    const ballManagementCloseBtn = document.getElementById('ball-management-close-btn');
    const ballStockCount = document.getElementById('ball-stock-count');
    const usedBallStockCount = document.getElementById('used-ball-stock-count'); // <-- ADD THIS
    const addStockBtn = document.getElementById('add-stock-btn');
    const signOutOptions = document.getElementById('sign-out-options');
    const signOutMemberModal = document.getElementById('sign-out-member-modal');
    const signOutMemberList = document.getElementById('sign-out-member-list');
    const signOutMemberConfirmBtn = document.getElementById('sign-out-member-confirm-btn');
    const signOutMemberCancelBtn = document.getElementById('sign-out-member-cancel-btn');
    const returnStockBtn = document.getElementById('return-stock-btn');
    const returnUsedBallsBtn = document.getElementById('return-used-balls-btn'); // <-- ADD THIS
    const ballHistoryBtn = document.getElementById('ball-history-btn');
    const ballHistoryModal = document.getElementById('ball-history-modal');
    const ballHistoryList = document.getElementById('ball-history-list');
    const ballHistoryCloseBtn = document.getElementById('ball-history-close-btn'); 
    const signOutMemberTitle = document.getElementById('sign-out-member-title');
    const signOutMemberPrompt = document.getElementById('sign-out-member-prompt');



    
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

    function loadState(MASTER_MEMBER_LIST){ // Add parameter here
        const savedState = localStorage.getItem("tennisSocialAppState");
        if (savedState) {
            const loaded = JSON.parse(savedState);
            state = { ...state, ...loaded };

            if (!state.uiSettings) {
                state.uiSettings = { fontSizeMultiplier: 1.0 };
            }

            if (!state.courtSettings) {
                state.courtSettings = {
                    visibleCourts: ['A', 'B', 'C', 'D', 'E']
                };
            }

            // Load new Junior Club Check-In filter state
            if (!state.juniorClub.checkInFilter) {
                state.juniorClub.checkInFilter = { displayMode: 'parent' };
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

            if (!state.guestHistory) {
                state.guestHistory = [];
            }
            
            // --- THIS IS THE CORRECTED BLOCK ---
            // Safely initialize the entire ball management state if it's missing or incomplete
            if (!state.ballManagement) {
                state.ballManagement = {
                    stock: 0,
                    usedStock: 0,
                    history: [],
                    historyFilter: 'all'
                };
            } else {
                // Handle older states that have ballManagement but might be missing new properties
                if (state.ballManagement.usedStock === undefined) {
                    state.ballManagement.usedStock = 0;
                }
                if (!state.ballManagement.historyFilter) {
                    state.ballManagement.historyFilter = 'all';
                }
            }
            // --- END OF CORRECTION ---

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
                // NEW: Initialize mode overlay state
                court.isModeOverlayActive = court.isModeOverlayActive === undefined ? false : court.isModeOverlayActive; // <--- INSERTED HERE
                // NEW: Initialize court mode
                court.courtMode = court.courtMode || 'doubles'; // <--- INSERTED HERE

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


    function applyFontSize() {
        document.body.style.setProperty('--font-size-multiplier', state.uiSettings.fontSizeMultiplier);
    }

    function applyDisplaySize() {
        document.body.style.setProperty('--display-size-multiplier', state.uiSettings.displaySizeMultiplier);
    }

    function showEditStylesModal() {
        // Logic to update the Font Size buttons
        const currentFontMultiplier = state.uiSettings.fontSizeMultiplier;
        const fontSelector = document.getElementById('font-size-selector');
        if (fontSelector) {
            fontSelector.querySelectorAll('button').forEach(btn => {
                // Use parseFloat to ensure a proper number comparison
                const btnSize = parseFloat(btn.dataset.size);
                btn.classList.toggle('active', btnSize === currentFontMultiplier);
            });
        }

        // Logic to update the Display Size buttons
        const currentDisplayMultiplier = state.uiSettings.displaySizeMultiplier;
        const displaySelector = document.getElementById('display-size-selector');
        if (displaySelector) {
            displaySelector.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', parseFloat(btn.dataset.size) === currentDisplayMultiplier);
            });
        }

        // Hide the admin modal and show the styles modal
        adminSettingsModal.classList.add('hidden');
        editStylesModal.classList.remove('hidden');
    }

    function handleFontSizeChange(newMultiplier) {
        state.uiSettings.fontSizeMultiplier = newMultiplier;
        applyFontSize();
        saveState();

        // Update active button in the UI
        const selector = document.getElementById('font-size-selector');
        if (selector) {
            selector.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('active');
                if (parseFloat(btn.dataset.size) === newMultiplier) {
                    btn.classList.add('active');
                }
            });
        }
    } 

    function handleDisplaySizeChange(newMultiplier) {
        state.uiSettings.displaySizeMultiplier = newMultiplier;
        applyDisplaySize();
        saveState();

        const selector = document.getElementById('display-size-selector');
        if (selector) {
            selector.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('active');
                if (parseFloat(btn.dataset.size) === newMultiplier) {
                    btn.classList.add('active');
                }
            });
        }
    }

    function getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }

    function getAqiLabel(value) {
        if (value <= 20) return 'Good';
        if (value <= 40) return 'Fair';
        if (value <= 60) return 'Moderate';
        if (value <= 80) return 'Poor';
        if (value <= 100) return 'Very Poor';
        return 'Extremely Poor';
    }



 /**
     * Translates a WMO weather code into a display icon.
     * @param {number} code The WMO weather code from the API.
     * @param {boolean} isDay Whether it is currently daytime (defaults to true).
     * @returns {string} An emoji character representing the weather.
     */
    function wmoCodeToText(code, isSpecificTime = false) {
        switch (code) {
            case 0: return 'Clear sky';
            case 1: return 'Mainly clear';
            case 2: return 'Partly cloudy';
            case 3: return 'Overcast';
            case 45: case 48: return 'Fog';
            case 51: case 53: case 55: return 'Drizzle';
            case 56: case 57: return 'Freezing Drizzle';
            case 61: return 'Slight rain';
            case 63: return 'Moderate rain';
            case 65: return 'Heavy rain';
            case 66: case 67: return 'Freezing Rain';
            case 71: case 73: case 75: return 'Snow fall';
            case 77: return 'Snow grains';
            case 80: case 81: case 82: return 'Rain showers';
            case 85: case 86: return 'Snow showers';
            case 95: return 'Thunderstorm';
            case 96: case 99: return isSpecificTime ? 'Thunderstorm with hail' : 'A thunderstorm this morning; otherwise, clouds and sun';
            default: return 'Unknown';
        }
    }

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

    function getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }

    function getAqiLabel(value) {
        if (value <= 20) return 'Good';
        if (value <= 40) return 'Fair';
        if (value <= 60) return 'Moderate';
        if (value <= 80) return 'Poor';
        if (value <= 100) return 'Very Poor';
        return 'Extremely Poor';
    }


 


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

            // Clear any existing interval to prevent multiple animations running
            if (window.weatherAnimationInterval) {
                clearInterval(window.weatherAnimationInterval);
            }

            window.weatherAnimationInterval = setInterval(() => {
                const nextState = (currentState + 1) % totalStates;

                elements.icons[currentState].classList.remove('is-visible');
                elements.temps[currentState].classList.remove('is-visible');
                
                elements.icons[nextState].classList.add('is-visible');
                elements.temps[nextState].classList.add('is-visible');
                
                currentState = nextState;
            }, 5000); // Run this sequence every 5 seconds

        } catch (error) {
            console.error('Failed to fetch weather:', error);
            // Fallback display on API error
            const lowTemp = 12; // Placeholder low temperature
            const highTemp = 25; // Placeholder high temperature
            
            weatherDisplay.innerHTML = `
                <div id="temp-fader">
                    <span class="temp-min is-visible">${lowTemp}°C</span>
                    <span class="temp-max">${highTemp}°C</span>
                </div>`;

            if (window.weatherAnimationInterval) {
                clearInterval(window.weatherAnimationInterval);
            }
            
            let isLowVisible = true;
            window.weatherAnimationInterval = setInterval(() => {
                const lowEl = weatherDisplay.querySelector('.temp-min');
                const highEl = weatherDisplay.querySelector('.temp-max');
                if (lowEl && highEl) {
                    lowEl.classList.toggle('is-visible', !isLowVisible);
                    highEl.classList.toggle('is-visible', isLowVisible);
                    isLowVisible = !isLowVisible;
                }
            }, 5000);
        }
    }

    function renderCurrentWeatherModal() {
        if (!state.weatherData) return;
        const { current } = state.weatherData;

        document.getElementById('cw-time').textContent = current.time;
        document.getElementById('cw-icon').textContent = getWeatherIcon(current.weatherCode);
        document.getElementById('cw-temp').textContent = `${current.temp}°`;
        document.getElementById('cw-realfeel').textContent = `${current.realFeel}°`;
        document.getElementById('cw-realfeel-shade').textContent = `${current.realFeel}°`; // Current doesn't have shade
        document.getElementById('cw-description').textContent = wmoCodeToText(current.weatherCode);
        document.getElementById('cw-wind').textContent = `${current.windDir} ${current.windSpeed} km/h`;
        document.getElementById('cw-wind-gusts').textContent = `${current.windGusts} km/h`;
        const aqiEl = document.getElementById('cw-air-quality');
        aqiEl.textContent = getAqiLabel(current.aqi);
        aqiEl.className = `aqi-${getAqiLabel(current.aqi).toLowerCase().replace(' ','')}`;
    }

    function renderDetailedWeatherModal() {
        if (!state.weatherData) return;
        const { current, day, morning, afternoon } = state.weatherData;
        const view = state.detailedWeatherView;

        // Update active tab
        document.querySelectorAll('.weather-tabs .tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });

        // Populate top section (Detailed Current)
        document.getElementById('dw-uv').textContent = `${current.uv} (Low)`;
        document.getElementById('dw-dewpoint').textContent = `${current.dewPoint}°`;
        document.getElementById('dw-humidity').textContent = `${current.humidity}%`;
        document.getElementById('dw-pressure').textContent = `↑ ${current.pressure} mb`;
        document.getElementById('dw-cloud-cover').textContent = `${current.cloudCover}%`;
        document.getElementById('dw-visibility').textContent = `${current.visibility} km`;

        // Populate bottom section (Forecast) based on view
        let forecastData;
        let gridHtml = '';
        switch (view) {
            case 'morning':
                forecastData = morning;
                gridHtml = `
                    <div class="weather-item"><span>Wind</span><strong>${forecastData.windDir} ${forecastData.windSpeed} km/h</strong></div>
                    <div class="weather-item"><span>Precipitation</span><strong>${forecastData.precipitation} mm</strong></div>
                    <div class="weather-item"><span>Wind Gusts</span><strong>${forecastData.windGusts} km/h</strong></div>
                    <div class="weather-item"><span>Prob. of Precip.</span><strong>${forecastData.precipProb}%</strong></div>
                    <div class="weather-item"><span>Humidity</span><strong>${forecastData.humidity}%</strong></div>
                    <div class="weather-item"><span>Cloud Cover</span><strong>${forecastData.cloudCover}%</strong></div>`;
                break;
            case 'afternoon':
                forecastData = afternoon;
                gridHtml = `
                    <div class="weather-item"><span>Wind</span><strong>${forecastData.windDir} ${forecastData.windSpeed} km/h</strong></div>
                    <div class="weather-item"><span>Precipitation</span><strong>${forecastData.precipitation} mm</strong></div>
                    <div class="weather-item"><span>Wind Gusts</span><strong>${forecastData.windGusts} km/h</strong></div>
                    <div class="weather-item"><span>Prob. of Precip.</span><strong>${forecastData.precipProb}%</strong></div>
                    <div class="weather-item"><span>Humidity</span><strong>${forecastData.humidity}%</strong></div>
                    <div class="weather-item"><span>Cloud Cover</span><strong>${forecastData.cloudCover}%</strong></div>`;
                break;
            case 'day':
            default:
                forecastData = day;
                gridHtml = `
                    <div class="weather-item"><span>Max UV Index</span><strong>${forecastData.uv} (Very High)</strong></div>
                    <div class="weather-item"><span>Precipitation</span><strong>${forecastData.precipitation} mm</strong></div>
                    <div class="weather-item"><span>Max Wind</span><strong>${forecastData.windSpeed} km/h</strong></div>
                    <div class="weather-item"><span>Max Wind Gusts</span><strong>${forecastData.windGusts} km/h</strong></div>
                    <div class="weather-item"><span>Prob. of Precip.</span><strong>${forecastData.precipProb}%</strong></div>
                    <div class="weather-item"><span>Cloud Cover</span><strong>${forecastData.cloudCover}%</strong></div>`;
                break;
        }

        document.getElementById('forecast-icon').textContent = getWeatherIcon(forecastData.weatherCode);
        document.getElementById('forecast-temp').textContent = `${forecastData.temp}°`;
        document.getElementById('forecast-realfeel').textContent = `${forecastData.realFeel}°`;
        document.getElementById('forecast-realfeel-shade').textContent = `${forecastData.realFeelShade}°`;
        document.getElementById('forecast-description').textContent = wmoCodeToText(forecastData.weatherCode, view !== 'day');
        document.getElementById('forecast-grid').innerHTML = gridHtml;
    }

    // ADDED FUNCTION: Determines if any court light is on
    function getLightStatusIcon() {
        const courtLights = state.lightSettings.courts;
        for (const courtId in courtLights) {
            // Only check court lights, not general ones
            if (courtLights[courtId].isActive) {
                return { class: 'mdi-lightbulb-on', icon: 'mdi mdi-lightbulb-on' };
            }
        }
        return { class: 'mdi-lightbulb-outline', icon: 'mdi mdi-lightbulb-outline' };
    }

    // ADDED FUNCTION: Updates the icon in the Admin Settings button
    function updateLightIcon() {
        const lightButton = document.getElementById('light-management-btn');
        if (lightButton) {
            const iconData = getLightStatusIcon();
            let iconElement = lightButton.querySelector('i');
            
            // Ensure the <i> element exists and is the target for class updates
            if (!iconElement) {
                // Re-create the <i> tag if it was accidentally removed (e.g., by emoji changes)
                lightButton.innerHTML = `<i class="${iconData.icon}"></i>`;
                iconElement = lightButton.querySelector('i');
            }
            
            // This is the core update logic: remove old, add new
            if (iconElement) {
                iconElement.classList.remove('mdi-lightbulb-on', 'mdi-lightbulb-outline');
                iconElement.classList.add(iconData.class);
            }
        }
    }

    async function sendLightCommand(light, isActive) {
        if (!light.shellyDeviceId) {
            // If the light has no device ID (like Court E), skip the network call.
            console.warn(`Light ${light.label} has no configured IP address. Skipping command.`);
            return { success: true, message: 'Simulated OK: No IP configured.' };
        }
        
        // Construct the specific URL using the light's IP address
        const url = `http://${light.shellyDeviceId}/rpc`;

        // Construct the JSON RPC body
        const jsonBody = {
            id: 1, // Unique ID for the RPC call
            method: "Switch.Set",
            params: {
                id: 0, // Channel ID (assuming 0 for all lights/relays)
                on: isActive, // true or false
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                // Set a timeout for local network calls (optional, but good practice)
                signal: AbortSignal.timeout(5000), 
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonBody)
            });

            if (!response.ok) {
                throw new Error(`Shelly RPC returned status ${response.status}`);
            }
            
            const data = await response.json();
            
            // Success check: Shelly RPC returns a result object on success.
            if (data.result && data.result.id === 0) {
                return { success: true, data };
            } else if (data.error) {
                return { success: false, message: `RPC Error: ${data.error.message}` };
            }
            
            return { success: false, message: 'Shelly RPC response format unknown.' };
            
        } catch (error) {
            console.error(`Error sending light command to ${light.shellyDeviceId}:`, error);
            
            // Provide clear feedback for network issues typical of local IP access from a browser
            if (error.name === 'AbortError') {
                return { success: false, message: 'Request timed out. Device may be off or IP is incorrect.' };
            }
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
                return { success: false, message: 'Network error. Check IP address or browser security settings (e.g., mixed content).' };
            }
            return { success: false, message: error.message };
        }
    }



    // ADDED FUNCTION - This is the core logic for the light feature.
    async function handleLightToggleChange(e) {
        const button = e.target.closest('.light-toggle-btn');
        if (!button) return;

        const courtId = button.dataset.courtId;
        const light = state.lightSettings.courts[courtId];
        
        if (light) {
            // Toggle the state
            const isActive = !light.isActive;
            
            // Optimistically update UI
            light.isActive = isActive;
            const icon = button.querySelector('i');
            icon.className = `mdi ${isActive ? 'mdi-lightbulb-on' : 'mdi-lightbulb-outline'}`;
            
            // Send command
            const apiResult = await sendLightCommand(light, isActive);

            if (!apiResult.success) {
                // Revert state and UI if API call fails
                light.isActive = !isActive;
                icon.className = `mdi ${!isActive ? 'mdi-lightbulb-on' : 'mdi-lightbulb-outline'}`;
                playCustomTTS(`Error: Failed to turn light ${isActive ? 'on' : 'off'}. ${apiResult.message}`);
            } else {
                playCustomTTS(`${light.label} turned ${isActive ? 'on' : 'off'}.`);
            }
            saveState();
        }
    }


    // Now checks if stock is < 1 can to disable sign out buttons.
    function updateBallStockDisplay() {
        if (ballStockCount) {
            ballStockCount.textContent = state.ballManagement.stock;

            const isStockLow = state.ballManagement.stock < 1;
            signOutOptions.querySelectorAll('.sign-out-btn').forEach(btn => {
                btn.disabled = isStockLow;
                btn.style.opacity = isStockLow ? 0.5 : 1;
            });
        }
    }

    // NEW FUNCTION: Updates the display for single used balls
    function updateUsedBallStockDisplay() {
        if (usedBallStockCount) {
            usedBallStockCount.textContent = state.ballManagement.usedStock;
        }
    }

    // NEW FUNCTION: Initial Entry Point for Returning Used Balls
    function handleReturnUsedBalls() {
        showMemberSelectionModal('return_used');
    }

    // NEW FUNCTION: Final Confirmation for USED BALL RETURN
    function confirmUsedBallReturn() {
        const value = parseInt(keypadDisplay.textContent, 10);
        const member = customKeypadModal.dataset.member;
        hideKeypad();

        if (isNaN(value) || value <= 0) return;

        cancelConfirmModal.querySelector("h3").textContent = "Confirm Used Ball Return";
        cancelConfirmModal.querySelector("p").textContent = `Confirm returning ${value} used ball(s), signed in by ${member}?`;
        modalBtnYesConfirm.textContent = "Confirm Return";
        modalBtnNo.textContent = "Cancel";
        cancelConfirmModal.dataset.mode = "returnUsedBalls";
        cancelConfirmModal.dataset.count = value;
        cancelConfirmModal.dataset.member = member;
        cancelConfirmModal.classList.remove("hidden");
    }

    // NEW FUNCTION: Execute USED BALL RETURN
    function executeUsedBallReturn() {
        const count = parseInt(cancelConfirmModal.dataset.count, 10);
        const member = cancelConfirmModal.dataset.member;
        if (isNaN(count) || count <= 0) return;

        const stockBefore = state.ballManagement.usedStock;
        state.ballManagement.usedStock += count;
        const stockAfter = state.ballManagement.usedStock;

        state.ballManagement.history.push({
            timestamp: Date.now(), action: 'in', category: 'return_used',
            count: count, member: member, stockBefore: stockBefore, stockAfter: stockAfter
        });

        playCustomTTS(`Stock updated. Returned ${count} used balls.`);
        updateUsedBallStockDisplay();
        saveState();
        cancelConfirmModal.classList.add("hidden");
        ballManagementModal.classList.remove("hidden");
        resetConfirmModal();
    }  

    // NEW FUNCTION: Handles ball history filter changes
    function handleBallHistoryFilterChange(e) {
        state.ballManagement.historyFilter = e.target.value;
        saveState();
        renderBallHistoryModal();
    }

    function showBallManagementModal() {
        updateBallStockDisplay();
        updateUsedBallStockDisplay(); // <-- ADD THIS LINE
        adminSettingsModal.classList.add('hidden');
        ballManagementModal.classList.remove('hidden');
    }

    // --- REFACTORED WORKFLOW ---

    // 1. Initial Entry Point for Add/Return
    function handleAddStock() {
        showMemberSelectionModal('add');
    }

    function handleReturnStock() {
        showMemberSelectionModal('return');
    }

    // 2. Initial Entry Point for Sign Out
    function handleSignOut(e) {
        const button = e.target.closest('.sign-out-btn');
        if (!button) return;

        if (button.disabled) {
            playCustomTTS("Sign out requires balls. Please add stock first.");
            return;
        }

        const category = button.dataset.category;
        showMemberSelectionModal('signout', category);
    }

    // 3. Generalized Member Selection Modal
    function showMemberSelectionModal(action, category = null) {
        signOutMemberList.innerHTML = '';

        // Set modal title and prompt based on the action
        if (action === 'add') {
            signOutMemberTitle.textContent = 'Select Member Adding Stock';
            signOutMemberPrompt.textContent = 'Please select the member responsible for this stock addition.';
        } else if (action === 'return') {
            signOutMemberTitle.textContent = 'Select Member Returning Stock';
            signOutMemberPrompt.textContent = 'Please select the member responsible for this stock return.';
        } else if (action === 'return_used') { // <-- ADD THIS ENTIRE ELSE IF BLOCK
            signOutMemberTitle.textContent = 'Select Member Returning Used Balls';
            signOutMemberPrompt.textContent = 'Please select the member responsible for this used ball return.';
        } else { // signout
            signOutMemberTitle.textContent = 'Select Member Signing Out';
            signOutMemberPrompt.textContent = `Please select the member for this ${category} sign-out.`;
        }

        // Store action context in the modal
        signOutMemberModal.dataset.action = action;
        if (category) {
            signOutMemberModal.dataset.category = category;
        } else {
            delete signOutMemberModal.dataset.category;
        }

        const members = MASTER_MEMBER_LIST.filter(m => m.committee).sort((a, b) => a.name.localeCompare(b.name));

        if (members.length === 0) {
            signOutMemberList.innerHTML = '<li style="justify-content: center; color: var(--cancel-color);">No committee members found.</li>';
            return;
        }

        signOutMemberConfirmBtn.disabled = true;

        members.forEach(member => {
            const li = document.createElement('li');
            li.className = 'committee-member';
            li.dataset.player = member.name;
            li.innerHTML = `<label><input type="radio" name="signoutMember" value="${member.name}"><div class="member-details"><span class="member-name">${member.name}</span><span class="member-designation">${member.committee || 'Member'}</span></div></label>`;
            signOutMemberList.appendChild(li);
        });

        signOutMemberList.querySelectorAll('input[name="signoutMember"]').forEach(radio => {
            radio.removeEventListener('change', () => signOutMemberConfirmBtn.disabled = false);
            radio.addEventListener('change', () => signOutMemberConfirmBtn.disabled = false);
        });

        adminSettingsModal.classList.add('hidden');
        ballManagementModal.classList.add('hidden');
        signOutMemberModal.classList.remove('hidden');
    }

    // 4. Generalized Member Confirmation and Keypad Trigger
    function handleMemberSelectionConfirm() {
        const action = signOutMemberModal.dataset.action;
        const member = signOutMemberList.querySelector('input[name="signoutMember"]:checked').value;

        customKeypadModal.dataset.member = member;
        customKeypadModal.dataset.action = action;

        signOutMemberModal.classList.add('hidden');

        if (action === 'add') {
            showKeypad(null, { mode: 'addStock', maxLength: 3, title: `Cans to add for ${member}` });
        } else if (action === 'return') {
            showKeypad(null, { mode: 'returnStock', maxLength: 3, title: `Cans to return for ${member}` });
        } else if (action === 'return_used') {
            showKeypad(null, { mode: 'returnUsed', maxLength: 3, title: `Used balls to return for ${member}` });
        } else if (action === 'signout') {
            const category = signOutMemberModal.dataset.category;
            customKeypadModal.dataset.category = category;
            showKeypad(null, { mode: 'signOut', maxLength: 2, title: `Cans for ${member} (${category})` });
        }
    }

    // 5a. Final Confirmation for ADD
    function confirmBallStockUpdate() {
        const value = parseInt(keypadDisplay.textContent, 10);
        const member = customKeypadModal.dataset.member;
        hideKeypad();

        if (isNaN(value) || value <= 0) return;

        cancelConfirmModal.querySelector("h3").textContent = "Confirm Purchase";
        cancelConfirmModal.querySelector("p").textContent = `Confirm adding ${value} new cans, signed in by ${member}?`;
        modalBtnYesConfirm.textContent = "Confirm Add";
        modalBtnNo.textContent = "Cancel";
        cancelConfirmModal.dataset.mode = "addBallStock";
        cancelConfirmModal.dataset.count = value;
        cancelConfirmModal.dataset.member = member;
        cancelConfirmModal.classList.remove("hidden");
    }

    // 5b. Final Confirmation for RETURN
    function confirmBallStockReturn() {
        const value = parseInt(keypadDisplay.textContent, 10);
        const member = customKeypadModal.dataset.member;
        hideKeypad();

        if (isNaN(value) || value <= 0) return;

        cancelConfirmModal.querySelector("h3").textContent = "Confirm Return";
        cancelConfirmModal.querySelector("p").textContent = `Confirm returning ${value} can(s), signed in by ${member}?`;
        modalBtnYesConfirm.textContent = "Confirm Return";
        modalBtnNo.textContent = "Cancel";
        cancelConfirmModal.dataset.mode = "returnBallStock";
        cancelConfirmModal.dataset.count = value;
        cancelConfirmModal.dataset.member = member;
        cancelConfirmModal.classList.remove("hidden");
    }

    // 5c. Final Confirmation for SIGN OUT
    function confirmSignOutQuantity() {
        const cansToSignOut = parseInt(keypadDisplay.textContent, 10);
        const category = customKeypadModal.dataset.category;
        const member = customKeypadModal.dataset.member;
        hideKeypad();

        if (isNaN(cansToSignOut) || cansToSignOut <= 0 || cansToSignOut > state.ballManagement.stock) {
            playCustomTTS("Sign out failed. Invalid quantity or insufficient stock.");
            return;
        }

        cancelConfirmModal.querySelector("h3").textContent = `Confirm Sign Out: ${category}`;
        cancelConfirmModal.querySelector("p").textContent = `Confirm signing out ${cansToSignOut} can(s) for ${category}, by ${member}?`;
        modalBtnYesConfirm.textContent = "Confirm Sign Out";
        modalBtnNo.textContent = "Cancel";
        cancelConfirmModal.dataset.mode = "signOutBalls";
        cancelConfirmModal.dataset.category = category;
        cancelConfirmModal.dataset.count = cansToSignOut;
        cancelConfirmModal.dataset.member = member;
        cancelConfirmModal.classList.remove("hidden");
    }

    // 6a. Execute ADD
    function executeAddBallStock() {
        const count = parseInt(cancelConfirmModal.dataset.count, 10);
        const member = cancelConfirmModal.dataset.member;
        if (isNaN(count) || count <= 0) return;

        const stockBefore = state.ballManagement.stock;
        state.ballManagement.stock += count;
        const stockAfter = state.ballManagement.stock;

        state.ballManagement.history.push({
            timestamp: Date.now(), action: 'in', category: 'purchase',
            count: count, member: member, stockBefore: stockBefore, stockAfter: stockAfter
        });

        playCustomTTS(`Stock updated. Added ${count} cans.`);
        updateBallStockDisplay();
        saveState();
        cancelConfirmModal.classList.add("hidden");
        ballManagementModal.classList.remove("hidden");
        resetConfirmModal(); // ADD THIS LINE
    }

    // 6b. Execute RETURN
    function executeReturnBallStock() {
        const count = parseInt(cancelConfirmModal.dataset.count, 10);
        const member = cancelConfirmModal.dataset.member;
        if (isNaN(count) || count <= 0) return;

        const stockBefore = state.ballManagement.stock;
        state.ballManagement.stock += count;
        const stockAfter = state.ballManagement.stock;

        state.ballManagement.history.push({
            timestamp: Date.now(), action: 'in', category: 'return',
            count: count, member: member, stockBefore: stockBefore, stockAfter: stockAfter
        });

        playCustomTTS(`Stock updated. Returned ${count} cans.`);
        updateBallStockDisplay();
        saveState();
        cancelConfirmModal.classList.add("hidden");
        ballManagementModal.classList.remove("hidden");
        resetConfirmModal(); // ADD THIS LINE
    }

    // 6c. Execute SIGN OUT
    function executeSignOutBalls() {
        const cansCount = parseInt(cancelConfirmModal.dataset.count, 10);
        const category = cancelConfirmModal.dataset.category;
        const member = cancelConfirmModal.dataset.member;

        if (isNaN(cansCount) || state.ballManagement.stock < cansCount) {
            playCustomTTS("Sign out failed. Insufficient stock.");
            return;
        }

        const stockBefore = state.ballManagement.stock;
        state.ballManagement.stock -= cansCount;
        const stockAfter = state.ballManagement.stock;

        state.ballManagement.history.push({
            timestamp: Date.now(), action: 'out', category: category,
            count: cansCount, member: member, stockBefore: stockBefore, stockAfter: stockAfter
        });

        playCustomTTS(`Signed out ${cansCount} cans for ${category}, by ${member}.`);
        updateBallStockDisplay();
        saveState();
        cancelConfirmModal.classList.add("hidden");
        ballManagementModal.classList.remove("hidden");
        resetConfirmModal(); // ADD THIS LINE
    }

    //function executeSignOutBalls() {
    //    const cansCount = parseInt(cancelConfirmModal.dataset.count, 10);
    //    const category = cancelConfirmModal.dataset.category;
    //    const member = cancelConfirmModal.dataset.member;
//
//        if (isNaN(cansCount) || state.ballManagement.stock < cansCount) {
//            playCustomTTS("Sign out failed. Insufficient stock.");
//            return;
//        }

//        const stockBefore = state.ballManagement.stock;
 //       state.ballManagement.stock -= cansCount; // Deduct CANS
 //       const stockAfter = state.ballManagement.stock;
 //       state.ballManagement.history.push({
 //           timestamp: Date.now(),
 //           action: 'out',
 //           category: category,
 //           count: cansCount,
 //           member: member, // Log the signing member
 //           stockBefore: stockBefore,
 //           stockAfter: stockAfter
 //       });
        
 //       playCustomTTS(`Signed out ${cansCount} cans for ${category}, signed out by ${member}.`);
 //       updateBallStockDisplay();
 //       saveState();
 //       cancelConfirmModal.classList.add("hidden");
 //       ballManagementModal.classList.remove("hidden"); // Return to ball modal
 //   }
    
    function handleReturnStock() {
        showKeypad(null, { 
            mode: 'return', 
            maxLength: 3, 
            title: 'Enter cans to return' 
        });
        keypadConfirmBtn.removeEventListener('click', confirmBallStockReturn);
        keypadConfirmBtn.addEventListener('click', confirmBallStockReturn);
    }


    function confirmBallStockReturn() {
        const value = parseInt(keypadDisplay.textContent, 10);
        hideKeypad();

        if (isNaN(value) || value <= 0) return;

        cancelConfirmModal.querySelector("h3").textContent = "Confirm Return";
        cancelConfirmModal.querySelector("p").textContent = 
            `Confirm returning ${value} can(s) of balls to stock?`;
        modalBtnYesConfirm.textContent = "Confirm Return";
        modalBtnNo.textContent = "Cancel";
        cancelConfirmModal.dataset.mode = "returnBallStock";
        cancelConfirmModal.dataset.count = value;
        cancelConfirmModal.classList.remove("hidden");
    }

    function executeReturnBallStock() {
        const count = parseInt(cancelConfirmModal.dataset.count, 10);
        if (isNaN(count) || count <= 0) return;

        const stockBefore = state.ballManagement.stock;
        state.ballManagement.stock += count; // Add CANS back to stock
        const stockAfter = state.ballManagement.stock;
        state.ballManagement.history.push({
            timestamp: Date.now(),
            action: 'in',
            category: 'return',
            count: count,
            stockBefore: stockBefore,
            stockAfter: stockAfter
        });

        playCustomTTS(`Stock updated. Returned ${count} cans.`);
        updateBallStockDisplay();
        saveState();
        cancelConfirmModal.classList.add("hidden");
        ballManagementModal.classList.remove("hidden"); // Return to ball modal
    }

    function renderBallHistoryModal() {
        ballHistoryList.innerHTML = ''; // Clear previous content

        const filter = state.ballManagement.historyFilter;

        // 1. Create the HTML for the filter radio buttons
        const filterHTML = `
            <div class="gender-selector" style="justify-content: center; margin-bottom: 1rem;">
                <div class="radio-group">
                    <label> <input type="radio" name="ball-history-filter" value="all" ${filter === 'all' ? 'checked' : ''}> All </label>
                    <label> <input type="radio" name="ball-history-filter" value="new" ${filter === 'new' ? 'checked' : ''}> New </label>
                    <label> <input type="radio" name="ball-history-filter" value="used" ${filter === 'used' ? 'checked' : ''}> Used </label>
                </div>
            </div>
        `;

        // 2. Filter the history based on the current state
        const filteredHistory = state.ballManagement.history.filter(entry => {
            if (filter === 'all') return true;
            const isUsed = entry.category === 'return_used';
            if (filter === 'used') return isUsed;
            if (filter === 'new') return !isUsed;
            return true;
        });

        if (filteredHistory.length === 0) {
            ballHistoryList.innerHTML = filterHTML + '<p style="text-align: center; color: #6c757d;">No transactions match the selected filter.</p>';
        } else {
            // 3. Build the rest of the list using the filtered data
            const headerHTML = `
                <div class="history-item" style="border-bottom: 2px solid var(--primary-blue); font-weight: bold; background-color: #f8f9fa;">
                    <div class="ball-history-details">
                        <span>Date & Time</span>
                        <span>Committee Member</span>
                        <span class="numeric">Before</span>
                        <span class="numeric">Change</span>
                        <span class="numeric">After</span>
                    </div>
                </div>
            `;

            const historyItemsHTML = [...filteredHistory].reverse().map(entry => {
                const dateTime = new Date(entry.timestamp).toLocaleString('en-ZA');
                const memberName = entry.member || 'N/A';
                const change = entry.action === 'in' ? `+${entry.count}` : `-${entry.count}`;
                const changeClass = entry.action === 'in' ? 'stock-in' : 'stock-out';
                const isUsedBalls = entry.category === 'return_used';
                const stockClass = isUsedBalls ? 'stock-used' : 'stock-new';

                return `
                    <div class="history-item">
                        <div class="ball-history-details">
                            <span class="timestamp">${dateTime}</span>
                            <span>${memberName}</span>
                            <span class="numeric ${stockClass}" data-label="Before">${entry.stockBefore}</span>
                            <span class="numeric ${changeClass}" data-label="Change">${change}</span>
                            <span class="numeric ${stockClass}" data-label="After">${entry.stockAfter}</span>
                        </div>
                    </div>
                `;
            }).join('');

            ballHistoryList.innerHTML = filterHTML + headerHTML + historyItemsHTML;
        }

        // 4. Attach event listeners to the new radio buttons
        ballHistoryList.querySelectorAll('input[name="ball-history-filter"]').forEach(radio => {
            radio.addEventListener('change', handleBallHistoryFilterChange);
        });
    }

    function showBallHistoryModal() {
        renderBallHistoryModal();
        ballManagementModal.classList.add('hidden');
        ballHistoryModal.classList.remove('hidden');
    }


    function populateAbcIndex(playerList, listElement, indexElement) {
        const firstLetters = [...new Set(playerList.map(player => player.name[0].toUpperCase()))].sort();
        indexElement.innerHTML = '';

        const scrollHandler = () => {
            updateActiveIndexLetter(listElement, indexElement);
        };

        if (listElement._scrollHandler) {
            listElement.removeEventListener('scroll', listElement._scrollHandler);
        }

        listElement.addEventListener('scroll', scrollHandler);
        listElement._scrollHandler = scrollHandler;

        firstLetters.forEach(letter => {
            const letterDiv = document.createElement('div');
            letterDiv.textContent = letter;
            letterDiv.addEventListener('click', () => {
                listElement.removeEventListener('scroll', listElement._scrollHandler);

                const allLetters = indexElement.querySelectorAll('div');
                allLetters.forEach(el => el.classList.remove('active'));
                letterDiv.classList.add('active');

                const playerToShow = listElement.querySelector(`[data-player-name^="${letter}"], [data-player-name^="${letter.toLowerCase()}"]`);
                if (playerToShow) {
                    playerToShow.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                setTimeout(() => {
                    listElement.addEventListener('scroll', listElement._scrollHandler);
                }, 500);
            });
            indexElement.appendChild(letterDiv);
        });
    }

    function updateActiveIndexLetter(listElement, indexElement) {
        if (!listElement || !indexElement) return;

        const listTop = listElement.getBoundingClientRect().top;
        const listItems = Array.from(listElement.querySelectorAll('li[data-player-name]'));
        let activeLetter = '';

        const topItem = listItems.find(item => item.getBoundingClientRect().top >= listTop);

        if (topItem) {
            activeLetter = topItem.dataset.playerName[0].toUpperCase();
        } else if (listItems.length > 0) {
            activeLetter = listItems[listItems.length - 1].dataset.playerName[0].toUpperCase();
        }

        const indexLetters = indexElement.querySelectorAll('div');
        indexLetters.forEach(letterDiv => {
            letterDiv.classList.toggle('active', letterDiv.textContent === activeLetter);
        });
    }

    function setupListWithIndex(playerList, listElement, indexElement) {
        populateAbcIndex(playerList, listElement, indexElement);

        if (listElement._scrollHandler) {
            listElement.removeEventListener('scroll', listElement._scrollHandler);
        }

        listElement._scrollHandler = () => updateActiveIndexLetter(listElement, indexElement);

        listElement.addEventListener('scroll', listElement._scrollHandler);

        setTimeout(() => updateActiveIndexLetter(listElement, indexElement), 50);


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
            const selectionComplete = playersSelected === requiredPlayers;

            const isCollapsed = court.isCollapsed;
            const isModeOverlayActive = court.isModeOverlayActive === true;
            const courtMode = court.courtMode || 'doubles';
            const bodyClass = isCollapsed ? 'is-collapsed' : '';
            const iconClass = isCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up';

            // --- CORE LOGIC FOR RESERVED / SELECTABLE STATES ---
            let isReservedSelectable = false;
            let isGreenBallSelectable = false;

            // Selection logic only runs if enough players are selected to potentially start *a game* (2 players).
            if (court.status === 'available' && playersSelected >= 2) {

                // CRITERIA FOR RED BALL (Reserved/Exclusionary)
                if (courtMode === 'league' && selectionComplete) {
                    isReservedSelectable = true;
                }
                // Singles court reserved if 4 players selected (incompatible with singles court)
                else if (courtMode === 'singles' && playersSelected === 4) {
                    isReservedSelectable = true;
                }
                // NEW CRITERIA: Block Doubles/League courts when Singles is selected (requiredPlayers = 2)
                else if (requiredPlayers === 2 && (courtMode === 'doubles' || courtMode === 'league')) {
                    isReservedSelectable = true;
                }

                // CRITERIA FOR GREEN BALL (Selectable for Play)
                // FIX: Only allow selection if 'selectionComplete' is true, and then check compatibility.
                if (!isReservedSelectable && selectionComplete) {
                    if (requiredPlayers === 2) {
                        // User selected 2 players (Singles Mode)
                        if (courtMode === 'singles' || courtMode === 'rookie') {
                            isGreenBallSelectable = true;
                        }
                    } else if (requiredPlayers === 4) {
                        // User selected 4 players (Doubles Mode)
                        if (courtMode === 'doubles' || courtMode === 'rookie') {
                            isGreenBallSelectable = true;
                        }
                    }
                }
            }

            // Final check for the 'selectable' class on the card (applies to both colors)
            const isSelectable = isGreenBallSelectable || isReservedSelectable;

            // FIX: Only apply the 'selectable' class if the selection is active AND at least 2 players are selected.
            // This prevents any shading effect from activating when only 1 player is selected.
            const selectionMinimumMet = playersSelected >= 2;
            const finalIsSelectable = selectionMinimumMet && isSelectable;

            // Class to mark the card itself as reserved only
            const reservedClass = isReservedSelectable && !isGreenBallSelectable ? 'is-reserved-only' : '';

            const isSelected = court.id === state.selection.courtId;

            // --- UPDATED STATUS TEXT AND CLASS LOGIC ---
            let statusText;
            let isLeagueReserved = false;
            let isRookieMode = courtMode === 'rookie'; // Flag for Rookie mode

            if (isSelected) {
                statusText = 'SELECTED';
            } else if (court.status === 'available' && courtMode === 'league') {
                statusText = 'League';
                isLeagueReserved = true;
            } else if (court.status === 'available' && isRookieMode) { // Status text for available Rookie court
                statusText = 'Rookie';
            } else {
                statusText = court.status.replace(/_/g, ' ');
            }

            const courtCard = document.createElement('div');

            // --- START OF FIX ---
            // Only apply special mode classes if the court is available.
            // If a game is in progress, no special mode class should be added.
            let modeClass = '';
            if (court.status === 'available') {
                if (isLeagueReserved) {
                    modeClass = 'is-league-reserved';
                } else if (isRookieMode) {
                    modeClass = 'is-rookie-mode';
                }
            }
            // --- END OF FIX ---

            courtCard.className = `court-card status-${court.status} ${isSelected ? 'selected' : ''} ${finalIsSelectable ? 'selectable' : ''} ${bodyClass} ${reservedClass} ${modeClass}`;
            
            courtCard.dataset.courtId = court.id;
            if (isModeOverlayActive) {
                courtCard.dataset.modeOverlayActive = 'true';
            }

            let cancelBtnHTML = '';
            let editBtnHTML = '';

            if (court.status !== 'available' && !isSelected) {
                cancelBtnHTML = `<button class="cancel-game-btn on-court" title="Cancel Game" data-action="cancel-game-setup">X</button>`;
            }

            if (court.status === 'in_progress') {
                editBtnHTML = `<button class="edit-game-btn on-court" title="Edit Players" data-action="edit-game"><i class="mdi mdi-pencil"></i></button>`;
            }

            const moreOptionsBtnHTML = `
                <button class="more-options-btn on-court bottom-left-btn" title="More Options" data-action="more-options" data-court-id="${court.id}">
                    <i class="mdi mdi-dots-horizontal"></i>
                </button>
            `;

            const modeOverlayHTML = `
                <div class="mode-selection-overlay" data-court-id="${court.id}">
                    <button class="mode-btn-overlay doubles-mode" data-action="set-court-mode" data-mode="doubles">Doubles</button>
                    <button class="mode-btn-overlay singles-mode" data-action="set-court-mode" data-mode="singles">Singles</button>
                    <button class="mode-btn-overlay beginner-mode" data-action="set-court-mode" data-mode="rookie">Rookie</button>
                    <button class="mode-btn-overlay league-mode" data-action="set-court-mode" data-mode="league">League</button>
                </div>
            `;

            // --- ANIMATION DELAY LOGIC (Dynamic Offset for Continuous Play) ---
            const COURT_HIERARCHY = ['B', 'C', 'D', 'A', 'E']; // Assuming this is the order
            const courtIndex = COURT_HIERARCHY.indexOf(court.id);
            const staticStaggerMs = courtIndex >= 0 ? courtIndex * 500 : 0;

            // Base animation duration is 4s (4000ms). Double for Rookie mode.
            let animationDurationMs = 4000;
            if (courtMode === 'rookie') {
                animationDurationMs = 8000; // DOUBLE DURATION FOR ROOKIE MODE
            }

            // Calculate how far into the cycle we should be
            const elapsedTime = Date.now() - state.pongAnimationOffset;
            const currentOffsetMs = (elapsedTime + staticStaggerMs) % animationDurationMs;

            // Use a negative delay to force the animation to start at the correct mid-cycle point
            const delayStyle = `animation-delay: -${(currentOffsetMs / 1000).toFixed(3)}s;`;

            // --- Singles Pong Animation HTML Structure ---
            const pongAnimationSinglesHTML = `
                <div class="pong-animation-container" data-mode="singles">
                    <div class="pong-paddle top-paddle" style="${delayStyle}"></div>
                    <div class="pong-paddle bottom-paddle" style="${delayStyle}"></div>
                    <div class="pong-ball" style="${delayStyle}"></div>
                </div>
            `;

            // --- Doubles Pong Animation HTML Structure (Applying unique vertical keyframes) ---
            const pongAnimationDoublesHTML = `
                <div class="pong-animation-container" data-mode="doubles">
                    <div class="pong-paddle double dl top-paddle" style="animation-name: pong-move-tl; ${delayStyle}"></div>
                    <div class="pong-paddle double dr top-paddle" style="animation-name: pong-move-tr; ${delayStyle}"></div>
                    <div class="pong-paddle double dl bottom-paddle" style="animation-name: pong-move-bl; ${delayStyle}"></div>
                    <div class="pong-paddle double dr bottom-paddle" style="animation-name: pong-move-br; ${delayStyle}"></div>
                    <div class="pong-ball" style="${delayStyle}"></div>
                </div>
            `;

            // --- Red Ball Animation HTML Structure (Only the Ball for in_progress) ---
            const pongAnimationRedBallHTML = `
                <div class="pong-animation-container" data-mode="in_progress">
                    <div class="pong-ball red-ball-in-progress" style="${delayStyle}"></div>
                </div>
            `;

            let bodyTimerHTML = '';
            if (court.status === 'in_progress' || court.status === 'game_pending') {
                bodyTimerHTML = `<div class="court-body-timer status-${court.status}" id="timer-${court.id}"></div>`;
            }

            const formatName = (playerObj) => playerObj ? playerObj.name.split(' ').join('<br>') : '';

            let playerSpotsHTML = '';
            let coreReserveTextHTML = '';
            let animationHTML = '';

            // Logic for player names (when status is NOT available)
            if (court.status !== 'available') {
                if (court.gameMode === 'singles') {
                    playerSpotsHTML = `
                        <div class="player-spot single-player top-row"><span>${formatName(court.teams.team1[0])}</span></div>
                        <div class="player-spot single-player bottom-row"><span>${formatName(court.teams.team2[0])}</span></div>
                    `;
                } else {
                    // Doubles/Rookie/League
                    if (court.teamsSet === false) {
                        // Teams not set: Show player names from the general player list
                        playerSpotsHTML = `
                            <div class="player-spot top-row" data-player-pos="top-left"><span>${formatName(court.players[0])}</span></div>
                            <div class="player-spot top-row" data-player-pos="top-right"><span>${formatName(court.players[1])}</span></div>
                            <div class="player-spot bottom-row" data-player-pos="bottom-left"><span>${formatName(court.players[2])}</span></div>
                            <div class="player-spot bottom-row" data-player-pos="bottom-right"><span>${formatName(court.players[3])}</span></div>
                        `;
                    } else {
                        // Teams ARE set: Show player names from the teams list
                        playerSpotsHTML = `
                            <div class="player-spot top-row" data-player-pos="top-left"><span>${formatName(court.teams.team1[0])}</span></div>
                            <div class="player-spot top-row" data-player-pos="top-right"><span>${formatName(court.teams.team1[1])}</span></div>
                            <div class="player-spot bottom-row" data-player-pos="bottom-left"><span>${formatName(court.teams.team2[0])}</span></div>
                            <div class="player-spot bottom-row" data-player-pos="bottom-right"><span>${formatName(court.teams.team2[1])}</span></div>
                        `;
                    }
                }

                // Generate the "Set Teams" button if teams are NOT set and status is not 'available'
                if (court.teamsSet === false) {
                    coreReserveTextHTML = `<div class="teams-not-set" data-action="choose-teams">Set Teams</div>`;
                }

                // Add the red ball animation alongside the player spots for in_progress
                if (court.status === 'in_progress') {
                    animationHTML = pongAnimationRedBallHTML;
                }
            }

            let overlayHTML = '';

            if (isSelected) {
                const readyClass = selectionComplete ? 'is-ready' : '';
                overlayHTML = `
                    <div class="confirmation-overlay">
                        <button class="court-confirm-btn cancel" data-action="cancel-selection">Cancel</button>
                        <button class="court-confirm-btn confirm ${readyClass}" data-action="confirm-selection">Confirm</button>
                    </div>
                `;
            } else if (finalIsSelectable) {

                const ballClass = isReservedSelectable ? 'reserved-ball' : '';
                const isEligibleForSelection = isGreenBallSelectable ? '' : 'data-reserved-only="true"';

                // Disable the button if it's the reserved (red) ball OR if it's the permanent league reserved court
                const disabledAttr = isReservedSelectable || isLeagueReserved ? 'disabled' : '';

                // Text content of the button is empty if it's a reserved ball
                const buttonText = isReservedSelectable || isLeagueReserved ? '' : `SELECT<br>COURT ${court.id}`;

                overlayHTML = `
                    <div class="court-selection-overlay">
                        <button class="court-confirm-btn select-court ${ballClass}" data-action="select-court-action" ${isEligibleForSelection} ${disabledAttr}>${buttonText}</button>
                    </div>
                `;
            }
            else if (court.status === 'selecting_teams') {
                overlayHTML = `
                    <div class="team-selection-overlay">
                        <button class="court-confirm-btn randomize" data-action="randomize-teams">Randomize Teams</button>
                        <button class="court-confirm-btn choose" data-action="choose-teams">Choose Teams</button>
                        <button class="court-confirm-btn choose-later" data-action="choose-later">Choose Later</button>
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

            let reserveTextHTML = coreReserveTextHTML;

            // FINAL LOGIC: Overwrite the team status text if the court is AVAILABLE (Reserved For X).
            if (court.status === 'available') {
                // Remove the 'Reserved For X' text as visual cues are now used.
                reserveTextHTML = '';

                // 🟢 ANIMATION LOGIC: Show appropriate animation based on court mode
                if (courtMode === 'league') {
                    // If permanently reserved for League, add the static reserved icon
                    playerSpotsHTML = `<div class="league-reserved-icon-container"></div>`;
                } else if (courtMode === 'singles') {
                    playerSpotsHTML = pongAnimationSinglesHTML;
                } else if (courtMode === 'doubles' || courtMode === 'rookie') { // Doubles and Rookie get the Doubles animation
                    playerSpotsHTML = pongAnimationDoublesHTML;
                } else {
                    // For other AVAILABLE modes (e.g., if one was added), player spots are empty
                    playerSpotsHTML = '';
                }
            }

            courtCard.innerHTML = `
                <div class="card-header header-status-${court.status}">
                    <h3>Court ${court.id}</h3>
                    <div class="header-controls">
                        <span class="status-tag">${statusText}</span>
                        <button class="settings-btn summary-toggle-btn" data-court-id="${court.id}" data-card-type="court" title="Toggle Details">
                            <i class="mdi ${iconClass}"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="court-inner">
                        ${bodyTimerHTML}
                        <div class="center-service-line"></div>
                        ${playerSpotsHTML}
                        ${animationHTML}
                        ${overlayHTML}
                        ${reserveTextHTML}
                        ${modeOverlayHTML}
                    </div>
                    ${cancelBtnHTML}
                    ${editBtnHTML}
                    ${moreOptionsBtnHTML}
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
        
        // --- START OF FIX ---
        // Dynamically set the label based on whether someone is on duty.
        const dutyLabel = state.onDuty === 'None' ? 'Call Any Committee Member!' : 'Is On Duty. Call Me!';
        // --- END OF FIX ---

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
                                <p class="duty-label">${dutyLabel}</p>
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

    // --- NEW HELPER FUNCTION ---
    function getLastCheckInForChild(childFullName) {
        let latestCheckIn = 0;
        
        // Iterate through all history entries
        state.juniorClub.history.forEach(historyEntry => {
            // Check if the child attended this session (childFullName is in the childNames array)
            if (historyEntry.childNames && historyEntry.childNames.includes(childFullName)) {
                // The historyEntry.id is the timestamp of the session check-in
                if (historyEntry.id > latestCheckIn) {
                    latestCheckIn = historyEntry.id;
                }
            }
        });
        
        return latestCheckIn; // Returns 0 if no history found
    }   

    // --- NEW HELPER FUNCTION ---
    function getLastCheckInForChild(childFullName) {
        let latestCheckIn = 0;
        
        // Iterate through all history entries
        state.juniorClub.history.forEach(historyEntry => {
            // FIX 1: Trim the lookup key (childFullName) before checking inclusion.
            if (historyEntry.childNames && historyEntry.childNames.includes(childFullName.trim())) {
                // The historyEntry.id is the timestamp of the session check-in
                if (historyEntry.id > latestCheckIn) {
                    latestCheckIn = historyEntry.id;
                }
            }
        });
        
        return latestCheckIn; // Returns 0 if no history found
    }

    // --- ADDED HELPER FUNCTION ---
    function createPlayerListItem(player, index, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, isSpecialCase = false, sliceEnd = 8, specialHighlightIndex = -1, isSelector = false, inGroup = false) {
        const li = document.createElement("li");
        const playerName = player.name;
        
        // --- THIS IS THE UPDATED LOGIC BLOCK ---
        let statusText;
        if (player.guest) {
            statusText = 'Guest';
        } else if (player.committee) {
            // This is the new line for committee members
            statusText = `Committee ${player.committee}`;
        } else {
            // This is the change for regular members
            statusText = player.type ? `${player.type} Member` : 'Member';
        }
        // --- END OF UPDATED LOGIC ---

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

        if (player.isPaused) {
            li.classList.add("paused-player");
        }
        
        const isSelected = selectedPlayerNames.includes(playerName);
        if (isSelected) {
            li.classList.add("selected");
        } else {
            const isSelectionFull = selectedPlayerNames.length === requiredPlayers;
            let isDisabled = false;

            if (isSpecialCase) {
                if (index >= sliceEnd) {
                    isDisabled = true;
                }
            } else {
                if (index >= sliceEnd) { 
                    isDisabled = true;
                }
            }

            if (player.isPaused) {
                isDisabled = true;
            }
            
            if (index === specialHighlightIndex) {
                isDisabled = false; 
            }
            
            if (isSelectionFull || isDisabled) {
                li.classList.add("disabled");
            }
        }
        
        if (isSelector) {
            li.classList.add("first-player");
        } 
        
        if (index === 0) { 
            li.classList.add("first-player");
        }
        
        if (!isSelector) {
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

    function render() {
        const {
            gameMode,
            players: selectedPlayerNames,
            courtId: selectedCourtId
        } = state.selection;
        const requiredPlayers = gameMode === "doubles" ? 4 : 2;
        const playerStats = calculatePlayerPlaytime();
        const starPlayers = calculateStarPlayers();

        availablePlayersList.innerHTML = "";

        let sliceStart = 0;
        let selectorPlayer = state.availablePlayers[0];

        if (selectorPlayer && selectorPlayer.isPaused) {
            const firstUnpausedIndex = state.availablePlayers.findIndex(p => !p.isPaused);
            if (firstUnpausedIndex !== -1) {
                sliceStart = firstUnpausedIndex;
                selectorPlayer = state.availablePlayers[firstUnpausedIndex];
            } else {
                selectorPlayer = null;
            }
        }

        const renderQueue = state.availablePlayers;

        if (renderQueue.length === 0 && selectedPlayerNames.length === 0) {
            const li = document.createElement("li");
            li.className = "waiting-message";
            li.textContent = totalPlayersAtClub() > 0 ? "All players are on court." : "Waiting For Players To Check In...";
            availablePlayersList.appendChild(li);
        } else {
            // --- CORE LOGIC: REWRITTEN FOR CORRECT GENDER BALANCING ---
            let isSpecialCase = false;
            let specialHighlightIndex = -1;
            let nextPlayerSliceEnd = renderQueue.length;
            const selectableGroupBaseSize = 7;

            if (selectorPlayer && (renderQueue.length - sliceStart - 1) >= selectableGroupBaseSize) {
                const selectorGender = selectorPlayer.gender;
                
                const playersAfterSelector = renderQueue.slice(sliceStart + 1);
                const availableInSelectableRange = playersAfterSelector.filter(p => !p.isPaused).slice(0, selectableGroupBaseSize);
                
                // This is the fix: Check for players of the SAME gender as the selector.
                const sameGenderCountInRange = availableInSelectableRange.filter(p => p.gender === selectorGender).length;

                const seventhAvailablePlayer = availableInSelectableRange[selectableGroupBaseSize - 1];
                const endOfRangeIndex = renderQueue.findIndex(p => p.name === seventhAvailablePlayer.name);

                // Case 1: TOTAL imbalance (0 players of selector's gender in the next 7)
                if (sameGenderCountInRange === 0) {
                    nextPlayerSliceEnd = endOfRangeIndex; // Shorten the orange box
                    isSpecialCase = true;

                    const searchPool = renderQueue.slice(endOfRangeIndex);
                    const foundPlayerIndexInPool = searchPool.findIndex(p => p.gender === selectorGender && !p.isPaused);
                    if (foundPlayerIndexInPool !== -1) {
                        specialHighlightIndex = endOfRangeIndex + foundPlayerIndexInPool;
                    } else { // No one found, revert to normal
                        nextPlayerSliceEnd = endOfRangeIndex + 1;
                        isSpecialCase = false;
                    }
                }
                // Case 2: SCARCE imbalance (exactly 1 player of selector's gender in the next 7)
                else if (sameGenderCountInRange === 1) {
                    nextPlayerSliceEnd = endOfRangeIndex + 1; // Do NOT shorten the orange box
                    isSpecialCase = true;

                    const searchPool = renderQueue.slice(nextPlayerSliceEnd);
                    const foundPlayerIndexInPool = searchPool.findIndex(p => p.gender === selectorGender && !p.isPaused);
                    if (foundPlayerIndexInPool !== -1) {
                        specialHighlightIndex = nextPlayerSliceEnd + foundPlayerIndexInPool;
                    } else { // No one else found, revert to normal
                        isSpecialCase = false;
                    }
                }
                // Default Case: Balanced (2 or more players of selector's gender)
                else {
                    nextPlayerSliceEnd = endOfRangeIndex + 1;
                }
            }
            // --- END OF REWRITTEN LOGIC ---

            if (renderQueue.length > 0) {
                const playersBeforeSelector = renderQueue.slice(0, sliceStart);
                playersBeforeSelector.forEach((player, index) => {
                    const li = createPlayerListItem(player, index, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, isSpecialCase, nextPlayerSliceEnd, specialHighlightIndex, false, false);
                    availablePlayersList.appendChild(li);
                });

                if (selectorPlayer) {
                    const selectorIndex = sliceStart;
                    const liSelector = createPlayerListItem(selectorPlayer, selectorIndex, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, isSpecialCase, nextPlayerSliceEnd, specialHighlightIndex, true, false);
                    availablePlayersList.appendChild(liSelector);
                }

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

                const playersAfterOrangeGroup = renderQueue.slice(nextPlayerSliceEnd);
                playersAfterOrangeGroup.forEach((player, index) => {
                    const playerIndex = nextPlayerSliceEnd + index;
                    const playerLi = createPlayerListItem(player, playerIndex, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, isSpecialCase, nextPlayerSliceEnd, specialHighlightIndex, false, false);

                    if (playerIndex === specialHighlightIndex) {
                        const groupDiv = document.createElement('div');
                        groupDiv.className = 'next-players-group';
                        groupDiv.appendChild(playerLi);
                        availablePlayersList.appendChild(groupDiv);
                    } else {
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
        const firstAvailablePlayer = selectorPlayer ? selectorPlayer.name : null;
        const remainingToSelect = requiredPlayers - selectedPlayerNames.length;
        const allCourtsBusy = state.courts.filter(c => state.courtSettings.visibleCourts.includes(c.id)).every(c => c.status !== "available");

        infoBar.classList.remove("blue-theme", "green-theme", "yellow-theme", "red-theme", "hidden");

        if (courtInSetup) {
            infoBar.classList.remove("hidden");
            infoBar.classList.add("yellow-theme");
            infoBarText.textContent = `Court ${courtInSetup.id}: Choose how to form teams on the court card.`;
        } else if (renderQueue.length === 0 && totalPlayersAtClub() > 0) {
            infoBar.classList.remove("hidden");
            infoBar.classList.add("blue-theme");
            infoBarText.textContent = "All Players are on Court...";
        } else if (selectedPlayerNames.length === 0 && totalPlayersAtClub() < 2) {
            infoBar.classList.remove("hidden");
            infoBar.classList.add("red-theme");
            infoBarText.textContent = "Waiting For Players To Check In...";
        } else if (selectedPlayerNames.length === 0 && allCourtsBusy) {
            infoBar.classList.remove("hidden");
            infoBar.classList.add("red-theme");
            infoBarText.textContent = "Please wait for a court to become available.";
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

    // This function needs to be added to public/script.js (around line 1400, near other handlers)
    function handleModeOptionsClick(courtId) {
        // If an admin session is not active, trigger the login process.
        if (!adminSessionActive) {
            // Store the action to be performed after a successful login.
            keypadConfig.afterSuccess = () => handleModeOptionsClick(courtId);
            handleAdminLogin();
            return; // Stop execution until login is successful
        }

        // If the session is active, proceed with the original logic.
        const court = state.courts.find(c => c.id === courtId);
        if (court) {
            court.isModeOverlayActive = !court.isModeOverlayActive;
            if (court.isModeOverlayActive) {
                state.courts.forEach(c => {
                    if (c.id !== courtId) c.isModeOverlayActive = false;
                });
            }
            render();
            saveState();
        }
    }



    // NEW FUNCTION: Sets the court mode and closes the mode overlay
    function handleSetCourtMode(courtId, newMode) {
        const court = state.courts.find(c => c.id === courtId);
        if (court) {
            court.courtMode = newMode;
            court.isModeOverlayActive = false; // Always close the overlay after selection

            // Preserve the existing player selection and re-render the court grid.
            render();
            saveState();

            // CRITICAL FIX: After the render cycle, use requestAnimationFrame
            // to guarantee that the animation is restored to all now-selectable courts.
            requestAnimationFrame(ensureCourtSelectionAnimation);
        }
    }

    function handleCourtGridClick(e){
        const courtCard = e.target.closest(".court-card");
        if (!courtCard) return;

        // Find the closest element with a data-action, not just the direct click target.
        const actionTarget = e.target.closest('[data-action]');
        const action = actionTarget ? actionTarget.dataset.action : null;
        
        const courtId = courtCard.dataset.courtId;

        const teamsNotSet = e.target.closest(".teams-not-set");
        if (teamsNotSet) {
            // Ignore click if it's the non-clickable 'Reserved For X' text
            if (teamsNotSet.style.cursor !== 'default') {
                handleChooseTeams(courtId);
                return;
            }
        }

        if (action === 'more-options') { // ✅ NEW: Toggles the Mode Selection Overlay
            handleModeOptionsClick(courtId);
            return;
        }
        
        if (action === 'set-court-mode') { // ✅ NEW: Sets the court mode
            handleSetCourtMode(courtId, actionTarget.dataset.mode); 
            return;
        }

        if (action === 'edit-game') {
            showManageCourtPlayersModal(courtId);
            return;
        }
        
        if (action === 'randomize-teams') {
            handleRandomizeTeams(courtId);
            return;
        }
        if (action === 'choose-later') {
            handleChooseLater(courtId);
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
            const button = e.target.closest('.end-game-ball');
            if (button) {
                button.classList.remove('animate-in');
                button.classList.add('hide-anim');
                setTimeout(() => {
                    handleEndGame(courtId);
                }, 1500);
            } else {
                handleEndGame(courtId);
            }
            return;
        }
        
        if (action === 'select-court-action') {
            const clickedButton = e.target.closest('.court-confirm-btn');
            if (!clickedButton) return;
            
            // 🔴 EXCLUSION LOGIC: Block selection if the court is only marked as reserved
            if (clickedButton.dataset.reservedOnly === 'true') {
                playCustomTTS("This court is reserved for a different type of match.");
                return;
            }

            const allSelectableButtons = document.querySelectorAll('.court-card.selectable .court-confirm-btn.select-court');
            clickedButton.classList.remove('serve-in');
            clickedButton.classList.add('hide-anim');

            let delay = 0;
            allSelectableButtons.forEach(button => {
                if (button !== clickedButton) {
                    setTimeout(() => {
                        button.classList.remove('serve-in');
                        button.classList.add('serve-out');
                    }, delay);
                    delay += 200;
                }
            });

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

            }, 2000);
            
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
//    function handlePauseToggleClick(e) {
 //       const button = e.target.closest(".pause-toggle-btn");
//        // We know button exists because it was checked in handlePlayerClick
//        
//        const playerName = button.dataset.playerName;
//        const action = button.dataset.action; // 'pause' or 'resume'
//        const playerObj = state.availablePlayers.find(p => p.name === playerName);
//
//        if (!playerObj) return;
//
 //       const verb = action === 'pause' ? 'pause' : 'resume';
 //       const message = action === 'pause' 
//            ? `Are you sure you want to pause your game play? You will remain in position #${state.availablePlayers.indexOf(playerObj) + 1} until you resume.` 
//            : `Are you sure you want to resume your game play? You will be immediately restored to position #${state.availablePlayers.indexOf(playerObj) + 1}.`;
////
//        cancelConfirmModal.querySelector("h3").textContent = `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`;
//        cancelConfirmModal.querySelector("p").textContent = message;
//        modalBtnYesConfirm.textContent = verb.charAt(0).toUpperCase() + verb.slice(1);
//        modalBtnNo.textContent = "Close";
//        
 //       cancelConfirmModal.dataset.mode = "pauseToggle";
//        cancelConfirmModal.dataset.player = playerName;
//        cancelConfirmModal.dataset.verb = action;
//
//        cancelConfirmModal.classList.remove("hidden");
//    }

// ADD NEW FUNCTION: Pause/Resume game play click handler (IMMEDIATE ACTION)
//    function handlePauseToggleClick(e) {
//        const button = e.target.closest(".pause-toggle-btn");
//        if (!button) return;
//        
//        const playerName = button.dataset.playerName;
//        const action = button.dataset.action;
//        const playerObj = state.availablePlayers.find(p => p.name === playerName);
//
//        if (playerObj) {
//            // IMMEDIATE ACTION: Toggle the paused state
//            playerObj.isPaused = (action === 'pause');
//            
//            // Re-run necessary updates
//            updateGameModeBasedOnPlayerCount();
//            enforceDutyPosition();
//            render();
//            saveState();
//            checkAndPlayAlert(false);
//        }
//    }

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
    function handleCancelSelection() {
        // This is the corrected logic. It preserves the selected players
        // and only nullifies the court selection before re-rendering.
        state.selection.courtId = null;
        render();
        saveState();
    }
    function handleModeChange(mode){
        // 1. Unconditionally preserve the current selection at the start.
        const playersToPreserve = [...state.selection.players];

        state.selection.gameMode = mode;
        state.selection.courtId = null;

        const newRequiredPlayers = mode === "doubles" ? 4 : 2;

        // 2. Decide whether to keep or clear the preserved players.
        // This logic correctly handles switching from a 4-player selection to Singles.
        if (newRequiredPlayers === 2 && playersToPreserve.length > 2) {
            state.selection.players = [];
        } else {
            state.selection.players = playersToPreserve;
        }

        // 3. Rebuild the UI.
        render();

        // 4. CRITICAL FIX: Schedule the animation to run after the next browser paint.
        // This guarantees that the '.selectable' courts exist in the DOM before we try to animate them.
        requestAnimationFrame(() => {
            // This second frame is a failsafe to ensure the paint has completed.
            requestAnimationFrame(ensureCourtSelectionAnimation);
        });

        saveState();
    }

    function ensureCourtSelectionAnimation() {
        const { players: selectedPlayerNames, gameMode } = state.selection;
        const requiredPlayers = gameMode === "doubles" ? 4 : 2;

        if (selectedPlayerNames.length === requiredPlayers) {
            const selectableCourts = document.querySelectorAll('.court-card.selectable .court-confirm-btn.select-court');
            selectableCourts.forEach(button => {
                // Unconditionally add the class to make the ball visible
                button.classList.add('serve-in');
            });
        } else {
            // If the selection is not complete, ensure the class is removed from all buttons.
            const allCourts = document.querySelectorAll('.court-confirm-btn.select-court');
            allCourts.forEach(button => {
                button.classList.remove('serve-in');
            });
        }
    }
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
        autoAssignCourtModes();
        render();
        saveState();
    }
    function handleChooseLater(courtId){ const court = state.courts.find(c => c.id === courtId); court.status = "game_pending"; court.teamsSet = false; court.autoStartTimeTarget = Date.now() + 60000; court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000); render(); saveState(); }
    function handleRandomizeTeams(courtId){ const court = state.courts.find(c => c.id === courtId); let players = [...court.players].sort(() => 0.5 - Math.random()); court.teams.team1 = [players[0], players[1]]; court.teams.team2 = [players[2], players[3]]; court.status = "game_pending"; court.teamsSet = true; court.autoStartTimeTarget = Date.now() + 60000; court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000); render(); saveState(); }
    function handleModalConfirm(){ 
        const courtId = chooseTeamsModal.dataset.courtId; 
        const court = state.courts.find(c => c.id === courtId); 
        const openedFrom = chooseTeamsModal.dataset.openedFrom; // Get context
        
        const team1Names = Array.from(modalPlayerList.querySelectorAll(".selected")).map(el => el.dataset.player); 
        if (team1Names.length === 2) { 
            const team1Players = team1Names.map(name => getPlayerByName(name)); 
            const team2Players = court.players.filter(player => !team1Names.includes(player.name)); 
            court.teams.team1 = team1Players; 
            court.teams.team2 = team2Players; 
            court.teamsSet = true; // Mark teams as set
            chooseTeamsModal.classList.add("hidden"); 
            delete chooseTeamsModal.dataset.openedFrom; // Clean up context

            if (openedFrom === 'endgame') {
                // If opened from end game flow, re-call handleEndGame to show results modal
                handleEndGame(courtId);
            } else {
                // Otherwise, proceed with normal game setup
                court.status = "game_pending"; 
                court.autoStartTimeTarget = Date.now() + 60000; 
                court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000); 
            }
            render(); 
            saveState(); 
        } else { 
            alert("Please select exactly 2 players for Team 1."); 
        } 
    }
    function handleChooseTeams(courtId, openedFrom = 'setup'){
        chooseTeamsModal.classList.remove("hidden");
        chooseTeamsModal.dataset.openedFrom = openedFrom; // Set context for cancel/confirm logic

        // Clear and reset the modal list for a fresh population
        modalPlayerList.innerHTML = "";
        modalPlayerList.classList.remove('two-row-grid');

        document.getElementById('modal-confirm-teams-btn').textContent = "Confirm";
        document.getElementById('modal-cancel-btn').textContent = "Close";

        const court = state.courts.find(c => c.id === courtId);

        // This is the corrected logic block
        if (court && court.players && court.players.length > 0) {
            // Conditionally apply the special grid style only for 4 players
            if (court.players.length === 4) {
                modalPlayerList.classList.add('two-row-grid');
            }

            // This loop now runs for any number of players
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

        // --- UPDATED ANNOUNCEMENT LOGIC ---
        const team1Names = getPlayerNames(court.teams.team1);
        const team2Names = getPlayerNames(court.teams.team2);
        let announcementMessage;
        
        const formatTeamNames = (names) => {
            if (names.length === 1) return names[0];
            if (names.length === 2) return `${names[0]} and ${names[1]}`;
            return names.slice(0, -1).join(', ') + ` and ${names.slice(-1)[0]}`;
        };
        
        // Use the new helper function here
        const formattedCourtId = formatCourtIdForTTS(court.id);

        if (court.gameMode === 'singles') {
            announcementMessage = `${team1Names[0]}, and ${team2Names[0]} ...are on Court ${formattedCourtId}... Lekker Speel!`;
        } else if (court.gameMode === 'doubles') {
            if (court.teamsSet === false) {
                const playerNames = getPlayerNames(court.players);
                const namesList = formatTeamNames(playerNames);
                announcementMessage = `It's ${namesList}, on Court ${formattedCourtId}... Lekker Speel!`;
            } else {
                const team1String = formatTeamNames(team1Names);
                const team2String = formatTeamNames(team2Names);
                announcementMessage = `It's team ${team1String}, versus team ${team2String} ...on Court ${formattedCourtId}... Lekker Speel!`;
            }
        }
        
        playAlertSound(announcementMessage, null);
        // --- END UPDATED LOGIC ---

        render(); 
        court.isNewGame = false;
        saveState();
        resetAlertSchedule();
        checkAndPlayAlert(false);
    }, 2000);
}

    function handleEndGame(courtId){
        const court = state.courts.find(c => c.id === courtId);
        if(!court) return;

        if (court.teamsSet === false) {
            handleChooseTeams(courtId, 'endgame'); // Pass 'endgame' context
            return;
        }

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
            
            // --- Preserve Players (NEW LOGIC) ---
            // 1. Get the list of players who were on the court
            const playersWhoWereSelected = court.players.map(p => p.name);
            
            // 2. Clear any existing selection and set the court's players as the new selection
            state.selection.players = playersWhoWereSelected; 
            state.selection.courtId = null; // Clear court ID selection
            // --- End New Logic ---

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
            court.teamsSet = null;      // Add this line right after
            cancelConfirmModal.classList.add("hidden");
            updateGameModeBasedOnPlayerCount();
            enforceDutyPosition(); // Re-check fairness rule on the restored list
            autoAssignCourtModes();
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
            autoAssignCourtModes();
            render();
            saveState();
            checkAndPlayAlert(false);
        }
    }

    function executePlayerCheckOut(){
        const playerToCheckOutName = cancelConfirmModal.dataset.player;
        if (playerToCheckOutName) {
            const playerObject = state.availablePlayers.find(p => p.name === playerToCheckOutName);
            if (playerObject) { // Check if player was found

                // --- START FIX ---
                // If the player being checked out is a junior, remove them from the activeChildren list
                if (playerObject.isJunior) {
                    state.juniorClub.activeChildren = state.juniorClub.activeChildren.filter(child => child.name !== playerToCheckOutName);
                }
                // --- END FIX ---

                if (!playerObject.guest) { // Only add back non-guests
                    state.clubMembers.push(playerObject);
                    state.clubMembers.sort((a, b) => a.name.localeCompare(b.name));
                }
            }
            state.availablePlayers = state.availablePlayers.filter(p => p.name !== playerToCheckOutName);
            
            cancelConfirmModal.classList.add("hidden");
            populateCheckOutModal(); // Repopulate the list
            checkOutModal.classList.remove("hidden"); // Show the list again
            updateGameModeBasedOnPlayerCount();
            autoAssignCourtModes();
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
     * Converts a single-letter court ID to a phonetic spelling for clearer TTS.
     * @param {string} courtId The court ID (e.g., 'A', 'B').
     * @returns {string} The phonetic spelling (e.g., 'AYY', 'Bee').
     */
    function formatCourtIdForTTS(courtId) {
        if (!courtId) return '';
        switch (courtId.toUpperCase()) {
            case 'A': return 'AYY';
            case 'B': return 'Bee';
            case 'C': return 'See';
            case 'D': return 'Dee';
            case 'E': return 'EE';
            default: return courtId; // Fallback for any other court names
        }
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
        utterance.rate = 0.85;
        utterance.pitch = 0.95;
        
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

    /**
     * Calculates the age of a person in full years from a date string (YYYY-MM-DD).
     * @param {string} dateString The birth date in 'YYYY-MM-DD' format.
     * @returns {number|null} The age in years, or null if the date is invalid.
     */
    function calculateAge(dateString) {
        if (!dateString) return null;
        const today = new Date();
        const birthDate = new Date(dateString);

        if (isNaN(birthDate)) return null;

        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();

        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
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
        
        const firstPlayerName = getFirstAvailablePlayerName(); 

        if (!conditionMet || !firstPlayerName) {
            return;
        }

        // --- UPDATED ANNOUNCEMENT LOGIC ---
        // Use the new helper function here
        const formattedCourtId = formatCourtIdForTTS(availableCourtId);
        const courtMessage = `Attention, ${firstPlayerName.split(' ')[0]}. Please come and select your match. Court ${formattedCourtId} is available.`;
        // --- END UPDATED LOGIC ---

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

    function handleAdminLogin() {
        if (adminSessionActive) {
            // If session is active, PAUSE the timer by clearing it.
            if (adminSessionTimer) {
                clearTimeout(adminSessionTimer);
                adminSessionTimer = null;
            }
            showAdminModal(); // And go directly to the modal
            return;
        }

        // If no session is active, prompt for the PIN
        showKeypad(null, { mode: 'admin', maxLength: 6, title: 'Enter Admin Passcode (0308DD)' });
    }

    function checkAdminPasscode() {
        const enteredCode = keypadDisplay.dataset.hiddenValue;
        const expectedCode = getAdminPasscode();

        if (enteredCode === expectedCode) {
            const afterSuccessCallback = keypadConfig.afterSuccess; // Store the callback locally
            hideKeypad(); // This now safely clears the global keypadConfig
            adminSessionActive = true;

            if (afterSuccessCallback) {
                afterSuccessCallback(); // Execute the stored callback

                // Start the session timer
                if (adminSessionTimer) clearTimeout(adminSessionTimer);
                adminSessionTimer = setTimeout(() => {
                    adminSessionActive = false;
                    adminSessionTimer = null;
                    // When the timer expires, close any open mode overlays.
                    state.courts.forEach(c => c.isModeOverlayActive = false);
                    render();
                    playAlertSound(null, null, 'Alert7.mp3');
                }, 60000); // 1 minute
            } else {
                // If no specific action was pending, just open the main admin modal.
                showAdminModal();
            }

        } else {
            // If the PIN is incorrect, shake the keypad.
            const keypadContent = customKeypadModal.querySelector('.keypad-content');
            keypadContent.classList.add('shake');
            setTimeout(() => {
                keypadContent.classList.remove('shake');
                keypadDisplay.textContent = '';
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
        const committeeMembers = MASTER_MEMBER_LIST.filter(m => m.committee).sort((a, b) => a.name.localeCompare(b.name));
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
        // --- NEW: Render the Auto-Assign Toggle First ---
        const autoAssignToggleLi = document.createElement('li');
        autoAssignToggleLi.className = 'court-availability-item';
        autoAssignToggleLi.innerHTML = `
            <label for="auto-assign-toggle">Auto Assign Modes</label>
            <label class="switch">
                <input type="checkbox" id="auto-assign-toggle" ${state.courtSettings.autoAssignModes ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        `;
        courtAvailabilityList.appendChild(autoAssignToggleLi);
        // --- END NEW ---

        state.courts.forEach(court => {
            const li = document.createElement('li');
            li.className = 'court-availability-item';
            const isVisible = state.courtSettings.visibleCourts.includes(court.id);
            const light = state.lightSettings.courts[court.id];
            const isLightManaged = light && light.isManaged;
            const isLightActive = isLightManaged && light.isActive;
            const lightIconClass = isLightActive ? 'mdi-lightbulb-on' : 'mdi-lightbulb-outline';
            const lightDisabledAttr = isLightManaged ? '' : 'disabled';

            li.innerHTML = `
                <label for="court-toggle-${court.id}">${court.id}</label>
                <button class="light-toggle-btn" data-court-id="${court.id}" title="Toggle Court ${court.id} Lights" ${lightDisabledAttr}>
                    <i class="mdi ${lightIconClass}"></i>
                </button>
                <label class="switch">
                    <input type="checkbox" id="court-toggle-${court.id}" data-court-id="${court.id}" ${isVisible ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            `;
            courtAvailabilityList.appendChild(li);
        });

        // --- NEW: Event Listener for the new toggle ---
        document.getElementById('auto-assign-toggle').addEventListener('change', (e) => {
            state.courtSettings.autoAssignModes = e.target.checked;
            if (e.target.checked) {
                autoAssignCourtModes(); // Immediately run logic when toggled on
                render();
            }
            saveState();
        });
        // --- END NEW ---

        courtAvailabilityList.querySelectorAll('input[type="checkbox"][id^="court-toggle"]').forEach(toggle => {
            toggle.addEventListener('change', handleCourtVisibilityChange);
        });

        courtAvailabilityList.querySelectorAll('.light-toggle-btn').forEach(button => {
            button.addEventListener('click', handleLightToggleChange);
        });

        updateLightIcon();
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
    function showManageCourtPlayersModal(courtId) { // --- Now accepts courtId ---
        // 1. Safety check for any pending additions from a previous unfinished session
        const { addedPlayers } = state.adminCourtManagement;
        if (addedPlayers.length > 0) {
            state.availablePlayers = [...addedPlayers, ...state.availablePlayers];
            state.adminCourtManagement.addedPlayers = [];
        }
        
        // 2. Clear any old state before starting
        state.adminCourtManagement = {
            mode: 'card1_select_court', // Keep this for reset purposes
            courtId: null,
            currentCourtPlayers: [], 
            removedPlayers: [], 
            addedPlayers: [] 
        };

        // 3. Directly call the function to show the "Remove Players" card
        showRemovePlayerCard(courtId);
        
        // 4. Show the main modal container
        manageCourtPlayersModal.classList.remove('hidden');
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

        // We'll show the top 7 available players as potential additions.
        const availableForAdding = state.availablePlayers.slice(0, 7);
            
        if (availableForAdding.length === 0) {
            addPlayersList.innerHTML = '<li style="justify-content: center; color: #6c757d;">No players are currently available to add.</li>';
        } else {
            availableForAdding.forEach(player => {
                const isAlreadyAdded = addedPlayers.some(ap => ap.name === player.name);
                const li = document.createElement('li');
                const displayName = player.guest ? `${player.name} (Guest)` : player.name;

                if (isAlreadyAdded) {
                    // Style for players who are marked to be added
                    li.style.backgroundColor = 'var(--light-blue)';
                    li.innerHTML = `
                        <span style="flex-grow: 1; color: var(--primary-blue); font-weight: 500;">${displayName}</span>
                        <span class="action-icon remove" data-player="${player.name}" data-court-id="${courtId}" data-action="undo-add-player-temp" title="Undo Add">&times;</span>
                    `;
                } else {
                    // Style for players who are available to be added
                    li.innerHTML = `
                        <span style="flex-grow: 1;">${displayName}</span>
                        <span style="margin-right: 1rem; color: #6c757d;">${player.gender}</span>
                        <span class="action-icon add" data-player="${player.name}" data-court-id="${courtId}" data-action="add-player-temp" title="Add Player">+</span>
                    `;
                }
                addPlayersList.appendChild(li);
            });
        }
        
        // Enable the confirm button only if there are changes to be made
        const hasChanges = addedPlayers.length > 0 || removedPlayers.length > 0;
        managePlayersConfirmBtn.disabled = !hasChanges;
        managePlayersConfirmBtn.style.backgroundColor = hasChanges ? 'var(--confirm-color)' : 'var(--inactive-color)';
        managePlayersConfirmBtn.style.borderColor = hasChanges ? 'var(--confirm-color)' : 'var(--inactive-color)';
    }

    // --- Navigation/Action Handlers ---

    // Handles Close button on Card 1, 2, or 3
    function handleManageClose() {
        // Simply reset the temporary state and close the modal.
        // No players need to be returned to the queue as they were never removed.
        state.adminCourtManagement = {
            mode: 'card1_select_court',
            courtId: null,
            currentCourtPlayers: [], 
            removedPlayers: [], 
            addedPlayers: [] 
        };
        
        manageCourtPlayersModal.classList.add('hidden');
        updateGameModeBasedOnPlayerCount();
        render();
        saveState();
        checkAndPlayAlert(false);
    }

    // Handles Back button on Card 2 (to Card 1) or Card 3 (to Card 2)
    function handleManageBack() {
        const { mode, courtId } = state.adminCourtManagement;
        
        if (mode === 'card2_remove_players') {
            // Back from "Remove" to "Select Court". All temporary changes are discarded.
            showCourtSelectionCard();
        } else if (mode === 'card3_add_players') {
            // Back from "Add" to "Remove". Discard only the 'added' players list.
            state.adminCourtManagement.addedPlayers = [];
            showRemovePlayerCard(courtId);
        }
        
        updateGameModeBasedOnPlayerCount();
        render();
        saveState();
        checkAndPlayAlert(false);
    }

    // Handles Confirm button on Card 3 (Final Save)
    function handleManageConfirm() {
        const { courtId, removedPlayers, addedPlayers } = state.adminCourtManagement;
        const court = state.courts.find(c => c.id === courtId);
        if (!court || court.status !== 'in_progress') {
            return handleManageClose();
        }

        // (Position-Aware Swap Logic and Queue Swap Logic remain the same...)
        let newCourtPlayers = [...court.players];
        const removedPlayerNames = new Set(removedPlayers.map(p => p.name));
        let playersToAdd = [...addedPlayers]; 
        const vacantIndices = [];
        newCourtPlayers.forEach((player, index) => {
            if (removedPlayerNames.has(player.name)) {
                vacantIndices.push(index);
            }
        });
        vacantIndices.forEach(index => {
            if (playersToAdd.length > 0) {
                newCourtPlayers[index] = playersToAdd.shift();
            } else {
                newCourtPlayers[index] = null;
            }
        });
        newCourtPlayers = newCourtPlayers.filter(p => p !== null);
        if (playersToAdd.length > 0) {
            newCourtPlayers.push(...playersToAdd);
        }
        let playersToRequeueInQueue = [...removedPlayers];
        const addedPlayerNamesInQueue = new Set(addedPlayers.map(p => p.name));
        let newAvailablePlayers = state.availablePlayers.map(playerInQueue => {
            if (addedPlayerNamesInQueue.has(playerInQueue.name)) {
                if (playersToRequeueInQueue.length > 0) {
                    return playersToRequeueInQueue.shift();
                } else {
                    return null;
                }
            }
            return playerInQueue;
        });
        newAvailablePlayers = newAvailablePlayers.filter(p => p !== null);
        if (playersToRequeueInQueue.length > 0) {
            newAvailablePlayers.push(...playersToRequeueInQueue);
        }
        state.availablePlayers = newAvailablePlayers;
        
        // --- UPDATED ANNOUNCEMENT LOGIC ---
        const newGameMode = newCourtPlayers.length === 2 ? 'singles' : 'doubles';
        
        // Use the new helper function here
        const formattedCourtId = formatCourtIdForTTS(courtId);

        if (newCourtPlayers.length < 2) {
            if(court.autoStartTimer) clearTimeout(court.autoStartTimer);
            state.availablePlayers.push(...court.players.filter(p => !p.guest));
            court.becameAvailableAt = Date.now();
            court.status = "available";
            court.players = [];
            court.teams = {team1:[], team2:[]};
            court.gameMode = null;
            court.gameStartTime = null;
            playCustomTTS(`Attention: Game on Court ${formattedCourtId} has been cancelled due to insufficient players.`);
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

            const removedNamesStr = removedPlayers.map(p => p.name).join(' and ');
            const addedNamesStr = addedPlayers.map(p => p.name).join(' and ');

            let announcementPart1 = `Attention on Court ${formattedCourtId}. Player substitution complete.`;
            let announcementPart2 = null;

            if (removedPlayers.length > 0 && addedPlayers.length > 0) {
                announcementPart2 = `${addedNamesStr} will be filling in for ${removedNamesStr}.`;
            } else if (removedPlayers.length > 0) {
                announcementPart1 = `Attention on Court ${formattedCourtId}: ${removedNamesStr} have left the game.`;
            } else if (addedPlayers.length > 0) {
                announcementPart1 = `Attention on Court ${formattedCourtId}: ${addedNamesStr} have joined the game.`;
            }
            
            playAlertSound(announcementPart1, announcementPart2);
        }
        // --- END UPDATED LOGIC ---
        
        state.adminCourtManagement = { mode: 'card1_select_court', courtId: null, currentCourtPlayers: [], removedPlayers: [], addedPlayers: [] };
        manageCourtPlayersModal.classList.add('hidden');
        
        updateGameModeBasedOnPlayerCount();
        enforceDutyPosition();
        autoAssignCourtModes();
        render();
        saveState();
        resetAlertSchedule();
        checkAndPlayAlert(false);
    }

    function handleOnDutyChange(e) { state.onDuty = e.target.value; saveState(); render(); }
    
    function handleKeypadClick(e) {
        const key = e.target.dataset.key;
        let displayValue;
        const mode = keypadConfig.mode;

        // --- START OF FIX ---
        if (mode === 'date') {
            handleDateInput(activeInput, key);
            if (e.target.id === 'keypad-confirm-btn') {
                hideKeypad();
            }
            return; // Stop further execution for date mode
        }
        // --- END OF FIX ---

        // On confirm, decide what action to take based on the mode
        if (e.target.id === 'keypad-confirm-btn') {
            if (e.target.disabled) return;

            if (mode === 'admin') {
                checkAdminPasscode();
                return;
            } else if (mode === 'reset') {
                checkResetPasscode();
                return;
            } else if (mode === 'addStock') {
                confirmBallStockUpdate();
                return;
            } else if (mode === 'returnStock') {
                confirmBallStockReturn();
                return;
            } else if (mode === 'returnUsed') {
                confirmUsedBallReturn();
                return;
            } else if (mode === 'signOut') {
                confirmSignOutQuantity();
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

        // Reset display for all modes, except for date which needs to show the current value
        keypadDisplay.textContent = (mode === 'date' && activeInput) ? activeInput.value : '';
        delete keypadDisplay.dataset.hiddenValue;

        if (mode === 'admin' || mode === 'reset') {
            keypadDisplay.setAttribute('data-mode', mode);
            keypadDisplay.setAttribute('data-placeholder', config.title || 'Enter PIN');
            keypadCancelBtn.classList.remove('hidden');
            keypadConfirmBtn.classList.remove('wide-full');
            keypadConfirmBtn.classList.add('wide-half');
        } else {
            keypadDisplay.removeAttribute('data-mode');
            if (config.title) {
                keypadDisplay.setAttribute('data-placeholder', config.title);
            } else {
                keypadDisplay.removeAttribute('data-placeholder');
            }
            
            keypadCancelBtn.classList.add('hidden');
            keypadConfirmBtn.classList.remove('wide-half');
            keypadConfirmBtn.classList.add('wide-full');
        }

        customKeypadModal.classList.remove('hidden');
        keypadConfirmBtn.disabled = keypadDisplay.textContent.length === 0;
    }

    function hideKeypad() { customKeypadModal.classList.add('hidden'); keypadConfig = {}; activeInput = null; }
    function wireScoreInputToKeypad(input) { 
        input.readOnly = true; 
        input.addEventListener('click', (e) => { 
            e.preventDefault(); // Prevents double-opening or native keyboards
            showKeypad(e.target); 
        }); 
    }
    // --- ALPHA KEYPAD CORE DATA (Required for alphabetical input) ---
    const QWERTY_LAYOUT = [ 
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'], 
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'], 
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M'] 
    ];

    function generateAlphaKeypad() {
        const displayValue = alphaKeypadDisplay.textContent;
        alphaKeypadGrid.innerHTML = '';
        
        QWERTY_LAYOUT.forEach((row, index) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = `key-row-${index + 1}`;
            row.forEach(key => {
                const button = document.createElement('button');
                button.className = 'keypad-btn';
                button.dataset.key = key;
                let char = key;
                if (displayValue.length === 0 || displayValue.slice(-1) === ' ') {
                    char = key.toUpperCase();
                } else {
                    char = key.toLowerCase();
                }
                button.textContent = char;
                rowDiv.appendChild(button);
            });
            alphaKeypadGrid.appendChild(rowDiv);
        });

        const lastRowDiv = document.createElement('div');
        lastRowDiv.className = `key-row-4`;
        
        const spaceBtn = document.createElement('button');
        spaceBtn.className = 'keypad-btn wide-control control';
        spaceBtn.dataset.key = 'space';
        spaceBtn.textContent = 'Space';
        lastRowDiv.appendChild(spaceBtn);

        const backspace = document.createElement('button');
        backspace.className = 'keypad-btn control';
        backspace.dataset.key = 'backspace';
        backspace.textContent = '⌫';
        lastRowDiv.appendChild(backspace);

        const done = document.createElement('button');
        done.className = 'keypad-btn wide-control confirm';
        done.id = 'alpha-keypad-confirm-btn';
        done.textContent = 'Done';
        lastRowDiv.appendChild(done);

        alphaKeypadGrid.appendChild(lastRowDiv);

        document.querySelectorAll('#custom-alpha-keypad-modal .keypad-btn').forEach(button => { 
            button.removeEventListener('click', handleAlphaKeypadClick);
            button.addEventListener('click', handleAlphaKeypadClick); 
        });
    }
    function handleAlphaKeypadClick(e) {
        const key = e.target.dataset.key;
        let displayValue = alphaKeypadDisplay.textContent;
        if (!activeAlphaInput) return;

        if (key === 'backspace') {
            displayValue = displayValue.slice(0, -1);
        } else if (key === 'space') {
            if (displayValue.length > 0 && displayValue.slice(-1) !== ' ') {
                displayValue += ' ';
            }
        } else if (e.target.id === 'alpha-keypad-confirm-btn') {
            hideAlphaKeypad();
            return;
        } else {
            let char = key;
            if (displayValue.length === 0 || displayValue.slice(-1) === ' ') {
                char = key.toUpperCase();
            } else {
                char = key.toLowerCase();
            }
            displayValue += char;
        }

        alphaKeypadDisplay.textContent = displayValue;
        activeAlphaInput.value = displayValue;
        generateAlphaKeypad(); 
        
        // --- FIX: Manually dispatch 'input' event to trigger listeners (autofill & validation) ---
        if (activeAlphaInput.closest('#new-parent-modal')) {
             activeAlphaInput.dispatchEvent(new Event('input'));
        }
        // --- END FIX ---
        
        validateGuestForm();
    }
    
    function showAlphaKeypad(input) {
        activeAlphaInput = input;
        alphaKeypadDisplay.textContent = activeAlphaInput.value;
        generateAlphaKeypad();
        customAlphaKeypadModal.classList.remove('hidden');
        guestNameModal.classList.add('hidden');
        
        // Check if the input is a child's name field and hide the original new parent modal
        if (input.closest('#new-parent-modal')) {
            document.getElementById('new-parent-modal').classList.add('hidden');
        }
    }
    function hideAlphaKeypad() {
        customAlphaKeypadModal.classList.add('hidden');
        // Restore the correct parent modal (either guestNameModal or newParentModal)
        if (activeAlphaInput && activeAlphaInput.closest('#new-parent-modal')) {
            document.getElementById('new-parent-modal').classList.remove('hidden');
            
            // --- FIX: Manually dispatch 'input' event on close for final validation/autofill ---
            activeAlphaInput.dispatchEvent(new Event('input')); 
            // --- END FIX ---

        } else {
            guestNameModal.classList.remove('hidden');
        }
        activeAlphaInput = null;
        validateGuestForm();
    }
    function wireAlphaKeypadToInput(input, validationCallback) {
        input.readOnly = true;
        input.addEventListener('click', (e) => {
            showAlphaKeypad(e.target);
        });
        input.addEventListener('input', validationCallback);
    }

    function validateGuestForm() { const name = guestNameInput.value.trim(); const surname = guestSurnameInput.value.trim(); const isReady = (name.length > 0 && surname.length > 0); guestConfirmBtn.disabled = !isReady; guestConfirmBtn.style.backgroundColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)'; guestConfirmBtn.style.borderColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)'; }
    function handleGuestCheckIn() {
        const firstName = guestNameInput.value.trim();
        const lastName = guestSurnameInput.value.trim();
        const gender = document.querySelector('input[name="guest-gender"]:checked').value;
        const playerType = document.querySelector('input[name="player-type"]:checked').value;
        const isGuest = playerType === 'guest';

        if (!firstName || !lastName) return;
        
        const formatCase = (str) => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const formattedPlayerName = `${formatCase(firstName)} ${formatCase(lastName)}`;
        
        let playerObject;

        // --- THIS IS THE NEW LOGIC ---
        if (!isGuest) {
            // This is a member. Try to find them in the master list.
            playerObject = MASTER_MEMBER_LIST.find(p => p.name.toLowerCase() === formattedPlayerName.toLowerCase());

            if (playerObject) {
                // Found them! Remove from club members and add to available.
                state.clubMembers = state.clubMembers.filter(p => p.name.toLowerCase() !== formattedPlayerName.toLowerCase());
            } else {
                // This is a new member not in the CSV, treat them like a guest for this session.
                playerObject = { name: formattedPlayerName, gender: gender, guest: true, isPaused: false };
            }
        } else {
            // This is a guest. Create a new guest object.
            playerObject = { name: formattedPlayerName, gender: gender, guest: true, isPaused: false };
        }
        // --- END OF NEW LOGIC ---

        // Add the final player object to the available list if they aren't already there
        if (!state.availablePlayers.some(p => p.name === playerObject.name)) {
            state.availablePlayers.push(playerObject);
        }
        
        // Reset and close the modal
        guestNameModal.classList.add('hidden');
        checkInModal.classList.remove('hidden'); 
        populateCheckInModal(); 
        
        guestNameInput.value = '';
        guestSurnameInput.value = '';
        guestConfirmBtn.disabled = true;
        document.querySelector('input[name="player-type"][value="guest"]').checked = true;

        // Standard updates
        updateGameModeBasedOnPlayerCount();
        autoAssignCourtModes();
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

    function populateCheckInModal() {
        checkInList.innerHTML = "";

        // --- THIS IS THE NEW LOGIC ---
        // 1. Get a list of all player names currently at the club (available or on court)
        const checkedInPlayerNames = new Set([
            ...state.availablePlayers.map(p => p.name),
            ...state.courts.flatMap(c => c.players).map(p => p.name)
        ]);

        // 2. Filter the master list to exclude those already checked in
        const membersAvailableToCheckIn = state.clubMembers.filter(member => !checkedInPlayerNames.has(member.name));
        // --- END OF NEW LOGIC ---

        if (membersAvailableToCheckIn.length === 0) {
            const li = document.createElement("li");
            li.textContent = "All club members are currently checked in.";
            li.style.justifyContent = "center";
            checkInList.appendChild(li);
        } else {
            membersAvailableToCheckIn.forEach(player => {
                const li = document.createElement("li");
                const displayName = player.guest ? `${player.name} (Guest)` : player.name;
                li.innerHTML = ` <span style="flex-grow: 1;">${displayName}</span> <span style="margin-right: 1rem; color: #6c757d;">${player.gender}</span> <span class="action-icon add" data-player="${player.name}">+</span> `;
                li.dataset.playerName = player.name;
                checkInList.appendChild(li);
            });
        }
        setupListWithIndex(membersAvailableToCheckIn, checkInList, document.getElementById('check-in-abc-index'));
    }

    function populateCheckOutModal() {
        checkOutList.innerHTML = "";
        if (state.availablePlayers.length === 0) {
            const li = document.createElement("li");
            li.textContent = "There are no players currently checked in.";
            li.style.justifyContent = "center";
            checkOutList.appendChild(li);
        } else {
            state.availablePlayers.forEach(player => {
                const li = document.createElement("li");
                const displayName = player.guest ? `${player.name} (Guest)` : player.name;
                li.innerHTML = ` <span style="flex-grow: 1;">${displayName}</span> <span style="margin-right: 1rem; color: #6c757d;">${player.gender}</span> <span class="action-icon remove" data-player="${player.name}">&times;</span> `;
                li.dataset.playerName = player.name;
                checkOutList.appendChild(li);
            });
        }
        setupListWithIndex(state.availablePlayers, checkOutList, document.getElementById('check-out-abc-index'));
    }

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

    function autoAssignCourtModes() {
        // 1. Check if the feature is enabled in admin settings
        if (!state.courtSettings.autoAssignModes) {
            return;
        }

        // 2. Perform Calculations
        const visibleSocialCourts = state.courts.filter(c =>
            state.courtSettings.visibleCourts.includes(c.id) && c.courtMode !== 'league'
        );
        const visibleSocialCourtCount = visibleSocialCourts.length;

        const activeLeagueCourts = state.courts.filter(c => c.courtMode === 'league' && c.status === 'in_progress').length;
        const socialPlayersOnCourt = state.courts
            .filter(c => c.courtMode !== 'league')
            .reduce((sum, court) => sum + court.players.length, 0);
        const totalSocialPlayers = state.availablePlayers.length + socialPlayersOnCourt;

        // Filter for courts that are available, visible, and not league courts
        const courtsToModify = state.courts.filter(c =>
            c.status === 'available' &&
            state.courtSettings.visibleCourts.includes(c.id) &&
            c.courtMode !== 'league'
        );

        // 3. Apply Prioritized Rules
        // Rule 1: League Priority
        if (activeLeagueCourts >= 2) {
            courtsToModify.forEach(court => {
                if (court.courtMode !== 'doubles') court.courtMode = 'doubles';
            });
        }
        // Rule 2: Full Capacity (Dynamic)
        else if (totalSocialPlayers >= visibleSocialCourtCount * 4) {
            courtsToModify.forEach(court => {
                if (court.courtMode !== 'doubles') court.courtMode = 'doubles';
            });
        }
        // Rule 3: High Occupancy (Dynamic)
        else if (totalSocialPlayers >= (visibleSocialCourtCount - 1) * 4) {
            courtsToModify.forEach(court => {
                if (court.id === 'A' && court.courtMode !== 'doubles') {
                    court.courtMode = 'doubles';
                } else if (court.id === 'E' && court.courtMode !== 'rookie') {
                    court.courtMode = 'rookie';
                }
            });
        }
        // Rule 4: Low Occupancy (Default)
        else {
            courtsToModify.forEach(court => {
                if (court.id === 'A' && court.courtMode !== 'singles') {
                    court.courtMode = 'singles';
                } else if (court.id === 'E' && court.courtMode !== 'rookie') {
                    court.courtMode = 'rookie';
                }
            });
        }
        saveState(); // Save any changes made to court modes
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
        autoAssignCourtModes();
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
        autoAssignCourtModes();
        render();
        alert("Application has been reset.");
    }

    function formatCase(str) {
        return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    // --- ADDED FUNCTION: Wrapper for the Add Child button click ---
    function addChild() {
        generateChildField();
    }

    // --- JUNIOR CLUB FUNCTIONS (RESTORED) ---
    function generateChildField() {
        const groupId = Date.now();
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'child-field-group';
        fieldGroup.dataset.groupId = groupId;
        fieldGroup.dataset.complete = 'false';
        
        const currentParentSurname = parentSurnameInput.value.trim();
        
        // --- MODIFIED HTML STRUCTURE: All fields are now 100% width and stacked ---
        // --- THIS IS THE UPDATED HTML BLOCK ---
        fieldGroup.innerHTML = `
            <div class="child-collapsed-display collapsed-area hidden"></div>
            
            <div class="child-expanded-fields">
                <div style="display: block;">
                    <div class="child-name-input score-input-area" style="flex-direction: column; align-items: stretch; width: 100%;">
                        <label for="child-name-${groupId}">Child First Name:</label>
                        <input type="text" id="child-name-${groupId}" name="childName" readonly placeholder="Tap to enter name" style="width: 100%;">
                    </div>
                    <div class="child-surname-container score-input-area" style="flex-direction: column; align-items: stretch; width: 100%;">
                        <label for="child-surname-${groupId}">Child Surname:</label>
                        <input type="text" id="child-surname-${groupId}" name="childSurname" readonly placeholder="Tap to enter surname" style="width: 100%;" data-autofill-surname="${currentParentSurname}"> 
                    </div>
                </div>

                <div class="child-dob-input score-input-area" style="flex-direction: column; align-items: stretch; width: 100%; margin-top: 0.5rem; position: relative;">
                    <label for="child-dob-${groupId}">Birth Date:</label>
                    
                    <div id="date-display-${groupId}" class="date-display" data-placeholder="YYYY/MM/DD">YYYY/MM/DD</div>
                    
                    <input type="text" inputmode="numeric" id="child-dob-${groupId}" name="childBirthDate" readonly style="display: none;">
                </div>
                
                <div class="gender-selector score-input-area" style="flex-direction: column; align-items: stretch; width: 100%; margin-top: 0.5rem;">
                    <label>Gender:</label>
                    <div class="radio-group" style="background-color: transparent; border: 1px solid var(--border-color); border-radius: 5px; height: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-around; padding: 0.25rem 0.5rem;">
                        <label>
                            <input type="radio" name="child-gender-${groupId}" value="M"> Male
                        </label>
                        <label>
                            <input type="radio" name="child-gender-${groupId}" value="F"> Female
                        </label>
                    </div>
                </div>
            </div>
        `;
        // --- END OF UPDATED HTML ---
        
        const childNameInput = fieldGroup.querySelector('[name="childName"]');
        const childSurnameInput = fieldGroup.querySelector('[name="childSurname"]');
        
        // --- THIS IS THE CORRECTED LOGIC BLOCK ---
        const childDobInput = fieldGroup.querySelector('[name="childBirthDate"]');
        const dateDisplay = fieldGroup.querySelector('.date-display');

        // When the visual display is clicked, open the numeric keypad for the hidden input
        dateDisplay.addEventListener('click', () => {
            showKeypad(childDobInput, { 
                maxLength: 8, // YYYY/MM/DD = 8 digits
                title: 'YYYYMMDD' 
            });
        });

        // When the keypad types into the hidden input, update the visual display
        childDobInput.addEventListener('input', () => {
            updateDateDisplay(childDobInput);
            validateNewParentForm(); // Re-validate the form
        });
        
        // Initial setup for the placeholder
        updateDateDisplay(childDobInput);
        // --- END OF CORRECTED LOGIC ---

        const validationHandler = () => {
            checkAndCollapseChild(fieldGroup);
            validateNewParentForm();
            renderParentForm();
        };
        
        wireAlphaKeypadToInput(childNameInput, validationHandler);
        wireAlphaKeypadToInput(childSurnameInput, validationHandler);
        
        childDobInput.addEventListener('change', validationHandler);
        fieldGroup.querySelectorAll(`input[name^="child-gender"]`).forEach(radio => {
            radio.addEventListener('change', validationHandler);
        });

        // Autofill logic for child surname
        childNameInput.addEventListener('input', () => {
            const surnameToAutofill = childSurnameInput.dataset.autofillSurname;
            if (surnameToAutofill && childNameInput.value.trim().length > 0) {
                childSurnameInput.value = surnameToAutofill;
            } else if (childNameInput.value.trim().length === 0) {
                childSurnameInput.value = '';
            }
            validationHandler();
        });

        // Add listener to the collapsed area to re-expand on click
        fieldGroup.querySelector('.child-collapsed-display').addEventListener('click', () => {
            fieldGroup.dataset.complete = 'false';
            renderChildFields();
        });
        
        childrenContainer.appendChild(fieldGroup);
        validationHandler();
    }

    function showEditParentModal(parent) {
        // 1. Set the modal to 'edit' mode and store the parent's original ID.
        newParentModal.querySelector('h3').textContent = 'Edit Parent Profile';
        newParentModal.dataset.mode = 'edit';
        newParentModal.dataset.originalParentId = parent.id;
        newParentConfirmBtn.textContent = 'Save Changes';

        // 2. Populate the main parent fields.
        parentNameInput.value = parent.name;
        parentSurnameInput.value = parent.surname;
        parentPhoneInput.value = parent.phone || '';

        // 3. Clear any old child forms.
        childrenContainer.innerHTML = '';

        // 4. Loop through the existing children and create a pre-filled form for each.
        parent.registeredChildren.forEach(child => {
            // Creates a new, empty child form group.
            generateChildField(); 
            
            // Get a reference to the form we just created.
            const lastChildGroup = childrenContainer.lastElementChild;
            if (lastChildGroup) {
                // Populate the fields of that form with the child's data.
                lastChildGroup.querySelector('[name="childName"]').value = child.name;
                lastChildGroup.querySelector('[name="childSurname"]').value = child.surname;
                lastChildGroup.querySelector('[name="childBirthDate"]').value = child.birthDate;
                
                const genderRadio = lastChildGroup.querySelector(`input[name^="child-gender"][value="${child.gender}"]`);
                if (genderRadio) {
                    genderRadio.checked = true;
                }

                // --- THIS IS THE CRITICAL FIX ---
                // Manually run the check to mark this pre-filled form as "complete".
                checkAndCollapseChild(lastChildGroup);
                // --- END OF FIX ---
            }
        });

        // 5. Set the initial state to show the form as already collapsed.
        state.juniorClub.registrationFlow = {
            parentCollapsed: true,
            childrenExpanded: true,
        };

        // 6. Show the modal.
        juniorClubModal.classList.add('hidden');
        newParentModal.classList.remove('hidden');

        // 7. Render the form. Because we fixed the "complete" state in step 4,
        // this will now correctly render the collapsed summary view.
        renderParentForm();
    }

    function showJuniorClubRosterModal() {
        renderJuniorClubRoster(); // Renders with default/last applied sort
        juniorClubModal.classList.add('hidden');
        juniorClubRosterModal.classList.remove('hidden');
    }

    function showRosterDetailModal(item) {
        rosterDetailContent.innerHTML = '';
        
        // Ensure the detail modal content container is visible
        rosterDetailModal.classList.add('hidden');

        if (item.isParent) {
            // --- PARENT DETAIL VIEW: List Children ---
            rosterDetailTitle.textContent = `${item.name} ${item.surname}'s Registered Children`;
            // ADDED STYLE: Compact Title
            rosterDetailTitle.style.marginTop = '0';
            rosterDetailTitle.style.marginBottom = '0.5rem';

            if (item.children && item.children.length > 0) {
                const ul = document.createElement('ul');
                ul.style.listStyleType = 'none';
                ul.style.padding = '0';
                ul.style.margin = '0.5rem 0';
                
                item.children.forEach(childName => {
                    const childLastCheckInMs = getLastCheckInForChild(childName);
                    const checkInDisplay = childLastCheckInMs > 0 
                        ? new Date(childLastCheckInMs).toLocaleDateString('en-ZA') 
                        : 'Never Checked In';

                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px dashed #eee;">
                            <span style="font-weight: 500; color: var(--dark-text);">${childName}</span>
                            <span style="font-size: 0.9em; color: var(--neutral-color);">${checkInDisplay}</span>
                        </div>
                    `;
                    ul.appendChild(li);
                });
                rosterDetailContent.appendChild(ul);
            } else {
                // MODIFIED STYLE: Compact margin for empty state
                rosterDetailContent.innerHTML = '<p style="text-align: center; color: var(--neutral-color); margin-top: 1rem; margin-bottom: 0;">No children currently registered under this parent.</p>';
            }

        } else {
            // --- CHILD DETAIL VIEW: Show Parent in list style ---
            rosterDetailTitle.textContent = `${item.name} ${item.surname}'s Parent`;
            // ADDED STYLE: Compact Title
            rosterDetailTitle.style.marginTop = '0';
            rosterDetailTitle.style.marginBottom = '0.5rem';
            
            const ul = document.createElement('ul');
            ul.style.listStyleType = 'none';
            ul.style.padding = '0';
            ul.style.margin = '0.5rem 0';

            // Find the parent object to get their last check-in details
            const parent = state.juniorClub.parents.find(p => `${p.name} ${p.surname}` === item.parentName);
            let parentLastCheckInDisplay = 'Never Checked In';

            if (parent) {
                // Re-use the existing logic to find the parent's most recent check-in through children
                let latestParentChildrenCheckIn = 0;
                parent.registeredChildren.forEach(child => {
                    const childFullName = `${child.name} ${child.surname}`;
                    const childCheckIn = getLastCheckInForChild(childFullName);
                    if (childCheckIn > latestParentChildrenCheckIn) {
                        latestParentChildrenCheckIn = childCheckIn;
                    }
                });

                if (latestParentChildrenCheckIn > 0) {
                    parentLastCheckInDisplay = new Date(latestParentChildrenCheckIn).toLocaleDateString('en-ZA');
                }
            }


            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px dashed #eee;">
                    <span style="font-weight: 500; color: var(--dark-text);">Parent: ${item.parentName}</span>
                    <span style="font-size: 0.9em; color: var(--neutral-color);">${parentLastCheckInDisplay}</span>
                </div>
            `;
            ul.appendChild(li);
            rosterDetailContent.appendChild(ul);
        }

        // Hide the roster modal and show the detail modal
        juniorClubRosterModal.classList.add('hidden');
        rosterDetailModal.classList.remove('hidden');
    }

    function renderJuniorClubRoster() {
        juniorClubRosterList.innerHTML = '';
        const { sortKey, sortOrder, type } = state.juniorClub.rosterFilter;

        let finalRoster = [];
        if (type === 'parents') {
            state.juniorClub.parents.forEach(parent => {
                let latestChildCheckIn = 0;
                parent.registeredChildren.forEach(child => {
                    const childFullName = `${child.name} ${child.surname}`.trim();
                    const childCheckIn = getLastCheckInForChild(childFullName);
                    if (childCheckIn > latestChildCheckIn) latestChildCheckIn = childCheckIn;
                });
                finalRoster.push({ isParentOnlyView: true, id: parent.id, name: `${parent.name} ${parent.surname}`, phone: parent.phone || 'N/A', lastCheckInMs: latestChildCheckIn });
            });
        } else if (type === 'all') {
            state.juniorClub.parents.forEach(parent => {
                parent.registeredChildren.forEach(child => {
                    const childFullName = `${child.name} ${child.surname}`.trim();
                    const childAge = calculateAge(child.birthDate);
                    finalRoster.push({
                        isAllView: true,
                        id: childFullName,
                        parentName: `${parent.name} ${parent.surname}`,
                        childData: { name: childFullName, age: childAge, ageDisplay: childAge !== null ? `${childAge}y` : 'N/A', gender: child.gender || '?' },
                        lastCheckInMs: getLastCheckInForChild(childFullName)
                    });
                });
            });
        } else { // 'children' view
            state.juniorClub.parents.forEach(parent => {
                parent.registeredChildren.forEach(child => {
                    const childFullName = `${child.name} ${child.surname}`.trim();
                    const childAge = calculateAge(child.birthDate);
                    finalRoster.push({
                        isChildrenView: true,
                        id: childFullName,
                        name: `${child.name} ${child.surname}`,
                        age: childAge,
                        ageDisplay: childAge !== null ? `${childAge}y` : 'N/A',
                        gender: child.gender || '?',
                        lastCheckInMs: getLastCheckInForChild(childFullName),
                    });
                });
            });
        }

        let uniqueRoster = finalRoster;
        uniqueRoster.sort((a, b) => {
            let compareValue = 0;
            const nameA = a.isParentOnlyView ? a.name : (a.isAllView ? a.childData.name : a.name);
            const nameB = b.isParentOnlyView ? b.name : (b.isAllView ? b.childData.name : b.name);
            if (sortKey === 'name') { compareValue = nameA.localeCompare(nameB); }
            else if (sortKey === 'last_checkin') { compareValue = a.lastCheckInMs - b.lastCheckInMs; }
            else if (sortKey === 'age') {
                const ageA = a.isChildrenView ? a.age : (a.isAllView ? a.childData.age : -1);
                const ageB = b.isChildrenView ? b.age : (b.isAllView ? b.childData.age : -1);
                compareValue = (ageA ?? -1) - (ageB ?? -1);
            } else if (sortKey === 'gender') {
                const genderA = a.isChildrenView ? a.gender : (a.isAllView ? a.childData.gender : '');
                const genderB = b.isChildrenView ? b.gender : (b.isAllView ? a.childData.gender : '');
                compareValue = (genderA || '').localeCompare(genderB || '');
            }
            return sortOrder === 'asc' ? compareValue : -compareValue;
        });

        // --- NEW LOGIC FOR ABC INDEXING ---
        const indexList = uniqueRoster.map(item => {
            const name = item.isParentOnlyView 
                ? item.name 
                : (item.isAllView ? item.childData.name : item.name); 
            return { name: name };
        });

        if (uniqueRoster.length === 0) {
            document.getElementById('junior-club-roster-abc-index').innerHTML = '';
            juniorClubRosterList.innerHTML = '<li class="waiting-message">No members match the current filters.</li>';
            return;
        }

        juniorClubRosterList.rosterData = uniqueRoster;
        const getSortIcon = (key) => (state.juniorClub.rosterFilter.sortKey !== key) ? ' ' : (sortOrder === 'asc' ? ' 🔼' : ' 🔽');
        document.getElementById('roster-type-filter-group').querySelectorAll('input[name="roster-type-filter"]').forEach(radio => {
            radio.checked = radio.value === type;
        });

        const buttonStyle = "background: none; color: var(--dark-text); border: none; padding: 0.5rem; min-width: 0; line-height: 1.2;";
        let headerHTML = '';
        if (type === 'parents') {
            headerHTML = `<div class="history-item roster-header" style="padding: 0.5rem 1rem;">
                <div class="roster-row">
                    <button class="action-btn roster-sort-btn roster-col-name" data-sort-key="name" style="${buttonStyle}">Parent Name${getSortIcon('name')}</button>
                    <span class="roster-col-contact" style="color: var(--dark-text); font-weight: bold;">Contact Number</span>
                    <button class="action-btn roster-sort-btn roster-col-checkin" data-sort-key="last_checkin" style="${buttonStyle}">Last<br>Check-In${getSortIcon('last_checkin')}</button>
                </div></div>`;
        } else {
            headerHTML = `<div class="history-item roster-header" style="padding: 0.5rem 1rem;">
                <div class="roster-row">
                    <button class="action-btn roster-sort-btn roster-col-name" data-sort-key="name" style="${buttonStyle}">${type === 'all' ? 'Parent / Child' : 'Name'}${getSortIcon('name')}</button>
                    <button class="action-btn roster-sort-btn roster-col-gender" data-sort-key="gender" style="${buttonStyle}">Gender${getSortIcon('gender')}</button>
                    <button class="action-btn roster-sort-btn roster-col-age" data-sort-key="age" style="${buttonStyle}">Age${getSortIcon('age')}</button>
                    <button class="action-btn roster-sort-btn roster-col-checkin" data-sort-key="last_checkin" style="${buttonStyle}">Last<br>Check-In${getSortIcon('last_checkin')}</button>
                </div></div>`;
        }
        juniorClubRosterList.innerHTML = headerHTML;

        uniqueRoster.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'roster-item';
            li.dataset.rosterIndex = index;
            const nameToIndex = item.isParentOnlyView ? item.name : (item.isAllView ? item.childData.name : item.name);
            li.dataset.playerName = nameToIndex; // CRITICAL: Set for indexing

            const lastCheckInDate = item.lastCheckInMs > 0 ? new Date(item.lastCheckInMs).toLocaleDateString('en-ZA') : 'N/A';
            const itemStyle = "min-width: 0;";

            if (item.isParentOnlyView) {
                li.innerHTML = `<div class="roster-row">
                        <span class="roster-col-name" style="font-weight: 700; color: var(--primary-blue); ${itemStyle}">${item.name}</span>
                        <span class="roster-col-contact" style="color: var(--neutral-color); ${itemStyle}">${item.phone}</span>
                        <span class="roster-col-checkin" style="font-size: 0.85em; color: var(--neutral-color); font-weight: 500; ${itemStyle}">${lastCheckInDate}</span>
                    </div>`;
            } else if (item.isAllView) {
                li.innerHTML = `<div class="roster-row">
                        <div class="roster-col-name" style="display: flex; flex-direction: column; ${itemStyle}">
                            <span style="font-weight: 700; color: var(--primary-blue);">${item.parentName}</span>
                            <span style="font-size: 0.9em; color: var(--dark-text); padding-left: 1rem;">${item.childData.name}</span>
                        </div>
                        <span class="roster-col-gender" style="color: var(--neutral-color); ${itemStyle}">${item.childData.gender}</span>
                        <span class="roster-col-age" style="color: var(--neutral-color); ${itemStyle}">${item.childData.ageDisplay}</span>
                        <span class="roster-col-checkin" style="font-size: 0.85em; color: var(--neutral-color); font-weight: 500; ${itemStyle}">${lastCheckInDate}</span>
                    </div>`;
            } else {
                li.style.padding = '0.8rem 1rem';
                li.innerHTML = `<div class="roster-row">
                        <span class="roster-col-name" style="font-weight: 700; color: var(--dark-text); ${itemStyle}">${item.name}</span>
                        <span class="roster-col-gender" style="color: var(--neutral-color); ${itemStyle}">${item.gender}</span>
                        <span class="roster-col-age" style="color: var(--neutral-color); ${itemStyle}">${item.ageDisplay}</span>
                        <span class="roster-col-checkin" style="font-size: 0.85em; color: var(--neutral-color); font-weight: 500; ${itemStyle}">${lastCheckInDate}</span>
                    </div>`;
            }
            juniorClubRosterList.appendChild(li);
        });

        juniorClubRosterList.querySelectorAll('.roster-sort-btn').forEach(btn => {
            btn.addEventListener('click', handleRosterSortClick);
        });

        // CRITICAL: Setup the index
        setupListWithIndex(indexList, juniorClubRosterList, document.getElementById('junior-club-roster-abc-index'));
    }
    
    // New handler for the radio buttons
    function handleRosterTypeFilterChange(e) {
        state.juniorClub.rosterFilter.type = e.target.value;
        saveState();
        renderJuniorClubRoster();
    }


    // New handler function for sort button clicks (The correct and final version)
    function handleRosterSortClick(e) {
        // Find the button element by traversing up from the click target
        const button = e.target.closest('[data-sort-key]');
        if (!button) return;

        const key = button.dataset.sortKey;
        if (key) {
            if (state.juniorClub.rosterFilter.sortKey === key) {
                state.juniorClub.rosterFilter.sortOrder = state.juniorClub.rosterFilter.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                state.juniorClub.rosterFilter.sortKey = key;
                state.juniorClub.rosterFilter.sortOrder = key === 'name' ? 'asc' : 'desc';
            }
            saveState();
            renderJuniorClubRoster();
        }
    }

    function isChildFieldComplete(group) {
        const childName = group.querySelector('[name="childName"]').value.trim();
        const childSurname = group.querySelector('[name="childSurname"]').value.trim();
        const childDob = group.querySelector('[name="childBirthDate"]').value;
        const childGender = group.querySelector(`input[name^="child-gender"]:checked`);

        return childName.length > 0 && childSurname.length > 0 && !!childDob && !!childGender;
    }

    function checkAndCollapseChild(group) {
        const isComplete = isChildFieldComplete(group);
        group.dataset.complete = isComplete ? 'true' : 'false';
    }


    function validateNewParentForm() {
        const parentName = parentNameInput.value.trim();
        const parentSurname = parentSurnameInput.value.trim();
        const parentPhone = parentPhoneInput.value.trim();
        
        const parentFieldsValid = parentName.length > 0 && parentSurname.length > 0 && parentPhone.length > 0; 
        
        const childGroups = childrenContainer.querySelectorAll('.child-field-group');
        let allChildrenComplete = childGroups.length > 0;
        
        const addChildBtn = document.getElementById('add-child-btn');
        const removeChildBtn = document.getElementById('remove-child-btn-main');
        const lastChildGroup = childGroups.length > 0 ? childGroups[childGroups.length - 1] : null;

        childGroups.forEach((group) => {
            if (!isChildFieldComplete(group)) {
                allChildrenComplete = false;
            }
        });
        
        const parentCollapseTriggered = parentFieldsValid && !state.juniorClub.registrationFlow.parentCollapsed;
        
        if (parentCollapseTriggered) {
            state.juniorClub.registrationFlow.parentCollapsed = true;
            state.juniorClub.registrationFlow.childrenExpanded = true; 
        } else if (!parentFieldsValid) {
            state.juniorClub.registrationFlow.parentCollapsed = false;
        }

        const canAddChild = parentFieldsValid && lastChildGroup && isChildFieldComplete(lastChildGroup);
        
        // --- START OF FIX ---
        // This combined condition handles all states correctly.
        // The button is active (visible and enabled) if there's at least one child AND all child forms are complete.
        const canRemoveChild = childGroups.length > 0 && allChildrenComplete;
        
        removeChildBtn.style.display = canRemoveChild ? 'block' : 'none';
        removeChildBtn.disabled = !canRemoveChild;
        // --- END OF FIX ---

        addChildBtn.style.display = canAddChild ? 'block' : 'none';
        addChildBtn.disabled = !canAddChild;
        
        const isConfirmReady = parentFieldsValid && allChildrenComplete;
        newParentConfirmBtn.disabled = !isConfirmReady;

        if (isConfirmReady) {
            newParentConfirmBtn.style.setProperty('background-color', 'var(--confirm-color)', 'important');
            newParentConfirmBtn.style.setProperty('border-color', 'var(--confirm-color)', 'important');
        } else {
            newParentConfirmBtn.style.setProperty('background-color', 'var(--inactive-color)', 'important');
            newParentConfirmBtn.style.setProperty('border-color', 'var(--inactive-color)', 'important');
        }
        
        renderParentForm(); 
    }

    /**
     * Renders the main Junior Club check-in list, dynamically switching between
     * Parent Name and Child Name display based on state.juniorClub.checkInFilter.displayMode.
     */
    function renderJuniorClubCheckInList() {
        juniorClubList.innerHTML = "";
        
        const displayMode = state.juniorClub.checkInFilter.displayMode;
        
        // --- START OF FIX ---
        // This now correctly gets the list of active juniors from the junior club's state.
        const checkedInPlayerNames = new Set(state.juniorClub.activeChildren.map(c => c.name));
        // --- END OF FIX ---
        
        let finalListItems = [];
        state.juniorClub.parents.forEach(parent => {
            parent.registeredChildren.forEach(child => {
                const childFullName = `${child.name} ${child.surname}`.trim();
                const isCheckedIn = checkedInPlayerNames.has(childFullName);
                
                const age = calculateAge(child.birthDate);
                const gender = child.gender || '?';
                const ageDisplay = age !== null ? `${age}y` : 'N/A';
                
                const item = {
                    parent: parent,
                    childFullName: childFullName,
                    childName: child.name,
                    childSurname: child.surname,
                    childDisplay: `${child.name.split(' ')[0]} (${ageDisplay} ${gender})`,
                    canCheckIn: !isCheckedIn,
                    sortKey: displayMode === 'parent' ? parent.name : child.name,
                };
                finalListItems.push(item);
            });
        });
        
        let renderedList = [];

        if (displayMode === 'parent') {
            // Find all parents who have at least one child available for check-in. This now works correctly.
            const availableParents = state.juniorClub.parents.filter(parent => 
                parent.registeredChildren.some(child => !checkedInPlayerNames.has(`${child.name} ${child.surname}`.trim()))
            ).sort((a, b) => a.name.localeCompare(b.name));
            
            renderedList = availableParents.map(parent => {
                // Find the first child who is NOT checked in to display their details
                const firstAvailableChild = parent.registeredChildren.find(child => !checkedInPlayerNames.has(`${child.name} ${child.surname}`.trim())) || parent.registeredChildren[0];
                
                const age = calculateAge(firstAvailableChild.birthDate);
                const gender = firstAvailableChild.gender || '?';
                const ageDisplay = age !== null ? `${age}y` : 'N/A';
                
                // Count how many children are NOT checked in for this parent
                const availableChildCount = parent.registeredChildren.filter(child => !checkedInPlayerNames.has(`${child.name} ${child.surname}`.trim())).length;
                
                return {
                    parent: parent,
                    primaryDisplay: `${parent.name} ${parent.surname}`,
                    secondaryDisplay: `${firstAvailableChild.name.split(' ')[0]} (${ageDisplay} ${gender})`,
                    childCount: availableChildCount,
                    sortKey: parent.name,
                    canCheckIn: true,
                };
            });
            
        } else { // displayMode === 'child'
            // Filter to show only children who are NOT checked in. This also works correctly now.
            renderedList = finalListItems
                .filter(item => item.canCheckIn)
                .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
                .map(item => ({
                    parent: item.parent,
                    primaryDisplay: `${item.childName} ${item.childSurname}`,
                    secondaryDisplay: `Parent: ${item.parent.name} ${item.parent.surname}`,
                    sortKey: item.sortKey,
                    canCheckIn: true,
                }));
        }

        if (renderedList.length === 0) { 
            const li = document.createElement("li");
            li.style.justifyContent = "center";
            li.style.textAlign = "center";
            li.style.color = "#6c757d";
            li.textContent = "All junior players are currently checked in.";
            juniorClubList.appendChild(li);
        } else {
            renderedList.forEach(item => {
                const parent = item.parent;
                const li = document.createElement("li");
                
                // This logic correctly determines if the parent has ANY child left to check in
                const canCheckIn = parent.registeredChildren.some(child => !checkedInPlayerNames.has(`${child.name} ${child.surname}`.trim()));
                
                const childCountDisplay = (displayMode === 'parent' && item.childCount > 0)
                    ? `${item.childCount} Child${item.childCount === 1 ? '' : 'ren'}`
                    : '';
                
                // Set opacity to 0.5 if no children are available for check-in
                const checkInIcon = canCheckIn
                    ? `<span class="action-icon add" data-parent-id="${parent.id}">+</span>`
                    : `<span class="action-icon" data-parent-id="${parent.id}" style="color: var(--neutral-color); opacity: 0.5;">+</span>`;
                
                const displayContainerStyle = "flex-grow: 1; font-weight: 500; display: flex; flex-direction: column;";

                li.innerHTML = `
                    <span style="${displayContainerStyle}">
                        <span style="font-weight: 500;">${item.primaryDisplay}</span>
                        <span style="font-size: 0.9em; color: #6c757d;">${item.secondaryDisplay}</span>
                    </span>
                    <span style="margin-right: 1rem; color: #6c757d; min-width: 70px; text-align: right;">${childCountDisplay}</span>
                    <span class="action-icon edit" data-parent-id="${parent.id}" title="Edit Parent"><i class="mdi mdi-pencil"></i></span>
                    ${checkInIcon}
                `;
                
                li.dataset.parentId = parent.id;
                li.dataset.playerName = item.primaryDisplay; // CRITICAL: Set for indexing
                juniorClubList.appendChild(li);
            });
        }
        
        // CRITICAL: Setup the index
        const indexList = renderedList.map(item => ({ name: item.primaryDisplay }));
            
        setupListWithIndex(indexList, juniorClubList, document.getElementById('junior-club-abc-index'));

        juniorClubNameFilterGroup.querySelectorAll(`input[name="junior-club-name-filter"]`).forEach(radio => {
            radio.checked = radio.value === displayMode;
        });
    }

    // New wrapper function to update the entire modal display
    function showJuniorClubModal() {
        // Render the list with the current filter settings
        renderJuniorClubCheckInList();
        
        juniorClubModal.classList.remove('hidden');
    }

    // Function to handle filter change
    function handleJuniorClubNameFilterChange(e) {
        state.juniorClub.checkInFilter.displayMode = e.target.value;
        saveState();
        renderJuniorClubCheckInList();
    }

    function showChildSelectionModal(parent) {
        attendingChildrenList.innerHTML = "";
        
        childSelectionModal.dataset.parentId = parent.id;
        document.getElementById('child-selection-title').textContent = `${parent.name} ${parent.surname}'s Children`;

        // NEW: Compile a set of all currently checked-in junior players
        const allCheckedInJuniorNames = new Set([
            ...state.availablePlayers.filter(p => p.isJunior).map(p => p.name),
            ...state.courts.flatMap(c => c.players).filter(p => p.isJunior).map(p => p.name),
            // CRITICAL ADDITION: Include activeChildren from the junior club state
            ...state.juniorClub.activeChildren.map(c => c.name) 
        ]);

        parent.registeredChildren.forEach(child => {
            const li = document.createElement('li');
            // FIX 1: Trim the reconstructed full name string for the checkbox value.
            const childFullName = `${child.name} ${child.surname}`.trim();
            li.innerHTML = `
                <label style="flex-grow: 1; display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" name="attendingChild" value="${childFullName}" data-child-name="${child.name}" style="margin-right: 1rem;">
                    <div style="flex-grow: 1;">
                        <span style="font-weight: 500;">${child.name} ${child.surname}</span>
                    </div>
                </label>
            `;
            attendingChildrenList.appendChild(li);
        });
        
        childSelectionConfirmBtn.disabled = true;
        childSelectionConfirmBtn.textContent = 'Check In (0 Children)';
        
        juniorClubModal.classList.add('hidden');
        childSelectionModal.classList.remove('hidden');
    }

    function registerNewParent() {
        const parentName = formatCase(parentNameInput.value.trim());
        const parentSurname = formatCase(parentSurnameInput.value.trim());
        const parentPhone = parentPhoneInput.value.trim(); // NEW: Capturing phone number
        const newParentId = parentName + parentSurname;
        const currentMode = newParentModal.dataset.mode; // 'edit' or undefined (new)

        // 1. Collect all child data
        const children = [];
        childrenContainer.querySelectorAll('.child-field-group').forEach(group => {
            const childName = formatCase(group.querySelector('[name="childName"]').value.trim());
            const childSurname = formatCase(group.querySelector('[name="childSurname"]').value.trim());
            // NEW: Capturing Birth Date and Gender
            const childBirthDate = group.querySelector('[name="childBirthDate"]').value; 
            const childGender = group.querySelector('input[type="radio"]:checked') ? group.querySelector('input[type="radio"]:checked').value : '?';

            if (childName && childSurname && childBirthDate && childGender) {
                children.push({
                    name: childName,
                    surname: childSurname,
                    gender: childGender, 
                    birthDate: childBirthDate 
                });
            }
        });

        if (children.length === 0) return;

        // 2. Check for duplicate Parent ID during NEW registration
        if (currentMode !== 'edit' && state.juniorClub.parents.some(p => p.id === newParentId)) {
            playCustomTTS("A parent with this name is already registered.");
            return;
        }

        let parentToUpdate = null;
        if (currentMode === 'edit') {
            // In Edit mode, find the original parent entry
            const originalId = newParentModal.dataset.originalParentId || newParentId;
            parentToUpdate = state.juniorClub.parents.find(p => p.id === originalId);
        }

        // 3. Create or Update Parent Object
        if (parentToUpdate) {
            // --- EDIT MODE: Update existing parent ---
            parentToUpdate.name = parentName;
            parentToUpdate.surname = parentSurname;
            parentToUpdate.phone = parentPhone; // NEW: Save phone number
            parentToUpdate.id = newParentId; // Update ID if name changed
            parentToUpdate.registeredChildren = children;
            
            playCustomTTS(`${parentName}'s profile has been successfully updated.`);
        } else {
            // --- NEW REGISTRATION MODE ---
            parentToUpdate = {
                id: newParentId,
                name: parentName,
                surname: parentSurname,
                phone: parentPhone, // NEW: Save phone number
                registeredChildren: children
            };
            state.juniorClub.parents.push(parentToUpdate);
            playCustomTTS(`${parentName} successfully registered.`);
        }

        // 4. Clean up state and UI
        state.juniorClub.parents.sort((a, b) => a.name.localeCompare(b.name));

        // Restore default modal state for next use
        newParentModal.classList.add('hidden');
        newParentModal.querySelector('h3').textContent = 'New Parent Registration';
        newParentModal.dataset.mode = '';
        newParentConfirmBtn.textContent = 'Confirm Registration';
        parentNameInput.value = '';
        parentSurnameInput.value = '';
        parentPhoneInput.value = ''; // NEW: Clear phone input
        childrenContainer.innerHTML = ''; // Ensure container is empty
        document.getElementById('parent-collapsed-display').innerHTML = '';
        // CRITICAL FIX: Reset the flow state here as well to ensure renderParentForm starts clean next time.
        state.juniorClub.registrationFlow = {
            parentCollapsed: false,
            childrenExpanded: false,
        };
        // 5. If it was a NEW registration, proceed to check-in. If it was an EDIT, return to the main list.
        if (currentMode === 'edit') {
            showJuniorClubModal(); // Show the main list again
        } else {
            // --- MODIFIED: CALL showJuniorClubModal() to force list render ---
            showChildSelectionModal(parentToUpdate); // Now forces a render of the parent list
            // No call to showChildSelectionModal here.
        }
        
        saveState();
    }

    function showRemoveChildSelectionModal() {
        const childGroups = childrenContainer.querySelectorAll('.child-field-group');
        if (childGroups.length <= 1) return; // Should be disabled if only one remains

        childrenForRemovalList.innerHTML = '';
        removeChildSelectionModal.dataset.selectedGroups = '';

        childGroups.forEach((group, index) => {
            const groupId = group.dataset.groupId;
            const childName = group.querySelector('[name="childName"]').value.trim();
            const childSurname = group.querySelector('[name="childSurname"]').value.trim();
            const displayName = childName || childSurname ? `${childName} ${childSurname}`.trim() : `Child ${index + 1} (Empty)`;

            const li = document.createElement('li');
            li.innerHTML = `
                <label style="flex-grow: 1; display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" name="childToRemove" value="${groupId}" style="margin-right: 1rem;">
                    <div style="flex-grow: 1;">
                        <span style="font-weight: 500;">${displayName}</span>
                    </div>
                </label>
            `;
            childrenForRemovalList.appendChild(li);
        });

        // Reset Confirm button state
        removeChildSelectionConfirmBtn.disabled = true;
        removeChildSelectionConfirmBtn.textContent = 'Remove Selected (0 Children)';
        
        newParentModal.classList.add('hidden');
        removeChildSelectionModal.classList.remove('hidden');
    }

    function executeRemoveSingleChild() {
        const groupId = cancelConfirmModal.dataset.childGroupId;
        const groupToRemove = document.querySelector(`.child-field-group[data-group-id="${groupId}"]`);
        if (groupToRemove) {
            groupToRemove.remove();
        }

        // If that was the last child, add a new empty form to start over
        if (childrenContainer.querySelectorAll('.child-field-group').length === 0) {
            generateChildField();
        }

        cancelConfirmModal.classList.add("hidden");
        newParentModal.classList.remove('hidden'); // Re-show the parent registration form
        validateNewParentForm();
        resetConfirmModal();
    }

    // --- NEW FUNCTION: Executes the removal of selected child fields ---
    function executeRemoveChild() {
        const selectedIds = Array.from(childrenForRemovalList.querySelectorAll('input[name="childToRemove"]:checked')).map(cb => cb.value);

        if (selectedIds.length === 0) return;

        selectedIds.forEach(id => {
            const groupToRemove = document.querySelector(`.child-field-group[data-group-id="${id}"]`);
            if (groupToRemove) {
                groupToRemove.remove();
            }
        });
        
        // --- START OF FIX ---
        // After removal, check if any child groups are left.
        const remainingChildGroups = childrenContainer.querySelectorAll('.child-field-group').length;
        if (remainingChildGroups === 0) {
            // If no children are left, automatically add a new, empty child field.
            generateChildField();
        }
        // --- END OF FIX ---

        removeChildSelectionModal.classList.add('hidden');
        newParentModal.classList.remove('hidden');
        validateNewParentForm();
    }
    


    // New Parent Modal: Handle the main Remove Child button click
    document.getElementById('remove-child-btn-main').addEventListener('click', () => {
        const childGroups = childrenContainer.querySelectorAll('.child-field-group');
        
        if (childGroups.length > 1) {
            // If more than one child exists, show the selection modal as before.
            showRemoveChildSelectionModal();
        } else if (childGroups.length === 1) {
            // --- NEW LOGIC ---
            // If exactly one child exists, show a direct confirmation prompt.
            const childToRemove = childGroups[0];
            const childName = childToRemove.querySelector('[name="childName"]').value.trim() || 'this child';
            
            cancelConfirmModal.querySelector("h3").textContent = "Confirm Removal";
            cancelConfirmModal.querySelector("p").textContent = `Are you sure you want to remove ${childName}?`;
            modalBtnYesConfirm.textContent = "Confirm";
            modalBtnNo.textContent = "Close";
            
            // Set a new mode for our confirmation logic
            cancelConfirmModal.dataset.mode = "removeSingleChild";
            cancelConfirmModal.dataset.childGroupId = childToRemove.dataset.groupId;
            
            newParentModal.classList.add('hidden'); // Hide the parent form temporarily
            cancelConfirmModal.classList.remove("hidden"); // Show the confirmation
        }
    });

    // Remove Child Selection Modal Listeners
    removeChildSelectionBackBtn.addEventListener('click', () => {
        removeChildSelectionModal.classList.add('hidden');
        newParentModal.classList.remove('hidden');
    });

    removeChildSelectionConfirmBtn.addEventListener('click', executeRemoveChild);

    // Update Confirm button on selection change
    childrenForRemovalList.addEventListener('change', () => {
        const checkedCount = childrenForRemovalList.querySelectorAll('input[name="childToRemove"]:checked').length;
        const isReady = checkedCount > 0;
        
        removeChildSelectionConfirmBtn.disabled = !isReady;
        removeChildSelectionConfirmBtn.textContent = `Remove Selected (${checkedCount} Child${checkedCount === 1 ? '' : 'ren'})`;
        
        // --- START OF RESTRUCTURED CODE ---
        if (isReady) {
            // When ready, style as a white button with blue text and border
            removeChildSelectionConfirmBtn.style.setProperty('background-color', 'white', 'important');
            removeChildSelectionConfirmBtn.style.setProperty('color', 'var(--primary-blue)', 'important');
            removeChildSelectionConfirmBtn.style.setProperty('border', '2px solid var(--primary-blue)', 'important');
        } else {
            // When disabled, revert to a neutral grey style
            removeChildSelectionConfirmBtn.style.setProperty('background-color', 'var(--neutral-color)', 'important');
            removeChildSelectionConfirmBtn.style.setProperty('color', 'white', 'important');
            removeChildSelectionConfirmBtn.style.setProperty('border', '2px solid var(--neutral-color)', 'important');
        }
        // --- END OF RESTRUCTURED CODE ---
    });


    function handleChildSelectionConfirm() {
        const parentId = childSelectionModal.dataset.parentId;
        const parent = state.juniorClub.parents.find(p => p.id === parentId);
        
        if (!parent) return;

        const attendingCheckboxes = attendingChildrenList.querySelectorAll('input[name="attendingChild"]:checked');
        const attendingChildrenNames = Array.from(attendingCheckboxes).map(cb => cb.value);

        if (attendingChildrenNames.length === 0) return; 

        const attendingChildren = parent.registeredChildren
            .filter(child => attendingChildrenNames.includes(`${child.name} ${child.surname}`.trim()))
            .map(child => ({
                name: `${child.name} ${child.surname}`.trim(), 
                gender: child.gender,
                guest: true,
                isJunior: true, 
                parentName: parent.name + ' ' + parent.surname
            }));
        
        const allCheckedInNames = new Set([
            ...state.availablePlayers.map(p => p.name),
            ...state.courts.flatMap(c => c.players).map(p => p.name),
            ...state.juniorClub.activeChildren.map(c => c.name),
        ]);

        const newChildren = attendingChildren.filter(c => !allCheckedInNames.has(c.name));
        
        if (newChildren.length === 0) {
            playCustomTTS("All selected children are already checked in.");
            childSelectionModal.classList.add('hidden');
            showJuniorClubModal(); // Show the main junior list again
            return;
        }
        
        state.juniorClub.activeChildren.push(...newChildren);

        const newHistoryEntry = {
            id: Date.now(),
            parentId: parent.id,
            parentName: `${parent.name} ${parent.surname}`,
            childNames: newChildren.map(c => c.name),
            date: new Date().toISOString().split('T')[0],
            isPaid: false, 
        };
        state.juniorClub.history.push(newHistoryEntry);
        
        // --- START OF CHANGE ---
        // The following block that pushes children to the main availablePlayers list has been removed.
        // --- END OF CHANGE ---

        childSelectionModal.classList.add('hidden');
        
        const numCheckedIn = newChildren.length;
        const childString = numCheckedIn === 1 ? 'child' : 'children';
        playCustomTTS(`${numCheckedIn} ${childString} checked in for ${parent.name}.`);
        
        // Refresh the junior club list to show the updated check-in status
        showJuniorClubModal(); 
        saveState();
    }

    function formatChildNames(childNames) {
        return childNames.join(', ');
    }

    function showJuniorClubStatsModal() {
        juniorClubModal.classList.add('hidden');
        juniorClubStatsModal.classList.remove('hidden');
        
        // Reset the 'details' button state
        juniorClubStatsDetailsBtn.disabled = true;
        juniorClubStatsDetailsBtn.style.backgroundColor = 'var(--inactive-color)';
        
        // Render the list based on the current filter settings
        renderJuniorClubHistory();
    }

    function renderJuniorClubHistory() {
        juniorClubHistoryList.innerHTML = '';
        
        const filter = state.juniorClub.statsFilter.paid;
        
        const filterGroup = document.getElementById('payment-filter-group');
        if (filterGroup) {
            filterGroup.querySelectorAll(`input[name="payment-filter"]`).forEach(radio => {
                radio.checked = radio.value === filter;
            });
        }

        const filteredHistory = state.juniorClub.history.filter(entry => {
            if (filter === 'all') return true;
            if (filter === 'paid') return entry.isPaid === true;
            if (filter === 'unpaid') return entry.isPaid === false;
            return true;
        }).sort((a, b) => b.id - a.id);

        // --- NEW LOGIC FOR ABC INDEXING ---
        const indexList = filteredHistory.map(entry => ({ name: entry.parentName }));

        if (filteredHistory.length === 0) {
            document.getElementById('junior-club-history-abc-index').innerHTML = '';
            juniorClubHistoryList.innerHTML = '<li class="waiting-message">No history matches the current filter.</li>';
            return;
        }

        filteredHistory.forEach(entry => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.dataset.entryId = entry.id;
            // CRITICAL: Set for indexing
            li.dataset.playerName = entry.parentName;

            const paymentStatusText = entry.isPaid ? 'Paid' : 'Unpaid';
            const paymentStatusClass = entry.isPaid ? 'paid' : 'unpaid';
            
            const childNamesStr = entry.childNames.join(', ');
            const date = new Date(entry.id).toLocaleDateString('en-ZA');

            // --- THIS IS THE NEW, CLEANER HTML STRUCTURE ---
            li.innerHTML = `
                <div style="display: flex; flex-direction: column; flex-grow: 1; min-width: 0;">
                    <span style="font-weight: 500; color: var(--dark-text);">${entry.parentName}</span>
                    <span style="font-weight: 400; color: var(--dark-text); font-size: 0.95em; padding-left: 1rem;">${childNamesStr}</span>
                </div>
                <div style="text-align: right; flex-shrink: 0; margin-left: 1rem;">
                    <span class="payment-status ${paymentStatusClass}">${paymentStatusText}</span>
                    <br>
                    <span style="font-size: 0.85em; color: var(--neutral-color);">${date}</span>
                </div>
            `;
            // --- END OF NEW STRUCTURE ---

            juniorClubHistoryList.appendChild(li);
        });

        // CRITICAL: Setup the index
        setupListWithIndex(indexList, juniorClubHistoryList, document.getElementById('junior-club-history-abc-index'));
    }
    
    function updateDateDisplay(inputElement) {
        const displayId = `date-display-${inputElement.id.split('-').pop()}`;
        const displayElement = document.getElementById(displayId);
        if (!displayElement) return;

        const mask = "YYYY/MM/DD";
        const cleanValue = inputElement.value.replace(/\D/g, ''); // Raw numbers (e.g., "202510")
        let formattedValue = '';
        let valueIndex = 0;

        for (let i = 0; i < mask.length; i++) {
            if (valueIndex >= cleanValue.length) {
                // If out of numbers, show the rest of the mask as a faint placeholder
                formattedValue += `<span class="date-placeholder">${mask.substring(i)}</span>`;
                break;
            }
            
            if (mask[i].match(/[YMD]/)) {
                formattedValue += cleanValue[valueIndex];
                valueIndex++;
            } else {
                // Automatically add the '/' separator
                if (cleanValue.length > valueIndex) {
                    formattedValue += mask[i];
                } else {
                    formattedValue += `<span class="date-placeholder">${mask.substring(i)}</span>`;
                    break;
                }
            }
        }
        
        displayElement.innerHTML = formattedValue;
    }

    function handleDateInput(currentFormattedValue, key) {
        let rawNumbers = (currentFormattedValue || '').replace(/\D/g, '');

        if (key === 'backspace') {
            rawNumbers = rawNumbers.slice(0, -1);
        } else if (key === 'clear') {
            rawNumbers = '';
        } else if (key.match(/[0-9]/) && rawNumbers.length < 8) {
            rawNumbers += key;
        }

        let formatted = rawNumbers;
        if (rawNumbers.length > 4) {
            formatted = `${rawNumbers.slice(0, 4)}/${rawNumbers.slice(4)}`;
        }
        if (rawNumbers.length > 6) {
            formatted = `${formatted.slice(0, 7)}/${rawNumbers.slice(7)}`;
        }
        return formatted;
    }

    function handleJuniorClubHistoryClick(e) {
        const li = e.target.closest('.history-item');
        if (!li) return;

        // Deselect all others
        juniorClubHistoryList.querySelectorAll('.history-item').forEach(item => {
            item.style.backgroundColor = 'transparent';
        });
        
        // Select the clicked one
        li.style.backgroundColor = '#f1f1f1';
        
        // Store the selected entry ID
        juniorClubStatsModal.dataset.selectedEntryId = li.dataset.entryId;
        
        // Enable button
        juniorClubStatsDetailsBtn.disabled = false;
        juniorClubStatsDetailsBtn.style.backgroundColor = 'var(--confirm-color)';
        juniorClubStatsDetailsBtn.style.borderColor = 'var(--confirm-color)';
    }

    function renderParentForm() {
        const { parentCollapsed, childrenExpanded } = state.juniorClub.registrationFlow;
        
        const parentFieldsEl = document.getElementById('parent-fields');
        const parentCollapseEl = document.getElementById('parent-collapsed-display');
        
        if (parentCollapseEl) {
            parentCollapseEl.classList.toggle('hidden', !parentCollapsed);
        }

        if (parentCollapsed) {
            const name = parentNameInput.value.trim();
            const surname = parentSurnameInput.value.trim();
            const phone = parentPhoneInput.value.trim();
            
            parentCollapseEl.innerHTML = `
                <span class="collapsed-title">Parent: ${name} ${surname}</span>
                <span class="collapsed-detail">Phone: ${phone || 'N/A'}</span>
                <i class="mdi mdi-pencil edit-icon"></i>
            `;
            
            parentFieldsEl.style.display = 'none'; 
            
        } else {
            parentFieldsEl.style.display = 'block'; 
        }
        
        const childrenHeader = newParentModal.querySelector('h4');
        const childrenContainerWrapper = document.getElementById('children-container-wrapper'); 
        
        childrenHeader.classList.toggle('hidden', !childrenExpanded);
        childrenContainerWrapper.style.display = childrenExpanded ? 'block' : 'none';
        
        // The incorrect logic that was here has been removed.
        
        if (childrenExpanded) {
            renderChildFields();
        }

        if (parentCollapseEl && !parentCollapseEl.dataset.listenerBound) {
            parentCollapseEl.addEventListener('click', () => {
                state.juniorClub.registrationFlow.parentCollapsed = false;
                renderParentForm();
            });
            parentCollapseEl.dataset.listenerBound = true;
        }

        // validateNewParentForm() is no longer called here to prevent an infinite loop.
        // It is the function that calls this one.
    }

    // NEW FUNCTION: Renders each individual child field group (called by renderParentForm)
    function renderChildFields() {
        const childGroups = childrenContainer.querySelectorAll('.child-field-group');
        childGroups.forEach((group, index) => {
            const isComplete = group.dataset.complete === 'true';
            const childName = group.querySelector('[name="childName"]').value.trim();
            const childSurname = group.querySelector('[name="childSurname"]').value.trim();
            const childDob = group.querySelector('[name="childBirthDate"]').value;
            const childGender = group.querySelector(`input[name^="child-gender"]:checked`)?.value;
            const childAge = calculateAge(childDob);

            const collapsedDisplay = group.querySelector('.child-collapsed-display');
            const expandedFields = group.querySelector('.child-expanded-fields');

            if (collapsedDisplay) {
                // Collapsed display is shown when complete
                collapsedDisplay.classList.toggle('hidden', !isComplete);
            }
            if (expandedFields) {
                // CRITICAL FIX: Explicitly set display property to guarantee hiding
                if (isComplete) {
                    expandedFields.style.display = 'none';
                } else {
                    expandedFields.style.display = 'block';
                }
            }
            
            if (isComplete && collapsedDisplay) {
                const genderDisplay = childGender === 'M' ? 'Male' : 'Female';
                const ageDisplay = childAge !== null ? `${childAge}y` : 'N/A';
                
                collapsedDisplay.innerHTML = `
                    <span class="collapsed-title">${childName} ${childSurname}</span>
                    <span class="collapsed-detail">${ageDisplay} (${genderDisplay})</span>
                    <i class="mdi mdi-pencil edit-icon"></i>
                `;
            }
            
            // Add listener to the collapsed area to re-expand on click (only bind once)
            // This listener must be rebound/checked here because renderChildFields is called frequently.
            const editIcon = collapsedDisplay.querySelector('.edit-icon');
            if (editIcon && !collapsedDisplay.dataset.listenerBound) {
                 collapsedDisplay.addEventListener('click', (e) => {
                    // Only re-expand if the click is on the collapsed area or the icon
                    if (e.target.closest('.collapsed-area') || e.target.closest('.edit-icon')) {
                        group.dataset.complete = 'false';
                        renderChildFields();
                    }
                });
                collapsedDisplay.dataset.listenerBound = true;
            }
        });

        validateNewParentForm(); // Always revalidate buttons
    }


    // MODIFIED: Entry point for the New Parent Modal
    function showNewParentModal() {
        juniorClubModal.classList.add('hidden');
        newParentModal.classList.remove('hidden');
        
        // Reset/Initialize the form flow state
        state.juniorClub.registrationFlow = {
            parentCollapsed: false,
            childrenExpanded: false, // Starts collapsed
        };
        
        // --- AGGRESSIVE FIELD CLEARING ---
        childrenContainer.innerHTML = '';
        parentNameInput.value = '';
        parentSurnameInput.value = '';
        parentPhoneInput.value = ''; 
        // Clear the collapsed display element's content as well
        document.getElementById('parent-collapsed-display').innerHTML = '';
        
        // CRITICAL FIX: Ensure Parent Fields start visible, and Children start hidden
        document.getElementById('parent-fields').style.display = 'block'; // Ensures expanded fields are visible
        document.getElementById('children-container-wrapper').style.display = 'none'; // Ensures children start hidden
        
        // Add the first child field immediately
        generateChildField(); 

        renderParentForm(); // Start the rendering process
    }

    function handlePaymentFilterChange(e) {
        state.juniorClub.statsFilter.paid = e.target.value;
        renderJuniorClubHistory();
        saveState();
    }

    function showJuniorClubDetailModal() {
        const entryId = juniorClubStatsModal.dataset.selectedEntryId;
        const entry = state.juniorClub.history.find(e => e.id == entryId);
        
        if (!entry) return;

        document.getElementById('detail-parent-name').textContent = entry.parentName;
        document.getElementById('detail-date').textContent = new Date(entry.id).toLocaleString('en-ZA');

        document.getElementById('detail-children-list').innerHTML = entry.childNames.map(name => 
            `<li><span>${name}</span></li>`
        ).join('');
        
        updateDetailModalButton(entry);
        
        juniorClubStatsModal.classList.add('hidden');
        juniorClubDetailModal.classList.remove('hidden');
    }

    function updateDetailModalButton(entry) {
        const isPaid = entry.isPaid;
        detailTogglePaidBtn.textContent = isPaid ? 'Mark as Unpaid' : 'Mark as Paid';
        detailTogglePaidBtn.style.backgroundColor = isPaid ? 'var(--cancel-color)' : 'var(--confirm-color)';
    }

    function handleDetailTogglePaid() {
        const entryId = juniorClubStatsModal.dataset.selectedEntryId;
        const entry = state.juniorClub.history.find(e => e.id == entryId);
        
        if (!entry) return;
        
        // Toggle the status
        entry.isPaid = !entry.isPaid;
        
        const isNowPaid = entry.isPaid;
        const childrenNames = entry.childNames;
        const parent = state.juniorClub.parents.find(p => p.id === entry.parentId);
        
        if (isNowPaid) {
            // MARKED AS PAID -> CHECK OUT

            // --- START FIX ---
            // Also remove these children from the activeChildren list to prevent re-check-in issues
            state.juniorClub.activeChildren = state.juniorClub.activeChildren.filter(child => !childrenNames.includes(child.name));
            // --- END FIX ---

            const checkedOutChildren = state.availablePlayers.filter(p => childrenNames.includes(p.name));
            state.availablePlayers = state.availablePlayers.filter(p => !childrenNames.includes(p.name));
            
            if (checkedOutChildren.length > 0) {
                playCustomTTS(`${childrenNames.join(' and ')} checked out due to payment.`);
            } else {
                playCustomTTS(`Payment marked for ${entry.parentName}'s children. They were not currently checked in.`);
            }

        } else {
            // ... (rest of the function for marking as unpaid is correct)
            // MARKED AS UNPAID -> CHECK BACK IN
            if (parent) {
                const checkedInPlayerNames = new Set([
                    ...state.availablePlayers.map(p => p.name),
                    ...state.courts.flatMap(c => c.players).map(p => p.name)
                ]);
                
                const childrenToReCheckIn = [];
                entry.childNames.forEach(childName => {
                    if (!checkedInPlayerNames.has(childName)) {
                        const childDetails = parent.registeredChildren.find(c => `${c.name} ${c.surname}` === childName);
                        
                        if (childDetails) {
                            childrenToReCheckIn.push({
                                name: childName,
                                gender: childDetails.gender || '?',
                                guest: true,
                                isJunior: true,
                                isPaused: false,
                            });
                        } else {
                            childrenToReCheckIn.push({
                                name: childName,
                                gender: '?',
                                guest: true,
                                isJunior: true,
                                isPaused: false,
                            });
                        }
                    }
                });
                
                state.availablePlayers.push(...childrenToReCheckIn);

                if (childrenToReCheckIn.length > 0) {
                    const names = childrenToReCheckIn.map(c => c.name).join(' and ');
                    playCustomTTS(`${names} checked back in as ${entry.parentName}'s session is marked unpaid.`);
                } else {
                    playCustomTTS(`${entry.parentName}'s children are already checked in.`);
                }
            }
        }
        
        updateDetailModalButton(entry);
        playCustomTTS(`${entry.parentName}'s session on ${new Date(entry.id).toLocaleDateString('en-ZA')} marked as ${entry.isPaid ? 'paid' : 'unpaid'}.`);
        saveState();
        renderJuniorClubHistory();
        updateGameModeBasedOnPlayerCount();
        enforceDutyPosition();
        render();
        checkAndPlayAlert(false);
    }

    // --- END JUNIOR CLUB HISTORY & STATS FUNCTIONS ---



     // --- INITIALIZATION ---
     // --- INITIALIZATION ---
    async function initializeApp() {
        try {
            const response = await fetch('source/members.csv');
            if (!response.ok) {
                throw new Error('Could not load member list from members.csv.');
            }
            const csvText = await response.text();
            MASTER_MEMBER_LIST = parseCSV(csvText);

            // Now that we have the member list, we can proceed
            loadState(MASTER_MEMBER_LIST);
            state.clubMembers = [...MASTER_MEMBER_LIST].sort((a, b) => a.name.localeCompare(b.name));
            updateGameModeBasedOnPlayerCount();
            autoAssignCourtModes();
            render();
            
            // CRITICAL FIX: Ensure animations are restored on page load if a selection is active.
            setTimeout(ensureCourtSelectionAnimation, 50);

            updateNotificationIcons();
            applyFontSize();
            applyDisplaySize();
            fetchWeather();
            updateLightIcon();
            
            if (!state.pongAnimationOffset) {
                state.pongAnimationOffset = Date.now();
            }

            // START 1-second timers for display updates
            setInterval(() => {
                updateTimers();
                updateAlertStatusTimer();
            }, 1000);

            // Start repeating check for alert condition
            const LOGIC_CHECK_INTERVAL_MS = 10 * 1000;
            checkAndPlayAlert(false);
            setInterval(checkAndPlayAlert, LOGIC_CHECK_INTERVAL_MS);

        } catch (error) {
            console.error('Failed to initialize application:', error);
            alert('Error: Could not load master member list. Please ensure "public/source/members.csv" exists and is formatted correctly. The application cannot start.');
        }
    }

    initializeApp();


    function populateReturningGuestModal() {
        const returningGuestList = document.getElementById('returning-guest-list');
        returningGuestList.innerHTML = "";

        // --- THIS IS THE NEW LOGIC (Mirrors the fix in the other function) ---
        const checkedInPlayerNames = new Set([
            ...state.availablePlayers.map(p => p.name),
            ...state.courts.flatMap(c => c.players).map(p => p.name)
        ]);

        const availableGuests = state.guestHistory.filter(g => !checkedInPlayerNames.has(g.name));
        // --- END OF NEW LOGIC ---

        if (availableGuests.length === 0) {
            const li = document.createElement("li");
            li.textContent = "All previous guests are checked in or there is no guest history.";
            li.style.justifyContent = "center";
            returningGuestList.appendChild(li);
        } else {
            availableGuests.sort((a, b) => a.name.localeCompare(b.name));
            availableGuests.forEach(guest => {
                const li = document.createElement("li");
                const visits = guest.daysVisited || 1;
                const plural = visits === 1 ? '' : 's';
                li.innerHTML = `
                    <div style="display: flex; flex-direction: column; flex-grow: 1;">
                        <span>${guest.name}</span>
                        <span style="font-size: 0.8em; color: #6c757d;">${visits} visit${plural}</span>
                    </div>
                    <span style="margin-right: 1rem; color: #6c757d;">${guest.gender}</span>
                    <span class="action-icon add" data-player="${guest.name}">+</span>
                `;
                li.dataset.playerName = guest.name;
                returningGuestList.appendChild(li);
            });
        }
        setupListWithIndex(availableGuests, returningGuestList, document.getElementById('returning-guest-abc-index'));
    }

    function handleReturningGuestCheckIn(playerName) {
        const guestData = state.guestHistory.find(g => g.name === playerName);
        if (!guestData) return;

        const today = new Date().toISOString().split('T')[0];
        
        // Only increment daysVisited if it's their first check-in of the day
        if (guestData.lastCheckIn !== today) {
            guestData.daysVisited = (guestData.daysVisited || 0) + 1;
            guestData.lastCheckIn = today;
        }

        const playerObject = { ...guestData, isPaused: false };
        state.availablePlayers.push(playerObject);

        document.getElementById('returning-guest-modal').classList.add('hidden');
        checkInModal.classList.add('hidden');
        updateGameModeBasedOnPlayerCount();
        autoAssignCourtModes();
        render();
        saveState();
        checkAndPlayAlert(false);
    }   


// BIND ALL INITIAL DOM LISTENERS
    
    updateOverlaySpacers();
    window.addEventListener('resize', setPlayerListHeight);
    modeDoublesBtn.addEventListener("click",()=>handleModeChange("doubles"));
    modeSinglesBtn.addEventListener("click",()=>handleModeChange("singles"));
    availablePlayersList.addEventListener("click",handlePlayerClick);
    courtGrid.addEventListener("click",handleCourtGridClick);
    modalConfirmBtn.addEventListener("click",handleModalConfirm);
    modalCancelBtn.addEventListener("click",()=>{
        const openedFrom = chooseTeamsModal.dataset.openedFrom;
        const courtId = chooseTeamsModal.dataset.courtId;
        chooseTeamsModal.classList.add("hidden");
        delete chooseTeamsModal.dataset.openedFrom; // Clean up context

        if (openedFrom === 'endgame' && courtId) {
            // If cancelling from the end game flow, restore the end game button animation
            const courtCardEl = document.querySelector(`.court-card[data-court-id="${courtId}"]`);
            const button = courtCardEl ? courtCardEl.querySelector('.end-game-ball') : null;
            if (button) {
                // Reset the button's state and re-apply the appear animation
                button.classList.remove('hide-anim', 'animate-in');
                setTimeout(() => {
                    button.classList.add('animate-in');
                }, 50);
            }
        }
    });
    modalPlayerList.addEventListener("click",handleModalPlayerClick);
    historyBtn.addEventListener("click",()=>{state.historyViewMode='games'; renderHistory(); historyPage.classList.remove("hidden")});
    historyCloseBtn.addEventListener("click",()=>historyPage.classList.add("hidden"));
    historyToggleViewBtn.addEventListener("click",()=>{state.historyViewMode="games"===state.historyViewMode?"stats":"games";renderHistory();saveState()});
    checkInBtn.addEventListener("click",()=>{populateCheckInModal(),checkInModal.classList.remove("hidden")});
    checkInCancelBtn.addEventListener("click",()=>checkInModal.classList.add("hidden"));
    
    document.getElementById('end-game-skip-btn').addEventListener('click', handleSkipButtonClick);
    document.getElementById('reset-app-btn').addEventListener('click', handleResetAppClick);

    // --- REVISED GLOBAL CLICK LISTENER FOR ALL CARD TOGGLES ---
    document.addEventListener('click', (e) => {
        const toggleButton = e.target.closest('.summary-toggle-btn');
        if (!toggleButton) return;

        const cardType = toggleButton.dataset.cardType;
        const courtId = toggleButton.dataset.courtId;
        let stateChanged = false;

        // Find the parent card element
        const cardElement = toggleButton.closest('.court-card, .summary-card, #availablePlayersSection');
        if (!cardElement) return;

        // Find the icon to toggle
        const icon = toggleButton.querySelector('i');

        // Toggle the visual state directly in the DOM
        cardElement.classList.toggle('is-collapsed');
        if (icon) {
            icon.classList.toggle('mdi-chevron-up');
            icon.classList.toggle('mdi-chevron-down');
        }

        // Update the application's internal state so it's remembered
        if (cardType === 'summary') {
            state.mobileControls.isSummaryExpanded = !state.mobileControls.isSummaryExpanded;
            stateChanged = true;
        } else if (cardType === 'players') {
            state.mobileControls.isPlayersExpanded = !state.mobileControls.isPlayersExpanded;
            stateChanged = true;
        } else if (cardType === 'court' && courtId) {
            const court = state.courts.find(c => c.id === courtId);
            if (court) {
                court.isCollapsed = !court.isCollapsed;
                stateChanged = true;
            }
        }
        
        // Save the new state, but DO NOT call render()
        if (stateChanged) {
            saveState();
        }
    });

    // --- JUNIOR CLUB LISTENERS (Re-added to DOMContentLoaded) ---
   juniorClubBtn.addEventListener('click', () => {
        checkInModal.classList.add('hidden'); 
        checkOutModal.classList.add('hidden');
        showJuniorClubModal(); // Calls the new wrapper function
    });
    juniorClubCloseBtn.addEventListener('click', () => {
        // Aggressively clear the sub-modal state before closing the main modal
        childrenContainer.innerHTML = '';
        parentNameInput.value = '';
        parentSurnameInput.value = '';
        parentPhoneInput.value = ''; 
        document.getElementById('parent-collapsed-display').innerHTML = '';
        
        // Reset flow state before closing
        state.juniorClub.registrationFlow = {
            parentCollapsed: false,
            childrenExpanded: false,
        };
        
        juniorClubModal.classList.add('hidden');
    });


    // New Parent Registration Flow (Corrected Cancel Listener)
    newParentBtn.addEventListener('click', () => {
        // showNewParentModal is called here, which handles all clearing and initial setup
        showNewParentModal(); 
    });

    newParentCancelBtn.addEventListener('click', () => {
        // --- CANCEL ACTION: Aggressively clear all fields and state ---
        childrenContainer.innerHTML = '';
        parentNameInput.value = '';
        parentSurnameInput.value = '';
        parentPhoneInput.value = ''; 
        document.getElementById('parent-collapsed-display').innerHTML = '';
        
        // Reset flow state before closing
        state.juniorClub.registrationFlow = {
            parentCollapsed: false,
            childrenExpanded: false,
        };

        newParentModal.classList.add('hidden');
        juniorClubModal.classList.remove('hidden'); // Return to main junior club list
    });
    newParentConfirmBtn.addEventListener('click', registerNewParent);

    rosterDetailCloseBtn.addEventListener('click', () => {
        rosterDetailModal.classList.add('hidden');
        juniorClubRosterModal.classList.remove('hidden'); // Return to the roster list
    });

    // --- NEW LISTENER: Click delegation for Roster Items ---
    juniorClubRosterList.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.roster-item');
        const sortBtn = e.target.closest('.roster-sort-btn');
        
        // Ignore clicks on the sort buttons
        if (sortBtn) return;
        if (!itemEl) return;
        
        const index = parseInt(itemEl.dataset.rosterIndex, 10);
        const rosterData = juniorClubRosterList.rosterData; // Retrieve stored data
        
        if (rosterData && rosterData[index]) {
            showRosterDetailModal(rosterData[index]);
        }
    });

    // NEW LISTENER: Filter toggle
    if (juniorClubNameFilterGroup) {
        juniorClubNameFilterGroup.addEventListener('change', handleJuniorClubNameFilterChange);
    }

    // New Parent Registration Flow
    newParentBtn.addEventListener('click', () => {
        juniorClubModal.classList.add('hidden');
        newParentModal.classList.remove('hidden');
        childrenContainer.innerHTML = '';
        parentNameInput.value = '';
        parentSurnameInput.value = '';
        addChild();
        validateNewParentForm();
    });
    newParentCancelBtn.addEventListener('click', () => {
        newParentModal.classList.add('hidden');
        juniorClubModal.classList.remove('hidden');
    });
    newParentConfirmBtn.addEventListener('click', registerNewParent);

    // Parent Name Fields
    wireAlphaKeypadToInput(parentNameInput, validateNewParentForm);
    wireAlphaKeypadToInput(parentSurnameInput, validateNewParentForm);
    parentNameInput.addEventListener('input', validateNewParentForm); 
    parentSurnameInput.addEventListener('input', () => {
        // Update the data-autofill-surname attribute on all existing child fields
        const newSurname = parentSurnameInput.value.trim();
        childrenContainer.querySelectorAll('[name="childSurname"]').forEach(input => {
            // Also update the hidden data attribute for the autofill logic
            input.dataset.autofillSurname = newSurname; 
            // Do NOT automatically fill existing child fields unless the user clicks the child name input again
        });
        validateNewParentForm();
    });



    // Child Fields
    addChildBtn.addEventListener('click', addChild);
    newParentModal.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="match-surname"]')) {
            handleMatchSurname(e);
        } else if (e.target.closest('[data-action="remove-child"]')) {
            removeChild(e);
        }
    });

    juniorClubList.addEventListener('click', (e) => {
        const checkInTarget = e.target.closest('.action-icon.add');
        const editTarget = e.target.closest('.action-icon.edit');
        
        const listItem = e.target.closest('li'); 
        if (!listItem) return;

        // --- Logic for the 'Add' (+) button ---
        if (checkInTarget) {
            const parentId = checkInTarget.dataset.parentId;
            const parent = state.juniorClub.parents.find(p => p.id === parentId);
            
            // Proceed only if the parent is found and the button is not disabled
            if (parent && checkInTarget.style.opacity !== '0.5') {
                const displayMode = state.juniorClub.checkInFilter.displayMode;
                
                // If in 'Child Name' view, check in the specific child directly
                if (displayMode === 'child') {
                    const childFullName = listItem.querySelector('span:first-child span:first-child').textContent.trim();
                    const attendingChildren = parent.registeredChildren
                        .filter(child => `${child.name} ${child.surname}`.trim() === childFullName)
                        .map(child => ({
                            name: `${child.name} ${child.surname}`.trim(), 
                            gender: child.gender,
                            guest: true,
                            isJunior: true, 
                            parentName: parent.name + ' ' + parent.surname
                        }));
                    
                    if (attendingChildren.length > 0) {
                        const newChildren = attendingChildren;
                        state.juniorClub.activeChildren.push(...newChildren);

                        const newHistoryEntry = {
                            id: Date.now(),
                            parentId: parent.id,
                            parentName: `${parent.name} ${parent.surname}`,
                            childNames: newChildren.map(c => c.name),
                            date: new Date().toISOString().split('T')[0],
                            isPaid: false, 
                        };
                        state.juniorClub.history.push(newHistoryEntry);
                        
                        playCustomTTS(`${newChildren.length} child checked in for ${parent.name}.`);
                        saveState();
                        renderJuniorClubCheckInList(); // Refresh the list
                        return;
                    }
                }
                
                // If in 'Parent Name' view, show the child selection modal
                showChildSelectionModal(parent);
            }
        } 
        // --- Logic for the 'Edit' (✎) button ---
        else if (editTarget) {
            const parentId = editTarget.dataset.parentId;
            const parentToEdit = state.juniorClub.parents.find(p => p.id === parentId);
            if (parentToEdit) {
                // This now correctly calls the function to open the edit modal
                showEditParentModal(parentToEdit);
            }
        }
    });

    // Child Selection Modal
    childSelectionBackBtn.addEventListener('click', () => {
        childSelectionModal.classList.add('hidden');
        juniorClubModal.classList.remove('hidden');
    });
    childSelectionConfirmBtn.addEventListener('click', handleChildSelectionConfirm);

    // Child Selection validation (updates button text/state)
    attendingChildrenList.addEventListener('change', () => {
        const checkedCount = attendingChildrenList.querySelectorAll('input[name="attendingChild"]:checked').length;
        const isReady = checkedCount > 0;
        
        childSelectionConfirmBtn.disabled = !isReady;
        // --- START OF CHANGE ---
        const childString = checkedCount === 1 ? 'child' : 'children';
        childSelectionConfirmBtn.textContent = `Check In (${checkedCount} ${childString})`;
        // --- END OF CHANGE ---
        childSelectionConfirmBtn.style.backgroundColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)';
        childSelectionConfirmBtn.style.borderColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)';
    });


    // Event Listeners to insert at line 2011
    // Junior Club History/Stats Listeners
    // Event Listeners to insert at line 2011
    // Junior Club History/Stats Listeners
    juniorClubHistoryBtn.addEventListener('click', showJuniorClubStatsModal);
    juniorClubStatsBackBtn.addEventListener('click', () => {
        juniorClubStatsModal.classList.add('hidden');
        showJuniorClubModal(); // <-- MODIFIED: Ensure list is re-rendered on return
    });
    juniorClubHistoryList.addEventListener('click', handleJuniorClubHistoryClick);
    document.getElementById('payment-filter-group').addEventListener('change', handlePaymentFilterChange);
    juniorClubStatsDetailsBtn.addEventListener('click', showJuniorClubDetailModal);

    // Junior Club Detail Modal Listeners
    detailCloseBtn.addEventListener('click', () => {
        juniorClubDetailModal.classList.add('hidden');
        showJuniorClubStatsModal(); // <-- MODIFIED: Ensure history is re-rendered on return
    });
    detailTogglePaidBtn.addEventListener('click', handleDetailTogglePaid);


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
    modalBtnNo.addEventListener("click", () => {
        const mode = cancelConfirmModal.dataset.mode;
        cancelConfirmModal.classList.add("hidden");

        // Logic to return to the correct modal after cancellation
        if (mode === "checkInPlayer") {
            checkInModal.classList.remove("hidden");
        } else if (mode === "checkOutPlayer") {
            checkOutModal.classList.remove("hidden");
        } else if (mode === "addBallStock" || mode === "returnBallStock" || mode === "signOutBalls") {
            ballManagementModal.classList.remove("hidden");
        } 
        // --- START OF FIX ---
        else if (mode === "removeSingleChild") {
            newParentModal.classList.remove("hidden"); // This correctly returns to the registration form.
        }
        // --- END OF FIX ---

        resetConfirmModal();
    });
    
    // MODIFIED: Yes button now handles check-in/out and the force announcement
    // MODIFIED: Yes button now handles check-in/out and the force announcement
    modalBtnYesConfirm.addEventListener("click", () => {
        const mode = cancelConfirmModal.dataset.mode;

        if (mode === "removeSingleChild") {
            executeRemoveSingleChild();
        } else if (mode === "checkOutPlayer") {
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
        } else if (mode === "addBallStock") {
            executeAddBallStock();
        } else if (mode === "returnBallStock") {
            executeReturnBallStock();
        } else if (mode === "returnUsedBalls") {
            executeUsedBallReturn();
        } else if (mode === "signOutBalls") {
            executeSignOutBalls();
        } else if (mode === "forceAnnouncement") {
            cancelConfirmModal.classList.add("hidden");
            checkAndPlayAlert(true);
            resetConfirmModal();
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
            resetConfirmModal();
        }
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
    document.getElementById('add-new-player-btn').addEventListener("click",()=>{ 
        checkInModal.classList.add('hidden'); 
        guestNameModal.classList.remove('hidden'); 
        guestNameInput.value = ''; 
        guestSurnameInput.value = ''; 
        document.querySelector('input[name="guest-gender"][value="M"]').checked = true;
        validateGuestForm(); 
    });

    document.getElementById('returning-guest-btn').addEventListener("click", () => {
        checkInModal.classList.add('hidden');
        populateReturningGuestModal();
        document.getElementById('returning-guest-modal').classList.remove('hidden');
    });

    document.getElementById('returning-guest-cancel-btn').addEventListener("click", () => {
        document.getElementById('returning-guest-modal').classList.add('hidden');
        checkInModal.classList.remove('hidden');
    });

    document.getElementById('returning-guest-list').addEventListener("click", e => {
        if (e.target.classList.contains("add")) {
            const playerName = e.target.dataset.player;
            handleReturningGuestCheckIn(playerName);
        }
    });
    guestCancelBtn.addEventListener("click",()=>{ guestNameModal.classList.add('hidden'); checkInModal.classList.remove('hidden'); });
    guestConfirmBtn.addEventListener("click", handleGuestCheckIn);
    guestGenderRadios.forEach(radio => radio.addEventListener('change', validateGuestForm));
    const wireNameInputToKeypad = (input) => { input.readOnly = true; input.addEventListener('click', (e) => { showAlphaKeypad(e.target); }); };
    wireNameInputToKeypad(guestNameInput);
    wireNameInputToKeypad(guestSurnameInput);

    adminCloseBtn.addEventListener('click', () => {
        adminSettingsModal.classList.add('hidden');

        // When closing the main admin panel, start the 2-minute session timer.
        if (adminSessionActive) {
            if (adminSessionTimer) clearTimeout(adminSessionTimer); // Reset any existing timer
            adminSessionTimer = setTimeout(() => {
                adminSessionActive = false;
                adminSessionTimer = null;
                // When the timer expires, also close any open court mode overlays.
                state.courts.forEach(c => c.isModeOverlayActive = false);
                render();
                playAlertSound(null, null, 'Alert7.mp3');
            }, 60000); // 1 minutes
        }
    });

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

    // NEW: Parent Phone Input wired to the NUMERIC keypad
    if (parentPhoneInput) {
        wireScoreInputToKeypad(parentPhoneInput); // Correctly wires the numeric keypad
        parentPhoneInput.addEventListener('input', validateNewParentForm);
    }

    // --- ROSTER MODAL LISTENERS ---
    if (juniorClubRosterBtn) {
        juniorClubRosterBtn.addEventListener('click', showJuniorClubRosterModal);
    }
    if (rosterCloseBtn) {
        rosterCloseBtn.addEventListener('click', () => {
            juniorClubRosterModal.classList.add('hidden');
            juniorClubModal.classList.remove('hidden'); // Return to main junior club list
        });
    }
    if (rosterTypeFilterGroup) {
        rosterTypeFilterGroup.addEventListener('change', handleRosterTypeFilterChange);
    }



    // --- WEATHER MODAL LISTENERS ---
    document.getElementById('weather-display').addEventListener('click', () => {
        if (currentWeatherModal) currentWeatherModal.classList.remove('hidden');
    });

    document.getElementById('cw-close-btn').addEventListener('click', () => {
        if (currentWeatherModal) currentWeatherModal.classList.add('hidden');
    });

    document.getElementById('cw-more-details-btn').addEventListener('click', () => {
        if (currentWeatherModal) currentWeatherModal.classList.add('hidden');
        if (detailedWeatherModal) detailedWeatherModal.classList.remove('hidden');
    });

    document.getElementById('dw-close-btn').addEventListener('click', () => {
        if (detailedWeatherModal) detailedWeatherModal.classList.add('hidden');
    });

    // Event Delegation for the Day/Morning/Afternoon tabs
    if (detailedWeatherModal) {
        detailedWeatherModal.addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (tab) {
                state.detailedWeatherView = tab.dataset.view;
                renderDetailedWeatherModal();
            }
        });
    }


    // EVENT LISTENERS FOR SOUND SELECTION
    selectSoundBtn.addEventListener('click', handleSoundSelectionModal);
    soundSelectionList.addEventListener('change', handleSoundSelection);
    soundSelectionList.addEventListener('click', handleSoundPreview);
    soundConfirmBtn.addEventListener('click', confirmSoundSelection);
    soundCancelBtn.addEventListener('click', cancelSoundSelection);

    // EVENT LISTENERS FOR STYLE EDITOR
    editStylesBtn.addEventListener('click', showEditStylesModal);
    editStylesCloseBtn.addEventListener('click', () => {
        editStylesModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');
    });

    // EVENT LISTENER FOR NEW FONT SIZE BUTTONS
    document.getElementById('font-size-selector').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const newSize = parseFloat(e.target.dataset.size);
            handleFontSizeChange(newSize);
        }
    });

    // EVENT LISTENER FOR NEW DISPLAY SIZE BUTTONS
    document.getElementById('display-size-selector').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const newSize = parseFloat(e.target.dataset.size);
            handleDisplaySizeChange(newSize);
        }
    });
    
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

    // EVENT LISTENERS FOR BALL MANAGEMENT (FIXED: Event Delegation)
    ballManagementBtn.addEventListener('click', showBallManagementModal);
    ballManagementCloseBtn.addEventListener('click', () => {
        ballManagementModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');   
    });
    addStockBtn.addEventListener('click', handleAddStock);
    returnStockBtn.addEventListener('click', handleReturnStock);
    returnUsedBallsBtn.addEventListener('click', handleReturnUsedBalls); // <-- ADD THIS LINE
    ballHistoryBtn.addEventListener('click', showBallHistoryModal);
    ballHistoryCloseBtn.addEventListener('click', () => {
        ballHistoryModal.classList.add('hidden');
        ballManagementModal.classList.remove('hidden');
    });

    // Use event delegation for the sign out buttons
    signOutOptions.addEventListener('click', handleSignOut);
    
    // FIX: Individual listener binding to guarantee button functionality
    document.querySelectorAll('.sign-out-btn').forEach(button => {
        // Ensure we don't double-bind if the script is reloaded
        button.removeEventListener('click', handleSignOut);
        button.addEventListener('click', handleSignOut);
    });

    // NEW EVENT LISTENERS FOR SIGN-OUT MEMBER MODAL
    signOutMemberConfirmBtn.addEventListener('click', handleMemberSelectionConfirm);
    signOutMemberCancelBtn.addEventListener('click', () => {
        signOutMemberModal.classList.add('hidden');
        ballManagementModal.classList.remove('hidden');
    });

    // EVENT LISTENERS FOR ADMIN COURT MANAGEMENT

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
            // Corrected: Just add to the temp list. Do NOT modify state.availablePlayers here.
            const playerObject = state.availablePlayers.find(p => p.name === playerName);
            if (playerObject && !adminCourtManagement.addedPlayers.some(p => p.name === playerName)) {
                adminCourtManagement.addedPlayers.push(playerObject);
                renderAddPlayersList(adminCourtManagement.courtId);
            }
        } else if (action === 'undo-add-player-temp') {
            // Corrected: Just remove from the temp list.
            adminCourtManagement.addedPlayers = adminCourtManagement.addedPlayers.filter(p => p.name !== playerName);
            renderAddPlayersList(adminCourtManagement.courtId);
        }
        updateGameModeBasedOnPlayerCount();
        saveState();
    });

    // --- START OF NEW KEYBOARD BINDING LOGIC ---
    document.addEventListener('keydown', (e) => {
        // First, check if the numeric keypad is active
        if (!customKeypadModal.classList.contains('hidden')) {
            e.preventDefault(); // Prevent the key from typing anywhere else

            let targetButton;
            const key = e.key;

            if (key >= '0' && key <= '9') {
                targetButton = customKeypadModal.querySelector(`.keypad-btn[data-key="${key}"]`);
            } else if (key === 'Backspace') {
                targetButton = customKeypadModal.querySelector('.keypad-btn[data-key="backspace"]');
            } else if (key === 'Enter') {
                targetButton = document.getElementById('keypad-confirm-btn');
            } else if (key.toLowerCase() === 'c') { // Allow 'c' for clear
                targetButton = customKeypadModal.querySelector('.keypad-btn[data-key="clear"]');
            }

            // If a corresponding button was found, click it
            if (targetButton && !targetButton.disabled) {
                targetButton.click();
            }
        } 
        // Otherwise, check if the alphabetic keypad is active
        else if (!customAlphaKeypadModal.classList.contains('hidden')) {
            e.preventDefault();

            let targetButton;
            const key = e.key;

            if (key.length === 1 && key.match(/[a-zA-Z]/i)) {
                // Find letter buttons (case-insensitive)
                targetButton = customAlphaKeypadModal.querySelector(`.keypad-btn[data-key="${key.toUpperCase()}"]`);
            } else if (key === ' ') {
                targetButton = customAlphaKeypadModal.querySelector('.keypad-btn[data-key="space"]');
            } else if (key === 'Backspace') {
                targetButton = customAlphaKeypadModal.querySelector('.keypad-btn[data-key="backspace"]');
            } else if (key === 'Enter') {
                targetButton = document.getElementById('alpha-keypad-confirm-btn');
            }

            // If a corresponding button was found, click it
            if (targetButton && !targetButton.disabled) {
                targetButton.click();
            }
        }
    });
    // --- END OF NEW KEYBOARD BINDING LOGIC ---
});

