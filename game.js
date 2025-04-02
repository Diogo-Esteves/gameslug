// --- Game Setup ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const gameOverOverlay = document.querySelector('.game-over-overlay');
  const restartButton = document.getElementById('restartButton');
  const finalScoreDisplay = document.getElementById('finalScore');
  const startScreen = document.querySelector('.start-screen');
  const startButtonElement = document.querySelector('.start-button');
  const difficultyButtons = document.querySelectorAll('.difficulty-button');
  const toggleSoundButton = document.getElementById('toggleSoundButton');
  const instructionsBox = document.querySelector('.instructions-box'); // Get the instructions box


  let player;
  let enemies = [];
  let bullets = [];
  let score = 0;
  let gameRunning = false;
  let animationId;
  let difficulty = 'medium';  // Default difficulty
  let enemySpawnRate = 1000; // Initial spawn rate
  let playerSpeed = 5;
  let enemySpeed = 2;
  let bulletSpeed = 7;
  let soundEnabled = false;
  let scrolling = {
      x: 0,
      width: 2000, // Example level width
  };

  const backgroundImage = new Image();
  backgroundImage.src = 'content/bg-level1.png'; // Make sure the path is correct
  backgroundImage.onload = () => {
     //Background loaded
  };

  // --- Sound Effects (Tone.js) ---
  const shooterSound = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5 }
  }).toDestination();

  const explosionSound = new Tone.Synth({ // Changed to Tone.Synth
      oscillator: { type: 'square' },       // Using square wave
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.01, release: 0.1 } // Short envelope
  }).toDestination();

  const jumpSound = new Tone.Synth({
      oscillator : {
          type : 'sine'
      },
      envelope : {
          attack : 0.005 ,
          decay : 0.1 ,
          sustain : 0.3 ,
          release : 1
      }
  }).toDestination();

  const gameOverSound = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 10,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: 'exponential' }
  }).toDestination();


  // --- Helper Functions ---

  function random(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // --- Game Object Creation ---

  function createPlayer() {
      const playerWidth = 88; // Example: Increased from 32
      const playerHeight = 88;// Example: Increased from 32

      // --- End Increased Size ---
      const newPlayer = {
          x: 100,
          y: canvas.height - playerHeight - 50, // Start on the ground
          width: playerWidth, // Adjust if your player PNG has different dimensions
          height: playerHeight,// Adjust if your player PNG has different dimensions
          speed: playerSpeed,
          velocityY: 0,
          gravity: 0.5,
          isJumping: false,
          sprite: new Image(),
          direction: 'right',
          health: 3
      };
      // *** Load player sprite ***
      newPlayer.sprite.src = 'content/player.png';
      return newPlayer;
  }

  function createEnemy(x, type = 'basic') {
    let width, height, spriteSrc;
      switch (type) {
        case 'fast':
          width = 100; // Adjust if your PNG is different
          height = 100;// Adjust if your PNG is different
          spriteSrc = 'content/enemy-fast.png';
          break;
        case 'tough':
            width = 100; // Adjust if your PNG is different
            height = 100;// Adjust if your PNG is different
            spriteSrc = 'content/enemy-tough.png';
            break;
        case 'basic':
        default:
          width = 100; // Adjust if your PNG is different
          height = 100;// Adjust if your PNG is different
          spriteSrc = 'content/enemy-basic.png';
          break;
    }
     const newEnemy = {
          x: x,
          y: canvas.height - height, // Adjust Y based on enemy height
          width: width,
          height: height,
          speed: enemySpeed,
          type: type,
          sprite: new Image(),
          health: type === 'tough'? 2: 1,
      };
      // *** Load enemy sprite ***
      newEnemy.sprite.src = spriteSrc;
      return newEnemy;
  }

  function createBullet(x, y, direction, isPlayer = true) {
      // Bullets remain colored shapes for now
      return {
          x: x,
          y: y,
          width: 8,
          height: 8,
          speed: bulletSpeed * direction,
          color: isPlayer? 'yellow': 'orange',
          isPlayer: isPlayer,
          traveled: 0
      };
  }

  // --- Sprite Loading ---
  // *** Removed global player sprite loading - happens in createPlayer now ***


  // --- Drawing Functions ---

  function drawPlayer() {
      if (player && player.sprite.complete) { // Check if sprite is loaded
          // ctx.fillStyle = player.color; // No longer needed
          // ctx.fillRect(player.x, player.y, player.width, player.height); // Commented out
          // *** Draw player sprite ***
          ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
      } else if (player) {
          // Optional fallback: Draw a placeholder if image hasn't loaded yet
          ctx.fillStyle = 'grey';
          ctx.fillRect(player.x, player.y, player.width, player.height);
      }
  }

  function drawEnemy(enemy) {
       if (enemy.sprite.complete) { // Check if sprite is loaded
          // ctx.fillStyle = enemy.color; // No longer needed
          // ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height); // Commented out
          // *** Draw enemy sprite ***
          ctx.drawImage(enemy.sprite, enemy.x, enemy.y, enemy.width, enemy.height);
       } else {
           // Optional fallback
           ctx.fillStyle = 'darkgrey';
           ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
       }
  }

  function drawBullet(bullet) {
      // Bullets remain colored shapes
      ctx.fillStyle = bullet.color;
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  }

  function drawBackground() {
     ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height); // Simplified non-scrolling background for now
     // If you re-implement scrolling:
     // ctx.drawImage(backgroundImage, scrolling.x, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  }

  // --- Update Functions ---
  function updatePlayer() {
      if (!player) return;

      // Horizontal movement
      if (keys['ArrowLeft']) {
          player.x -= player.speed;
          player.direction = 'left';
      }
      if (keys['ArrowRight']) {
          player.x += player.speed;
          player.direction = 'right';
      }

      // Boundary checks
      if (player.x < 0) player.x = 0;
      if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;


      // Jumping
      if (keys['ArrowUp'] && !player.isJumping) {
          player.velocityY = -10; // Jump velocity
          player.isJumping = true;
          if(soundEnabled) jumpSound.triggerAttackRelease('C4', '16n');
      }

      // Gravity
      player.velocityY += player.gravity;
      player.y += player.velocityY;

      // Ground collision
      const groundLevel = canvas.height - player.height;
      if (player.y >= groundLevel) {
          player.y = groundLevel;
          player.velocityY = 0;
          player.isJumping = false;
      }

      // Falling off bottom (optional)
      if (player.y > canvas.height) endGame();
  }

  function updateEnemies() {
      enemies.forEach((enemy, index) => {
          enemy.x -= enemy.speed;
          const enemyGroundLevel = canvas.height - enemy.height;
          if (enemy.y < enemyGroundLevel) enemy.y = enemyGroundLevel; // Keep on ground

          if (enemy.x + enemy.width < 0) enemies.splice(index, 1); // Remove if off-screen
      });
  }

  function updateBullets() {
      bullets.forEach((bullet, index) => {
          bullet.x += bullet.speed;
          bullet.traveled += Math.abs(bullet.speed);
          const maxDistance = bullet.isPlayer ? 400 : 200;

          if (bullet.x + bullet.width < 0 || bullet.x > canvas.width || bullet.traveled > maxDistance) {
              bullets.splice(index, 1);
          }
      });
  }

 function handleCollisions() {
    if (!player) return;

    // Player Bullet vs Enemy Collision
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet) continue; // Skip if bullet was removed in inner loop

        if (bullet.isPlayer) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (
                    bullet.x < enemy.x + enemy.width &&
                    bullet.x + bullet.width > enemy.x &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y
                ) {
                    bullets.splice(i, 1);
                    enemy.health -= 1;
                    if (enemy.health <= 0) {
                        enemies.splice(j, 1);
                        score += (enemy.type === 'tough') ? 20 : 10;
                        if (soundEnabled) explosionSound.triggerAttackRelease('G3', '8n');
                    }
                    break; // Bullet hits one enemy
                }
            }
        } else { // Enemy Bullet vs Player Collision
           if (
              bullet.x < player.x + player.width &&
              bullet.x + bullet.width > player.x &&
              bullet.y < player.y + player.height &&
              bullet.y + bullet.height > player.y
            ) {
              bullets.splice(i, 1);
              player.health -= 1;
              if (player.health <= 0) {
                  endGame();
                  return; // Exit collision check early
              }
              break; // Bullet hits player
           }
        }
    }

    // Enemy vs Player Collision (Direct Contact)
    for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            enemies.splice(j, 1); // Remove enemy
            player.health -= 1;
             if (player.health <= 0) {
                 endGame();
                 return; // Exit if game ended
             }
            break; // Player hit one enemy
        }
    }
}


  // --- Input Handling ---
  let keys = {};

  document.addEventListener('keydown', (e) => {
      keys[e.code] = true;

      if (e.code === 'Space' && gameRunning && player) {
          const bulletStartX = player.direction === 'right' ? player.x + player.width : player.x;
          const bulletStartY = player.y + player.height / 2 - 4; // Adjust bullet start Y
          bullets.push(createBullet(bulletStartX, bulletStartY, player.direction === 'right' ? 1 : -1));
          if (soundEnabled) shooterSound.triggerAttackRelease('E5', '16n');
      }
       if (gameRunning && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
           e.preventDefault();
       }
  });

  document.addEventListener('keyup', (e) => {
      keys[e.code] = false;
  });

  // --- Game Loop ---
  function gameLoop() {
      if (!gameRunning) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground();
      updatePlayer();
      updateEnemies();
      updateBullets();
      handleCollisions();

      // Draw elements
      drawPlayer(); // Uses drawImage now
      enemies.forEach(drawEnemy); // Uses drawImage now
      bullets.forEach(drawBullet);

      // Draw Score & Health UI
      ctx.fillStyle = '#fff';
      ctx.font = '1rem "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 5;
      ctx.fillText(`SCORE: ${score}`, 10, 30);

      if (player) {
          ctx.fillStyle = '#f87171';
          ctx.textAlign = 'right';
          ctx.fillText(`HEALTH: ${player.health}`, canvas.width - 10, 30);
      }
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';

      animationId = requestAnimationFrame(gameLoop);
  }

  // --- Game Start/End ---
  function startGame() {
      console.log("startGame called, difficulty:", difficulty);
      clearTimeout(spawnTimeoutId);

      player = createPlayer(); // Creates player and loads sprite
      enemies = [];
      bullets = [];
      score = 0;
      keys = {};
      gameRunning = true;
      gameOverOverlay.style.display = 'none';
      startScreen.style.display = 'none';
      instructionsBox.style.display = 'none';

      if (animationId) cancelAnimationFrame(animationId);
      gameLoop();
      spawnEnemies(); // Start spawning enemies (which load their sprites)

       if (soundEnabled) {
          Tone.start().then(() => console.log("AudioContext started")).catch(e => console.error("Error starting AudioContext:", e));
      }
  }

  function endGame(showOverlay = true) {
      console.log("endGame called");
      gameRunning = false;
      clearTimeout(spawnTimeoutId);
      cancelAnimationFrame(animationId);
       if (soundEnabled) gameOverSound.triggerAttackRelease('A2', '1n');
       if(showOverlay){
           finalScoreDisplay.textContent = score;
           gameOverOverlay.style.display = 'flex';
       }
      // player = null; // Optionally clear player
  }

  // --- Event Listeners & Difficulty ---
  restartButton.addEventListener('click', startGame);
  startButtonElement.addEventListener('click', startGame);

  difficultyButtons.forEach(button => {
      button.addEventListener('click', function() {
          difficulty = this.dataset.difficulty;
          console.log("Difficulty set to:", difficulty);
          difficultyButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          switch (difficulty) { /* Cases remain the same */
              case 'easy': enemySpawnRate=1500; playerSpeed=7; enemySpeed=1.5; bulletSpeed=9; break;
              case 'medium': enemySpawnRate=1000; playerSpeed=5; enemySpeed=2; bulletSpeed=7; break;
              case 'hard': enemySpawnRate=500; playerSpeed=3; enemySpeed=3; bulletSpeed=5; break;
          }
          startGame(); // Restart game with new settings
      });
  });
  document.querySelector(`.difficulty-button[data-difficulty="${difficulty}"]`).classList.add('active');

  toggleSoundButton.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    toggleSoundButton.textContent = soundEnabled ? 'Sound ON' : 'Sound OFF';
    toggleSoundButton.classList.toggle('active', soundEnabled);
    if (soundEnabled) Tone.start().catch(e => console.error("Error starting AudioContext:", e));
    console.log("Sound enabled:", soundEnabled);
  });

  // --- Enemy Spawning ---
  let spawnTimeoutId;

  function spawnEnemies() {
      clearTimeout(spawnTimeoutId);
      if (!gameRunning) return;

      const x = canvas.width + random(50, 150);
      let type = 'basic';
      const rand = Math.random();
      // Difficulty determines enemy type frequency (same logic as before)
      if (difficulty === 'easy'){ if (rand < 0.1) type = 'fast'; else if (rand < 0.15) type = 'tough';}
      else if (difficulty === 'medium'){ if (rand < 0.15) type = 'fast'; else if (rand < 0.3) type = 'tough'; }
      else { if (rand < 0.2) type = 'fast'; else if (rand < 0.4) type = 'tough';}

      // *** createEnemy now loads the correct sprite based on type ***
      enemies.push(createEnemy(x, type));

      const spawnInterval = random(enemySpawnRate * 0.8, enemySpawnRate * 1.2);
      spawnTimeoutId = setTimeout(spawnEnemies, spawnInterval);
  }

  // --- Initial Setup ---
  startScreen.style.display = 'flex';
  gameOverOverlay.style.display = 'none';
  instructionsBox.style.display = 'block';
