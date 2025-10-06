document.addEventListener('DOMContentLoaded', () => {
    
    // --- STATE MANAGEMENT ---
    let state = {
        clubMembers: [
            "Rosco Dredge", "Claire Dredge", "Karla Agenbag", "Justin Hammann", "Carin Venter", 
            "Ivan Erasmus", "Reece Erasmus", "Jan Erasmus", "Lusanda Chirwa", "Simon Smith", 
            "Peter Jones", "Mary Jane", "John Doe", "Sarah Connor", "Mike Williams", 
            "Linda Green", "Tom Harris", "Patricia King", "David Wright", "Susan Hill"
        ].sort(),
        availablePlayers: [],
        courts: [
            { id: 'A', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null },
            { id: 'B', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null },
            { id: 'C', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null },
            { id: 'D', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null },
            { id: 'E', status: 'available', players: [], teams: { team1: [], team2: [] }, autoStartTimer: null, gameMode: null, gameStartTime: null, autoStartTimeTarget: null },
        ],
        selection: {
            gameMode: 'doubles',
            players: [],
            courtId: null
        },
        gameHistory: []
    };

    // --- DOM ELEMENTS ---
    const headerClock = document.getElementById('header-clock');
    const availablePlayersSection = document.getElementById('availablePlayersSection');
    const availablePlayersList = document.getElementById('availablePlayersList');
    const courtGrid = document.getElementById('court-grid');
    const infoBar = document.getElementById('info-bar');
    const infoBarText = document.getElementById('info-bar-text');
    const infoBarBtnConfirm = document.getElementById('info-bar-btn-confirm');
    const infoBarBtnCancel = document.getElementById('info-bar-btn-cancel');
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
    const checkOutCancelBtn = document.getElementById('check-out-cancel-btn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    const historyBtn = document.getElementById('historyBtn');
    const historyPage = document.getElementById('history-page');
    const historyList = document.getElementById('history-list');
    const historyCloseBtn = document.getElementById('history-close-btn');
    const endGameModal = document.getElementById('end-game-modal');
    const endGameTeams = document.getElementById('end-game-teams');
    const team1ScoreInput = document.getElementById('team1-score');
    const team2ScoreInput = document.getElementById('team2-score');
    const endGameConfirmBtn = document.getElementById('end-game-confirm-btn');
    const endGameCancelBtn = document.getElementById('end-game-cancel-btn');
    const tieBreakerArea = document.getElementById('tie-breaker-area');
    const team1TiebreakInput = document.getElementById('team1-tiebreak');
    const team2TiebreakInput = document.getElementById('team2-tiebreak');

    // --- RENDER FUNCTION ---
    function render() {
        // ... (This function is unchanged, but included for completeness)
    }

    // --- HELPER to create a court card's HTML ---
    function createCourtCard(court) {
        const isSelectable = state.selection.players.length > 0 && court.status === 'available';
        const isSelected = court.id === state.selection.courtId;
        
        const courtCard = document.createElement('div');
        courtCard.className = `court-card status-${court.status} ${isSelectable ? 'selectable' : ''} ${isSelected ? 'selected' : ''}`;
        courtCard.dataset.courtId = court.id;
        
        let actionsHTML = '';
        if (court.status === 'selecting_teams' || court.status === 'game_pending' || court.status === 'in_progress') {
            let buttons = '';
            if (court.status === 'selecting_teams') {
                buttons = `<button class="action-btn randomize-btn">Randomize</button><button class="action-btn choose-teams-btn">Choose Teams</button>`;
            } else if (court.status === 'game_pending') {
                buttons = `<button class="action-btn start-game-btn">Start Game</button>`;
            } else if (court.status === 'in_progress') {
                buttons = `<button class="action-btn end-game-btn">End Game</button>`;
            }
            actionsHTML = `<div class="court-actions">${buttons}</div>`;
        }
        
        let cancelBtnHTML = '';
        if (court.status !== 'available') {
            cancelBtnHTML = `<button class="cancel-game-btn" title="Cancel Game">X</button>`;
        }

        let timerHTML = '';
        if (court.status === 'in_progress' || court.status === 'game_pending') {
            timerHTML = `<span class="game-timer" id="timer-${court.id}">00:00</span>`;
        }
        
        const formatName = (name) => name ? name.split(' ').join('<br>') : '';
        let playerSpotsHTML = '';
        if (court.gameMode === 'singles') {
            playerSpotsHTML = `
                <div class="player-spot single-player"><span>${formatName(court.teams.team1 ? court.teams.team1[0] : '')}</span></div>
                <div class="player-spot single-player"><span>${formatName(court.teams.team2 ? court.teams.team2[0] : '')}</span></div>
            `;
        } else {
            playerSpotsHTML = `
                <div class="player-spot" data-player-pos="top-left"><span>${formatName(court.teams.team1 ? court.teams.team1[0] : '')}</span></div>
                <div class="player-spot" data-player-pos="top-right"><span>${formatName(court.teams.team1 ? court.teams.team1[1] : '')}</span></div>
                <div class="player-spot" data-player-pos="bottom-left"><span>${formatName(court.teams.team2 ? court.teams.team2[0] : '')}</span></div>
                <div class="player-spot" data-player-pos="bottom-right"><span>${formatName(court.teams.team2 ? court.teams.team2[1] : '')}</span></div>
            `;
        }
        
        courtCard.innerHTML = `
            <div class="card-header">
                <h3>Court ${court.id}</h3>
                <div class="header-controls">
                    ${cancelBtnHTML}
                    ${timerHTML}
                    <span class="status-tag">${court.status.replace(/_/g, ' ')}</span>
                </div>
            </div>
            <div class="court-actions-bar">
                ${actionsHTML}
            </div>
            <div class="card-body">
                <div class="court-inner">
                    <div class="center-service-line"></div>
                    ${playerSpotsHTML}
                </div>
            </div>`;
        return courtCard;
    }
    
    // --- EVENT HANDLERS & LOGIC FUNCTIONS ---
    // ... (All other functions are unchanged, but included for completeness)
    
    // --- INITIALIZATION ---
    loadState();
    render();
    setInterval(() => {
        updateTimers();
        updateHeaderClock();
    }, 1000);
    
    
    // NOTE: All other functions are included below for completeness
    
    function render(){if(state.availablePlayers.length<4&&"singles"!==state.selection.gameMode&&(state.selection.gameMode="singles",state.selection.players.length>2&&(state.selection.players=[],state.selection.courtId=null)));const{gameMode:e,players:t,courtId:a}=state.selection,l="doubles"===e?4:2;if(availablePlayersList.innerHTML="",0===state.availablePlayers.length&&0===t.length){const e=document.createElement("li");e.className="waiting-message",totalPlayersAtClub()>0?e.textContent="All players are on court.":e.textContent="Waiting For Players To Check In...",availablePlayersList.appendChild(e)}else state.availablePlayers.forEach((e,a)=>{const n=document.createElement("li");n.textContent=e,n.dataset.playerName=e,0===a&&n.classList.add("first-player"),t.includes(e)&&n.classList.add("selected"),(t.length===l&&!t.includes(e)||a>7)&&n.classList.add("disabled"),availablePlayersList.appendChild(n)});if(state.availablePlayers.length>0&&state.availablePlayers.length<4){const e=document.createElement("li");e.textContent="Waiting For More Players...",e.className="waiting-message",availablePlayersList.appendChild(e)}courtGrid.innerHTML="",state.courts.forEach(e=>{const t=createCourtCard(e);courtGrid.appendChild(t)});const n=state.availablePlayers[0],s=state.courts.find(e=>"selecting_teams"===e.status||"game_pending"===e.status),i=l-t.length,o=state.courts.every(e=>"available"!==e.status);if(infoBar.classList.remove("blue-theme","green-theme","yellow-theme","red-theme","hidden"),infoBarBtnConfirm.style.visibility="hidden",infoBarBtnCancel.style.visibility="hidden",s)infoBar.classList.remove("hidden"),infoBar.classList.add("yellow-theme"),"selecting_teams"===s.status?infoBarText.textContent=`Court ${s.id}: Please randomize or choose teams.`:infoBarText.textContent=`Court ${s.id}: Teams are set. Press 'Start Game'.`;else if(t.length>0)infoBar.classList.remove("hidden"),infoBar.classList.add("green-theme"),infoBarBtnCancel.style.visibility="visible",i>0?infoBarText.textContent=`Please select ${i} more player(s).`:(infoBarText.textContent=a?`Court ${a} selected. Press Confirm.`:"Please select an available court.",infoBarBtnConfirm.style.visibility="visible",infoBarBtnConfirm.disabled=!a);else 0===state.availablePlayers.length? (infoBar.classList.remove("hidden"),infoBar.classList.add("red-theme"),totalPlayersAtClub()>0?infoBarText.textContent="All players are on court. Please wait.":infoBarText.textContent="Waiting For Players To Check In..."):o?(infoBar.classList.remove("hidden"),infoBar.classList.add("red-theme"),infoBarText.textContent="All courts are in use. Please wait for a court to become available."):totalPlayersAtClub()<2?(infoBar.classList.remove("hidden"),infoBar.classList.add("red-theme"),infoBarText.textContent="Waiting For More Players To Check In..."):state.availablePlayers.length>0?(infoBar.classList.remove("hidden"),infoBar.classList.add("green-theme"),infoBarText.textContent=`${n}, please select a game mode and players.`):infoBar.classList.add("hidden");modeDoublesBtn.classList.toggle("active","doubles"===e),modeSinglesBtn.classList.toggle("active","singles"===e),modeDoublesBtn.disabled=state.availablePlayers.length<4,availablePlayersSection.classList.toggle("locked",!!s||0===t.length&&o)}
    function renderHistory(){historyList.innerHTML="",0===state.gameHistory.length?historyList.innerHTML='<p style="text-align: center; color: #6c757d;">No games have been completed yet.</p>':([...state.gameHistory].reverse().forEach(e=>{const t=document.createElement("div");t.className="history-item";const a=e.winner==="team1",l=e.teams.team1.join(" & "),n=e.teams.team2.join(" & ");let s=`${e.score.team1} - ${e.score.team2}`;null!==e.score.tiebreak1&&(s+=` (${e.score.tiebreak1}-${e.score.tiebreak2})`),t.innerHTML=`
                <div class="history-details">
                    <span>Court ${e.court} - ${e.duration}</span>
                    <span>${s}</span>
                </div>
                <div class="history-teams">
                    <p class="${a?"winner":""}">Team 1: ${l}</p>
                    <p class="${a?"":"winner"}">Team 2: ${n}</p>
                </div>
            `,historyList.appendChild(t)}))}
    function totalPlayersAtClub(){let e=state.availablePlayers.length;return state.courts.forEach(t=>{t.players&&(e+=t.players.length)}),e}
    function saveState(){localStorage.setItem("tennisSocialAppState",JSON.stringify(state))}
    function loadState(){const e=localStorage.getItem("tennisSocialAppState");if(e){const t=["Rosco Dredge","Claire Dredge","Karla Agenbag","Justin Hammann","Carin Venter","Ivan Erasmus","Reece Erasmus","Jan Erasmus","Lusanda Chirwa","Simon Smith","Peter Jones","Mary Jane","John Doe","Sarah Connor","Mike Williams","Linda Green","Tom Harris","Patricia King","David Wright","Susan Hill"].sort();state=JSON.parse(e),state.gameHistory=state.gameHistory||[];const a=new Set(state.availablePlayers);state.courts.forEach(e=>{e.players&&e.players.forEach(e=>a.add(e))}),state.clubMembers=t.filter(e=>!a.has(e)),state.courts.forEach(e=>{"game_pending"===e.status&&e.autoStartTimeTarget&&((e.autoStartTimeTarget-Date.now())>0?e.autoStartTimer=setTimeout(()=>handleStartGame(e.id),e.autoStartTimeTarget-Date.now()):handleStartGame(e.id))})}}
    infoBarBtnCancel.addEventListener("click",handleCancelSelection),modeDoublesBtn.addEventListener("click",()=>handleModeChange("doubles")),modeSinglesBtn.addEventListener("click",()=>handleModeChange("singles")),availablePlayersList.addEventListener("click",handlePlayerClick),courtGrid.addEventListener("click",handleCourtGridClick),infoBarBtnConfirm.addEventListener("click",handleConfirmSelection),modalConfirmBtn.addEventListener("click",handleModalConfirm),modalCancelBtn.addEventListener("click",()=>chooseTeamsModal.classList.add("hidden")),modalPlayerList.addEventListener("click",handleModalPlayerClick),historyBtn.addEventListener("click",()=>{renderHistory(),historyPage.classList.remove("hidden")}),historyCloseBtn.addEventListener("click",()=>historyPage.classList.add("hidden")),endGameCancelBtn.addEventListener("click",()=>endGameModal.classList.add("hidden")),endGameConfirmBtn.addEventListener("click",confirmEndGame),team1ScoreInput.addEventListener("input",validateEndGameForm),team2ScoreInput.addEventListener("input",validateEndGameForm),team1TiebreakInput.addEventListener("input",validateEndGameForm),team2TiebreakInput.addEventListener("input",validateEndGameForm);
    function resetConfirmModal(){setTimeout(()=>{cancelConfirmModal.querySelector("h3").textContent="Confirm Action",cancelConfirmModal.querySelector("p").textContent="Are you sure?",modalBtnYesConfirm.textContent="Yes"},300)}
    modalBtnNo.addEventListener("click",()=>{cancelConfirmModal.classList.add("hidden"),resetConfirmModal()}),modalBtnYesConfirm.addEventListener("click",()=>{"checkOutPlayer"===cancelConfirmModal.dataset.mode?executePlayerCheckOut():"checkInPlayer"===cancelConfirmModal.dataset.mode?executePlayerCheckIn():executeGameCancellation(),resetConfirmModal()});
    checkInBtn.addEventListener("click",()=>{populateCheckInModal(),checkInModal.classList.remove("hidden")}),checkInCancelBtn.addEventListener("click",()=>checkInModal.classList.add("hidden")),checkInList.addEventListener("click",e=>{if(e.target.classList.contains("add")){const t=e.target.dataset.player;cancelConfirmModal.querySelector("h3").textContent="Confirm Check In",cancelConfirmModal.querySelector("p").textContent=`Are you sure you want to check in ${t}?`,modalBtnYesConfirm.textContent="Yes, Check In",cancelConfirmModal.dataset.mode="checkInPlayer",cancelConfirmModal.dataset.player=t,cancelConfirmModal.classList.remove("hidden"),checkInModal.classList.add("hidden")}}),checkOutBtn.addEventListener("click",()=>{populateCheckOutModal(),checkOutModal.classList.remove("hidden")}),checkOutCancelBtn.addEventListener("click",()=>checkOutModal.classList.add("hidden")),checkOutList.addEventListener("click",e=>{if(e.target.classList.contains("remove")){const t=e.target.dataset.player;cancelConfirmModal.querySelector("h3").textContent="Confirm Check Out",cancelConfirmModal.querySelector("p").textContent=`Are you sure you want to check out ${t}?`,modalBtnYesConfirm.textContent="Yes, Check Out",cancelConfirmModal.dataset.mode="checkOutPlayer",cancelConfirmModal.dataset.player=t,cancelConfirmModal.classList.remove("hidden"),checkOutModal.classList.add("hidden")}});
    function populateCheckInModal(){if(checkInList.innerHTML="",0===state.clubMembers.length){const e=document.createElement("li");e.textContent="All club members are currently checked in.",e.style.justifyContent="center",checkInList.appendChild(e)}else state.clubMembers.forEach(e=>{const t=document.createElement("li");t.innerHTML=`<span>${e}</span><span class="action-icon add" data-player="${e}">+</span>`,checkInList.appendChild(t)})}
    function populateCheckOutModal(){if(checkOutList.innerHTML="",0===state.availablePlayers.length){const e=document.createElement("li");e.textContent="There are no players currently checked in.",e.style.justifyContent="center",checkOutList.appendChild(e)}else state.availablePlayers.forEach(e=>{const t=document.createElement("li");t.innerHTML=`<span>${e}</span><span class="action-icon remove" data-player="${e}">&times;</span>`,checkOutList.appendChild(t)})}
    function handleCancelSelection(){state.selection.players=[],state.selection.courtId=null,render(),saveState()}
    function handleModeChange(e){state.selection.gameMode=e,state.selection.players=[],state.selection.courtId=null,render(),saveState()}
    function handlePlayerClick(e){const t=e.target.closest("li");if(!t||t.classList.contains("disabled")||t.classList.contains("waiting-message")||0===state.availablePlayers.length)return;const a=t.dataset.playerName,l=state.availablePlayers[0],{players:n,gameMode:s}=state.selection;0===n.length?a!==l&&n.push(l,a):a!==l&&(n.indexOf(a)>-1?(n.splice(n.indexOf(a),1),1===n.length&&(state.selection.players=[])):n.length<(s==="doubles"?4:2)&&n.push(a)),render(),saveState()}
    function handleCourtGridClick(e){const t=e.target.closest(".court-card");if(!t)return;const a=t.dataset.courtId,{gameMode:l,players:n}=state.selection;t.classList.contains("selectable")&&n.length===("doubles"===l?4:2)?(state.selection.courtId=a,render(),saveState()):e.target.classList.contains("randomize-btn")?handleRandomizeTeams(a):e.target.classList.contains("choose-teams-btn")?handleChooseTeams(a):e.target.classList.contains("start-game-btn")?handleStartGame(a):e.target.classList.contains("end-game-btn")?handleEndGame(a):e.target.classList.contains("cancel-game-btn")&&handleCancelGame(a)}
    function handleConfirmSelection(){const{players:e,courtId:t,gameMode:a}=state.selection,l="doubles"===a?4:2;if(e.length!==l||!t)return;const n=state.courts.find(e=>e.id===t);n.players=[...e],n.gameMode=a,"doubles"===a?n.status="selecting_teams":(n.teams.team1=[e[0]],n.teams.team2=[e[1]],n.status="game_pending",n.autoStartTimeTarget=Date.now()+6e4,n.autoStartTimer=setTimeout(()=>handleStartGame(t),6e4)),state.availablePlayers=state.availablePlayers.filter(t=>!e.includes(t)),state.selection={gameMode:state.selection.gameMode,players:[],courtId:null},render(),saveState()}
    function handleRandomizeTeams(e){const t=state.courts.find(t=>t.id===e);let a=[...t.players].sort(()=>.5-Math.random());t.teams.team1=[a[0],a[1]],t.teams.team2=[a[2],a[3]],t.status="game_pending",t.autoStartTimeTarget=Date.now()+6e4,t.autoStartTimer=setTimeout(()=>handleStartGame(e),6e4),render(),saveState()}
    function handleChooseTeams(e){chooseTeamsModal.classList.remove("hidden"),modalPlayerList.innerHTML="";const t=state.courts.find(t=>t.id===e);t.players.forEach(e=>{const t=document.createElement("div");t.className="modal-player",t.textContent=e,t.dataset.player=e,modalPlayerList.appendChild(t)}),chooseTeamsModal.dataset.courtId=e}
    function handleModalPlayerClick(e){if(e.target.classList.contains("modal-player")){const t=modalPlayerList.querySelectorAll(".selected").length;e.target.classList.contains("selected")?e.target.classList.remove("selected"):t<2&&e.target.classList.add("selected")}}
    function handleModalConfirm(){const e=chooseTeamsModal.dataset.courtId,t=state.courts.find(t=>t.id===e),a=Array.from(modalPlayerList.querySelectorAll(".selected")).map(e=>e.dataset.player);2===a.length?(t.teams.team1=a,t.teams.team2=t.players.filter(e=>!a.includes(e)),t.status="game_pending",chooseTeamsModal.classList.add("hidden"),t.autoStartTimeTarget=Date.now()+6e4,t.autoStartTimer=setTimeout(()=>handleStartGame(e),6e4),render(),saveState()):alert("Please select exactly 2 players for Team 1.")}
    function handleStartGame(e){const t=state.courts.find(t=>t.id===e);t.autoStartTimer&&(clearTimeout(t.autoStartTimer),t.autoStartTimer=null),t.status="in_progress",t.gameStartTime=Date.now(),t.autoStartTimeTarget=null,render(),saveState()}
    function handleEndGame(e){const t=state.courts.find(t=>t.id===e);t&&(endGameModal.dataset.courtId=e,endGameTeams.innerHTML=`
            <label class="team-selection">
                <input type="radio" name="winner" value="team1">
                <div><strong>Team 1:</strong> ${t.teams.team1.join(" & ")}</div>
            </label>
            <label class="team-selection">
                <input type="radio" name="winner" value="team2">
                <div><strong>Team 2:</strong> ${t.teams.team2.join(" & ")}</div>
            </label>
        `,team1ScoreInput.value="",team2ScoreInput.value="",team1TiebreakInput.value="",team2TiebreakInput.value="",checkTieBreak(),validateEndGameForm(),endGameTeams.querySelectorAll(".team-selection").forEach(e=>{e.onclick=()=>{e.querySelector('input[type="radio"]').checked=!0,endGameTeams.querySelectorAll(".team-selection").forEach(e=>e.classList.remove("winner")),e.classList.add("winner"),validateEndGameForm()}}),endGameModal.classList.remove("hidden"))}
    function handleCancelGame(e){cancelConfirmModal.querySelector("h3").textContent="Confirm Cancellation",cancelConfirmModal.querySelector("p").textContent="Are you sure you want to cancel this game? All players will be returned to the front of the queue.",cancelConfirmModal.dataset.mode="cancelGame",cancelConfirmModal.dataset.courtId=e,cancelConfirmModal.classList.remove("hidden")}
    function executeGameCancellation(){const e=cancelConfirmModal.dataset.courtId;if(!e)return;const t=state.courts.find(t=>t.id===e);t&&(t.autoStartTimer&&clearTimeout(t.autoStartTimer),state.availablePlayers=[...t.players,...state.availablePlayers],t.status="available",t.players=[],t.teams={team1:[],team2:[]},t.gameMode=null,t.autoStartTimer=null,t.gameStartTime=null,t.autoStartTimeTarget=null,cancelConfirmModal.classList.add("hidden"),render(),saveState())}
    function executePlayerCheckOut(){const e=cancelConfirmModal.dataset.player;e&&(state.availablePlayers=state.availablePlayers.filter(t=>t!==e),state.clubMembers.push(e),state.clubMembers.sort(),cancelConfirmModal.classList.add("hidden"),render(),saveState())}
    function executePlayerCheckIn(){const e=cancelConfirmModal.dataset.player;e&&(state.availablePlayers.push(e),state.clubMembers=state.clubMembers.filter(t=>t!==e),cancelConfirmModal.classList.add("hidden"),checkInModal.classList.add("hidden"),render(),saveState())}
    function updateTimers(){updateHeaderClock(),state.courts.forEach(e=>{const t=document.getElementById(`timer-${e.id}`);if(t){if("in_progress"===e.status&&e.gameStartTime){const a=Date.now()-e.gameStartTime,l=Math.floor(a/36e5),n=Math.floor(a%36e5/6e4);t.textContent=`${String(l).padStart(2,"0")}h${String(n).padStart(2,"0")}m`}else if("game_pending"===e.status&&e.autoStartTimeTarget){const a=e.autoStartTimeTarget-Date.now();if(a<0)return void(t.textContent="00:00");const l=Math.floor(a/6e4),n=Math.floor(a%6e4/1e3);t.textContent=`${String(l).padStart(2,"0")}:${String(n).padStart(2,"0")}`}}})}
    function checkTieBreak(){const e=parseInt(team1ScoreInput.value,10),t=parseInt(team2ScoreInput.value,10);tieBreakerArea.classList.toggle("hidden",!(6===e&&6===t)),validateEndGameForm()}
    function validateEndGameForm(){const e=null!=document.querySelector('input[name="winner"]:checked'),t=team1ScoreInput.value,a=team2ScoreInput.value,l=parseInt(t,10),n=parseInt(a,10),s=t!==""&&!isNaN(l)&&a!==""&&!isNaN(n),i=6===l&&6===n;let o=!0;i&&(o=team1TiebreakInput.value!==""&&!isNaN(parseInt(team1TiebreakInput.value,10))&&team2TiebreakInput.value!==""&&!isNaN(parseInt(team2TiebreakInput.value,10))),tieBreakerArea.classList.toggle("hidden",!i),endGameConfirmBtn.disabled=!(e&&s&&o)}
    function confirmEndGame(){const e=endGameModal.dataset.courtId,t=state.courts.find(t=>t.id===e),a=document.querySelector('input[name="winner"]:checked').value,l=parseInt(team1ScoreInput.value,10),n=parseInt(team2ScoreInput.value,10);let s=null,i=null;tieBreakerArea.classList.contains("hidden")||(s=parseInt(team1TiebreakInput.value,10),i=parseInt(team2TiebreakInput.value,10));const o={id:Date.now(),court:t.id,startTime:t.gameStartTime,endTime:Date.now(),duration:document.getElementById(`timer-${t.id}`).textContent,teams:t.teams,score:{team1:l,team2:n,tiebreak1:s,tiebreak2:i},winner:a},r=t.teams[a],c=t.teams["team1"===a?"team2":"team1"];state.gameHistory.push(o),state.availablePlayers=[...r,...c,...state.availablePlayers],t.status="available",t.players=[],t.teams={team1:[],team2:[]},t.gameMode=null,t.gameStartTime=null,endGameModal.classList.add("hidden"),render(),saveState()}
    function updateHeaderClock(){const e=new Date,t=e.toLocaleDateString("en-ZA",{weekday:"long"}),a=e.toLocaleTimeString("en-ZA",{hour:"numeric",minute:"2-digit"});headerClock.textContent=`${t}, ${a}`}
});