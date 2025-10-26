document.addEventListener('DOMContentLoaded', () => {

    const ADMIN_PIN_BASE = "0308"; // <-- ADD THIS NEW LINE
    let MASTER_MEMBER_LIST = []; // Will be populated from the CSV file

    // --- NEW HELPER FUNCTION TO PARSE CSV DATA ---
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (!lines[0]) return []; // Handle empty file
        // Updated headers to include 'phonetic spelling'
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i]) continue; // Skip blank lines

            // Split line, handling potential commas within quoted fields if needed (simple split for now)
            const values = lines[i].split(',').map(v => v.trim());

            // --- THIS IS THE FIX: Allow for variable column length ---
            // We expect at least Name, Gender, Type (3 columns).
            // Committee and Phonetic Spelling might be missing or empty.
            if (values.length < 3) continue; // Skip lines with insufficient basic data
            // --- END OF FIX ---

            const entry = {};

            headers.forEach((header, index) => {
                // Ensure we don't try to access an index that doesn't exist
                if (index >= values.length) return;

                const value = values[index];
                if (!value) return; // Skip if the value is empty

                if (header === 'gender') {
                    entry[header] = value.charAt(0).toUpperCase();
                } else if (header === 'phonetic spelling') { // New: Read phonetic spelling
                    entry['phoneticName'] = value; // Store under phoneticName key
                } else if (header === 'guest' || header === 'isPaused') {
                    entry[header] = (value.toLowerCase() === 'true');
                } else {
                    entry[header] = value;
                }
            });


            if (!entry.name) continue; // Skip entries without a name

            // Add the default values that are not in the CSV
            entry.guest = entry.guest || false; // Keep existing guest status if loaded
            entry.isPaused = entry.isPaused || false; // Keep existing pause status
            result.push(entry);
        }
        return result;
    }
    // --- NEW HELPER FUNCTION: Gets the name to use for TTS ---
    // --- UPDATED HELPER FUNCTION: Gets the name to use for TTS (Phonetic First + Surname) ---
    function getPronounceableName(playerName) {
        if (!playerName) return ''; // Handle null or empty input

        // Find the player object in the master list or current state
        const playerObj = MASTER_MEMBER_LIST.find(p => p.name === playerName)
                       || state.availablePlayers.find(p => p.name === playerName)
                       || state.courts.flatMap(c => c.players).find(p => p.name === playerName);

        // Extract surname (assuming name format is "FirstName LastName" or similar)
        const nameParts = playerName.split(' ');
        const surname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''; // Get everything after the first space

        // Use phonetic first name + surname if available, otherwise default to full name
        if (playerObj && playerObj.phoneticName && surname) {
            // Combine phonetic first name with the regular surname
            return `${playerObj.phoneticName} ${surname}`;
        } else if (playerObj && playerObj.phoneticName) {
            // If only a phonetic first name exists (maybe single-name entry?), use just that
            return playerObj.phoneticName;
        } else {
            // Fallback to the full original name if no phonetic spelling exists
            return playerName;
        }
    }
    // --- END UPDATED HELPER ---
    // --- END NEW HELPER ---

    
    // Define the preferred court hierarchy
    const COURT_HIERARCHY = ['B', 'C', 'D', 'A', 'E'];

    // --- STATE MANAGEMENT ---


    let state = {

        undoHistory: {
            actions: [], // Array of undo-able actions
            maxHistory: 10 // Keep last 10 actions
        },

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

        // --- NEW: Event Management & Screensaver State ---
        events: [], // Array to hold event objects
        // Structure for each event object:
        // {
        //  id: Date.now(), // Unique ID
        //  eventType: 'Social', // 'Social', 'Club Champs', 'League', 'Other'
        //  heading: '',
        //  eventDate: '', // YYYY-MM-DD
        //  rsvpDate: '',   // YYYY-MM-DD
        //  startTime: '', // HH:MM
        //  body1: '',
        //  body2: '',
        //  costAdult: 0,
        //  costChild: 0,
        //  participationDiscountPercent: 0, // 0-100
        //  rsvpText: '',
        //  volunteersNeeded: false,
        //  contactDetails: '',
        //  openTo: 'All Members', // 'Full Members', 'Social Members', 'All Members'
        //  isOpenToGuests: false,
        //  image1Filename: 'None', // e.g., 'Braai.jpg', 'None'
        //  image2Filename: 'None',
        //  isActive: false, // Controls screensaver visibility
        //  interestedPlayers: [] // Array of player names
        // }
        // --- END: Event Management ---

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
            autoAssignModes: true,
            showGameModeSelector: false // <-- ADD THIS LINE
        },

    // NEW MATCH SETTINGS BLOCK
        matchSettings: {
            matchMode: '1set',    // '1set', '3set', 'fast'
            fastPlayGames: 4,     // 3, 4, or 5
            autoMatchModes: true  // Auto-assign match modes
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

        historySort: {
            key: 'endTime',
            order: 'desc'
        },

        gameHistoryFilter: {
            timeFrame: 'Total', // 'Today', 'Month', 'Year', 'Total'
            gameType: 'all'     // 'all', 'doubles', 'singles'
        },

        guestHistory: [], // NEW: To store guest data
        gameHistory: [],
        reorderHistory: [],
        historyViewMode: 'games',
        statsFilter: {
            gender: 'all',
            teamGender: 'all', // <-- ADD THIS LINE
            sortKey: 'totalDurationMs',
            sortOrder: 'desc'
        },
        // NEW COMPARISON MODAL STATE
        comparison: {
            active: false,
            type: null, // 'player' or 'team'
            items: [], // Names of the two players/teams
            timeFrame: 'Total',
            opponents: new Set() // <-- ADD THIS LINE
        },
        // NEW ANNOUNCEMENT STATE
        announcements: [], // { text: "message", tts: true }
        customAnnouncementState: {
            scheduler: null,
            nextAnnouncementTime: 0,
            currentIndex: 0,
            isPaused: false,
            ttsIntervalMins: 30 // <-- ADD THIS LINE (default is 30 mins)
        },
        powerScoreSort: {
                key: 'finalScore',
                order: 'desc'
            },
        suggestionSettings: {
            femaleRatioPercent: 50,
            maleRatioPercent: 70,
            prioritizeLeastPlaytime: true,
            powerScoreOnly: false,
            // --- NEW SETTINGS ---

            topPlayerPercent: 35,       // Default 35%
            frequentOpponentPercent: 35, // Default 35%
            weakPlayerPercent: 35,      // Default 35%
            weakPlayerThreshold: -0.1,   // Example threshold (lower scores are weaker)
            
            // --- END NEW ---
        },

        currentSuggestionType: null, // Stores the type ('topPlayer', 'frequentOpponent', 'weakPlayer', 'standard')
        currentSuggestionOutcome: null, // Stores the resulting { team1, team2 } object

        adminChecklist: {
            arrival: [
                { id: 'arrUnlockTuckshop', text: 'Unlock Tuckshop & Setup POS', checked: false },
                { id: 'arrUnlockCloakrooms', text: 'Unlock Cloakrooms', checked: false }, // Added
                { id: 'arrMainTv', text: 'Main TV: On & Sport Channel', checked: false },
                { id: 'arrTuckshopTv', text: 'Tuckshop TV: On & Music Videos', checked: false },
                { id: 'arrAmpAux', text: 'Amp: Aux Analog', checked: false }, // Mutually exclusive
                { id: 'arrAmpOptical', text: 'Amp: Optical/Main TV', checked: false }, // Mutually exclusive
                { id: 'arrOpenCurtains', text: 'Open Curtains & Sliding Door', checked: false },
                { id: 'arrPutCushions', text: 'Put Out Bench Cushions', checked: false },
                { id: 'arrSignOutBalls', text: 'Sign Out Social Balls (via Ball Mgmt)', checked: false },
                { id: 'arrEmptyDishwasher', text: 'Empty Dishwasher & Check Dishes', checked: false },
                { id: 'arrCheckFridge', text: 'Check Fridge for Expired Products', checked: false },
                { id: 'arrEmptyBins', text: 'Empty Full Bins & Replace Liners', checked: false },
                { id: 'arrManStation', text: 'Man Duty Station (Busy Times)', checked: false },
                { id: 'arrAssistApp', text: 'Assist Members with App', checked: false },
                { id: 'arrRemindAccounts', text: 'Remind Members re: Tuck Shop Accounts', checked: false }
            ],
            departure: [
                { id: 'depReturnBalls', text: 'Return Social Balls & Sign In (via Ball Mgmt)', checked: false },
                { id: 'depCheckOutApp', text: 'Ensure All Players Checked Out on App', checked: false },
                { id: 'depLoadDishes', text: 'Load/Wash Dishes', checked: false },
                { id: 'depReturnCushions', text: 'Return Bench Cushions', checked: false },
                { id: 'depTurnOffTvAmp', text: 'Turn Off TVs & Amp', checked: false },
                { id: 'depWipeBar', text: 'Wipe Down Bar Counter', checked: false },
                { id: 'depEmptyIceBucket', text: 'Empty & Wash Ice Bucket', checked: false },
                { id: 'depWipeKitchen', text: 'Wipe Down Kitchen Counter', checked: false },
                { id: 'depTrashOut', text: 'Take Inside Trash to Outside Bins', checked: false },
                { id: 'depLockBarStore', text: 'Lock Bar & Storeroom', checked: false },
                { id: 'depCloseCurtains', text: 'Close Sliding Door & Curtains', checked: false },
                { id: 'depLockClubhouseAlarm', text: 'Lock Clubhouse & Set Alarm', checked: false },
                { id: 'depLockCloakrooms', text: 'Lock Cloakrooms', checked: false }, // Added
                { id: 'depLockGates', text: 'Check & Lock Pedestrian Gates', checked: false }
            ]
        },

    checklistHistory: [], // NEW: { date: 'YYYY-MM-DD', checklist: { arrival: [...], departure: [...] } }
    selectedChecklistHistoryDate: null, // NEW

        onDuty: 'None',
        selectedAlertSound: 'Alert1.mp3', // Default sound
        // NEW NOTIFICATION CONTROL STATES
        notificationControls: {
            isMuted: false,        // Mute All Sounds
            isMinimized: false,    // Minimize Notifications (Only initial alert)
            isTTSDisabled: false,   // Turn Off Speech Only
            autoMinimize: true    // <-- ADD THIS NEW LINE
        },
        currentQuoteIndex: 0,
        currentAlertCount: 0, // <-- ADD THIS NEW LINE
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
            shellyBaseUrl: 'https://shelly-180-eu.shelly.cloud/v2/devices/api/set/switch', // Keep this for local fallback base
            shellyAuthKey: 'MzEyNDRhdWlk4A2C89A1B41C12C193A1BF0978CB3C8D7891CD751D3C578EDA094C05D1DB4E618708AE34BCD86240', // Store your actual auth key here
            courts: {
                'A': { id: 'A', label: 'Court A Lights', isManaged: true, isActive: false, shellyDeviceId: '192.168.0.15', shellyCloudId: 'YOUR_COURT_A_CLOUD_ID', toggleAfter: 0 }, // Replace placeholder
                'B': { id: 'B', label: 'Court B Lights', isManaged: true, isActive: false, shellyDeviceId: '192.168.0.147', shellyCloudId: 'YOUR_COURT_B_CLOUD_ID', toggleAfter: 0 }, // Replace placeholder
                'C': { id: 'C', label: 'Court C Lights', isManaged: true, isActive: false, shellyDeviceId: '192.168.0.130', shellyCloudId: 'YOUR_COURT_C_CLOUD_ID', toggleAfter: 0 }, // Replace placeholder
                'D': { id: 'D', label: 'Court D Lights', isManaged: true, isActive: false, shellyDeviceId: '192.168.0.179', shellyCloudId: 'YOUR_COURT_D_CLOUD_ID', toggleAfter: 0 }, // Replace placeholder
                // Court E for testing - Use its actual Cloud ID
                'E': { id: 'E', label: 'Court E Lights', isManaged: true, isActive: false, shellyDeviceId: '192.168.88.74', shellyCloudId: '2cbcbb2fb26c' } // Use the actual Cloud ID here
            },
            general: {
                'clubhouse': { id: 'clubhouse', label: 'Clubhouse Lights', isManaged: true, isActive: false, shellyDeviceId: '192.168.0.100', shellyCloudId: 'YOUR_CLUBHOUSE_CLOUD_ID' } // Replace placeholder
            }
        },

        gateSettings: {
            pedestrian: {
                label: 'Pedestrian Gate',
                shellyCloudId: 'https://shelly-180-eu.shelly.cloud/v2/devices/api/set/switch',  // Device ID for cloud
                shellyDeviceId: '',  // Local IP
                isManaged: false,
                toggleAfter: 1  // 1 second pulse
            },
            parking: {
                label: 'Parking Lot Gate',
                shellyCloudId: 'https://shelly-180-eu.shelly.cloud/v2/devices/api/set/switch',  // Device ID for cloud
                shellyDeviceId: '',  // Local IP
                isManaged: false,
                toggleAfter: 1  // 1 second pulse
            }
        },  

        manualEntry: {
            players: [], // Holds names of players selected for manual entry
        },       

        // NEW BALL MANAGEMENT STATE (ADD THIS BLOCK - Updated to CANS)
        ballManagement: {
            stock: 0, // Total number of CANS
            usedStock: 0, // Total number of USED individual balls
            // History logs the member, category, and number of CANS.
            history: [], // { timestamp, action: 'in' | 'out', category: 'purchase' | 'league' | 'sale', count: CANS, member: name }
            historyFilter: 'all',
            
            // NEW: Temporary state for multi-step sale flow
            tempSale: {
                stockType: null, // 'cans' or 'singles'
                memberSignOut: null, // Name of the committee member who signed out
                purchaserName: null, // Name of the final purchaser
            }
        }
    };

    // Drag & Drop State
    let draggedPlayer = null;
    let draggedFromCourt = null;
    let draggedPlayerPosition = null;
    let dragOverTarget = null;
    let activeDraggablePlayer = null; // Track which player is currently enabled for dragging

    // Track long-press state
    let gateButtonPressTimer = null;
    let gateButtonIsLongPress = false;

    // Undo system - separate from state because functions can't be serialized
    let currentUndoAction = null;
    let currentUndoTimeout = null;
    let localChangeInProgress = false; // Prevent WebSocket from overwriting local changes
    //NEW SLIDE HEADER
    // --- HEADER & TIME OVERLAY SLIDE-DOWN FUNCTIONALITY ---
    let headerTimeout = null;
    const header = document.querySelector('header');
    const timeOverlay = document.getElementById('time-overlay');
    const headerPullTab = document.getElementById('header-pull-tab');
    let touchStartY = 0;
    let isDragging = false;
    let lastScrollY = 0;
    //NEW PAUSE COOLDOWN TIMER
    let cooldownTimerInterval = null;

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

    // --- NEW: Screensaver Variables ---
    let inactivityTimer = null;
    let screensaverCycleInterval = null;
    const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    const SCREENSAVER_INTERVAL_MS = 15 * 1000; // 15 seconds per view (event or app)
    let screensaverCurrentIndex = 0;
    let isShowingScreensaverEvent = true; // Start by showing an event first
    const screensaverOverlay = document.getElementById('screensaver-overlay');
    const screensaverContent = document.getElementById('screensaver-content');
    // --- END: Screensaver Variables ---

    const ANNOUNCEMENT_GRACE_PERIOD_MS = 30 * 1000; // 30 seconds
    const leaderboardConfirmModal = document.getElementById('leaderboard-confirm-modal');
    const disclaimerModal = document.getElementById('disclaimer-modal');

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
    parentPhoneInput.addEventListener('input', function(e) {
        let value = e.target.value;
        
        // Remove leading zero if it's the first character
        if (value.startsWith('0')) {
            e.target.value = value.substring(1);
        }
    });
    const parentEmailInput = document.getElementById('parent-email-input'); // <-- NEW EMAIL INPUT
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

    // TEMPORARY DUTY HANDOVER ELEMENTS
    const tempDutyHandoverModal = document.getElementById('temp-duty-handover-modal');
    const tempDutyHandoverList = document.getElementById('temp-duty-handover-list');
    const tempDutyCurrentMember = document.getElementById('temp-duty-current-member');
    const tempDutyCancelBtn = document.getElementById('temp-duty-cancel-btn');
    const tempDutyConfirmBtn = document.getElementById('temp-duty-confirm-btn');

    // NEW ELEMENTS FOR MANUAL GAME ENTRY
    const manualEntryModal = document.getElementById('manual-entry-modal');
    const manualPlayerList = document.getElementById('manual-player-list');
    const manualEntryConfirmBtn = document.getElementById('manual-entry-confirm-btn');
    const manualEntryCancelBtn = document.getElementById('manual-entry-cancel-btn');
    const addOutsidePlayerBtn = document.getElementById('add-outside-player-btn');
    const outsidePlayerModal = document.getElementById('outside-player-modal');
    const outsidePlayerList = document.getElementById('outside-player-list');
    const outsidePlayerBackBtn = document.getElementById('outside-player-back-btn');
    // ADD THESE TWO LINES
    const manualSelectedPlayersContainer = document.getElementById('manual-selected-players');
    const outsideSelectedPlayersContainer = document.getElementById('outside-selected-players');
    const outsidePlayerConfirmBtn = document.getElementById('outside-player-confirm-btn');
    

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

    // --- NEW GLOBAL KEYBOARD REFERENCES ---
    const globalKeyboardModal = document.getElementById('global-keyboard-modal');
    const globalKeyboardDisplay = document.getElementById('global-keyboard-display');
    const globalKeyboardGrid = document.getElementById('global-keyboard-grid');
    const emojiSearchInput = document.getElementById('emoji-search-input');
    const emojiSearchContainer = document.getElementById('emoji-search-container');
    let activeGlobalInput = null;
    // --- END GLOBAL KEYBOARD REFERENCES ---

    // --- GLOBAL KEYBOARD STATE ---
    let globalKeyboardState = {
        currentPage: 'LetterPad', // 'LetterPad', 'SymbolsP1', 'SymbolsP2', 'NumberPad', 'EmojiPage'
        case: 'lower', // 'lower', 'upper', 'shift'
        longPressTimer: null,
    };
    // --- END GLOBAL KEYBOARD STATE ---

    // --- GLOBAL KEYBOARD DATA ---

    // Keys are mapped to their display text or special action/page codes
    const KEYBOARD_LAYOUTS = {
        'LetterPad': [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'BACK'],
            ['?123', 'GLOBE', 'SPACE', ', / 😀', 'ENTER']
        ],
        'SymbolsP1': [
            ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
            ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'],
            ['ABC', '.', ',', '?', '!', "'", '"', 'BACK'],
            ['1234', 'GLOBE', 'SPACE', '!@#', 'ENTER']
        ],
        'SymbolsP2': [
            ['`', '´', '¨', 'ç', 'ñ', 'æ', 'œ', 'ß', '÷', '¿'],
            ['@', '$', '&', '/', '(', ')', '“', '”', '…', '®'],
            ['ABC', '.', ',', '?', '!', "'", '"', 'BACK'],
            ['?123', 'GLOBE', 'SPACE', '!@#', 'ENTER'] // Note: ?123 maps to SymbolsP1
        ],
        'NumberPad': [ // REPLACED: Redefined to match calculator layout
            // Row 0: %, 1, 2, 3, + (5 keys)
            ['PERCENT', '1', '2', '3', '+'],
            // Row 1: SPACE, 4, 5, 6, - (5 keys)
            ['SPACE', '4', '5', '6', '-'],
            // Row 2: BACK, 7, 8, 9, * (5 keys)
            ['BACK', '7', '8', '9', '*'],
            // Row 3: abc, comma, ?123, 0, =, period, return (7 keys)
            ['ABC', 'COMMA', '?123', '0', '=', 'DOT', 'ENTER']
        ]
    };


    const EMOJI_LIST = [
        // This should be loaded dynamically, but for simplicity, use a sample array
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '😘', '😗', '😙', '😚',
        '😋', '😛', '😜', '🤪', '😝', '🤗', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '🤧', '😩', '😫',
        '😤', '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤯', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮',
        '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😩', '😫', '😴', '🤤', '😪',
        // Add more emojis here...
    ];
    // --- END GLOBAL KEYBOARD DATA ---


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

    // NEW COURT MODE KEYPAD ELEMENTS
    const courtModeKeypadModal = document.getElementById('court-mode-keypad-modal');
    const courtModeKeypadDisplay = document.getElementById('court-mode-keypad-display');
    const courtModeKeypadButtons = courtModeKeypadModal.querySelectorAll('.keypad-btn');
    const courtModeKeypadConfirmBtn = document.getElementById('court-mode-keypad-confirm-btn');
    const courtModeKeypadCancelBtn = document.getElementById('court-mode-keypad-cancel-btn');
    let courtModeAction = null; // To store the action after PIN entry

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

    // NEW ELEMENTS CUSTOM ANNOUNCEMENTS
    const customAnnouncementModal = document.getElementById('custom-announcement-modal');
    const announcementList = document.getElementById('announcement-list');
    const announcementSaveBtn = document.getElementById('announcement-save-btn');
    const announcementCancelBtn = document.getElementById('announcement-cancel-btn');
    const customAnnouncementBtn = document.getElementById('custom-announcement-btn');


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

    // NEW ELEMENTS: Ball History Detail Modal
    const ballHistoryDetailModal = document.getElementById('ball-history-detail-modal');
    const ballDetailContent = document.getElementById('ball-detail-content');
    const detailStockType = document.getElementById('detail-stock-type');
    const detailCategory = document.getElementById('detail-category');
    const detailDatetime = document.getElementById('detail-datetime');
    const detailCount = document.getElementById('detail-count');
    const detailCommitteeMember = document.getElementById('detail-committee-member');
    const detailPurchaser = document.getElementById('detail-purchaser');
    const detailStockBefore = document.getElementById('detail-stock-before');
    const detailStockChange = document.getElementById('detail-stock-change');
    const detailStockAfter = document.getElementById('detail-stock-after');
    const ballDetailCloseBtn = document.getElementById('ball-detail-close-btn');  

    // --- NEW ELEMENTS FOR BALL SALES FLOW ---
    const ballSaleTypeModal = document.getElementById('ball-sale-type-modal');
    const saleTypeCansBtn = document.getElementById('sale-type-cans-btn');
    const saleTypeSinglesBtn = document.getElementById('sale-type-singles-btn');
    const saleTypeCancelBtn = document.getElementById('sale-type-cancel-btn');
    const purchaserSelectionModal = document.getElementById('purchaser-selection-modal');
    const purchaserMemberList = document.getElementById('purchaser-member-list');
    const purchaserSelectionPrompt = document.getElementById('purchaser-selection-prompt');

    const ballHistoryList = document.getElementById('ball-history-list');
    const ballHistoryCloseBtn = document.getElementById('ball-history-close-btn'); 
    const signOutMemberPrompt = document.getElementById('sign-out-member-prompt');

    const cooldownModal = document.getElementById('cooldown-modal');
    const cooldownTimer = document.getElementById('cooldown-timer');
    const cooldownCloseBtn = document.getElementById('cooldown-close-btn');

    // NEW: Comparison Modal Elements
    const comparisonModal = document.getElementById('comparison-modal');
    const comparisonTitle = document.getElementById('comparison-title');
    const comparisonContent = document.getElementById('comparison-content');
    const comparisonFilterContainer = document.getElementById('comparison-filter-container');
    const comparisonCloseBtn = document.getElementById('comparison-close-btn');

    // NEW: Powerscore modal elements
    const powerScoreModal = document.getElementById('power-score-modal');
    const powerScoreList = document.getElementById('power-score-list');
    const powerScoreBtn = document.getElementById('power-score-btn');
    const powerScoreCloseBtn = document.getElementById('power-score-close-btn');


    // NEW ELEMENTS: Suggestion Settings Modal
    const suggestionSettingsBtn = document.getElementById('suggestion-settings-btn');
    const suggestionSettingsModal = document.getElementById('suggestion-settings-modal');
    const suggestionSettingsCloseBtn = document.getElementById('suggestion-settings-close-btn');
    const femaleRatioSlider = document.getElementById('female-ratio-slider');
    const femaleRatioDisplay = document.getElementById('female-ratio-display');
    const maleRatioSlider = document.getElementById('male-ratio-slider');
    const maleRatioDisplay = document.getElementById('male-ratio-display');
    const leastPlaytimeToggle = document.getElementById('least-playtime-toggle');
    const powerScoreOnlyToggle = document.getElementById('power-score-only-toggle');
    const topPlayerSlider = document.getElementById('top-player-slider');
    const topPlayerDisplay = document.getElementById('top-player-display');
    const frequentOpponentSlider = document.getElementById('frequent-opponent-slider');
    const frequentOpponentDisplay = document.getElementById('frequent-opponent-display');
    const weakPlayerSlider = document.getElementById('weak-player-slider');
    const weakPlayerDisplay = document.getElementById('weak-player-display');
    // References to new containers for disabling
    const topPlayerContainer = document.querySelector('.top-player-container');
    const frequentOpponentContainer = document.querySelector('.frequent-opponent-container');
    const weakPlayerContainer = document.querySelector('.weak-player-container');

    // NEW ELEMENTS: Admin Checklist Modal
    const checklistBtn = document.getElementById('checklist-btn');
    const checklistModal = document.getElementById('checklist-modal');
    const checklistList = document.getElementById('checklist-list');
    const checklistCloseBtn = document.getElementById('checklist-close-btn');
    const checklistContent = document.getElementById('checklist-content'); // New container
    const checklistHistoryBtn = document.getElementById('checklist-history-btn');
    const checklistHistoryModal = document.getElementById('checklist-history-modal');
    const checklistHistoryListView = document.getElementById('checklist-history-list-view');
    const checklistHistoryDetailView = document.getElementById('checklist-history-detail-view');
    const checklistHistoryList = document.getElementById('checklist-history-list');
    const checklistHistoryDetail = document.getElementById('checklist-history-detail');
    const checklistHistoryTitle = document.getElementById('checklist-history-title');
    const checklistDetailDate = document.getElementById('checklist-detail-date');
    const checklistHistoryBackBtn = document.getElementById('checklist-history-back-btn');
    const checklistHistoryCloseBtn = document.getElementById('checklist-history-close-btn');
    
    // References to the container elements for fade effect
    const leastPlaytimeContainer = document.querySelector('.least-playtime-toggle-container');
    const femaleRatioContainer = document.querySelector('.female-ratio-container');
    const maleRatioContainer = document.querySelector('.male-ratio-container');



    // --- SLIDE DOWN HEADER ---
    // Auto-hide header (and time overlay) after 3 seconds of no interaction

        function hideHeader() {
            if (window.innerWidth > 900) return; // <-- ADD THIS LINE
            header.classList.add('header-hidden');
            timeOverlay.classList.add('header-hidden'); // Add this line
            clearTimeout(headerTimeout);
        }

        function startHeaderHideTimer() {
            if (window.innerWidth > 900) return; // <-- ADD THIS LINE
            clearTimeout(headerTimeout);
            headerTimeout = setTimeout(hideHeader, 3000); // Correctly calls the function
        }

        // Show header (and time overlay)
        function showHeader() {
            if (window.innerWidth > 900) return; // <-- ADD THIS LINE
            header.classList.remove('header-hidden');
            timeOverlay.classList.remove('header-hidden'); // Add this line
            startHeaderHideTimer();
        }



    // Handle scroll to show/hide header
    let ticking = false;
    function handleScroll() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
                
                // Scrolling up - show header
                if (currentScrollY < lastScrollY) {
                    showHeader();
                }
                // Scrolling down - hide header (after delay)
                else if (currentScrollY > lastScrollY && currentScrollY > 100) {
                    clearTimeout(headerTimeout);
                    headerTimeout = setTimeout(hideHeader, 1000); // Correctly calls the function
                }
                
                lastScrollY = currentScrollY;
                ticking = false;
            });
            ticking = true;
        }
    }

    // Touch/drag functionality for mobile
    function handleTouchStart(e) {
        touchStartY = e.touches[0].clientY;
        isDragging = true;
    }

    function handleTouchMove(e) {
        if (!isDragging) return;
        
        const touchY = e.touches[0].clientY;
        const deltaY = touchY - touchStartY;
        
        // Dragging down from top - show header
        if (deltaY > 50 && touchStartY < 50) {
            showHeader();
            isDragging = false;
        }
    }

    function handleTouchEnd() {
        isDragging = false;
    }

    // Mouse drag functionality for desktop
    let mouseStartY = 0;
    let isMouseDragging = false;

    function handleMouseDown(e) {
        mouseStartY = e.clientY;
        isMouseDragging = true;
    }

    function handleMouseMove(e) {
        if (!isMouseDragging) return;
        
        const mouseY = e.clientY;
        const deltaY = mouseY - mouseStartY;
        
        // Dragging down from top - show header
        if (deltaY > 50 && mouseStartY < 50) {
            showHeader();
            isMouseDragging = false;
        }
    }

    function handleMouseUp() {
        isMouseDragging = false;
    }

    // Pull tab click
    if (headerPullTab) {
        headerPullTab.addEventListener('click', showHeader);
    }

    // Header mouse enter - keep visible
    if (header) {
        header.addEventListener('mouseenter', () => {
            clearTimeout(headerTimeout);
            header.classList.remove('header-hidden');
        });
        
        header.addEventListener('mouseleave', startHeaderHideTimer);
    }

    // Time overlay mouse enter - keep visible
    if (timeOverlay) {
        timeOverlay.addEventListener('mouseenter', () => {
            clearTimeout(headerTimeout);
            header.classList.remove('header-hidden');
        });
        
        timeOverlay.addEventListener('mouseleave', startHeaderHideTimer);
    } 

    // --- NEW: DRAG-TO-SCROLL FOR HORIZONTAL COURT LIST ---
    const scrollContainer = document.getElementById('courtsSection');

    if (scrollContainer) {
        let isDown = false;
        let startX;
        let scrollLeft;

        // Mouse Events for Desktop
        scrollContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            scrollContainer.style.cursor = 'grabbing';
            startX = e.pageX - scrollContainer.offsetLeft;
            scrollLeft = scrollContainer.scrollLeft;
        });

        scrollContainer.addEventListener('mouseleave', () => {
            isDown = false;
            scrollContainer.style.cursor = 'grab';
        });

        scrollContainer.addEventListener('mouseup', () => {
            isDown = false;
            scrollContainer.style.cursor = 'grab';
        });

        scrollContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - scrollContainer.offsetLeft;
            const walk = (x - startX) * 2; // The multiplier '2' makes the scroll faster
            scrollContainer.scrollLeft = scrollLeft - walk;
        });

        // Touch Events for Mobile
        scrollContainer.addEventListener('touchstart', (e) => {
            isDown = true;
            startX = e.touches[0].pageX - scrollContainer.offsetLeft;
            scrollLeft = scrollContainer.scrollLeft;
        }, { passive: true }); // Use passive listener for better scroll performance

        scrollContainer.addEventListener('touchend', () => {
            isDown = false;
        });

        scrollContainer.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            const x = e.touches[0].pageX - scrollContainer.offsetLeft;
            const walk = (x - startX) * 2;
            scrollContainer.scrollLeft = scrollLeft - walk;
        }, { passive: true });
    }

    function setActiveMobileMenuItem(buttonId) {
        if (window.innerWidth > 900) return; // Only on mobile
        
        document.querySelectorAll('.mobile-menu-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(buttonId);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }


    // --- MODIFIED: ACTIVE CARD STYLING ON HORIZONTAL SCROLL ---
    const scrollSnapContainer = document.getElementById('courtsSection');
    if (scrollSnapContainer) {
        let scrollTimeout;

        // Set the active card on initial load
        setTimeout(setActiveCardForMobileScroll, 200); 

        scrollSnapContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            // Run the logic only after the user has stopped scrolling (snapped to a card)
            scrollTimeout = setTimeout(setActiveCardForMobileScroll, 150);
        });
    }

    // --- NEW: REUSABLE FUNCTION TO SET THE ACTIVE SCROLLING CARD ---
        function setActiveCardForMobileScroll() {
            const scrollSnapContainer = document.getElementById('courtsSection');
            if (!scrollSnapContainer) return;

            // Check if the screen is in mobile view (where this feature is active)
            if (window.innerWidth >= 900) {
                // On desktop, ensure all cards are reset to their normal state
                const cards = scrollSnapContainer.querySelectorAll('.summary-card, .court-card');
                cards.forEach(card => card.classList.remove('is-active-card'));
                return;
            }

            const containerRect = scrollSnapContainer.getBoundingClientRect();
            const containerCenter = containerRect.left + containerRect.width / 2;
            
            let closestCard = null;
            let minDistance = Infinity;

            const cards = scrollSnapContainer.querySelectorAll('.summary-card, .court-card');
            cards.forEach(card => {
                const cardRect = card.getBoundingClientRect();
                const cardCenter = cardRect.left + cardRect.width / 2;
                const distance = Math.abs(containerCenter - cardCenter);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestCard = card;
                }
            });
            
            if (closestCard) {
                // Remove active class from all other cards
                cards.forEach(card => card.classList.remove('is-active-card'));
                
                // Add active class to the new card
                closestCard.classList.add('is-active-card');
            }
        }

    // --- NEW FUNCTION: Scrolls to the first available court ---
    function scrollToFirstAvailableCourt() {
        // Only run this logic on mobile view where horizontal scrolling is active
        if (window.innerWidth >= 900) {
            return;
        }

        const courtId = findNextAvailableCourtId(); // Uses your existing hierarchy logic
        if (courtId) {
            const courtCard = document.querySelector(`.court-card[data-court-id="${courtId}"]`);
            if (courtCard) {
                // Smoothly scroll the found court card to the center of the view
                courtCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }


    function scrollToSummaryCard() {
        // Only run this logic on mobile view
        if (window.innerWidth < 900) {
            const summaryCard = document.querySelector('.summary-card');
            if (summaryCard) {
                // Smoothly scroll the summary card to the start of the view
                summaryCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            }
        }
    }

    // --- NEW FUNCTION: Automatically expands the player list on mobile ---
    function expandPlayerListOnMobile() {
        // Only run this logic on mobile view if the list is currently collapsed
        if (window.innerWidth < 900 && !state.mobileControls.isPlayersExpanded) {
            state.mobileControls.isPlayersExpanded = true; // Update the state

            // Directly manipulate the DOM to trigger the expansion
            const playersSection = document.getElementById('availablePlayersSection');
            const playersToggleIcon = document.querySelector('#players-toggle-btn i');

            if (playersSection) {
                playersSection.classList.remove('is-collapsed');
            }
            if (playersToggleIcon) {
                playersToggleIcon.className = 'mdi mdi-chevron-up';
            }
            saveState(); // Save the new expanded state
        }
    }

    // --- NEW FUNCTION: Automatically collapses the player list on mobile when selection is complete ---
    function collapsePlayerListOnMobile() {
        // Only run this logic on mobile view
        if (window.innerWidth < 900 && state.mobileControls.isPlayersExpanded) {
            state.mobileControls.isPlayersExpanded = false; // Update the state
            
            // Directly manipulate the DOM to trigger the collapse
            const playersSection = document.getElementById('availablePlayersSection');
            const playersToggleIcon = document.querySelector('#players-toggle-btn i');
            
            if (playersSection) {
                playersSection.classList.add('is-collapsed');
            }
            if (playersToggleIcon) {
                playersToggleIcon.className = 'mdi mdi-chevron-down';
            }
            saveState(); // Save the new collapsed state
        }
    }

    // --- NEW: Central function to enforce all queue logic (Duty & Gender) ---
    function enforceQueueLogic() {
        if (state.availablePlayers.length < 2) {
            return; // Not enough players for any logic to apply.
        }

        const players = state.availablePlayers;

        // --- PART 1: On-Duty Member Logic (Existing Logic) ---
        if (state.onDuty !== 'None') {
            const firstActiveIndex = players.findIndex(p => !p.isPaused);
            if (firstActiveIndex !== -1 && players[firstActiveIndex].name === state.onDuty) {
                const targetSwapIndex = players.findIndex((p, index) => 
                    index > firstActiveIndex && !p.isPaused && p.name !== state.onDuty
                );
                if (targetSwapIndex !== -1) {
                    // Perform the swap
                    [players[firstActiveIndex], players[targetSwapIndex]] = [players[targetSwapIndex], players[firstActiveIndex]];
                }
            }
        }

        // --- PART 2: Gender Balancing Logic (New & Improved Logic) ---
        const selectorPlayer = players.find(p => !p.isPaused);
        if (!selectorPlayer) return; // No active selector

        const selectableGroupBaseSize = 7;
        const selectorIndex = players.indexOf(selectorPlayer);

        // Check if there are enough players after the selector to form a group
        if ((players.length - 1 - selectorIndex) >= selectableGroupBaseSize) {
            const playersAfterSelector = players.slice(selectorIndex + 1);
            const availableInSelectableRange = playersAfterSelector.filter(p => !p.isPaused).slice(0, selectableGroupBaseSize);
            
            const sameGenderCountInRange = availableInSelectableRange.filter(p => p.gender === selectorPlayer.gender).length;

            // IF a gender imbalance is detected (0 or 1 same-gender players in the next 7)...
            if (sameGenderCountInRange <= 1) {
                const endOfRangeIndex = players.indexOf(availableInSelectableRange[availableInSelectableRange.length - 1]);
                
                // Search for the next available, non-paused, same-gender player *after* the current selection box
                const searchPool = players.slice(endOfRangeIndex + 1);
                const nextSuitablePlayerIndexInPool = searchPool.findIndex(p => p.gender === selectorPlayer.gender && !p.isPaused);

                if (nextSuitablePlayerIndexInPool !== -1) {
                    // We found a player to move!
                    const originalIndexOfPlayerToMove = endOfRangeIndex + 1 + nextSuitablePlayerIndexInPool;
                    const [playerToMove] = players.splice(originalIndexOfPlayerToMove, 1);

                    // Insert them at the end of the orange selection box (position #8, which is index 7 relative to the selector)
                    const insertionIndex = Math.min(selectorIndex + 1 + selectableGroupBaseSize, players.length);
                    players.splice(insertionIndex, 0, playerToMove);
                }
            }
        }
    }


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

    function getPlayerRank(playerName, playerGender) {
        const todaysGames = state.gameHistory.filter(game => {
            const gameDate = new Date(game.endTime).toISOString().split('T')[0];
            return gameDate === new Date().toISOString().split('T')[0];
        });
        const allStats = calculatePlayerStats(todaysGames);
        const allPlayers = getAllKnownPlayers();

        const leaderboardPlayers = Object.keys(allStats)
            .map(name => {
                const player = allPlayers.find(p => p.name === name);
                return {
                    name,
                    ...allStats[name],
                    gender: player ? player.gender : '?',
                    onLeaderboard: player ? player.onLeaderboard : false
                };
            })
            .filter(p => p.onLeaderboard && p.gender === playerGender)
            .sort((a, b) => {
                const winPctA = a.played > 0 ? a.won / a.played : 0;
                const winPctB = b.played > 0 ? b.won / b.played : 0;
                if (winPctB !== winPctA) return winPctB - winPctA;
                return b.totalDurationMs - a.totalDurationMs;
            });

        const rank = leaderboardPlayers.findIndex(p => p.name === playerName) + 1;
        return rank > 0 ? rank : null;
    }

    function findBestAndWorstMatches(playerName) {
        const todaysGames = state.gameHistory.filter(game => {
            const gameDate = new Date(game.endTime).toISOString().split('T')[0];
            return gameDate === new Date().toISOString().split('T')[0];
        });

        const playerGames = todaysGames.filter(game =>
            (game.teams.team1.includes(playerName) || game.teams.team2.includes(playerName)) && game.score
        );

        if (playerGames.length === 0) return { best: null, worst: null };

        let bestMatch = { scoreDiff: -Infinity, text: '' };
        let worstMatch = { scoreDiff: Infinity, text: '' };

        playerGames.forEach(game => {
            const isTeam1 = game.teams.team1.includes(playerName);
            const playerScore = isTeam1 ? game.score.team1 : game.score.team2;
            const opponentScore = isTeam1 ? game.score.team2 : game.score.team1;
            const scoreDiff = playerScore - opponentScore;
            const outcome = scoreDiff > 0 ? 'Won' : 'Lost';
            const scoreText = `${outcome} ${playerScore}-${opponentScore}`;

            if (scoreDiff > bestMatch.scoreDiff) {
                bestMatch = { scoreDiff, text: scoreText };
            }
            if (scoreDiff < worstMatch.scoreDiff) {
                worstMatch = { scoreDiff, text: scoreText };
            }
        });

        return {
            best: bestMatch.text,
            worst: worstMatch.text
        };
    }
    
    /**
     * Finds the opponent a player has played against most frequently.
     * @param {string} playerName The name of the player.
     * @param {Array} gameHistory The game history array.
     * @returns {string|null} The name of the most frequent opponent, or null if none found.
     */
    function findFrequentOpponent(playerName, gameHistory) {
        const opponentCounts = {};
        let maxCount = 0;
        let frequentOpponent = null;

        gameHistory.forEach(game => {
            // Skip skipped games or games without teams
            if (game.winner === 'skipped' || !game.teams.team1 || !game.teams.team2) return;

            const team1 = game.teams.team1;
            const team2 = game.teams.team2;

            let opponents = [];
            if (team1.includes(playerName)) {
                opponents = team2;
            } else if (team2.includes(playerName)) {
                opponents = team1;
            }

            opponents.forEach(opponentName => {
                opponentCounts[opponentName] = (opponentCounts[opponentName] || 0) + 1;
                if (opponentCounts[opponentName] > maxCount) {
                    maxCount = opponentCounts[opponentName];
                    frequentOpponent = opponentName;
                }
            });
        });

        // Require a minimum number of games against an opponent to consider them "frequent"
        return maxCount >= 2 ? frequentOpponent : null;
    }

    /**
     * Determines if a player is considered "weak" based on their power score.
     * @param {number} playerScore The player's calculated power score.
     * @param {number} threshold The power score threshold from settings.
     * @returns {boolean} True if the player's score is below the threshold.
     */
    function isWeakPlayer(playerScore, threshold) {
        return playerScore < threshold;
    }

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
    // Helper function to count only active (non-paused) players
    function getActivePlayerCount() {
        return state.availablePlayers.filter(p => !p.isPaused).length;
    }

    // Modified to use API instead of localStorage
    async function saveState() { 
        // Don't save if we're currently receiving an update from WebSocket
        if (state._isReceivingUpdate) {
            return;
        }
        
        try {
            await API.saveState(state);
            console.log('State saved to server');
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }

    // ================================
    // UNDO SYSTEM FUNCTIONS
    // ================================
    function showUndoToast(message, undoAction) {
        const undoToast = document.getElementById('undo-toast');
        const undoToastMessage = document.getElementById('undo-toast-message');
        const undoToastBtn = document.getElementById('undo-toast-btn');
        const undoToastTimer = document.getElementById('undo-toast-timer');
        
        // Clear any existing toast
        hideUndoToast();
        
        // Set message
        undoToastMessage.textContent = message;
        
        // Store the undo action OUTSIDE of state (functions can't be serialized)
        currentUndoAction = undoAction;
        
        // Show toast
        undoToast.classList.remove('hidden');
        
        // Reset timer animation
        undoToastTimer.style.transition = 'none';
        undoToastTimer.style.width = '100%';
        setTimeout(() => {
            undoToastTimer.style.transition = 'width 10s linear';
            undoToastTimer.style.width = '0';
        }, 50);
        
        // Auto-hide after 10 seconds
        currentUndoTimeout = setTimeout(() => {
            hideUndoToast();
        }, 10000);
        
        // Attach undo handler
        undoToastBtn.onclick = () => {
            if (currentUndoAction && typeof currentUndoAction === 'function') {
                currentUndoAction();
                hideUndoToast();
            }
        };
    }

    function hideUndoToast() {
        const undoToast = document.getElementById('undo-toast');
        
        if (currentUndoTimeout) {
            clearTimeout(currentUndoTimeout);
            currentUndoTimeout = null;
        }
        
        undoToast.classList.add('hidden');
        currentUndoAction = null;
    }

    function addToUndoHistory(actionType, actionData, undoFunction) {
        const action = {
            type: actionType,
            data: actionData,
            timestamp: Date.now(),
            undo: undoFunction
        };
        
        state.undoHistory.actions.unshift(action);
        
        // Keep only last N actions
        if (state.undoHistory.actions.length > state.undoHistory.maxHistory) {
            state.undoHistory.actions = state.undoHistory.actions.slice(0, state.undoHistory.maxHistory);
        }
        
        saveState();
    }

    // ================================
    // SWAP PLAYER MODAL FUNCTIONS
    // ================================

    function showSwapPlayerModal(sourceCourt) {
        const court = state.courts.find(c => c.id === sourceCourt);
        if (!court || court.status !== 'in_progress') return;
        
        const swapPlayerModal = document.getElementById('swap-player-modal');
        const swapSourcePlayer = document.getElementById('swap-source-player');
        const swapTargetList = document.getElementById('swap-target-list');
        const swapInstructions = document.getElementById('swap-player-instructions');
        
        // Store source court in modal data
        swapPlayerModal.dataset.sourceCourt = sourceCourt;
        
        // Show source court players
        swapInstructions.textContent = `Select a player from Court ${sourceCourt} to swap:`;
        swapSourcePlayer.innerHTML = '';
        
        court.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'swap-player-option';
            playerDiv.innerHTML = `
                <div class="player-info">${player.name}</div>
                <div class="court-info">Court ${sourceCourt} • ${player.gender}</div>
            `;
            playerDiv.onclick = () => showSwapTargetSelection(sourceCourt, player);
            playerDiv.style.cursor = 'pointer';
            playerDiv.style.padding = '0.75rem';
            playerDiv.style.margin = '0.5rem 0';
            playerDiv.style.borderRadius = '6px';
            playerDiv.style.transition = 'background-color 0.2s';
            playerDiv.onmouseenter = () => playerDiv.style.backgroundColor = '#d0e7ff';
            playerDiv.onmouseleave = () => playerDiv.style.backgroundColor = 'transparent';
            
            swapSourcePlayer.appendChild(playerDiv);
        });
        
        // Hide the manage players modal
        manageCourtPlayersModal.classList.add('hidden');
        
        // Show swap modal
        swapPlayerModal.classList.remove('hidden');
    }

    function showSwapTargetSelection(sourceCourt, sourcePlayer) {
        const swapPlayerModal = document.getElementById('swap-player-modal');
        const swapSourcePlayer = document.getElementById('swap-source-player');
        const swapTargetList = document.getElementById('swap-target-list');
        const swapInstructions = document.getElementById('swap-player-instructions');
        
        // Update instructions
        swapInstructions.textContent = `Swap ${sourcePlayer.name} with:`;
        
        // Show selected source player
        swapSourcePlayer.innerHTML = `
            <div class="player-info">${sourcePlayer.name}</div>
            <div class="court-info">Court ${sourceCourt} • ${sourcePlayer.gender}</div>
        `;
        
        // Store source player in modal data
        swapPlayerModal.dataset.sourcePlayer = JSON.stringify(sourcePlayer);
        
        // Get all players from other in-progress courts
        swapTargetList.innerHTML = '';
        
        const otherCourts = state.courts.filter(c => 
            c.id !== sourceCourt && 
            c.status === 'in_progress' && 
            c.players.length > 0
        );
        
        if (otherCourts.length === 0) {
            swapTargetList.innerHTML = '<li style="justify-content: center; color: var(--neutral-color);">No other courts in progress</li>';
            return;
        }
        
        otherCourts.forEach(court => {
            court.players.forEach(player => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="player-name">${player.name}</span>
                    <span class="gender-label">${player.gender}</span>
                    <span class="court-label">Court ${court.id}</span>
                `;
                li.onclick = () => confirmPlayerSwap(sourceCourt, sourcePlayer, court.id, player);
                swapTargetList.appendChild(li);
            });
        });
    }

    function confirmPlayerSwap(sourceCourt, sourcePlayer, targetCourtId, targetPlayer) {
        const swapConfirmModal = document.getElementById('swap-confirm-modal');
        const swapConfirmDetails = document.getElementById('swap-confirm-details');
        
        // Store swap data
        swapConfirmModal.dataset.swapData = JSON.stringify({
            sourceCourt,
            sourcePlayer,
            targetCourt: targetCourtId,
            targetPlayer
        });
        
        // Show confirmation details
        swapConfirmDetails.innerHTML = `
            <div class="swap-row">
                <div class="player-card">
                    <div class="name">${sourcePlayer.name}</div>
                    <div class="court">Court ${sourceCourt}</div>
                </div>
                <div class="swap-arrow">⇄</div>
                <div class="player-card">
                    <div class="name">${targetPlayer.name}</div>
                    <div class="court">Court ${targetCourtId}</div>
                </div>
            </div>
        `;
        
        // Hide swap player modal, show confirmation
        document.getElementById('swap-player-modal').classList.add('hidden');
        swapConfirmModal.classList.remove('hidden');
    }

    function executePlayerSwap() {
        const swapConfirmModal = document.getElementById('swap-confirm-modal');
        const swapData = JSON.parse(swapConfirmModal.dataset.swapData);
        
        const { sourceCourt, sourcePlayer, targetCourt, targetPlayer } = swapData;
        
        const sourceCourtObj = state.courts.find(c => c.id === sourceCourt);
        const targetCourtObj = state.courts.find(c => c.id === targetCourt);
        
        if (!sourceCourtObj || !targetCourtObj) return;
        
        // Find player indices
        const sourcePlayerIndex = sourceCourtObj.players.findIndex(p => p.name === sourcePlayer.name);
        const targetPlayerIndex = targetCourtObj.players.findIndex(p => p.name === targetPlayer.name);
        
        if (sourcePlayerIndex === -1 || targetPlayerIndex === -1) return;
        
        // Store original state for undo
        const originalSourcePlayers = JSON.parse(JSON.stringify(sourceCourtObj.players));
        const originalTargetPlayers = JSON.parse(JSON.stringify(targetCourtObj.players));
        const originalSourceTeams = JSON.parse(JSON.stringify(sourceCourtObj.teams));
        const originalTargetTeams = JSON.parse(JSON.stringify(targetCourtObj.teams));
        
        // Perform the swap
        const tempPlayer = sourceCourtObj.players[sourcePlayerIndex];
        sourceCourtObj.players[sourcePlayerIndex] = targetCourtObj.players[targetPlayerIndex];
        targetCourtObj.players[targetPlayerIndex] = tempPlayer;
        
        // Update teams if they are set
        if (sourceCourtObj.teamsSet) {
            updateTeamsAfterSwap(sourceCourtObj, sourcePlayer.name, targetPlayer.name);
        }
        if (targetCourtObj.teamsSet) {
            updateTeamsAfterSwap(targetCourtObj, targetPlayer.name, sourcePlayer.name);
        }
        
        // Create undo function
        const undoFunction = () => {
            console.log('=== EXECUTING UNDO ===');
            
            // Set flag to prevent WebSocket interference
            localChangeInProgress = true;
            
            // Find the court fresh from state
            const courtToRestore = state.courts.find(c => c.id === courtId);
            if (!courtToRestore) {
                console.error('Court not found for undo!');
                localChangeInProgress = false;
                return;
            }
            
            console.log('Before restore:', JSON.parse(JSON.stringify(courtToRestore)));
            console.log('Restoring to:', originalPlayers, originalTeams);
            
            // Restore the original state
            courtToRestore.players = JSON.parse(JSON.stringify(originalPlayers));
            courtToRestore.teams = JSON.parse(JSON.stringify(originalTeams));
            
            console.log('After restore:', JSON.parse(JSON.stringify(courtToRestore)));
            
            render();
            saveState();
            
            // Clear flag after a short delay to allow saveState to complete
            setTimeout(() => {
                localChangeInProgress = false;
                console.log('Undo complete - flag cleared');
            }, 500);
        };
        
        // Add to undo history
        addToUndoHistory('player_swap', swapData, undoFunction);
        
        // Show undo toast
        showUndoToast(
            `Swapped ${sourcePlayer.name} (Court ${sourceCourt}) ↔ ${targetPlayer.name} (Court ${targetCourt})`,
            undoFunction
        );
        
        // Close modals and update UI
        swapConfirmModal.classList.add('hidden');
        render();
        saveState();
    }

    function updateTeamsAfterSwap(court, oldPlayerName, newPlayerName) {
        // Find which team the old player was on and replace with new player
        const team1Index = court.teams.team1.findIndex(p => p.name === oldPlayerName);
        const team2Index = court.teams.team2.findIndex(p => p.name === oldPlayerName);
        
        const newPlayerObj = court.players.find(p => p.name === newPlayerName);
        
        if (team1Index !== -1) {
            court.teams.team1[team1Index] = newPlayerObj;
        } else if (team2Index !== -1) {
            court.teams.team2[team2Index] = newPlayerObj;
        }
    }

    // ================================
    // DRAG & DROP HANDLER FUNCTIONS
    // ================================

    function handlePlayerDragStart(e) {
        const playerSpot = e.target.closest('.player-spot[draggable="true"]');
        if (!playerSpot) return;
        
        // Only allow drag if this player was double-clicked (enabled)
        if (!playerSpot.classList.contains('drag-enabled')) {
            e.preventDefault();
            return;
        }
        
        draggedPlayer = {
            name: playerSpot.dataset.playerName,
            courtId: playerSpot.dataset.courtId,
            position: playerSpot.dataset.playerPos,
            team: playerSpot.dataset.team || null
        };
        
        playerSpot.classList.add('dragging');
        
        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedPlayer.name);
        
        // Make drag image semi-transparent
        if (e.dataTransfer.setDragImage) {
            const dragImage = playerSpot.cloneNode(true);
            dragImage.style.opacity = '0.7';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 0, 0);
            setTimeout(() => document.body.removeChild(dragImage), 0);
        }
    }

    function handlePlayerDoubleClick(e) {
        const playerSpot = e.target.closest('.player-spot[draggable="true"]');
        if (!playerSpot) return;
        
        // Clear any previously enabled player
        document.querySelectorAll('.player-spot.drag-enabled').forEach(spot => {
            spot.classList.remove('drag-enabled');
        });
        
        // If clicking the same player that was already enabled, disable it
        if (activeDraggablePlayer === playerSpot) {
            activeDraggablePlayer = null;
            return;
        }
        
        // Enable this player for dragging
        playerSpot.classList.add('drag-enabled');
        activeDraggablePlayer = playerSpot;
        
        // Auto-disable after 10 seconds if not used
        setTimeout(() => {
            if (playerSpot.classList.contains('drag-enabled')) {
                playerSpot.classList.remove('drag-enabled');
                if (activeDraggablePlayer === playerSpot) {
                    activeDraggablePlayer = null;
                }
            }
        }, 10000);
    }

    function handlePlayerDragEnd(e) {
        const playerSpot = e.target.closest('.player-spot[draggable="true"]');
        if (playerSpot) {
            playerSpot.classList.remove('dragging');
            playerSpot.classList.remove('drag-enabled'); // Clear enabled state after drag
        }
        
        // Clear all drag-over highlights
        document.querySelectorAll('.drag-over, .drag-over-invalid').forEach(el => {
            el.classList.remove('drag-over', 'drag-over-invalid');
        });
        
        draggedPlayer = null;
        dragOverTarget = null;
        activeDraggablePlayer = null; // Clear active draggable
    }

    function handlePlayerDragOver(e) {
        e.preventDefault(); // Allow drop
        
        const playerSpot = e.target.closest('.player-spot[draggable="true"]');
        const availablePlayerLi = e.target.closest('#availablePlayersList li');
        
        if (!draggedPlayer) return;
        
        // --- SCENARIO 1: Dragging over another player on a court ---
        if (playerSpot && playerSpot.dataset.playerName) {
            const targetCourtId = playerSpot.dataset.courtId;
            const targetPlayerName = playerSpot.dataset.playerName;
            
            // Don't allow dropping on self
            if (targetPlayerName === draggedPlayer.name) {
                e.dataTransfer.dropEffect = 'none';
                return;
            }
            
            const sameCourt = targetCourtId === draggedPlayer.courtId;
            
            if (sameCourt) {
                // Team reselection within same court
                playerSpot.classList.add('drag-over');
                playerSpot.classList.remove('drag-over-invalid');
                e.dataTransfer.dropEffect = 'move';
            } else {
                // Player swap between courts
                const targetCourt = state.courts.find(c => c.id === targetCourtId);
                const sourceCourt = state.courts.find(c => c.id === draggedPlayer.courtId);
                
                // Only allow if both courts are in_progress
                if (targetCourt?.status === 'in_progress' && sourceCourt?.status === 'in_progress') {
                    playerSpot.classList.add('drag-over');
                    playerSpot.classList.remove('drag-over-invalid');
                    e.dataTransfer.dropEffect = 'move';
                } else {
                    playerSpot.classList.add('drag-over-invalid');
                    playerSpot.classList.remove('drag-over');
                    e.dataTransfer.dropEffect = 'none';
                }
            }
            
            dragOverTarget = playerSpot;
        }
        // --- SCENARIO 2: Dragging over available player (substitution) ---
        else if (availablePlayerLi && !availablePlayerLi.classList.contains('waiting-message')) {
            const targetPlayerName = availablePlayerLi.dataset.playerName;
            
            // Don't allow if dragging from available to available
            if (!draggedPlayer.courtId) {
                availablePlayerLi.classList.add('drag-over-invalid');
                e.dataTransfer.dropEffect = 'none';
                return;
            }
            
            // Check if court is in_progress
            const sourceCourt = state.courts.find(c => c.id === draggedPlayer.courtId);
            if (sourceCourt?.status === 'in_progress') {
                availablePlayerLi.classList.add('drag-over');
                availablePlayerLi.classList.remove('drag-over-invalid');
                e.dataTransfer.dropEffect = 'move';
            } else {
                availablePlayerLi.classList.add('drag-over-invalid');
                availablePlayerLi.classList.remove('drag-over');
                e.dataTransfer.dropEffect = 'none';
            }
            
            dragOverTarget = availablePlayerLi;
        }
    }

    function handlePlayerDragLeave(e) {
        const playerSpot = e.target.closest('.player-spot[draggable="true"]');
        const availablePlayerLi = e.target.closest('#availablePlayersList li');
        
        if (playerSpot) {
            playerSpot.classList.remove('drag-over', 'drag-over-invalid');
        }
        if (availablePlayerLi) {
            availablePlayerLi.classList.remove('drag-over', 'drag-over-invalid');
        }
    }

    function handlePlayerDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!draggedPlayer) return;
        
        const playerSpot = e.target.closest('.player-spot[draggable="true"]');
        const availablePlayerLi = e.target.closest('#availablePlayersList li');
        
        // Clear highlights
        document.querySelectorAll('.drag-over, .drag-over-invalid').forEach(el => {
            el.classList.remove('drag-over', 'drag-over-invalid');
        });
        
        // --- SCENARIO 1: Dropped on another player on a court ---
        if (playerSpot && playerSpot.dataset.playerName) {
            const targetCourtId = playerSpot.dataset.courtId;
            const targetPlayerName = playerSpot.dataset.playerName;
            const sameCourt = targetCourtId === draggedPlayer.courtId;
            
            if (targetPlayerName === draggedPlayer.name) return; // Same player
            
            if (sameCourt) {
                // Team reselection - swap positions within same court
                executeTeamReselectionSwap(draggedPlayer.courtId, draggedPlayer.name, targetPlayerName);
            } else {
                // Player swap between different courts
                const targetCourt = state.courts.find(c => c.id === targetCourtId);
                const sourceCourt = state.courts.find(c => c.id === draggedPlayer.courtId);
                
                if (targetCourt?.status === 'in_progress' && sourceCourt?.status === 'in_progress') {
                    executePlayerSwapBetweenCourts(draggedPlayer.courtId, draggedPlayer.name, targetCourtId, targetPlayerName);
                }
            }
        }
        // --- SCENARIO 2: Dropped on available player (substitution) ---
        else if (availablePlayerLi && !availablePlayerLi.classList.contains('waiting-message')) {
            const targetPlayerName = availablePlayerLi.dataset.playerName;
            const sourceCourt = state.courts.find(c => c.id === draggedPlayer.courtId);
            
            if (sourceCourt?.status === 'in_progress') {
                executePlayerSubstitution(draggedPlayer.courtId, draggedPlayer.name, targetPlayerName);
            }
        }
        
        draggedPlayer = null;
        dragOverTarget = null;
    }

    // ================================
    // DRAG & DROP EXECUTION FUNCTIONS
    // ================================

    function executeTeamReselectionSwap(courtId, player1Name, player2Name) {
        const court = state.courts.find(c => c.id === courtId);
        if (!court) return;
        
        // Store original state for undo
        const originalPlayers = JSON.parse(JSON.stringify(court.players));
        const originalTeams = JSON.parse(JSON.stringify(court.teams));
        
        // Find player indices
        const player1Index = court.players.findIndex(p => p.name === player1Name);
        const player2Index = court.players.findIndex(p => p.name === player2Name);
        
        if (player1Index === -1 || player2Index === -1) return;
        
        // Swap players in main array
        const temp = court.players[player1Index];
        court.players[player1Index] = court.players[player2Index];
        court.players[player2Index] = temp;
        
        // Update teams if they're set
        if (court.teamsSet) {
            // Find which teams these players are on and swap them
            let player1Team = null, player1TeamIndex = -1;
            let player2Team = null, player2TeamIndex = -1;
            
            court.teams.team1.forEach((p, i) => {
                if (p.name === player1Name) { player1Team = 'team1'; player1TeamIndex = i; }
                if (p.name === player2Name) { player2Team = 'team1'; player2TeamIndex = i; }
            });
            
            court.teams.team2.forEach((p, i) => {
                if (p.name === player1Name) { player1Team = 'team2'; player1TeamIndex = i; }
                if (p.name === player2Name) { player2Team = 'team2'; player2TeamIndex = i; }
            });
            
            // Swap in teams
            if (player1Team && player2Team) {
                const p1 = court.teams[player1Team][player1TeamIndex];
                const p2 = court.teams[player2Team][player2TeamIndex];
                
                court.teams[player1Team][player1TeamIndex] = p2;
                court.teams[player2Team][player2TeamIndex] = p1;
            }
        }
        
        // Create undo function
        const undoFunction = () => {
            console.log('=== EXECUTING UNDO ===');
            
            // Set flag to prevent WebSocket interference
            localChangeInProgress = true;
            
            // Find the court fresh from state
            const courtToRestore = state.courts.find(c => c.id === courtId);
            if (!courtToRestore) {
                console.error('Court not found for undo!');
                localChangeInProgress = false;
                return;
            }
            
            console.log('Before restore:', JSON.parse(JSON.stringify(courtToRestore)));
            console.log('Restoring to:', originalPlayers, originalTeams);
            
            // Restore the original state
            courtToRestore.players = JSON.parse(JSON.stringify(originalPlayers));
            courtToRestore.teams = JSON.parse(JSON.stringify(originalTeams));
            
            console.log('After restore:', JSON.parse(JSON.stringify(courtToRestore)));
            
            render();
            saveState();
            
            // Clear flag after a short delay to allow saveState to complete
            setTimeout(() => {
                localChangeInProgress = false;
                console.log('Undo complete - flag cleared');
            }, 500);
        };
        
        // Add to undo history
        addToUndoHistory('team_reselection', { courtId, player1Name, player2Name }, undoFunction);
        
        // Show undo toast
        showUndoToast(
            `Swapped ${player1Name.split(' ')[0]} ↔ ${player2Name.split(' ')[0]} on Court ${courtId}`,
            undoFunction
        );
        
        render();
        saveState();
    }

    function executePlayerSwapBetweenCourts(sourceCourtId, sourcePlayerName, targetCourtId, targetPlayerName) {
        const sourceCourt = state.courts.find(c => c.id === sourceCourtId);
        const targetCourt = state.courts.find(c => c.id === targetCourtId);
        
        if (!sourceCourt || !targetCourt) return;
        
        // Store original state for undo
        const originalSourcePlayers = JSON.parse(JSON.stringify(sourceCourt.players));
        const originalTargetPlayers = JSON.parse(JSON.stringify(targetCourt.players));
        const originalSourceTeams = JSON.parse(JSON.stringify(sourceCourt.teams));
        const originalTargetTeams = JSON.parse(JSON.stringify(targetCourt.teams));
        
        // Find player indices
        const sourcePlayerIndex = sourceCourt.players.findIndex(p => p.name === sourcePlayerName);
        const targetPlayerIndex = targetCourt.players.findIndex(p => p.name === targetPlayerName);
        
        if (sourcePlayerIndex === -1 || targetPlayerIndex === -1) return;
        
        // Perform the swap
        const tempPlayer = sourceCourt.players[sourcePlayerIndex];
        sourceCourt.players[sourcePlayerIndex] = targetCourt.players[targetPlayerIndex];
        targetCourt.players[targetPlayerIndex] = tempPlayer;
        
        // Update teams if they are set
        if (sourceCourt.teamsSet) {
            updateTeamsAfterSwap(sourceCourt, sourcePlayerName, targetPlayerName);
        }
        if (targetCourt.teamsSet) {
            updateTeamsAfterSwap(targetCourt, targetPlayerName, sourcePlayerName);
        }
        
        // Create undo function
        const undoFunction = () => {
            console.log('=== EXECUTING UNDO - Court Swap ===');
            
            // Set flag to prevent WebSocket interference
            localChangeInProgress = true;
            
            // Find both courts fresh from state
            const sourceCourtToRestore = state.courts.find(c => c.id === sourceCourtId);
            const targetCourtToRestore = state.courts.find(c => c.id === targetCourtId);
            
            if (!sourceCourtToRestore || !targetCourtToRestore) {
                console.error('Courts not found for undo!');
                localChangeInProgress = false;
                return;
            }
            
            console.log('Restoring source court:', sourceCourtId);
            console.log('Restoring target court:', targetCourtId);
            
            // Restore the original state
            sourceCourtToRestore.players = JSON.parse(JSON.stringify(originalSourcePlayers));
            targetCourtToRestore.players = JSON.parse(JSON.stringify(originalTargetPlayers));
            sourceCourtToRestore.teams = JSON.parse(JSON.stringify(originalSourceTeams));
            targetCourtToRestore.teams = JSON.parse(JSON.stringify(originalTargetTeams));
            
            render();
            saveState();
            
            // Clear flag after a short delay to allow saveState to complete
            setTimeout(() => {
                localChangeInProgress = false;
                console.log('Undo complete - flag cleared');
            }, 500);
        };
        
        // Add to undo history
        addToUndoHistory('court_swap', { sourceCourtId, sourcePlayerName, targetCourtId, targetPlayerName }, undoFunction);
        
        // Show undo toast
        showUndoToast(
            `Swapped ${sourcePlayerName.split(' ')[0]} (Court ${sourceCourtId}) ↔ ${targetPlayerName.split(' ')[0]} (Court ${targetCourtId})`,
            undoFunction
        );
        
        render();
        saveState();
    }

    function executePlayerSubstitution(courtId, courtPlayerName, availablePlayerName) {
        const court = state.courts.find(c => c.id === courtId);
        if (!court || court.status !== 'in_progress') return;
        
        // Find players
        const courtPlayerIndex = court.players.findIndex(p => p.name === courtPlayerName);
        const availablePlayer = state.availablePlayers.find(p => p.name === availablePlayerName);
        const courtPlayer = court.players[courtPlayerIndex];
        
        if (courtPlayerIndex === -1 || !availablePlayer) return;
        
        // Store original state for undo
        const originalCourtPlayers = JSON.parse(JSON.stringify(court.players));
        const originalCourtTeams = JSON.parse(JSON.stringify(court.teams));
        const originalAvailablePlayers = JSON.parse(JSON.stringify(state.availablePlayers));
        
        // Perform substitution
        court.players[courtPlayerIndex] = availablePlayer;
        
        // Update teams if set
        if (court.teamsSet) {
            updateTeamsAfterSwap(court, courtPlayerName, availablePlayerName);
        }
        
        // Update available players list
        state.availablePlayers = state.availablePlayers.filter(p => p.name !== availablePlayerName);
        state.availablePlayers.push(courtPlayer);
        
        // Create undo function
        const undoFunction = () => {
            console.log('=== EXECUTING UNDO - Substitution ===');
            
            // Set flag to prevent WebSocket interference
            localChangeInProgress = true;
            
            // Find the court fresh from state
            const courtToRestore = state.courts.find(c => c.id === courtId);
            
            if (!courtToRestore) {
                console.error('Court not found for undo!');
                localChangeInProgress = false;
                return;
            }
            
            console.log('Restoring court:', courtId);
            
            // Restore the original state
            courtToRestore.players = JSON.parse(JSON.stringify(originalCourtPlayers));
            courtToRestore.teams = JSON.parse(JSON.stringify(originalCourtTeams));
            state.availablePlayers = JSON.parse(JSON.stringify(originalAvailablePlayers));
            
            render();
            saveState();
            
            // Clear flag after a short delay to allow saveState to complete
            setTimeout(() => {
                localChangeInProgress = false;
                console.log('Undo complete - flag cleared');
            }, 500);
        };
                
        // Add to undo history
        addToUndoHistory('substitution', { courtId, courtPlayerName, availablePlayerName }, undoFunction);
        
        // Show undo toast
        showUndoToast(
            `Substituted ${courtPlayerName.split(' ')[0]} → ${availablePlayerName.split(' ')[0]} on Court ${courtId}`,
            undoFunction
        );
        
        render();
        saveState();
    }

    // ================================
    // UNDO HISTORY MODAL FUNCTIONS
    // ================================

    function showUndoHistoryModal() {
        const undoHistoryModal = document.getElementById('undo-history-modal');
        const undoHistoryList = document.getElementById('undo-history-list');
        
        undoHistoryList.innerHTML = '';
        
        if (state.undoHistory.actions.length === 0) {
            const li = document.createElement('li');
            li.className = 'empty-history';
            li.textContent = 'No recent actions to undo';
            undoHistoryList.appendChild(li);
        } else {
            state.undoHistory.actions.forEach((action, index) => {
                const li = document.createElement('li');
                
                const actionDiv = document.createElement('div');
                actionDiv.className = 'undo-history-action';
                actionDiv.textContent = getActionDescription(action);
                
                const timestampDiv = document.createElement('div');
                timestampDiv.className = 'undo-history-timestamp';
                timestampDiv.textContent = getTimeAgo(action.timestamp);
                
                li.appendChild(actionDiv);
                li.appendChild(timestampDiv);
                
                li.onclick = () => promptUndoWithPin(action, index);
                
                undoHistoryList.appendChild(li);
            });
        }
        
        adminSettingsModal.classList.add('hidden');
        undoHistoryModal.classList.remove('hidden');
    }

    function getActionDescription(action) {
        switch (action.type) {
            case 'team_reselection':
                return `Team Reselection: ${action.data.player1Name.split(' ')[0]} ↔ ${action.data.player2Name.split(' ')[0]} (Court ${action.data.courtId})`;
            case 'court_swap':
                return `Court Swap: ${action.data.sourcePlayerName.split(' ')[0]} (Court ${action.data.sourceCourtId}) ↔ ${action.data.targetPlayerName.split(' ')[0]} (Court ${action.data.targetCourtId})`;
            case 'substitution':
                return `Substitution: ${action.data.courtPlayerName.split(' ')[0]} → ${action.data.availablePlayerName.split(' ')[0]} (Court ${action.data.courtId})`;
            case 'player_swap':
                return `Player Swap: ${action.data.sourcePlayer.name.split(' ')[0]} (Court ${action.data.sourceCourt}) ↔ ${action.data.targetPlayer.name.split(' ')[0]} (Court ${action.data.targetCourt})`;
            default:
                return 'Unknown action';
        }
    }

    function getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        
        const hours = Math.floor(minutes / 60);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }

    function promptUndoWithPin(action, actionIndex) {
        // CRITICAL: Validate that undo is still safe to perform
        const validationResult = validateUndoAction(action);
        
        if (!validationResult.isValid) {
            alert(`Cannot undo this action:\n\n${validationResult.reason}\n\nThe game state has changed too much since this action occurred.`);
            return;
        }
        
        // Hide undo history modal
        document.getElementById('undo-history-modal').classList.add('hidden');
        
        // Store the action index in a way the keypad system can access it
        customKeypadModal.dataset.undoActionIndex = actionIndex;
        customKeypadModal.dataset.undoActionDescription = getActionDescription(action);
        
        // Show the existing keypad in undo mode (no placeholder text)
        showKeypad(null, { 
            mode: 'undo', 
            title: 'Enter Admin PIN to Undo' 
        });
    }

    function validateUndoAction(action) {
        const { type, data } = action;
        
        // Check based on action type
        switch (type) {
            case 'team_reselection': {
                const { courtId, player1Name, player2Name } = data;
                const court = state.courts.find(c => c.id === courtId);
                
                // Court must still exist and be in progress
                if (!court) {
                    return { isValid: false, reason: 'Court no longer exists' };
                }
                if (court.status !== 'in_progress') {
                    return { isValid: false, reason: `Court ${courtId} game has ended` };
                }
                
                // Both players must still be on this court
                const hasPlayer1 = court.players.some(p => p.name === player1Name);
                const hasPlayer2 = court.players.some(p => p.name === player2Name);
                
                if (!hasPlayer1 || !hasPlayer2) {
                    return { isValid: false, reason: 'One or both players have left this court' };
                }
                
                return { isValid: true };
            }
            
            case 'court_swap': {
                const { sourceCourtId, sourcePlayerName, targetCourtId, targetPlayerName } = data;
                const sourceCourt = state.courts.find(c => c.id === sourceCourtId);
                const targetCourt = state.courts.find(c => c.id === targetCourtId);
                
                // Both courts must still be in progress
                if (!sourceCourt || sourceCourt.status !== 'in_progress') {
                    return { isValid: false, reason: `Court ${sourceCourtId} game has ended` };
                }
                if (!targetCourt || targetCourt.status !== 'in_progress') {
                    return { isValid: false, reason: `Court ${targetCourtId} game has ended` };
                }
                
                // Both players must still be on their respective courts
                const hasSourcePlayer = sourceCourt.players.some(p => p.name === sourcePlayerName);
                const hasTargetPlayer = targetCourt.players.some(p => p.name === targetPlayerName);
                
                if (!hasSourcePlayer) {
                    return { isValid: false, reason: `${sourcePlayerName.split(' ')[0]} is no longer on Court ${sourceCourtId}` };
                }
                if (!hasTargetPlayer) {
                    return { isValid: false, reason: `${targetPlayerName.split(' ')[0]} is no longer on Court ${targetCourtId}` };
                }
                
                return { isValid: true };
            }
            
            case 'substitution': {
                const { courtId, courtPlayerName, availablePlayerName } = data;
                const court = state.courts.find(c => c.id === courtId);
                
                // Court must still be in progress
                if (!court || court.status !== 'in_progress') {
                    return { isValid: false, reason: `Court ${courtId} game has ended` };
                }
                
                // The substituted player must still be on the court
                const hasSubstitutedPlayer = court.players.some(p => p.name === availablePlayerName);
                
                if (!hasSubstitutedPlayer) {
                    return { isValid: false, reason: `${availablePlayerName.split(' ')[0]} is no longer on Court ${courtId}` };
                }
                
                // The original player should be in available players or on another court
                const originalPlayerAvailable = state.availablePlayers.some(p => p.name === courtPlayerName);
                const originalPlayerOnOtherCourt = state.courts.some(c => 
                    c.id !== courtId && c.players.some(p => p.name === courtPlayerName)
                );
                
                if (!originalPlayerAvailable && !originalPlayerOnOtherCourt) {
                    return { isValid: false, reason: `${courtPlayerName.split(' ')[0]} has checked out` };
                }
                
                return { isValid: true };
            }
            
            case 'player_swap': {
                // This is from the modal swap (not drag & drop)
                const { sourceCourt, sourcePlayer, targetCourt, targetPlayer } = data;
                const sourceCourtObj = state.courts.find(c => c.id === sourceCourt);
                const targetCourtObj = state.courts.find(c => c.id === targetCourt);
                
                if (!sourceCourtObj || sourceCourtObj.status !== 'in_progress') {
                    return { isValid: false, reason: `Court ${sourceCourt} game has ended` };
                }
                if (!targetCourtObj || targetCourtObj.status !== 'in_progress') {
                    return { isValid: false, reason: `Court ${targetCourt} game has ended` };
                }
                
                const hasSourcePlayer = sourceCourtObj.players.some(p => p.name === sourcePlayer.name);
                const hasTargetPlayer = targetCourtObj.players.some(p => p.name === targetPlayer.name);
                
                if (!hasSourcePlayer || !hasTargetPlayer) {
                    return { isValid: false, reason: 'One or both players have moved to different courts' };
                }
                
                return { isValid: true };
            }
            
            default:
                return { isValid: false, reason: 'Unknown action type' };
        }
    }

    function executeUndoAction(actionIndex) {
        // Get the action
        const action = state.undoHistory.actions[actionIndex];
        if (!action) return;
        
        // Set flag to prevent WebSocket interference
        localChangeInProgress = true;
        
        // Execute undo
        if (action.undo) {
            action.undo();
        }
        
        // Remove from history
        state.undoHistory.actions.splice(actionIndex, 1);
        saveState();
        
        // Clean up modal data
        delete customKeypadModal.dataset.context;
        delete customKeypadModal.dataset.actionIndex;
        delete customKeypadModal.dataset.actionDescription;
        
        // Clear flag after a short delay to allow saveState to complete
        setTimeout(() => {
            localChangeInProgress = false;
        }, 500);
        
        // Show success message
        showUndoToast('Action undone successfully', null);
    }

// COMPLETE CORRECTED loadState FUNCTION
    async function loadState(MASTER_MEMBER_LIST) {
        try {
            const loaded = await API.loadState();

            if (loaded) {
                // Merge loaded announcement state with default
                if (loaded.customAnnouncementState) {
                    loaded.customAnnouncementState = { ...state.customAnnouncementState, ...loaded.customAnnouncementState };
                }

                // Perform the general merge first
                state = { ...state, ...loaded };

                // FIX: Reinitialize courts if loaded array is empty
                if (!state.courts || state.courts.length === 0) {
                    console.log("Empty courts array detected, reinitializing courts...");
                    state.courts = [
                        { id: 'A', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false, isModeOverlayActive: false, courtMode: 'doubles' },
                        { id: 'B', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false, isModeOverlayActive: false, courtMode: 'doubles' },
                        { id: 'C', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false, isModeOverlayActive: false, courtMode: 'doubles' },
                        { id: 'D', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false, isModeOverlayActive: false, courtMode: 'doubles' },
                        { id: 'E', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null, becameAvailableAt: Date.now(), isCollapsed: false, isModeOverlayActive: false, courtMode: 'doubles' }
                    ];
                }

                // Check and fix adminChecklist structure if outdated
                if (typeof state.adminChecklist !== 'object' || !Array.isArray(state.adminChecklist.arrival)) {
                    console.warn("Outdated adminChecklist structure found. Resetting to default.");
                    state.adminChecklist = {
                        arrival: [
                            { id: 'arrUnlockTuckshop', text: 'Unlock Tuckshop & Setup POS', checked: false },
                            { id: 'arrUnlockCloakrooms', text: 'Unlock Cloakrooms', checked: false },
                            { id: 'arrMainTv', text: 'Main TV: On & Sport Channel', checked: false },
                            { id: 'arrTuckshopTv', text: 'Tuckshop TV: On & Music Videos', checked: false },
                            { id: 'arrAmpAux', text: 'Amp: Aux Analog', checked: false },
                            { id: 'arrAmpOptical', text: 'Amp: Optical/Main TV', checked: false },
                            { id: 'arrOpenCurtains', text: 'Open Curtains & Sliding Door', checked: false },
                            { id: 'arrPutCushions', text: 'Put Out Bench Cushions', checked: false },
                            { id: 'arrSignOutBalls', text: 'Sign Out Social Balls (via Ball Mgmt)', checked: false },
                            { id: 'arrEmptyDishwasher', text: 'Empty Dishwasher & Check Dishes', checked: false },
                            { id: 'arrCheckFridge', text: 'Check Fridge for Expired Products', checked: false },
                            { id: 'arrEmptyBins', text: 'Empty Full Bins & Replace Liners', checked: false },
                            { id: 'arrManStation', text: 'Man Duty Station (Busy Times)', checked: false },
                            { id: 'arrAssistApp', text: 'Assist Members with App', checked: false },
                            { id: 'arrRemindAccounts', text: 'Remind Members re: Tuck Shop Accounts', checked: false }
                        ],
                        departure: [
                            { id: 'depReturnBalls', text: 'Return Social Balls & Sign In (via Ball Mgmt)', checked: false },
                            { id: 'depCheckOutApp', text: 'Ensure All Players Checked Out on App', checked: false },
                            { id: 'depLoadDishes', text: 'Load/Wash Dishes', checked: false },
                            { id: 'depReturnCushions', text: 'Return Bench Cushions', checked: false },
                            { id: 'depTurnOffTvAmp', text: 'Turn Off TVs & Amp', checked: false },
                            { id: 'depWipeBar', text: 'Wipe Down Bar Counter', checked: false },
                            { id: 'depEmptyIceBucket', text: 'Empty & Wash Ice Bucket', checked: false },
                            { id: 'depWipeKitchen', text: 'Wipe Down Kitchen Counter', checked: false },
                            { id: 'depTrashOut', text: 'Take Inside Trash to Outside Bins', checked: false },
                            { id: 'depLockBarStore', text: 'Lock Bar & Storeroom', checked: false },
                            { id: 'depCloseCurtains', text: 'Close Sliding Door & Curtains', checked: false },
                            { id: 'depLockClubhouseAlarm', text: 'Lock Clubhouse & Set Alarm', checked: false },
                            { id: 'depLockCloakrooms', text: 'Lock Cloakrooms', checked: false },
                            { id: 'depLockGates', text: 'Check & Lock Pedestrian Gates', checked: false }
                        ]
                    };
                }

                // Ensure uiSettings and its properties exist
                if (!state.uiSettings) {
                    state.uiSettings = { fontSizeMultiplier: 1.0, displaySizeMultiplier: 1.0 };
                } else {
                    if (state.uiSettings.displaySizeMultiplier === undefined) state.uiSettings.displaySizeMultiplier = 1.0;
                    if (state.uiSettings.fontSizeMultiplier === undefined) state.uiSettings.fontSizeMultiplier = 1.0; // Ensure font multiplier exists
                }

                // Ensure courtSettings and its properties exist
                if (!state.courtSettings) {
                    state.courtSettings = { visibleCourts: ['A', 'B', 'C', 'D', 'E'], autoAssignModes: true, showGameModeSelector: false };
                } else {
                     if (state.courtSettings.autoAssignModes === undefined) state.courtSettings.autoAssignModes = true;
                     if (state.courtSettings.showGameModeSelector === undefined) state.courtSettings.showGameModeSelector = false;
                     if (!Array.isArray(state.courtSettings.visibleCourts)) state.courtSettings.visibleCourts = ['A', 'B', 'C', 'D', 'E']; // Ensure visibleCourts is an array
                }

                // Ensure matchSettings and its properties exist
                if (!state.matchSettings) {
                    state.matchSettings = { matchMode: '1set', fastPlayGames: 4, autoMatchModes: true };
                } else {
                     if (state.matchSettings.autoMatchModes === undefined) state.matchSettings.autoMatchModes = true;
                     if (state.matchSettings.matchMode === undefined) state.matchSettings.matchMode = '1set';
                     if (state.matchSettings.fastPlayGames === undefined) state.matchSettings.fastPlayGames = 4;
                }

                 // Ensure juniorClub and its nested properties exist
                 if (!state.juniorClub) {
                     state.juniorClub = { parents: [], activeChildren: [], history: [], statsFilter: { parent: 'all', paid: 'all' }, rosterFilter: { sortKey: 'name', sortOrder: 'asc', type: 'all' }, checkInFilter: { displayMode: 'parent' }, registrationFlow: { parentCollapsed: false, childrenExpanded: false } };
                 } else {
                     if (!state.juniorClub.checkInFilter) state.juniorClub.checkInFilter = { displayMode: 'parent' };
                     if (!state.juniorClub.rosterFilter) state.juniorClub.rosterFilter = { sortKey: 'name', sortOrder: 'asc', type: 'all' };
                     if (!state.juniorClub.registrationFlow) state.juniorClub.registrationFlow = { parentCollapsed: false, childrenExpanded: false };
                     if (!state.juniorClub.statsFilter) state.juniorClub.statsFilter = { parent: 'all', paid: 'all' };
                     else if (state.juniorClub.statsFilter.paid === undefined) state.juniorClub.statsFilter.paid = 'all';
                 }

                state.gameHistory = state.gameHistory || [];
                state.reorderHistory = state.reorderHistory || [];
                state.guestHistory = state.guestHistory || [];

                state.statsFilter = state.statsFilter || { gender: 'all', teamGender: 'all', sortKey: 'totalDurationMs', sortOrder: 'desc' };
                 if (state.statsFilter.teamGender === undefined) state.statsFilter.teamGender = 'all';

                state.selectedAlertSound = state.selectedAlertSound || 'Alert1.mp3';

                if (!state.mobileControls) state.mobileControls = { isSummaryExpanded: true, isPlayersExpanded: true };

                if (!state.notificationControls) {
                    state.notificationControls = { isMuted: false, isMinimized: false, isTTSDisabled: false, autoMinimize: true };
                } else if (state.notificationControls.autoMinimize === undefined) state.notificationControls.autoMinimize = true;

                if (!state.adminCourtManagement) {
                    state.adminCourtManagement = { mode: 'card1_select_court', courtId: null, currentCourtPlayers: [], removedPlayers: [], addedPlayers: [] };
                }

                 if (!state.ballManagement) {
                    state.ballManagement = { stock: 0, usedStock: 0, history: [], historyFilter: 'all', tempSale: { stockType: null, memberSignOut: null, purchaserName: null, purchaserType: null } };
                 } else {
                    if (state.ballManagement.usedStock === undefined) state.ballManagement.usedStock = 0;
                    if (!state.ballManagement.historyFilter) state.ballManagement.historyFilter = 'all';
                    if (!state.ballManagement.tempSale) state.ballManagement.tempSale = { stockType: null, memberSignOut: null, purchaserName: null, purchaserType: null };
                    else if (state.ballManagement.tempSale.purchaserType === undefined) state.ballManagement.tempSale.purchaserType = null;
                 }

                 // Ensure lightSettings structure exists and has basic global keys
                 if (!state.lightSettings || typeof state.lightSettings !== 'object') {
                     state.lightSettings = { shellyBaseUrl: '', shellyAuthKey: '', courts: {}, general: {} };
                 }
                 if (state.lightSettings.shellyBaseUrl === undefined) state.lightSettings.shellyBaseUrl = '';
                 if (state.lightSettings.shellyAuthKey === undefined) state.lightSettings.shellyAuthKey = '';
                 if (!state.lightSettings.courts || typeof state.lightSettings.courts !== 'object') state.lightSettings.courts = {};
                 if (!state.lightSettings.general || typeof state.lightSettings.general !== 'object') state.lightSettings.general = {};

                 // Ensure default court settings exist if missing after load
                 const defaultCourtIds = ['A', 'B', 'C', 'D', 'E'];
                 defaultCourtIds.forEach(id => {
                     if (!state.lightSettings.courts[id]) {
                         state.lightSettings.courts[id] = { id: id, label: `Court ${id} Lights`, isManaged: false, isActive: false, shellyDeviceId: '', shellyCloudId: '' };
                     } else {
                        // Ensure all properties exist even if the court object was loaded partially
                        state.lightSettings.courts[id].id = state.lightSettings.courts[id].id || id;
                        state.lightSettings.courts[id].label = state.lightSettings.courts[id].label || `Court ${id} Lights`;
                        state.lightSettings.courts[id].isManaged = state.lightSettings.courts[id].isManaged !== undefined ? state.lightSettings.courts[id].isManaged : false;
                        state.lightSettings.courts[id].isActive = state.lightSettings.courts[id].isActive || false;
                        state.lightSettings.courts[id].shellyDeviceId = state.lightSettings.courts[id].shellyDeviceId || '';
                        state.lightSettings.courts[id].shellyCloudId = state.lightSettings.courts[id].shellyCloudId || '';
                     }
                 });
                 // Ensure default general light settings exist if missing
                 if (!state.lightSettings.general['clubhouse']) {
                      state.lightSettings.general['clubhouse'] = { id: 'clubhouse', label: 'Clubhouse Lights', isManaged: false, isActive: false, shellyDeviceId: '', shellyCloudId: '' };
                 }

                 // Ensure suggestionSettings and its properties exist
                 if (!state.suggestionSettings) {
                    state.suggestionSettings = { femaleRatioPercent: 50, maleRatioPercent: 70, prioritizeLeastPlaytime: true, powerScoreOnly: false, topPlayerPercent: 35, frequentOpponentPercent: 35, weakPlayerPercent: 35, weakPlayerThreshold: -0.1 };
                 } else {
                     // Add new properties if they are missing from older saved states
                    if (state.suggestionSettings.topPlayerPercent === undefined) state.suggestionSettings.topPlayerPercent = 35;
                    if (state.suggestionSettings.frequentOpponentPercent === undefined) state.suggestionSettings.frequentOpponentPercent = 35;
                    if (state.suggestionSettings.weakPlayerPercent === undefined) state.suggestionSettings.weakPlayerPercent = 35;
                    if (state.suggestionSettings.weakPlayerThreshold === undefined) state.suggestionSettings.weakPlayerThreshold = -0.1;
                 }

                state.checklistHistory = state.checklistHistory || [];
                state.selectedChecklistHistoryDate = state.selectedChecklistHistoryDate || null;
                state.undoHistory = state.undoHistory || { actions: [], maxHistory: 10 }; // Ensure undo history exists


                // Function to ensure player objects have needed properties
                const ensurePlayerObjects = (playerList, defaultList) => {
                     if (!Array.isArray(playerList)) return [];
                     return playerList.map(player => {
                        if (typeof player === 'string') {
                            const defaultPlayer = defaultList.find(p => p.name === player);
                            // Ensure default guest object includes type
                            return defaultPlayer || { name: player, gender: '?', guest: true, type: 'Adult', isPaused: false, onLeaderboard: true };
                        }
                         player.isPaused = player.isPaused || false;
                         player.onLeaderboard = player.onLeaderboard === undefined ? true : player.onLeaderboard;
                         // Ensure type exists, default to Adult if missing
                         player.type = player.type || 'Adult';
                        return player;
                    });
                };

                // Re-calculate clubMembers based on who is checked in
                const checkedInNames = new Set();
                 if (Array.isArray(state.availablePlayers)) {
                    state.availablePlayers.forEach(p => checkedInNames.add(p.name));
                 }
                state.courts.forEach(court => {
                    if (Array.isArray(court.players)) {
                        court.players.forEach(p => checkedInNames.add(p.name));
                    }
                });

                state.clubMembers = MASTER_MEMBER_LIST.filter(p => !checkedInNames.has(p.name));
                state.clubMembers.sort((a,b) => a.name.localeCompare(b.name));

                // Process availablePlayers and players on court
                state.availablePlayers = ensurePlayerObjects(state.availablePlayers, MASTER_MEMBER_LIST);

                state.courts.forEach(court => {
                    if (court.status === 'available' && court.becameAvailableAt === undefined) {
                        court.becameAvailableAt = Date.now();
                    }
                    court.isCollapsed = court.isCollapsed === undefined ? false : court.isCollapsed;
                    court.isModeOverlayActive = court.isModeOverlayActive === undefined ? false : court.isModeOverlayActive;
                    court.courtMode = court.courtMode || 'doubles';
                    court.teamsSet = court.teamsSet === undefined ? null : court.teamsSet; // null indicates unset for doubles

                    court.players = ensurePlayerObjects(court.players, MASTER_MEMBER_LIST);
                     if (!court.teams) {
                        court.teams = { team1: [], team2: [] };
                     } else {
                        court.teams.team1 = ensurePlayerObjects(court.teams.team1, MASTER_MEMBER_LIST);
                        court.teams.team2 = ensurePlayerObjects(court.teams.team2, MASTER_MEMBER_LIST);
                     }

                    // Restart timers if needed
                    if (court.status === "game_pending" && court.autoStartTimeTarget) {
                        const delay = court.autoStartTimeTarget - Date.now();
                        if (delay > 0) {
                            if (court.autoStartTimer) clearTimeout(court.autoStartTimer);
                            // IMPORTANT: Ensure handleStartGame is defined correctly
                            court.autoStartTimer = setTimeout(() => handleStartGame(court.id), delay);
                        } else {
                            // If delay is negative, start immediately
                             handleStartGame(court.id);
                        }
                    } else if (court.autoStartTimer) { // Clear timer if status isn't pending anymore
                         clearTimeout(court.autoStartTimer);
                         court.autoStartTimer = null;
                    }
                });

                console.log('State loaded from server successfully');
            } else {
                 console.log("No saved state found on server, using initial state.");
                 // Ensure lightSettings exists even with initial state
                  if (!state.lightSettings) {
                     state.lightSettings = { shellyBaseUrl: '', shellyAuthKey: '', courts: {}, general: {} };
                     // Populate initial default courts if needed
                     const defaultCourtIds = ['A', 'B', 'C', 'D', 'E'];
                     defaultCourtIds.forEach(id => {
                         state.lightSettings.courts[id] = { id: id, label: `Court ${id} Lights`, isManaged: false, isActive: false, shellyDeviceId: '', shellyCloudId: '' };
                     });
                     state.lightSettings.general['clubhouse'] = { id: 'clubhouse', label: 'Clubhouse Lights', isManaged: false, isActive: false, shellyDeviceId: '', shellyCloudId: '' };
                  }
            }
        } catch (error) {
            console.error('Error loading state:', error);
            console.log("Using initial state due to error.");
             // Ensure lightSettings exists even on error
              if (!state.lightSettings) {
                 state.lightSettings = { shellyBaseUrl: '', shellyAuthKey: '', courts: {}, general: {} };
                  // Populate initial default courts if needed
                 const defaultCourtIds = ['A', 'B', 'C', 'D', 'E'];
                 defaultCourtIds.forEach(id => {
                     state.lightSettings.courts[id] = { id: id, label: `Court ${id} Lights`, isManaged: false, isActive: false, shellyDeviceId: '', shellyCloudId: '' };
                 });
                 state.lightSettings.general['clubhouse'] = { id: 'clubhouse', label: 'Clubhouse Lights', isManaged: false, isActive: false, shellyDeviceId: '', shellyCloudId: '' };
              }
        }
    }

    function updateHeaderClock(){ 
        const date = new Date();
        const weekday = date.toLocaleDateString("en-ZA", { weekday: "long" });
        const day = String(date.getDate()).padStart(2, '0');

        // Get 24-hour time parts
        const hour24 = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        // Determine am/pm for the tag
        const ampm = date.getHours() >= 12 ? 'pm' : 'am';

        // Construct the custom time string
        const time = `${hour24}:${minutes}:${seconds} ${ampm}`;

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
                    if (remaining < 0) {
                        timerEl.textContent = "00:00";
                        return;
                    }
                    const minutes = Math.floor(remaining / 60000);
                    const seconds = Math.floor((remaining % 60000) / 1000);
                    timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
                } else {
                    timerEl.textContent = '';
                }
            }
        });

        document.querySelectorAll('.player-pause-cooldown').forEach(timerEl => {
            const pauseTime = parseInt(timerEl.dataset.pauseTime, 10);
            if (pauseTime) {
                const TEN_MINUTES_MS = 10 * 60 * 1000;
                const elapsed = Date.now() - pauseTime;
                const remaining = Math.max(0, TEN_MINUTES_MS - elapsed);
                
                if (remaining === 0) {
                    timerEl.textContent = "00m00s";
                    timerEl.classList.remove('player-pause-cooldown');
                } else {
                    const minutes = Math.floor(remaining / 60000);
                    const seconds = Math.floor((remaining % 60000) / 1000);
                    // --- THIS IS THE FORMAT CHANGE ---
                    timerEl.textContent = `${String(minutes).padStart(2, "0")}m${String(seconds).padStart(2, "0")}s`;
                }
            }
        });

        updateAlertStatusTimer();
    }


    // --- NEW: Global Keyboard Control Functions ---


    // --- MODIFIED: Ensure initialValue parameter exists ---
    function showGlobalKeyboard(inputElement, startingPage = 'LetterPad', initialValue = '') { // <-- Added initialValue parameter
        console.log('showGlobalKeyboard called for:', inputElement.id, 'Parent modal visible:', !document.getElementById('new-parent-modal').classList.contains('hidden'));
        activeGlobalInput = inputElement;
        globalKeyboardState.currentPage = startingPage;

        // For date/time inputs, show partial value or empty, otherwise use actual value
        if (inputElement.type === 'date' || inputElement.type === 'time') {
            // *** CHANGE textContent to value ***
            globalKeyboardDisplay.value = inputElement.dataset.partialValue || ''; //
        } else {
            // Use initialValue if provided, otherwise use inputElement.value
            // *** CHANGE textContent to value ***
            globalKeyboardDisplay.value = initialValue || activeGlobalInput.value; //
        }

        // *** CHANGE scrollTop to scrollHeight ***
        globalKeyboardDisplay.scrollTop = globalKeyboardDisplay.scrollHeight; //

        customAlphaKeypadModal.classList.add('hidden');
        customKeypadModal.classList.add('hidden');
        globalKeyboardModal.classList.remove('hidden');

        renderGlobalKeyboard();
        // *** NEW: Focus the textarea when shown ***
        globalKeyboardDisplay.focus(); //
        // Move cursor to the end
        globalKeyboardDisplay.selectionStart = globalKeyboardDisplay.selectionEnd = globalKeyboardDisplay.value.length; //
    }

    function hideGlobalKeyboard() {
        // Clear partial value data attribute if it exists
        if (activeGlobalInput && activeGlobalInput.dataset.partialValue !== undefined) {
            delete activeGlobalInput.dataset.partialValue;
        }
        
        globalKeyboardModal.classList.add('hidden');
        activeGlobalInput = null;
        globalKeyboardState.currentPage = 'LetterPad';
        globalKeyboardState.case = 'lower';
        clearTimeout(globalKeyboardState.longPressTimer);
    }
    // --- END NEW: Global Keyboard Control Functions ---

    // --- NEW: Function to update the overlay display ---
    function updateOverlayDisplay(inputElement, overlay, partialValue) {
        const isDate = inputElement.type === 'date';
        const currentPart = inputElement.dataset.currentDatePart;
        
        if (isDate) {
            // Extract parts from partial value (YYYYMMDD)
            const year = partialValue.slice(0, 4).padEnd(4, 'y');
            const month = partialValue.slice(4, 6).padEnd(2, 'm');
            const day = partialValue.slice(6, 8).padEnd(2, 'd');
            
            // Update each part in the overlay
            const parts = overlay.querySelectorAll('.part');
            parts[0].textContent = year.replace(/y/g, (match, offset) => 'yyyy'[offset]);
            parts[0].classList.toggle('filled', partialValue.length > 0);
            parts[0].classList.toggle('empty', partialValue.length === 0);
            parts[0].classList.toggle('active', currentPart === 'YYYY');
            
            parts[1].textContent = month.replace(/m/g, (match, offset) => 'mm'[offset]);
            parts[1].classList.toggle('filled', partialValue.length > 4);
            parts[1].classList.toggle('empty', partialValue.length <= 4);
            parts[1].classList.toggle('active', currentPart === 'MM');
            
            parts[2].textContent = day.replace(/d/g, (match, offset) => 'dd'[offset]);
            parts[2].classList.toggle('filled', partialValue.length > 6);
            parts[2].classList.toggle('empty', partialValue.length <= 6);
            parts[2].classList.toggle('active', currentPart === 'DD');
        } else {
            // Time input (HHMM)
            const hour = partialValue.slice(0, 2).padEnd(2, '-');
            const minute = partialValue.slice(2, 4).padEnd(2, '-');
            
            // Update each part in the overlay
            const parts = overlay.querySelectorAll('.part');
            parts[0].textContent = hour;
            parts[0].classList.toggle('filled', partialValue.length > 0);
            parts[0].classList.toggle('empty', partialValue.length === 0);
            parts[0].classList.toggle('active', currentPart === 'HH');
            
            parts[1].textContent = minute;
            parts[1].classList.toggle('filled', partialValue.length > 2);
            parts[1].classList.toggle('empty', partialValue.length <= 2);
            parts[1].classList.toggle('active', currentPart === 'MM');
        }
    }
    // --- END NEW ---

    // --- NEW: Global Keyboard Rendering and Logic ---

    // Helper to get the correct character based on case
    function getCharForCase(key) {
        if (globalKeyboardState.case === 'upper' || globalKeyboardState.case === 'shift') {
            return key.toUpperCase();
        }
        return key.toLowerCase();
    }

    // Helper to switch the keyboard page
    function switchGlobalKeyboardPage(newPage) {
        if (newPage === 'LetterPad') {
            // When returning to letter pad, reset to initial case state
            globalKeyboardState.case = 'lower'; 
        }
        globalKeyboardState.currentPage = newPage;
        renderGlobalKeyboard();
    }

    function renderGlobalKeyboard(searchTerm = '') {
        const currentPage = globalKeyboardState.currentPage;
        const layout = KEYBOARD_LAYOUTS[currentPage];
        globalKeyboardGrid.innerHTML = '';
        globalKeyboardGrid.classList.remove('emoji-grid');

        // --- Control visibility of the search container ---
        if (currentPage === 'EmojiPage') {
            emojiSearchContainer.classList.add('active-page');
            emojiSearchContainer.classList.remove('hidden');
        } else {
            emojiSearchContainer.classList.remove('active-page');
            emojiSearchContainer.classList.add('hidden');
        }

        if (currentPage === 'EmojiPage') {
            globalKeyboardGrid.classList.add('emoji-grid');
            renderEmojiPage(searchTerm);
            return;
        }

        // --- Set page attribute for CSS targeting ---
        // Find the .keyboard-content container (parent of globalKeyboardGrid)
        const keyboardContent = globalKeyboardGrid.closest('.keyboard-content');
        if (keyboardContent) {
            keyboardContent.setAttribute('data-page', currentPage);
        }

        layout.forEach((rowKeys, rowIndex) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = `keyboard-row row-${rowIndex}`;

            let isNavigationRow = false;

            // --- Apply custom row layout for Letter/Symbol pages ---
            if (currentPage !== 'NumberPad') {
                if (currentPage === 'LetterPad' && rowIndex === 1) {
                    // Row 1 (A-L): 9 keys centered
                    rowDiv.style.gridTemplateColumns = 'repeat(9, 1fr)';
                    rowDiv.style.width = '90%';
                    rowDiv.style.margin = '0 auto';
                } else if (currentPage === 'LetterPad' && rowIndex === 2) {
                    // Row 2 (Shift ZXC...): Custom fractions
                    rowDiv.style.gridTemplateColumns = '1.5fr repeat(7, 1fr) 1.5fr';
                } else if (rowIndex === layout.length - 1) {
                    // Last Row (NAV): Custom fractions
                    rowDiv.style.gridTemplateColumns = '1.5fr 1fr 5fr 1fr 1.5fr';
                    isNavigationRow = true;
                } else {
                    // Default 10 columns for QWERTY and Symbols P1/P2
                    rowDiv.style.gridTemplateColumns = 'repeat(10, 1fr)';
                }
            }
            // --- Apply custom row layout for NumberPad ---
            else { // currentPage === 'NumberPad'
                // Row 0, 1, 2: 5 equal columns (full width)
                if (rowIndex < 3) {
                    rowDiv.style.gridTemplateColumns = 'repeat(5, 1fr)';
                    rowDiv.style.width = '100%';
                } 
                // Row 3: 7 equal columns (full width)
                else if (rowIndex === 3) {
                    // Use 7 equal columns for all 7 keys
                    rowDiv.style.gridTemplateColumns = 'repeat(7, 1fr)';
                    rowDiv.style.width = '100%';
                    isNavigationRow = true;
                }
            }

            rowKeys.forEach(key => {
                const button = document.createElement('button');
                button.className = 'global-keypad-btn';
                button.dataset.key = key;

                let displayChar = getCharForCase(key);
                let isActionOrSpecial = false;

                // --- NumberPad Specific Styling (NO GRID SPANNING) ---
                if (currentPage === 'NumberPad') {
                    if (key === 'ENTER') { 
                        // MODIFIED: Use standard Unicode character for Return/Enter key
                        displayChar = '\u23CE'; // Return Symbol (⏎)
                        button.classList.add('key-action');
                        isActionOrSpecial = true;
                    } else if (key === 'BACK') {
                        displayChar = '⌫';
                        button.classList.add('key-action');
                        isActionOrSpecial = true;
                    } else if (key === 'DOT') {
                        displayChar = '.';
                    } else if (key === 'PERCENT') {
                        displayChar = '%';
                    } else if (key === 'COMMA') {
                        displayChar = ',';
                    } else if (['+', '-', '*', '='].includes(key)) {
                        button.classList.add('key-special');
                        isActionOrSpecial = true;
                    } else if (key === 'SPACE') {
                        displayChar = 'space';
                        button.classList.add('key-special');
                        isActionOrSpecial = true;
                    } else if (key === '?123') {
                        displayChar = '?123';
                        button.classList.add('key-special');
                        isActionOrSpecial = true;
                    } else if (key === 'ABC') {
                        displayChar = 'ABC';
                        button.classList.add('key-special');
                        isActionOrSpecial = true;
                    }

                    // CRITICAL: DO NOT use gridColumn span for NumberPad Row 3
                    // The fractional grid layout handles the sizing automatically
                    // Remove all gridColumn assignments for NumberPad keys
                }
                
                // --- General Key Handling ---
                if (key === 'SHIFT') {
                    displayChar = (globalKeyboardState.case === 'upper' || globalKeyboardState.case === 'shift') ? '⇧' : 'Caps';
                    button.classList.add('key-special');
                    isActionOrSpecial = true;
                    if (globalKeyboardState.case === 'upper') {
                        button.classList.add('active'); 
                    }
                } else if (key === 'BACK' && currentPage !== 'NumberPad') {
                    displayChar = '⌫';
                    button.classList.add('key-action');
                    isActionOrSpecial = true;
                } else if (key === 'ENTER') {
                    // MODIFIED: Use standard Unicode character for Return/Enter key
                    displayChar = '\u23CE'; // Return Symbol (⏎)
                    button.classList.add('key-action');
                    isActionOrSpecial = true;
                } else if (key === 'SPACE' && currentPage !== 'NumberPad') {
                    displayChar = 'space';
                } else if (key === 'GLOBE' || key === 'MIC') {
                    displayChar = (key === 'GLOBE') ? '🌐' : '🎙️';
                    button.classList.add('key-special');
                    isActionOrSpecial = true;
                } else if (['?123', 'ABC', '1234', '!@#'].includes(key) && currentPage !== 'NumberPad') {
                    displayChar = key;
                    button.classList.add('key-special');
                    isActionOrSpecial = true;
                }

                // Custom override for `, / 😀` button appearance
                if (key === ', / 😀') {
                    displayChar = (currentPage === 'LetterPad') ? ', / 😀' : ',';
                    button.classList.remove('key-special');
                    isActionOrSpecial = false;
                }

                button.textContent = displayChar;
                button.addEventListener('click', handleGlobalKeypadClick);

                // Add long press listener for the Emoji key on LetterPad
                if (currentPage === 'LetterPad' && key === ', / 😀') {
                    // ... (long press logic remains the same) ...
                }

                rowDiv.appendChild(button);
            });
            globalKeyboardGrid.appendChild(rowDiv);
        });
    }

    // Simplified Emoji Renderer (needs work if implementing full scrollable list)
    function renderEmojiPage(searchTerm) {
        // Search container visibility is now controlled by renderGlobalKeyboard()
        globalKeyboardGrid.style.gridTemplateColumns = 'repeat(7, 1fr)'; // 7 columns for emoji grid

        const filteredEmojis = EMOJI_LIST.filter(e => !searchTerm || e.toLowerCase().includes(searchTerm.toLowerCase()));

        // Add the bottom navigation bar for the Emoji Page first
        const navRow = document.createElement('div');
        navRow.className = 'keyboard-row row-nav';
        navRow.style.gridTemplateColumns = '1.5fr 1fr 1fr 1.5fr'; 
        
        // ABC (Back to LetterPad)
        let btnABC = document.createElement('button');
        btnABC.className = 'global-keypad-btn key-special';
        btnABC.textContent = 'ABC';
        btnABC.dataset.key = 'ABC';
        btnABC.addEventListener('click', handleGlobalKeypadClick);
        navRow.appendChild(btnABC);

        // Globe (Placeholder/Future use)
        let btnGlobe = document.createElement('button');
        btnGlobe.className = 'global-keypad-btn key-special';
        btnGlobe.textContent = '🌐';
        btnGlobe.dataset.key = 'GLOBE';
        navRow.appendChild(btnGlobe);
        
        // Mic (Placeholder/Future use)
        let btnMic = document.createElement('button');
        btnMic.className = 'global-keypad-btn key-special';
        btnMic.textContent = '🎙️';
        btnMic.dataset.key = 'MIC';
        navRow.appendChild(btnMic);
        
        // !@# (Symbols P1)
        let btnSymbols = document.createElement('button');
        btnSymbols.className = 'global-keypad-btn key-special';
        btnSymbols.textContent = '!@#';
        btnSymbols.dataset.key = '!@#';
        btnSymbols.addEventListener('click', handleGlobalKeypadClick);
        navRow.appendChild(btnSymbols);

        globalKeyboardGrid.appendChild(navRow);
        
        // Render the Emojis
        filteredEmojis.forEach(emoji => {
            const button = document.createElement('button');
            button.className = 'global-keypad-btn key-emoji';
            button.dataset.key = emoji;
            button.textContent = emoji;
            button.addEventListener('click', handleGlobalKeypadClick);
            globalKeyboardGrid.appendChild(button);
        });
    }


    // Main click handler for the Global Keyboard
    function handleGlobalKeypadClick(e) {
        e.preventDefault();
        const key = e.target.dataset.key;
        // *** CHANGE textContent to value ***
        let currentValue = globalKeyboardDisplay.value; // Get value from textarea
        const isTargetDateInput = activeGlobalInput && activeGlobalInput.type === 'date';
        const isTargetTimeInput = activeGlobalInput && activeGlobalInput.type === 'time';
        const isTargetDateOrTimeInput = isTargetDateInput || isTargetTimeInput;

        // *** NEW: Get current cursor position ***
        const start = globalKeyboardDisplay.selectionStart; //
        const end = globalKeyboardDisplay.selectionEnd; //
        // *** END NEW ***

        clearTimeout(globalKeyboardState.longPressTimer);

        // --- Navigation Logic (Remains the same) ---
        // ... (if/else if blocks for '?123', 'ABC', etc.) ...

        // --- Character Input / Special Actions ---

        // Handle BACKSPACE
        if (key === 'BACK') {
            if (isTargetDateOrTimeInput) {
                // ... (Date/Time backspace logic remains the same, using partialValue) ...
            } else {
                // *** MODIFIED: Handle backspace with cursor position ***
                if (start === end && start > 0) { // Single character delete
                    currentValue = currentValue.substring(0, start - 1) + currentValue.substring(end); //
                    globalKeyboardDisplay.value = currentValue; // Update value
                    globalKeyboardDisplay.selectionStart = globalKeyboardDisplay.selectionEnd = start - 1; // Move cursor back
                } else if (start !== end) { // Selection delete
                    currentValue = currentValue.substring(0, start) + currentValue.substring(end); //
                    globalKeyboardDisplay.value = currentValue; // Update value
                    globalKeyboardDisplay.selectionStart = globalKeyboardDisplay.selectionEnd = start; // Move cursor to start of deletion
                }
                // *** END MODIFIED ***
            }
        }
        // Handle ENTER/DONE
        else if (key === 'ENTER' || key === 'RETURN_KEY') {
            if (isTargetDateOrTimeInput) {
                // ... (Date/Time Enter logic remains the same) ...
            } else {
                // *** MODIFIED: Insert newline at cursor ***
                const newline = '\n';
                currentValue = currentValue.substring(0, start) + newline + currentValue.substring(end); //
                globalKeyboardDisplay.value = currentValue; // Update value
                globalKeyboardDisplay.selectionStart = globalKeyboardDisplay.selectionEnd = start + newline.length; // Move cursor after newline
                // *** END MODIFIED ***
            }
        }
        // Handle SHIFT (no change needed here)
        else if (key === 'SHIFT') { /* ... */ globalKeyboardState.case === 'lower' ? (globalKeyboardState.case = 'shift') : (globalKeyboardState.case === 'shift' ? globalKeyboardState.case = 'upper' : globalKeyboardState.case = 'lower'); renderGlobalKeyboard(); return; } // Simplified shift logic

        // Handle SPACE
        else if (key === 'SPACE') { // *** MODIFIED: Insert space at cursor ***
            const space = ' ';
            currentValue = currentValue.substring(0, start) + space + currentValue.substring(end); //
            globalKeyboardDisplay.value = currentValue; // Update value
            globalKeyboardDisplay.selectionStart = globalKeyboardDisplay.selectionEnd = start + space.length; // Move cursor after space
        }
        // Handle other special/navigation keys (no change needed for page switching logic)
        else if (key === ', / 😀' || key === 'COMMA') {
             const char = (globalKeyboardState.currentPage === 'LetterPad' && globalKeyboardState.case === 'lower') ? ',' : ',';
             currentValue = currentValue.substring(0, start) + char + currentValue.substring(end);
             globalKeyboardDisplay.value = currentValue;
             globalKeyboardDisplay.selectionStart = globalKeyboardDisplay.selectionEnd = start + char.length;
        } else if (key === 'GLOBE' || key === 'MIC') { /* ... */ return; }
        else if (key === 'DOT' || key === '.') {
             const char = '.';
             currentValue = currentValue.substring(0, start) + char + currentValue.substring(end);
             globalKeyboardDisplay.value = currentValue;
             globalKeyboardDisplay.selectionStart = globalKeyboardDisplay.selectionEnd = start + char.length;
        }
        // ... (Handle other non-character keys like +/-, %, operators if needed) ...

        // Handle NUMBER keys (0-9) - REVISED LOGIC (Date/Time logic remains the same)
        else if (key >= '0' && key <= '9') {
             if (isTargetDateInput || isTargetTimeInput) {
                 // ... (Date/Time number input logic remains the same) ...
             } else {
                 // *** MODIFIED: Insert digit at cursor ***
                 currentValue = currentValue.substring(0, start) + key + currentValue.substring(end); //
                 globalKeyboardDisplay.value = currentValue; // Update value
                 globalKeyboardDisplay.selectionStart = globalKeyboardDisplay.selectionEnd = start + 1; // Move cursor after digit
                 // *** END MODIFIED ***
             }
        }

        // Handle regular character keys (Letters, non-date symbols)
        else {
            if (isTargetDateOrTimeInput) return; // Ignore letters/symbols for date/time input

            const char = getCharForCase(key);
            // *** MODIFIED: Insert character at cursor ***
            currentValue = currentValue.substring(0, start) + char + currentValue.substring(end); //
            globalKeyboardDisplay.value = currentValue; // Update value
            globalKeyboardDisplay.selectionStart = globalKeyboardDisplay.selectionEnd = start + char.length; // Move cursor after character
            // *** END MODIFIED ***

            if (globalKeyboardState.case === 'shift') {
                globalKeyboardState.case = 'lower';
                renderGlobalKeyboard();
            }
        }

        // --- Update non-date input fields and dispatch event ---
        if (!isTargetDateOrTimeInput && activeGlobalInput) {
            // *** CHANGE textContent to value ***
            activeGlobalInput.value = globalKeyboardDisplay.value; // Sync original input
            activeGlobalInput.dispatchEvent(new Event('input'));
        }
        // Scroll keypad display if needed
        globalKeyboardDisplay.scrollTop = globalKeyboardDisplay.scrollHeight; //
        // *** NEW: Refocus the textarea after button click ***
        globalKeyboardDisplay.focus(); //
    }

    // --- END NEW: Global Keyboard Rendering and Logic ---

    // Wire up search bar listener for emoji filtering
    emojiSearchInput?.addEventListener('input', (e) => {
        renderGlobalKeyboard(e.target.value);
    });


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

    // --- NEW HELPER: Find which page a data-key belongs to ---
    function findKeyPage(dataKeyToFind) {
        for (const pageName in KEYBOARD_LAYOUTS) {
            const layout = KEYBOARD_LAYOUTS[pageName];
            for (const row of layout) {
                if (row.includes(dataKeyToFind)) {
                    return pageName; // Return the name of the page (e.g., 'SymbolsP1')
                }
            }
        }
        // Check special combined keys specifically
        if (dataKeyToFind === ',' || dataKeyToFind === '/' || dataKeyToFind === '😀') {
             if (KEYBOARD_LAYOUTS['LetterPad'][3].includes(', / 😀')) return 'LetterPad';
        }
        if (dataKeyToFind === '.') {
             if (KEYBOARD_LAYOUTS['NumberPad'][3].includes('DOT')) return 'NumberPad';
        }
         if (dataKeyToFind === '%') {
             if (KEYBOARD_LAYOUTS['NumberPad'][0].includes('PERCENT')) return 'NumberPad';
        }

        return null; // Key not found in any standard layout
    }
    // --- END NEW HELPER ---


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
        const apiUrl = API_ENDPOINTS.controlLight;

        // Get toggleAfter - 0 means permanent toggle, >0 means pulse control
        const toggleAfter = light.toggleAfter || 0;

        const shellyCloudUrl = state.lightSettings?.shellyBaseUrl || '';
        const authKey = state.lightSettings?.shellyAuthKey || '';
        const deviceId = light.shellyCloudId || '';
        const shellyIp = light.shellyDeviceId || '';

        const bodyData = {
            shellyCloudUrl: shellyCloudUrl,
            authKey: authKey,
            deviceId: deviceId,
            toggleAfter: toggleAfter,  // 0 for lights, 1 for gates
            shellyIp: shellyIp,
            state: isActive,
            method: 'cloud-first'
        };

        const hasCloudConfig = !!(shellyCloudUrl && shellyCloudUrl.trim() && 
                                authKey && authKey.trim() && 
                                deviceId && deviceId.trim());
        const hasLocalConfig = !!(shellyIp && shellyIp.trim());

        console.log(`[Frontend] Sending ${toggleAfter === 0 ? 'toggle' : 'pulse'} command for ${light.label}:`, {
            method: bodyData.method,
            state: isActive,
            toggleAfter: toggleAfter,
            hasCloudConfig: hasCloudConfig,
            hasLocalConfig: hasLocalConfig
        });

        if (!hasCloudConfig && !hasLocalConfig) {
            console.error('[Frontend] ❌ No control method configured!');
            return { 
                success: false, 
                message: 'No control method configured. Check Admin > Gate/Light Settings.' 
            };
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData),
                signal: AbortSignal.timeout(15000)
            });

            if (!response.ok) {
                let errorMsg = `Server error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorData.error || errorMsg;
                    console.error('[Frontend] Server error details:', errorData);
                } catch (e) { /* Ignore */ }
                console.error(`[Frontend] Error response from proxy: ${response.status}`);
                throw new Error(errorMsg);
            }

            const data = await response.json();
            console.log(`[Frontend] Response from proxy:`, data);

            if (data.success) {
                if (data.method) {
                    console.log(`[Frontend] ✅ Control via: ${data.method.toUpperCase()}`);
                }
                return { success: true, data: data.data, method: data.method };
            } else {
                return { success: false, message: data.message || data.error || 'Failed to control device.' };
            }

        } catch (error) {
            console.error(`[Frontend] Error calling proxy API:`, error);
            if (error.name === 'AbortError') {
                return { success: false, message: 'Request timed out.' };
            }
            if (error.message.includes('Failed to fetch')) {
                return { success: false, message: 'Network error.' };
            }
            return { success: false, message: error.message };
        }
    }

    // Gate Control Functions
    async function handleGateButtonClick(gateType) {
        const gate = state.gateSettings?.[gateType];
        const button = document.getElementById(`${gateType}-gate-btn`);
        
        if (!gate) {
            console.error(`Gate settings for ${gateType} not found!`);
            playCustomTTS('Gate not configured.');
            return;
        }
        
        if (!gate.isManaged) {
            playCustomTTS(`${gate.label} control is disabled. Long-press to configure.`);
            return;
        }
        
        console.log(`[Gate] Activating ${gate.label}...`);
        
        // Disable button during pulse
        button.disabled = true;
        button.classList.add('pulsing');
        
        // Send pulse command (turn on, will auto-off after 1 second via cloud API)
        const apiResult = await sendLightCommand(gate, true);
        
        // Keep pulsing animation for full 1 second
        setTimeout(() => {
            button.classList.remove('pulsing');
            button.disabled = false;
        }, 1000);
        
        if (apiResult.success) {
            console.log(`[Gate] ${gate.label} activated successfully via ${apiResult.method}`);
            playCustomTTS(`${gate.label} activated.`);
        } else {
            console.error(`[Gate] Failed to activate ${gate.label}:`, apiResult.message);
            playCustomTTS(`Error: Failed to activate ${gate.label}.`);
        }
    }

    function setupGateButtonLongPress(gateType) {
        const button = document.getElementById(`${gateType}-gate-btn`);
        if (!button) return;
        
        // Pointer down - start timer
        button.addEventListener('pointerdown', (e) => {
            gateButtonIsLongPress = false;
            
            gateButtonPressTimer = setTimeout(() => {
                gateButtonIsLongPress = true;
                console.log(`[Gate] Long press detected on ${gateType}`);
                
                // Visual feedback
                button.style.transform = 'scale(0.95)';
                
                // Show settings modal
                showGateSettingsModal(gateType);
                
            }, 800); // 800ms for long press
        });
        
        // Pointer up - either short click or cancel long press
        button.addEventListener('pointerup', (e) => {
            if (gateButtonPressTimer) {
                clearTimeout(gateButtonPressTimer);
            }
            
            button.style.transform = '';
            
            // Only trigger click if it wasn't a long press
            if (!gateButtonIsLongPress) {
                handleGateButtonClick(gateType);
            }
            
            gateButtonIsLongPress = false;
        });
        
        // Pointer leave - cancel timer
        button.addEventListener('pointerleave', (e) => {
            if (gateButtonPressTimer) {
                clearTimeout(gateButtonPressTimer);
            }
            button.style.transform = '';
            gateButtonIsLongPress = false;
        });
    }

    // ============================================================================
    // GATE SETTINGS MODAL FUNCTIONS (SEPARATE MODALS)
    // ============================================================================

    function showGateSettingsModal(gateType) {
        const modal = document.getElementById(`${gateType}-gate-settings-modal`);
        const gate = state.gateSettings?.[gateType] || {
            shellyCloudId: '',
            shellyDeviceId: '',
            isManaged: false
        };
        
        // Populate fields
        document.getElementById(`${gateType}-gate-managed`).checked = gate.isManaged;
        document.getElementById(`${gateType}-gate-cloud-id`).value = gate.shellyCloudId || '';
        document.getElementById(`${gateType}-gate-local-ip`).value = gate.shellyDeviceId || '';
        
        modal.classList.remove('hidden');
    }

    function saveGateSettings(gateType) {
        // Initialize gateSettings if it doesn't exist
        if (!state.gateSettings) {
            state.gateSettings = {
                pedestrian: { label: 'Pedestrian Gate', toggleAfter: 1 },
                parking: { label: 'Parking Lot Gate', toggleAfter: 1 }
            };
        }
        
        // Ensure this gate exists
        if (!state.gateSettings[gateType]) {
            state.gateSettings[gateType] = {
                label: gateType === 'pedestrian' ? 'Pedestrian Gate' : 'Parking Lot Gate',
                toggleAfter: 1
            };
        }
        
        // Save settings
        state.gateSettings[gateType].isManaged = document.getElementById(`${gateType}-gate-managed`).checked;
        state.gateSettings[gateType].shellyCloudId = document.getElementById(`${gateType}-gate-cloud-id`).value.trim();
        state.gateSettings[gateType].shellyDeviceId = document.getElementById(`${gateType}-gate-local-ip`).value.trim();
        state.gateSettings[gateType].toggleAfter = 1;  // Always 1 second for gates
        
        // Clear settings if not managed
        if (!state.gateSettings[gateType].isManaged) {
            state.gateSettings[gateType].shellyCloudId = '';
            state.gateSettings[gateType].shellyDeviceId = '';
        }
        
        console.log(`[Gate Settings] Saved ${gateType}:`, state.gateSettings[gateType]);
        
        saveState();
        document.getElementById(`${gateType}-gate-settings-modal`).classList.add('hidden');
        playCustomTTS(`${state.gateSettings[gateType].label} settings saved.`);
    }

    // Event Listeners (add these in your DOMContentLoaded section)
    document.getElementById('pedestrian-gate-btn')?.addEventListener('click', () => {
        handleGateButtonClick('pedestrian');
    });

    document.getElementById('parking-gate-btn')?.addEventListener('click', () => {
        handleGateButtonClick('parking');
    }); 



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

        //playCustomTTS(`Stock updated. Returned ${count} used balls.`);
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

    // NEW FUNCTION: Handles the selection of Cans or Singles for a Sale
    function handleSaleStockTypeSelection(stockType) {
        if (stockType === 'cans' && state.ballManagement.stock === 0) {
            playCustomTTS("Cannot sell cans. Stock is empty.");
            return;
        }
        if (stockType === 'singles' && state.ballManagement.usedStock === 0) {
            playCustomTTS("Cannot sell old balls. Used stock is empty.");
            return;
        }

        // Store the selection
        state.ballManagement.tempSale.stockType = stockType;
        
        ballSaleTypeModal.classList.add('hidden');
        
        // Next step is always to select the committee member who is signing out the stock
        // The category is hardcoded as 'Sale' to trigger the custom sale flow in handleMemberSelectionConfirm
        showMemberSelectionModal('signout', 'Sale');
    }

    // NEW FUNCTION: Confirms the purchaser and proceeds to quantity keypad (Step 4 is skipped)
    function confirmPurchaser(purchaserName, purchaserType) {
        const tempSale = state.ballManagement.tempSale;
        const memberSignOut = tempSale.memberSignOut; // Committee member's name

        tempSale.purchaserName = purchaserName;
        tempSale.purchaserType = purchaserType;
        
        // Close the relevant modal if it's not already closed
        guestNameModal.classList.add('hidden');
        document.getElementById('returning-guest-modal').classList.add('hidden');
        purchaserSelectionModal.classList.add('hidden');

        // CRITICAL FIX: Ensure ALL required context variables are set on the keypad modal
        customKeypadModal.dataset.member = memberSignOut; 
        customKeypadModal.dataset.action = 'signout'; 
        customKeypadModal.dataset.purchaserName = purchaserName; 
        customKeypadModal.dataset.category = 'Sale'; // <-- FIX: Set the category explicitly here!

        // Proceed to quantity keypad
        showKeypad(null, { 
            mode: 'signOut', 
            maxLength: 2, 
            title: `Quantity for ${purchaserName}` 
        });
    }

    // 2. Initial Entry Point for Sign Out
    function handleSignOut(e) {
        const button = e.target.closest('.sign-out-btn');
        if (!button) return;

        if (button.disabled) {
            //playCustomTTS("Sign out requires balls. Please add stock first.");
            return;
        }

        const category = button.dataset.category;

        // --- NEW LOGIC: Start sale flow if category is 'Sale' ---
        if (category === 'Sale') {
            // CRITICAL FIX: Clear temporary sale state before starting new flow
            state.ballManagement.tempSale = { stockType: null, memberSignOut: null, purchaserName: null, purchaserType: null };
            ballManagementModal.classList.add('hidden');
            ballSaleTypeModal.classList.remove('hidden');
            return;
        }
        // --- END NEW LOGIC ---

        showMemberSelectionModal('signout', category);
    }

// 3. Generalized Member Selection Modal
    function showMemberSelectionModal(action, category = null) {
        signOutMemberList.innerHTML = '';
        const indexElement = document.getElementById('sign-out-member-abc-index'); // Get index element

        // Set modal prompt based on the action
        // ... (rest of the prompt setting logic remains the same) ...

        // Store action context in the modal
        // ... (rest of the dataset setting logic remains the same) ...

        const members = MASTER_MEMBER_LIST.filter(m => m.committee).sort((a, b) => a.name.localeCompare(b.name));

        if (members.length === 0) {
            signOutMemberList.innerHTML = '<li style="justify-content: center; color: var(--cancel-color);">No committee members found.</li>';
            indexElement.innerHTML = ''; // Clear index if list is empty
            // ... (rest of the return logic remains the same) ...
            return;
        }

        signOutMemberConfirmBtn.disabled = true;

        members.forEach(member => {
            const li = document.createElement('li');
            li.className = 'committee-member';
            li.dataset.player = member.name; // Use data-player for consistency
            // --- ADD data-player-name attribute for index ---
            li.dataset.playerName = member.name;
            // --- END ADD ---
            li.innerHTML = `<label><input type="radio" name="signoutMember" value="${member.name}"><div class="member-details"><span class="member-name">${member.name}</span><span class="member-designation">${member.committee || 'Member'}</span></div></label>`;
            signOutMemberList.appendChild(li);
        });

        signOutMemberList.querySelectorAll('input[name="signoutMember"]').forEach(radio => {
            // Re-bind listener: remove old, add new
            radio.removeEventListener('change', enableSignOutConfirm); // Use named function
            radio.addEventListener('change', enableSignOutConfirm);    // Use named function
        });

        // --- ADD THIS LINE ---
        setupListWithIndex(members, signOutMemberList, indexElement);
        // --- END ADD ---

        adminSettingsModal.classList.add('hidden');
        ballManagementModal.classList.add('hidden');
        signOutMemberModal.classList.remove('hidden');
    }

    // --- NEW HELPER FUNCTION FOR ENABLING CONFIRM BUTTON ---
    function enableSignOutConfirm() {
        signOutMemberConfirmBtn.disabled = false;
    }
    // --- END NEW HELPER FUNCTION ---

    // 4. Generalized Member Confirmation and Keypad Trigger
    function handleMemberSelectionConfirm() {
        const action = signOutMemberModal.dataset.action;
        const member = signOutMemberList.querySelector('input[name="signoutMember"]:checked').value;
        
        // --- NEW LOGIC: If it's a sale, redirect to purchaser selection first ---
        if (action === 'signout' && signOutMemberModal.dataset.category === 'Sale' && !state.ballManagement.tempSale.memberSignOut) {
            signOutMemberModal.classList.add('hidden');
            // This is the committee member who is signing out, pass their name to the next step
            showPurchaserSelectionModal(member); 
            return;
        }
        // --- END NEW LOGIC ---

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
            
            // CRITICAL FIX: For a non-sale signout, manually set required data attributes on the keypad modal
            const stockType = 'cans';
            const purchaserName = member;

            customKeypadModal.dataset.stockType = stockType; 
            customKeypadModal.dataset.purchaserName = purchaserName; 
            
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
        
        // --- CONTEXT VARIABLES ---
        const tempSale = state.ballManagement.tempSale;
        
        // For sale transactions, pull all context from tempSale. For non-sale, use defaults.
        const isSale = category === 'Sale';

        // stockType is 'cans' by default for non-sale (League, Social)
        const stockType = isSale ? tempSale.stockType : 'cans'; 
        
        // purchaserName is the member's name by default for non-sale
        const purchaserName = isSale ? tempSale.purchaserName : member; 
        
        const currentStock = stockType === 'cans' ? state.ballManagement.stock : state.ballManagement.usedStock;
        // --- END CONTEXT VARIABLES ---

        hideKeypad();

        if (isNaN(cansToSignOut) || cansToSignOut <= 0 || cansToSignOut > currentStock) {
            //playCustomTTS("Sign out failed. Invalid quantity or insufficient stock.");
            return;
        }

        // Determine modal title based on context
        const modalTitle = isSale
            ? `Confirm Sign Out: ${stockType === 'cans' ? 'New Balls' : 'Old Balls'}` 
            : `Confirm Sign Out: ${category}`;

        cancelConfirmModal.querySelector("h3").textContent = modalTitle;
        
        // Determine prompt text:
        let promptText;
        if (isSale) {
            // Sale prompt: uses stockType and purchaserName
            promptText = `Confirm signing out ${cansToSignOut} ${stockType} to ${purchaserName}, by ${member}?`; 
        } else {
            // Non-Sale prompt: uses 'can(s)' and category (the fix)
            promptText = `Confirm signing out ${cansToSignOut} can(s) for ${category}, by ${member}?`;
        }
            
        cancelConfirmModal.querySelector("p").textContent = promptText;
        modalBtnYesConfirm.textContent = "Confirm Sign Out";
        modalBtnNo.textContent = "Cancel";
        cancelConfirmModal.dataset.mode = "signOutBalls";
        
        // Ensure all data is passed to the final execution step
        cancelConfirmModal.dataset.category = category;
        cancelConfirmModal.dataset.count = cansToSignOut;
        cancelConfirmModal.dataset.member = member;
        cancelConfirmModal.dataset.stockType = stockType; 
        cancelConfirmModal.dataset.purchaserName = purchaserName; 
        
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

        //playCustomTTS(`Stock updated. Added ${count} cans.`);
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

        //playCustomTTS(`Stock updated. Returned ${count} cans.`);
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
        
        // --- NEW CONTEXT VARIABLES ---
        const stockType = cancelConfirmModal.dataset.stockType;
        const purchaserName = cancelConfirmModal.dataset.purchaserName;
        const currentStock = stockType === 'cans' ? state.ballManagement.stock : state.ballManagement.usedStock;
        // --- END NEW CONTEXT VARIABLES ---

        if (isNaN(cansCount) || currentStock < cansCount) {
            playCustomTTS("Sign out failed. Insufficient stock.");
            return;
        }

        const stockBefore = currentStock;
        if (stockType === 'cans') {
            state.ballManagement.stock -= cansCount;
        } else {
            state.ballManagement.usedStock -= cansCount;
        }
        const stockAfter = stockType === 'cans' ? state.ballManagement.stock : state.ballManagement.usedStock;

        state.ballManagement.history.push({
            timestamp: Date.now(), action: 'out', category: category,
            count: cansCount, member: member, stockBefore: stockBefore, stockAfter: stockAfter
        });

        // --- NEW HISTORY FIELDS & CLEAR TEMPORARY STATE ---
        state.ballManagement.history[state.ballManagement.history.length - 1].stockType = stockType;
        state.ballManagement.history[state.ballManagement.history.length - 1].purchaserName = purchaserName;
        state.ballManagement.tempSale = { stockType: null, memberSignOut: null, purchaserName: null, purchaserType: null };
        // --- END NEW ---

        playCustomTTS(`Signed out ${cansCount} ${stockType} to ${purchaserName}, by ${member}.`);
        updateBallStockDisplay();
        updateUsedBallStockDisplay();
        saveState();
        cancelConfirmModal.classList.add("hidden");
        ballManagementModal.classList.remove("hidden");
        resetConfirmModal(); // ADD THIS LINE
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
            // Determine if the entry relates to used balls (singles or return_used category)
            const isUsed = entry.stockType === 'singles' || entry.category === 'return_used';
            if (filter === 'used') return isUsed;
            if (filter === 'new') return !isUsed;
            return true;
        });

        if (filteredHistory.length === 0) {
            ballHistoryList.innerHTML = filterHTML + '<p style="text-align: center; color: #6c757d;">No transactions match the selected filter.</p>';
        } else {
            // 3. Build the rest of the list using the filtered data
            // --- MODIFIED HEADER: Removed Committee Member ---
            const headerHTML = `
                <div class="history-item" style="border-bottom: 2px solid var(--primary-blue); font-weight: bold; background-color: #f8f9fa; cursor: default;">
                    <div class="ball-history-details">
                        <span>Date & Time</span>
                        <span class="numeric">Before</span>
                        <span class="numeric">Change</span>
                        <span class="numeric">After</span>
                    </div>
                </div>
            `;

            const historyItemsHTML = [...filteredHistory].reverse().map(entry => {
                const dateTime = new Date(entry.timestamp).toLocaleString('en-ZA');
                // --- MODIFIED CHANGE DISPLAY: Removed purchaser ---
                const change = entry.action === 'in' ? `+${entry.count}` : `-${entry.count}`;
                const changeClass = entry.action === 'in' ? 'stock-in' : 'stock-out';
                const isUsedBalls = entry.stockType === 'singles' || entry.category === 'return_used';
                const stockClass = isUsedBalls ? 'stock-used' : 'stock-new';

                // --- MODIFIED ROW: Removed Committee Member, Added data-entry-id ---
                return `
                    <div class="history-item" data-entry-id="${entry.timestamp}">
                        <div class="ball-history-details">
                            <span class="timestamp">${dateTime}</span>
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

        // 5. NEW: Add click listener for list items (delegated)
        ballHistoryList.removeEventListener('click', handleBallHistoryItemClick); // Prevent duplicates
        ballHistoryList.addEventListener('click', handleBallHistoryItemClick);
    }

    // NEW FUNCTION: Handles clicks on ball history items
    function handleBallHistoryItemClick(e) {
        const historyItem = e.target.closest('.history-item[data-entry-id]');
        if (historyItem) {
            const entryId = parseInt(historyItem.dataset.entryId, 10);
            const entry = state.ballManagement.history.find(item => item.timestamp === entryId);
            if (entry) {
                showBallHistoryDetailModal(entry);
            }
        }
    }

    // NEW FUNCTION: Shows the detailed ball history modal
    function showBallHistoryDetailModal(entry) {
        // Populate the modal fields
        const stockType = (entry.stockType === 'singles' || entry.category === 'return_used') ? 'Used Balls (Singles)' : 'New Balls (Cans)';
        detailStockType.textContent = stockType;

        // Format category for display
        let categoryDisplay = entry.category || 'N/A';
        if (categoryDisplay === 'purchase') categoryDisplay = 'Stock Added';
        else if (categoryDisplay === 'return') categoryDisplay = 'Stock Returned';
        else if (categoryDisplay === 'return_used') categoryDisplay = 'Used Balls Returned';
        else if (categoryDisplay === 'ClubChamps') categoryDisplay = 'Club Champs'; // Format display
        categoryDisplay = categoryDisplay.charAt(0).toUpperCase() + categoryDisplay.slice(1); // Capitalize
        detailCategory.textContent = categoryDisplay;

        detailDatetime.textContent = new Date(entry.timestamp).toLocaleString('en-ZA');

        const change = entry.action === 'in' ? `+${entry.count}` : `-${entry.count}`;
        detailCount.textContent = change;
        detailCount.style.color = entry.action === 'in' ? 'var(--confirm-color)' : 'var(--cancel-color)';
        detailStockChange.textContent = change; // Also update the stock level change display
        detailStockChange.style.color = entry.action === 'in' ? 'var(--confirm-color)' : 'var(--cancel-color)';

        // --- NEW: Dynamically set Committee Member Label ---
        const committeeLabel = document.getElementById('detail-committee-label');
        if (committeeLabel) {
            committeeLabel.textContent = entry.action === 'in' ? 'Committee Member (Sign In)' : 'Committee Member (Sign Out)';
        }
        // --- END NEW ---
        detailCommitteeMember.textContent = entry.member || 'N/A';


        // --- THIS IS THE MODIFIED LOGIC for Purchaser/Recipient ---
        let purchaserDisplay = 'N/A'; // Default
        const nonSaleSignOuts = ['Social', 'League', 'ClubChamps'];
        if (entry.action === 'out' && nonSaleSignOuts.includes(entry.category)) {
            // For Social, League, ClubChamps, show the category
            purchaserDisplay = categoryDisplay; // Use the formatted category name
        } else if (entry.purchaserName) {
            // For Sales or other types with a purchaserName, show that name
            purchaserDisplay = entry.purchaserName;
        }
        detailPurchaser.textContent = purchaserDisplay;
        // --- END MODIFIED LOGIC ---

        // Show/hide purchaser based on whether there's relevant info to display
        const purchaserRow = detailPurchaser.closest('.stat-item');
        if (purchaserRow) {
            // Show if it's a non-sale sign-out category OR if there's an actual purchaser name
            purchaserRow.style.display = (entry.action === 'out' && nonSaleSignOuts.includes(entry.category)) || entry.purchaserName ? 'flex' : 'none';
        }

        detailStockBefore.textContent = entry.stockBefore;
        detailStockAfter.textContent = entry.stockAfter;

        // Show the modal
        ballHistoryModal.classList.add('hidden'); // Hide the list modal
        ballHistoryDetailModal.classList.remove('hidden');
    }

    function showBallHistoryModal() {
        renderBallHistoryModal();
        ballManagementModal.classList.add('hidden');
        ballHistoryModal.classList.remove('hidden');
    }

    // NEW FUNCTION: Show the modal to select the purchaser
    function showPurchaserSelectionModal(memberSignOutName) {
        const tempSale = state.ballManagement.tempSale;
        const stockType = tempSale.stockType;
        const stockDisplay = stockType === 'cans' ? 'can(s) of new balls' : 'old ball(s)';
        
        tempSale.memberSignOut = memberSignOutName;
        
        purchaserSelectionPrompt.textContent = `Who is purchasing the ${stockDisplay} signed out by ${memberSignOutName}?`;
        
        // 1. Populate the list with Club Members
        purchaserMemberList.innerHTML = '';

        // Get all members and guests (from clubMembers, availablePlayers, courts, and guestHistory)
        const allKnownPlayers = getAllKnownPlayers();
        
        // Filter out committee member who signed out, and filter for uniqueness
        const membersAndGuests = allKnownPlayers
            .filter(p => p.name !== memberSignOutName) 
            .sort((a, b) => a.name.localeCompare(b.name));

        if (membersAndGuests.length === 0) {
            purchaserMemberList.innerHTML = '<li style="justify-content: center; color: var(--cancel-color);">No other players found. Please add as a new guest.</li>';
        } else {
            membersAndGuests.forEach(player => {
                const li = document.createElement('li');
                li.className = 'committee-member'; // Re-use the styling
                
                // Determine player type for display
                const isGuest = player.guest || !MASTER_MEMBER_LIST.some(m => m.name === player.name);
                const memberData = MASTER_MEMBER_LIST.find(m => m.name === player.name);
                const playerType = isGuest ? 'Guest' : (memberData && memberData.committee ? memberData.committee : 'Member');
                
                li.innerHTML = `<label><input type="radio" name="purchaserMember" value="${player.name}"><div class="member-details"><span class="member-name">${player.name}</span><span class="member-designation">${playerType}</span></div></label>`;
                purchaserMemberList.appendChild(li);
            });
        }
        
        purchaserSelectionModal.classList.remove('hidden');
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

        // --- THIS IS THE FIX ---
        // Find the newly active letter element
        const activeLetterEl = indexElement.querySelector('div.active');
        if (activeLetterEl) {
            // Automatically scroll the index list to make the active letter visible
            activeLetterEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        // --- END OF FIX ---
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
        const hasEnoughPlayers = getActivePlayerCount() >= 4;
        const isAnyCourtAvailable = findNextAvailableCourtId();
        
        alertStatusDisplay.classList.remove('hidden');

        if (!hasEnoughPlayers) {
            alertStatusDisplay.innerHTML = `<span class="timer-value">(${getActivePlayerCount()}/4)</span><span class="timer-label">Waiting for players</span>`;
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

    function calculatePlayerPlaytime() {
        const stats = calculatePlayerStats(state.gameHistory); // Process all games for total playtime
        const now = Date.now();
        state.courts.forEach(court => {
            if (court.status === 'in_progress' && court.gameStartTime) {
                const elapsed = Date.now() - court.gameStartTime;
                court.players.forEach(player => {
                    const name = player.name;
                    stats[name] = stats[name] || { played: 0, won: 0, totalDurationMs: 0 };
                    stats[name].totalDurationMs += elapsed;
                });
            }
        });
        return stats;
    }

    function calculateTeamStats(gamesToProcess) {
        const teamStats = {};

        gamesToProcess.forEach(game => {
            // Skip games that were skipped or have no score
            if (game.winner === 'skipped' || !game.score) return;

            // Skip games if any player opted out of the leaderboard
            const allPlayerObjects = [...game.teams.team1, ...game.teams.team2].map(name => getPlayerByName(name));
            if (allPlayerObjects.some(p => p.onLeaderboard === false)) return;

            // Calculate game duration
            const [hStr, mStr] = game.duration.split('h').map(s => s.replace('m', ''));
            const gameDuration = (parseInt(hStr, 10) * 3600000) + (parseInt(mStr, 10) * 60000);

            const processTeam = (team, isWinner) => {
                // A team must consist of exactly 2 players. This excludes singles.
                if (team.length !== 2) return;
                
                // Create a unique key for the team by sorting player names
                const teamKey = [...team].sort().join(' & ');
                const teamPlayerObjects = team.map(name => getPlayerByName(name));
                const genders = teamPlayerObjects.map(p => p.gender);
                
                let teamType = 'Mixed';
                if (genders.every(g => g === 'M')) teamType = 'Men';
                if (genders.every(g => g === 'F')) teamType = 'Women';

                if (!teamStats[teamKey]) {
                    teamStats[teamKey] = {
                        players: team,
                        type: teamType,
                        played: 0,
                        won: 0,
                        totalDurationMs: 0
                    };
                }
                teamStats[teamKey].played += 1;
                teamStats[teamKey].totalDurationMs += gameDuration;
                if (isWinner) {
                    teamStats[teamKey].won += 1;
                }
            };

            const isTeam1Winner = game.winner === 'team1';
            processTeam(game.teams.team1, isTeam1Winner);
            processTeam(game.teams.team2, !isTeam1Winner);
        });

        return teamStats;
    }

    function calculateWinningStreaks() {
        const streaks = {};
        const lastGameResult = {}; // Tracks if the last game was a win for a player

        // Sort games by end time, oldest to newest, to correctly track streaks
        const sortedHistory = [...state.gameHistory].sort((a, b) => a.endTime - b.endTime);

        sortedHistory.forEach(game => {
            if (game.winner === 'skipped') {
                // If a game was skipped, it breaks all streaks for players involved
                [...game.teams.team1, ...game.teams.team2].forEach(playerName => {
                    lastGameResult[playerName] = 'loss'; // Treat skip as a loss for streak purposes
                });
                return;
            }

            const winnerTeam = game.winner === 'team1' ? game.teams.team1 : game.teams.team2;
            const loserTeam = game.winner === 'team1' ? game.teams.team2 : game.teams.team1;

            winnerTeam.forEach(playerName => {
                if (lastGameResult[playerName] === 'win') {
                    streaks[playerName] = (streaks[playerName] || 1) + 1;
                } else {
                    streaks[playerName] = 1; // Start a new streak
                }
                lastGameResult[playerName] = 'win';
            });

            loserTeam.forEach(playerName => {
                streaks[playerName] = 0; // Reset streak on loss
                lastGameResult[playerName] = 'loss';
            });
        });

        // Return only players with an active streak
        const activeStreaks = {};
        for (const player in streaks) {
            if (streaks[player] > 0) {
                activeStreaks[player] = streaks[player];
            }
        }
        return activeStreaks;
    }


    function calculateHeartbreaker() {
        const closeLossCounts = {};
        const today = new Date().toISOString().split('T')[0];

        const todaysGames = state.gameHistory.filter(game => {
            const gameDate = new Date(game.endTime).toISOString().split('T')[0];
            return gameDate === today && game.winner !== 'skipped' && game.score;
        });

        todaysGames.forEach(game => {
            const winnerScore = Math.max(game.score.team1, game.score.team2);
            const loserScore = Math.min(game.score.team1, game.score.team2);

            // Define a "close loss" as a score of 7-5, 7-6, or a close Fast Play game
            const isCloseLoss = (winnerScore === 7 && (loserScore === 5 || loserScore === 6));

            if (isCloseLoss) {
                const loserTeam = (game.score.team1 < game.score.team2) ? game.teams.team1 : game.teams.team2;
                loserTeam.forEach(playerName => {
                    closeLossCounts[playerName] = (closeLossCounts[playerName] || 0) + 1;
                });
            }
        });

        let heartbreakerName = null;
        let maxCloseLosses = 0;

        for (const playerName in closeLossCounts) {
            if (closeLossCounts[playerName] > maxCloseLosses) {
                maxCloseLosses = closeLossCounts[playerName];
                heartbreakerName = playerName;
            }
        }

        // Only return a heartbreaker if they have at least one close loss
        return maxCloseLosses > 0 ? heartbreakerName : null;
    }


    function calculatePlayerPowerScore(player, allGames, returnDetailed = false) {
        // 1. Establish Baseline Ranking (no changes here)
        const baselineStats = {};
        allGames.forEach(game => {
            [...game.teams.team1, ...game.teams.team2].forEach(pName => {
                if (!baselineStats[pName]) baselineStats[pName] = { played: 0, won: 0 };
            });
            if (game.winner !== 'skipped' && game.score) {
                const winnerTeam = game.winner === 'team1' ? game.teams.team1 : game.teams.team2;
                const loserTeam = game.winner === 'team1' ? game.teams.team2 : game.teams.team1;
                winnerTeam.forEach(pName => { baselineStats[pName].played++; baselineStats[pName].won++; });
                loserTeam.forEach(pName => { baselineStats[pName].played++; });
            }
        });
        const baselineRank = {};
        for (const pName in baselineStats) {
            baselineRank[pName] = (baselineStats[pName].played > 0) ? (baselineStats[pName].won / baselineStats[pName].played) : 0;
        }
        const avgRank = Object.values(baselineRank).reduce((a, b) => a + b, 0) / Object.values(baselineRank).length || 0.5;

        // 2. Calculate Strength-of-Schedule Score (ENHANCED)
        // Uses Expected Outcome probability to fairly assess performance
        let historicalScore = 0;
        let gamesPlayedHistorical = 0;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const historicalGames = allGames.filter(game => new Date(game.endTime) > thirtyDaysAgo && (game.teams.team1.includes(player.name) || game.teams.team2.includes(player.name)));
        
        historicalGames.forEach(game => {
            if (game.winner === 'skipped' || !game.score) return;
            
            // Determine player's team and opponent team
            const isPlayerInTeam1 = game.teams.team1.includes(player.name);
            const playerTeam = isPlayerInTeam1 ? game.teams.team1 : game.teams.team2;
            const opponentTeam = isPlayerInTeam1 ? game.teams.team2 : game.teams.team1;
            const isWinner = (isPlayerInTeam1 && game.winner === 'team1') || (!isPlayerInTeam1 && game.winner === 'team2');
            
            // Calculate team averages using baseline ranks
            const playerTeamAvg = playerTeam.reduce((sum, pName) => 
                sum + (baselineRank[pName] || avgRank), 0) / playerTeam.length;
            const opponentTeamAvg = opponentTeam.reduce((sum, pName) => 
                sum + (baselineRank[pName] || avgRank), 0) / opponentTeam.length;
            
            // Calculate expected win probability using logistic function
            // This accounts for ALL 4 players' strengths
            const scoreDiff = playerTeamAvg - opponentTeamAvg;
            const expectedWinProb = 1 / (1 + Math.exp(-5 * scoreDiff));
            
            // Calculate performance score based on expected outcome
            let performanceScore;
            
            if (isWinner) {
                // Won the match
                if (expectedWinProb < 0.5) {
                    // UPSET WIN (were underdogs)
                    // Massive bonus for beating stronger opponents
                    performanceScore = (1.0 - expectedWinProb) * 2;
                } else {
                    // EXPECTED WIN (were favorites)
                    // Small credit for beating weaker opponents
                    performanceScore = (1.0 - expectedWinProb) * 0.5;
                }
            } else {
                // Lost the match
                if (expectedWinProb > 0.5) {
                    // BAD LOSS (were favorites)
                    // Heavy penalty for losing to weaker opponents
                    performanceScore = -(expectedWinProb) * 2;
                } else {
                    // EXPECTED LOSS (were underdogs)
                    // Small penalty for losing to stronger opponents
                    performanceScore = -(expectedWinProb) * 0.5;
                }
            }
            
            historicalScore += performanceScore;
            gamesPlayedHistorical++;
        });
        
        const finalHistoricalScore = gamesPlayedHistorical > 0 ? historicalScore / gamesPlayedHistorical : 0;

        // 3. Today's Form (no changes here)
        const today = new Date().toISOString().split('T')[0];
        const todaysGames = historicalGames.filter(game => new Date(game.endTime).toISOString().split('T')[0] === today);
        let todaysWins = 0;
        todaysGames.forEach(game => {
            const isWinner = (game.teams.team1.includes(player.name) && game.winner === 'team1') || (game.teams.team2.includes(player.name) && game.winner === 'team2');
            if (isWinner) todaysWins++;
        });
        const todaysWinPct = todaysGames.length > 0 ? (todaysWins / todaysGames.length) - 0.5 : 0;

        // --- THIS IS THE REFINED ADAPTIVE WEIGHTING LOGIC ---
        const totalGamesInHistory = allGames.length;
        let historicalWeight;

        if (totalGamesInHistory >= 20) {
            historicalWeight = 0.7;
        } else if (totalGamesInHistory >= 15) {
            historicalWeight = 0.525; // 75% of the way to 0.7
        } else if (totalGamesInHistory >= 10) {
            historicalWeight = 0.35;  // 50% of the way to 0.7
        } else if (totalGamesInHistory >= 5) {
            historicalWeight = 0.175; // 25% of the way to 0.7
        } else {
            historicalWeight = 0.0;   // 0% historical weight for the first few games
        }
        
        const todayWeight = 1 - historicalWeight;
        let blendedScore = (finalHistoricalScore * historicalWeight) + (todaysWinPct * todayWeight);
        // --- END OF REFINED LOGIC ---

        // 5. Apply Player Type Modifiers
        // ENHANCED: Removed static penalties for Veteran/Junior
        // Player type doesn't determine skill - performance does!
        // Strategic veterans and elite juniors now get proper credit
        if (player.guest && gamesPlayedHistorical === 0) blendedScore = 0;

        if (returnDetailed) {
            return {
                historicalScore: finalHistoricalScore,
                todayForm: todaysWinPct,
                finalScore: blendedScore
            };
        }
        
        return blendedScore;
    }

    // --- POWER SCORE MODAL FUNCTIONS ---

    function showPowerScoreModal() {
        renderPowerScoreList();
        adminSettingsModal.classList.add('hidden');
        powerScoreModal.classList.remove('hidden');
    }

    function renderPowerScoreList() {
        powerScoreList.innerHTML = "";

        const playersOnCourt = state.courts.flatMap(c => c.players);
        const allPlayersAtClub = [...state.availablePlayers, ...playersOnCourt];
        const uniquePlayers = Array.from(new Map(allPlayersAtClub.map(p => [p.name, p])).values());

        if (uniquePlayers.length === 0) {
            powerScoreList.innerHTML = '<p style="text-align: center; color: #6c757d;">No players are currently checked in.</p>';
            return;
        }

        const playerScores = uniquePlayers.map(player => {
            const scores = calculatePlayerPowerScore(player, state.gameHistory, true); // Get detailed scores
            return {
                name: player.name,
                ...scores
            };
        });

        const { key, order } = state.powerScoreSort;
        playerScores.sort((a, b) => {
            let valA = a[key];
            let valB = b[key];
            if (key === 'name') {
                return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return order === 'asc' ? valA - valB : valB - valA;
        });

        const getSortIcon = (sortKey) => (state.powerScoreSort.key !== sortKey) ? ' ' : (state.powerScoreSort.order === 'asc' ? ' 🔼' : ' 🔽');

        const headerHTML = `
            <div class="history-item" style="font-weight: bold; background-color: #f8f9fa;">
                <div class="power-score-grid-row">
                    <button class="sort-btn" data-sort-key="name">Player ${getSortIcon('name')}</button>
                    <button class="sort-btn" data-sort-key="historicalScore">Historical ${getSortIcon('historicalScore')}</button>
                    <button class="sort-btn" data-sort-key="todayForm">Today ${getSortIcon('todayForm')}</button>
                    <button class="sort-btn" data-sort-key="finalScore">Score ${getSortIcon('finalScore')}</button>
                </div>
            </div>
        `;

        const playerRows = playerScores.map(p => `
            <div class="history-item">
                <div class="power-score-grid-row">
                    <span>${p.name}</span>
                    <span>${p.historicalScore.toFixed(2)}</span>
                    <span>${p.todayForm.toFixed(2)}</span>
                    <span style="font-weight: bold;">${p.finalScore.toFixed(2)}</span>
                </div>
            </div>
        `).join('');

        powerScoreList.innerHTML = headerHTML + playerRows;

        // Attach listeners to new sort buttons
        powerScoreList.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', handlePowerScoreSortClick);
        });
    }
    
    // --- ADMIN CHECKLIST FUNCTIONS ---

    function renderChecklist(checklistData = state.adminChecklist, targetElement = checklistContent, isReadOnly = false) {
        targetElement.innerHTML = ''; // Clear existing content

        const createListItems = (items, listType) => {
            if (!items || items.length === 0) return '';
            return items.map(item => {
                const uniqueId = `check-${listType}-${item.id}`;
                // Add 'disabled' attribute if read-only
                const disabledAttr = isReadOnly ? 'disabled' : '';
                return `
                    <li class="checklist-item">
                        <label for="${uniqueId}">
                            <input type="checkbox" id="${uniqueId}" data-checklist-id="${item.id}" data-list-type="${listType}" ${item.checked ? 'checked' : ''} ${disabledAttr}>
                            <span>${item.text}</span>
                        </label>
                    </li>
                `;
            }).join('');
        };

        const arrivalItemsHTML = createListItems(checklistData.arrival, 'arrival');
        const departureItemsHTML = createListItems(checklistData.departure, 'departure');

        if (arrivalItemsHTML) {
            targetElement.innerHTML += `<h2 class="checklist-section-header">On Arrival</h2><ul>${arrivalItemsHTML}</ul>`;
        }
        if (departureItemsHTML) {
            targetElement.innerHTML += `<h2 class="checklist-section-header">On Departure</h2><ul>${departureItemsHTML}</ul>`;
        }

        if (!arrivalItemsHTML && !departureItemsHTML) {
            targetElement.innerHTML = '<p style="text-align: center; color: var(--neutral-color); padding: 1rem;">No checklist items defined.</p>';
        }

        // Add internal list styling if needed (e.g., remove bullets)
        targetElement.querySelectorAll('ul').forEach(ul => {
            ul.style.listStyle = 'none';
            ul.style.padding = '0';
            ul.style.margin = '0';
        });
    }

    function showChecklistModal() {
        renderChecklist(); // Populate the list
        adminSettingsModal.classList.add('hidden');
        checklistModal.classList.remove('hidden');
    }

    function handleChecklistChange(e) {
        if (e.target.type === 'checkbox' && e.target.dataset.checklistId) {
            const itemId = e.target.dataset.checklistId;
            const listType = e.target.dataset.listType; // 'arrival' or 'departure'
            const isChecked = e.target.checked;

            if (!listType || !state.adminChecklist[listType]) return; // Safety check

            const item = state.adminChecklist[listType].find(i => i.id === itemId);
            if (item) {
                item.checked = isChecked;

                // Mutual exclusion for Amp settings
                if (listType === 'arrival') {
                    if (itemId === 'arrAmpAux' && isChecked) {
                        const opticalItem = state.adminChecklist.arrival.find(i => i.id === 'arrAmpOptical');
                        if (opticalItem) opticalItem.checked = false;
                    } else if (itemId === 'arrAmpOptical' && isChecked) {
                        const auxItem = state.adminChecklist.arrival.find(i => i.id === 'arrAmpAux');
                        if (auxItem) auxItem.checked = false;
                    }
                    // Re-render only the arrival list if exclusion happened
                    if ((itemId === 'arrAmpAux' || itemId === 'arrAmpOptical')) {
                    renderChecklist(); // Re-render the whole checklist to update visuals
                    }
                }

                saveState();
                saveChecklistHistory();
            }
        }
    }

    // --- CHECKLIST HISTORY FUNCTIONS ---
    function saveChecklistHistory() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayDateStr = `${year}-${month}-${day}`;

        // --- Original Condition: Games Played & Duty Member ---
        const gamesPlayedToday = state.gameHistory.some(game =>
            // Ensure comparison uses local date string format
            new Date(game.endTime).toLocaleDateString('en-CA') === todayDateStr // 'en-CA' gives YYYY-MM-DD
        );
        const dutyMemberAssigned = state.onDuty !== 'None';
        const initialCreationConditionMet = gamesPlayedToday && dutyMemberAssigned;
        // --- End Original Condition ---

        const historyIndex = state.checklistHistory.findIndex(entry => entry.date === todayDateStr);

        // --- Logic: Create if condition met & doesn't exist, Update if exists ---
        if (historyIndex > -1) {
            // --- ALWAYS UPDATE if entry for today exists ---
            try {
                // Update today's entry with the current state (deep copy)
                state.checklistHistory[historyIndex].checklist = JSON.parse(JSON.stringify(state.adminChecklist));
                // console.log(`Checklist history UPDATED for ${todayDateStr} (Live update).`);
                saveState(); // Save the updated history
            } catch (error) {
                console.error("Error updating checklist history:", error);
            }
            // --- END UPDATE LOGIC ---
        } else if (initialCreationConditionMet) {
            // --- CREATE entry only if initial condition is met AND it doesn't exist yet ---
            try {
                const checklistCopy = JSON.parse(JSON.stringify(state.adminChecklist)); // Deep copy
                state.checklistHistory.push({
                    date: todayDateStr,
                    checklist: checklistCopy
                });
                // console.log(`Checklist history CREATED for ${todayDateStr} (Game/Duty condition met).`);
                saveState(); // Save the newly created history entry
            } catch (error) {
                console.error("Error creating checklist history:", error);
            }
            // --- END CREATE LOGIC ---
        } else {
             // console.log(`Checklist history entry for ${todayDateStr} NOT created/updated. Initial condition: ${initialCreationConditionMet}, Exists: ${historyIndex > -1}`);
        }
    }

    // --- NEW FUNCTION: Resets checklist for the new day ---
    function resetChecklistForNewDay(forceReset = false) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayDateStr = `${year}-${month}-${day}`;

        // Get the date of the last reset from localStorage
        const lastResetDate = localStorage.getItem("checklistLastResetDate");

        // Only reset if it's a new day OR if forceReset is true (e.g., from manual reset button)
        if (forceReset || lastResetDate !== todayDateStr) {
            console.log(`Resetting checklist for new day: ${todayDateStr}`);

            // Reset all 'checked' states to false
            Object.keys(state.adminChecklist).forEach(section => {
                if (Array.isArray(state.adminChecklist[section])) {
                    state.adminChecklist[section].forEach(item => {
                        item.checked = false;
                    });
                }
            });

            // Update the last reset date in localStorage
            localStorage.setItem("checklistLastResetDate", todayDateStr);
            saveState(); // Save the reset state
        }
    }

    // Call this function periodically (e.g., every hour) or on app close/reset
    // Simple hourly check:
    setInterval(saveChecklistHistory, 60 * 60 * 1000);
    // More robust would be to tie it to a 'day end' event if available.

    function renderChecklistHistoryList() {
        checklistHistoryList.innerHTML = '';
        checklistHistoryTitle.textContent = 'Checklist History'; // Reset title

        if (state.checklistHistory.length === 0) {
            checklistHistoryList.innerHTML = '<li style="text-align: center; color: var(--neutral-color); padding: 1rem;">No history recorded yet.</li>';
            return;
        }

        // Sort history, newest first
        const sortedHistory = [...state.checklistHistory].sort((a, b) => b.date.localeCompare(a.date));

        sortedHistory.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-ZA', {
                year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
            });
            li.dataset.date = entry.date;
            checklistHistoryList.appendChild(li);
        });
    }

    function showChecklistHistoryModal() {
        renderChecklistHistoryList();
        // Show the list view, hide the detail view
        checklistHistoryListView.classList.remove('hidden');
        checklistHistoryDetailView.classList.add('hidden');
        checklistHistoryBackBtn.classList.add('hidden'); // Hide back button initially
        checklistModal.classList.add('hidden'); // Hide main checklist
        checklistHistoryModal.classList.remove('hidden');
    }

    function showChecklistHistoryDetail(dateStr) {
        const historyEntry = state.checklistHistory.find(entry => entry.date === dateStr);
        if (!historyEntry) return;

        state.selectedChecklistHistoryDate = dateStr; // Store selected date

        const displayDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });
        checklistHistoryTitle.textContent = `Checklist for ${displayDate}`;
        checklistDetailDate.textContent = displayDate; // Update detail paragraph date

        // Use the renderChecklist function in read-only mode
        renderChecklist(historyEntry.checklist, checklistHistoryDetail, true);

        // Switch views
        checklistHistoryListView.classList.add('hidden');
        checklistHistoryDetailView.classList.remove('hidden');
        checklistHistoryBackBtn.classList.remove('hidden'); // Show back button
    }
    // --- END CHECKLIST HISTORY FUNCTIONS ---



    // --- END ADMIN CHECKLIST FUNCTIONS ---    

    function handlePowerScoreSortClick(e) {
        const key = e.target.dataset.sortKey;
        if (!key) return;

        if (state.powerScoreSort.key === key) {
            state.powerScoreSort.order = state.powerScoreSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            state.powerScoreSort.key = key;
            state.powerScoreSort.order = 'desc'; // Default to desc for new columns
        }
        renderPowerScoreList();
    }

    // --- POWER SCORE MODAL EVENT LISTENERS ---
    powerScoreBtn.addEventListener('click', showPowerScoreModal);
    powerScoreCloseBtn.addEventListener('click', () => {
        powerScoreModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');
    }); 

    /**
     * Determines the most balanced game based on settings and player pool.
     * Incorporates percentage-based overrides for specific scenarios.
     * Returns an object { suggestion: { team1, team2 } | null, type: string | null }.
     */
    function findMostBalancedGame(selector, available) {
        const settings = state.suggestionSettings;
        // Generate a single random number (0-100) to check against percentages sequentially.
        const percentageRoll = Math.random() * 100;

        // --- Prepare Player Data ---
        const poolPlayers = [selector, ...available.slice(0, 4)];
        const playerPlaytimes = calculatePlayerPlaytime(); // Get playtime data
        const poolPlayerScores = poolPlayers.map(p => ({
            player: p,
            score: calculatePlayerPowerScore(p, state.gameHistory)
        }));
        const selectorScoreData = poolPlayerScores.find(ps => ps.player.name === selector.name);

        // --- Scenario 1: Top Player Head-to-Head ---
        if (!settings.powerScoreOnly && percentageRoll < settings.topPlayerPercent) {
            console.log(`Attempting Top Player H2H suggestion... (Roll: ${percentageRoll.toFixed(1)} < ${settings.topPlayerPercent}%)`);
            const sortedByScore = [...poolPlayerScores].sort((a, b) => b.score - a.score);
            const top4PlayersData = sortedByScore.slice(0, 4);

            if (top4PlayersData.length === 4 && top4PlayersData.some(ps => ps.player.name === selector.name)) {
                const males = top4PlayersData.filter(ps => ps.player.gender === 'M').length;
                const females = top4PlayersData.filter(ps => ps.player.gender === 'F').length;

                if (!(males === 3 && females === 1) && !(males === 1 && females === 3)) {
                    console.log("Top Player H2H applied.");
                    const suggestion = findBestCombination(top4PlayersData);
                    return { suggestion: suggestion, type: 'topPlayer' }; // Return type
                } else {
                    console.log("Top Player H2H skipped due to 3:1 gender split.");
                }
            } else {
                console.log("Top Player H2H skipped: Selector not in top 4 or not enough players.");
            }
        } else if (!settings.powerScoreOnly) {
             console.log(`Top Player H2H skipped (Roll: ${percentageRoll.toFixed(1)} >= ${settings.topPlayerPercent}%)`);
        }


        // --- Scenario 2: Frequent Opponent ---
        // Check only if Top Player wasn't triggered. Use the *same* percentageRoll.
        if (!settings.powerScoreOnly && percentageRoll >= settings.topPlayerPercent && percentageRoll < (settings.topPlayerPercent + settings.frequentOpponentPercent)) {
            console.log(`Attempting Frequent Opponent suggestion... (Roll: ${percentageRoll.toFixed(1)} in range)`);
            const frequentOpponentName = findFrequentOpponent(selector.name, state.gameHistory);
            const opponentInPool = poolPlayerScores.find(ps => ps.player.name === frequentOpponentName);

            if (opponentInPool) {
                console.log(`Frequent Opponent (${frequentOpponentName}) found in pool. Applying.`);
                let selection = [selector, opponentInPool.player];
                let remainingForBalance = poolPlayerScores.filter(ps =>
                    ps.player.name !== selector.name && ps.player.name !== opponentInPool.player.name
                ).map(ps => ps.player);

                if (remainingForBalance.length >= 2) {
                    // Fill remaining 2 spots using standard balance logic (mixed aim, ignore least playtime here)
                    const finalTwo = findBestBalancingPlayers(selection, remainingForBalance, 2, poolPlayerScores, false, 'mixed', selector.gender, opponentInPool.player.gender);
                    if (finalTwo && finalTwo.length === 2) { // Check if findBestBalancingPlayers succeeded
                         selection.push(...finalTwo);
                         if (selection.length === 4) {
                             const finalScores = poolPlayerScores.filter(ps => selection.some(p => p.name === ps.player.name));
                             const suggestion = findBestCombination(finalScores);
                             return { suggestion: suggestion, type: 'frequentOpponent' }; // Return type
                         }
                    } else {
                         console.log("Frequent Opponent skipped: Could not find 2 balanced players to complete the team.");
                    }
                } else {
                    console.log("Frequent Opponent skipped: Not enough remaining players.");
                }
            } else {
                console.log("Frequent Opponent skipped: Opponent not found or not frequent enough.");
            }
        } else if (!settings.powerScoreOnly) {
             console.log(`Frequent Opponent skipped (Roll: ${percentageRoll.toFixed(1)} not in range or Top Player triggered)`);
        }

        // --- Scenario 3: Weak Player Grouping ---
        // Check only if previous scenarios weren't triggered. Use the *same* percentageRoll.
        const weakPlayerUpperBoundary = settings.topPlayerPercent + settings.frequentOpponentPercent + settings.weakPlayerPercent;
        if (!settings.powerScoreOnly && percentageRoll >= (settings.topPlayerPercent + settings.frequentOpponentPercent) && percentageRoll < weakPlayerUpperBoundary) {
            console.log(`Attempting Weak Player Grouping suggestion... (Roll: ${percentageRoll.toFixed(1)} in range)`);
            if (!selectorScoreData) {
                 console.log("Weak Player Grouping skipped: Selector score data missing.");
            } else {
                 const selectorIsWeak = isWeakPlayer(selectorScoreData.score, settings.weakPlayerThreshold);
                 if (selectorIsWeak) {
                     const otherWeakPlayers = poolPlayerScores.filter(ps =>
                         ps.player.name !== selector.name && isWeakPlayer(ps.score, settings.weakPlayerThreshold)
                     );

                     if (otherWeakPlayers.length >= 3) {
                         otherWeakPlayers.sort((a, b) => a.score - b.score); // Sort weakest first
                         const weakFoursomeData = [selectorScoreData, ...otherWeakPlayers.slice(0, 3)];

                         const males = weakFoursomeData.filter(ps => ps.player.gender === 'M').length;
                         const females = weakFoursomeData.filter(ps => ps.player.gender === 'F').length;
                         if (!(males === 3 && females === 1) && !(males === 1 && females === 3)) {
                             console.log("Weak Player Grouping applied.");
                             const suggestion = findBestCombination(weakFoursomeData);
                             return { suggestion: suggestion, type: 'weakPlayer' }; // Return type
                         } else {
                              console.log("Weak Player Grouping skipped due to 3:1 gender split.");
                         }
                     } else {
                         console.log("Weak Player Grouping skipped: Not enough other weak players available.");
                     }
                 } else {
                     console.log("Weak Player Grouping skipped: Selector is not weak.");
                 }
            }
        } else if (!settings.powerScoreOnly) {
            console.log(`Weak Player Grouping skipped (Roll: ${percentageRoll.toFixed(1)} not in range or previous triggered)`);
        }


        // --- Scenario 4: Standard Balancing Logic (Fallback) ---
        console.log("Falling back to Standard Balancing Logic.");
        let selectedPlayers = [selector];
        let remainingPool = [...poolPlayerScores.filter(ps => ps.player.name !== selector.name)];

        // --- Least Playtime Selection (incorporating 100% gender preference) ---
        if (settings.prioritizeLeastPlaytime && !settings.powerScoreOnly && remainingPool.length > 0) {
            let targetGenderForLeastPlaytime = null;
            const isFemaleSelector = selector.gender === 'F';
            const availableFemalesInPool = remainingPool.filter(ps => ps.player.gender === 'F').length;
            const availableMalesInPool = remainingPool.filter(ps => ps.player.gender === 'M').length;
            const playersNeededForFullTeam = 3;

            if (isFemaleSelector && settings.femaleRatioPercent === 100 && availableFemalesInPool >= playersNeededForFullTeam) {
                targetGenderForLeastPlaytime = 'F';
            } else if (!isFemaleSelector && settings.maleRatioPercent === 100 && availableMalesInPool >= playersNeededForFullTeam) {
                targetGenderForLeastPlaytime = 'M';
            }

            let poolForLeastPlaytime = remainingPool;
            if (targetGenderForLeastPlaytime) {
                const filteredPool = remainingPool.filter(ps => ps.player.gender === targetGenderForLeastPlaytime);
                if (filteredPool.length > 0) {
                    poolForLeastPlaytime = filteredPool;
                } else {
                     console.warn(`Standard Balance: 100% ${targetGenderForLeastPlaytime === 'F' ? 'Female' : 'Male'} preference set, but no matching players in pool.`);
                }
            }

            let minPlaytime = Infinity;
            let leastPlayedPlayerScoreObj = null;
            poolForLeastPlaytime.forEach(ps => {
                const playtime = playerPlaytimes[ps.player.name]?.totalDurationMs || 0;
                if (playtime < minPlaytime) {
                    minPlaytime = playtime;
                    leastPlayedPlayerScoreObj = ps;
                } else if (playtime === minPlaytime && leastPlayedPlayerScoreObj) {
                    const currentIndex = remainingPool.findIndex(rp => rp.player.name === ps.player.name);
                    const currentBestIndex = remainingPool.findIndex(rp => rp.player.name === leastPlayedPlayerScoreObj.player.name);
                    if (currentIndex < currentBestIndex) leastPlayedPlayerScoreObj = ps;
                }
            });

            if (leastPlayedPlayerScoreObj) {
                selectedPlayers.push(leastPlayedPlayerScoreObj.player);
                remainingPool = remainingPool.filter(ps => ps.player.name !== leastPlayedPlayerScoreObj.player.name);
            }
        }
        // --- End Least Playtime ---

        // --- Select Remaining Players ---
        const playersNeeded = 4 - selectedPlayers.length;
        if (remainingPool.length < playersNeeded) {
            console.warn("Standard Balance: Not enough players remaining after least playtime selection.");
            // Try to form best possible team with what's left
             const finalGroup = [...selectedPlayers, ...remainingPool.map(ps => ps.player)];
             const finalGroupScores = poolPlayerScores.filter(ps => finalGroup.some(p => p.name === ps.player.name));
             if (finalGroupScores.length >= 2) { // Need at least 2 for findBestCombination
                const suggestion = findBestCombination(finalGroupScores); // May return fewer than 4
                return { suggestion: suggestion, type: 'standard' };
             } else {
                return { suggestion: null, type: null }; // Cannot form even a pair
             }
        }

        let finalPlayersToAdd = [];
        if (settings.powerScoreOnly) { // Check powerScoreOnly toggle
            finalPlayersToAdd = findBestBalancingPlayers(selectedPlayers, remainingPool.map(ps => ps.player), playersNeeded, poolPlayerScores, true);
        } else {
            // Determine gender aim based on ratios
            let aimForGender = 'mixed';
            const isFemaleSelector = selector.gender === 'F';
            // Use Math.random here for the ratio check, as the initial percentageRoll was for overrides
            const genderRoll = Math.random() * 100;

            const currentAvailableFemales = remainingPool.filter(ps => ps.player.gender === 'F').length;
            const currentAvailableMales = remainingPool.filter(ps => ps.player.gender === 'M').length;

            if (isFemaleSelector && currentAvailableFemales >= playersNeeded) {
                if (genderRoll < settings.femaleRatioPercent) aimForGender = 'female';
            } else if (!isFemaleSelector && currentAvailableMales >= playersNeeded) {
                if (genderRoll < settings.maleRatioPercent) aimForGender = 'male';
            }

            const secondPlayerGender = selectedPlayers.length > 1 ? selectedPlayers[1].gender : null;
            finalPlayersToAdd = findBestBalancingPlayers(selectedPlayers, remainingPool.map(ps => ps.player), playersNeeded, poolPlayerScores, false, aimForGender, selector.gender, secondPlayerGender);
        }

        // --- Final Assembly ---
        if (finalPlayersToAdd && finalPlayersToAdd.length === playersNeeded) {
             selectedPlayers.push(...finalPlayersToAdd);
        } else {
             console.warn("Standard Balance: findBestBalancingPlayers did not return enough players.");
             // Attempt with remaining pool if findBestBalancingPlayers failed
             selectedPlayers.push(...remainingPool.slice(0, playersNeeded).map(ps => ps.player));
        }


        if (selectedPlayers.length === 4) {
            const finalPlayerScores = poolPlayerScores.filter(ps => selectedPlayers.some(p => p.name === ps.player.name));
            const suggestion = findBestCombination(finalPlayerScores);
            return { suggestion: suggestion, type: 'standard' };
        } else {
            console.error("Standard balance failed definitively to select 4 players.");
             // Attempt to return the most balanced group possible even if not 4
             const finalScores = poolPlayerScores.filter(ps => selectedPlayers.some(p => p.name === ps.player.name));
             if (finalScores.length >= 2) {
                 const suggestion = findBestCombination(finalScores);
                 return { suggestion: suggestion, type: 'standard' };
             } else {
                 return { suggestion: null, type: null };
             }
        }
    }

    // NEW Helper Function: Finds the best players to add for balance
    // Helper Function: Finds the best players to add for balance (Corrected for strict 100% aim)
    function findBestBalancingPlayers(currentSelection, pool, count, allPlayerScores, powerScoreOnly = false, aimGender = 'mixed', selectorGender = null, secondPlayerGender = null) {
        let bestCombination = [];
        let minDiff = Infinity;
        let bestOverallBalance = Infinity;

        const combinations = getCombinations(pool, count);

        combinations.forEach(combo => {
            const potentialFoursome = [...currentSelection, ...combo];
            if (potentialFoursome.length !== 4) return; // Only consider full foursomes

            const potentialFoursomeNames = potentialFoursome.map(p => p.name);

            if (powerScoreOnly) {
                // Power score only logic (remains unchanged)
                const males = potentialFoursome.filter(p => p.gender === 'M').length;
                const females = potentialFoursome.filter(p => p.gender === 'F').length;

                // CRITICAL: Never allow 3:1 gender splits
                if ((males === 3 && females === 1) || (males === 1 && females === 3)) {
                    return; // Skip this combination entirely
                }
                const foursomeScores = allPlayerScores.filter(ps => potentialFoursomeNames.includes(ps.player.name));
                 if (foursomeScores.length !== 4) return; // Ensure we have scores for 4 players
                const teamSplit = findBestCombination(foursomeScores);
                if (!teamSplit) return;
                const team1Score = teamSplit.team1.reduce((sum, p) => sum + allPlayerScores.find(ps => ps.player.name === p.name).score, 0);
                const team2Score = teamSplit.team2.reduce((sum, p) => sum + allPlayerScores.find(ps => ps.player.name === p.name).score, 0);
                const diff = Math.abs(team1Score - team2Score);
                if (diff < bestOverallBalance) {
                    bestOverallBalance = diff;
                    bestCombination = combo;
                }
            } else {
                // Gender Balancing Logic
                const males = potentialFoursome.filter(p => p.gender === 'M').length;
                const females = potentialFoursome.filter(p => p.gender === 'F').length;

                // CRITICAL: Never allow 3:1 gender splits
                if ((males === 3 && females === 1) || (males === 1 && females === 3)) {
                    return; // Skip this combination entirely
                }

                let isMatch = false;
                // --- START CORRECTION ---
                // Be strict when aiming for a single gender
                if (aimGender === 'female') {
                    if (females === 4) isMatch = true;
                } else if (aimGender === 'male') {
                    if (males === 4) isMatch = true;
                } else { // aimGender === 'mixed' or a fallback occurred before calling
                    // Prefer 2M/2F for mixed, but allow 4M or 4F as fallback *if aiming for mixed initially*
                    if (males === 2 && females === 2) isMatch = true;
                    else if (aimGender === 'mixed' && (males === 4 || females === 4)) isMatch = true; // Allow single-gender only if original aim was mixed
                }
                // --- END CORRECTION ---

                if (isMatch) {
                    // Calculate power score difference for this valid gender combination
                    const foursomeScores = allPlayerScores.filter(ps => potentialFoursomeNames.includes(ps.player.name));
                     if (foursomeScores.length !== 4) return; // Ensure we have scores for 4 players
                    const teamSplit = findBestCombination(foursomeScores);
                    if (!teamSplit) return;
                    const team1Score = teamSplit.team1.reduce((sum, p) => sum + allPlayerScores.find(ps => ps.player.name === p.name).score, 0);
                    const team2Score = teamSplit.team2.reduce((sum, p) => sum + allPlayerScores.find(ps => ps.player.name === p.name).score, 0);
                    const diff = Math.abs(team1Score - team2Score);

                    // Update bestCombination only if this matching gender combo has better balance
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestCombination = combo;
                    }
                }
            }
        });

        // Fallback: If NO combination met the strict gender goal (or power score goal), find the *most* balanced overall valid foursome
        if (bestCombination.length === 0 && combinations.length > 0) {
            console.warn("Suggestion fallback: No combination met the primary goal, selecting most balanced valid foursome overall.");
            let fallbackMinDiff = Infinity;
            combinations.forEach(combo => {
                const potentialFoursome = [...currentSelection, ...combo];
                if (potentialFoursome.length !== 4) return; // Ensure fallback also considers only foursomes

                // Rule: Avoid 3:1 gender splits even in fallback
                const males = potentialFoursome.filter(p => p.gender === 'M').length;
                const females = potentialFoursome.filter(p => p.gender === 'F').length;

                // CRITICAL: Never allow 3:1 gender splits
                if ((males === 3 && females === 1) || (males === 1 && females === 3)) {
                    return; // Skip this combination entirely
                }

                const potentialFoursomeNames = potentialFoursome.map(p => p.name);
                const foursomeScores = allPlayerScores.filter(ps => potentialFoursomeNames.includes(ps.player.name));
                 if (foursomeScores.length !== 4) return; // Ensure we have scores for 4 players
                const teamSplit = findBestCombination(foursomeScores);
                if (!teamSplit) return;
                const team1Score = teamSplit.team1.reduce((sum, p) => sum + allPlayerScores.find(ps => ps.player.name === p.name).score, 0);
                const team2Score = teamSplit.team2.reduce((sum, p) => sum + allPlayerScores.find(ps => ps.player.name === p.name).score, 0);
                const diff = Math.abs(team1Score - team2Score);
                if (diff < fallbackMinDiff) {
                    fallbackMinDiff = diff;
                    bestCombination = combo;
                }
            });
            // If still no combo after fallback (e.g., all valid combos were skipped?), return empty
            if(bestCombination.length === 0) {
                 console.error("Suggestion Error: Could not find any valid foursome combination in fallback.");
            }
        }

        return bestCombination;
    }

    // NEW Helper function to generate combinations
    function getCombinations(arr, k) {
        if (k < 0 || k > arr.length) {
            return [];
        }
        if (k === 0) {
            return [[]];
        }
        if (k === arr.length) {
            return [arr];
        }
        if (k === 1) {
            return arr.map(e => [e]);
        }
        const combs = [];
        for (let i = 0; i < arr.length - k + 1; i++) {
            const head = arr.slice(i, i + 1);
            const tailCombs = getCombinations(arr.slice(i + 1), k - 1);
            for (let j = 0; j < tailCombs.length; j++) {
                combs.push(head.concat(tailCombs[j]));
            }
        }
        return combs;
    }

    // Helper function to find the best team combination within a group of 4 players
    function findBestCombination(fourPlayers) {
        let bestCombination = null;
        let minDiff = Infinity;
        const combinations = [
            [[0, 1], [2, 3]],
            [[0, 2], [1, 3]],
            [[0, 3], [1, 2]]
        ];

        combinations.forEach(combo => {
            const team1 = combo[0].map(i => fourPlayers[i]);
            const team2 = combo[1].map(i => fourPlayers[i]);
            const team1Score = team1.reduce((sum, p) => sum + p.score, 0);
            const team2Score = team2.reduce((sum, p) => sum + p.score, 0);
            const diff = Math.abs(team1Score - team2Score);

            if (diff < minDiff) {
                minDiff = diff;
                bestCombination = {
                    team1: team1.map(p => p.player),
                    team2: team2.map(p => p.player)
                };
            }
        });
        return bestCombination;
    }

    function clearSuggestionHighlights() {
        // Clear the active suggestion from the state
        delete state.activeSuggestion;
        
        // THIS IS THE FIX: Clear the player selection array
        state.selection.players = [];

        // Re-render the UI to remove all highlights and deactivate court selection
        render();
        
        // After rendering, ensure the animations are correctly hidden
        ensureCourtSelectionAnimation();
    }


    function renderTeamHistory() {
        const teamStats = calculateTeamStats(state.gameHistory);
        const teamHistoryList = document.getElementById('team-history-list');
        teamHistoryList.innerHTML = "";

        let teamsWithStats = Object.values(teamStats).filter(team => {
            if (state.statsFilter.teamGender === 'all') return true;
            return team.type.toLowerCase() === state.statsFilter.teamGender;
        });

        // --- H2H FILTERING LOGIC ---
        if (state.comparison.active && state.comparison.items.length === 1) {
            const selectedTeamKey = state.comparison.items[0];
            teamsWithStats = teamsWithStats.filter(team => {
                const teamKey = [...team.players].sort().join(' & ');
                // Filter the list to only include the selected team and its opponents
                return teamKey === selectedTeamKey || state.comparison.opponents.has(teamKey);
            });
        }
        // --- END H2H FILTERING ---

        teamsWithStats.sort((a, b) => {
            const statA = a;
            const statB = b;
            let compareValue = 0;
            if (state.statsFilter.sortKey === 'name') {
                compareValue = a.players.join(',').localeCompare(b.players.join(','));
            } else {
                compareValue = (statB[state.statsFilter.sortKey] || 0) - (statA[state.statsFilter.sortKey] || 0);
            }
            return state.statsFilter.sortOrder === 'asc' ? -compareValue : compareValue;
        });

        const genderFilterHTML = `
            <div class="gender-selector" style="justify-content: center; margin-bottom: 1rem;">
                <div class="radio-group">
                    <label> <input type="radio" name="team-gender-filter" value="all" ${state.statsFilter.teamGender === 'all' ? 'checked' : ''}> All </label>
                    <label> <input type="radio" name="team-gender-filter" value="men" ${state.statsFilter.teamGender === 'men' ? 'checked' : ''}> Men </label>
                    <label> <input type="radio" name="team-gender-filter" value="women" ${state.statsFilter.teamGender === 'women' ? 'checked' : ''}> Women </label>
                    <label> <input type="radio" name="team-gender-filter" value="mixed" ${state.statsFilter.teamGender === 'mixed' ? 'checked' : ''}> Mixed </label>
                </div>
            </div>`;

        if (teamsWithStats.length === 0) {
            teamHistoryList.innerHTML = genderFilterHTML + '<p style="text-align: center; color: #6c757d;">No team stats available for the selected filter.</p>';
        } else {
            const getSortIcon = (key) => (state.statsFilter.sortKey !== key) ? ' ' : (state.statsFilter.sortOrder === 'asc' ? ' 🔼' : ' 🔽');

            const tableHeader = `
                <div class="history-item" style="font-weight: bold; background-color: #f8f9fa;">
                    <div class="stats-grid-row">
                        <button class="sort-btn" data-sort-key="name" style="text-align: left; background: none; border: none; font-weight: bold; cursor: pointer;">Team${getSortIcon('name')}</button>
                        <button class="sort-btn" data-sort-key="played" style="background: none; border: none; font-weight: bold; cursor: pointer;">Played${getSortIcon('played')}</button>
                        <button class="sort-btn" data-sort-key="won" style="background: none; border: none; font-weight: bold; cursor: pointer;">Won %${getSortIcon('won')}</button>
                        <button class="sort-btn" data-sort-key="totalDurationMs" style="background: none; border: none; font-weight: bold; cursor: pointer;">Time${getSortIcon('totalDurationMs')}</button>
                    </div>
                </div>`;

            const teamRows = teamsWithStats.map(team => {
                const winPercentage = formatWinPercentage(team.played, team.won);
                const teamNameHTML = team.players.map(name => `<span>${name}</span>`).join('');

                const teamKey = [...team.players].sort().join(' & ');
                let rowClass = '';
                if(state.comparison.items.includes(teamKey)) {
                    rowClass = 'selected-for-comparison';
                }

                return `
                    <div class="history-item ${rowClass}" data-name="${teamKey}" data-type="team">
                        <div class="stats-grid-row">
                            <span class="team-name-stacked">${teamNameHTML}</span>
                            <span>${team.played}</span>
                            <span>${winPercentage}</span>
                            <span>${formatDuration(team.totalDurationMs)}</span>
                        </div>
                    </div>`;
            }).join('');

            teamHistoryList.innerHTML = genderFilterHTML + tableHeader + teamRows;
        }

        teamHistoryList.querySelectorAll('input[name="team-gender-filter"]').forEach(radio => radio.addEventListener('change', handleTeamStatsFilterChange));
        teamHistoryList.querySelectorAll('.sort-btn').forEach(btn => btn.addEventListener('click', handleSortClick));

        // Apply comparison styling immediately after render
        if (state.comparison.active && state.comparison.type === 'team') {
            const teamItems = teamHistoryList.querySelectorAll('.history-item[data-type="team"]');
            teamItems.forEach(item => {
                const teamKey = item.dataset.name;
                if (state.comparison.items.includes(teamKey)) {
                    item.classList.add('selected-for-comparison');
                }
            });
        }
    }


    function handleTeamStatsFilterChange(e) {
        state.statsFilter.teamGender = e.target.value;
        saveState();
        renderTeamHistory();
    }

    // --- NEW COMPARISON MODAL FUNCTIONS ---

    function calculateComparisonStats() {
        const { type, items, timeFrame } = state.comparison;
        if (items.length < 2) return null;

        const item1Name = items[0];
        const item2Name = items[1];

        const games = state.gameHistory.filter(game => isGameInTimeFrame(game, timeFrame));

        let headToHeadGames = [];

        if (type === 'player') {
            headToHeadGames = games.filter(game => {
                const team1Players = game.teams.team1;
                const team2Players = game.teams.team2;
                const item1OnTeam1 = team1Players.includes(item1Name);
                const item2OnTeam1 = team1Players.includes(item2Name);
                const item1OnTeam2 = team2Players.includes(item1Name);
                const item2OnTeam2 = team2Players.includes(item2Name);
                return (item1OnTeam1 && item2OnTeam2) || (item1OnTeam2 && item2OnTeam1);
            });
        } else { // 'team'
            headToHeadGames = games.filter(game => {
                const team1Key = [...game.teams.team1].sort().join(' & ');
                const team2Key = [...game.teams.team2].sort().join(' & ');
                return (team1Key === item1Name && team2Key === item2Name) || (team1Key === item2Name && team2Key === item1Name);
            });
        }

        const uniqueDays = new Set(headToHeadGames.map(game => new Date(game.endTime).toISOString().split('T')[0]));
        const totalDaysPlayed = uniqueDays.size;

        if (headToHeadGames.length === 0) {
            return {
                totalSets: 0,
                totalTimeMs: 0,
                totalDaysPlayed: 0,
                item1: { name: item1Name, setsWon: 0, gamesWon: 0 },
                item2: { name: item2Name, setsWon: 0, gamesWon: 0 },
            };
        }

        let totalTimeMs = 0;
        let item1SetsWon = 0;
        let item2SetsWon = 0;
        let item1GamesWon = 0;
        let item2GamesWon = 0;

        headToHeadGames.forEach(game => {
            const [h, m] = game.duration.split('h').map(s => parseInt(s.replace('m', ''), 10));
            totalTimeMs += (h * 3600000) + (m * 60000);

            if (game.winner === 'skipped') return;

            const isItem1Winner = (game.winner === 'team1' && (type === 'player' ? game.teams.team1.includes(item1Name) : [...game.teams.team1].sort().join(' & ') === item1Name)) || (game.winner === 'team2' && (type === 'player' ? game.teams.team2.includes(item1Name) : [...game.teams.team2].sort().join(' & ') === item1Name));

            if(isItem1Winner) item1SetsWon++;
            else item2SetsWon++;

            if (game.score) {
                const team1Score = game.score.team1 || 0;
                const team2Score = game.score.team2 || 0;

                const isItem1OnTeam1 = type === 'player' ? game.teams.team1.includes(item1Name) : [...game.teams.team1].sort().join(' & ') === item1Name;

                if (isItem1OnTeam1) {
                    item1GamesWon += team1Score;
                    item2GamesWon += team2Score;
                } else {
                    item1GamesWon += team2Score;
                    item2GamesWon += team1Score;
                }
            }
        });

        return {
            totalSets: headToHeadGames.length,
            totalTimeMs: totalTimeMs,
            totalDaysPlayed: totalDaysPlayed,
            item1: { name: item1Name, setsWon: item1SetsWon, gamesWon: item1GamesWon },
            item2: { name: item2Name, setsWon: item2SetsWon, gamesWon: item2GamesWon },
        };
    }

    function renderComparisonModal() {
        const stats = calculateComparisonStats();
        if (!stats) {
            comparisonContent.innerHTML = "<p>Error calculating stats.</p>";
            return;
        }

        const { totalSets, totalTimeMs, totalDaysPlayed, item1, item2 } = stats;

        const item1WinPct = totalSets > 0 ? Math.round((item1.setsWon / totalSets) * 100) : 0;
        const item2WinPct = totalSets > 0 ? Math.round((item2.setsWon / totalSets) * 100) : 0;

        const totalGamesPlayed = item1.gamesWon + item2.gamesWon;
        const item1GamesWinPct = totalGamesPlayed > 0 ? Math.round((item1.gamesWon / totalGamesPlayed) * 100) : 0;
        const item2GamesWinPct = totalGamesPlayed > 0 ? Math.round((item2.gamesWon / totalGamesPlayed) * 100) : 0;
        
        // --- UPDATED: Determine winner and loser classes for styling ---
        let item1SetsNameClass = '', item2SetsNameClass = '';
        if (item1.setsWon > item2.setsWon) {
            item1SetsNameClass = 'h2h-winner-text';
            item2SetsNameClass = 'h2h-loser-text'; // Loser
        } else if (item2.setsWon > item1.setsWon) {
            item1SetsNameClass = 'h2h-loser-text'; // Loser
            item2SetsNameClass = 'h2h-winner-text';
        }

        let item1SetsBgClass = '', item2SetsBgClass = '';
        if (item1.setsWon > item2.setsWon) {
            item1SetsBgClass = 'h2h-winner-bg';
            item2SetsBgClass = 'h2h-loser-bg';
        } else if (item2.setsWon > item1.setsWon) {
            item1SetsBgClass = 'h2h-loser-bg';
            item2SetsBgClass = 'h2h-winner-bg';
        }

        let item1GamesBgClass = '', item2GamesBgClass = '';
        if (item1.gamesWon > item2.gamesWon) {
            item1GamesBgClass = 'h2h-winner-bg';
            item2GamesBgClass = 'h2h-loser-bg';
        } else if (item2.gamesWon > item1.gamesWon) {
            item1GamesBgClass = 'h2h-loser-bg';
            item2GamesBgClass = 'h2h-winner-bg';
        }
        
        comparisonTitle.textContent = `Head-to-Head: ${state.comparison.type === 'player' ? 'Players' : 'Teams'}`;

        comparisonFilterContainer.innerHTML = createGameHistoryFilters();
        comparisonFilterContainer.querySelectorAll('input[name="game-time-filter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.comparison.timeFrame = e.target.value;
                renderComparisonModal();
            });
        });
        const activeRadio = comparisonFilterContainer.querySelector(`input[value="${state.comparison.timeFrame}"]`);
        if(activeRadio) activeRadio.checked = true;

        comparisonContent.innerHTML = `
            <div class="comparison-grid-content">
                <div class="comparison-column">
                    <div class="comparison-header ${item1SetsNameClass}">${item1.name.replace(/ \& /g, '<br>')}</div>
                    <div class="comparison-stat-card ${item1SetsBgClass}">
                        <div class="label">Sets Won</div>
                        <div class="value">${item1.setsWon}</div>
                        <div class="win-percentage">${item1WinPct}% of sets</div>
                    </div>
                    <div class="comparison-stat-card ${item1GamesBgClass}">
                        <div class="label">Games Won</div>
                        <div class="value">${item1.gamesWon}</div>
                        <div class="win-percentage">${item1GamesWinPct}% of games</div>
                    </div>
                </div>

                <div class="comparison-column">
                    <div class="comparison-header ${item2SetsNameClass}">${item2.name.replace(/ \& /g, '<br>')}</div>
                    <div class="comparison-stat-card ${item2SetsBgClass}">
                        <div class="label">Sets Won</div>
                        <div class="value">${item2.setsWon}</div>
                        <div class="win-percentage">${item2WinPct}% of sets</div>
                    </div>
                    <div class="comparison-stat-card ${item2GamesBgClass}">
                        <div class="label">Games Won</div>
                        <div class="value">${item2.gamesWon}</div>
                        <div class="win-percentage">${item2GamesWinPct}% of games</div>
                    </div>
                </div>

                <div class="comparison-summary-row">
                    <div class="comparison-summary-card">
                        <div class="label">Total Days Played</div>
                        <div class="value">${totalDaysPlayed}</div>
                    </div>
                    <div class="comparison-summary-card">
                        <div class="label">Total Time on Court</div>
                        <div class="value">${formatDuration(totalTimeMs)}</div>
                    </div>
                </div>

                <div class="comparison-summary-row">
                    <div class="comparison-summary-card">
                        <div class="label">Total Sets Played</div>
                        <div class="value">${totalSets}</div>
                    </div>
                    <div class="comparison-summary-card">
                        <div class="label">Total Games Played</div>
                        <div class="value">${totalGamesPlayed}</div>
                    </div>
                </div>
            </div>
        `;

        historyPage.classList.add('hidden');
        comparisonModal.classList.remove('hidden');
    }

    function resetComparisonState() {
        state.comparison = { active: false, type: null, items: [], timeFrame: 'Total', opponents: new Set() };
        document.querySelectorAll('.selected-for-comparison').forEach(el => el.classList.remove('selected-for-comparison'));
        document.querySelectorAll('.not-a-match').forEach(el => el.classList.remove('not-a-match'));
        saveState(); // Add this line
    }

    // --- NEW FUNCTION TO RESET FILTERS ---
    function resetStatsFilters() {
        state.statsFilter = {
            gender: 'all',
            teamGender: 'all',
            sortKey: 'totalDurationMs',
            sortOrder: 'desc'
        };
        state.gameHistoryFilter = {
            timeFrame: 'Total',
            gameType: 'all'
        };
        state.historySort = {
            key: 'endTime',
            order: 'desc'
        };
        saveState(); // Save the reset state
    }


    // Helper function to check if a game falls within the selected time frame
    function isGameInTimeFrame(game, timeFrame) {
        const gameDate = new Date(game.endTime);
        const now = new Date();

        const gameYear = gameDate.getFullYear();
        const currentYear = now.getFullYear();

        switch (timeFrame) {
            case 'Today':
                return gameDate.toISOString().split('T')[0] === now.toISOString().split('T')[0];
            case 'Month':
                return gameYear === currentYear && gameDate.getMonth() === now.getMonth();
            case 'Year':
                return gameYear === currentYear;
            case 'Total':
            default:
                return true;
        }
    }

    // Handler for the time frame filter change
    function handleGameTimeFilterChange(e) {
        state.gameHistoryFilter.timeFrame = e.target.value;
        saveState();
        renderGameHistory();
    }

    // Handler for the game type filter change
    function handleGameTypeFilterChange(e) {
        state.gameHistoryFilter.gameType = e.target.value;
        saveState();
        renderGameHistory();
    }

    function handleHistorySortClick(e) {
        const key = e.target.dataset.sortKey;
        if (!key) return;

        if (state.historySort.key === key) {
            state.historySort.order = state.historySort.order === 'asc' ? 'desc' : 'asc';
        } else {
            state.historySort.key = key;
            state.historySort.order = 'desc'; // Default to descending for any new column
        }
        renderGameHistory(); // Re-render just the game history list
        saveState();
    } 

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
            // Block Doubles, League, AND Rookie courts when Singles is selected
            else if (requiredPlayers === 2 && (courtMode === 'doubles' || courtMode === 'league' || courtMode === 'rookie')) {
                isReservedSelectable = true;
            }

            // CRITERIA FOR GREEN BALL (Selectable for Play)
            if (!isReservedSelectable && selectionComplete) {
                if (requiredPlayers === 2) {
                    // User selected 2 players (Singles Mode)
                    if (courtMode === 'singles') {
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

        const isSelectable = isGreenBallSelectable || isReservedSelectable;
        const selectionMinimumMet = playersSelected >= 2;
        const finalIsSelectable = selectionMinimumMet && isSelectable;
        const reservedClass = isReservedSelectable && !isGreenBallSelectable ? 'is-reserved-only' : '';
        const isSelected = court.id === state.selection.courtId;

        let statusText;
        let isLeagueReserved = false;
        let isRookieMode = courtMode === 'rookie';

        if (isSelected) {
            statusText = 'SELECTED';
        } else if (court.status === 'available' && courtMode === 'league') {
            statusText = 'League';
            isLeagueReserved = true;
        } else if (court.status === 'available' && isRookieMode) {
            statusText = 'Rookie';
        } else {
            statusText = court.status.replace(/_/g, ' ');
        }

        const courtCard = document.createElement('div');

        let modeClass = '';
        if (court.status === 'available') {
            if (isLeagueReserved) {
                modeClass = 'is-league-reserved';
            } else if (isRookieMode) {
                modeClass = 'is-rookie-mode';
            }
        }

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

        // --- UPDATED: Always show pencil icon for in-progress games ---
        if (court.status === 'in_progress') {
            // Always show the edit/manage players button (pencil icon)
            editBtnHTML = `<button class="edit-game-btn on-court" title="Manage Players" data-action="edit-game"><i class="mdi mdi-pencil"></i></button>`;
        } else if (court.status === 'game_pending' && court.teamsSet === false) {
            // For pending doubles games that need teams chosen, still show team icon
            editBtnHTML = `<button class="edit-game-btn on-court" title="Set Teams" data-action="choose-teams"><i class="mdi mdi-account-group-outline"></i></button>`;
        }
        // --- END UPDATED ---

        const moreOptionsBtnHTML = `
            <button class="more-options-btn on-court" title="More Options" data-action="more-options" data-court-id="${court.id}">
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

        const courtIndex = COURT_HIERARCHY.indexOf(court.id);
        const staticStaggerMs = courtIndex >= 0 ? courtIndex * 500 : 0;

        let animationDurationMs = 4000;
        if (courtMode === 'rookie') {
            animationDurationMs = 8000;
        }

        const elapsedTime = Date.now() - state.pongAnimationOffset;
        const currentOffsetMs = (elapsedTime + staticStaggerMs) % animationDurationMs;
        const delayStyle = `animation-delay: -${(currentOffsetMs / 1000).toFixed(3)}s;`;

        const pongAnimationSinglesHTML = `
            <div class="pong-animation-container" data-mode="singles">
                <div class="pong-paddle top-paddle" style="animation-name: pong-top-move; ${delayStyle}"></div>
                <div class="pong-paddle bottom-paddle" style="animation-name: pong-bottom-move; ${delayStyle}"></div>
                <div class="pong-ball" style="${delayStyle}"></div>
            </div>
        `;

        const pongAnimationDoublesHTML = `
            <div class="pong-animation-container" data-mode="doubles">
                <div class="pong-paddle double dl top-paddle" style="animation-name: pong-move-tl; ${delayStyle}"></div>
                <div class="pong-paddle double dr top-paddle" style="animation-name: pong-move-tr; ${delayStyle}"></div>
                <div class="pong-paddle double dl bottom-paddle" style="animation-name: pong-move-bl; ${delayStyle}"></div>
                <div class="pong-paddle double dr bottom-paddle" style="animation-name: pong-move-br; ${delayStyle}"></div>
                <div class="pong-ball" style="${delayStyle}"></div>
            </div>
        `;

        const pongAnimationRedBallHTML = `
            <div class="pong-animation-container" data-mode="in_progress">
                <div class="pong-ball red-ball-in-progress" style="${delayStyle}"></div>
            </div>
        `;

        let bodyTimerHTML = '';
        if (court.status === 'in_progress' || court.status === 'game_pending') {
            bodyTimerHTML = `<div class="court-body-timer status-${court.status}" id="timer-${court.id}"></div>`;
        }

        const formatName = (playerObj) => playerObj ? playerObj.name.split(' ')[0] : '';

        let playerSpotsHTML = '';
        let coreReserveTextHTML = '';
        let animationHTML = '';
        let matchModeDisplayHTML = '';

        if ((court.status === 'in_progress' || court.status === 'game_pending') && court.matchMode) {
            let text = '';
            if (court.matchMode === 'fast') {
                text = `Fast Play (${court.fastPlayGames} games)`;
            } else if (court.matchMode === '1set') {
                text = '1 Set Match';
            } else if (court.matchMode === '3set') {
                text = '3 Set Match';
            }
            if (text) {
                matchModeDisplayHTML = `<div class="match-mode-display">${text}</div>`;
            }
        }

        // --- DRAGGABLE PLAYER NAMES ---
        const makeDraggable = (court.status === 'in_progress' || court.status === 'game_pending');
        const draggableAttr = makeDraggable ? 'draggable="true"' : '';
        const draggableClass = makeDraggable ? 'draggable-player' : '';

        if (court.status !== 'available') {
            if (court.gameMode === 'singles') {
                playerSpotsHTML = `
                    <div class="player-spot single-player top-row" ${draggableAttr} data-court-id="${court.id}" data-player-name="${court.teams.team1[0]?.name || ''}" data-player-pos="top">
                        <span class="${draggableClass}">${formatName(court.teams.team1[0])}</span>
                    </div>
                    <div class="player-spot single-player bottom-row" ${draggableAttr} data-court-id="${court.id}" data-player-name="${court.teams.team2[0]?.name || ''}" data-player-pos="bottom">
                        <span class="${draggableClass}">${formatName(court.teams.team2[0])}</span>
                    </div>
                `;
            } else {
                if (court.teamsSet === false) {
                    playerSpotsHTML = `
                        <div class="player-spot top-row" data-player-pos="top-left" ${draggableAttr} data-court-id="${court.id}" data-player-name="${court.players[0]?.name || ''}" data-team="unset">
                            <span class="${draggableClass}">${formatName(court.players[0])}</span>
                        </div>
                        <div class="player-spot top-row" data-player-pos="top-right" ${draggableAttr} data-court-id="${court.id}" data-player-name="${court.players[1]?.name || ''}" data-team="unset">
                            <span class="${draggableClass}">${formatName(court.players[1])}</span>
                        </div>
                        <div class="player-spot bottom-row" data-player-pos="bottom-left" ${draggableAttr} data-court-id="${court.id}" data-player-name="${court.players[2]?.name || ''}" data-team="unset">
                            <span class="${draggableClass}">${formatName(court.players[2])}</span>
                        </div>
                        <div class="player-spot bottom-row" data-player-pos="bottom-right" ${draggableAttr} data-court-id="${court.id}" data-player-name="${court.players[3]?.name || ''}" data-team="unset">
                            <span class="${draggableClass}">${formatName(court.players[3])}</span>
                        </div>
                    `;
                } else {
                    playerSpotsHTML = `
                        <div class="player-spot top-row" data-player-pos="top-left" ${draggableAttr} data-court-id="${court.id}" data-player-name="${court.teams.team1[0]?.name || ''}" data-team="team1">
                            <span class="${draggableClass}">${formatName(court.teams.team1[0])}</span>
                        </div>
                        <div class="player-spot top-row" data-player-pos="top-right" ${draggableAttr} data-court-id="${court.id}" data-player-name="${court.teams.team1[1]?.name || ''}" data-team="team1">
                            <span class="${draggableClass}">${formatName(court.teams.team1[1])}</span>
                        </div>
                        <div class="player-spot bottom-row" data-player-pos="bottom-left" ${draggableAttr} data-court-id="${court.id}" data-player-name="${court.teams.team2[0]?.name || ''}" data-team="team2">
                            <span class="${draggableClass}">${formatName(court.teams.team2[0])}</span>
                        </div>
                        <div class="player-spot bottom-row" data-player-pos="bottom-right" ${draggableAttr} data-court-id="${court.id}" data-player-name="${court.teams.team2[1]?.name || ''}" data-team="team2">
                            <span class="${draggableClass}">${formatName(court.teams.team2[1])}</span>
                        </div>
                    `;
                }
            }

            if (court.status === 'in_progress') {
                animationHTML = pongAnimationRedBallHTML;
            }
        }
        // --- END DRAGGABLE PLAYER NAMES ---

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
            const disabledAttr = isReservedSelectable || isLeagueReserved ? 'disabled' : '';
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

        if (court.status === 'available') {
            reserveTextHTML = '';

            if (courtMode === 'league') {
                playerSpotsHTML = `<div class="league-reserved-icon-container"></div>`;
            } else if (courtMode === 'singles') {
                playerSpotsHTML = pongAnimationSinglesHTML;
            } else if (courtMode === 'doubles' || courtMode === 'rookie') {
                playerSpotsHTML = pongAnimationDoublesHTML;
            } else {
                playerSpotsHTML = '';
            }
        }

        const light = state.lightSettings.courts[court.id];
        const isLightManaged = light && light.isManaged;
        const lightIconClass = isLightManaged && light.isActive ? 'mdi-lightbulb-on' : 'mdi-lightbulb-outline';
        const lightDisabledAttr = isLightManaged ? '' : 'disabled';

        const lightBtnHTML = `
            <button class="light-toggle-btn on-court" title="Toggle Lights" data-action="toggle-light" data-court-id="${court.id}" ${lightDisabledAttr}>
                <i class="mdi ${lightIconClass}"></i>
            </button>
        `;

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
                    ${matchModeDisplayHTML}
                    ${modeOverlayHTML}
                </div>
                ${cancelBtnHTML}
                ${editBtnHTML}
                ${moreOptionsBtnHTML}
                ${lightBtnHTML}
            </div>`;

        return courtCard;
    }

    // NEW FUNCTION: Calculate the players with the highest stats overall
    function calculateStarPlayers() {
        // --- THIS IS THE NEW LOGIC ---
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        const todaysGames = state.gameHistory.filter(game => {
            const gameDate = new Date(game.endTime).toISOString().split('T')[0];
            return gameDate === today;
        });
        const stats = calculatePlayerStats(todaysGames); // Calculate stats for ONLY today's games
        // --- END OF NEW LOGIC ---

        const allPlayers = getAllKnownPlayers();

        let king = { name: null, wp: -1, duration: -1 };
        let queen = { name: null, wp: -1, duration: -1 };

        for (const name in stats) {
            const playerStats = stats[name];
            const playerObj = allPlayers.find(p => p.name === name);

            // Skip players who opted out of the leaderboard, have no stats, or lack gender info
            if (!playerObj || playerStats.played === 0 || playerObj.onLeaderboard === false || !playerObj.gender) {
                continue;
            }

            const winPercentage = playerStats.won / playerStats.played;

            if (playerObj.gender === 'M') {
                if (winPercentage > king.wp) {
                    king = { name: name, wp: winPercentage, duration: playerStats.totalDurationMs };
                } else if (winPercentage === king.wp && playerStats.totalDurationMs > king.duration) {
                    king = { name: name, wp: winPercentage, duration: playerStats.totalDurationMs };
                }
            } else if (playerObj.gender === 'F') {
                if (winPercentage > queen.wp) {
                    queen = { name: name, wp: winPercentage, duration: playerStats.totalDurationMs };
                } else if (winPercentage === queen.wp && playerStats.totalDurationMs > queen.duration) {
                    queen = { name: name, wp: winPercentage, duration: playerStats.totalDurationMs };
                }
            }
        }

        return {
            kingOfTheCourt: king.name,
            queenOfTheCourt: queen.name
        };
    }
    // END NEW FUNCTION

    function createSummaryCard() {
        const total = totalPlayersAtClub();
        const available = getActivePlayerCount();
        const onCourt = total - available;
        const availableCourtsCount = state.courts.filter(
            c => state.courtSettings.visibleCourts.includes(c.id) && c.status === 'available'
        ).length;
        const totalVisibleCourts = state.courtSettings.visibleCourts.length;
        const onDutyName = state.onDuty === 'None' ? 'Nobody' : state.onDuty;
        const dutyLabel = state.onDuty === 'None' ? 'Call Any Committee Member!' : 'Is On Duty. Call Me!';

        const { kingOfTheCourt, queenOfTheCourt } = calculateStarPlayers();
        let matchModeText = '';
        if (state.matchSettings.matchMode === '1set') {
            matchModeText = '1 Set Game Mode';
        } else if (state.matchSettings.matchMode === '3set') {
            matchModeText = '3 Set Game Mode';
        } else {
            matchModeText = `Fast Play ${state.matchSettings.fastPlayGames} Game Mode`;
        }

        const availableCourts = state.courts.filter(c => c.status === 'available' && state.courtSettings.visibleCourts.includes(c.id));
        const doublesAvailable = availableCourts.filter(c => c.courtMode === 'doubles').length;
        const singlesAvailable = availableCourts.filter(c => c.courtMode === 'singles').length;
        const rookieAvailable = availableCourts.filter(c => c.courtMode === 'rookie').length;

        const isExpanded = state.mobileControls.isSummaryExpanded;
        const bodyClass = isExpanded ? '' : 'is-collapsed';
        const iconClass = isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down';

        return `
            <div class="summary-card ${bodyClass}" data-card-type="summary">
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

                    <div class="summary-match-mode">
                        <p>
                            <span class="match-mode-label">Match Mode:</span>
                            <span class="match-mode-value">${matchModeText}</span>
                        </p>
                    </div>

                    <div class="summary-stats">
                        <div class="summary-stats-grid">
                            <div class="stats-column">
                                <div><span>Players:</span> <strong>${total}</strong></div>
                                <div><span>Queueing:</span> <strong class="available-value">${available}</strong></div>
                                <div><span>On Court:</span> <strong class="on-court-value">${onCourt}</strong></div>
                            </div>
                            <div class="stats-column">
                                <div><span>Courts:</span> <strong>${availableCourtsCount} / ${totalVisibleCourts}</strong></div>
                                <div><span>Availability:</span> <strong>D:${doublesAvailable} S:${singlesAvailable} R:${rookieAvailable}</strong></div>
                            </div>
                        </div>
                    </div>

                    <div class="summary-extra-stats">
                        <div>
                            <span class="stat-label">King of the Court!</span>
                            <strong class="stat-value">👑 ${kingOfTheCourt || 'N/A'}</strong>
                        </div>
                        <div>
                            <span class="stat-label">Queen of the Court!</span>
                            <strong class="stat-value">👑 ${queenOfTheCourt || 'N/A'}</strong>
                        </div>
                    </div>

                    <div class="quote-section">
                        <p id="quote-text" class="quote-text"></p>
                    </div>
                </div>
            </div>
        `;
    }

    function updateGameModeBasedOnPlayerCount() {
        const availableCount = getActivePlayerCount();
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

    // --- NEW FUNCTION: Dynamically sets game mode based on player selection ---
    function updateGameModeBasedOnSelection() {
        const { players: selectedPlayers } = state.selection;
        const isSinglesCourtAvailable = state.courts.some(c => c.status === 'available' && c.courtMode === 'singles' && state.courtSettings.visibleCourts.includes(c.id));

        // If 2 players are selected AND a singles court is free, switch to singles mode
        if (selectedPlayers.length === 2 && isSinglesCourtAvailable) {
            if (state.selection.gameMode !== 'singles') {
                state.selection.gameMode = 'singles';
            }
        } else {
            // In all other cases (more players selected, or no singles court), default to doubles
            if (state.selection.gameMode !== 'doubles') {
                state.selection.gameMode = 'doubles';
            }
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



    function createPlayerListItem(player, index, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, winningStreaks, heartbreakerName, isSpecialCase = false, sliceEnd = 8, specialHighlightIndex = -1, isSelector = false, inGroup = false) {
        const li = document.createElement("li");
        const playerName = player.name;

        let statusText;
        // *** MODIFIED STATUS TEXT LOGIC ***
        if (player.guest) {
            // If it's a guest AND they have a specific type (Junior, Adult, etc.)
            if (player.type) {
                statusText = `${player.type} Guest`; // e.g., "Adult Guest"
            } else {
                statusText = 'Guest'; // Fallback if type is missing
            }
        } else if (player.committee) {
            statusText = `Committee ${player.committee}`; //
        } else {
            // For members, use their type from the master list if available, otherwise default
            statusText = player.type ? `${player.type} Member` : 'Member'; //
        }
        // *** END MODIFIED LOGIC ***


        let priorityText = '';
        let priorityClass = 'player-status'; // Use player-status by default

        if (playerName === state.onDuty) {
            priorityText = 'Low Priority'; //
            priorityClass = 'player-priority'; //
        }

        let iconHtml = '';
        const isKing = playerName === starPlayers.kingOfTheCourt;
        const isQueen = playerName === starPlayers.queenOfTheCourt;
        const isHeartbreaker = playerName === heartbreakerName;
        const streak = winningStreaks[playerName] || 0;

        const statusFaderItems = [statusText]; // Start fader items with the primary status
        let statusHTML;

        if (isKing || isQueen) {
            iconHtml += '<span style="color: gold; margin-left: 5px;">👑</span>'; //
            statusFaderItems.push(isKing ? "King of the Court" : "Queen of the Court"); //
        }
        if (streak >= 3) {
            iconHtml += `<span title="${streak} wins in a row!" style="margin-left: 5px;">🎲</span>`; //
            statusFaderItems.push("On a roll!"); //
        }
        if (isHeartbreaker) {
            iconHtml += `<span title="Heartbreaker!" style="margin-left: 5px;">💔</span>`; //
            statusFaderItems.push("So Close!"); //
        }

        // Generate status HTML, handling the fader if needed
        if (statusFaderItems.length > 1) {
            statusHTML = `<div class="player-status-fader">`; //
            // Add the primary status text first (which now includes the type for guests)
            statusHTML += `<span class="status-text is-visible ${priorityClass}">${priorityText || statusText}</span>`; //
            // Add other fading statuses (King/Queen, On a Roll, etc.)
            statusFaderItems.slice(1).forEach((text) => { // Start from index 1
                statusHTML += `<span class="status-text">${text}</span>`; //
            });
            statusHTML += `</div>`;
        } else {
             // If only one status, display it directly
            statusHTML = `<span class="${priorityClass}">${priorityText || statusText}</span>`; //
        }


        const isPaused = player.isPaused;
        const pauseIcon = isPaused ? 'mdi-play' : 'mdi-pause'; //
        const pauseAction = isPaused ? 'resume' : 'pause'; //

        let playtimeHTML;
        if (isPaused && player.pauseTime) {
            const TEN_MINUTES_MS = 10 * 60 * 1000;
            const elapsed = Date.now() - player.pauseTime;
            const remaining = Math.max(0, TEN_MINUTES_MS - elapsed);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            const timeString = `${String(minutes).padStart(2, "0")}m${String(seconds).padStart(2, "0")}s`;
            playtimeHTML = `<span class="player-playtime player-pause-cooldown" data-pause-time="${player.pauseTime}">${timeString}</span>`; //
        } else {
            const playtime = playerStats[playerName] ? formatDuration(playerStats[playerName].totalDurationMs) : '00h00m';
            playtimeHTML = `<span class="player-playtime">${playtime}</span>`; //
        }

        let suggestionButtonHTML = '<div class="suggestion-icon-wrapper"></div>'; // Placeholder for alignment
        if (isSelector && getActivePlayerCount() >= 5) {
            suggestionButtonHTML = `<div class="suggestion-icon-wrapper"><button class="suggestion-btn" title="Suggest a balanced game">💡</button></div>`; //
        }

        li.innerHTML = `
            <div class="player-details">
                <div class="player-name-container">
                    <span class="player-name">${playerName}</span>
                    ${iconHtml}
                </div>
                ${statusHTML}
            </div>
            <div class="player-stats">
                ${suggestionButtonHTML}
                <button class="pause-toggle-btn" data-player-name="${playerName}" data-action="${pauseAction}" title="${isPaused ? 'Resume Game Play' : 'Pause Game Play'}">
                    <i class="mdi ${pauseIcon}"></i>
                </button>
                <div class="gender-container gender-${player.gender}">
                    <span class="player-gender">${player.gender}</span>
                </div>
                ${playtimeHTML}
            </div>
        `; //
        li.dataset.playerName = playerName; //

        // Apply suggestion classes if a suggestion is active
        if (state.activeSuggestion) {
            const { team1, team2 } = state.activeSuggestion;
            if (team1.some(p => p.name === playerName)) {
                li.classList.add('suggested-partner'); //
            } else if (team2.some(p => p.name === playerName)) {
                li.classList.add('suggested-opponent'); //
            }
        }

        if (player.isPaused) li.classList.add("paused-player"); //
        if (selectedPlayerNames.includes(playerName)) li.classList.add("selected"); //
        else {
            const isSelectionFull = selectedPlayerNames.length >= 4; // Check if 4 players already selected
            let isDisabled = false;
            if (isSpecialCase) { if (index >= sliceEnd) isDisabled = true; } //
            else { if (index >= sliceEnd) isDisabled = true; } //
            if (player.isPaused) isDisabled = true; //
            if (index === specialHighlightIndex) isDisabled = false; //
            // Disable if selection is full OR if player is beyond the selectable range/paused
            if (isSelectionFull || isDisabled) li.classList.add("disabled"); //
        }

        if (isSelector) li.classList.add("first-player"); //
        // This handles the case where the paused player at index 0 makes the next available player the 'first-player' visually
        if (!isSelector && index === state.availablePlayers.findIndex(p => !p.isPaused)) li.classList.add("first-player"); //

        return li;
    }

    function handleOnDutyChange(e) {
        state.onDuty = e.target.value;
        saveState();
        enforceQueueLogic(); // --- THIS IS THE FIX ---
        render();
    }

    // NEW FUNCTION: Check if on-duty member is being selected for a game
    function checkOnDutyMemberInSelection(selectedPlayerNames) {
        if (state.onDuty === 'None') return false;
        return selectedPlayerNames.includes(state.onDuty);
    }

    // NEW FUNCTION: Show temporary duty handover modal
    function showTempDutyHandoverModal(callback) {
        tempDutyHandoverList.innerHTML = '';
        tempDutyCurrentMember.textContent = state.onDuty;
        
        // Get all committee members who are currently checked in
        const checkedInCommitteeMembers = [
            ...state.availablePlayers.filter(p => p.committee),
            ...state.courts.flatMap(c => c.players).filter(p => p.committee)
        ];

        const selectedPlayerNames = new Set(state.selection.players);
        
        // Remove the current on-duty member and filter for those NOT on court
        const availableCommitteeMembers = state.availablePlayers
            .filter(p => p.committee && p.name !== state.onDuty && !selectedPlayerNames.has(p.name))
            .sort((a, b) => a.name.localeCompare(b.name));
        
        // Add "None" option first
        const noneOption = document.createElement('li');
        noneOption.className = 'committee-member';
        noneOption.innerHTML = `
            <label>
                <input type="radio" name="tempDutyMember" value="None">
                <div class="member-details">
                    <span class="member-name">None</span>
                    <span class="member-designation">No temporary replacement</span>
                </div>
            </label>
        `;
        tempDutyHandoverList.appendChild(noneOption);
        
        // Add available committee members
        if (availableCommitteeMembers.length === 0) {
            const noMembersLi = document.createElement('li');
            noMembersLi.style.justifyContent = 'center';
            noMembersLi.style.color = 'var(--neutral-color)';
            noMembersLi.textContent = 'No other committee members available';
            tempDutyHandoverList.appendChild(noMembersLi);
        } else {
            availableCommitteeMembers.forEach(member => {
                const li = document.createElement('li');
                li.className = 'committee-member';
                li.innerHTML = `
                    <label>
                        <input type="radio" name="tempDutyMember" value="${member.name}">
                        <div class="member-details">
                            <span class="member-name">${member.name}</span>
                            <span class="member-designation">${member.committee}</span>
                        </div>
                    </label>
                `;
                tempDutyHandoverList.appendChild(li);
            });
        }
        
        // Store the callback to execute on confirm
        tempDutyHandoverModal.dataset.callback = 'pending';
        tempDutyHandoverModal.callback = callback;
        
        tempDutyConfirmBtn.disabled = true;
        
        // Enable confirm button when a selection is made
        tempDutyHandoverList.querySelectorAll('input[name="tempDutyMember"]').forEach(radio => {
            radio.addEventListener('change', () => {
                tempDutyConfirmBtn.disabled = false;
            });
        });
        
        tempDutyHandoverModal.classList.remove('hidden');
    }

    // NEW FUNCTION: Handle temporary duty handover confirmation
    function handleTempDutyHandoverConfirm() {
        const selectedMember = tempDutyHandoverList.querySelector('input[name="tempDutyMember"]:checked');

        if (!selectedMember) return;

        const newTempDuty = selectedMember.value;
        const originalDuty = state.onDuty;

        // Store the original on-duty member
        if (!state.tempDutyHandover) {
            state.tempDutyHandover = {
                originalMember: originalDuty,
                tempMember: newTempDuty,
                timestamp: Date.now()
            };
        }

        // Update the on-duty member
        state.onDuty = newTempDuty;

        // Announce the change - using pronounceable names
        const originalDutyPronounceable = getPronounceableName(originalDuty);
        if (newTempDuty === 'None') {
            playAlertSound(`There will be nobody on duty while ${originalDutyPronounceable} is in a match.`);
        } else {
            const newTempDutyPronounceable = getPronounceableName(newTempDuty);
            playAlertSound(`${newTempDutyPronounceable} is temporarily on duty while ${originalDutyPronounceable} is in a match.`);
        }

        tempDutyHandoverModal.classList.add('hidden');

        // Execute the stored callback (continue with game setup)
        if (tempDutyHandoverModal.callback) {
            tempDutyHandoverModal.callback();
            tempDutyHandoverModal.callback = null;
        }

        saveState();
        render();
    }

    // NEW FUNCTION: Restore original duty member after game ends
    function restoreOriginalDutyMember() {
        if (state.tempDutyHandover && state.tempDutyHandover.originalMember) {
            state.onDuty = state.tempDutyHandover.originalMember;
            state.tempDutyHandover = null;
            saveState();
            render();
        }
    }

// --- CUSTOM ANNOUNCEMENT FUNCTIONS ---

    function handleTtsIntervalChange(direction) {
        // --- THIS IS THE FIX ---
        // Ensure currentInterval is a number, defaulting to 30 if it's not.
        const currentInterval = Number(state.customAnnouncementState.ttsIntervalMins) || 30;
        // --- END OF FIX ---

        let newInterval = currentInterval;
        if (direction === 'increase') {
            newInterval += 15;
        } else if (direction === 'decrease') {
            newInterval -= 15;
        }
        // Set a minimum of 15 minutes
        state.customAnnouncementState.ttsIntervalMins = Math.max(15, newInterval);
        document.getElementById('tts-interval-display').textContent = `${state.customAnnouncementState.ttsIntervalMins} min`;
    }

    function showAnnouncementsModal() {
        announcementList.innerHTML = ''; // Clear existing list

        // --- THIS IS THE FIX ---
        // Ensure the interval defaults to 30 if it's not already a number.
        const interval = Number(state.customAnnouncementState.ttsIntervalMins) || 30;
        document.getElementById('tts-interval-display').textContent = `${interval} min`;
        // --- END OF FIX ---

        const renderItem = (announcement = { text: '', tts: false }, index, isLast = false) => {
            const li = document.createElement('li');
            const uniqueId = `tts-${Date.now()}-${Math.random()}`;
            li.innerHTML = `
                <input type="text" value="${announcement.text}" placeholder="Enter announcement text...">
                <label for="${uniqueId}" class="tts-checkbox-label">
                    <input type="checkbox" id="${uniqueId}" ${announcement.tts ? 'checked' : ''}> TTS
                </label>
                ${isLast ? '<span class="add-announcement-btn" title="Add another message">+</span>' : ''}
                <span class="action-icon remove" data-index="${index}" title="Remove message">&times;</span>
            `;
            announcementList.appendChild(li);
        };

        if (state.announcements.length === 0) {
            renderItem(undefined, 0, true);
        } else {
            state.announcements.forEach((ann, index) => {
                renderItem(ann, index, index === state.announcements.length - 1);
            });
        }
        
        adminSettingsModal.classList.add('hidden');
        customAnnouncementModal.classList.remove('hidden');
    }

    function handleAnnouncementsSave() {
        const newAnnouncements = [];
        announcementList.querySelectorAll('li').forEach(li => {
            const textInput = li.querySelector('input[type="text"]');
            const ttsCheckbox = li.querySelector('input[type="checkbox"]');
            if (textInput && textInput.value.trim() !== '') {
                newAnnouncements.push({
                    text: textInput.value.trim(),
                    tts: ttsCheckbox.checked
                });
            }
        });

        state.announcements = newAnnouncements;
        saveState();
        customAnnouncementModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');
        
        // --- THIS IS THE FIX ---
        // Restart the animation and scheduler to apply all changes immediately.
        startHeaderTextAnimation();
        startCustomTtsScheduler();
        // --- END OF FIX ---
    }

    function startHeaderTextAnimation() {
        // 1. Stop any pending animation cycle
        if (window.headerAnimationInterval) {
            clearTimeout(window.headerAnimationInterval);
        }

        // 2. Immediately reset the UI to a clean, default state
        const announcementContainer = document.getElementById('announcement-container');
        if (announcementContainer) {
            announcementContainer.innerHTML = ''; // Remove any active scrolling elements
        }
        const clock = document.getElementById('header-clock');
        if (clock) {
            clock.style.opacity = 1; // Force the clock to be visible immediately
        }

        // 3. Exit if there's nothing to animate
        if (!clock || !announcementContainer || state.announcements.length === 0) {
            return;
        }

        let currentIndex = 0;

        const cycleAnimation = () => {
            const announcement = state.announcements[currentIndex];
            if (!announcement) {
                clock.style.opacity = 1;
                window.headerAnimationInterval = setTimeout(cycleAnimation, 10000); // 10-second pause between cycles
                return;
            }

            clock.style.opacity = 0; // Fade out clock

            setTimeout(() => {
                const announcementEl = document.createElement('h1');
                announcementEl.className = 'scrolling-announcement';
                // --- START MODIFICATION ---
                // Use innerHTML to add images
                announcementEl.innerHTML = `
                    <span class="scrolling-ball"><span>🥎</span></span>
                    <span class="scrolling-flame">🔥</span>
                    ${announcement.text}

                `;
                // --- END MODIFICATION ---
                announcementContainer.appendChild(announcementEl);

                const containerWidth = announcementContainer.offsetWidth;
                // --- START MODIFICATION ---
                // Need a slight delay for image loading and accurate width calculation
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => { // Double RAF for safety
                        const textWidth = announcementEl.offsetWidth;
                        const scrollDistance = containerWidth + textWidth;
                        const scrollSpeed = 100; // pixels per second
                        const duration = scrollDistance / scrollSpeed;

                        // Set animation duration for the ball spin
                        announcementEl.querySelectorAll('.scrolling-ball > span').forEach(innerSpan => {
                            innerSpan.style.animationDuration = '1s';
                        });



                        announcementEl.style.transform = `translateX(${containerWidth}px)`;
                        announcementEl.classList.add('is-visible');
                        announcementEl.getBoundingClientRect(); // Force browser repaint

                        announcementEl.style.transition = `transform ${duration}s linear`;
                        announcementEl.style.transform = `translateX(-${textWidth}px)`;

                        announcementEl.addEventListener('transitionend', () => {
                            announcementEl.remove();
                            clock.style.opacity = 1; // Fade in clock
                            currentIndex = (currentIndex + 1) % state.announcements.length;

                            // Schedule the NEXT cycle after the 10-second pause
                            window.headerAnimationInterval = setTimeout(cycleAnimation, 10000);
                        }, { once: true });
                    });
                });


            }, 500); // Wait for clock fade-out
        };

        // Start the first cycle after a brief delay
        window.headerAnimationInterval = setTimeout(cycleAnimation, 1000);
    }

    function startCustomTtsScheduler() {
        // THIS IS THE FIX: Use the value from the state
        const ANNOUNCEMENT_CYCLE_MS = state.customAnnouncementState.ttsIntervalMins * 60 * 1000;
        const ANNOUNCEMENT_INTERVAL_MS = 5 * 60 * 1000;

        if (state.customAnnouncementState.scheduler) {
            clearInterval(state.customAnnouncementState.scheduler);
        }

        const ttsAnnouncements = state.announcements.filter(a => a.tts);
        if (ttsAnnouncements.length === 0) return;

        const scheduleNextAnnouncement = () => {
            const mainAlertRemaining = alertScheduleTime > 0 ? alertScheduleTime - Date.now() : ANNOUNCEMENT_CYCLE_MS;
            const midwayPoint = mainAlertRemaining / 2;
            state.customAnnouncementState.nextAnnouncementTime = Date.now() + midwayPoint;
        };

        const runScheduler = () => {
            const now = Date.now();
            const isGamePending = state.courts.some(c => c.status === 'game_pending');

            if (isGamePending || state.customAnnouncementState.isPaused) {
                return;
            }

            if (now >= state.customAnnouncementState.nextAnnouncementTime) {
                const announcement = ttsAnnouncements[state.customAnnouncementState.currentIndex];
                if (announcement) {
                    playCustomTTS(announcement.text);
                }

                state.customAnnouncementState.currentIndex = (state.customAnnouncementState.currentIndex + 1) % ttsAnnouncements.length;

                const nextDelay = state.customAnnouncementState.currentIndex === 0 ? ANNOUNCEMENT_CYCLE_MS : ANNOUNCEMENT_INTERVAL_MS;
                state.customAnnouncementState.nextAnnouncementTime = now + nextDelay;
            }
        };

        scheduleNextAnnouncement();
        state.customAnnouncementState.scheduler = setInterval(runScheduler, 5000);
    }


    // --- EVENT LISTENERS FOR ANNOUNCEMENTS ---
    customAnnouncementBtn.addEventListener('click', showAnnouncementsModal);
    announcementSaveBtn.addEventListener('click', handleAnnouncementsSave);
    announcementCancelBtn.addEventListener('click', () => {
        customAnnouncementModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');
    });
    announcementList.addEventListener('click', (e) => {
        // Check if the add button was clicked
        if (e.target.classList.contains('add-announcement-btn')) {
            // --- ADD LOGIC ---
            const parentLi = e.target.closest('li');
            if (parentLi) {
                e.target.remove(); // Remove the '+' from the current last item
            }

            // Create a new, empty list item with the plus button
            const newLi = document.createElement('li');
            const newUniqueId = `tts-${Date.now()}-${Math.random()}`;
            newLi.innerHTML = `
                <input type="text" value="" placeholder="Enter announcement text...">
                <label for="${newUniqueId}" class="tts-checkbox-label">
                    <input type="checkbox" id="${newUniqueId}"> TTS
                </label>
                <span class="add-announcement-btn" title="Add another message">+</span>
                <span class="action-icon remove" title="Remove message">&times;</span>
            `;
            announcementList.appendChild(newLi); // Append the new item
        } 
        // Check if the remove button was clicked
        else if (e.target.classList.contains('remove')) {
            // --- REMOVE LOGIC ---
            const liToRemove = e.target.closest('li');
            if (liToRemove) {
                liToRemove.remove();
            }
            // If it was the last item, we need to ensure the new last item gets a plus button.
            // The easiest way is to re-render the list from the current state of the inputs.
            const currentAnnouncements = [];
            announcementList.querySelectorAll('li').forEach(li => {
                const textInput = li.querySelector('input[type="text"]');
                const ttsCheckbox = li.querySelector('input[type="checkbox"]');
                currentAnnouncements.push({
                    text: textInput.value,
                    tts: ttsCheckbox.checked
                });
            });
            state.announcements = currentAnnouncements;
            showAnnouncementsModal();
        }
    });

    function render() {
        autoAssignCourtModes()
        const gameModeContainer = document.getElementById('game-mode-container');
        const availablePlayersSectionEl = document.getElementById('availablePlayersSection');
        if (gameModeContainer && availablePlayersSectionEl) {
            const showSelector = state.courtSettings.showGameModeSelector;
            gameModeContainer.style.display = showSelector ? 'block' : 'none';
            availablePlayersSectionEl.classList.toggle('mode-selector-hidden', !showSelector);
        }
        const {
            gameMode,
            players: selectedPlayerNames,
            courtId: selectedCourtId
        } = state.selection;
        const requiredPlayers = gameMode === "doubles" ? 4 : 2;
        const playerStats = calculatePlayerPlaytime();
        const starPlayers = calculateStarPlayers();
        const winningStreaks = calculateWinningStreaks();
        const heartbreakerName = calculateHeartbreaker(); // <-- ADD THIS LINE

        autoAssignMatchMode();
        runAutoMinimizeLogic(); 
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
            let isSpecialCase = false;
            let specialHighlightIndex = -1;
            let nextPlayerSliceEnd = renderQueue.length;
            const selectableGroupBaseSize = 7;

            if (selectorPlayer && (renderQueue.length - sliceStart - 1) >= selectableGroupBaseSize) {
                const selectorGender = selectorPlayer.gender;
                
                const playersAfterSelector = renderQueue.slice(sliceStart + 1);
                const availableInSelectableRange = playersAfterSelector.filter(p => !p.isPaused).slice(0, selectableGroupBaseSize);
                
                if (availableInSelectableRange.length > 0) {
                    const sameGenderCountInRange = availableInSelectableRange.filter(p => p.gender === selectorGender).length;
                    const lastPlayerInRange = availableInSelectableRange[availableInSelectableRange.length - 1];
                    const endOfRangeIndex = renderQueue.findIndex(p => p.name === lastPlayerInRange.name);

                    if (sameGenderCountInRange === 0) {
                        isSpecialCase = true;
                        nextPlayerSliceEnd = endOfRangeIndex;
                        
                        const searchPool = renderQueue.slice(endOfRangeIndex);
                        const foundPlayerIndexInPool = searchPool.findIndex(p => p.gender === selectorGender && !p.isPaused);
                        
                        if (foundPlayerIndexInPool !== -1) {
                            specialHighlightIndex = endOfRangeIndex + foundPlayerIndexInPool;
                        } else {
                            isSpecialCase = false;
                            nextPlayerSliceEnd = endOfRangeIndex + 1;
                        }
                    } else {
                        isSpecialCase = false;
                        specialHighlightIndex = -1;
                        nextPlayerSliceEnd = endOfRangeIndex + 1;
                    }
                }
            }

            if (renderQueue.length > 0) {
                const playersBeforeSelector = renderQueue.slice(0, sliceStart);
                playersBeforeSelector.forEach((player, index) => {
                    // MODIFIED THIS LINE
                    const li = createPlayerListItem(player, index, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, winningStreaks, heartbreakerName, isSpecialCase, nextPlayerSliceEnd, specialHighlightIndex, false, false);
                    availablePlayersList.appendChild(li);
                });

                if (selectorPlayer) {
                    const selectorIndex = sliceStart;
                    // MODIFIED THIS LINE
                    const liSelector = createPlayerListItem(selectorPlayer, selectorIndex, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, winningStreaks, heartbreakerName, isSpecialCase, nextPlayerSliceEnd, specialHighlightIndex, true, false);
                    availablePlayersList.appendChild(liSelector);
                }

                const orangeGroupPlayers = renderQueue.slice(sliceStart + 1, nextPlayerSliceEnd);
                if (orangeGroupPlayers.length > 0) {
                    const groupDiv = document.createElement('div');
                    groupDiv.className = 'next-players-group';
                    orangeGroupPlayers.forEach((player, index) => {
                        const playerIndex = sliceStart + 1 + index;
                        // MODIFIED THIS LINE
                        const playerLi = createPlayerListItem(player, playerIndex, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, winningStreaks, heartbreakerName, isSpecialCase, nextPlayerSliceEnd, specialHighlightIndex, false, true);
                        groupDiv.appendChild(playerLi);
                    });
                    availablePlayersList.appendChild(groupDiv);
                }

                const playersAfterOrangeGroup = renderQueue.slice(nextPlayerSliceEnd);
                playersAfterOrangeGroup.forEach((player, index) => {
                    const playerIndex = nextPlayerSliceEnd + index;
                    // MODIFIED THIS LINE
                    const playerLi = createPlayerListItem(player, playerIndex, selectedPlayerNames, requiredPlayers, playerStats, starPlayers, winningStreaks, heartbreakerName, isSpecialCase, nextPlayerSliceEnd, specialHighlightIndex, false, false);

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

        // ================================
        // STEP 16: ATTACH DRAG & DROP EVENT LISTENERS
        // ================================
        // Attach drag & drop listeners to player spots on courts
        document.querySelectorAll('.player-spot[draggable="true"]').forEach(spot => {
            spot.addEventListener('dragstart', handlePlayerDragStart);
            spot.addEventListener('dragend', handlePlayerDragEnd);
            spot.addEventListener('dragover', handlePlayerDragOver);
            spot.addEventListener('dragleave', handlePlayerDragLeave);
            spot.addEventListener('drop', handlePlayerDrop);
            spot.addEventListener('dblclick', handlePlayerDoubleClick); // Add double-click handler
        });

        // Attach drag listeners to available players list for substitution drops
        const availablePlayersListEl = document.getElementById('availablePlayersList');
        if (availablePlayersListEl) {
            // Remove old listeners to prevent duplicates (if any)
            availablePlayersListEl.removeEventListener('dragover', handlePlayerDragOver);
            availablePlayersListEl.removeEventListener('dragleave', handlePlayerDragLeave);
            availablePlayersListEl.removeEventListener('drop', handlePlayerDrop);
            
            // Add new listeners
            availablePlayersListEl.addEventListener('dragover', handlePlayerDragOver);
            availablePlayersListEl.addEventListener('dragleave', handlePlayerDragLeave);
            availablePlayersListEl.addEventListener('drop', handlePlayerDrop);
        }
        // ================================
        // END STEP 16
        // ================================

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
        
        updateTimers(); 
        
        initSummaryCardElements();
        setTimeout(setPlayerListHeight, 0);
        
        requestAnimationFrame(setActiveCardForMobileScroll);
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

// REPLACE this function
    function handleModeOptionsClick(courtId) {
        // If an admin session is already active, just perform the action.
        if (adminSessionActive) {
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
            return;
        }

        // Otherwise, store the action and show the dedicated court mode keypad.
        courtModeAction = () => {
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
        };
        showCourtModeKeypad();
    }


    function handleMatchModeChange(e) {
        const newMode = e.target.value;
        state.matchSettings.matchMode = newMode;
        saveState();

        // Toggle visibility of the Fast Play Games selector in the admin modal
        const fastPlaySelector = document.querySelector('.fast-play-games-selector');
        if (fastPlaySelector) {
            fastPlaySelector.style.display = newMode === 'fast' ? '' : 'none';
        }

        render(); // <-- ADD THIS LINE to refresh the UI
    }

    function handleFastPlayGamesChange(e) {
        state.matchSettings.fastPlayGames = parseInt(e.target.value, 10);
        saveState();
        render(); // <-- ADD THIS LINE
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

        if (action === 'toggle-light') {
            handleLightToggleChange(e);
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
            // --- THIS IS THE FIX ---
            const court = state.courts.find(c => c.id === courtId);
            // If the game is already in progress, pass a special context.
            if (court && court.status === 'in_progress') {
                handleChooseTeams(courtId, 'in_progress');
            } else {
                handleChooseTeams(courtId);
            }
            // --- END OF FIX ---
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

                // NEW: Check if on-duty member is in the selection BEFORE setting up the court
                if (checkOnDutyMemberInSelection(selectedPlayerNames)) {
                    showTempDutyHandoverModal(() => {
                        // This callback continues the game setup after duty handover
                        proceedWithCourtSelection(selectedPlayerNames, courtId, gameMode);
                    });
                    return;
                }

                // If on-duty member is not selected, proceed normally
                proceedWithCourtSelection(selectedPlayerNames, courtId, gameMode);

            }, 2000);
            
            return;
        }
    }

    // NEW FUNCTION: Extracted court selection logic

    function proceedWithCourtSelection(selectedPlayerNames, courtId, gameMode) {
        const court = state.courts.find(c => c.id === courtId);

        // --- THIS IS THE FIX ---
        // The snapshot is now taken BEFORE any players are removed from the available list.
        court.queueSnapshot = JSON.parse(JSON.stringify(state.availablePlayers));
        // --- END OF FIX ---

        // If a suggestion is active, use its teams and bypass player selection
        if (state.activeSuggestion) {
            court.players = [...state.activeSuggestion.team1, ...state.activeSuggestion.team2];
            court.teams.team1 = state.activeSuggestion.team1;
            court.teams.team2 = state.activeSuggestion.team2;
            court.teamsSet = true;
            court.gameMode = 'doubles'; // Suggestion is always for doubles
            
            state.availablePlayers = state.availablePlayers.filter(p => !court.players.some(p2 => p2.name === p.name));
            clearSuggestionHighlights(); // Clear highlights and stored suggestion
        } else {
            const selectedPlayerObjects = selectedPlayerNames.map(name => getPlayerByName(name));
            court.players = [...selectedPlayerObjects];
            court.gameMode = gameMode;
            if (gameMode === 'doubles') {
                court.status = "selecting_teams";
                court.teams.team1 = [];
                court.teams.team2 = [];
            } else {
                court.teams.team1 = [selectedPlayerObjects[0]];
                court.teams.team2 = [selectedPlayerObjects[1]];
            }
            state.availablePlayers = state.availablePlayers.filter(p => !selectedPlayerNames.includes(p.name));
        }

        // The rest of the original function remains the same
        court.status = court.status === "selecting_teams" ? "selecting_teams" : "game_pending";
        if (court.status === "game_pending") {
            court.autoStartTimeTarget = Date.now() + 60000;
            court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000);
        }

        // --- ADD THIS BLOCK ---
        // Clear the stored suggestion outcome for the next turn
        state.currentSuggestionOutcome = null;
        state.currentSuggestionType = null;
        // --- END ADD ---

        state.selection = { gameMode: state.selection.gameMode, players: [], courtId: null };
        updateGameModeBasedOnPlayerCount();
        enforceDutyPosition();
        render();
        saveState();
    }

    function formatDuration(ms) { if (ms === 0) return "00h00m"; const totalMinutes = Math.floor(ms / 60000); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; return `${String(hours).padStart(2, "0")}h${String(minutes).padStart(2, "0")}m`; }
    function calculatePlayerStats(gamesToProcess){
        const stats = {};
        gamesToProcess.forEach(game => {
            const allPlayersInGame = [...game.teams.team1, ...game.teams.team2];

            // Find the player objects to check their leaderboard preference
            const allPlayerObjects = allPlayersInGame.map(name => getPlayerByName(name));

            // If ANY player in the game has opted out, the game does not count for anyone's stats
            if (allPlayerObjects.some(p => p.onLeaderboard === false)) {
                return; // Skip this game
            }

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
    function renderHistory() {
        const historyListEl = document.getElementById('history-list');
        const teamHistoryListEl = document.getElementById('team-history-list');
        const historyTitle = document.querySelector("#history-page h3");
        const historyToggleViewBtn = document.getElementById('history-toggle-view');
        const historyToggleTeamsBtn = document.getElementById('history-toggle-teams-btn');

        // Hide all lists initially
        historyListEl.style.display = 'none';
        teamHistoryListEl.style.display = 'none';
        setActiveMobileMenuItem('mobile-history-btn');

        if (state.historyViewMode === "stats") {
            historyTitle.textContent = "Player Stats";
            historyToggleViewBtn.textContent = "Game History";
            historyToggleTeamsBtn.textContent = "Team Stats";
            historyListEl.style.display = ''; // Show the player stats/game history list
            renderPlayerHistory(); // A new function for just the player stats part
        } else if (state.historyViewMode === "teams") {
            historyTitle.textContent = "Team Stats";
            historyToggleViewBtn.textContent = "Player Stats";
            historyToggleTeamsBtn.textContent = "Game History";
            teamHistoryListEl.style.display = ''; 
            state.statsFilter.teamGender = 'all'; // <-- ADD THIS LINE
            renderTeamHistory();
        } else { // "games" view
            historyTitle.textContent = "Game History";
            historyToggleViewBtn.textContent = "Player Stats";
            historyToggleTeamsBtn.textContent = "Team Stats";
            historyListEl.style.display = ''; // Show the player stats/game history list
            renderGameHistory(); // A new function for just the game history part
        }
    }

    function renderPlayerHistory() {
        const stats = calculatePlayerStats(state.gameHistory);
        const allKnownPlayers = getAllKnownPlayers();
        const historyListEl = document.getElementById('history-list');
        historyListEl.innerHTML = "";

        let playersWithStats = Object.keys(stats).filter(name => {
            const playerObj = allKnownPlayers.find(p => p.name === name);
            if (!playerObj || playerObj.onLeaderboard === false) return false;
            if (state.statsFilter.gender === 'all') return true;
            return playerObj.gender === state.statsFilter.gender;
        });

        // --- H2H FILTERING LOGIC ---
        if (state.comparison.active && state.comparison.items.length === 1) {
            const selectedPlayer = state.comparison.items[0];
            // Filter the list to only include the selected player and their opponents
            playersWithStats = playersWithStats.filter(name => 
                name === selectedPlayer || state.comparison.opponents.has(name)
            );
        }
        // --- END H2H FILTERING ---

        playersWithStats.sort((a, b) => {
            const statA = stats[a];
            const statB = stats[b];
            let compareValue = 0;
            if (state.statsFilter.sortKey === 'name') {
                compareValue = a.localeCompare(b);
            } else {
                compareValue = (statB[state.statsFilter.sortKey] || 0) - (statA[state.statsFilter.sortKey] || 0);
            }
            return state.statsFilter.sortOrder === 'asc' ? -compareValue : compareValue;
        });

        const genderFilterHTML = `
            <div class="gender-selector" style="justify-content: center; margin-bottom: 1rem;">
                <div class="radio-group">
                    <label> <input type="radio" name="stats-gender-filter" value="all" ${state.statsFilter.gender === 'all' ? 'checked' : ''}> All </label>
                    <label> <input type="radio" name="stats-gender-filter" value="M" ${state.statsFilter.gender === 'M' ? 'checked' : ''}> Men </label>
                    <label> <input type="radio" name="stats-gender-filter" value="F" ${state.statsFilter.gender === 'F' ? 'checked' : ''}> Women </label>
                </div>
            </div>`;

        if (playersWithStats.length === 0) {
            historyListEl.innerHTML = genderFilterHTML + '<p style="text-align: center; color: #6c757d;">No stats available for the selected filter.</p>';
        } else {
            const getSortIcon = (key) => (state.statsFilter.sortKey !== key) ? ' ' : (state.statsFilter.sortOrder === 'asc' ? ' 🔼' : ' 🔽');

            const tableHeader = `
                <div class="history-item" style="font-weight: bold; background-color: #f8f9fa;">
                    <div class="stats-grid-row">
                        <button class="sort-btn" data-sort-key="name" style="text-align: left; background: none; border: none; font-weight: bold; cursor: pointer;">Player${getSortIcon('name')}</button>
                        <button class="sort-btn" data-sort-key="played" style="background: none; border: none; font-weight: bold; cursor: pointer;">Played${getSortIcon('played')}</button>
                        <button class="sort-btn" data-sort-key="won" style="background: none; border: none; font-weight: bold; cursor: pointer;">Won %${getSortIcon('won')}</button>
                        <button class="sort-btn" data-sort-key="totalDurationMs" style="background: none; border: none; font-weight: bold; cursor: pointer;">Time${getSortIcon('totalDurationMs')}</button>
                    </div>
                </div>`;

            const playerRows = playersWithStats.map(name => {
                const playerStats = stats[name];
                const winPercentage = formatWinPercentage(playerStats.played, playerStats.won);

                let rowClass = '';
                if(state.comparison.items.includes(name)) {
                    rowClass = 'selected-for-comparison';
                }

                return `
                    <div class="history-item ${rowClass}" data-name="${name}" data-type="player">
                        <div class="stats-grid-row">
                            <span>${name}</span>
                            <span>${playerStats.played}</span>
                            <span>${winPercentage}</span>
                            <span>${formatDuration(playerStats.totalDurationMs)}</span>
                        </div>
                    </div>`;
            }).join('');

            historyListEl.innerHTML = genderFilterHTML + tableHeader + playerRows;
        }

        historyListEl.querySelectorAll('input[name="stats-gender-filter"]').forEach(radio => radio.addEventListener('change', handleStatsFilterChange));
        historyListEl.querySelectorAll('.sort-btn').forEach(btn => btn.addEventListener('click', handleSortClick));
    }

    function renderGameHistory() {
        const historyListEl = document.getElementById('history-list');
        historyListEl.innerHTML = "";
        
        if (state.gameHistory.length === 0) {
            // Include the filters even when empty
            const emptyFilters = createGameHistoryFilters(); 
            historyListEl.innerHTML = emptyFilters + '<p style="text-align: center; color: #6c757d;">No games have been completed yet.</p>';
            
            // Re-attach listeners even to the empty version
            attachGameHistoryFilterListeners();
            return;
        }

        // --- FILTERING LOGIC ---
        const filteredByTime = state.gameHistory.filter(game => 
            isGameInTimeFrame(game, state.gameHistoryFilter.timeFrame)
        );

        const filteredHistory = filteredByTime.filter(game => {
            if (state.gameHistoryFilter.gameType === 'all') return true;
            return game.teams.team1.length === (state.gameHistoryFilter.gameType === 'doubles' ? 2 : 1);
        });

        // --- Sorting Logic ---
        const sortedHistory = [...filteredHistory].sort((a, b) => {
            // ... (existing sorting logic remains here) ...
            const { key, order } = state.historySort;
            let valA, valB;

            if (key === 'score') {
                // If score is null (skipped game), treat as 0 for sorting purposes
                valA = a.score ? Math.max(a.score.team1, a.score.team2) : 0;
                valB = b.score ? Math.max(b.score.team1, b.score.team2) : 0;
            } else if (key === 'court') {
                // Sorting by court (A, B, C...)
                valA = a.court || '';
                valB = b.court || '';
            }
            else {
                // Default to sorting by endTime if other key is not found or is 'endTime'
                valA = a.endTime || 0; 
                valB = b.endTime || 0;
            }
            // For 'score' and 'endTime', default order is usually desc. For 'court' it is asc.
            const defaultOrder = (key === 'score' || key === 'endTime') ? 'desc' : 'asc';
            const finalOrder = order || defaultOrder;

            if (valA < valB) return finalOrder === 'asc' ? -1 : 1;
            if (valA > valB) return finalOrder === 'asc' ? 1 : -1;
            return 0; 
        });

        // --- HEADER GENERATION ---
        const getSortIcon = (key) => (state.historySort.key !== key) ? ' ' : (state.historySort.order === 'asc' ? ' 🔼' : ' 🔽');
        const headerHTML = `
            <div class="history-item" style="font-weight: bold; background-color: #f8f9fa;">
                <div class="game-history-grid">
                    <button class="sort-btn game-time-cell" data-sort-key="endTime">${'Time'}${getSortIcon('endTime')}</button>
                    <button class="sort-btn game-duration-cell" data-sort-key="court">Game Info${getSortIcon('court')}</button>
                    <div class="teams-header game-teams-cell">Teams</div>
                    <button class="sort-btn game-score-cell" data-sort-key="score">${'Score'}${getSortIcon('score')}</button>
                </div>
            </div>
        `;

        // --- GAME ROWS GENERATION (Existing Logic) ---
        const gamesHTML = sortedHistory.map(game => {
            // ... (existing game row rendering logic) ...
            const gameDate = new Date(game.endTime);
            const time = gameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
            const date = gameDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

            const isResultSkipped = game.winner === 'skipped';
            
            let team1Class = isResultSkipped ? '' : (game.winner === "team1" ? 'winner' : 'loser');
            let team2Class = isResultSkipped ? '' : (game.winner === "team1" ? 'loser' : 'winner');

            const team1HTML = game.teams.team1.map(player => `<p class="${team1Class}">${player}</p>`).join('');
            const team2HTML = game.teams.team2.map(player => `<p class="${team2Class}">${player}</p>`).join('');
            
            let scoreDisplayHTML;
            if (isResultSkipped) {
                scoreDisplayHTML = '<p>Skipped</p>';
            } else if (!game.score) {
                scoreDisplayHTML = 'N/A';
            } else {
                const winningScore = game.winner === 'team1' ? game.score.team1 : game.score.team2;
                const losingScore = game.winner === 'team1' ? game.score.team2 : game.score.team1;

                scoreDisplayHTML = `<p><span class="winner">${winningScore}</span> - <span class="loser">${losingScore}</span></p>`;

                if (game.score.tiebreak1 !== null && game.score.tiebreak2 !== null) {
                    const winnerTiebreak = game.winner === 'team1' ? game.score.tiebreak1 : game.score.tiebreak2;
                    const loserTiebreak = game.winner === 'team1' ? game.score.tiebreak2 : game.score.tiebreak1;
                    const tiebreakHTML = `(<span class="winner">${winnerTiebreak}</span> - <span class="loser">${loserTiebreak}</span>)`;
                    scoreDisplayHTML += `<p style="font-size: 0.9em; color: var(--neutral-color);">${tiebreakHTML}</p>`;
                }
            }

            const courtDisplay = game.court === 'Manual' 
                ? `${game.teams.team1.length === 2 ? 'Doubles' : 'Singles'}` 
                : `Court ${game.court}`;
            
            // MODIFIED DURATION CELL
            return `
                <div class="history-item" data-game-id="${game.id}"> 
                    <div class="game-history-grid">
                        <div class="game-time-cell" style="display: flex; flex-direction: column; line-height: 1.2;">
                            <span>${time}</span>
                            <span style="font-size: 0.9em; color: var(--neutral-color);">${date}</span>
                        </div>
                        <div class="game-duration-cell" style="display: flex; flex-direction: column; line-height: 1.2;">
                            <span>${courtDisplay}</span>
                            <span style="font-size: 0.9em; color: var(--neutral-color);">${game.duration}</span>
                        </div>
                        <div class="game-teams-cell">
                            ${team1HTML}
                            ${team2HTML}
                        </div>
                        <div class="game-score-cell">
                            ${scoreDisplayHTML}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // --- ASSEMBLE FINAL HTML ---
        historyListEl.innerHTML = createGameHistoryFilters() + headerHTML + gamesHTML;
        
        // --- RE-ATTACH LISTENERS ---
        historyListEl.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', handleHistorySortClick);
        });
        attachGameHistoryFilterListeners();
    }

    function createGameHistoryFilters() {
        const { timeFrame, gameType } = state.gameHistoryFilter;
        
        return `
            <div class="game-history-filter-container">
                <div class="gender-selector" style="justify-content: center;">
                    <div class="radio-group">
                        <label> <input type="radio" name="game-time-filter" value="Today" ${timeFrame === 'Today' ? 'checked' : ''}> Today </label>
                        <label> <input type="radio" name="game-time-filter" value="Month" ${timeFrame === 'Month' ? 'checked' : ''}> Month </label>
                        <label> <input type="radio" name="game-time-filter" value="Year" ${timeFrame === 'Year' ? 'checked' : ''}> Year </label>
                        <label> <input type="radio" name="game-time-filter" value="Total" ${timeFrame === 'Total' ? 'checked' : ''}> Total </label>
                    </div>
                </div>
            </div>
        `;
    }

    function attachGameHistoryFilterListeners() {
        // Time Frame Filter
        document.querySelectorAll('input[name="game-time-filter"]').forEach(radio => {
            radio.removeEventListener('change', handleGameTimeFilterChange);
            radio.addEventListener('change', handleGameTimeFilterChange);
        });

        // Game Type Filter
        document.querySelectorAll('input[name="game-type-filter"]').forEach(radio => {
            radio.removeEventListener('change', handleGameTypeFilterChange);
            radio.addEventListener('change', handleGameTypeFilterChange);
        });
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

        // Note: We do NOT clear currentSuggestionOutcome here
        // This prevents gaming the system by cancelling court selection to get different results

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
        const suggestionBtn = e.target.closest('.suggestion-btn');
        if (suggestionBtn) {
            // If a suggestion is already active *on the screen* (highlighted), clear it.
            if (state.activeSuggestion) {
                clearSuggestionHighlights();
                // Note: We do NOT clear currentSuggestionOutcome here
                // This prevents gaming the system by toggling to get different results
            } 
            // Otherwise, generate or retrieve the stored suggestion
            else {
                const selector = state.availablePlayers.find(p => !p.isPaused);
                if (!selector) return; // No selector
                
                const available = state.availablePlayers.filter(p => p.name !== selector.name);

                let suggestionOutcome;

                // Check if we already have a stored outcome for this turn
                if (state.currentSuggestionOutcome) {
                    console.log("Using stored suggestion type:", state.currentSuggestionType);
                    suggestionOutcome = state.currentSuggestionOutcome;
                } else {
                    // If not, roll the dice and store the result
                    console.log("Generating new suggestion outcome...");
                    // This now receives the { suggestion, type } object
                    suggestionOutcome = findMostBalancedGame(selector, available);
                    state.currentSuggestionOutcome = suggestionOutcome; // Store the whole object
                    state.currentSuggestionType = suggestionOutcome.type; // Store just the type
                }

                // Now, use the suggestion part of the outcome
                const actualSuggestion = suggestionOutcome.suggestion; // This is { team1, team2 } or null

                if (actualSuggestion && actualSuggestion.team1 && actualSuggestion.team2) {
                    // Populate the main selection array
                    state.selection.players = [
                        ...actualSuggestion.team1.map(p => p.name),
                        ...actualSuggestion.team2.map(p => p.name)
                    ];
                    
                    state.activeSuggestion = actualSuggestion; // Store the { team1, team2 } part for highlighting
                    
                    render(); // Re-render the UI with the new state
                    
                    // Trigger the court selection animations
                    requestAnimationFrame(() => {
                        requestAnimationFrame(ensureCourtSelectionAnimation);
                    });
                } else {
                     console.error("Suggestion logic failed to return a valid suggestion.");
                     playCustomTTS("Could not find a balanced game with the current players.");
                }
            }
            return; // Stop further execution
        }

        const pauseButton = e.target.closest(".pause-toggle-btn");
        if (pauseButton) {
            handlePauseToggleClick(pauseButton);
            return;
        }
        
        // If a player is clicked manually, clear any active suggestion highlights
        if(state.activeSuggestion) {
            clearSuggestionHighlights();
        }

        // Note: We do NOT clear currentSuggestionOutcome here
        // This prevents gaming the system by clicking players to get different results

        const li = e.target.closest("li");
        
        let firstAvailablePlayer = state.availablePlayers[0] ? state.availablePlayers[0].name : null;
        if (state.availablePlayers[0] && state.availablePlayers[0].isPaused) {
            const firstUnpaused = state.availablePlayers.find(p => !p.isPaused);
            firstAvailablePlayer = firstUnpaused ? firstUnpaused.name : null;
        }
        
        if (li && li.dataset.playerName === firstAvailablePlayer) return; 
        if (!li || li.classList.contains("disabled") || li.classList.contains("waiting-message") || state.availablePlayers.length === 0) return;
        
        const playerName = li.dataset.playerName; 
        const { players: selectedPlayerNames } = state.selection; 

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
            } else if (selectedPlayerNames.length < 4) {
                selectedPlayerNames.push(playerName); 
            } 
        }

        updateGameModeBasedOnSelection();
        render(); 
        saveState();

        const requiredPlayers = state.selection.gameMode === "doubles" ? 4 : 2;
        if (state.selection.players.length === requiredPlayers) {
            scrollToFirstAvailableCourt();
            collapsePlayerListOnMobile();
        }
        requestAnimationFrame(() => {
            requestAnimationFrame(ensureCourtSelectionAnimation);
        });
    }

    function handleConfirmSelection(){
        const {players: selectedPlayerNames, courtId, gameMode} = state.selection;
        const requiredPlayers = gameMode === "doubles" ? 4 : 2;
        if (selectedPlayerNames.length !== requiredPlayers || !courtId) return;
        
        // This function is now only called from the confirmation overlay
        // which means it's an alternative flow, but we still need the same check
        if (checkOnDutyMemberInSelection(selectedPlayerNames)) {
            showTempDutyHandoverModal(() => {
                proceedWithCourtSelection(selectedPlayerNames, courtId, gameMode);
            });
            return;
        }
        
        proceedWithCourtSelection(selectedPlayerNames, courtId, gameMode);
    }


    // NEW FUNCTION: Extracted game setup logic
    function proceedWithGameSetup(selectedPlayerNames, courtId, gameMode) {
        const court = state.courts.find(c => c.id === courtId);
        const selectedPlayerObjects = selectedPlayerNames.map(name => getPlayerByName(name));

        court.queueSnapshot = JSON.parse(JSON.stringify(state.availablePlayers));
        court.players = [...selectedPlayerObjects];
        court.gameMode = gameMode;

        // --- NEW LOGIC: Snapshot the match settings for this game ---
        court.matchMode = state.matchSettings.matchMode;
        court.fastPlayGames = state.matchSettings.fastPlayGames;
        // --- END NEW LOGIC ---

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


    function handleCheckout(playerObject) {
        // This function decides which modal to show.
        if (playerObject.onLeaderboard === true) {
            // If the player opted IN, show the modal with stats.
            // This now passes the full object as required by the updated function.
            showCheckoutThanksModal(playerObject);
        } else {
            // If the player opted OUT, show the new modal without stats.
            showCheckoutThanksModalNoStats(playerObject);
        }
    }

    function handleChooseLater(courtId){
        const court = state.courts.find(c => c.id === courtId);
        court.status = "game_pending";
        court.teamsSet = false;
        court.matchMode = state.matchSettings.matchMode;
        court.fastPlayGames = state.matchSettings.fastPlayGames;
        court.autoStartTimeTarget = Date.now() + 60000;
        court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000);
        render();
        saveState();
    }
    function handleRandomizeTeams(courtId) {
        const court = state.courts.find(c => c.id === courtId);
        if (!court || court.players.length !== 4) return;

        const men = court.players.filter(p => p.gender === 'M');
        const women = court.players.filter(p => p.gender === 'F');

        // --- THIS IS THE NEW LOGIC ---
        // If it's a 2-man, 2-woman group, create mixed teams
        if (men.length === 2 && women.length === 2) {
            // Shuffle each gender group
            const shuffledMen = men.sort(() => 0.5 - Math.random());
            const shuffledWomen = women.sort(() => 0.5 - Math.random());

            // Create mixed teams
            court.teams.team1 = [shuffledMen[0], shuffledWomen[0]];
            court.teams.team2 = [shuffledMen[1], shuffledWomen[1]];
        } else {
            // Fallback to the original complete shuffle for any other combination
            let players = [...court.players].sort(() => 0.5 - Math.random());
            court.teams.team1 = [players[0], players[1]];
            court.teams.team2 = [players[2], players[3]];
        }
        // --- END OF NEW LOGIC ---

        court.status = "game_pending";
        court.matchMode = state.matchSettings.matchMode;
        court.fastPlayGames = state.matchSettings.fastPlayGames;
        court.teamsSet = true;
        court.autoStartTimeTarget = Date.now() + 60000;
        court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000);
        render();
        saveState();
    }
    function handleModalConfirm() {
        const courtId = chooseTeamsModal.dataset.courtId;
        const openedFrom = chooseTeamsModal.dataset.openedFrom;
        const team1Names = Array.from(modalPlayerList.querySelectorAll(".selected")).map(el => el.dataset.player);

        if (team1Names.length !== 2) {
            alert("Please select exactly 2 players for Team 1.");
            return;
        }

        const allPlayerNames = JSON.parse(chooseTeamsModal.dataset.playerNames || '[]');
        const allPlayerObjects = allPlayerNames.map(name => getPlayerByName(name));
        const team1Players = team1Names.map(name => getPlayerByName(name));
        const team2Players = allPlayerObjects.filter(player => !team1Names.includes(player.name));

        chooseTeamsModal.classList.add("hidden");
        delete chooseTeamsModal.dataset.openedFrom;
        delete chooseTeamsModal.dataset.playerNames;
        delete chooseTeamsModal.dataset.courtId;

        if (openedFrom === 'manual') {
            const manualGameData = {
                players: allPlayerObjects,
                gameMode: 'doubles',
                teamsSet: true, // Mark teams as set
                teams: { team1: team1Players, team2: team2Players }
            };
            // Re-call handleEndGame with the completed data to show the results modal
            handleEndGame(null, null, manualGameData);
        } else {
            const court = state.courts.find(c => c.id === courtId);
            if (court) {
                court.teams.team1 = team1Players;
                court.teams.team2 = team2Players;
                court.teamsSet = true;
                court.matchMode = state.matchSettings.matchMode;
                court.fastPlayGames = state.matchSettings.fastPlayGames;

                if (openedFrom === 'in_progress') {
                    // If teams were set during an active game, re-render and return to manage modal
                    render();
                    saveState();
                    // Reopen the manage players modal
                    showManageCourtPlayersModal(courtId);
                    return; // Exit early so we don't fall through to the saveState below
                } else if (openedFrom === 'endgame') {
                    handleEndGame(courtId); // Re-enter to show results modal
                } else { // Normal pre-game setup
                    court.status = "game_pending";
                    court.autoStartTimeTarget = Date.now() + 60000;
                    court.autoStartTimer = setTimeout(() => handleStartGame(courtId), 60000);
                    render(); // <-- THIS IS THE FIX
                }
                saveState();
            }
        }
    }

    function handleChooseTeams(courtId, openedFrom = 'setup', players = null) {
        chooseTeamsModal.classList.remove("hidden");
        chooseTeamsModal.dataset.openedFrom = openedFrom;

        modalPlayerList.innerHTML = "";
        modalPlayerList.classList.remove('two-row-grid');

        document.getElementById('modal-confirm-teams-btn').textContent = "Confirm";
        document.getElementById('modal-cancel-btn').textContent = "Close";

        const court = courtId ? state.courts.find(c => c.id === courtId) : null;
        const playersToDisplay = players || (court ? court.players : []);

        if (playersToDisplay.length > 0) {
            if (playersToDisplay.length === 4) {
                modalPlayerList.classList.add('two-row-grid');
            }

            playersToDisplay.forEach(player => {
                const div = document.createElement("div");
                div.className = "modal-player";
                div.textContent = player.name;
                div.dataset.player = player.name;
                modalPlayerList.appendChild(div);
            });
            
            // Store reference to the players being configured
            chooseTeamsModal.dataset.playerNames = JSON.stringify(playersToDisplay.map(p => p.name));
            if (courtId) {
                chooseTeamsModal.dataset.courtId = courtId;
            }
        }

        modalConfirmBtn.disabled = true;
        modalConfirmBtn.classList.remove('modal-confirm-ready');

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

            const team1Names = getPlayerNames(court.teams.team1);
            const team2Names = getPlayerNames(court.teams.team2);
            let announcementMessage;

            // Updated formatTeamNames to use getPronounceableName
            const formatTeamNames = (names) => {
                const pronounceableNames = names.map(getPronounceableName); // Use helper here
                if (pronounceableNames.length === 1) return pronounceableNames[0];
                if (pronounceableNames.length === 2) return `${pronounceableNames[0]} and ${pronounceableNames[1]}`;
                return pronounceableNames.slice(0, -1).join(', ') + ` and ${pronounceableNames.slice(-1)[0]}`;
            };

            const formattedCourtId = formatCourtIdForTTS(court.id);

            // --- NEW ANNOUNCEMENT LOGIC ---
            let matchModeAnnouncement = '';
            if (court.matchMode === 'fast') {
                matchModeAnnouncement = `... a Fast Play match, first to ${court.fastPlayGames} games`;
            } else if (court.matchMode === '3set') {
                matchModeAnnouncement = '... a 3 set match';
            }
            // --- END NEW LOGIC ---

            if (court.gameMode === 'singles') {
                // Use pronounceable names for singles
                announcementMessage = `${getPronounceableName(team1Names[0])}, and ${getPronounceableName(team2Names[0])} ...are on Court ${formattedCourtId}${matchModeAnnouncement}... Lekker Speel!`;
            } else { // Doubles
                if (court.teamsSet === false) {
                    const playerNames = getPlayerNames(court.players);
                    const namesList = formatTeamNames(playerNames); // Uses pronounceable names via helper
                    announcementMessage = `It's ${namesList}, on Court ${formattedCourtId}${matchModeAnnouncement}... Lekker Speel!`;
                } else {
                    const team1String = formatTeamNames(team1Names); // Uses pronounceable names via helper
                    const team2String = formatTeamNames(team2Names); // Uses pronounceable names via helper
                    announcementMessage = `It's team ${team1String}, versus team ${team2String} ...on Court ${formattedCourtId}${matchModeAnnouncement}... Lekker Speel!`;
                }
            }

            playAlertSound(announcementMessage, null);
            // --- THIS IS THE MODIFIED LOGIC ---
            // 1. Scroll back to the summary card on mobile.
            scrollToSummaryCard();

            // 2. Expand the player list so it's ready for the next selection.
            expandPlayerListOnMobile(); // <-- ADD THIS LINE

            // 3. Render the final UI state.
            render();
            court.isNewGame = false;
            saveState();
            resetAlertSchedule();
            checkAndPlayAlert(false);
        }, 2000);
    }

    // ADD THIS NEW FUNCTION
    function renderManualSelectedPlayers(container) {
        container.innerHTML = '';
        const { players } = state.manualEntry;

        if (players.length === 0) {
            container.innerHTML = '<p style="color: var(--neutral-color); margin: 0; text-align: center; width: 100%;">No players selected yet.</p>';
        } else {
            players.forEach(playerName => {
                const chip = document.createElement('div');
                chip.className = 'selected-player-chip';
                chip.textContent = playerName.split(' ')[0]; // This is the fix for first names
                chip.dataset.playerName = playerName;
                chip.title = 'Click to remove';
                container.appendChild(chip);
            });
        }
    }

    // ADD THIS NEW FUNCTION
    function handleRemoveManualPlayer(playerName) {
        state.manualEntry.players = state.manualEntry.players.filter(p => p !== playerName);

        // Check which modal is currently visible to refresh the correct view
        if (!manualEntryModal.classList.contains('hidden')) {
            showManualPlayerSelectionModal();
        } else if (!outsidePlayerModal.classList.contains('hidden')) {
            showOutsidePlayerModal();
        }
    }

    // ADD THIS NEW FUNCTION
    function openManualPlayerSelectionModal() {
        state.manualEntry.players = []; // Clear state ONLY when opening fresh.
        showManualPlayerSelectionModal(); // Now call the render function.
    }

// REPLACE this function
    function showManualPlayerSelectionModal() {
        historyPage.classList.add('hidden');
        manualEntryModal.classList.remove('hidden');
        
        renderManualSelectedPlayers(manualSelectedPlayersContainer);

        const playersOnCourt = state.courts.flatMap(c => c.players);
        const allPlayersAtClub = [...state.availablePlayers, ...playersOnCourt];
        
        const uniquePlayers = Array.from(new Map(allPlayersAtClub.map(p => [p.name, p])).values())
            .filter(p => !state.manualEntry.players.includes(p.name))
            .sort((a, b) => a.name.localeCompare(b.name));

        manualPlayerList.innerHTML = '';
        if (uniquePlayers.length === 0) {
            manualPlayerList.innerHTML = '<li class="waiting-message">All checked-in players have been selected.</li>';
        } else {
            uniquePlayers.forEach(player => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span style="flex-grow: 1;">${player.name}</span>
                    <span class="action-icon add" data-player-name="${player.name}">+</span>
                `;
                li.dataset.playerName = player.name;
                manualPlayerList.appendChild(li);
            });
        }
        
        setupListWithIndex(uniquePlayers, manualPlayerList, document.getElementById('manual-player-abc-index'));
        
        const count = state.manualEntry.players.length;
        const isValid = count === 2 || count === 4;
        manualEntryConfirmBtn.disabled = !isValid;
        manualEntryConfirmBtn.style.backgroundColor = isValid ? 'var(--confirm-color)' : 'var(--inactive-color)';
    }

// REPLACE this function
    function handleManualPlayerClick(e) {
        const addIcon = e.target.closest('.action-icon.add');
        if (addIcon) {
            const playerName = addIcon.dataset.playerName;
            if (state.manualEntry.players.length < 4) {
                state.manualEntry.players.push(playerName);
                showManualPlayerSelectionModal(); // This is the fix
            } else {
                playCustomTTS("You can select a maximum of 4 players.");
            }
        }
    }

// REPLACE this function
    function showOutsidePlayerModal() {
        manualEntryModal.classList.add('hidden');
        outsidePlayerModal.classList.remove('hidden');

        renderManualSelectedPlayers(outsideSelectedPlayersContainer);

        const playersOnCourt = state.courts.flatMap(c => c.players.map(p => p.name));
        const availablePlayerNames = state.availablePlayers.map(p => p.name);
        const checkedInNames = new Set([...playersOnCourt, ...availablePlayerNames]);

        const outsideMembers = MASTER_MEMBER_LIST.filter(m => !checkedInNames.has(m.name));
        const returningGuests = state.guestHistory.filter(g => !checkedInNames.has(g.name));
        
        const allOutsidePlayers = [...outsideMembers, ...returningGuests]
            .filter(p => !state.manualEntry.players.includes(p.name))
            .sort((a, b) => a.name.localeCompare(b.name));
        
        outsidePlayerList.innerHTML = '';
        if (allOutsidePlayers.length === 0) {
            outsidePlayerList.innerHTML = '<li class="waiting-message">All other players have been selected.</li>';
        } else {
            allOutsidePlayers.forEach(player => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span style="flex-grow: 1;">${player.name}</span>
                    <span class="action-icon add" data-player-name="${player.name}">+</span>
                `;
                li.dataset.playerName = player.name;
                outsidePlayerList.appendChild(li);
            });
        }
        setupListWithIndex(allOutsidePlayers, outsidePlayerList, document.getElementById('outside-player-abc-index'));

        // Logic for the new confirm button
        const count = state.manualEntry.players.length;
        const isValid = count === 2 || count === 4;
        outsidePlayerConfirmBtn.disabled = !isValid;
        outsidePlayerConfirmBtn.style.backgroundColor = isValid ? 'var(--confirm-color)' : 'var(--inactive-color)';
    }

// REPLACE this function
    function handleOutsidePlayerClick(e) {
        const addIcon = e.target.closest('.action-icon.add');
        if (addIcon) {
            const playerName = addIcon.dataset.playerName;
            if (state.manualEntry.players.length < 4) {
                state.manualEntry.players.push(playerName);
                showOutsidePlayerModal(); // Re-render this view
            } else {
                playCustomTTS("You have already selected the maximum of 4 players.");
            }
        }
    }

    // ADD THIS NEW FUNCTION
    function handleConfirmManualPlayers() {
        const { players } = state.manualEntry;
        if (players.length !== 2 && players.length !== 4) return;
        
        const playerObjects = players.map(name => getPlayerByName(name));
        const gameMode = players.length === 2 ? 'singles' : 'doubles';
        
        // Create a temporary object to mimic a court for the endGame flow
        const manualGameData = {
            players: playerObjects,
            gameMode: gameMode,
            teamsSet: false,
            teams: { team1: [], team2: [] }
        };

        if (gameMode === 'singles') {
            manualGameData.teamsSet = true;
            manualGameData.teams.team1 = [playerObjects[0]];
            manualGameData.teams.team2 = [playerObjects[1]];
        }
        
        // --- FIX: Ensure both player selection modals are closed ---
        manualEntryModal.classList.add('hidden');
        outsidePlayerModal.classList.add('hidden'); 
        // --- END FIX ---
        
        handleEndGame(null, null, manualGameData); // Pass the manual data object
    }

// REPLACE this function

    function handleEndGame(courtId, editGameId = null, manualEntryData = null) {
        resetEndGameModal(); 

        let matchModeDetails = { matchMode: '1set', fastPlayGames: 4 };

        if (manualEntryData) {
            if (manualEntryData.teamsSet) {
                endGameModal.dataset.manualEntry = JSON.stringify(manualEntryData.players.map(p => p.name));
                endGameTimestamp.textContent = `Manual Entry - ${new Date().toLocaleString('en-ZA')}`;
                const team1Names = getPlayerNames(manualEntryData.teams.team1).join(" & ");
                const team2Names = getPlayerNames(manualEntryData.teams.team2).join(" & ");
                endGameTeams.innerHTML = `
                    <div class="team-selection" data-team="team1"><div><strong>Team 1:</strong> <span>${team1Names}</span></div></div>
                    <div class="team-selection" data-team="team2"><div><strong>Team 2:</strong> <span>${team2Names}</span></div></div>
                `;
            } else {
                handleChooseTeams(null, 'manual', manualEntryData.players);
                return;
            }
        }
        else if (editGameId) {
            const gameToEdit = state.gameHistory.find(g => g.id == editGameId);
            if (!gameToEdit) return;
            endGameModal.dataset.editGameId = editGameId;
            endGameTimestamp.textContent = `Editing Game from: ${new Date(gameToEdit.endTime).toLocaleString()}`;
            const team1Names = gameToEdit.teams.team1.join(" & ");
            const team2Names = gameToEdit.teams.team2.join(" & ");
            endGameTeams.innerHTML = `
                <div class="team-selection" data-team="team1"><div><strong>Team 1:</strong> <span>${team1Names}</span></div></div>
                <div class="team-selection" data-team="team2"><div><strong>Team 2:</strong> <span>${team2Names}</span></div></div>
            `;
        }
        else if (courtId) {
            const court = state.courts.find(c => c.id === courtId);
            if (!court) return;
            if (court.teamsSet === false) {
                handleChooseTeams(courtId, 'endgame');
                return;
            }
            endGameModal.dataset.courtId = courtId;
            matchModeDetails = { matchMode: court.matchMode, fastPlayGames: court.fastPlayGames };
            const now = new Date();
            endGameTimestamp.textContent = `Completed: ${now.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            const team1Names = getPlayerNames(court.teams.team1).join(" & ");
            const team2Names = getPlayerNames(court.teams.team2).join(" & ");
            endGameTeams.innerHTML = `
                <div class="team-selection" data-team="team1"><div><strong>Team 1:</strong> <span>${team1Names}</span></div></div>
                <div class="team-selection" data-team="team2"><div><strong>Team 2:</strong> <span>${team2Names}</span></div></div>
            `;
        }

        endGameModal.dataset.matchMode = matchModeDetails.matchMode;
        endGameModal.dataset.fastPlayGames = matchModeDetails.fastPlayGames;

        const skipBtn = document.getElementById('end-game-skip-btn');
        endGameTeams.querySelectorAll('.team-selection').forEach(el => el.addEventListener('click', (e) => {
            const selectedTeam = e.currentTarget.dataset.team;
            endGameModal.dataset.winner = selectedTeam;
            endGameTeams.querySelectorAll('.team-selection').forEach(teamEl => {
                teamEl.classList.toggle('winner', teamEl.dataset.team === selectedTeam);
                teamEl.classList.toggle('loser', teamEl.dataset.team !== selectedTeam);
            });
            scoreSection.classList.remove('hidden');
            skipBtn.textContent = 'Skip Scores';
            skipBtn.dataset.action = 'skip-scores';
            validateEndGameForm();
        }));
        
        // --- THIS IS THE FIX ---
        // Define keypad rules based on the current game's mode
        let winKeypadConfig = {};
        let loseKeypadConfig = {};

        if (matchModeDetails.matchMode === 'fast') {
            winKeypadConfig = { maxLength: 2, maxValue: matchModeDetails.fastPlayGames };
            loseKeypadConfig = { maxLength: 2, maxValue: matchModeDetails.fastPlayGames - 1 };
        } else { // 1 Set Match logic
            winKeypadConfig = { maxLength: 1, maxValue: 7 };
            loseKeypadConfig = { maxLength: 1, maxValue: 7 };
        }

        // Dynamically wire up the score inputs to use these specific rules for this session
        wireScoreInputToKeypad(winningScoreInput, winKeypadConfig);
        wireScoreInputToKeypad(losingScoreInput, loseKeypadConfig);
        // --- END OF FIX ---

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
            
            // --- THIS IS THE FIX ---
            // Instead of re-selecting players, we clear the selection entirely.
            state.selection.players = []; 
            state.selection.courtId = null; 
            // --- END OF FIX ---
            
            if (court.queueSnapshot) {
                // Restore the available players list to exactly how it was before the game was made.
                state.availablePlayers = court.queueSnapshot;
            } else {
                // Fallback: If for some reason there's no snapshot, return players to the front.
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
            court.queueSnapshot = null;
            court.teamsSet = null;
            cancelConfirmModal.classList.add("hidden");
            updateGameModeBasedOnPlayerCount();
            enforceDutyPosition();
            autoAssignCourtModes();         
            render();
            saveState();
            checkAndPlayAlert(false);

            requestAnimationFrame(() => {
            requestAnimationFrame(ensureCourtSelectionAnimation);
            });
        }
    }
    
    function executePlayerCheckIn(){
        const playerToCheckInName = cancelConfirmModal.dataset.player;
        if (playerToCheckInName) {
            const playerObject = state.clubMembers.find(p => p.name === playerToCheckInName);
            if (playerObject) {
                // Show leaderboard confirmation instead of directly checking in
                leaderboardConfirmModal.dataset.player = JSON.stringify(playerObject);
                leaderboardConfirmModal.classList.remove('hidden');
                cancelConfirmModal.classList.add('hidden');
                checkInModal.classList.add('hidden');
            }
        }
    }

    // Helper function to complete the check-in process
// in script.js

    // Helper function to complete the check-in process
    function finishCheckIn(playerObject) {
        if (!state.availablePlayers.some(p => p.name === playerObject.name)) {
            state.availablePlayers.push(playerObject);
            state.clubMembers = state.clubMembers.filter(p => p.name !== playerObject.name);
        }

        // Hide the leaderboard/guest modals
        leaderboardConfirmModal.classList.add('hidden');
        guestNameModal.classList.add('hidden');

        // Repopulate the check-in list with the remaining members
        populateCheckInModal();
        
        // --- THIS IS THE KEY CHANGE ---
        // Re-open the check-in modal instead of going to the main screen
        checkInModal.classList.remove('hidden');

        // Reset the guest form fields for the next potential entry
        guestNameInput.value = '';
        guestSurnameInput.value = '';
        guestConfirmBtn.disabled = true;
        document.querySelector('input[name="player-type"][value="guest"]').checked = true;

        // Update the main application state in the background
        updateGameModeBasedOnPlayerCount();
        autoAssignCourtModes();
        render();
        saveState();
        checkAndPlayAlert(false);
    }

    function executePlayerCheckOut(){
        const playerToCheckOutName = cancelConfirmModal.dataset.player;
        if (playerToCheckOutName) {
            // --- THIS IS THE FIX ---
            // Check if the player checking out is the first one in the queue.
            if (state.availablePlayers.length > 0 && state.availablePlayers[0].name === playerToCheckOutName) {
                // If so, reset the alert timer and count for the next player.
                resetAlertSchedule();
            }
            // --- END OF FIX ---

            const playerObject = state.availablePlayers.find(p => p.name === playerToCheckOutName);
            if (playerObject) {
                if (playerObject.isJunior) {
                    state.juniorClub.activeChildren = state.juniorClub.active-children.filter(child => child.name !== playerToCheckOutName);
                }

                if (!playerObject.guest) {
                    state.clubMembers.push(playerObject);
                    state.clubMembers.sort((a, b) => a.name.localeCompare(b.name));
                }
            }
            state.availablePlayers = state.availablePlayers.filter(p => p.name !== playerToCheckOutName);
            
            cancelConfirmModal.classList.add("hidden");
            populateCheckOutModal();
            checkOutModal.classList.remove("hidden");
            updateGameModeBasedOnPlayerCount();
            autoAssignCourtModes();
            render();
            saveState();
            // The render() function now triggers the necessary alert checks automatically.
        }
    }
    
// ADD THIS NEW FUNCTION
    function resetEndGameModal() {
        endGameModal.classList.add("hidden");
        // Clear all data attributes
        delete endGameModal.dataset.courtId;
        delete endGameModal.dataset.editGameId;
        delete endGameModal.dataset.winner;
        
        // Clear dynamic content
        endGameTeams.innerHTML = '';
        
        // Hide optional sections
        scoreSection.classList.add('hidden');
        tieBreakerArea.classList.add('hidden');
        
        // Clear input values
        winningScoreInput.value = '';
        losingScoreInput.value = '';
        winnerTiebreakInput.value = '';
        loserTiebreakInput.value = '';
        
        // Reset the confirm button to its default disabled/orange state
        endGameConfirmBtn.disabled = true;
        endGameConfirmBtn.style.backgroundColor = 'var(--inactive-color)';
        endGameConfirmBtn.style.borderColor = 'var(--inactive-color)';

        // Reset the skip button's text and action
        const skipBtn = document.getElementById('end-game-skip-btn');
        skipBtn.textContent = 'Skip Result';
        skipBtn.dataset.action = 'skip-result';
    }


    // REPLACE this function
    function confirmEndGame() {
        const editGameId = endGameModal.dataset.editGameId;
        const manualPlayerNamesJSON = endGameModal.dataset.manualEntry;
        const now = Date.now(); // Get current time once
        const winnerValue = endGameModal.dataset.winner; // Get winner from modal data

        // --- Score Processing (Common Logic) ---
        let score1 = null, score2 = null, tiebreak1 = null, tiebreak2 = null;
        const finalWinningScore = parseInt(winningScoreInput.value, 10);
        const finalLosingScore = parseInt(losingScoreInput.value, 10);

        // Only process scores if they are valid numbers
        if (!isNaN(finalWinningScore) && !isNaN(finalLosingScore)) {
            if (winnerValue === 'team1') {
                score1 = finalWinningScore;
                score2 = finalLosingScore;
            } else {
                score1 = finalLosingScore;
                score2 = finalWinningScore;
            }
            // Process tiebreak only if the area is visible and scores are entered
            if (!tieBreakerArea.classList.contains('hidden')) {
                const finalWinnerTiebreak = parseInt(winnerTiebreakInput.value, 10);
                const finalLoserTiebreak = parseInt(loserTiebreakInput.value, 10);
                if (!isNaN(finalWinnerTiebreak) && !isNaN(finalLoserTiebreak)) {
                    if (winnerValue === 'team1') {
                        tiebreak1 = finalWinnerTiebreak;
                        tiebreak2 = finalLoserTiebreak;
                    } else {
                        tiebreak1 = finalLoserTiebreak;
                        tiebreak2 = finalWinnerTiebreak;
                    }
                }
            }
        }
        // --- End Score Processing ---

        if (manualPlayerNamesJSON) {
            // --- MANUAL ENTRY LOGIC ---
            const manualPlayerNames = JSON.parse(manualPlayerNamesJSON);
            const team1Selection = endGameTeams.querySelector('.team-selection[data-team="team1"] span').textContent;
            const team2Selection = endGameTeams.querySelector('.team-selection[data-team="team2"] span').textContent;
            // Reconstruct teams based on modal display (handles names with '&')
            const team1NamesManual = team1Selection.split(' & ');
            const team2NamesManual = team2Selection.split(' & ');

            const manualGame = {
                id: now,
                court: 'Manual', // Indicate it's a manual entry
                startTime: now - (1 * 60 * 60 * 1000), // Estimate start time (e.g., 1 hour ago)
                endTime: now,
                duration: '01h00m', // Default duration
                teams: { team1: team1NamesManual, team2: team2NamesManual },
                // Include score object only if scores were entered
                score: (score1 !== null && score2 !== null) ? { team1: score1, team2: score2, tiebreak1: tiebreak1, tiebreak2: tiebreak2 } : null,
                winner: winnerValue
            };
            state.gameHistory.push(manualGame);
            // Clear manual entry state
            state.manualEntry.players = [];
            delete endGameModal.dataset.manualEntry; // Clean up dataset

            // --- FIX: Close end game modal and SHOW history ---
            endGameModal.classList.add("hidden");
            historyPage.classList.remove("hidden"); // Re-show history
            renderGameHistory(); // Re-render history list
            saveState();
            resetEndGameModal();
            // --- END FIX ---

            return; // Exit after handling manual entry

        } else if (editGameId) {
            // --- EDIT GAME LOGIC ---
            const gameIndex = state.gameHistory.findIndex(g => g.id == editGameId);
            if (gameIndex > -1) {
                state.gameHistory[gameIndex].winner = winnerValue;
                // Update score only if valid scores were entered
                if (score1 !== null && score2 !== null) {
                    state.gameHistory[gameIndex].score = { team1: score1, team2: score2, tiebreak1: tiebreak1, tiebreak2: tiebreak2 };
                } else {
                    state.gameHistory[gameIndex].score = null; // Clear score if invalid/skipped
                }
            }
            delete endGameModal.dataset.editGameId; // Clean up dataset
            endGameModal.classList.add("hidden");
            historyPage.classList.remove("hidden"); // Re-show history
            renderGameHistory(); // Re-render history list
            saveState();
            resetEndGameModal();
            return; // Exit after handling edit

        } else {
            // --- REGULAR GAME END LOGIC ---
            const courtId = endGameModal.dataset.courtId;
            const court = state.courts.find(c => c.id === courtId);
            if (!court) return;

            const team1Names = getPlayerNames(court.teams.team1);
            const team2Names = getPlayerNames(court.teams.team2);
            const newGame = {
                id: now,
                court: court.id,
                startTime: court.gameStartTime,
                endTime: now,
                duration: document.getElementById(`timer-${court.id}`).textContent,
                teams: { team1: team1Names, team2: team2Names },
                // Include score object only if scores were entered
                score: (score1 !== null && score2 !== null) ? { team1: score1, team2: score2, tiebreak1: tiebreak1, tiebreak2: tiebreak2 } : null,
                winner: winnerValue
            };
            state.gameHistory.push(newGame);

            const winningPlayers = winnerValue === "team1" ? court.teams.team1 : court.teams.team2;
            const losingPlayers = winnerValue === "team1" ? court.teams.team2 : court.teams.team1;
            const playersToRequeue = [...winningPlayers, ...losingPlayers].filter(p => !p.guest);

            state.availablePlayers.push(...playersToRequeue);
            court.becameAvailableAt = now;

            // Grace period check logic remains the same...
            const timeUntilNextAlert = alertScheduleTime > 0 ? alertScheduleTime - now : Infinity;
            if (timeUntilNextAlert > ANNOUNCEMENT_GRACE_PERIOD_MS) {
                // Find court ID *after* resetting current one (but before calling resetCourtAfterGame)
                const tempAvailableCourtId = findNextAvailableCourtIdAfterReset(courtId);
                const firstPlayerFullName = getFirstAvailablePlayerNameAfterRequeue(playersToRequeue); // Get name *after* adding players back
                const firstPlayerPronounceableName = getPronounceableName(firstPlayerFullName);
                if (firstPlayerPronounceableName) {
                    const openCourtMessage = tempAvailableCourtId
                        ? `Attention, ${firstPlayerPronounceableName}. Please come and select your match. Court ${formatCourtIdForTTS(tempAvailableCourtId)} is available.`
                        : `Attention, ${firstPlayerPronounceableName}. Please come and select your match. A court is now available.`;
                    playAlertSound(openCourtMessage);
                }
            } else {
                console.log("Skipped game end announcement due to grace period.");
            }

            resetCourtAfterGame(courtId); // This calls render() and saveState()
            resetEndGameModal();
        }
    }

    // --- NEW HELPER FUNCTIONS FOR GRACE PERIOD ---
    // Finds the next available court *assuming* the current court (courtIdToReset) is reset
    function findNextAvailableCourtIdAfterReset(courtIdToReset) {
        for (const id of COURT_HIERARCHY) {
            const court = state.courts.find(c => c.id === id);
            if (court && state.courtSettings.visibleCourts.includes(id)) {
                // Consider the court being reset as available, or check its actual status
                if (id === courtIdToReset || court.status === 'available') {
                    return id;
                }
            }
        }
        return null;
    }

    // Finds the first available player *assuming* the playersToRequeue have been added
    function getFirstAvailablePlayerNameAfterRequeue(playersToRequeue) {
        // Simulate adding players to the end for the check
        const simulatedAvailablePlayers = [...state.availablePlayers, ...playersToRequeue];
        const selectorPlayer = simulatedAvailablePlayers.find(p => !p.isPaused);
        return selectorPlayer ? selectorPlayer.name : null;
    }
    // --- END NEW HELPER FUNCTIONS ---

    // REPLACE this function
    function confirmSkipResult() {
        const courtId = endGameModal.dataset.courtId;
        const court = state.courts.find(c => c.id === courtId);
        if (!court) return;
        const now = Date.now(); // Get current time

        // ... (game history logging remains the same) ...
        const team1Names = getPlayerNames(court.teams.team1);
        const team2Names = getPlayerNames(court.teams.team2);
        const newGame = {
            id: now, // Use 'now'
            court: court.id,
            startTime: court.gameStartTime,
            endTime: now, // Use 'now'
            duration: document.getElementById(`timer-${court.id}`).textContent,
            teams: { team1: team1Names, team2: team2Names },
            score: null,
            winner: 'skipped'
        };
        state.gameHistory.push(newGame);
        // ... (rest of history logging) ...

        const playersToRequeue = [...court.players].filter(p => !p.guest);
        state.availablePlayers.push(...playersToRequeue);

        // --- GRACE PERIOD CHECK ---
        const timeUntilNextAlert = alertScheduleTime > 0 ? alertScheduleTime - now : Infinity;
        if (timeUntilNextAlert > ANNOUNCEMENT_GRACE_PERIOD_MS) {
            const nextAvailableCourtId = findNextAvailableCourtId(); // Find court ID *after* resetting current one
            const firstPlayerFullName = getFirstAvailablePlayerName(); // Get name *after* requeuing
            const firstPlayerPronounceableName = getPronounceableName(firstPlayerFullName);
            if (firstPlayerPronounceableName) {
                const openCourtMessage = nextAvailableCourtId
                    ? `Attention, ${firstPlayerPronounceableName}. Please come and select your match. Court ${formatCourtIdForTTS(nextAvailableCourtId)} is available.`
                    : `Attention, ${firstPlayerPronounceableName}. Please come and select your match. A court is now available.`;
                playAlertSound(openCourtMessage);
            }
        } else {
            console.log("Skipped skip result announcement due to grace period.");
        }
        // --- END GRACE PERIOD CHECK ---

        resetCourtAfterGame(court.id); // This calls render() and saveState()
        endGameModal.classList.add("hidden");
        // checkAndPlayAlert(false); // No longer needed here, resetCourtAfterGame handles it
    }

    // REPLACE this function
    function confirmSkipScores() {
        const courtId = endGameModal.dataset.courtId;
        const court = state.courts.find(c => c.id === courtId);
        const winnerValue = endGameModal.dataset.winner;
        if (!court || !winnerValue) return;
        const now = Date.now(); // Get current time

        // ... (game history logging remains the same) ...
        const team1Names = getPlayerNames(court.teams.team1);
        const team2Names = getPlayerNames(court.teams.team2);
        const newGame = {
            id: now, // Use 'now'
            court: court.id,
            startTime: court.gameStartTime,
            endTime: now, // Use 'now'
            duration: document.getElementById(`timer-${court.id}`).textContent,
            teams: { team1: team1Names, team2: team2Names },
            score: null,
            winner: winnerValue
        };
        state.gameHistory.push(newGame);
        // ... (rest of history logging) ...

        const winningPlayers = winnerValue === "team1" ? court.teams.team1 : court.teams.team2;
        const losingPlayers = winnerValue === "team1" ? court.teams.team2 : court.teams.team1;
        const playersToRequeue = [...winningPlayers, ...losingPlayers].filter(p => !p.guest);
        state.availablePlayers.push(...playersToRequeue);

        // --- GRACE PERIOD CHECK ---
        const timeUntilNextAlert = alertScheduleTime > 0 ? alertScheduleTime - now : Infinity;
        if (timeUntilNextAlert > ANNOUNCEMENT_GRACE_PERIOD_MS) {
            const nextAvailableCourtId = findNextAvailableCourtId(); // Find court ID *after* resetting current one
            const firstPlayerFullName = getFirstAvailablePlayerName(); // Get name *after* requeuing
            const firstPlayerPronounceableName = getPronounceableName(firstPlayerFullName);
            if (firstPlayerPronounceableName) {
                const openCourtMessage = nextAvailableCourtId
                    ? `Attention, ${firstPlayerPronounceableName}. Please come and select your match. Court ${formatCourtIdForTTS(nextAvailableCourtId)} is available.`
                    : `Attention, ${firstPlayerPronounceableName}. Please come and select your match. A court is now available.`;
                playAlertSound(openCourtMessage);
            }
        } else {
             console.log("Skipped skip scores announcement due to grace period.");
        }
        // --- END GRACE PERIOD CHECK ---

        resetCourtAfterGame(court.id); // This calls render() and saveState()
        endGameModal.classList.add("hidden");
        // checkAndPlayAlert(false); // No longer needed here, resetCourtAfterGame handles it
    }

    function checkAndShowTieBreak() {
        const matchMode = endGameModal.dataset.matchMode || '1set';

        // --- THIS IS THE FIX ---
        // Never show tie-break for Fast Play mode
        if (matchMode === 'fast') {
            tieBreakerArea.classList.add('hidden');
            winnerTiebreakInput.value = '';
            loserTiebreakInput.value = '';
            return;
        }
        // --- END OF FIX ---

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

        const matchMode = endGameModal.dataset.matchMode || '1set'; // Get match mode
        const fastPlayGames = parseInt(endGameModal.dataset.fastPlayGames, 10) || 4; // Get fast play games

        const winScoreVal = winningScoreInput.value;
        const loseScoreVal = losingScoreInput.value;
        const winScore = parseInt(winScoreVal, 10);
        const loseScore = parseInt(loseScoreVal, 10);
        let scoresValid = false;
        if (winScoreVal !== '' && loseScoreVal !== '') {
            if (matchMode === 'fast') {
                if (winScore === fastPlayGames && loseScore < fastPlayGames) {
                    scoresValid = true;
                }
            } else { // 1set or 3set logic
                if (winScore === 6 && loseScore >= 0 && loseScore <= 4) scoresValid = true;
                if (winScore === 7 && loseScore === 5) scoresValid = true;
                if (winScore === 7 && loseScore === 6) scoresValid = true;
            }
        }
        if (!scoresValid) {
            endGameConfirmBtn.disabled = true;
            endGameConfirmBtn.style.backgroundColor = 'var(--inactive-color)';
            endGameConfirmBtn.style.borderColor = 'var(--inactive-color)';
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
                tiebreakValid = (numTbWinner >= 7 && (numTbWinner - numTbLoser) >= 2) || (numTbLoser >= 7 && (numTbLoser - numTbWinner) >= 2);
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
        if (isAnnouncementPlaying && announcementQueue.length === 0) {
            isAnnouncementPlaying = false;
            return;
        }
        if (announcementQueue.length === 0) {
            return;
        }

        if (!isAnnouncementPlaying) {
            isAnnouncementPlaying = true;
            
            const firstItem = announcementQueue[0];
            
            if (!firstItem.soundFile) {
                announcementQueue.unshift({
                    msg1: null,
                    msg2: null,
                    soundFile: state.selectedAlertSound 
                });
            } 
        }

        const nextItem = announcementQueue.shift();
        
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
        const firstPlayerFullName = getFirstAvailablePlayerName(); // Get the full name first

        if (!conditionMet || !firstPlayerFullName) {
            resetAlertSchedule();
            return;
        }

        const firstPlayerPronounceableName = getPronounceableName(firstPlayerFullName); // Get pronounceable name
        const formattedCourtId = formatCourtIdForTTS(availableCourtId);
        // Use pronounceable name in the message
        let standardMessage = `Attention, ${firstPlayerPronounceableName}. Please come and select your match. Court ${formattedCourtId} is available.`;

        if (forceCheck) {
            playAlertSound(standardMessage);
            return;
        }

        if (alertState === 'initial_check') {
            const firstInterval = state.notificationControls.isMinimized ? TWO_MINUTES_MS : FIVE_MINUTES_MS;
            alertScheduleTime = now + firstInterval;
            alertState = '2_min_countdown';
            state.currentAlertCount = 1;
            return;
        }

        if (now >= alertScheduleTime) {
            if (state.currentAlertCount >= 2) {
            // Find the index of the first active (not paused) player. This is our target.
            const playerToMoveIndex = state.availablePlayers.findIndex(p => !p.isPaused);

            if (playerToMoveIndex !== -1 && state.availablePlayers.length > 1) {
                // Remove that specific player from their current position in the array.
                const [playerToMove] = state.availablePlayers.splice(playerToMoveIndex, 1);

                // --- THIS IS THE FIX ---
                // We want to insert them at position #9.
                // We calculate how many paused players are "in front of" our target insertion point.
                const targetPosition = 8;
                const pausedPlayersBeforeTarget = state.availablePlayers.slice(0, targetPosition).filter(p => p.isPaused).length;

                // The actual index in the array is the target position plus the number of paused players.
                const insertionIndex = Math.min(targetPosition + pausedPlayersBeforeTarget, state.availablePlayers.length);
                // --- END OF FIX ---

                state.availablePlayers.splice(insertionIndex, 0, playerToMove);

                enforceQueueLogic(); // Re-apply all queue rules after the move

                // Clear any stored suggestion since the selector has changed
                state.currentSuggestionOutcome = null;
                state.currentSuggestionType = null;
                if (state.activeSuggestion) {
                    clearSuggestionHighlights();
                }

                const newFirstPlayerFullName = getFirstAvailablePlayerName();
                // Use pronounceable names in the swap message
                const playerToMovePronounceable = getPronounceableName(playerToMove.name);
                const newFirstPlayerPronounceable = getPronounceableName(newFirstPlayerFullName);
                const swapMessage = `${playerToMovePronounceable} has been moved down. ${newFirstPlayerPronounceable}, please select your match on court ${formattedCourtId}.`;

                playAlertSound(swapMessage);
                render();
                saveState();
                resetAlertSchedule();
                return;
            }

            // --- END OF FIX ---
        }

            // --- THIS IS THE FIX ---
            // If this is the second alert (count is 1 before increment), add the "last call" message.
            if (state.currentAlertCount === 1) {
                standardMessage += " This is your last call.";
            }
            // --- END OF FIX ---

            playAlertSound(standardMessage);
            state.currentAlertCount++;

            const nextInterval = state.notificationControls.isMinimized ? TWO_MINUTES_MS : FIVE_MINUTES_MS;
            alertScheduleTime = now + nextInterval;
            alertState = '5_min_repeat';
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

// REPLACE this function
    function getAdminPasscode() {
        const today = new Date();
        const dayOfMonth = String(today.getDate()).padStart(2, '0');
        return `${ADMIN_PIN_BASE}${dayOfMonth}`;
    }

// REPLACE this function
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

        // If no session is active, prompt for the PIN using the original admin keypad
        showKeypad(null, { mode: 'admin', maxLength: 6, title: 'Enter Admin Passcode' });
    }

// REPLACE this function
    function checkAdminPasscode() {
        const enteredCode = keypadDisplay.dataset.hiddenValue;
        const expectedCode = getAdminPasscode();

        if (enteredCode === expectedCode) {
            hideKeypad();
            adminSessionActive = true;
            
            if (adminSessionTimer) clearTimeout(adminSessionTimer);
            adminSessionTimer = setTimeout(() => {
                adminSessionActive = false;
                adminSessionTimer = null;
                state.courts.forEach(c => c.isModeOverlayActive = false);
                render();
                playAlertSound(null, null, 'Alert7.mp3');
                requestAnimationFrame(ensureCourtSelectionAnimation); // <-- THIS IS THE FIX
            }, 60000); // 1 minute

            showAdminModal();

        } else {
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

    function checkUndoPasscode() {
        const enteredPin = keypadDisplay.dataset.hiddenValue || '';
        const actionIndex = parseInt(customKeypadModal.dataset.undoActionIndex);
        
        // Get the correct PIN (0308 + DD)
        const correctPin = getAdminPasscode();
        
        console.log('=== UNDO PIN CHECK ===');
        console.log('Entered PIN:', enteredPin);
        console.log('Correct PIN:', correctPin);
        console.log('Match:', enteredPin === correctPin);
        
        if (enteredPin === correctPin) {
            hideKeypad();
            executeUndoAction(actionIndex);
            delete customKeypadModal.dataset.undoActionIndex;
            delete customKeypadModal.dataset.undoActionDescription;
        } else {
            // Shake animation instead of alert
            const keypadContent = customKeypadModal.querySelector('.keypad-content');
            keypadContent.classList.add('shake');
            
            // Clear the display
            keypadDisplay.textContent = '';
            delete keypadDisplay.dataset.hiddenValue;
            keypadConfirmBtn.disabled = true;
            
            // Remove shake class after animation completes
            setTimeout(() => {
                keypadContent.classList.remove('shake');
            }, 820);
        }
    } 

// ADD THIS NEW FUNCTION
    function showCourtModeKeypad() {
        courtModeKeypadDisplay.textContent = '';
        delete courtModeKeypadDisplay.dataset.hiddenValue;
        courtModeKeypadConfirmBtn.disabled = true;
        courtModeKeypadModal.classList.remove('hidden');
    }

    // ADD THIS NEW FUNCTION
    function hideCourtModeKeypad() {
        courtModeKeypadModal.classList.add('hidden');
        courtModeAction = null; // Clear the stored action
    }

    // ADD THIS NEW FUNCTION
    function checkCourtModePasscode() {
        const enteredCode = courtModeKeypadDisplay.dataset.hiddenValue;
        const expectedCode = getAdminPasscode();

        if (enteredCode === expectedCode) {
            hideCourtModeKeypad();
            adminSessionActive = true;

            if (adminSessionTimer) clearTimeout(adminSessionTimer);
            adminSessionTimer = setTimeout(() => {
                adminSessionActive = false;
                adminSessionTimer = null;
                state.courts.forEach(c => c.isModeOverlayActive = false);
                render();
                playAlertSound(null, null, 'Alert7.mp3');
                requestAnimationFrame(ensureCourtSelectionAnimation); // <-- THIS IS THE FIX
            }, 60000); // 1 minute

            if (courtModeAction) {
                courtModeAction();
            }

        } else {
            const keypadContent = courtModeKeypadModal.querySelector('.keypad-content');
            keypadContent.classList.add('shake');
            setTimeout(() => {
                keypadContent.classList.remove('shake');
                courtModeKeypadDisplay.textContent = '';
                if (courtModeKeypadDisplay.dataset.hiddenValue) {
                    courtModeKeypadDisplay.dataset.hiddenValue = '';
                }
                courtModeKeypadConfirmBtn.disabled = true;
            }, 820);
        }
    }

    function runAutoMinimizeLogic() {
        if (!state.notificationControls.autoMinimize) {
            return; // Do nothing if the feature is turned off
        }

        // 1. Count only the courts available for social play (not reserved for league or turned off)
        const socialCourts = state.courts.filter(c =>
            state.courtSettings.visibleCourts.includes(c.id) && c.courtMode !== 'league'
        );
        const socialCourtCount = socialCourts.length;

        // 2. Get the total number of players currently at the club
        const totalPlayerCount = totalPlayersAtClub();

        // 3. Define the threshold based on the available social courts
        // This is the max capacity of social courts for doubles, plus a waiting queue of 4.
        const minimizeThreshold = (socialCourtCount * 4) + 4;


        // 4. Apply the new logic
        // Condition for quick turnaround (2-minute timer):
        if (totalPlayerCount >= minimizeThreshold) {
            if (!state.notificationControls.isMinimized) {
                state.notificationControls.isMinimized = true;
                // --- THIS IS THE FIX ---
                if (!state.matchSettings.autoMatchModes) {
                    playCustomTTS("Switching to 2-minute alerts.");
                }
                // --- END OF FIX ---
                updateNotificationIcons();
                saveState();
            }
        }
        // Condition for relaxed turnaround (5-minute timer):
        else {
            if (state.notificationControls.isMinimized) {
                state.notificationControls.isMinimized = false;
                if (!state.matchSettings.autoMatchModes) {
                    playCustomTTS("Switching to 5-minute alerts.");
                }
                updateNotificationIcons();
                saveState();
            }
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
        // Populate Committee Member List (Assuming this logic is correct from your file)
        committeeMemberList.innerHTML = '';
        const committeeMembers = MASTER_MEMBER_LIST.filter(m => m.committee);
        const noneOption = document.createElement('li');
        noneOption.innerHTML = `
            <label>
                <input type="radio" name="onDutyMember" value="None" ${state.onDuty === 'None' ? 'checked' : ''}>
                <div class="member-details">
                    <span class="member-name">None</span>
                    <span class="member-designation">No assigned member</span>
                </div>
            </label>
        `;
        committeeMemberList.appendChild(noneOption);
        committeeMembers.sort((a, b) => a.name.localeCompare(b.name)).forEach(member => {
            const li = document.createElement('li');
            li.className = 'committee-member';
            li.innerHTML = `
                <label>
                    <input type="radio" name="onDutyMember" value="${member.name}" ${state.onDuty === member.name ? 'checked' : ''}>
                    <div class="member-details">
                        <span class="member-name">${member.name}</span>
                        <span class="member-designation">${member.committee}</span>
                    </div>
                </label>
            `;
            committeeMemberList.appendChild(li);
        });
        committeeMemberList.querySelectorAll('input[name="onDutyMember"]').forEach(radio => {
            radio.removeEventListener('change', handleOnDutyChange); // Prevent duplicates
            radio.addEventListener('change', handleOnDutyChange);
        });

        // Populate Court Availability List
        courtAvailabilityList.innerHTML = '';

        // --- Render the global Toggles First ---
        const togglesLi = document.createElement('li');
        togglesLi.className = 'court-availability-item';
        // Removed inline styles, assuming CSS handles layout
        togglesLi.innerHTML = `
            <label style="flex-grow: 1;">Auto Court Modes</label>
            <label class="switch">
                <input type="checkbox" id="auto-assign-toggle" ${state.courtSettings.autoAssignModes ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
            <label style="flex-grow: 1; margin-left: 1rem;">Show Mode Selector</label>
            <label class="switch">
                <input type="checkbox" id="show-mode-selector-toggle" ${state.courtSettings.showGameModeSelector ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        `;
        courtAvailabilityList.appendChild(togglesLi);

        // --- Render Match Mode Settings ---
        const matchModeSettingsHtml = `
            <li class="court-availability-item" style="border-top: 1px dashed var(--border-color); padding-top: 1rem; margin-top: 0.5rem; flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 0.5rem;">
                     <label style="flex-grow: 1;">Auto Match Modes</label>
                     <label class="switch">
                         <input type="checkbox" id="auto-match-mode-toggle" ${state.matchSettings.autoMatchModes ? 'checked' : ''}>
                         <span class="slider"></span>
                     </label>
                </div>
                <div id="match-mode-selector-admin" class="match-mode-selector" style="${state.matchSettings.autoMatchModes ? 'display: none;' : ''}">
                    <label>
                        <input type="radio" name="match-mode" value="1set" ${state.matchSettings.matchMode === '1set' ? 'checked' : ''}> 1 Set
                    </label>
                    <label>
                        <input type="radio" name="match-mode" value="3set" ${state.matchSettings.matchMode === '3set' ? 'checked' : ''}> 3 Sets
                    </label>
                    <label>
                        <input type="radio" name="match-mode" value="fast" ${state.matchSettings.matchMode === 'fast' ? 'checked' : ''}> Fast Play
                    </label>
                </div>
                <div class="fast-play-games-selector" style="${state.matchSettings.matchMode !== 'fast' || state.matchSettings.autoMatchModes ? 'display: none;' : ''}">
                    <label>Fast Play Games (First to):</label>
                    <div class="radio-group">
                        <label> <input type="radio" name="fast-play-games" value="3" ${state.matchSettings.fastPlayGames === 3 ? 'checked' : ''}> 3 </label>
                        <label> <input type="radio" name="fast-play-games" value="4" ${state.matchSettings.fastPlayGames === 4 ? 'checked' : ''}> 4 </label>
                        <label> <input type="radio" name="fast-play-games" value="5" ${state.matchSettings.fastPlayGames === 5 ? 'checked' : ''}> 5 </label>
                    </div>
                </div>
            </li>
        `;
        courtAvailabilityList.insertAdjacentHTML('beforeend', matchModeSettingsHtml);

        // --- Court List Rendering (MODIFIED for click delegation) ---
            state.courts.forEach(court => {
                const li = document.createElement('li');
                li.className = 'court-availability-item';
                // li.style.cursor = 'pointer'; // Keep removed
                li.dataset.courtId = court.id;

                const isVisible = state.courtSettings.visibleCourts.includes(court.id);
                const light = state.lightSettings.courts ? state.lightSettings.courts[court.id] : null;
                const isLightManaged = light && light.isManaged;
                const isLightActive = isLightManaged && light.isActive;
                const lightIconClass = isLightActive ? 'mdi-lightbulb-on' : 'mdi-lightbulb-outline';
                const lightDisabledAttr = isLightManaged ? '' : 'disabled';

                // --- REVISED li.innerHTML ---
                li.innerHTML = `
                    <span class="court-label-button" style="cursor: pointer; font-weight: 500; margin-right: auto;">${court.id}</span> <button class="light-toggle-btn" data-court-id="${court.id}" title="Toggle Court ${court.id} Lights" ${lightDisabledAttr} style="flex-shrink: 0;"> <i class="mdi ${lightIconClass}"></i>
                    </button>
                    <label class="switch" style="flex-shrink: 0; width: 50px"> <input type="checkbox" data-court-id="${court.id}" ${isVisible ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                `;
                // --- END REVISED li.innerHTML ---
                courtAvailabilityList.appendChild(li);
            });

        // --- Event Listener Delegation (MODIFIED) ---
        courtAvailabilityList.removeEventListener('click', handleAdminCourtListClick); // Remove previous listener if exists
        courtAvailabilityList.addEventListener('click', handleAdminCourtListClick);   // Add new delegated listener

        // --- Attach Listeners for Toggles & Match Mode ---
        document.getElementById('auto-assign-toggle')?.addEventListener('change', (e) => {
            state.courtSettings.autoAssignModes = e.target.checked;
            saveState();
            autoAssignCourtModes(); // Run the logic immediately
            render(); // Re-render to show/hide court modes if needed
        });
        document.getElementById('show-mode-selector-toggle')?.addEventListener('change', (e) => {
            state.courtSettings.showGameModeSelector = e.target.checked;
            saveState();
            render(); // Re-render to show/hide the main selector
        });
         document.getElementById('auto-match-mode-toggle')?.addEventListener('change', (e) => {
             state.matchSettings.autoMatchModes = e.target.checked;
             // Show/hide manual selectors
             document.getElementById('match-mode-selector-admin').style.display = e.target.checked ? 'none' : '';
             document.querySelector('.fast-play-games-selector').style.display = (e.target.checked || state.matchSettings.matchMode !== 'fast') ? 'none' : '';
             saveState();
             autoAssignMatchMode(); // Run the logic immediately
             render(); // Re-render summary card
        });

        document.querySelectorAll('input[name="match-mode"]').forEach(radio => radio.addEventListener('change', handleMatchModeChange));
        document.querySelectorAll('input[name="fast-play-games"]').forEach(radio => radio.addEventListener('change', handleFastPlayGamesChange));

        updateLightIcon(); // Update admin header light icon
        adminSettingsModal.classList.remove('hidden');
    }

    // --- NEW Delegated Click Handler for Admin Court List ---
    function handleAdminCourtListClick(e) {
        const lightButton = e.target.closest('.light-toggle-btn');
        const visibilityToggleInput = e.target.closest('.switch input[type="checkbox"]'); // Target the input directly
        const courtLabelButton = e.target.closest('.court-label-button'); // Target the new label span

        if (lightButton) {
            // Clicked the light icon button
            handleLightToggleChange(e);
        } else if (visibilityToggleInput) {
            // Clicked the visibility toggle switch's input
            handleCourtVisibilityChange({ target: visibilityToggleInput }); // Pass the input as the target
        } else if (courtLabelButton) {
            // Clicked the court label (A, B, C...)
            const courtItem = courtLabelButton.closest('.court-availability-item[data-court-id]');
            if (courtItem) {
                const courtId = courtItem.dataset.courtId;
                showLightSettingsCourtModal(courtId);
            }
        }
        // Clicks elsewhere within the li (like empty space) are ignored
    }

// --- NEW: Light Settings Modal Functions (Consolidated) ---

    function showLightSettingsCourtModal(courtId) {
        // Ensure lightSettings structure exists
        if (!state.lightSettings) {
             console.error("state.lightSettings is missing!");
             return; // Or initialize it here
        }
        const court = state.lightSettings.courts ? state.lightSettings.courts[courtId] : null;
        if (!court) {
             console.error(`Court settings for ${courtId} not found!`);
             return;
        }

        const modal = document.getElementById('light-settings-court-modal');
        modal.dataset.editingCourtId = courtId;

        document.getElementById('light-settings-court-title').textContent = `Edit Light Settings for Court ${courtId}`;

        // ++ POPULATE GLOBAL FIELDS ++
        document.getElementById('light-setting-base-url').value = state.lightSettings.shellyBaseUrl || '';
        document.getElementById('light-setting-auth-key').value = state.lightSettings.shellyAuthKey || '';
        // ++ END POPULATE GLOBAL FIELDS ++

        // == POPULATE COURT-SPECIFIC FIELDS ==
        document.getElementById('light-setting-label').value = court.label || `Court ${courtId} Lights`;
        document.getElementById('light-setting-cloud-id').value = court.shellyCloudId || '';
        document.getElementById('light-setting-local-ip').value = court.shellyDeviceId || '';
        // Default 'isManaged' to true if it's undefined in the state
        document.getElementById('light-setting-managed').checked = court.isManaged !== false;

        adminSettingsModal.classList.add('hidden');
        modal.classList.remove('hidden');

        // Wire up global keyboard for ALL inputs inside this modal
        wireGlobalKeypadToInput(document.getElementById('light-setting-base-url'));
        wireGlobalKeypadToInput(document.getElementById('light-setting-auth-key'));
        wireGlobalKeypadToInput(document.getElementById('light-setting-label'));
        wireGlobalKeypadToInput(document.getElementById('light-setting-cloud-id'));
        wireGlobalKeypadToInput(document.getElementById('light-setting-local-ip'));
    }

    function saveLightSettingsCourtModal() {
        const modal = document.getElementById('light-settings-court-modal');
        const courtId = modal.dataset.editingCourtId;
        // Ensure lightSettings and the specific court exist before saving
        if (!courtId || !state.lightSettings || !state.lightSettings.courts || !state.lightSettings.courts[courtId]) {
             console.error(`Cannot save: Court settings for ${courtId} not found!`);
             return;
        }

        // ++ SAVE GLOBAL SETTINGS ++
        state.lightSettings.shellyBaseUrl = document.getElementById('light-setting-base-url').value.trim();
        state.lightSettings.shellyAuthKey = document.getElementById('light-setting-auth-key').value.trim();
        // ++ END SAVE GLOBAL SETTINGS ++

        // == SAVE COURT-SPECIFIC SETTINGS ==
        const court = state.lightSettings.courts[courtId]; // Get the specific court object
        court.label = document.getElementById('light-setting-label').value.trim() || `Court ${courtId} Lights`;
        court.shellyCloudId = document.getElementById('light-setting-cloud-id').value.trim();
        court.shellyDeviceId = document.getElementById('light-setting-local-ip').value.trim();
        court.isManaged = document.getElementById('light-setting-managed').checked;

        if (!court.isManaged) {
            court.shellyCloudId = '';
            court.shellyDeviceId = '';
            court.isActive = false; // Turn off if management is disabled
        }
        // == END SAVE COURT-SPECIFIC SETTINGS ==

        saveState(); // Save the entire state object
        modal.classList.add('hidden');
        showAdminModal(); // Re-render and show the admin modal
    }
    // --- NEW: Click and Hold Paste Functionality ---
    function setupLongPressPaste() {
        const pasteTargets = document.querySelectorAll('.long-press-paste');
        let pressTimer = null;
        let isLongPress = false;

        pasteTargets.forEach(input => {
            // Remove previous listeners to prevent duplicates if called multiple times
            input.removeEventListener('pointerdown', handlePointerDown);
            input.removeEventListener('pointerup', handlePointerUp);
            input.removeEventListener('pointerleave', handlePointerLeave);
            input.removeEventListener('contextmenu', handleContextMenu);

            // Add new listeners
            input.addEventListener('pointerdown', handlePointerDown);
            input.addEventListener('pointerup', handlePointerUp);
            input.addEventListener('pointerleave', handlePointerLeave); // Handle finger sliding off
            input.addEventListener('contextmenu', handleContextMenu); // Prevent default right-click menu
        });

        function handlePointerDown(e) {
            const input = e.target;
            isLongPress = false; // Reset flag

            // --- ADD THIS LINE ---
            // If a short click timer is running for this input, cancel it because a long press is starting.
            if (input._clickTimeoutId) {
                clearTimeout(input._clickTimeoutId);
                input._clickTimeoutId = null;
            }
            // --- END ADD ---


            // Start timer
            pressTimer = setTimeout(async () => {
                isLongPress = true; // Mark as long press
                console.log('Long press detected on:', input.id);
                input.style.backgroundColor = '#a8d5ff'; // Highlight during paste attempt

                try {
                    // Check for clipboard permission first
                    const permission = await navigator.permissions.query({ name: 'clipboard-read' });
                    if (permission.state === 'granted' || permission.state === 'prompt') {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                            input.value = text;
                            // Manually trigger 'input' event if needed by other logic
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            console.log('Pasted successfully!');
                            playCustomTTS("Pasted from clipboard."); // Optional feedback
                        } else {
                            console.log('Clipboard is empty.');
                            playCustomTTS("Clipboard is empty.");
                        }
                    } else {
                         console.error('Clipboard read permission denied.');
                         playCustomTTS("Could not paste. Please allow clipboard permissions.");
                         alert('Clipboard access denied. Please allow clipboard permissions in your browser settings for this site.');
                    }
                } catch (err) {
                    console.error('Failed to read clipboard contents:', err);
                    playCustomTTS("Could not paste.");
                    alert('Failed to paste from clipboard. Error: ' + err.message);
                } finally {
                    // Reset background color slightly later to keep visual feedback
                    setTimeout(() => {
                        input.style.backgroundColor = '';
                    }, 300);
                    pressTimer = null; // Clear timer ID after execution
                }
            }, 750); // 750ms for long press
        }

        function handlePointerUp(e) {
            if (pressTimer) { // Only clear if timer is still running (wasn't a completed long press)
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            // Reset background immediately ONLY if it wasn't a completed long press action
            if (!isLongPress) {
                 e.target.style.backgroundColor = '';
            }
            // If it *was* a long press, the background reset is handled in the timer's finally block
        }

        function handlePointerLeave(e) {
             // If pointer leaves element during press, cancel the timer
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
                isLongPress = false;
                e.target.style.backgroundColor = ''; // Reset background
            }
        }

        function handleContextMenu(e) {
            // Prevent the default right-click menu, especially on desktop
            e.preventDefault();
        }
    } 


    function showSuggestionSettingsModal() {
        // Set initial values from state
        femaleRatioSlider.value = state.suggestionSettings.femaleRatioPercent;
        updateFemaleRatioDisplay();
        maleRatioSlider.value = state.suggestionSettings.maleRatioPercent;
        updateMaleRatioDisplay();
        leastPlaytimeToggle.checked = state.suggestionSettings.prioritizeLeastPlaytime;
        powerScoreOnlyToggle.checked = state.suggestionSettings.powerScoreOnly;
        // --- ADD THESE LINES ---
        topPlayerSlider.value = state.suggestionSettings.topPlayerPercent;
        updateTopPlayerDisplay();
        frequentOpponentSlider.value = state.suggestionSettings.frequentOpponentPercent;
        updateFrequentOpponentDisplay();
        weakPlayerSlider.value = state.suggestionSettings.weakPlayerPercent;
        updateWeakPlayerDisplay();
        // --- END ADD ---


        // Apply initial disabled/fade state based on powerScoreOnly
        toggleSuggestionOptionsAvailability(state.suggestionSettings.powerScoreOnly);

        adminSettingsModal.classList.add('hidden');
        suggestionSettingsModal.classList.remove('hidden');
    }

    function updateFemaleRatioDisplay() {
        const value = femaleRatioSlider.value;
        femaleRatioDisplay.textContent = `${value}% All Female`;
    }

    function updateMaleRatioDisplay() {
        const value = maleRatioSlider.value;
        maleRatioDisplay.textContent = `${value}% All Male`;
    }

    function handleFemaleRatioChange() {
        state.suggestionSettings.femaleRatioPercent = parseInt(femaleRatioSlider.value, 10);
        updateFemaleRatioDisplay();
        saveState();
    }

    function handleMaleRatioChange() {
        state.suggestionSettings.maleRatioPercent = parseInt(maleRatioSlider.value, 10);
        updateMaleRatioDisplay();
        saveState();
    }

    function handleLeastPlaytimeToggleChange() {
        state.suggestionSettings.prioritizeLeastPlaytime = leastPlaytimeToggle.checked;
        saveState();
    }

    // Function to visually disable/enable other options
    function toggleSuggestionOptionsAvailability(isDisabled) {
        // Toggle the 'disabled' class on container elements
        leastPlaytimeContainer.classList.toggle('disabled', isDisabled);
        femaleRatioContainer.classList.toggle('disabled', isDisabled);
        maleRatioContainer.classList.toggle('disabled', isDisabled);

        // Explicitly enable/disable controls within the containers
        leastPlaytimeToggle.disabled = isDisabled;
        femaleRatioSlider.disabled = isDisabled;
        maleRatioSlider.disabled = isDisabled;
    // --- ADD THESE LINES ---
        topPlayerContainer.classList.toggle('disabled', isDisabled);
        frequentOpponentContainer.classList.toggle('disabled', isDisabled);
        weakPlayerContainer.classList.toggle('disabled', isDisabled);

        topPlayerSlider.disabled = isDisabled;
        frequentOpponentSlider.disabled = isDisabled;
        weakPlayerSlider.disabled = isDisabled;
        // --- END ADD ---
    }

    function handlePowerScoreOnlyToggleChange() {
        const isEnabled = powerScoreOnlyToggle.checked;
        state.suggestionSettings.powerScoreOnly = isEnabled;

        // Call the function to update UI based on the new state
        toggleSuggestionOptionsAvailability(isEnabled);

        saveState();
    }

    function updateTopPlayerDisplay() {
        const value = topPlayerSlider.value;
        topPlayerDisplay.textContent = `${value}% Top Player H2H`;
    }
    function handleTopPlayerChange() {
        state.suggestionSettings.topPlayerPercent = parseInt(topPlayerSlider.value, 10);
        updateTopPlayerDisplay();
        saveState();
    }

    function updateFrequentOpponentDisplay() {
        const value = frequentOpponentSlider.value;
        frequentOpponentDisplay.textContent = `${value}% Frequent Opponent`;
    }
    function handleFrequentOpponentChange() {
        state.suggestionSettings.frequentOpponentPercent = parseInt(frequentOpponentSlider.value, 10);
        updateFrequentOpponentDisplay();
        saveState();
    }

    function updateWeakPlayerDisplay() {
        const value = weakPlayerSlider.value;
        weakPlayerDisplay.textContent = `${value}% Weak Player Group`;
    }
    function handleWeakPlayerChange() {
        state.suggestionSettings.weakPlayerPercent = parseInt(weakPlayerSlider.value, 10);
        updateWeakPlayerDisplay();
        saveState();
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
        updateNotificationIcons();
        
        // Set the state of the new toggle switch
        const autoMinimizeToggle = document.getElementById('auto-minimize-toggle');
        if (autoMinimizeToggle) {
            autoMinimizeToggle.checked = state.notificationControls.autoMinimize;
        }

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
        state.currentAlertCount = 0; // <-- ADD THIS NEW LINE
    }


    /* =================================
        Screensaver FUNCTIONS (NEW)
    ================================= */

    function resetAlertSchedule() {
        alertScheduleTime = 0;
        alertState = 'initial_check';
        state.currentAlertCount = 0; // <-- ADD THIS NEW LINE
    }

    // --- NEW: Screensaver Functions ---

    function startScreensaver() {
        // Don't start if already active or on mobile
        if (!screensaverOverlay.classList.contains('hidden') || window.innerWidth <= 900) {
             return;
        }
        console.log("Starting screensaver...");
        screensaverOverlay.classList.remove('hidden'); // Fade in overlay container
        isShowingScreensaverEvent = true; // Reset state: Start by showing an event
        screensaverCurrentIndex = 0; // Reset index to the first event

        // Clear any previous interval to prevent duplicates
        if (screensaverCycleInterval) {
            clearInterval(screensaverCycleInterval);
            screensaverCycleInterval = null; // Ensure it's cleared
        }

        // Function to display the next item (event or app view)
                // SCREENSAVER CYCLING LOGIC:
        // - Event View: Shows event details with overlay background
        // - Main App View: Makes overlay transparent so you can see courts/players/main app
        // - Cycles every 15 seconds between these two states
        // - This allows monitoring courts while still promoting events
        
    const displayNextScreensaverItem = () => {
        const activeEvents = state.events.filter(event => event.isActive);

        // --- FADE OUT ---
        screensaverContent.classList.remove('visible');
        screensaverOverlay.classList.remove('show-main-app');

        // --- Remove existing overlay button ---
        const existingOverlayBtn = document.getElementById('screensaver-interested-btn-overlay');
        if (existingOverlayBtn) {
            existingOverlayBtn.remove();
        }

        setTimeout(() => {
            if (isShowingScreensaverEvent && activeEvents.length > 0) {
                // --- SHOW EVENT ---
                const eventIndexToShow = screensaverCurrentIndex % activeEvents.length;
                const event = activeEvents[eventIndexToShow];

                // --- Format Date (Removed weekday) ---
                const eventDateFormatted = event.eventDate
                    ? new Date(event.eventDate + 'T00:00:00').toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) // Removed weekday:'long'
                    : 'Date TBC';

                // --- Format Time (Added AM/PM) ---
                let eventTimeFormatted = 'Time TBC';
                if (event.startTime) {
                    try {
                        const [hours, minutes] = event.startTime.split(':');
                        const hourInt = parseInt(hours, 10);
                        const minuteInt = parseInt(minutes, 10);
                        const ampm = hourInt >= 12 ? 'PM' : 'AM';
                        const hour12 = hourInt % 12 || 12; // Convert 0 hour to 12
                        eventTimeFormatted = `${hour12}:${String(minuteInt).padStart(2, '0')} ${ampm}`;
                    } catch (e) {
                        console.error("Error formatting event time:", e);
                        eventTimeFormatted = event.startTime; // Fallback to original if parsing fails
                    }
                }
                // --- END Time Formatting ---

                const rsvpDateFormatted = event.rsvpDate
                    ? new Date(event.rsvpDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'N/A';

                // Build images HTML
                let imagesHTML = '';
                if (event.image1Filename && event.image1Filename !== 'None') {
                    imagesHTML += `<img src="source/screensaver/${event.image1Filename}" alt="Event Image 1" class="screensaver-event-image">`;
                }
                if (event.image2Filename && event.image2Filename !== 'None') {
                    imagesHTML += `<img src="source/screensaver/${event.image2Filename}" alt="Event Image 2" class="screensaver-event-image">`;
                }

                // Build cost display
                let costHTML = '';
                if (event.costAdult > 0 || event.costChild > 0) {
                    const adultCost = event.costAdult > 0 ? `Adult: R${event.costAdult}` : '';
                    const childCost = event.costChild > 0 ? `Child: R${event.costChild}` : '';
                    const separator = adultCost && childCost ? ' | ' : '';
                    costHTML = `<p class="screensaver-cost">${adultCost}${separator}${childCost}</p>`;

                    if (event.participationDiscount > 0) {
                            costHTML += `<p class="screensaver-discount">Club Champ Participants get R${event.participationDiscount} off</p>`;
                    }
                }

                // Build RSVP section
                let rsvpHTML = '';
                if (rsvpDateFormatted && rsvpDateFormatted !== 'N/A') {
                    let rsvpText = `RSVP BY ${rsvpDateFormatted.toUpperCase()}`;
                    if (event.volunteersNeeded) {
                        rsvpText += ' - VOLUNTEER COOKS NEEDED';
                    }
                    rsvpHTML = `<p class="screensaver-rsvp"><strong>${rsvpText}</strong></p>`;
                } else if (event.volunteersNeeded) {
                    rsvpHTML = `<p class="screensaver-rsvp"><strong>VOLUNTEER COOKS NEEDED</strong></p>`;
                }

                // Build contact info HTML
                let contactHTML = '';
                if (event.phone || event.email || event.website) {
                        contactHTML = '<div class="screensaver-contact-bar">';
                        if (event.phone) {
                            contactHTML += `<div class="screensaver-contact-item"><span class="contact-icon">📞</span><span class="contact-text">${event.phone}</span></div>`;
                        }
                        if (event.email) {
                            contactHTML += `<div class="screensaver-contact-item"><span class="contact-icon">✉</span><span class="contact-text">${event.email}</span></div>`;
                        }
                        if (event.website) {
                            contactHTML += `<div class="screensaver-contact-item"><span class="contact-icon">🌐</span><span class="contact-text">${event.website}</span></div>`;
                        }
                        contactHTML += '</div>';
                }

                // Build open to text
                let openToText = event.openTo || 'All Members';
                if (event.isOpenToGuests) {
                    openToText += ' and Invited Guests';
                }
                const openBannerHTML = `<div class="screensaver-open-banner">EVENT OPEN TO ${openToText.toUpperCase()}</div>`;

                // --- Build the HTML content for the event (RSVP Moved) ---
                screensaverContent.innerHTML = `
                    <div class="screensaver-event-layout">
                        <div class="screensaver-left-column">
                            ${imagesHTML || '<div class="screensaver-placeholder-image"></div>'}
                        </div>

                        <div class="screensaver-right-column">
                            <div class="screensaver-right-column-main-content">
                                <img src="source/eldorainge-tennis-logo.png" alt="Eldoraigne Tennis" class="screensaver-club-logo">

                                <h1 class="screensaver-event-heading">${event.heading || 'Club Event'}</h1>

                                <div class="screensaver-datetime-row">
                                    <div class="screensaver-date">
                                        <div class="date-value">${eventDateFormatted}</div>
                                    </div>
                                    ${eventTimeFormatted && eventTimeFormatted !== 'Time TBC' ? `
                                    <div class="screensaver-trophy"><img src="source/tennis-ball.png" alt="Tennis Ball"></div>
                                    <div class="screensaver-time">
                                        <div class="time-value">${eventTimeFormatted} TO CLOSING</div>
                                    </div>
                                    ` : ''}
                                </div>

                                <div class="screensaver-body-text">
                                    ${event.body1 ? `<p>${event.body1}</p>` : ''}
                                    ${event.body2 ? `<p>${event.body2}</p>` : ''}
                                </div>

                                ${costHTML}

                                <button id="screensaver-interested-btn" data-event-id="${event.id}">I am interested</button>
                            </div>

                            ${rsvpHTML}
                            ${contactHTML}
                            ${openBannerHTML}
                        </div>
                    </div>
                `;

                // Clear any background images
                screensaverContent.style.backgroundImage = 'none';

                screensaverContent.style.display = 'flex';
                screensaverContent.classList.add('visible');

                isShowingScreensaverEvent = false;

            } else {
                // --- SHOW MAIN APP VIEW (Logic Unchanged) ---
                screensaverContent.style.display = 'none';
                screensaverContent.classList.remove('visible');
                screensaverOverlay.classList.add('show-main-app');
                isShowingScreensaverEvent = true;
                if (activeEvents.length > 0) {
                    screensaverCurrentIndex++;
                }
            }
        }, 1000);
    };

        displayNextScreensaverItem(); // Display the first item immediately
        screensaverCycleInterval = setInterval(displayNextScreensaverItem, SCREENSAVER_INTERVAL_MS); // Cycle every 15 seconds
    }

    function stopScreensaver() {
        if (screensaverOverlay.classList.contains('hidden')) {
            return; // Already stopped
        }
        console.log("Stopping screensaver...");
        screensaverOverlay.classList.add('hidden'); // Fade out overlay
        screensaverContent.classList.remove('visible'); // Hide content immediately
        screensaverOverlay.classList.remove('show-main-app'); // Reset view class
        screensaverContent.style.display = 'flex'; // Reset display for next time
        screensaverContent.style.backgroundImage = 'none'; // Clear background images


        if (screensaverCycleInterval) {
            clearInterval(screensaverCycleInterval);
            screensaverCycleInterval = null;
        }
        resetInactivityTimer(); // Start monitoring inactivity again
    }
    
    // --- NEW FUNCTION: Add player to event interest list ---
    function addInterestedPlayer(playerName, eventId) {
        if (!playerName || !eventId) return;

        // Find the event in the state
        const event = state.events.find(ev => ev.id == eventId); // Use == for potential type coercion if IDs are numbers/strings

        if (event) {
            // Initialize interestedPlayers array if it doesn't exist
            event.interestedPlayers = event.interestedPlayers || [];

            // Add player name if not already in the list
            if (!event.interestedPlayers.includes(playerName)) {
                event.interestedPlayers.push(playerName);
                saveState();
                console.log(`${playerName} added to interest list for event ID ${eventId}`);
                // Optional: Brief confirmation feedback
                // playCustomTTS(`${getPronounceableName(playerName)} added to interest list.`);
            } else {
                console.log(`${playerName} is already on the interest list for event ID ${eventId}`);
                // Optional: Feedback if already added
                // playCustomTTS(`${getPronounceableName(playerName)} is already interested.`);
            }
        } else {
            console.error("Could not find event with ID:", eventId);
        }

        // Close the check-in modal and clean up context/styling
        checkInModal.classList.add("hidden");
        checkInModal.style.zIndex = ''; // Reset z-index
        delete checkInModal.dataset.screensaverEventId; // Remove context
    }
    // --- END NEW FUNCTION ---

    // --- NEW FUNCTION: Show Event List Modal ---
    // --- NEW FUNCTION: Delete Event with Confirmation ---
    function deleteEvent(eventId) {
        const event = state.events.find(ev => ev.id == eventId);
        if (!event) return;

        const eventName = event.heading || 'this event';
        const confirmDelete = confirm(`Are you sure you want to delete "${eventName}"?\n\nThis action cannot be undone.`);
        
        if (confirmDelete) {
            // Remove the event from state
            state.events = state.events.filter(ev => ev.id != eventId);
            saveState();
            
            // Refresh the event list display
            showEventListModal();
            
            // If screensaver is running and this was an active event, refresh it
            const screensaverOverlay = document.getElementById('screensaver-overlay');
            if (!screensaverOverlay.classList.contains('hidden')) {
                stopScreensaver();
                resetInactivityTimer();
            }
        }
    }
    // --- END NEW FUNCTION ---

    function showEventListModal() {
        // Find or create the necessary elements if not already done
        const eventList = document.getElementById('event-list');
        const eventListModal = document.getElementById('event-list-modal');
        if (!eventList || !eventListModal) return; // Basic safety check

        eventList.innerHTML = ''; // Clear previous list

        if (state.events.length === 0) {
            eventList.innerHTML = '<li style="text-align: center; color: var(--neutral-color); padding: 1rem;">No events created yet.</li>';
        } else {
            // Sort events, maybe newest first? (Optional)
            const sortedEvents = [...state.events].sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || '') || (b.id - a.id) );

            sortedEvents.forEach(event => {
                const li = document.createElement('li');
                li.className = 'event-list-item';
                li.dataset.eventId = event.id; // Store event ID

                const eventDateStr = event.eventDate ? new Date(event.eventDate + 'T00:00:00').toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date TBC';

                li.innerHTML = `
                    <div class="event-summary">
                        <span class="event-heading">${event.heading || 'Untitled Event'}</span>
                        <span class="event-date">${eventDateStr}</span>
                    </div>
                    <div class="event-controls">
                        <button class="action-btn edit-event-btn" data-action="edit">Edit</button>
                        <span class="action-icon remove delete-event-btn" data-action="delete" title="Delete Event">&times;</span>
                        <label class="switch" title="Show in Screensaver">
                            <input type="checkbox" class="event-active-toggle" ${event.isActive ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                `;
                eventList.appendChild(li);
            });
        }

        adminSettingsModal.classList.add('hidden'); // Hide admin settings
        eventListModal.classList.remove('hidden'); // Show event list
    }
    // --- END NEW FUNCTION ---

    // --- NEW FUNCTION: Load available screensaver images ---
    async function loadScreensaverImages() {
        try {
            // Try to load images.json file first (recommended method)
            const response = await fetch('source/screensaver/images.json');
            if (response.ok) {
                const data = await response.json();
                if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                    console.log('Loaded images from images.json:', data.images);
                    return ['None', ...data.images];
                }
            }
        } catch (error) {
            console.log('images.json not found, trying directory listing...');
        }
        
        // Fallback: Try directory listing (may not work on all servers)
        try {
            const response = await fetch('source/screensaver/');
            if (response.ok) {
                const text = await response.text();
                const imageRegex = /<a href="([^"]+\.(?:jpg|jpeg|png|gif|webp))"/gi;
                const matches = [...text.matchAll(imageRegex)];
                const images = matches.map(match => match[1]);
                
                if (images.length > 0) {
                    console.log('Loaded images from directory listing:', images);
                    return ['None', ...images];
                }
            }
        } catch (error) {
            console.log('Directory listing not available');
        }
        
        // Final fallback: Return default list
        console.warn('Using default image list - please create source/screensaver/images.json');
        return ['None', 'Trophy.jpg', 'Potjiekos.jpg', 'Tennis.jpg', 'Braai.jpg', 'Rugby.jpg', 'F1.jpg', 'ClubChamps.jpg'];
    }

    // --- NEW FUNCTION: Populate image dropdowns ---
    async function populateImageDropdowns() {
        const images = await loadScreensaverImages();
        
        const dropdown1 = document.getElementById('event-image1');
        const dropdown2 = document.getElementById('event-image2');
        
        if (dropdown1 && dropdown2) {
            // Save current selections
            const currentValue1 = dropdown1.value;
            const currentValue2 = dropdown2.value;
            
            // Clear and repopulate
            dropdown1.innerHTML = '';
            dropdown2.innerHTML = '';
            
            images.forEach(img => {
                const option1 = document.createElement('option');
                option1.value = img;
                option1.textContent = img === 'None' ? 'None' : img.replace(/\.[^.]+$/, ''); // Remove extension for display
                dropdown1.appendChild(option1);
                
                const option2 = document.createElement('option');
                option2.value = img;
                option2.textContent = img === 'None' ? 'None' : img.replace(/\.[^.]+$/, '');
                dropdown2.appendChild(option2);
            });
            
            // Restore selections if they still exist
            if ([...dropdown1.options].some(opt => opt.value === currentValue1)) {
                dropdown1.value = currentValue1;
            }
            if ([...dropdown2.options].some(opt => opt.value === currentValue2)) {
                dropdown2.value = currentValue2;
            }
        }
    }
    // --- END NEW FUNCTIONS ---

    // --- NEW/MODIFIED FUNCTION: Show Event Create/Edit Modal ---
    async function showEventCreateEditModal(eventId = null) {
        const modal = document.getElementById('event-create-edit-modal');
        
        // Populate image dropdowns with available files
        await populateImageDropdowns();
        const title = document.getElementById('event-modal-title');
        const form = modal.querySelector('.event-form-grid');
        const interestedSection = document.getElementById('interested-players-section');
        const interestedList = document.getElementById('interested-players-list');

        // Reset form fields
        form.querySelectorAll('input, select').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = false;
            } else if (el.type === 'range') {
                el.value = el.min || 0; // Reset sliders to min
            } else {
                el.value = '';
            }
        });
        // Reset specific defaults
        document.getElementById('event-type').value = 'Social';
        document.querySelector('input[name="event-open-to"][value="All Members"]').checked = true;
        document.getElementById('event-image1').value = 'None';
        document.getElementById('event-image2').value = 'None';
         // Clear interested list
        interestedList.innerHTML = '';
        interestedSection.style.display = 'none';


        if (eventId) {
            // --- EDIT MODE ---
            const event = state.events.find(ev => ev.id == eventId);
            if (!event) {
                console.error("Event not found for editing:", eventId);
                // Optionally show event list modal again or an error
                showEventListModal();
                return;
            }

            modal.dataset.editingEventId = eventId; // Store ID for saving
            title.textContent = 'Edit Event';

            // Populate form fields
            document.getElementById('event-type').value = event.eventType || 'Social';
            document.getElementById('event-heading').value = event.heading || '';
            document.getElementById('event-date').value = event.eventDate || '';
            document.getElementById('event-rsvp-date').value = event.rsvpDate || '';
            document.getElementById('event-start-time').value = event.startTime || '';
            document.getElementById('event-body1').value = event.body1 || '';
            document.getElementById('event-body2').value = event.body2 || '';
            document.getElementById('event-cost-adult').value = event.costAdult || 0;
            document.getElementById('event-cost-child').value = event.costChild || 0;
            document.getElementById('event-participation-discount').value = event.participationDiscount || event.participationDiscountPercent || 0;
            document.getElementById('event-volunteers').checked = event.volunteersNeeded || false;
            document.getElementById('event-phone').value = event.phone || '';
            document.getElementById('event-email').value = event.email || '';
            document.getElementById('event-website').value = event.website || '';
            const openToRadio = form.querySelector(`input[name="event-open-to"][value="${event.openTo || 'All Members'}"]`);
            if (openToRadio) openToRadio.checked = true;
            document.getElementById('event-open-guests').checked = event.isOpenToGuests || false;
            document.getElementById('event-image1').value = event.image1Filename || 'None';
            document.getElementById('event-image2').value = event.image2Filename || 'None';

            // Populate Interested Players List
            event.interestedPlayers = event.interestedPlayers || []; // Ensure array exists
            if (event.interestedPlayers.length > 0) {
                event.interestedPlayers.forEach(playerName => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${playerName}</span>
                        <span class="action-icon remove" data-player-name="${playerName}" title="Remove player">&times;</span>
                    `;
                    interestedList.appendChild(li);
                });
                interestedSection.style.display = 'block'; // Show the section
            } else {
                 interestedList.innerHTML = '<li style="color: var(--neutral-color); justify-content: center;">No players currently interested.</li>';
                 interestedSection.style.display = 'block'; // Still show section, but with message
            }


        } else {
            // --- CREATE MODE ---
            delete modal.dataset.editingEventId; // Ensure no ID is stored
            title.textContent = 'Create New Event';
            interestedSection.style.display = 'none'; // Hide interested list
        }

        // Update slider display values
        updateAllSliderDisplays();


        modal.classList.remove('hidden');
    }
    // --- END NEW/MODIFIED FUNCTION ---


    // --- NEW HELPER: Update Slider Value Displays ---
   function updateSliderDisplay(sliderId) {
       const slider = document.getElementById(sliderId);
       const displaySpan = slider.previousElementSibling?.querySelector('.slider-value'); // Find span in label before slider
       if (!slider || !displaySpan) return;

       let prefix = '';
       let suffix = '';
       if (sliderId.includes('cost')) prefix = 'R';
       if (sliderId.includes('discount')) suffix = '%';

       displaySpan.textContent = `${prefix}${slider.value}${suffix}`;
   }

    // --- NEW HELPER: Update All Sliders ---
    function updateAllSliderDisplays() {
        updateSliderDisplay('event-cost-adult');
        updateSliderDisplay('event-cost-child');
        updateSliderDisplay('event-participation-discount');
    }
   // --- END NEW HELPERS ---

    // --- NEW FUNCTION: Remove player from interest list (Admin) ---
    function removeInterestedPlayer(playerName, eventId) {
        if (!playerName || !eventId) return;

        const event = state.events.find(ev => ev.id == eventId);
        if (event && event.interestedPlayers) {
            const initialLength = event.interestedPlayers.length;
            event.interestedPlayers = event.interestedPlayers.filter(p => p !== playerName);

            if (event.interestedPlayers.length < initialLength) {
                saveState();
                // Re-render just the interested list within the modal
                const interestedList = document.getElementById('interested-players-list');
                interestedList.innerHTML = ''; // Clear
                if (event.interestedPlayers.length > 0) {
                    event.interestedPlayers.forEach(pName => {
                         const li = document.createElement('li');
                         li.innerHTML = `
                            <span>${pName}</span>
                            <span class="action-icon remove" data-player-name="${pName}" title="Remove player">&times;</span>
                         `;
                         interestedList.appendChild(li);
                    });
                } else {
                     interestedList.innerHTML = '<li style="color: var(--neutral-color); justify-content: center;">No players currently interested.</li>';
                }

                console.log(`${playerName} removed from interest list for event ID ${eventId}`);
            }
        }
    }
    // --- END NEW FUNCTION ---

    // --- NEW FUNCTION: Save Event (Create or Update) ---
    function saveEvent() {
        const modal = document.getElementById('event-create-edit-modal');
        const eventIdToEdit = modal.dataset.editingEventId;
        const isEditing = !!eventIdToEdit;

        // --- Gather data from form fields ---
        const eventType = document.getElementById('event-type').value;
        const heading = document.getElementById('event-heading').value.trim();
        const eventDate = document.getElementById('event-date').value;
        const rsvpDate = document.getElementById('event-rsvp-date').value;
        const startTime = document.getElementById('event-start-time').value;
        const body1 = document.getElementById('event-body1').value.trim();
        const body2 = document.getElementById('event-body2').value.trim();
        const costAdult = parseInt(document.getElementById('event-cost-adult').value, 10) || 0;
        const costChild = parseInt(document.getElementById('event-cost-child').value, 10) || 0;
        let participationDiscountPercent = 0;
         if (eventType === 'Club Champs' || eventType === 'League') {
             participationDiscountPercent = parseInt(document.getElementById('event-participation-discount').value, 10) || 0;
         }
        const volunteersNeeded = document.getElementById('event-volunteers').checked;
        const phone = document.getElementById('event-phone').value.trim();
        const email = document.getElementById('event-email').value.trim();
        const website = document.getElementById('event-website').value.trim();
        const openToRadio = modal.querySelector('input[name="event-open-to"]:checked');
        const openTo = openToRadio ? openToRadio.value : 'All Members'; // Default if none selected
        const isOpenToGuests = document.getElementById('event-open-guests').checked;
        const image1Filename = document.getElementById('event-image1').value;
        const image2Filename = document.getElementById('event-image2').value;

        // Basic Validation (e.g., heading is required)
        if (!heading) {
            alert("Please enter an Event Heading.");
            return; // Stop saving
        }
         if (!eventDate) {
             alert("Please select an Event Date.");
             return;
         }


        // --- Create or Update Event Object ---
        let eventData = {
            eventType,
            heading,
            eventDate,
            rsvpDate,
            startTime,
            body1,
            body2,
            costAdult,
            costChild,
            participationDiscountPercent,
            participationDiscount: parseInt(document.getElementById('event-participation-discount').value, 10) || 0,
            volunteersNeeded,
            phone,
            email,
            website,
            openTo,
            isOpenToGuests,
            image1Filename,
            image2Filename,
            // isActive and interestedPlayers handled below
        };

        if (isEditing) {
            // Find existing event and update it
            const eventIndex = state.events.findIndex(ev => ev.id == eventIdToEdit);
            if (eventIndex > -1) {
                // Merge new data, preserving ID, active status, and interested players
                state.events[eventIndex] = {
                    ...state.events[eventIndex], // Keep existing id, isActive, interestedPlayers
                    ...eventData // Overwrite with new form data
                };
                console.log("Event updated:", eventIdToEdit);
            } else {
                console.error("Failed to find event to update:", eventIdToEdit);
                return; // Stop if event not found
            }
        } else {
            // Create new event
            eventData.id = Date.now(); // Generate unique ID
            eventData.isActive = false; // New events default to inactive
            eventData.interestedPlayers = []; // Initialize empty interest list
            state.events.push(eventData);
            console.log("New event created:", eventData.id);
        }

        // --- Finish Up ---
        saveState(); // Save the updated events array
        modal.classList.add('hidden'); // Hide the create/edit modal
        showEventListModal(); // Show the updated event list

        // If screensaver is running, stop and reset to reflect potential changes
         if (!screensaverOverlay.classList.contains('hidden')) {
             stopScreensaver();
             resetInactivityTimer();
         }
    }
    // --- END NEW FUNCTION ---

    function resetInactivityTimer() {
        // Always clear any existing timer first
        clearTimeout(inactivityTimer);
        inactivityTimer = null; // Clear the timer ID

        // Check if there are any active events
        const hasActiveEvents = state.events.some(event => event.isActive);

        // Only start the inactivity timer if there's at least one active event
        // AND we are not on mobile (screensaver disabled on mobile)
        if (hasActiveEvents && window.innerWidth > 900) {
            // console.log("Resetting inactivity timer (active events found)..."); // Optional logging
            // Set the timeout again for 5 minutes (INACTIVITY_TIMEOUT_MS is already defined as 5 * 60 * 1000)
            inactivityTimer = setTimeout(startScreensaver, INACTIVITY_TIMEOUT_MS);
        } else {
            // console.log("Inactivity timer NOT reset (no active events or mobile view)."); // Optional logging
            // Ensure screensaver is stopped if it somehow got started without active events
            stopScreensaver(); // Call stopScreensaver here to ensure it's hidden if conditions aren't met
        }
    }
    // --- END: Screensaver Functions ---
    // --- NEW: Screensaver Activity Listeners ---
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('touchstart', resetInactivityTimer);
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keydown', resetInactivityTimer);
    // Call it once on load to start the timer initially if conditions are met
    resetInactivityTimer();

    /* =================================
        END Screensaver FUNCTIONS (NEW)
    ================================= */

    
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
        
        // Update header text based on game mode
        const headerText = court.gameMode === 'doubles' 
            ? `Court ${courtId}: Manage Players` 
            : `Court ${courtId}: Remove players from the game.`;
        document.getElementById('manage-court-players-instructions').textContent = headerText;
        
        // Add action buttons to the main modal header
        const modalHeader = manageCourtPlayersModal.querySelector('.modal-header-with-actions h3');
        if (modalHeader) {
            // Remove any existing action buttons
            const existingSwapBtn = manageCourtPlayersModal.querySelector('.header-swap-player-btn');
            const existingTeamBtn = manageCourtPlayersModal.querySelector('.header-team-select-btn');
            if (existingSwapBtn) existingSwapBtn.remove();
            if (existingTeamBtn) existingTeamBtn.remove();
            
            // Create button container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'modal-header-actions';
            
            // Add swap player button (always visible for in-progress games)
            const swapBtn = document.createElement('button');
            swapBtn.className = 'header-swap-player-btn';
            swapBtn.title = 'Swap with Player on Another Court';
            swapBtn.innerHTML = '<i class="mdi mdi-account-switch"></i>';
            swapBtn.onclick = () => {
                showSwapPlayerModal(courtId);
            };
            buttonContainer.appendChild(swapBtn);
            
            // Add team selection button (only for doubles)
            if (court.gameMode === 'doubles') {
                const teamSelectBtn = document.createElement('button');
                teamSelectBtn.className = 'header-team-select-btn';
                teamSelectBtn.title = court.teamsSet ? 'Reselect Teams' : 'Set Teams';
                teamSelectBtn.innerHTML = '<i class="mdi mdi-account-group-outline"></i>';
                teamSelectBtn.onclick = () => {
                    manageCourtPlayersModal.classList.add('hidden');
                    handleChooseTeams(courtId, 'in_progress');
                };
                buttonContainer.appendChild(teamSelectBtn);
            }
            
            // Append button container to header
            modalHeader.parentElement.appendChild(buttonContainer);
        }
        
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


    
    function handleKeypadClick(e) {
        const key = e.target.dataset.key;
        const {
            mode,
            maxLength,
            maxValue
        } = keypadConfig;
        let displayValue = (mode === 'admin' || mode === 'reset' || mode === 'undo') ? (keypadDisplay.dataset.hiddenValue || '') : keypadDisplay.textContent;

        if (e.target.id === 'keypad-confirm-btn') {
            if (e.target.disabled) return;

            switch (mode) {
                case 'admin':
                    checkAdminPasscode();
                    break;
                case 'reset':
                    checkResetPasscode();
                    break;
                case 'undo':
                    checkUndoPasscode();
                    break;
                case 'addStock':
                    confirmBallStockUpdate();
                    break;
                case 'returnStock':
                    confirmBallStockReturn();
                    break;
                case 'returnUsed':
                    confirmUsedBallReturn();
                    break;
                case 'signOut':
                    confirmSignOutQuantity();
                    break;
                default:
                    if (activeInput && activeInput.classList.contains('reorder-position')) {
                        handleReorderPositionChange(keypadDisplay.textContent);
                    } else if (activeInput) {
                        activeInput.dispatchEvent(new Event('input'));
                    }
                    hideKeypad();
                    break;
            }
            return;
        }

        if (key === 'backspace') {
            displayValue = displayValue.slice(0, -1);
        } else if (key === 'clear') {
            displayValue = '';
        } else if (/[0-9]/.test(key)) {
            if (maxLength && displayValue.length >= maxLength) {
                return;
            }
            const potentialValue = displayValue + key;
            if (maxValue !== undefined && parseInt(potentialValue, 10) > maxValue) {
                return;
            }
            displayValue += key;
        }

        if (mode === 'admin' || mode === 'reset' || mode === 'undo') {
            keypadDisplay.dataset.hiddenValue = displayValue;
            keypadDisplay.textContent = '*'.repeat(displayValue.length);
        } else {
            keypadDisplay.textContent = displayValue;
            if (activeInput && !activeInput.classList.contains('reorder-position')) {
                activeInput.value = displayValue;
                activeInput.dispatchEvent(new Event('input'));
            }
        }

        keypadConfirmBtn.disabled = displayValue.length === 0;
    }


    // MODIFIED: Added data-mode to display and adjusted placeholder logic for admin mode
    function showKeypad(input, config = {}) {
        activeInput = input;
        keypadConfig = config;
        const {
            mode,
            title
        } = config;

        keypadDisplay.textContent = '';
        delete keypadDisplay.dataset.hiddenValue;

        if (mode === 'admin' || mode === 'reset' || mode === 'undo') {
            keypadDisplay.setAttribute('data-mode', mode);
            
            // Don't show placeholder for undo mode
            if (mode === 'undo') {
                keypadDisplay.removeAttribute('data-placeholder');
            } else {
                keypadDisplay.setAttribute('data-placeholder', title || 'Enter PIN');
            }
            
            keypadCancelBtn.classList.remove('hidden');
            keypadConfirmBtn.classList.remove('wide-full');
            keypadConfirmBtn.classList.add('wide-half');
        } else {
            keypadDisplay.removeAttribute('data-mode');
            if (title) {
                keypadDisplay.setAttribute('data-placeholder', title);
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

    function wireScoreInputToKeypad(input, config = {}) {
        input.readOnly = true;
        // Remove any old listener attached to this input to prevent duplicates
        if (input._keypadListener) {
            input.removeEventListener('click', input._keypadListener);
        }
        // Define the new listener with the current game's rules
        const newListener = (e) => {
            e.preventDefault(); // Prevent native keyboards on mobile
            showKeypad(e.target, config);
        };
        // Add the new listener
        input.addEventListener('click', newListener);
        // Store a reference to the new listener so it can be removed later
        input._keypadListener = newListener;
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

    // --- Adjust wireGlobalKeypadToInput to store timeout ID ---
    function wireGlobalKeypadToInput(input, validationCallback = null) { // Added default null
        if (!input) return; // Add safety check
        input.readOnly = true;

        const handleClick = (e) => {
            // Clear any previous timeout ID stored on this input
            if (input._clickTimeoutId) {
                clearTimeout(input._clickTimeoutId);
            }

            // Set timeout and store ID on the input element itself
            input._clickTimeoutId = setTimeout(() => {
                // Ensure the modal containing this input is still visible
                const parentModal = input.closest('.modal-overlay');
                if (parentModal && !parentModal.classList.contains('hidden')) {
                    showGlobalKeyboard(input); // Pass the original input
                }
                input._clickTimeoutId = null; // Clear ID after execution or check
            }, 150); // 150ms delay
        };

        // Remove previous listener if it exists
        if (input._globalKeypadClickListener) {
            input.removeEventListener('click', input._globalKeypadClickListener);
        }
        // Add the new listener
        input.addEventListener('click', handleClick);
        input._globalKeypadClickListener = handleClick; // Store reference

        // Optional: Add input listener if validation callback provided
        if (validationCallback && typeof validationCallback === 'function') {
            if (input._globalKeypadInputListener) {
                 input.removeEventListener('input', input._globalKeypadInputListener);
            }
            input.addEventListener('input', validationCallback);
            input._globalKeypadInputListener = validationCallback;
        }
    }

    function validateGuestForm() {
        const name = guestNameInput.value.trim();
        const surname = guestSurnameInput.value.trim();
        const genderSelected = !!document.querySelector('input[name="guest-gender"]:checked'); // Check if gender is selected
        const ageTypeSelected = !!document.querySelector('input[name="age-type"]:checked'); // *** NEW: Check if age type is selected ***
        const isReady = (name.length > 0 && surname.length > 0 && genderSelected && ageTypeSelected); // *** Added ageTypeSelected ***
        guestConfirmBtn.disabled = !isReady;
        guestConfirmBtn.style.backgroundColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)';
        guestConfirmBtn.style.borderColor = isReady ? 'var(--confirm-color)' : 'var(--inactive-color)';
    }
    // REVISED function to handle different contexts
    function handleGuestCheckIn() {
        const firstName = guestNameInput.value.trim();
        const lastName = guestSurnameInput.value.trim();
        const gender = document.querySelector('input[name="guest-gender"]:checked').value;
        const guestType = document.querySelector('input[name="player-type"]:checked').value; // Guest or Member
        const ageType = document.querySelector('input[name="age-type"]:checked').value; // *** NEW: Read age type ***
        const isGuest = guestType === 'guest';
        const context = guestNameModal.dataset.context; // Get the context

        // Always enable the 'member' radio button after use, regardless of context
        const memberRadio = document.querySelector('input[name="player-type"][value="member"]');
        if (memberRadio) memberRadio.disabled = false;


        if (!firstName || !lastName) return;

        const formatCase = (str) => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const formattedPlayerName = `${formatCase(firstName)} ${formatCase(lastName)}`;

        let playerObject;

        // --- Logic based on context and player type ---
        if (context === 'purchaser') {
            // Purchaser flow - always treat as guest, add/update history
            playerObject = { name: formattedPlayerName, gender: gender, guest: true, type: ageType, isPaused: false }; // *** Store ageType ***
            updateGuestHistory(playerObject.name, playerObject.gender); // Add/Update guest history
            guestNameModal.classList.add('hidden');
            delete guestNameModal.dataset.context;
            confirmPurchaser(formattedPlayerName, 'new_guest');
            resetGuestForm(); // Reset form after use
            return; // Exit purchaser flow
        }
        else if (context === 'manual-entry') {
            // Manual entry flow - always treat as guest, add to history AND manual selection
            playerObject = { name: formattedPlayerName, gender: gender, guest: true, type: ageType, isPaused: false }; // *** Store ageType ***
            updateGuestHistory(playerObject.name, playerObject.gender); // Add/Update guest history

            // Add directly to manual entry selection if not already there and space permits
            if (state.manualEntry.players.length < 4 && !state.manualEntry.players.includes(playerObject.name)) {
                state.manualEntry.players.push(playerObject.name);
            }

            guestNameModal.classList.add('hidden');
            delete guestNameModal.dataset.context;
            showManualPlayerSelectionModal(); // Re-show and update the manual entry modal
            resetGuestForm(); // Reset form after use
            saveState(); // Save guest history update
            return; // Exit manual entry flow
        }
        else {
             // Standard check-in flow
             if (isGuest) {
                 playerObject = { name: formattedPlayerName, gender: gender, guest: true, type: ageType, isPaused: false }; // *** Store ageType ***
                 updateGuestHistory(playerObject.name, playerObject.gender); // Add/Update guest history
             } else {
                 // Member check-in
                 playerObject = MASTER_MEMBER_LIST.find(p => p.name.toLowerCase() === formattedPlayerName.toLowerCase());
                 if (playerObject) {
                     // If found in master list, update its type property (if it exists) or add it
                     playerObject.type = ageType; // *** Store ageType for existing member ***
                     state.clubMembers = state.clubMembers.filter(p => p.name.toLowerCase() !== formattedPlayerName.toLowerCase());
                 } else {
                     // If member not found, treat as guest (but mark as member type internally)
                     playerObject = { name: formattedPlayerName, gender: gender, guest: false, type: ageType, isPaused: false }; // *** Mark guest:false, Store ageType ***
                     updateGuestHistory(playerObject.name, playerObject.gender); // Still track visits for potential future guest status? Or skip? Let's track.
                 }
             }
             // Proceed to leaderboard confirmation for standard check-in
             leaderboardConfirmModal.dataset.player = JSON.stringify(playerObject);
             leaderboardConfirmModal.classList.remove('hidden');
             guestNameModal.classList.add('hidden');
             // Form reset is handled within finishCheckIn for this flow
        }
    }

    // --- NEW HELPER: Add/Update Guest History ---
    function updateGuestHistory(guestName, guestGender) {
        const guestIndex = state.guestHistory.findIndex(g => g.name === guestName);
        const today = new Date().toISOString().split('T')[0];

        if (guestIndex > -1) {
            // Update existing guest gender if needed
            state.guestHistory[guestIndex].gender = guestGender;
            // Increment visits only if last visit wasn't today
            if (state.guestHistory[guestIndex].lastCheckIn !== today) {
                state.guestHistory[guestIndex].daysVisited = (state.guestHistory[guestIndex].daysVisited || 0) + 1;
                state.guestHistory[guestIndex].lastCheckIn = today;
            }
        } else {
            // Add new guest
            state.guestHistory.push({
                name: guestName,
                gender: guestGender,
                daysVisited: 1, // First visit
                lastCheckIn: today
            });
        }
    }

    // --- NEW HELPER: Reset Guest Form ---
    function resetGuestForm() {
        guestNameInput.value = '';
        guestSurnameInput.value = '';
        guestConfirmBtn.disabled = true;
        document.querySelector('input[name="guest-gender"][value="M"]').checked = true; // Default gender to M
        document.querySelector('input[name="player-type"][value="guest"]').checked = true; // Default type to Guest
        document.querySelector('input[name="age-type"][value="Adult"]').checked = true; // *** NEW: Default age type to Adult ***
        // Ensure member radio is re-enabled if it was disabled
        const memberRadio = document.querySelector('input[name="player-type"][value="member"]');
        if (memberRadio) memberRadio.disabled = false;
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

        const checkedInPlayerNames = new Set([
            ...state.availablePlayers.map(p => p.name),
            ...state.courts.flatMap(c => c.players).map(p => p.name)
        ]);

        const membersAvailableToCheckIn = state.clubMembers.filter(member => !checkedInPlayerNames.has(member.name));
        
        // --- THIS IS THE FIX ---
        // Sort the members alphabetically by name before rendering.
        membersAvailableToCheckIn.sort((a, b) => a.name.localeCompare(b.name));
        // --- END OF FIX ---

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
            // --- THIS IS THE FIX ---
            // Create a sorted copy of the array for display purposes only.
            // This does NOT change the actual queue order in state.availablePlayers.
            const sortedPlayers = [...state.availablePlayers].sort((a, b) => a.name.localeCompare(b.name));
            // --- END OF FIX ---
            
            sortedPlayers.forEach(player => {
                const li = document.createElement("li");
                const displayName = player.guest ? `${player.name} (Guest)` : player.name;
                li.innerHTML = ` <span style="flex-grow: 1;">${displayName}</span> <span style="margin-right: 1rem; color: #6c757d;">${player.gender}</span> <span class="action-icon remove" data-player="${player.name}">&times;</span> `;
                li.dataset.playerName = player.name;
                checkOutList.appendChild(li);
            });
            setupListWithIndex(sortedPlayers, checkOutList, document.getElementById('check-out-abc-index'));
        }
    }



    function executeCheckout(playerName) {
        if (!playerName) return;

        if (state.availablePlayers.length > 0 && state.availablePlayers[0].name === playerName) {
            resetAlertSchedule();
        }

        const playerObject = state.availablePlayers.find(p => p.name === playerName);
        if (playerObject) {
            if (playerObject.isJunior) {
                state.juniorClub.activeChildren = state.juniorClub.activeChildren.filter(child => child.name !== playerName);
            }
            if (!playerObject.guest) {
                state.clubMembers.push(playerObject);
                state.clubMembers.sort((a, b) => a.name.localeCompare(b.name));
            }
        }
        state.availablePlayers = state.availablePlayers.filter(p => p.name !== playerName);

        // Hide both modals, just in case
        document.getElementById('checkout-thanks-modal').classList.add("hidden");
        document.getElementById('checkout-thanks-no-stats-modal').classList.add("hidden");

        populateCheckOutModal();
        checkOutModal.classList.remove("hidden");
        
        updateGameModeBasedOnPlayerCount();
        autoAssignCourtModes();
        render();
        saveState();
    }

// REPLACE your existing 'showCheckoutThanksModal' function with this one

    function showCheckoutThanksModalNoStats(playerObject) {
        if (!playerObject) return;

        const playerName = playerObject.name;
        const firstName = playerName.split(' ')[0];
        document.getElementById('checkout-thanks-no-stats-title').textContent = `Thanks for joining us, ${firstName}!`;

        const today = new Date();
        const dayOfWeek = today.getDay();
        let nextSocialDay, nextSocialTime;

        if (dayOfWeek < 3 || (dayOfWeek === 3 && today.getHours() < 17)) {
            nextSocialDay = "this coming Wednesday";
            nextSocialTime = "17h30";
        } else if (dayOfWeek < 6 || (dayOfWeek === 6 && today.getHours() < 13)) {
            nextSocialDay = "this coming Saturday";
            nextSocialTime = "13h00";
        } else {
            nextSocialDay = "next Wednesday";
            nextSocialTime = "17h30";
        }

        const message = `We hope you had a great day on the courts. Please join us for our next social on ${nextSocialDay}, starting at ${nextSocialTime}.`;
        document.getElementById('checkout-thanks-no-stats-message').textContent = message;
        
        const modal = document.getElementById('checkout-thanks-no-stats-modal');
        modal.dataset.player = playerName;

        checkOutModal.classList.add('hidden');
        modal.classList.remove('hidden');
    }

    function showCheckoutThanksModal(playerObject) {
        if (!playerObject) return;

        const playerName = playerObject.name;
        const firstName = playerName.split(' ')[0];
        document.getElementById('checkout-thanks-title').textContent = `Thanks for joining us, ${firstName}!`;

        const statsContainer = document.getElementById('checkout-player-stats');
        
        statsContainer.classList.add('hidden');

        if (playerObject.onLeaderboard === true) {
            const todaysGames = state.gameHistory.filter(game => new Date(game.endTime).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]);
            const playerStatsToday = calculatePlayerStats(todaysGames)[playerName];

            // This is the key change: We no longer check if games have been played.
            // We only check if the stats object exists, which it will for any checked-in player.
            if (playerStatsToday) {
                const rank = getPlayerRank(playerName, playerObject.gender);
                const winPercentage = formatWinPercentage(playerStatsToday.played, playerStatsToday.won);
                const { best, worst } = findBestAndWorstMatches(playerName);
                const allTimeStats = calculatePlayerStats(state.gameHistory);
                const allTimeDurationMs = allTimeStats[playerName] ? allTimeStats[playerName].totalDurationMs : 0;

                document.getElementById('stat-rank').textContent = rank ? `#${rank}` : 'N/A';
                document.getElementById('stat-win-percentage').textContent = winPercentage;
                document.getElementById('stat-games-played').textContent = playerStatsToday.played;
                document.getElementById('stat-games-won').textContent = playerStatsToday.won;
                document.getElementById('stat-time-today').textContent = formatDuration(playerStatsToday.totalDurationMs);
                document.getElementById('stat-total-time').textContent = formatDuration(allTimeDurationMs);
                document.getElementById('best-match-highlight').innerHTML = `<strong>Best Match:</strong> ${best || 'N/A'}`;
                document.getElementById('worst-match-highlight').innerHTML = `<strong>Toughest Match:</strong> ${worst || 'N/A'}`;

                statsContainer.classList.remove('hidden');
            }
        }
        
        const today = new Date();
        const dayOfWeek = today.getDay();
        let nextSocialDay, nextSocialTime;

        if (dayOfWeek < 3 || (dayOfWeek === 3 && today.getHours() < 17)) {
            nextSocialDay = "this coming Wednesday";
            nextSocialTime = "17h30";
        } else if (dayOfWeek < 6 || (dayOfWeek === 6 && today.getHours() < 13)) {
            nextSocialDay = "this coming Saturday";
            nextSocialTime = "13h00";
        } else {
            nextSocialDay = "next Wednesday";
            nextSocialTime = "17h30";
        }

        const message = `We hope you had a great day on the courts. Please join us for our next social on ${nextSocialDay}, starting at ${nextSocialTime}.`;
        document.getElementById('checkout-thanks-message').textContent = message;
        
        const modal = document.getElementById('checkout-thanks-modal');
        modal.dataset.player = playerName;

        checkOutModal.classList.add('hidden');
        modal.classList.remove('hidden');
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
            // Targeted message - Use pronounceable name
            const firstNamePronounceable = getPronounceableName(onDutyName);
            ttsMessage = `${firstNamePronounceable}, please report to your station for assistance.`;
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

            const currentSelectorFullName = getFirstAvailablePlayerName(); // Get full name

            const wasPlayerHoldingSwapFlag = playerObj.isHoldingDutySwap;
            const isPlayerPausing = (verb === 'pause');

            if (verb === 'resume' && wasPlayerHoldingSwapFlag) {

                const cmIndex = state.availablePlayers.findIndex(p => p.name === state.onDuty);
                const playerAtPos2Index = 1;

                if (cmIndex > playerAtPos2Index) {
                    const playerToSwapWith = state.availablePlayers[playerAtPos2Index];

                    state.availablePlayers[playerAtPos2Index] = state.availablePlayers[cmIndex];
                    state.availablePlayers[cmIndex] = playerToSwapWith;
                }

                playerObj.isHoldingDutySwap = false;
            }

            // --- THIS IS THE NEW/MODIFIED LOGIC ---
            playerObj.isPaused = isPlayerPausing;

            if (isPlayerPausing) {
                playerObj.pauseTime = Date.now(); // Set the pause timestamp
            } else {
                delete playerObj.pauseTime; // Remove timestamp on resume
            }
            // --- END OF NEW LOGIC ---

            if (verb === 'pause') {
                const firstActiveIndex = state.availablePlayers.findIndex(p => !p.isPaused);
                if (firstActiveIndex === state.availablePlayers.indexOf(playerObj)) {
                    playerObj.isHoldingDutySwap = true;
                } else {
                    playerObj.isHoldingDutySwap = false;
                }
            }

            enforceQueueLogic(); // --- THIS IS THE FIX ---

            const fullPlayerName = playerObj.name;
            const pronounceablePlayerName = getPronounceableName(fullPlayerName); // Get pronounceable name
            let firstMessage = '';
            let secondMessage = null;

            if (playerObj.isPaused) {
                // Use pronounceable name
                firstMessage = `${pronounceablePlayerName} is now taking a well-deserved break.`;

                if (fullPlayerName === currentSelectorFullName) {
                    const nextSelectorFullName = getFirstAvailablePlayerName();
                    if (nextSelectorFullName) {
                         // Use pronounceable name for the next selector
                        const nextSelectorPronounceable = getPronounceableName(nextSelectorFullName);
                        secondMessage = `${nextSelectorPronounceable}, please select players for a game.`;
                    }
                }
            } else {
                 // Use pronounceable name
                firstMessage = `${pronounceablePlayerName} is back on court and ready to play.`;
            }

            playAlertSound(firstMessage, secondMessage);

            cancelConfirmModal.classList.add("hidden");
            updateGameModeBasedOnPlayerCount();
            render();
            saveState();
            checkAndPlayAlert(false);
        }
    }

    function showCooldownModal(remainingMs) {
        if (cooldownTimerInterval) {
            clearInterval(cooldownTimerInterval);
        }

        const endTime = Date.now() + remainingMs;

        function updateCountdown() {
            const now = Date.now();
            const timeLeft = endTime - now;

            if (timeLeft <= 0) {
                clearInterval(cooldownTimerInterval);
                cooldownModal.classList.add('hidden');
                return;
            }

            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            cooldownTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        updateCountdown(); // Initial call to display time immediately
        cooldownTimerInterval = setInterval(updateCountdown, 1000);
        cooldownModal.classList.remove('hidden');
    }

    function handlePauseToggleClick(button) {
        const playerName = button.dataset.playerName;
        const action = button.dataset.action; // 'pause' or 'resume'
        const playerObj = state.availablePlayers.find(p => p.name === playerName);

        if (!playerObj) return;

        if (action === 'resume') {
            const TEN_MINUTES_MS = 10 * 60 * 1000;
            if (playerObj.pauseTime && (Date.now() - playerObj.pauseTime) < TEN_MINUTES_MS) {
                const remainingMs = TEN_MINUTES_MS - (Date.now() - playerObj.pauseTime);
                showCooldownModal(remainingMs); // <-- This is the change
                return;
            }
        }
        
        const verb = action === 'pause' ? 'pause' : 'resume';
        
        const message = action === 'pause' 
            ? `Are you sure you want to pause your game play? You will be paused for a minimum of 10 minutes and will remain in position #${state.availablePlayers.indexOf(playerObj) + 1} until you resume.` 
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

    // Track last announcement times to prevent duplicates
    let lastFastPlayAnnouncement = 0;
    let last1SetAnnouncement = 0;
    const ANNOUNCEMENT_COOLDOWN = 5000; // 5 seconds cooldown between same announcements

    function autoAssignMatchMode() {
        if (!state.matchSettings.autoMatchModes) {
            return; // Do nothing if the feature is turned off
        }

        const socialCourts = state.courts.filter(c => 
            state.courtSettings.visibleCourts.includes(c.id) && c.courtMode !== 'league'
        );
        const socialCourtCount = socialCourts.length;
        
        const totalPlayerCount = totalPlayersAtClub();
        const fastPlayThreshold = (socialCourtCount * 4) + 4;

        const TWO_MINUTES_MS = 2 * 60 * 1000;

        if (totalPlayerCount >= fastPlayThreshold) {
            if (state.matchSettings.matchMode !== 'fast') {
                state.matchSettings.matchMode = 'fast';
                state.matchSettings.fastPlayGames = 4;
                // Only announce if cooldown period has passed
                const now = Date.now();
                if (now - lastFastPlayAnnouncement > ANNOUNCEMENT_COOLDOWN) {
                    playCustomTTS("There is currently a high demand. Switching to Fast Play mode and 2-minute alerts.");
                    lastFastPlayAnnouncement = now;
                }

                // If an alert is scheduled for more than 2 minutes away, reset it to 2 minutes.
                const remainingTime = alertScheduleTime - Date.now();
                if (alertState !== 'initial_check' && remainingTime > TWO_MINUTES_MS) {
                    alertScheduleTime = Date.now() + TWO_MINUTES_MS;
                    playCustomTTS("Alert timer accelerated.");
                }
            }
        } else {
            if (state.matchSettings.matchMode !== '1set') {
                state.matchSettings.matchMode = '1set';
                // Only announce if cooldown period has passed
                const now2 = Date.now();
                if (now2 - last1SetAnnouncement > ANNOUNCEMENT_COOLDOWN) {
                    playCustomTTS("Player queue is reduced. Switching to standard 1 Set matches and 5-minute alerts.");
                    last1SetAnnouncement = now2;
                }
            }
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
    
    // REPLACE this function (minor change to call checkAndPlayAlert correctly)
    function resetCourtAfterGame(courtId) {
        const court = state.courts.find(c => c.id === courtId);
        if (!court) return;

        court.status = "available";
        court.players = [];
        court.teams = {team1:[], team2:[]};
        court.gameMode = null;
        court.gameStartTime = null;
        court.queueSnapshot = null;
        court.becameAvailableAt = Date.now(); // Ensure this is set when becoming available

        // NEW: Check if we need to restore the original duty member
        if (state.tempDutyHandover && state.tempDutyHandover.originalMember) {
            // Check if the original duty member's game has ended
            const originalMemberStillOnCourt = state.courts.some(c =>
                c.status === 'in_progress' &&
                c.players.some(p => p.name === state.tempDutyHandover.originalMember)
            );

            if (!originalMemberStillOnCourt) {
                restoreOriginalDutyMember(); // This will call render() internally
            }
        }

        updateGameModeBasedOnPlayerCount();
        enforceDutyPosition();
        autoAssignCourtModes();
        render(); // Render the UI update first
        saveState();

        // --- THIS IS THE FIX ---
        // Call checkAndPlayAlert *after* render and save, so it evaluates the new state.
        // Pass false so it doesn't force an immediate alert, but resets timer if needed.
        checkAndPlayAlert(false);
        // --- END OF FIX ---
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

// REPLACE this function
    function handleSkipButtonClick() {
        const skipBtn = document.getElementById('end-game-skip-btn');
        const action = skipBtn.dataset.action;

        if (action === 'skip-scores') {
            confirmSkipScores();
        } else { // 'skip-result'
            confirmSkipResult();
        }
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
        // --- ADD THIS BLOCK AT THE BEGINNING ---
        // Save the final state of the checklist for the day *before* resetting
        saveChecklistHistory();
        // Force the checklist to reset its 'checked' status immediately
        resetChecklistForNewDay(true); // Pass true to force reset regardless of date
        // --- END ADD ---

        // Reset all player locations
        state.clubMembers = [...MASTER_MEMBER_LIST].sort((a, b) => a.name.localeCompare(b.name));
        state.availablePlayers = [];

        // ... (rest of the reset logic for courts, history, etc.) ...

        // Clear all history (game, reorder)
        state.gameHistory = [];
        state.reorderHistory = [];
        // DO NOT CLEAR state.checklistHistory here - we want to keep past checklists

        // ... (reset other relevant states like onDuty, selection) ...

        // Close all modals
        adminSettingsModal.classList.add('hidden');
        cancelConfirmModal.classList.add('hidden');

        // Save the new, clean state and re-render the UI
        saveState();
        autoAssignCourtModes();
        render();
        alert("Application has been reset. Checklist state for the previous session (if applicable) has been archived.");
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
        // --- DEBUG LOG ---
        console.log("--- generateChildField START ---");

        const groupId = Date.now();
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'child-field-group';
        fieldGroup.dataset.groupId = groupId;
        fieldGroup.dataset.complete = 'false'; // Start as incomplete

        // --- DEBUG LOG ---
        console.log("generateChildField: Created fieldGroup element:", fieldGroup);

        const currentParentSurname = parentSurnameInput.value.trim(); // Get current parent surname

        // --- UPDATED HTML with stacked fields and labels ---
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
                <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem; width: 100%;">
                    <div class="child-dob-input score-input-area" style="flex-direction: column; align-items: stretch; flex: 1; min-width: 0; position: relative;">
                        <label for="child-dob-${groupId}">Birth Date:</label>
                        <div class="date-time-input-wrapper">
                            <input type="date" id="child-dob-${groupId}" name="childBirthDate">
                            <div class="date-time-overlay" id="child-dob-${groupId}-overlay">
                                <span class="part empty" data-part="YYYY">yyyy</span><span class="separator">/</span><span class="part empty" data-part="MM">mm</span><span class="separator">/</span><span class="part empty" data-part="DD">dd</span>
                            </div>
                        </div>
                    </div>
                    <div class="gender-selector score-input-area" style="flex-direction: column; align-items: stretch; flex: 1; min-width: 0;">
                        <label>Gender:</label>
                        <div class="radio-group" style="background-color: transparent; border: 1px solid var(--border-color); border-radius: 5px; height: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-around; padding: 0.25rem 0.5rem;">
                            <label><input type="radio" name="child-gender-${groupId}" value="M"> Male</label>
                            <label><input type="radio" name="child-gender-${groupId}" value="F"> Female</label>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // --- Get Input References ---
        const childNameInput = fieldGroup.querySelector('[name="childName"]');
        const childSurnameInput = fieldGroup.querySelector('[name="childSurname"]');
        const childDobInput = fieldGroup.querySelector('[name="childBirthDate"]');

        // --- Attach Global Keyboard Listeners ---
        childNameInput.addEventListener('click', (e) => showGlobalKeyboard(e.target, 'LetterPad', ''));
        childSurnameInput.addEventListener('click', (e) => showGlobalKeyboard(e.target, 'LetterPad', ''));
        // Update overlay when date value changes
        childDobInput.addEventListener('change', function(e) {
            const overlay = fieldGroup.querySelector(`#child-dob-${groupId}-overlay`);
            if (!overlay) return;
            
            const value = e.target.value; // Format: YYYY-MM-DD
            if (value) {
                const [year, month, day] = value.split('-');
                const parts = overlay.querySelectorAll('.part');
                
                parts[0].textContent = year;
                parts[0].classList.remove('empty');
                parts[0].classList.add('filled');
                
                parts[1].textContent = month;
                parts[1].classList.remove('empty');
                parts[1].classList.add('filled');
                
                parts[2].textContent = day;
                parts[2].classList.remove('empty');
                parts[2].classList.add('filled');
            }
        });

        // --- Define Validation Handler for this specific group ---
        const validationHandlerForGroup = () => {
            checkAndCollapseChild(fieldGroup); // Check if this specific group is complete
            validateNewParentForm(false); // Validate parent form buttons (don't re-render parent)
            renderChildFields(); // Re-render child fields to update collapse state
        };

        // --- Attach Input/Change Listeners ---
        childNameInput.addEventListener('input', validationHandlerForGroup);
        childSurnameInput.addEventListener('input', validationHandlerForGroup);
        childDobInput.addEventListener('change', validationHandlerForGroup); // Date uses 'change'
        fieldGroup.querySelectorAll(`input[name^="child-gender"]`).forEach(radio => {
            radio.addEventListener('change', validationHandlerForGroup);
        });

        // --- Autofill Logic (Remains the same) ---
         childNameInput.addEventListener('input', () => {
             const surnameToAutofill = childSurnameInput.dataset.autofillSurname;
             if (surnameToAutofill && childNameInput.value.trim().length > 0 && childSurnameInput.value.trim().length === 0) {
                 childSurnameInput.value = surnameToAutofill;
                 // Dispatch an input event manually AFTER setting the value
                 childSurnameInput.dispatchEvent(new Event('input', { bubbles: true }));
             } else if (childNameInput.value.trim().length === 0) {
                 childSurnameInput.value = '';
                 childSurnameInput.dispatchEvent(new Event('input', { bubbles: true }));
             }
             // No need for validationHandlerForGroup() here, the 'input' event on childSurnameInput handles it
         });


        // --- Add listener to collapsed area to re-expand ---
        const collapsedDisplay = fieldGroup.querySelector('.child-collapsed-display');
        collapsedDisplay.addEventListener('click', (e) => {
             if (e.target.closest('.collapsed-area') || e.target.closest('.edit-icon')) {
                fieldGroup.dataset.complete = 'false';
                renderChildFields(); // Re-render to show expanded view
             }
        });
        collapsedDisplay.dataset.listenerBound = 'true'; // Mark as bound


        // --- Append to Container ---
        const childrenContainerElement = document.getElementById('children-container');
        if (childrenContainerElement) {
             console.log("generateChildField: Appending fieldGroup to #children-container:", childrenContainerElement);
             childrenContainerElement.appendChild(fieldGroup);
        } else {
             console.error("generateChildField: #children-container NOT FOUND!");
        }

        // --- DEBUG LOG ---
        console.log("--- generateChildField END ---");

        // Initial validation call for the new field AFTER appending
        validationHandlerForGroup();
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
        juniorClubRosterList.innerHTML = ''; // Clear previous content
        const { sortKey, sortOrder, type } = state.juniorClub.rosterFilter;

        let finalRoster = [];
        // --- Populate finalRoster based on 'type' filter ---
        if (type === 'parents') {
            state.juniorClub.parents.forEach(parent => {
                let latestChildCheckIn = 0;
                // Find the latest check-in time among all children of this parent
                parent.registeredChildren.forEach(child => {
                    const childFullName = `${child.name} ${child.surname}`.trim();
                    const childCheckIn = getLastCheckInForChild(childFullName);
                    if (childCheckIn > latestChildCheckIn) latestChildCheckIn = childCheckIn;
                });
                // Add parent data, including email
                finalRoster.push({
                    isParentOnlyView: true,
                    id: parent.id,
                    name: `${parent.name} ${parent.surname}`,
                    phone: parent.phone || 'N/A',
                    email: parent.email || 'N/A', // <-- ADDED EMAIL HERE
                    lastCheckInMs: latestChildCheckIn
                });
            });
        } else if (type === 'all') {
            // Logic for 'all' view (unchanged)
            state.juniorClub.parents.forEach(parent => {
                parent.registeredChildren.forEach(child => {
                    const childFullName = `${child.name} ${child.surname}`.trim();
                    const childAge = calculateAge(child.birthDate);
                    finalRoster.push({
                        isAllView: true,
                        id: childFullName, // Unique ID for list items if needed
                        parentName: `${parent.name} ${parent.surname}`,
                        childData: { name: childFullName, age: childAge, ageDisplay: childAge !== null ? `${childAge}y` : 'N/A', gender: child.gender || '?' },
                        lastCheckInMs: getLastCheckInForChild(childFullName)
                    });
                });
            });
        } else { // 'children' view
             // Logic for 'children' view (unchanged)
            state.juniorClub.parents.forEach(parent => {
                parent.registeredChildren.forEach(child => {
                    const childFullName = `${child.name} ${child.surname}`.trim();
                    const childAge = calculateAge(child.birthDate);
                    finalRoster.push({
                        isChildrenView: true,
                        id: childFullName, // Unique ID
                        name: `${child.name} ${child.surname}`,
                        age: childAge,
                        ageDisplay: childAge !== null ? `${childAge}y` : 'N/A',
                        gender: child.gender || '?',
                        lastCheckInMs: getLastCheckInForChild(childFullName),
                    });
                });
            });
        }

        // --- Sorting Logic (unchanged) ---
        let uniqueRoster = finalRoster; // Assuming filtering for uniqueness isn't needed here currently
        uniqueRoster.sort((a, b) => {
            let compareValue = 0;
            // Determine name based on view type for sorting
            const nameA = a.isParentOnlyView ? a.name : (a.isAllView ? a.childData.name : a.name);
            const nameB = b.isParentOnlyView ? b.name : (b.isAllView ? b.childData.name : b.name);

            if (sortKey === 'name') { compareValue = nameA.localeCompare(nameB); }
            else if (sortKey === 'last_checkin') { compareValue = a.lastCheckInMs - b.lastCheckInMs; }
            // Add other sort key logic if needed (age, gender, email etc.)
            else if (sortKey === 'age') { /* ... age sort logic ... */ }
            else if (sortKey === 'gender') { /* ... gender sort logic ... */ }

            return sortOrder === 'asc' ? compareValue : -compareValue;
        });

        // --- Filter HTML Injection (unchanged) ---
        const filterHTML = `
            <div class="list-filter-header" style="text-align: center;">
                <div class="radio-group" id="roster-type-filter-group" style="display: flex; gap: 2rem; justify-content: center; background-color: transparent;">
                    <label> <input type="radio" name="roster-type-filter" value="all" ${type === 'all' ? 'checked' : ''}> All</label>
                    <label> <input type="radio" name="roster-type-filter" value="parents" ${type === 'parents' ? 'checked' : ''}> Parents Only</label>
                    <label> <input type="radio" name="roster-type-filter" value="children" ${type === 'children' ? 'checked' : ''}> Children Only</label>
                </div>
            </div>
        `;
        juniorClubRosterList.insertAdjacentHTML('afterbegin', filterHTML);

        // Re-attach listener
        juniorClubRosterList.querySelector('#roster-type-filter-group').addEventListener('change', handleRosterTypeFilterChange);

        // --- Prepare for List Rendering ---
        const indexList = uniqueRoster.map(item => ({ name: item.isParentOnlyView ? item.name : (item.isAllView ? item.childData.name : item.name) }));

        if (uniqueRoster.length === 0) {
            document.getElementById('junior-club-roster-abc-index').innerHTML = ''; // Clear index
            juniorClubRosterList.insertAdjacentHTML('beforeend', '<li class="waiting-message">No members match the current filters.</li>');
            return; // Exit if no items
        }

        juniorClubRosterList.rosterData = uniqueRoster; // Store data for detail view clicks
        const getSortIcon = (key) => (state.juniorClub.rosterFilter.sortKey !== key) ? ' ' : (sortOrder === 'asc' ? ' 🔼' : ' 🔽');
        const buttonStyle = "background: none; color: var(--dark-text); border: none; padding: 0.5rem; min-width: 0; line-height: 1.2; font-weight: bold; font-size: calc(0.8rem * var(--font-size-multiplier));"; // Shared style

        let headerHTML = '';
        // --- Header Generation based on 'type' ---
        if (type === 'parents') {
            // *** UPDATED HEADER for Parents Only view ***
            headerHTML = `<div class="history-item roster-header" style="padding: 0.5rem 1rem;">
                <div class="roster-row">
                    <button class="action-btn roster-sort-btn roster-col-name" data-sort-key="name" style="${buttonStyle} flex: 2.5; text-align: left;">Parent Name${getSortIcon('name')}</button>
                    <span class="roster-col-contact" style="color: var(--dark-text); font-weight: bold; flex: 1; text-align: center; font-size: calc(0.8rem * var(--font-size-multiplier));">Contact</span>
                    <span class="roster-col-email" style="color: var(--dark-text); font-weight: bold; flex: 1.5; text-align: center; font-size: calc(0.8rem * var(--font-size-multiplier));">Email</span>
                    <button class="action-btn roster-sort-btn roster-col-checkin" data-sort-key="last_checkin" style="${buttonStyle} flex: 1; text-align: center;">Last<br>Check-In${getSortIcon('last_checkin')}</button>
                </div></div>`;
        } else { // 'all' or 'children' view (Header remains the same for these)
            headerHTML = `<div class="history-item roster-header" style="padding: 0.5rem 1rem;">
                <div class="roster-row">
                    <button class="action-btn roster-sort-btn roster-col-name" data-sort-key="name" style="${buttonStyle} flex: 2.5; text-align: left;">${type === 'all' ? 'Parent / Child' : 'Name'}${getSortIcon('name')}</button>
                    <button class="action-btn roster-sort-btn roster-col-gender" data-sort-key="gender" style="${buttonStyle} flex: 1; text-align: center;">Gender${getSortIcon('gender')}</button>
                    <button class="action-btn roster-sort-btn roster-col-age" data-sort-key="age" style="${buttonStyle} flex: 1; text-align: center;">Age${getSortIcon('age')}</button>
                    <button class="action-btn roster-sort-btn roster-col-checkin" data-sort-key="last_checkin" style="${buttonStyle} flex: 1; text-align: center;">Last<br>Check-In${getSortIcon('last_checkin')}</button>
                </div></div>`;
        }
        juniorClubRosterList.insertAdjacentHTML('beforeend', headerHTML); // Add header

        // --- List Item Generation ---
        uniqueRoster.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'roster-item';
            li.dataset.rosterIndex = index; // For detail view click
            // Name used for ABC index mapping
            const nameToIndex = item.isParentOnlyView ? item.name : (item.isAllView ? item.childData.name : item.name);
            li.dataset.playerName = nameToIndex;

            const lastCheckInDate = item.lastCheckInMs > 0 ? new Date(item.lastCheckInMs).toLocaleDateString('en-ZA') : 'N/A';
            const itemStyle = "min-width: 0; text-align: center;"; // Base style for columns

            // Populate innerHTML based on view type
            if (item.isParentOnlyView) {
                // *** UPDATED ITEM for Parents Only view ***
                 li.innerHTML = `<div class="roster-row">
                        <span class="roster-col-name" style="font-weight: 700; color: var(--primary-blue); flex: 2.5; text-align: left;">${item.name}</span>
                        <span class="roster-col-contact" style="color: var(--neutral-color); ${itemStyle} flex: 1;">${item.phone}</span>
                        <span class="roster-col-email" style="color: var(--neutral-color); ${itemStyle} flex: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.email}</span>
                        <span class="roster-col-checkin" style="font-size: 0.85em; color: var(--neutral-color); font-weight: 500; ${itemStyle} flex: 1;">${lastCheckInDate}</span>
                    </div>`;
            } else if (item.isAllView) { // 'all' view
                 li.innerHTML = `<div class="roster-row">
                        <div class="roster-col-name" style="display: flex; flex-direction: column; flex: 2.5; text-align: left;">
                            <span style="font-weight: 700; color: var(--primary-blue);">${item.parentName}</span>
                            <span style="font-size: 0.9em; color: var(--dark-text); padding-left: 1rem;">${item.childData.name}</span>
                        </div>
                        <span class="roster-col-gender" style="color: var(--neutral-color); ${itemStyle} flex: 1;">${item.childData.gender}</span>
                        <span class="roster-col-age" style="color: var(--neutral-color); ${itemStyle} flex: 1;">${item.childData.ageDisplay}</span>
                        <span class="roster-col-checkin" style="font-size: 0.85em; color: var(--neutral-color); font-weight: 500; ${itemStyle} flex: 1;">${lastCheckInDate}</span>
                    </div>`;
            } else { // 'children' view
                 li.style.padding = '0.8rem 1rem'; // Specific padding for children view
                 li.innerHTML = `<div class="roster-row">
                        <span class="roster-col-name" style="font-weight: 700; color: var(--dark-text); flex: 2.5; text-align: left;">${item.name}</span>
                        <span class="roster-col-gender" style="color: var(--neutral-color); ${itemStyle} flex: 1;">${item.gender}</span>
                        <span class="roster-col-age" style="color: var(--neutral-color); ${itemStyle} flex: 1;">${item.ageDisplay}</span>
                        <span class="roster-col-checkin" style="font-size: 0.85em; color: var(--neutral-color); font-weight: 500; ${itemStyle} flex: 1;">${lastCheckInDate}</span>
                    </div>`;
            }
            juniorClubRosterList.appendChild(li); // Add item to list
        });

        // Re-attach sort listeners to header buttons
        juniorClubRosterList.querySelectorAll('.roster-sort-btn').forEach(btn => {
            btn.removeEventListener('click', handleRosterSortClick); // Prevent duplicates
            btn.addEventListener('click', handleRosterSortClick);
        });

        // Setup ABC Index
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


    function showChildSelectionModal(parent) {
        attendingChildrenList.innerHTML = "";
        
        childSelectionModal.dataset.parentId = parent.id;
        childSelectionModal.querySelector('h3').textContent = `${parent.name} ${parent.surname}'s Children`;

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


    /**
     * Renders the main Junior Club check-in list, dynamically switching between
     * Parent Name and Child Name display based on state.juniorClub.checkInFilter.displayMode.
     */
    function renderJuniorClubCheckInList() {
        juniorClubList.innerHTML = "";
        
        const displayMode = state.juniorClub.checkInFilter.displayMode;
        
        // --- START OF NEW FILTER HTML INJECTION ---
        const filterHTML = `
            <div class="list-filter-header" style="text-align: center;">
                <div class="radio-group" id="junior-club-name-filter-group" style="display: flex; gap: 2rem; justify-content: center; background-color: transparent;">
                    <label> <input type="radio" name="junior-club-name-filter" value="parent" ${displayMode === 'parent' ? 'checked' : ''}> Parent Name</label>
                    <label> <input type="radio" name="junior-club-name-filter" value="child" ${displayMode === 'child' ? 'checked' : ''}> Child Name</label>
                </div>
            </div>
        `;
        juniorClubList.insertAdjacentHTML('afterbegin', filterHTML);
        
        // RE-ATTACH LISTENER to the newly injected radio group
        juniorClubList.querySelector('#junior-club-name-filter-group').addEventListener('change', handleJuniorClubNameFilterChange);
        // --- END OF NEW FILTER HTML INJECTION ---

        
        // 1. Get a list of all player names currently at the club (available or on court)
        const checkedInPlayerNames = new Set(state.juniorClub.activeChildren.map(c => c.name));
        
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
    }

    // New wrapper function to update the entire modal display
    function showJuniorClubModal() {
        // Render the list with the current filter settings
        renderJuniorClubCheckInList();
        setActiveMobileMenuItem('mobile-junior-club-btn');
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
        childSelectionModal.querySelector('h3').textContent = `${parent.name} ${parent.surname}'s Children`;

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

    function validateNewParentForm(shouldRender = true) {
        const parentName = parentNameInput.value.trim();
        const parentSurname = parentSurnameInput.value.trim();
        const parentEmail = parentEmailInput.value.trim(); // <-- ADDED email input reading
        const parentPhone = parentPhoneInput.value.trim();

        // Basic email validation: check if it contains @ and has text before and after
        const isEmailValid = parentEmail.includes('@') && parentEmail.indexOf('@') > 0 && parentEmail.indexOf('@') < parentEmail.length - 1; // <-- ADDED email validation

        // FIX: Changed phone validation from >= 9 to >= 8 and ADDED email check
        const parentFieldsValid = parentName.length > 0 && parentSurname.length > 0 && isEmailValid && parentPhone.length >= 8; // <-- UPDATED condition

        const childGroups = childrenContainer.querySelectorAll('.child-field-group');
        let allChildrenComplete = childGroups.length > 0; // Assume complete if > 0 children exist initially

        const addChildBtn = document.getElementById('add-child-btn');
        const removeChildBtn = document.getElementById('remove-child-btn-main'); // Ensure this ID matches your HTML
        const lastChildGroup = childGroups.length > 0 ? childGroups[childGroups.length - 1] : null;

        childGroups.forEach((group) => {
            // Check each child group; if ANY are incomplete, set allChildrenComplete to false
            if (!isChildFieldComplete(group)) {
                allChildrenComplete = false;
            }
        });

        const shouldParentBeCollapsed = parentFieldsValid;
        const shouldChildrenBeExpanded = parentFieldsValid; // Children section expands when parent is valid

        // Update the state based on validation results
        state.juniorClub.registrationFlow.parentCollapsed = shouldParentBeCollapsed;
        state.juniorClub.registrationFlow.childrenExpanded = shouldChildrenBeExpanded;

        // Can add a child if parent is valid AND (either no children exist OR the last child is complete)
        const canAddChild = parentFieldsValid && (!lastChildGroup || isChildFieldComplete(lastChildGroup));

        // Can remove a child only if there's more than one child group present
        const canRemoveChild = childGroups.length > 1; // Simplified this condition

        // Show/hide/disable Add Child button
        if (addChildBtn) {
            addChildBtn.style.display = shouldChildrenBeExpanded ? 'block' : 'none'; // Only show if children section is expanded
            addChildBtn.disabled = !canAddChild;
        }

        // Show/hide/disable Remove Child button
        if (removeChildBtn) {
            removeChildBtn.style.display = shouldChildrenBeExpanded && childGroups.length > 0 ? 'block' : 'none'; // Show if children expanded and > 0 exist
            removeChildBtn.disabled = !canRemoveChild;
        }

        // Determine if the final Confirm button should be enabled
        const isConfirmReady = parentFieldsValid && allChildrenComplete;
        newParentConfirmBtn.disabled = !isConfirmReady;

        // Update Confirm button styling based on readiness
        if (isConfirmReady) {
            newParentConfirmBtn.style.setProperty('background-color', 'var(--confirm-color)', 'important');
            newParentConfirmBtn.style.setProperty('border-color', 'var(--confirm-color)', 'important');
        } else {
            newParentConfirmBtn.style.setProperty('background-color', 'var(--inactive-color)', 'important');
            newParentConfirmBtn.style.setProperty('border-color', 'var(--inactive-color)', 'important');
        }

        // Render the parent form UI based on the updated state if requested
        if (shouldRender) {
            renderParentForm();
        }
    }

    function registerNewParent() {
        const parentName = formatCase(parentNameInput.value.trim());
        const parentSurname = formatCase(parentSurnameInput.value.trim());
        const parentEmail = parentEmailInput.value.trim().toLowerCase(); // <-- Store email lowercase
        const parentPhone = parentPhoneInput.value.trim();

        // Get country code and create full phone number
        const countryCode = document.getElementById('parent-country-code')?.value || '+27';
        const fullPhone = countryCode + parentPhone; // No leading zero needed with country code

        // Determine mode and parent ID
        const currentMode = newParentModal.dataset.mode || 'new'; // 'new' or 'edit'
        const newParentId = parentName + parentSurname; // Potential new ID based on current name/surname

        // 1. Collect all child data
        const children = [];
        childrenContainer.querySelectorAll('.child-field-group').forEach(group => {
            const childName = formatCase(group.querySelector('[name="childName"]').value.trim());
            const childSurname = formatCase(group.querySelector('[name="childSurname"]').value.trim());
            const childBirthDate = group.querySelector('[name="childBirthDate"]').value;
            const childGenderChecked = group.querySelector('input[type="radio"]:checked');
            const childGender = childGenderChecked ? childGenderChecked.value : '?';

            // Ensure all child fields are actually filled before adding
            if (childName && childSurname && childBirthDate && childGender !== '?') {
                children.push({
                    name: childName,
                    surname: childSurname,
                    gender: childGender,
                    birthDate: childBirthDate
                });
            }
        });

        // Basic validation: Must have filled parent details and at least one complete child
        const parentFieldsValid = parentName.length > 0 && parentSurname.length > 0 && parentEmail.includes('@') && parentPhone.length >= 8;
        if (!parentFieldsValid || children.length === 0) {
            playCustomTTS("Please complete all parent and child details before confirming.");
            return; // Stop if validation fails
        }


        // 2. Check for duplicate Parent ID during NEW registration
        //    (Only check if it's NOT edit mode AND the potential new ID already exists)
        if (currentMode !== 'edit' && state.juniorClub.parents.some(p => p.id === newParentId)) {
            playCustomTTS("A parent with this name is already registered.");
            return;
        }

        let parentToUpdate = null;
        if (currentMode === 'edit') {
            // In Edit mode, find the original parent entry using the stored original ID
            const originalId = newParentModal.dataset.originalParentId;
            parentToUpdate = state.juniorClub.parents.find(p => p.id === originalId);
            if (!parentToUpdate) {
                console.error("Error editing parent: Original parent not found with ID", originalId);
                playCustomTTS("Error finding parent profile to update.");
                return; // Stop if original parent not found
            }
        }

        // 3. Create or Update Parent Object
        if (parentToUpdate) {
            // --- EDIT MODE: Update existing parent ---
            parentToUpdate.name = parentName;
            parentToUpdate.surname = parentSurname;
            parentToUpdate.phone = fullPhone;
            parentToUpdate.email = parentEmail; // <-- SAVING EMAIL
            parentToUpdate.id = newParentId; // Update ID in case name/surname changed
            parentToUpdate.registeredChildren = children; // Overwrite children list

            playCustomTTS(`${parentName}'s profile has been successfully updated.`);
        } else {
            // --- NEW REGISTRATION MODE ---
            parentToUpdate = {
                id: newParentId,
                name: parentName,
                surname: parentSurname,
                phone: fullPhone,
                email: parentEmail, // <-- SAVING EMAIL
                registeredChildren: children
            };
            state.juniorClub.parents.push(parentToUpdate);
            playCustomTTS(`${parentName} successfully registered.`);
        }

        // 4. Clean up state and UI
        state.juniorClub.parents.sort((a, b) => a.name.localeCompare(b.name)); // Keep sorted

        // Restore default modal state for next use
        newParentModal.classList.add('hidden');
        newParentModal.querySelector('h3').textContent = 'New Parent Registration';
        newParentModal.dataset.mode = ''; // Clear mode
        delete newParentModal.dataset.originalParentId; // Clear original ID
        newParentConfirmBtn.textContent = 'Confirm Registration';
        parentNameInput.value = '';
        parentSurnameInput.value = '';
        parentPhoneInput.value = '';
        parentEmailInput.value = ''; // Clear email input
        childrenContainer.innerHTML = '';
        document.getElementById('parent-collapsed-display').innerHTML = ''; // Clear summary display

        // Reset the flow state
        state.juniorClub.registrationFlow = {
            parentCollapsed: false,
            childrenExpanded: false,
        };

        // 5. If it was a NEW registration, proceed to check-in. If it was an EDIT, return to the main list.
        if (currentMode === 'edit') {
            showJuniorClubModal(); // Show updated main list
        } else {
            showChildSelectionModal(parentToUpdate); // Proceed to check-in modal
        }

        saveState(); // Save changes
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
    
    // TEMPORARY DUTY HANDOVER LISTENERS
    tempDutyCancelBtn.addEventListener('click', () => {
        tempDutyHandoverModal.classList.add('hidden');
        tempDutyHandoverModal.callback = null;
    });

    tempDutyConfirmBtn.addEventListener('click', handleTempDutyHandoverConfirm);

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
            // playCustomTTS("All selected children are already checked in.");
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
        // playCustomTTS(`${numCheckedIn} ${childString} checked in for ${parent.name}.`);
        
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
        
        // --- START OF NEW FILTER HTML INJECTION ---
        const filterHTML = `
            <div class="list-filter-header" style="text-align: center;">
                <div class="radio-group" id="payment-filter-group" style="display: flex; gap: 2rem; justify-content: center; background-color: transparent;">
                    <label> <input type="radio" name="payment-filter" value="all" ${filter === 'all' ? 'checked' : ''}> All</label>
                    <label> <input type="radio" name="payment-filter" value="paid" ${filter === 'paid' ? 'checked' : ''}> Paid</label>
                    <label> <input type="radio" name="payment-filter" value="unpaid" ${filter === 'unpaid' ? 'checked' : ''}> Unpaid</label>
                </div>
            </div>
        `;
        juniorClubHistoryList.insertAdjacentHTML('afterbegin', filterHTML);

        // RE-ATTACH LISTENER to the newly injected radio group
        juniorClubHistoryList.querySelector('#payment-filter-group').addEventListener('change', handlePaymentFilterChange);
        // --- END OF NEW FILTER HTML INJECTION ---

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
            juniorClubHistoryList.insertAdjacentHTML('beforeend', '<li class="waiting-message">No history matches the current filter.</li>');
            return;
        }

        filteredHistory.forEach(entry => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.dataset.entryId = entry.id;
            li.dataset.playerName = entry.parentName; // For ABC index

            const paymentStatusText = entry.isPaid ? 'Paid' : 'Unpaid';
            const paymentStatusClass = entry.isPaid ? 'paid' : 'unpaid';
            
            const childNamesStr = entry.childNames.join(', ');
            const date = new Date(entry.id).toLocaleDateString('en-ZA');

            // --- CORRECTED HTML STRUCTURE (No outer wrapper div) ---
            li.innerHTML = `
                <div class="name-col">
                    <span style="font-weight: 500; color: var(--dark-text);">${entry.parentName}</span>
                    <span style="font-weight: 400; color: var(--dark-text); font-size: 0.95em; padding-left: 1rem;">${childNamesStr}</span>
                </div>
                <div class="status-col">
                    <span class="payment-status ${paymentStatusClass}">${paymentStatusText}</span>
                    <span class="payment-date-text" style="font-size: 0.85em; color: var(--neutral-color); display: block;">${date}</span>
                </div>
            `;
            // --- END CORRECTION ---

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
        console.log('Rendering Form - State Read:', { parentCollapsed, childrenExpanded }); // You should see {true, true}

        const parentFieldsEl = document.getElementById('parent-fields');
        const parentCollapseEl = document.getElementById('parent-collapsed-display');
        const childrenHeader = newParentModal.querySelector('h4'); // Assuming this selects the "Children Details" header
        const childrenContainerWrapper = document.getElementById('children-container-wrapper');
        const childrenContainer = document.getElementById('children-container'); // Make sure this is selected too

        // --- Parent Section ---
        if (parentCollapseEl) {
            const shouldHideSummary = !parentCollapsed;
            console.log(`Parent Summary (#parent-collapsed-display): Setting hidden=${shouldHideSummary}`);
            parentCollapseEl.classList.toggle('hidden', shouldHideSummary);
            // Verify style after toggle
            requestAnimationFrame(() => console.log(`Parent Summary computed display: ${window.getComputedStyle(parentCollapseEl).display}`));
        } else {
            console.error("ELEMENT NOT FOUND: #parent-collapsed-display");
        }

        if (parentFieldsEl) {
            const newParentFieldsDisplay = parentCollapsed ? 'none' : 'block';
            console.log(`Parent Fields (#parent-fields): Setting display=${newParentFieldsDisplay}`);
            parentFieldsEl.style.display = newParentFieldsDisplay;
            // Verify style after setting
            requestAnimationFrame(() => console.log(`Parent Fields computed display: ${window.getComputedStyle(parentFieldsEl).display}`));
        } else {
            console.error("ELEMENT NOT FOUND: #parent-fields");
        }

        // --- Populate Parent Summary (Only if collapsed and element exists) ---
        if (parentCollapsed && parentCollapseEl) {
            console.log("Populating parent summary...");
            const parentName = document.getElementById('parent-name-input')?.value.trim(); // Use safe navigation ?.
            const parentSurname = document.getElementById('parent-surname-input')?.value.trim();
            const parentEmail = document.getElementById('parent-email-input')?.value.trim();
            const parentPhone = document.getElementById('parent-phone-input')?.value.trim();

            parentCollapseEl.innerHTML = `
                <div class="collapsed-summary">
                    <span>${parentName || '?'} ${parentSurname || '?'}</span>
                    <span>${parentEmail || '?'} | ${parentPhone || '?'}</span>
                </div>
                <i class="mdi mdi-pencil edit-icon"></i>
            `;
            // Re-attach listener logic here...
            if (!parentCollapseEl.dataset.listenerBound) {
                parentCollapseEl.addEventListener('click', (e) => {
                    if (e.target.closest('.collapsed-summary') || e.target.closest('.edit-icon')) {
                        state.juniorClub.registrationFlow.parentCollapsed = false;
                        renderParentForm();
                    }
                });
                parentCollapseEl.dataset.listenerBound = 'true';
            }
        }


        // --- Children Section ---
        if (childrenHeader) {
            const shouldHideHeader = !childrenExpanded;
            console.log(`Children Header (h4): Setting hidden=${shouldHideHeader}`);
            childrenHeader.classList.toggle('hidden', shouldHideHeader);
        } else {
            console.warn("Children header (h4) not found within newParentModal.");
        }

        if (childrenContainerWrapper) {
            const newWrapperDisplay = childrenExpanded ? 'block' : 'none';
            console.log(`Children Wrapper (#children-container-wrapper): Setting display=${newWrapperDisplay}`); // Should log 'block'
            childrenContainerWrapper.style.display = newWrapperDisplay;
            // Verify style after setting
            requestAnimationFrame(() => console.log(`Children Wrapper computed display: ${window.getComputedStyle(childrenContainerWrapper).display}`));
        } else {
            console.error("ELEMENT NOT FOUND: #children-container-wrapper");
        }

        // --- Generate First Child / Render Children ---
        if (childrenExpanded) {
            if (!childrenContainer) {
                console.error("ELEMENT NOT FOUND: #children-container. Cannot add child fields.");
            } else {
                const childGroupCount = childrenContainer.querySelectorAll('.child-field-group').length;
                console.log(`Checking if first child needed. childrenExpanded=${childrenExpanded}, childGroupCount=${childGroupCount}, parentCollapsed=${parentCollapsed}`);

                if (childGroupCount === 0 && parentCollapsed) { // Kept original condition for now
                    console.log("Condition met: Generating first child field...");
                    generateChildField();
                } else if (childGroupCount === 0 && !parentCollapsed) {
                    console.log("Skipping child generation: Parent not collapsed yet.");
                } else {
                    console.log("Skipping child generation: Child fields already exist.");
                }
                renderChildFields();
            }
        } else {
            console.log("Skipping child generation/rendering: childrenExpanded is false.");
        }
    }

    // NEW FUNCTION: Renders each individual child field group (called by renderParentForm)
    function renderChildFields() {
        // --- Find the container once ---
        const container = document.getElementById('children-container');
        if (!container) {
            console.error("renderChildFields: #children-container not found!");
            return;
        }

        const childGroups = container.querySelectorAll('.child-field-group');
        console.log(`--- renderChildFields START --- Found ${childGroups.length} child groups.`);

        childGroups.forEach((group, index) => {
            const isComplete = group.dataset.complete === 'true';
            const collapsedDisplay = group.querySelector('.child-collapsed-display');
            const expandedFields = group.querySelector('.child-expanded-fields');

            console.log(`Group ${index + 1}: isComplete=${isComplete}`);

            if (!collapsedDisplay) {
                console.error(`Group ${index + 1}: '.child-collapsed-display' element NOT FOUND!`);
            }
            if (!expandedFields) {
                console.error(`Group ${index + 1}: '.child-expanded-fields' element NOT FOUND!`);
            }

            // --- Toggle Visibility Logic ---
            if (collapsedDisplay) {
                collapsedDisplay.classList.toggle('hidden', !isComplete);
            }
            if (expandedFields) {
                if (isComplete) {
                    console.log(`Group ${index + 1}: Hiding expanded fields.`);
                    expandedFields.style.display = 'none';
                } else {
                    console.log(`Group ${index + 1}: Setting expanded fields display to 'block'.`);
                    expandedFields.style.display = 'block'; // Ensure it's 'block'
                    // Log computed style AFTER setting it, wrapped in requestAnimationFrame
                     requestAnimationFrame(() => {
                        const computedDisplay = window.getComputedStyle(expandedFields).display;
                        console.log(`Group ${index + 1} expanded computed display: ${computedDisplay}`);
                        if (computedDisplay !== 'block') {
                            console.warn(`CSS might be overriding display for Group ${index + 1}`);
                        }
                     });
                }
            }

            // --- Populate Collapsed Display (Only if complete) ---
            if (isComplete && collapsedDisplay) {
                // Safely get values from inputs within this specific group
                const childName = group.querySelector('[name="childName"]')?.value.trim();
                const childSurname = group.querySelector('[name="childSurname"]')?.value.trim();
                const childDob = group.querySelector('[name="childBirthDate"]')?.value;
                const childGenderChecked = group.querySelector(`input[name^="child-gender"]:checked`);
                const childGender = childGenderChecked ? childGenderChecked.value : '?';
                const childAge = calculateAge(childDob);

                const genderDisplay = childGender === 'M' ? 'Male' : (childGender === 'F' ? 'Female' : 'N/A');
                const ageDisplay = childAge !== null ? `${childAge}y` : 'N/A';

                collapsedDisplay.innerHTML = `
                    <span class="collapsed-title">${childName || '?'} ${childSurname || '?'}</span>
                    <span class="collapsed-detail">${ageDisplay} (${genderDisplay})</span>
                    <i class="mdi mdi-pencil edit-icon"></i>
                `;

                // Re-attach listener if needed (check if already bound)
                 if (!collapsedDisplay.dataset.listenerBound) {
                    collapsedDisplay.addEventListener('click', (e) => {
                         if (e.target.closest('.collapsed-area') || e.target.closest('.edit-icon')) {
                            group.dataset.complete = 'false';
                            renderChildFields();
                         }
                    });
                    collapsedDisplay.dataset.listenerBound = 'true';
                 }
            }
        }); // End forEach

        console.log("--- renderChildFields END ---");

        // Revalidate parent form buttons without causing infinite render loop
        validateNewParentForm(false);
    }


    // MODIFIED: Entry point for the New Parent Modal
    function showNewParentModal() {
        juniorClubModal.classList.add('hidden');
        
        // --- THIS IS THE FIX ---
        // 1. Reset the modal's title and mode
        newParentModal.querySelector('h3').textContent = 'New Parent Registration';
        newParentModal.dataset.mode = 'new'; // Explicitly set mode to 'new'
        
        // 2. Reset the confirm button text
        newParentConfirmBtn.textContent = 'Confirm Registration';
        // --- END OF FIX ---

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
        parentEmailInput.value = '';
        parentPhoneInput.value = ''; 
        // Clear the collapsed display element's content as well
        document.getElementById('parent-collapsed-display').innerHTML = '';
        
        // CRITICAL FIX: Ensure Parent Fields start visible, and Children start hidden
        document.getElementById('parent-fields').style.display = 'block'; // Ensures expanded fields are visible
        document.getElementById('children-container-wrapper').style.display = 'none'; // Ensures children start hidden
        
        // DON'T add child field yet - wait for parent fields to be filled
        // generateChildField(); 
        validateNewParentForm();
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
                // playCustomTTS(`${childrenNames.join(' and ')} checked out due to payment.`);
            } else {
                // playCustomTTS(`Payment marked for ${entry.parentName}'s children. They were not currently checked in.`);
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
                    // playCustomTTS(`${names} checked back in as ${entry.parentName}'s session is marked unpaid.`);
                } else {
                    // playCustomTTS(`${entry.parentName}'s children are already checked in.`);
                }
            }
        }
        
        updateDetailModalButton(entry);
        // playCustomTTS(`${entry.parentName}'s session on ${new Date(entry.id).toLocaleDateString('en-ZA')} marked as ${entry.isPaid ? 'paid' : 'unpaid'}.`);
        saveState();
        renderJuniorClubHistory();
        updateGameModeBasedOnPlayerCount();
        enforceDutyPosition();
        render();
        checkAndPlayAlert(false);
    }

    // --- END JUNIOR CLUB HISTORY & STATS FUNCTIONS ---


    // --- NEW: Screensaver Activity Listeners ---
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('touchstart', resetInactivityTimer);
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keydown', resetInactivityTimer);

    // Listener specifically for the screensaver overlay
    screensaverOverlay.addEventListener('click', (e) => {
        // Stop screensaver ONLY if the click wasn't on the "I am interested" button
        if (!e.target.closest('#screensaver-interested-btn')) {
            stopScreensaver(); // This correctly stops it
        } else {
            // --- MODIFIED BLOCK ---
            const button = e.target.closest('#screensaver-interested-btn');
            const eventId = button ? button.dataset.eventId : null; // Get eventId from button
            if (eventId) {
                populateCheckInModal(); // Populate with members
                checkInModal.style.zIndex = 10000; // Ensure it's above screensaver
                checkInModal.classList.remove('hidden');
                // Store event ID context specifically for screensaver interest
                checkInModal.dataset.screensaverEventId = eventId;
            }
            // --- END MODIFIED BLOCK ---
        }
    });

    // --- NEW: Event List Modal Listeners ---
    document.getElementById('manage-events-btn')?.addEventListener('click', showEventListModal);

    document.getElementById('close-event-list-btn')?.addEventListener('click', () => {
        document.getElementById('event-list-modal')?.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden'); // Go back to admin settings
    });

    document.getElementById('create-new-event-btn')?.addEventListener('click', () => {
        document.getElementById('event-list-modal')?.classList.add('hidden');
        showEventCreateEditModal(); // Open edit modal in 'create' mode
    });

    // Use event delegation for edit buttons and toggles within the list
    document.getElementById('event-list')?.addEventListener('click', (e) => {
        const button = e.target.closest('.edit-event-btn');
        const deleteButton = e.target.closest('.delete-event-btn');
        const toggle = e.target.closest('.event-active-toggle');
        const listItem = e.target.closest('.event-list-item');
        const eventId = listItem ? listItem.dataset.eventId : null;

        if (button && eventId) {
            // Edit button clicked
            document.getElementById('event-list-modal')?.classList.add('hidden');
            showEventCreateEditModal(eventId); // Open edit modal in 'edit' mode
        } else if (deleteButton && eventId) {
            // Delete button clicked
            deleteEvent(eventId);
        } else if (toggle && eventId) {
            // Active toggle changed
            const event = state.events.find(ev => ev.id == eventId);
            if (event) {
                event.isActive = toggle.checked;
                saveState();
                // Optional: Provide feedback or maybe restart screensaver if it was running?

                    // If screensaver is currently running, stopping it will force a refresh next time
                if (!screensaverOverlay.classList.contains('hidden')) {
                    stopScreensaver();
                    resetInactivityTimer(); // Start timer again
                }
            }
        }
    });

    // --- NEW: Add listener to header logo for manual screensaver start ---
        const headerLogoElement = document.getElementById('header-logo');
        if (headerLogoElement) {
            headerLogoElement.addEventListener('click', () => {

                // Clear any pending inactivity timer first
                clearTimeout(inactivityTimer);
                inactivityTimer = null; // Clear the timer ID
                // Start the screensaver immediately
                startScreensaver();
            });
        }
        // --- END: Header logo listener ---

    // --- END: Event List Listeners ---



    // --- END: Screensaver Listeners ---


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
            await loadState(MASTER_MEMBER_LIST);
            // --- ADD THIS LINE ---
            resetChecklistForNewDay(); // Check if checklist needs reset for the current day
            // --- END ADD ---
            state.clubMembers = [...MASTER_MEMBER_LIST].sort((a, b) => a.name.localeCompare(b.name));
            updateGameModeBasedOnPlayerCount();
            autoAssignCourtModes();
            render();
            // Real-time sync setup
            API.onStateUpdate((updatedState) => {
                console.log('🔄 Real-time update received!');
                
                // IGNORE updates if we're making a local change
                if (localChangeInProgress) {
                    console.log('⏸️ Ignoring update - local change in progress');
                    return;
                }
                
                // Set flag to prevent saveState during this update
                state._isReceivingUpdate = true;
                
                const localUIState = {
                    mobileControls: state.mobileControls,
                    notificationControls: state.notificationControls,
                    uiSettings: state.uiSettings
                };
                
                state = { ...state, ...updatedState };
                
                state.mobileControls = localUIState.mobileControls;
                state.notificationControls = localUIState.notificationControls;
                state.uiSettings = localUIState.uiSettings;
                state._isReceivingUpdate = true; // Restore flag after merge
                
                const checkedInNames = new Set();
                if (Array.isArray(state.availablePlayers)) {
                    state.availablePlayers.forEach(p => checkedInNames.add(p.name));
                }
                state.courts.forEach(court => {
                    if (Array.isArray(court.players)) {
                        court.players.forEach(p => checkedInNames.add(p.name));
                    }
                });
                state.clubMembers = MASTER_MEMBER_LIST.filter(p => !checkedInNames.has(p.name));
                state.clubMembers.sort((a,b) => a.name.localeCompare(b.name));
                
                render();
                
                // Clear flag after render completes
                setTimeout(() => {
                    state._isReceivingUpdate = false;
                }, 100);
                
                console.log('✅ UI updated');
            });
            resetInactivityTimer(); // Start the inactivity timer when the app loads
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
            }, 1000);

            // Start repeating check for alert condition
            const LOGIC_CHECK_INTERVAL_MS = 10 * 1000;
            checkAndPlayAlert(false);
            setInterval(checkAndPlayAlert, LOGIC_CHECK_INTERVAL_MS);

            // NEW: Interval timer for the "On a Roll" text fader
            if (!window.statusFaderInterval) {
                window.statusFaderInterval = setInterval(() => {
                    const faders = document.querySelectorAll('.player-status-fader');
                    faders.forEach(fader => {
                        const statusTexts = Array.from(fader.querySelectorAll('.status-text'));
                        const currentlyVisibleIndex = statusTexts.findIndex(el => el.classList.contains('is-visible'));

                        if (currentlyVisibleIndex !== -1) {
                            // Hide the current text
                            statusTexts[currentlyVisibleIndex].classList.remove('is-visible');

                            // Calculate the index of the next text to show
                            const nextIndex = (currentlyVisibleIndex + 1) % statusTexts.length;
                            
                            // Show the next text
                            statusTexts[nextIndex].classList.add('is-visible');
                        }
                    });
                }, 3000); // Fades every 3 seconds
            }

            let wasMobile = window.innerWidth <= 900; // Initial check

            window.addEventListener('resize', () => {
                const isMobile = window.innerWidth <= 900;
                // Reload only if the state changes (crossed the 900px boundary)
                if (isMobile !== wasMobile) {
                    location.reload();
                }
                // Update the state for the next resize event
                wasMobile = isMobile;
            });

            // Start Custom Announcement Features
            setupLongPressPaste();
            startHeaderTextAnimation();
            startCustomTtsScheduler();
            saveChecklistHistory(); // Attempt save on load

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

        const returningGuestModal = document.getElementById('returning-guest-modal');
        const context = returningGuestModal.dataset.context;
        const today = new Date().toISOString().split('T')[0];
        
        // Only increment daysVisited if it's their first check-in/sale of the day
        if (guestData.lastCheckIn !== today) {
            guestData.daysVisited = (guestData.daysVisited || 0) + 1;
            guestData.lastCheckIn = today;
        }

        if (context === 'purchaser') {
            delete returningGuestModal.dataset.context;
            confirmPurchaser(playerName, 'returning_guest');
            return;
        }
        
        const playerObject = { ...guestData, isPaused: false };
        state.availablePlayers.push(playerObject);

        returningGuestModal.classList.add('hidden');
        // FIXED: Re-open the check-in modal after adding the returning guest
        populateCheckInModal(); // Refresh the check-in list
        checkInModal.classList.remove('hidden'); // Re-open check-in modal
        
        updateGameModeBasedOnPlayerCount();
        autoAssignCourtModes();
        render();
        saveState();
        checkAndPlayAlert(false);
    } 


// BIND ALL INITIAL DOM LISTENERS

    // Undo History Listeners
    document.getElementById('undo-history-btn')?.addEventListener('click', showUndoHistoryModal);

    document.getElementById('undo-history-close-btn').addEventListener('click', () => {
        document.getElementById('undo-history-modal').classList.add('hidden');
        adminSettingsModal.classList.remove('hidden');
    });

    // Mobile Menu Bar Event Listeners
    if (document.getElementById('mobile-menu-bar')) {
        document.getElementById('mobile-junior-club-btn').addEventListener('click', () => {
            checkInModal.classList.add('hidden');
            checkOutModal.classList.add('hidden');
            showJuniorClubModal();
        });

        document.getElementById('mobile-history-btn').addEventListener('click', () => {
            state.historyViewMode = 'games';
            renderHistory();
            historyPage.classList.remove("hidden");
        });

        document.getElementById('mobile-notify-btn').addEventListener('click', handleNotifyNow);

        document.getElementById('mobile-settings-btn').addEventListener('click', handleAdminLogin);
    }

    // --- LISTENERS FOR PULL DOWN HEADER ---
    // Attach event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Start the auto-hide timer on page load
    startHeaderHideTimer();

    
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

    historyBtn.addEventListener("click", () => {
        state.historyViewMode = 'games'; // Always start on the game history view
        renderHistory();
        historyPage.classList.remove("hidden");
    });

    historyCloseBtn.addEventListener("click", () => {
        historyPage.classList.add("hidden");
    });

    historyToggleViewBtn.addEventListener("click", () => {
        // RESET filters and comparison state before switching views
        resetComparisonState();
        resetStatsFilters();

        if (state.historyViewMode === 'stats') {
            state.historyViewMode = "games";
        } else {
            state.historyViewMode = "stats";
        }
        renderHistory();
        saveState();
    });

    document.getElementById('history-toggle-teams-btn').addEventListener('click', () => {
        // RESET filters and comparison state before switching views
        resetComparisonState();
        resetStatsFilters();

        if (state.historyViewMode === 'teams') {
            state.historyViewMode = 'games';
        } else {
            state.historyViewMode = 'teams';
        }
        renderHistory();
        saveState();
    });

    checkInBtn.addEventListener("click",()=>{populateCheckInModal(),checkInModal.classList.remove("hidden")});
    checkInCancelBtn.addEventListener("click",()=> {
        checkInModal.classList.add("hidden");
        // --- NEW: Reset z-index and context on close ---
        checkInModal.style.zIndex = ''; // Reset to default CSS value
        delete checkInModal.dataset.screensaverEventId;
        // --- END NEW ---
    });

    // --- NEW: Event Create/Edit Modal Listeners ---
    document.getElementById('cancel-event-edit-btn')?.addEventListener('click', () => {
        document.getElementById('event-create-edit-modal')?.classList.add('hidden');
        showEventListModal(); // Go back to the event list
    });

    // --- THIS LINE ---
    document.getElementById('save-event-btn')?.addEventListener('click', saveEvent);
    // --- END THIS LINE ---

    // Wire up text inputs to alpha keypad
    wireGlobalKeypadToInput(document.getElementById('event-heading'));
    wireGlobalKeypadToInput(document.getElementById('event-body1'));
    wireGlobalKeypadToInput(document.getElementById('event-body2'));

    // --- NEW: Wire Body Text inputs to the Global Keyboard ---
    // Note: We create a custom listener instead of using wireAlphaKeypadToInput
    document.getElementById('event-body1')?.addEventListener('click', (e) => showGlobalKeyboard(e.target));
    document.getElementById('event-body2')?.addEventListener('click', (e) => showGlobalKeyboard(e.target));
    
    // --- NEW: Wire phone, email, website fields to Global Keyboard ---
    document.getElementById('event-phone')?.addEventListener('click', function() {
        showGlobalKeyboard(this, 'NumberPad');
    });
    document.getElementById('event-email')?.addEventListener('click', function() {
        showGlobalKeyboard(this, 'LetterPad');
    });
    document.getElementById('event-website')?.addEventListener('click', function() {
        showGlobalKeyboard(this, 'LetterPad');
    });
    // --- END NEW ---

    // Listeners for sliders to update display
    document.getElementById('event-cost-adult')?.addEventListener('input', () => updateSliderDisplay('event-cost-adult'));
    document.getElementById('event-cost-child')?.addEventListener('input', () => updateSliderDisplay('event-cost-child'));
    document.getElementById('event-participation-discount')?.addEventListener('input', () => updateSliderDisplay('event-participation-discount'));

    // Delegate clicks for removing interested players
    document.getElementById('interested-players-list')?.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.action-icon.remove');
        const playerName = removeButton?.dataset.playerName;
        const modal = document.getElementById('event-create-edit-modal');
        const eventId = modal?.dataset.editingEventId;

        if (playerName && eventId) {
            removeInterestedPlayer(playerName, eventId);
        }
    });
    // --- END: Event Create/Edit Listeners ---



    
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

 

    // Child Fields
    addChildBtn.addEventListener('click', addChild);
    newParentModal.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="match-surname"]')) {
            handleMatchSurname(e);
        } else if (e.target.closest('[data-action="remove-child"]')) {
            removeChild(e);
        }
    });

    juniorClubModal.addEventListener('click', (e) => {
        
        // 1. Handle Header Icon Clicks (Roster and History)
        if (e.target.closest('#junior-club-roster-btn')) {
            showJuniorClubRosterModal();
            return;
        }
        if (e.target.closest('#junior-club-history-btn')) {
            showJuniorClubStatsModal();
            return;
        }
        
        // 2. Handle List Item Clicks (Check-In/Edit)
        const checkInTarget = e.target.closest('.action-icon.add');
        const editTarget = e.target.closest('.action-icon.edit');
        
        const listItem = e.target.closest('#junior-club-list li'); 
        if (!listItem) return;

        // --- Logic for the 'Add' (+) button (Check In) ---
        if (checkInTarget) {
            const parentId = checkInTarget.dataset.parentId;
            const parent = state.juniorClub.parents.find(p => p.id === parentId);
            
            // Proceed only if the parent is found and the button is not disabled
            if (parent && checkInTarget.style.opacity !== '0.5') {
                const displayMode = state.juniorClub.checkInFilter.displayMode;
                
                // If in 'Child Name' view, check in the specific child directly (This part was already working)
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
                        
                        // playCustomTTS(`${newChildren.length} child checked in for ${parent.name}.`);
                        saveState();
                        renderJuniorClubCheckInList(); // Refresh the list
                        return;
                    }
                }
                
                // --- THIS IS THE MISSING LOGIC FOR THE PLUS ICON IN PARENT VIEW ---
                // If in 'Parent Name' view, show the child selection modal
                showChildSelectionModal(parent);
            }
        } 
        // --- THIS IS THE MISSING LOGIC for the 'Edit' (✎) button ---
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


 



    // Child Fields
    addChildBtn.addEventListener('click', addChild);
    newParentModal.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="match-surname"]')) {
            handleMatchSurname(e);
        } else if (e.target.closest('[data-action="remove-child"]')) {
            removeChild(e);
        }
    });

    juniorClubModal.addEventListener('click', (e) => {
        
        // 1. Handle Header Icon Clicks (Roster and History)
        if (e.target.closest('#junior-club-roster-btn')) {
            showJuniorClubRosterModal();
            return;
        }
        if (e.target.closest('#junior-club-history-btn')) {
            showJuniorClubStatsModal();
            return;
        }
        
        // 2. Handle List Item Clicks (Check-In/Edit)
        const checkInTarget = e.target.closest('.action-icon.add');
        const editTarget = e.target.closest('.action-icon.edit');
        
        const listItem = e.target.closest('#junior-club-list li'); 
        if (!listItem) return;

        // --- Logic for the 'Add' (+) button (Check In) ---
        if (checkInTarget) {
            const parentId = checkInTarget.dataset.parentId;
            const parent = state.juniorClub.parents.find(p => p.id === parentId);
            
            // Proceed only if the parent is found and the button is not disabled
            if (parent && checkInTarget.style.opacity !== '0.5') {
                const displayMode = state.juniorClub.checkInFilter.displayMode;
                
                // If in 'Child Name' view, check in the specific child directly (This part was already working)
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
                
                // --- THIS IS THE MISSING LOGIC FOR THE PLUS ICON IN PARENT VIEW ---
                // If in 'Parent Name' view, show the child selection modal
                showChildSelectionModal(parent);
            }
        } 
        // --- THIS IS THE MISSING LOGIC for the 'Edit' (✎) button ---
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
    // NOTE: document.getElementById('payment-filter-group').addEventListener('change', handlePaymentFilterChange); is now handled inside renderJuniorClubHistory
    juniorClubStatsDetailsBtn.addEventListener('click', showJuniorClubDetailModal);

    // Junior Club Detail Modal Listeners
    detailCloseBtn.addEventListener('click', () => {
        juniorClubDetailModal.classList.add('hidden');
        showJuniorClubStatsModal(); // <-- MODIFIED: Ensure history is re-rendered on return
    });
    detailTogglePaidBtn.addEventListener('click', handleDetailTogglePaid);

    cooldownCloseBtn.addEventListener('click', () => {
        if (cooldownTimerInterval) {
            clearInterval(cooldownTimerInterval);
        }
        cooldownModal.classList.add('hidden');
    });


    // ADDED WINDOW RESIZE LISTENER FOR AUTOMATIC EXPANSION
    window.addEventListener('resize', resetCollapseOnResize);

    // UPDATED: Bypasses the confirmation modal for a direct check-in flow
    checkInList.addEventListener("click", e => {
        if (e.target.classList.contains("add")) {
            const playerName = e.target.dataset.player;
            // --- NEW CONTEXT CHECK ---
            const screensaverEventId = checkInModal.dataset.screensaverEventId;

            if (screensaverEventId) {
                // If opened from screensaver, add to interest list instead of checking in
                addInterestedPlayer(playerName, screensaverEventId);
            } else {
                // --- Original Check-in Logic ---
                const playerObject = state.clubMembers.find(p => p.name === playerName);
                if (playerObject) {
                    leaderboardConfirmModal.dataset.player = JSON.stringify(playerObject);
                    leaderboardConfirmModal.classList.remove('hidden');
                    checkInModal.classList.add('hidden');
                }
                // --- End Original Logic ---
            }
            // --- END NEW CONTEXT CHECK ---
        }
    });

    checkOutBtn.addEventListener("click",()=>{populateCheckOutModal(),checkOutModal.classList.remove("hidden")});
    checkOutCloseBtn.addEventListener("click",()=>checkOutModal.classList.add("hidden"));
    
    // MODIFIED: This now calls the new handleCheckout function
    checkOutList.addEventListener("click", e => {
        if (e.target.classList.contains("remove")) {
            const playerName = e.target.dataset.player;
            const playerObject = state.availablePlayers.find(p => p.name === playerName);
            if (playerObject) {
                // Instead of showing a modal directly, call the new handler function
                handleCheckout(playerObject);
            }
        }
    });



    // Listener for the ORIGINAL modal (with stats)
    document.getElementById('checkout-thanks-confirm-btn').addEventListener('click', () => {
        const modal = document.getElementById('checkout-thanks-modal');
        executeCheckout(modal.dataset.player);
    });

    // NEW: Listener for the NEW modal (no stats)
    document.getElementById('checkout-thanks-no-stats-confirm-btn').addEventListener('click', () => {
        const modal = document.getElementById('checkout-thanks-no-stats-modal');
        executeCheckout(modal.dataset.player);
    });


    // NEW: Listener for the branded checkout modal confirmation

    // On the Thank You (with stats) modal, go back to the Check-out list
    document.getElementById('checkout-thanks-back-btn').addEventListener('click', () => {
        document.getElementById('checkout-thanks-modal').classList.add('hidden');
        checkOutModal.classList.remove('hidden');
    });

    // On the Thank You (no stats) modal, go back to the Check-out list
    document.getElementById('checkout-thanks-no-stats-back-btn').addEventListener('click', () => {
        document.getElementById('checkout-thanks-no-stats-modal').classList.add('hidden');
        checkOutModal.classList.remove('hidden');
    });
    document.getElementById('checkout-thanks-confirm-btn').addEventListener('click', () => {
        const modal = document.getElementById('checkout-thanks-modal');
        const playerToCheckOutName = modal.dataset.player;

        if (playerToCheckOutName) {
            // --- This is the same core logic from executePlayerCheckOut ---
            if (state.availablePlayers.length > 0 && state.availablePlayers[0].name === playerToCheckOutName) {
                resetAlertSchedule();
            }

            const playerObject = state.availablePlayers.find(p => p.name === playerToCheckOutName);
            if (playerObject) {
                if (playerObject.isJunior) {
                    state.juniorClub.activeChildren = state.juniorClub.activeChildren.filter(child => child.name !== playerToCheckOutName);
                }
                if (!playerObject.guest) {
                    state.clubMembers.push(playerObject);
                    state.clubMembers.sort((a, b) => a.name.localeCompare(b.name));
                }
            }
            state.availablePlayers = state.availablePlayers.filter(p => p.name !== playerToCheckOutName);
            
            // Hide the thanks modal
            modal.classList.add("hidden");
            
            // Repopulate and show the original checkout modal again
            populateCheckOutModal();
            checkOutModal.classList.remove("hidden");
            
            // Update the main state
            updateGameModeBasedOnPlayerCount();
            autoAssignCourtModes();
            render();
            saveState();
        }
    });

// REPLACE this event listener
    endGameCancelBtn.addEventListener("click", () => {
        const courtId = endGameModal.dataset.courtId;
        const editGameId = endGameModal.dataset.editGameId;

        if (editGameId) {
            // If we were editing, close the end game modal and re-open the history page
            delete endGameModal.dataset.editGameId;
            endGameModal.classList.add("hidden");
            historyPage.classList.remove("hidden"); // <-- THIS IS THE FIX
            return;
        }

        if (courtId) {
            const courtCardEl = document.querySelector(`.court-card[data-court-id="${courtId}"]`);
            const button = courtCardEl ? courtCardEl.querySelector('.end-game-ball') : null;
            if (button) {
                button.classList.remove('hide-anim', 'animate-in');
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
        } else if (mode === "confirmEditGame") {
            const gameId = cancelConfirmModal.dataset.gameId;
            cancelConfirmModal.classList.add("hidden");
            resetConfirmModal();
            handleEndGame(null, gameId); 
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

    // Undo Toast Listeners
    document.getElementById('undo-toast-dismiss').addEventListener('click', hideUndoToast);
    document.getElementById('undo-toast-btn').addEventListener('click', () => {
        if (state.undoHistory.currentToast && state.undoHistory.currentToast.undoAction) {
            state.undoHistory.currentToast.undoAction();
            hideUndoToast();
        }
    }); 
    
    // Add generic listeners that trigger validation whenever an input's value changes.
    const scoreInputs = [winningScoreInput, losingScoreInput, winnerTiebreakInput, loserTiebreakInput];
    scoreInputs.forEach(input => {
        input.addEventListener("input", () => {
            checkAndShowTieBreak();
            validateEndGameForm();
        });
    });

    // Wire up the keypad for the tie-break inputs, which have no special max value rules.
    // The main score inputs are now wired up dynamically inside handleEndGame().
    wireScoreInputToKeypad(winnerTiebreakInput);
    wireScoreInputToKeypad(loserTiebreakInput);


// REPLACE this event listener
    courtModeKeypadButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const key = e.target.dataset.key;
            let displayValue = courtModeKeypadDisplay.dataset.hiddenValue || '';

            if (e.target.id === 'court-mode-keypad-confirm-btn') {
                if (e.target.disabled) return;
                checkCourtModePasscode();
                return;
            }

            if (key === 'backspace') {
                displayValue = displayValue.slice(0, -1);
            } else if (key === 'clear') {
                displayValue = '';
            } else if (/[0-9]/.test(key)) {
                if (displayValue.length >= 6) return; // Max length for PIN
                displayValue += key;
            }

            courtModeKeypadDisplay.dataset.hiddenValue = displayValue;
            courtModeKeypadDisplay.textContent = '*'.repeat(displayValue.length);

            // --- THIS IS THE FIX ---
            // The button is only enabled when exactly 6 digits are entered.
            const isReady = displayValue.length === 6;
            courtModeKeypadConfirmBtn.disabled = !isReady;
            // --- END OF FIX ---
        });
    });

    courtModeKeypadCancelBtn.addEventListener('click', hideCourtModeKeypad);

    keypadButtons.forEach(button => { button.addEventListener('click', handleKeypadClick); });
    keypadCancelBtn.addEventListener('click', () => {
        // Check if we're canceling from undo mode
        if (keypadConfig.mode === 'undo') {
            hideKeypad();
            delete customKeypadModal.dataset.undoActionIndex;
            delete customKeypadModal.dataset.undoActionDescription;
            // Return to undo history modal
            document.getElementById('undo-history-modal').classList.remove('hidden');
        } else {
            hideKeypad();
        }
    });
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
    guestCancelBtn.addEventListener("click", () => {
        const context = guestNameModal.dataset.context; // Get context
        guestNameModal.classList.add('hidden');
        delete guestNameModal.dataset.context; // Clear context after use

        // --- NEW CONDITIONAL LOGIC ---
        if (context === 'manual-entry') {
            manualEntryModal.classList.remove('hidden'); // Return to manual entry
        } else {
            checkInModal.classList.remove('hidden'); // Default return to check-in
        }
        // --- END NEW LOGIC ---

        // Also ensure the member radio button is re-enabled on cancel
        const memberRadio = document.querySelector('input[name="player-type"][value="member"]');
        if (memberRadio) memberRadio.disabled = false;
        resetGuestForm(); // Reset form fields
    });
    guestConfirmBtn.addEventListener("click", handleGuestCheckIn);
    guestGenderRadios.forEach(radio => radio.addEventListener('change', validateGuestForm));
    const wireNameInputToKeypad = (input) => { input.readOnly = true; input.addEventListener('click', (e) => { showAlphaKeypad(e.target); }); };
    wireNameInputToKeypad(guestNameInput);
    wireNameInputToKeypad(guestSurnameInput);

    adminCloseBtn.addEventListener('click', () => {
        adminSettingsModal.classList.add('hidden');

        if (adminSessionActive) {
            if (adminSessionTimer) clearTimeout(adminSessionTimer);
            adminSessionTimer = setTimeout(() => {
                adminSessionActive = false;
                adminSessionTimer = null;
                state.courts.forEach(c => c.isModeOverlayActive = false);
                render();
                playAlertSound(null, null, 'Alert7.mp3');
                requestAnimationFrame(ensureCourtSelectionAnimation); // <-- THIS IS THE FIX
            }, 60000); // 1 minute
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

        // --- THIS IS THE FIX ---
        enforceQueueLogic(); // Re-apply all queue rules after the admin reorder

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


    // Helper function to call both validation and rendering
    function validateParentAndRender() {
        validateNewParentForm(); // First, update the state based on input
        renderParentForm();      // Then, update the UI based on the new state
    }

    // Attach the helper function to the 'input' event for each field
    if (parentNameInput) {
        parentNameInput.removeEventListener('input', validateParentAndRender); // Prevent duplicates
        parentNameInput.addEventListener('input', validateParentAndRender);
    }
    if (parentSurnameInput) {
        parentSurnameInput.removeEventListener('input', validateParentAndRender);
        parentSurnameInput.addEventListener('input', validateParentAndRender);
    }
     if (parentEmailInput) {
         parentEmailInput.removeEventListener('input', validateParentAndRender);
         parentEmailInput.addEventListener('input', validateParentAndRender);
      }
    if (parentPhoneInput) {
        parentPhoneInput.removeEventListener('input', validateParentAndRender);
        parentPhoneInput.addEventListener('input', validateParentAndRender);
    }

    // --- ROSTER MODAL LISTENERS (RE-VERIFIED AND ENSURED) ---
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


// EVENT LISTENER FOR GAME HISTORY
    historyList.addEventListener('click', (e) => {
         // --- ADD THIS BLOCK ---
        if (e.target.closest('.sort-btn')) {
            return; // Do nothing if a sort button was clicked
        }
        // --- END BLOCK ---
        const historyItem = e.target.closest('.history-item');
        if (!historyItem || !historyItem.dataset.gameId) return;

        const gameId = historyItem.dataset.gameId;

        // Show a confirmation modal before starting the edit
        cancelConfirmModal.querySelector("h3").textContent = "Edit Game Results";
        cancelConfirmModal.querySelector("p").textContent = "Are you sure you want to edit the results for this game?";
        modalBtnYesConfirm.textContent = "Yes, Edit";
        modalBtnNo.textContent = "Cancel";
        cancelConfirmModal.dataset.mode = "confirmEditGame";
        cancelConfirmModal.dataset.gameId = gameId;
        cancelConfirmModal.classList.remove("hidden");
    });

    // EVENT LISTENERS FOR LEADERBOARD AND DISCLAIMER MODALS

    // On the Rules/Leaderboard modal, go back to the Check-in list
    document.getElementById('leaderboard-back-btn').addEventListener('click', () => {
        leaderboardConfirmModal.classList.add('hidden');
        checkInModal.classList.remove('hidden');
    });
    document.getElementById('leaderboard-btn-yes').addEventListener('click', () => {
        const player = JSON.parse(leaderboardConfirmModal.dataset.player);
        player.onLeaderboard = true;
        finishCheckIn(player);
    });

    document.getElementById('leaderboard-btn-no').addEventListener('click', () => {
        const player = JSON.parse(leaderboardConfirmModal.dataset.player);
        player.onLeaderboard = false;
        finishCheckIn(player);
    });

    document.getElementById('disclaimer-btn').addEventListener('click', () => {
        disclaimerModal.classList.remove('hidden');
    });

    document.getElementById('disclaimer-close-btn').addEventListener('click', () => {
        disclaimerModal.classList.add('hidden');
    });

    // Event listener for the new Auto-Minimize toggle
    document.getElementById('auto-minimize-toggle').addEventListener('change', (e) => {
        state.notificationControls.autoMinimize = e.target.checked;
        if (state.notificationControls.autoMinimize) {
            runAutoMinimizeLogic(); // Immediately run the logic when turned on
        }
        saveState();
    });

    // We also need to call the auto-minimize logic whenever players or courts change state
    // For example, at the end of these functions:
    // (You will need to find these functions and add the call)

    // In executeGameCancellation() -> right before saveState()
    runAutoMinimizeLogic();

    // In executePlayerCheckIn() -> right before saveState()
    runAutoMinimizeLogic();

    // In executePlayerCheckOut() -> right before saveState()
    runAutoMinimizeLogic();

    // In finishCheckIn() -> right before saveState()
    runAutoMinimizeLogic();
    
    // In resetCourtAfterGame() -> right before saveState()
    runAutoMinimizeLogic();



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

    ballDetailCloseBtn.addEventListener('click', () => {
        ballHistoryDetailModal.classList.add('hidden');
        ballHistoryModal.classList.remove('hidden'); // Go back to the list
    });

    // Use event delegation for the sign out buttons
    signOutOptions.addEventListener('click', handleSignOut);
    
    // FIX: Individual listener binding to guarantee button functionality
    //document.querySelectorAll('.sign-out-btn').forEach(button => {
        // Ensure we don't double-bind if the script is reloaded
    //    button.removeEventListener('click', handleSignOut);
    //    button.addEventListener('click', handleSignOut);
    //});


    // --- NEW EVENT LISTENERS FOR BALL SALES FLOW ---
    
    // 0. Listener to handle Sale Type selection on Ball Management Modal
    ballManagementModal.addEventListener('click', (e) => {
        if (e.target.closest('.sign-out-btn') && e.target.closest('.sign-out-btn').dataset.category === 'Sale') {
            // Redirect to handleSignOut, which has been modified to start the sale flow
            handleSignOut(e); 
        }
    });
    
    // 1. Sale Stock Type Modal
    saleTypeCansBtn.addEventListener('click', () => handleSaleStockTypeSelection('cans'));
    saleTypeSinglesBtn.addEventListener('click', () => handleSaleStockTypeSelection('singles'));
    saleTypeCancelBtn.addEventListener('click', () => {
        ballSaleTypeModal.classList.add('hidden');
        ballManagementModal.classList.remove('hidden');
    });

    // 2. Purchaser Selection Modal
    purchaserMemberList.addEventListener('click', (e) => { 
        const li = e.target.closest('li');
        if (li && li.querySelector('input[name="purchaserMember"]')) {
            const radio = li.querySelector('input[name="purchaserMember"]');
            radio.checked = true; // Select the radio button
            const purchaserName = radio.value;
            const purchaserType = li.querySelector('.member-designation').textContent.toLowerCase().includes('guest') ? 'guest' : 'member';
            purchaserSelectionModal.classList.add('hidden'); // Close the list modal
            confirmPurchaser(purchaserName, purchaserType);
        }
    });

    document.getElementById('purchaser-new-guest-btn').addEventListener('click', () => {
        // Use the existing guest name modal logic, but with a new 'purchaser' context
        guestNameModal.dataset.context = 'purchaser'; 
        purchaserSelectionModal.classList.add('hidden');
        // The guest name modal's confirm button will now call confirmPurchaser upon completion
        guestNameModal.classList.remove('hidden');
        // Ensure guest form is reset for new guest entry
        guestNameInput.value = '';
        guestSurnameInput.value = '';
        document.querySelector('input[name="player-type"][value="guest"]').checked = true;
        document.querySelector('input[name="player-type"][value="member"]').disabled = true; // Disable member option here
        validateGuestForm();
    });
    
    document.getElementById('purchaser-returning-guest-btn').addEventListener('click', () => {
        document.getElementById('returning-guest-modal').dataset.context = 'purchaser';
        purchaserSelectionModal.classList.add('hidden');
        populateReturningGuestModal();
        document.getElementById('returning-guest-modal').classList.remove('hidden');
    });
    
    document.getElementById('purchaser-cancel-btn').addEventListener('click', () => {
        purchaserSelectionModal.classList.add('hidden');
        // Clear temporary state and go back to committee member selection modal
        state.ballManagement.tempSale = { stockType: null, memberSignOut: null, purchaserName: null };
        // The only way to get here is from a sale, so re-open the committee member list
        handleSignOut({ target: document.querySelector('.sign-out-btn[data-category="Sale"]') });
    });

    // --- RE-ADD LISTENER FOR RETURNING GUEST BACK BUTTON IN PURCHASER CONTEXT ---
    document.getElementById('returning-guest-cancel-btn').addEventListener("click", (e) => {
        const returningGuestModal = document.getElementById('returning-guest-modal');
        if (returningGuestModal.dataset.context === 'purchaser') {
            e.preventDefault(); // Stop default action
            returningGuestModal.classList.add('hidden');
            // Show the purchaser modal again (which auto-populates the list)
            purchaserSelectionModal.classList.remove('hidden');
            delete returningGuestModal.dataset.context; 
        }
    });



    // NEW EVENT LISTENERS FOR SIGN-OUT MEMBER MODAL
    signOutMemberConfirmBtn.addEventListener('click', handleMemberSelectionConfirm);
    signOutMemberCancelBtn.addEventListener('click', () => {
        signOutMemberModal.classList.add('hidden');
        ballManagementModal.classList.remove('hidden');
    });

    // EVENT LISTENERS FOR MANUAL GAME ENTRY (Consolidated and Corrected)
    document.getElementById('manual-entry-btn').addEventListener('click', openManualPlayerSelectionModal);

    manualPlayerList.addEventListener('click', handleManualPlayerClick);

    manualEntryCancelBtn.addEventListener('click', () => {
        manualEntryModal.classList.add('hidden');
        historyPage.classList.remove('hidden'); // Return to history
    });

    manualEntryConfirmBtn.addEventListener('click', handleConfirmManualPlayers);

    addOutsidePlayerBtn.addEventListener('click', showOutsidePlayerModal);

    outsidePlayerList.addEventListener('click', handleOutsidePlayerClick);

    outsidePlayerConfirmBtn.addEventListener('click', handleConfirmManualPlayers);

    outsidePlayerBackBtn.addEventListener('click', () => {
        outsidePlayerModal.classList.add('hidden');
        showManualPlayerSelectionModal(); // Go back and re-render the main selection modal
    });

    document.getElementById('manual-add-guest-btn').addEventListener('click', () => {
        // Use the existing guest name modal logic, but set context
        guestNameModal.dataset.context = 'manual-entry';
        manualEntryModal.classList.add('hidden'); // Hide manual entry temporarily
        // Ensure guest form is reset for new guest entry
        guestNameInput.value = '';
        guestSurnameInput.value = '';
        document.querySelector('input[name="player-type"][value="guest"]').checked = true;
        // Disable selecting 'member' when adding guest from manual entry
        document.querySelector('input[name="player-type"][value="member"]').disabled = true;
        validateGuestForm();
        guestNameModal.classList.remove('hidden');
    }); 

    // Listener for removing a player from the "Selected" area in the main modal
    manualSelectedPlayersContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.selected-player-chip');
        if (chip) {
            handleRemoveManualPlayer(chip.dataset.playerName);
        }
    });

    // Listener for removing a player from the "Selected" area in the outside player modal
    outsideSelectedPlayersContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.selected-player-chip');
        if (chip) {
            handleRemoveManualPlayer(chip.dataset.playerName);
        }
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
        // Determine which modal is active
        const isNumericKeypadActive = !customKeypadModal.classList.contains('hidden');
        const isAlphaKeypadActive = !customAlphaKeypadModal.classList.contains('hidden');
        const isGlobalKeyboardActive = !globalKeyboardModal.classList.contains('hidden'); // <-- NEW CHECK

        // First, check if the numeric keypad is active
        if (isNumericKeypadActive) {
            e.preventDefault();
            // ... (numeric keypad logic remains the same) ...
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

            if (targetButton && !targetButton.disabled) {
                targetButton.click();
            }

        }
        // Otherwise, check if the alphabetic keypad is active
        else if (isAlphaKeypadActive) {
            e.preventDefault();
            // ... (alpha keypad logic remains the same) ...
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

            if (targetButton && !targetButton.disabled) {
                targetButton.click();
            }
        }

    // --- REVISED BLOCK for Global Keyboard (Direct Input - Refined Shift) ---
        else if (isGlobalKeyboardActive) {
            e.preventDefault(); // Prevent default typing behavior

            const key = e.key;
            const code = e.code; // Use e.code for more reliable layout-independent key identification
            const isShiftPressed = e.shiftKey;
            let characterToInsert = null;
            let actionToPerform = null;

            // --- 1. Determine Character or Action ---

            // Handle letters first (respecting physical shift)
            if (code.startsWith('Key') && key.length === 1 && key.match(/[a-zA-Z]/i)) {
                 characterToInsert = isShiftPressed ? key.toUpperCase() : key.toLowerCase();
            }
            // Handle specific action keys by code
            else if (code === 'Backspace') { actionToPerform = 'BACK'; }
            else if (code === 'Enter')     { actionToPerform = 'ENTER'; }
            else if (code === 'Space')     { actionToPerform = 'SPACE'; }
            else if (code === 'ShiftLeft' || code === 'ShiftRight') { actionToPerform = 'SHIFT'; }
            // Handle Tab, Escape, etc. by code if needed

            // Handle numbers and symbols (PRIORITIZE direct key value if it's a symbol)
            else if (key.length === 1 && !key.match(/[a-zA-Z]/i)) { // Check if e.key itself is a non-letter single character
                 // Check if it's a standard symbol first
                 const standardSymbols = "!@#$%^&*()_+{}|:\"<>?~`-=[]\\;',./";
                 if (standardSymbols.includes(key)) {
                     characterToInsert = key; // Use the symbol directly reported by e.key
                 }
                 // If it wasn't a direct symbol, check if it's a non-shifted number
                 else if (key >= '0' && key <= '9' && !isShiftPressed) {
                     characterToInsert = key;
                 }
                 // Add specific fallbacks if e.key *doesn't* report the symbol directly with Shift
                 // (This part might be less necessary now but kept as a backup)
                 else if (isShiftPressed) {
                     switch (code) { // Use e.code for shift+number mapping
                         case 'Digit1': characterToInsert = '!'; break;
                         case 'Digit2': characterToInsert = '@'; break;
                         case 'Digit3': characterToInsert = '#'; break;
                         case 'Digit4': characterToInsert = '$'; break;
                         case 'Digit5': characterToInsert = '%'; break;
                         case 'Digit6': characterToInsert = '^'; break;
                         case 'Digit7': characterToInsert = '&'; break;
                         case 'Digit8': characterToInsert = '*'; break;
                         case 'Digit9': characterToInsert = '('; break;
                         case 'Digit0': characterToInsert = ')'; break;
                         case 'Minus': characterToInsert = '_'; break;
                         case 'Equal': characterToInsert = '+'; break;
                         // ... other shift+symbol mappings using e.code if needed ...
                     }
                 } else { // Non-shifted symbols based on e.code if e.key didn't match
                     switch (code) {
                         case 'Minus': characterToInsert = '-'; break;
                         case 'Equal': characterToInsert = '='; break;
                         case 'BracketLeft': characterToInsert = '['; break;
                         case 'BracketRight': characterToInsert = ']'; break;
                         case 'Backslash': characterToInsert = '\\'; break;
                         case 'Semicolon': characterToInsert = ';'; break;
                         case 'Quote': characterToInsert = '\''; break;
                         case 'Comma': characterToInsert = ','; break;
                         case 'Period': characterToInsert = '.'; break;
                         case 'Slash': characterToInsert = '/'; break;
                         case 'Backquote': characterToInsert = '`'; break;
                     }
                 }
            } // End of single character key handling


            // --- 2. Handle Navigation Keys (Use button clicks for page changes) ---
            // (Navigation logic remains the same - finding button by text content)
            const navKeyMap = {
                // 'ArrowRight': '!@#', // Example
                // 'ArrowLeft': 'ABC',   // Example
            };
            if (navKeyMap[key] || navKeyMap[code]) { // Check both key and code for nav
                 actionToPerform = navKeyMap[key] || navKeyMap[code];
                 characterToInsert = null;
            }

            // --- 3. Perform Action or Insert Character ---
            let currentValue = globalKeyboardDisplay.textContent;

            if (characterToInsert !== null) {
                currentValue += characterToInsert;
                 if (globalKeyboardState.case === 'shift') {
                    globalKeyboardState.case = 'lower';
                    if (globalKeyboardState.currentPage === 'LetterPad') {
                        renderGlobalKeyboard();
                    }
                 }
            } else if (actionToPerform) {
                let targetButton;

                switch (actionToPerform) {
                    case 'SPACE': currentValue += ' '; break;
                    case 'BACK': currentValue = currentValue.slice(0, -1); break;
                    case 'ENTER':
                        currentValue += '\n';
                        targetButton = globalKeyboardModal.querySelector('.global-keypad-btn[data-key="ENTER"]');
                        break;
                    case 'SHIFT':
                        targetButton = globalKeyboardModal.querySelector('.global-keypad-btn[data-key="SHIFT"]');
                        break;
                    case '?123': case 'ABC': case '1234': case '!@#':
                         targetButton = Array.from(globalKeyboardModal.querySelectorAll('.global-keypad-btn.key-special'))
                                             .find(btn => btn.textContent.trim() === actionToPerform);
                        break;
                }

                if (targetButton && !targetButton.disabled) {
                    targetButton.click();
                }
            }

            // --- 4. Update Display and Input ---
            if (characterToInsert !== null || ['SPACE', 'BACK', 'ENTER'].includes(actionToPerform)) {
                globalKeyboardDisplay.textContent = currentValue;
                if (activeGlobalInput) {
                    activeGlobalInput.value = currentValue;
                    activeGlobalInput.dispatchEvent(new Event('input'));
                }
                globalKeyboardDisplay.scrollTop = globalKeyboardDisplay.scrollHeight;
            }
        }
        // --- END REVISED BLOCK ---
    });



    // --- START OF NEW VISIBILITY CHANGE LOGIC ---
    document.addEventListener('visibilitychange', () => {
        // Check if the page has become visible
        if (document.visibilityState === 'visible') {
            // Re-run the function that applies the court selection animations
            ensureCourtSelectionAnimation();
        }
    });
    // --- END OF NEW VISIBILITY CHANGE LOGIC ---



    function getTeamKeyFromElement(item) {
        const teamNameSpan = item.querySelector('.team-name-stacked');
        if (teamNameSpan) {
            const playerSpans = teamNameSpan.querySelectorAll('span');
            const players = Array.from(playerSpans).map(span => span.textContent.trim());
            return players.sort().join(' & ');
        }
        return item.dataset.name; // Fallback to data attribute
    }

    // --- NEW: COMPARISON MODAL LISTENERS (Event Delegation) ---
    function handleHistoryItemClick(e) {
        const item = e.target.closest('.history-item');
        if (!item || e.target.closest('.sort-btn') || e.target.closest('.radio-group')) return;
        
        let type = item.dataset.type;
        let name = item.dataset.name;
        
        // If no dataset, determine from current view
        if (!type) {
            if (state.historyViewMode === 'teams') {
                type = 'team';
                name = getTeamKeyFromElement(item); // Use helper
            } else if (state.historyViewMode === 'stats') {
                type = 'player';
                const nameSpan = item.querySelector('.stats-grid-row span:first-child');
                if (nameSpan) name = nameSpan.textContent.trim();
            }
        }
        
        if (!name || !type) return;

        if (state.comparison.active && state.comparison.type !== type) {
            resetComparisonState();
        }

        state.comparison.active = true;
        state.comparison.type = type;

        const itemIndex = state.comparison.items.indexOf(name);
        if (itemIndex > -1) {
            state.comparison.items.splice(itemIndex, 1);
        } else if (state.comparison.items.length < 2) {
            state.comparison.items.push(name);
        }

        if (state.comparison.items.length === 1) {
            const selectedName = state.comparison.items[0];
            const opponents = new Set();
            
            state.gameHistory.forEach(game => {
                const team1Players = game.teams.team1;
                const team2Players = game.teams.team2;

                if (type === 'player') {
                    const isOnTeam1 = team1Players.includes(selectedName);
                    const isOnTeam2 = team2Players.includes(selectedName);
                    if (isOnTeam1) {
                        team2Players.forEach(p => opponents.add(p));
                    } else if (isOnTeam2) {
                        team1Players.forEach(p => opponents.add(p));
                    }
                } else {
                    const team1Key = [...team1Players].sort().join(' & ');
                    const team2Key = [...team2Players].sort().join(' & ');
                    if (team1Key === selectedName) {
                        opponents.add(team2Key);
                    } else if (team2Key === selectedName) {
                        opponents.add(team1Key);
                    }
                }
            });
            state.comparison.opponents = opponents;
        } else if (state.comparison.items.length === 0) {
            resetComparisonState();
        }
        
        if (type === 'player') renderPlayerHistory();
        else renderTeamHistory();
        
        saveState(); // Add this

        if (state.comparison.items.length === 2) {
            renderComparisonModal();
        }
    }

    // Replace with a single delegated listener on the parent container:
    historyPage.addEventListener('click', (e) => {
        // Check if click is within either stats list
        const historyItem = e.target.closest('#history-list .history-item, #team-history-list .history-item');
        if (!historyItem) return;
        
        // Prevent action on sort buttons
        if (e.target.closest('.sort-btn') || e.target.closest('.radio-group')) return;
        
        handleHistoryItemClick(e);
    });

    comparisonCloseBtn.addEventListener('click', () => {
        comparisonModal.classList.add('hidden');
        historyPage.classList.remove('hidden');
        resetComparisonState();
        resetStatsFilters();
        renderHistory(); // This will render based on current state.historyViewMode
        saveState(); // Add this to persist the state
    });

    // --- SUGGESTION SETTINGS MODAL LISTENERS ---
    suggestionSettingsBtn.addEventListener('click', showSuggestionSettingsModal);
    suggestionSettingsCloseBtn.addEventListener('click', () => {
        suggestionSettingsModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden'); // Return to main admin modal
    });

    femaleRatioSlider.addEventListener('input', handleFemaleRatioChange);
    maleRatioSlider.addEventListener('input', handleMaleRatioChange);
    leastPlaytimeToggle.addEventListener('change', handleLeastPlaytimeToggleChange);
    powerScoreOnlyToggle.addEventListener('change', handlePowerScoreOnlyToggleChange);

    topPlayerSlider.addEventListener('input', handleTopPlayerChange);
    frequentOpponentSlider.addEventListener('input', handleFrequentOpponentChange);
    weakPlayerSlider.addEventListener('input', handleWeakPlayerChange);

    // --- ADMIN CHECKLIST MODAL LISTENERS ---
    checklistBtn.addEventListener('click', showChecklistModal);

    checklistCloseBtn.addEventListener('click', () => {
        checklistModal.classList.add('hidden');
        adminSettingsModal.classList.remove('hidden'); // Return to admin modal
    });

    // Use event delegation for checkboxes
    checklistContent.addEventListener('change', handleChecklistChange); // Target the new container

    // --- CHECKLIST HISTORY LISTENERS ---
    // --- ADD THIS LISTENER ---
    checklistHistoryBtn.addEventListener('click', showChecklistHistoryModal);
    // --- END ADD ---

    checklistHistoryCloseBtn.addEventListener('click', () => {
        checklistHistoryModal.classList.add('hidden');
        // Decide where to return: main checklist or admin settings
        if (!checklistModal.classList.contains('hidden')) {
             // If main checklist is open, stay there
        } else {
             adminSettingsModal.classList.remove('hidden'); // Default return to admin
        }
        state.selectedChecklistHistoryDate = null; // Clear selected date
    });

    // Delegate clicks within the history date list
    checklistHistoryList.addEventListener('click', (e) => {
        const li = e.target.closest('li[data-date]');
        if (li) {
            showChecklistHistoryDetail(li.dataset.date);
        }
    });

    // Back button in the detail view
    checklistHistoryBackBtn.addEventListener('click', () => {
        checklistHistoryDetailView.classList.add('hidden');
        checklistHistoryListView.classList.remove('hidden');
        checklistHistoryBackBtn.classList.add('hidden'); // Hide back button again
        checklistHistoryTitle.textContent = 'Checklist History'; // Reset title
        state.selectedChecklistHistoryDate = null; // Clear selected date
    });

    // Listener to close the Global Keyboard when clicking outside (or on the DONE button if we add one)
    globalKeyboardModal.addEventListener('click', (e) => {
        // Only hide if the click is directly on the modal background/content, not a key
        if (!e.target.closest('.global-keypad-btn') && !e.target.closest('.keyboard-content')) {
            hideGlobalKeyboard();
        }
    });

    // --- NEW: Wire Date Inputs to Global Keyboard (NumberPad on Click) ---
    const eventDateInput = document.getElementById('event-date');
    const eventRsvpDateInput = document.getElementById('event-rsvp-date');
    const eventStartTimeInput = document.getElementById('event-start-time');

    const dateInputClickListener = (e) => {
        const targetInputElement = e.target;
        
        // Check if click was on the calendar/clock icon
        // These icons are positioned on the right side of the input
        const inputRect = targetInputElement.getBoundingClientRect();
        const clickX = e.clientX;
        const iconWidth = 30; // Approximate width of the icon area
        const isIconClick = (clickX > inputRect.right - iconWidth);
        
        // If icon was clicked, allow native picker
        if (isIconClick) {
            // Don't prevent default - let the native picker open
            return;
        }
        
        // Otherwise, prevent native picker and show custom keypad
        e.preventDefault();

        // Add class to indicate using custom keypad
        targetInputElement.classList.add('using-custom-keypad');
        
        // Get the overlay element
        const overlayId = targetInputElement.id + '-overlay';
        const overlay = document.getElementById(overlayId);
        if (overlay) {
            targetInputElement.dataset.overlayId = overlayId;
        }
        
        // Initialize date part tracking (start with YYYY)
        if (targetInputElement.type === 'date') {
            targetInputElement.dataset.currentDatePart = 'YYYY';
            targetInputElement.dataset.partialValue = '';
        } else if (targetInputElement.type === 'time') {
            targetInputElement.dataset.currentDatePart = 'HH';
            targetInputElement.dataset.partialValue = '';
        }
        
        // Don't pre-fill keypad display, let user type directly into date input
        const initialKeypadValue = ''; // Start keypad display empty

        // Show keypad, passing the *target* date input
        showGlobalKeyboard(targetInputElement, 'NumberPad', initialKeypadValue); // Pass empty initial value
    };

    if (eventDateInput) {
        eventDateInput.addEventListener('click', dateInputClickListener);
    }
    if (eventRsvpDateInput) {
        eventRsvpDateInput.addEventListener('click', dateInputClickListener);
    }
    if (eventStartTimeInput) {
        eventStartTimeInput.addEventListener('click', dateInputClickListener);
    }
    // --- END NEW ---

    // --- Parent Registration Field Listeners ---
    if (parentNameInput) {
        parentNameInput.addEventListener('click', (e) => {
            showGlobalKeyboard(e.target, 'LetterPad', '');
        });
    }
    
    if (parentSurnameInput) {
        parentSurnameInput.addEventListener('click', (e) => {
            showGlobalKeyboard(e.target, 'LetterPad', '');
        });
    }
    
    if (parentPhoneInput) {
        parentPhoneInput.addEventListener('click', (e) => {
            showGlobalKeyboard(e.target, 'NumberPad', '');
        });
    }
    
    if (parentEmailInput) {
        parentEmailInput.addEventListener('click', (e) => {
            showGlobalKeyboard(e.target, 'LetterPad', '');
        });
    }

    // Swap Player Modal Listeners
    document.getElementById('swap-player-back-btn').addEventListener('click', () => {
        document.getElementById('swap-player-modal').classList.add('hidden');
        manageCourtPlayersModal.classList.remove('hidden');
    });

    document.getElementById('swap-confirm-back-btn').addEventListener('click', () => {
        document.getElementById('swap-confirm-modal').classList.add('hidden');
        document.getElementById('swap-player-modal').classList.remove('hidden');
    });

    document.getElementById('swap-confirm-execute-btn').addEventListener('click', () => {
        executePlayerSwap();
    });


    // --- NEW EVENT LISTENERS FOR TTS INTERVAL ---
    document.getElementById('tts-interval-increase').addEventListener('click', () => handleTtsIntervalChange('increase'));
    document.getElementById('tts-interval-decrease').addEventListener('click', () => handleTtsIntervalChange('decrease'));

    // --- Event Listeners for Consolidated Light Settings Modal ---
    // Court settings modal buttons
    document.getElementById('light-settings-court-cancel-btn')?.addEventListener('click', () => {
        document.getElementById('light-settings-court-modal').classList.add('hidden');
        showAdminModal(); // Re-show admin modal
    });
    document.getElementById('light-settings-court-save-btn')?.addEventListener('click', saveLightSettingsCourtModal);

    // ============================================================================
    // EVENT LISTENERS - Add these in your DOMContentLoaded section
    // ============================================================================

    // Setup long-press for both gate buttons
    setupGateButtonLongPress('pedestrian');
    setupGateButtonLongPress('parking');

    // Pedestrian gate settings modal
    document.getElementById('pedestrian-gate-settings-save-btn')?.addEventListener('click', () => {
        saveGateSettings('pedestrian');
    });

    document.getElementById('pedestrian-gate-settings-cancel-btn')?.addEventListener('click', () => {
        document.getElementById('pedestrian-gate-settings-modal').classList.add('hidden');
    });

    // Parking gate settings modal
    document.getElementById('parking-gate-settings-save-btn')?.addEventListener('click', () => {
        saveGateSettings('parking');
    });

    document.getElementById('parking-gate-settings-cancel-btn')?.addEventListener('click', () => {
        document.getElementById('parking-gate-settings-modal').classList.add('hidden');
    });


});