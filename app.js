// Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// DOM Elements
const leaderboardBody = document.getElementById('leaderboardBody');
const searchInput = document.getElementById('searchInput');
const teamFilter = document.getElementById('teamFilter');
const sortFilter = document.getElementById('sortFilter');
const languageToggle = document.getElementById('languageToggle');
const fab = document.getElementById('fab');
const adminBtn = document.getElementById('adminBtn');
const playerModal = document.getElementById('playerModal');
const adminModal = document.getElementById('adminModal');
const closeModal = document.getElementById('closeModal');
const closeAdminModal = document.getElementById('closeAdminModal');
const loginBtn = document.getElementById('loginBtn');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const updatePlayerBtn = document.getElementById('updatePlayerBtn');
const deletePlayerBtn = document.getElementById('deletePlayerBtn');
const adminControls = document.getElementById('adminControls');
const loginSection = document.getElementById('loginSection');

// Global Variables
let players = [];
let currentPlayerId = null;
let isAdmin = false;

// Translations
const translations = {
    en: {
        rank: "Rank",
        player: "Player",
        team: "Team",
        wins: "Wins",
        losses: "Losses",
        winRate: "Win Rate",
        searchPlaceholder: "Search players...",
        allTeams: "All Teams",
        sortRank: "Sort by Rank",
        sortWins: "Sort by Wins",
        sortWinRate: "Sort by Win Rate",
        admin: "Admin",
        login: "Login",
        addPlayer: "Add Player",
        update: "Update",
        delete: "Delete",
        playerName: "Player Name",
        loading: "Loading leaderboard...",
        lastMatch: "Last Match",
        totalMatches: "Total Matches",
        performance: "Performance",
        streak: "Streak",
        viewDetails: "View Details",
        close: "Close"
    },
    ar: {
        rank: "الرتبة",
        player: "اللاعب",
        team: "الفريق",
        wins: "انتصارات",
        losses: "خسائر",
        winRate: "نسبة الفوز",
        searchPlaceholder: "ابحث عن اللاعبين...",
        allTeams: "كل الفرق",
        sortRank: "ترتيب حسب الرتبة",
        sortWins: "ترتيب حسب الانتصارات",
        sortWinRate: "ترتيب حسب نسبة الفوز",
        admin: "مدير",
        login: "تسجيل الدخول",
        addPlayer: "إضافة لاعب",
        update: "تحديث",
        delete: "حذف",
        playerName: "اسم اللاعب",
        loading: "جاري تحميل لوحة الصدارة...",
        lastMatch: "آخر مباراة",
        totalMatches: "إجمالي المباريات",
        performance: "الأداء",
        streak: "سلسلة النتائج",
        viewDetails: "عرض التفاصيل",
        close: "إغلاق"
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadPlayers();
    setupEventListeners();
    checkAdminStatus();
});

// Load Players from Firebase
function loadPlayers() {
    database.ref('players').on('value', (snapshot) => {
        players = [];
        snapshot.forEach((childSnapshot) => {
            const player = childSnapshot.val();
            player.id = childSnapshot.key;
            // Calculate win rate
            player.winRate = player.wins / (player.wins + player.losses) * 100 || 0;
            players.push(player);
        });
        
        // Sort players by wins (descending)
        players.sort((a, b) => b.wins - a.wins);
        
        // Add rank
        players.forEach((player, index) => {
            player.rank = index + 1;
        });
        
        renderLeaderboard();
        updateTeamFilter();
    });
}

// Render Leaderboard
function renderLeaderboard(filteredPlayers = null) {
    const playersToRender = filteredPlayers || players;
    const sortValue = sortFilter.value;
    
    // Sort players
    let sortedPlayers = [...playersToRender];
    if (sortValue === 'wins') {
        sortedPlayers.sort((a, b) => b.wins - a.wins);
    } else if (sortValue === 'winRate') {
        sortedPlayers.sort((a, b) => b.winRate - a.winRate);
    } else {
        sortedPlayers.sort((a, b) => a.rank - b.rank);
    }
    
    leaderboardBody.innerHTML = '';
    
    if (sortedPlayers.length === 0) {
        leaderboardBody.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                <p class="en-lang">No players found</p>
                <p class="ar-lang hidden">لا يوجد لاعبون</p>
            </div>
        `;
        return;
    }
    
    sortedPlayers.forEach(player => {
        const playerRow = document.createElement('div');
        playerRow.className = 'grid grid-cols-12 p-4 items-center player-card cursor-pointer';
        playerRow.dataset.id = player.id;
        
        // Add rank class for top 3 players
        const rankClass = player.rank <= 3 ? `rank-${player.rank}` : '';
        
        playerRow.innerHTML = `
            <div class="col-span-1 font-bold ${rankClass} px-2 py-1 rounded-full text-center">${player.rank}</div>
            <div class="col-span-3 font-medium flex items-center">
                <img src="${player.avatar || 'https://via.placeholder.com/40'}" alt="${player.name}" class="w-8 h-8 rounded-full mr-3">
                ${player.name}
            </div>
            <div class="col-span-2">${player.team || '-'}</div>
            <div class="col-span-1">${player.wins}</div>
            <div class="col-span-1">${player.losses}</div>
            <div class="col-span-2">
                <div class="flex items-center">
                    <span class="mr-2">${player.winRate.toFixed(1)}%</span>
                    <div class="win-rate-bar flex-grow">
                        <div class="win-rate-progress" style="width: ${player.winRate}%"></div>
                    </div>
                </div>
            </div>
        `;
        
        playerRow.addEventListener('click', () => openPlayerModal(player));
        leaderboardBody.appendChild(playerRow);
    });
}

// Update Team Filter Options
function updateTeamFilter() {
    const teams = new Set();
    players.forEach(player => {
        if (player.team) {
            teams.add(player.team);
        }
    });
    
    teamFilter.innerHTML = `
        <option value="">${document.documentElement.lang === 'ar' ? translations.ar.allTeams : translations.en.allTeams}</option>
    `;
    
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamFilter.appendChild(option);
    });
}

// Open Player Modal
function openPlayerModal(player) {
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    modalTitle.textContent = player.name;
    
    modalContent.innerHTML = `
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-sm text-gray-400 en-lang">Rank</h4>
                <h4 class="text-sm text-gray-400 ar-lang hidden">الرتبة</h4>
                <p class="text-2xl font-bold">${player.rank}</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-sm text-gray-400 en-lang">Team</h4>
                <h4 class="text-sm text-gray-400 ar-lang hidden">الفريق</h4>
                <p class="text-2xl font-bold">${player.team || '-'}</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-sm text-gray-400 en-lang">Wins</h4>
                <h4 class="text-sm text-gray-400 ar-lang hidden">انتصارات</h4>
                <p class="text-2xl font-bold">${player.wins}</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-sm text-gray-400 en-lang">Losses</h4>
                <h4 class="text-sm text-gray-400 ar-lang hidden">خسائر</h4>
                <p class="text-2xl font-bold">${player.losses}</p>
            </div>
        </div>
        <div class="mb-4">
            <h4 class="text-sm text-gray-400 en-lang">Win Rate</h4>
            <h4 class="text-sm text-gray-400 ar-lang hidden">نسبة الفوز</h4>
            <div class="flex items-center">
                <div class="win-rate-bar flex-grow">
                    <div class="win-rate-progress" style="width: ${player.winRate}%"></div>
                </div>
                <span class="ml-2">${player.winRate.toFixed(1)}%</span>
            </div>
        </div>
        ${isAdmin ? `
        <button id="editPlayerBtn" class="w-full bg-yellow-600 py-2 rounded-md hover:bg-yellow-500 transition en-lang">
            Edit Player
        </button>
        <button id="editPlayerBtn" class="w-full bg-yellow-600 py-2 rounded-md hover:bg-yellow-500 transition ar-lang hidden">
            تعديل اللاعب
        </button>
        ` : ''}
    `;
    
    if (isAdmin) {
        const editBtn = document.getElementById('editPlayerBtn');
        editBtn.addEventListener('click', () => {
            currentPlayerId = player.id;
            document.getElementById('playerName').value = player.name;
            document.getElementById('playerTeam').value = player.team || '';
            document.getElementById('playerWins').value = player.wins;
            document.getElementById('playerLosses').value = player.losses;
            
            playerModal.classList.add('hidden');
            adminModal.classList.remove('hidden');
            adminControls.classList.remove('hidden');
            loginSection.classList.add('hidden');
            
            addPlayerBtn.classList.add('hidden');
            updatePlayerBtn.classList.remove('hidden');
            deletePlayerBtn.classList.remove('hidden');
        });
    }
    
    playerModal.classList.remove('hidden');
    gsap.from(playerModal.querySelector('div'), { y: 50, opacity: 0, duration: 0.3 });
}

// Setup Event Listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredPlayers = players.filter(player => 
            player.name.toLowerCase().includes(searchTerm)
        );
        renderLeaderboard(filteredPlayers);
    });
    
    // Team filter
    teamFilter.addEventListener('change', () => {
        const team = teamFilter.value;
        if (!team) {
            renderLeaderboard();
            return;
        }
        
        const filteredPlayers = players.filter(player => 
            player.team && player.team.toLowerCase() === team.toLowerCase()
        );
        renderLeaderboard(filteredPlayers);
    });
    
    // Sort filter
    sortFilter.addEventListener('change', () => {
        renderLeaderboard();
    });
    
    // Language toggle
    languageToggle.addEventListener('click', () => {
        const currentLang = document.documentElement.lang;
        const newLang = currentLang === 'en' ? 'ar' : 'en';
        
        document.documentElement.lang = newLang;
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        
        // Apply glitch effect
        const title = document.querySelector('h1');
        title.classList.add('glitch');
        setTimeout(() => {
            title.classList.remove('glitch');
        }, 1000);
        
        // Update form placeholders and labels
        searchInput.placeholder = translations[newLang].searchPlaceholder;
    });
    
    // Modal close buttons
    closeModal.addEventListener('click', () => {
        playerModal.classList.add('hidden');
    });
    
    closeAdminModal.addEventListener('click', () => {
        adminModal.classList.add('hidden');
    });
    
    // FAB click
    fab.addEventListener('click', () => {
        if (isAdmin) {
            currentPlayerId = null;
            document.getElementById('playerName').value = '';
            document.getElementById('playerTeam').value = '';
            document.getElementById('playerWins').value = '0';
            document.getElementById('playerLosses').value = '0';
            
            adminModal.classList.remove('hidden');
            adminControls.classList.remove('hidden');
            loginSection.classList.add('hidden');
            
            addPlayerBtn.classList.remove('hidden');
            updatePlayerBtn.classList.add('hidden');
            deletePlayerBtn.classList.add('hidden');
        } else {
            adminModal.classList.remove('hidden');
            adminControls.classList.add('hidden');
            loginSection.classList.remove('hidden');
        }
    });
    
    // Admin button
    adminBtn.addEventListener('click', () => {
        adminModal.classList.remove('hidden');
        adminControls.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });
    
    // Login button
    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                isAdmin = true;
                adminBtn.classList.remove('hidden');
                adminControls.classList.remove('hidden');
                loginSection.classList.add('hidden');
                
                // Show success message
                alert(document.documentElement.lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully');
            })
            .catch(error => {
                alert(error.message);
            });
    });
    
    // Add player button
    addPlayerBtn.addEventListener('click', () => {
        const name = document.getElementById('playerName').value;
        const team = document.getElementById('playerTeam').value;
        const wins = parseInt(document.getElementById('playerWins').value) || 0;
        const losses = parseInt(document.getElementById('playerLosses').value) || 0;
        
        if (!name) {
            alert(document.documentElement.lang === 'ar' ? 'يرجى إدخال اسم اللاعب' : 'Please enter player name');
            return;
        }
        
        const newPlayer = {
            name,
            team,
            wins,
            losses,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        database.ref('players').push(newPlayer)
            .then(() => {
                adminModal.classList.add('hidden');
                alert(document.documentElement.lang === 'ar' ? 'تمت إضافة اللاعب بنجاح' : 'Player added successfully');
            })
            .catch(error => {
                alert(error.message);
            });
    });
    
    // Update player button
    updatePlayerBtn.addEventListener('click', () => {
        const name = document.getElementById('playerName').value;
        const team = document.getElementById('playerTeam').value;
        const wins = parseInt(document.getElementById('playerWins').value) || 0;
        const losses = parseInt(document.getElementById('playerLosses').value) || 0;
        
        if (!name) {
            alert(document.documentElement.lang === 'ar' ? 'يرجى إدخال اسم اللاعب' : 'Please enter player name');
            return;
        }
        
        const updatedPlayer = {
            name,
            team,
            wins,
            losses,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        database.ref(`players/${currentPlayerId}`).update(updatedPlayer)
            .then(() => {
                adminModal.classList.add('hidden');
                alert(document.documentElement.lang === 'ar' ? 'تم تحديث اللاعب بنجاح' : 'Player updated successfully');
            })
            .catch(error => {
                alert(error.message);
            });
    });
    
    // Delete player button
    deletePlayerBtn.addEventListener('click', () => {
        if (confirm(document.documentElement.lang === 'ar' ? 
            'هل أنت متأكد أنك تريد حذف هذا اللاعب؟' : 
            'Are you sure you want to delete this player?')) {
            database.ref(`players/${currentPlayerId}`).remove()
                .then(() => {
                    adminModal.classList.add('hidden');
                    alert(document.documentElement.lang === 'ar' ? 'تم حذف اللاعب بنجاح' : 'Player deleted successfully');
                })
                .catch(error => {
                    alert(error.message);
                });
        }
    });
}

// Check Admin Status
function checkAdminStatus() {
    auth.onAuthStateChanged(user => {
        if (user) {
            isAdmin = true;
            adminBtn.classList.remove('hidden');
        } else {
            isAdmin = false;
            adminBtn.classList.add('hidden');
        }
    });
}
