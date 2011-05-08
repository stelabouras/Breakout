/* Breakout in HTML5 */

window.ios = window.navigator.userAgent.indexOf('AppleWebKit') !== -1 && window.navigator.userAgent.indexOf('Mobile') !== -1;

/* Taken from: http://paulirish.com/2011/requestanimationframe-for-smart-animating/ */
window.requestAnimFrame = (function() {
    return  window.requestAnimationFrame       || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame    || 
            window.oRequestAnimationFrame      || 
            window.msRequestAnimationFrame     || 
            function(callback, element) {
	
           		window.setTimeout(callback, 1000 / 60);
            };
})();

/* Contact Listener for Breakout, implementing b2ContactListener class */
function myContactListener() { };

myContactListener.prototype 	= new b2ContactListener();
myContactListener.prototype.Add = function(point) {
	
	var body1 = point.shape1.m_body;
	var body2 = point.shape2.m_body;
	var brick;
	
	// In case ball collides with the bottom wall, we reset the game
	if(Breakout.playing) {
		
		if(	(body1.m_userData.type == "ball" && body2.m_userData.type == "wall3") ||
			(body1.m_userData.type == "wall3" && body2.m_userData.type == "ball"))
			Breakout.sendReset = true;
	}

	// If ball collides with a brick, remove it
	if(body2.m_userData.type.indexOf("brick") > -1)
		brick = body2;
	else if(body1.m_userData.type.indexOf("brick") > -1)
		brick = body1;
		
	if(brick) {

		Breakout.bodiesForDestr.push(brick);
		brick.m_userData.exists = false;
		Breakout.broken++;
		Breakout.updateScore(brick.m_xf.position.x, brick.m_xf.position.y);
	}
};

/*
Notification object for score bubbles
Hat tip: 	Hakim for inspiration on Coil
			http://hakim.se/experiments/html5/coil/
*/
function Notification(caption, x, y, size, color) {

    this.text = caption || "";
    this.x = x || 0;
    this.y = y || 0;
    this.scale = size || 1;
    this.rgb = color || [255, 255, 255];
    this.alpha = 0.7;
}

Breakout = new function() {
	
	var frameCount 	= 0;	
	var animating 	= true;
	var playing 	= false;
	var score		= 0;
	var initialMove	= 0;
	var canvas;
	var context;
	
	var bat;
	var ball;
	var maxSpeed		= 70;
	var prevTS 			= 0;
	var fps				= 1;
	var maxFPS			= 30;
	var notifications	= [];
	var walls 			= [];
	var bricks			= [];
	var brickColours 	= [ "#d03ad1", 
							"#f75352", 
							"#fd8014", 
							"#ff9024", 
							"#05b320", 
							"#6d65f6" ];
	var mouse = {
		x : 0,
		y : 0
	};
	
	var world = {
		width : 500,
		height: 500
	};

	this.bodiesForDestr = [];
	this.sendReset		= false;
	this.broken			= 0;
		
	// Initialization of the world, events and animation loop
	this.initialize = function() {
		
		var html 		= [];
		
		html.push('<canvas id="world" width="' + world.width + '" height="' + world.height + '">');
		html.push('Your browser does not support canvas element :( Sorry');
		html.push('</canvas>');
		html.push('<div id="welcome-screen" style="width:' + world.width +'px;height:' + world.height + 'px;"><p>Welcome to HTML 5 Breakout!</p><p>Press <em onclick="Breakout.startGame();">here</em> to start</p></div>');
		html.push('<div id="pause-screen" style="width:' + world.width +'px;height:' + world.height + 'px;"><p>-Game Paused-</p><p>Press (space) to resume</p></div>');
		html.push('<p>');
		html.push('<button onmousedown="Breakout.movePaddle(-1);"; onmouseup="Breakout.stopPaddle();">Left (&larr;)</button>');
		html.push('<button onmousedown="Breakout.movePaddle(1);"; onmouseup="Breakout.stopPaddle();">Right (&rarr;)</button>');
		html.push('<button onclick="Breakout.toggleAnimation();">Play / Pause game (space)</button>');
		html.push('<span id="score">0</span>');
		html.push('<em id="fps">FPS: 0</em>');
		html.push('</p>');
		
		$('#main').append(html.join(''));
		
		// Canvas initialization
		welcomeScreen	= $('#welcome-screen')[0];
		pauseScreen 	= $('#pause-screen')[0];
		
		fpsEl	= $('#fps');
		scoreEl	= $('#score')[0];
		canvas	= $('#world')[0];
		context = canvas.getContext('2d');
				
		initialMove = Math.floor(Math.random() * 2);
		
		// Create the physics world with Box2D

		// Create the world Axis Aligned Bounding Box
		var worldAABB = new b2AABB();
		
		worldAABB.lowerBound.Set(-10000.0, -10000.0);
		worldAABB.upperBound.Set(10000.0, 10000.0);

		// No gravity here :)
		var gravity = new b2Vec2(0, 0);
		
		// Create a contact listener
		var contactListener = new myContactListener();
		
		// Create the world
		this.universe = new b2World(worldAABB, gravity, true);
		// Add the contact listener
		this.universe.SetContactListener(contactListener);
		
		// Create the bodies
		createBodies();
		
		// Bind the events
		bindEvents();
		
		// Start animating!
		animateWorld();
	}
	
	function createBodies() {
		
		/* Walls */
		for(var i = 0; i < 4; i++) {
		
			var wX 				= 0;
			var wY 				= 0;
			var wW 				= 10;
			var wH 				= world.height;
			var wC 				= "#ababab";
			var wallBodyDef 	= new b2BodyDef();

			if(i == 0) {

				wX 	= 5.0;
				wY	= world.height / 2.0;
				wW	= 5.0;
				wH 	= world.height / 2.0;
								
			} else if(i == 1) {
				
				wX 	= world.width - 5.0;
				wY	= world.height / 2.0;
				wW	= 5.0;
				wH 	= world.height / 2.0;
				
			} else if(i == 2) {

				wX 	= world.width / 2.0;
				wY	= 5.0;
				wW	= world.width / 2.0;
				wH 	= 5.0;
				
			} else if(i == 3) {

				wX 	= world.width / 2.0;
				wY	= world.height - 5.0;
				wW	= world.width / 2.0;
				wH 	= 5.0;
			}
						
			wallBodyDef.position.Set(wX, wY);
			wallBodyDef.userData = {
				'type' : 'wall' + i,
				'color': '#6C2ADF'
			};
			
			var wall = Breakout.universe.CreateBody(wallBodyDef);
			
			wall.w 	= wW
			wall.h 	= wH;
			
			var wallShapeDef = new b2PolygonDef();
			wallShapeDef.restitution 	= 1.0;
			wallShapeDef.friction 		= 0.0;
			wallShapeDef.density 		= 100.0;
			wallShapeDef.SetAsBox(wall.w, wall.h);
			
			wall.CreateShape(wallShapeDef);
			wall.SynchronizeShapes();
			
			walls[i] = wall;
		}
		
		/* Ball */
		var ballBodyDef = new b2BodyDef();
		ballBodyDef.position.Set(world.width / 2, world.height / 2);
		ballBodyDef.userData = {
			'type' 	: 'ball',
			'color'	: '#d63bc3' 
		};
		
		ball = Breakout.universe.CreateBody(ballBodyDef);
		
		var ballShapeDef = new b2CircleDef();
		
		ballShapeDef.restitution 	= 1.0;
		ballShapeDef.friction 		= 0.0;
		ballShapeDef.density 		= 0.5;
		ballShapeDef.radius			= 5.0;
		
		ball.CreateShape(ballShapeDef);
		ball.SetMassFromShapes();
		
		/* Bat */
		var batBodyDef = new b2BodyDef();
		batBodyDef.position.Set(world.width / 2, world.height - 15);
		batBodyDef.userData = {
			'type' 	: 'bat',
			'color'	: '#d63bc3' 
		};
		
		bat = Breakout.universe.CreateBody(batBodyDef);
		
		var batShapeDef = new b2PolygonDef();
		
		batShapeDef.restitution = 0.0;
		batShapeDef.friction 	= 0.2;
		batShapeDef.density 	= 5000.0;
		
		bat.w = 50;
		bat.h = 3;
		
		batShapeDef.SetAsBox(bat.w, bat.h);
		
		bat.CreateShape(batShapeDef);
		bat.SetMassFromShapes();
		
		/* Bricks */
		var bx = 10;
		var by = 10;
		
		for (var y = 0; y < 15; y++) {
			
			for (var x = 0; x < 32; x++) {
				
				var wX	= bx + 7.5;
				var wY 	= by + 7.5;
				var wW	= 7.5;
				var wH  = 7.5;
				var brickBodyDef 	= new b2BodyDef();

				brickBodyDef.position.Set(wX, wY);
				brickBodyDef.userData 	= {
					'type' 	: 'brick' + y + x,
					'exists': true,
					'color'	: brickColours[y % 6]
				};
					
				var brick 	= Breakout.universe.CreateBody(brickBodyDef);
				brick.w 	= wW;
				brick.h 	= wH;

				var brickShapeDef = new b2PolygonDef();
				brickShapeDef.restitution 	= 0.0;
				brickShapeDef.friction 		= 0.0;
				brickShapeDef.density 		= 1.0;
				brickShapeDef.SetAsBox(brick.w, brick.h);

				brick.CreateShape(brickShapeDef);
				brick.SynchronizeShapes();
				
				bricks.push(brick);
				
				bx += 15;
			}
			
			bx = 10;
			by += 15;
		}	
		
		// Restrict paddle along the x axis
		var pd = new b2PrismaticJointDef();		
		pd.Initialize(Breakout.universe.GetGroundBody(), bat, bat.GetWorldCenter(), new b2Vec2(1.0, 0.0));
		pd.lowerTranslation	= -(world.width / 2 - (bat.w + 13));
		pd.upperTranslation	= world.width / 2 - (bat.w + 13);
		pd.enableLimit		= true;
		pd.maxMotorForce	= 1000;
		pd.motorSpeed		= 1.0;
		pd.enableMotor		= true;
		pd.collideConnected = true;
		
		Breakout.universe.CreateJoint(pd);		
	}
	
	this.movePaddle = function(direction) {

		if(!direction)
			return;
			
		bat.WakeUp();
		bat.m_linearVelocity.x = direction * 100;
	}
	
	this.stopPaddle = function() { bat.m_linearVelocity.x = 0; }
	
	function bindEvents() {
		
		if(!window.ios) {
			
			document.addEventListener('keydown', function(event) {
			
				if(event.keyCode == 37)
					Breakout.movePaddle(-1);

				if(event.keyCode == 39)
					Breakout.movePaddle(1);
				
				if(event.keyCode == 32) {
				
					event.preventDefault();
				
					Breakout.toggleAnimation();
				}
					
			}, false);
					
			document.addEventListener('keyup', function(event) {
			
				if(event.keyCode == 37 || event.keyCode == 39)
					Breakout.stopPaddle();
					
			}, false);
			
		} else {
			
			canvas.addEventListener('touchstart', function(event) {
			
				if(event.touches.length == 1) {
				
					event.preventDefault();

					var touch = event.touches[0];
					
					mouse.x = (touch.pageX > world.width ? world.width : touch.pageX);
					mouse.y = (touch.pageY > world.height? world.height: touch.pageY);

					Breakout.movePaddle((mouse.x < world.width / 2 ? -1 : 1));
				}
			
			}, false);
			
			canvas.addEventListener('touchmove', function(event) {
			
				if(event.touches.length == 1) {
				
					event.preventDefault();

					var touch = event.touches[0];

					mouse.x = (touch.pageX > world.width ? world.width : touch.pageX);
					mouse.y = (touch.pageY > world.height? world.height: touch.pageY);

					Breakout.movePaddle((mouse.x < world.width / 2 ? -1 : 1));
				}
			
			}, false);
			
			canvas.addEventListener('touchend', function(event) { Breakout.stopPaddle(); }, false);
		}		
	}
	
	this.toggleAnimation 	= function() { 
	
		if(!Breakout.playing)
			return;
			
		$(pauseScreen).toggle();
			
		animating = !animating; 
	}
	
	this.updateScore		= function(x, y) {
		
		if(!Breakout.playing)
			return;
			
		var newScore = 300 - parseInt(y);

		score += newScore;
		
		notifications.push(new Notification(newScore, x, y, 1, [255, 255, 0]));
		
		$(scoreEl).html(score);
	}
	
	this.startGame = function() {
		
		var iteration = 3;
		
		$(welcomeScreen).html('<p>...READY...</p>').show();
	
		this.countdown = setInterval(function() {
			
			if(iteration-- == 0) {
				
				clearInterval(Breakout.countdown);
				
				$(welcomeScreen).hide();
				$(scoreEl).show();

				Breakout.playing = true;
				Breakout.resetGame();
			}
			
			var message = (iteration == 2 ? '...SET...' : 'GO!');
	
			$(welcomeScreen).html('<p>' + message + '</p>');
			
		}, 1000);		
	}
	
	this.winGame = function() {
	
		if(this.playing) {
			
			$(welcomeScreen).html('<p>Wow, you won! Cograts!</p><p>Your score was: ' + score + '</p><p>Press <em onclick="Breakout.startGame();">here</em> to play again!</p>').show();
			$(scoreEl).hide();
			this.playing = false;
		}
		
		this.resetGame();
	}
	
	this.gameOver = function() {
	
		$(welcomeScreen).html('<p>Game over! :(</p><p>Your score was: ' + score + '</p><p>Press <em onclick="Breakout.startGame();">here</em> to start</p>').show();
		$(scoreEl).hide();
		this.playing = false;
		
		this.resetGame();
	}
	
	this.resetGame			= function() { 
		
		animating = false;
		
		// delete all bodies and reposition em
		this.universe.DestroyBody(ball);
		this.universe.DestroyBody(bat);

		for(var i = 0; i < 4; i++)
			this.universe.DestroyBody(walls[i]);
		
		// Add bricks
		for(var i = 0; i < bricks.length; i++)
			this.universe.DestroyBody(bricks[i]);
			
		walls 		= [];
		bricks 		= [];
		frameCount 	= 0;
		score		= 0;
		initialMove = Math.floor(Math.random() * 2);
		this.broken	= 0;
		
		$('#score').html(0);
		
		createBodies();
		
		animating = true;
	}
	
	function updateFPS() {
		
		var sec = parseInt(+new Date / 1000);
		
		if(prevTS == sec)			
			fps++;
		else {
			
			prevTS 	= sec;
			fpsEl.html('FPS: ' + fps);
			maxFPS 	= (fps > maxFPS ? fps : maxFPS);
			fps 	= 1;
		}	
	}
	
	function animateWorld() {

		updateFPS();
		
		requestAnimFrame(animateWorld, canvas);
		
		frameCount++;
	
		if(bricks.length == Breakout.broken) {
		
			Breakout.winGame();
			return;
		}
		
		if(Breakout.sendReset) {
		
			Breakout.gameOver();
			Breakout.sendReset = false;
			
			return;
		}
		
		// Remove any bricks after collisions
		if(Breakout.bodiesForDestr.length > 0) {
			
			for(var i = 0; i < Breakout.bodiesForDestr.length; i++)
				Breakout.universe.DestroyBody(Breakout.bodiesForDestr[i]);
				
			Breakout.bodiesForDestr = [];
		}

		// If x || y velocity of the ball is around zero,
		// add 2 it in this axis in order to make not to make it 
		// bound up / down or left / right for ever
		if(Math.abs(ball.m_linearVelocity.x) <= 0.5)
			ball.m_linearVelocity.x =+ 2;

		if(Math.abs(ball.m_linearVelocity.y) <= 0.5)
			ball.m_linearVelocity.y += 2;
			
		// Normalize ball velocity
		if(parseInt(ball.m_linearVelocity.x) > maxSpeed)
			ball.m_linearVelocity.x = maxSpeed;
		
		if(parseInt(ball.m_linearVelocity.y) > maxSpeed)
			ball.m_linearVelocity.y = maxSpeed;
	
		// Add an initial force to the ball		
		if(frameCount < 10)			
			ball.ApplyImpulse(new b2Vec2((initialMove == 0 ? 150 : -150), 400), ball.GetPosition());
			
		// Advance the physics engine if we are animating
		if(animating)
			Breakout.universe.Step(1 / (maxFPS / 5), 10);
	
		// Draw the world
		buildWorld();
	}

	function buildWorld() {

		// set the background color
		context.fillStyle = "#000000";
		context.fillRect(0, 0, world.width, world.height);
		
		// Draw the bat
		if(Breakout.playing) {
			
	        var t = bat.m_xf;

			context.save();
			context.fillStyle = bat.m_userData.color;
	        context.translate(t.position.x, t.position.y)
	        context.rotate(bat.GetAngle());
	        context.fillRect(-bat.w, -bat.h, bat.w * 2, bat.h * 2);
			context.restore();
		}
		
		// Draw the ball
        var t = ball.m_xf;

		context.save();
		context.fillStyle = ball.m_userData.color;
		context.beginPath();
		context.arc( t.position.x, t.position.y, ball.m_shapeList.m_radius, 0, Math.PI*2, true );
		context.fill();
		context.restore();
		
		// Draw the walls
		for(var i = 0; i < walls.length; i++) {
		
			var wall = walls[i];

			t = wall.m_xf;

			context.save();
			context.fillStyle = wall.m_userData.color;
	        context.translate(t.position.x, t.position.y)
	        context.rotate(wall.GetAngle());
	        context.fillRect(-wall.w, -wall.h, wall.w * 2, wall.h * 2);
			context.restore();
		}
		
		// Add bricks
		for(var i = 0; i < bricks.length; i++) {
			
			var tempBrick = bricks[i];
			
			if(tempBrick.m_userData.exists) {

				t = tempBrick.m_xf;
				
				context.save();
				context.fillStyle = tempBrick.m_userData.color;
		        context.translate(t.position.x, t.position.y)
		        context.rotate(tempBrick.GetAngle());
		        context.fillRect(-tempBrick.w, -tempBrick.h, tempBrick.w * 2, tempBrick.h * 2);
				context.restore();
			}
		}
		
		// Render notifications
		for(var i = 0; i < notifications.length; i++) {
			
			var notification = notifications[i];
			
			if(notification.alpha == 0)
				continue;
				
			var dim 	= context.measureText(notification.text);
			var width 	= Math.round(dim.width);

			context.save();
			context.fillStyle = 'rgba(' + notification.rgb[0] + 
								',' + notification.rgb[1] + 
								',' + notification.rgb[2] + 
								',' + notification.alpha + ');';
								
			context.beginPath();
			context.shadowBlur 	= 15;  
			context.shadowColor = 'rgb(0, 0, 0)';			
			context.arc( notification.x, notification.y, width * 0.69, 0, Math.PI*2, true );
			context.fill();
			context.fillStyle = 'rgba(0, 0, 0,' + notification.alpha + ');';
			context.fillText(notification.text, notification.x - (width / 2) + 1, notification.y + 3, 20 * notification.scale);
			context.restore();
			
			notification.y -= 0.5;
			notification.alpha -= (notification.alpha - 0.01 <= 0 ? 0 : 0.01);
		}
	}
};

Breakout.initialize();