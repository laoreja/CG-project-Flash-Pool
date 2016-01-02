window.PHYSICS = {}

window.PHYSICS.dt = 1/60;

window.PHYSICS.l1 = 12.66;
window.PHYSICS.l2 = 12.7;
window.PHYSICS.h = 1.5;
window.PHYSICS.w1 = 0.7;
window.PHYSICS.w2 = 0.8;
window.PHYSICS.w3 = 0.7;
window.PHYSICS.ox = 0;
window.PHYSICS.oy = 0;
window.PHYSICS.oz = 0;
window.PHYSICS.t = 0.001;

window.PHYSICS.radius = 0.6;
window.PHYSICS.mass = 5;

window.PHYSICS.boxBodies = [];
window.PHYSICS.boxShapes = [];
window.PHYSICS.ballBodies = [];
window.PHYSICS.ballShapes = [];

function initCannon(){
    window.PHYSICS.world = new CANNON.World();
    var world = window.PHYSICS.world;
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = true;
    var solver = new CANNON.GSSolver();
    solver.iterations = 7;
    solver.tolerance = 0.1;
    world.solver = new CANNON.SplitSolver(solver);

    world.defaultContactMaterial.contactEquationStiffness = 1e11;
    world.defaultContactMaterial.contactEquationRelaxation = 4;
    world.defaultContactMaterial.friction = 0.5;

    world.gravity.set(0,-10,0);
    world.broadphase = new CANNON.NaiveBroadphase();

    physicsMaterial = new CANNON.Material("slipperyMaterial");
    physicsMaterial.friction = 0.5;
    var physicsContactMaterial = new CANNON.ContactMaterial(
        physicsMaterial,
        physicsMaterial, {
            friction: 0.5,
            restitution: 1
        }
    );
    world.addContactMaterial(physicsContactMaterial);

    var mass = 5, radius = 1.3;
    sphereShape = new CANNON.Sphere(radius);
    sphereBody = new CANNON.Body({ mass: mass, material: physicsMaterial });
    sphereBody.addShape(sphereShape);
    sphereBody.position.set(0,5,0);
    sphereBody.linearDamping = 0.9;
    world.addBody(sphereBody);

    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    world.addBody(groundBody);

    initPhysicsBoxes();
    initPhysicsBalls();
}

function initPhysicsBalls() {
    var world = window.PHYSICS.world;
    var m = window.PHYSICS.mass;
    var r = window.PHYSICS.radius;

    var tmpBallBody;
    var tmpBallShape;

    var ballBodies = window.PHYSICS.ballBodies;
    var ballShapes = window.PHYSICS.ballShapes;

    var inits = [
        [0, 0.6, 8.2],
        [0.000000, 0.6, -6.950000],
        [0.600000, 0.6, -7.989230],
        [-0.600000, 0.6, -7.989230],
        [1.200000, 0.6, -9.028461],
        [0.000000, 0.6, -9.028461],
        [-1.200000, 0.6, -9.028461],
        [1.800000, 0.6, -10.067691],
        [0.600000, 0.6, -10.067691],
        [-0.600000, 0.6, -10.067691],
        [-1.800000, 0.6, -10.067691],
        [2.400000, 0.6, -11.106922],
        [1.200000, 0.6, -11.106922],
        [0.000000, 0.6, -11.106922],
        [-1.200000, 0.6, -11.106922],
        [-2.400000, 0.6, -11.106922]
    ];

    for (var i = 0; i < inits.length; i++) {
        tmpBallBody = new CANNON.Body({mass: m});
        tmpBallShape = new CANNON.Sphere(r);
        tmpBallBody.addShape(tmpBallShape);
        world.add(tmpBallBody);
        tmpBallBody.position.set(inits[i][0], inits[i][1], inits[i][2]);
        ballBodies.push(tmpBallBody);
        ballShapes.push(tmpBallShape);
    }
    ballBodies[0].velocity = new CANNON.Vec3(0, 0, -50);
    //ballBodies[0].applyImpulse(new Vec3(100, 100, 100), ballBodies[0].position);
}

function initPhysicsBoxes() {
    var world = window.PHYSICS.world;
    var l1 = window.PHYSICS.l1;
    var l2 = window.PHYSICS.l2;
    var h = window.PHYSICS.h;
    var w1 = window.PHYSICS.w1;
    var w2 = window.PHYSICS.w2;
    var w3 = window.PHYSICS.w3;
    var ox = window.PHYSICS.ox;
    var oy = window.PHYSICS.oy;
    var oz = window.PHYSICS.oz;
    var t = window.PHYSICS.t;

    var tmpBoxBody;
    var tmpBoxShape;

    var boxBodies = window.PHYSICS.boxBodies;
    var boxShapes = window.PHYSICS.boxShapes;

    var inits = [
        [[t, h/2, l1/2], [ox+l2/2+w1, oy+h/2, oz+l1/2+w2/2]],
        [[t, h/2, l1/2], [ox+l2/2+w1, oy+h/2, oz-l1/2-w2/2]],
        [[t, h/2, l1/2], [ox-l2/2-w1, oy+h/2, oz+l1/2+w2/2]],
        [[t, h/2, l1/2], [ox-l2/2-w1, oy+h/2, oz-l1/2-w2/2]],
        [[l2/2, h/2, t], [ox, oy+h/2, oz+w2/2+l1+w3]],
        [[l2/2, h/2, t], [ox, oy+h/2, oz-w2/2-l1-w3]],
        [[w1/2, t, l1/2], [ox+l2/2+w1/2, oy, oz-w2/2-l1/2]],
        [[l2/2, t, w3/2], [ox, oy, oz-w2/2-l1-w3/2]],
        [[w1/2, t, l1/2], [ox-l2/2-w1/2, oy, oz-w2/2-l1/2]],
        [[w1/2, t, l1/2], [ox-l2/2-w1/2, oy, oz+w2/2+l1/2]],
        [[l2/2, t, w3/2], [ox, oy, oz+w2/2+l1+w3/2]],
        [[w1/2, t, l1/2], [ox+l2/2+w1/2, oy, oz+w2/2+l1/2]],
        [[l2/2, t, (l1*2+w2)/2], [ox, oy, oz]]
    ];

    for (var i = 0; i < inits.length; i++) {
        tmpBoxBody = new CANNON.Body({mass:0});
        tmpBoxShape = new CANNON.Box(new CANNON.Vec3(inits[i][0][0], inits[i][0][1], inits[i][0][2]));
        tmpBoxBody.addShape(tmpBoxShape);
        world.add(tmpBoxBody);
        tmpBoxBody.position.set(inits[i][1][0], inits[i][1][1], inits[i][1][2]);
        boxBodies.push(tmpBoxBody);
        boxShapes.push(tmpBoxShape);
    }
    console.log('initBox')
}

function animatePhysics() {
    var balls = window.PHYSICS.ballBodies;
    if(controls.enabled){
        world.step(dt);

        // Update ball positions
        for(var i=0; i<balls.length; i++){
            if (balls[i].velocity.length < 1)
                balls[i].velocity.setZero();
            else
                balls[i].velocity = balls[i].velocity.scale(0.97);
        }
    }
    requestAnimationFrame( animate );
}

