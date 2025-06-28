document.addEventListener('DOMContentLoaded', () => {
    const startMessage = 'Click a tile to move it into the empty space if it is adjacent.';
    const messageContainer = document.getElementById('message');
    const infoContainer = document.getElementById('info');
    const puzzleContainer = document.getElementById('puzzle-container');
    const shuffleButton = document.getElementById('shuffle-button');
    const boardSize = 4; // 4x4 grid for 15 puzzle
    let tiles = [];

    let startTime = null;
    let count =0;
    let infomationInterval = null;  

    function init() {
        messageContainer.textContent = startMessage;
        messageContainer.classList.remove('win-message');
        shuffleButton.disabled = false;
        shuffleButton.textContent = 'Shuffle';
        tiles.forEach(tile => tile.removeEventListener('click', moveTile));
       
    }

    function updateInfo() {
        if (infomationInterval) {
            const currentTime = new Date().getTime();
            const elapsedTime = Math.floor((currentTime - startTime) / 1000)            
            infoContainer.textContent = `Time: ${elapsedTime} seconds | Moves: ${count}`;
        }
    }

    function createBoard() {
        if (infomationInterval) {
            clearInterval(infomationInterval);
        }
        messageContainer.textContent = startMessage;
        puzzleContainer.innerHTML = '';
        tiles = [];
        startTime = new Date().getTime();
        count = 0;
        infomationInterval = setInterval(() => {
            updateInfo();
        }, 100);

        let numbers = Array.from({ length: boardSize * boardSize - 1 }, (_, i) => i + 1);
        numbers.push(0); // 0 represents the empty space

        // For testing, a solved state
        // numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];

        numbers.forEach(num => {
            const tile = document.createElement('div');
            tile.classList.add('puzzle-tile');
            if (num === 0) {
                tile.classList.add('empty');
                tile.textContent = '';
            } else {
                tile.textContent = num;
            }
            tile.dataset.value = num;
            tile.addEventListener('click', () => moveTile(tile));
            tiles.push(tile);
            puzzleContainer.appendChild(tile);
        });
        updateGridPosition();
    }

    function updateGridPosition() {
        tiles.forEach(tile => {
            const value = parseInt(tile.dataset.value);
            console.log(`Tile value: ${value}`);
            const targetIndex = tiles.indexOf(tile);
            const row = Math.floor(targetIndex / boardSize);
            const col = targetIndex % boardSize;
            tile.style.gridRowStart = row + 1;
            tile.style.gridColumnStart = col + 1;
        });
    }

    function shuffleTiles() {
        let shuffledNumbers;
        do {
            shuffledNumbers = Array.from({ length: boardSize * boardSize - 1 }, (_, i) => i + 1);
            shuffledNumbers.sort(() => Math.random() - 0.5);
            shuffledNumbers.push(0);
        } while (!isSolvable(shuffledNumbers));

        tiles.forEach((tile, index) => {
            const newValue = shuffledNumbers[index];
            tile.dataset.value = newValue;
            if (newValue === 0) {
                tile.classList.add('empty');
                tile.textContent = '';
            } else {
                tile.classList.remove('empty');
                tile.textContent = newValue;
            }
        });
        updateGridPosition();
    }

    function getInversions(arr) {
        let inversions = 0;
        for (let i = 0; i < arr.length - 1; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                if (arr[i] !== 0 && arr[j] !== 0 && arr[i] > arr[j]) {
                    inversions++;
                }
            }
        }
        return inversions;
    }

    function isSolvable(numbers) {
        const inversions = getInversions(numbers.filter(num => num !== 0));
        const emptyTileRow = Math.floor(numbers.indexOf(0) / boardSize);

        // For an N x N grid:
        // If N is odd, the puzzle is solvable if the number of inversions is even.
        // If N is even, the puzzle is solvable if:
        //   - The empty tile is on an even row (from the bottom, 1-indexed) and inversions are odd.
        //   - The empty tile is on an odd row (from the bottom, 1-indexed) and inversions are even.

        if (boardSize % 2 === 1) { // Odd grid (e.g., 3x3, 5x5)
            return inversions % 2 === 0;
        } else { // Even grid (e.g., 4x4)
            const rowFromBottom = boardSize - emptyTileRow; // 1-indexed from bottom
            if (rowFromBottom % 2 === 1) { // Empty tile on odd row from bottom
                return inversions % 2 === 0;
            } else { // Empty tile on even row from bottom
                return inversions % 2 === 1;
            }
        }
    }

    function moveTile(clickedTile) {
        const clickedIndex = tiles.indexOf(clickedTile);
        const emptyTile = tiles.find(tile => tile.classList.contains('empty'));
        const emptyIndex = tiles.indexOf(emptyTile);

        const clickedRow = Math.floor(clickedIndex / boardSize);
        const clickedCol = clickedIndex % boardSize;
        const emptyRow = Math.floor(emptyIndex / boardSize);
        const emptyCol = emptyIndex % boardSize;

        const isAdjacent = (
            (Math.abs(clickedRow - emptyRow) === 1 && clickedCol === emptyCol) ||
            (Math.abs(clickedCol - emptyCol) === 1 && clickedRow === emptyRow)
        );

        if (isAdjacent) {
            count++;
            // Update the information display
            updateInfo();
            // Swap values and classes
            const clickedValue = clickedTile.dataset.value;
            const emptyValue = emptyTile.dataset.value;

            clickedTile.dataset.value = emptyValue;
            clickedTile.textContent = emptyValue === '0' ? '' : emptyValue;
            clickedTile.classList.add('empty');

            emptyTile.dataset.value = clickedValue;
            emptyTile.textContent = clickedValue;
            emptyTile.classList.remove('empty');

            // Swap elements in the tiles array to reflect new positions
            //[tiles[clickedIndex], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[clickedIndex]];

            updateGridPosition();
            checkWin();
        }
    }

    function checkWin() {
        const currentOrder = tiles.map(tile => parseInt(tile.dataset.value));
        const solvedOrder = Array.from({ length: boardSize * boardSize - 1 }, (_, i) => i + 1);
        solvedOrder.push(0);

        if (JSON.stringify(currentOrder) === JSON.stringify(solvedOrder)) {
            setTimeout(() => drawWin(), 100);
        }
    }

    shuffleButton.addEventListener('click', shuffleTiles);

    function drawWin() {
        if (infomationInterval) {
            clearInterval(infomationInterval);
        }
        messageContainer.textContent = 'Congratulations! You solved the puzzle!';
        messageContainer.classList.add('win-message');
        
        // shuffleButton is change to reset the game
        shuffleButton.textContent = 'Play Again';
        // reset old event listeners
        shuffleButton.removeEventListener('click', shuffleTiles);
        shuffleButton.addEventListener('click', resetGame, { once: true });
        animateWin();
    }

    let animationInterval = null;
    function animateWin() {
        const colors = ['#ff0', '#f00', '#0f0', '#00f', '#ff00ff', '#00ffff'];
        let index = 0;
        animationInterval = setInterval(() => {
            messageContainer.style.color = colors[index % colors.length];
            index++;
            if (index >= colors.length * 2) {
                index = 0; // Reset index after two full cycles
            }
        }, 100);
      
    }

    function resetGame() {
        if (animationInterval) {
            clearInterval(animationInterval);
        }
        messageContainer.classList.remove('win-message');
        messageContainer.textContent = startMessage;
        messageContainer.style.color = 'white';
        infoContainer.textContent = '';
        
        shuffleButton.disabled = false;
        tiles.forEach(tile => tile.addEventListener('click', moveTile));
        
        createBoard();
        shuffleTiles();
        // Reset button change back to shuffle
        shuffleButton.textContent = 'Shuffle';
        shuffleButton.removeEventListener('click', resetGame);
        shuffleButton.addEventListener('click', shuffleTiles);
    }

    // Initial setup
    init();
    createBoard();
    shuffleTiles();
});
